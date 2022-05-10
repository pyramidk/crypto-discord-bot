module.exports = class Notify {
  constructor(notifier) {
    this.notifier = notifier;
  }

  send(message, messageInfo) {
    this.notifier.forEach(notify => notify.send(message, messageInfo));
  }
};
