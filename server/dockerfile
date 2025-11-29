# server/Dockerfile - simple Node runtime for Express server
FROM node:18-alpine
WORKDIR /app

# copy package files and install
COPY package*.json ./
RUN npm ci --only=production

# copy server code
COPY . .

# environment
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
