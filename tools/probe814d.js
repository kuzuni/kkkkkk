/* 작업 814 — 13회차 «세 번째 자» : «Lv. n» 열창의 갈림을 닫는다 (§4-13-5 1순위)
 *
 * ── 무엇이 갈렸나 ────────────────────────────────────────────────────────
 * 12회차 채점자 ED 와 `probe814c` 가 **같은 프레임의 같은 글자**를 재고 값이 갈렸다:
 *     ED   `279..342 × 169..189`(cap814 크롭 좌표 = 카드기준 x 53..116 · y 19..39) → **3.09:1**
 *     내 자 `.sk-clv` **Range 잉크 bbox** − keep-out 판때기                       → **5.08:1**
 * 두 값 다 «상위1% ÷ 중앙값» 이라는 **같은 정의**로 나왔다. 그러면 갈리는 것은 정의가 아니라
 * **열창(어느 픽셀을 표본으로 세는가)** 뿐이고, 이 자는 그 축을 없앤다.
 *
 * ── 왜 세 번째 자가 «분위수 자» 를 심판할 수 있나 ────────────────────────
 * 분위수 자의 값은 상자 안 **잉크:면 비율**이 정한다. 상자를 글자에 바짝 붙이면 표본의 절반이
 * 잉크가 되어 **중앙값이 면이 아니라 글리프 안**으로 들어가고(분모↑ ⇒ 비↓), 상자를 넓히면
 * 이웃 밝은 부품이 상위1%를 물어 분자를 고정한다(비↑). **둘 다 «글자 ↔ 그 글자가 앉은 면» 이
 * 아니다.** ⇒ 이 자는 상자를 고르지 않는다 — **소속을 DOM 으로 읽는다**:
 *   · **잉크 마스크** = 같은 판(애니 정지) 에서 그 값 줄(원본 + `--flash-keep` 사본)만
 *     `visibility:hidden` 으로 지우고 두 장을 차분한 픽셀. 레이아웃·입자·워시가 전부 그대로라
 *     차분에 남는 것은 **그 글자가 칠한 픽셀뿐**이다(획 + 외곽선 + AA).
 *   · **분자** = 잉크 마스크 안 상위 1% L (글리프 채움)
 *   · **분모** = **잉크를 지운 판**에서, 그 값 줄의 **레이아웃 상자** 안 «잉크였던 자리» L 의 중앙값
 *     = 글자가 실제로 **앉아 있는 면**(글자가 없었으면 거기 있었을 면. 옆면이 아니다)
 * 열창 크기가 값에 안 들어간다 — 상자를 넓혀도 «잉크였던 자리» 는 그대로다.
 *
 * ── 판정 ────────────────────────────────────────────────────────────────
 * 세 번째 자의 값이 A(5.08)와 B(3.09) 중 어느 쪽에 붙는가로 갈린다. 이 자는 **그 판정을 하고,
 * 갈린 이유(각 열창의 잉크 비율 · 중앙값이 잉크 안에 들어갔는가)를 같이 찍는다.**
 *
 * 실행: node tools/probe814d.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe814d-'));
const PEAK_WASH = 0.0001;   /* 워시 봉우리(0%) — 12회차가 «최악» 으로 못박은 자리 */

/* ED 의 열창(cap814 크롭 좌표) — 크롭 원점은 `clipOf()` = (sel.x − 226, sel.y − 150) */
const ED_CROP = { x0: 279, x1: 342, y0: 169, y1: 189 };
const CROP_OX = 226, CROP_OY = 150;

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const f2 = (n) => (n === null || n === undefined ? '—' : n.toFixed(2));
const f3 = (n) => (n === null || n === undefined ? '—' : n.toFixed(3));

/* 연출 노드 수거 무력화 — probe814c 와 같은 것(9·10회차가 여기서 두 번 미끄러졌다: `.fx-keep` 는
   걷히게 두고 `#fxl` 자식만 지킨다) */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

const srgb = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const lumAt = (img, x, y) => { const i = (y * img.width + x) * 4; return L(img.data[i], img.data[i + 1], img.data[i + 2]); };
const q = (v, t) => v[Math.min(v.length - 1, Math.max(0, Math.round(t * (v.length - 1))))];

/* ── 분위수 자(= probe814c 의 것) — 심판 대상이지 심판이 아니다 ── */
function quantile(img, box, skip) {
  const x0 = Math.max(0, Math.round(box.x) + 1), x1 = Math.min(img.width, Math.round(box.x + box.w) - 1);
  const y0 = Math.max(0, Math.round(box.y) + 1), y1 = Math.min(img.height, Math.round(box.y + box.h) - 1);
  const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
  const near = (skip || []).filter((s) => {
    const ow = Math.min(x1, s.x + s.w) - Math.max(x0, s.x);
    const oh = Math.min(y1, s.y + s.h) - Math.max(y0, s.y);
    return ow > 0 && oh > 0 && (ow * oh) / (bw * bh) < 0.5;
  });
  const hit = (x, y) => near.some((s) => x >= s.x - 1 && x <= s.x + s.w + 1 && y >= s.y - 1 && y <= s.y + s.h + 1);
  const v = [], px = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (hit(x, y)) continue;
    v.push(lumAt(img, x, y)); px.push([x, y]);
  }
  if (!v.length) return null;
  const idx = v.map((val, i) => i).sort((a, b) => v[a] - v[b]);
  const sorted = idx.map((i) => v[i]);
  const midPx = px[idx[Math.round(0.5 * (idx.length - 1))]];
  return { r: (q(sorted, 0.99) + 0.05) / (q(sorted, 0.50) + 0.05),
           fg: q(sorted, 0.99), bg: q(sorted, 0.50), n: v.length, midPx };
}

async function boot() {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
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
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;   /* 7~12회차와 같은 표본 */
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  const opened = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' }); el.click();
    const md = document.querySelector('#modal');
    return !!(md && md.offsetParent !== null);
  });
  if (opened) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  await p.waitForTimeout(250);
  return { b, p, errs };
}

/* 값 줄의 세 상자를 화면 좌표로 — ① Range 잉크 bbox(내 자) ② 레이아웃 상자(세 번째 자의 면 창)
   ③ 카드 상자(ED 열창을 되짚는 원점) */
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
    const L2 = document.getElementById('fxl');
    const skip = (L2 ? [...L2.querySelectorAll('.fx-keep')] : [])
      .filter((k) => !(k.textContent || '').trim())
      .map((k) => rect(k.getBoundingClientRect()))
      .filter((r) => r.w && r.h);
    const lvEl = card.querySelector('.sk-clv'), barEl = card.querySelector('.sk-bar>b');
    return {
      card: rect(card.getBoundingClientRect()),
      lv: ink(lvEl), bar: ink(barEl),
      lvBox: lvEl ? rect(lvEl.getBoundingClientRect()) : null,
      barBox: barEl ? rect(barEl.getBoundingClientRect()) : null,
      lvTxt: (lvEl || {}).textContent, barTxt: (barEl || {}).textContent,
      skip
    };
  });
}

/* 그 값 줄만 지운다 — 원본 + `--flash-keep` 사본(#fxl). `visibility` 라 **레이아웃이 안 움직인다**.
   애니는 이미 정지돼 있으므로 지운 판은 잉크만 빠진 같은 프레임이다. */
/* ⚠ **사본은 값마다 한 벌씩 쌓인다** — FREEZE 가 `#fxl` 수거를 막으므로 «Lv. 12» 사본과
   «Lv. 13» 사본이 **같은 자리에 겹쳐** 남는다(실측 6장: Lv.12 · 배지 · 12/500 · Lv.13 · 배지 · 13/500).
   글자로 짝지으면 옛 사본이 안 지워져 차분에 **바뀐 자릿수만** 남는다(첫 실행 90px = 그 함정).
   ⇒ 짝짓기는 **글자가 아니라 자리**로 한다 — 사본 면적의 절반 이상이 원본 상자와 겹치면 그 줄의 사본이다. */
async function hideLine(p, which) {
  return await p.evaluate((w) => {
    const card = document.querySelector('#bCos .sk-card.sel');
    const el = w === 'lv' ? card.querySelector('.sk-clv') : card.querySelector('.sk-bar>b');
    const kind = w === 'lv' ? /^Lv\./ : /^\d+\s*\/\s*\d+$/;
    const nodes = [el];
    const L2 = document.getElementById('fxl');
    if (L2) for (const k of L2.querySelectorAll('.fx-keep')) {
      const s = (k.textContent || '').replace(/\s+/g, ' ').trim();
      if (!s || !kind.test(s)) continue;   /* 글자 없는 배지 판때기·다른 줄의 사본은 그 줄이 아니다 */
      nodes.push(k);
    }
    /* ⚠ 사본은 `cloneNode` 뒤에 **계산값 전부를 인라인으로** 베껴 붙는다(index.html ~45026) —
       그래서 `visibility:visible` 이 자식에 인라인으로 박혀 있고, 껍데기만 숨기면 **글자는 그대로 남는다**.
       (첫 실행에서 잉크가 90px 로 나온 두 번째 이유다.) ⇒ 자손까지 `!important` 로 내린다. */
    for (const n of nodes) {
      n.style.setProperty('visibility', 'hidden', 'important');
      for (const d of n.querySelectorAll('*')) d.style.setProperty('visibility', 'hidden', 'important');
    }
    return nodes.length;
  }, which);
}
async function showAll(p) {
  await p.evaluate(() => {
    const card = document.querySelector('#bCos .sk-card.sel');
    const clr = (n) => { if (!n) return; n.style.removeProperty('visibility');
                         for (const d of n.querySelectorAll('*')) d.style.removeProperty('visibility'); };
    clr(card.querySelector('.sk-clv')); clr(card.querySelector('.sk-bar>b'));
    const L2 = document.getElementById('fxl');
    if (L2) for (const k of L2.querySelectorAll('.fx-keep')) clr(k);
  });
}

const shot = async (p, tag) => {
  const f = path.join(TMP, tag + '.png');
  await p.screenshot({ path: f });
  return PNG.sync.read(fs.readFileSync(f));
};

/* 잉크 마스크 — 두 판의 채널 차분. AA 꼬리까지 잡되 압축 잡음은 안 잡는 문턱(PNG 무손실이라 0 이 정석이나
   합성 반올림 1 을 허용한다). */
function inkMask(a, b2, box) {
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(a.width, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(a.height, Math.ceil(box.y + box.h));
  const on = [], off = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.width + x) * 4;
    const d = Math.abs(a.data[i] - b2.data[i]) + Math.abs(a.data[i + 1] - b2.data[i + 1]) + Math.abs(a.data[i + 2] - b2.data[i + 2]);
    if (d > 3) on.push([x, y]); else off.push([x, y]);
  }
  return { on, off, box: { x0, x1, y0, y1 } };
}

/* 세 번째 자 — 소속으로 가른 대비.
   분자 = 잉크 픽셀(있는 판)의 상위1% · 분모 = **그 잉크가 앉은 자리**(없는 판의 같은 픽셀)의 중앙값 */
function belong(imgOn, imgOff, mask) {
  if (mask.on.length < 20) return null;
  const fgv = mask.on.map(([x, y]) => lumAt(imgOn, x, y)).sort((a, b) => a - b);
  const bgv = mask.on.map(([x, y]) => lumAt(imgOff, x, y)).sort((a, b) => a - b);
  return { r: (q(fgv, 0.99) + 0.05) / (q(bgv, 0.50) + 0.05),
           fg: q(fgv, 0.99), bg: q(bgv, 0.50), n: mask.on.length };
}

/* 어떤 열창의 «중앙값 픽셀» 이 잉크 안에 들어갔는가 — 분위수 자가 갈리는 기계를 그대로 찍는다 */
function inkShare(mask, box) {
  const x0 = Math.round(box.x) + 1, x1 = Math.round(box.x + box.w) - 1;
  const y0 = Math.round(box.y) + 1, y1 = Math.round(box.y + box.h) - 1;
  const set = new Set(mask.on.map(([x, y]) => x + ',' + y));
  let ink = 0, tot = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { tot++; if (set.has(x + ',' + y)) ink++; }
  return { ink, tot, share: tot ? ink / tot : 0, set };
}

(async () => {
  console.log('=== probe814d — 세 번째 자: «소속으로 가른 대비» (13회차 · §4-13-5 1순위) ===');
  console.log('정의: 분자 = **잉크 픽셀**(그 값 줄이 칠한 픽셀) 상위1% L · 분모 = **그 잉크가 앉은 자리**의 중앙값 L');
  console.log('      잉크 소속은 같은 판에서 그 줄만 `visibility:hidden` 으로 지운 차분이 정한다 — 열창 크기가 값에 안 들어간다\n');

  const { b, p, errs } = await boot();
  const pre = await geo(p);
  if (!pre || !pre.lv || !pre.bar) { console.log('  ✗ 값 줄 상자를 못 잡았다'); process.exit(1); }

  /* 워시 봉우리 한 장 — probe814c 와 같은 프레임 */
  await p.evaluate((peak) => {
    const btn = document.querySelector('#bCos [data-cosup]'); if (!btn) throw new Error('[강화] 없음');
    btn.click();
    for (const a of document.getAnimations()) {
      try { const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
        if (d) { a.currentTime = d * peak; a.pause(); } } catch (_) {}
    }
  }, PEAK_WASH);
  await p.waitForTimeout(120);
  /* ⚑⚑ **상자를 «찍기 전» 과 «찍은 뒤» 둘 다 읽는다 — 이 자가 첫 실행에 미끄러진 자리다.**
     애니를 정지시켜도 이 호스트는 `renderUI()` 가 격자를 통째로 갈아 끼우고(840 머리말)
     `.sk-clv` 의 팝(`fxCvSwap`)이 조상 변형으로 걸려 있어, **Range bbox 를 언제 읽느냐**에 따라
     55.3×21.8(변형 풀림) ↔ 65.9×26.0(×1.19)로 갈린다. 그 갈림 하나로 같은 프레임이
     **3.19:1 ↔ 5.08:1** 로 읽힌다(첫 실행이 낸 3.19 가 그것이다).
     ⇒ 어느 쪽이 옳은지는 취향이 아니라 **찍힌 잉크**가 정한다 — 아래 [D0]. */
  const pre2 = await geo(p);
  const imgOn = await shot(p, 'on');
  const post = await geo(p);   /* probe814c 와 같은 순서(찍은 뒤) */

  const nHidLv = await hideLine(p, 'lv');
  const imgLvOff = await shot(p, 'lv-off');
  await showAll(p);
  const nHidBar = await hideLine(p, 'bar');
  const imgBarOff = await shot(p, 'bar-off');
  await showAll(p);

  /* 열창 셋 — 카드 원점에서 ED 상자를 되짚는다 */
  const c = post.card;
  const edBox = { x: c.x - CROP_OX + ED_CROP.x0, y: c.y - CROP_OY + ED_CROP.y0,
                  w: ED_CROP.x1 - ED_CROP.x0, h: ED_CROP.y1 - ED_CROP.y0 };

  console.log('[0] 판·상자');
  console.log('  · 값 줄 «' + String(pre.lvTxt).trim() + '» → «' + String(post.lvTxt).trim() + '» · 바 «' + String(post.barTxt).trim() + '»');
  console.log('  · 카드 화면좌표 x' + c.x.toFixed(1) + ' y' + c.y.toFixed(1) + ' ' + c.w.toFixed(0) + '×' + c.h.toFixed(0));
  console.log('  · ED 열창(크롭 279..342 × 169..189) ⇒ 카드기준 x' + (edBox.x - c.x).toFixed(1) + '..' + (edBox.x + edBox.w - c.x).toFixed(1)
    + ' · y' + (edBox.y - c.y).toFixed(1) + '..' + (edBox.y + edBox.h - c.y).toFixed(1));
  console.log('  · 내 열창(Range 잉크 bbox) ⇒ 카드기준 x' + (post.lv.x - c.x).toFixed(1) + '..' + (post.lv.x + post.lv.w - c.x).toFixed(1)
    + ' · y' + (post.lv.y - c.y).toFixed(1) + '..' + (post.lv.y + post.lv.h - c.y).toFixed(1));
  console.log('  · 지운 노드 «Lv. n» ' + nHidLv + '개 · «n/500» ' + nHidBar + '개 (원본 + `--flash-keep` 사본 — 자리로 짝지었다)');
  /* 두 열창이 keep-out 판때기를 어떻게 무는가 — 분위수 자가 갈리는 두 번째 기계(제외 문턱 0.5) */
  const frac = (bx) => (post.skip || []).map((s) => {
    const ow = Math.min(bx.x + bx.w, s.x + s.w) - Math.max(bx.x, s.x);
    const oh = Math.min(bx.y + bx.h, s.y + s.h) - Math.max(bx.y, s.y);
    return (ow > 0 && oh > 0) ? (ow * oh) / (bx.w * bx.h) : 0;
  });
  console.log('  · keep-out 판때기 ' + (post.skip || []).length + '개 · 열창을 무는 비율 — A ['
    + frac(post.lv).map((v) => v.toFixed(3)).join(', ') + '] · B [' + frac(edBox).map((v) => v.toFixed(3)).join(', ')
    + '] (0.5 이상이면 «면» 으로 보고 **안 뺀다** — `ratio()` 규약)');

  /* 마스크는 **레이아웃 상자를 넉넉히 감싼 창**에서 뜬다(잉크가 상자 밖 AA 로 새는 것까지) */
  const pad = (bx, n) => ({ x: bx.x - n, y: bx.y - n, w: bx.w + 2 * n, h: bx.h + 2 * n });
  const mLv = inkMask(imgOn, imgLvOff, pad(post.lvBox || post.lv, 6));
  const mBar = inkMask(imgOn, imgBarOff, pad(post.barBox || post.bar, 6));

  console.log('\n[1] 잉크 마스크 (차분으로 뜬 «그 글자가 칠한 픽셀»)');
  console.log('  · «Lv. n» 잉크 ' + mLv.on.length + 'px / 창 ' + (mLv.on.length + mLv.off.length) + 'px'
    + ' · «n/500» 잉크 ' + mBar.on.length + 'px / 창 ' + (mBar.on.length + mBar.off.length) + 'px');
  ok(mLv.on.length >= 120 && mLv.on.length <= 4000,
    '[D1] «Lv. n» 잉크 마스크가 글자 크기다 — ' + mLv.on.length + 'px (120~4000). 0 이면 지우기가 안 먹은 것이고, 창을 다 덮으면 워시까지 지운 것이다');
  ok(mBar.on.length >= 120 && mBar.on.length <= 4000,
    '[D2] «n/500» 잉크 마스크가 글자 크기다 — ' + mBar.on.length + 'px (120~4000)');

  /* 마스크가 **찍힌 잉크의 진짜 상자**다 — Range bbox 가 그것을 담고 있는가(담아야 분자가 안 잘린다) */
  const mbox = mLv.on.reduce((a, [x, y]) => ({ x0: Math.min(a.x0, x), x1: Math.max(a.x1, x),
                                               y0: Math.min(a.y0, y), y1: Math.max(a.y1, y) }),
                             { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
  console.log('  · 찍힌 잉크 bbox(카드기준) x' + (mbox.x0 - c.x).toFixed(1) + '..' + (mbox.x1 - c.x).toFixed(1)
    + ' · y' + (mbox.y0 - c.y).toFixed(1) + '..' + (mbox.y1 - c.y).toFixed(1)
    + ' ↔ Range bbox x' + (post.lv.x - c.x).toFixed(1) + '..' + (post.lv.x + post.lv.w - c.x).toFixed(1));
  /* 열창이 «찍힌 잉크» 를 얼마나 담는가 — 분위수 자의 창은 이것으로 옳고 그름이 갈린다
     (담아야 분자가 글리프 채움이고, 물면 분자가 획 가장자리로 내려앉는다) */
  const cover = (bx) => {
    if (!bx) return 0;
    const x0 = Math.round(bx.x) + 1, x1 = Math.round(bx.x + bx.w) - 1;
    const y0 = Math.round(bx.y) + 1, y1 = Math.round(bx.y + bx.h) - 1;
    let n = 0; for (const [x, y] of mLv.on) if (x >= x0 && x < x1 && y >= y0 && y < y1) n++;
    return n / mLv.on.length;
  };
  const cvPost = cover(post.lv), cvPre = cover(pre2.lv), cvEd = cover(edBox);
  const qPre = pre2.lv ? quantile(imgOn, pre2.lv, post.skip) : null;
  console.log('  · Range bbox — 찍기 «전» ' + (pre2.lv ? pre2.lv.w.toFixed(1) + '×' + pre2.lv.h.toFixed(1) : '—')
    + ' (잉크 ' + (cvPre * 100).toFixed(1) + '% 담음 · 그 창으로 재면 ' + f2(qPre && qPre.r) + ':1) ↔ 찍은 «뒤» '
    + post.lv.w.toFixed(1) + '×' + post.lv.h.toFixed(1) + ' (잉크 ' + (cvPost * 100).toFixed(1) + '% · ED 창 ' + (cvEd * 100).toFixed(1) + '%)');
  /* ⚠ 문턱을 실측(90.3% ↔ 67.5%)에 붙이지 않는다 — 붙이면 574·709·825 계보의 «문턱에 붙은 자» 가 된다.
     가르는 것은 «담는다 ↔ 문다» 이므로 두 값 사이를 넉넉히 가르는 자리(85% / 78%)에 세운다. */
  ok(cvPost >= 0.85 && cvPre <= 0.78,
    '[D0] ★ **찍은 뒤 읽은 상자만 찍힌 잉크를 담는다** — 뒤 ' + (cvPost * 100).toFixed(1) + '% ≥ 85% · 전 '
    + (cvPre * 100).toFixed(1) + '% ≤ 78%. 팝 변형(×1.19)이 재렌더로 풀리는 탓이고, 그래서 «찍기 전» 창은 '
    + f2(qPre && qPre.r) + ':1 로 **분자(순백 글리프)를 잘라 낸다**. probe814c 의 «찍은 뒤 읽기» 순서가 옳다');

  const bLv = belong(imgOn, imgLvOff, mLv), bBar = belong(imgOn, imgBarOff, mBar);

  /* 심판 대상 둘 — 같은 판에서 같은 정의(상위1%÷중앙값)로, 열창만 바꾼다 */
  const A = quantile(imgOn, post.lv, post.skip);      /* 내 자(probe814c) */
  const B = quantile(imgOn, edBox, post.skip);        /* ED 자 */
  const shA = inkShare(mLv, post.lv), shB = inkShare(mLv, edBox);

  console.log('\n[2] 갈린 두 열창을 같은 판에서 나란히');
  console.log('  · A 내 자(Range bbox)  ' + f2(A.r) + ':1  (상위1% ' + f3(A.fg) + ' ÷ 중앙값 ' + f3(A.bg) + ' · 표본 ' + A.n + 'px · 잉크 비율 ' + (shA.share * 100).toFixed(1) + '%)');
  console.log('  · B ED 자(279..342×169..189) ' + f2(B.r) + ':1  (상위1% ' + f3(B.fg) + ' ÷ 중앙값 ' + f3(B.bg) + ' · 표본 ' + B.n + 'px · 잉크 비율 ' + (shB.share * 100).toFixed(1) + '%)');
  const midInA = shA.set.has(A.midPx[0] + ',' + A.midPx[1]);
  const midInB = shB.set.has(B.midPx[0] + ',' + B.midPx[1]);
  console.log('  · **중앙값 픽셀이 잉크 안인가** — A ' + (midInA ? '예(오염)' : '아니오(면)') + ' · B ' + (midInB ? '예(오염)' : '아니오(면)'));

  console.log('\n[3] 세 번째 자 (소속으로 가른 대비)');
  console.log('  · «Lv. n»  ' + f2(bLv.r) + ':1  (잉크 상위1% ' + f3(bLv.fg) + ' ÷ **그 자리의 면** 중앙값 ' + f3(bLv.bg) + ' · 잉크 ' + bLv.n + 'px)');
  console.log('  · «n/500»  ' + f2(bBar.r) + ':1  (잉크 상위1% ' + f3(bBar.fg) + ' ÷ 면 중앙값 ' + f3(bBar.bg) + ' · 잉크 ' + bBar.n + 'px)');

  ok(bLv && bBar, '[D3] 세 번째 자가 두 값 줄을 다 쟀다 — «Lv. n» ' + f2(bLv && bLv.r) + ':1 · «n/500» ' + f2(bBar && bBar.r) + ':1');

  /* ── 판정 ── */
  const dA = Math.abs(bLv.r - A.r), dB = Math.abs(bLv.r - B.r);
  const side = dA < dB ? 'A(내 자)' : 'B(ED 자)';
  console.log('\n[4] 판정 — 세 번째 자는 ' + side + ' 쪽이다 (|C−A| ' + f2(dA) + ' ↔ |C−B| ' + f2(dB) + ')');
  ok(dA !== dB, '[D4] ★ 갈림이 닫혔다 — 세 번째 자 ' + f2(bLv.r) + ':1 는 **' + side + '** 에 붙는다 (A ' + f2(A.r) + ' · B ' + f2(B.r) + ' · |C−A| ' + f2(dA) + ' ↔ |C−B| ' + f2(dB) + ')');

  /* ⚑ ED 가 «빼야 한다» 고 지목한 **순백 픽셀의 소속**을 묻는다 — 이것이 이 회차의 결정타다.
     ED 는 «순백 keep-out 판때기가 p99 를 1.000 에 고정한다» 며 그 픽셀을 빼고 3.09 를 냈다.
     그런데 이 값 줄은 흰 글자다 — **글리프 채움 자체가 순백**이면 그 픽셀은 판때기가 아니라 잉크이고,
     빼는 순간 «글자를 지우고 글자의 대비를 재는» 것이 된다. 잉크 마스크가 그 소속을 판정한다. */
  const set = new Set(mLv.on.map(([x, y]) => x + ',' + y));
  const wb = { x0: Math.round(edBox.x) + 1, x1: Math.round(edBox.x + edBox.w) - 1,
               y0: Math.round(edBox.y) + 1, y1: Math.round(edBox.y + edBox.h) - 1 };
  let whT = 0, whInk = 0;
  for (let y = wb.y0; y < wb.y1; y++) for (let x = wb.x0; x < wb.x1; x++) {
    if (lumAt(imgOn, x, y) < 0.99) continue;
    whT++; if (set.has(x + ',' + y)) whInk++;
  }
  const whShare = whT ? whInk / whT : 0;
  console.log('\n[5] ED 가 «빼라» 고 한 순백 픽셀의 소속 — ED 열창 안 L≥0.99 픽셀 ' + whT + '개 중 **잉크** ' + whInk + '개 ('
    + (whShare * 100).toFixed(1) + '%)');
  ok(whT > 0 && whShare >= 0.9,
    '[D5] ★ 그 순백은 **판때기가 아니라 글자다** — ED 열창 안 순백 ' + whT + 'px 중 ' + whInk + 'px('
    + (whShare * 100).toFixed(1) + '%)가 «그 줄을 지우면 사라지는» 픽셀이다. 빼면 **글리프 채움을 지우고 그 글자의 대비를 재는** 것이 된다(분자 붕괴)');
  ok(bLv.fg >= 0.99,
    '[D6] ★ 그래서 분자는 워시 밑에서도 **순백이 맞다** — 잉크 상위1% L ' + f3(bLv.fg)
    + ' (≥0.99). 8회차 `--flash-keep` 이 «잉크만 워시 위로» 올린 결과이고 [P3](글리프 채움 Δ0.000)와 같은 말이다');

  /* ── §R 되돌림 — 이 자가 «열창 무관» 이라는 주장 자체를 시험한다 ── */
  console.log('\n§R 되돌림 — 열창을 바꿔도 세 번째 자가 안 움직이는가 (움직이면 이 자도 열창 자다)');
  const wide = belong(imgOn, imgLvOff, inkMask(imgOn, imgLvOff, pad(post.lvBox || post.lv, 20)));
  const tight = belong(imgOn, imgLvOff, inkMask(imgOn, imgLvOff, pad(post.lv, 1)));
  console.log('  · 창 +20px ' + f2(wide.r) + ':1 (잉크 ' + wide.n + 'px) · 창 +1px ' + f2(tight.r) + ':1 (잉크 ' + tight.n + 'px)');
  ok(Math.abs(wide.r - tight.r) <= 0.15,
    '[R-a] ★ 창을 20배 넓혀도 값이 같다 — Δ' + f2(Math.abs(wide.r - tight.r)) + ' ≤ 0.15. 열창이 값에 안 들어간다(그래서 심판이 될 수 있다)');
  const qWide = quantile(imgOn, pad(post.lv, 20), post.skip), qTight = quantile(imgOn, pad(post.lv, 1), post.skip);
  console.log('  · (대조) 분위수 자는 같은 두 창에서 ' + f2(qWide.r) + ':1 ↔ ' + f2(qTight.r) + ':1');
  ok(Math.abs(qWide.r - qTight.r) > Math.abs(wide.r - tight.r),
    '[R-b] ★ 같은 두 창에서 **분위수 자는 흔들린다** — Δ' + f2(Math.abs(qWide.r - qTight.r))
    + ' > 세 번째 자 Δ' + f2(Math.abs(wide.r - tight.r)) + '. 열창 의존이 실재한다는 양성 대조다');

  ok(!errs.length, '[D7] 콘솔 에러 0건 — ' + (errs.length ? errs[0] : '없음'));

  await b.close();
  console.log('\nPROBE814D ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
