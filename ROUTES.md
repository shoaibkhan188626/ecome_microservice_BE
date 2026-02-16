# Project Routes Documentation

This document provides a comprehensive overview of all API routes, their methods, default ports, required middleware/parameters, and full example links for the microservices in this project.

## 1. API Gateway Service (Default Port: 3000)

**Base URL:** `http://localhost:3000`

### General Endpoints

*   **GET `/`**
    *   **Description:** E-commerce API Gateway info
    *   **Full Link:** `http://localhost:3000/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3000/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3000/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3000/live`
    *   **Needs:** None

### Proxy Routes to Other Services

The API Gateway proxies requests to the respective microservices. The full links below represent the gateway endpoint that forwards the request.

*   **Proxy Route: `/api/auth`**
    *   **Description:** Proxies to Auth Service
    *   **Full Link Example:** `http://localhost:3000/api/auth/register` (for a route on Auth Service)
    *   **Internal Service URL:** `http://localhost:3001`
*   **Proxy Route: `/api/catalog`**
    *   **Description:** Proxies to Catalog Service
    *   **Full Link Example:** `http://localhost:3000/api/catalog/products` (for a route on Catalog Service)
    *   **Internal Service URL:** `http://localhost:3002`
*   **Proxy Route: `/api/categories`**
    *   **Description:** Proxies to Catalog Service (for category-specific routes)
    *   **Full Link Example:** `http://localhost:3000/api/categories/tree` (for a route on Catalog Service)
    *   **Internal Service URL:** `http://localhost:3002`
*   **Proxy Route: `/api/products`**
    *   **Description:** Proxies to Catalog Service (for product-specific routes)
    *   **Full Link Example:** `http://localhost:3000/api/products/featured` (for a route on Catalog Service)
    *   **Internal Service URL:** `http://localhost:3002`
*   **Proxy Route: `/api/inventory`**
    *   **Description:** Proxies to Inventory Service
    *   **Full Link Example:** `http://localhost:3000/api/inventory/low-stock` (for a route on Inventory Service)
    *   **Internal Service URL:** `http://localhost:3003`
*   **Proxy Route: `/api/cart`**
    *   **Description:** Proxies to Cart Service
    *   **Full Link Example:** `http://localhost:3000/api/cart/items` (for a route on Cart Service)
    *   **Internal Service URL:** `http://localhost:3004`
*   **Proxy Route: `/api/orders`**
    *   **Description:** Proxies to Order Service
    *   **Full Link Example:** `http://localhost:3000/api/orders/my-orders` (for a route on Order Service)
    *   **Internal Service URL:** `http://localhost:3005`
*   **Proxy Route: `/api/notifications`**
    *   **Description:** Proxies to Notification Service
    *   **Full Link Example:** `http://localhost:3000/api/notifications/my` (for a route on Notification Service)
    *   **Internal Service URL:** `http://localhost:3006`

---

## 2. Auth Service (Default Port: 3001)

**Base URL:** `http://localhost:3001`

### General Endpoints

*   **GET `/`**
    *   **Description:** Auth Service info
    *   **Full Link:** `http://localhost:3001/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3001/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3001/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3001/live`
    *   **Needs:** None

### Authentication & User Management Routes

*   **POST `/auth/register`**
    *   **Description:** Register a new user
    *   **Full Link:** `http://localhost:3001/auth/register`
    *   **Needs:** `validateRegister` middleware for request body validation.
*   **POST `/auth/login`**
    *   **Description:** User login
    *   **Full Link:** `http://localhost:3001/auth/login`
    *   **Needs:** `validateLogin` middleware for request body validation.
*   **POST `/auth/refresh`**
    *   **Description:** Refresh authentication token
    *   **Full Link:** `http://localhost:3001/auth/refresh`
    *   **Needs:** `validateRefreshToken` middleware for token validation.
*   **POST `/auth/logout`**
    *   **Description:** Logout current user
    *   **Full Link:** `http://localhost:3001/auth/logout`
    *   **Needs:** `authenticate` middleware (user must be logged in).
*   **POST `/auth/logout-all`**
    *   **Description:** Logout from all devices
    *   **Full Link:** `http://localhost:3001/auth/logout-all`
    *   **Needs:** `authenticate` middleware.
*   **GET `/auth/me`**
    *   **Description:** Get current user's profile
    *   **Full Link:** `http://localhost:3001/auth/me`
    *   **Needs:** `authenticate` middleware.
*   **PUT `/auth/profile`**
    *   **Description:** Update user profile
    *   **Full Link:** `http://localhost:3001/auth/profile`
    *   **Needs:** `authenticate` middleware, `validateProfileUpdate` middleware for request body validation.
*   **POST `/auth/change-password`**
    *   **Description:** Change user password
    *   **Full Link:** `http://localhost:3001/auth/change-password`
    *   **Needs:** `authenticate` middleware, `validatePasswordChange` middleware for request body validation.

---

## 3. Cart Service (Default Port: 3004)

**Base URL:** `http://localhost:3004`

### General Endpoints

*   **GET `/`**
    *   **Description:** Cart Service info
    *   **Full Link:** `http://localhost:3004/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3004/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3004/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3004/live`
    *   **Needs:** None

### Cart Management Routes

*   **GET `/api/cart`**
    *   **Description:** Get cart contents
    *   **Full Link:** `http://localhost:3004/api/cart`
    *   **Needs:** `sessionMiddleware`, `optionalAuth` (can work for guests or authenticated users).
*   **GET `/api/cart/count`**
    *   **Description:** Get item count in cart
    *   **Full Link:** `http://localhost:3004/api/cart/count`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **POST `/api/cart/validate`**
    *   **Description:** Validate cart contents (e.g., check stock)
    *   **Full Link:** `http://localhost:3004/api/cart/validate`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **POST `/api/cart/merge`**
    *   **Description:** Merge carts (e.g., guest cart into user cart)
    *   **Full Link:** `http://localhost:3004/api/cart/merge`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **POST `/api/cart/items`**
    *   **Description:** Add item to cart
    *   **Full Link:** `http://localhost:3004/api/cart/items`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **PUT `/api/cart/items/:productId`**
    *   **Description:** Update item quantity in cart
    *   **Full Link:** `http://localhost:3004/api/cart/items/:productId`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **DELETE `/api/cart/items/:productId`**
    *   **Description:** Remove item from cart
    *   **Full Link:** `http://localhost:3004/api/cart/items/:productId`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.
*   **DELETE `/api/cart`**
    *   **Description:** Clear cart
    *   **Full Link:** `http://localhost:3004/api/cart`
    *   **Needs:** `sessionMiddleware`, `optionalAuth`.

---

## 4. Catalog Service (Default Port: 3002)

**Base URL:** `http://localhost:3002`

### General Endpoints

*   **GET `/`**
    *   **Description:** Catalog Service info
    *   **Full Link:** `http://localhost:3002/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3002/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3002/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3002/live`
    *   **Needs:** None

### Category Routes (`/api/categories`)

*   **GET `/api/categories/tree`**
    *   **Description:** Get the full category tree
    *   **Full Link:** `http://localhost:3002/api/categories/tree`
    *   **Needs:** None
*   **GET `/api/categories/roots`**
    *   **Description:** Get root-level categories
    *   **Full Link:** `http://localhost:3002/api/categories/roots`
    *   **Needs:** None
*   **GET `/api/categories`**
    *   **Description:** Get all categories (paginated)
    *   **Full Link:** `http://localhost:3002/api/categories`
    *   **Needs:** `validatePagination` middleware for query parameters.
*   **GET `/api/categories/slug/:slug`**
    *   **Description:** Get category by slug
    *   **Full Link:** `http://localhost:3002/api/categories/slug/some-category-slug`
    *   **Needs:** None
*   **GET `/api/categories/:id`**
    *   **Description:** Get category by ID
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0`
    *   **Needs:** None
*   **GET `/api/categories/:id/children`**
    *   **Description:** Get children categories for a given category ID
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0/children`
    *   **Needs:** None
*   **GET `/api/categories/:id/breadcrumbs`**
    *   **Description:** Get breadcrumbs for a given category ID
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0/breadcrumbs`
    *   **Needs:** None
*   **POST `/api/categories`**
    *   **Description:** Create a new category
    *   **Full Link:** `http://localhost:3002/api/categories`
    *   **Needs:** `validateCategory` middleware for request body validation.
*   **PUT `/api/categories/:id`**
    *   **Description:** Update an existing category
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0`
    *   **Needs:** `validateCategory` middleware for request body validation.
*   **DELETE `/api/categories/:id`**
    *   **Description:** Delete a category
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0`
    *   **Needs:** None

### Product Routes (`/api/products`)

*   **GET `/api/products/featured`**
    *   **Description:** Get featured products
    *   **Full Link:** `http://localhost:3002/api/products/featured`
    *   **Needs:** None
*   **GET `/api/products/search`**
    *   **Description:** Search for products
    *   **Full Link:** `http://localhost:3002/api/products/search?q=keyword`
    *   **Needs:** `validatePagination` middleware for query parameters.
*   **GET `/api/products`**
    *   **Description:** Get all products (paginated)
    *   **Full Link:** `http://localhost:3002/api/products`
    *   **Needs:** `validatePagination` middleware for query parameters.
*   **GET `/api/products/slug/:slug`**
    *   **Description:** Get product by slug
    *   **Full Link:** `http://localhost:3002/api/products/slug/some-product-slug`
    *   **Needs:** None
*   **GET `/api/products/:id`**
    *   **Description:** Get product by ID
    *   **Full Link:** `http://localhost:3002/api/products/65e9b3a0a7d5b1f0c8e9b3a1`
    *   **Needs:** None
*   **POST `/api/products`**
    *   **Description:** Create a new product
    *   **Full Link:** `http://localhost:3002/api/products`
    *   **Needs:** `validateProduct` middleware for request body validation.
*   **PUT `/api/products/:id`**
    *   **Description:** Update an existing product
    *   **Full Link:** `http://localhost:3002/api/products/65e9b3a0a7d5b1f0c8e9b3a1`
    *   **Needs:** None (assumes validation in controller).
*   **DELETE `/api/products/:id`**
    *   **Description:** Delete a product
    *   **Full Link:** `http://localhost:3002/api/products/65e9b3a0a7d5b1f0c8e9b3a1`
    *   **Needs:** None

### Combined Routes

*   **GET `/api/categories/:categoryId/products`**
    *   **Description:** Get products belonging to a specific category
    *   **Full Link:** `http://localhost:3002/api/categories/65e9b3a0a7d5b1f0c8e9b3a0/products`
    *   **Needs:** None

---

## 5. Inventory Service (Default Port: 3003)

**Base URL:** `http://localhost:3003`

### General Endpoints

*   **GET `/`**
    *   **Description:** Inventory Service info
    *   **Full Link:** `http://localhost:3003/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3003/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3003/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3003/live`
    *   **Needs:** None

### Inventory Management Routes (`/api/inventory`)

*   **GET `/api/inventory/low-stock`**
    *   **Description:** Get items with low stock
    *   **Full Link:** `http://localhost:3003/api/inventory/low-stock`
    *   **Needs:** None
*   **POST `/api/inventory/check`**
    *   **Description:** Check availability of multiple items
    *   **Full Link:** `http://localhost:3003/api/inventory/check`
    *   **Needs:** Request body with items to check.
*   **POST `/api/inventory/reserve`**
    *   **Description:** Reserve stock for an order
    *   **Full Link:** `http://localhost:3003/api/inventory/reserve`
    *   **Needs:** `validateReservation` middleware for request body validation.
*   **POST `/api/inventory/release`**
    *   **Description:** Release reserved stock
    *   **Full Link:** `http://localhost:3003/api/inventory/release`
    *   **Needs:** `validateReservation` middleware.
*   **POST `/api/inventory/commit`**
    *   **Description:** Commit reserved stock (after successful order)
    *   **Full Link:** `http://localhost:3003/api/inventory/commit`
    *   **Needs:** `validateReservation` middleware.
*   **POST `/api/inventory/adjust`**
    *   **Description:** Adjust stock levels (e.g., for returns, manual corrections)
    *   **Full Link:** `http://localhost:3003/api/inventory/adjust`
    *   **Needs:** `validateAdjustment` middleware for request body validation.
*   **GET `/api/inventory/product/:productId`**
    *   **Description:** Get inventory details for a specific product
    *   **Full Link:** `http://localhost:3003/api/inventory/product/65e9b3a0a7d5b1f0c8e9b3a1`
    *   **Needs:** None
*   **GET `/api/inventory/:productId/movements`**
    *   **Description:** Get stock movements for a specific product
    *   **Full Link:** `http://localhost:3003/api/inventory/65e9b3a0a7d5b1f0c8e9b3a1/movements`
    *   **Needs:** None
*   **GET `/api/inventory/:sku`**
    *   **Description:** Get inventory item by SKU
    *   **Full Link:** `http://localhost:3003/api/inventory/SKU12345`
    *   **Needs:** None
*   **PUT `/api/inventory/:sku/settings`**
    *   **Description:** Update inventory settings for a specific SKU
    *   **Full Link:** `http://localhost:3003/api/inventory/SKU12345/settings`
    *   **Needs:** Request body with settings.
*   **POST `/api/inventory`**
    *   **Description:** Create a new inventory item
    *   **Full Link:** `http://localhost:3003/api/inventory`
    *   **Needs:** `validateInventory` middleware for request body validation.

---

## 6. Notification Service (Default Port: 3006)

**Base URL:** `http://localhost:3006`

### General Endpoints

*   **GET `/`**
    *   **Description:** Notification Service info
    *   **Full Link:** `http://localhost:3006/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3006/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3006/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3006/live`
    *   **Needs:** None
*   **GET `/metrics`**
    *   **Description:** Prometheus metrics endpoint
    *   **Full Link:** `http://localhost:3006/metrics`
    *   **Needs:** None

### Notification Management Routes (`/api/notifications`)

*   **POST `/api/notifications/send`**
    *   **Description:** Send a custom notification
    *   **Full Link:** `http://localhost:3006/api/notifications/send`
    *   **Needs:** `authenticate` middleware, `authorize("admin")` middleware, `validateSendNotification` middleware.
*   **GET `/api/notifications/my`**
    *   **Description:** Get current user's notifications
    *   **Full Link:** `http://localhost:3006/api/notifications/my`
    *   **Needs:** `authenticate` middleware.
*   **PATCH `/api/notifications/:id/read`**
    *   **Description:** Mark a notification as read
    *   **Full Link:** `http://localhost:3006/api/notifications/65e9b3a0a7d5b1f0c8e9b3a2/read`
    *   **Needs:** `authenticate` middleware.
*   **POST `/api/notifications/retry-failed`**
    *   **Description:** Retry sending failed notifications
    *   **Full Link:** `http://localhost:3006/api/notifications/retry-failed`
    *   **Needs:** `authenticate` middleware, `authorize("admin")` middleware.

---

## 7. Order Service (Default Port: 3005)

**Base URL:** `http://localhost:3005`

### General Endpoints

*   **GET `/`**
    *   **Description:** Order Management Service info
    *   **Full Link:** `http://localhost:3005/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3005/health`
    *   **Needs:** None
*   **GET `/ready`**
    *   **Description:** Readiness check
    *   **Full Link:** `http://localhost:3005/ready`
    *   **Needs:** None
*   **GET `/live`**
    *   **Description:** Liveness check
    *   **Full Link:** `http://localhost:3005/live`
    *   **Needs:** None
*   **GET `/metrics`**
    *   **Description:** Prometheus metrics endpoint
    *   **Full Link:** `http://localhost:3005/metrics`
    *   **Needs:** None

### Order Management Routes (`/api/orders`)

#### Public (Guest Tracking)

*   **GET `/api/orders/number/:orderNumber`**
    *   **Description:** Track order by order number
    *   **Full Link:** `http://localhost:3005/api/orders/number/ORD123456`
    *   **Needs:** `optionalAuth` middleware.

#### Protected (Customer Routes - require `authenticate`)

*   **POST `/api/orders`**
    *   **Description:** Create a new order
    *   **Full Link:** `http://localhost:3005/api/orders`
    *   **Needs:** `authenticate` middleware.
*   **GET `/api/orders/my-orders`**
    *   **Description:** Get current user's orders
    *   **Full Link:** `http://localhost:3005/api/orders/my-orders`
    *   **Needs:** `authenticate` middleware.
*   **GET `/api/orders/:orderId`**
    *   **Description:** Get order details by ID
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3`
    *   **Needs:** `authenticate` middleware.
*   **GET `/api/orders/:orderId/history`**
    *   **Description:** Get order history/timeline
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/history`
    *   **Needs:** `authenticate` middleware.
*   **POST `/api/orders/:orderId/payment`**
    *   **Description:** Process payment for an order
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/payment`
    *   **Needs:** `authenticate` middleware.
*   **POST `/api/orders/:orderId/cancel`**
    *   **Description:** Cancel an order
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/cancel`
    *   **Needs:** `authenticate` middleware.

#### Protected (Admin Routes - require `authenticate`, `requireAdmin`)

*   **GET `/api/orders`**
    *   **Description:** Get all orders
    *   **Full Link:** `http://localhost:3005/api/orders`
    *   **Needs:** `authenticate` middleware, `requireAdmin` middleware.
*   **POST `/api/orders/:orderId/process`**
    *   **Description:** Start processing an order
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/process`
    *   **Needs:** `authenticate` middleware, `requireAdmin` middleware.
*   **POST `/api/orders/:orderId/ship`**
    *   **Description:** Mark an order as shipped
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/ship`
    *   **Needs:** `authenticate` middleware, `requireAdmin` middleware.
*   **POST `/api/orders/:orderId/deliver`**
    *   **Description:** Mark an order as delivered
    *   **Full Link:** `http://localhost:3005/api/orders/65e9b3a0a7d5b1f0c8e9b3a3/deliver`
    *   **Needs:** `authenticate` middleware, `requireAdmin` middleware.

---

## 8. Payment Service (Default Port: 3006)

**Base URL:** `http://localhost:3006`

### General Endpoints

*   **GET `/`**
    *   **Description:** Payment Service info
    *   **Full Link:** `http://localhost:3006/`
    *   **Needs:** None
*   **GET `/health`**
    *   **Description:** Health check
    *   **Full Link:** `http://localhost:3006/health`
    *   **Needs:** None
*   **GET `/metrics`**
    *   **Description:** Prometheus metrics endpoint
    *   **Full Link:** `http://localhost:3006/metrics`
    *   **Needs:** None

### Payment API Routes (`/api/payments`)

*   **POST `/api/payments`**
    *   **Description:** Create payment intent/order
    *   **Full Link:** `http://localhost:3006/api/payments`
    *   **Needs:** Request body with payment details.
*   **GET `/api/payments/methods`**
    *   **Description:** Get available payment methods/gateways
    *   **Full Link:** `http://localhost:3006/api/payments/methods`
    *   **Needs:** None
*   **GET `/api/payments/:paymentId`**
    *   **Description:** Get payment by ID
    *   **Full Link:** `http://localhost:3006/api/payments/pay_65e9b3a0a7d5b1f0c8e9b3a4`
    *   **Needs:** None
*   **GET `/api/payments/:paymentId/status`**
    *   **Description:** Get real-time payment status from provider
    *   **Full Link:** `http://localhost:3006/api/payments/pay_65e9b3a0a7d5b1f0c8e9b3a4/status`
    *   **Needs:** None
*   **GET `/api/payments/order/:orderId`**
    *   **Description:** Get payments by order ID
    *   **Full Link:** `http://localhost:3006/api/payments/order/65e9b3a0a7d5b1f0c8e9b3a3`
    *   **Needs:** None
*   **GET `/api/payments/user/:userId`**
    *   **Description:** Get payments by user ID (with pagination)
    *   **Full Link:** `http://localhost:3006/api/payments/user/65e9b3a0a7d5b1f0c8e9b3a5?page=1&limit=20&status=pending`
    *   **Needs:** None
*   **POST `/api/payments/:paymentId/capture`**
    *   **Description:** Capture authorized payment
    *   **Full Link:** `http://localhost:3006/api/payments/pay_65e9b3a0a7d5b1f0c8e9b3a4/capture`
    *   **Needs:** Request body with capture details (e.g., amount).
*   **POST `/api/payments/:paymentId/refund`**
    *   **Description:** Refund payment (full or partial)
    *   **Full Link:** `http://localhost:3006/api/payments/pay_65e9b3a0a7d5b1f0c8e9b3a4/refund`
    *   **Needs:** Request body with refund details (e.g., amount, reason).

### Webhook Routes (`/api/payments/webhooks`)

*   **POST `/api/payments/webhooks/razorpay`**
    *   **Description:** Razorpay Webhook endpoint for receiving payment events
    *   **Full Link:** `http://localhost:3006/api/payments/webhooks/razorpay`
    *   **Needs:** `webhookIdempotency` middleware.
*   **POST `/api/payments/webhooks/stripe`**
    *   **Description:** Stripe Webhook endpoint for receiving payment events
    *   **Full Link:** `http://localhost:3006/api/payments/webhooks/stripe`
    *   **Needs:** `webhookIdempotency` middleware.

### Webhook Debug/Admin Routes (`/api/payments/webhooks`)

*   **GET `/api/payments/webhooks/status/:eventId`**
    *   **Description:** Get status of a processed webhook event
    *   **Full Link:** `http://localhost:3006/api/payments/webhooks/status/evt_12345`
    *   **Needs:** None
*   **GET `/api/payments/webhooks/list`**
    *   **Description:** List recent webhook events (with filtering)
    *   **Full Link:** `http://localhost:3006/api/payments/webhooks/list?provider=razorpay&status=completed`
    *   **Needs:** None
