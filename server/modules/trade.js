const moment = require('moment');
const crypto = require('crypto');
const os = require('os');

module.exports = class Trade {
  constructor(
    eventEmitter,
    instances,
    notify,
    logger,
    tickListener,
    tickers,
    tickerDatabaseListener,
    systemUtil,
    logsRepository,
    tickerLogRepository,
  ) {
    this.eventEmitter = eventEmitter;
    this.instances = instances;
    this.notify = notify;
    this.logger = logger;
    this.tickListener = tickListener;
    this.tickers = tickers;
    this.tickerDatabaseListener = tickerDatabaseListener;
    this.systemUtil = systemUtil;
    this.logsRepository = logsRepository;
    this.tickerLogRepository = tickerLogRepository;
  }

  start() {
    this.logger.debug('Trade module started');

    const instanceId = crypto.randomBytes(4).toString('hex');

    const notifyActivePairs = this.instances.symbols.map(symbol => {
      return `${symbol.exchange}.${symbol.symbol}`;
    });

    const message = `Start: ${instanceId} - ${os.hostname()} - ${os.platform()} - ${moment().format()} - ${notifyActivePairs.join(
      ', '
    )}`;

    // this.notify.send(message);

    const me = this;
    const { eventEmitter } = this;

    // let the system bootup; eg let the candle be filled by exchanges
    setTimeout(() => {
      console.log('Trade module: warmup done; starting ticks');
      this.logger.info('Trade module: warmup done; starting ticks');

      setTimeout(async () => {
        await me.tickListener.startStrategyIntervals();
      }, 1000);

      // order create tick
      setInterval(() => {
        eventEmitter.emit('signal_tick', {});
      }, this.systemUtil.getConfig('tick.signal', 10600));
     
      setInterval(() => {
        eventEmitter.emit('tick_ordering', {});
      }, this.systemUtil.getConfig('tick.ordering', 10800));
    }, this.systemUtil.getConfig('tick.warmup', 30000));

    // cronjob like tasks
    setInterval(async () => {
      await me.logsRepository.cleanOldLogEntries();
      await me.tickerLogRepository.cleanOldLogEntries();

      me.logger.debug('Logs: Cleanup old entries');
    }, 86455000);

    const { tickers } = this;

    eventEmitter.on('ticker', async function(tickerEvent) {
      tickers.set(tickerEvent.ticker);
      me.tickerDatabaseListener.onTicker(tickerEvent);
    });

    eventEmitter.on('tick', async () => {
      me.tickListener.onTick();
    });

  }
};
