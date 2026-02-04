import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InsufficientStockError,
  RateLimitError,
} from "./AppError.js";

describe("AppError", () => {
  it("should create error with default values", () => {
    const error = new AppError("Something went wrong");
    expect(error.message).toBe("Something went wrong");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.details).toBeNull();
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it("should create error with custom values", () => {
    const error = new AppError("Custom error", 418, "TEAPOT", { foo: "bar" });
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe("TEAPOT");
    expect(error.details).toEqual({ foo: "bar" });
  });
});

describe("ValidationError", () => {
  it("should have correct status and code", () => {
    const error = new ValidationError("Invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Invalid input");
  });
});

describe("NotFoundError", () => {
  it("should have default resource message", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Resource not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("should use custom resource name", () => {
    const error = new NotFoundError("Product");
    expect(error.message).toBe("Product not found");
  });
});

describe("UnauthorizedError", () => {
  it("should have correct status and code", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });
});

describe("ForbiddenError", () => {
  it("should have correct status and code", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });
});

describe("ConflictError", () => {
  it("should have correct status and code", () => {
    const error = new ConflictError("Duplicate entry");
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("CONFLICT");
  });
});

describe("InsufficientStockError", () => {
  it("should have correct status and code", () => {
    const error = new InsufficientStockError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("INSUFFICIENT_STOCK");
  });
});

describe("RateLimitError", () => {
  it("should have correct status and code", () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
