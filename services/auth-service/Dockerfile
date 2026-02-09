FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# 2. Copy Root and Package definitions first (Optimizes Cache)
# We need the root package.json to understand the workspaces configuration
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY services/auth-service/package*.json ./services/auth-service/

# 3. Install dependencies
# Running 'npm install' at the root installs all dependencies and links @ecommerce/common
RUN npm install

# 4. Copy the entire project source code, respecting .dockerignore
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /usr/src/app

USER nodejs

# 5. Switch to the service directory
WORKDIR /usr/src/app/services/auth-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 7. Start the service
CMD ["npm", "start"]