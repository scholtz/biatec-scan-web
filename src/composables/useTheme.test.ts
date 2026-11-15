import { describe, expect, it } from "vitest";
import { parseThemeMode, resolveTheme } from "./useTheme";

describe("parseThemeMode", () => {
  it("accepts the three valid modes", () => {
    expect(parseThemeMode("light")).toBe("light");
    expect(parseThemeMode("dark")).toBe("dark");
    expect(parseThemeMode("system")).toBe("system");
  });
  it("falls back to system for missing or garbage values", () => {
    expect(parseThemeMode(null)).toBe("system");
    expect(parseThemeMode(undefined)).toBe("system");
    expect(parseThemeMode("purple")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the OS preference in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("explicit modes ignore the OS preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
