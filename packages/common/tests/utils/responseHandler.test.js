import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResponseHandler } from "../../src/utils/responseHandler.js";

describe("ResponseHandler", () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: { requestId: "test-request-id" },
    };
  });

  describe("success", () => {
    it("should send success response with data", () => {
      ResponseHandler.success(mockRes, { id: 1 }, 200);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 1 },
          error: null,
          metadata: expect.objectContaining({
            requestId: "test-request-id",
            version: "v1",
          }),
        })
      );
    });
  });

  describe("error", () => {
    it("should send error response", () => {
      ResponseHandler.error(mockRes, "NOT_FOUND", "Resource not found", 404);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
            details: null,
          },
        })
      );
    });
  });

  describe("validationError", () => {
    it("should send 400 with validation errors", () => {
      ResponseHandler.validationError(mockRes, [
        { field: "email", message: "Invalid" },
      ]);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [{ field: "email", message: "Invalid" }],
          }),
        })
      );
    });
  });

  describe("notFound", () => {
    it("should send 404 with resource name", () => {
      ResponseHandler.notFound(mockRes, "Product");
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "NOT_FOUND",
            message: "Product not found",
          }),
        })
      );
    });
  });

  describe("paginated", () => {
    it("should send paginated response", () => {
      ResponseHandler.paginated(mockRes, [1, 2, 3], 1, 10, 25);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [1, 2, 3],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        })
      );
    });
  });
});
