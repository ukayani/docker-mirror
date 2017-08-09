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
    res.setHeader('content-type', 'text/plain');
    docker.getContainer(req.params.id).inspect().then(data => {
      const portKey = `${req.params.port}/tcp`;
      const ports = data.NetworkSettings.Ports;
      const hostIp = req.query.hostIp || '0.0.0.0';

      if (portKey in ports) {
        const portEntry = ports[portKey].find(e => e.HostIp === hostIp);
        if (!portEntry) {
          res.send(404, `No port found with hostname: ${hostIp}`);
        } else {
          res.send(200, parseInt(portEntry.HostPort));
        }
      } else {
        res.send(404, 'Port not found');
      }
      next();
    }).catch(() => {
      res.send(404, 'Container not found');
      next();
    });
  });

  router.get('/hostip', (req, res, next) => {
    res.setHeader('content-type', 'text/plain');
    res.send(200, options.hostIp);
    next();
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
  assert.string(options.hostIp, 'hostIp');

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
