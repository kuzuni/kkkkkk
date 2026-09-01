#!/usr/bin/env node
/* 작업 698 게이트 — 「스킬 발동은 화면을 흔들지 않는다」
 *
 *   node tools/verify698.js
 *
 * 주인 원문(2026-09-02 01:45): «스킬중에 화면 흔들리는거 있으면 화면 흔들리는 효과 제거좀».
 * 선례 = 65(룰렛 흔들림 제거) · 108(카메라 연출 폐지) — 화면을 흔드는 연출은 일관되게 폐지해 왔다.
 *
 * 지킬 것(등재문 게이트 문면: «전 스킬 발동 스윕에서 뷰포트/프레임 루트 transform 변위 0px · 되돌림»)
 *   [S] 선언 — 스킬 경로에서 `cam.shake` 를 올리던 대입이 소스에 0건 · `SKILLS` 에 `shake` 필드 0건
 *   [A] 전 스킬 스윕 — SKILLS 전 종을 강제 시전해 180프레임 굴려도 `cam.shake` 최대 **0**
 *       [전제] 같은 스윕에서 연출은 **실제로 났다**(링·파편·투사체·화구 합 > 0) — 유령 스윕 방지(341 교훈)
 *   [B] 폭발형 4종(화염구·운석·심판의 빛·창세의 폭발) — 셰이크 0 이면서 링 ≥3 · 파편 ≥3
 *       («화면이 아니라 입자» 는 남긴다 = 폭발을 죽여서 통과한 것이 아니다)
 *   [C] 렌더 변위 — 카메라를 고정한 채 draw() 를 굴려도 `camOx/camOy` 진폭 **0px**
 *   [D] 음성항 — 스킬이 아닌 축은 그대로다: 플레이어 피격·사망(소스) · 보스 처치(실동작)
 *   [E] 55 «화면 흔들림» 게이트는 그대로 산다(끄면 진행 중인 셰이크도 즉시 0)
 *   [R] 되돌림 — `boomFx` 의 옛 한 줄을 되살린 사본에서 [A]·[C] 가 **실제로** 빨개진다
 *
 * ⚑ 왜 [R] 이 있는가 — [A] 는 «아무도 안 올리면 그냥 참» 이라 무르게 잡기 쉽다. 되돌린 사본이
 *   빨개지는 것을 같이 못박아야 이 자가 «스킬이 화면을 흔드는가» 를 정말로 묻는 자가 된다.
 * ⚑ 왜 [C] 를 `cam.shake` 와 따로 재는가 — 주인이 본 것은 변수가 아니라 **화면이 흔들리는 것**이다.
 *   draw() 는 `cam.shake` 를 rnd(-s, s)*0.45 로 화면 오프셋에 얹는다 — 그 오프셋을 직접 잰다.
 * ⚠ 셰이크의 감쇠(28/s)·55 차단은 `step()` 이 아니라 `camUpdate()` 에 있다(67 — 카메라는 loop 의
 *   실시간 dt 를 쓴다). 그래서 [A]·[C] 의 스텝 스윕에서는 셰이크가 «깎이지 않고 그대로 남는다» —
 *   한 번만 올라가도 [A] 가 잡는다. 반대로 [E] 는 step 이 아니라 camUpdate 를 직접 불러야 잰다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 공용 하네스 — 스킬 하나만 장착하고 적을 세운 «깨끗한 전장»(114 의 __fx 와 같은 꼴) */
const HARNESS = () => {
  window.__s698 = {
    setup(id, n, dist){
      if (typeof sbufClear === 'function') sbufClear();
      S.own = {}; S.own[id] = { n: 0, l: 1 };
      S.eqSkill = [id];
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      markDirty();
      player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 99;
      player.hp = stat.maxHp;
      cam.shake = 0;
      for (let i = 0; i < (n || 6); i++) makeEnemy('zombie');
      const d = dist || 140;
      enemies.forEach((e, i) => {
        e.born = 1; e.hp = e.max = 1e12;
        const a = i * 6.283 / enemies.length;
        e.x = player.x + Math.cos(a)*d; e.y = player.y + Math.sin(a)*d;
      });
    },
    keepAlive(){ enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; }); }
  };
};

/* 전 스킬 스윕 — 종마다 180프레임. cam.shake 최댓값과 «연출이 실제로 났는가» 를 같이 센다 */
const SWEEP = () => {
  const out = [];
  for (const s of SKILLS) {
    window.__s698.setup(s.id, 6, 150);
    let shakeMax = 0, fxSeen = 0;
    for (let i = 0; i < 180; i++) {
      step(1/60);
      if (cam.shake > shakeMax) shakeMax = cam.shake;
      fxSeen = Math.max(fxSeen, rings.length + parts.length + shots.length + booms.length + bolts.length + zones.length);
      window.__s698.keepAlive();
    }
    out.push({ id: s.id, n: s.n, shakeMax: Math.round(shakeMax*100)/100, fxSeen });
  }
  return out;
};

/* 렌더 변위 — 카메라 중심을 매 프레임 고정한 뒤 draw() 를 부르고 camOx/camOy 진폭을 잰다.
   위치를 고정했으므로 남는 흔들림은 셰이크뿐이다. */
const DISP = (ids) => {
  const out = [];
  for (const id of ids) {
    window.__s698.setup(id, 6, 150);
    const cx = WORLD.w/2, cy = WORLD.h/2;
    let xs = [], ys = [];
    for (let i = 0; i < 180; i++) {
      step(1/60);
      cam.x = cx; cam.y = cy;                 /* 위치 축을 눕힌다 — 남는 변위 = 셰이크 */
      draw();
      xs.push(camOx); ys.push(camOy);
      window.__s698.keepAlive();
    }
    const amp = a => Math.round((Math.max(...a) - Math.min(...a))*100)/100;
    out.push({ id, ax: amp(xs), ay: amp(ys) });
  }
  return out;
};

(async () => {
  const browser = await launch(chromium);

  /* ── [S] 선언 ─────────────────────────────────────────────────── */
  blk('S — 선언: 스킬 경로에 셰이크 대입이 남아 있지 않다');
  const code = fs.readFileSync(SRC, 'utf8');
  /* 걷어낸 다섯 자리는 전부 «현재값보다 크면 올린다» 꼴이었다.
     남아 있는 것은 `= 12`(보스 처치) · `= 15`(사망) · `Math.min(9, …)`(피격) · 감쇠 `Math.max(0, …)` 다. */
  const bump = code.match(/cam\.shake\s*=\s*Math\.max\(\s*cam\.shake/g) || [];
  ok(bump.length === 0, 'S1 ★ «현재값 위로 올리는» 셰이크 대입 0건 (스킬 경로 5자리)', bump.length + '건');
  const alive = {
    hit:  (code.match(/cam\.shake\s*=\s*Math\.min\(9,\s*cam\.shake/g) || []).length,
    dead: (code.match(/cam\.shake\s*=\s*15/g) || []).length,
    boss: (code.match(/cam\.shake\s*=\s*12/g) || []).length,
    decay:(code.match(/cam\.shake\s*=\s*Math\.max\(0,/g) || []).length
  };
  ok(alive.hit === 1 && alive.dead === 1 && alive.boss === 3 && alive.decay === 1,
     'S2 비스킬 축은 선언째 살아 있다 — 피격 1 · 사망 1 · 처치 3 · 감쇠 1',
     JSON.stringify(alive));

  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await ev(page, HARNESS);

  const meta = await ev(page, () => ({
    n: SKILLS.length,
    shakeField: SKILLS.filter(s => 'shake' in s).map(s => s.id),
    camKeys: Object.keys(cam).sort().join(',')
  }));
  ok(meta && meta.shakeField.length === 0, 'S3 ★ `SKILLS` 에 `shake` 필드 0종 (창세의 폭발 `shake:9` 를 선언째 삭제)',
     meta ? (meta.shakeField.join(',') || '없음') : 'n/a');
  ok(meta && meta.camKeys === 'shake,x,y,z',
     'S4 108 규약 — `cam` 필드는 그대로 {shake,x,y,z}(부품을 지운 게 아니라 스킬 호출부만 뗐다)',
     meta ? meta.camKeys : 'n/a');

  /* ── [A] 전 스킬 스윕 ─────────────────────────────────────────── */
  blk('A — 전 스킬 스윕: 시전해도 cam.shake 가 0 이다');
  const sw = await ev(page, SWEEP);
  ok(Array.isArray(sw) && sw.length === (meta ? meta.n : 0) && sw.length >= 24,
     'A0 [전제] 스윕이 전 종을 돌았다', sw ? sw.length + '종' : 'n/a');
  const dead = (sw || []).filter(r => r.fxSeen === 0);
  ok(dead.length === 0, 'A1 [전제] 스윕에서 연출이 실제로 났다 — 표본 0 인 종 0개 (유령 스윕이면 A2 는 헛초록)',
     dead.map(d => d.id).join(',') || '없음');
  const shook = (sw || []).filter(r => r.shakeMax > 0);
  ok(shook.length === 0, 'A2 ★ 전 스킬 시전에서 cam.shake 최대 0',
     shook.map(d => d.id + ' ' + d.shakeMax).join(' · ') || (sw ? sw.length + '종 전부 0' : 'n/a'));

  /* ── [B] 폭발형은 «입자» 를 잃지 않았다 ───────────────────────── */
  blk('B — 폭발형 4종: 셰이크만 빠지고 링·파편은 그대로');
  const booms = await ev(page, () => {
    const out = {};
    for (const id of ['boom', 'meteor', 'holy', 'nova']) {
      window.__s698.setup(id, 6, 110);
      let ringsMax = 0, debrisMax = 0, shakeMax = 0;
      for (let i = 0; i < 300; i++) {
        step(1/60);
        ringsMax = Math.max(ringsMax, rings.length);
        debrisMax = Math.max(debrisMax, parts.filter(q => q.gy).length);
        shakeMax = Math.max(shakeMax, cam.shake);
        window.__s698.keepAlive();
      }
      out[id] = { ringsMax, debrisMax, shakeMax: Math.round(shakeMax*100)/100 };
    }
    return out;
  });
  for (const id of ['boom', 'meteor', 'holy', 'nova']) {
    const r = booms && booms[id];
    ok(r && r.shakeMax === 0 && r.ringsMax >= 3 && r.debrisMax >= 3,
       'B ' + id + ' — 셰이크 0 · 충격파 링 ≥3 · 파편 ≥3',
       r ? ('링 ' + r.ringsMax + ' · 파편 ' + r.debrisMax + ' · shake ' + r.shakeMax) : 'n/a');
  }

  /* ── [C] 렌더 변위 ────────────────────────────────────────────── */
  blk('C — 렌더: 화면 오프셋(camOx/camOy) 진폭 0px');
  const DISP_IDS = ['nova', 'holy', 'boom', 'meteor'];
  const disp = await ev(page, DISP, DISP_IDS);
  const moved = (disp || []).filter(d => d.ax > 0 || d.ay > 0);
  ok(disp && disp.length === DISP_IDS.length && moved.length === 0,
     'C1 ★ 폭발형 4종 시전 180프레임 동안 화면 변위 0px',
     disp ? disp.map(d => d.id + ' ' + d.ax + '/' + d.ay).join(' · ') : 'n/a');

  /* ── [D] 음성항 — 스킬 아닌 축은 그대로 ───────────────────────── */
  blk('D — 음성항: 피격·사망·처치의 셰이크는 살아 있다');
  const kill = await ev(page, () => {
    window.__s698.setup('nova', 1, 150);
    enemies.length = 0;
    let e = null;
    try { e = makeEnemy('boss'); } catch (_) {}
    if (!e) e = enemies[enemies.length - 1];
    if (!e) return { made: false };
    e.born = 1; e.hp = 1;
    cam.shake = 0;
    try { killEnemy(e); } catch (err) { return { made: true, err: String(err).slice(0, 80), shake: cam.shake }; }
    return { made: true, shake: cam.shake };
  });
  ok(kill && kill.made, 'D0 [전제] 보스 표본을 세웠다', kill ? JSON.stringify(kill) : 'n/a');
  ok(kill && kill.shake > 0, 'D1 ★ 보스 처치는 그대로 화면을 흔든다(208 «보스 대접» 이관 없음)',
     kill ? 'shake ' + kill.shake : 'n/a');

  /* ── [E] 55 설정 게이트 ───────────────────────────────────────── */
  blk('E — 55 «화면 흔들림» OFF 는 그대로 즉시 0');
  /* ⚠ 셰이크 감쇠·차단은 `step()` 이 아니라 `camUpdate()` 에 있다(67 — «카메라는 loop 의 실시간 dt»).
     step 으로 재면 20 이 그대로 남아 «OFF 가 안 듣는다» 로 잘못 읽힌다. */
  const opt = await ev(page, () => {
    S.opt.shake = true; cam.shake = 20;
    camUpdate(1/60);
    const on = cam.shake;
    S.opt.shake = false; cam.shake = 20;
    camUpdate(1/60);
    const off = cam.shake;
    S.opt.shake = true;
    return { on: Math.round(on*100)/100, off };
  });
  ok(opt && opt.on > 0 && opt.off === 0, 'E1 ON 이면 감쇠하며 남고 · OFF 면 즉시 0',
     opt ? 'on ' + opt.on + ' · off ' + opt.off : 'n/a');
  ok(errs.length === 0, 'E2 콘솔 에러 0', errs.slice(0, 2).join(' | ') || '없음');
  await ctx.close();

  /* ── [R] 되돌림 ───────────────────────────────────────────────── */
  blk('R — 되돌림: boomFx 의 옛 한 줄을 되살린 사본은 A·C 가 빨개진다');
  {
    const anchor = "  debris(x, y, '#8a6a4a', big ? 11 : 8, 560);";
    const rev = code.replace(anchor, anchor + '\n  cam.shake = Math.max(cam.shake, big ? 6 : 3);');
    ok(rev !== code, 'R0 되돌림 사본을 만들었다(boomFx 에 셰이크 한 줄 재삽입)');
    const tmp = path.resolve(__dirname, '..', '.rev698.html');
    fs.writeFileSync(tmp, rev);
    try {
      const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const p2 = await c2.newPage();
      await p2.goto('file://' + tmp.replace(/\\/g, '/'));
      await p2.waitForTimeout(1200);
      await ev(p2, HARNESS);
      const sw2 = await ev(p2, SWEEP);
      const shook2 = (sw2 || []).filter(r => r.shakeMax > 0);
      ok(shook2.length > 0, 'R1 ★ 되돌린 사본에서는 스킬이 화면을 흔든다 = A2 가 실제로 빨개진다',
         shook2.slice(0, 4).map(d => d.id + ' ' + d.shakeMax).join(' · ') || '0종');
      const disp2 = await ev(p2, DISP, DISP_IDS);
      const moved2 = (disp2 || []).filter(d => d.ax > 0 || d.ay > 0);
      ok(moved2.length > 0, 'R2 ★ 그 사본은 화면 변위도 0 이 아니다 = C1 이 실제로 빨개진다',
         disp2 ? disp2.map(d => d.id + ' ' + d.ax + '/' + d.ay).join(' · ') : 'n/a');
      await c2.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  await browser.close();
  console.log('\nVERIFY698 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
