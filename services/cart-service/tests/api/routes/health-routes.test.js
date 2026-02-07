import { describe, it, expect, vi } from "vitest";
import router from "../../../src/api/routes/health-routes.js";

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponseHandler: { success: vi.fn(), error: vi.fn() },
  };
});

describe("Cart Service Health Routes", () => {
  it("exposes /health and /live routes", () => {
    const paths = router.stack.filter((r) => r.route).map((r) => r.route.path);
    expect(paths).toContain("/health");
    expect(paths).toContain("/live");
  });
});
