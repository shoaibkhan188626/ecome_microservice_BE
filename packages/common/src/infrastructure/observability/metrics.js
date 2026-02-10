import { metrics } from "@opentelemetry/api";

/**
 * Get or create a meter for custom metrics
 */
const getMeter = (name = "ecommerce") => {
  return metrics.getMeter(name);
};

/**
 * Create a counter metric
 * @param {string} name - Metric name
 * @param {string} description - Metric description
 * @returns {Counter}
 */
export const createCounter = (name, description) => {
  const meter = getMeter();
  return meter.createCounter(name, {
    description,
  });
};

/**
 * Create an up-down counter (can increase or decrease)
 * @param {string} name - Metric name
 * @param {string} description - Metric description
 * @returns {UpDownCounter}
 */
export const createUpDownCounter = (name, description) => {
  const meter = getMeter();
  return meter.createUpDownCounter(name, {
    description,
  });
};

/**
 * Create a histogram metric
 * @param {string} name - Metric name
 * @param {string} description - Metric description
 * @param {number[]} boundaries - Bucket boundaries
 * @returns {Histogram}
 */
export const createHistogram = (
  name,
  description,
  boundaries = [0.1, 0.5, 1, 2, 5, 10],
) => {
  const meter = getMeter();
  return meter.createHistogram(name, {
    description,
    boundaries,
  });
};

/**
 * Create a gauge metric (observable)
 * @param {string} name - Metric name
 * @param {string} description - Metric description
 * @param {Function} callback - Callback to observe value
 * @returns {ObservableGauge}
 */
export const createGauge = (name, description, callback) => {
  const meter = getMeter();
  return meter.createObservableGauge(
    name,
    {
      description,
    },
    callback,
  );
};

// Pre-defined business metrics
let orderCounter = null;
let paymentCounter = null;
let inventoryCounter = null;
let notificationCounter = null;

/**
 * Initialize business metrics
 */
export const initBusinessMetrics = () => {
  orderCounter = createCounter("orders_total", "Total number of orders");
  paymentCounter = createCounter("payments_total", "Total number of payments");
  inventoryCounter = createCounter(
    "inventory_operations_total",
    "Total inventory operations",
  );
  notificationCounter = createCounter(
    "notifications_total",
    "Total notifications sent",
  );
};

/**
 * Record order event
 */
export const recordOrder = (status = "created", attributes = {}) => {
  if (!orderCounter) initBusinessMetrics();
  orderCounter.add(1, { status, ...attributes });
};

/**
 * Record payment event
 */
export const recordPayment = (
  status = "success",
  provider = "unknown",
  attributes = {},
) => {
  if (!paymentCounter) initBusinessMetrics();
  paymentCounter.add(1, { status, provider, ...attributes });
};

/**
 * Record inventory operation
 */
export const recordInventory = (
  operation = "reserve",
  status = "success",
  attributes = {},
) => {
  if (!inventoryCounter) initBusinessMetrics();
  inventoryCounter.add(1, { operation, status, ...attributes });
};

/**
 * Record notification sent
 */
export const recordNotification = (
  type = "email",
  status = "success",
  attributes = {},
) => {
  if (!notificationCounter) initBusinessMetrics();
  notificationCounter.add(1, { type, status, ...attributes });
};

export default {
  createCounter,
  createUpDownCounter,
  createHistogram,
  createGauge,
  initBusinessMetrics,
  recordOrder,
  recordPayment,
  recordInventory,
  recordNotification,
};
