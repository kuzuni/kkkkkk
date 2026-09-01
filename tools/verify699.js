#!/usr/bin/env node
/* 작업 699 게이트 — «전투 연출 스킵» 토글 (던전·보스·승급전)
 *   실행: node tools/verify699.js   → 마지막 줄이 `VERIFY699 n/n PASS` 여야 한다.
 *
 * 주인 원문(2026-09-02 02:00): «보스도전할때 연출효과 스킵 토글도 만들어줘. 그거클릭시 던전,보스,승급전
 * 전부 스킵 됨 연출효과. 보스도전할때 설정 가능하고 설정팝업에도 있게 해줘»
 *
 * 무엇을 접었나(`tools/probe699.js` 가 잰 표 — 수리 전 → 수리 후, 스킵 ON):
 *     스테이지 보스  스폰 대기 1.40 + 등장 국면 1.40 + 격파 시퀀스 1.50 = 4.32s → **0.03s**
 *     던전          스폰 대기 1.40 + 등장 국면 1.40 + 격파 시퀀스 1.60 = 4.42s → **0.03s**
 *     승급전        스폰 대기 0    + 등장 국면 1.40 + 격파 시퀀스 2.00 = 3.42s → **0.02s**
 *   접은 것은 «시간축에 얹힌 것» 뿐이다(363·514 규약) — 알림(«STAGE CLEAR!»)·소리·결과 화면은 그대로다.
 *
 * 본다:
 *   §1 값이 하나 — `S.opt.fxSkip` 한 칸(363·514 와 같은 키) · 저장·재로드 유지 · KEY 안 올림
 *   §2 자리 두 곳 — 보스 도전 HUD(#bossSkip)와 55 설정 팝업(#cfSkip) · 보일 때만 보이고 겹치지 않는다
 *   §3 동기화 — 어느 호스트에서 켜도 네 호스트가 같은 겉모습(`fxSyncSkip` 한 곳)
 *   §4 스킵 — 세 모드의 연출 구간이 0(ON) · OFF 면 옛 타임라인 그대로(회귀)
 *   §5 판정·보상 불변 — ON/OFF 에서 스테이지·계급·재화 결과가 같다(연출만 생략)
 *   §R 되돌림 — 스킵 판정을 false 로 굳힌 사본에서는 ON 이어도 연출이 살아난다(= 이 게이트가 무르지 않다)
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

/* 스킵 판정을 굳히는 자리 — §R 이 이 한 줄을 뒤집어 «연출이 되살아나는가» 를 묻는다 */
const GATE = 'const fxSkipOn = () => !!(S.opt && S.opt.fxSkip);';
const GATE_OFF = 'const fxSkipOn = () => false;   /* verify699 §R */';

/* 세 모드 타임라인을 재는 자 — probe699 와 **같은 축**이다(자를 두 벌로 만들지 않는다) */
const TIMELINE = `(([md, skip]) => {
  const DT = 1/60;
  const tick = () => { player.hp = stat.maxHp; player.dead = 0; step(DT); };
  localStorage.clear(); Object.assign(S, DEF());
  S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
  S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 999999; S.gold = 999999;
  for(const d of DUNGEONS) S.dunTk[d.id] = 9;
  for(const t of TOWERS) S.dunTk[t.id] = 9;
  S.opt.fxSkip = !!skip;
  arena = null; raidOn = null; promo = null;
  if(dunRun) endDunRun(false, true);
  spawnStage();
  document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach(el => el.classList.remove('on'));
  const on = notify, op = popup; notify = () => {}; popup = () => {};
  const tk = md === 'stage' ? 'boss' : md === 'dun' ? 'dunboss' : 'promo';
  const dg = DUNGEONS[0], st0 = S.stage, rk0 = S.rank, g0 = S.gold, d0 = S.dia;
  const done = () => md === 'stage' ? S.stage > st0
                   : md === 'dun'   ? (!dunRun && document.getElementById('dclw').classList.contains('on'))
                   :                  (!promo && S.rank > rk0);
  if(md === 'stage') startBoss();
  else if(md === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
  else startPromo();
  let f = 0, spawn = -1, intro = 0, clear = 0, killed = false, total = -1, msg = 0;
  while(f < 1200){
    const standing = enemies.some(e => e.tk === tk);
    if(spawn < 0 && standing) spawn = f;
    if(bossIntro) intro++;
    if(bossClear){ clear++; if(bossClear.msg) msg++; }
    if(!killed && standing && !bossIntro){
      const b = enemies.find(e => e.tk === tk);
      if(b){ killEnemy(b); killed = true; }
    }
    tick(); f++;
    if(killed && done()){ total = f; break; }
  }
  notify = on; popup = op;
  return { spawn, intro, clear, total, killed,
           dStage: S.stage - st0, dRank: S.rank - rk0, dGold: Math.round(S.gold - g0), dDia: S.dia - d0,
           dun: md === 'dun' ? (S.dun[dg.id] || 0) : 0 };
})`;

async function newPage(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + file);
  await page.waitForTimeout(1100);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  return { ctx, page, errs };
}
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await newPage(browser, FILE);

  /* ── §1 값이 하나 ── */
  console.log('§1 값이 하나 — 363·514 가 쓰던 `S.opt.fxSkip` 그대로(새 키를 안 만든다)');
  ok(/fxSkipOn\(\) \? 0 : 1\.4/.test(SRC), '28 스테이지 보스 스폰 딜레이가 스킵을 읽는다');
  ok(/fxSkipOn\(\) \? 0 : \(dly > 0 \? dly : DUN_BOSS_DLY\)/.test(SRC), '30 던전 보스 스폰 딜레이가 스킵을 읽는다');
  ok(/bossIntroLen\(\) <= 0 \|\| fxSkipOn\(\)/.test(SRC), '457 등장 국면이 스킵을 읽는다');
  ok(/hold: sk \? 0 : DUN_CLR_HOLD/.test(SRC), '475 격파 시퀀스의 홀드가 스킵을 읽는다');
  ok(!/fxSkip2|skipFx|battleSkip/.test(SRC), '새 상태·새 키를 안 만들었다 (값은 하나다)');
  const s1 = await ev(page, () => {
    S.opt.fxSkip = true; save();
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { key: KEY, saved: !!(raw.opt && raw.opt.fxSkip), on: fxSkipOn() };
  });
  eq('켜면 판정도 켜진다', s1.on, true);
  eq('세이브에 남는다', s1.saved, true);
  eq('KEY 는 안 올렸다 (구 세이브가 그대로 열린다)', s1.key, 'idle_hunter_save_v4');
  /* 재로드 대신 **실제 로더**를 돌린다 — 이 자는 `addInitScript` 로 매 항해마다 localStorage 를
     비우므로(격리) `location.reload()` 로 재면 «세이브가 사라진 것» 을 «안 남았다» 로 오독한다
     (363 이 남긴 교훈과 같은 함정: 세이브 유지는 reload 가 아니라 `load()` 로 잰다). */
  const s1c = await ev(page, () => { Object.assign(S, DEF()); load(); return { on: fxSkipOn() }; });
  eq('세이브를 다시 읽어도 켜져 있다', s1c.on, true);
  await ev(page, () => { window.requestAnimationFrame = () => 0; S.opt.fxSkip = false; save(); fxSyncSkip(); });

  /* ── §2 자리 두 곳 ── */
  console.log('§2 자리 — 보스 도전 HUD(#bossSkip) · 55 설정 팝업(#cfSkip)');
  const s2 = await ev(page, () => {
    const r = el => { const g = el.getBoundingClientRect(); const A = document.getElementById('app').getBoundingClientRect();
      return { x:+(g.x - A.left).toFixed(1), y:+(g.y - A.top).toFixed(1), w:+g.width.toFixed(1), h:+g.height.toFixed(1),
               vis: getComputedStyle(el).display !== 'none' }; };
    const out = {};
    /* 기본 화면(보스전 아님) */
    S.bossFarm = false; bossOn = false; promo = null; raidOn = null; arena = null;
    if(dunRun) endDunRun(false, true);
    drawBossHud();
    out.idle = r(document.getElementById('bossSkip')).vis;
    /* 보스 도전 대기(40 재도전) */
    S.bossFarm = true; drawBossHud();
    out.farm = r(document.getElementById('bossSkip')).vis;
    out.rt = r(document.getElementById('bossRt'));
    /* 보스전 중(39) */
    S.bossFarm = false; startBoss(); drawBossHud();
    out.fight = r(document.getElementById('bossSkip')).vis;
    out.box = r(document.getElementById('bossSkip'));
    out.gv = r(document.getElementById('bossGv'));
    out.hp = r(document.getElementById('bossHp'));
    out.tm = r(document.getElementById('bossTm'));
    /* 55 설정 팝업 */
    openConf();
    out.cf = r(document.getElementById('cfSkip'));
    out.sub = r(document.querySelector('.cf55-sub'));
    out.track = r(document.getElementById('cfTrack'));
    out.body = r(document.querySelector('.cf55-body'));
    closeConf();
    bossOn = false; bossT = 0; enemies.length = 0; spawnQ.length = 0; drawBossHud();
    return out;
  });
  const hit = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  eq('기본 화면에서는 안 보인다', s2.idle, false);
  eq('보스 도전 대기(재도전)에서 보인다', s2.farm, true);
  eq('보스전 중에도 보인다 (도전 중 설정 가능)', s2.fight, true);
  ok(s2.box.y >= s2.gv.y + s2.gv.h, `액션 버튼 아래에 선다 (버튼 하변 ${s2.gv.y + s2.gv.h} ≤ 토글 상변 ${s2.box.y})`);
  ok(!hit(s2.box, s2.gv) && !hit(s2.box, s2.hp) && !hit(s2.box, s2.tm) && !hit(s2.box, s2.rt),
    '보스 HUD 4요소와 겹침 0 (버튼·체력바·타이머·재도전)');
  near('가로 중심이 화면 중앙 540', s2.box.x + s2.box.w / 2, 540, 1);
  ok(!hit(s2.cf, s2.sub) && !hit(s2.cf, s2.track), '55 팝업: 「볼륨」 제목·슬라이더와 겹침 0');
  ok(s2.cf.x >= s2.body.x && s2.cf.x + s2.cf.w <= s2.body.x + s2.body.w
     && s2.cf.y >= s2.body.y && s2.cf.y + s2.cf.h <= s2.body.y + s2.body.h, '55 팝업: 토글이 본문 안(잘림 0)');
  ok(s2.cf.x + s2.cf.w <= s2.track.x + s2.track.w + 0.6, '55 팝업: 오른끝이 슬라이더 우단을 안 넘는다');

  /* 짧은 프레임(9:13.3)에서도 같은 두 조건 */
  await page.setViewportSize({ width: 1080, height: 1600 });
  await page.waitForTimeout(420);
  const s2s = await ev(page, () => {
    const A = document.getElementById('app').getBoundingClientRect();
    const r = el => { const g = el.getBoundingClientRect();
      return { x:+(g.x - A.left).toFixed(1), y:+(g.y - A.top).toFixed(1), w:+g.width.toFixed(1), h:+g.height.toFixed(1) }; };
    openConf();
    const o = { cf:r(document.getElementById('cfSkip')), sub:r(document.querySelector('.cf55-sub')),
                track:r(document.getElementById('cfTrack')), body:r(document.querySelector('.cf55-body')) };
    closeConf(); return o;
  });
  ok(!hit(s2s.cf, s2s.sub) && !hit(s2s.cf, s2s.track), '[1600] 55 팝업: 제목·슬라이더와 겹침 0');
  ok(s2s.cf.y >= s2s.body.y && s2s.cf.y + s2s.cf.h <= s2s.body.y + s2s.body.h, '[1600] 55 팝업: 본문 안');
  await page.setViewportSize({ width: 1080, height: 2280 });
  await page.waitForTimeout(300);

  /* ── §3 동기화 ── */
  console.log('§3 동기화 — 어느 호스트에서 켜도 네 호스트가 같은 겉모습(fxSyncSkip 한 곳)');
  const s3 = await ev(page, () => {
    S.opt.fxSkip = false; fxSyncSkip();
    S.bossFarm = true; drawBossHud();
    document.getElementById('bossSkip').click();              /* 28 에서 켠다 */
    const afterHud = { val:!!S.opt.fxSkip, hud:!!document.querySelector('#bossSkip.on') };
    openConf();
    const cf = { on:!!document.querySelector('#cfSkip.on'), lab:document.querySelector('#cfSkip .sm-skk>em').textContent };
    document.getElementById('cfSkip').click();                /* 55 에서 끈다 */
    const afterCf = { val:!!S.opt.fxSkip, hud:!!document.querySelector('#bossSkip.on'),
                      cf:!!document.querySelector('#cfSkip.on'), lab:document.querySelector('#bossSkip .sm-skk>em').textContent };
    closeConf(); S.bossFarm = false; drawBossHud();
    return { afterHud, cf, afterCf, aria: document.getElementById('cfSkip').getAttribute('aria-checked') };
  });
  eq('보스 HUD 토글을 누르면 값이 켜진다', s3.afterHud.val, true);
  eq('그 자리 겉모습도 ON', s3.afterHud.hud, true);
  eq('55 팝업을 열면 이미 ON 으로 보인다', s3.cf.on, true);
  eq('55 라벨도 ON', s3.cf.lab, 'ON');
  eq('55 에서 끄면 값이 꺼진다', s3.afterCf.val, false);
  eq('보스 HUD 쪽도 같이 꺼진다 (사본이 아니다)', s3.afterCf.hud, false);
  eq('보스 HUD 라벨도 OFF', s3.afterCf.lab, 'OFF');
  eq('aria-checked 도 따라간다', s3.aria, 'false');

  /* ── §4 스킵 · §5 판정 불변 ── */
  console.log('§4 스킵 — 세 모드의 연출 구간(스폰 대기·등장 국면·격파 시퀀스)이 0 · OFF 면 옛 타임라인');
  const T = {};
  for (const md of ['stage', 'dun', 'promo']) {
    for (const sk of [false, true]) T[md + (sk ? 'ON' : 'OFF')] = await ev(page, TIMELINE + '(' + JSON.stringify([md, sk]) + ')');
  }
  const WANT_OFF = { stage:{ spawn:84, intro:84, clear:90, total:259 },
                     dun:  { spawn:84, intro:84, clear:96, total:265 },
                     promo:{ spawn:0,  intro:84, clear:120, total:205 } };
  for (const md of ['stage', 'dun', 'promo']) {
    const on = T[md + 'ON'], off = T[md + 'OFF'], w = WANT_OFF[md];
    if (!on || !off || on.__err || off.__err) { ok(false, `[${md}] 측정`, (on && on.__err) || (off && off.__err) || '결과 없음'); continue; }
    /* OFF = 회귀. 프레임 수라 정수로 못박되 die 애니 길이의 반올림 몫으로 ±2 를 준다 */
    near(`[${md}] OFF 스폰 대기 ${(w.spawn/60).toFixed(2)}s 그대로`, off.spawn, w.spawn, 2);
    near(`[${md}] OFF 등장 국면 ${(w.intro/60).toFixed(2)}s 그대로`, off.intro, w.intro, 2);
    near(`[${md}] OFF 격파 시퀀스 ${(w.clear/60).toFixed(2)}s 그대로`, off.clear, w.clear, 2);
    near(`[${md}] OFF 합계 ${(w.total/60).toFixed(2)}s 그대로`, off.total, w.total, 4);
    /* ON = 연출 구간 0. «다음 프레임에 선다/넘어간다» 라 1프레임까지가 정상이다 */
    ok(on.spawn <= 1, `[${md}] ON 스폰 대기 0 (${on.spawn}프레임)`);
    eq(`[${md}] ON 등장 국면 0프레임`, on.intro, 0);
    ok(on.clear <= 1, `[${md}] ON 격파 시퀀스 0 (${on.clear}프레임)`);
    ok(on.total <= 3, `[${md}] ON 도전 → 결과 ${(on.total/60).toFixed(2)}s (OFF ${(off.total/60).toFixed(2)}s)`);
    ok(off.total - on.total >= 180, `[${md}] 실측 단축 ${((off.total - on.total)/60).toFixed(2)}s ≥ 3.00s`);
  }
  console.log('§5 판정·보상 불변 — 연출만 생략한다(결과는 ON/OFF 가 같다)');
  for (const md of ['stage', 'dun', 'promo']) {
    const on = T[md + 'ON'], off = T[md + 'OFF'];
    if (!on || !off || on.__err || off.__err) continue;
    eq(`[${md}] 격파가 실제로 일어났다(ON)`, on.killed, true);
    eq(`[${md}] 스테이지 상승 같음`, on.dStage, off.dStage);
    eq(`[${md}] 계급 상승 같음`, on.dRank, off.dRank);
    eq(`[${md}] 던전 레벨 같음`, on.dun, off.dun);
    eq(`[${md}] 다이아 증감 같음`, on.dDia, off.dDia);
    ok(Math.abs(on.dGold - off.dGold) <= Math.max(50, Math.abs(off.dGold) * 0.25),
      `[${md}] 골드 증감이 같은 자리 (ON ${on.dGold} · OFF ${off.dGold} — 연출 시간 동안의 방치 수입 차이만)`);
  }
  ok(errs.length === 0, `콘솔·런타임 에러 0 (${errs.length})` + (errs.length ? ' — ' + errs[0] : ''));
  await ctx.close();

  /* ── §R 되돌림 ── */
  console.log('§R 되돌림 — 판정을 false 로 굳힌 사본에서는 ON 이어도 연출이 살아난다');
  ok(SRC.includes(GATE), '판정 한 줄이 소스에 있다 (되돌림의 자리)');
  const tmp = path.join(os.tmpdir(), 'verify699-off.html');
  fs.writeFileSync(tmp, SRC.replace(GATE, GATE_OFF));
  const R = await newPage(browser, tmp);
  const r1 = await ev(R.page, TIMELINE + '(' + JSON.stringify(['stage', true]) + ')');
  const r0 = await ev(R.page, TIMELINE + '(' + JSON.stringify(['stage', false]) + ')');
  if (!r1 || r1.__err || !r0 || r0.__err) ok(false, '[음성] 측정', (r1 && r1.__err) || (r0 && r0.__err) || '결과 없음');
  else {
    /* ⚠ 사본은 임시 폴더에서 열리므로 아틀라스(상대 경로)가 안 실려 `bossDieSec` 가 하한 0.3 으로 떨어진다.
       그래서 «몇 프레임» 을 절대값으로 못박지 않고 **같은 사본 안의 ON ↔ OFF 를 대조**한다 —
       되돌림이 묻는 것은 «토글이 아무 일도 안 하게 됐는가» 이고, 그건 두 줄이 같으냐로 답한다. */
    eq('[음성] ON 인데 스폰 대기가 살아난다 (OFF 와 같다)', r1.spawn, r0.spawn);
    eq('[음성] ON 인데 등장 국면이 살아난다 (OFF 와 같다)', r1.intro, r0.intro);
    eq('[음성] ON 인데 격파 시퀀스가 살아난다 (OFF 와 같다)', r1.clear, r0.clear);
    ok(r1.spawn >= 80 && r1.intro >= 80, `[음성] 그 구간이 실제로 길다 (스폰 ${r1.spawn} · 국면 ${r1.intro}프레임)`);
  }
  await R.ctx.close();
  fs.unlinkSync(tmp);

  await browser.close();
  console.log(`\nVERIFY699 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
