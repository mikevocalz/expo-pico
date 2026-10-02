'use strict';
function EventEmitter() {}
EventEmitter.prototype.addListener = function () {
  return { remove: function () {} };
};
EventEmitter.prototype.removeAllListeners = function () {};
EventEmitter.prototype.emit = function () {};

module.exports = {
  requireNativeModule: function () {
    throw new Error('Native module not available in test environment');
  },
  requireOptionalNativeModule: function () {
    return null;
  },
  EventEmitter: EventEmitter,
};
