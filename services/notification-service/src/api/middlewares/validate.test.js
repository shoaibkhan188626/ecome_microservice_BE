import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSendNotification } from "./validate.js";

vi.mock("@ecommerce/common", () => ({
  ResponseHandler: {
    error: vi.fn((res, code, message, status) => {
      res.status(status).json({ error: { code, message } });
    }),
  },
}));

describe("validateSendNotification", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { body: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it("should call next for valid email notification", () => {
    mockReq.body = {
      channel: "email",
      recipient: { email: "test@example.com" },
      subject: "Test",
      message: "Hello",
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it("should reject invalid channel", () => {
    mockReq.body = {
      channel: "invalid",
      recipient: { email: "test@example.com" },
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should reject missing recipient", () => {
    mockReq.body = {
      channel: "email",
      recipient: null,
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("should reject email channel without email in recipient", () => {
    mockReq.body = {
      channel: "email",
      recipient: { phone: "123" },
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should accept valid SMS notification", () => {
    mockReq.body = {
      channel: "sms",
      recipient: { phone: "+1234567890" },
      message: "Hello",
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it("should accept valid push notification", () => {
    mockReq.body = {
      channel: "push",
      recipient: { deviceToken: "token123" },
      message: "Hello",
    };

    validateSendNotification(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
