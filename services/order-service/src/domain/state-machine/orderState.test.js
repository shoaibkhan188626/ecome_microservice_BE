import { describe, it, expect } from "vitest";
import {
  OrderStates,
  OrderEvents,
  canTransition,
  getNextState,
  isTerminalState,
} from "./orderState.js";

describe("Order State Machine", () => {
  describe("canTransition", () => {
    it("should allow pending -> confirmed on payment_received", () => {
      expect(canTransition(OrderStates.PENDING, OrderEvents.PAYMENT_RECEIVED)).toBe(true);
    });

    it("should allow pending -> cancelled on cancel_order", () => {
      expect(canTransition(OrderStates.PENDING, OrderEvents.CANCEL_ORDER)).toBe(true);
    });

    it("should allow confirmed -> processing on start_processing", () => {
      expect(canTransition(OrderStates.CONFIRMED, OrderEvents.START_PROCESSING)).toBe(true);
    });

    it("should allow processing -> shipped on ship_order", () => {
      expect(canTransition(OrderStates.PROCESSING, OrderEvents.SHIP_ORDER)).toBe(true);
    });

    it("should allow shipped -> delivered on deliver_order", () => {
      expect(canTransition(OrderStates.SHIPPED, OrderEvents.DELIVER_ORDER)).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(canTransition(OrderStates.PENDING, OrderEvents.SHIP_ORDER)).toBe(false);
      expect(canTransition(OrderStates.DELIVERED, OrderEvents.PAYMENT_RECEIVED)).toBe(false);
    });
  });

  describe("getNextState", () => {
    it("should return next state for valid transition", () => {
      expect(getNextState(OrderStates.PENDING, OrderEvents.PAYMENT_RECEIVED)).toBe(
        OrderStates.CONFIRMED
      );
      expect(getNextState(OrderStates.SHIPPED, OrderEvents.DELIVER_ORDER)).toBe(
        OrderStates.DELIVERED
      );
    });

    it("should throw for invalid transition", () => {
      expect(() => getNextState(OrderStates.PENDING, OrderEvents.SHIP_ORDER)).toThrow(
        "Invalid transition"
      );
    });
  });

  describe("isTerminalState", () => {
    it("should return true for delivered, cancelled, failed", () => {
      expect(isTerminalState(OrderStates.DELIVERED)).toBe(true);
      expect(isTerminalState(OrderStates.CANCELLED)).toBe(true);
      expect(isTerminalState(OrderStates.FAILED)).toBe(true);
    });

    it("should return false for non-terminal states", () => {
      expect(isTerminalState(OrderStates.PENDING)).toBe(false);
      expect(isTerminalState(OrderStates.CONFIRMED)).toBe(false);
      expect(isTerminalState(OrderStates.PROCESSING)).toBe(false);
      expect(isTerminalState(OrderStates.SHIPPED)).toBe(false);
    });
  });
});
