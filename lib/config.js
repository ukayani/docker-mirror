'use strict';
const convict = require('convict');

// Define a schema
const schema = {
  env: {
    doc: 'The applicaton environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  ip: {
    doc: 'The IP address to bind.',
    format: 'ipaddress',
    default: '127.0.0.1',
    env: 'IP_ADDRESS'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 9000,
    env: 'PORT'
  },
  secret: {
    doc: 'Application Secret',
    format: String,
    default: '',
    env: 'APP_SECRET'
  },
  context: {
    doc: 'The context at which to handle requests',
    format: String,
    default: '',
    env: 'NODE_HTTP_CONTEXT',
    arg: 'node-http-context'
  }
};

module.exports = {
  get: () => convict(schema)
};
