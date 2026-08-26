/* 작업 114 — 16회차 프로브: **화구가 적을 표백하는가** (비평가 4명 공통 항목의 회수 확인)
 *
 * 15회차 AU#19 · AV[8], 16회차 AW[21] · AX[6] 가 **독립 4명**이 같은 것을 적었고 수치도 맞는다:
 *   적 스프라이트 최저 휘도 10~15.4 → **116.4~148** (검은 외곽선 100% 소실 · 다이내믹 레인지 −30%)
 * 즉 «화구 안에서 누가 맞고 있는지» 가 안 읽힌다.
 *
 * 이 프로브는 그 통계를 **그대로** 잰다 — 착탄 프레임에 화구 한가운데 서 있는 적의
 * 스프라이트 박스 안에서 최저·평균 휘도와 다이내믹 레인지를 뽑는다.
 * 합격선 — 비평가 처방(AW[21] «스프라이트 최소 휘도가 L≤60 을 유지» · AX[6] «min Y ≥ 60 유지»)은
 * 말은 반대로 적혀 있지만 **뜻은 하나**다: 스프라이트의 «검은 화소가 살아 있어야 한다».
 * 화구가 표백하면 최저 휘도가 «들려» 올라간다(평시 10~15 → 116~148). 그러니 게이트는
 *   ① 최저 휘도 ≤ 60   (검은 외곽선이 안 날아갔다)
 *   ② 다이내믹 레인지 ≥ 120 (실루엣 대비가 남았다 — 표백은 레인지를 8 까지 무너뜨린다)
 *
 * 「전 / 후」 는 화구 레이어를 유닛 뒤/앞으로 바꿔 가며 같은 판에서 잰다 —
 * `drawBoomSprites()` 를 무해한 함수로 바꾸고 유닛 «뒤» 에서 직접 부르면 옛 순서가 된다.
 *
 * 실행: node tools/probe114i.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

async function measure(p, oldOrder) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async ({ oldOrder }) => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
    S.own = { meteor: { n: 0, l: 1 } }; S.eqSkill = ['meteor'];
    S.opt.shake = false; S.lv.crit = 0;
    skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
    rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 1e9;
    player.hp = stat.maxHp;

    /* 적 1기를 «착탄 지점 바로 위» 에 세운다 — 화구 한가운데 있는 적이 채점 대상이다 */
    makeEnemy('zombie');
    const e = enemies[0];
    e.born = 1; e.hp = e.max = 1e12;
    /* ★ 시전 «전» 에 적을 화면 안으로 옮겨 둔다 — 안 그러면 운석이 스폰 자리(무작위)를 겨냥해
       착탄점이 화면 밖으로 나가고, 스프라이트 박스가 캔버스를 벗어나 한 프레임도 못 잰다 */
    e.x = player.x; e.y = player.y + 150;

    if (oldOrder) {
      /* 옛 순서 재현 — 유닛 앞에서는 안 그리고, draw() 가 끝난 «뒤» 에 같은 그림을 얹는다.
         가산 합성이라 «유닛 위에 덧그리는 것» 이 곧 옛 z 순서와 같은 결과다 */
      const real = drawBoomSprites;
      drawBoomSprites = () => {};
      window.__after = () => {
        ctx.save();
        ctx.translate(camOx, camOy);
        real();
        ctx.restore();
      };
      window.__real = real;
    }

    castSkill(SK.meteor);
    const shot = shots.find(b => b.k === 'meteor');
    if (shot) { e.x = shot.tx; e.y = shot.ty; }

    let best = null, sawBoom = 0, inBox = 0;
    for (let i = 0; i < 150; i++) {
      e.hp = e.max = 1e12; e.slow = 0;
      if (shot) { e.x = shot.tx; e.y = shot.ty; }
      step(1 / 60);
      draw();
      if (window.__after) window.__after();
      if (!booms.length) continue;
      sawBoom++;
      /* 적 스프라이트 박스(게임px) → 캔버스 px. 캔버스는 논리 VW×VH 를 SC 배로 그린다 */
      const gx = e.x + camOx, gy = e.y + camOy;
      const x0 = Math.round((gx - 17) * SC), y0 = Math.round((gy - 40) * SC);
      const w = Math.round(34 * SC), h = Math.round(40 * SC);
      if (x0 < 0 || y0 < 0 || x0 + w > cvs.width || y0 + h > cvs.height) continue;
      inBox++;
      const d = ctx.getImageData(x0, y0, w, h).data;
      let mn = 255, sum = 0, mx = 0, n = 0;
      for (let k = 0; k < d.length; k += 4) {
        const L = 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
        if (L < mn) mn = L;
        if (L > mx) mx = L;
        sum += L; n++;
      }
      /* «가장 밝은 프레임» = 화구가 가장 세게 덮는 순간. 최악을 채점한다 */
      const mean = sum / n;
      if (!best || mean > best.mean) best = { min: mn, mean, range: mx - mn, frame: i };
    }
    return best ? Object.assign(best, { sawBoom, inBox }) : { sawBoom, inBox, fail: 1 };
  }, { oldOrder });
}

(async () => {
  /* file:// 로 읽은 스프라이트가 캔버스를 «오염»(tainted) 시켜 getImageData 가 SecurityError 를 낸다.
     기존 하네스(cap114+scan114)는 스크린샷 → PIL 로 우회하는데, 여기서는 프레임마다 재야 해서
     스크린샷(장당 150~400ms × 300프레임)이 너무 비싸다. 파일 접근을 허용해 캔버스를 직접 읽는다. */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let err = 0;
  p.on('pageerror', e => { err++; console.log('  [pageerror] ' + e); });

  const before = await measure(p, true);
  const after  = await measure(p, false);

  console.log('\n== 화구 한가운데 선 적의 스프라이트 휘도 (가장 밝은 프레임) ==');
  console.log('            | 최저 휘도 | 평균  | 다이내믹 레인지');
  const row = (t, r) => console.log(`  ${t} |   ${r ? r.min.toFixed(1).padStart(5) : '  —  '}   | ${r ? r.mean.toFixed(1).padStart(5) : '  —  '} | ${r ? r.range.toFixed(1) : '—'}`);
  row('고치기 전(화구가 유닛 위)', before.fail ? null : before);
  row('고친 뒤  (화구가 유닛 아래)', after.fail ? null : after);

  console.log(`  (화구가 뜬 프레임 전 ${before.sawBoom} / 후 ${after.sawBoom} · 박스가 캔버스 안이던 프레임 전 ${before.inBox} / 후 ${after.inBox})`);
  const ok = after && !after.fail && after.min <= 60 && after.range >= 120;
  console.log(`\n판정 — 최저 휘도 ≤ 60 · 다이내믹 레인지 ≥ 120 (검은 외곽선·실루엣이 살아 있는가)`);
  console.log(`  최저 휘도  : ${after.min <= 60 ? 'PASS' : 'FAIL'} — ${after.min.toFixed(1)} (전 ${before.min.toFixed(1)})`);
  console.log(`  레인지     : ${after.range >= 120 ? 'PASS' : 'FAIL'} — ${after.range.toFixed(1)} (전 ${before.range.toFixed(1)})`);
  console.log(`  → ${ok ? 'PROBE114I PASS — 검은 외곽선이 살아 실루엣이 읽힌다' : 'PROBE114I FAIL'}`);
  console.log(`콘솔 에러 ${err}건`);
  await b.close();
  process.exit(err || !ok ? 1 : 0);
})();
