/* 작업 974 — 재현자: «찍기 전에 읽은 창» 이 찍힌 잉크를 잘라 낸다
 *
 * 338 규칙 — 처방을 쓰기 전에 등재문을 이 저장소의 자로 되잰다.
 *
 * 등재문(PROGRESS 974 · `docs/review/814-…md` §4-14-3)이 말한 것:
 *   ⓐ rect 를 읽고 화소를 재는 자 전수에서 «읽기 ↔ 찍기» 순서를 센다
 *   ⓑ 팝·스케일 변형이 걸리는 호스트를 쓰는 자를 골라낸다
 *   ⓒ 자에 «창이 찍힌 잉크를 담는가» 항(= `probe814d` [D0])을 심는다
 *
 * 이 자가 답하는 것은 ⓐ 의 **모집단**과 ⓑ 의 **실물 갈림**이다(ⓐ 의 실행 조사는
 * `tools/sweep974.js` 가 `PW_GEO974` 감사자로 돌린다 — 30자를 실제로 굴려야 하므로 자를 나눴다).
 *
 * 실행: node tools/probe974.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe974-'));
const PEAK_WASH = 0.0001;   /* 814 12·13회차가 «최악» 으로 못박은 자리(워시 봉우리) */
const RUNS = 3;             /* «플레이키가 아니라 결정적» 을 못박는 축 — LESSONS 107 ③ */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const f1 = (n) => (n === null || n === undefined ? '—' : n.toFixed(1));

/* ── §1 인구조사 (정적) ───────────────────────────────────────────────── */
function census() {
  const files = fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.js'));
  const src = new Map();
  const read = (f) => {
    if (!src.has(f)) { try { src.set(f, fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8')); }
                       catch (_) { src.set(f, ''); } }
    return src.get(f);
  };
  const rect = files.filter((f) => /getBoundingClientRect/.test(read(f)));
  const shot = rect.filter((f) => /screenshot/.test(read(f)));
  const pix = shot.filter((f) => /pngjs|PNG\.sync|png913/.test(read(f)));
  return { files, rect, shot, pix, read };
}

/* ── §2 팝·스케일 변형 목록 (정적) ────────────────────────────────────────
   ⓑ 의 «어떤 호스트가 위험한가» 는 취향이 아니라 제품이 정한다 — `index.html` 의
   `@keyframes` 중 **transform 이 1 을 벗어나는 배율**을 담은 것이 곧 그 목록이다. */
function pops() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\}\s*(?=@|\.|#|\/\*|\n\s*[A-Za-z@.#])/g;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1], body = m[2];
    const scales = [...body.matchAll(/scale(?:3d|X|Y)?\(\s*([\d.]+)/g)].map((s) => parseFloat(s[1]));
    const peak = scales.filter((v) => Number.isFinite(v) && Math.abs(v - 1) > 0.02);
    if (peak.length) out.push({ name, peak: Math.max(...peak.map((v) => Math.abs(v - 1))) + 1, n: scales.length });
  }
  return out;
}

/* ── §3 실물 갈림 (동적) — 814 호스트 그대로 ─────────────────────────── */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

async function boot() {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.addInitScript(FREEZE);
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {};
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  const opened = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' }); el.click();
    return !!(document.querySelector('#modal') && document.querySelector('#modal').offsetParent !== null);
  });
  if (opened) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  await p.waitForTimeout(250);
  return { b, p };
}

/* 값 줄의 Range 잉크 bbox — `probe814c`·`probe814d` 와 같은 것 */
async function geo(p) {
  return await p.evaluate(() => {
    const card = document.querySelector('#bCos .sk-card.sel');
    if (!card) return null;
    const rect = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
    const ink = (el) => {
      if (!el) return null;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t, bb = null;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect(); if (!r.width || !r.height) continue;
        bb = bb ? { x: Math.min(bb.x, r.left), y: Math.min(bb.y, r.top),
                    r2: Math.max(bb.r2, r.right), b2: Math.max(bb.b2, r.bottom) }
                : { x: r.left, y: r.top, r2: r.right, b2: r.bottom };
      }
      return bb ? { x: bb.x, y: bb.y, w: bb.r2 - bb.x, h: bb.b2 - bb.y } : null;
    };
    const lvEl = card.querySelector('.sk-clv');
    return { card: rect(card.getBoundingClientRect()), lv: ink(lvEl),
             lvBox: lvEl ? rect(lvEl.getBoundingClientRect()) : null,
             tf: lvEl ? getComputedStyle(lvEl).transform : null,
             tfUp: (() => { let e = lvEl, s = []; while (e && e !== document.body) {
               const t = getComputedStyle(e).transform; if (t && t !== 'none') s.push(e.className + ':' + t); e = e.parentElement; }
               return s; })() };
  });
}

async function hideLv(p) {
  return await p.evaluate(() => {
    const card = document.querySelector('#bCos .sk-card.sel');
    const nodes = [card.querySelector('.sk-clv')];
    const L2 = document.getElementById('fxl');
    if (L2) for (const k of L2.querySelectorAll('.fx-keep')) {
      const s = (k.textContent || '').replace(/\s+/g, ' ').trim();
      if (s && /^Lv\./.test(s)) nodes.push(k);
    }
    for (const n of nodes) {
      n.style.setProperty('visibility', 'hidden', 'important');
      for (const d of n.querySelectorAll('*')) d.style.setProperty('visibility', 'hidden', 'important');
    }
    return nodes.length;
  });
}

const shot = async (p, tag) => {
  const f = path.join(TMP, tag + '.png');
  await p.screenshot({ path: f });
  return PNG.sync.read(fs.readFileSync(f));
};

function inkMask(a, b2, box) {
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(a.width, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(a.height, Math.ceil(box.y + box.h));
  const on = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.width + x) * 4;
    const d = Math.abs(a.data[i] - b2.data[i]) + Math.abs(a.data[i + 1] - b2.data[i + 1])
            + Math.abs(a.data[i + 2] - b2.data[i + 2]);
    if (d > 3) on.push([x, y]);
  }
  return on;
}

/* [D0] 의 축 그대로 — 그 창이 «찍힌 잉크» 를 몇 % 담는가 */
function cover(ink, bx) {
  if (!bx || !ink.length) return 0;
  const x0 = Math.round(bx.x) + 1, x1 = Math.round(bx.x + bx.w) - 1;
  const y0 = Math.round(bx.y) + 1, y1 = Math.round(bx.y + bx.h) - 1;
  let n = 0;
  for (const [x, y] of ink) if (x >= x0 && x < x1 && y >= y0 && y < y1) n++;
  return n / ink.length;
}

async function oneRun(i) {
  const { b, p } = await boot();
  try {
    await p.evaluate((peak) => {
      const btn = document.querySelector('#bCos [data-cosup]'); if (!btn) throw new Error('[강화] 없음');
      btn.click();
      for (const a of document.getAnimations()) {
        try { const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
          if (d) { a.currentTime = d * peak; a.pause(); } } catch (_) {}
      }
    }, PEAK_WASH);
    await p.waitForTimeout(120);

    const pre = await geo(p);              /* 찍기 «전» 에 읽는다 — 병의 순서 */
    const imgOn = await shot(p, 'on' + i);
    const post = await geo(p);             /* 찍은 «뒤» 에 읽는다 — probe814c 의 순서 */

    await hideLv(p);
    const imgOff = await shot(p, 'off' + i);

    const padBox = (bx, n) => ({ x: bx.x - n, y: bx.y - n, w: bx.w + 2 * n, h: bx.h + 2 * n });
    const ink = inkMask(imgOn, imgOff, padBox(post.lvBox || post.lv, 8));
    return { pre: pre.lv, post: post.lv, ink: ink.length,
             cvPre: cover(ink, pre.lv), cvPost: cover(ink, post.lv), tfUp: post.tfUp };
  } finally { await b.close(); }
}

(async () => {
  console.log('=== probe974 — 재현: «찍기 전에 읽은 창» 이 찍힌 잉크를 잘라 낸다 ===\n');

  /* §1 */
  const c = census();
  console.log('[1] 인구조사 (정적)');
  console.log('  · tools/*.js                                  ' + c.files.length + '자');
  console.log('  · getBoundingClientRect 를 부르는 자           ' + c.rect.length + '자');
  console.log('  · 그 중 screenshot 도 찍는 자                  ' + c.shot.length + '자');
  console.log('  · **그 중 화소까지 해독하는 자(모집단)**       ' + c.pix.length + '자');
  console.log('    ' + c.pix.join(' · '));
  ok(c.pix.length >= 25 && c.pix.length <= 60,
    '[1a] 모집단이 «자 몇 십» 규모다 — ' + c.pix.length + '자(25~60). 955 가 «rect 를 재는 probe 356자» 를 셌던 것과 달리 '
    + '**화소까지 해독하는 자**로 좁히면 이 크기다 ⇒ 처방을 자마다 심는 길이 처음부터 닫혀 있지는 않다');
  ok(c.pix.includes('probe814c.js') && c.pix.includes('probe814d.js'),
    '[1b] 실물로 밟은 두 자가 모집단 안이다 — probe814c(찍은 뒤 읽기 · 옳다) · probe814d([D0] 의 원형)');
  ok(!c.pix.includes('smoke.js'),
    '[1c] 모집단이 화소를 안 보는 자까지 삼키지 않는다 — smoke.js 제외');

  /* §2 */
  const P = pops();
  P.sort((a, b2) => b2.peak - a.peak);
  console.log('\n[2] 팝·스케일 변형 (정적 · `index.html` @keyframes 중 배율이 1 을 벗어나는 것)');
  console.log('  · ' + P.length + '종 — 봉우리 큰 순 상위 8: '
    + P.slice(0, 8).map((v) => v.name + '(×' + v.peak.toFixed(2) + ')').join(' · '));
  ok(P.some((v) => v.name === 'fxCvSwapS'),
    '[2a] 실물 범인이 목록 안이다 — `fxCvSwapS` 55% 프레임 `scale(1.18)`');
  ok(P.length >= 5,
    '[2b] 위험 호스트는 하나가 아니다 — ' + P.length + '종(≥5). ⇒ 814 한 자리를 고치는 것으로는 안 닫힌다');

  /* §3 */
  console.log('\n[3] 실물 갈림 — 50 코스튬 [강화] 워시 봉우리 · `.sk-clv` (' + RUNS + '연속)');
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await oneRun(i);
    runs.push(r);
    console.log('  r' + (i + 1) + ' · 찍기 전 ' + f1(r.pre.w) + '×' + f1(r.pre.h)
      + ' (잉크 ' + (r.cvPre * 100).toFixed(1) + '% 담음)  ↔  찍은 뒤 ' + f1(r.post.w) + '×' + f1(r.post.h)
      + ' (잉크 ' + (r.cvPost * 100).toFixed(1) + '%)  · 배율 ' + (r.post.w / r.pre.w).toFixed(3)
      + ' · 찍힌 잉크 ' + r.ink + 'px');
  }
  if (runs[0].tfUp && runs[0].tfUp.length)
    console.log('  · 찍은 뒤 조상 변형 — ' + runs[0].tfUp.slice(0, 2).join(' | '));

  const ratio = runs.map((r) => r.post.w / r.pre.w);
  const cvPre = runs.map((r) => r.cvPre), cvPost = runs.map((r) => r.cvPost);
  const spread = (v) => Math.max(...v) - Math.min(...v);

  ok(Math.min(...ratio) >= 1.10,
    '[3a] ★ **같은 프레임인데 두 상자가 갈린다** — 배율 ' + ratio.map((v) => v.toFixed(3)).join(' / ')
    + ' (≥1.10). 팝(`fxCvSwapS` 1.18)이 `renderUI()` 재렌더로 풀리는 탓이고, **애니를 pause() 해도 갈린다**');
  ok(Math.min(...cvPost) >= 0.85,
    '[3b] **찍은 뒤 읽은 창만 찍힌 잉크를 담는다** — ' + cvPost.map((v) => (v * 100).toFixed(1)).join(' / ') + '% ≥ 85%');
  ok(Math.max(...cvPre) <= 0.78,
    '[3c] ★ **찍기 전에 읽은 창은 잉크를 문다** — ' + cvPre.map((v) => (v * 100).toFixed(1)).join(' / ') + '% ≤ 78%. '
    + '잘려 나가는 것이 하필 **글리프 채움(순백)** 이라 대비 자의 분자가 획 가장자리로 내려앉는다');
  ok(spread(ratio) <= 0.02 && spread(cvPre) <= 0.05,
    '[3d] ★ **플레이키가 아니라 결정적 오측이다** — ' + RUNS + '연속 배율 폭 ' + spread(ratio).toFixed(3)
    + ' · 담김 폭 ' + (spread(cvPre) * 100).toFixed(1) + '%p. «3회 돌려 보기» 로는 안 걸린다는 등재문이 이 항이다');
  ok(runs.every((r) => r.ink >= 120 && r.ink <= 4000),
    '[3e] 잉크 마스크가 글자 크기다 — ' + runs.map((r) => r.ink).join('/') + 'px (120~4000). '
    + '0 이면 지우기가 안 먹은 것이고, 그러면 위 담김 비율은 셋 다 무의미하다(814 13회차 [D1] 교훈)');

  console.log('\nPROBE974 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
