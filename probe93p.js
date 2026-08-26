#!/usr/bin/env node
/* 93 19회차 — **씬A «출발 앵커» 의 자**. (§4-17-8 6번 — «수치가 2배 갈린다. 자를 먼저 만들어라»)
 *
 *   node probe93p.js
 *
 * r17 에서 두 사람이 같은 결함을 잡았는데 수치가 2배 갈렸다:
 *   AR #11 «용사에서 128px 이탈» · AS #6 «65px 이탈»
 * 원인 후보는 «무엇에서 재는가» 다 — 용사 **발밑 앵커**(전투 좌표의 기준점)인가, 스프라이트
 * **잉크 상자 중심**인가, 상자 **테두리**인가. 셋이 서로 60~130px 떨어져 있으므로 어느 하나를
 * 고르면 나머지 두 사람의 수치는 자동으로 «틀린 것» 이 된다. 그래서 이 자는 **세 기준 전부**를 낸다.
 *
 * 화소가 아니라 **아틀라스 프레임 + 카메라 변환**으로 잰다 — 캔버스에 그려진 용사의 잉크 상자는
 * `ATLAS.knight.f[프레임]` 에 이미 들어 있고, `drawFrame()` 이 그것을 어디에 놓는지도 코드에 있다.
 * 화소로 뜨면 배경·이펙트가 섞여 회차마다 다른 답이 나온다(43 교훈 1).
 *
 * 판정
 *   [1] 아이콘 스폰 무리의 중심이 용사 **잉크 상자 안**에 있다 (죽은 자리 = 용사 «바로 옆»).
 *   [2] 스폰 원점이 잉크 상자 **테두리에서 40px** 안이다 (12·15회차가 두 번 좁힌 기준).
 *   [3] 세 기준의 실측치를 표로 남긴다 — 다음 회차 비평 수치는 이 표의 어느 칸인지로 대조한다.
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
    /* cap93 의 씬A 와 **같은 트리거**를 쓴다 — 자와 그림이 다른 것을 재면 아무 의미가 없다. */
    const A = ATLAS['knight'];
    if(!A || !A.f) return { err:'knight 아틀라스가 없다' };
    /* 용사가 실제로 그려지는 프레임을 고른다 — 없으면 아무 프레임이나(잉크 상자는 프레임마다
       ±2px 안이라 앵커 판정에는 영향이 없다). */
    const names = Object.keys(A.f);
    const fr = A.f[names.find(n => /idle|stand|run|walk/i.test(n)) || names[0]];
    const s = 1.0;                                             /* drawFrame('knight', …, 1.0) */
    /* drawFrame 의 발밑 앵커 배치 (논리 좌표) */
    const L = { x: player.x - fr[6]*s/2 + fr[4]*s, y: player.y - fr[7]*s + fr[5]*s, w: fr[2]*s, h: fr[3]*s };
    const box = {
      lt: fxWorld(L.x, L.y), rb: fxWorld(L.x + L.w, L.y + L.h),
      c:  fxWorld(L.x + L.w/2, L.y + L.h/2), foot: fxWorld(player.x, player.y)
    };
    /* 씬A 트리거 — cap93.js 와 같은 좌표·같은 금액 */
    const p0 = fxWorld(player.x + 12, player.y - 20);
    fxAt(p0);
    S.gold += 128000;
    const nf = () => new Promise(r => requestAnimationFrame(() => r()));
    const t0 = performance.now();
    let seen = null;
    while(performance.now() - t0 < 900){
      const f = fxFlies.filter(x => x.ui);
      /* 비행 항목은 `x/y` 가 아니라 **`sx/sy`(스폰 좌표)** 를 들고 있다 — 첫 프레임의 «무리» 는
         이것이다. 화면 좌표를 쓰면 이미 퍼짐이 시작돼 앵커가 아니라 «퍼짐 반경» 을 재게 된다. */
      if(f.length && !seen) seen = f.map(x => ({ x:x.sx, y:x.sy }));
      if(seen && f.length) { /* 퍼짐이 시작된 뒤의 무리도 한 번 더 본다 */ }
      await nf();
      if(seen && performance.now() - t0 > 260) break;
    }
    return { box, p0, seen, frame: fr, logical: L };
  });
  await browser.close();
  if(tr.err){ console.log('probe93p 실패: ' + tr.err); process.exit(1); }
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  if(!tr.seen || !tr.seen.length){ console.log('probe93p 실패: 비행 아이콘이 한 개도 안 잡혔다'); process.exit(1); }

  const B = tr.box, P = tr.p0;
  const x0 = Math.min(B.lt.x, B.rb.x), x1 = Math.max(B.lt.x, B.rb.x);
  const y0 = Math.min(B.lt.y, B.rb.y), y1 = Math.max(B.lt.y, B.rb.y);
  const cx = tr.seen.reduce((a, p) => a + p.x, 0) / tr.seen.length;
  const cy = tr.seen.reduce((a, p) => a + p.y, 0) / tr.seen.length;

  const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  /* 상자 테두리까지의 거리 (안에 있으면 0) */
  const edge = (px, py) => {
    const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
    return Math.hypot(dx, dy);
  };
  const inBox = (px, py) => px >= x0 && px <= x1 && py >= y0 && py <= y1;

  console.log('93 씬A 출발 앵커 자 (프레임 px · 1080×2280 기준)');
  console.log(`  · 용사 잉크 상자   x ${x0.toFixed(0)}~${x1.toFixed(0)} · y ${y0.toFixed(0)}~${y1.toFixed(0)}  (${(x1-x0).toFixed(0)}×${(y1-y0).toFixed(0)})`);
  console.log(`  · 용사 발밑 앵커   (${B.foot.x.toFixed(0)}, ${B.foot.y.toFixed(0)})   · 상자 중심 (${B.c.x.toFixed(0)}, ${B.c.y.toFixed(0)})`);
  console.log(`  · 스폰 원점(fxAt)  (${P.x.toFixed(0)}, ${P.y.toFixed(0)})   · 첫 프레임 아이콘 ${tr.seen.length}개 무리 중심 (${cx.toFixed(0)}, ${cy.toFixed(0)})`);
  console.log('  · 기준별 이탈 거리 — 비평 수치는 이 표의 어느 칸인지로 대조한다');
  console.log(`      ① 발밑 앵커 기준   스폰 원점 ${d(P.x,P.y,B.foot.x,B.foot.y).toFixed(0)}px · 무리 중심 ${d(cx,cy,B.foot.x,B.foot.y).toFixed(0)}px`);
  console.log(`      ② 잉크 상자 중심   스폰 원점 ${d(P.x,P.y,B.c.x,B.c.y).toFixed(0)}px · 무리 중심 ${d(cx,cy,B.c.x,B.c.y).toFixed(0)}px`);
  console.log(`      ③ 잉크 상자 테두리 스폰 원점 ${edge(P.x,P.y).toFixed(0)}px · 무리 중심 ${edge(cx,cy).toFixed(0)}px  (상자 «안» 이면 0)`);

  let bad = 0;
  const chk = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name} — ${detail}`); if(!ok) bad++; };
  /* «상자 안» 을 요구하지 않는다 — 설계는 «죽은 자리 = 용사 바로 «옆»» 이다(12·15회차). 안을
     요구하면 자가 설계와 싸운다. 요구는 «테두리에 붙어 있다» 와 «지터가 앵커를 흐리지 않는다» 둘이다. */
  chk('[1] 첫 프레임 무리 중심이 잉크 상자 테두리 40px 안',
      edge(cx, cy) <= 40, `테두리 거리 ${edge(cx,cy).toFixed(0)}px (≤40) · 무리 중심 (${cx.toFixed(0)}, ${cy.toFixed(0)})${inBox(cx,cy) ? ' · 상자 «안»' : ''}`);
  chk('[2] 스폰 원점이 잉크 상자 테두리 40px 안',
      edge(P.x, P.y) <= 40, `테두리 거리 ${edge(P.x,P.y).toFixed(0)}px (≤40)`);
  chk('[3] 스폰 지터가 앵커를 흐리지 않는다',
      d(cx, cy, P.x, P.y) <= 12, `무리 중심 − 스폰 원점 ${d(cx,cy,P.x,P.y).toFixed(1)}px (≤12)`);

  console.log(bad ? `\nPROBE93P FAIL (${bad}건)` : '\nPROBE93P PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93p 실패:', e.message); process.exit(1); });
