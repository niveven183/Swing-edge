// scripts/ocr-contract-test.mjs — the /api/ocr response contract, frozen.
//
// Drives the real handler end to end with a stubbed upstream: the Anthropic call
// and the GoTrue token check are the only things faked, so parseImage, extractJson,
// computeEntry, validate, computeLevels and every gate run for real.
//
// Scenario A is the regression contract — it must not move by one byte. B/C/D are
// characterization: their frozen values describe what the endpoint does today, and
// any change to them is a deliberate edit to this file in the same commit.
//
//   node scripts/ocr-contract-test.mjs            assert against the frozen table
//   node scripts/ocr-contract-test.mjs --print    dump actual output (baseline capture)

process.env.SUPABASE_URL = "https://stub.supabase.co";
process.env.SUPABASE_ANON_KEY = "stub-anon-key";
process.env.ANTHROPIC_API_KEY = "stub-anthropic-key";

const PRINT = process.argv.includes("--print");
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// The model text each scenario makes the upstream return. Raw strings, not objects:
// scenario C is only meaningful as unparseable bytes.
const SCENARIOS = [
  {
    id: "A",
    title: "full read — Position tool present, both legs converge",
    side: "LONG",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: 75, direction: "LONG",
      stopDelta: 4.39, stopPercent: 5.871,
      targetDelta: 12.16, targetPercent: 16.263,
      rrRatio: 2.77, hasPositionTool: true, confidence: 85,
    }),
  },
  {
    id: "B",
    title: "no Position tool — the reported bug: ticker survives with full model confidence",
    side: "LONG",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: null, direction: null,
      stopDelta: null, stopPercent: null,
      targetDelta: null, targetPercent: null,
      rrRatio: null, hasPositionTool: false, confidence: 85,
    }),
  },
  {
    id: "C",
    title: "truncated JSON (max_tokens cut) — no closing brace",
    side: "LONG",
    modelText: '{"ticker": "AFRM", "entry": 75, "direction": "LONG", "stopDelta": 4.3',
  },
  {
    id: "D",
    title: "contradictory deltas — negative stop delta on a LONG",
    side: "LONG",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: 75, direction: "LONG",
      stopDelta: -4.39, stopPercent: 5.871,
      targetDelta: 12.16, targetPercent: 16.263,
      rrRatio: 2.77, hasPositionTool: true, confidence: 85,
    }),
  },
];

// ─── Frozen contract ────────────────────────────────────────────────────────
// A is load-bearing: it is the "OCR still works" proof. A diff here means STOP.
const FROZEN = {
  // Captured 2026-08-01 against ea18a2b, before F1/F2/F3. `note` records which
  // scenarios a planned fix is allowed to move — anything else moving is a bug.
  A: {
    status: 200,
    note: "REGRESSION CONTRACT — no fix may move this. A working read stays working.",
    body: { ticker: "AFRM", entry: 74.7726334478, stop: 70.3826334478, target: 86.9326334478, side: "LONG", confidence: 95, rrRatio: 2.76993166287 },
  },
  B: {
    status: 200,
    note: "F2 will lower confidence here. Updating this row is the point of F2.",
    body: { ticker: "AFRM", entry: null, stop: null, target: null, side: "LONG", confidence: 85, rrRatio: null },
  },
  C: {
    status: 200,
    note: "Already degrades correctly (confidence 0). No fix should touch it.",
    body: { ticker: null, entry: null, stop: null, target: null, side: "LONG", confidence: 0, rrRatio: null },
  },
  D: {
    status: 200,
    note: "confidence 90 on a negative stop delta — out of scope for F1-F3, frozen so it can't drift while unfixed.",
    body: { ticker: "AFRM", entry: 74.7709524688, stop: null, target: 86.9309524688, side: "LONG", confidence: 90, rrRatio: 2.77 },
  },
};

const realFetch = globalThis.fetch;

function stubFetch(modelText) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) {
      return { ok: true, json: async () => ({ id: "contract-test-user" }) };
    }
    if (u === ANTHROPIC_URL) {
      return { ok: true, json: async () => ({ content: [{ type: "text", text: modelText }] }) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
}

function makeRes() {
  const out = { statusCode: null, body: null, headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k] = v; },
    status(code) { out.statusCode = code; return res; },
    json(obj) { out.body = obj; return res; },
    end() { return res; },
  };
  return { res, out };
}

async function run(scenario, handler) {
  stubFetch(scenario.modelText);
  const { res, out } = makeRes();
  const req = {
    method: "POST",
    headers: {
      origin: "https://swing-edge.com",
      authorization: "Bearer stub-jwt",
    },
    body: { image: "data:image/png;base64,QUFB", side: scenario.side },
  };
  await handler(req, res);
  return out;
}

const { default: handler } = await import("../api/ocr.js");

const results = [];
for (const s of SCENARIOS) {
  // Each scenario gets its own user id would be cleaner, but the per-minute cap is
  // 10 and we send 4 — no scenario is ever the one that trips it.
  const out = await run(s, handler);
  results.push({ scenario: s, out });
}
globalThis.fetch = realFetch;

let failed = 0;
const lines = [];
for (const { scenario, out } of results) {
  lines.push(`── ${scenario.id} · ${scenario.title}`);
  lines.push(`   HTTP ${out.statusCode}`);
  lines.push(`   ${JSON.stringify(out.body)}`);
  const frozen = FROZEN[scenario.id];
  if (!PRINT && frozen) {
    const gotStatus = out.statusCode;
    const okStatus = gotStatus === frozen.status;
    const okBody = JSON.stringify(out.body) === JSON.stringify(frozen.body);
    if (!okStatus || !okBody) {
      failed++;
      lines.push(`   ❌ FROZEN CONTRACT MOVED`);
      lines.push(`      expected HTTP ${frozen.status} ${JSON.stringify(frozen.body)}`);
    } else {
      lines.push(`   ✅ matches frozen contract`);
    }
  }
  lines.push("");
}

console.log(lines.join("\n"));

if (PRINT) {
  console.log("(--print: baseline capture only, no assertions run)");
  process.exit(0);
}

const checked = Object.keys(FROZEN).length;
if (failed > 0) {
  console.error(`❌ ocr-contract: ${failed}/${checked} frozen scenarios moved.`);
  process.exit(1);
}
console.log(`✅ ocr-contract: ${checked}/${checked} frozen scenarios unchanged, ${SCENARIOS.length}/${SCENARIOS.length} scenarios executed.`);
