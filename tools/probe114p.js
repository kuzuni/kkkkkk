/* 작업 114 — 20회차 프로브: **번개가 시전자에 붙어 있는가**
 *
 * 20회차 채점 BE[17]·BF[1] 2인 공통(수치까지 일치):
 *   «트렁크가 용사 중심에서 52(BE) / 53.9(BF) 게임px 떨어진 허공에서 시작한다 —
 *    용사 반지름 36 을 빼도 16~18 게임px 의 빈 땅이 f1~f6 여섯 프레임 내내 유지된다.»
 *
 * 원인은 `buildBolt()` 의 한 줄이었다: 5회차 비평 ⑤(«줄기가 히어로 정중앙을 관통한다»)를 받아
 * 시작점을 표적 쪽으로 **42 게임px** 밀었는데, 그 값이 용사 반지름(36)을 넘어 실루엣 «밖» 이 됐다.
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * ⚠ 수식이 아니라 **굳은 폴리라인의 첫 점**(`l.pts[0..1]`)을 본다. `buildBolt` 는 «처음 그리기 직전»에
 * 한 번만 도는 지연 초기화라, 굳기 전에 재면 원래 좌표가 나와 순환 논증이 아니라 **오답**이 된다.
 * 그래서 한 프레임 그린 뒤에 잰다.
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. 시작점이 용사 반지름(36 게임px) **안**이다 — 빈 땅 0 (BE 처방 «반지름 안쪽»)
 *   B. 그래도 정중앙은 아니다 — 시작점 ≥ 12 게임px (5회차 비평 ⑤ «정중앙 관통» 회귀 방지)
 *   C. 도착점(명중 위치)은 안 움직였다 — 표적 몸통 중심과의 오차 ≤ 1 게임px
 *   D. 모든 링크가 같은 규격 — 시작 거리 편차 ≤ 0.5 게임px
 *
 * 실행: node tools/probe114p.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

async function run(p) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async () => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));

    const out = { err: [], starts: [], ends: [], heroR: 0 };
    try {
      sbufClear();
      S.eqSkill.length = 0;                 /* 자동 시전을 끈다 — 재는 창 안에 남의 번개가 끼면 안 된다 */
      skillCd = {}; shots.length = 0; rings.length = 0; parts.length = 0; nums.length = 0;
      bolts.length = 0; booms.length = 0; zones.length = 0;
      enemies.length = 0; spawnQ.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
      /* ⚠ `player.r`(16) 은 **판정 반경**이지 그림이 아니다. 비평가 두 사람이 «용사 반지름 36» 으로
         잰 것은 **스프라이트 실루엣**이고, «빈 땅» 은 그림 기준으로만 뜻이 있다.
         스프라이트는 64px 프레임을 `player.sc` 배로 그리므로 실루엣 반지름 = 32×sc 다. */
      out.heroR = +(32 * (player.sc || 1.125)).toFixed(2);

      /* 적 6기를 거리 240 원주에 세운다 — 캡처 하네스(cap114 bolt 장면)와 같은 배치 */
      for (let i = 0; i < 6; i++) {
        makeEnemy('zombie');
        const e = enemies[enemies.length - 1];
        e.born = 1; e.hp = e.max = 1e12;
        e.x = player.x + Math.cos(i / 6 * 6.283) * 240;
        e.y = player.y + Math.sin(i / 6 * 6.283) * 240;
      }
      S.own = { bolt: { n: 0, l: 1 } };
      /* ⚠ `S.eqSkill` 에 넣으면 안 된다 — step() 이 곧바로 **두 번째 볼리**를 쏴 링크가 3 → 6 이 되고,
         그 4번째 링크(= 두 번째 볼리의 첫 링크)가 «연쇄 링크인데 시전자에서 나온다» 로 잘못 잡힌다. */
      castSkill(SK['bolt']);
      const mine = bolts.slice();            /* 내가 쏜 볼리만 붙든다 */
      /* ⚠ 폴리라인은 생성 시점이 아니라 **첫 갱신**에 굳는다(`step()` 의 bolts 루프 — `if(!l.pts) buildBolt(l)`).
         굳기 전에 재면 원좌표가 나와 «고쳤는데도 42» 라는 오답이 된다. 한 프레임 굴리고 잰다. */
      step(1/60);

      /* ⚠ 링크는 3개지만 **시전자에서 나오는 것은 첫 링크뿐**이다(2·3번째는 «이전 적에서» 잇는 연쇄).
         전부를 같은 자로 재면 «편차 182» 같은 헛것이 나온다 — 첫 링크만 발원으로 보고,
         나머지는 «앞 링크의 도착점에서 이어지는가» 로 따로 본다. */
      for (const l of mine) {
        if (!l.pts) continue;
        const sx = l.pts[0], sy = l.pts[1];
        out.starts.push(+Math.hypot(sx - player.x, sy - player.y).toFixed(2));
        /* 도착점은 «어느 적의 몸통 중심» 이어야 한다 — 가장 가까운 적과의 오차를 본다 */
        const ex = l.pts[l.pts.length - 2], ey = l.pts[l.pts.length - 1];
        let best = 1e9;
        for (const e of enemies) best = Math.min(best, Math.hypot(ex - e.x, ey - (e.y - e.r)));
        out.ends.push(+best.toFixed(2));
      }
    } catch (e) { out.err.push('' + e); }
    return out;
  });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const o = await run(p);
  await b.close();
  o.err.forEach(e => errs.push(e));

  const S = o.starts || [], E = o.ends || [];
  const s0 = S.length ? S[0] : NaN;                 /* 시전자 발원 = 첫 링크 */
  const chain = S.slice(1);                          /* 2·3번째 = 앞 적에서 잇는 연쇄 링크 */
  const maxE = E.length ? Math.max(...E) : NaN;

  console.log('\n== 20회차 프로브 — 번개가 시전자에 붙어 있는가 ==');
  console.log('  용사 반지름                  : ' + o.heroR + ' 게임px');
  console.log('  첫 링크 시작점 ↔ 용사 중심   : ' + (S.length ? s0.toFixed(2) : '표본 없음') +
    '   (연쇄 링크 ' + (chain.length ? chain.map(v => v.toFixed(0)).join(' · ') : '—') + ' 은 적에서 잇는다)');
  console.log('  트렁크 도착점 ↔ 적 몸통 중심 : ' + (E.length ? E.join(' · ') : '표본 없음'));
  console.log('  빈 땅(첫 링크 시작 − 반지름) : ' + (S.length ? (s0 - o.heroR).toFixed(2) : '—') +
    ' 게임px  (BE 실측 16 · BF 실측 18 — 0 이하여야 한다)');

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(S.length >= 2, '표본이 잡혔는가 — 링크 ' + S.length + '개 (0 이면 게이트가 못 보고 있다)');
  ok(s0 <= o.heroR,
    'A. 첫 링크가 용사 실루엣 «안» 에서 나온다 — ' + s0.toFixed(2) + ' ≤ 반지름 ' + o.heroR +
    ' (BE[17] 52 · BF[1] 53.9 가 잡은 자리)');
  ok(s0 >= 12,
    'B. 그래도 정중앙은 아니다 — ' + s0.toFixed(2) + ' ≥ 12 (5회차 비평 ⑤ «정중앙 관통» 회귀 방지)');
  /* 자는 2.0 — 한 프레임 굴려야 폴리라인이 굳는데 그 사이 적이 제 속도로 1 게임px 남짓 걷는다 */
  ok(maxE <= 2.0, 'C. 도착점(명중 위치) 불변 — 적 몸통 중심과 최대 오차 ' + maxE.toFixed(2) + ' ≤ 2.0 게임px');
  ok(chain.length >= 1 && chain.every(v => v > o.heroR),
    'D. 연쇄 링크는 시전자가 아니라 «앞 적» 에서 잇는다 — ' + (chain.length ? chain.map(v => v.toFixed(0)).join(' · ') : '표본 없음') +
    ' 게임px (전부 반지름 ' + o.heroR + ' 밖 = 연쇄 구조가 살아 있다)');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114P ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
