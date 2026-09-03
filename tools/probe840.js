/* 840 재현 — «50 코스튬 카드 좌상단 [+] 착용 뱃지(`.sk-eq`)를 강화 플래시가 덮는다»
 *
 * 등재문(814 5회차 비평 CR9 3-1)의 실측: 잉크 footprint 1899px 기준 가림률
 *   58.3 / 73.9 / 76.6 / 66.3%(0/80/160/240ms) · 320ms 0%.
 * 338 규칙대로 **처방 전에 제품에게 직접 묻는다.** 이 자는 **같은 자·같은 상자**로 두 트리를 잰다:
 *   ⓐ 수리 전 사본(`PRE_SHA` 의 `index.html`) — 등재문이 사실인가
 *   ⓑ 현재 트리                                 — 수리가 그 자리를 실제로 닫았는가
 * 두 벌을 한 자로 재는 이유는 654·338 과 같다 — «수리 전에도 같은 점수» 인 자리를 고쳤다고
 * 적는 사고와, «이미 참인 것을 게이트로 굳히는» 사고를 둘 다 막는다.
 *
 * 재는 법:
 *   ⓐ 기준 프레임 — 강화를 누르기 «전» 의 뱃지 상자(카드 좌상단 49×49 · left/top −4)
 *   ⓑ 잉크 화소  = 기준 프레임에서 뱃지가 실제로 그린 화소(검정 십자 + 흰 글리프).
 *      카드 크림 바탕(≈#F0D9BA)과 갈리는 축은 «채도 낮고 극단 밝기» 라 그 둘로 고른다.
 *   ⓒ 가림률     = ⓑ 중 그 프레임에서 색이 바뀐(최대 채널 Δ > 24) 화소의 비율
 *
 * ⚠ 프레임은 `getAnimations()` 를 정지시켜 눈금을 주되, **수거(`fxBye` 의 setTimeout)는 막는다** —
 *   probe814b 가 찍은 함정 그대로다(스크린샷 한 장이 300~400ms 라, 안 막으면 2번째 프레임부터
 *   «연출이 끝난 카드» 를 재게 된다).
 * ⚠ 수리 전 사본은 **저장소 루트**에 뽑는다(`.pre840-<pid>.html`) — /tmp 에 두면 index.html 이
 *   상대 경로로 무는 `assets/**` 가 통째로 404 라 «찍힌 픽셀» 이 달라진다(360·438·541 선례).
 * ⚠ 얕은 클론에서 `PRE_SHA` 가 창 밖이면 **⏸ 보류**다(빨강이 아니다) — 756 사다리(`gitrev756`)를
 *   먼저 올라가고, 못 파면 ⓑ 만 세고 ⓐ 는 이유를 찍는다.
 *
 * 실행: node tools/probe840.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('pngjs').PNG;
const G = require('./gitrev756');

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe840-'));
const PRE_SHA = '1946587';                     /* 840 착수 직전(= claim(840)) — 이 트리가 «수리 전» 이다 */
const PRE_FILE = path.join(ROOT, '.pre840-' + process.pid + '.html');
const STEPS = [0, 80, 160, 240, 320];          /* 등재문(CR9)과 같은 눈금 */
const DTH = 24;                                /* «바뀐 화소» 문턱(최대 채널 Δ) */

let pass = 0, fail = 0, hold = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const pause = (m) => { console.log('  ⏸ ' + m); hold++; };

/* 연출 노드의 수거만 무력화한다(probe814b 와 같은 처방) */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

async function boot(file) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + file);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {};
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  return { b, p, errs };
}

/* 착용 중이 아닌 카드를 고른다 — `.sk-eq` 는 «보유 + 미착용» 칸에만 있다(renderCos) */
async function select(p) {
  const r = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel && e.querySelector('.sk-eq')) || all[0];
    el.scrollIntoView({ block: 'center' });
    el.click();
    const sel = document.querySelector('#bCos .sk-card.sel');
    const eq = sel && sel.querySelector('.sk-eq');
    const md = document.querySelector('#modal') || document.querySelector('#mbox');
    const open = !!(md && md.offsetParent !== null);
    const q = eq ? eq.getBoundingClientRect() : null;
    const c = sel ? sel.getBoundingClientRect() : null;
    return { open, has: !!eq,
      eq: q ? { x: q.left, y: q.top, w: q.width, h: q.height } : null,
      card: c ? { x: c.left, y: c.top, w: c.width, h: c.height } : null };
  });
  if (r.open) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  if (!r.has) throw new Error('선택 카드에 `.sk-eq` 가 없다 — 표본 무효');
  return r;
}

const clipOf = (s) => ({ x: Math.round(s.x), y: Math.round(s.y), width: Math.round(s.w), height: Math.round(s.h) });
const readPng = (f) => PNG.sync.read(fs.readFileSync(f));

/* 뱃지 잉크 = 채도 낮고(≤26) 극단 밝기(검정 ≤70 / 흰 ≥210) — 카드 크림 바탕과 갈린다 */
function inkMask(png) {
  const m = new Uint8Array(png.width * png.height);
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    const r = png.data[i * 4], g = png.data[i * 4 + 1], b = png.data[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (mx - mn <= 26 && (l <= 70 || l >= 210)) { m[i] = 1; n++; }
  }
  return { m, n };
}

/* 가림률 — 잉크 화소 중 «색이 바뀐» 비율 */
function covered(base, img, mask) {
  let chg = 0;
  for (let i = 0; i < mask.m.length; i++) {
    if (!mask.m[i]) continue;
    const d = Math.max(Math.abs(img.data[i * 4] - base.data[i * 4]),
                       Math.abs(img.data[i * 4 + 1] - base.data[i * 4 + 1]),
                       Math.abs(img.data[i * 4 + 2] - base.data[i * 4 + 2]));
    if (d > DTH) chg++;
  }
  return 100 * chg / (mask.n || 1);
}

/* 한 트리를 잰다 — 같은 자·같은 상자·같은 눈금 */
async function measure(tag, file) {
  const { b, p, errs } = await boot(file);
  const sel = await select(p);
  const clip = clipOf(sel.eq);
  const baseF = path.join(TMP, tag + '-base.png');
  await p.screenshot({ path: baseF, clip });
  const base = readPng(baseF);
  const mask = inkMask(base);

  await p.evaluate(FREEZE);
  const fired = await p.evaluate(() => {
    const n0 = document.querySelectorAll('#fxl .fx-flash').length;
    document.querySelector('#bCos [data-cosup]').click();
    return { flash: document.querySelectorAll('#fxl .fx-flash').length - n0,
             keep: document.querySelectorAll('#fxl .fx-keep').length,
             /* 814 8회차 이관 — 이 자의 주제는 «뱃지» 패치다(사유·`FREEZE` 함정은 verify840 [3-c] 머리말) */
             keepEq: [...document.querySelectorAll('#fxl .fx-keep')].filter(
                       (k) => k.querySelector('.sk-eq') && k.__fxKeepHost && k.__fxKeepHost.isConnected).length };
  });

  const rows = [];
  for (const t of STEPS) {
    await p.evaluate((tt) => {
      document.getAnimations().forEach((a) => { a.pause(); try { a.currentTime = tt; } catch (_) {} });
    }, t);
    const f = path.join(TMP, `${tag}-t${t}.png`);
    await p.screenshot({ path: f, clip });
    rows.push({ t, cov: covered(base, readPng(f), mask) });
  }
  /* 재렌더가 원본 뱃지 노드를 갈아 끼우는가 — 이 자리 수리의 갈림길이다 */
  const after = await p.evaluate(() => {
    const s = document.querySelector('#bCos .sk-card.sel');
    return { sel: !!s, eq: !!(s && s.querySelector('.sk-eq')),
             keep: document.querySelectorAll('#fxl .fx-keep').length,
             /* 814 8회차 이관 — 이 자의 주제는 «뱃지» 패치다(사유·`FREEZE` 함정은 verify840 [3-c] 머리말) */
             keepEq: [...document.querySelectorAll('#fxl .fx-keep')].filter(
                       (k) => k.querySelector('.sk-eq') && k.__fxKeepHost && k.__fxKeepHost.isConnected).length };
  });
  await b.close();
  return { errs, sel, mask, fired, rows, after };
}

function report(tag, r) {
  console.log(`  · 카드 ${Math.round(r.sel.card.w)}×${Math.round(r.sel.card.h)} · 뱃지 ${Math.round(r.sel.eq.w)}×${Math.round(r.sel.eq.h)} @ 카드+(${Math.round(r.sel.eq.x - r.sel.card.x)}, ${Math.round(r.sel.eq.y - r.sel.card.y)}) · 잉크 ${r.mask.n}px`);
  console.log(`  · 클릭 직후 — 새 .fx-flash ${r.fired.flash}장 · .fx-keep ${r.fired.keep}장`);
  for (const x of r.rows) console.log(`    t=${String(x.t).padStart(3)}ms   가림률 ${x.cov.toFixed(1).padStart(5)}%`);
}
const peakOf = (r) => Math.max(...r.rows.filter((x) => x.t <= 240).map((x) => x.cov));

(async () => {
  console.log('PROBE840 — 50 코스튬 강화 플래시가 [+] 착용 뱃지를 덮는가 (수리 전 ↔ 현재 트리)\n');

  /* ── ⓐ 수리 전 사본 ─────────────────────────────────────────────── */
  console.log(`[1] ⓐ 수리 전 사본 (${PRE_SHA})`);
  let pre = null;
  const g = G.ensure(PRE_SHA);
  if (!g.ok) {
    pause(`[1-a] 수리 전 사본을 못 가져왔다 — ${g.env ? '⏸ 환경(얕은 클론)' : '빨강'}: ${g.why || ''}`);
    if (!g.env) fail++;
  } else {
    const sh = G.show(PRE_SHA, 'index.html');
    if (!sh.ok) throw new Error('수리 전 사본을 못 꺼냈다: ' + sh.why);
    fs.writeFileSync(PRE_FILE, sh.buf);
    pre = await measure('pre', PRE_FILE);
    report('pre', pre);
    ok(pre.errs.length === 0, `[1-a] 수리 전 콘솔 에러 0건 (${pre.errs.length})`);
    ok(pre.fired.keep === 0, `[1-b] 뿌리 ① — 수리 전에는 keep 패치가 **0장**이다(fxUpOk 가 inset·keep 을 안 준다) (${pre.fired.keep})`);
    ok(peakOf(pre) > 40, `[1-c] 등재문 재현 — 0~240ms 봉우리 가림률 > 40% (${peakOf(pre).toFixed(1)}%)`);
    ok(pre.rows[pre.rows.length - 1].cov < 5, `[1-d] 등재문 재현 — 320ms 에는 0% 로 돌아온다 (${pre.rows[pre.rows.length - 1].cov.toFixed(1)}%)`);
  }

  /* ── ⓑ 현재 트리 ────────────────────────────────────────────────── */
  console.log('\n[2] ⓑ 현재 트리');
  const now = await measure('now', path.join(ROOT, 'index.html'));
  report('now', now);
  ok(now.errs.length === 0, `[2-a] 콘솔 에러 0건 (${now.errs.length})`);
  ok(now.fired.flash === 1, `[2-b] 강화 한 번 = 플래시 한 장 (${now.fired.flash})`);
  ok(now.fired.keepEq === 1,
     `[2-c] 수리 — 이 자리에 **뱃지** keep 패치가 1장 선다 (${now.fired.keepEq}장 · 이 화면 패치 총 ${now.fired.keep}장 — 814 8회차가 값 줄 둘을 같은 경로에 얹었다)`);
  ok(peakOf(now) < 15, `[2-d] 수리 — 0~240ms 봉우리 가림률 < 15% (${peakOf(now).toFixed(1)}%)`);

  /* ── ⓒ 뿌리 ② — 재렌더가 원본 뱃지를 갈아 끼운다(패치가 «따라가면» 첫 rAF 에 죽는 자리) ── */
  console.log('\n[3] ⓒ 뿌리 ② — 강화 직후 `renderUI()` 가 격자를 통째로 다시 그린다');
  ok(now.after.sel && now.after.eq, `[3-a] 재렌더 뒤에도 «같은 자리에 새 뱃지» 는 있다 (sel=${now.after.sel} eq=${now.after.eq})`);
  ok(now.after.keep >= 1, `[3-b] 정지 패치는 재렌더를 **살아서 넘긴다** (${now.after.keep}장)`);

  if (pre) {
    console.log('\n[4] 두 트리 대조');
    console.log(`  · 봉우리 ${peakOf(pre).toFixed(1)}% → ${peakOf(now).toFixed(1)}%  (Δ ${(peakOf(now) - peakOf(pre)).toFixed(1)}%p)`);
    ok(peakOf(pre) - peakOf(now) > 40, `[4-a] 이 수리가 실제로 그 자리를 닫았다 — 봉우리 40%p 이상 하락`);
  }

  try { fs.rmSync(PRE_FILE, { force: true }); } catch (_) {}
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  console.log(`\nPROBE840 ${fail ? 'FAIL' : 'PASS'} — ${pass}/${pass + fail}${hold ? ` (⏸ ${hold})` : ''}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); try { fs.rmSync(PRE_FILE, { force: true }); } catch (_) {} process.exit(1); });
