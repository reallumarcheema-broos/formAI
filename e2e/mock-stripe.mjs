// A tiny fake of the Stripe API endpoints FormAI uses, plus fake hosted
// Checkout and Billing Portal pages. Used by the Playwright suite via
// STRIPE_API_BASE so the whole purchase flow can be tested offline.
//
//   node e2e/mock-stripe.mjs            (listens on MOCK_STRIPE_PORT or 12111)
//
// Test-only control endpoints live under /__test.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_STRIPE_PORT ?? 12111);
const BASE = `http://localhost:${PORT}`;

const state = { sessions: new Map(), subscriptions: new Map(), customers: new Set(), counter: 0 };
const id = (prefix) => `${prefix}_test_${++state.counter}${Date.now().toString(36)}`;

// Seeded subscriptions the tests can sign cookies for directly.
function seed() {
  state.sessions.clear();
  state.subscriptions.clear();
  state.subscriptions.set("sub_seed_active", { id: "sub_seed_active", customer: "cus_seed", status: "active", cancel_at: null });
  state.subscriptions.set("sub_seed_canceled", { id: "sub_seed_canceled", customer: "cus_seed2", status: "canceled", cancel_at: null });
}
seed();

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Request-Id": id("req") });
  res.end(JSON.stringify(body));
};
const notFound = (res, what) =>
  json(res, 404, { error: { type: "invalid_request_error", code: "resource_missing", message: `No such ${what}` } });
const html = (res, body) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta name=viewport content="width=device-width"><title>Mock Stripe</title><body style="font-family:sans-serif;padding:24px">${body}</body>`);
};
const redirect = (res, location) => {
  res.writeHead(303, { Location: location });
  res.end();
};

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function sessionJson(s) {
  return {
    id: s.id,
    object: "checkout.session",
    mode: s.mode,
    status: s.status,
    url: s.status === "open" ? `${BASE}/pay/${s.id}` : null,
    customer: s.customer ?? null,
    subscription: s.subscription ?? null,
    success_url: s.success_url,
    cancel_url: s.cancel_url,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const path = url.pathname;
  const auth = req.headers.authorization ?? "";

  // ---- Stripe API --------------------------------------------------------
  if (path.startsWith("/v1/")) {
    if (!auth.startsWith("Bearer sk_test_")) {
      return json(res, 401, { error: { type: "invalid_request_error", message: "Invalid API Key provided" } });
    }

    if (req.method === "POST" && path === "/v1/checkout/sessions") {
      const body = await readBody(req);
      const s = {
        id: id("cs"),
        mode: body.get("mode"),
        status: "open",
        success_url: body.get("success_url"),
        cancel_url: body.get("cancel_url"),
        params: Object.fromEntries(body),
      };
      state.sessions.set(s.id, s);
      return json(res, 200, sessionJson(s));
    }

    let m = path.match(/^\/v1\/checkout\/sessions\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const s = state.sessions.get(m[1]);
      return s ? json(res, 200, sessionJson(s)) : notFound(res, "checkout.session");
    }

    m = path.match(/^\/v1\/subscriptions\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const sub = state.subscriptions.get(m[1]);
      return sub ? json(res, 200, { object: "subscription", ...sub }) : notFound(res, "subscription");
    }

    if (req.method === "POST" && path === "/v1/billing_portal/sessions") {
      const body = await readBody(req);
      const customer = body.get("customer");
      const returnUrl = encodeURIComponent(body.get("return_url") ?? "");
      return json(res, 200, { id: id("bps"), object: "billing_portal.session", url: `${BASE}/portal/${customer}?return=${returnUrl}` });
    }

    return notFound(res, `route ${req.method} ${path}`);
  }

  // ---- Fake hosted Checkout page ------------------------------------------
  let m = path.match(/^\/pay\/([^/]+)$/);
  if (m) {
    const s = state.sessions.get(m[1]);
    if (!s) return html(res, "Session not found");
    if (req.method === "POST") {
      s.customer = id("cus");
      s.subscription = id("sub");
      s.status = "complete";
      state.subscriptions.set(s.subscription, { id: s.subscription, customer: s.customer, status: "active", cancel_at: null });
      return redirect(res, s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id));
    }
    const amount = Number(s.params["line_items[0][price_data][unit_amount]"] ?? 0) / 100;
    const currency = (s.params["line_items[0][price_data][currency]"] ?? "").toUpperCase();
    const interval = s.params["line_items[0][price_data][recurring][interval]"];
    return html(
      res,
      `<h1>Mock Stripe Checkout</h1><p data-testid="amount">${currency} ${amount.toFixed(2)} / ${interval}</p>
       <form method="post"><button type="submit">Pay and subscribe</button></form>
       <p><a href="${s.cancel_url}">Cancel</a></p>`,
    );
  }

  // ---- Fake Billing Portal -------------------------------------------------
  m = path.match(/^\/portal\/([^/]+)$/);
  if (m) {
    const customer = m[1];
    const back = url.searchParams.get("return") ?? "/";
    if (req.method === "POST") {
      for (const sub of state.subscriptions.values()) if (sub.customer === customer) sub.status = "canceled";
      return redirect(res, back);
    }
    return html(
      res,
      `<h1>Mock Billing Portal</h1><p>Customer ${customer}</p>
       <form method="post" action="${path}?return=${encodeURIComponent(back)}"><button type="submit">Cancel subscription</button></form>
       <p><a href="${back}">Return to FormAI</a></p>`,
    );
  }

  // ---- Test controls ---------------------------------------------------------
  if (path === "/__test/state") {
    return json(res, 200, {
      sessions: [...state.sessions.values()],
      subscriptions: [...state.subscriptions.values()],
    });
  }
  m = path.match(/^\/__test\/subscriptions\/([^/]+)$/);
  if (m && req.method === "POST") {
    const body = await readBody(req);
    const sub = state.subscriptions.get(m[1]);
    if (!sub) return notFound(res, "subscription");
    sub.status = body.get("status") ?? sub.status;
    return json(res, 200, sub);
  }
  if (path === "/__test/reset" && req.method === "POST") {
    seed();
    return json(res, 200, { ok: true });
  }
  if (path === "/health") return json(res, 200, { ok: true });

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log(`[mock-stripe] listening on ${BASE}`));
