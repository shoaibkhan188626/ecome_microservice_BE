import { describe, it, expect } from "vitest";
import router from "../../../src/api/routes/health-routes.js";

describe("Inventory Service Health Routes", () => {
  it("exposes /health and /live routes", () => {
    const paths = router.stack.filter((r) => r.route).map((r) => r.route.path);
    expect(paths).toContain("/health");
    expect(paths).toContain("/live");
  });
});
