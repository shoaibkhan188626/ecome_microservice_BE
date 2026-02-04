import { describe, it, expect } from "vitest";
import router from "../../../src/api/routes/health.js";

describe("API Gateway Health Routes", () => {
  it("exposes /health and /live routes", () => {
    const paths = router.stack.filter((r) => r.route).map((r) => r.route.path);
    expect(paths).toContain("/health");
    expect(paths).toContain("/live");
  });
});
