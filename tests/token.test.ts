import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { decodeLinkToken, decodeProToken, encodeLinkToken, encodeProToken } from "@/lib/billing/token";

const ids = { customerId: "cus_1", subscriptionId: "sub_1" };

beforeAll(() => {
  vi.stubEnv("FORMAI_COOKIE_SECRET", "unit-test-secret");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe("subscription tokens", () => {
  it("round-trips a Pro cookie token", () => {
    expect(decodeProToken(encodeProToken(ids))).toMatchObject({ kind: "pro", ...ids });
  });

  it("rejects tampered payloads and signatures", () => {
    const token = encodeProToken(ids);
    const [body, sig] = token.split(".");
    const otherBody = Buffer.from(JSON.stringify({ kind: "pro", customerId: "x", subscriptionId: "y", iat: 1 })).toString("base64url");
    expect(decodeProToken(`${otherBody}.${sig}`)).toBeNull();
    expect(decodeProToken(`${body}.${sig.slice(0, -1)}A`)).toBeNull();
    expect(decodeProToken(`${token}.extra`)).toBeNull();
    expect(decodeProToken("")).toBeNull();
    expect(decodeProToken(undefined)).toBeNull();
  });

  it("rejects tokens signed with another secret", () => {
    const token = encodeProToken(ids);
    vi.stubEnv("FORMAI_COOKIE_SECRET", "different-secret");
    expect(decodeProToken(token)).toBeNull();
    vi.stubEnv("FORMAI_COOKIE_SECRET", "unit-test-secret");
  });

  it("never lets a link token act as a cookie, or vice versa", () => {
    expect(decodeProToken(encodeLinkToken(ids))).toBeNull();
    expect(decodeLinkToken(encodeProToken(ids))).toBeNull();
  });

  it("builds a valid link from a full Pro token (regression: kind was overwritten)", () => {
    const pro = decodeProToken(encodeProToken(ids))!;
    expect(decodeLinkToken(encodeLinkToken(pro))).toMatchObject({ kind: "link", ...ids });
  });

  it("expires device links after 10 minutes", () => {
    vi.useFakeTimers();
    const link = encodeLinkToken(ids);
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(decodeLinkToken(link)).not.toBeNull();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(decodeLinkToken(link)).toBeNull();
    vi.useRealTimers();
  });

  it("returns null instead of throwing when no secret is configured", () => {
    const token = encodeProToken(ids);
    vi.stubEnv("FORMAI_COOKIE_SECRET", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(decodeProToken(token)).toBeNull();
    vi.stubEnv("FORMAI_COOKIE_SECRET", "unit-test-secret");
  });
});
