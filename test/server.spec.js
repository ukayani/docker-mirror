'use strict';

const expect = require('chai').expect;
const request = require('supertest-as-promised');
const server = require('../lib/server');

const secret = 'test';

const createServer = () => {
  return server.create({
    name: 'test',
    secret: secret
  });
};

describe('Server', () => {

  describe('GET /message', () => {
    it('should return hello world', () => {
      return request(createServer())
        .get('/message')
        .expect(200)
        .then((res) => {
          expect(res.body.message).to.equal('Hello World');
        });
    });
  });

  describe('POST /secure', () => {
    it('should return 403 when invalid secret is provided', () => {
      return request(createServer())
        .post('/secure')
        .send({secret: 'blah'})
        .expect(403)
    });

    it('should return 200 "Acces Granted" when valid secret is provided', () => {
      return request(createServer())
        .post('/secure')
        .send({secret: secret})
        .expect(200)
        .then((res) => {
          expect(res.body.message).to.equal('Access Granted');
        });
    });
  });
});
