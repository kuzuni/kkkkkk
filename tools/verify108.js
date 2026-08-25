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
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다 — `npm i --no-save playwright && npx playwright install chromium` 후 재실행');
  process.exit(2);
})();

function launchOpts() {
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const ROOT = path.resolve(__dirname, '..');
const SEC = Number(process.env.V108_SEC || 60);
const LAG_MAX = 60;          /* 클램프가 걸리지 않은 프레임의 카메라–플레이어 허용 거리(월드 px) */
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
  /* 스프라이트 좌우 반전 `ctx.scale(-1,1)` 은 렌더 규약이라 정상이다 — «같은 배율 두 축» = 카메라 줌만 잡는다 */
  ['ctx.scale (카메라 줌)',         /ctx\s*\.\s*scale\s*\(\s*([A-Za-z_$][\w$]*|1\.\d+)\s*,\s*\1\s*\)/g],
];
for (const [name, re] of DEAD) {
  const n = (code.match(re) || []).length;
  ok(n === 0, `${name} 참조 ${n} 건` + (n ? ' — 남아 있다' : ''));
}
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
const RUN = async ({ frames, lagMax }) => {
  /* 보스 스테이지(10 의 배수)로 올려 «보스 단독 스폰 + 30초 제한» 흐름을 그대로 태운다 */
  S.stage = 10; S.best = Math.max(S.best || 1, 10); S.bossFarm = false;
  spawnStage();
  const r = {
    n: 0, zBad: 0, zMin: Infinity, zMax: -Infinity,
    lagBad: 0, lagMax: 0, lagMaxFree: 0, clamped: 0,
    bossSeen: 0, bossKilled: 0, shakeMax: 0, nan: 0,
    keys: Object.keys(cam).sort().join(','),
  };
  let hadBoss = false;
  for (let f = 0; f < frames; f++) {
    window.__v108tick();
    const boss = enemies.find(e => e.tk === 'boss' && e.hp > 0);
    if (boss) { if (!hadBoss) { r.bossSeen++; hadBoss = true; } }
    else if (hadBoss) { r.bossKilled++; hadBoss = false; }

    const z = cam.z;
    if (z !== 1) r.zBad++;
    r.zMin = Math.min(r.zMin, z); r.zMax = Math.max(r.zMax, z);
    if (!isFinite(cam.x) || !isFinite(cam.y) || !isFinite(z)) r.nan++;
    r.shakeMax = Math.max(r.shakeMax, cam.shake || 0);

    /* 클램프가 걸린 프레임(월드 가장자리)은 «카메라가 플레이어를 못 따라가는 게 정상» 이라 제외한다 */
    const hw = VW / 2, hh = VH / 2;
    const tx = WORLD.w <= hw * 2 ? WORLD.w / 2 : Math.min(Math.max(player.x, hw), WORLD.w - hw);
    const ty = WORLD.h <= hh * 2 ? WORLD.h / 2 : Math.min(Math.max(player.y, hh), WORLD.h - hh);
    const free = (tx === player.x && ty === player.y);
    const lag = Math.hypot(cam.x - player.x, cam.y - player.y);
    r.lagMax = Math.max(r.lagMax, lag);
    if (free) { r.lagMaxFree = Math.max(r.lagMaxFree, lag); if (lag > lagMax) r.lagBad++; }
    else r.clamped++;
    r.n++;
    if (f % 900 === 0) await new Promise(res => setTimeout(res, 0));
  }
  r.zMin = r.zMin === Infinity ? null : r.zMin;
  return r;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const o = launchOpts(); if (!o.executablePath) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + o.executablePath);
    browser = await chromium.launch(o);
  }
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
    r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), lagMax: LAG_MAX });
    await ctx.close();
  } finally { await browser.close(); }

  console.log(`\n[런타임] 전투 ${SEC}초(가상 ${r.n} 프레임) · cam 필드 = {${r.keys}}`);
  console.log(`  cam.z          : ${r.zMin} ~ ${r.zMax}   (1 이외 프레임 ${r.zBad})`);
  console.log(`  카메라 지연     : 클램프 밖 최대 ${r.lagMaxFree.toFixed(1)}px (상한 ${LAG_MAX}) · 전체 최대 ${r.lagMax.toFixed(1)}px · 클램프 프레임 ${r.clamped}`);
  console.log(`  보스            : 등장 ${r.bossSeen}회 · 처치/소멸 ${r.bossKilled}회 · shake 최대 ${r.shakeMax.toFixed(1)}`);
  console.log(`  NaN/Infinity    : ${r.nan} · pageerror ${errs.length}`);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join(' | '));

  ok(r.zBad === 0, `cam.z 가 1 이 아닌 프레임 ${r.zBad}`);
  ok(r.keys === 'shake,x,y,z', `cam 필드 = {${r.keys}} (기대: shake,x,y,z)`);
  ok(r.lagBad === 0, `클램프 밖에서 카메라–플레이어 ${LAG_MAX}px 초과 프레임 ${r.lagBad} (최대 ${r.lagMaxFree.toFixed(1)}px)`);
  ok(r.bossSeen >= 1, `보스 등장 ${r.bossSeen}회 (1회 이상 필요)`);
  ok(r.nan === 0, `NaN/Infinity ${r.nan} 건`);
  ok(errs.length === 0, `pageerror ${errs.length} 건`);

  console.log('');
  okline.forEach(m => console.log('  ✓ ' + m));
  fails.forEach(m => console.log('  ✗ ' + m));
  const tot = okline.length + fails.length;
  if (fails.length) { console.log(`\nVERIFY108 ${okline.length}/${tot} — FAIL`); process.exit(1); }
  console.log(`\nVERIFY108 ${tot}/${tot} PASS`);
})().catch(e => { console.error(e); process.exit(2); });
