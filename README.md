# Docker Mirror #

_A Node.JS service which returns host level networking information for
Docker containers_


## Requirements ##

- Node.JS v7.x or greater

## Purpose ##

From inside the container, you cannot (_easily_) obtain information
about the machine (Host) running your Container and the port mappings
that direct traffic from the Host to the Container.

![image](https://user-images.githubusercontent.com/14280155/32448019-bf29e37e-c2db-11e7-9460-d13ccce89187.png)

Docker Mirror is an _introspection_ web service for Docker Containers.
Given a Container ID and a Container Port, Docker Mirror will be tell
you the Host IP and the Host Port that the Container is running on.

![image](https://user-images.githubusercontent.com/14280155/32453019-2d684936-c2e9-11e7-8fb4-2acee2149499.png)

The application communicates with Docker Mirror using the bridge/docker0 IP. This assumes you have Docker Mirror 
running in the same Docker network as your application. You can obtain the bridge/docker0 IP (from within your
application container) using the following query:
```bash
$(/sbin/ip route | awk '/default/ { print $3 }')
```

Here's what you would execute in your container:
```bash
#!/bin/bash
DOCKER_MIRROR_HOST=$(/sbin/ip route | awk '/default/ { print $3 }')

DOCKER_MIRROR_PORT=${MIRROR_PORT:-9001}
DOCKER_MIRROR="http://$DOCKER_MIRROR_HOST:$DOCKER_MIRROR_PORT"

# HOSTNAME is the Docker Container ID
# APP_PORT is the Container Port 
export HOST_IP=$(curl $DOCKER_MIRROR/hostip) 
export HOST_PORT=$(curl $DOCKER_MIRROR/container/$HOSTNAME/port/$APP_PORT)
```

Nodes in clustered applications (for example Akka Cluster) need to
communicate with each other. The premise is that each node in the
clustered application runs in a Docker container and on multiple Hosts.
In order to communicate with each other (across Hosts), they need to be
able to tell other nodes how to reach them. In this case, it is not
sufficient to advertise Container's IP and Container's Ports to other
nodes in the cluster. Here is a scenario demonstrating what would happen
_without_ Docker Mirror:

Given 2 Host machines that will run the Docker Containers:
- `HostA` (10.0.0.1)
- `HostB` (10.0.0.2)

And 2 Containers:
- `ContainerA` (Virtual 172.17.0.3:9001) running on `HostA`
(10.0.0.1:3000)
- `ContainerB` (Virtual 172.17.0.2:9001) running on `HostB`
(10.0.0.2:3000)

The 2 Containers need to communicate with each other. They naively
advertise the Container's IP and Container's Port. So `ContainerA`
advertises that it can be reached at virtual IP `172.17.0.3` on port
`9001` and `ContainerB` can be reached at virtual IP `172.17.0.2` on
port `9001`. When the communication occurs, **the nodes in the system
will not be able to find each other** since they are using virtual IPs
which do not correctly map to the Host machine IP and Host Machine Port
running the Containers. When advertising, the Containers need to use the
actual Host machine IP and Host machine Port which is listening for
traffic.

Using Docker Mirror, the Containers in the above scenario would
correctly advertise on the Host Machine IP and Port:
- `ContainerA` would advertise on `HostA` IP: 10.0.0.1 and Port: 3000
- `ContainerB` would advertise on `HostB` IP: 10.0.0.2 and Port: 3000

And would be able to find and communicate with each other.

## How to run ##
Docker Mirror requires access to the Host Machine's Docker Daemon. We
recommend running Docker Mirror as a Container and the Host Machine's
Docker Daemon is mounted into the Docker Mirror Container.

```bash
docker run -d --name docker-mirror \
-p 9001:9001 --restart always \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /etc/hostip:/etc/hostip \
loyaltyone/docker-mirror:0.1.2
```

Docker Mirror runs on port 9000 so we map port 9001 on the Host Machine
to direct traffic to port 9000 in the Docker Mirror Container. We tell
the Docker Daemon to restart this Docker Mirror container if there are
any failures. We also mount the Host Machine's Docker Socket so that
Docker Mirror is able to gain access to the Host's Docker Daemon to
provide the Host-to-Container port mappings. We also mount a file
`/etc/hostip` which is a plaintext file that contains the IP of the
Host Machine. Docker Mirror needs to be running on every Host Machine
where Docker Containers will be run and where this introspection
functionality will be needed.
