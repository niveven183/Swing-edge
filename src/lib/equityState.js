/**
 * equityState — ההכרעה אם מותר להציג את מספר ההון, ומה נאמר עליו.
 *
 * 🔴 **הכלל:** ⛔ אין מספר עד שהוא שלם. `curEquity` (`SwingEdge_App.jsx:2561`)
 * מסכם `equityBase + closedPnL.value + openPnL.value` **גם** כשאיבר חסר, ולכן
 * המסך הציג `$3,000.00` ואז `$3,045.66` — אותן הגדרות, 45.66 של P&L פתוח
 * שטרם נחת, בלי חיווי טעינה. מספר חלקי שמוצג כסופי הוא הכשל השקט ש-§2 אוסר.
 *
 * ⚠️ **מודול ⛔ ולא תנאי בתוך ה-`useMemo` שב-`.jsx`** — מאותו נימוק בדיוק
 * שכתוב ב-`useFxRates.js:206-211`: תנאי הכלוא ב-`.jsx` ⛔ אינו ניתן לייבוא
 * ב-node, והאסרציה עליו הייתה **מקור** ולא **ערך**.
 *
 * ⛔ **הפונקציה ⛔ אינה מחשבת כסף ו⛔ אינה נוגעת ב-`openPnL`** — היא **קוראת**
 * מונים שכבר נספרו שם, ומכריעה תצוגה בלבד.
 */

/**
 * ⚠️ **⛔ אין ברירות מחדל בחתימה, בכוונה.** מונה שנעדר ונופל בשקט ל-`0` הוא
 * בדיוק ההמצאה ש-`R-2` אוסר: `0` היה מסווג `complete` אוכלוסייה שלא נספרה.
 * כל קורא מוסר את שבעת האותות במפורש.
 *
 * @param {"identity"|"loading"|"ready"|"unavailable"} fxStatus מ-`useFxRates`
 * @param {Date|null} pricesLastUpdated `null` = מעולם לא נחת מחיר
 * @returns {"loading"|"complete"|"partial"|"no_fx"}
 */
export const deriveEquityState = ({
  missingCount,
  unconvertedCount,
  closedUnconvertedCount,
  pricesLoading,
  pricesLastUpdated,
  fxStatus,
}) => {
  // ⚠️ הסדר קובע — שני מצבים יכולים להתקיים יחד.

  // ⛔ אין שער ⇒ `SwingEdge_App.jsx:2199` כבר הפיל את `dispCcy` למטבע ההון
  // ו-`useFxRates.js:219` כבר סירב על כל עסקה פתוחה. המספר **שלם ביחידתו** —
  // מה שחסר הוא ההמרה, ועל כך מודיעים. ⛔ זה ⛔ אינו מצב טעינה.
  if (fxStatus === "unavailable") return "no_fx";

  // הטבלה טרם נחתה ⇒ `fxOk` שקר ⇒ `dispCcy` **זמני**. הצגת ספרות כאן היא
  // ההיפוך `₪2,500.00 → $876.89` (`AUDIT-2026-09-05-capital-sources.md` §4.3):
  // ⛔ לא הסכום משתנה — **הסמל**. ⚠️ ⛔ אין כאן הבהוב חוזר: `useFxRates.js:80`
  // משמר `ready` בריענון ו⛔ לעולם אינו חוזר ל-`loading`.
  if (fxStatus === "loading") return "loading";

  // 🔴 **`pricesLastUpdated == null` ⛔ אינו קישוט — בלעדיו הכותרת מתרוקנת
  // כל 15 שניות.** `setPricesLoading(true)` (`:1986`) יורה בכל מחזור ריענון,
  // וגדר על `pricesLoading` לבדו הייתה מוחקת מספר **שלם** מהמסך בכל פעימה
  // בשוק פתוח. ⇒ הגדר חלה על ה**נחיתה הראשונה בלבד**; ריענון ברקע משאיר את
  // המספר האחרון על המסך.
  if (pricesLoading && pricesLastUpdated == null) return "loading";

  // ⚠️ **`D1` הוכרע ל-(ב)** (`DECISIONS` 05.09): «מעולם לא נחת» ∧ ⛔ טוען —
  // למשל טאב שנפתח ברקע (`:2038` `document.hidden ⇒ return`) או ספק שהחזיר
  // ריק — נופל לכאן דרך `missingCount`, ומקבל **מספר עם תג אמיתי** ⛔ ולא
  // מקום ריק בלתי-חסום. כותרת ריקה ללא תקרת-זמן היא כשל שקט **חדש**.
  //
  // ⚠️ הרגל ה**סגורה** נספרת כאן יחד עם החיה: `B-142` כבר מגלה עליה, וכותרת
  // שמסווגת `complete` מעל באנר שאומר «אין שער ל-N סגורות» היא סתירה על
  // אותו מסך.
  if (missingCount > 0 || unconvertedCount > 0 || closedUnconvertedCount > 0)
    return "partial";

  return "complete";
};

/**
 * מה **מרונדר** בכל מצב. מקור אחד לשלושת אתרי ההון — כותרת (`:4181`),
 * כרטיס ה-KPI (`:4417`) ופוטר (`:8258`) — ⛔ ולא שלוש העתקות שייסחפו.
 *
 * ⚠️ **`label` נבנה ממפתחות i18n קיימים בלבד** (`partialSumWarn` ·
 * `missingPriceWarn` · `unconvertedPnlWarn` · `unconvertedClosedWarn` ·
 * `fxUnavailable` · `loading`) — כולם אוששו קיימים ב-5 השפות. ⛔ אין מחרוזת
 * קשיחה ו⛔ אין מפתח חדש.
 *
 * ⚠️ **המספרים נמסרים עם מכנה** (§2) — `{n}` מתוך `{m}`, ⛔ לא `{n}` לבדו.
 *
 * @returns {{text: string, mark: boolean, label: string|null}}
 *   `mark` — האם להציג `⚠` ליד המספר. `label` — הטקסט ל-`aria-label`+`title`.
 */
export const equityFigure = ({
  state,
  text,
  missingCount,
  unconvertedCount,
  closedUnconvertedCount,
  openCount,
  closedCount,
  t,
}) => {
  // ⛔ **אף ספרה.** ⚠️ `label` בכל זאת קיים — `…` בלי שם נגיש הוא תו ריק
  // לקורא מסך, וזו הסתרה ⛔ ולא גילוי.
  if (state === "loading") return { text: "…", mark: false, label: t.loading };

  if (state === "no_fx") return { text, mark: true, label: t.fxUnavailable };

  if (state === "partial") {
    const parts = [];
    if (missingCount > 0)
      parts.push(t.missingPriceWarn.replace("{n}", String(missingCount)).replace("{m}", String(openCount)));
    if (unconvertedCount > 0)
      parts.push(t.unconvertedPnlWarn.replace("{n}", String(unconvertedCount)).replace("{m}", String(openCount)));
    if (closedUnconvertedCount > 0)
      parts.push(t.unconvertedClosedWarn.replace("{n}", String(closedUnconvertedCount)).replace("{m}", String(closedCount)));
    return { text, mark: true, label: `${t.partialSumWarn} ${parts.join(" · ")}` };
  }

  return { text, mark: false, label: null };
};
