#!/usr/bin/env node
/* 356 11회차 재현기 — «스캐너가 한 번도 밟은 적 없는 화면» 에 찌그러진 아이콘이 있는가
 *
 *   node tools/probe356r11.js            # 후보 화면만 열어 비균등 아이콘을 찍는다
 *   node tools/probe356r11.js --json
 *
 * 왜 이 자가 필요한가(338 규칙 — 처방 전에 재현):
 *   356 의 스코프는 `tools/scan356.js` 의 `SCREENS` 가 **전부**다. 래칫 [B]·[S3] 도 그 목록만
 *   돌므로 **목록에 없는 화면은 «0건» 으로 읽힌다**(LESSONS 356-⑪ — 5회차가 23 훈련에서
 *   똑같이 겪었고, 397 은 36 출석 패스에서, 443 은 패스 탭에서 겪었다. 세 번 같은 자리다).
 *   그런데 같은 저장소의 **351 오프너 목록은 55화면**(`tools/cap351.js` SET1~SET3)이고
 *   356 은 **42화면**이다 — 그 차집합이 이 자의 표본이다.
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)를 **그대로** 부른다 — 자를 두 벌로 적으면 한쪽만 늙는다
 * ([S3] 주석 · 385 «자매 자 드리프트»).
 *
 * ⚠ LESSONS 356-⑬ — «눌렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 확인한다.
 *   조용히 실패한 클릭은 **직전 화면을 두 번 세고 초록을 준다.**
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, SCREENS } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

/* 후보 = 351(55화면)에는 있는데 356(42화면)에는 없는 자리.
   sig = «그 화면에 갔다» 를 말하는 고유 노드(없으면 진입 실패로 본다). */
const CAND = [
  ['05 장비 세부(무기)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="weapon"]'], '#wpnw'],
  ['05 장비 세부(방패)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="shield"]'], '#wpnw'],
  ['05 장비 세부(목걸이)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="amulet"]'], '#wpnw'],
  ['55 길라잡이', ['#menub', '#mnw [data-mn="guide"]'], '#modal.on #mbox'],
  ['56 절전', ['#menub', '#mnw [data-mn="saver"]'], '#svw'],
  ['22 퀘스트(반복)', ['.side .ibtn[data-pop="quest"]', '.qs-tg b[data-t="rep"]'], '.qs-tg b[data-t="rep"].on'],
];

/* 진입 확인용 — 화면 서명(같은 서명이 둘이면 하나는 안 열린 것이다 · cap351 SIG 와 같은 뜻) */
const SIG = function () {
  const box = [];
  document.querySelectorAll('#app [id]').forEach((el) => {
    if (/^fx/.test(el.id)) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    if (r.width * r.height < 120000) return;
    box.push(el.id + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height));
  });
  return box.sort().join('|');
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  const errs = [];
  const sigs = new Map();

  for (const [label, steps, sig] of CAND) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        const found = await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}' 가 DOM 에 없다`);
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(300);
      const seen = await page.evaluate((q) => {
        const el = document.querySelector(q);
        if (!el) return null;
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0)
          ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null;
      }, sig);
      if (!seen) { errs.push(`${label}: 진입 실패 — 고유 노드 '${sig}' 가 안 보인다 (직전 화면을 쟀을 수 있다)`); }
      const s = await page.evaluate(SIG);
      if (sigs.has(s)) errs.push(`${label}: 서명이 '${sigs.get(s)}' 과 같다 — 둘 중 하나는 안 열렸다`);
      else sigs.set(s, label);

      const got = await page.evaluate(COLLECT, { all: false });
      const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
      out.push({ label, sig: seen, nodes: got.length, bad });
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
      out.push({ label, sig: null, nodes: 0, bad: [] });
    }
    await ctx.close();
  }
  await browser.close();

  if (JSON_OUT) { console.log(JSON.stringify({ tol: TOL, scanned356: SCREENS.length, out, errs }, null, 1)); process.exit(0); }

  console.log(`[probe356r11] 스캐너 스코프 ${SCREENS.length}화면 · 이 자의 후보 ${CAND.length}화면 (351 오프너에는 있는데 356 에는 없는 자리)`);
  let total = 0;
  for (const r of out) {
    console.log(`\n── ${r.label} — 아이콘 노드 ${r.nodes}개 · 비균등 ${r.bad.length}개` + (r.sig ? ` (고유 노드 ${r.sig[0]}×${r.sig[1]})` : ' (진입 실패)'));
    for (const b of r.bad) {
      total++;
      const pct = ((b.ratio - 1) * 100).toFixed(1);
      console.log(`   ${b.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${b.kind}] ${b.sel}  «${b.txt}»  ${b.w}×${b.h}`);
      for (const c of b.chain) console.log(`      ← ${c}`);
      if (b.own) console.log(`      own: ${b.own}`);
    }
  }
  console.log(`\n합계 비균등 노드 ${total}개`);
  if (errs.length) { console.log('\n[!] 진입/무음 실패'); errs.forEach((e) => console.log('  ' + e)); }
  process.exit(0);
})();
