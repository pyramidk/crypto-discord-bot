module.exports = class Mail {
  constructor(mailer, systemUtil, logger) {
    this.mailer = mailer;
    this.systemUtil = systemUtil;
    this.logger = logger;
  }

  send(message) {
    const to = this.systemUtil.getConfig('notify.mail.to');
    if (!to) {
      this.logger.error('No mail "to" address given');

      return;
    }

    this.mailer.sendMail(
      { 
        from: '948206388@qq.com',
        to: to,
        subject: 'singal',
        text: message
      },
      err => {
        if (err) {
          this.logger.error(`Mailer: ${JSON.stringify(err)}`);
        }
      }
    );
  }
};
