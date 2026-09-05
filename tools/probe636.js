#!/usr/bin/env node
/* 636 재현기 — `tools/verify108.js` 2건 실패(23/25)의 «찍힌 값» 을 처방 전에 먼저 받는다 (338 규칙)
 *
 *   node tools/probe636.js
 *
 * 등재문이 세운 갈래 둘을 각각 자로 갈라 본다:
 *   ⓐ DEAD 패턴 «ctx.scale (카메라 줌)» 이 무엇을 잡고 있나 — 잡힌 자리마다 «배율 인자가 어디서 오는가»
 *      (541/590 이 선언한 그리기 배율 상수인가, 아니면 카메라에서 오는 값인가)를 **선언에서 파생해** 가른다.
 *   ⓑ [457] 등장 국면 길이 항이 «판당» 인가 «런 전체 합» 인가 — 한 런의 `bossIntro` 참 프레임을
 *      **연속 구간(에피소드)으로 끊어** 각 창의 길이와 창 개수를 따로 찍는다.
 *
 * verify108 과 **같은 하네스**(rAF 가상 시계 · 같은 보스 세우기/처치 경로)를 쓴다 — 자리가 달라지면
 * 재현이 아니다. 판정은 하지 않고 값만 찍는 것이 원칙이나, «등재문이 맞았는지» 는 [P] 항으로 못박는다.
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
const SEC = Number(process.env.P636_SEC || 60);
const KILL_AFTER = 90;          /* verify108 과 같은 값 — 다르게 잡으면 같은 표본이 아니다 */
const fails = [];
const okline = [];
const ok = (cond, msg) => { (cond ? okline : fails).push(msg); return cond; };

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\w])\/\/[^\n]*/g, '$1 ');

console.log('── [1] ⓐ «ctx.scale (카메라 줌)» DEAD 패턴이 잡는 자리 ──────────────────');

/* verify108.js 71행의 패턴 그대로 */
const RE_V108 = /ctx\s*\.\s*scale\s*\(\s*([A-Za-z_$][\w$]*|1\.\d+)\s*,\s*\1\s*\)/g;
const hits = [...code.matchAll(RE_V108)].map(m => ({ arg: m[1], idx: m.index }));
console.log(`  verify108 패턴이 잡은 자리 : ${hits.length}건 — [${hits.map(h => h.arg).join(', ')}]`);

/* ⚑ 화이트리스트를 «이름» 이 아니라 «선언» 에서 파생한다 — 이름만 빼면 다음에 같은 이름으로
   카메라 줌을 되살려도 통과한다(등재문 ⚠). «상수 숫자 선언» 만 그리기 배율로 인정한다. */
const DRAW_SC = new Map();
for (const m of code.matchAll(/\bconst\s+([A-Za-z_$][\w$]*_DRAW_SC)\s*=\s*(-?\d+(?:\.\d+)?)\s*[;,\n]/g))
  DRAW_SC.set(m[1], Number(m[2]));
console.log(`  «const *_DRAW_SC = <숫자>» 선언 : ${DRAW_SC.size}건 — ` +
  [...DRAW_SC].map(([k, v]) => `${k}=${v}`).join(' · '));

const camLike = hits.filter(h => !DRAW_SC.has(h.arg));
const drawLike = hits.filter(h => DRAW_SC.has(h.arg));
console.log(`  ⇒ 그리기 배율 상수로 설명되는 자리 : ${drawLike.length}건 — [${drawLike.map(h => h.arg).join(', ')}]`);
console.log(`  ⇒ 설명 안 되는(= 카메라 줌 의심) 자리 : ${camLike.length}건 — [${camLike.map(h => h.arg).join(', ')}]`);

for (const h of hits) {
  const near = code.slice(Math.max(0, h.idx - 90), h.idx).replace(/\s+/g, ' ').slice(-70);
  console.log(`     · ctx.scale(${h.arg}, ${h.arg})   …${near}`);
}

ok(hits.length === 2, `[1-a] 등재문 실측대로 패턴이 2건을 잡는다 — ${hits.length}건`);
ok(drawLike.length === 2 && camLike.length === 0,
   `[1-b] 잡힌 2건이 **전부** 541/590 의 그리기 배율 상수다(카메라 줌 0건) — 그리기 ${drawLike.length} · 의심 ${camLike.length}`);
ok(DRAW_SC.has('SK_DRAW_SC'),
   `[1-c] 그 상수가 541 의 «스킬 ×2» 선언에서 나온다 — SK_DRAW_SC=${DRAW_SC.get('SK_DRAW_SC')}`);

/* 음성 대조 — 화이트리스트가 «무엇이든 통과» 로 무르지 않다는 것. 임시 문자열에 카메라 줌을 주입한다. */
const injected = code + '\n ctx.scale(camZoom, camZoom); \n';
const injHits = [...injected.matchAll(RE_V108)].map(m => m[1]).filter(a => !DRAW_SC.has(a));
ok(injHits.length === 1,
   `[1-d] 음성 대조 — 소스에 ctx.scale(camZoom, camZoom) 을 넣으면 «설명 안 되는» 자리가 생긴다 — ${injHits.length}건`);
/* `cam.z` 꼴(멤버 접근)은 verify108 패턴 자체가 못 잡는다 — 그 구멍도 값으로 남긴다 */
const RE_MEMBER = /ctx\s*\.\s*scale\s*\(\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)+)\s*,\s*\1\s*\)/g;
const memberInj = [...(code + '\n ctx.scale(cam.z, cam.z); \n').matchAll(RE_MEMBER)];
const memberNow = [...code.matchAll(RE_MEMBER)];
console.log(`  ⚠ 멤버 접근 꼴(ctx.scale(cam.z, cam.z)) — 현재 소스 ${memberNow.length}건 · 주입하면 ${memberInj.length}건`);
ok(memberNow.length === 0,
   `[1-e] 지금 소스에 멤버 접근 꼴 등방 배율은 없다 — ${memberNow.length}건`);
ok(memberInj.length === 1,
   `[1-f] 그 꼴은 verify108 패턴이 **못 잡는 구멍**이다(주입하면 이 자만 본다) — ${memberInj.length}건`);

console.log('\n── [2] ⓑ [457] 등장 국면 — «런 전체 합» 인가 «판당» 인가 ─────────────────');

const RUN = async ({ frames, killAfter }) => {
  S.stage = 10; S.best = Math.max(S.best || 1, 10); S.bossFarm = false;
  spawnStage();
  player.dead = 0; player.hp = stat.maxHp;
  enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
  const r = {
    n: 0, introFrames: 0, episodes: [], bossSeen: 0, bossKilled: 0,
    introLen: (typeof bossIntroLen === 'function' ? bossIntroLen() : 0),
  };
  let hadBoss = false, bossLive = 0, didKill = false, run = 0;
  for (let f = 0; f < frames; f++) {
    window.__v108tick();
    const boss = enemies.find(e => e.tk === 'boss' && e.hp > 0);
    if (boss) {
      if (!hadBoss) { r.bossSeen++; hadBoss = true; bossLive = 0; didKill = false; }
      if (!didKill && ++bossLive >= killAfter) { didKill = true; killEnemy(boss); }
    } else if (hadBoss) { r.bossKilled++; hadBoss = false; }

    const intro = (typeof bossIntro !== 'undefined' && bossIntro) ? 1 : 0;
    if (intro) { r.introFrames++; run++; }
    else if (run) { r.episodes.push(run); run = 0; }
    r.n++;
    if (f % 900 === 0) await new Promise(res => setTimeout(res, 0));
  }
  if (run) r.episodes.push(run);
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
    await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v108tick(); });
    r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), killAfter: KILL_AFTER });
    await ctx.close();
  } finally { await browser.close(); }

  const cap = Math.round(r.introLen * 60) + 2;
  console.log(`  전투 ${SEC}초(가상 ${r.n} 프레임) · bossIntroLen() = ${r.introLen}s ≈ ${Math.round(r.introLen * 60)}프레임 (허용 ${cap})`);
  console.log(`  보스 등장 ${r.bossSeen}회 · 처치/소멸 ${r.bossKilled}회`);
  console.log(`  등장 국면 프레임 **합계** : ${r.introFrames}   ← verify108 [457] 이 이 값을 ${cap} 와 견준다`);
  console.log(`  등장 국면 **에피소드**   : ${r.episodes.length}개 — [${r.episodes.join(', ')}]`);
  const worst = r.episodes.length ? Math.max(...r.episodes) : 0;
  console.log(`  그중 가장 긴 창          : ${worst}프레임 (허용 ${cap})`);

  ok(r.bossSeen >= 2, `[2-a] 한 런에 보스가 **2회 이상** 선다 — ${r.bossSeen}회 (합계 축이 깨지는 이유)`);
  ok(r.introFrames > cap,
     `[2-b] 그래서 «합계» 는 상한을 넘는다 — ${r.introFrames} > ${cap} (verify108 이 빨간 값 그대로)`);
  ok(r.episodes.length >= 2, `[2-c] 등장 국면이 판마다 하나씩 열린다 — 에피소드 ${r.episodes.length}개`);
  ok(worst > 0 && worst <= cap,
     `[2-d] ⚑ **판당으로 끊으면 전부 상한 안**이다 — 최장 ${worst} ≤ ${cap} (제품 결함이 아니라 게이트 산수)`);
  ok(r.episodes.length === r.bossSeen,
     `[2-e] 창 개수 = 보스 등장 횟수 — 창 ${r.episodes.length} · 등장 ${r.bossSeen}`);
  ok(errs.length === 0, `[2-f] pageerror ${errs.length} 건`);

  console.log('');
  for (const l of okline) console.log('  ok   ' + l);
  for (const l of fails) console.log('  ✗    ' + l);
  const total = okline.length + fails.length;
  console.log(`\nPROBE636 ${okline.length}/${total} ${fails.length ? '— FAIL' : 'PASS'}`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
