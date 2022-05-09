const BinanceClient = require('binance-api-node').default;

const moment = require('moment');
const _ = require('lodash');
const ExchangeCandlestick = require('../dict/exchange_candlestick');
const Ticker = require('../dict/ticker');
const TickerEvent = require('../event/ticker_event');
// const ExchangeOrder = require('../dict/exchange_order');
// const OrderUtil = require('../utils/order_util');
// const Position = require('../dict/position');
// const Order = require('../dict/order');
// const OrderBag = require('./utils/order_bag');
// const TradesUtil = require('./utils/trades_util');

module.exports = class Binance {
  constructor(eventEmitter, logger, queue, candleImport, throttler) {
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.queue = queue;
    this.candleImport = candleImport;
    this.throttler = throttler;

    this.client = undefined;
    this.exchangePairs = {};
    this.symbols = [];
    this.trades = {};
    this.tickers = {};
    this.balances = [];
    // this.orderbag = new OrderBag();
  }

  start(config, symbols) {
    this.symbols = symbols;

    const opts = {};

    if (config.key && config.secret && config.key.length > 0 && config.secret.length > 0) {
      opts.apiKey = config.key;
      opts.apiSecret = config.secret;
    }

    const client = (this.client = BinanceClient(opts));

    const me = this;

    const { eventEmitter } = this;
    symbols.forEach(symbol => {
      // live prices
      client.ws.ticker(symbol.symbol, ticker => {
        eventEmitter.emit(
          'ticker',
          new TickerEvent(
            'binance',
            symbol.symbol,
            (this.tickers[symbol.symbol] = new Ticker(
              'binance',
              symbol.symbol,
              moment().format('X'),
              ticker.bestBid,
              ticker.bestAsk
            ))
          )
        );
      });

      symbol.periods.forEach(interval => {
        // backfill
        this.queue.add(() => {
          client.candles({ symbol: symbol.symbol, limit: 500, interval: interval }).then(async candles => {
            const ourCandles = candles.map(candle => {
              return new ExchangeCandlestick(
                'binance',
                symbol.symbol,
                interval,
                Math.round(candle.openTime / 1000),
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
              );
            });

            await this.candleImport.insertThrottledCandles(ourCandles);
          });
        });

        // live candles
        client.ws.candles(symbol.symbol, interval, async candle => {
          const ourCandle = new ExchangeCandlestick(
            'binance',
            symbol.symbol,
            interval,
            Math.round(candle.startTime / 1000),
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume
          );

          await this.candleImport.insertThrottledCandles([ourCandle]);
        });
      });
    });
  }


  getName() {
    return 'binance';
  }

  isInverseSymbol(symbol) {
    return false;
  }
};
