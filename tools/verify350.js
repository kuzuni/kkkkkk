/* 작업 350 게이트 — «보스전 HUD: 진행바 해골 노드(.kboss)가 보스 체력바 밑으로 삐져나오지 않는다»
 *
 *   node tools/verify350.js   → 마지막 줄이 `VERIFY350 n/n PASS` 여야 한다.
 *
 * 저장소 주인 보고(2026-08-29, 스크린샷 — STAGE 246 보스전):
 *   «보스전때 보면 저렇게 뭐 동그란거 파란거 약간 삐쭉 튀어나와있더라 이거 없애기 ui에»
 *
 * 재현·원인은 `tools/probe350.js`(12/12) 가 잡았다 — `.kboss` 가 `#stinfo.bfight` 숨김 목록에
 * 없어 02 진행바의 보스 해골 노드(프레임 699..781 / 245..327 Ø82)가 보스 체력바
 * (190..890 / 231..298) 뒤에 남아 **하변 아래로 정확히 29px** 삐져나왔다.
 * 측정표 `docs/measure/28-보스전.md` 의 «해골 노드» 행은 39(보스전 중)를 이미
 * **«없음**(체력바 끝 소형 두개골 46×42 로 대체)» 이라 적어 뒀다 — 규칙이 안 따라온 것이다.
 *
 * 이 게이트가 «무엇을» 묻는지 (칸을 갈라 쓴다 — 326 교훈 «한 항이 두 자리를 겸하면
 * 한쪽이 사라져도 초록이다»):
 *   §1 소스   숨김 규칙이 `.bfight` 스코프에만 있고 `.bfarm` 을 안 건드린다.
 *   §2 표시   BOSS_HUD28 세 모드(stage·raid·promo) **전부**에서 .kboss 가 안 보인다.
 *             같은 칸에서 28 HUD 나머지(⏱·체력바)는 그대로 켜져 있다 — «다 꺼 버려서 초록» 을 막는다.
 *   §3 기하   .bfight 에서 체력바 하변 아래 «해골 자리» 픽셀에 .kboss 색이 한 표본도 없다(찍힌 픽셀).
 *   §4 bfarm  40 재도전 대기의 중앙 Ø120 해골은 **그대로 산다**(480,280,120×120).
 *   §5 왕복   보스전 → 포기(파밍) → 재도전 → 격파(평상시) 를 실제 진입점으로 돌며
 *             .kboss 가 «숨김 → Ø120 중앙 → 숨김 → 02 자리 복귀» 로 정확히 되돌아온다.
 *   §6 끼어들기 스테이지 보스전 도중 승급전이 시작되는 경로(«bfight 이미 켜짐» 케이스)에서도 숨김.
 *   §R 되돌림 숨김 목록에서 `.kboss` 만 뺀 **소스 사본**에서 §2·§3 이 실제로 빨개진다.
 *             (이게 없으면 «두 클래스가 애초에 안 켜져서 초록» 과 구별할 수 없다)
 *   §7 에러   콘솔·페이지 에러 0건.
 *
 * ⚠ 함정 둘 (probe350 머리말과 같다):
 *   ① `#stinfo`·`#bossHp` 는 `pointer-events:none` 이라 `elementFromPoint` 가 캔버스로 빠진다
 *      → 히트 테스트 말고 **찍힌 픽셀**을 캔버스로 되읽는다(data URL 은 오염 없음).
 *   ② 60 «보스 등장» 쥬시가 화면을 덮은 채 찍히면 색이 통째로 어두워진다 → 걷힌 뒤에 잰다.
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
const CODE = fs.readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const eq = (m, got, want) => ok(got === want, m, `기대 ${want} · 실제 ${got}`);

/* .kboss 3중 원판 색 — 바깥 테 #141414 · 링 #4CBAED(시안) · 원판 #2A3E81(네이비) */
const KC = { '#141414': '테(검정)', '#4CBAED': '링(시안)', '#2A3E81': '원판(네이비)' };
/* 숨김 목록의 350 자리 — §R 이 이 문자열만 빼서 «수리 전» 사본을 만든다 */
const HIDE_NEW = '#stinfo.bfight .kbar,#stinfo.bfight .knode,#stinfo.bfight .kboss,';
const HIDE_OLD = '#stinfo.bfight .kbar,#stinfo.bfight .knode,';

/* 한 페이지를 «상태 하나» 로 만들고 .kboss / #bossHp 를 재는 공용 하네스.
   상태는 예외 없이 **실제 진입점** 으로 만든다(플래그 직접 대입 금지 — T2 기능 완성 규칙).
   ⚠ playwright 는 «함수처럼 생긴 문자열» 을 함수로 넘겨짚어 arg 를 붙여 부른다 — 애매함을 없애려고
   여기서는 전부 **호출식**(`(fn)(인자)`)으로 만들어 넘긴다. */
const HARNESS = md => `((md) => {
  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
  S.stage = 246; S.best = 246; S.guide.idx = 99;
  if (dunRun) endDunRun(false, true);
  promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
  enemies.length = 0; spawnQ.length = 0;
  if (md === 'stage') startBoss();
  else if (md === 'raid') { S.raidTk = 9; startRaid(RAIDS[0]); }
  else if (md === 'promo') { S.rank = 0; startPromo(); }
  else if (md === 'farm') { startBoss(); failBoss('포기'); }
  else if (md === 'plain') { /* 02 평상시 — 보스도 파밍도 아닌 기본 헤더 */ }
  drawBossHud();
  return snap350();
})(${JSON.stringify(md)})`;

/* 페이지 안에 심는 측정 함수 — 여러 절이 같은 눈금을 쓴다 */
const SNAP = `(() => { window.snap350 = () => {
  const R = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),
             bottom:+r.bottom.toFixed(1), right:+r.right.toFixed(1), disp:cs.display };
  };
  const si = document.getElementById('stinfo');
  const on = id => document.getElementById(id).classList.contains('on');
  return { md: bossMode(), fight: si.classList.contains('bfight'), farm: si.classList.contains('bfarm'),
           tm: on('bossTm'), hp: on('bossHp'),
           kboss: R('#stinfo .kboss'), bar: R('#bossHp'), kbar: R('#stinfo .kbar') };
}; })()`;

async function open(browser, file, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(tag + ': ' + m.text()); });
  page.on('pageerror', e => errs.push(tag + ': ' + String(e)));
  await page.goto('file://' + file.replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  const ev = async (src) => {
    try { return await page.evaluate(src); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev('window.requestAnimationFrame = () => 0;');
  await ev(SNAP);
  return { page, errs, ev, enter: md => ev(HARNESS(md)) };
}

/* 체력바 하변 아래 «해골 자리» 세로 스캔의 찍힌 픽셀.
   .kboss 가 꺼져 있어도 **같은 좌표**(02 진행바 노드 자리)를 본다 — 그래야 대조가 된다. */
const BOX = { x: 699, right: 781, y: 245, bottom: 327 };
async function pixels(h, shotPath) {
  await h.enter('stage');
  await h.page.waitForTimeout(1600);            /* 60 등장 쥬시가 걷힐 때까지 */
  const bar = await h.ev('(() => snap350().bar)()');
  if (!bar || bar.__err || bar.disp === 'none') return { __err: '체력바 미표시' };
  await h.page.screenshot({ path: shotPath });
  const cx = Math.round((BOX.x + BOX.right) / 2), ys = [];
  for (let y = Math.round(BOX.y) + 2; y < Math.round(BOX.bottom) - 1; y += 3) if (y > bar.bottom) ys.push(y);
  const b64 = fs.readFileSync(shotPath).toString('base64');
  const r = await h.page.evaluate(([data, sx, yy]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(yy.map(y => {
        const d = g.getImageData(sx, y, 1, 1).data;
        return { y, hex: '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() };
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, cx, ys]).catch(e => ({ __err: String(e.message || e) }));
  return r;
}

(async () => {
  const SHOTS = path.join(ROOT, 'docs', 'shots');
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await launch(chromium);
  const h = await open(browser, SRC, 'main');

  console.log('=== §1 소스 — 숨김 규칙의 스코프 ===');
  ok(CODE.indexOf(HIDE_NEW) >= 0,
    '`.kboss` 가 `#stinfo.bfight` 숨김 목록에 있다', '선택자 «' + HIDE_NEW + '»');
  ok(!/#stinfo\.bfarm\s+\.kboss\s*\{[^}]*display\s*:\s*none/.test(CODE),
    '`.bfarm .kboss` 를 끄는 규칙은 **없다** — 40 의 중앙 해골은 살려 둔다');
  ok(/#stinfo\.bfarm\s+\.kboss\{left:160px;top:40px;width:120px;height:120px/.test(CODE),
    '40 의 중앙 Ø120 재배치 규칙이 그대로 있다(350 이 그 자리를 안 건드렸다)');

  console.log('\n=== §2 표시 — BOSS_HUD28 세 모드 전부에서 .kboss 가 안 보인다 ===');
  const FIGHT = [['stage', '스테이지 보스전'], ['raid', '46 레이드'], ['promo', '284 승급전']];
  const snap = {};
  for (const [md, name] of FIGHT) {
    const s = await h.enter(md);
    snap[md] = s;
    if (s.__err) { ok(false, name + ' 진입 실패', s.__err); continue; }
    ok(s.fight === true, name + ' — `#stinfo.bfight` 가 켜져 있다(전제)', 'bossMode()=' + s.md);
    eq(name + ' — .kboss display', s.kboss && s.kboss.disp, 'none');
    /* «다 꺼 버려서 초록» 을 막는 짝 — 같은 상태에서 28 HUD 나머지는 살아 있어야 한다 */
    ok(s.tm === true && s.hp === true, name + ' — ⏱#bossTm·체력바#bossHp 는 그대로 켜져 있다',
      'tm=' + s.tm + ' hp=' + s.hp);
    ok(s.bar && s.bar.y === 231 && s.bar.w === 700 && s.bar.h === 67,
      name + ' — 체력바 자체는 Δ0px (190,231,700×67)',
      s.bar ? [s.bar.x, s.bar.y, s.bar.w, s.bar.h].join(',') : '없음');
  }

  console.log('\n=== §3 기하 — 체력바 밑 «해골 자리» 의 찍힌 픽셀 ===');
  const px = await pixels(h, path.join(SHOTS, 'verify350-fight.png'));
  if (px.__err) ok(false, '픽셀 측정 실패', px.__err);
  else {
    const bad = px.filter(p => KC[p.hex]);
    ok(px.length >= 6, '바 하변 아래 표본이 충분하다(≥6)', px.length + '표본');
    ok(bad.length === 0, '그 표본 중 .kboss 색(#2A3E81·#4CBAED·#141414)이 0건',
      bad.length ? bad.map(p => 'y' + p.y + ' ' + p.hex).join(' ') : px.map(p => p.hex).join(' '));
  }

  console.log('\n=== §4 bfarm — 40 재도전 대기의 중앙 Ø120 해골은 그대로 산다 ===');
  const fm = await h.enter('farm');
  if (fm.__err) ok(false, '파밍 진입 실패', fm.__err);
  else {
    ok(fm.farm === true && fm.fight === false, '`#stinfo.bfarm` 만 켜져 있다(전제)',
      'farm=' + fm.farm + ' fight=' + fm.fight);
    ok(fm.kboss && fm.kboss.disp !== 'none', '.kboss 가 표시된다', fm.kboss && fm.kboss.disp);
    ok(fm.kboss && fm.kboss.w === 120 && fm.kboss.h === 120, 'Ø120', fm.kboss && (fm.kboss.w + '×' + fm.kboss.h));
    ok(fm.kboss && fm.kboss.x === 480 && fm.kboss.y === 280, '중앙 (480,280) — 측정표 40 §4',
      fm.kboss && (fm.kboss.x + ',' + fm.kboss.y));
  }

  console.log('\n=== §5 왕복 — 보스전 ↔ 파밍 ↔ 평상시 를 실제 진입점으로 돈다 ===');
  const rt = await h.ev(`(() => {
    const out = [];
    const step = (tag) => { drawBossHud(); const s = snap350(); out.push({ tag, fight:s.fight, farm:s.farm,
      disp: s.kboss ? s.kboss.disp : '없음', x: s.kboss ? s.kboss.x : -1, w: s.kboss ? s.kboss.w : -1 }); };
    localStorage.clear(); Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 246; S.best = 246; S.guide.idx = 99;
    promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
    enemies.length = 0; spawnQ.length = 0;
    step('① 평상시(02)');
    startBoss();            step('② 보스전(.bfight)');
    failBoss('포기');        step('③ 포기 → 파밍(.bfarm)');
    retryBoss();            step('④ 재도전 → 보스전');
    /* 격파 = 실제 피해 경로. 보스가 아직 큐에 있으면 직접 세운다(28 의 1.4s 스폰 딜레이) */
    if (!enemies.some(e => e.tk === 'boss')) { spawnQ.length = 0; makeEnemy('boss'); }
    const b = enemies.find(e => e.tk === 'boss');
    if (b) { hitEnemy(b, b.hp * 10, false); if (enemies.indexOf(b) >= 0) killEnemy(b); }
    bossOn = false;         /* 격파 프레임의 정리는 step() 이 하는데 rAF 를 얼려 뒀다 */
    step('⑤ 격파 → 평상시 복귀');
    return out;
  })()`);
  if (rt.__err) ok(false, '왕복 하네스 실패', rt.__err);
  else {
    for (const s of rt) console.log('    ' + s.tag.padEnd(22) + 'fight=' + (s.fight ? 'Y' : 'n') +
      ' farm=' + (s.farm ? 'Y' : 'n') + ' · .kboss ' + s.disp + (s.disp === 'none' ? '' : ' x=' + s.x + ' w=' + s.w));
    const g = i => rt[i] || {};
    ok(g(0).disp === 'flex' && g(0).x === 699 && g(0).w === 82,
      '① 평상시 — 02 진행바 우측 끝 자리(x699 Ø82)', g(0).disp + ' x=' + g(0).x + ' w=' + g(0).w);
    eq('② 보스전 — 숨김', g(1).disp, 'none');
    ok(g(2).disp === 'flex' && g(2).w === 120, '③ 파밍 — 중앙 Ø120 으로 살아난다', g(2).disp + ' w=' + g(2).w);
    eq('④ 재도전 — 다시 숨김', g(3).disp, 'none');
    ok(g(4).disp === 'flex' && g(4).x === 699 && g(4).w === 82,
      '⑤ 격파 후 — ① 과 같은 02 자리로 **정확히** 복귀(x699 Ø82)', g(4).disp + ' x=' + g(4).x + ' w=' + g(4).w);
  }

  console.log('\n=== §6 끼어들기 — 스테이지 보스전 도중 승급전 («bfight 이미 켜짐» 케이스) ===');
  const cut = await h.ev(`(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 246; S.best = 9999; S.guide.idx = 99; S.rank = 0;
    S.gold = 1e30; S.dia = 1e12;
    promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
    enemies.length = 0; spawnQ.length = 0;
    startBoss(); drawBossHud();
    const was = document.getElementById('stinfo').classList.contains('bfight');
    startPromo(); drawBossHud();                 /* .bfight 는 «이미 켜져» 있어 토글에 변화가 없다 */
    const s = snap350();
    return { was, md: s.md, fight: s.fight, disp: s.kboss ? s.kboss.disp : '없음', tm: s.tm, hp: s.hp };
  })()`);
  if (cut.__err) ok(false, '끼어들기 하네스 실패', cut.__err);
  else {
    ok(cut.was === true, '전제 — 승급전 시작 전에 이미 `.bfight` 였다', 'was=' + cut.was);
    eq('끼어든 뒤 bossMode()', cut.md, 'promo');
    ok(cut.fight === true, '`.bfight` 는 계속 켜져 있다(토글 변화 없음 = 284 가 본 자리)');
    eq('그래도 .kboss 는 숨김 — 클래스 규칙이라 «변화 없음» 에 안 걸린다', cut.disp, 'none');
    ok(cut.tm === true && cut.hp === true, '28 HUD 나머지도 그대로', 'tm=' + cut.tm + ' hp=' + cut.hp);
  }

  console.log('\n=== §R 되돌림 시험 — 숨김 목록에서 `.kboss` 만 빼면 §2·§3 이 빨개진다 ===');
  const tmp = path.join(ROOT, 'index.verify350-revert.html');
  fs.writeFileSync(tmp, CODE.replace(HIDE_NEW, HIDE_OLD));
  const r = await open(browser, tmp, 'revert');
  const rs = await r.enter('stage');
  ok(rs.kboss && rs.kboss.disp === 'flex',
    'R1 — 되돌린 사본에서는 .kboss 가 다시 보인다(§2 가 빨개진다)', rs.kboss && rs.kboss.disp);
  ok(rs.kboss && rs.bar && Math.abs((rs.kboss.bottom - rs.bar.bottom) - 29) < 1.5,
    'R2 — 그리고 바 하변 아래로 **29px** 삐져나온다 = 주인 보고 그대로',
    rs.kboss && rs.bar ? (rs.kboss.bottom - rs.bar.bottom).toFixed(1) + 'px' : '?');
  const rpx = await pixels(r, path.join(SHOTS, 'verify350-revert.png'));
  if (rpx.__err) ok(false, 'R3 픽셀 측정 실패', rpx.__err);
  else {
    const rbad = rpx.filter(p => KC[p.hex]);
    ok(rbad.length > 0, 'R3 — 그 자리의 찍힌 픽셀에 .kboss 색이 나온다(§3 이 빨개진다)',
      rbad.map(p => 'y' + p.y + ' ' + p.hex + '=' + KC[p.hex]).join(' ') || rpx.map(p => p.hex).join(' '));
    ok(rpx.some(p => p.hex === '#4CBAED'), 'R4 — 그 중 «파란(시안)» 이 있다 — 주인 원문 «파란거»');
  }
  const rfm = await r.enter('farm');
  ok(rfm.kboss && rfm.kboss.w === 120,
    'R5 — 되돌린 사본에서도 .bfarm 은 Ø120 그대로 = §4 는 350 이 만든 것이 아니다(회귀 기준선)',
    rfm.kboss && rfm.kboss.w);
  fs.unlinkSync(tmp);

  console.log('\n=== §7 에러 ===');
  eq('콘솔·페이지 에러(현재 파일)', h.errs.length, 0);
  if (h.errs.length) h.errs.slice(0, 5).forEach(e => console.log('     ' + e));

  await browser.close();
  console.log('\nVERIFY350 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
