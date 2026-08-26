/* 작업 114 — 14회차 프로브: «데미지 라벨» 3항 실측
 *   ① 병합 라벨의 세로 상승 궤적 — 되감김(역주행)이 사라졌는가 · 총 상승량
 *   ② 동시 스폰 라벨의 세로 앵커 산포 — 순번 스태거 폐기 전/후
 *   ③ 운석 낙하 중 «화면 안» 프레임 수 — 클립선(130) 아래에 몇 장 들어오는가
 *
 * 실행: node tools/probe114e.js
 *
 * 배경 — 14회차 비평가 AS#6·AT[6] 이 «라벨이 320~400ms 에 11.4~14 게임px 만 오르고 한 프레임
 * 역주행한다», AS#5·AT[4] 가 «동시 6피격의 앵커가 21~77 / 14~71 게임px 로 산포» 를 공통 지적했다.
 * 둘 다 코드에 원인이 있었고(병합의 `q.t` 되감기 · 무조건 도는 순번 스태거) 여기서 회수량을 잰다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let err = 0;
  p.on('pageerror', e => { err++; console.log('  [pageerror] ' + e); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);

  /* ---- ① 병합 라벨의 상승 궤적 ---------------------------------------------------
     같은 `src` 로 110ms 간격(impact 장면의 recast)으로 4연타하고, 80ms 그리드에서
     «그려지는 세로 위치»(draw 가 쓰는 식과 같은 식)를 따라간다. */
  const rise = await p.evaluate(() => {
    nums.length = 0;
    const src = { id: 'probe' };
    const NL = NUM_LIFE;
    const drawY = n => -34*(1 - Math.pow(1 - Math.min((n.a || n.t)/NL, 1), 1.35));  /* n.y 기준 상대 */
    const out = [];
    let t = 0;
    const step = 0.02;                       /* 20ms 씩 굴린다 */
    let nextHit = 0, hits = 0;
    for(let i = 0; i < 40; i++){             /* 800ms */
      if(t >= nextHit && hits < 4){ dmgNum(300, 300, 10, false, src); hits++; nextHit = t + 0.11; }
      /* 갱신 루프와 같은 일 */
      for(let j = nums.length-1; j >= 0; j--){
        const n = nums[j]; n.t += step; n.a = (n.a || 0) + step;
        if(n.t > NL) nums.splice(j, 1);
      }
      t += step;
      if(Math.abs((t*1000) % 80) < 1e-6 || Math.abs((t*1000) % 80 - 80) < 1e-6){
        const n = nums[0];
        out.push(n ? Math.round(drawY(n)*10)/10 : null);
      }
    }
    nums.length = 0;
    return out;
  });
  const seen = rise.filter(v => v !== null);
  let back = 0, maxRise = 0;
  for(let i = 1; i < seen.length; i++){ if(seen[i] > seen[i-1] + 0.05) back++; }
  for(const v of seen) maxRise = Math.max(maxRise, -v);
  console.log('\n== ① 병합 라벨 세로 궤적 (80ms 그리드 · 음수 = 위로) ==');
  console.log('  ' + seen.join(' · '));
  console.log('  역주행 프레임 : ' + back + ' (13회차까지 = 1 이상 · 목표 0)');
  console.log('  총 상승량     : ' + Math.round(maxRise*10)/10 +
              ' 게임px (AS 실측 11.4 · AT 14 → 설계값 34)');

  /* ---- ② 동시 스폰 앵커 산포 -----------------------------------------------------
     서로 다른 적 6기가 같은 순간에 맞았을 때, 라벨의 세로 앵커가 얼마나 흩어지는가.
     겹치지 않게 가로로 벌려 세우면(겹침 회피가 개입하지 않는 배치) 산포는 0 이어야 한다. */
  const spread = await p.evaluate(() => {
    const run = gapX => {
      nums.length = 0;
      const ys = [];
      for(let i = 0; i < 6; i++){
        dmgNum(100 + i*gapX, 500, 10, false, { id: 'e' + i });
        ys.push(nums[nums.length-1].y);
      }
      nums.length = 0;
      return { min: Math.min.apply(null, ys), max: Math.max.apply(null, ys), ys };
    };
    return { apart: run(120), close: run(10) };
  });
  console.log('\n== ② 동시 6피격 라벨 세로 앵커 ==');
  console.log('  가로로 벌린 6기(겹침 없음) : 산포 ' + (spread.apart.max - spread.apart.min) +
              ' 게임px  [' + spread.apart.ys.join(', ') + ']');
  console.log('    → AS 실측 21~77(3.7배) · AT 14~71(5배). 겹치지 않으면 0 이어야 한다');
  console.log('  한 자리에 겹친 6기          : 산포 ' + (spread.close.max - spread.close.min) +
              ' 게임px  [' + spread.close.ys.join(', ') + ']');
  console.log('    → 겹칠 때만 20 씩 스택(13회차 신설). 게이트 «연속 스폰 ≥20» 은 이 쪽이 지킨다');

  /* ---- ③ 운석이 화면 안에 있는 프레임 수 ------------------------------------------
     낙하 «거리» 를 화면 안에서 시작하도록 바꾼 뒤, 80ms 그리드에서 클립선(130) 아래에
     운석 머리가 들어오는 장이 몇 장인가. 13회차까지는 3장(AT «본체가 f4·f5 두 프레임뿐»). */
  const met = await p.evaluate(async () => {
    shots.length = 0;
    S.own = { meteor: { n:0, l:1 } }; S.eqSkill = ['meteor'];
    skillCd = { meteor: 0 };
    castSkillRaw(SKILLS.find(s => s.id === 'meteor'));
    const m = shots.find(s => s.k === 'meteor');
    if(!m) return null;
    const out = { fall: Math.round(m.fl0), y0: Math.round(m.y), ty: Math.round(m.ty), vis: 0, frames: [] };
    /* 80ms 그리드로 굴리며 화면 y 를 본다 */
    let t = 0;
    for(let i = 0; i < 14 && m.y < m.ty; i++){
      const scrY = Math.round(m.y + camOy);
      out.frames.push(scrY);
      if(scrY >= 130) out.vis++;
      for(let k = 0; k < 4; k++){ m.vy += m.gy*0.02; m.y += m.vy*0.02; }   /* 80ms = 20ms × 4 */
      t += 0.08;
    }
    out.time = Math.round(t*1000);
    shots.length = 0;
    return out;
  });
  console.log('\n== ③ 운석 낙하 — 80ms 그리드에서 «화면 안»(클립선 130 아래) 프레임 ==');
  if(met){
    console.log('  낙하 거리     : ' + met.fall + ' 게임px (13회차까지 620 고정)');
    console.log('  출발 화면 y   : ' + met.frames[0] + '  → 착탄 ' + met.ty);
    console.log('  프레임별 화면 y: ' + met.frames.join(' · '));
    console.log('  화면 안 프레임 : ' + met.vis + ' 장 (AT «본체가 f4·f5 두 프레임뿐» → 목표 ≥5)');
    console.log('  총 낙하 시간   : ' + met.time + 'ms (13회차 651ms 유지가 목표)');
  } else console.log('  (운석 생성 실패)');

  console.log('\n페이지 에러 ' + err + '건');
  await b.close();
})();
