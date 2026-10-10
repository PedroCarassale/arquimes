import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "./redirect-path.ts";

test("acepta rutas relativas del mismo origen", () => {
  assert.equal(safeRedirectPath("/"), "/");
  assert.equal(safeRedirectPath("/materias/abc/clases?tab=1#x"), "/materias/abc/clases?tab=1#x");
  assert.equal(safeRedirectPath("/calendario"), "/calendario");
});

test("rechaza destinos externos o raros", () => {
  for (const value of [
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "/ok\\..\\..\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\u0000x",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    undefined,
    null,
    42,
    ["/"],
  ]) {
    assert.equal(safeRedirectPath(value), "/", String(value));
  }
});

test("usa el fallback indicado", () => {
  assert.equal(safeRedirectPath("//evil.com", "/login"), "/login");
});
