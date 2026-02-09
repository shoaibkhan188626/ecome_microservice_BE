FROM node:20-alpine

WORKDIR /usr/src/app

# Copy common package first
COPY packages/common/package*.json ./packages/common/
COPY packages/common/src/ ./packages/common/src/

# Install common package dependencies
WORKDIR /usr/src/app/packages/common
RUN npm install

# Go to service directory
WORKDIR /usr/src/app/services/payment-service

# Copy service package.json (with file: reference instead of workspace:*)
COPY services/payment-service/package*.json ./

# Install service dependencies (common will be resolved from local path)
RUN npm install

# Copy service source code
COPY services/payment-service/src/ ./src/
COPY services/payment-service/.env* ./

EXPOSE 3006

CMD ["npm", "start"]