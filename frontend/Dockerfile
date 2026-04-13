FROM node:22-alpine

WORKDIR /app

# The node image already has a node user with UID 1000.
# We will delete it and create 'appuser' if UID 1000 is taken.
RUN if getent passwd 1000 > /dev/null; then         CONF_USER=$(getent passwd 1000 | cut -d: -f1);         deluser "$CONF_USER";     fi &&     if getent group 1000 > /dev/null; then         CONF_GROUP=$(getent group 1000 | cut -d: -f1);         delgroup "$CONF_GROUP";     fi &&     addgroup -g 1000 appuser &&     adduser -D -u 1000 -G appuser appuser

COPY package*.json ./

RUN npm install

COPY . .

USER appuser

EXPOSE 5173

CMD ["sh", "-c", "rm -rf node_modules/.vite && npm run dev -- --host --force"]
