#!/usr/bin/env node
/* 작업 920 — 안내문 «위:아래» 여백 비의 **자 갈림**을 다시 열지 못하게 하는 게이트.
 *
 *   node tools/verify920.js
 *
 * ── 920 이 지킨 것은 «값» 이 아니라 «어느 자의 값인가» 다 ────────────────────
 * 이 자리의 비는 **자에 따라 답이 둘**이다(같은 레퍼런스 그림에서 U3 0.750 · U1 0.900).
 * 905 가 그 갈림을 닫았고(U1 은 자기 손잡이에서 흔들리고, 두 그림에서 밑판 외곽선의
 * **반대편**을 짚는다 — `verify905` [1][3][4][5]), 제품은 U3 과녁 위로 옮겨졌다.
 *
 * 그런데 **75분 뒤** 879 8회차가 옛 과녁(0.90 · 대역 0.82~1.00)을 실은 브리핑으로 채점을
 * 돌려 같은 자리를 다시 «결함» 으로 냈고, 그 처방(«블록을 1.6px 위로»)이 920 에 인계됐다.
 * 재현(`probe920`)이 그 처방을 기각한다 — 먹이면 1600 이 대역 **밖**(0.895)으로 나간다.
 *
 * ⇒ 920 은 제품을 **0줄** 고치고, 대신 다시 열리는 **길**을 막는다:
 *     [1][5] 제품이 살아 있는 과녁 위에 있고 그것이 화소 격자의 최적점이다(무른 통과가 아니다)
 *     [2][3] 갈림의 크기와 «섞인 짝» 의 기계를 수로 못박는다
 *     [4]    인계된 처방을 **사본에 실제로 먹여** 기각을 증명한다(되돌림 시험)
 *     [6]    은퇴한 과녁을 «살아 있는 과녁» 으로 적은 비평브리핑이 0건 — 다음 회차가
 *            같은 낡은 수를 채점자에게 다시 주면 여기가 빨개진다(이 사고의 **뿌리**다)
 *
 * ⚠ Pillow(python)가 없으면 [1]~[5] 는 «환경» 으로 건너뛴다(641 교훈). [6] 은 파일만 보므로 항상 돈다.
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 assets/** 가 404 라 찍힌 픽셀이 달라진다(905 [R] 선례).
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
const REVIEW = path.join(ROOT, 'docs', 'review');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const TH = 110;

/* 살아 있는 과녁·대역 — 905 가 세우고 **948 이 부분 화소 위에서 다시 세웠다**(`tools/target948.js`).
   905 의 0.750 은 «정수 두 개의 비» 였고 대역의 근거 «±1 눈금» 은 정수 격자의 한 칸이었다. */
const T = require('./target948');
const { REF_RATIO, BAND, INT_RATIO } = T;
/* 887 이 세웠다가 905 가 은퇴시킨 과녁·대역 — 대조용으로만 쓴다(333 처방: 자리를 비우지 않는다) */
const RETIRED_RATIO = T.RETIRED[0].ratio;
const RETIRED_BAND = T.RETIRED[0].band;
/* 879 8회차 채점 2인(EW·EX)이 적은 두 수 — 이 자가 «어느 칸의 값인지» 를 되짚는다 */
const EWEX = { ref: { up: 10, down: 9 }, f1600: { up: 20, down: 15 } };
/* 인계된 처방 — «안내문 블록을 1.6px 위로»(879 8회차 §50) */
const CAP_TOP = 'var(--rw-g3) - var(--rw-i));';
const CAP_TOP_RX = 'var(--rw-g3) - var(--rw-i) - 1.6px);';

let pass = 0, fail = 0;
const ok = (cond, title, got) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${title} — ${got}`);
  cond ? pass++ : fail++;
};

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

const pair = (m) => {
  const d = m.th[TH];
  return {
    /* 948 — 약속의 자는 **부분 화소**다. 정수 칸(`u3.r`)은 대조·계보용으로 남긴다. */
    u3: { up: d.up, down: d.down.B3, r: d.ratio.B3, sub: d.sub.ratio.B3, subUp: d.sub.up, subDn: d.sub.down.B3 },
    u1: { up: d.up_u1, down: d.down.B3, r: d.ratio_u1.B3 },
  };
};
const nm = (p) => path.basename(p).replace(/^v920-(rx-)?|\.png$/g, '');

/* ── [6] 브리핑 위생 — 파일만 보므로 python 없이도 돈다 ────────────────────
   은퇴한 과녁을 적은 브리핑은 **정오 표식**(905 또는 920 · 새 대역 0.67~0.83)을
   같은 파일 안에 달고 있어야 한다. 원문을 지우라는 뜻이 아니다 — 회차 기록은 기록이고,
   지우면 «그때 무엇을 보고 채점했는지» 가 사라진다(333: 자리를 비우지 않는다).
   막는 것은 **그 수가 정오 없이 다음 회차로 복사되는 길**이다. */
function briefingHygiene() {
  const files = fs.readdirSync(REVIEW).filter(f => f.includes('비평브리핑') && f.endsWith('.md'));
  const bad = [];
  const hit = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(REVIEW, f), 'utf8');
    const carries = t.includes(RETIRED_BAND) || /아래÷위\s*0\.90\b/.test(t) || /확정값[^\n]*0\.90\b/.test(t);
    if (!carries) continue;
    hit.push(f);
    /* 948 — 대역 0.67~0.83 도 이제 은퇴했다(정수 격자 위에서 세운 값). 그 뒤 브리핑은
       948 이나 새 대역을 적어도 «정오 달림» 으로 읽는다 — 표식을 좁혀 옛 기록을 빨갛게
       만들 이유가 없다(333: 자리를 비우지 않는다). */
    const corrected = /905/.test(t) || /948/.test(t) || /0\.67~0\.83/.test(t) ||
                      new RegExp(BAND[0] + '~' + BAND[1]).test(t);
    if (!corrected) bad.push(f);
  }
  ok(bad.length === 0,
    '[6] 은퇴한 과녁(0.90 · 대역 0.82~1.00)을 실은 비평브리핑은 전부 **정오 표식**(905/920 · 0.67~0.83)을 달고 있다',
    `브리핑 ${files.length}장 중 옛 수를 실은 것 ${hit.length}장` +
    (hit.length ? ` (${hit.join(' · ')})` : '') +
    ` · 정오 없는 것 ${bad.length}장` + (bad.length ? ` ← ${bad.join(' · ')}` : ''));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let scan = null;
  const shots = [];
  try {
    const browser = await launch(chromium);
    for (const fh of FRAMES) {
      const f = path.join(OUT, `v920-${fh}.png`);
      await shoot(browser, f, fh, URL);
      shots.push(f);
    }
    await browser.close();
    scan = json(py(['--json', ...shots]));
  } catch (e) {
    console.error('VERIFY920 — [1]~[5] SKIP: Pillow(python) 없음이거나 자가 죽었다: ' + (e.message || e).split('\n')[0]);
    console.error('  준비: pip install pillow   (641 — 저장소 결함이 아니라 컨테이너 의존이다)');
    briefingHygiene();
    console.log(`\nVERIFY920 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS (일부 SKIP — 환경)'}`);
    process.exit(fail ? 1 : 3);
  }

  const R = pair(scan.ref);
  const C = scan.caps.map(c => ({ name: nm(c.path), ...pair(c) }));
  const f1600 = C.find(c => c.name === '1600');

  /* ── [1] 제품은 **살아 있는 자**의 과녁 위에 있다 ── */
  {
    const vals = C.map(c => c.u3.sub);
    ok(vals.every(v => v >= BAND[0] && v <= BAND[1]),
      `[1] 제품의 아래/위 비가 **살아 있는 과녁**(948 · 부분 화소 ${REF_RATIO} · 대역 ${BAND[0]}~${BAND[1]}) 안 — 다섯 프레임`,
      C.map(c => `${c.name}:${c.u3.sub.toFixed(4)}`).join(' · ') +
      ' · 정수 걸음으로는 ' + C.map(c => c.u3.r.toFixed(3)).join('/'));
  }

  /* ── [2] 갈림의 크기 — 같은 레퍼런스 그림에서 두 자가 두 답을 낸다 ── */
  {
    const gap = Math.abs(R.u1.r - R.u3.r) / R.u3.r * 100;
    /* 948 — 이 항이 견주는 두 값은 **둘 다 정수 칸**이다(U1 은 부분 화소 판이 없다).
       그래서 과녁이 아니라 `INT_RATIO` 로 못박는다 — 자를 두 곳에 두지 않으려면
       «어느 축의 값인지» 를 이름으로 밝혀야 한다. */
    ok(Math.abs(R.u3.r - INT_RATIO) < 0.005 && Math.abs(R.u1.r - RETIRED_RATIO) < 0.005 && gap > 15,
      '[2] **자 갈림은 의견이 아니라 20%다** — 같은 ref 그림에서(정수 칸) U3 0.750 ↔ U1 0.900',
      `ref U3 ${R.u3.r.toFixed(3)}(위 ${R.u3.up}:아래 ${R.u3.down}) ↔ U1 ${R.u1.r.toFixed(3)}(위 ${R.u1.up}:아래 ${R.u1.down}) · 차 ${gap.toFixed(1)}%`);
  }

  /* ── [3] ⚑ 879 8회차의 두 수는 «두 자를 섞은 짝» 이다 ──
     ref 쪽은 U1 칸에서, 우리 쪽은 U3 칸에서 왔다(위 끝점이 프레임 격자에서 ±1 흔들리므로
     허용 1px). 한 규약으로 재면 그 −17% 는 만들어지지 않는다. */
  {
    const refIsU1 = R.u1.up === EWEX.ref.up && R.u1.down === EWEX.ref.down;
    const refNotU3 = R.u3.up !== EWEX.ref.up;
    const oursIsU3 = Math.abs(f1600.u3.up - EWEX.f1600.up) <= 1 && f1600.u3.down === EWEX.f1600.down;
    const oursNotU1 = Math.abs(f1600.u1.up - EWEX.f1600.up) > 1;
    ok(refIsU1 && refNotU3 && oursIsU3 && oursNotU1,
      '[3] ⚑ 879 8회차 두 수의 출처 — **ref 는 U1 칸 · 우리는 U3 칸**(두 자를 한 비에 섞었다)',
      `그들의 ref 10:9 = ref U1 ${R.u1.up}:${R.u1.down}(U3 는 ${R.u3.up}:${R.u3.down}) · ` +
      `그들의 1600 20:15 = 우리 U3 ${f1600.u3.up}:${f1600.u3.down}(U1 은 ${f1600.u1.up}:${f1600.u1.down})`);
  }

  /* ── [4] ⚑⚑ 인계된 처방을 **사본에 실제로 먹인다** — 되돌림 시험 ── */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    let out = null, note = '';
    if (!src.includes(CAP_TOP)) {
      note = `처방을 먹일 자리를 못 찾았다(${CAP_TOP})`;
    } else {
      const rx = path.join(ROOT, `.v920-rx-${process.pid}.html`);
      fs.writeFileSync(rx, src.replace(CAP_TOP, CAP_TOP_RX));
      const b2 = await launch(chromium);
      const rxShots = [];
      for (const fh of FRAMES) {
        const f = path.join(OUT, `v920-rx-${fh}.png`);
        await shoot(b2, f, fh, 'file://' + rx.replace(/\\/g, '/'));
        rxShots.push(f);
      }
      await b2.close();
      fs.unlinkSync(rx);
      out = json(py(['--json', ...rxShots])).caps.map(c => ({ name: nm(c.path), ...pair(c) }));
    }
    const outside = out ? out.filter(c => c.u3.sub < BAND[0] || c.u3.sub > BAND[1]) : [];
    const worse = out ? out.every(c => {
      const now = C.find(x => x.name === c.name);
      return Math.abs(c.u3.sub - REF_RATIO) > Math.abs(now.u3.sub - REF_RATIO);
    }) : false;
    ok(!!out && outside.length >= 1 && worse,
      '[4] ⚑⚑ 인계된 처방(«블록을 1.6px 위로»)은 **기각**된다 — 먹이면 1600 이 대역 밖으로 나가고 다섯 프레임 전부 과녁에서 멀어진다',
      note || out.map(c => `${c.name}:${c.u3.sub.toFixed(4)}${(c.u3.sub < BAND[0] || c.u3.sub > BAND[1]) ? '(밖)' : ''}`).join(' · ') +
      ` · 대역 밖 ${outside.length}/${out.length} · 다섯 다 과녁에서 더 멀어짐 ${worse ? 'O' : 'X'}`);
  }

  /* ── [5] ⚑⚑ 948 이 갈아 끼운 항 — **비는 척도 불변이라 «둘 다 줄어든 것» 을 못 본다** ──
     905 판의 이 항은 «1600 의 0.714 는 화소 격자의 **최근접 칸**이다» 라는 정수 논변이었고,
     932 7회차가 자를 부분 화소로 갈면서 그 «칸» 이 없어져 **뜻이 뒤집혔다**(등재문 948 ③).
     자리를 비우지 않고(333) 같은 물음(«대역을 넓혀 통과시킨 것 아닌가»)에 더 센 답을 놓는다:
     1600 은 비로는 다섯 중 과녁에 **가장 가깝지만**, 절대 여백으로는 **가장 멀다** —
     813 이 짧은 프레임에서 `--rw-g3` 를 압축해 위·아래가 **같이** 3.0px 줄었고 비는 그것을 못 본다.
     ⇒ 등재문의 «나머지 넷이 1600 을 따라가야 한다» 는 여기서 기각된다. */
  {
    const K = scan.ref.k;                       /* ref px → 프레임 px */
    const rUp = R.u3.subUp * K, rDn = R.u3.subDn * K;
    const dev = (c) => ({ up: c.u3.subUp / rUp - 1, dn: c.u3.subDn / rDn - 1 });
    const fLong = C.find(c => c.name !== '1600');
    const d16 = dev(f1600), dL = dev(fLong);
    const ratioCloser = Math.abs(f1600.u3.sub - REF_RATIO) < Math.abs(fLong.u3.sub - REF_RATIO);
    const absFarther = Math.abs(d16.up) > Math.abs(dL.up) && Math.abs(d16.dn) > Math.abs(dL.dn);
    ok(ratioCloser && absFarther,
      '[5] 1600 은 **비로만 가깝다** — 절대 여백으로는 다섯 중 가장 멀다(대역을 넓혀 통과시킨 것이 아니다)',
      `ref 위 ${rUp.toFixed(2)} · 아래 ${rDn.toFixed(2)} 프레임px | ` +
      `1600 비 ${f1600.u3.sub.toFixed(4)}(과녁 대비 ${((f1600.u3.sub / REF_RATIO - 1) * 100).toFixed(2)}%) 인데 ` +
      `위 ${(d16.up * 100).toFixed(1)}% · 아래 ${(d16.dn * 100).toFixed(1)}% | ` +
      `긴 넷 비 ${fLong.u3.sub.toFixed(4)} · 위 ${(dL.up * 100).toFixed(1)}% · 아래 ${(dL.dn * 100).toFixed(1)}%`);
  }

  /* ── [6] 브리핑 위생 — 이 사고의 뿌리 ── */
  briefingHygiene();

  console.log(`\nVERIFY920 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
