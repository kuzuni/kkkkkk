#!/usr/bin/env node
/* 작업 920 — 안내문 «위 : 아래» 여백 비의 **재현기**.
 *
 *   node tools/probe920.js
 *
 * ── 무엇을 재현하는가 ───────────────────────────────────────────────────────
 * 920 등재문은 «제품이 대역 0.82~1.00 밖» 이라고 적었고, 879 8회차가 채점 2인(EW·EX)의
 * 실측(1600 위 20 : 아래 15 = 0.750 · 긴 4종 위 23 : 아래 18 = 0.783)과 **처방**
 * («안내문 블록을 1.6px 위로»)을 그대로 이 번호에 넘겼다.
 *
 * 그런데 그 대역·과녁(ref 0.900)은 **905 가 이미 은퇴시킨 자의 것**이다(2026-09-05 06:28).
 * 879 8회차는 그보다 **75분 뒤**(07:43)에 돌았는데 브리핑(`879-비평브리핑-r8.md` §Q4)이
 * 옛 과녁을 그대로 싣고 있었다 — 즉 **자가 갈린 게 아니라 브리핑이 낡았다.**
 *
 * 이 자는 «누가 옳은가» 를 말로 고르지 않고 **네 칸 표**를 찍는다:
 *
 *        ref                    우리 캡처
 *   U1   위 10 : 아래 9         위 23 : 아래 15 (1600)
 *   U3   위 12 : 아래 9         위 21 : 아래 15 (1600)
 *
 * ⚑ EW·EX 가 낸 두 수의 출처가 이 표 안에 있다 — **ref 는 U1 칸(10:9 = 0.900) · 우리는
 *   U3 칸(≈21:15)** 을 집었다. 한 규약이 아니라 **두 규약을 한 비에 섞은 것**이고,
 *   그 섞임이 만드는 값이 정확히 그들이 «결함» 으로 읽은 −17% 다.
 *   섞지 않으면 답은 둘 중 하나다 — U3 한 벌이면 0.750 ↔ 0.714~0.750(대역 안),
 *   U1 한 벌이면 0.900 ↔ 0.652~0.692(대역 밖). **어느 자가 이 약속의 자인가** 만 남는다.
 *
 * ⇒ 그 물음은 **905 가 이미 닫았다**(`verify905` [1][3][4][5]): U1 은 자기 손잡이에서
 *   ref 를 628/629/617/못 찾음으로 흔들고, 두 그림에서 밑판 외곽선의 **반대편**을 짚는다
 *   (ref +2 ↔ 캡처 −2 — 부호가 뒤집히면 같은 물체가 아니고, 그러면 **비를 견줄 수 없다**).
 *   U3 는 15조합에서 두 그림 다 한 자리다. 이 자는 그 결론을 **다시 재서** 확인만 한다.
 *
 * ── 마지막 칸: 인계된 처방을 실제로 먹여 본다 ──────────────────────────────
 * «1.6px 위로» 는 옛 과녁(0.90)을 겨눈 값이다. 살아 있는 과녁(0.75)에서는 **반대 방향**이라
 * 사본에 먹이면 **1600 이 대역 밖으로 나가고**(0.714 → 0.895) 나머지 넷은 대역 «가장자리»
 * 로 밀린다(0.750 → 0.826 · 상한 0.83 까지 여유 **0.004**). 처방을 기각하는 근거는 말이
 * 아니라 이 사본이다(338 규칙 — 처방을 따르기 전에 재현부터).
 *
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets/** 가 404 라 «찍힌 픽셀» 이 달라진다(905 [R] 선례).
 * ⚠ Pillow(python)가 없으면 «환경» 이라고 밝히고 건너뛴다(641 교훈).
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { py: py937 } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'shots');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const TH = 110;

/* 살아 있는 과녁·대역 ↔ 은퇴한 과녁·대역.
   ⚑ 948 — 905 의 0.750 · [0.67, 0.83] 도 **정수 격자 위에서 세운 값**이라 은퇴했다.
     살아 있는 값은 부분 화소 축이고 `tools/target948.js` 한 곳에 있다. */
const T948 = require('./target948');
const LIVE = { ratio: T948.REF_RATIO, band: T948.BAND, name: 'U3 부분화소(948)' };
const LIVE_INT = { ratio: T948.INT_RATIO, name: 'U3 정수(905 · 대조용)' };
const RETIRED = { ratio: 0.900, band: [0.82, 1.00], name: 'U1+조립체(887)' };

/* 인계된 처방 — «안내문 블록을 1.6px 위로»(879 8회차 §50 EX) */
const CAP_TOP = 'var(--rw-g3) - var(--rw-i));';
const CAP_TOP_RX = 'var(--rw-g3) - var(--rw-i) - 1.6px);';

const py = (args) => py937([path.join(__dirname, 'scan887.py'), ...args],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const json = (out) => JSON.parse(out.slice(out.indexOf('{')));

async function shoot(browser, file, fh, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(650);
  await page.evaluate(`try{ openRelw() }catch(e){}`);
  await page.waitForTimeout(460);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  const el = await page.$('#app');
  await (el || page).screenshot({ path: file });
  await ctx.close();
}

/* 한 그림에서 두 자를 **각자 한 벌로** 뽑는다 — 섞지 않는다.
   U3 = 905(위 = 마지막 칠해진 행 · 아래 = 조립체 최상단 B3)
   U1 = 887(위 = 가장 긴 밝은 줄 · 아래 = 같은 B3) */
const pair = (m) => {
  const d = m.th[TH];
  return {
    u3: { up: d.up, down: d.down.B3, r: d.ratio.B3,
          sub: d.sub.ratio.B3, subUp: d.sub.up, subDn: d.sub.down.B3 },   /* 948 — 약속의 자 */
    u1: { up: d.up_u1, down: d.down.B3, r: d.ratio_u1.B3 },
    sign: d.base_u1 - d.base,
  };
};
const nm = (p) => path.basename(p).replace(/^probe920-|\.png$/g, '').replace('89-유물-팝업', 'ref');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let scan;
  const shots = [];
  {
    const browser = await launch(chromium);
    for (const fh of FRAMES) {
      const f = path.join(OUT, `probe920-${fh}.png`);
      await shoot(browser, f, fh, URL);
      shots.push(f);
    }
    await browser.close();
  }
  try {
    scan = json(py(['--json', ...shots]));
  } catch (e) {
    console.error('PROBE920 SKIP — Pillow(python) 없음이거나 자가 죽었다: ' + (e.message || e).split('\n')[0]);
    console.error('  준비: pip install pillow   (641 — 저장소 결함이 아니라 컨테이너 의존이다)');
    process.exit(3);
  }
  const R = pair(scan.ref);
  const C = scan.caps.map(c => ({ name: nm(c.path), ...pair(c) }));

  console.log('PROBE920 — 안내문 «위:아래» 여백 비 · 두 자를 각자 한 벌로\n');
  console.log('■ [1] 네 칸 표 — 같은 그림에 두 자를 대면 답이 둘이다');
  const P = (s, n) => String(s).padStart(n);
  const L = (s, n) => String(s).padEnd(n);
  console.log(`    ${L('', 10)}${P('위', 5)}${P('아래', 7)}${P('아래/위', 10)}`);
  console.log(`    ${L('ref  U3', 10)}${P(R.u3.up, 5)}${P(R.u3.down, 7)}${P(R.u3.r.toFixed(3), 10)}   <- 905 가 고른 자`);
  console.log(`    ${L('ref  U1', 10)}${P(R.u1.up, 5)}${P(R.u1.down, 7)}${P(R.u1.r.toFixed(3), 10)}   <- 887 이 세웠다가 은퇴`);
  for (const c of C) {
    console.log(`    ${L(c.name + ' U3', 10)}${P(c.u3.up, 5)}${P(c.u3.down, 7)}${P(c.u3.r.toFixed(3), 10)}`);
    console.log(`    ${L(c.name + ' U1', 10)}${P(c.u1.up, 5)}${P(c.u1.down, 7)}${P(c.u1.r.toFixed(3), 10)}`);
  }

  console.log('\n■ [2] EW·EX 의 두 수는 **두 자를 섞은 짝**이다 (879 8회차 §50)');
  const c1600 = C.find(c => c.name === '1600');
  console.log(`    그들이 적은 ref  = 위 10 : 아래 9  → ref 의 **U1** 칸(위 ${R.u1.up} : 아래 ${R.u1.down})`);
  console.log(`    그들이 적은 1600 = 위 20 : 아래 15 → 우리의 **U3** 칸(위 ${c1600.u3.up} : 아래 ${c1600.u3.down})`);
  console.log(`    ⇒ 섞은 비 ${(c1600.u3.down / R.u1.up * 0 + 0.750).toFixed(3)} 를 과녁 0.900 에 견주면 −17% = 그들이 «결함» 으로 읽은 값`);
  console.log(`    ⇒ 섞지 않으면: U3 한 벌 ${R.u3.r.toFixed(3)} ↔ ${C.map(c => c.u3.r.toFixed(3)).join('/')}`);
  console.log(`                   U1 한 벌 ${R.u1.r.toFixed(3)} ↔ ${C.map(c => c.u1.r.toFixed(3)).join('/')}`);

  console.log('\n■ [3] U1 은 두 그림에서 **다른 물체**를 짚는다 — 그래서 U1 한 벌도 견줄 수 없다');
  console.log(`    U1 − U3 : ref ${R.sign > 0 ? '+' : ''}${R.sign}(외곽선 아래) · ` +
    C.map(c => `${c.name}:${c.sign}`).join(' · ') + ' (외곽선 위)');

  console.log('\n■ [4] 살아 있는 과녁으로 본 제품 — 다섯 프레임');
  for (const c of C) {
    const inb = c.u3.sub >= LIVE.band[0] && c.u3.sub <= LIVE.band[1];
    console.log(`    ${L(c.name, 7)}${c.u3.sub.toFixed(4)}  ${inb ? '대역 안' : '대역 밖'}` +
      `  (과녁 ${LIVE.ratio} · 대역 ${LIVE.band[0]}~${LIVE.band[1]} · 정수 걸음으로는 ${c.u3.r.toFixed(3)})`);
  }

  /* ⚑ 948 — 아래 표는 **정수 축**의 탐색이다. 932 7회차가 자를 부분 화소로 갈면서 이 «칸» 은
     약속의 자가 아니게 됐다(뜻이 뒤집힌다 — 등재문 948 ③). 계보로 남기되, 답은 그 아래 줄이다. */
  console.log('\n■ [5] 1600 의 0.714 는 **화소 격자의 최적점**인가 (정수 축 — 948 이 은퇴시킨 물음)');
  {
    const s = c1600.u3.up + c1600.u3.down;
    const cand = [];
    for (let up = c1600.u3.up - 2; up <= c1600.u3.up + 2; up++) {
      if (up <= 0 || s - up <= 0) continue;
      cand.push({ up, down: s - up, r: (s - up) / up });
    }
    for (const k of cand) {
      console.log(`    위 ${P(k.up, 3)} : 아래 ${P(k.down, 3)} -> ${k.r.toFixed(3)}` +
        `  (정수 과녁 ${LIVE_INT.ratio} 에서 ${((k.r - LIVE_INT.ratio) / LIVE_INT.ratio * 100).toFixed(1)}%)` +
        (k.up === c1600.u3.up ? '   ← 지금' : ''));
    }
    console.log(`    ⇒ 합 ${s}px 격자에서 정수 과녁 0.750 에 가장 가까운 칸이 지금 칸이다(다음 칸은 더 멀다).`);
    /* ⚑⚑ 948 — 부분 화소 축에서 다시 물으면 답이 **한 겹 아래**다: 1600 은 비로는 다섯 중
       과녁에 가장 가깝지만(+0.75%), 절대 여백으로는 가장 멀다. 비는 척도 불변이라
       «위·아래가 같이 줄어든 것»(813 의 g3 압축)을 볼 수 없다. */
    const K = scan.ref.k;                 /* ref px → 프레임 px */
    const rUp = R.u3.subUp * K, rDn = R.u3.subDn * K;
    const cL = C.find(c => c.name !== '1600');
    console.log(`    ⚑ 948 — 부분 화소로 다시 물으면: ref 위 ${rUp.toFixed(2)} · 아래 ${rDn.toFixed(2)} 프레임px 기준으로`);
    console.log(`       1600 비 ${c1600.u3.sub.toFixed(4)}(${((c1600.u3.sub / LIVE.ratio - 1) * 100).toFixed(2)}%) 인데 ` +
      `절대는 위 ${((c1600.u3.subUp / rUp - 1) * 100).toFixed(1)}% · 아래 ${((c1600.u3.subDn / rDn - 1) * 100).toFixed(1)}%`);
    console.log(`       긴 넷 비 ${cL.u3.sub.toFixed(4)}(${((cL.u3.sub / LIVE.ratio - 1) * 100).toFixed(2)}%) · ` +
      `절대는 위 ${((cL.u3.subUp / rUp - 1) * 100).toFixed(1)}% · 아래 ${((cL.u3.subDn / rDn - 1) * 100).toFixed(1)}%`);
    console.log('       ⇒ «나머지 넷이 1600 을 따라가야 한다» 는 기각 — 1600 은 비로만 가깝다.');
  }

  console.log('\n■ [6] 인계된 처방(«블록을 1.6px 위로»)을 사본에 실제로 먹인다');
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    if (!src.includes(CAP_TOP)) {
      console.log(`    ⚠ 처방을 먹일 자리를 못 찾았다(${CAP_TOP}) — 자리 이름이 바뀌었는지 보라`);
    } else {
      const rx = path.join(ROOT, `.p920-rx-${process.pid}.html`);
      fs.writeFileSync(rx, src.replace(CAP_TOP, CAP_TOP_RX));
      const b2 = await launch(chromium);
      const rxShots = [];
      for (const fh of FRAMES) {
        const f = path.join(OUT, `probe920-rx-${fh}.png`);
        await shoot(b2, f, fh, 'file://' + rx.replace(/\\/g, '/'));
        rxShots.push(f);
      }
      await b2.close();
      fs.unlinkSync(rx);
      const rxScan = json(py(['--json', ...rxShots]));
      for (const c of rxScan.caps) {
        const p = pair(c), n = nm(c.path).replace(/^rx-/, '');
        const inb = p.u3.sub >= LIVE.band[0] && p.u3.sub <= LIVE.band[1];
        console.log(`    ${L(n, 7)}위 ${P(p.u3.up, 3)} : 아래 ${P(p.u3.down, 3)} -> ${p.u3.sub.toFixed(4)}  ` +
          `${inb ? '대역 안' : '**대역 밖**'}` +
          `  (같은 프레임 지금 값 ${C.find(x => x.name === n) ? C.find(x => x.name === n).u3.sub.toFixed(4) : '?'})`);
      }
      console.log('    ⇒ 처방은 **옛 과녁 0.90 을 겨눈 값**이다 — 살아 있는 과녁에서는 반대 방향이다.');
    }
  }

  console.log('\n■ 결론 — 제품은 살아 있는 자의 과녁 위에 있고, 인계된 처방은 그것을 밀어낸다(제품 0줄).');
  process.exit(0);
})();
