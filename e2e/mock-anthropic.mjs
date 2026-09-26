// A tiny fake of the Anthropic Messages API for the food-scanner tests.
// The app points at it via ANTHROPIC_BASE_URL. Test controls live under /__test.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_AI_PORT ?? 12112);

const FOOD = {
  is_food: true,
  items: [
    { name: "Cheeseburger", portion: "1 burger", grams: 220, kcal: 540, protein_g: 28, carbs_g: 40, fat_g: 29, confidence: "high" },
    { name: "French fries", portion: "1 medium serving", grams: 115, kcal: 320, protein_g: 4, carbs_g: 42, fat_g: 15, confidence: "low" },
  ],
  notes: "Oil in the fries is hard to judge from a photo.",
};
const NOT_FOOD = { is_food: false, items: [], notes: "" };

/** Read width/height from a JPEG's SOF marker, so tests can check the client resized the photo. */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

let next = "food";
/** "error" keeps failing through the SDK's automatic retries (2 by default), like a real outage. */
let errorsLeft = 0;
let lastRequest = null;

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "request-id": `req_${Date.now()}` });
  res.end(JSON.stringify(body));
};

function message(payload, stopReason = "end_turn") {
  return {
    id: `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: lastRequest?.body?.model ?? "claude-opus-5",
    content: stopReason === "refusal" ? [] : [{ type: "text", text: JSON.stringify(payload) }],
    stop_reason: stopReason,
    stop_sequence: null,
    stop_details: stopReason === "refusal" ? { type: "refusal", category: null, explanation: "declined" } : null,
    usage: { input_tokens: 1600, output_tokens: 300 },
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");

  if (req.method === "POST" && url.pathname === "/v1/messages") {
    if (req.headers["x-api-key"] !== "sk-ant-test") {
      return json(res, 401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } });
    }
    const body = JSON.parse(raw);
    const image = body.messages?.[0]?.content?.find((b) => b.type === "image");
    lastRequest = {
      headers: { beta: req.headers["anthropic-beta"] ?? "" },
      body: { ...body, messages: undefined },
      image: image
        ? (() => {
            const buf = Buffer.from(image.source.data, "base64");
            return { media_type: image.source.media_type, bytes: buf.length, ...jpegSize(buf) };
          })()
        : null,
    };
    if (errorsLeft > 0) {
      errorsLeft -= 1;
      return json(res, 500, { type: "error", error: { type: "api_error", message: "boom" } });
    }
    const scenario = next;
    next = "food";
    if (scenario === "refusal") return json(res, 200, message(null, "refusal"));
    return json(res, 200, message(scenario === "not_food" ? NOT_FOOD : FOOD));
  }

  if (url.pathname === "/__test/next" && req.method === "POST") {
    const scenario = new URLSearchParams(raw).get("scenario") ?? "food";
    if (scenario === "error") errorsLeft = 3;
    else next = scenario;
    return json(res, 200, { next: scenario });
  }
  if (url.pathname === "/__test/last") return json(res, 200, lastRequest);
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  res.writeHead(404);
  res.end();
}).listen(PORT, () => console.log(`[mock-anthropic] listening on http://localhost:${PORT}`));
