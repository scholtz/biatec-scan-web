import { describe, expect, it } from "vitest";
import { classifyAccountLookup } from "./accountLookup";

describe("classifyAccountLookup", () => {
  it("treats 2xx as found", () => {
    expect(classifyAccountLookup(200, true)).toBe("found");
  });

  it("treats 404 as an empty (closed/never-funded) account", () => {
    expect(classifyAccountLookup(404, false)).toBe("empty");
  });

  it("keeps invalid-address and server failures as errors", () => {
    expect(classifyAccountLookup(400, false)).toBe("error");
    expect(classifyAccountLookup(500, false)).toBe("error");
    expect(classifyAccountLookup(503, false)).toBe("error");
  });
});
