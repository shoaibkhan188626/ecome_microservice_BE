# E-Commerce Backend - Comprehensive Knowledge Base

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Patterns](#architecture-patterns)
5. [Coding Patterns & Conventions](#coding-patterns--conventions)
6. [Microservices Details](#microservices-details)
7. [Infrastructure & Dependencies](#infrastructure--dependencies)
8. [Development Practices](#development-practices)
9. [API Design Patterns](#api-design-patterns)
10. [Database Patterns](#database-patterns)
11. [Security Patterns](#security-patterns)
12. [Deployment & DevOps](#deployment--devops)

---

## Project Overview

### Purpose
A production-ready, scalable e-commerce backend built using microservices architecture. The system handles authentication, product catalog management, inventory tracking, shopping cart operations, order processing, and notifications.

### Architecture Type
- **Pattern**: Microservices Architecture (Monorepo)
- **Communication**: Hybrid (HTTP Request-Response + Event-Driven via RabbitMQ)
- **Database Strategy**: Database-per-Service (MongoDB)
- **Shared Code**: NPM Workspaces with `@ecommerce/common` package

### Key Features
- ✅ State Machine-based Order Processing
- ✅ Event-Driven Notifications
- ✅ Atomic Inventory Management with Redis Locking
- ✅ Infinite Category Nesting (Materialized Path Pattern)
- ✅ EAV (Entity-Attribute-Value) Product Attributes
- ✅ CQRS Pattern in Order Service
- ✅ Idempotency Support
- ✅ Distributed Request Tracing
- ✅ Rate Limiting & Security Hardening

---

## Technology Stack

### Core Runtime & Language
- **Runtime**: Node.js (ES Modules)
- **Language**: JavaScript (ES6+)
- **Package Manager**: NPM with Workspaces

### Web Framework
- **Framework**: Express.js v5.2.1
- **HTTP Server**: Built-in Node.js HTTP

### Databases
- **Primary Database**: MongoDB (via Mongoose v8.0.3 / v9.1.5)
- **Cache**: Redis (via ioredis v5.3.2)
- **Message Broker**: RabbitMQ (via amqplib v0.10.3)

### Security & Authentication
- **JWT**: jsonwebtoken v9.0.2
- **Password Hashing**: bcryptjs v2.4.3 / bcrypt v6.0.0
- **Security Headers**: helmet v8.1.0
- **CORS**: cors v2.8.6

### Logging & Monitoring
- **Logger**: winston v3.11.0 / v3.19.0
- **Request ID**: Custom middleware for distributed tracing

### HTTP Client & Communication
- **HTTP Client**: axios v1.13.4
- **Proxy Middleware**: http-proxy-middleware v3.0.5
- **Rate Limiting**: express-rate-limit v8.2.1

### Notification Services
- **Email**: nodemailer v7.0.13
- **SMS**: Twilio v5.12.0, @fonoster/sdk v0.17.1

### Utilities
- **Slug Generation**: slugify v1.6.6
- **Environment Variables**: dotenv v16.3.1 / v17.2.3
- **Cookie Parser**: cookie-parser v1.4.7

### Development Tools
- **Process Manager**: nodemon v3.1.11
- **Linting**: eslint v9.39.2
- **Containerization**: Docker & Docker Compose

---

## Project Structure

```
eCom_BE/
├── packages/
│   └── common/                    # Shared utilities and infrastructure
│       ├── package.json
│       └── src/
│           ├── index.js           # Main exports
│           ├── config/
│           │   └── baseConfig.js
│           ├── errors/
│           │   └── AppError.js    # Custom error classes
│           ├── helpers/
│           │   ├── asyncHandler.js
│           │   ├── cacheHelper.js
│           │   ├── pagination.js
│           │   └── slugify.js
│           ├── infrastructure/
│           │   ├── cache/
│           │   │   └── redisClient.js
│           │   ├── database/
│           │   │   └── MongoConnection.js
│           │   ├── messaging/
│           │   │   └── rabbitmq.js
│           │   └── payment/
│           │       ├── paymentGateway.js
│           │       └── razorPayAdapter.js
│           ├── middlewares/
│           │   ├── errorHandler.js
│           │   └── requestId.js
│           ├── utils/
│           │   ├── dateHelper.js
│           │   ├── httpClient.js
│           │   ├── jwtHelper.js
│           │   ├── logger.js
│           │   ├── passwordHelper.js
│           │   └── responseHandler.js
│           └── validators/
│               └── commonValidators.js
│
├── services/
│   ├── api-gateway/               # API Gateway Service (Port 3000)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── index.js
│   │   └── src/
│   │       ├── config/
│   │       │   └── index.js
│   │       └── api/
│   │           ├── middlewares/
│   │           │   ├── proxyHandler.js
│   │           │   └── rateLimiter.js
│   │           └── routes/
│   │               └── health.js
│   │
│   ├── auth-service/              # Authentication Service (Port 3001)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   └── index.js
│   │   │   └── api/
│   │   │       ├── controllers/
│   │   │       │   └── authController.js
│   │   │       ├── middlewares/
│   │   │       │   ├── authenticate.js
│   │   │       │   ├── authorize.js
│   │   │       │   └── validate.js
│   │   │       └── routes/
│   │   │           ├── authRoutes.js
│   │   │           └── healthRoutes.js
│   │   └── domain/
│   │       ├── entities/
│   │       │   └── User.js
│   │       └── services/
│   │           ├── authService.js
│   │           └── tokenService.js
│   │
│   ├── catalog-service/           # Product Catalog Service (Port 3002)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   └── index.js
│   │   │   └── api/
│   │   │       ├── controllers/
│   │   │       │   ├── categoryController.js
│   │   │       │   └── productController.js
│   │   │       ├── middlewares/
│   │   │       │   └── validate.js
│   │   │       └── routes/
│   │   │           ├── categoryRoutes.js
│   │   │           ├── healthRoutes.js
│   │   │           ├── index.js
│   │   │           └── productRoutes.js
│   │   └── domain/
│   │       ├── entities/
│   │       │   ├── Category.js
│   │       │   ├── Product.js
│   │   │       └── ProductVariants.js
│   │       └── services/
│   │           ├── categoryService.js
│   │           └── productService.js
│   │
│   ├── inventory-service/         # Inventory Management Service (Port 3003)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   └── index.js
│   │   │   ├── infrastructure/
│   │   │   │   └── cache/
│   │   │   │       └── lockManager.js
│   │   │   └── api/
│   │   │       ├── controllers/
│   │   │       │   └── inventoryController.js
│   │   │       ├── middlewares/
│   │   │       │   └── validate.js
│   │   │       └── routes/
│   │   │           ├── healthRoutes.js
│   │   │           └── inventoryRoutes.js
│   │   └── domain/
│   │       ├── entities/
│   │       │   ├── Inventory.js
│   │       │   └── StockMovement.js
│   │       └── services/
│   │           └── InventoryService.js
│   │
│   ├── cart-service/              # Shopping Cart Service (Port 3004)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   └── index.js
│   │   │   └── api/
│   │   │       ├── controllers/
│   │   │       │   └── cartController.js
│   │   │       ├── middlewares/
│   │   │       │   ├── optionalAuth.js
│   │   │       │   └── sessionMiddleware.js
│   │   │       └── routes/
│   │   │           ├── cartRoutes.js
│   │   │           └── healthRoutes.js
│   │   └── domain/
│   │       ├── entities/
│   │       │   └── Cart.js
│   │       └── services/
│   │           └── cartService.js
│   │
│   ├── order-service/             # Order Management Service (Port 3005)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config/
│   │   │   │   └── index.js
│   │   │   └── api/
│   │   │       ├── controllers/
│   │   │       │   └── orderController.js
│   │   │       ├── middlewares/
│   │   │       │   ├── authenticate.js
│   │   │       │   └── authorize.js
│   │   │       └── routes/
│   │   │           ├── healthRoutes.js
│   │   │           └── orderRoutes.js
│   │   └── domain/
│   │       ├── entities/
│   │       │   └── Order.js
│   │       ├── services/
│   │       │   └── orderService.js
│   │       └── state-machine/
│   │           └── orderState.js
│   │
│   └── notification-service/     # Notification Service (Event-Driven)
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── index.js
│       │   ├── config/
│       │   │   └── index.js
│       │   ├── consumers/
│       │   │   └── notificationConsumer.js
│       │   ├── templates/
│       │   │   └── emailTemplates.js
│       │   └── api/
│       │       └── controllers/
│       │           └── notificationController.js
│       └── domain/
│           ├── entities/
│           │   └── Notification.js
│           └── services/
│               ├── emailService.js
│               ├── notificationService.js
│               ├── pushService.js
│               └── smsService.js
│
├── docker-compose.yml             # Docker Compose orchestration
├── .gitignore
├── README.md
└── feedback.md
```

---

## Architecture Patterns

### 1. Microservices Architecture
- **Separation**: Each service is independently deployable
- **Database-per-Service**: Each service has its own MongoDB database
- **Service Communication**: 
  - Synchronous: HTTP/REST via API Gateway
  - Asynchronous: RabbitMQ for event-driven communication

### 2. Domain-Driven Design (DDD)
- **Entities**: Domain models (User, Product, Order, etc.)
- **Services**: Business logic layer
- **Repositories**: Mongoose models act as repositories
- **Value Objects**: Embedded in entities (e.g., Address, Pricing)

### 3. Layered Architecture (per Service)
```
┌─────────────────────────────────┐
│   API Layer (Controllers)        │
├─────────────────────────────────┤
│   Middleware Layer               │
├─────────────────────────────────┤
│   Domain Layer (Services)        │
├─────────────────────────────────┤
│   Infrastructure Layer           │
│   (Database, Cache, Messaging)   │
└─────────────────────────────────┘
```

### 4. API Gateway Pattern
- **Single Entry Point**: All external requests go through API Gateway
- **Routing**: Routes requests to appropriate microservices
- **Cross-Cutting Concerns**: 
  - Rate Limiting
  - Request ID Generation
  - CORS Handling
  - Security Headers

### 5. Event-Driven Architecture
- **Message Broker**: RabbitMQ
- **Pattern**: Publish-Subscribe with Topic Exchanges
- **Use Cases**: 
  - Order events → Notification Service
  - Inventory updates → Catalog Service
  - User registration → Notification Service

### 6. CQRS (Command Query Responsibility Segregation)
- **Implementation**: Order Service
- **Commands**: Create order, update order state
- **Queries**: Get order details, order history

### 7. State Machine Pattern
- **Service**: Order Service
- **States**: pending → confirmed → processing → shipped → delivered
- **Transitions**: Controlled by events and business rules
- **File**: `order-service/src/domain/state-machine/orderState.js`

### 8. Materialized Path Pattern
- **Use Case**: Infinite Category Nesting
- **Implementation**: Category entity stores full path
- **Performance**: O(log n) queries with path indexes
- **Example**: `Electronics/Phones/Smartphones`

### 9. EAV (Entity-Attribute-Value) Pattern
- **Use Case**: Product Attributes
- **Implementation**: Flexible attribute storage in Product schema
- **Types**: string, number, boolean, array

### 10. Repository Pattern
- **Implementation**: Mongoose models act as repositories
- **Abstraction**: Service layer uses models, not direct DB access

---

## Coding Patterns & Conventions

### 1. Service Initialization Pattern
All services follow a consistent initialization pattern:

```javascript
class ServiceName {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() { /* ... */ }
  setupRoutes() { /* ... */ }
  setupErrorHandling() { /* ... */ }

  async start() {
    await dbConnection.connect(config.mongoUri);
    this.app.listen(config.port, () => {
      logger.info(`🚀 Service running on port ${config.port}`);
    });
  }
}
```

### 2. Error Handling Pattern
- **Custom Error Classes**: `AppError`, `ValidationError`, `NotFoundError`, etc.
- **Global Error Handler**: `createErrorHandler` middleware
- **Async Error Wrapper**: `asyncHandler` for route handlers

```javascript
// Route handler with asyncHandler
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);
  ResponseHandler.success(res, user);
}));
```

### 3. Response Format Pattern
Standardized API response structure:

```javascript
// Success Response
{
  "success": true,
  "data": { /* ... */ },
  "error": null,
  "metadata": {
    "timestamp": "2026-02-05T10:30:00.000Z",
    "requestId": "uuid-here",
    "version": "v1"
  }
}

// Error Response
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { /* ... */ }
  },
  "metadata": { /* ... */ }
}
```

### 4. Logging Pattern
- **Service-Specific Loggers**: Created via `createLogger(serviceName, logLevel, isProduction)`
- **Structured Logging**: JSON format in production
- **Request Context**: Includes requestId, IP, userAgent

```javascript
logger.info(`${req.method} ${req.path}`, {
  requestId: res.locals.requestId,
  ip: req.ip,
  userAgent: req.get("user-agent"),
});
```

### 5. Request ID Pattern
- **Middleware**: `requestIdMiddleware` generates unique ID per request
- **Propagation**: Passed through all service calls
- **Tracing**: Enables distributed request tracing

### 6. Configuration Pattern
- **Environment-Based**: Uses `dotenv` for environment variables
- **Service Config**: Each service has `config/index.js`
- **Base Config**: Shared config in `packages/common/src/config/baseConfig.js`

### 7. Database Connection Pattern
- **Singleton**: `MongoConnection` class manages connection
- **Retry Logic**: Automatic reconnection with exponential backoff
- **Event Handlers**: Connection state monitoring

### 8. Cache Pattern
- **Redis Client**: Shared `RedisClient` from common package
- **Cache Helpers**: `CacheHelper` for common operations
- **TTL Management**: Configurable expiration times

### 9. Validation Pattern
- **Middleware**: `validate` middleware for request validation
- **Validators**: Common validators in `packages/common/src/validators`
- **Mongoose Validation**: Schema-level validation

### 10. Authentication Pattern
- **JWT Tokens**: Access token + Refresh token
- **Middleware**: `authenticate` middleware for protected routes
- **Authorization**: `authorize` middleware for role-based access

### 11. Pagination Pattern
- **Helper**: `PaginationHelper` from common package
- **Standard Format**: Consistent pagination metadata

```javascript
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 12. Service Class Pattern
Domain services are implemented as classes with methods:

```javascript
class CategoryService {
  async create(data) { /* ... */ }
  async getById(id) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
}

export default new CategoryService();
```

---

## Microservices Details

### 1. API Gateway Service
**Port**: 3000  
**Purpose**: Single entry point for all external requests

**Features**:
- Request routing to microservices
- Rate limiting (general + strict for auth endpoints)
- Request ID generation
- CORS handling
- Security headers (Helmet)
- Cluster mode in production (multi-core support)

**Dependencies**:
- `@ecommerce/common`
- `express`
- `http-proxy-middleware`
- `express-rate-limit`
- `helmet`
- `cors`

**Routes**:
- `/health` - Health check
- `/api/*` - Proxied to respective services

### 2. Auth Service
**Port**: 3001  
**Database**: `auth`  
**Purpose**: User authentication and authorization

**Features**:
- User registration and login
- JWT token generation (access + refresh)
- Password hashing (bcrypt)
- Account lockout after failed attempts
- OAuth support (Google, Facebook, GitHub)
- Role-based access control (RBAC)
- Email verification

**Entities**:
- `User`: Email, password, roles, OAuth info, security fields

**Endpoints**:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

**Dependencies**:
- `@ecommerce/common`
- `mongoose`
- `jsonwebtoken`
- `bcryptjs`
- `express`

### 3. Catalog Service
**Port**: 3002  
**Database**: `catalog`  
**Purpose**: Product and category management

**Features**:
- Infinite category nesting (Materialized Path)
- Product management with EAV attributes
- Product variants support
- Category tree operations
- Product search
- SEO-friendly slugs

**Entities**:
- `Category`: Name, slug, path, parent, level, SEO fields
- `Product`: Name, SKU, pricing, attributes (EAV), variants
- `ProductVariants`: Size, color, price variations

**Endpoints**:
- Categories: CRUD + tree operations
- Products: CRUD + search + featured products
- `GET /api/categories/tree` - Get category tree
- `GET /api/products/search?q=keyword` - Search products

**Dependencies**:
- `@ecommerce/common`
- `mongoose`
- `slugify`
- `express`

### 4. Inventory Service
**Port**: 3003  
**Database**: `inventory`  
**Purpose**: Stock management and reservations

**Features**:
- Atomic stock operations
- Redis-based distributed locking
- Stock reservation system
- Stock movement tracking
- Low stock alerts

**Entities**:
- `Inventory`: Product ID, quantity, reserved quantity, thresholds
- `StockMovement`: History of stock changes

**Endpoints**:
- `GET /api/inventory/:productId` - Get stock
- `POST /api/inventory/reserve` - Reserve stock
- `POST /api/inventory/commit` - Commit reservation
- `POST /api/inventory/release` - Release reservation

**Dependencies**:
- `@ecommerce/common`
- `mongoose`
- `ioredis`
- `express`

### 5. Cart Service
**Port**: 3004  
**Database**: `cart`  
**Purpose**: Shopping cart management

**Features**:
- Guest cart support (session-based)
- Authenticated cart support
- Cart persistence
- Price calculation
- Inventory validation

**Entities**:
- `Cart`: User/session ID, items, totals, timestamps

**Endpoints**:
- `GET /api/cart` - Get cart
- `POST /api/cart/items` - Add item
- `PUT /api/cart/items/:itemId` - Update item
- `DELETE /api/cart/items/:itemId` - Remove item
- `DELETE /api/cart` - Clear cart

**Dependencies**:
- `@ecommerce/common`
- `mongoose`
- `cookie-parser`
- `express`

### 6. Order Service
**Port**: 3005  
**Database**: `orders`  
**Purpose**: Order processing and management

**Features**:
- State machine-based workflow
- CQRS pattern
- Event sourcing (state history)
- Idempotency support
- Inventory integration
- Payment processing integration

**State Machine States**:
- `pending` → `confirmed` → `processing` → `shipped` → `delivered`
- Terminal states: `cancelled`, `failed`

**Entities**:
- `Order`: User, items, totals, state, payment info, history

**Endpoints**:
- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:orderId` - Get order details
- `POST /api/orders/:orderId/payment` - Process payment
- `POST /api/orders/:orderId/cancel` - Cancel order
- `GET /api/orders/:orderId/history` - Get state history

**Dependencies**:
- `@ecommerce/common`
- `mongoose`
- `express`

### 7. Notification Service
**Port**: N/A (Event-Driven)  
**Database**: `notifications`  
**Purpose**: Multi-channel notifications

**Features**:
- Email notifications (Nodemailer)
- SMS notifications (Twilio, Fonoster)
- Push notifications
- Event-driven (RabbitMQ consumer)
- Template-based messages

**Entities**:
- `Notification`: Type, recipient, content, status, channel

**Channels**:
- Email: Order confirmations, password resets, etc.
- SMS: OTP, order updates
- Push: Real-time updates

**Dependencies**:
- `@ecommerce/common`
- `nodemailer`
- `twilio`
- `@fonoster/sdk`
- `mongoose`
- `express`

---

## Infrastructure & Dependencies

### Shared Package (`@ecommerce/common`)

**Purpose**: Centralized utilities, infrastructure, and shared code

**Exports**:
- **Utils**: Logger, ResponseHandler, JWTHelper, PasswordHelper, DateHelper, HTTPClient
- **Infrastructure**: MongoConnection, RedisClient, RabbitMQClient
- **Middlewares**: requestIdMiddleware, createErrorHandler
- **Errors**: AppError, ValidationError, NotFoundError, UnauthorizedError, etc.
- **Validators**: Common validators
- **Helpers**: asyncHandler, PaginationHelper, slugify, CacheHelper
- **Config**: BaseConfig

**Dependencies**:
- `amqplib` - RabbitMQ client
- `axios` - HTTP client
- `bcryptjs` - Password hashing
- `dotenv` - Environment variables
- `ioredis` - Redis client
- `jsonwebtoken` - JWT handling
- `mongoose` - MongoDB ODM
- `winston` - Logging

### Docker Compose Services

**Infrastructure Services**:
- **MongoDB**: Port 27017, databases per service
- **Redis**: Port 6379, cache and locking
- **RabbitMQ**: Ports 5672 (AMQP), 15672 (Management UI)

**Application Services**:
- All microservices containerized with Dockerfiles
- Network: `ecommerce-network` (bridge)
- Volumes: Persistent data for MongoDB, Redis, RabbitMQ

### Environment Variables

**Common Variables**:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `LOG_LEVEL` - Logging level (info/debug/error)

**Service-Specific Variables**:
- `AUTH_SERVICE_URL` - Auth service endpoint
- `CATALOG_SERVICE_URL` - Catalog service endpoint
- `INVENTORY_SERVICE_URL` - Inventory service endpoint
- `CART_SERVICE_URL` - Cart service endpoint
- `ORDER_SERVICE_URL` - Order service endpoint

---

## Development Practices

### Code Organization
- **ES Modules**: All code uses `import/export` syntax
- **Strict Mode**: Implicit strict mode in ES modules
- **Naming Conventions**:
  - Files: camelCase (e.g., `authController.js`)
  - Classes: PascalCase (e.g., `CategoryService`)
  - Variables/Functions: camelCase
  - Constants: UPPER_SNAKE_CASE

### Error Handling
- **Try-Catch**: Used in service methods
- **Async Handler**: Wraps route handlers
- **Error Middleware**: Global error handler
- **Custom Errors**: Domain-specific error classes

### Logging
- **Levels**: error, warn, info, debug
- **Structured**: JSON format in production
- **Context**: Request ID, service name, timestamps
- **Files**: Separate error and combined logs

### Testing
- **Status**: Tests coming soon (per package.json)
- **Framework**: Not yet implemented
- **Recommendation**: Jest or Mocha for unit/integration tests

### Code Quality
- **Linting**: ESLint configured
- **Formatting**: No Prettier config found
- **Type Safety**: JavaScript (no TypeScript)

### Git Practices
- **Monorepo**: Single repository for all services
- **Gitignore**: Standard Node.js ignores
- **Branching**: Not specified in knowledge base

---

## API Design Patterns

### RESTful Conventions
- **Resources**: Nouns (e.g., `/api/products`, `/api/orders`)
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)

### Versioning
- **Current**: v1 (in metadata)
- **Strategy**: Not explicitly implemented in URLs
- **Recommendation**: `/api/v1/` prefix for future versions

### Pagination
- **Query Params**: `page`, `limit`
- **Response**: Includes pagination metadata
- **Default**: page=1, limit=20

### Filtering & Sorting
- **Query Params**: `sort`, `order`, `filter`
- **Example**: `?sort=name&order=asc&level=1`

### Search
- **Query Param**: `q` or `query`
- **Example**: `/api/products/search?q=laptop`

---

## Database Patterns

### MongoDB Schema Design

**Common Patterns**:
- **Timestamps**: `createdAt`, `updatedAt` (via Mongoose timestamps)
- **Soft Deletes**: `isActive` boolean flag
- **Indexes**: Single and compound indexes for performance
- **References**: `ObjectId` references with `ref` option
- **Virtuals**: Computed properties (e.g., `fullName`)

**Schema Example**:
```javascript
const schema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});
```

### Indexing Strategy
- **Single Field**: Frequently queried fields
- **Compound**: Common query combinations
- **Text**: Full-text search (where applicable)
- **Unique**: Email, SKU, slug fields

### Connection Management
- **Pooling**: Configured via Mongoose options
- **Retry Logic**: Automatic reconnection
- **Event Handlers**: Connection state monitoring

---

## Security Patterns

### Authentication
- **JWT Tokens**: Access token (short-lived) + Refresh token (long-lived)
- **Token Storage**: HTTP-only cookies (recommended) or localStorage
- **Token Rotation**: Refresh token rotation on use

### Authorization
- **RBAC**: Role-based access control
- **Roles**: Customer, Admin, Vendor (configurable)
- **Middleware**: `authorize` middleware checks roles

### Password Security
- **Hashing**: bcrypt with configurable rounds
- **Salt**: Automatic salt generation
- **Validation**: Minimum length, complexity (if configured)

### API Security
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Request validation middleware

### Account Security
- **Login Attempts**: Tracks failed attempts
- **Account Lockout**: Temporary lock after max attempts
- **Password Change Tracking**: `passwordChangedAt` field

---

## Deployment & DevOps

### Docker
- **Dockerfiles**: Each service has its own Dockerfile
- **Multi-stage**: Not implemented (can be optimized)
- **Base Image**: Node.js (version not specified)

### Docker Compose
- **Orchestration**: All services defined in `docker-compose.yml`
- **Networks**: Bridge network for service communication
- **Volumes**: Persistent storage for databases
- **Environment**: Environment variables per service

### Process Management
- **Development**: `nodemon` for auto-reload
- **Production**: `node` directly or PM2 (not specified)
- **Cluster Mode**: API Gateway uses Node.js cluster module

### Health Checks
- **Endpoints**: `/health` in all services
- **Checks**: Database connection, Redis connection (where applicable)

### Monitoring & Observability
- **Logging**: Winston logger with file and console transports
- **Request Tracing**: Request ID propagation
- **Metrics**: Not explicitly implemented
- **Distributed Tracing**: Request ID serves as correlation ID

### Scaling Strategy
- **Horizontal**: Multiple instances per service
- **Load Balancing**: Via API Gateway or external load balancer
- **Database**: MongoDB replica sets (not configured in compose)

---

## Best Practices & Recommendations

### Current Strengths
✅ Clear microservices separation  
✅ Consistent code structure across services  
✅ Shared common utilities  
✅ Event-driven architecture foundation  
✅ State machine for order processing  
✅ Materialized path for categories  
✅ Comprehensive error handling  
✅ Structured logging  

### Areas for Improvement
⚠️ **TypeScript Migration**: Consider migrating to TypeScript for type safety  
⚠️ **Testing**: Implement unit and integration tests  
⚠️ **API Versioning**: Explicit versioning strategy  
⚠️ **Documentation**: API documentation (Swagger/OpenAPI)  
⚠️ **Monitoring**: Implement metrics and distributed tracing (OpenTelemetry)  
⚠️ **CI/CD**: Automated testing and deployment pipelines  
⚠️ **Secrets Management**: Use secret management service (not hardcoded)  
⚠️ **Database Migrations**: Migration strategy for schema changes  

### Future Enhancements
- GraphQL API layer
- Elasticsearch for advanced search
- Kubernetes deployment
- Service mesh (Istio/Linkerd)
- API Gateway enhancements (rate limiting per user, caching)
- Event sourcing for audit trails
- Saga pattern for distributed transactions

---

## Quick Reference

### Service Ports
- API Gateway: 3000
- Auth Service: 3001
- Catalog Service: 3002
- Inventory Service: 3003
- Cart Service: 3004
- Order Service: 3005
- Notification Service: Event-driven (no direct HTTP)

### Database Names
- `auth` - Auth Service
- `catalog` - Catalog Service
- `inventory` - Inventory Service
- `cart` - Cart Service
- `orders` - Order Service
- `notifications` - Notification Service

### Common Commands
```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up catalog-service

# View logs
docker-compose logs -f service-name

# Stop all services
docker-compose down

# Rebuild services
docker-compose build

# Install dependencies (monorepo)
npm install
```

---

## Conclusion

This knowledge base provides a comprehensive overview of the e-commerce backend microservices architecture. The system demonstrates modern microservices patterns, domain-driven design, and scalable architecture principles. While built in JavaScript, the codebase follows consistent patterns and conventions that make it maintainable and extensible.

For questions or clarifications, refer to the specific service documentation or code comments within each module.

---

**Last Updated**: February 5, 2026  
**Version**: 1.0.0
