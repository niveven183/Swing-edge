// scripts/ocr-contract-test.mjs — the /api/ocr response contract, frozen.
//
// Drives the real handler end to end with a stubbed upstream: the Anthropic call
// and the GoTrue token check are the only things faked, so parseImage, extractJson,
// computeEntry, validate, computeLevels and every gate run for real.
//
// Scenario A is the regression contract — it must not move by one byte. B/C/D are
// characterization: their frozen values describe what the endpoint does today, and
// any change to them is a deliberate edit to this file in the same commit.
// E–H cover the direction decision (F4). G and H are Niv's two live QA reads of
// 01.08 replayed as logic — the bug report itself, frozen so it cannot come back.
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
  // ─── F4 · direction ───────────────────────────────────────────────────────
  // The deltas are unsigned, so `side` alone decides whether the stop lands above
  // or below the entry. E–H pin down which source wins that decision and what the
  // caller is told about it. G and H are Niv's two live QA reads of 01.08, replayed
  // as logic: they are the reason this hierarchy exists.
  {
    id: "E",
    title: "geometry beats the user's toggle — LONG lines, form on SHORT",
    side: "SHORT",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: 75, direction: "LONG",
      stopDelta: 4.39, stopPercent: 5.871, stopPrice: 70.38,
      targetDelta: 12.16, targetPercent: 16.263, targetPrice: 86.93,
      rrRatio: 2.77, hasPositionTool: true, confidence: 85,
    }),
  },
  {
    id: "F",
    title: "no Position tool — nothing measured, the user's toggle stands",
    side: "SHORT",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: null, direction: null,
      stopDelta: null, stopPercent: null, stopPrice: null,
      targetDelta: null, targetPercent: null, targetPrice: null,
      rrRatio: null, hasPositionTool: false, confidence: 85,
    }),
  },
  {
    id: "G",
    title: "Niv QA #1 (AFRM 01.08) — model labelled SHORT, the lines say LONG",
    side: "LONG",
    modelText: JSON.stringify({
      ticker: "AFRM", entry: 74.09, direction: "SHORT",
      stopDelta: 5.65, stopPercent: 7.626, stopPrice: 68.44,
      targetDelta: 10.66, targetPercent: 14.388, targetPrice: 84.75,
      rrRatio: 1.89, hasPositionTool: true, confidence: 88,
    }),
  },
  {
    id: "H",
    title: "Niv QA #2 (MRVL 01.08) — perfect read, form left on SHORT",
    side: "SHORT",
    modelText: JSON.stringify({
      ticker: "MRVL", entry: 187.44, direction: "LONG",
      stopDelta: 26.54, stopPercent: 14.159, stopPrice: 160.9,
      targetDelta: 64.41, targetPercent: 34.363, targetPrice: 251.85,
      rrRatio: 2.43, hasPositionTool: true, confidence: 90,
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
    note: "REGRESSION CONTRACT — no fix may move this. A working read stays working. F4 (2026-08-01) ADDED the two direction fields and moved NO existing value: entry/stop/target/side/confidence/rrRatio are byte-identical to the 2026-08-01 capture. sideSource 'tool' because A carries no stopPrice/targetPrice, so nothing was measurable and the model's own label wins.",
    body: { ticker: "AFRM", entry: 74.7726334478, stop: 70.3826334478, target: 86.9326334478, side: "LONG", sideSource: "tool", sideConflict: false, confidence: 95, rrRatio: 2.76993166287 },
  },
  B: {
    status: 200,
    note: "MOVED BY F2 (2026-08-01): confidence 85 -> 25. The model's 85 was certainty about the ticker, not about a trade that was never read. 25 sits below MIN_CONFIDENCE so every badge reads it as failure. F4 ADDED the two direction fields and moved NO existing value. sideSource 'user': nothing was read, so nothing may override the trader — and the caller's toggle was LONG, so no conflict.",
    body: { ticker: "AFRM", entry: null, stop: null, target: null, side: "LONG", sideSource: "user", sideConflict: false, confidence: 25, rrRatio: null },
  },
  C: {
    status: 200,
    note: "Already degrades correctly (confidence 0). No fix should touch it. F4 raised max_tokens 300 -> 340 for the two new prompt fields; C is byte-identical afterwards on every pre-existing field, which is the check Niv required. The ceiling can only ever reduce truncation, never introduce it — C truncates on a fixed stub string, so it keeps proving that a cut JSON still degrades to confidence 0.",
    body: { ticker: null, entry: null, stop: null, target: null, side: "LONG", sideSource: "user", sideConflict: false, confidence: 0, rrRatio: null },
  },
  D: {
    status: 200,
    note: "confidence 90 on a negative stop delta — out of scope for F1-F3 AND for F4, frozen so it can't drift while unfixed. F4 ADDED the two direction fields and moved NO existing value; confidence is still 90 because F4 addressed direction, not confidence on self-contradictory input.",
    body: { ticker: "AFRM", entry: 74.7709524688, stop: null, target: 86.9309524688, side: "LONG", sideSource: "tool", sideConflict: false, confidence: 90, rrRatio: 2.77 },
  },
  E: {
    status: 200,
    note: "F4: stop/target lines read at 70.38/86.93 sit either side of the entry the LONG way, and each distance matches its trusted delta — measured geometry, so sideSource 'geometry' outranks the SHORT toggle. sideConflict true: the client SHOWS this, it does not flip the toggle.",
    body: { ticker: "AFRM", entry: 74.7726334478, stop: 70.3826334478, target: 86.9326334478, side: "LONG", sideSource: "geometry", sideConflict: true, confidence: 95, rrRatio: 2.76993166287 },
  },
  F: {
    status: 200,
    note: "F4: nothing was measured, so nothing may override the trader. side follows body.side ('SHORT'), sideSource 'user', no conflict. Confidence still capped at 25 by F2 — the ticker survived, the trade was never read.",
    body: { ticker: "AFRM", entry: null, stop: null, target: null, side: "SHORT", sideSource: "user", sideConflict: false, confidence: 25, rrRatio: null },
  },
  G: {
    status: 200,
    note: "F4: Niv's AFRM read of 01.08 replayed. The model labelled the panel SHORT; the lines it read are unambiguously LONG. Geometry wins, so the levels come out 68.44/84.75 — the chart's own numbers — instead of the inverted 79.74/63.43 that shipped that day. sideConflict is FALSE because geometry agrees with the toggle the trader was already on: the fix turns this read into a clean fill, not a prompt. confidence 73 = 88 +5 converged +5 vision-entry agrees -25 geometry contradicts the label.",
    body: { ticker: "AFRM", entry: 74.0890815779, stop: 68.4390815779, target: 84.7490815779, side: "LONG", sideSource: "geometry", sideConflict: false, confidence: 73, rrRatio: 1.88672566372 },
  },
  H: {
    status: 200,
    note: "F4: Niv's MRVL read of 01.08 replayed. Levels were already correct that day; the failure was that the form stayed on SHORT and validation blocked a perfect extraction. sideConflict true is precisely that state, now reported instead of left for the trader to deduce from a red banner.",
    body: { ticker: "MRVL", entry: 187.441297526, stop: 160.901297526, target: 251.851297526, side: "LONG", sideSource: "geometry", sideConflict: true, confidence: 100, rrRatio: 2.42690278824 },
  },
};

const realFetch = globalThis.fetch;

function stubFetch(modelText, userId) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) {
      return { ok: true, json: async () => ({ id: userId }) };
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
  // One synthetic user PER scenario. The endpoint's per-minute cap is 10, so a
  // shared id would silently turn scenario 11 into a 429 instead of a contract
  // check — a ceiling that grows into a false failure the day someone adds one
  // more case. Per-scenario ids remove it for good.
  stubFetch(scenario.modelText, `contract-test-${scenario.id}`);
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
