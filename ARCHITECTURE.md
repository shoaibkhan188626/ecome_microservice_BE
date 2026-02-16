# Overall System Architecture

The `eCom_BE` project implements a microservices architecture using Node.js within a monorepo structure. This design aims to achieve high scalability, availability, and maintainability, adhering to "Big Tech" industry standards. The system leverages Docker Compose for local development and orchestration, facilitating an isolated and consistent development environment.

## Core Microservices

The application is composed of several independent microservices, each responsible for a specific business domain:

*   **API Gateway (`api-gateway`):** Acts as the single entry point for all client requests. It handles routing, load balancing, authentication, and potentially other cross-cutting concerns like rate limiting and circuit breaking.
*   **Authentication Service (`auth-service`):** Manages user authentication, authorization, and user profiles.
*   **Catalog Service (`catalog-service`):** Responsible for managing product information, categories, and inventory display.
*   **Inventory Service (`inventory-service`):** Manages product stock levels and availability.
*   **Cart Service (`cart-service`):** Handles shopping cart logic, allowing users to add, remove, and update items before checkout.
*   **Order Service (`order-service`):** Manages the lifecycle of customer orders, from creation to fulfillment.
*   **Notification Service (`notification-service`):** Handles sending various notifications (e.g., email, SMS) to users based on system events.

## Infrastructure Services

The microservices rely on several core infrastructure components:

*   **MongoDB (`mongodb`):** A NoSQL database used for persistent storage by individual microservices. Each service typically maintains its own database or collection to ensure loose coupling.
*   **Redis (`redis`):** An in-memory data store used for caching, session management, and potentially real-time data needs, enhancing application performance.
*   **RabbitMQ (`rabbitmq`):** A message broker that facilitates asynchronous communication between services. It enables event-driven patterns, ensuring services can communicate reliably without direct dependencies, improving resilience and scalability.

## Communication Patterns

The system employs a hybrid communication model:

*   **Synchronous Communication (HTTP):** Primarily used for external client-to-service communication via the API Gateway, and for direct service-to-service requests where immediate responses are required (e.g., a cart service querying the catalog service for product details).
*   **Asynchronous Communication (Event-Driven):** Utilizes RabbitMQ for scenarios where services need to react to events without waiting for an immediate response. This pattern promotes loose coupling, fault tolerance, and enables easier scaling of consuming services (e.g., the order service publishing an "order placed" event that the notification service subscribes to).

## Development and Orchestration

**Docker Compose:**
`docker-compose.yml` is used to define and run the multi-container Docker application. It allows developers to spin up the entire microservices ecosystem (including databases, message brokers, and all core services) with a single command, providing a consistent and isolated development environment. It defines service dependencies, port mappings, environment variables, and network configurations.

## Shared Library

*   **`packages/common`:** This shared NPM package within the monorepo contains common utilities, helper functions, error classes, and middlewares that are used across multiple microservices. Its purpose is to promote code reusability and maintain consistency, adhering to the DRY (Don't Repeat Yourself) principle.

    _Further detailed documentation for `packages/common` is available in its dedicated section._

## Service Details

### API Gateway (`api-gateway`)

The API Gateway acts as the primary entry point for all client applications interacting with the `eCom_BE` microservices. It is responsible for routing incoming requests to the appropriate downstream services, providing a unified and secure API endpoint.

**Purpose and Core Functionalities:**
*   **Request Routing:** Directs client requests to the correct microservice based on predefined routes.
*   **Load Balancing:** Distributes incoming traffic across multiple instances of a service.
*   **Authentication & Authorization:** Verifies user credentials and permissions before forwarding requests to backend services.
*   **Rate Limiting:** Protects backend services from abuse and ensures fair usage by limiting the number of requests a client can make within a certain timeframe.
*   **Circuit Breaking:** Implements patterns to prevent cascading failures by temporarily halting requests to services that are experiencing issues.
*   **API Composition/Aggregation (Potential):** Can aggregate responses from multiple services into a single response for complex client requests, reducing client-side complexity.

**Key Technologies:**
*   Node.js
*   Express.js (likely for routing and middleware)
*   Redis (for rate limiting, caching, or session management)
*   RabbitMQ (for internal communication with certain services like notification)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service, sets up the Express application and middleware.
*   `src/api/middlewares/proxyHandler.js`: Contains the core logic for routing, circuit breaking, and other proxy-related functionalities.
*   `src/config/`: Configuration files for the API Gateway, including routing rules and service URLs.
### Authentication Service (`auth-service`)

The Authentication Service is responsible for managing user accounts, authentication processes, and user authorization within the e-commerce platform.

**Purpose and Core Functionalities:**
*   **User Registration and Login:** Handles the creation of new user accounts and user authentication.
*   **Token Management:** Issues and validates JWT (JSON Web Tokens) for secure communication between clients and services.
*   **User Profiles:** Manages user-specific data, such as roles and permissions.
*   **Password Management:** Securely handles password hashing, storage, and reset functionalities.

**Key Technologies:**
*   Node.js
*   MongoDB (for user data persistence)
*   Redis (for session management, token blacklisting, or rate limiting on authentication attempts)
*   JWT (for token-based authentication)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Contains API routes, controllers, and middleware related to authentication and user management.
*   `src/domain/`: Defines user models, business logic, and possibly repositories for user data.
*   `src/infrastructure/`: Handles interactions with external systems like MongoDB and Redis.
*   `src/config/`: Configuration files for authentication settings, database connections, and JWT secrets.
### Catalog Service (`catalog-service`)

The Catalog Service is responsible for managing all product-related information, including product details, categories, and inventory display.

**Purpose and Core Functionalities:**
*   **Product Management:** Handles the creation, retrieval, update, and deletion of product information.
*   **Category Management:** Organizes products into categories and subcategories.
*   **Product Search and Filtering:** Provides functionalities for searching and filtering products based on various criteria.
*   **Inventory Display:** Displays product availability information to users (though actual inventory levels are managed by the Inventory Service).

**Key Technologies:**
*   Node.js
*   MongoDB (for product and category data persistence)
*   Redis (for caching frequently accessed product data)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Contains API routes, controllers, and middleware for product and category management.
*   `src/domain/`: Defines product and category models, business logic, and repositories.
*   `src/infrastructure/`: Handles interactions with MongoDB and Redis.
*   `src/config/`: Configuration files for database connections and service-specific settings.
### Inventory Service (`inventory-service`)

The Inventory Service is dedicated to managing and tracking the stock levels of products available in the e-commerce system.

**Purpose and Core Functionalities:**
*   **Stock Management:** Manages the quantity of each product, including adding new stock, deducting sold items, and handling returns.
*   **Availability Checks:** Provides real-time information on product availability to other services (e.g., Cart Service, Order Service).
*   **Stock Reservations:** Temporarily reserves stock when a user adds an item to their cart or initiates an order.
*   **Low Stock Alerts:** Can generate alerts when product stock falls below a predefined threshold.

**Key Technologies:**
*   Node.js
*   MongoDB (for inventory data persistence)
*   Redis (for fast availability checks and temporary stock reservations)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Contains API routes and controllers for inventory queries and updates.
*   `src/domain/`: Defines inventory models, business logic for stock operations, and repositories.
*   `src/infrastructure/`: Handles interactions with MongoDB and Redis.
*   `src/config/`: Configuration files for database connections and service settings.
### Cart Service (`cart-service`)

The Cart Service is responsible for managing the shopping carts of users, allowing them to add, remove, and update items before proceeding to checkout.

**Purpose and Core Functionalities:**
*   **Cart Management:** Handles operations related to a user's shopping cart, such as adding products, updating quantities, and removing items.
*   **Product Validation:** Interacts with the Catalog Service and Inventory Service to validate product existence and availability when items are added to the cart.
*   **Cart Persistence:** Stores cart data, allowing users to maintain their carts across sessions.
*   **Total Calculation:** Calculates the total price of items in the cart.

**Key Technologies:**
*   Node.js
*   MongoDB (for cart data persistence)
*   Redis (potentially for temporary cart storage or session-based carts)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Contains API routes and controllers for cart operations.
*   `src/domain/`: Defines cart models, business logic for cart manipulation, and repositories.
*   `src/config/`: Configuration files for database connections and service settings.

### Order Service (`order-service`)

The Order Service manages the entire lifecycle of customer orders, from creation and processing to fulfillment. It is a critical component that orchestrates interactions with several other services.

**Purpose and Core Functionalities:**
*   **Order Creation:** Initiates new orders based on a user's shopping cart.
*   **Order Processing:** Coordinates with Inventory and Payment (if applicable) services to confirm stock and process payments.
*   **Order Status Management:** Tracks the status of orders (e.g., pending, confirmed, shipped, delivered, cancelled) and manages transitions between these states.
*   **Order History:** Provides users with access to their past orders.
*   **Event Publishing:** Publishes events related to order status changes (e.g., "order placed," "order shipped") for other services to consume (e.g., Notification Service).

**Key Technologies:**
*   Node.js
*   MongoDB (for order data persistence)
*   Redis (for temporary order data or caching)
*   JWT (for secure communication and user context from the Auth Service)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Contains API routes and controllers for order management.
*   `src/domain/`: Defines order models, complex business logic for order processing, and repositories.
*   `src/events/`: Contains event definitions, publishers, and consumers related to order lifecycle events, likely interacting with RabbitMQ.
### Notification Service (`notification-service`)

The Notification Service is responsible for sending various types of notifications to users based on events occurring within the e-commerce system.

**Purpose and Core Functionalities:**
*   **Event Consumption:** Subscribes to events from other services (e.g., "order placed" from Order Service) via RabbitMQ.
*   **Notification Generation:** Creates notification messages (e.g., email content, push notifications) based on event data and predefined templates.
*   **Delivery:** Sends notifications through various channels (e.g., email via SMTP, potentially SMS or push notifications).
*   **Template Management:** Manages and uses templates for different types of notifications.

**Key Technologies:**
*   Node.js
*   MongoDB (for notification logs or template storage)
*   RabbitMQ (for consuming events from other services)
*   SMTP (for sending email notifications)

**Key Modules/Files:**
*   `index.js`: Main entry point of the service.
*   `src/api/`: Potentially contains API endpoints for managing notification preferences or viewing notification history.
*   `src/consumers/`: Contains logic for consuming messages from RabbitMQ queues and triggering notification workflows.
*   `src/domain/`: Defines notification models, business logic for notification generation, and repositories.
*   `src/templates/`: Stores notification templates (e.g., email templates).
*   `src/config/`: Configuration files for RabbitMQ connections, SMTP settings, and other service-specific configurations.

## Shared Library: `packages/common`

The `packages/common` directory hosts a shared NPM package intended to promote code reusability, consistency, and adherence to the DRY (Don't Repeat Yourself) principle across all microservices in the monorepo. It contains generic utilities, helper functions, custom error classes, and middleware that can be safely used by any service without introducing tight coupling.

**Purpose and Utilities:**
*   **Centralized Utilities:** Provides a single source for commonly used functions and modules, preventing duplication across individual services.
*   **Standardized Error Handling:** Offers a consistent approach to error management through shared error classes and middleware.
*   **Common Helpers:** Includes various helper functions for tasks like asynchronous operations, pagination, slug generation, date manipulation, and more.
*   **Infrastructure Interfaces (Potential):** May contain interfaces or base implementations for interacting with common infrastructure components (e.g., cache, database, messaging, payment), ensuring a consistent approach to integration.
*   **Validation Logic:** Centralizes generic validation rules to ensure data consistency across the system.

**Key Modules/Files:**
*   `index.js`: Main entry point for the shared library, often re-exporting modules from its subdirectories.
*   `src/config/`: Contains base configurations or configuration helper functions that can be extended by individual services.
*   `src/errors/`: Defines custom error classes (e.g., `AppError.js`) for standardized error reporting throughout the system.
*   `src/helpers/`: Houses general-purpose helper functions (e.g., `asyncHandler.js`, `cacheHelper.js`, `pagination.js`, `slugify.js`).
*   `src/infrastructure/`: Contains abstractions or common clients for interacting with infrastructure concerns like caching, databases, messaging, and payment systems.
*   `src/middlewares/`: Provides reusable Express.js middleware (e.g., `errorHandler.js`, `requestId.js`) for consistent request processing and error handling.
*   `src/utils/`: Additional utility functions (e.g., `dateHelper.js`, `httpClient.js`, `jwtHelper.js`, `logger.js`, `passwordHelper.js`, `responseHandler.js`).
*   `src/validators/`: Contains common validation functions (e.g., `commonValidators.js`) that can be applied to various data inputs.

## API Documentation Generation

To ensure clarity and ease of use for developers consuming these microservices, it is highly recommended to generate and maintain comprehensive API documentation for each service.

**Recommendations:**
*   **OpenAPI/Swagger:** For external-facing APIs, use OpenAPI (formerly Swagger) specifications. This allows for clear, machine-readable API definitions that can be used to generate interactive documentation (e.g., Swagger UI), client SDKs, and facilitate API testing. Tools like `swagger-jsdoc` can generate OpenAPI specifications directly from JSDoc comments in your code.
*   **JSDoc:** For internal API documentation or detailed explanations of functions and modules within each service, maintain well-structured JSDoc comments in the codebase. This helps in understanding the purpose, parameters, and return types of functions without needing to decipher the implementation.
*   **Postman Collections:** For testing and sharing API endpoints, Postman collections can be maintained and integrated into the development workflow.

**Actionable Steps:**
1.  **Integrate an OpenAPI Generator:** Choose a tool (e.g., `swagger-jsdoc` for Node.js) to generate OpenAPI specifications from code comments or route definitions.
2.  **Host Documentation:** Consider hosting the generated API documentation (e.g., Swagger UI) in a readily accessible location (e.g., a dedicated documentation portal or within the API Gateway).
3.  **Enforce Documentation Standards:** Establish and enforce a standard for API documentation within the team to ensure consistency and completeness.







