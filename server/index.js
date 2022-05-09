const program = require('commander');
const TradeCommand = require('./command/trade.js');

// init
const services = require('./modules/services');

program
  .action(async options => {
    await services.boot(__dirname);
    const cmd = new TradeCommand(options.instance);
    cmd.execute();
  });

program.parse(process.argv);




