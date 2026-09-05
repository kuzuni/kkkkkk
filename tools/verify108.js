#!/usr/bin/env node
/* 작업 108 게이트 — «67 카메라 연출 폐기» 검증 (ROUTINE [3]-(가) 수치 검증. verify67.js 를 대체한다)
 *
 *   node tools/verify108.js
 *   V108_SEC=60 node tools/verify108.js
 *
 * 저장소 주인 지시(2026-08-26)의 완료 조건을 그대로 옮긴 것이다:
 *   ① 보스 등장 팬·줌·플래시·hold / 처치 슬로모·줌·복귀 / 빈사 편향(bx,by) / 리드(lx,ly) 코드가 **소스에 없다**
 *   ② 남는 것은 «플레이어 중심 단순 감쇠 추적 1개» — 카메라 상수는 CAM_K 하나뿐
 *   ③ 맵 2배(1920×3072)·스폰 링은 **유지** · 월드 경계 클램프가 산다
 *   ④ 헤드리스 전투 동안 cam.z 는 항상 1 · 카메라는 클램프 상황 외에 플레이어에서 60px 넘게 떨어지지 않는다
 *      · 보스 등장/처치를 1회 이상 지나도 그 값이 흔들리지 않는다 · 오류 0
 *
 * verify59 와 같이 rAF 를 가상 시계(고정 dt 1/60s)로 갈아끼워 CPU 속도로 «전투 60초» 를 돌린다.
 *
 * 223(2026-08-27) — ④ 의 «보스» 표본을 만드는 방법이 낡아 21/22 로 굳어 있었다. 보스는 더 이상
 * «10 의 배수 스테이지» 에 있지 않고(162 가 `isBossStage` 를 폐기했다) 모든 스테이지에서
 * «몹 ENEMY_COUNT 킬 → startBoss()» 로만 나온다. 세우는 길과 처치하는 길을 둘 다 제품 함수로
 * 갈아 끼웠다(RUN 안 주석 참고). ①②③ 정적 검사와 카메라 판정식은 한 줄도 바뀌지 않았다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();


const ROOT = path.resolve(__dirname, '..');
const SEC = Number(process.env.V108_SEC || 60);
const LAG_MAX = 60;          /* 클램프가 걸리지 않은 프레임의 카메라–플레이어 허용 거리(월드 px) */
/* 223 — 보스가 전장에 선 뒤 처치까지 지나 보낼 프레임 수(가상 60fps 기준 1.5초).
   «등장 직후 카메라» 와 «처치 직후 카메라» 를 둘 다 표본에 넣기 위한 값이다. */
const KILL_AFTER = 90;
const fails = [];
const okline = [];
const ok = (cond, msg) => { (cond ? okline : fails).push(msg); return cond; };

/* ── ① 정적 검사 — 연출 코드가 «소스에 남아 있지 않다» ───────────────────────── */
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 주석까지 세면 «폐기했다» 는 설명문이 걸린다 — 코드 줄만 본다(줄 앞뒤 주석 토막 제거) */
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\w])\/\/[^\n]*/g, '$1 ');

const DEAD = [
  ['cam.lx / cam.ly (리드)',        /\bcam\s*\.\s*l[xy]\b/g],
  ['cam.bx / cam.by (빈사 편향)',   /\bcam\s*\.\s*b[xy]\b/g],
  ['cine 상태·연출 함수',           /\bcine\b|\bcineBossIn\b|\bcineBossKill\b|\bcineReset\b|\bcineBusy\b|\bcineStart\b|\bcineWeight\b/g],
  ['CINE_* 연출 상수',              /\bCINE_[A-Z_]+\b/g],
  ['CAM_KCINE / CAM_KKILL',         /\bCAM_KCINE\b|\bCAM_KKILL\b/g],
  ['CAM_LEAD / CAM_LEADK',          /\bCAM_LEAD[A-Z]*\b/g],
  ['CAM_LOW* (빈사 편향 상수)',     /\bCAM_LOW[A-Z_]*\b/g],
  ['camTimeScale (처치 슬로모)',    /\bcamTimeScale\b/g],
  ['camEaseOut / camSm (연출 이징)',/\bcamEaseOut\b|\bcamSm\b/g],
  ['spriteHalf (연출 담기 상한)',   /\bspriteHalf\b/g],
];
for (const [name, re] of DEAD) {
  const n = (code.match(re) || []).length;
  ok(n === 0, `${name} 참조 ${n} 건` + (n ? ' — 남아 있다' : ''));
}

/* ── 636(2026-09-01) — «ctx.scale 카메라 줌» 축을 다시 세운다 ───────────────────
   옛 항은 DEAD 목록의 한 줄이었고 «등방 배율(같은 값 두 축)이면 카메라 줌» 을 전제했다.
   그 전제가 541(«스킬 ×2» — `ctx.scale(SK_DRAW_SC, SK_DRAW_SC)` 2자리)·590(펫 ×2)으로 깨져
   그리기 배율을 카메라 줌으로 읽고 빨간 채 굳어 있었다(재현 `tools/probe636.js` [1-a]·[1-b]).
   ⚠ **이름을 예외로 빼는 수리는 반려다** — 다음에 누가 같은 이름으로 카메라 줌을 되살려도 통과한다.
   축을 «식별자 이름» 이 아니라 **«그 배율이 어디서 오는가»** 로 바꾼다:
     · 화이트리스트를 **선언에서 파생**한다 — `const *_DRAW_SC = <숫자 리터럴>` 만 그리기 배율로 인정.
       카메라에서 오는 값은 상수 숫자 선언일 수 없으므로 이 문은 이름이 아니라 **출처**를 묻는다.
     · 손으로 박은 등방 리터럴(`ctx.scale(1.5, 1.5)`)은 여전히 빨강 — 541 규약(«표 값을 손으로 곱하지 마라»).
     · 좌우 반전 `ctx.scale(-1, 1)` 은 비등방이라 애초에 안 걸린다(옛 주석의 렌더 규약 그대로).
   ⚑ 옛 패턴이 **못 보던 구멍도 같이 닫는다** — 멤버 접근 꼴 `ctx.scale(cam.z, cam.z)`.
      카메라 줌이 되살아난다면 그 꼴이 가장 그럴듯한데 옛 정규식은 식별자 하나만 봤다(probe636 [1-f]). */
const DRAW_SC = new Map();
for (const m of code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*_DRAW_SC)\s*=\s*(-?\d+(?:\.\d+)?)\s*[;,\n]/g))
  DRAW_SC.set(m[1], Number(m[2]));
const ISO_SCALE = /ctx\s*\.\s*scale\s*\(\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*|-?\d+\.\d+)\s*,\s*\1\s*\)/g;
const isoOf = s => [...s.matchAll(ISO_SCALE)].map(m => m[1].replace(/\s+/g, ''));
const zoomHits = isoOf(code).filter(a => !DRAW_SC.has(a));
ok(DRAW_SC.size > 0,
   `그리기 배율 상수 선언 ${DRAW_SC.size}건 — 화이트리스트가 공허하지 않다` +
   (DRAW_SC.size ? ` [${[...DRAW_SC.keys()].join(', ')}]` : ''));
ok(zoomHits.length === 0,
   `ctx.scale 등방 배율 중 «그리기 배율 상수» 로 설명 안 되는 자리 ${zoomHits.length} 건` +
   (zoomHits.length ? ` — [${zoomHits.join(', ')}] 남아 있다` : ''));
/* 되돌림 시험 — 무르게 푼 것이 아님을 매 실행 다시 푼다(항이 공허하면 여기가 빨개진다).
   임시 문자열에만 주입한다 — 제품은 한 글자도 안 건드린다. */
ok(isoOf(code + '\n ctx.scale(camZoom, camZoom); \n').filter(a => !DRAW_SC.has(a)).length === 1,
   '[R] 되돌림 — 식별자 꼴 카메라 줌을 주입하면 잡힌다');
ok(isoOf(code + '\n ctx.scale(cam.z, cam.z); \n').filter(a => !DRAW_SC.has(a)).length === 1,
   '[R] 되돌림 — **멤버 접근 꼴** 카메라 줌을 주입하면 잡힌다(옛 패턴이 놓치던 구멍)');
ok(isoOf(code + '\n ctx.scale(1.5, 1.5); \n').filter(a => !DRAW_SC.has(a)).length === 1,
   '[R] 되돌림 — 손으로 박은 등방 리터럴을 주입하면 잡힌다(541 «표 값을 손으로 곱하지 마라»)');
ok(isoOf('ctx.scale(-1, 1);').length === 0,
   '[R] 음성 — 좌우 반전 ctx.scale(-1, 1) 은 렌더 규약이라 안 잡는다');
/* 카메라 상수는 CAM_K «하나» 여야 한다 */
const camConsts = [...code.matchAll(/\bconst\s+(CAM_[A-Z_]*)\s*=/g)].map(m => m[1]);
ok(camConsts.length === 1 && camConsts[0] === 'CAM_K', `카메라 상수 = [${camConsts.join(', ')}] (기대: CAM_K 하나)`);
/* ③ 맵 2배·스폰 링 유지 */
ok(/const\s+WORLD\s*=\s*\{\s*w:\s*40\s*\*\s*T\s*,\s*h:\s*64\s*\*\s*T\s*\}/.test(code), '맵 2배(40×64 타일 = 1920×3072) 유지');
ok(/function\s+camClamp\s*\(/.test(code), '월드 경계 클램프 camClamp() 존재');
/* 폐기된 옛 게이트가 남아 있으면 안 된다 */
for (const f of ['tools/verify67.js', 'tools/cap67.js'])
  ok(!fs.existsSync(path.join(ROOT, f)), `${f} 삭제됨`);

/* ── ④ 런타임 검사 ────────────────────────────────────────────────────────── */
const RUN = async ({ frames, lagMax, killAfter }) => {
  /* «보스 단독 스폰 + 30초 제한» 흐름을 그대로 태운다.
     ── 223(2026-08-27) — 옛 코드는 `S.stage = 10`(10 의 배수 = 보스 스테이지) 하나로 보스를 불렀다.
     그 규칙은 **162 가 폐기**했다(index.html ~14498 «구 isBossStage 폐기»): 이제 보스는 **모든**
     스테이지에 있고, 길은 «일반 몹 ENEMY_COUNT 킬 → startBoss()» 하나뿐이다. 그래서 `spawnStage()`
     는 보스가 아니라 잡몹 50마리를 깔았고, 60초(가상) 안에 50킬이 안 나 «보스 등장 0회» 로
     굳어 있었다 — 카메라가 아니라 **게이트의 전제**가 낡은 것이다(index.html 무관).
     기대값을 «화면이 쓴 식» 이 아니라 «근거 데이터» 에서 가져온다(212-①): 제품이 실제로 보스를
     세우는 길 = step() 의 «③ 몹을 다 채웠다 → 보스 도전» 분기다. verify162 의 `killed = ENEMY_COUNT`
     관례와 같은 자를 쓴다(tools/verify162.js killTo). */
  S.stage = 10; S.best = Math.max(S.best || 1, 10); S.bossFarm = false;
  spawnStage();
  player.dead = 0; player.hp = stat.maxHp;
  enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;   /* 다음 step 이 startBoss() 를 부른다 */
  const r = {
    n: 0, zBad: 0, zMin: Infinity, zMax: -Infinity,
    lagBad: 0, lagMax: 0, lagMaxFree: 0, clamped: 0, introFrames: 0,
    introLen: (typeof bossIntroLen === 'function' ? bossIntroLen() : 0),
    /* 636 — 등장 국면을 **연속 구간(판)으로 끊어** 담는다. 옛 코드는 `introFrames` 합계만 들고
       한 판을 전제한 상한과 견줬다(런에 보스가 2회 서면 곧바로 빨강). */
    introWins: [], bossSeenSettled: 0,
    bossSeen: 0, bossKilled: 0, shakeMax: 0, nan: 0,
    keys: Object.keys(cam).sort().join(','),
  };
  let hadBoss = false, bossLive = 0, didKill = false, introRun = 0;
  for (let f = 0; f < frames; f++) {
    window.__v108tick();
    const boss = enemies.find(e => e.tk === 'boss' && e.hp > 0);
    if (boss) {
      if (!hadBoss) {
        r.bossSeen++; hadBoss = true; bossLive = 0;
        /* 636 — 런 끝에 걸친 판은 등장 국면이 «잘려서» 짧게 잡힌다. 창 개수를 보스 수와 견줄 때
           그런 판은 빼야 자가 플레이키해지지 않는다(344·372·632 교훈). 한 창이 통째로 들어갈
           여유가 남아 있을 때 선 보스만 «정착» 으로 센다. */
        if (f <= frames - (Math.round(r.introLen * 60) + 2)) r.bossSeenSettled++;
      }
      /* 223 — 헤더 ④ 는 «보스 등장/처치를 1회 이상 지나도» 라고 적어 두었지만 처치 프레임은
         한 번도 지나간 적이 없다: 스테이지 10 보스는 체력 ×22 라 기본 스탯으로는 BOSS_SEC(30초)
         제한 안에 안 죽고, 그대로 시간 초과 → 파밍으로 빠진다. 그래서 «슬로모·줌·복귀가 폐기됐다»
         는 ④ 의 런타임 확인이 통째로 비어 있었다.
         제품의 처치 경로 `killEnemy()` 를 그대로 부른다(verify162 §4 와 같은 자). 보스가 살아 있는
         프레임을 killAfter 만큼 먼저 지나 보내 «등장 → 추격 → 처치 → 복귀» 를 순서대로 태운다. */
      if (!didKill && ++bossLive >= killAfter) { didKill = true; killEnemy(boss); }
    }
    else if (hadBoss) { r.bossKilled++; hadBoss = false; }

    const z = cam.z;
    if (z !== 1) r.zBad++;
    r.zMin = Math.min(r.zMin, z); r.zMax = Math.max(r.zMax, z);
    if (!isFinite(cam.x) || !isFinite(cam.y) || !isFinite(z)) r.nan++;
    r.shakeMax = Math.max(r.shakeMax, cam.shake || 0);

    /* 클램프가 걸린 프레임(월드 가장자리)은 «카메라가 플레이어를 못 따라가는 게 정상» 이라 제외한다.
       ⚑ 457 이관(주인 지시 2026-08-30 «모든 보스전») — 예외가 하나 더 생겼다: **보스 등장 국면**은
          카메라가 «일부러» 플레이어를 떠나는 창이다(425 가 던전에서 연 이탈을 457 이 28·승급전·
          레이드로 넓혔다). 항을 눌러서 상한을 올리지 않고 **그 창을 세어서** 따로 묻는다 —
          국면이 0프레임이면 아래 [457] 항이 빨개지므로 «이탈을 핑계로 넓힌 게이트» 가 되지 않는다. */
    const intro = (typeof bossIntro !== 'undefined' && bossIntro);
    if (intro) { r.introFrames++; introRun++; }
    else if (introRun) { r.introWins.push(introRun); introRun = 0; }
    const hw = VW / 2, hh = VH / 2;
    const tx = WORLD.w <= hw * 2 ? WORLD.w / 2 : Math.min(Math.max(player.x, hw), WORLD.w - hw);
    const ty = WORLD.h <= hh * 2 ? WORLD.h / 2 : Math.min(Math.max(player.y, hh), WORLD.h - hh);
    const free = (tx === player.x && ty === player.y) && !intro;
    const lag = Math.hypot(cam.x - player.x, cam.y - player.y);
    if (!intro) r.lagMax = Math.max(r.lagMax, lag);
    if (free) { r.lagMaxFree = Math.max(r.lagMaxFree, lag); if (lag > lagMax) r.lagBad++; }
    else if (!intro) r.clamped++;
    r.n++;
    if (f % 900 === 0) await new Promise(res => setTimeout(res, 0));
  }
  if (introRun) r.introWins.push(introRun);          /* 636 — 런 끝에 열린 채 끝난 창도 담는다 */
  r.zMin = r.zMin === Infinity ? null : r.zMin;
  return r;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  let r, errs = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    await page.addInitScript(() => {
      let vt = 0; const q = [];
      window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
      window.cancelAnimationFrame = () => {};
      window.__v108tick = () => {
        vt += 1000 / 60;
        const list = q.splice(0, q.length);
        for (const cb of list) { try { cb(vt); } catch (e) {} }
      };
      try { localStorage.clear(); } catch (e) {}
    });
    await page.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.waitForFunction(() => typeof player !== 'undefined' && typeof cam !== 'undefined', null, { timeout: 20000 });
    await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v108tick(); });   /* 워밍업 10초(가상) */
    r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), lagMax: LAG_MAX, killAfter: KILL_AFTER });
    await ctx.close();
  } finally { await browser.close(); }

  console.log(`\n[런타임] 전투 ${SEC}초(가상 ${r.n} 프레임) · cam 필드 = {${r.keys}}`);
  console.log(`  cam.z          : ${r.zMin} ~ ${r.zMax}   (1 이외 프레임 ${r.zBad})`);
  console.log(`  카메라 지연     : 클램프 밖 최대 ${r.lagMaxFree.toFixed(1)}px (상한 ${LAG_MAX}) · 전체 최대 ${r.lagMax.toFixed(1)}px · 클램프 프레임 ${r.clamped}`);
  console.log(`  보스            : 등장 ${r.bossSeen}회(정착 ${r.bossSeenSettled}) · 처치/소멸 ${r.bossKilled}회 · shake 최대 ${r.shakeMax.toFixed(1)}`);
  console.log(`  등장 국면       : 창 ${r.introWins.length}개 [${r.introWins.join(', ')}] · 합계 ${r.introFrames}프레임 ` +
              `· 판당 상한 ${Math.round(r.introLen * 60) + 2}`);
  console.log(`  NaN/Infinity    : ${r.nan} · pageerror ${errs.length}`);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join(' | '));

  ok(r.zBad === 0, `cam.z 가 1 이 아닌 프레임 ${r.zBad}`);
  ok(r.keys === 'shake,x,y,z', `cam 필드 = {${r.keys}} (기대: shake,x,y,z)`);
  ok(r.lagBad === 0, `클램프·등장 국면 밖에서 카메라–플레이어 ${LAG_MAX}px 초과 프레임 ${r.lagBad} (최대 ${r.lagMaxFree.toFixed(1)}px)`);
  /* 457 이관 — 위에서 «국면 프레임» 을 제외한 것이 무르게 푼 것이 아님을 여기서 못박는다:
     ① 그 창이 실제로 존재하고(457 이 사라지면 0 이 되어 빨개진다) ② 길이가 상수 그대로여서
     «카메라가 아무 때나 플레이어를 떠나는» 것이 아니다(상수 × 60 + 오차 2프레임). */
  /* 636(2026-09-01) — 이 두 항의 산수를 «런 전체 합» 에서 **«판당»** 으로 바꿨다.
     옛 항은 한 런에 보스가 한 번만 선다고 전제하고 `introFrames`(합계)를 상한과 견줬는데,
     223 이 세운 하네스는 보스를 죽이고도 60초를 계속 돌아 **다음 판의 등장 국면이 또 열린다**
     (재현 probe636 [2-a]~[2-d]: 등장 2회 · 합계 115 > 86 인데 **창별로는 85·30 으로 전부 상한 안**).
     ⚠ 상한을 올려서 푸는 것은 반려다 — 항이 지키려던 뜻(«카메라가 아무 때나 플레이어를 떠나지 않는다»)이
     사라진다. 632 가 어제 `verify621` 에서 «런 전체 분모» 를 폐기하고 에피소드 축으로 간 그 처방을 그대로 쓴다.
     뜻은 셋으로 갈라 각각 묻는다: ① 창이 **있다**(457 이 사라지면 0 → 빨강) ② **창마다** 길이가 상수 그대로다
     ③ 판마다 하나씩 열린다(첫 판에만 열리고 마는 퇴행을 잡는다 — 옛 합계 축은 이걸 못 봤다). */
  const introCap = Math.round(r.introLen * 60) + 2;
  const introMax = r.introWins.length ? Math.max(...r.introWins) : 0;
  ok(r.introWins.length > 0,
     `[457] 28 스테이지 보스전에 등장 국면이 있다 — 창 ${r.introWins.length}개 (합계 ${r.introFrames}프레임)`);
  ok(introMax <= introCap,
     `[457] 그 국면이 **판당** 상수 길이(${r.introLen}s ≈ ${Math.round(r.introLen * 60)}프레임)를 안 넘는다 — ` +
     `최장 ${introMax} ≤ ${introCap} · 창 [${r.introWins.join(', ')}]`);
  ok(r.introWins.length >= r.bossSeenSettled,
     `[457] 판마다 등장 국면이 하나씩 열린다 — 창 ${r.introWins.length} ≥ 정착 등장 ${r.bossSeenSettled}회 ` +
     `(전체 등장 ${r.bossSeen}회 · 런 끝에 걸친 판은 창이 잘리므로 뺀다)`);
  ok(r.bossSeen >= 1, `보스 등장 ${r.bossSeen}회 (1회 이상 필요)`);
  ok(r.bossKilled >= 1, `보스 처치/소멸 ${r.bossKilled}회 (1회 이상 필요 — 처치 직후 카메라를 봐야 한다)`);
  ok(r.nan === 0, `NaN/Infinity ${r.nan} 건`);
  ok(errs.length === 0, `pageerror ${errs.length} 건`);

  console.log('');
  okline.forEach(m => console.log('  ✓ ' + m));
  fails.forEach(m => console.log('  ✗ ' + m));
  const tot = okline.length + fails.length;
  if (fails.length) { console.log(`\nVERIFY108 ${okline.length}/${tot} — FAIL`); process.exit(1); }
  console.log(`\nVERIFY108 ${tot}/${tot} PASS`);
})().catch(e => { console.error(e); process.exit(2); });
