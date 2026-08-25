'use strict';
// Mirrors a build with no PICO native library present: createHybridObject
// throws, resolveHybridObject swallows it, and every package reports
// unavailable rather than crashing.
module.exports = {
  NitroModules: {
    createHybridObject: function () {
      throw new Error('HybridObject not available in test environment');
    },
  },
};
