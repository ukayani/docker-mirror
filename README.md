# Docker Mirror #

_A Node.JS service which returns host level networking information for
Docker containers_


## Requirements ##

- Node.JS v7.x or greater

## How to run ##

### Requirements ###

- Mounting the Docker socket of the host into the container
- Mounting the file `/etc/hostip` that contains the IP of the host
  machine

### Running Docker Mirror ###

We recommend running Docker Mirror as a container with a restart policy.

```bash
docker run -d --name docker-mirror \
-p 9001:9000 --restart always \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /etc/hostip:/etc/hostip \
loyaltyone/docker-mirror:0.1.2
```

Docker Mirror needs to be running on every host machine where this
introspection functionality will be needed.

## Purpose ##

Inside a container, it is often necessary to obtain network related
information such as the port which the host binds to the container and
the IP of the host. Docker Mirror aims to make the retrieval of this
information easy.

![image](https://user-images.githubusercontent.com/14280155/32448019-bf29e37e-c2db-11e7-9460-d13ccce89187.png)

Docker Mirror is an _introspection_ web service for Docker containers.
Given a container ID and a container Port, Docker Mirror will tell you
the host IP and the host Port that the container is running on.

![image](https://user-images.githubusercontent.com/14280155/32453019-2d684936-c2e9-11e7-8fb4-2acee2149499.png)

The application communicates with Docker Mirror using the bridge/docker0
IP. This assumes you have Docker Mirror running in the same Docker
network as your application. You can obtain the bridge/docker0 IP (from
within your application container) using the following query:
```bash
$(/sbin/ip route | awk '/default/ { print $3 }')
```

Here is an example of what you could run to retrieve this information in
your container:
```bash
#!/bin/bash
DOCKER_MIRROR_HOST=$(/sbin/ip route | awk '/default/ { print $3 }')

DOCKER_MIRROR_PORT=${MIRROR_PORT:-9001}
DOCKER_MIRROR="http://$DOCKER_MIRROR_HOST:$DOCKER_MIRROR_PORT"

# HOSTNAME is the Docker container ID
# APP_PORT is the container Port
export HOST_IP=$(curl $DOCKER_MIRROR/hostip)
export HOST_PORT=$(curl $DOCKER_MIRROR/container/$HOSTNAME/port/$APP_PORT)
```

Nodes in clustered applications (for example Akka Cluster) need to
communicate with each other. The premise is that each node in the
clustered application runs in a Docker container and on multiple hosts.
In order to communicate with each other (across hosts), they need to be
able to tell other nodes how to reach them. In this case, it is not
sufficient to advertise the container's IP and container's Ports to
other nodes in the cluster. Here is a scenario demonstrating what would
happen _without_ Docker Mirror:

Given 2 host machines that will run the Docker containers:
- `HostA` (10.0.0.1)
- `HostB` (10.0.0.2)

And 2 containers:
- `ContainerA` (Virtual 172.17.0.3:9001) running on `HostA`
(10.0.0.1:3000)
- `ContainerB` (Virtual 172.17.0.2:9001) running on `HostB`
(10.0.0.2:3000)

The 2 containers need to communicate with each other. They naively
advertise the container's IP and container's Port. So `ContainerA`
advertises that it can be reached at virtual IP `172.17.0.3` on port
`9001` and `ContainerB` can be reached at virtual IP `172.17.0.2` on
port `9001`. When the communication occurs, **the nodes in the system
will not be able to find each other** since they are using virtual IPs
which do not correctly map to the host machine IP and host machine Port
running the containers. When advertising, the containers need to use the
actual host machine IP and host machine Port which is listening for
traffic.

Using Docker Mirror, the containers in the above scenario would
correctly advertise on the host machine IP and Port:
- `ContainerA` would advertise on `HostA` IP: 10.0.0.1 and Port: 3000
- `ContainerB` would advertise on `HostB` IP: 10.0.0.2 and Port: 3000

And would be able to find and communicate with each other.
