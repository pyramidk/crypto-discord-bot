# Crypto Trading Bot

[![Build Status](https://travis-ci.org/Haehnchen/crypto-trading-bot.svg?branch=master)](https://travis-ci.org/Haehnchen/crypto-trading-bot)

A **work in progress** Cryptocurrency for common exchanges like Bitfinex, Bitmex and Binance.
As most trading bots just provide basic buy and sell signals they provide many stuff to get profitable eg exchange orders like stop-losses or stop-limits are not supported by main bots. Also the limitation of fixed timeframe and technical indicators must be broken

**Not production ready** only basic functionality

## Features

- Fully use Websocket for exchange communication to react as fast as possible on market
- Multi pair support in one instance
- sqlite3 storage for candles, tickers, ...
- Webserver UI
- Support for going "Short" and "Long"
- Signal browser dashboard for pairs
- Slack and email notification
- TODO: Show possible arbitrage trades

### Exchanges

- [Binance](https://www.binance.com/?ref=17569916)
- [Binance Margin](https://www.binance.com/?ref=17569916)
- [Binance Futures](https://www.binance.com/en/futures/ref/302644)

## Technical stuff and packages

- node.js
- sqlite3
- [technicalindicators](https://github.com/anandanand84/technicalindicators)
- [tulipindicators - tulind](https://tulipindicators.org/list)
- [TA-Lib](https://mrjbq7.github.io/ta-lib/)

## How to use

### Install packages

```
➜ npm install 
```

Create instance file for pairs and changes

```
cp instance.js.dist instance.js
```

Provide a configuration with your exchange credentials

```
cp conf.json.dist conf.json
```

Create a new sqlite database use bot.sql scheme to create the tables

```
sqlite3 bot.db < bot.sql
```

Lets start it

```
npm start
```


## Setting Up Discord Bot


## Webserver

Some browser links

- UI: http://127.0.0.1:8080

## Web UI

### Dashboard

![Webserver UI](documentation/cryptobot.png 'Webserver UI')

## Custom Strategies

For custom strategies use [var/strategies](var/strategies) folder.

```
# simple file structure
var/strategies/your_strategy.js

# or wrap strategy into any sub folder depth
var/strategies/my_strategy/my_strategy.js
var/strategies/subfolder1/our_strategy/our_strategy.js
```

### Full Trade Example

An example `instance.js` which trades can be found inside `instance.js.dist_trade`. Rename it or move the content to you file.

```js
const c = (module.exports = {});

c.symbols = [
  {
    symbol: 'ETHUSDT',
    exchange: 'binance_futures',
    periods: ['1m', '15m', '1h'],
    trade: {
      currency_capital: 10,
      strategies: [
        {
          strategy: 'dip_catcher',
          interval: '15m',
          options: {
            period: '15m'
          }
        }
      ]
    },
  }
];
```


## Related Links

### Trading Bots Inspiration
