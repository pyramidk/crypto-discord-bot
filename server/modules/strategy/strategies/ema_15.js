const SignalResult = require('..//dict/signal_result');

module.exports = class Ema15 {
  getName() {
    return 'ema_15';
  }

  buildIndicator(indicatorBuilder, options) {
    if (!options.period) {
      throw Error('Invalid period');
    }

    indicatorBuilder.add('ema21', 'ema', options.period, {
      length: 21
    });
    indicatorBuilder.add('ema55', 'ema', options.period, {
      length: 55
    });
  }

  period(indicatorPeriod) {

    const ema21 = indicatorPeriod.getIndicator('ema21');
    const ema55 = indicatorPeriod.getIndicator('ema55');
    

    if (!ema21 || !ema55 || ema55.length < 2 || ema21.length < 2) {
      return undefined;
    }

    const ema21s = ema21.slice(-1)[0];
    const ema21m = ema21.slice(-2)[0];

    const ema55s = ema55.slice(-1)[0];
    const ema55m = ema55.slice(-2)[0];

    console.log(ema21s, ema55s, 'ema55s');

    const lastSignal = indicatorPeriod.getLastSignal();

    const debug = {
      ema21s: ema21[0],
      ema55s: ema55[0],
      last_signal: lastSignal,
    };

    // trend change
    const long = ema21s > ema55s && ema21m < ema55m;
    const short = ema21s < ema55s && ema21m > ema55m;
    

    if (long) {
      // long
      return SignalResult.createSignal('long', debug);
    } 
    if (short) {
      // short
      return SignalResult.createSignal('short', debug);
    }

    return SignalResult.createEmptySignal(debug);
  }

  getOptions() {
    return {
      period: '1m',
      default_ma_type: 'EMA',
    };
  }
};
