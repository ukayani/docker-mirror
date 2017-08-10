'use strict';

const expect = require('chai').expect;
const request = require('supertest-as-promised');
const server = require('../lib/server');

const serverName = 'TEST';
const dockerHost = '172.168.10.2';
const validContainerId = 'a91dd8175122';
const mockDockerPortData = {
  Ports: {
    '80/tcp': [
      {
        HostIp: '0.0.0.0',
        HostPort: '8080'
      },
      {
        HostIp: '10.0.0.2',
        HostPort: '8081'
      }
    ],
    '2551/tcp': [
      {
        HostIp: '10.0.0.1',
        HostPort: '32768'
      }
    ]
  }
};

const mockDockerClient = () => {
  // simulate getContainer which returns an object containing the inspect key pointing to a function
  const mockGetContainer = (containerId) => {
    // simulate responses (asynchronous) for containers that exist
    const validMockInspect = () => {
      return Promise.resolve({
        NetworkSettings: mockDockerPortData
      });
    };

    // simulate responses for containers that do not exist
    const invalidMockInspect = () => Promise.reject({});

    if (containerId === validContainerId) {
      return {
        inspect: validMockInspect
      }
    } else {
      return {
        inspect: invalidMockInspect
      };
    }
  };

  return { getContainer: mockGetContainer };
};

const createServer = () => {
  return server.create({
    name: serverName,
    hostIp: dockerHost
  }, {
    docker: mockDockerClient()
  });
};

describe('Docker Mirror Specification', () => {
  describe('GET /container/:containerId/port/:portId', () => {
    it('returns a valid host port for a valid container port (uses HostIp: 0.0.0.0 by default)', () => {
      return request(createServer())
        .get(`/container/${validContainerId}/port/80`)
        .expect(200)
        .then((res) =>
          expect(res.text).to.equal(mockDockerPortData.Ports['80/tcp'].find((e) => e.HostIp === '0.0.0.0').HostPort));
    });

    it('returns 404 if you provide a valid container but an invalid container port', () => {
      return request(createServer())
        .get(`/container/${validContainerId}/port/1`)
        .expect(404)
        .then((res) => expect(res.text).to.equal('Port not found'));
    });

    it('returns 404 if you provide an invalid container id', () => {
      return request(createServer())
        .get('/container/invalid/port/80')
        .expect(404)
        .then((res) => expect(res.text).to.equal('Container not found'));
    });
  });

  describe('GET /container/:containerId/port/:portId?hostIp=a.b.c.d', () => {
    const containerHostname = '10.0.0.1';
    it('returns a valid host port for a valid container port when targeting a container bound to a specific interface (10.0.0.1)', () => {
      return request(createServer())
        .get(`/container/${validContainerId}/port/2551?hostIp=${containerHostname}`)
        .expect(200)
        .then((res) =>
          expect(res.text).to.equal(
            mockDockerPortData.Ports['2551/tcp'].find((e) => e.HostIp === containerHostname).HostPort)
        );
    });

    it('returns 404 if you provide a valid container id but an interface for a container that does not exist', () => {
      const invalidContainerInterfaceHost = '1.1.1.1';
      return request(createServer())
        .get(`/container/${validContainerId}/port/2551?hostIp=${invalidContainerInterfaceHost}`)
        .expect(404)
        .then((res) => expect(res.text).to.equal(`No port found with hostname: ${invalidContainerInterfaceHost}`))
    })
  });

  describe('GET /hostip', () => {
    it('returns the IP of the host running Docker containers (fed in at the start)', () => {
      return request(createServer())
        .get('/hostip')
        .expect(200)
        .then((res) => expect(res.text).to.equal(dockerHost));
    })
  });

  describe('GET /health', () => {
    it('returns 200 and the name of the server when running', () => {
      return request(createServer())
        .get('/health')
        .expect(200)
        .then((res) => expect(res.body.name).to.equal(serverName))
    })
  })
});
