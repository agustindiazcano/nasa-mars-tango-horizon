import { describe, expect, it } from "vitest";
import { obsAuthString } from "../obsClient";
import { obsSettings } from "../recorder";

describe("OBS settings", () => {
  it("defaults to localhost:4455 with OBS enabled", () => {
    expect(obsSettings("")).toEqual({ enabled: true, url: "ws://localhost:4455", password: "" });
    expect(obsSettings("?present=1&obs=1").url).toBe("ws://localhost:4455");
  });

  it("reads the address and password, and can be turned off", () => {
    expect(obsSettings("?obs=192.168.0.5:4466&obspw=abc")).toEqual({ enabled: true, url: "ws://192.168.0.5:4466", password: "abc" });
    expect(obsSettings("?obs=0").enabled).toBe(false);
  });
});

describe("OBS authentication", () => {
  it("is a deterministic base64 SHA-256 that depends on the password, salt and challenge", async () => {
    const a = await obsAuthString("secret", "salt", "challenge");
    expect(a).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(await obsAuthString("secret", "salt", "challenge")).toBe(a);
    expect(await obsAuthString("other", "salt", "challenge")).not.toBe(a);
    expect(await obsAuthString("secret", "salt", "challenge2")).not.toBe(a);
  });
});
