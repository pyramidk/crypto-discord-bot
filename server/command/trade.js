const services = require('../modules/services');

class TradeCommand {
  constructor() {}

  execute() {
    services.createTradeInstance().start();
    // services.createWebserverInstance().start();
  }
};

module.exports = TradeCommand 
