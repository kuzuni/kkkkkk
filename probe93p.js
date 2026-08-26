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
 *   [1] 아이콘 스폰 무리의 중심이 용사 잉크 상자 **테두리 40px** 안이다 (죽은 자리 = 용사 «바로 옆»).
 *   [2] 스폰 원점이 잉크 상자 **테두리에서 40px** 안이다 (12·15회차가 두 번 좁힌 기준).
 *   [3] 스폰 지터가 앵커를 흐리지 않는다.
 *   세 기준의 실측치를 표로 남긴다 — 다음 회차 비평 수치는 이 표의 어느 칸인지로 대조한다.
 *
 * ⚑ 20회차 추가 — **«어느 경로가 도는지» 를 먼저 찍는다.**
 *   93 리뷰 §1-1 과 상수 주석은 퍼짐을 «우상단 부채꼴(FX3_A0/A1 · FX3_R0/R1)» 로 적어 두었지만,
 *   실제로 그 상수가 쓰이는 것은 **밴드가 하나도 안 잡힌 경우뿐**이다:
 *     · 씬A(메인 화면) — `fx3Band()` 가 STAGE 헤더 밴드를 잡아 **2행 가로 밴드**로 간다(58 25~30회차).
 *     · 씬B(모달)     — `fx3Out`/`fx3Escape` 로 **패널 밖 탈출 + 형제 행 빈 밴드**로 간다.
 *   즉 **두 씬 다 부채꼴이 아니다.** 부채꼴 상수로 재면 «각폭 134° · 반경 104~277px» 이라는
 *   없는 결함이 나온다 — r20 비평가 AX(#1·#6)·AY(#1·#3)가 정확히 그렇게 쟀고, 그건 내가
 *   브리핑에 부채꼴이라고 적었기 때문이다. 이 자는 경로를 찍고 **그 경로의 기준으로만** 잰다.
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
    /* 20회차 — **퍼짐 «끝점» 의 각도·반경 분포**. r20 에서 AX·AY 가 독립으로 «씬A 부채꼴이
       부채꼴이 아니라 가로 리본»(AX 6/16 이탈·각폭 130.3° · AY 7/16 이탈·스팬 144.8°)을 냈는데,
       두 사람 다 앵커를 **그림에서 추정**했다(AX 캐릭터 중심 517,1060 · AY 피팅 571,1030).
       probe93p 가 이미 실측한 스폰 원점은 (≈591,1082) 라 최대 74px 어긋난다 — 원점이 74px
       왼쪽이면 같은 끝점이 훨씬 넓은 각으로 읽힌다. 그림이 아니라 **코드가 놓은 끝점**을 잰다. */
    /* ⚑ 20회차 — **어느 경로가 도는지부터 찍는다.** 부채꼴 상수(FX3_A0/A1 · FX3_R0/R1)는
       «밴드가 안 잡힌 경우» 에만 쓰인다. 메인 화면(씬A)은 STAGE 헤더 밴드가 잡혀
       `bnd = true`(2행 가로 밴드) 로 가므로 부채꼴 상수를 기준으로 재면 **없는 결함**이 나온다. */
    const fan = fxFlies.filter(x => x.ui).map(x => {
      const dx = x.ax - p0.x, dy = x.ay - p0.y;
      return { a: Math.atan2(dy, dx)*180/Math.PI, r: Math.hypot(dx, dy), bnd: !!x.bnd };
    });
    return { box, p0, seen, frame: fr, logical: L, fan,
             decl: { a0: FX3_A0*180/Math.PI, a1: FX3_A1*180/Math.PI, r0: FX3_R0, r1: FX3_R1, oby: FX3_OBY } };
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

  /* ── 20회차 — 퍼짐 끝점의 부채꼴 ── */
  const F = tr.fan || [], D = tr.decl;
  if(!F.length){ console.log('  ✗ 퍼짐 끝점을 못 읽었다'); process.exit(1); }
  const nb = F.filter(f => f.bnd).length;
  const as = F.map(f => f.a).sort((x, y) => x - y), rs = F.map(f => f.r).sort((x, y) => x - y);
  const bx = F.map(f => P.x + f.r*Math.cos(f.a*Math.PI/180));
  const by = F.map(f => P.y + f.r*Math.sin(f.a*Math.PI/180));
  const bw = Math.max(...bx) - Math.min(...bx), bh = Math.max(...by) - Math.min(...by);
  console.log(`  · 퍼짐 끝점 — **경로: ${nb === F.length ? '밴드(2행 가로)' : nb ? '혼합' : '부채꼴'}** (밴드 ${nb}/${F.length})`);
  console.log(`      각도 ${as[0].toFixed(1)}° ~ ${as[as.length-1].toFixed(1)}° (스팬 ${(as[as.length-1]-as[0]).toFixed(1)}°) · 반경 ${rs[0].toFixed(0)} ~ ${rs[rs.length-1].toFixed(0)}px`);
  console.log(`      끝점 bbox ${bw.toFixed(0)}×${bh.toFixed(0)}px (종횡비 ${(bw/Math.max(1,bh)).toFixed(2)}:1)`);
  if(nb === 0){
    /* 부채꼴 경로일 때만 부채꼴 상수로 잰다 */
    const outA = F.filter(f => f.a < D.a0 - 0.5 || f.a > D.a1 + 0.5).length;
    const outR = F.filter(f => f.r < D.r0 - 0.5 || f.r > D.r1 + 0.5).length;
    chk('[4] 퍼짐 끝점이 전부 선언 부채꼴 안',
        outA === 0, `창 밖 ${outA}/${F.length}개 · 선언 ${D.a0.toFixed(0)}° ~ ${D.a1.toFixed(0)}°`);
    chk('[5] 퍼짐 끝점이 전부 선언 반경대 안',
        outR === 0, `밴드 밖 ${outR}/${F.length}개 · 선언 ${D.r0} ~ ${D.r1}px`);
  }else{
    /* ⚑ 밴드 경로다. **부채꼴 상수(FX3_A0/A1 · FX3_R0/R1)는 이 경로에 안 쓰인다** —
       그걸로 재면 «각폭 125° · 반경 72~297px» 이라는 없는 결함이 나온다(r20 AX #1·#6 · AY #1·#3 이
       정확히 그렇게 쟀고, 그건 내가 브리핑에 부채꼴이라고 적었기 때문이다).
       밴드 경로에서 지킬 것은 «세로 봉투» 다: 종전 ±58px 봉투(28회차)를 넘으면 안 된다. */
    const dy = F.map(f => f.r*Math.sin(f.a*Math.PI/180));
    const off = dy.map(v => Math.abs(v + (D.oby)));
    chk('[4] 밴드 경로 — 세로 봉투 ±58px 안 (28회차 확정)',
        Math.max(...off) <= 58 + 2, `중심(출발점 위 ${(D.oby)}px) 기준 최대 ${Math.max(...off).toFixed(0)}px (≤58)`);
    chk('[5] 밴드 경로 — 2행이 실제로 서로 다른 y 대에 있다',
        bh >= 40, `끝점 세로 폭 ${bh.toFixed(0)}px (≥40 — 1행으로 뭉치면 «선» 이 된다)`);
  }

  console.log(bad ? `\nPROBE93P FAIL (${bad}건)` : '\nPROBE93P PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93p 실패:', e.message); process.exit(1); });
