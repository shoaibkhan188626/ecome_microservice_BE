/**
 * Order State Machine Definition
 *
 * States:
 * - pending: Order created, awaiting payment
 * - confirmed: Payment received, awaiting processing
 * - processing: Order being prepared
 * - shipped: Order dispatched
 * - delivered: Order completed
 * - cancelled: Order cancelled
 * - failed: Order failed (payment/inventory)
 *
 * Transitions are controlled by business logic
 */

export const OrderStates = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

export const OrderEvents = {
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_FAILED: "payment_failed",
  START_PROCESSING: "start_processing",
  SHIP_ORDER: "ship_order",
  DELIVER_ORDER: "deliver_order",
  CANCEL_ORDER: "cancel_order",
  FAIL_ORDER: "fail_order",
};

/**
 * State Transition Rules
 * Defines valid transitions between states
 */
export const StateTransitions = {
  [OrderStates.PENDING]: {
    [OrderEvents.PAYMENT_RECEIVED]: OrderStates.CONFIRMED,
    [OrderEvents.PAYMENT_FAILED]: OrderStates.FAILED,
    [OrderEvents.CANCEL_ORDER]: OrderStates.CANCELLED,
  },
  [OrderStates.CONFIRMED]: {
    [OrderEvents.START_PROCESSING]: OrderStates.PROCESSING,
    [OrderEvents.CANCEL_ORDER]: OrderStates.CANCELLED,
  },
  [OrderStates.PROCESSING]: {
    [OrderEvents.SHIP_ORDER]: OrderStates.SHIPPED,
    [OrderEvents.CANCEL_ORDER]: OrderStates.CANCELLED,
  },
  [OrderStates.SHIPPED]: {
    [OrderEvents.DELIVER_ORDER]: OrderStates.DELIVERED,
  },
  [OrderStates.DELIVERED]: {
    // Terminal state - no transitions
  },
  [OrderStates.CANCELLED]: {
    // Terminal state - no transitions
  },
  [OrderStates.FAILED]: {
    // Terminal state - no transitions
  },
};

/**
 * Check if transition is valid
 * Time Complexity: O(1)
 */
export const canTransition = (currentState, event) => {
  return StateTransitions[currentState]?.[event] !== undefined;
};

/**
 * Get next state from current state and event
 * Time Complexity: O(1)
 */
export const getNextState = (currentState, event) => {
  if (!canTransition(currentState, event)) {
    throw new Error(`Invalid transition: ${currentState} -> ${event}`);
  }
  return StateTransitions[currentState][event];
};

/**
 * Check if state is terminal (no more transitions)
 */
export const isTerminalState = (state) => {
  return [
    OrderStates.DELIVERED,
    OrderStates.CANCELLED,
    OrderStates.FAILED,
  ].includes(state);
};
