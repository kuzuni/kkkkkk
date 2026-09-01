#!/usr/bin/env node
/* 재현기 — 작업 641 「`verify561` [C6] 게이트 부패 (`--icsx` 3칸이 356 11회차에 사라졌다)」
 *
 *   node tools/probe641.js   → 마지막 줄이 `PROBE641 n/n PASS` 여야 한다.
 *
 * 338 규칙(처방 전에 재현부터)대로 «등재문의 가설» 을 **찍힌 값**으로 확인한다.
 *   [1] 지금 `verify561` [C6] 이 무엇을 읽는가 — 세 슬롯의 `--icsx` 가 정말 빈 문자열인가.
 *   [2] 그 빈 값이 «변수만 사라진 것» 인가 «상자가 움직인 것» 인가 — [C1]~[C5] 축(48×48 · left 16 ·
 *       top 8 · `--icfs`)은 그대로여야 한다. 그래야 561 의 «밑줄만 껐다» 는 뜻이 아직 참이다.
 *   [3] 사라진 자리에 무엇이 들어왔는가 — 356 이 넣은 **등방** 배율 `--icsc`.
 *   [4] `transform` 에 비균등 축(scaleX/scaleY 단독)이 한 자리도 안 남았는가 = 356 규약.
 *   [5] 소스에도 `--icsx` 선언이 0건인가(computed 만 보면 «상속으로 비어 보이는» 자리를 못 가른다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m + (d !== undefined ? '  — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 56 절전 화면을 연다 — verify561 과 **같은 경로**(▦ → 절전) */
  await page.evaluate(() => {
    document.getElementById('menub').click();
    document.querySelector('#mnw [data-mn="saver"]').click();
  });
  await page.waitForTimeout(700);

  const slots = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r>u')].map((u, i) => {
    const cs = getComputedStyle(u);
    return { i: i + 1,
             icsx: cs.getPropertyValue('--icsx').trim(),
             icsc: cs.getPropertyValue('--icsc').trim(),
             icfs: cs.getPropertyValue('--icfs').trim(),
             tr: cs.transform,
             left: u.offsetLeft, top: u.offsetTop,
             w: +cs.width.replace('px', ''), h: +cs.height.replace('px', '') };
  }));

  console.log('--- 세 슬롯 실측 ---');
  slots.forEach(s => console.log(`  슬롯${s.i} --icsx="${s.icsx}" --icsc="${s.icsc}" --icfs="${s.icfs}" box ${s.w}x${s.h} @(${s.left},${s.top})`));

  /* [1] 가설 확인 — [C6] 이 읽는 값이 셋 다 빈 문자열이다 */
  ok(slots.length === 3, '[1a] 슬롯이 3개다', slots.length);
  ok(slots.every(s => s.icsx === ''), '[1b] `--icsx` 3칸이 전부 빈 값 = [C6] 의 (.706 · .862 · .833) 은 재현 불가',
     slots.map(s => JSON.stringify(s.icsx)).join(' · '));

  /* [2] 상자는 안 움직였다 — 561 의 «밑줄만 껐다» 는 아직 참이다 */
  slots.forEach(s => {
    ok(Math.abs(s.w - 48) <= 0.01 && Math.abs(s.h - 48) <= 0.01, `[2-${s.i}a] 슬롯 ${s.i} 상자 48×48`, `${s.w}x${s.h}`);
    ok(Math.abs(s.left - 16) <= 0.01 && Math.abs(s.top - 8) <= 0.01, `[2-${s.i}b] 슬롯 ${s.i} left16/top8`, `${s.left},${s.top}`);
  });
  ok(slots[0].icfs === '39.3px' && slots[1].icfs === '40.2px' && slots[2].icfs === '42px',
     '[2c] `--icfs` 3칸은 그대로다 = 사라진 것은 `--icsx` 하나뿐', slots.map(s => s.icfs).join(' · '));

  /* [3] 그 자리에 들어온 것 — 356 의 등방 배율 */
  ok(slots[0].icsc === '.89744' && slots[1].icsc === '.93333',
     '[3a] 1·2 슬롯에 등방 `--icsc` 가 있다(.89744 · .93333)', slots.slice(0, 2).map(s => s.icsc).join(' · '));
  ok(slots[2].icsc === '', '[3b] 3 슬롯(이미지)은 배율 없이 `.cic` 가 45×47 을 직접 쓴다', JSON.stringify(slots[2].icsc));

  /* [4] 356 규약 — 이 화면 슬롯의 transform 에 비균등 축이 없다(a === d) */
  slots.forEach(s => {
    const m = /matrix\(([^)]+)\)/.exec(s.tr);
    const v = m ? m[1].split(',').map(Number) : null;
    ok(!v || Math.abs(v[0] - v[3]) <= 1e-6,
       `[4-${s.i}] 슬롯 ${s.i} transform 이 등방이다(a === d)`, v ? `a=${v[0]} d=${v[3]}` : s.tr);
  });

  /* [5] 소스 선언 0건 */
  /* ⚠ 주석을 걷어내고 센다 — 356 11회차가 «무엇을 왜 지웠는지» 를 주석에 «죽은 `--icsx:.833`»
     이라고 적어 뒀다. 날 문자열로 세면 그 설명문이 선언으로 잡혀 [5] 가 헛빨강이 된다. */
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const decl = (bare.match(/--icsx\s*:/g) || []).length;
  const inCmt = (src.match(/--icsx\s*:/g) || []).length - decl;
  ok(decl === 0, '[5] 주석 밖 `--icsx:` 선언 0건 = 356 11회차가 «죽은 재료» 로 지운 그 값이다',
     `선언 ${decl}건 · 주석 안 설명 ${inCmt}건`);

  /* ── §R 되돌림 시험 — 갈아 끼운 [C6]·[C6b] 가 «무르게 푼 수리» 가 아님을 못박는다 ──────
     항을 그냥 지웠으면 아래 둘 다 초록으로 통과했을 자리다. */
  const R = async (css) => page.evaluate((c) => {
    const st = document.createElement('style'); st.id = 'r641'; st.textContent = c;
    document.head.appendChild(st);
    return [...document.querySelectorAll('#svw .sv-r>u')].map((u) => {
      const cs = getComputedStyle(u);
      const m = /matrix\(([^)]+)\)/.exec(cs.transform);
      const v = m ? m[1].split(',').map(Number) : null;
      return { icsx: cs.getPropertyValue('--icsx').trim(),
               iso: !v || Math.abs(v[0] - v[3]) <= 1e-6 };
    });
  }, css);
  const unR = () => page.evaluate(() => { const e = document.getElementById('r641'); if (e) e.remove(); });

  /* R1 — 옛 관행(변수 그대로)을 되살리면 [C6] 이 빨개진다 */
  const r1 = await R('#svw .sv-r>u{--icsx:.706}');
  ok(r1.some(s => s.icsx !== ''), '[R1] `--icsx` 를 도로 선언하면 [C6]〈3칸 0건〉이 빨개진다',
     r1.map(s => JSON.stringify(s.icsx)).join(' · '));
  await unR();

  /* R2 — **이름을 바꿔 단** 비균등 배율도 [C6b] 가 잡는다. [C6] 하나만 있었으면 여기서 초록이다. */
  const r2 = await R('#svw .sv-r>u{transform:scaleX(.706) !important}');
  ok(r2.some(s => !s.iso), '[R2] 다른 이름으로 scaleX 를 달아도 [C6b]〈등방〉이 빨개진다 = [C6] 만으로는 못 잡는 자리',
     r2.map(s => (s.iso ? '등방' : '비균등')).join(' · '));
  await unR();

  /* R3 — 걷어내면 원래대로 초록 */
  const r3 = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r>u')].map((u) => {
    const cs = getComputedStyle(u);
    const m = /matrix\(([^)]+)\)/.exec(cs.transform);
    const v = m ? m[1].split(',').map(Number) : null;
    return { icsx: cs.getPropertyValue('--icsx').trim(), iso: !v || Math.abs(v[0] - v[3]) <= 1e-6 };
  }));
  ok(r3.every(s => s.icsx === '' && s.iso), '[R3] 사본을 걷어내면 다시 «0건 · 등방» 이다',
     r3.map(s => (s.iso ? '등방' : '비균등')).join(' · '));

  console.log('\nPROBE641 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
