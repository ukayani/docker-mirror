FROM node:7-alpine

WORKDIR /opt/app

# Copy contents of dist to /opt/app
ADD dist /opt/app

USER root

COPY bootstrap /usr/local/bin/
# allow any commands to supply arguments to the node app

ENTRYPOINT ["/usr/local/bin/bootstrap", "npm", "start", "--"]
CMD []
