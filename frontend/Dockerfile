FROM node:22-alpine

WORKDIR /app

RUN useradd -m -u 1000 appuser

COPY package*.json ./

RUN npm install

COPY . .

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 5001

CMD ["npm", "run", "dev", "--", "--host"]
