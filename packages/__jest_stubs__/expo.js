'use strict';
module.exports = {
  requireNativeModule: function () {
    throw new Error('Native module not available in test environment');
  },
};
