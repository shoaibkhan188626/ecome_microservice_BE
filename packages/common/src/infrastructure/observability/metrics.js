import { getMeter } from "./tracing.js";

export const createCounter = (name, description) => {
  const meter = getMeter();
  return meter.createCounter(name, {
    description,
  });
};

export const createUpDownCounter = (name, description) => {
  const meter = getMeter();
  return meter.createUpDownCounter(name, {
    description,
  });
};



// FIXED: Rename this to createGauge
export const createGauge = (name, description) => {
  const meter = getMeter();
  return meter.createObservableGauge(name, {
    description,
  });
};

// ... existing code ...
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

export const createObservationGauge = (name, description) => {
  const meter = getMeter();
  return meter.createObservationGauge(name, {
    description,
  });
};

let orderCounter = null;
let paymentCounter = null;
let inventoryCounter = null;
let notificationCounter = null;

export const initBusinessMetrics = () => {
  orderCounter = createCounter("order_total", "Total number of orders");
  paymentCounter = createCounter("payments_total", "Total number of payments");
  inventoryCounter = createCounter(
    "inventory_operations_total",
    "Total inventory operations",
  );
  notificationCounter = createCounter(
    "notification_total",
    "Total number of notifications sent",
  );
};

export const recordOrder = (status = "created", attributes = {}) => {
  if (!orderCounter) initBusinessMetrics();
  orderCounter.add(1, { status, ...attributes });
};

export const recordPayment = (
  status = "success",
  provider = "unknown",
  attributes = {},
) => {
  if (!paymentCounter) initBusinessMetrics();
  paymentCounter.add(1, { status, provider, ...attributes });
};

export const recordInventory = (
  operation = "reserve",
  status = "success",
  attributes = {},
) => {
  if (!inventoryCounter) initBusinessMetrics();
  inventoryCounter.add(1, { operation, status, ...attributes });
};

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
  createObservationGauge,
  initBusinessMetrics,
  recordOrder,
  recordPayment,
  recordNotification,
};
