// scripts/lib/syncScore.mjs — B-431 (R-4, B-425 wave 09.11): the mutant arms of eye-sync-probe only judged the
// scenes they EXPECT red (RED) and the controls they expect green (CONTROLS). A third scene that failed there
// passed silently — measured: H2 red in MUT-RESURRECT/iphone14 (run 38434987667, push 22d2e98), invisible
// until the B-425 diagnosis. This is the missing half: every scene that RAN in an arm and is neither an
// expected red nor a control must be GREEN — or be DECLARED here with the reason it is not.
//
// Pure (no I/O) so eye-sync-probe's META step can prove it can fire. A scene that did not run (status
// "missing"/"skipped" — an arm's grep selects a subset) is not judged: absence is not a verdict.
export const DECLARED_RED = {
  // arm → { scene: "why this scene is red there and that is accepted" }. Empty on purpose: a new entry is a
  // decision (Niv), ⛔ a way to make the probe pass.
};

const RAN_AND_FAILED = (r) => r && !["passed", "missing", "skipped"].includes(r.status);

export function unexpectedReds({ verdicts, red, controls, all, projects, declared = DECLARED_RED }) {
  const out = [];
  for (const [arm, byKey] of Object.entries(verdicts)) {
    if (arm === "HEAD") continue; // HEAD has its own all-green check
    const expected = new Set([...(red[arm] || []), ...(controls[arm] || []), ...Object.keys(declared[arm] || {})]);
    for (const p of projects) for (const scene of all) {
      if (expected.has(scene)) continue;
      const r = byKey[`${p}:${scene}`];
      if (RAN_AND_FAILED(r)) out.push({ arm, project: p, scene, status: r.status, msg: String(r.msg || "").split("\n")[0].slice(0, 240) });
    }
  }
  return out;
}

/** META: the function can fire (a third red is flagged), can stay quiet (green · not run · declared · expected). */
export function selfCheck() {
  const verdicts = { "MUT-X": { "p:H1": { status: "failed", msg: "x" }, "p:H2": { status: "failed", msg: "stray" }, "p:H3": { status: "passed" }, "p:H4": { status: "missing" }, "p:H5": { status: "skipped" } } };
  const base = { verdicts, red: { "MUT-X": ["H1"] }, controls: { "MUT-X": ["H3"] }, all: ["H1", "H2", "H3", "H4", "H5"], projects: ["p"] };
  const got = unexpectedReds(base);
  const declared = unexpectedReds({ ...base, declared: { "MUT-X": { H2: "known" } } });
  return {
    fires: got.length === 1 && got[0].scene === "H2",
    quietWhenDeclared: declared.length === 0,
    ignoresExpectedAndAbsent: !got.some((g) => ["H1", "H3", "H4", "H5"].includes(g.scene)),
  };
}
