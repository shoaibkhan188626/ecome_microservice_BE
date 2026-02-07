import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "../../src/helpers/async-handler.js";

describe("asyncHandler", () => {
  it("should pass through successful async function result", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const handler = asyncHandler(fn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with error when async function throws", async () => {
    const error = new Error("Test error");
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
