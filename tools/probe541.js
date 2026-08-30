/* 541 재현 — «전투 화면에서 지금 무엇이 얼마나 크게 그려지는가» 를 제품에게 직접 묻는다
   (338 규칙 — 처방 전에 재현. 상수를 고치기 전에 이 자를 먼저 돌렸다).

   재는 자는 `tools/size541lib.js` 한 벌이고 게이트(`verify541`)도 **같은 함수**를 쓴다(385).

   묻는 것 여섯:
     [A] 플레이어 — 그리기 배율 · 잉크 · 판정 반경 `player.r`
     [B] 잡몹 3종 — 그리기 배율 · 잉크 · 태어난 개체의 `r`
     [C] 보스 3자리 — 스테이지(`ETYPE.boss`) · 던전(`dunBossType`) · 승급(`promoType`) 역산값
     [D] 아레나 도전자 — 플레이어와 «같은 몸» 규약(123 ④)이 성립하는가
     [E] 스킬 그림 — 캔버스에서 **찍힌 픽셀**(가만히 둔 프레임 ↔ 투사체 한 발 얹은 프레임의 차분)
     [F] 장판·레이저·오라 — «그린 반경» 과 «피해 반경» 이 같은 값인 자리들

   실행: node tools/probe541.js            (작업 트리의 index.html)
         node tools/probe541.js <파일>      (사본 — 수리 전 기준선 측정용. 저장소 루트에 둘 것)
         node tools/probe541.js --json      (수치만 JSON 으로)                              */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure } = require('./size541lib');
const path = require('path');
const fs = require('fs');

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

  out.player.sc !== null ? ok('[A1] 플레이어 그리기 배율(찍힌 dh/sh)', out.player.sc)
                         : bad('[A1] 플레이어 그리기 배율', 'knight 프레임이 한 장도 안 찍혔다');
  ok('[A2] 플레이어 그려진 잉크 w×h (run 최대 프레임)', `${out.player.drawnW}×${out.player.drawnH}`);
  ok('[A3] player.r', out.playerR);
  for (const tk of ['zombie', 'goblin', 'dark']) {
    const m = out.mobs[tk];
    m.sc !== null ? ok(`[B] ${tk} — 배율 ${m.sc}(표 ${m.tsc}) · 잉크 ${m.drawnW}×${m.drawnH} · r ${m.er}(표 ${m.tr})`)
                  : bad(`[B] ${tk}`, '프레임이 안 찍혔다');
  }
  ok('[C1] bossDrawnH / bossRK', `${out.boss.drawnH} / ${out.boss.rk}`);
  ok('[C2] 스테이지 보스 scale·r·잉크H', `${out.boss.stage.sc} · ${out.boss.stage.r} · ${out.boss.stage.ink}`);
  out.boss.dun ? ok('[C3] 던전 보스(역산) scale·r·잉크H', `${out.boss.dun.sc} · ${out.boss.dun.r} · ${out.boss.dun.ink} (${out.boss.dun.id})`)
               : bad('[C3] 던전 보스', 'DUNGEONS 표를 못 찾았다');
  out.boss.promo ? ok('[C4] 승급 수호자(역산) scale·r·잉크H', `${out.boss.promo.sc} · ${out.boss.promo.r} · ${out.boss.promo.ink}`)
                 : bad('[C4] 승급 수호자', 'promoType 없음');
  ok('[D] arena 판정 r ↔ player.r · knight 를 그린 배율 종류',
     `r ${out.arena.r} · player.r ${out.arena.playerR} · 배율 [${out.arena.knightScales.join(', ')}]`);
  for (const k of ['slash', 'shuri', 'ice', 'boom']) {
    out.skill[k] ? ok(`[E] 투사체 «${k}» 잉크(찍힌 픽셀 · 논리 px)`, `${out.skill[k].w}×${out.skill[k].h}`)
                 : bad(`[E] 투사체 «${k}»`, '차분 bbox 를 못 잡았다');
  }
  ok('[F] 그림 = 피해 반경인 자리들',
     `독 ${out.zone.poisonR} · 불 ${out.zone.fireR} · 레이저 ${out.zone.laserW}/${out.zone.laserLen} · 노바 ${out.zone.novaR} · 오라 ${out.zone.auraR}`);
  errs.length ? bad('[콘솔] 페이지 예외 0건', errs.join(' | ')) : ok('[콘솔] 페이지 예외 0건');

  await browser.close();

  if (JSON_ONLY) { console.log(JSON.stringify(out, null, 2)); process.exit(rows.some(r => r[0] === '✗') ? 1 : 0); }
  console.log('\n=== probe541 — 전투 화면 크기 재현 (' + path.basename(TARGET) + ') ===');
  for (const r of rows) console.log(`${r[0]} ${r[1]}${r[2] ? '  →  ' + r[2] : ''}`);
  console.log(`\n${rows.filter(r => r[0] === '✓').length}/${rows.length} 통과`);
  try {
    fs.writeFileSync(path.resolve(__dirname, '..', 'docs', 'review', '.probe541.json'), JSON.stringify(out, null, 2));
    console.log('수치 JSON → docs/review/.probe541.json');
  } catch (_) {}
  process.exit(rows.some(r => r[0] === '✗') ? 1 : 0);
})();
