#!/usr/bin/env node
/* 작업 311 — 양성 대조(negative control): 고친 §8 이 «그냥 통과하는 게이트» 가 되지 않았는지 본다.
 *
 *   node tools/probe311.js
 *
 * 311 은 §8 의 «홀드 중 표기 == 통짜 재렌더 표기» 대조를 한 번의 evaluate 안으로 묶어
 * 두 읽기 사이에 강화 틱이 못 끼게 했다(계측 부패 제거). 그 수정이 «틱을 없앤» 것이 아니라
 * «판정 자체를 무디게 만든» 것이라면, 표기층을 **일부러 갈라놔도** 초록이 뜬다.
 * 그래서 여기서는 제품의 `mdLive`(홀드 중 «숫자만» 갱신하는 공용 라이터)를 페이지 안에서
 * 일부러 어긋나게 갈아 끼우고, verify262 §8 과 **같은 대조**를 돌려 **빨간지**를 본다.
 *
 * 기대: ⓐ 무결 상태 = 7자리 일치(diff 0)  ⓑ mdLive 파손 = diff ≥ 1 (게이트가 잡는다)
 * `index.html` 은 건드리지 않는다 — 파손은 페이지 안에서만 산다.
 */
const path = require('path');
const fs = require('fs');
const { launch: pwLaunch } = require('./pwlaunch');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const BTN = '#mLv';
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  — ' + detail : '')); }
};
function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}
const center = (page, sel) => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, sel);

/* verify262 §8 과 같은 대조 — live 읽기 → 정지(통짜 재렌더) → full 읽기 를 한 evaluate 안에서 */
const faceBoth = page => page.evaluate(() => {
  const read = () => {
    const b = $('mbox'), g = s => { const n = b.querySelector(s); return n ? n.innerHTML : null; };
    const bar = b.querySelector('.sk-pb i');
    return { gr: g('.sk-gr b'), lv: g('.sk-lv b'), w: bar ? bar.style.width : null,
             pb: g('.sk-pb b'), cell: g('.sk-ct .vl .nt b'), desc: g('.sk-db p'), own: g('.sk-ow .v b') };
  };
  const held = typeof upHold !== 'undefined' && upHold !== null;
  const live = read();
  upHoldStop(false);
  const full = read();
  return { held, live, full };
});

const KEYS = ['gr', 'lv', 'w', 'pb', 'cell', 'desc', 'own'];

async function round(page, breakLive){
  await page.evaluate(o => {
    step = () => {};
    S.autoBuy = false;
    const id = SKILLS[0].id;
    S.own[id] = { n: 99999, l: 1 };
    save();
    /* 파손: 홀드 중 «숫자만» 갱신하는 공용 라이터가 레벨 한 칸을 덜 쓰게 만든다
       (= «표기층이 두 벌로 갈라진» 상태를 인위로 재현. 원본은 window.__mdLive 에 둔다) */
    if (o.breakLive) {
      if (!window.__mdLive) window.__mdLive = mdLive;
      mdLive = function(v){ const w = Object.assign({}, v); if (w.lv) w.lv = String(w.lv) + ' ✱'; return window.__mdLive(w); };
    } else if (window.__mdLive) {
      mdLive = window.__mdLive;
    }
    showSkillDetail(id);
  }, { breakLive });
  await page.waitForTimeout(120);
  const c = await center(page, BTN);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.waitForTimeout(800);
  const r = await faceBoth(page);
  await page.mouse.up();
  await page.waitForTimeout(120);
  return Object.assign(r, { diff: KEYS.filter(x => r.live[x] !== r.full[x]) });
}

(async () => {
  const browser = await pwLaunch(chromium, launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);

  console.log('[A] 무결 — 고친 §8 이 초록이다(계측 부패가 없다)');
  /* 한 번이 아니라 6회 — 311 의 원래 증상이 «간헐» 이었으므로 붙여서 돌려 본다 */
  let greens = 0, held = 0;
  for (let i = 0; i < 6; i++) {
    const r = await round(page, false);
    if (r.diff.length === 0) greens++;
    if (r.held) held++;
    if (r.diff.length) console.log('     · ' + i + '회 diff: ' + r.diff.join(','));
  }
  ok('무결 6회 연속 diff 0', greens === 6, greens + '/6');
  ok('6회 모두 «읽는 순간 홀드 중» 이었다', held === 6, held + '/6');

  console.log('[B] 양성 대조 — mdLive 를 갈라놓으면 §8 이 빨개진다');
  const bad = await round(page, true);
  ok('파손 상태에서 diff ≥ 1 (게이트가 잡는다)', bad.diff.length >= 1, 'diff: ' + (bad.diff.join(',') || '없음'));
  ok('잡힌 자리가 lv 다(파손한 바로 그 자리)', bad.diff.indexOf('lv') >= 0,
     'live «' + bad.live.lv + '» vs full «' + bad.full.lv + '»');

  console.log('[C] 되돌림 — 파손을 걷으면 다시 초록이다');
  const back = await round(page, false);
  ok('되돌린 뒤 diff 0', back.diff.length === 0, 'diff: ' + (back.diff.join(',') || '없음'));

  await browser.close();
  console.log((fail ? 'PROBE311 FAIL' : 'PROBE311 PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
