FROM loyaltyone/docker-alpine-java-node:jre-8-node-7

WORKDIR /opt/app

# Copy contents of dist to /opt/app
ADD dist /opt/app
# Give ownership to daemon user
RUN ["chown", "-R", "daemon:daemon", "."]
USER daemon

# Run env-decrypt followed by npm start
# allow any commands to supply arguments to the node app
ENTRYPOINT ["/usr/local/bin/env-decrypt", "npm", "start", "--"]
