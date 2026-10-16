// scripts/lib/syncArms.mjs — the anchors, node mutants and browser arms of the hydration
// delta-merge probe (scripts/eye-sync-probe.mjs), extracted VERBATIM (B-425, 15.10) so that
// scripts/probe-flake.mjs builds the SAME BEFORE-408 / MUT-OVERWRITE trees instead of a second
// copy that would drift (R-6). ⛔ Behaviour change: probe-sync's 14 arms in CI are the proof.

import { execFileSync } from "node:child_process";
import { join } from "node:path";

export function makeArms({ root, die }) {
  const ROOT = root;
  const BEFORE_REF = "19959e6"; // the last tree before the delta merge
  const BEFORE_408_REF = "3957509"; // B-408 — the last tree before the scalar edit gate
  const APP = join(ROOT, "SwingEdge_App.jsx");
  const SETTINGS = join(ROOT, "src", "lib", "userSettings.js");
  const I18N = join(ROOT, "src", "i18n.js");
  const DELTA = join(ROOT, "src", "lib", "settingsDelta.js");
  // ═══ anchors ═════════════════════════════════════════════════════════════════
  const SKIP_TIMER = "the delta journal waits for (lastSent is set only from a confirmed read or write).\n    if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }";
  const SKIP_FLUSH = "or closing the tab re-sends the unchanged blob the timer just declined to send.\n  if (alreadySent(userId, blob)) { notifySynced(userId, blob); return; }";
  const WRITE_CATCH = "  } catch (e) {\n    fail(onFailure, \"write\", e);\n    return false;\n  }";
  const COALESCE = "let next = ops.filter((o) => !(o.coll === coll && o.key === String(key)));";
  const PUSH = "next.push({ coll, key: String(key), op, seq });";
  const HYDRATE = "const hydrate = async () => {";
  const OPS_LATE = "ops: readOps(localStorage, { onFailure: reportDeltaFailure }),";
  const MINE = "const mine = ops.filter((o) => o.coll === coll).sort((a, b) => a.seq - b.seq);";
  const DEL = "      if (o.op === \"del\") {\n        if (at >= 0) out.splice(at, 1);\n        continue;\n      }";
  // B-408 anchors
  const SETTLED = "const capitalSettled = hydrationDone || hydrationFailed || !isSupabaseConfigured;";
  const RACE = "return await Promise.race([build(ctl.signal), deadline]);";
  const GATE = "disabled={!capitalSettled}";
  // Remove ONE site's gate: the anchor ends in it, so the mutant is exactly that line.
  const UNGATE = (anchor) => [APP, anchor, () => anchor.replace(/\n\s*disabled=\{!capitalSettled\}$/, "")];
  const G408 = {
    lang: "onChange={e => editLang(e.target.value)}\n                  disabled={!capitalSettled}", // B-432 · B-435: editLang records the pending
    capitalInput: "onChange={e => setCapitalInput(e.target.value)}\n                    disabled={!capitalSettled}",
    capitalBtn: "localStorage.setItem(\"swingEdgeCapital\", String(val)); } catch {}\n                      }\n                    }}\n                    disabled={!capitalSettled}",
    capitalCurrency: "localStorage.setItem(\"swingEdgeCapitalCurrency\", c); } catch {}\n                        }}\n                        disabled={!capitalSettled}",
    accountCurrency: "localStorage.setItem(\"swingEdgeAccountCurrency\", c); } catch {}\n                        }}\n                        disabled={!capitalSettled}",
    riskInput: "onChange={e => setRiskInput(e.target.value)}\n                    disabled={!capitalSettled}",
    riskBtn: "localStorage.setItem(\"swingEdgeRiskPct\", String(val)); } catch {}\n                      }\n                    }}\n                    disabled={!capitalSettled}",
  };

  const NODE_MUTANTS = [
    ["NM-SKIP", [[SETTINGS, SKIP_TIMER, SKIP_TIMER.replace(" { notifySynced(userId, blob); return; }", " return;")],
                 [SETTINGS, SKIP_FLUSH, SKIP_FLUSH.replace(" { notifySynced(userId, blob); return; }", " return;")]], ["S1", "S3"]],
    ["NM-CATCH", [[DELTA, WRITE_CATCH, "  } catch (e) {}\n  return true;"]], ["D9"]],
    ["NM-COALESCE", [[DELTA, COALESCE, "let next = [...ops];"]], ["D7"]],
    // B-408
    ["NM-FAIL", [[APP, SETTLED, "const capitalSettled = hydrationDone || !isSupabaseConfigured;"]], ["G3"]],
    ["NM-CFG", [[APP, SETTLED, "const capitalSettled = hydrationDone || hydrationFailed;"]], ["G2"]],
  ];
  // B-408 — the deadline is proven against test:settings (the module's own harness).
  const SETTINGS_MUTANTS = [
    // ⚠️ Detach the signal too: with the race gone but the timer still aborting the request, the
    // abort alone ends the read as a failure and the mutant would survive — a blind arm.
    ["NM-NOTIMEOUT", [[SETTINGS, RACE, "return await build(new AbortController().signal);"]]],
  ];
  const VALUE_MUTANT = [[DELTA, PUSH, "next.push({ coll, key: String(key), op, seq, value: (readLocal(store, coll, onFailure) || []).find?.((x) => COLLECTIONS[coll].key(x) === String(key)) ?? null });"]];
  const show = (f, ref = BEFORE_REF) => execFileSync("git", ["show", `${ref}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const WHOLE = /^[\s\S]+$/;
  const ARMS = {
    HEAD: [],
    BEFORE: [APP, SETTINGS, I18N].map((f) => { const old = show(f); return [f, WHOLE, () => old]; }),
    "MUT-EARLY": [[APP, HYDRATE, () => `${HYDRATE}\n      const __opsEarly = readOps(localStorage, { onFailure: reportDeltaFailure });`],
                  [APP, OPS_LATE, () => "ops: __opsEarly,"]],
    "MUT-OVERWRITE": [[DELTA, MINE, () => "const mine = [];"]],
    "MUT-RESURRECT": [[DELTA, DEL, () => "      if (o.op === \"del\") continue;"]],
    // ── B-408 ──
    "BEFORE-408": [APP, SETTINGS].map((f) => { const old = show(f, BEFORE_408_REF); return [f, WHOLE, () => old]; }),
    "M3-EARLY": [[APP, WHOLE, (all) => {
      const n = all.split(GATE).length - 1;
      if (n !== 7) die(`M3-EARLY: ${GATE} matched ${n}× (must be exactly 7 — one per control site, B-272)`);
      return all.split(GATE).join("disabled={!authReady}");
    }]],
    "M3-LANG": [UNGATE(G408.lang)],
    "M3-CAPITAL": [UNGATE(G408.capitalInput), UNGATE(G408.capitalBtn)],
    "M3-CAPCCY": [UNGATE(G408.capitalCurrency)],
    "M3-ACCCCY": [UNGATE(G408.accountCurrency)],
    "M3-RISK": [UNGATE(G408.riskInput), UNGATE(G408.riskBtn)],
    "M3-FAILLOCK": [[APP, SETTLED, () => "const capitalSettled = hydrationDone || !isSupabaseConfigured;"]],
    "M5-NOTIMEOUT": [[SETTINGS, RACE, () => "return await build(new AbortController().signal);"]],
  };
  // Which scenes each arm runs. The pre-B-408 arms keep exactly the scenes they were built for.
  const OLD_SCENES = "\\b(H[1-5]|C[12]) [a-z]";
  const ARM_GREP = {
    HEAD: null, BEFORE: OLD_SCENES, "MUT-EARLY": OLD_SCENES, "MUT-OVERWRITE": OLD_SCENES, "MUT-RESURRECT": OLD_SCENES,
    "BEFORE-408": "\\b(H6|C[3-5]) [a-z]", "M3-EARLY": "\\b(H6|C4) [a-z]",
    "M3-LANG": "\\b(H6|C4) [a-z]", "M3-CAPITAL": "\\b(H6|C4) [a-z]", "M3-CAPCCY": "\\b(H6|C4) [a-z]", "M3-ACCCCY": "\\b(H6|C4) [a-z]", "M3-RISK": "\\b(H6|C4) [a-z]",
    "M3-FAILLOCK": "\\b(C3|C4) [a-z]", "M5-NOTIMEOUT": "\\b(C4|C5) [a-z]",
  };
  return { BEFORE_REF, BEFORE_408_REF, APP, SETTINGS, I18N, DELTA, NODE_MUTANTS, SETTINGS_MUTANTS, VALUE_MUTANT, ARMS, ARM_GREP };
}
