const request = require('./request-wrapper');
module.exports = function(req) {
  // The req parameter here is not used, but maintained for compatibility
  // We inject our request wrapper instead of the deprecated request module
  return require('./httpEnvelope')(request);
};
