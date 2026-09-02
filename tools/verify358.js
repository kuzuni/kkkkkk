/* 작업 358 게이트 — «플레이어 실효 이동 속도 = 기본 상수 (어떤 성장·장비·유물 상태에서도 불변)»
 *
 *   node tools/verify358.js   → 마지막 줄이 `VERIFY358 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-29):
 *   «플레이어 이동속도 빨라지는거 넣지 말기. 유물 효과나 뭐나 쨌든 다 빼기»
 *
 * 재현은 `tools/probe358.js` 가 했다 — 이름이 «속도» 인 것이 넷인데(UPG spd · RELIC_EFF.rate ·
 * COLL_EFFN.rate · BLESS[2]) **이동을 올리는 것은 UPG `spd` 하나뿐**이었다(나머지 셋은 공격 속도).
 * 지우기 전 Lv20 에서 `stat.speed` 115 → 205(+78.3%), 화면 실측도 204.7 px/s 로 게터를 그대로 따라갔다.
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈 «한 항이 두 자리를 겸하면 한쪽이 사라져도 초록이다»):
 *   §1 소스   ⓐ UPG 에 `spd` 행이 0곳 (음성항) · ⓑ 남은 9종은 한 글자도 안 건드렸다 (양성항 —
 *             «UPG 를 통째로 비워서 초록» 을 막는다) · ⓒ `stat.speed` 가 상수 하나만 돌려준다.
 *   §2 불변   성장 상태 8종(신규 · 구 세이브 spd Lv999 · 훈련 만단계 · 계급 4 · 유물 전량 Lv9 ·
 *             축복 3종 · 도감 만단계 · 그 전부 동시)에서 `stat.speed` 가 **한 값**이다.
 *             같은 칸에서 `cp()` 는 실제로 4e7 배 벌어진다 — «아무 상태도 안 만들어져서 초록» 을 막는다.
 *   §3 표시   ⓐ «강화» 탭에 이동 속도 행이 없다(그리고 남은 9행은 그대로 산다) ·
 *             ⓑ 20 프로필 스펙 «햄지 이동 속도» 행은 **레퍼런스 줄이라 살아 있고** 값이 «증가 0» 이다.
 *              ⚑ **831(2026-09-02) — 그 «증가 0» 을 표기 상수로 적지 않는다.** 725 가 효과 표기를 한 벌
 *              (`fmtMul`)로 «×N배» 로 갈면서 같은 값의 표기가 `0%` → `×1배` 로 바뀌었고(값은 불변),
 *              725 의 이관 목록에 358 이 빠져 이 항이 빨간 채 굳어 있었다. 이제 기대값을 **제품 부품에서
 *              파생**(`fmtMul(1)`)하고, 판별력은 [3-ⓑ-전제](증가 0 ↔ ×1.5 가 다른 문자열)와 비 자체가
 *              정확히 1 이라는 항으로 받는다 — «×1배 도 통과» 로 무르게 풀면 축이 되살아나도 초록이 된다(334).
 *   §4 실동작 화면 위 플레이어의 실측 속도가 상수를 **넘지 않고**, 성장 상태를 양 끝으로 흔들어도
 *             같은 천장에 붙는다(게터만 고치고 이동식에 배수가 남는 경우를 잡는다).
 *   §5 66     보스 추격 바닥 `BOSS_CHASE` 는 상수에 **비**로 걸린다 — 실측 보스 속도 ≈ 115 × 그 계수
 *              (359 이관: 계수는 1.08 → 0.94 로 바뀌었고, 이 절이 재는 것은 «비로 걸리는가» 다).
 *              ⚑ **651(2026-09-01) — 이 절의 자를 «벽시계» 에서 «시뮬 시계» 로 옮겼다.** 제품 `loop`
 *              가 `dt` 를 0.1 로 클램프하므로 프레임이 굶으면 시뮬 시간이 벽시계보다 덜 흐르고,
 *              `변위/벽시계초` 는 «느려진 보스» 가 아니라 «덜 흐른 시계» 를 읽었다(부하 아래 ×0.51).
 *              분모를 프레임별 `S.playtime` 증분으로, 보스 대기를 폴링으로 바꾸고, 눈금을
 *              «돌진·예고를 뺀 프레임의 변위/dt **최댓값**» 으로 세우자 실측이 소스가 말한 바닥에
 *              **정확히** 붙어(×1.000) 허용 밴드를 0.75~1.33 → **0.97~1.03 으로 좁혔다**.
 *              재현·대조는 `tools/probe651.js`.
 *   §6 세이브 `S.lv.spd` 를 든 구 세이브를 **실제로 로드**해도 에러 0 · 속도 불변(88 «보상 없이 소멸»).
 *   §R 되돌림 `get speed()` 만 옛 식(`U.spd.val(lv('spd'))` + UPG 행)으로 되돌린 **소스 사본**에서
 *             §2·§4 가 실제로 빨개진다 — 이게 없으면 «축이 애초에 안 걸려서 초록» 과 구별할 수 없다.
 *             651 이 **R3** 을 더했다: 같은 사본에서 §5 의 **좁힌** 비 밴드도 빨개진다(×40) —
 *             밴드를 좁힌 것이 «무르게 푼 수리» 가 아님을 이 항이 못박는다.
 *             831 이 **R4** 를 더했다: 같은 사본에서 §3-ⓑ 의 **파생 기대값**도 빨개진다 —
 *             기대값을 손 상수에서 부품 파생으로 옮긴 것이 무르게 푼 것이 아님을 이 항이 못박는다.
 *   §7 에러   콘솔·페이지 에러 0건.
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, ' ');   /* 주석을 뺀 사본 — 주석 속 옛 식에 걸리지 않게 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const eq = (m, got, want) => ok(got === want, m, `기대 ${want} · 실제 ${got}`);
const blk = async (nm, fn) => { try { await fn(); } catch (e) { ok(false, nm + ' — 블록이 던졌다', String(e && e.message || e)); } };

/* 제품이 못박은 상수. 여기 숫자를 바꾸려면 제품과 이 줄을 **같이** 바꿔야 한다(하네스 상수 부패 방지 — 336 교훈 ②) */
/* ⚑ 580 이관(2026-08-31) — 정의가 «리터럴» 에서 «원본 × 배수»(`115 * SPD_SC`)로 바뀌었다.
   358 이 못박은 뜻은 «리터럴이어야 한다» 가 **아니라** «상태가 안 섞인다» 이므로, 모양은 식으로 열되
   ⓒ2 에서 «상태 참조 0건» 을 따로 단언한다(무르게 푼 것이 아니라 축을 옮긴 것이다 — 334 처방 ①).
   식은 `SPD_SC` 하나만 받는 순수식이라 그 값만 넣어 그대로 계산한다(값을 손으로 적으면 336 ② 부패). */
const SPEED_SRC = (CODE.match(/const PLAYER_SPEED\s*=\s*([^;]+);/) || [])[1];
const SPD_SC_SRC = (CODE.match(/const SPD_SC\s*=\s*([\d.]+)\s*;/) || [])[1];
const SPEED = SPEED_SRC === undefined ? NaN
  : Function('SPD_SC', 'return (' + SPEED_SRC + ');')(Number(SPD_SC_SRC));

/* 성장 상태 8종. 전부 «세이브에 들어갈 수 있는 값» 으로만 만든다(플래그 직접 대입 금지 — T2 실동작 규칙). */
const KINDS = ['fresh', 'oldspd', 'train', 'rank', 'relic', 'bless', 'coll', 'all'];
const STATE = kind => `((kind) => {
  const A = kind === 'all';
  localStorage.clear();
  Object.assign(S, DEF());
  S.stage = 50; S.best = 50; S.gold = 1e30; S.dia = 1e12;
  /* 구 세이브가 들고 있던 이속 레벨 — 읽는 곳이 없어야 한다(88 «보상 없이 소멸») */
  if (A || kind === 'oldspd') S.lv.spd = 999;
  if (A || kind === 'train') { S.trainStage = 6; S.lv.atk = 900; S.lv.hp = 900; S.lv.regen = 400; }
  if (A || kind === 'rank') S.rank = 4;
  if (A || kind === 'relic') RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 9 }; });
  if (A || kind === 'bless') { S.bless.lv = 20; BLESS.forEach(b => { S.bless.exp[b.k] = Date.now() + 36e5; }); }
  if (A || kind === 'coll') COLL_SETS.forEach(st => { (st.ids || []).forEach(id => { S.own[id] = S.own[id] || { n: 0, l: 1 }; }); S.coll = S.coll || {}; S.coll[st.key] = 99; });
  markDirty();
  return { speed: +stat.speed.toFixed(4), cp: cp(), spdLv: S.lv.spd | 0 };
})(${JSON.stringify(kind)})`;

/* 실측 이동 속도 — **결정적으로** 재야 한다(344 «플레이키한 게이트»).
   두 오염원을 원천에서 막는다:
     ① 피격 넉백(`player.vx += cos(a)*140`, ~19384)이 섞이면 «이동» 아닌 값이 천장을 넘긴다
        → verify66 하네스와 같이 매 프레임 무적을 다시 세우면 그 분기가 `if(player.inv>0) continue` 로 빠진다.
     ② 자동 AI(59)는 중앙 인력·벽 반발·카이팅으로 방향을 계속 꺾어, 속도가 목표에 **닿기 전에**
        다음 방향으로 간다 — 그래서 피크가 판마다 97~115 로 흔들렸다(실측).
        → 42 조이스틱 분기(`if(joy.on)`)로 한 방향을 고정한다. 이동식(`sp = stat.speed*mmag`)은 원본 그대로이고
          바뀌는 것은 «어느 쪽으로 가느냐» 뿐이라, 배수가 어디 숨어 있어도 그대로 드러난다.
   벽 clamp 로 좌표가 멈춰도 속도는 목표에 붙으므로 **속도**를 눈금으로 삼고, 변위는 참고로 같이 찍는다. */
const MEASURE = `(() => new Promise(res => {
  player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
  player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
  joy.on = true; joy.dx = 1; joy.dy = 0; joy.mag = 1;
  /* ⚠ 예열 15프레임을 버린다 — 게임 루프의 rAF 가 이 콜백보다 **먼저** 등록돼 있어,
     무적을 세우기 직전의 프레임 하나가 넉백(+140)을 얹은 채 첫 표본이 될 수 있다(실측 126 px/s). */
  const WARM = 15;
  let x0 = 0, y0 = 0, t0 = 0, mx = 0, t = 0;
  const tick = () => {
    player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    joy.on = true; joy.dx = 1; joy.dy = 0; joy.mag = 1;    /* 42 수동 이동 — 한 방향 고정 */
    if (t === WARM) { x0 = player.x; y0 = player.y; t0 = performance.now(); }
    if (t >= WARM) mx = Math.max(mx, Math.hypot(player.vx, player.vy));
    if (++t < 120 + WARM) requestAnimationFrame(tick);
    else {
      const sec = (performance.now() - t0) / 1000;
      joy.on = false; joy.dx = 0; joy.dy = 0; joy.mag = 0;
      res({ v: +mx.toFixed(1), kept: t - WARM, disp: +(Math.hypot(player.x - x0, player.y - y0) / sec).toFixed(1) });
    }
  };
  requestAnimationFrame(tick);
}))()`;

async function open(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + file.replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  return { page, errs };
}

/* 한 상태에서 «게터 · 실측» 을 같이 잡는다 */
async function run(page, kind) {
  const g = await page.evaluate(STATE(kind));
  await page.evaluate(() => { spawnStage(); });
  await page.waitForTimeout(2600);
  const m = await page.evaluate(MEASURE);
  return { kind, speed: g.speed, cp: g.cp, spdLv: g.spdLv, v: m.v, kept: m.kept, disp: m.disp };
}

(async () => {
  console.log('=== §1 소스 ===');
  ok(SPEED_SRC !== undefined, '1-ⓒ `const PLAYER_SPEED` 정의가 1곳 있다', SPEED_SRC);
  eq('1-ⓒ 정의는 정확히 1곳', (CODE.match(/const PLAYER_SPEED\s*=/g) || []).length, 1);
  /* 580 이관의 짝 — 모양을 열어 준 대신 «무엇이 들어오면 안 되는가» 를 여기서 막는다 */
  ok(SPEED_SRC !== undefined && Number.isFinite(SPEED) && SPEED > 0,
    '1-ⓒ2 그 정의는 상수만으로 계산된다', `${SPEED_SRC} = ${SPEED}`);
  ok(SPEED_SRC !== undefined && !/\bS\.|\bU\.|lv\(|bonus\(|stat\.|\bmul[A-Z]|\bsb[A-Z]/.test(SPEED_SRC),
    '1-ⓒ2 그 정의에 **상태가 한 항도 안 섞인다**(성장·장비·유물·축복 어느 것도 못 읽는다)', SPEED_SRC);
  eq("1-ⓐ UPG 에 `id:'spd'` 행 0곳 (358 이 지운 그 축)", (CODE.match(/\{ id:'spd',/g) || []).length, 0);
  eq("1-ⓐ `U.spd` 참조 0곳", (CODE.match(/U\.spd\b/g) || []).length, 0);
  eq("1-ⓐ `lv\\('spd'\\)` 참조 0곳", (CODE.match(/lv\('spd'\)/g) || []).length, 0);
  ok(/get speed\(\)\{\s*return PLAYER_SPEED;\s*\}/.test(CODE),
    '1-ⓒ `stat.speed` 는 상수만 돌려준다(배수·보너스가 안 붙는다)',
    (CODE.match(/get speed\(\)\{[^}]*\}/) || ['(못 찾음)'])[0].trim());
  /* 양성항 — «UPG 를 통째로 비워서 초록» 을 막는다(347 교훈 ②: 끄기와 켜기는 짝으로) */
  /* 703 이관(2026-09-02) — 훈련 «공격 속도» 행이 여기서 사라졌다(공속은 목걸이 전속).
     ⚠ 항을 지우지 않고 **방향만** 줄였다(333 처방): 이 목록의 몫은 여전히 «358 이 이동 축 하나만
     지웠고 나머지를 안 쓸어 갔다» 는 양성항이다. 8종은 703 뒤의 전수다. */
  const KEEP = ['atk', 'crit', 'cdmg', 'pierce', 'hp', 'regen', 'def', 'gold'];
  const upgIds = (CODE.match(/\{ id:'([a-z]+)',\s*name:/g) || []).map(s => s.match(/id:'([a-z]+)'/)[1]);
  eq('1-ⓑ 남은 UPG 는 8종(703 이 공격 속도 행을 목걸이로 옮겼다)', upgIds.length, 8);
  KEEP.forEach(id => ok(upgIds.includes(id), '1-ⓑ ' + id + ' 축은 그대로 산다'));
  /* 358 이 «이동» 과 «공격» 을 안 헷갈렸다는 양성항 — 703 이 공격 속도 축을 **옮겼지 없애지 않았다**.
     세 자리(유물·도감·축복)에서 걷힌 그 축은 목걸이 한 곳에 살아 있고, 이 항이 그것을 못박는다.
     ⚠ 이 항이 «아무 데도 없다» 로 바뀌면 358 의 뜻(이동만 지웠다)이 사라진다 — 그래서 «어디에
     살아 있는가» 를 묻는다. 목걸이 밖 0건은 `verify703` 이 따로 센다. */
  ok(/const EQ_AXES = \{[^}]*amulet:\[[^\]]*'rate'/.test(CODE),
    "1-ⓑ 공격 속도 축은 목걸이(EQ_AXES.amulet)에 살아 있다(이동이 아니다 · 703 이관)",
    (CODE.match(/const EQ_AXES = \{[^}]*\}/) || ['(못 찾음)'])[0]);
  ok(/get rate\(\)\{\s*return Math\.min\(RATE_CAP, BASE_RATE \* mulRate\(\)\);\s*\}/.test(CODE),
    "1-ⓑ `stat.rate` 는 «상수 바닥 × 목걸이 배수» 다(703 이관)",
    (CODE.match(/get rate\(\)\{[^}]*\}/) || ['(못 찾음)'])[0].trim());
  /* 359 이관(2026-08-29) — 이 항은 원래 리터럴 `1.08` 을 물었다. 359 가 주인 지시
     («보스는 플레이어보다 살짝 느리지만 대시 공격») 로 그 값을 **0.94** 로 내리면서 리터럴이 죽었다.
     358 이 지킨 것은 «값» 이 아니라 **«보스 추격이 플레이어 이속 상수에 «비» 로 걸려 있다» 는 형태**다
     (§5 가 `stat.speed * BOSS_CHASE` 로 바닥을 역산하는 것도 그 형태를 쓴다). 그래서 형태를 묻는다 —
     값 자체(1 아래 · 대시가 메운다)는 359 의 게이트 `verify359` §1 이 소유한다.
     ⚠ 이 항이 사라지면 «358 이 이동 축을 지우면서 보스 추격을 상수에서 떼어 놨다» 를 아무도 안 본다. */
  ok(/const BOSS_CHASE\s*=\s*[0-9.]+\s*;/.test(CODE) && /Math\.max\(e\.sp,\s*stat\.speed\*BOSS_CHASE\)/.test(CODE),
    '1-ⓑ 66 보스 추격 바닥은 «플레이어 이속 상수 × BOSS_CHASE» 형태 그대로다(값은 359 몫)',
    (CODE.match(/const BOSS_CHASE\s*=\s*[0-9.]+/) || ['(못 찾음)'])[0]);

  const browser = await launch(chromium);
  const h = await open(browser, SRC);

  /* ── §2 불변 ─────────────────────────────────────────────────────── */
  console.log('\n=== §2 불변 — 성장 상태 8종에서 stat.speed 가 한 값 ===');
  const got = {};
  for (const k of KINDS) {
    await blk('§2 ' + k, async () => {
      const r = await h.page.evaluate(STATE(k));
      got[k] = r;
      ok(Math.abs(r.speed - SPEED) < 1e-6, `2 ${k} — stat.speed = ${SPEED}`, `${r.speed} (cp ${r.cp})`);
    });
  }
  await blk('§2 대조', async () => {
    const cps = KINDS.map(k => (got[k] || {}).cp).filter(Boolean);
    const spread = Math.max(...cps) / Math.min(...cps);
    ok(spread > 1000, '2 같은 칸에서 cp() 는 실제로 벌어졌다(상태가 만들어졌다는 증거)',
      `최소 ${Math.min(...cps)} · 최대 ${Math.max(...cps)} = ×${Math.round(spread)}`);
    eq('2 구 세이브의 S.lv.spd 는 그대로 들려 있다(그런데 속도는 불변)', (got.oldspd || {}).spdLv, 999);
  });

  /* ── §3 표시 ─────────────────────────────────────────────────────── */
  console.log('\n=== §3 표시 ===');
  await blk('§3', async () => {
    const r = await h.page.evaluate(`(() => {
      localStorage.clear(); Object.assign(S, DEF()); S.gold = 1e12; markDirty();
      renderUp();
      const rows = [...document.querySelectorAll('#bUp .up')].map(el => el.dataset.u);
      renderSpec();
      const spc = [...document.querySelectorAll('#spcList .spc-row')]
        .map(el => [el.querySelector('.nm').textContent.trim(), el.querySelector('.vl').textContent.trim()]);
      /* 831 — «증가 0» 의 **문자열**은 제품의 표기 부품에서 뽑는다(손으로 적지 않는다).
         zero = 배율 1(증가 0) · some = 증가가 있는 배율 — 둘이 같으면 이 자는 눈금이 아니다. */
      return { rows, spc, zero: fmtMul(1), some: fmtMul(1.5), ratio: stat.speed / PLAYER_SPEED };
    })()`);
    eq('3-ⓐ «강화» 탭 행 수 = 8 (703 이관 — 공격 속도 행이 목걸이로 갔다)', r.rows.length, 8);
    ok(!r.rows.includes('spd'), '3-ⓐ 그 중 이동 속도 행은 없다', r.rows.join(' · '));
    KEEP.forEach(id => ok(r.rows.includes(id), '3-ⓐ ' + id + ' 행은 화면에 그대로 선다'));
    /* 양성항 — «강화 탭이 통째로 죽어서 spd 가 안 보이는 것» 을 막는다(T2 실동작 규칙: 실제로 눌러 본다) */
    const buy = await h.page.evaluate(`(() => {
      S.gold = 1e12; S.buyQty = 1; S.autoBuy = false; markDirty(); renderUp();
      const el = document.querySelector('#bUp .up[data-u="def"]');
      if (!el) return { err: 'def 행이 없다' };
      const g0 = S.gold, l0 = S.lv.def | 0;
      el.click();
      return { dl: (S.lv.def | 0) - l0, spent: g0 - S.gold, speed: +stat.speed.toFixed(4) };
    })()`);
    if (buy.err) ok(false, '3-ⓐ 남은 행을 눌러 본다', buy.err);
    else {
      eq('3-ⓐ 남은 행(def)을 누르면 여전히 Lv +1 = 강화 탭은 살아 있다', buy.dl, 1);
      ok(buy.spent > 0, '3-ⓐ 그리고 골드가 실제로 나갔다', buy.spent.toFixed(0));
      eq('3-ⓐ 그 강화로도 이동 속도는 안 변한다', buy.speed, SPEED);
    }
    const mv = r.spc.find(x => /이동 속도/.test(x[0]));
    ok(!!mv, '3-ⓑ 20 프로필 스펙 «이동 속도» 행은 레퍼런스 줄이라 **살아 있다**', mv && mv.join(' = '));
    /* ⚑ 831(2026-09-02) — 여기 있던 «값은 0% 다» 는 **표기를 상수로 굳힌 항**이었다. 725 가 효과 표기를
       한 벌(`fmtMul`)로 «×N배» 로 갈면서 같은 값(증가 0)의 **표기만** `0%` → `×1배` 로 바뀌었는데
       725 의 이관 16종 목록에 358 이 빠져 이 한 항이 빨간 채 굳었다.
       ⚠ 처방으로 «`×1배` 도 통과» 를 고르면 **축이 되살아나 값이 커져도 초록**이 된다(334 교훈).
       그래서 무르게 풀지 않고 **제품의 표기 부품에서 파생된 문자열**과 맞춘다 — 표기 규칙이 또 바뀌어도
       자가 따라오고, 값이 변하면 즉시 빨개진다. 판별력은 바로 아래 [전제] 항이 못박는다(§R 의 R4 도 같은 것을
       되돌림 사본에서 확인한다). */
    ok(r.zero !== r.some,
      '3-ⓑ-전제 표기 부품이 «증가 0» 과 «증가 있음» 을 실제로 가른다(눈금이 상수로 뭉개지지 않았다)',
      `증가 0 «${r.zero}» ↔ ×1.5 «${r.some}»`);
    eq('3-ⓑ 그리고 값은 «증가 0» 표기로 고정이다(표기 부품에서 파생 — 손 상수 아님)',
      mv && mv[1], r.zero);
    eq('3-ⓑ 그 표기의 뿌리인 비 자체가 정확히 1 이다(표기만 맞고 값이 다른 것을 막는다)', r.ratio, 1);
  });

  /* ── §4 실동작 · §5 66 ───────────────────────────────────────────── */
  console.log('\n=== §4 실동작 — 화면 위 플레이어 ===');
  const meas = {};
  for (const k of ['fresh', 'all']) {
    await blk('§4 ' + k, async () => {
      const r = await run(h.page, k);
      meas[k] = r;
      ok(r.v <= SPEED + 1.5, `4 ${k} — 실측 속도가 상수를 안 넘는다`,
        `${r.v} px/s ≤ ${SPEED} (표본 ${r.kept}프레임 · 변위 ${r.disp} px/s)`);
    });
  }
  await blk('§4 대조', async () => {
    /* «천장이 같다» 를 «두 값이 같다» 로 재면 안 된다 — 피격이 잦은 판은 표본이 짧아 천장에 덜 붙는다.
       물어야 하는 것은 **방향**이다: 성장이 천장을 못 올린다 + 두 판 다 천장 근처까지 올라간다. */
    ok(meas.fresh && meas.all && meas.all.v <= meas.fresh.v + 1.5,
      '4 성장을 만렙으로 흔들어도 천장이 안 올라간다(게터 밖 배수가 없다)',
      meas.fresh && meas.all ? `Lv0 ${meas.fresh.v} → 만렙 ${meas.all.v}` : '?');
    ['fresh', 'all'].forEach(k => ok(meas[k] && meas[k].v > SPEED * 0.97,
      `4 ${k} — 그 천장에 실제로 붙는다(«안 움직여서 초록» 이 아니다)`,
      meas[k] && `${meas[k].v} ≥ ${(SPEED * 0.97).toFixed(1)}`));
  });

  /* ⚑ 651 — 이 표본은 §R 도 쓴다(되돌림 사본에서 «좁힌 밴드가 실제로 빨개지는가»)라
     블록 밖에 둔다. 같은 자를 두 벌 적으면 한쪽만 고쳐지는 자리가 된다. */
    /* ⚠ 세 함정.
       ① 적에게는 `vx/vy` 가 없다(288 이 kx/ky 를 폐지하고 좌표를 직접 옮긴다) — **변위**로 잰다.
       ② 공격 모션 중에는 `spd = 0` 으로 서고(66) 359 돌진 중에는 `stat.speed × DASH.boss.spd`
          로 튄다 — 그래서 «평균» 은 표본 창이 어느 국면에 걸렸는지에 통째로 흔들린다(실측 78~114).
          이 절이 물어야 하는 것은 **추격 바닥**이므로, 돌진·예고 프레임을 뺀 프레임들의
          «변위 ÷ dt» 최댓값을 눈금으로 삼는다 — 그 값은 실측 6/6 표본에서 소스가 말한 바닥과
          **정확히 같았다**(253 px/s).
       ③ ⚑ **651 — 벽시계로 시뮬을 재면 안 된다.** 제품 `loop` 는 `if(dt > 0.1) dt = 0.1` 로
          클램프하므로(38846), 프레임이 굶어 rAF 간격이 100ms 를 넘으면 **시뮬 시간이 벽시계보다
          덜 흐른다**. 그 아래에서 `변위 / 벽시계초` 는 «느려진 보스» 가 아니라 «덜 흐른 시계» 를
          읽는다(재현 `tools/probe651.js` §2-b — 부하 아래에서 ×0.51 로 내려앉았다).
          ⇒ 나눗셈의 분모도, 보스를 기다리는 대기도 전부 **시뮬 시계**로 옮겼다:
            · 분모 = 프레임별 `S.playtime` 증분(= 제품이 실제로 쓴 dt).
            · 대기 = `startBoss()` 의 예약이 **시뮬 1.4초**(21359)라 벽시계 고정 대기가 아니라 폴링.
          부하 아래에서도 이 자는 253 그대로다(probe651 §2-c ×1.02 · 흔들림 1.6%). */
    const runBoss = lvSpd => `(async () => {
      localStorage.clear(); Object.assign(S, DEF());
      S.stage = 50; S.best = 50; S.lv.spd = ${lvSpd}; markDirty();
      /* ⚠ startBoss() 는 «if(battleBusy()) return» 으로 시작한다 — 앞 절이 남긴 전장을 먼저 치운다.
         (이 블록은 템플릿 리터럴 안이다 — 여기 백틱을 쓰면 문자열이 끊긴다) */
      if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
      promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
      enemies.length = 0; spawnQ.length = 0;
      startBoss();
      const B = () => enemies.find(e => e.tk === 'boss');
      /* 651 — 벽시계 고정 대기(구 2200ms)는 프레임이 굶으면 모자란다. 설 때까지 기다린다. */
      const w0 = performance.now();
      while (!B() && performance.now() - w0 < 20000) await new Promise(r2 => setTimeout(r2, 40));
      if (!B()) return { err: '보스가 20초 안에 안 섰다 — 필드 [' + enemies.map(e => e.tk).join(',') + ']' };
      const sp0 = +B().sp.toFixed(1);
      let path = 0, px = B().x, py = B().y, fr = 0, nC = 0, mxC = 0;
      const t0 = performance.now(), s0 = S.playtime;
      let ps = S.playtime;
      for (let i = 0; i < 900; i++) {
        await new Promise(r2 => requestAnimationFrame(r2));
        const e2 = B(); if (!e2) break;
        const d = Math.hypot(e2.x - px, e2.y - py); px = e2.x; py = e2.y;
        const dts = S.playtime - ps; ps = S.playtime;
        path += d; fr++;
        /* 359 돌진(dashD)·예고(dashT) 프레임은 «추격» 이 아니다 — 그 축은 DASH.boss.spd 다 */
        if (dts > 0 && !(e2.dashD > 0) && !(e2.dashT > 0)) { nC++; mxC = Math.max(mxC, d / dts); }
        if (S.playtime - s0 >= 2.5 && nC >= 12) break;
        if (S.playtime - s0 >= 8) break;
      }
      const wall = (performance.now() - t0) / 1000, sim = S.playtime - s0;
      /* ⚠ 표본 끝에 보스가 사라져 있을 수 있다(제한 시간·격파) — 기본 속도는 **처음에** 잡아 둔 값을 쓴다 */
      return { chase: +mxC.toFixed(1), nC, fr,
               sim: +sim.toFixed(2), wall: +wall.toFixed(2),
               avgWall: +(path / Math.max(0.1, wall)).toFixed(1),
               floor: +(stat.speed * BOSS_CHASE).toFixed(1), baseSp: sp0,
               pSpeed: stat.speed, chaseK: BOSS_CHASE };
    })()`;

  console.log('\n=== §5 66 보스 추격 바닥은 상수에 «비» 로 걸린다 ===');
  await blk('§5', async () => {
    const a = await h.page.evaluate(runBoss(0));
    const b = await h.page.evaluate(runBoss(999));
    if (a.err || b.err) ok(false, '5 보스 상태를 못 만들었다', a.err || b.err);
    else {
      eq('5 플레이어 속도는 보스전에서도 상수', b.pSpeed, SPEED);
      /* 359 이관 — 계수를 소스에서 읽어 «상수 × 계수» 를 검산한다(옛 코드는 1.08 을 박아 뒀다) */
      const CH = Number((CODE.match(/const BOSS_CHASE\s*=\s*([0-9.]+)/) || [])[1]);
      ok(CH > 0 && Math.abs(b.floor - SPEED * CH) < 0.2, `5 추격 바닥 = 상수 × ${CH}`, b.floor + ' px/s');
      ok(b.baseSp < b.floor, '5 이 스테이지의 보스 기본 속도는 바닥보다 느리다 = 바닥이 실제로 걸린다',
        `기본 ${b.baseSp} < 바닥 ${b.floor}`);
      /* 651 전제 — 표본이 «시뮬 시계로» 실제로 열렸는가. 이 두 항이 없으면 창이 0.2초만 열려도
         아래 비가 초록일 수 있다(«아무것도 안 재서 초록» 을 막는다). */
      ok(a.sim >= 2.4 && b.sim >= 2.4, '5-전제 표본 창이 **시뮬 시간으로** 실제로 열렸다',
        `Lv0 시뮬 ${a.sim}s(벽 ${a.wall}s) · Lv999 시뮬 ${b.sim}s(벽 ${b.wall}s)`);
      ok(a.nC >= 12 && b.nC >= 12, '5-전제 그 창에 **추격** 프레임이 실제로 있다(돌진·예고만 잡은 게 아니다)',
        `Lv0 ${a.nC}/${a.fr}프레임 · Lv999 ${b.nC}/${b.fr}프레임`);
      /* 651 — 벽시계 자로는 절대 못 물었던 것. 옛 주석은 «벽시계 최댓값은 내부 dt 와 1.8배까지
         어긋난다» 며 절대값 대조를 포기했는데, 시뮬 시계로 재면 바닥에 **정확히** 붙는다. */
      ok(a.floor > 0 && Math.abs(a.chase / a.floor - 1) <= 0.03,
        '5 실측 추격 속도가 소스가 말한 바닥에 붙는다(자가 눈금을 되찾았다)',
        `실측 ${a.chase} vs 바닥 ${a.floor} px/s (×${(a.chase / a.floor).toFixed(3)})`);
      const ratio = b.chase / Math.max(1, a.chase);
      ok(ratio > 0.97 && ratio < 1.03,
        '5 구 세이브의 spd Lv999 가 실측 보스 추격 속도를 못 올린다',
        `Lv0 ${a.chase} → Lv999 ${b.chase} px/s (×${ratio.toFixed(3)})`);
      ok(a.chase > b.baseSp * 0.5, '5 그리고 보스가 실제로 움직였다(표본이 0 이 아니다)',
        `${a.chase} px/s · 추격 ${a.nC}프레임 · 참고 평균벽 ${a.avgWall} px/s`);
    }
  });

  /* ── §6 구 세이브 실제 로드 ───────────────────────────────────────── */
  console.log('\n=== §6 구 세이브 이관 ===');
  await blk('§6', async () => {
    const key = (CODE.match(/const KEY\s*=\s*'([^']+)'/) || [])[1] || 'idle_hunter_save_v4';
    /* ⚠ 같은 탭을 리로드하면 안 된다 — 살아 있는 페이지가 언로드·타이머로 `save()` 를 한 번 더 구워
       방금 박은 세이브를 «직전 절의 상태» 로 덮는다(실측: spd Lv999 가 그대로 돌아왔다).
       **새 탭 + `addInitScript`** 로 앱이 뜨기 전에 심으면 그 경합 자체가 없다. */
    await h.page.evaluate(() => { window.requestAnimationFrame = () => 0; save = () => {}; });
    const SAVE = {
      stage: 50, best: 50, gold: 1e12,
      lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
    };
    const p2 = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const e2 = [];
    p2.on('pageerror', e => e2.push(String(e && e.message || e)));
    await p2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (_) {} },
      [key, JSON.stringify(SAVE)]);
    await p2.goto('file://' + SRC.replace(/\\/g, '/'));
    await p2.waitForTimeout(1500);
    const r = await p2.evaluate(`({ speed: +stat.speed.toFixed(4), spdLv: S.lv.spd | 0, atkLv: S.lv.atk | 0 })`);
    eq('6 구 세이브를 로드하는 동안 페이지 에러 0건', e2.length, 0);
    await p2.close();
    eq('6 구 세이브를 실제로 로드해도 속도 = 상수', r.speed, SPEED);
    eq('6 그 세이브의 다른 축은 정상 승계된다(로드가 통째로 실패한 게 아니다)', r.atkLv, 900);
    eq('6 남은 `lv.spd` 는 들려 있지만 아무 곳도 안 읽는다(88 «보상 없이 소멸»)', r.spdLv, 20);
  });

  /* ── §R 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n=== §R 되돌림 시험 — 옛 식으로 되돌리면 §2·§4 가 빨개진다 ===');
  const tmp = path.join(ROOT, `index.verify358-revert-${process.pid}.html`);
  await blk('§R', async () => {
    const old = RAW
      .replace('get speed(){ return PLAYER_SPEED; },', "get speed(){ return 115 + 4.5*lv('spd'); },");
    ok(old !== RAW, 'R0 되돌림 사본이 실제로 만들어졌다');
    fs.writeFileSync(tmp, old);
    const r = await open(browser, tmp);
    const a = await r.page.evaluate(STATE('fresh'));
    const b = await r.page.evaluate(STATE('oldspd'));
    ok(Math.abs(b.speed - a.speed) > 100,
      'R1 되돌린 사본에서는 구 세이브의 spd 레벨이 다시 속도를 올린다(§2 가 빨개진다)',
      `${a.speed} → ${b.speed}`);
    const m = await run(r.page, 'oldspd');
    ok(m.v > SPEED + 1.5, 'R2 그리고 화면 위 실측도 상수를 넘긴다(§4 가 빨개진다)', m.v + ' px/s');
    /* ⚑ 651 — **§5 의 새 자도 되돌림에 걸리는지** 못박는다. 벽시계를 시뮬 시계로 바꾸면서
       허용 밴드를 0.75~1.33 → 0.97~1.03 으로 **좁혔으므로**, 그 자가 진짜 회귀를 여전히
       잡는다는 것을 여기서 보여야 «무르게 푼 수리» 와 구별된다(334 처방 · 368 세 겹 규약). */
    const ra = await r.page.evaluate(runBoss(0));
    const rb = await r.page.evaluate(runBoss(999));
    if (ra.err || rb.err) ok(false, 'R3 되돌린 사본에서 보스 상태를 못 만들었다', ra.err || rb.err);
    else {
      const rr = rb.chase / Math.max(1, ra.chase);
      ok(!(rr > 0.97 && rr < 1.03),
        'R3 되돌린 사본에서는 §5 의 **좁힌 비 밴드**가 실제로 빨개진다(자가 회귀를 여전히 잡는다)',
        `Lv0 ${ra.chase} → Lv999 ${rb.chase} px/s (×${rr.toFixed(2)}) · 밴드 0.97~1.03`);
      ok(rb.chase > ra.chase * 2,
        'R3 그리고 그 이유는 «추격 바닥이 실제로 올라갔다» 이다(자가 딴 것을 재고 있는 게 아니다)',
        `바닥 ${ra.floor} → ${rb.floor} px/s`);
    }
    /* ⚑ 831 — **§3-ⓑ 도 되돌림에 걸리는지** 못박는다. 그 항의 기대값을 손 상수(`0%`)에서
       제품 표기 부품 파생(`fmtMul(1)`)으로 옮긴 것이 «무르게 푼 수리» 가 아님은,
       축이 되살아난 사본에서 같은 항이 실제로 빨개지는 것으로만 보일 수 있다(334 처방 · 368 세 겹 규약). */
    const sp = await r.page.evaluate(`(() => {
      try {
        localStorage.clear(); Object.assign(S, DEF()); S.lv.spd = 999; markDirty(); renderSpec();
        const row = [...document.querySelectorAll('#spcList .spc-row')]
          .find(el => /이동 속도/.test(el.querySelector('.nm').textContent));
        if(!row) return { err: '되돌린 사본에 이동 속도 행이 없다' };
        return { v: row.querySelector('.vl').textContent.trim(), zero: fmtMul(1) };
      } catch(e) { return { err: String(e && e.message || e) }; }
    })()`);
    if (sp.err) ok(false, 'R4 되돌린 사본에서 스펙 행을 못 읽었다', sp.err);
    else ok(sp.v !== sp.zero,
      'R4 되돌린 사본에서는 §3-ⓑ 가 실제로 빨개진다(파생 기대값이 여전히 회귀를 잡는다)',
      `실제 «${sp.v}» ↔ «증가 0» «${sp.zero}»`);
    await r.page.close();
  });
  try { fs.unlinkSync(tmp); } catch (_) {}

  console.log('\n=== §7 에러 ===');
  eq('콘솔·페이지 에러 0건', h.errs.length, 0);
  if (h.errs.length) h.errs.slice(0, 5).forEach(e => console.log('     ' + e));

  await browser.close();
  console.log('\nVERIFY358 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
