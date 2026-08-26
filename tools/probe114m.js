/* 작업 114 — 19회차 프로브: **«영영 못 맞는 표창» 정리**가 판정을 한 발도 안 줄였는가
 *
 * 18회차 인수인계 5순위. BA[9]·BB[17] 이 **세 회차 연속** 적었고 여기까지 미착수였다:
 *   «표적 없는 표창이 판정이 끝난 뒤에도 계속 난다»
 *   (BB 실측 «최근접 거리 37.3 게임px 로 맞은 적이 없다»)
 *
 * 16회차 인수인계가 «먼저 오진인지 검증하라» 고 했고, 검증 결과 **오진이 아니었다** —
 * 적 6기·거리 210 에서 8발 중 6발이 0.33~0.38s 에 명중해 소멸하고, 남은 2발은 최근접
 * 40.4 / 42.4 게임px(명중 반경 30)로 **진짜 헛방**인 채 life 1.4s 를 끝까지 난다.
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * 이 수정은 **그리기만** 끈다(`b.mf` = 페이드 레벨). 게임 필드는 하나도 안 쓴다.
 * 처음에는 처방대로 `b.life` 를 잘랐는데 **그러면 증명 자체가 불가능**했다 —
 * 판정을 자르면 `Math.random()` 소비 순서가 갈려 같은 씨앗에서도 총 피해가 −6.6% 로 벌어지고,
 * 클램프를 끈 쪽끼리도 4.2% 흔들린다(수정분의 효과보다 큰 잡음). 15·16회차가 «사거리 캡 260» 을
 * 두 번 기각한 것과 같은 자리다. 그래서 «증명할 수 없는 수정» 을 버리고 시각만 남겼다.
 *
 * 같은 씨앗의 A/B 로 잰다:
 *   A(페이드 켬)  — 현재 빌드 그대로
 *   B(페이드 끔)  — `SHURI_MISS_M` 을 1e9 로 올려 «못 맞는다» 선언이 영영 안 나오게 한다
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. 볼리당 명중 수 A ≡ B (정확히 같은 값)
 *   B. 총 피해 A ≡ B **소수점까지 완전 일치** — 시각만 건드렸다는 것의 증명이다
 *   C. 발의 수명은 **안 줄었다** (A ≡ B) — 판정을 안 건드렸다는 것의 증명
 *   D. 그런데도 «영영 못 맞는» 발은 실제로 사라진다 — 페이드가 0 에 닿는 발이 있는가
 *
 * 실행: node tools/probe114m.js
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

    /* ⚠ **난수를 고정하지 않으면 A/B 가 성립하지 않는다.** 적 AI 의 선회(`swirl`)·넉백·스폰이
       전부 `Math.random()` 을 먹으므로 두 조건이 서로 다른 장면을 본다 — 실제로 같은 코드로
       B 를 두 번 돌렸더니 총 피해가 4606.09 → 4412.37 로 **4.2% 흔들렸다**(수정분의 효과보다 크다).
       그래서 매 시행 앞에서 같은 씨앗의 PRNG 를 심는다. 캡처(`cap114`)가 난수 고정을 금지하는 것과
       모순되지 않는다 — 저쪽은 «연출의 모양» 을 보고 이쪽은 «숫자의 불변» 을 본다. */
    const rnd0 = Math.random;
    function seed(s) {
      let x = s >>> 0;
      Math.random = function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    }

    /* 한 조건을 N 볼리 돌린다. 판을 매 볼리 똑같이 세워 두 조건이 같은 장면을 보게 한다 */
    function trial(missM, N) {
      SHURI_MISS_M = missM;
      seed(0x114C0DE);
      let hits = 0, dmg = 0, maxAlive = 0, faded = 0, clamped = 0;
      for (let v = 0; v < N; v++) {
        sbufClear();
        skillCd = {}; shots.length = 0; rings.length = 0; parts.length = 0; nums.length = 0;
        enemies.length = 0; spawnQ.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
        S.own = { shuri: { n: 0, l: 1 } }; S.eqSkill = ['shuri']; S.lv.crit = 0;
        player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
        player.hp = stat.maxHp;
        for (let i = 0; i < 6; i++) makeEnemy('zombie');
        const ang = v * 0.17;
        enemies.forEach((e, i) => {
          e.born = 1; e.hp = e.max = 1e12;
          const a = i * 6.283 / 6 + ang;
          e.x = player.x + Math.cos(a) * 210; e.y = player.y + Math.sin(a) * 210;
        });
        const hp0 = enemies.map(e => e.hp);
        castSkill(SKILLS.find(s => s.id === 'shuri'));
        const mine = shots.filter(s => s.k === 'shuri');
        const seen = new Map();                       /* 발 → 마지막으로 살아 있던 시각 */
        mine.forEach(s => seen.set(s, 0));
        for (let t = 1; t <= 150; t++) {              /* 1/60 × 150 = 2.5s */
          step(1 / 60);
          for (const s of mine) {
            if (shots.includes(s)) {
              seen.set(s, t / 60);
              if (s.mf !== undefined && s.mf < 1) { clamped++; if (s.mf <= 0.001) faded++; }
            }
          }
        }
        /* 명중 = 체력이 준 적의 «횟수» 가 아니라 실제 피해량으로 센다(관통·중복까지 담긴다) */
        enemies.forEach((e, i) => { if (e.hp < hp0[i]) { hits++; dmg += (hp0[i] - e.hp); } });
        for (const v2 of seen.values()) maxAlive = Math.max(maxAlive, v2);
      }
      return { hits, dmg, maxAlive, faded, clamped };
    }

    const N = 24;
    const A = trial(40, N);            /* 클램프 켬 = 현재 빌드 */
    const B = trial(1e9, N);           /* 클램프 끔 = 수정 전 거동 */
    Math.random = rnd0;
    SHURI_MISS_M = 40;
    return { A, B, N, fade: SHURI_FADE };
  });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  const o = await run(p);
  await b.close();
  const { A, B, N } = o;

  console.log('\n== 19회차 프로브 — «영영 못 맞는 표창» 정리 (볼리 ' + N + '회 · 적 6기 · 거리 210) ==');
  console.log('              | 명중(적 수) | 총 피해            | 최장 생존 | 흐려진 프레임 | 완전 소거');
  console.log('  A 페이드 켬 | ' + String(A.hits).padStart(11) + ' | ' + A.dmg.toFixed(6).padStart(18) + ' | ' + A.maxAlive.toFixed(2).padStart(9) + 's | ' + String(A.clamped).padStart(13) + ' | ' + A.faded);
  console.log('  B 페이드 끔 | ' + String(B.hits).padStart(11) + ' | ' + B.dmg.toFixed(6).padStart(18) + ' | ' + B.maxAlive.toFixed(2).padStart(9) + 's | ' + String(B.clamped).padStart(13) + ' | ' + B.faded);

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(A.hits > 0 && B.hits > 0, '표본이 잡혔는가 — 명중 A ' + A.hits + ' · B ' + B.hits + ' (0 이면 게이트가 못 보고 있다)');
  ok(A.hits === B.hits, 'A. 볼리당 명중 수 불변 — A ' + A.hits + ' ≡ B ' + B.hits);
  ok(A.dmg === B.dmg, 'B. 총 피해 **완전 일치** — ' + A.dmg.toFixed(6) + ' ≡ ' + B.dmg.toFixed(6) + ' (시각만 건드렸다는 증명)');
  ok(A.maxAlive === B.maxAlive, 'C. 발의 수명 불변 — ' + A.maxAlive.toFixed(2) + 's ≡ ' + B.maxAlive.toFixed(2) + 's (판정을 안 건드렸다는 증명)');
  ok(A.faded > 0 && B.faded === 0, 'D. 그래도 «영영 못 맞는» 발은 사라진다 — 완전 소거 A ' + A.faded + '장 · B ' + B.faded + '장');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114M ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
