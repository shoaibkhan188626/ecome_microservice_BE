# Build from monorepo root: docker-compose build notification-service
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy common package and notification service
COPY packages/common/ ./packages/common/
COPY services/notification-service/ ./services/notification-service/

# Install: first common, then notification service with common as file dep
WORKDIR /usr/src/app/packages/common
RUN npm install --omit=dev

WORKDIR /usr/src/app/services/notification-service
# Use file path for local common package (replaces workspace:* in Docker)
RUN npm install ../../packages/common --save
RUN npm install --omit=dev

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p logs && chown -R nodejs:nodejs /usr/src/app

USER nodejs

WORKDIR /usr/src/app/services/notification-service

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
