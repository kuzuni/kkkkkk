/* 작업 738 게이트 — «모드 전환 때 이전 모드의 전투 연출을 데려오지 않는다»
 *
 *   node tools/verify738.js
 *
 * 주인 보고(2026-09-02 04:40): «승급전 도전할때 스테이지에서 있던 스킬들 찌꺼기 보임. 없어지게 해야하는데»
 *
 * 이 자가 지키는 것 다섯:
 *   [S] **목록이 한 곳뿐이다** — 연출 청소 목록은 `clearFieldFx()` 하나이고 진입점 다섯(스테이지·
 *       던전/탑·승급전·레이드·아레나)이 그것을 부른다. 수리 전에는 이 목록이 네 곳에 복붙돼 있었고
 *       **`parts` 가 한 곳에만** 있었다 — 그래서 종이 늘 때마다 자리마다 따로 뒤처졌다.
 *   [M] **전환 매트릭스** — 스테이지에서 스킬을 다발로 터뜨린 직후 갈아탄다. 전환 **직전**에 살아
 *       있던 연출 객체·DOM 에 표식을 찍고, 전환 **직후 첫 프레임**에 그 표식이 몇 개 남는지 센다
 *       (새 모드가 스스로 만든 연출을 «찌꺼기» 로 세지 않기 위한 장치다). 기대 = 0.
 *   [N] **음성항 — «전부 죽인다» 가 아니다**: ⓐ 갈아탄 뒤 새 모드의 연출은 정상으로 살아난다
 *       ⓑ **UI 발 층(`#fxl`)은 안 건드린다**(660/666 의 강화·소환 버스트가 사는 층).
 *   [K] **같은 모드 안에서는 안 지운다** — 660 «캔슬 금지» 의 경계. 스테이지 안의 국면 전환
 *       (`startBoss`)은 연출을 지우지 않는다.
 *   [R] **되돌림 시험** — ⓐ `clearFieldFx()` 본문을 비운 사본 ⓑ `startPromo` 의 호출 한 줄만 지운
 *       사본. 둘 다 [M] 이 다시 빨개져야 한다. 이 절이 없으면 «이미 참인 것을 굳힌 게이트»
 *       (338 이 잡은 그 모양)와 구별되지 않는다.
 *
 * 재현기는 `tools/probe738.js`(수리 전 표 — 승급전은 살아 있던 192개가 **전부** 넘어왔다).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 상대 경로로 무는 assets/** 가 통째로 404 다
   (360·367·438·439·453·467·471·541 선례). 이름에 pid 를 섞는다(648 규약). */
const NEG = (n) => path.join(ROOT, `.v738-neg${n}-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 연출 배열 10종 — `clearFieldFx()` 가 비워야 하는 목록. 판정 축(enemies·spawnQ·killed)은 여기 없다. */
const FX_ARR = ['shots', 'parts', 'nums', 'corpses', 'zones', 'booms', 'bolts', 'drones', 'rings', 'ghosts'];

/* 소스에서 함수 한 덩이를 잘라 낸다(중괄호 균형 — 정규식으로 끊으면 중첩에서 틀린다) */
function bodyOf(src, sig) {
  const i = src.indexOf(sig);
  if (i < 0) return null;
  const s = src.indexOf('{', i);
  if (s < 0) return null;
  let d = 0;
  for (let j = s; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return src.slice(s, j + 1); }
  }
  return null;
}

/* ── 한 칸을 굴린다 — probe738 과 **같은 절차**다(자와 재현기가 갈리면 둘 다 못 믿는다) ── */
/* eslint-disable no-undef */
const CELL = ([to, opt]) => {
  const DT = 1 / 60;
  const tick = (sec) => {
    for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); }
  };
  const ARR = ['shots', 'parts', 'nums', 'corpses', 'zones', 'booms', 'bolts', 'drones', 'rings', 'ghosts', 'spawnQ'];
  const bag = () => ({ shots, parts, nums, corpses, zones, booms, bolts, drones, rings, ghosts, spawnQ });

  localStorage.clear();
  Object.assign(S, DEF());
  const use = SKILLS.slice(0, 8).map((s) => s.id);
  S.own = {}; for (const id of use) S.own[id] = { n: 0, l: 5 };
  S.eqSkill = use.slice(0, 6);
  S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 999999; S.gold = 999999;
  for (const d of DUNGEONS) S.dunTk[d.id] = 9;
  for (const t of TOWERS) S.dunTk[t.id] = 9;
  /* ⚠ `raidLeft()` 는 «남은 횟수» 다(소진 수가 아니다) — 0 이면 startRaid 가 문턱에서 돌아서고
     표가 «아무것도 안 지웠다» 로 읽힌다(probe738 1회차가 실제로 그랬다). */
  S.daily = S.daily || {}; S.daily.raid = RAID_TRY; S.daily.arena = 0;
  arena = null; raidOn = null; promo = null;
  if (dunRun) endDunRun(false, true);
  spawnStage();
  document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));

  const dg = DUNGEONS[0];
  const enter = (md) => {
    if (md === 'promo') startPromo();
    else if (md === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
    else if (md === 'tower') startDunRun(TOWER, towerFloor(TOWER));
    else if (md === 'raid') startRaid(RAIDS[0]);
    else if (md === 'arena') startArena();
    else if (md === 'stage') spawnStage();
  };

  /* ---- 이전 모드를 세우고 스킬을 다발로 터뜨린다 ---- */
  if (opt && opt.from === 'promo') { startPromo(); tick(0.6); }
  tick(1.0);
  for (let r = 0; r < 3; r++) {
    for (const id of S.eqSkill) { const s = SK[id]; if (s) { try { castSkill(s); } catch (_) {} } }
    tick(0.15);
  }
  const live = ARR.reduce((a, k) => a + bag()[k].length, 0);
  const preMd = bossMode();

  /* ---- UI 발 층(#fxl)에 표본 하나 — 청소가 그 층을 건드리면 안 된다(660/666 경계) ----
     ⚠ 한 페이지에서 칸을 여러 번 굴리므로 **앞 칸의 표본을 먼저 걷는다** — 안 그러면 수가
        1,2,3… 으로 쌓여 «UI 층이 산다» 가 아니라 «자가 쓰레기를 쌓는다» 를 재게 된다. */
  const uiL = $('fxl');
  if (uiL) {
    for (const el of Array.prototype.slice.call(uiL.querySelectorAll('[data-v738ui]'))) el.remove();
    const m = document.createElement('i'); m.setAttribute('data-v738ui', '1'); uiL.appendChild(m);
  }

  /* ---- 표식 — «전환 직전에 살아 있던 것» 만 센다 ---- */
  for (const k of ARR) for (const o of bag()[k]) { try { o.__v738 = 1; } catch (_) {} }
  for (const id of ['fxlc']) {
    const l = $(id); if (!l) continue;
    for (const el of Array.prototype.slice.call(l.children)) el.setAttribute('data-v738', '1');
  }

  enter(to);
  const mdAfter = bossMode();
  const left = {}; for (const k of ARR) left[k] = bag()[k].filter((o) => o && o.__v738).length;
  const leftTotal = ARR.reduce((a, k) => a + left[k], 0);
  const lc = $('fxlc');
  const domLeft = lc ? lc.querySelectorAll('[data-v738]').length : 0;
  const uiAlive = uiL ? uiL.querySelectorAll('[data-v738ui]').length : -1;

  /* ---- 새 모드가 제 연출을 정상으로 만드는가(음성항) ----
     ⚠ «몇 초» 로 박지 않는다 — 던전·탑 보스는 스폰 딜레이 1.4초 + 등장 국면(457) 뒤에야 서고
        그 길이가 아틀라스에 달려 있다. 대상이 없으면 스킬이 발동조차 안 해 표가 «연출 0» 으로
        거짓 빨강이 된다(probe665 가 1회차에 같은 함정을 밟았다). **상대가 실제로 설 때까지** 굴린다. */
  for (let i = 0; i < 900 && (!enemies.length || bossIntro); i++) tick(DT);
  tick(0.3);
  for (const id of S.eqSkill) { const s = SK[id]; if (s) { try { castSkill(s); } catch (_) {} } }
  tick(0.3);
  const born = ARR.reduce((a, k) => a + bag()[k].length, 0);

  return { live, preMd, entered: mdAfter, leftTotal, born, domLeft, uiAlive,
           arrs: ARR.filter((k) => left[k] > 0).map((k) => k + ':' + left[k]) };
};

/* 모드에서 **나오는** 길 — 승급전을 실패로 닫으면 `spawnStage()` 로 스테이지에 돌아온다.
   나가는 쪽도 같은 자로 잰다(들어가는 쪽만 지키면 돌아온 스테이지가 승급전 연출을 문다). */
const BACK = () => {
  const DT = 1 / 60;
  const tick = (sec) => { for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); } };
  const ARR = ['shots', 'parts', 'nums', 'corpses', 'zones', 'booms', 'bolts', 'drones', 'rings', 'ghosts', 'spawnQ'];
  const bag = () => ({ shots, parts, nums, corpses, zones, booms, bolts, drones, rings, ghosts, spawnQ });
  localStorage.clear();
  Object.assign(S, DEF());
  const use = SKILLS.slice(0, 8).map((s) => s.id);
  S.own = {}; for (const id of use) S.own[id] = { n: 0, l: 5 };
  S.eqSkill = use.slice(0, 6);
  S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0;
  arena = null; raidOn = null; promo = null;
  if (dunRun) endDunRun(false, true);
  spawnStage();
  startPromo();
  for (let i = 0; i < 480 && !enemies.length; i++) tick(DT);
  tick(0.4);
  for (let r = 0; r < 3; r++) {
    for (const id of S.eqSkill) { const s = SK[id]; if (s) { try { castSkill(s); } catch (_) {} } }
    tick(0.15);
  }
  const live = ARR.reduce((a, k) => a + bag()[k].length, 0);
  for (const k of ARR) for (const o of bag()[k]) { try { o.__v738 = 1; } catch (_) {} }
  const lc0 = $('fxlc');
  if (lc0) for (const el of Array.prototype.slice.call(lc0.children)) el.setAttribute('data-v738', '1');
  const on = notify, op = popup;
  notify = () => {}; popup = () => {};
  try { endPromo(false); } finally { notify = on; popup = op; }
  const left = {}; for (const k of ARR) left[k] = bag()[k].filter((o) => o && o.__v738).length;
  const lc = $('fxlc');
  return { live, leftTotal: ARR.reduce((a, k) => a + left[k], 0),
           domLeft: lc ? lc.querySelectorAll('[data-v738]').length : 0,
           arrs: ARR.filter((k) => left[k] > 0).map((k) => k + ':' + left[k]) };
};

/* 같은 모드 «안» 의 국면 전환은 연출을 안 지운다(660 «캔슬 금지» 의 경계) */
const SAME_MODE = () => {
  const DT = 1 / 60;
  const tick = (sec) => { for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); } };
  localStorage.clear();
  Object.assign(S, DEF());
  const use = SKILLS.slice(0, 8).map((s) => s.id);
  S.own = {}; for (const id of use) S.own[id] = { n: 0, l: 5 };
  S.eqSkill = use.slice(0, 6);
  S.stage = 30; S.best = 30; S.guide.idx = 99;
  arena = null; raidOn = null; promo = null;
  if (dunRun) endDunRun(false, true);
  spawnStage();
  tick(1.0);
  for (const id of S.eqSkill) { const s = SK[id]; if (s) { try { castSkill(s); } catch (_) {} } }
  tick(0.1);
  const before = parts.length + rings.length + shots.length;
  startBoss();                                   /* 스테이지 «몹 구간 → 보스전» = 같은 모드 안 */
  const after = parts.length + rings.length + shots.length;
  return { before, after };
};
/* eslint-enable no-undef */

async function openPage(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  return { ctx, page };
}

const TOS = ['promo', 'dun', 'tower', 'raid', 'arena', 'stage'];

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [S] 목록이 한 곳뿐이다 ─────────────────────────────────────── */
  blk('[S] 연출 청소 목록은 `clearFieldFx()` 한 곳뿐이고 진입점 다섯이 그것을 부른다');
  const decl = (src.match(/function clearFieldFx\s*\(/g) || []).length;
  ok(decl === 1, 'S1 `clearFieldFx()` 선언이 정확히 1개 — ' + decl + '개');
  const body = bodyOf(src, 'function clearFieldFx');
  ok(!!body, 'S2 선언 본문을 읽었다');
  if (body) {
    const miss = FX_ARR.filter((k) => !new RegExp(k + '\\.length\\s*=\\s*0').test(body));
    ok(miss.length === 0, 'S3 연출 배열 ' + FX_ARR.length + '종을 전부 비운다 — 누락 ' + (miss.join(',') || '없음'));
    ok(/fxlc|fxLC/.test(body), 'S4 전투 발 DOM 층(`#fxlc`)도 비운다');
    ok(!/\bfxL\(\)/.test(body) && !/'fxl'/.test(body),
      'S5 UI 발 층(`#fxl`)은 **안** 건드린다 — 660/666 의 강화·소환 버스트가 사는 층이다');
    ok(!/\benemies\.length\s*=\s*0/.test(body) && !/\bspawnQ\.length\s*=\s*0/.test(body),
      'S6 판정 축(`enemies`·`spawnQ`)은 여기 안 들어온다 — 진입점마다 시점이 다르다');
  }
  /* 진입점 다섯이 실제로 부르는가 — 함수 본문을 잘라서 본다 */
  for (const [sig, name] of [['function spawnStage(', '스테이지'], ['function startDunRun(', '던전·탑'],
                             ['function startPromo(', '승급전'], ['function startRaid(', '레이드'],
                             ['function startArena(', '아레나']]) {
    const b = bodyOf(src, sig);
    ok(!!b && /clearFieldFx\(\)/.test(b), 'S7 ' + name + ' 진입점이 `clearFieldFx()` 를 부른다');
  }
  /* 옛 복붙이 한 자리도 안 남았다 — 남으면 그 자리가 다시 따로 뒤처진다 */
  const strays = FX_ARR.map((k) => [k, (src.match(new RegExp(k + '\\.length\\s*=\\s*0', 'g')) || []).length])
    .filter(([, n]) => n > 1);
  ok(strays.length === 0, 'S8 연출 배열을 직접 비우는 자리가 `clearFieldFx()` 밖에 없다 — '
    + (strays.map(([k, n]) => k + '×' + n).join(', ') || '없음'));

  const browser = await launch(chromium);
  const { ctx, page } = await openPage(browser, 'file://' + SRC);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* ── [M] 전환 매트릭스 ──────────────────────────────────────────── */
  blk('[M] 스테이지에서 스킬 다발 발동 → 갈아타면 이전 연출이 0 개다');
  const seen = {};
  for (const to of TOS) {
    const r = await ev(CELL, [to, null]);
    seen[to] = r;
    if (r.__err) { fail++; console.log('  ❌ M(' + to + ') 예외: ' + r.__err); continue; }
    ok(r.live >= 20, 'M0(' + to + ') 전환 직전에 잴 만큼의 연출이 실제로 살아 있다 — ' + r.live + '개');
    ok(r.leftTotal === 0, 'M1(' + to + ') 전환 직후 첫 프레임에 이전 연출 0 개 — '
      + r.leftTotal + (r.arrs.length ? ' (' + r.arrs.join(' ') + ')' : ''));
    ok(r.domLeft === 0, 'M2(' + to + ') 전투 발 DOM 층 잔류 0 노드 — ' + r.domLeft);
  }
  /* 역방향 한 칸 — 승급전 **에서 나오는** 길.
     ⚠ «승급전 → 던전» 은 자리가 없다: 665 가 그 창을 의도적으로 잠갔다(`battleLocked`) —
        1회차에 그 칸을 M3 으로 잡았다가 «잔류 64» 라는 거짓 빨강을 받았다(전환이 아예 안 일어난다).
        모드에서 나오는 정식 길은 런 종료(`endPromo` → `spawnStage`)이므로 그것을 잰다. */
  const rev = await ev(BACK);
  if (rev.__err) { fail++; console.log('  ❌ M3 예외: ' + rev.__err); }
  else {
    ok(rev.live >= 20, 'M3a 승급전 안에서 잴 만큼의 연출이 살아 있다 — ' + rev.live + '개');
    ok(rev.leftTotal === 0 && rev.domLeft === 0,
      'M3b 승급전 종료 → 스테이지 복귀에도 잔류 0 — 배열 ' + rev.leftTotal
      + (rev.arrs.length ? ' (' + rev.arrs.join(' ') + ')' : '') + ' · DOM ' + rev.domLeft);
  }

  /* ── [N] 음성항 — «전부 죽인다» 가 아니다 ───────────────────────── */
  blk('[N] 음성항 — 새 모드의 연출은 살아나고, UI 발 층은 안 건드린다');
  for (const to of TOS) {
    const r = seen[to];
    if (!r || r.__err) continue;
    ok(r.born > 0, 'N1(' + to + ') 갈아탄 뒤 그 모드에서 새 연출이 정상으로 난다 — ' + r.born + '개');
    ok(r.uiAlive === 1, 'N2(' + to + ') UI 발 층(`#fxl`)의 표본이 그대로 산다 — ' + r.uiAlive
      + ' (660/666 의 강화·소환 버스트가 사는 층)');
  }

  /* ── [K] 같은 모드 안에서는 안 지운다(660 경계) ─────────────────── */
  blk('[K] 660 «캔슬 금지» 경계 — 같은 모드 «안» 의 국면 전환은 연출을 안 지운다');
  const k = await ev(SAME_MODE);
  if (k.__err) { fail++; console.log('  ❌ K 예외: ' + k.__err); }
  else {
    ok(k.before > 0, 'K0 스테이지 몹 구간에서 연출이 살아 있다 — ' + k.before + '개');
    ok(k.after > 0, 'K1 `startBoss()`(같은 모드 안 국면 전환) 뒤에도 연출이 산다 — '
      + k.before + ' → ' + k.after + ' (모드 전환이 아니므로 청소 대상이 아니다)');
  }

  await page.close(); await ctx.close();

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────── */
  blk('[R] 되돌림 시험 — 처방을 되돌리면 [M] 이 다시 빨개진다');
  const negRun = async (label, mut, arg) => {
    const f = NEG(label);
    try {
      const neg = mut(src);
      if (neg === src) { fail++; console.log('  ❌ R' + label + ' 치환이 한 곳도 안 걸렸다'); return null; }
      fs.writeFileSync(f, neg);
      const { ctx: c2, page: p2 } = await openPage(browser, 'file://' + f);
      let out;
      try { out = await p2.evaluate(CELL, arg); }
      catch (e) { out = { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
      await p2.close(); await c2.close();
      return out;
    } catch (e) { fail++; console.log('  ❌ R' + label + ' 예외: ' + String((e && e.message) || e).slice(0, 160)); return null; }
    finally { try { fs.unlinkSync(f); } catch (_) { /* 이미 없으면 그만 */ } }
  };

  /* R1 — `clearFieldFx()` 본문을 통째로 비운다 = 수리 전 세계 */
  const r1 = await negRun(1, (t) => t.replace(bodyOf(t, 'function clearFieldFx'), '{ /* R1 무력화 */ }'), ['promo', null]);
  if (r1 && !r1.__err) ok(r1.leftTotal > 0,
    'R1 `clearFieldFx()` 를 무력화한 사본은 승급전에서 다시 찌꺼기가 남는다 — ' + r1.leftTotal + '개'
    + (r1.arrs.length ? ' (' + r1.arrs.join(' ') + ')' : ''));
  else if (r1) { fail++; console.log('  ❌ R1 예외: ' + r1.__err); }

  /* R2 — 승급전의 호출 한 줄만 지운다 = 수리 전 startPromo(주인이 본 그 자리) */
  const r2 = await negRun(2, (t) => {
    const b = bodyOf(t, 'function startPromo');
    return b ? t.replace(b, b.replace('clearFieldFx();', '/* R2 무력화 */')) : t;
  }, ['promo', null]);
  if (r2 && !r2.__err) ok(r2.leftTotal > 0,
    'R2 승급전의 호출 한 줄만 지운 사본도 다시 빨갛다(주인이 본 자리) — ' + r2.leftTotal + '개'
    + (r2.arrs.length ? ' (' + r2.arrs.join(' ') + ')' : ''));
  else if (r2) { fail++; console.log('  ❌ R2 예외: ' + r2.__err); }

  /* R3 — 그 사본에서도 **던전**은 초록이어야 한다 = 자가 «승급전 자리» 를 정확히 짚는다 */
  const r3 = await negRun(3, (t) => {
    const b = bodyOf(t, 'function startPromo');
    return b ? t.replace(b, b.replace('clearFieldFx();', '/* R3 무력화 */')) : t;
  }, ['dun', null]);
  if (r3 && !r3.__err) ok(r3.leftTotal === 0,
    'R3 그 사본에서도 던전은 초록이다 — ' + r3.leftTotal + ' (자가 자리를 뭉뚱그리지 않는다)');
  else if (r3) { fail++; console.log('  ❌ R3 예외: ' + r3.__err); }

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('verify738: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
