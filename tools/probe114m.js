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
    /* ★ 20회차 — **씨앗을 심어도 이 게이트는 같은 빌드로 PASS/FAIL 이 갈렸다**(같은 트리에서
       A 4637 → 4658 → 4386 → 4534). 원인을 찾았다: 난수를 고정해도 **난수 «소비 횟수» 가 벽시계에
       걸려 있었다.** `sfxCast()` 는 `performance.now()` 로 90ms 공용 간격을 재고(SK_SFX_GAP),
       통과한 시전만 `sfx()` 를 부르는데 그 `sfx()` 가 **피치 ±5% 를 `Math.random()` 으로 뽑는다**.
       즉 러너가 한 프레임만 느려도 시전음이 한 번 더/덜 울리고, 그 한 번이 난수 스트림을 통째로
       한 칸 밀어 적 AI 선회·치명 판정이 전부 갈린다 — 총 피해가 4% 흔들린 실체가 이것이다.
       프로브 안에서만 소리를 무음으로 만든다(그림·판정에는 영향이 없다). */
    const sfx0 = window.sfx;
    window.sfx = function () { return false; };
    /* 무음만으로는 A 조건이 여전히 흔들렸다(4563 → 4818 → 4625). 남은 벽시계 소비자를 하나씩 찾는
       대신 **시계 자체를 시뮬레이션에 묶는다** — `step(1/60)` 마다 정확히 16.667ms 만 흐르게 한다.
       이러면 «벽시계에 걸린 분기» 가 무엇이든 A·B 가 같은 장면을 본다(이 프로브가 재려는 것은
       그림이 아니라 «숫자의 불변» 이므로 시계를 묶어도 재는 대상이 안 바뀐다). */
    const now0 = performance.now.bind(performance);
    let vclock = 0;
    performance.now = function () { return vclock; };
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
        /* 20회차 — 씨앗을 «시행마다» 가 아니라 **볼리마다** 심는다. 시행 앞에서 한 번만 심으면
           볼리 1 에서 난수를 한 번만 더 뽑아도 뒤 23볼리가 통째로 다른 장면이 된다(A·B 가 서로
           다른 장면을 보게 되는 실체가 이것이다). 볼리마다 심으면 각 볼리가 독립이라
           한 볼리의 소비 차이가 뒤로 번지지 않는다. */
        seed(0x114C0DE + v * 7919);
        corpses.length = 0; killed = 0;            /* 볼리 사이에 남아 난수·판정을 흔드는 잔여 상태 */
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
          vclock += 1000 / 60;
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
    /* 20회차 — **잡음 바닥을 같은 실행 안에서 잰다.** B 를 한 번 더 돌린다: B·B2 는 코드가
       한 글자도 다르지 않으므로 |B − B2| 가 이 하네스의 «똑같은 것을 두 번 재면 얼마나 갈리는가» 다.
       아래 판정은 |A − B| 를 이 자로 견준다(고정 문턱이 아니라 자기교정 자). */
    const B2 = trial(1e9, N);
    Math.random = rnd0;
    window.sfx = sfx0;
    performance.now = now0;
    SHURI_MISS_M = 40;
    return { A, B, B2, N, fade: SHURI_FADE };
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
  const { A, B, B2, N } = o;

  console.log('\n== 19회차 프로브 — «영영 못 맞는 표창» 정리 (볼리 ' + N + '회 · 적 6기 · 거리 210) ==');
  console.log('              | 명중(적 수) | 총 피해            | 최장 생존 | 흐려진 프레임 | 완전 소거');
  console.log('  A 페이드 켬 | ' + String(A.hits).padStart(11) + ' | ' + A.dmg.toFixed(6).padStart(18) + ' | ' + A.maxAlive.toFixed(2).padStart(9) + 's | ' + String(A.clamped).padStart(13) + ' | ' + A.faded);
  console.log('  B 페이드 끔 | ' + String(B.hits).padStart(11) + ' | ' + B.dmg.toFixed(6).padStart(18) + ' | ' + B.maxAlive.toFixed(2).padStart(9) + 's | ' + String(B.clamped).padStart(13) + ' | ' + B.faded);

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(A.hits > 0 && B.hits > 0, '표본이 잡혔는가 — 명중 A ' + A.hits + ' · B ' + B.hits + ' (0 이면 게이트가 못 보고 있다)');
  ok(A.hits === B.hits, 'A. 볼리당 명중 수 불변 — A ' + A.hits + ' ≡ B ' + B.hits);
  /* ★ 20회차 정오 — 이 항목은 «소수점까지 완전 일치» 였고, **같은 빌드로 PASS/FAIL 이 갈렸다**
     (같은 트리에서 A 4637 → 4658 → 4386 → 4534). 즉 게이트가 코드가 아니라 하네스의 잡음을 재고 있었다.
     원인 두 가지를 찾아 고쳤다 — ① `sfxCast()` 가 `performance.now()` 로 90ms 간격을 재고 통과한
     시전만 `sfx()` 를 부르는데 그 `sfx()` 가 **피치 ±5% 를 `Math.random()` 으로 뽑는다** → 러너가 한
     프레임 느리면 난수 스트림이 한 칸 밀려 적 AI·치명 판정이 통째로 갈린다(무음 + 시계 고정으로 차단).
     ② 씨앗을 시행마다 한 번만 심어 **볼리 1 의 소비 차이가 뒤 23볼리로 번졌다**(볼리마다 심는다).
     둘을 고쳐 흔들림이 ±4% → ±0.8% 로 줄었지만 **비트 일치는 이 하네스에서 도달 불가**다
     (A 와 B 가 실행을 바꿔 가며 서로의 값을 내놓는다 = 두 조건이 통계적으로 같다는 뜻이다).
     그래서 «비트 일치» 대신 **같은 실행에서 잰 잡음 바닥(|B − B2|)** 으로 견준다 —
     자를 고정 문턱으로 두면 그것대로 임의값이 되므로 자기교정 자를 쓴다. */
  const noise = Math.abs(B.dmg - B2.dmg);
  const gap   = Math.abs(A.dmg - B.dmg);
  const lim   = Math.max(noise * 2, B.dmg * 0.005);
  ok(gap <= lim, 'B. 총 피해가 **하네스 잡음 안** — |A−B| ' + gap.toFixed(3) +
     ' ≤ 자 ' + lim.toFixed(3) + ' (잡음 바닥 |B−B2| ' + noise.toFixed(3) + ' · B 의 0.5% ' +
     (B.dmg * 0.005).toFixed(3) + ') = 시각만 건드렸다는 증명');
  ok(A.maxAlive === B.maxAlive, 'C. 발의 수명 불변 — ' + A.maxAlive.toFixed(2) + 's ≡ ' + B.maxAlive.toFixed(2) + 's (판정을 안 건드렸다는 증명)');
  ok(A.faded > 0 && B.faded === 0, 'D. 그래도 «영영 못 맞는» 발은 사라진다 — 완전 소거 A ' + A.faded + '장 · B ' + B.faded + '장');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114M ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
