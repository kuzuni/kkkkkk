#!/usr/bin/env node
/* 게이트 — 작업 828 «단련 [단련] 버튼(`.tb`) 라벨에 150 폭 클램프(`fitNum`)»
 *
 *   node tools/verify828.js
 *
 * 무엇을 지키는가
 *   §1 Δ0px      — 지금 화면에 실제로 뜨는 짧은 라벨은 **한 픽셀도 안 움직인다**
 *                  (686·670·769 가 비평가와 푼 값 — 클램프는 넘칠 때만 걸린다).
 *   §2 예산      — 자릿수를 8~21 로 밀어도 라벨이 버튼 안쪽(폭 − 검정 링 좌우)을 안 넘고,
 *                  줄이 접히지 않으며(숫자가 버튼 밖으로 안 나가고), 링을 안 뚫는다.
 *   §3 150 규약  — «한 글자도 버리지 않는다»(문자열 = `fmt(비용)` 그대로 · 줄임표·접기 0)와
 *                  «넘칠 때만 누른다»(들어가는 자릿수에는 인라인 fs 가 안 남는다).
 *   §4 래칫 없음 — 같은 상태에서 여러 번 불러도 글자가 더 안 줄어든다(235 사고의 자리).
 *                  ⚠ 이 버튼은 `text-align:center` 라 «남는 자리» 로 방을 재면 **거울상 래칫**이
 *                    생긴다(클램프 성공 → 숫자가 가운데로 모임 → 방이 커짐 → 클램프 풀림).
 *   §5 두 경로   — 통짜 렌더(`renderTemper`)와 홀드 갱신(`liveTemper`)이 같은 클램프를 만든다(297).
 *   §6 배수·상태 — ×1000(701 `temperPlan`)과 `.no`(링 5px)에서도 예산을 지킨다.
 *   §7 프레임    — 9:19(2280)와 9:13.3(1600)에서 같은 값이다(가로 기하는 프레임 무관).
 *   §R 되돌림 시험 — 클램프를 무력화하면 **빨개진다**(§2 가 공짜로 초록인 항이 아님을 못박는다).
 *                  구조 가드(`white-space:nowrap`)는 클램프가 없어도 «숫자가 버튼 밖으로 내려가는»
 *                  모양만은 막는다는 것도 같이 잰다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);
const p1 = n => Math.round(n * 10) / 10;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e9; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  /* 한 행의 기하 — 예산은 상수가 아니라 버튼에게 묻는다(368): 안쪽 = clientWidth − inset 링 ×2.
     `natNum`(클램프 없는 요구 폭)은 인라인 fs 를 잠시 지우고 잰 뒤 되돌린다. */
  await page.evaluate(`window.__tb = (i) => {
    const row = document.querySelector('.tr-tp.k' + (i || 0)); if (!row) return null;
    const btn = row.querySelector('.tb'), num = row.querySelector('.tbn');
    const ic  = btn && btn.querySelector('img,.cic');
    if (!btn || !num) return null;
    const r1 = n => Math.round(n * 10) / 10;
    const br = btn.getBoundingClientRect();
    const sc = br.width / btn.offsetWidth;
    const bs = getComputedStyle(btn).boxShadow.replace(/rgba?\\([^)]*\\)/g, '');
    let ring = 0;
    for (const part of bs.split(',')) {
      if (part.indexOf('inset') < 0) continue;
      const n = (part.match(/-?[\\d.]+px/g) || []).map(parseFloat);
      if (n.length >= 4) ring = Math.max(ring, n[3]);
    }
    const rg = document.createRange(); rg.selectNodeContents(num);
    const nr = rg.getBoundingClientRect();
    const rects = [...rg.getClientRects()].filter(r => r.width > .5 && r.height > .5);
    const irc = ic ? ic.getBoundingClientRect() : null;
    const ics = ic ? getComputedStyle(ic) : null;
    const icUsed = ic ? ic.offsetWidth + (parseFloat(ics.marginLeft) || 0)
                                       + (parseFloat(ics.marginRight) || 0) : 0;
    const inkL = irc ? Math.min(irc.left, nr.left) : nr.left;
    const inkR = Math.max(nr.right, irc ? irc.right : -1e9);
    const keep = num.style.fontSize;
    num.style.fontSize = '';
    rg.selectNodeContents(num);
    const natNum = rg.getBoundingClientRect().width / sc;
    num.style.fontSize = keep;
    return {
      txt: num.textContent, digits: num.textContent.replace(/[^0-9]/g, '').length,
      no: btn.classList.contains('no'),
      btnW: r1(btn.offsetWidth), btnH: r1(btn.offsetHeight), ring: ring,
      room: r1(btn.clientWidth - ring * 2),
      icW: r1(icUsed), icX: irc ? r1((irc.left - br.left) / sc) : 0,
      icY: irc ? r1((irc.top - br.top) / sc) : 0,
      numInk: r1(nr.width / sc), natNum: r1(natNum), natLabel: r1(natNum + icUsed),
      labelInk: r1((inkR - inkL) / sc),
      inkL: r1((inkL - br.left) / sc), inkR: r1((inkR - br.left) / sc),
      numTop: r1((nr.top - br.top) / sc), numBot: r1((nr.bottom - br.top) / sc),
      overL: r1((br.left + ring * sc - inkL) / sc),
      overR: r1((inkR - (br.right - ring * sc)) / sc),
      lines: rects.length,
      fs: r1(parseFloat(getComputedStyle(num).fontSize) * 100) / 100,
      inlineFs: num.style.fontSize || '',
      nowrap: getComputedStyle(btn).whiteSpace
    };
  };`);
  /* 자릿수는 손 문자열이 아니라 **실제 모델**로 만든다 — 비용 = (s+1)(s+2)/2, s = ⌊lv/100⌋ */
  await page.evaluate(`window.__setDigits = (d, mul) => {
    const want = Math.pow(10, d - 1);
    let s = Math.ceil((Math.sqrt(8 * want + 1) - 3) / 2);
    while ((s + 1) * (s + 2) / 2 < want) s++;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = (s + 1) * (s + 2) / 2 * (mul || 1) * 4;
    trMul = mul || 1;
    renderTemper();
    return { s: s, lv: s * 100, cost: (s + 1) * (s + 2) / 2 };
  };`);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await openAt(browser, 2280);
  const ev = fn => page.evaluate(fn).catch(e => ({ __err: String(e) }));

  /* ══ §1 Δ0px — 지금 뜨는 라벨은 안 움직인다 ══════════════════════════ */
  blk('§1 Δ0px — 출고 상태(짧은 라벨)는 한 픽셀도 안 움직인다');
  await page.evaluate(() => { S.temper = { alloc: {} }; S.tstone = 1e9; trMul = 1; renderTemper(); });
  const B = await ev(() => window.__tb(0));
  if (!B || B.__err) ok(false, '§1 측정 실패: ' + (B && B.__err));
  else {
    console.log('       «' + B.txt + '» 버튼 ' + B.btnW + '×' + B.btnH + ' · 링 ' + B.ring
      + ' · 예산 ' + B.room + ' · 아이콘 x' + B.icX + ' y' + B.icY + ' w' + B.icW
      + ' · 숫자 잉크 ' + B.numInk + ' (x' + B.inkL + '..' + B.inkR + ' · y' + B.numTop + ')'
      + ' · fs ' + B.fs);
    ok(B.btnW === 496 && B.btnH === 173, '[1-a] 버튼 상자 496×173(769·686 값)', B.btnW + '×' + B.btnH);
    ok(B.ring === 8 && B.room === 480, '[1-b] 검정 링 8 ⇒ 안쪽 예산 480', B.ring + ' / ' + B.room);
    ok(B.icW === 90, '[1-c] 아이콘이 먹는 자리 = 72 + margin 18 = 90(686 값)', String(B.icW));
    ok(B.fs === 52, '[1-d] 짧은 라벨의 글자 크기는 CSS 원본 52 그대로다', String(B.fs));
    ok(B.inlineFs === '', '[1-e] 인라인 font-size 가 안 남는다(150 «넘치지 않으면 원본 그대로»)',
       '«' + B.inlineFs + '»');
    ok(B.lines === 1 && B.numTop >= 0 && B.numBot <= B.btnH,
       '[1-f] 라벨은 한 줄이고 숫자 잉크가 버튼 상자 안이다',
       '줄 ' + B.lines + ' · y' + B.numTop + '..' + B.numBot + ' / ' + B.btnH);
    ok(B.nowrap === 'nowrap', '[1-g] 라벨 줄바꿈이 구조적으로 막혀 있다(828 가드)', B.nowrap);
    ok(p1(B.labelInk) === 117.3,
       '[1-h] Lv 0 라벨 잉크 117.3px — 769 뒤의 그림 그대로(Δ0px)', String(B.labelInk));
  }

  /* ══ §2 예산 — 자릿수를 밀어도 안 넘는다 ════════════════════════════ */
  blk('§2 예산 — 8~21자리에서 라벨이 버튼 안쪽을 안 넘는다');
  const sweep = [];
  for (let d = 8; d <= 21; d++) {
    const made = await page.evaluate(`window.__setDigits(${d})`);
    const m = await ev(() => window.__tb(0));
    if (!m || m.__err) { ok(false, d + '자리 측정 실패'); continue; }
    sweep.push({ d, ...m, lv: made.lv });
  }
  sweep.forEach(s => console.log('       ' + String(s.d).padStart(2) + '자리 «' + s.txt + '»'
    + ' 요구 ' + String(s.natLabel).padStart(6) + ' → 실제 ' + String(s.labelInk).padStart(6)
    + ' / 예산 ' + s.room + ' · fs ' + s.fs
    + ' · y' + s.numTop + '..' + s.numBot + ' · 줄 ' + s.lines));
  ok(sweep.length === 14, '[2-a] 8~21자리를 실제 비용 모델로 전부 만들었다', String(sweep.length));
  /* 150 의 바닥(`FITMIN` 0.55 — 프로젝트 공용 상수)에 닿은 줄은 «더 누르지 않는다» 가 규약이다.
     그래서 판정을 둘로 가른다: 바닥 위는 예산을 지키고, 바닥에 닿은 줄은 적어도 «버튼 밖으로
     나가지 않는다». 바닥을 이 버튼만 낮추면 A3·가방 등 다른 호출부의 실측이 같이 흔들린다. */
  const FLOOR = p1(52 * 0.55);                                    /* = 28.6px */
  const atFloor = s => s.fs <= FLOOR + 0.05;
  const served = sweep.filter(s => !atFloor(s));
  const floored = sweep.filter(atFloor);
  const fit = served.filter(s => s.labelInk > s.room + 0.5);
  ok(fit.length === 0, '[2-b] 바닥(FITMIN fs 28.6) 위의 모든 자릿수에서 라벨 잉크 ≤ 안쪽 예산',
     fit.length ? fit.map(s => s.d + '자리 ' + s.labelInk + '>' + s.room).join(' · ')
                : served.length + '/' + served.length + '(~' + served[served.length - 1].d + '자리)');
  const pierce = served.filter(s => s.overL > 0.5 || s.overR > 0.5);
  ok(pierce.length === 0, '[2-c] 그 구간에서 검정 링을 뚫는 자릿수가 없다',
     pierce.length ? pierce.map(s => s.d + '자리 좌' + s.overL + '/우' + s.overR).join(' · ')
                   : served.length + '/' + served.length);
  /* 바닥 아래(20자리 초과)는 150 이 «여기까지» 라고 못박은 자리다 — 그래도 잉크는 버튼 면 안이다 */
  const spill = floored.filter(s => s.labelInk > s.btnW + 0.5 || s.lines !== 1);
  ok(spill.length === 0,
     '[2-f] 바닥에 닿은 자릿수(21~)도 잉크가 버튼 상자 폭을 안 넘는다 — 검정 링을 몇 px 밟을 뿐 초록 면 위에 남는다',
     floored.length ? floored.map(s => s.d + '자리 ' + s.labelInk + ' ≤ ' + s.btnW).join(' · ') : '해당 없음');
  const fold = sweep.filter(s => s.lines !== 1 || s.numTop < -0.5 || s.numBot > s.btnH + 0.5);
  ok(fold.length === 0,
     '[2-d] 줄이 접히지 않는다 — 숫자가 버튼 상자 밖으로 내려가는 자리가 0 이다(재현 [2] 의 그 모양)',
     fold.length ? fold.map(s => s.d + '자리 y' + s.numTop).join(' · ') : '14/14');
  const need = sweep.filter(s => s.natLabel > s.room);
  ok(need.length >= 10,
     '[2-e] 그중 «클램프가 없으면 넘쳤을» 자리가 실제로 여럿이다(§2 가 공짜 초록이 아니다)',
     need.length + '개(' + need[0].d + '자리부터)');

  /* ══ §3 150 규약 ════════════════════════════════════════════════════ */
  blk('§3 150 규약 — 한 글자도 안 버리고, 넘칠 때만 누른다');
  const drop = await ev(() => {
    const out = [];
    for (const t of TEMPERS) {
      const row = document.querySelector('.tr-tp[data-temper="' + CSS.escape(t.k) + '"]');
      if (!row) continue;
      const want = fmt(temperPlan(t.k, trMul).cost || temperCost(t.k));
      out.push({ k: t.k, want: want, got: row.querySelector('.tbn').textContent });
    }
    return out;
  });
  if (drop.__err) ok(false, '§3 evaluate 실패: ' + drop.__err);
  else {
    const bad = drop.filter(o => o.want !== o.got);
    ok(bad.length === 0,
       '[3-a] 라벨 문자열 = `fmt(비용)` 그대로 — 줄임표·접기·자리 버림 0(150 «한 글자도 버리지 않는다»)',
       bad.length ? bad.map(o => o.k + ': «' + o.got + '» ≠ «' + o.want + '»').join(' · ') : drop.length + '축');
    ok(drop.every(o => !/[…]|\.\.\.|[KMBTae]/.test(o.got.replace(/[\d,]/g, ''))),
       '[3-b] 라벨에 접기 단위·줄임표가 안 섞인다(재화·가격은 150 «숫자 그대로»)',
       drop.map(o => o.got).join(' / '));
  }
  const noClamp = sweep.filter(s => s.natLabel <= s.room && s.inlineFs !== '');
  ok(noClamp.length === 0,
     '[3-c] 들어가는 자릿수에는 인라인 fs 가 안 남는다(«넘칠 때만 누른다»)',
     noClamp.length ? noClamp.map(s => s.d + '자리').join(' · ') : '11자리 이하 무개입');
  const clamped = sweep.filter(s => s.natLabel > s.room);
  const tooSmall = clamped.filter(s => s.labelInk < s.room - 12);
  ok(tooSmall.length === 0,
     '[3-d] 눌린 라벨은 예산을 «거의 채운다» — 필요 이상으로 작아지지 않는다(잉크 ≥ 예산 − 12px)',
     tooSmall.length ? tooSmall.map(s => s.d + '자리 ' + s.labelInk).join(' · ')
                     : clamped.map(s => s.labelInk).join('·'));

  /* ══ §4 래칫 없음(235) ══════════════════════════════════════════════ */
  blk('§4 래칫 없음 — 여러 번 불러도 더 안 줄어든다(235 · 중앙 정렬의 거울상 래칫)');
  await page.evaluate('window.__setDigits(14)');
  const R4 = await ev(() => {
    const num = () => document.querySelector('.tr-tp.k0 .tbn');
    const seq = [num().style.fontSize];
    for (let i = 0; i < 5; i++) { temperFitBtns(); seq.push(num().style.fontSize); }
    /* 통짜 렌더를 섞어도 같은 값이어야 한다(서명 캐시를 비워 실제로 다시 그린다) */
    const w = document.getElementById('trTemper'); if (w) delete w.dataset.sig;
    renderTemper(); seq.push(num().style.fontSize);
    return seq;
  });
  if (R4.__err) ok(false, '§4 evaluate 실패: ' + R4.__err);
  else {
    console.log('       fs 궤적: ' + R4.join(' → '));
    ok(R4.every(v => v === R4[0]), '[4-a] 반복 호출·재렌더에도 font-size 가 한 값에 머문다', R4.join(' → '));
  }

  /* ══ §5 두 경로(297) ════════════════════════════════════════════════ */
  blk('§5 두 경로 — 통짜 렌더 ↔ 홀드 중 숫자 갱신');
  const R5 = await ev(() => {
    const num = () => document.querySelector('.tr-tp.k0 .tbn');
    /* 짧은 값에서 시작해 **홀드 경로만**으로 긴 값으로 넘어간다(297 이 지키는 그 상황) */
    S.temper = { alloc: {} }; S.tstone = 1e9; trMul = 1;
    const w = document.getElementById('trTemper'); if (w) delete w.dataset.sig;
    renderTemper();
    const before = { t: num().textContent, fs: num().style.fontSize || '' };
    const s = 447213500 / 100;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = (s + 1) * (s + 2) / 2 * 4;
    liveTemper();                                   /* 통짜 렌더 없이 숫자만 갈린다 */
    const live = { t: num().textContent, fs: num().style.fontSize || '' };
    if (w) delete w.dataset.sig;
    renderTemper();                                 /* 같은 상태를 통짜로 다시 그린다 */
    const full = { t: num().textContent, fs: num().style.fontSize || '' };
    const box = (() => {
      const btn = document.querySelector('.tr-tp.k0 .tb'), br = btn.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(num());
      const nr = rg.getBoundingClientRect();
      const ic = btn.querySelector('img,.cic').getBoundingClientRect();
      const sc = br.width / btn.offsetWidth;
      return { ink: (Math.max(nr.right, ic.right) - Math.min(nr.left, ic.left)) / sc,
               room: btn.clientWidth - 16 };
    })();
    return { before, live, full, box };
  });
  if (R5.__err) ok(false, '§5 evaluate 실패: ' + R5.__err);
  else {
    console.log('       짧은 값 fs «' + R5.before.fs + '» → 홀드 갱신 후 «' + R5.live.fs
      + '» / 통짜 «' + R5.full.fs + '» · 잉크 ' + p1(R5.box.ink) + ' / ' + R5.box.room);
    ok(R5.before.fs === '', '[5-a] 짧은 값에서는 클램프가 없다', '«' + R5.before.fs + '»');
    ok(R5.live.fs !== '', '[5-b] 홀드 경로만으로 길어져도 클램프가 걸린다(297 — 여기서 빠지면 꾹 누르는 중에만 넘친다)',
       '«' + R5.live.fs + '»');
    ok(R5.live.fs === R5.full.fs, '[5-c] 두 경로가 같은 값을 만든다',
       '«' + R5.live.fs + '» ↔ «' + R5.full.fs + '»');
    ok(R5.box.ink <= R5.box.room + 0.5, '[5-d] 홀드 경로 결과도 예산 안이다',
       p1(R5.box.ink) + ' ≤ ' + R5.box.room);
  }

  /* ══ §6 배수·상태 ═══════════════════════════════════════════════════ */
  blk('§6 배수(701 ×1000)와 `.no`(링 5px) 상태에서도 예산을 지킨다');
  await page.evaluate('window.__setDigits(9, 1000)');
  const M = await ev(() => window.__tb(0));
  if (!M || M.__err) ok(false, '§6 배수 측정 실패');
  else {
    console.log('       ×1000 «' + M.txt + '» (' + M.digits + '자리) 잉크 ' + M.labelInk
      + ' / 예산 ' + M.room + ' · fs ' + M.fs);
    ok(M.digits >= 11, '[6-a] ×1000 이 자릿수를 실제로 밀어 올린다', M.digits + '자리');
    ok(M.labelInk <= M.room + 0.5, '[6-b] ×1000 라벨도 예산 안이다', M.labelInk + ' ≤ ' + M.room);
    ok(M.lines === 1 && M.numBot <= M.btnH + 0.5, '[6-c] ×1000 라벨도 한 줄·상자 안이다',
       'y' + M.numTop + '..' + M.numBot);
  }
  const N = await ev(() => {
    /* 재화를 0 으로 만들어 `.no`(회색 · 링 5px)로 만든다. 라벨은 «다음 1레벨» 값이다(701 주석). */
    const s = 1414213500 / 100;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = 0; trMul = 1;
    const w = document.getElementById('trTemper'); if (w) delete w.dataset.sig;
    renderTemper();
    return window.__tb(0);
  });
  if (!N || N.__err) ok(false, '§6 `.no` 측정 실패: ' + (N && N.__err));
  else {
    console.log('       .no «' + N.txt + '» 링 ' + N.ring + ' ⇒ 예산 ' + N.room
      + ' · 잉크 ' + N.labelInk + ' · fs ' + N.fs);
    ok(N.no === true, '[6-d] 재화 0 이면 버튼이 `.no` 다', String(N.no));
    ok(N.ring === 5, '[6-e] `.no` 의 링은 5px 다 — 예산이 상태를 탄다(그래서 상수로 안 박는다)',
       String(N.ring));
    ok(N.labelInk <= N.room + 0.5, '[6-f] `.no` 에서도 라벨이 예산 안이다',
       N.labelInk + ' ≤ ' + N.room);
  }

  /* ══ §R 되돌림 시험 ═════════════════════════════════════════════════ */
  blk('§R 되돌림 시험 — 클램프를 무력화하면 빨개진다');
  const RR = await ev(() => {
    const w = document.getElementById('trTemper');
    const orig = window.temperFitBtns;
    window.temperFitBtns = () => {};                 /* 클램프만 없앤다(CSS 가드는 그대로) */
    const s = 447213500 / 100;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = (s + 1) * (s + 2) / 2 * 4; trMul = 1;
    if (w) delete w.dataset.sig;
    document.querySelector('.tr-tp.k0 .tbn').style.fontSize = '';
    renderTemper();
    const off = window.__tb(0);
    /* CSS 가드까지 없애면 «숫자가 버튼 밖» 이 되는가 — 828 가드가 무엇을 막는지 잰다 */
    const btn = document.querySelector('.tr-tp.k0 .tb');
    btn.style.whiteSpace = 'normal';
    const both = window.__tb(0);
    btn.style.whiteSpace = '';
    window.temperFitBtns = orig;
    if (w) delete w.dataset.sig;
    renderTemper();
    const back = window.__tb(0);
    return { off, both, back };
  });
  if (RR.__err) ok(false, '§R evaluate 실패: ' + RR.__err);
  else {
    console.log('       클램프 off: 잉크 ' + RR.off.labelInk + ' / 예산 ' + RR.off.room
      + ' · 줄 ' + RR.off.lines + ' · y' + RR.off.numTop);
    console.log('       가드까지 off: 줄 ' + RR.both.lines + ' · y' + RR.both.numTop
      + ' / 버튼 높이 ' + RR.both.btnH);
    console.log('       원복: 잉크 ' + RR.back.labelInk + ' / 예산 ' + RR.back.room + ' · fs ' + RR.back.fs);
    ok(RR.off.labelInk > RR.off.room + 0.5,
       '[R1] 클램프를 빼면 라벨이 예산을 넘는다(§2 는 클램프가 벌어 준 초록이다)',
       RR.off.labelInk + ' > ' + RR.off.room);
    ok(RR.off.numBot <= RR.off.btnH + 0.5 && RR.off.lines === 1,
       '[R2] 클램프가 없어도 구조 가드(nowrap)가 «숫자가 버튼 밖으로 내려가는» 모양은 막는다',
       'y' + RR.off.numTop + '..' + RR.off.numBot + ' / ' + RR.off.btnH);
    ok(RR.both.numTop > RR.both.btnH - 1,
       '[R3] 가드까지 빼면 숫자가 버튼 밖으로 내려간다 — 828 가드가 막는 것이 바로 그것이다',
       'y' + RR.both.numTop + ' / 높이 ' + RR.both.btnH);
    ok(RR.back.labelInk <= RR.back.room + 0.5 && RR.back.inlineFs !== '',
       '[R4] 원복하면 다시 초록이다', RR.back.labelInk + ' ≤ ' + RR.back.room);
  }

  /* ══ §7 프레임 무관 ═════════════════════════════════════════════════ */
  blk('§7 9:13.3(1080×1600) — 가로 기하·클램프가 프레임에 안 흔들린다');
  const { ctx: c2, page: p2 } = await openAt(browser, 1600);
  await p2.evaluate('window.__setDigits(14)');
  const F = await p2.evaluate(() => window.__tb(0)).catch(e => ({ __err: String(e) }));
  const ref = sweep.find(s => s.d === 14);
  if (!F || F.__err || !ref) ok(false, '§7 측정 실패: ' + (F && F.__err));
  else {
    console.log('       1600: 예산 ' + F.room + ' · 잉크 ' + F.labelInk + ' · fs ' + F.fs
      + '  ↔  2280: 예산 ' + ref.room + ' · 잉크 ' + ref.labelInk + ' · fs ' + ref.fs);
    ok(F.room === ref.room, '[7-a] 안쪽 예산이 두 프레임에서 같다', F.room + ' ↔ ' + ref.room);
    ok(Math.abs(F.labelInk - ref.labelInk) <= 1, '[7-b] 클램프 결과 잉크가 같다(Δ≤1px)',
       F.labelInk + ' ↔ ' + ref.labelInk);
    ok(F.labelInk <= F.room + 0.5, '[7-c] 짧은 프레임에서도 예산 안이다', F.labelInk + ' ≤ ' + F.room);
  }
  await c2.close();

  ok(errs.length === 0, '[8] 콘솔 런타임 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await ctx.close();
  await browser.close();
  console.log('\nVERIFY828 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
