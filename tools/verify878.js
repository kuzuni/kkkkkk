/* 작업 878 — 코스튬 [강화] 값 줄 «n/500» 대비: **바 색** 축으로 봉우리 ≥3.5 를 여유로 넘긴다.
 *
 * 814(8~11회차)가 워시 세기(`--flash-k` .70)·잉크 들기(`--flash-keep`)로 봉우리를
 * 2.30~2.63 → 3.59 로 올렸지만 목표 ≥3.5 에 여유가 **0.09** 뿐이었고, 814 가 «무연출 바 색
 * (122,126,157) 자체가 천장 3.73~3.92 라 4.5 는 구조적으로 못 넘는다 — 바 색을 바꾸는 별도 행»
 * 으로 넘긴 자리다(814 §4-8-1). 878 은 그 남은 손잡이 하나 — 두 스톱을 f≈.87 로 눌러
 * (top #8182A0→#70718B · bot #6E7798→#5F6784) 무연출 대비를 4.42 → ~5.6, 봉우리를 3.59 → ~4.2 로
 * 올린다.
 *
 * ── 계측 정의(probe814c 와 같은 자 · A1 10회차 «정의가 다르면 일치해도 틀린다») ──
 *   대비비 = 값 줄 잉크 상자 안에서 (휘도 상위1% + .05) ÷ (중앙값 + .05) · WCAG 상대휘도.
 *   봉우리 = `@keyframes fxFlash` 52%(워시가 값 줄을 덮는 «면적 × 알파» 최대).
 *   ⚠ «최대÷최소» 는 검은 외곽선 탓에 어느 판에서나 21.00 이라 못 쓴다(probe814c 머리말).
 *
 * ── 되돌림 시험 ──
 *   [R] 바를 옛 공용 색(#8182A0/#6E7798)으로 되돌리면 봉우리가 814 마감값(3.59)으로 내려가
 *       [C2] 여유선(≥3.80)을 잃는다 — 814 의 두 손잡이(`--flash-*`)만으로도 3.5 는 «겨우» 넘으므로
 *       878 이 산 것은 «3.5 를 넘는 것» 이 아니라 «흔들림을 견디는 여유» 이고, 그 여유를 지탱하는
 *       게 «바 색» 임을 이 항이 못박는다. 안 내려가면 헛게이트다(863·338 계보).
 *   [B] 공용 `.sk-bar` 원본 규칙은 안 건드렸다 — 스킬(#bSk)·펫(#bPet) 바는 그대로다.
 *
 * 실행: node tools/verify878.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'verify878-'));
const PEAK = 0.52;

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const f1 = (n) => (n === null || n === undefined ? '—' : n.toFixed(2));

/* 연출 노드 수거 무력화 (probe814c 와 같은 것) */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

const srgb = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

function ratio(img, box) {
  const v = [];
  const x0 = Math.max(0, Math.round(box.x) + 1), x1 = Math.min(img.width, Math.round(box.x + box.w) - 1);
  const y0 = Math.max(0, Math.round(box.y) + 1), y1 = Math.min(img.height, Math.round(box.y + box.h) - 1);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * 4;
    v.push(L(img.data[i], img.data[i + 1], img.data[i + 2]));
  }
  if (!v.length) return null;
  v.sort((a, b) => a - b);
  const at = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
  const fg = at(0.99), bg = at(0.50);
  return { r: (fg + 0.05) / (bg + 0.05), fg, bg, n: v.length };
}

async function boxes(p) {
  return await p.evaluate(() => {
    const card = document.querySelector('#bCos .sk-card.sel');
    if (!card) return null;
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
    return { lv: ink(card.querySelector('.sk-clv')), bar: ink(card.querySelector('.sk-bar>b')),
             barTxt: (card.querySelector('.sk-bar>b') || {}).textContent };
  });
}

async function shotPeak(p, tag) {
  await p.evaluate((peak) => {
    const btn = document.querySelector('#bCos [data-cosup]'); if (!btn) throw new Error('[강화] 없음');
    btn.click();
    for (const a of document.getAnimations()) {
      try { const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
        if (d) { a.currentTime = d * peak; a.pause(); } } catch (_) {}
    }
  }, PEAK);
  await p.waitForTimeout(120);
  const f = path.join(TMP, tag + '.png');
  await p.screenshot({ path: f });
  return PNG.sync.read(fs.readFileSync(f));
}

/* injectCss 가 있으면 부팅 뒤·측정 전에 얹는다(되돌림 시험용) */
async function measure(tag, injectCss) {
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
    const md = document.querySelector('#modal');
    return !!(md && md.offsetParent !== null);
  });
  if (opened) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  if (injectCss) await p.addStyleTag({ content: injectCss });
  await p.waitForTimeout(250);
  const pre = await boxes(p);
  const stillF = path.join(TMP, tag + '-still.png'); await p.screenshot({ path: stillF });
  const still = PNG.sync.read(fs.readFileSync(stillF));
  const img = await shotPeak(p, tag);
  const post = await boxes(p);
  await b.close();
  return { pre, post, still, img, errs };
}

(async () => {
  console.log('=== verify878 — «n/500» 바 색 축(찍힌 픽셀) ===');
  console.log('정의: 대비비 = (잉크 상자 상위1% L + .05) ÷ (중앙값 L + .05) · 봉우리 = fxFlash 52%\n');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  /* [A] #bCos 로 가둔 어두운 바가 선언돼 있다 */
  const scoped = /#bCos\s+\.sk-bar\s*\{[^}]*background\s*:\s*linear-gradient\(180deg,\s*#70718B\s+0\s+21px,\s*#5F6784\s+22px\)/i.test(html);
  ok(scoped, '[A] #bCos .sk-bar 가 어두운 두 스톱(#70718B/#5F6784)으로 선언됐다');

  /* [B] 공용 원본 규칙은 옛 색 그대로 — 스킬·펫 바는 안 건드렸다 */
  const baseKept = /\.sk-bar\s*\{[^}]*background\s*:\s*linear-gradient\(180deg,\s*#8182A0\s+0\s+21px,\s*#6E7798\s+22px\)/i.test(html);
  ok(baseKept, '[B] 공용 .sk-bar 원본(#8182A0/#6E7798)은 무변경 — #bSk·#bPet 바 그대로');

  /* [C][D][E] 지금 판 측정 */
  const cur = await measure('cur', null);
  if (!cur.pre || !cur.pre.bar || !cur.pre.lv) { console.log('  ✗ 값 줄 상자를 못 잡았다'); process.exit(1); }
  const sBar = ratio(cur.still, cur.pre.bar), pBar = ratio(cur.img, cur.post.bar);
  const sLv = ratio(cur.still, cur.pre.lv), pLv = ratio(cur.img, cur.post.lv);
  console.log('[1] 지금 판 — «' + cur.pre.barTxt + '» 정지 ' + f1(sBar.r) + ':1 → 봉우리 ' + f1(pBar.r) + ':1');

  ok(pBar.r >= 3.5, '[C] ★ «n/500» 봉우리가 목표 ≥3.5 를 넘는다 — ' + f1(pBar.r) + ':1 (814 마감 3.59 · 여유 ' + (pBar.r - 3.5).toFixed(2) + ')');
  ok(pBar.r >= 3.5 + 0.3, '[C2] 봉우리 여유가 실측 흔들림(±0.15)·DPR 뽑기를 견딘다 — ' + f1(pBar.r) + ' ≥ 3.80');
  ok(sBar.r >= 4.5, '[D] ★ 무연출 «n/500» 이 4.5 를 넘는다 — ' + f1(sBar.r) + ':1 (814 가 «구조적 불가» 로 넘긴 그 4.5)');
  ok(pLv.r >= 3.0, '[E] «Lv. n» 봉우리가 회귀 안 했다 — ' + f1(pLv.r) + ':1 (≥3.0)');
  console.log('  · (참고) 무연출 Lv ' + f1(sLv.r) + ' → 봉우리 ' + f1(pLv.r));

  /* [R] 되돌림 — 옛 공용 색을 #bCos 에 도로 얹으면 봉우리가 3.5 밑으로 */
  const REVERT = '#bCos .sk-bar{background:linear-gradient(180deg,#8182A0 0 21px,#6E7798 22px)!important}';
  const rev = await measure('rev', REVERT);
  const rBar = ratio(rev.img, rev.post.bar);
  console.log('[2] 되돌림 판 — 옛 색 재주입 시 «n/500» 봉우리 ' + f1(rBar.r) + ':1 (814 마감값)');
  ok(pBar.r - rBar.r >= 0.4 && rBar.r < 3.80,
    '[R] ★ 바를 옛 공용 색으로 되돌리면 봉우리가 ' + f1(rBar.r) + ' 로 내려간다 (지금 ' + f1(pBar.r)
    + ' · Δ' + (pBar.r - rBar.r).toFixed(2) + ' ≥0.40 · [C2] 여유선 3.80 밑) — 이 여유를 지탱하는 게 «바 색» 이다');

  /* [H] 콘솔 에러 0건 */
  ok(cur.errs.length === 0 && rev.errs.length === 0, '[H] 콘솔·페이지 에러 0건 — ' + (cur.errs.length + rev.errs.length) + '건');

  console.log('\nVERIFY878 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  process.exit(fail ? 1 : 0);
})();
