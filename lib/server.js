'use strict';

const restify = require('restify');
const assert = require('assert-plus');
const errors = require('restify-errors');
const Router = require('restify-router').Router;
const Docker = require('dockerode');

const docker = new Docker();

const registerMiddleware = (server) => {
  // Clean up sloppy paths like //todo//////1//
  server.pre(restify.pre.sanitizePath());

  // Handles annoying user agents (curl)
  server.pre(restify.pre.userAgentConnection());

  // Set a per request bunyan logger (with requestid filled in)
  server.use(restify.requestLogger());

  // Use the common stuff you probably want
  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.dateParser());
  server.use(restify.queryParser());
  server.use(restify.gzipResponse());
};

const registerRoutes = (server, options) => {

  const router = new Router();
  const prefix = options.context;

  router.get('/container/:id/port/:port', (req, res, next) => {
    docker.getContainer(req.params.id).inspect().then(data => {
      const portKey = `${req.params.port}/tcp`;
      res.setHeader('content-type', 'text/plain');
      res.send(200, parseInt(data.NetworkSettings.Ports[portKey][0].HostPort));
      next();
    }).catch(err => next(err));
  });

  router.get('/health', (req, res, next) => {
    res.send({name: options.name});
    next();
  });

  router.applyRoutes(server, prefix);
  return server;
};

const create = (options) => {

  assert.object(options, 'options');
  assert.string(options.name, 'name');

  options.context = options.context || '';

  const server = restify.createServer({
    log: options.log,
    name: options.name
  });

  registerMiddleware(server);
  registerRoutes(server, options);

  return server;
};

module.exports = {
  create
};
