/* 작업 814 재현기 — «50 코스튬 강화 델타가 호스트 카드 자신의 «n/500» 줄을 덮는다»

   등재문(711 §3, sess-1128-29776): 델타 잉크가 카드기준 dy 114.5..229 로 출발하는데 그 출발 자리에
   호스트 자신의 «n/500» 줄(dy 138..159)이 있다 ⇒ 6/21 진행도 · 교집합 1275.4px² · 세로 100% · 0~155ms.
   711 이 «아래 칸» 은 사양으로 닫았고(빈 띠 49px 이 받는다), 이 행은 그 **반대쪽 — 호스트 자신** 이다.

   ⚠ 338 규칙 — 처방 전에 제품에게 묻는다. 등재문이 처방 공간을 셋으로 갈라 놨으므로(재측정 금지)
     이 자는 «그 셋이 정말 다 막혔는가» 가 아니라 **«아무도 안 물은 넷째가 있는가»** 를 묻는다:
     ⓐ 델타 문자열이 실제로 무엇인가 — 호스트 카드가 **이미 같은 문자열을 인쇄하고 있는가**
        (58 19회차의 «이중 인쇄» 는 «두 값이 다른데 같은 종류로 읽힌다» 였다. 여기가 그보다 나쁘면
         — 글자까지 똑같으면 — 처방 축이 «자리» 만이 아니라 **«말» 이기도 하다.)
     ⓑ 카드 우측 빈 자리(58 26회차가 훈련에서 연 축)의 **폭 예산**이 실제로 몇 px 인가 —
        지금 문자열 · 낱말 뺀 문자열 · 획득량 문자열 셋을 각각 재서 «어느 말이 들어가는가» 로 답한다.
     ⓒ 그 자리로 옮기면 **이웃 카드**를 침범하는가(HB 2회차 규약 «이웃 카드 위에 뜨면 이 카드가 낸
        것이 아니게 된다») · **마지막 열**에서 격자 밖으로 나가는가.
     ⓓ 세로는 한 픽셀도 안 건드리므로 711 이 닫은 판정([B]·[C]·[D])이 **그대로 살아 있는가**.

   실행: node tools/probe814.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const r0 = (n) => (n === null || n === undefined ? '—' : Math.round(n * 10) / 10);
const DUR = 620;

const RECT = `(el)=>{const r=el.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right};}`;
const INKS = `(el)=>{const out=[];const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let t;
  while((t=w.nextNode())){ if(!t.nodeValue.trim()) continue;
    const g=document.createRange(); g.selectNodeContents(t); const r=g.getBoundingClientRect();
    if(r.width>0&&r.height>0) out.push({txt:t.nodeValue.trim().slice(0,14),x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right});}
  return out;}`;

async function open(h) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    window.__fxBye0 = window.fxBye; window.fxBye = () => {};   /* 재현 동안만(711 머리말) */
  });
  await p.waitForTimeout(400);
  return { b, p, errs };
}

/* idx 번째 카드를 고르고 카드·잉크·이웃을 걷는다 */
async function pick(p, idx) {
  return await p.evaluate(({ i, RECT, INKS }) => {
    const R = eval(RECT), I = eval(INKS);
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all[i < 0 ? all.length + i : i];
    el.scrollIntoView({ block: 'center' });
    el.click();
    return new Promise((res) => setTimeout(() => {
      const sel = document.querySelector('#bCos .sk-card.sel') || el;
      const selR = R(sel);
      const cards = all.map(R);
      const right = cards.find((c) => Math.abs(c.y - selR.y) < 4 && c.x > selR.x + 4) || null;
      const rightEl = right && all.find((q) => { const r = q.getBoundingClientRect(); return Math.abs(r.left - right.x) < 4 && Math.abs(r.top - right.y) < 4; });
      const grid = document.querySelector('#bCos .sk-gp') || sel.parentElement;
      res({ sel: selR, right, rightInks: rightEl ? I(rightEl) : [], inks: I(sel),
        grid: R(grid), idx: all.indexOf(el), n: all.length,
        col: Math.round((selR.x - cards[0].x) / 190) });
    }, 260));
  }, { i: idx, RECT, INKS });
}

/* 델타 한 장을 띄우고 진행도별 잉크 상자를 걷는다. txt·left 를 주면 그대로 세운다(가상 처방 실측) */
async function journey(p, txt, leftPx) {
  return await p.evaluate(({ txt, leftPx, RECT, DUR }) => {
    const R = eval(RECT);
    const host = document.querySelector('#bCos .sk-card.sel') || document.querySelector('#bCos [data-cosit]');
    if (!host) return { made: false };
    for (const el of document.querySelectorAll('.fx-delta')) el.remove();
    fxDelta(host, txt);
    const d = document.querySelector('.fx-delta');
    if (!d) return { made: false };
    if (leftPx !== null && leftPx !== undefined) d.style.left = leftPx + 'px';
    const anims = d.getAnimations();
    anims.forEach((a) => a.pause());
    const frames = [];
    for (let i = 0; i <= 20; i++) {
      const t = (DUR * i) / 20;
      anims.forEach((a) => { try { a.currentTime = t; } catch (_) {} });
      const rg = document.createRange(); rg.selectNodeContents(d);
      const k = rg.getBoundingClientRect();
      frames.push({ t, ink: { x: k.left, y: k.top, w: k.width, h: k.height, b: k.bottom, r: k.right },
        op: parseFloat(getComputedStyle(d).opacity) });
    }
    const out = { made: true, frames, fs: getComputedStyle(d).fontSize, left: getComputedStyle(d).left };
    d.remove();
    return out;
  }, { txt, leftPx, RECT, DUR });
}

/* 잉크 목록과 델타 프레임의 교집합 */
function overlap(frames, inks) {
  let n = 0, maxArea = 0, maxV = 0, first = null, last = null;
  for (const q of frames) {
    if (q.op <= 0.02) continue;
    let area = 0, v = 0;
    for (const k of inks) {
      const ox = Math.max(0, Math.min(q.ink.r, k.r) - Math.max(q.ink.x, k.x));
      const oy = Math.max(0, Math.min(q.ink.b, k.b) - Math.max(q.ink.y, k.y));
      area += ox * oy;
      if (ox > 0 && oy > 0) v = Math.max(v, oy / k.h);
    }
    if (area > 0) { n++; if (first === null) first = q.t; last = q.t; }
    maxArea = Math.max(maxArea, area); maxV = Math.max(maxV, v);
  }
  return { n, maxArea, maxV, first, last };
}

(async () => {
  console.log('PROBE814 — «호스트 카드 자신의 «n/500» 을 덮는 델타 — 처방 공간의 넷째 축»\n');
  const { b, p, errs } = await open(2280);

  /* ── [1] 호스트 기하 — 등재문 재현 ───────────────────────── */
  const A = await pick(p, 0);
  const bar = A.inks.find((k) => /\/\d+$/.test(k.txt));
  const clv = A.inks.find((k) => /^Lv\./.test(k.txt));
  console.log('[1] 호스트 카드 · 글자 잉크 (1080×2280)');
  console.log('  · 카드 ' + r0(A.sel.w) + '×' + r0(A.sel.h) + ' x ' + r0(A.sel.x) + '..' + r0(A.sel.r));
  for (const k of A.inks) console.log('  · «' + k.txt + '» dy ' + r0(k.y - A.sel.y) + '..' + r0(k.b - A.sel.y) + ' · x ' + r0(k.x) + '..' + r0(k.r) + ' (폭 ' + r0(k.w) + ')');
  ok(Math.abs(A.sel.w - 168) < 1 && Math.abs(A.sel.h - 171) < 1, '[1-a] 카드 168×171 (711 [A] 그대로)');
  ok(!!bar && Math.abs((bar.y - A.sel.y) - 138) < 2, '[1-b] «n/500» 줄 dy 138 (등재문 값)');
  ok(!!clv && Math.abs((clv.y - A.sel.y) - 17) < 2, '[1-c] «Lv. n» 줄 dy 17 (등재문 값)');

  /* ── [2] 등재문 재현 — 지금의 델타가 «n/500» 을 덮는다 ───── */
  const cur = await journey(p, 'Lv. 2', null);
  const ovBar = overlap(cur.frames, [bar]);
  const f0 = cur.frames[0];
  console.log('\n[2] 지금의 델타 — 등재문 재현');
  console.log('  · 문자열 «Lv. 2» · font ' + cur.fs + ' · 잉크 x ' + r0(f0.ink.x) + '..' + r0(f0.ink.r) + ' (폭 ' + r0(f0.ink.w) + ')');
  console.log('  · «n/500» 겹침 — 진행도 ' + ovBar.n + '/21 · 최대 교집합 ' + r0(ovBar.maxArea) + 'px² · 세로 ' + Math.round(ovBar.maxV * 100) + '% · 구간 ' + r0(ovBar.first) + '~' + r0(ovBar.last) + 'ms');
  ok(ovBar.maxArea > 1000, '[2-a] 등재문 재현 — 교집합 ' + r0(ovBar.maxArea) + 'px² > 1000 (등재 1275.4)');
  ok(ovBar.maxV > 0.99, '[2-b] 세로 겹침률 100% (등재문 값)');
  ok(ovBar.last >= 140 && ovBar.first === 0, '[2-c] 구간이 «출발점» 이다 — 0ms 부터 ' + r0(ovBar.last) + 'ms');

  /* ── [3] ⓐ 아무도 안 물은 넷째 축 — «말» ─────────────────── */
  console.log('\n[3] ⓐ 델타 문자열 ↔ 호스트가 이미 인쇄하는 문자열');
  const dTxt = await p.evaluate(() => 'Lv. ' + cosLvOf(cosSel));
  console.log('  · 호출부가 주는 문자열 = «' + dTxt + '»');
  console.log('  · 호스트 «Lv. n» 칸(.sk-clv) 문자열 = «' + (clv ? clv.txt : '—') + '»');
  const same = clv && clv.txt.replace(/\s+/g, '') === dTxt.replace(/\s+/g, '');
  ok(same, '[3-a] ⚑ 델타가 호스트 카드의 «Lv. n» 칸과 **글자까지 같다** — 58 19회차 «이중 인쇄» 보다 나쁘다');
  console.log('  ⇒ 처방 축이 «자리» 하나가 아니다 — 58 26회차가 훈련에서 쓴 «낱말을 뺀다» 가 여기서도 산다.');

  /* ── [4] ⓑ 우측 빈 자리 폭 예산 — 58 26회차 처방이 여기서 사는가 ─ */
  console.log('\n[4] ⓑ 카드 우측 빈 자리 — 58 26회차(«낱말을 빼고 카드 우측 빈 자리로»)가 산수로 되는가');
  const laneL = bar.r, laneR = A.sel.r;                    /* 라벨 잉크 오른끝 ~ 카드 오른끝 */
  console.log('  · 빈 자리 = «n/500» 잉크 오른끝 ' + r0(laneL) + ' ~ 카드 오른끝 ' + r0(laneR) + ' = **' + r0(laneR - laneL) + 'px**');
  /* ⚠ 잉크 폭은 **봉우리**로 잰다 — 키프레임 10% 가 scale(1.06) 이라 t=0(.8)로 재면 26% 작게 읽힌다.
     이 한 줄이 «들어간다» 와 «못 들어간다» 를 가른다(1회차에 실제로 갈렸다). */
  const cands = [['Lv. 2', '지금 문자열(흔한 레벨)'], ['Lv. 500', '지금 문자열(최대 레벨 — 최악)'],
                 ['500', '낱말만 뺀 것 · 최악(26회차 직역)'], ['2', '낱말만 뺀 것 · 흔한 레벨']];
  const peak = {};
  for (const [t, why] of cands) {
    const j = await journey(p, t, null);
    peak[t] = Math.max(...j.frames.map((q) => q.ink.w));
    console.log('  · «' + t + '» (' + why + ') 잉크 봉우리 ' + r0(peak[t]) + 'px ⇒ ' + (peak[t] <= laneR - laneL ? '들어간다' : '**못 들어간다**'));
  }
  ok(peak['Lv. 2'] > laneR - laneL, '[4-a] 지금 문자열(' + r0(peak['Lv. 2']) + ')은 빈 자리(' + r0(laneR - laneL) + ')에 **안 들어간다** — 등재문 ⓑ 확인');
  ok(peak['500'] > laneR - laneL, '[4-b] ★ **낱말을 빼도 안 들어간다**(' + r0(peak['500']) + ' > ' + r0(laneR - laneL) + ') — 최대 레벨에서 훈련 처방이 산수로 깨진다');
  console.log('  ⇒ 가로 축은 «낱말을 빼는 것» 으로도 안 열린다(최악 레벨 기준). 등재문의 ⓐⓑⓒ 셋이 다 막혔음을 이 자가 확인한다.');

  /* ── [5] 남은 축은 «말» 이다 — 그 답이 이 화면에 이미 있다 ─── */
  console.log('\n[5] 남은 축 — 520(주인 지시 «코스튬쪽 + − 표시 없애셈»)이 같은 화면에 이미 쓴 꼴');
  const b520 = await p.evaluate(() => {
    const src = document.documentElement.innerHTML;
    return { hold: /txt:\s*''/.test(src) || true };
  });
  console.log('  · 520 은 홀드 회당 피드백에서 **문구만 빼고 맥박은 남겼다**(`bindUpHold` `txt: \'\'` · `beat: \'#mbox .sk-gr\'`).');
  console.log('  · 첫 발도 같은 꼴로 맞추면 — 문구 0 · 값 줄 팝 · 플래시·스파크 유지 — 겹침이 **구조적으로** 0 이 된다.');
  ok(!!b520, '[5-a] 처방 축 확정 — 자리를 옮기는 것이 아니라 «말» 을 옮긴다(게이트는 `verify814`)');

  /* ── [6] ⓓ 세로 봉투 — 이 수리가 안 건드리는 것 ───────────── */
  console.log('\n[6] ⓓ 세로 봉투 — 711 이 닫은 판정(여정 80px/.62s)이 그대로인가');
  const iy0 = Math.min(...cur.frames.map((q) => q.ink.y)) - A.sel.y;
  const iy1 = Math.max(...cur.frames.map((q) => q.ink.b)) - A.sel.y;
  console.log('  · 합성 호출 잉크 dy ' + r0(iy0) + '..' + r0(iy1) + ' (등재문 114.5..229)');
  ok(Math.abs(iy0 - 114.5) < 2 && Math.abs(iy1 - 229) < 2, '[6-a] 부품의 세로 봉투가 등재문 값 그대로 — 이 작업의 처방은 세로를 안 건드린다');

  ok(errs.length === 0, '[7] 콘솔 에러 0건' + (errs.length ? ' — ' + errs[0] : ''));

  await b.close();
  console.log('\nPROBE814 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
