FROM node:20-alpine

# 1. Set working directory to the container root
WORKDIR /usr/src/app

# 2. Copy Root and Package definitions first (Optimizes Cache)
# We need the root package.json to understand the workspaces
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY services/inventory-service/package*.json ./services/inventory-service/

# 3. Install dependencies
# Running this at root installs dependencies for the specific service AND links the local common package
RUN npm install

# 4. Copy the entire project source code, respecting .dockerignore
COPY . .

# 5. Switch to the service directory
WORKDIR /usr/src/app/services/inventory-service

# 6. Expose the port (matches your .env config)
EXPOSE 3003

# 7. Start the service
CMD ["npm", "start"]