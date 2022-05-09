
const fs = require('fs');
const events = require('events');

const { createLogger, transports, format } = require('winston');

// const _ = require('lodash');
const Sqlite = require('better-sqlite3');
// const Notify = require('../notify/notify');
// const Slack = require('../notify/slack');

const Tickers = require('../storage/tickers');
const Ta = require('../ta.js');

const TickListener = require('./listener/tick_listener');
const TickerDatabaseListener = require('./listener/ticker_database_listener');

const SignalLogger = require('./signal/signal_logger');

const SignalRepository = require('./repository/signal_repository');
const CandlestickRepository = require('./repository/candlestick_repository');
const StrategyManager = require('./strategy/strategy_manager');
const ExchangeManager = require('./exchange/exchange_manager');

const Trade = require('./trade');

const SystemUtil = require('./system/system_util');
const TechnicalAnalysisValidator = require('../utils/technical_analysis_validator');
const LogsRepository = require('./repository/logs_repository');
const TickerLogRepository = require('./repository/ticker_log_repository');
const TickerRepository = require('./repository/ticker_repository');

const Binance = require('../exchange/binance');

const Throttler = require('../utils/throttler');
const Queue = require('../utils/queue');

const ExchangeCandleCombine = require('./exchange/exchange_candle_combine');
const CandleImporter = require('../modules/system/candle_importer');
const WinstonSqliteTransport = require('../utils/winston_sqlite_transport');



let db;
let instances;
let config;
let ta;
let eventEmitter;
let logger;
let notify;
let tickers;
let queue;

let candleStickImporter;
let tickerDatabaseListener;
let tickListener;

let signalLogger;
let signalHttp;

let signalRepository;
let candlestickRepository;

let exchangeManager;

let strategyManager;

let systemUtil;
let technicalAnalysisValidator;
let logsHttp;
let logsRepository;
let tickerLogRepository;
let exchanges;
let exchangeCandleCombine;
let tickerRepository;
let throttler;

const parameters = {};

module.exports = {
  boot: async function (projectDir) {
    parameters.projectDir = projectDir

    console.log(`${parameters.projectDir}/instance`)
    instances = require(`${parameters.projectDir}/instance`);

    console.log(instances);

    try {
      config = JSON.parse(fs.readFileSync(`${parameters.projectDir}/conf.json`, 'utf8'));
    } catch (e) {
      throw new Error(`Invalid conf.json file. Please check: ${String(e)}`);
    }

    this.getDatabase();

  },

  getDatabase: () => {
    if (db) {
      return db;
    }

    const myDb = Sqlite('bot.db');
    myDb.pragma('journal_mode = WAL');

    myDb.pragma('SYNCHRONOUS = 1;');
    myDb.pragma('LOCKING_MODE = EXCLUSIVE;');

    return (db = myDb);
  },

  getLogger: function() {
    if (logger) {
      return logger;
    }

    logger = createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        new transports.File({
          filename: `${parameters.projectDir}/var/log/log.log`,
          level: 'debug'
        }),
        new transports.Console({
          level: 'error'
        }),
        new WinstonSqliteTransport({
          level: 'debug',
          database_connection: this.getDatabase(),
          table: 'logs'
        })
      ]
    });

    return logger;
  },

  getEventEmitter: function() {
    if (eventEmitter) {
      return eventEmitter;
    }

    return (eventEmitter = new events.EventEmitter());
  },

  getInstances: () => {
    return instances;
  },

  getNotifier: function() {
    const notifiers = [];

    // const config = this.getConfig();

    // return (notify = new Notify(notifiers));
  },

  getTickers: function() {
    if (tickers) {
      return tickers;
    }

    return (tickers = new Tickers());
  },

  getStrategyManager: function() {
    if (strategyManager) {
      return strategyManager;
    }

    return (strategyManager = new StrategyManager(
      this.getTechnicalAnalysisValidator(),
      this.getExchangeCandleCombine(),
      this.getLogger(),
      parameters.projectDir
    ));
  },

  getExchangeCandleCombine: function() {
    if (exchangeCandleCombine) {
      return exchangeCandleCombine;
    }

    return (exchangeCandleCombine = new ExchangeCandleCombine(this.getCandlestickRepository()));
  },

  getTechnicalAnalysisValidator: function() {
    if (technicalAnalysisValidator) {
      return technicalAnalysisValidator;
    }

    return (technicalAnalysisValidator = new TechnicalAnalysisValidator());
  },


  getTickListener: function() {
    if (tickListener) {
      return tickListener;
    }

    return (tickListener = new TickListener(
      this.getTickers(),
      this.getInstances(),
      this.getNotifier(),
      this.getSignalLogger(),
      this.getStrategyManager(),
      this.getExchangeManager(),
      this.getLogger(),
    ));
  },

  getTickerDatabaseListener: function() {
    if (tickerDatabaseListener) {
      return tickerDatabaseListener;
    }

    return (tickerDatabaseListener = new TickerDatabaseListener(this.getTickerRepository()));
  },

  getTickerRepository: function() {
    if (tickerRepository) {
      return tickerRepository;
    }

    return (tickerRepository = new TickerRepository(this.getDatabase(), this.getLogger()));
  },

  getSystemUtil: function() {
    if (systemUtil) {
      return systemUtil;
    }

    return (systemUtil = new SystemUtil(this.getConfig()));
  },

  getLogsRepository: function() {
    if (logsRepository) {
      return logsRepository;
    }

    return (logsRepository = new LogsRepository(this.getDatabase()));
  },

  getSignalLogger: function() {
    if (signalLogger) {
      return signalLogger;
    }

    return (signalLogger = new SignalLogger(this.getSignalRepository()));
  },

  getSignalRepository: function() {
    if (signalRepository) {
      return signalRepository;
    }

    return (signalRepository = new SignalRepository(this.getDatabase()));
  },

  getCandlestickRepository: function() {
    if (candlestickRepository) {
      return candlestickRepository;
    }

    return (candlestickRepository = new CandlestickRepository(this.getDatabase()));
  },

  getTickerLogRepository: function() {
    if (tickerLogRepository) {
      return tickerLogRepository;
    }

    return (tickerLogRepository = new TickerLogRepository(this.getDatabase()));
  },

  getConfig: () => {
    return config;
  },

  getExchangeManager: function() {
    if (exchangeManager) {
      return exchangeManager;
    }

    return (exchangeManager = new ExchangeManager(
      this.getExchanges(),
      this.getLogger(),
      this.getInstances(),
      this.getConfig()
    ));
  },

  getExchanges: function() {
    if (exchanges) {
      return exchanges;
    }

    return (exchanges = [
      new Binance(
        this.getEventEmitter(),
        this.getLogger(),
        this.getQueue(),
        this.getCandleImporter(),
        this.getThrottler()
      ),
    ]);
  },

  getQueue: function() {
    if (queue) {
      return queue;
    }

    return (queue = new Queue());
  },

  getCandleImporter: function() {
    if (candleStickImporter) {
      return candleStickImporter;
    }

    return (candleStickImporter = new CandleImporter(this.getCandlestickRepository()));
  },

  getThrottler: function() {
    if (throttler) {
      return throttler;
    }

    return (throttler = new Throttler(this.getLogger()));
  },
  
  createTradeInstance: function() {
    this.getExchangeManager().init();
    return new Trade(
      this.getEventEmitter(),
      this.getInstances(),
      this.getNotifier(),
      this.getLogger(),
      this.getTickListener(),
      this.getTickers(),
      this.getTickerDatabaseListener(),
      this.getSystemUtil(),
      this.getLogsRepository(),
      this.getTickerLogRepository(),
    );
  }
}