gemini "You are a senior software architect conducting a comprehensive production-readiness audit for an e-commerce microservices backend built with NestJS, MongoDB, RabbitMQ, Redis, and Docker.

Analyze the ENTIRE codebase systematically and provide a detailed report covering:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. PROJECT OVERVIEW & ARCHITECTURE

### 1.1 Project Structure
- List ALL directories, files, and their purposes
- Identify each microservice and its responsibility
- Map out service dependencies and communication patterns
- Check for missing standard files (.gitignore, .prettierrc, .eslintrc, tsconfig.json, jest.config.js, README.md per service)
- Assess folder structure consistency across services

### 1.2 Architecture Analysis
- Evaluate microservices boundaries (are they properly separated?)
- Identify monolithic patterns hiding in microservices
- Check for shared code/libraries vs code duplication
- Analyze service coupling (tight vs loose coupling)
- Assess domain-driven design principles
- Check if services can be deployed independently

### 1.3 Communication Patterns
- Map ALL inter-service communication (sync REST calls, async events)
- Identify all RabbitMQ exchanges, queues, and routing keys
- Check for circular dependencies between services
- Analyze API Gateway routing and load balancing strategy
- Identify potential single points of failure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. CODE QUALITY & PATTERNS

### 2.1 TypeScript Usage
- Check type coverage (any usage, type assertions, proper interfaces)
- Analyze DTOs completeness and validation decorators
- Check for proper use of generics, enums, and union types
- Identify missing return types on functions
- Check tsconfig.json strictness settings

### 2.2 NestJS Best Practices
- Verify proper dependency injection usage
- Check module organization and imports
- Analyze use of providers, controllers, services separation
- Check for proper use of decorators (@Injectable, @Controller, etc.)
- Verify lifecycle hooks usage (OnModuleInit, OnModuleDestroy)
- Check for proper use of guards, interceptors, pipes, filters

### 2.3 Design Patterns
- Identify design patterns used (Repository, Factory, Strategy, etc.)
- Check for anti-patterns (God objects, circular dependencies, tight coupling)
- Analyze error handling patterns and consistency
- Check for proper abstraction layers
- Identify code duplication and opportunities for DRY

### 2.4 Code Quality Metrics
- Assess function/method length and complexity
- Check for proper code comments and documentation
- Identify dead code or unused imports
- Check naming conventions consistency
- Assess overall maintainability score

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. API LAYER ANALYSIS

### 3.1 Complete API Inventory
For EACH service, list:
- ALL endpoints (HTTP method + full path)
- Request/Response DTOs
- Authentication/Authorization requirements
- Rate limiting status
- Validation rules
- API versioning strategy

### 3.2 REST API Best Practices
- Check HTTP status codes usage (proper 2xx, 4xx, 5xx)
- Verify RESTful naming conventions
- Check for proper use of HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Analyze pagination, filtering, sorting implementation
- Check for HATEOAS or resource linking
- Verify content negotiation (JSON, XML support)

### 3.3 API Documentation
- Check for Swagger/OpenAPI documentation
- Verify endpoint descriptions and examples
- Check for request/response schema documentation
- Assess API documentation completeness

### 3.4 Input Validation
- Check ALL endpoints for input validation
- Verify use of class-validator decorators
- Check for sanitization of user inputs
- Identify SQL/NoSQL injection vulnerabilities
- Check for XSS prevention measures
- Verify file upload validation (size, type restrictions)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. SECURITY AUDIT (CRITICAL)

### 4.1 Authentication & Authorization
- Analyze JWT implementation (token generation, validation, refresh)
- Check for proper password hashing (bcrypt, salt rounds)
- Verify token expiration and refresh token strategy
- Check for session management
- Analyze role-based access control (RBAC) implementation
- Check for proper logout functionality
- Verify OAuth2/SSO integration if present

### 4.2 Secrets Management
- Identify ALL hardcoded secrets, API keys, passwords
- Check .env file handling and .env.example presence
- Verify secrets are not committed to git (.gitignore check)
- Assess environment variable validation
- Check for secure secret rotation strategy

### 4.3 Security Headers & Middleware
- Check for Helmet.js implementation
- Verify CORS configuration (allowed origins, methods, credentials)
- Check for CSRF protection
- Verify rate limiting implementation (per IP, per user)
- Check for request size limits
- Assess compression and security implications

### 4.4 Data Security
- Check for sensitive data encryption (at rest, in transit)
- Verify PII (Personally Identifiable Information) handling
- Check for SQL/NoSQL injection prevention
- Assess data masking in logs
- Check for secure file storage (S3, local filesystem)
- Verify GDPR/compliance readiness (data export, deletion)

### 4.5 Dependency Security
- List ALL dependencies with versions
- Identify outdated packages
- Check for known vulnerabilities (npm audit equivalent)
- Verify no dependencies with critical security issues
- Check for unnecessary dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. DATABASE & DATA LAYER

### 5.1 Schema Design
- List ALL MongoDB collections/schemas
- Analyze relationships and data modeling
- Check for proper use of references vs embedded documents
- Verify schema validation rules
- Assess normalization vs denormalization strategy
- Check for missing required fields or proper defaults

### 5.2 Indexes & Performance
- List ALL indexes defined
- Identify missing indexes (on frequently queried fields)
- Check for compound indexes where needed
- Verify unique constraints
- Assess index usage efficiency

### 5.3 Queries & Operations
- Identify N+1 query problems
- Check for proper use of projections (select specific fields)
- Analyze aggregation pipeline usage
- Check for inefficient queries or missing optimizations
- Verify proper error handling in database operations

### 5.4 Connection Management
- Check database connection pooling configuration
- Verify connection retry logic
- Check for connection leak prevention
- Assess graceful shutdown handling
- Verify connection timeout settings

### 5.5 Transactions & Data Consistency
- Check for multi-document transaction usage where needed
- Verify atomic operations
- Assess eventual consistency handling
- Check for optimistic locking (version fields)
- Identify race condition vulnerabilities

### 5.6 Migrations & Versioning
- Check for database migration strategy
- Verify schema versioning approach
- Assess backward compatibility handling
- Check for rollback strategy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. MESSAGING & EVENT-DRIVEN ARCHITECTURE

### 6.1 RabbitMQ Configuration
- List ALL exchanges, queues, and bindings
- Verify exchange types (direct, topic, fanout, headers)
- Check queue durability and persistence settings
- Assess message TTL and expiration policies
- Check for dead letter exchange (DLX) configuration

### 6.2 Event Publishing
- List ALL events published by each service
- Verify message schema/payload structure
- Check for proper serialization (JSON, Protobuf, Avro)
- Assess event naming conventions
- Check for event versioning strategy

### 6.3 Event Consumption
- List ALL events consumed by each service
- Verify message acknowledgment strategy (auto-ack vs manual)
- Check for idempotent message processing
- Assess error handling in consumers
- Check for retry logic and backoff strategy
- Verify concurrency control (prefetch count)

### 6.4 Message Reliability
- Check for message persistence
- Verify publisher confirms
- Assess at-least-once vs exactly-once delivery
- Check for message deduplication strategy
- Identify potential message loss scenarios
- Verify monitoring of queue depth

### 6.5 Saga Pattern / Distributed Transactions
- Check for saga orchestration or choreography
- Verify compensating transactions for rollback
- Assess long-running transaction handling
- Check for state management in sagas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. CACHING STRATEGY

### 7.1 Redis Implementation
- List ALL cache keys and TTL values
- Verify cache invalidation strategy
- Check for cache stampede prevention
- Assess cache warming strategy
- Check for proper error handling (cache miss, Redis down)

### 7.2 Caching Patterns
- Identify cache-aside, write-through, write-behind usage
- Check for distributed caching concerns
- Verify session storage implementation
- Assess rate limiting using Redis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. ERROR HANDLING & RESILIENCE

### 8.1 Exception Handling
- Check for global exception filter implementation
- Verify custom exception classes
- Assess error response format consistency
- Check for proper HTTP status codes
- Verify stack trace exposure prevention in production
- Check for error logging completeness

### 8.2 Resilience Patterns
- Check for circuit breaker implementation
- Verify retry logic with exponential backoff
- Assess timeout configurations
- Check for bulkhead pattern usage
- Verify graceful degradation strategies
- Check for fallback mechanisms

### 8.3 Graceful Shutdown
- Verify SIGTERM/SIGINT handling
- Check for connection draining
- Assess in-flight request completion
- Verify resource cleanup (DB, RabbitMQ, Redis connections)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. LOGGING & OBSERVABILITY

### 9.1 Logging Strategy
- Check logging library (Winston, Pino, etc.)
- Verify log levels usage (error, warn, info, debug)
- Assess log structure (JSON formatting)
- Check for correlation IDs / request IDs across services
- Verify sensitive data masking in logs
- Check for centralized logging setup (ELK, Loki)

### 9.2 Monitoring & Metrics
- Check for health check endpoints (/health, /ready)
- Verify Prometheus metrics exposure
- List key metrics tracked (request rate, error rate, latency)
- Check for business metrics (orders, revenue, etc.)
- Assess alerting rules setup

### 9.3 Distributed Tracing
- Check for OpenTelemetry / Jaeger integration
- Verify trace context propagation
- Assess span creation and attributes
- Check for performance overhead

### 9.4 Debugging Capabilities
- Verify request/response logging
- Check for debug mode configuration
- Assess error reproduction capabilities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. TESTING INFRASTRUCTURE

### 10.1 Test Coverage
- Check for unit tests (% coverage by service)
- Verify integration tests presence
- Check for e2e tests
- Assess test quality and assertions
- Check for test isolation

### 10.2 Testing Setup
- Verify Jest/testing framework configuration
- Check for test database setup (testcontainers, in-memory)
- Assess mocking strategy (repositories, external APIs)
- Check for test fixtures and factories
- Verify CI/CD test integration

### 10.3 Test Types Present
- Unit tests (service layer, utilities)
- Integration tests (database, RabbitMQ)
- E2E tests (full user flows)
- Contract tests (API contracts)
- Load/performance tests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. DOCKER & CONTAINERIZATION

### 11.1 Dockerfile Analysis
For EACH service:
- Check for multi-stage builds
- Verify base image security (official, minimal)
- Check for proper layer caching
- Assess .dockerignore usage
- Check for running as non-root user
- Verify health check implementation
- Check for proper signal handling

### 11.2 Docker Compose
- Analyze service definitions
- Check network configuration
- Verify volume mounts (data persistence)
- Assess environment variable management
- Check for resource limits (CPU, memory)
- Verify dependency ordering (depends_on)
- Check for health check dependencies

### 11.3 Production Readiness
- Verify production vs development configurations
- Check for secrets management in containers
- Assess container orchestration readiness (K8s)
- Check for image scanning and vulnerability management

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 12. CONFIGURATION & ENVIRONMENT MANAGEMENT

### 12.1 Environment Variables
- List ALL environment variables required per service
- Check for .env.example files
- Verify environment variable validation
- Assess configuration schema validation
- Check for environment-specific overrides (dev, staging, prod)

### 12.2 Configuration Management
- Check for centralized config service
- Verify feature flags implementation
- Assess configuration hot-reload capability
- Check for sensitive config encryption

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 13. PERFORMANCE & SCALABILITY

### 13.1 Performance Issues
- Identify synchronous blocking operations
- Check for memory leaks (event listeners, timers)
- Assess large payload handling
- Check for inefficient algorithms
- Verify streaming for large data

### 13.2 Scalability Concerns
- Assess horizontal scaling readiness
- Check for stateful vs stateless services
- Verify session handling in distributed environment
- Check for database connection limits
- Assess RabbitMQ scaling strategy

### 13.3 Resource Management
- Check for memory limits awareness
- Verify proper cleanup of resources
- Assess worker thread usage if applicable
- Check for connection pooling everywhere (DB, HTTP clients)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 14. CI/CD & DEPLOYMENT

### 14.1 CI/CD Pipeline
- Check for GitHub Actions / GitLab CI / Jenkins config
- Verify automated linting and formatting
- Check for automated test execution
- Assess automated security scanning
- Verify automated Docker image builds
- Check for deployment automation

### 14.2 Deployment Strategy
- Assess blue-green / canary / rolling deployment support
- Check for database migration automation
- Verify rollback strategy
- Check for deployment health verification

### 14.3 Infrastructure as Code
- Check for Kubernetes manifests (deployments, services, ingress)
- Verify Helm charts if present
- Check for Terraform / Pulumi configurations
- Assess infrastructure versioning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 15. BUSINESS LOGIC & DOMAIN

### 15.1 E-commerce Completeness
- Verify complete user flows (registration → browse → cart → checkout → payment → order confirmation)
- Check for cart management (add, update, remove, persist)
- Assess product catalog (categories, search, filters)
- Verify inventory management (stock tracking, reservations)
- Check order lifecycle (pending → processing → shipped → delivered → completed)
- Assess payment processing (integration, refunds, webhooks)
- Check notification system (email, SMS confirmation)

### 15.2 Business Rules
- Verify pricing calculations (discounts, tax, shipping)
- Check for coupon/promotion handling
- Assess stock reservation logic
- Check for order cancellation rules
- Verify refund policies implementation

### 15.3 Data Integrity
- Check for idempotency in critical operations (payments, order creation)
- Verify atomic operations for money/inventory updates
- Assess double-spending prevention
- Check for race condition handling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 16. DOCUMENTATION

### 16.1 Code Documentation
- Check for README.md in root and each service
- Verify setup instructions completeness
- Assess API documentation quality
- Check for architecture diagrams
- Verify changelog / release notes

### 16.2 Developer Experience
- Check for contribution guidelines
- Verify local development setup ease
- Assess debugging documentation
- Check for troubleshooting guides

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FINAL OUTPUT FORMAT:

Provide a comprehensive report with these sections:

### EXECUTIVE SUMMARY
- Overall production readiness score (0-100)
- Top 5 critical blockers
- Top 10 high-priority improvements
- Overall architecture assessment

### CRITICAL ISSUES (Must fix before production)
List with:
- Issue description
- Impact / Risk level
- Affected services
- Specific code examples
- Recommended fix

### HIGH PRIORITY (Should fix soon)
Same format as above

### MEDIUM PRIORITY (Should fix eventually)
Same format as above

### NICE TO HAVE (Enhancements)
Same format as above

### STRENGTHS
What's already good in the codebase

### DETAILED FINDINGS BY CATEGORY
Organize all findings by the 16 categories above

### ACTIONABLE ROADMAP
Week-by-week implementation plan

### QUICK WINS
Things that can be fixed in < 1 hour each

Be extremely thorough, specific, and actionable. Provide code examples where relevant. Prioritize based on production-readiness impact."