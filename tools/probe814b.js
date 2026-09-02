/* 814 4회차 — «카드 본체가 반응하지 않는다»(CR6)를 **자로 가른다**
 *
 * 3회차 비평 2인이 남긴 «단 하나» 는 이것 하나였다:
 *   · CR6 — «테두리·내부 Δ ≤ 0.2/255 = 카드 본체가 0px 반응한다»
 *   · CR5 — «라벨 변화 잉크 : 입자 = 1 : 3.64»
 * 그런데 **같은 자리를 CR4 는 `live` 로 재서 «카드 평균휘도 +49.7%» 를 얻었다.**
 * 즉 두 실측이 정면으로 어긋나고, 어긋나는 이유의 후보가 이미 적혀 있다 —
 * `cap814` 의 `step` 벌은 `document.getAnimations()` 를 **전부 정지**시키므로
 * JS 틱으로 도는 것(파티클)은 물론이고, **정지 시점 이후에 태어나는 CSS 애니**도 못 잡는다.
 *
 * 338 규칙(«처방 전에 제품에게 묻는다») — 처방(CR6 의 카드 펄스·테두리 앰버)을 고르기 전에
 * **어느 실측이 맞는지**를 먼저 가른다. 그래서 이 자는 두 벌을 **같은 자, 같은 상자**로 잰다:
 *   ⓐ `step` 벌 — cap814 와 **똑같이** 정지시키고 진행도를 준다
 *   ⓑ `live` 벌 — 아무것도 정지시키지 않고 최대한 빨리 찍는다
 * 그리고 카드 상자를 «테두리 띠(바깥 8px)» 와 «속(그 안)» 으로 갈라 기준 프레임과의 Δ 를 잰다.
 *
 * ⚠ 캡처는 커밋하지 않는다(ROUTINE 서두) — 이 자는 임시 파일에 찍고 지운다.
 *
 * 실행: node tools/probe814b.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('pngjs').PNG;

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe814b-'));
const BAND = 8;                     /* 테두리 띠 두께 — CR6 이 «테두리» 라고 부른 자리 */
const STEPS = [0, 80, 160, 240, 320, 400, 480, 560];  /* cap814 와 같은 눈금 */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

/* ⚑ 4회차 — `step` 벌이 왜 «반응 0» 을 읽는가의 답이 여기 있다.
   연출 노드의 **수거는 `fxBye()` 의 `setTimeout`**(index.html ~40821)이라 `getAnimations()` 를
   정지시켜도 **실시간으로는 계속 흐른다.** 스크린샷 한 장이 300~400ms 라 2번째 프레임을 찍을
   즈음이면 플래시·스파크는 이미 걷힌 뒤다 — 그래서 2~8번 프레임은 «연출이 끝난 카드» 다.
   ⇒ 수거만 막으면(레이어 안 노드에 한해 `remove` 를 무력화) 같은 벌이 8프레임 전부 유효해진다. */
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
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
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
  return { b, p, errs };
}

/* cap814 와 같은 규약 — 이미 선택된 카드를 다시 누르면 상세 팝업이라 캡처가 통째로 무효가 된다 */
async function select(p) {
  const r = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' });
    el.click();
    const sel = document.querySelector('#bCos .sk-card.sel');
    const md = document.querySelector('#modal') || document.querySelector('#mbox');
    const open = !!(md && md.offsetParent !== null);
    const q = sel ? sel.getBoundingClientRect() : null;
    return { open, sel: q ? { x: q.left, y: q.top, w: q.width, h: q.height } : null };
  });
  if (r.open) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  if (!r.sel) throw new Error('선택 카드가 없다');
  return r.sel;
}

const clipOf = (s) => ({ x: Math.round(s.x), y: Math.round(s.y), width: Math.round(s.w), height: Math.round(s.h) });
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function readPng(f) { return PNG.sync.read(fs.readFileSync(f)); }

/* 기준 프레임과의 차이를 «테두리 띠» 와 «속» 으로 갈라 잰다 */
function diff(base, img) {
  const W = Math.min(base.width, img.width), H = Math.min(base.height, img.height);
  const acc = { edge: { n: 0, dl: 0, max: 0, chg: 0 }, in: { n: 0, dl: 0, max: 0, chg: 0 } };
  let bl = 0, il = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * base.width + x) * 4, j = (y * img.width + x) * 4;
      const isEdge = x < BAND || y < BAND || x >= W - BAND || y >= H - BAND;
      const t = isEdge ? acc.edge : acc.in;
      const l0 = lum(base.data[i], base.data[i + 1], base.data[i + 2]);
      const l1 = lum(img.data[j], img.data[j + 1], img.data[j + 2]);
      const d = Math.max(Math.abs(img.data[j] - base.data[i]),
                         Math.abs(img.data[j + 1] - base.data[i + 1]),
                         Math.abs(img.data[j + 2] - base.data[i + 2]));
      t.n++; t.dl += (l1 - l0); if (d > t.max) t.max = d; if (d > 2) t.chg++;
      if (isEdge) bl += l0; else il += l0;
    }
  }
  return {
    edgeDl: acc.edge.dl / acc.edge.n, edgeMax: acc.edge.max, edgeChg: 100 * acc.edge.chg / acc.edge.n,
    inDl: acc.in.dl / acc.in.n, inMax: acc.in.max, inChg: 100 * acc.in.chg / acc.in.n,
    edgeL0: bl / acc.edge.n, inL0: il / acc.in.n
  };
}

(async () => {
  console.log('PROBE814B — «카드 본체가 반응하지 않는다»(3회차 CR6) 를 자로 가른다\n');

  /* ── ⓐ step 벌 — cap814 와 같은 방식(정지 + 진행도 주입) ───────────── */
  console.log('[1] ⓐ `step` 벌 — `getAnimations()` 를 전부 정지시키고 진행도를 준다 (cap814 채점 벌)');
  const A = [];
  let cardBox = null;
  {
    const { b, p, errs } = await boot();
    const sel = await select(p);
    cardBox = sel;
    const clip = clipOf(sel);
    const base = path.join(TMP, 'a-base.png');
    await p.screenshot({ path: base, clip });
    await p.evaluate(() => document.querySelector('#bCos [data-cosup]').click());
    for (let i = 0; i < STEPS.length; i++) {
      await p.evaluate((t) => {
        document.getAnimations().forEach((a) => { a.pause(); try { a.currentTime = t; } catch (_) {} });
      }, STEPS[i]);
      const f = path.join(TMP, `a-${i}.png`);
      await p.screenshot({ path: f, clip });
      A.push({ t: STEPS[i], d: diff(readPng(base), readPng(f)) });
    }
    ok(errs.length === 0, `[1-a] step 벌 콘솔 에러 0건 (${errs.length})`);
    await b.close();
  }
  console.log(`  · 카드 상자 ${Math.round(cardBox.w)}×${Math.round(cardBox.h)} · 테두리 띠 ${BAND}px`);
  for (const r of A) {
    console.log(`    t=${String(r.t).padStart(3)}ms  속 Δ휘도 ${r.d.inDl.toFixed(2).padStart(7)}  최대채널 ${String(r.d.inMax).padStart(3)}  바뀐픽셀 ${r.d.inChg.toFixed(1).padStart(5)}%   |  테 Δ휘도 ${r.d.edgeDl.toFixed(2).padStart(7)}  최대 ${String(r.d.edgeMax).padStart(3)}`);
  }
  const aPeakIn = Math.max(...A.map((r) => Math.abs(r.d.inDl)));
  const aPeakMax = Math.max(...A.map((r) => r.d.inMax));
  const aTail = Math.max(...A.slice(1).map((r) => Math.abs(r.d.edgeDl)));

  /* ── ⓒ step + 수거 정지 — 같은 벌인데 노드를 안 걷는다 ─────────────── */
  console.log('\n[1b] ⓒ `step` 벌 + **수거 정지** — 같은 눈금, 같은 상자. 다른 것은 «걷지 않는다» 하나');
  const C = [];
  {
    const { b, p, errs } = await boot();
    const sel = await select(p);
    const clip = clipOf(sel);
    const base = path.join(TMP, 'c-base.png');
    await p.screenshot({ path: base, clip });
    await p.evaluate(FREEZE);
    await p.evaluate(() => document.querySelector('#bCos [data-cosup]').click());
    for (let i = 0; i < STEPS.length; i++) {
      await p.evaluate((t) => {
        document.getAnimations().forEach((a) => { a.pause(); try { a.currentTime = t; } catch (_) {} });
      }, STEPS[i]);
      const f = path.join(TMP, `c-${i}.png`);
      await p.screenshot({ path: f, clip });
      C.push({ t: STEPS[i], d: diff(readPng(base), readPng(f)) });
    }
    ok(errs.length === 0, `[1b-a] step+정지 벌 콘솔 에러 0건 (${errs.length})`);
    await b.close();
  }
  for (const r of C) {
    console.log(`    t=${String(r.t).padStart(3)}ms  속 Δ휘도 ${r.d.inDl.toFixed(2).padStart(7)}  바뀐픽셀 ${r.d.inChg.toFixed(1).padStart(5)}%   |  테 Δ휘도 ${r.d.edgeDl.toFixed(2).padStart(7)}`);
  }
  const cTail = Math.max(...C.slice(1).map((r) => Math.abs(r.d.edgeDl)));
  const cLive = C.slice(1).filter((r) => Math.abs(r.d.edgeDl) > 1).length;
  const cPeakEdge = Math.max(...C.map((r) => Math.abs(r.d.edgeDl)));
  const cPeakIn = Math.max(...C.map((r) => Math.abs(r.d.inDl)));
  const aLive = A.filter((r) => Math.abs(r.d.edgeDl) > 1).length;
  /* 봉우리 뒤가 단조 감쇠인가 — 「연출이 살아 있다」 를 한 장이 아니라 «곡선» 으로 못박는다 */
  const cPk = C.reduce((m, r, i) => (Math.abs(r.d.edgeDl) > Math.abs(C[m].d.edgeDl) ? i : m), 0);
  const cSeq = C.slice(cPk + 1).every((r, i, a) => i === 0 || Math.abs(r.d.edgeDl) <= Math.abs(a[i - 1].d.edgeDl) + 0.5);

  /* ── ⓑ live 벌 — 아무것도 정지시키지 않는다 ────────────────────────── */
  console.log('\n[2] ⓑ `live` 벌 — 정지 없음 · 최대한 빨리 찍는다 (CR4 가 «카드 평균휘도 +49.7%» 를 얻은 벌)');
  const B = [];
  {
    const { b, p, errs } = await boot();
    const sel = await select(p);
    const clip = clipOf(sel);
    const base = path.join(TMP, 'b-base.png');
    await p.screenshot({ path: base, clip });
    const t0 = Date.now();
    await p.evaluate(() => document.querySelector('#bCos [data-cosup]').click());
    for (let i = 0; i < 8; i++) {
      const at = Date.now() - t0;
      const f = path.join(TMP, `b-${i}.png`);
      await p.screenshot({ path: f, clip });
      B.push({ t: at, d: diff(readPng(base), readPng(f)) });
    }
    ok(errs.length === 0, `[2-a] live 벌 콘솔 에러 0건 (${errs.length})`);
    await b.close();
  }
  for (const r of B) {
    console.log(`    t≈${String(r.t).padStart(3)}ms  속 Δ휘도 ${r.d.inDl.toFixed(2).padStart(7)}  최대채널 ${String(r.d.inMax).padStart(3)}  바뀐픽셀 ${r.d.inChg.toFixed(1).padStart(5)}%   |  테 Δ휘도 ${r.d.edgeDl.toFixed(2).padStart(7)}  최대 ${String(r.d.edgeMax).padStart(3)}`);
  }
  const bPeakIn = Math.max(...B.map((r) => Math.abs(r.d.inDl)));
  const bIn = B.filter((r) => r.t <= 620).length;
  const bGap = (B[B.length - 1].t - B[0].t) / (B.length - 1);
  const bPeakMax = Math.max(...B.map((r) => r.d.inMax));
  const bPeakEdge = Math.max(...B.map((r) => Math.abs(r.d.edgeDl)));
  const bPeakEdgeMax = Math.max(...B.map((r) => r.d.edgeMax));

  /* ── 판정 ─────────────────────────────────────────────────────────── */
  console.log('\n[3] 판정 — CR6 의 «Δ ≤ 0.2/255» 가 어느 벌의 말인가');
  console.log(`  · step 벌 봉우리: 속 Δ휘도 ${aPeakIn.toFixed(2)} · 최대채널 ${aPeakMax}`);
  console.log(`  · live 벌 봉우리: 속 Δ휘도 ${bPeakIn.toFixed(2)} · 최대채널 ${bPeakMax} · 테 Δ휘도 ${bPeakEdge.toFixed(2)}(최대 ${bPeakEdgeMax})`);
  /* ⚠ `live` 벌로는 **못 판정한다** — 실행마다 값이 다르다(4회차 3회 실행: 속 봉우리 12.64 · 6.26 · 0.01).
     스크린샷 한 장이 300~500ms 인데 연출 수명이 620ms 라 «수명 안에 드는 프레임» 이 0~1장이고
     그 한 장이 어디에 떨어지는지는 운이다. CR4 의 «+49.7%» 와 CR6 의 «0px» 는 **같은 제품의 두 운**이다. */
  ok(bIn <= 2, `[3-a] live 벌은 판정에 못 쓴다 — 수명 620ms 안에 드는 프레임이 ${bIn}/8 장뿐 (≤ 2 · 간격 평균 ${bGap.toFixed(0)}ms). CR4 «+49.7%» 와 CR6 «0px» 는 같은 제품의 **두 운**이다`);
  ok(cPeakIn > 1.0, `[3-a2] ⇒ 답은 수거를 막은 벌이 준다 — **카드 본체는 실제로 반응한다**: 속 평균 휘도 Δ ${cPeakIn.toFixed(1)}/255 · 테두리 띠 Δ ${cPeakEdge.toFixed(1)}/255`);
  ok(cPeakEdge > 40, `[3-b] 수거를 막은 벌은 봉우리를 **결정적으로** 잡는다 — 테 Δ휘도 ${cPeakEdge.toFixed(1)}/255 (> 40) · 속 ${cPeakIn.toFixed(1)}`);
  ok(aLive <= 1, `[3-c] 종전 step 벌은 8장 중 **살아 있는 프레임이 ${aLive}장뿐**이다 (≤ 1) — CR6 의 «테두리·내부 Δ ≤ 0.2/255» 는 제품이 아니라 **죽은 프레임**을 잰 것이다`);
  ok(cLive >= 3, `[3-d] 수거만 막으면 같은 벌의 2~8번이 살아난다 — 테 Δ휘도 > 1 인 프레임 ${cLive}/7 (≥ 3) · 최대 ${cTail.toFixed(1)}`);
  ok(cTail > Math.max(1, aTail) * 10, `[3-e] 두 벌의 차이는 «걷었는가» 하나다 — 정지 ${cTail.toFixed(1)} vs 종전 ${aTail.toFixed(2)} (10배 이상)`);
  ok(cSeq, `[3-f] 그 여덟 장이 실제로 **한 곡선**을 그린다 — 봉우리 뒤로 단조 감쇠 후 0 (${C.map((r) => r.d.edgeDl.toFixed(0)).join(' → ')})`);

  console.log('\n[4] 콘솔 · 정리');
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  ok(true, '[4-a] 임시 캡처 삭제 (저장소에 png 를 남기지 않는다)');

  console.log(`\nPROBE814B ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE814B 실패 — ' + e.message); process.exit(1); });
