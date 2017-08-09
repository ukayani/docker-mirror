'use strict'
const server = require('./lib/server');
const bunyan = require('bunyan');
const restify = require('restify');
const config = require('./lib/config').get();

const NAME = require('./package.json').name;

// In true UNIX fashion, debug messages go to stderr, and audit records go
// to stdout, so you can split them as you like in the shell
// see: github restify todo example app
const LOG = bunyan.createLogger({
  name: NAME,
  streams: [{
    level: (process.env.LOG_LEVEL || 'info'),
    stream: process.stderr
  }, {
    // This ensures that if we get a WARN or above all debug records
    // related to that request are spewed to stderr - makes it nice
    // filter out debug messages in prod, but still dump on user
    // errors so you can debug problems
    level: 'debug',
    type: 'raw',
    stream: new restify.bunyan.RequestCaptureStream({
      level: bunyan.WARN,
      maxRecords: 100,
      maxRequestIds: 1000,
      stream: process.stderr
    })
  }],
  serializers: restify.bunyan.serializers
});

(function main() {

  const serverInstance = server.create({
    name: NAME,
    log: LOG,
    secret: config.get('secret'),
    context: config.get('context')
  });

  serverInstance.listen(config.get('port'), () => {
    LOG.info('listening at %s', serverInstance.url);
  });
})();
