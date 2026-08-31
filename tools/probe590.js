/* 590 재현 — «전장의 펫이 지금 얼마나 크게 그려지고, 플레이어를 얼마나 가리는가» 를
   제품에게 직접 묻는다 (338 규칙 — 처방 전에 재현. 상수를 고치기 전에 이 자를 먼저 돌렸다).

   재는 자는 `tools/size590lib.js` 한 벌이고 게이트(`verify590`)도 **같은 함수**를 쓴다(385).

   묻는 것 다섯:
     [A] 상수·표 — `PET_DRAW_SC` 가 있는가 · `PET_SP[].scale` 표 값 · 541 세 상수 · `unitSc`
     [B] 펫 3종(bird·robo·dragon) — **찍힌** 배율(dh/sh) · 그려진 잉크 w×h
     [C] 플레이어 — 541 의 ×1.5 가 안 움직였는지(대조군)
     [D] 겹침 — 3마리 장착 · 궤도 한 바퀴(72 표본)에서 플레이어 잉크가 덮이는 비율
     [E] 26/50 시트 썸네일 — 이 행의 범위 밖임을 못박는 대조군(411·492)

   실행: node tools/probe590.js            (작업 트리의 index.html)
         node tools/probe590.js <파일>      (사본 — 수리 전 기준선 측정용)
         node tools/probe590.js --json     (수치만 JSON 으로)                              */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure } = require('./size590lib');
const path = require('path');

const args = process.argv.slice(2);
const JSON_ONLY = args.includes('--json');
const file = args.find(a => !a.startsWith('--'));
const TARGET = file ? path.resolve(file) : path.resolve(__dirname, '..', 'index.html');

const rows = [];
const ok = (t, d) => rows.push(['✓', t, d === undefined ? '' : String(d)]);
const bad = (t, d) => rows.push(['✗', t, String(d)]);

(async () => {
  /* 아틀라스가 file:// 이미지라 캔버스가 «오염» 된다 — getImageData 에 이 플래그가 필요하다 */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + TARGET);
  await page.waitForTimeout(1500);

  const out = await measure(page);

  if (JSON_ONLY) { console.log(JSON.stringify(out, null, 2)); await browser.close(); return; }

  const c = out.consts;
  c.PET_DRAW_SC === null ? bad('[A1] `PET_DRAW_SC` 선언', '없음 — 펫이 541 배율 축 밖에 있다')
                         : ok('[A1] `PET_DRAW_SC` 선언', c.PET_DRAW_SC);
  ok('[A2] `PET_SP[].scale` 표 값(원본이 살아 있는가)',
     `bird ${c.table.bird} · robo ${c.table.robo} · dragon ${c.table.dragon}`);
  ok('[A3] 541 상수 셋', `player ${c.PLAYER_DRAW_SC} · mob ${c.MOB_DRAW_SC} · skill ${c.SK_DRAW_SC}`);
  ok('[A4] `unitSc` 세 갈래', `arena ${c.unitSc.arena} · zombie ${c.unitSc.zombie} · boss ${c.unitSc.boss}`);
  ok('[A5] `PET_SP[].faceRight`(587 의 표 — 이 행은 안 건드린다)',
     `bird ${c.faceRight.bird} · robo ${c.faceRight.robo} · dragon ${c.faceRight.dragon}`);
  ok('[A6] `PET_CD`(481 — 이 행은 안 건드린다)', JSON.stringify(c.petCd));

  for (const sp of ['bird', 'robo', 'dragon']) {
    const m = out.pets[sp];
    m.sc !== null
      ? ok(`[B] ${sp}(${m.def ? m.def.n : '?'}) — 찍힌 배율 ${m.sc}(표 ${c.table[sp]}) · 잉크 ${m.inkW}×${m.inkH} → 그려진 ${m.drawnW}×${m.drawnH}`)
      : bad(`[B] ${sp}`, '프레임이 한 장도 안 찍혔다');
  }

  out.player.sc !== null
    ? ok('[C] 플레이어 — 찍힌 배율 · 그려진 잉크 · r', `${out.player.sc} · ${out.player.drawnW}×${out.player.drawnH} · ${out.player.r}`)
    : bad('[C] 플레이어', 'knight 프레임이 안 찍혔다');

  const o = out.overlap;
  ok('[D1] 궤도 상수(가로 반경 · 세로 반경 · 머리 위)', `${o.orb.x} · ${o.orb.y} · ${o.orb.up}`);
  ok('[D2] 3마리 한 바퀴(72 표본) — 플레이어 잉크가 덮이는 비율 최대 · 평균',
     `${(o.maxCov * 100).toFixed(1)}% · ${(o.meanCov * 100).toFixed(1)}%`);
  ok('[D3] 한 마리가 혼자 덮는 최대', `${(o.maxOne * 100).toFixed(1)}%`);
  ok('[D4] 25% 초과 프레임 · 40% 초과 프레임', `${o.frames25}/${o.n} · ${o.frames40}/${o.n}`);

  ok('[E] 26 시트 슬롯 상자 · `PET_TH`(이 행의 범위 밖 — 411·492)',
     `${out.sheet.slotCss} · ${JSON.stringify(out.sheet.petThumb)}`);

  errs.length ? bad('[F] 콘솔 예외 0건', errs.slice(0, 3).join(' / ')) : ok('[F] 콘솔 예외 0건');

  await browser.close();

  const nBad = rows.filter(r => r[0] === '✗').length;
  console.log('\n=== probe590 — 펫 크기·겹침 재현 ===\n');
  for (const r of rows) console.log(`${r[0]} ${r[1]}${r[2] ? '  →  ' + r[2] : ''}`);
  console.log(`\n${rows.length - nBad}/${rows.length}${nBad ? `  (실패 ${nBad})` : ''}\n`);
  process.exit(nBad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
