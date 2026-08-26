#!/usr/bin/env node
/* 93 19회차 — **머묾 길이 · 씬A 숫자 롤링 종료** 의 자.
 *
 *   node probe93q.js
 *
 * r19 에서 두 비평가가 독립으로 낸 두 가지를 못 박는다.
 *
 * (가) 머묾 — AV #7 «씬B 324ms(+62%)» · AW #3 «씬A 271ms · 씬B 285ms(+36/43%)». 종전 식은
 *      머묾을 i 마다 120 → 310ms 로 벌려 놓고 있었다(선언 120~200). 19회차에 `FX3_HOLD_F` 로
 *      **전원 공통**으로 바꿨다. 이 자는 «전원 같은가 · 선언 범위 안인가» 를 DOM 이 아니라
 *      **비행 항목의 실제 상태**(f.sd·f.ha)로 잰다.
 *
 * (나) 씬A 숫자 롤링 — AV #14 · AW #11 이 같은 프레임(f14, 1229ms)에서 «표시 128A 인데 아직
 *      1개가 공중» 을 잡았다. 씬B 는 `probe93n [3]` 이 이미 «최종값 정착 → 소등» 으로 재고 있는데
 *      씬A(딤 없음 · 복제판 없음)에는 대응하는 자가 없었다. 여기서 만든다:
 *      **최종 총액이 처음 찍히는 시각 ≥ 마지막 도착 시각.**
 *      («코인이 다 꽂히기 전에 총액이 먼저 밝혀지면 마지막 코인은 이미 다 센 알약에 떨어진다» —
 *        3회차에 «총액을 먼저 내지 마라» 로 이미 한 번 내려진 결정이다.)
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

function launch(){
  const c = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'];
  for(const p of c){ try { if(p && fs.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  return chromium.launch();
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1500);

  const tr = await page.evaluate(async () => {
    S.gold = 0;
    fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
    const p = fxWorld(player.x + 12, player.y - 20);
    fxAt(p);
    const t0 = performance.now();
    S.gold += 128000;
    const nf = () => new Promise(r => requestAnimationFrame(() => r()));
    /* 비행 항목이 생기는 것을 기다렸다가 «설계 구간» 을 통째로 뜬다(퍼짐 끝 sd · 흡수 시작 ha). */
    let holds = null;
    const rows = [];
    let nMax = 0;
    while(performance.now() - t0 < 2400){
      const f = fxFlies.filter(x => x.ui);
      if(f.length && !holds) holds = f.map(x => +((x.ha - x.sd)*1000).toFixed(1));
      if(f.length > nMax) nMax = f.length;
      const g = document.getElementById('goldN');
      rows.push([+(performance.now() - t0).toFixed(1), f.length, g ? g.textContent : '']);
      await nf();
    }
    return { holds, rows, nMax, target: fmt(S.gold),
             decl:[FX3_HOLD0*1000, FX3_HOLD1*1000], f: FX3_HOLD_F*1000 };
  });
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  if(!tr.holds || !tr.holds.length){ console.log('probe93q 실패: 비행 항목을 못 잡았다'); process.exit(1); }

  const H = tr.holds, R = tr.rows;
  const hMin = Math.min(...H), hMax = Math.max(...H);
  /* 마지막 도착 = 공중 아이콘이 처음 0 이 된 프레임 */
  let tLast = null;
  for(const r of R){ if(r[1] === 0 && r[0] > 200){ tLast = r[0]; break; } }
  /* 최종 총액이 «처음» 찍힌 프레임 */
  let tFinal = null;
  for(const r of R){ if(r[2] === tr.target && r[0] > 100){ tFinal = r[0]; break; } }

  console.log(`93 머묾·씬A 롤링 자 (rAF 표본 ${R.length}개 · 공중 최대 ${tr.nMax}개)`);
  console.log(`  · 머묾 실측 ${hMin.toFixed(0)}~${hMax.toFixed(0)}ms (아이콘 ${H.length}개) · 선언 ${tr.decl[0]}~${tr.decl[1]}ms · 공통값 FX3_HOLD_F ${tr.f}ms`);
  console.log(`  · 마지막 도착 ${tLast == null ? '—' : Math.round(tLast)}ms · 최종 총액(«${tr.target}») 첫 표시 ${tFinal == null ? '—' : Math.round(tFinal)}ms`);

  let bad = 0;
  const chk = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name} — ${detail}`); if(!ok) bad++; };
  chk('[1] 머묾이 아이콘마다 다르지 않다',
      hMax - hMin <= 1, `최대 − 최소 = ${(hMax - hMin).toFixed(1)}ms (≤1)`);
  chk('[2] 머묾이 선언 범위(120~200ms) 안',
      hMin >= tr.decl[0] - 1 && hMax <= tr.decl[1] + 1, `${hMin.toFixed(0)}~${hMax.toFixed(0)}ms`);
  chk('[3] 최종 총액이 마지막 도착보다 «먼저» 밝혀지지 않는다',
      tFinal != null && tLast != null && tFinal >= tLast - 40,
      `총액 ${tFinal == null ? '—' : Math.round(tFinal)} − 마지막 도착 ${tLast == null ? '—' : Math.round(tLast)} = ${(tFinal != null && tLast != null) ? Math.round(tFinal - tLast) : '—'}ms (≥ −40 — rAF 한 프레임 여유)`);

  console.log(bad ? `\nPROBE93Q FAIL (${bad}건)` : '\nPROBE93Q PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93q 실패:', e.message); process.exit(1); });
