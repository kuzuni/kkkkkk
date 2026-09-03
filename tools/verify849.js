#!/usr/bin/env node
/* 게이트 — 작업 849 «단련 [단련] 버튼의 검정 링을 두 상태에서 통일(`.tb.no` 5 → 8)»
 *
 *   node tools/verify849.js
 *
 * 무엇이 결손이었나
 *   `.tr-tp>.tb` 는 링 8 · `.tr-tp>.tb.no`(재화 부족·회색)는 링 **5** 였다. 5 는 203·210 이 버튼을
 *   처음 세울 때의 값이고, 686 2회차(`0a7d3694`)가 «같은 패널의 다른 상자는 전부 8» 이라며 `.tb` 를
 *   8 로 올릴 때 **같은 버튼의 `.no` 를 안 따라 올렸다**. 그림만의 문제가 아니다 — 828 의 폭 클램프는
 *   링을 상수로 안 박고 **읽어서** 예산을 푸는 정직한 코드라, `.no` 에서만 예산이 480 → 486 으로
 *   6px 넓어지고 **재화가 모자라 회색으로 넘어가는 순간 같은 라벨의 글자 크기가 1.2% 흔들렸다**
 *   (`verify828` [6-e] 실측: 잉크 479.9 → 485.9 · fs 42.53 → 41.59).
 *
 * 왜 ⓐ(링 통일)이고 ⓒ(클램프만 8 로 고정)가 아닌가 — 등재문이 «584 의 5 가 근거 있는 값인가» 를
 *   먼저 읽으라고 했다. 근거가 **없다**: 584 주석의 «53px 그림 + 검정 링 5px ⇒ 안쪽 예산 64» 는
 *   버튼이 높이 74 이던 시절의 셈이고(686 이 173 으로 다시 풀었다), 그 자(`verify584` [2-i])는
 *   `getBoundingClientRect` 로 상하 여백의 **대칭**을 재는데 **inset box-shadow 는 레이아웃을
 *   한 픽셀도 안 움직인다**. §5 가 그 사실을 실측으로 못박는다 — 그래서 뜻과 그림이 같이 맞는 ⓐ 다.
 *
 * 무엇을 지키는가
 *   §1 규약   — 단련 패널의 검정 링은 **한 값(8)** 이다. `.tb.no` 도 그 안이다(예외 0).
 *   §2 선언   — 소스의 `.tb.no` 줄이 8 을 적고 있고, 옛 5 는 0건이다.
 *   §3 상태   — **같은 라벨**이 두 상태에서 같은 예산·같은 글자 크기·같은 잉크다(849 의 본체).
 *   §4 스윕   — 8~21자리 전부에서 그렇다(한 자릿수에서만 우연히 같은 것이 아니다).
 *   §5 그림   — 링은 레이아웃을 안 움직인다: 두 상태의 버튼 상자·아이콘 좌표·라벨 세로가 Δ0px
 *              ⇒ 584 [2-i] 의 세로 대칭이 `.no` 에서도 그대로 성립한다(그 자가 5 에 안 매여 있었다).
 *   §R 되돌림 — `.no` 를 5 로 되돌리면 §3 이 **빨개진다**(무르게 푼 수리가 아님을 못박는다).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
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

  /* 링 읽기 · 한 행의 기하 — 828 의 `__tb` 와 같은 셈이다(예산은 상수가 아니라 버튼에게 묻는다). */
  await page.evaluate(`window.__ring = (el) => {
    const bs = getComputedStyle(el).boxShadow.replace(/rgba?\\([^)]*\\)/g, '');
    let m = 0;
    for (const p of bs.split(',')) {
      if (p.indexOf('inset') < 0) continue;
      const n = (p.match(/-?[\\d.]+px/g) || []).map(parseFloat);
      if (n.length >= 4) m = Math.max(m, n[3]);
    }
    return m;
  };`);
  await page.evaluate(`window.__tb849 = (i) => {
    const row = document.querySelector('.tr-tp.k' + (i || 0)); if (!row) return null;
    const btn = row.querySelector('.tb'), num = row.querySelector('.tbn');
    const ic  = btn && btn.querySelector('img,.cic');
    if (!btn || !num) return null;
    const r1 = n => Math.round(n * 10) / 10;
    const br = btn.getBoundingClientRect();
    const sc = br.width / btn.offsetWidth;
    const ring = window.__ring(btn);
    const rg = document.createRange(); rg.selectNodeContents(num);
    const nr = rg.getBoundingClientRect();
    const irc = ic ? ic.getBoundingClientRect() : null;
    const ics = ic ? getComputedStyle(ic) : null;
    const icUsed = ic ? ic.offsetWidth + (parseFloat(ics.marginLeft) || 0)
                                       + (parseFloat(ics.marginRight) || 0) : 0;
    const inkL = irc ? Math.min(irc.left, nr.left) : nr.left;
    const inkR = Math.max(nr.right, irc ? irc.right : -1e9);
    return {
      txt: num.textContent, no: btn.classList.contains('no'),
      ring: ring, room: r1(btn.clientWidth - ring * 2),
      btnW: r1(btn.offsetWidth), btnH: r1(btn.offsetHeight),
      labelInk: r1((inkR - inkL) / sc),
      fs: Math.round(parseFloat(getComputedStyle(num).fontSize) * 100) / 100,
      /* 584 [2-i] 와 **같은 셈** — 아이콘 잉크의 상하 여백(버튼 기준). */
      icTop: irc ? r1((irc.top - br.top) / sc) : null,
      icBot: irc ? r1((br.bottom - irc.bottom) / sc) : null,
      icX:   irc ? r1((irc.left - br.left) / sc) : null,
      numTop: r1((nr.top - br.top) / sc), numBot: r1((nr.bottom - br.top) / sc)
    };
  };`);
  /* 라벨 문자열은 «다음 1레벨 비용» 이라 보유량(`S.tstone`)과 무관하다 — alloc 을 고정한 채
     보유량만 흔들면 **같은 글자**의 두 상태를 나란히 잴 수 있다. 클래스 손질이 아니라 실제 경로다. */
  await page.evaluate(`window.__at = (digits, stone) => {
    const want = Math.pow(10, digits - 1);
    let s = Math.ceil((Math.sqrt(8 * want + 1) - 3) / 2);
    while ((s + 1) * (s + 2) / 2 < want) s++;
    S.temper = { alloc: { atk: s * 100, hp: s * 100, regen: s * 100 } };
    S.tstone = stone === 'rich' ? (s + 1) * (s + 2) / 2 * 4 : 0;
    trMul = 1;
    const w = document.getElementById('trTemper'); if (w) delete w.dataset.sig;
    renderTemper();
    return window.__tb849(0);
  };`);
  const ev = fn => page.evaluate(fn).catch(e => ({ __err: String(e) }));

  /* ══ §1 규약 — 패널의 검정 링은 한 값이다 ═══════════════════════════ */
  blk('§1 규약 — 단련 패널의 검정 링은 **한 값(8)** 이다 (686 2회차가 세운 규약)');
  const RINGS = await ev(() => {
    const root = document.getElementById('trw');
    const out = [];
    root.querySelectorAll('*').forEach(el => {
      const r = window.__ring(el);
      if (r > 0 && el.getBoundingClientRect().width >= 2) {
        out.push({ sel: el.tagName.toLowerCase() + '.' + [...el.classList].join('.'), ring: r });
      }
    });
    /* `.no` 는 재화가 있으면 안 켜지므로 **클래스로 직접** 묻는다(CSS 질문이라 상태를 안 흔든다). */
    const btn = document.querySelector('#trTemper .tr-tp .tb');
    const had = btn.classList.contains('no');
    btn.classList.add('no'); const noRing = window.__ring(btn);
    if (!had) btn.classList.remove('no');
    return { out, noRing, n: out.length };
  });
  if (!RINGS || RINGS.__err) ok(false, '§1 측정 실패: ' + (RINGS && RINGS.__err));
  else {
    const uniq = [...new Set(RINGS.out.map(r => r.ring))].sort((a, b) => a - b);
    const bad = RINGS.out.filter(r => r.ring !== 8);
    console.log('       ' + RINGS.n + '노드 · 값 {' + uniq.join(', ') + '}');
    RINGS.out.forEach(r => console.log('         ' + r.sel + ' :: ' + r.ring));
    ok(RINGS.n >= 8, '[1-a] 패널에서 링을 가진 노드를 실제로 여럿 쟀다(패널·헤더·카드 3·액자 3·버튼 3)',
       RINGS.n + '노드');
    ok(bad.length === 0 && uniq.length === 1 && uniq[0] === 8,
       '[1-b] ★ 그 값이 **전부 8** 이다 — 예외 0건',
       bad.length ? bad.map(r => r.sel + ' ' + r.ring).join(' / ') : '{' + uniq.join(', ') + '}');
    ok(RINGS.noRing === 8,
       '[1-c] ★ 849 — `.tb.no`(회색)도 그 8 안이다. **여기가 849 이전의 유일한 예외였다(5px)**',
       RINGS.noRing + 'px');
  }

  /* ══ §2 선언 ════════════════════════════════════════════════════════ */
  blk('§2 선언 — 소스가 8 을 적고 있고 옛 5 는 0건이다');
  const NOLINE = (CODE.match(/\.tr-tp>\.tb\.no\{[\s\S]{0,240}?\}/) || [''])[0];
  ok(/inset 0 0 0 8px #141414/.test(NOLINE),
     '[2-a] `.tr-tp>.tb.no` 선언이 `inset 0 0 0 8px #141414` 다',
     (NOLINE.match(/inset[^,}]*/) || ['(못 찾음)'])[0].trim());
  ok(NOLINE !== '' && !/inset 0 0 0 5px #141414/.test(NOLINE),
     '[2-b] 그 선언에 옛 5px 가 0건이다', NOLINE === '' ? '선언을 못 찾았다' : '0건');
  ok(/0 5px 0 #5E594F/.test(NOLINE),
     '[2-c] 립(회색 그림자 `0 5px 0`)은 안 건드렸다 — 바뀐 것은 **inset 링 하나**다',
     /0 5px 0 #5E594F/.test(NOLINE) ? '그대로' : '사라졌다');

  /* ══ §3 상태 — 849 의 본체 ══════════════════════════════════════════ */
  blk('§3 ★ 본체 — 같은 라벨이 두 상태에서 같은 예산·같은 글자 크기다');
  const A = await ev(`window.__at(15, 'poor')`);   /* 회색(재화 0) */
  const Bv = await ev(`window.__at(15, 'rich')`);  /* 초록(재화 충분) — 라벨은 같다 */
  if (!A || A.__err || !Bv || Bv.__err) ok(false, '§3 측정 실패: ' + ((A && A.__err) || (Bv && Bv.__err)));
  else {
    console.log('       회색 «' + A.txt + '» 링 ' + A.ring + ' ⇒ 예산 ' + A.room
      + ' · 잉크 ' + A.labelInk + ' · fs ' + A.fs);
    console.log('       초록 «' + Bv.txt + '» 링 ' + Bv.ring + ' ⇒ 예산 ' + Bv.room
      + ' · 잉크 ' + Bv.labelInk + ' · fs ' + Bv.fs);
    ok(A.no === true && Bv.no === false && A.txt === Bv.txt,
       '[3-a] 두 상태를 실제로 만들었고 **라벨 문자열이 같다**(비용은 보유량과 무관하다)',
       `.no ${A.no}/${Bv.no} · «${A.txt}»`);
    ok(A.ring === Bv.ring && A.ring === 8,
       '[3-b] 링이 같다(8)', `${A.ring} ↔ ${Bv.ring}`);
    ok(A.room === Bv.room && A.room === 480,
       '[3-c] ★ **안쪽 예산이 상태를 안 탄다**(849 이전 480 ↔ 486)', `${A.room} ↔ ${Bv.room}`);
    ok(Math.abs(A.fs - Bv.fs) <= 0.01,
       '[3-d] ★ **글자 크기가 상태를 안 탄다**(849 이전 42.53 ↔ 41.59 = 1.2% 흔들림)',
       `fs ${A.fs} ↔ ${Bv.fs}`);
    ok(Math.abs(A.labelInk - Bv.labelInk) <= 0.5,
       '[3-e] 그래서 라벨 잉크 폭도 같다', `${A.labelInk} ↔ ${Bv.labelInk}`);
  }

  /* ══ §4 스윕 ════════════════════════════════════════════════════════ */
  blk('§4 스윕 — 8~21자리 전부에서 그렇다(한 자리에서만 우연히 같은 것이 아니다)');
  const rows = [];
  for (let d = 8; d <= 21; d++) {
    const p = await ev(`window.__at(${d}, 'poor')`);
    const r = await ev(`window.__at(${d}, 'rich')`);
    if (!p || p.__err || !r || r.__err) { ok(false, d + '자리 측정 실패'); continue; }
    rows.push({ d, p, r });
  }
  rows.forEach(x => console.log('       ' + String(x.d).padStart(2) + '자리 «' + x.p.txt + '»'
    + ' 회색 fs ' + String(x.p.fs).padStart(6) + ' / 예산 ' + x.p.room
    + '  ↔  초록 fs ' + String(x.r.fs).padStart(6) + ' / 예산 ' + x.r.room));
  ok(rows.length === 14, '[4-a] 8~21자리를 실제 비용 모델로 전부 만들었다', String(rows.length));
  ok(rows.every(x => x.p.txt === x.r.txt),
     '[4-b] 자릿수마다 두 상태의 라벨이 같은 글자다',
     rows.filter(x => x.p.txt !== x.r.txt).length + '건 불일치');
  ok(rows.every(x => x.p.room === 480 && x.r.room === 480),
     '[4-c] ★ 예산이 자릿수·상태 어느 쪽도 안 탄다(늘 480)',
     [...new Set(rows.flatMap(x => [x.p.room, x.r.room]))].join(', '));
  const drift = rows.map(x => Math.abs(x.p.fs - x.r.fs));
  ok(Math.max(...drift) <= 0.01,
     '[4-d] ★ 전 자릿수에서 두 상태의 글자 크기가 같다',
     '최대 편차 ' + Math.max(...drift).toFixed(2) + 'px');
  /* ⚠ 21자리는 828 이 [2-b]·[2-f] 로 갈라 둔 **클램프 바닥(FITMIN fs 28.6)** 이다 — 더 못 줄여서
     잉크가 예산을 8px 넘고 검정 링을 밟는다(버튼 상자 496 안에는 남는다). 849 가 물어야 할 것은
     «바닥이 있는가» 가 아니라 **«그 바닥이 상태마다 다른가»** 이므로, 828 과 같은 자리에서 갈라
     ① 바닥 위는 두 상태 다 예산 안 ② 바닥 줄은 두 상태가 **같은 모양**임을 따로 묻는다. */
  const floorP = rows.filter(x => x.p.labelInk > x.p.room + 0.5);
  const floorR = rows.filter(x => x.r.labelInk > x.r.room + 0.5);
  ok(rows.filter(x => !floorP.includes(x))
         .every(x => x.p.labelInk <= x.p.room + 0.5 && x.r.labelInk <= x.r.room + 0.5),
     '[4-e] 클램프 바닥 위의 모든 자릿수에서 두 상태 다 라벨이 예산 안이다(828 클램프가 회색에서도 산다)',
     (rows.length - floorP.length) + '/' + rows.length + '자리');
  ok(floorP.length === floorR.length &&
     floorP.every(x => Math.abs(x.p.labelInk - x.r.labelInk) <= 0.5 && x.p.labelInk <= x.p.btnW) &&
     floorP.map(x => x.d).join(',') === floorR.map(x => x.d).join(','),
     '[4-f] ★ 바닥(FITMIN)에 닿는 자릿수가 **두 상태에서 같고, 같은 모양**이다'
     + ' — 849 이전에는 예산이 6px 갈려 바닥에 닿는 지점도 상태마다 갈릴 수 있었다',
     floorP.length ? floorP.map(x => `${x.d}자리 회색 ${x.p.labelInk} ↔ 초록 ${x.r.labelInk} / 상자 ${x.p.btnW}`).join(' · ')
                   : '바닥에 닿은 자리 0');

  /* ══ §5 그림 — 링은 레이아웃을 안 움직인다 ═════════════════════════ */
  blk('§5 그림 — inset 링은 레이아웃을 안 움직인다 ⇒ 584 [2-i] 는 그 5 에 안 매여 있었다');
  const G = await ev(() => {
    const btn = document.querySelector('#trTemper .tr-tp.k0 .tb');
    const had = btn.classList.contains('no');
    if (had) btn.classList.remove('no');
    const on = window.__tb849(0);
    btn.classList.add('no');
    const no = window.__tb849(0);
    if (!had) btn.classList.remove('no');
    return { on, no };
  });
  if (!G || G.__err) ok(false, '§5 측정 실패: ' + (G && G.__err));
  else {
    console.log('       초록 아이콘 위 ' + G.on.icTop + ' / 아래 ' + G.on.icBot + ' · x' + G.on.icX
      + ' · 숫자 y' + G.on.numTop + '..' + G.on.numBot);
    console.log('       회색 아이콘 위 ' + G.no.icTop + ' / 아래 ' + G.no.icBot + ' · x' + G.no.icX
      + ' · 숫자 y' + G.no.numTop + '..' + G.no.numBot);
    ok(G.on.btnW === G.no.btnW && G.on.btnH === G.no.btnH && G.on.btnW === 496 && G.on.btnH === 173,
       '[5-a] 버튼 상자가 두 상태에서 같다(496×173 — 769·686 값)',
       `${G.on.btnW}×${G.on.btnH} ↔ ${G.no.btnW}×${G.no.btnH}`);
    ok(Math.abs(G.on.icTop - G.no.icTop) <= 0.1 && Math.abs(G.on.icBot - G.no.icBot) <= 0.1 &&
       Math.abs(G.on.icX - G.no.icX) <= 0.1 && Math.abs(G.on.numTop - G.no.numTop) <= 0.1,
       '[5-b] ★ 아이콘·숫자 좌표가 두 상태에서 Δ0px — `box-shadow:inset` 은 그리기지 자리가 아니다',
       `위 Δ${(G.no.icTop - G.on.icTop).toFixed(1)} · x Δ${(G.no.icX - G.on.icX).toFixed(1)}`
       + ` · 숫자 y Δ${(G.no.numTop - G.on.numTop).toFixed(1)}`);
    /* 584 [2-i] 와 같은 술어(위·아래 ≥5 · |위−아래| ≤3)를 회색에서도 묻는다. */
    ok(G.no.icTop >= 5 && G.no.icBot >= 5 && Math.abs(G.no.icTop - G.no.icBot) <= 3,
       '[5-c] ★ 584 [2-i] 의 세로 대칭이 **회색 상태에서도** 성립한다(그 자는 5 에 안 매여 있었다)',
       `위 ${G.no.icTop} · 아래 ${G.no.icBot}`);
  }

  /* ══ §R 되돌림 시험 ═════════════════════════════════════════════════ */
  blk('§R 되돌림 시험 — `.no` 를 5 로 되돌리면 §3 이 빨개진다');
  const R = await ev(() => {
    const st = document.createElement('style');
    st.id = '__r849';
    st.textContent = '.tr-tp>.tb.no{box-shadow:inset 0 0 0 5px #141414,0 5px 0 #5E594F}';
    document.head.appendChild(st);
    const poor = window.__at(15, 'poor');
    const rich = window.__at(15, 'rich');
    st.remove();
    const backP = window.__at(15, 'poor');
    const backR = window.__at(15, 'rich');
    return { poor, rich, backP, backR };
  });
  if (!R || R.__err) ok(false, '§R 실패: ' + (R && R.__err));
  else {
    console.log('       되돌림: 회색 링 ' + R.poor.ring + ' 예산 ' + R.poor.room + ' fs ' + R.poor.fs
      + '  ↔  초록 링 ' + R.rich.ring + ' 예산 ' + R.rich.room + ' fs ' + R.rich.fs);
    ok(R.poor.ring === 5 && R.poor.room === 486,
       '[R1] 되돌리면 회색 링이 5 로 · 예산이 486 으로 돌아간다(등재문 실측값)',
       `링 ${R.poor.ring} ⇒ 예산 ${R.poor.room}`);
    ok(R.poor.room !== R.rich.room && Math.abs(R.poor.fs - R.rich.fs) > 0.01,
       '[R2] ★ 그러면 §3-c·§3-d 가 빨개진다 — 예산·글자 크기가 다시 상태를 탄다',
       `예산 ${R.poor.room} ↔ ${R.rich.room} · fs ${R.poor.fs} ↔ ${R.rich.fs}`);
    ok(R.backP.ring === 8 && R.backP.room === 486 - 6 &&
       Math.abs(R.backP.fs - R.backR.fs) <= 0.01,
       '[R3] 원복하면 다시 8 · 480 · 같은 글자 크기다(사본이 트리를 안 더럽혔다)',
       `링 ${R.backP.ring} ⇒ 예산 ${R.backP.room} · fs ${R.backP.fs} ↔ ${R.backR.fs}`);
  }

  blk('§Z');
  ok(errs.length === 0, '[Z] 콘솔 런타임 에러 0건', errs.length ? errs.join(' | ') : '0건');

  await ctx.close(); await browser.close();
  console.log('\nVERIFY849 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
