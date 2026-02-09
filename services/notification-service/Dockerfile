# Build from monorepo root: docker-compose build notification-service
FROM node:20-alpine

WORKDIR /usr/src/app

# 2. Copy Root and Package definitions first (Optimizes Cache)
# We need the root package.json to understand the workspaces configuration
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY services/notification-service/package*.json ./services/notification-service/

# 3. Install dependencies
# Running 'npm install' at the root installs all dependencies and links @ecommerce/common
RUN npm install

# 4. Copy the entire project source code, respecting .dockerignore
COPY . .

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p logs && chown -R nodejs:nodejs /usr/src/app

USER nodejs

# 5. Switch to the service directory
WORKDIR /usr/src/app/services/notification-service

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 7. Start the service
CMD ["npm", "start"]
