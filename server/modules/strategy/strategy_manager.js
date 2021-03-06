const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const IndicatorBuilder = require('./dict/indicator_builder');
const IndicatorPeriod = require('./dict/indicator_period');
const ta = require('../../utils/technical_analysis');
const Resample = require('../../utils/resample');
const SignalResult = require('./dict/signal_result');

module.exports = class StrategyManager {
  constructor(technicalAnalysisValidator, exchangeCandleCombine, logger, projectDir) {
    this.technicalAnalysisValidator = technicalAnalysisValidator;
    this.exchangeCandleCombine = exchangeCandleCombine;
    this.projectDir = projectDir;

    this.logger = logger;
    this.strategies = undefined;
  }

  getStrategies() {
    if (typeof this.strategies !== 'undefined') {
      return this.strategies;
    }

    const strategies = [];

    const dirs = [`${__dirname}/strategies`, `${this.projectDir}/var/strategies`];

    const recursiveReadDirSyncWithDirectoryOnly = (p, a = []) => {
      if (fs.statSync(p).isDirectory()) {
        fs.readdirSync(p)
          .filter(f => !f.startsWith('.') && fs.statSync(path.join(p, f)).isDirectory())
          .map(f => recursiveReadDirSyncWithDirectoryOnly(a[a.push(path.join(p, f)) - 1], a));
      }

      return a;
    };

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        return;
      }

      fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.js')) {
          strategies.push(new (require(`${dir}/${file.substr(0, file.length - 3)}`))());
        }
      });

      // Allow strategies to be wrapped by any folder depth:
      // "foo/bar" => "foo/bar/bar.js"
      recursiveReadDirSyncWithDirectoryOnly(dir).forEach(folder => {
        const filename = `${folder}/${path.basename(folder)}.js`;

        if (fs.existsSync(filename)) {
          strategies.push(new (require(filename))());
        }
      });
    });

    return (this.strategies = strategies);
  }

  findStrategy(strategyName) {
    return this.getStrategies().find(strategy => strategy.getName() === strategyName);
  }

  /**
   *
   * @param strategyName
   * @param context
   * @param exchange
   * @param symbol
   * @param options
   * @returns {Promise<SignalResult|undefined>}
   */
  async executeStrategy(strategyName, context, exchange, symbol, options) {
    const results = await this.getTaResult(strategyName, exchange, symbol, options, true);
    if (!results || Object.keys(results).length === 0) {
      return undefined;
    }

    // remove candle pipe
    delete results._candle;

    const indicatorPeriod = new IndicatorPeriod(context, results);

    const strategy = this.findStrategy(strategyName);

    const strategyResult = await strategy.period(indicatorPeriod, options);
    if (typeof strategyResult !== 'undefined' && !(strategyResult instanceof SignalResult)) {
      throw new Error(`Invalid strategy return:${strategyName}`);
    }

    return strategyResult;
  }


  async getTaResult(strategyName, exchange, symbol, options, validateLookbacks = false) {
    options = options || {};

    const strategy = this.getStrategies().find(strategy => {
      return strategy.getName() === strategyName;
    });

    if (!strategy) {
      throw `invalid strategy: ${strategy}`;
    }

    const indicatorBuilder = new IndicatorBuilder();
    strategy.buildIndicator(indicatorBuilder, options);

    const periodGroups = {};

    indicatorBuilder.all().forEach(indicator => {
      if (!periodGroups[indicator.period]) {
        periodGroups[indicator.period] = [];
      }

      periodGroups[indicator.period].push(indicator);
    });

    const results = {};

    for (const period in periodGroups) {
      const periodGroup = periodGroups[period];

      const foreignExchanges = [
        ...new Set(
          periodGroup
            .filter(group => group.options.exchange && group.options.symbol)
            .map(group => {
              return `${group.options.exchange}#${group.options.symbol}`;
            })
        )
      ].map(exchange => {
        const e = exchange.split('#');

        return {
          name: e[0],
          symbol: e[1]
        };
      });

      // filter candles in the futures: eg current non closed candle
      const periodAsMinute = Resample.convertPeriodToMinute(period) * 60;
      const unixtime = Math.floor(Date.now() / 1000);
      const olderThenCurrentPeriod = unixtime - (unixtime % periodAsMinute) - periodAsMinute * 0.1;

      const lookbacks = await this.exchangeCandleCombine.fetchCombinedCandles(
        exchange,
        symbol,
        period,
        foreignExchanges,
        olderThenCurrentPeriod
      );

      if (lookbacks[exchange].length > 0) {
        // check if candle to close time is outside our allow time window
        if (
          validateLookbacks &&
          !this.technicalAnalysisValidator.isValidCandleStickLookback(lookbacks[exchange].slice(), period)
        ) {
          this.logger.info(
            `Strategy skipped: outdated candle sticks: ${JSON.stringify([period, strategyName, exchange, symbol])}`
          );

          // stop current run
          return {};
        }

        const indicators = periodGroup.filter(group => !group.options.exchange && !group.options.symbol);

        const result = await ta.createIndicatorsLookback(lookbacks[exchange].slice().reverse(), indicators);

        // array merge
        for (const x in result) {
          results[x] = result[x];
        }

        results._candle = lookbacks[exchange][0];
      }

      for (const foreignExchange of foreignExchanges) {
        if (
          !lookbacks[foreignExchange.name + foreignExchange.symbol] ||
          lookbacks[foreignExchange.name + foreignExchange.symbol].length === 0
        ) {
          continue;
        }

        const indicators = periodGroup.filter(group => group.options.exchange === foreignExchange.name);
        if (indicators.length === 0) {
          continue;
        }

        const result = await ta.createIndicatorsLookback(
          lookbacks[foreignExchange.name + foreignExchange.symbol].slice().reverse(),
          indicators
        );

        // array merge
        for (const x in result) {
          results[x] = result[x];
        }
      }
    }

    return results;
  }

  getStrategyNames() {
    return this.getStrategies().map(strategy => strategy.getName());
  }

};
