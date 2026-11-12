// scripts/stable-tap-probe.mjs — B-425 wave (12.11, Niv (a)): the red-before for tapWhenStable on C4's «Update Capital».
// Zero CI, zero app: WebKit with the iPhone 14 profile, a settings-like card OUT of view, and the app's own
// `html { scroll-behavior: smooth }` (src/index.css) — so Playwright's scroll-into-view is ANIMATED and the press can
// land mid-scroll. What CI run 42633677042 C4 repeat 27 shows: scrollY 736 ⇒ 724 between the input and the press,
// pointerdown + mousedown on the button, ⛔ mouseup / click.
//
//   node scripts/stable-tap-probe.mjs        ⇒ OLD locator.click() must MISS (down without click) at least once in N;
//                                              NEW tapWhenStable must land every time.
// The helper is the REAL tests-eye/stableTap.js. Exit 1 = blind (OLD never missed) or the fix does not hold.
import { webkit, devices } from "@playwright/test";
import { tapWhenStable } from "../tests-eye/stableTap.js";

const N = Number(process.env.N || 40);
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14"] });
const page = await ctx.newPage();
await page.setContent(`<html style="scroll-behavior:smooth;scroll-padding-top:80px"><body style="margin:0">
  <div style="height:900px;background:#eee">filler</div>
  <div class="rounded-lg" style="padding:8px;border:1px solid #999">
    <input id="cap" placeholder="10,000"><button id="btn" style="min-width:44px;min-height:44px">Update Capital</button>
  </div>
  <div style="height:900px;background:#ddd">filler</div>
  <script>
    window.log = [];
    for (const t of ["pointerdown","mouseup","click"]) document.addEventListener(t, (e) => log.push(t + ":" + (e.target.id || e.target.tagName)), true);
  </script></body></html>`);

async function once(tap) {
  // Start every try with the button PARTLY below the fold — its centre still on screen, its bottom edge not (the
  // trace's last press was at y=620 of a 664px viewport). An instant jump, so the smooth rule does not animate the reset.
  await page.evaluate(() => {
    log.length = 0;
    const r = document.getElementById("btn").getBoundingClientRect();
    document.documentElement.style.scrollBehavior = "auto";
    scrollTo(0, scrollY + r.top - (innerHeight - r.height / 2 - 2));
    document.documentElement.style.scrollBehavior = "smooth";
  });
  await tap();
  await page.waitForTimeout(300);
  const log = await page.evaluate(() => log.slice());
  const down = log.includes("pointerdown:btn"), click = log.includes("click:btn");
  return { down, click };
}
let oldMiss = 0, newMiss = 0, oldDownNoClick = 0;
const btn = page.locator("#btn");
for (let i = 0; i < N; i++) {
  const o = await once(() => btn.click());
  if (!o.click) oldMiss++;
  if (o.down && !o.click) oldDownNoClick++;
  const n = await once(() => tapWhenStable(page, btn, "Update Capital"));
  if (!n.click) newMiss++;
}
await browser.close();
console.log(`OLD locator.click(): missed ${oldMiss}/${N} (down without click ${oldDownNoClick}) · NEW tapWhenStable: missed ${newMiss}/${N}`);
if (oldMiss === 0) { console.log("❌ instrument blind: OLD never missed — this probe proves nothing"); process.exit(1); }
if (newMiss !== 0) { console.log(`❌ the fix does not hold: ${newMiss}/${N}`); process.exit(1); }
console.log("✅ red-before proven (OLD misses while the page scrolls) · tapWhenStable lands every time");
