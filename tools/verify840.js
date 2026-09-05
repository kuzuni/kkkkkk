/* VERIFY840 — 50 코스튬 강화 플래시가 카드 좌상단 [+] 착용 뱃지(`.sk-eq`)를 덮지 않는다
 *
 * 등재문(840): 잉크 footprint 기준 가림률 58.3~76.6%(0~240ms) · 320ms 0%.
 * 재현은 `probe840`(수리 전 ↔ 현재 트리, 두 트리를 같은 자로)이 맡고, 이 자는 **굳히는 쪽**이다.
 *
 * 무엇을 묻는가 — 넷이다.
 *   §1 선언  — 목록이 `#bCos` 에 갇혀 있는가(공용 부품을 안 넓혔는가) · 619 16회차/795 의 상수 불변
 *   §2 스코프 — 07 스킬·26 펫·그 밖 호스트에서 이 문이 **안 열리는가**(그 화면들은 한 프레임도 안 바뀐다)
 *   §3 실효  — 코스튬 강화에서 패치가 서고 가림률이 실제로 내려가는가(픽셀)
 *   §4 자리  — 패치 상자가 뱃지 상자와 같고 «Lv. n» 잉크를 안 밟는가(`FXKEEP_PAD` 를 안 쓰는 이유)
 *   §R 되돌림 — 목록에서 `.sk-eq` 를 빼면 **다시 빨개지는가**(안 그러면 헛초록이다)
 *
 * ⚠ 프레임 눈금은 probe840 과 같다(`getAnimations()` 정지 + 수거 무력화) — 자가 두 벌이 되면 안 된다.
 * ⚠ 되돌림 사본은 **저장소 루트**에 뽑는다 — /tmp 에 두면 `assets/**` 가 404 라 찍힌 픽셀이 달라진다
 *   (360·438·541 선례). 이름에 pid 를 섞어 병렬 실행이 서로의 사본을 안 지운다(646 규약).
 *
 * 실행: node tools/verify840.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v840-'));
const NEG = path.join(ROOT, '.v840-neg-' + process.pid + '.html');
const STEPS = [0, 80, 160, 240, 320];
const DTH = 24;
const COV_MAX = 15;                 /* 수리 통과선 — 봉우리 가림률(%) */
const COV_PRE = 40;                 /* 되돌림 시험이 넘어야 하는 값(등재문 실측 58~77%) */

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

const html = fs.readFileSync(SRC, 'utf8');

/* ── 공용 계측(probe840 과 같은 자) ───────────────────────────────────── */
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

async function selectCos(p) {
  const r = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel && e.querySelector('.sk-eq')) || all[0];
    el.scrollIntoView({ block: 'center' });
    el.click();
    const sel = document.querySelector('#bCos .sk-card.sel');
    const eq = sel && sel.querySelector('.sk-eq');
    const lv = sel && sel.querySelector('.sk-clv');
    const md = document.querySelector('#modal') || document.querySelector('#mbox');
    const R = (n) => { const q = n.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
    return { open: !!(md && md.offsetParent !== null), has: !!eq,
      card: sel ? R(sel) : null, eq: eq ? R(eq) : null, lv: lv ? R(lv) : null };
  });
  if (r.open) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  if (!r.has) throw new Error('선택 카드에 `.sk-eq` 가 없다 — 표본 무효');
  return r;
}

const clipOf = (s) => ({ x: Math.round(s.x), y: Math.round(s.y), width: Math.round(s.w), height: Math.round(s.h) });
const readPng = (f) => PNG.sync.read(fs.readFileSync(f));

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

/* 한 트리에서 «코스튬 강화 한 번» 을 재고 필요한 것을 다 걷어 온다 */
async function run(tag, file) {
  const { b, p, errs } = await boot(file);
  const sel = await selectCos(p);
  const clip = clipOf(sel.eq);
  const baseF = path.join(TMP, tag + '-base.png');
  await p.screenshot({ path: baseF, clip });
  const base = readPng(baseF);
  const mask = inkMask(base);

  /* §2 스코프 — 세 자리에서 문이 열리는가(픽셀을 재기 전에 묻는다) */
  const scope = await p.evaluate(() => {
    const G = (typeof fxKeepStill === 'function') ? fxKeepStill : null;
    /* 표본은 «그 화면에서 실제로 `.sk-eq` 를 단 호스트» 다 — 뱃지가 없는 칸을 재면
       문이 닫힌 이유가 «목록» 인지 «뱃지가 없어서» 인지 안 갈린다(헛초록). */
    const withEq = (sel2) => {
      const n = [...document.querySelectorAll(sel2)].find((e) => e.querySelector('.sk-eq'));
      return n ? { open: !!(G && G(n)), found: true } : { open: null, found: false };
    };
    const out = { decl: (typeof FXKEEP_STILL === 'string') ? FXKEEP_STILL : null };
    out.cos = withEq('#bCos .sk-card');
    /* 같은 화면인데 **카드가 아닌** 자리 — 착용 슬롯 줄의 [─] 뱃지(`.sk-slot>.sk-eq.m`).
       선택자가 `#bCos .sk-card>` 라 여기는 열리면 안 된다(«화면» 이 아니라 «카드» 가 스코프다). */
    out.slot = withEq('#bCos .sk-eqp .sk-slot');
    /* 07·26 카드의 `.sk-eq` 는 «보유» 칸에만 뜬다(renderSkill·renderPet) — 표본을 세우려고 보유만 켠다.
       이 스코프 측정은 픽셀 측정 «앞» 에 한 번 돌고, 켜는 것은 `S.own` 뿐이라 코스튬 격자와 무관하다. */
    for (const it of SKILLS) if (!S.own[it.id]) S.own[it.id] = { l: 1, n: 0 };
    for (const it of PETS)   if (!S.own[it.id]) S.own[it.id] = { l: 1, n: 0 };
    heroSubGo('sk');  renderSkill(); out.sk  = withEq('#bSk .sk-card');
    heroSubGo('pet'); renderPet();   out.pet = withEq('#bPet .sk-card');
    heroSubGo('cos'); renderCos();
    return out;
  });
  await p.waitForTimeout(200);
  const sel2 = await selectCos(p);

  await p.evaluate(FREEZE);
  const fired = await p.evaluate(() => {
    const n0 = document.querySelectorAll('#fxl .fx-flash').length;
    document.querySelector('#bCos [data-cosup]').click();
    const R = (n) => { const q = n.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
    const kp = document.querySelector('#fxl .fx-keep .sk-eq');
    return { flash: document.querySelectorAll('#fxl .fx-flash').length - n0,
             keep: document.querySelectorAll('#fxl .fx-keep').length,
             /* ⚑ 814 8회차 이관 — 이 자의 주제는 **뱃지 패치**다. 종전에는 «패치 총 장수 == 1» 로
                물었는데 그 수가 1 이었던 것은 그때 이 화면의 패치가 뱃지 하나뿐이었기 때문이지
                840 의 주장이 아니다. 814 8회차가 값 줄 둘을 같은 경로에 얹자 총 장수가 3 이 됐고,
                수를 3 으로 올려 초록을 되찾으면 **«뱃지가 통째로 사라져도 초록»** 인 자가 된다
                (333 처방). ⇒ 세는 대상을 «뱃지 패치» 로 좁힌다.
                ⚠ **«살아 있는 호스트의» 것만 센다.** 이 자의 `FREEZE` 는 `#fxl` 안 노드의 `remove()`
                  를 무력화하는데(스크린샷 8장이 한 프레임보다 오래 걸린다), 814 8회차가 재렌더 뒤
                  패치를 다시 뜨면서 **걷은 앞 장이 안 걷혀** 2장으로 읽혔다. 실제 런타임은 1장이다
                  (걷기가 도는지는 `probe814c` [P5]·비프리즈 실측이 따로 묻는다) — 그러니 여기서는
                  «지워졌어야 할 장» 을 **떼어진 호스트**로 가려낸다. 수를 2 로 올려 맞추면
                  «패치가 겹겹이 쌓여도 초록» 인 자가 된다(625 «한 자리에 한 장» 을 잃는다). */
             keepEq: [...document.querySelectorAll('#fxl .fx-keep')].filter(
                       (k) => k.querySelector('.sk-eq') && k.__fxKeepHost && k.__fxKeepHost.isConnected).length,
             patch: kp ? R(kp) : null };
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
  const after = await p.evaluate(() => {
    const s = document.querySelector('#bCos .sk-card.sel');
    return { sel: !!s, eq: !!(s && s.querySelector('.sk-eq')),
             keep: document.querySelectorAll('#fxl .fx-keep').length,
             keepEq: [...document.querySelectorAll('#fxl .fx-keep')].filter(
                       (k) => k.querySelector('.sk-eq') && k.__fxKeepHost && k.__fxKeepHost.isConnected).length };
  });
  await b.close();
  return { errs, sel: sel2, mask, scope, fired, rows, after };
}
const peakOf = (r) => Math.max(...r.rows.filter((x) => x.t <= 240).map((x) => x.cov));

(async () => {
  console.log('VERIFY840 — 코스튬 강화 플래시 ↔ [+] 착용 뱃지\n');

  /* ── §1 선언 ─────────────────────────────────────────────────────── */
  console.log('[1] 선언 — 목록이 화면에 갇혀 있고, 공용 상수는 한 글자도 안 바뀌었다');
  const mStill = html.match(/const\s+FXKEEP_STILL\s*=\s*'([^']*)'/);
  ok(!!mStill, '[1-a] `FXKEEP_STILL` 선언이 있다');
  ok(!!mStill && /^#bCos\s/.test(mStill[1]) && /\.sk-eq/.test(mStill[1]),
     `[1-b] 그 목록이 **\`#bCos\` 로 갇혀** 있다 — 07 스킬·26 펫의 같은 부품을 안 넓힌다 [${mStill ? mStill[1] : '—'}]`);
  /* ⚑ 814 8회차 이관 — 문이 **넷째**로 늘었다(`|| fxFlashKeepSel(el)` — 호스트가 `--flash-keep` 을
     신고하면 그것만으로도 켠다). 840 이 지키려는 것은 «내 문이 열려 있다 · 호출부는 0줄» 이지
     «문이 정확히 셋» 이 아니다 — 그래서 앞 세 문을 **그대로 요구하되** 뒤에 붙는 문은 허용한다.
     ⚠ 문을 지우면 여기가 곧바로 빨개진다(§R-b 가 같은 것을 실행으로 한 번 더 묻는다). */
  ok(/if\(inset\s*\|\|\s*keep\s*\|\|\s*fxKeepStill\(el\)/.test(html),
     '[1-c] `fxFlash` 의 패치 문이 «inset || keep || fxKeepStill(el)» 로 시작한다 — 840 의 문은 그대로다(호출부 0줄)');
  ok(/const\s+FXKEEP_SEL\s*=\s*'\.dot,\.updot,\.bdg,\.nw'/.test(html),
     '[1-d] 619 16회차 배지 목록 `FXKEEP_SEL` 불변');
  ok(/const\s+FXKEEP_PAD\s*=\s*4;/.test(html), '[1-e] `FXKEEP_PAD` 4 불변(이 경로는 그 값을 안 쓴다)');
  ok(/const\s+FXKEEP_TXT\s*=\s*'\.rw-c>u'/.test(html), '[1-f] 795 글자 라벨 목록 `FXKEEP_TXT` 불변');

  /* ── 본 측정 ─────────────────────────────────────────────────────── */
  const now = await run('now', SRC);
  console.log('\n[2] 스코프 — 이 문이 어디서 열리는가');
  console.log(`  · 선언 «${now.scope.decl}»`);
  const S2 = now.scope;
  ok(S2.cos.found && S2.cos.open === true, `[2-a] 50 코스튬 카드(뱃지 있는 칸)에서 **열린다** (found=${S2.cos.found} open=${S2.cos.open})`);
  ok(S2.sk.found && S2.sk.open === false, `[2-b] 07 스킬 카드에서는 **안 열린다** — 같은 부품·다른 화면 (found=${S2.sk.found} open=${S2.sk.open})`);
  ok(S2.pet.found && S2.pet.open === false, `[2-c] 26 펫 카드에서는 **안 열린다** (found=${S2.pet.found} open=${S2.pet.open})`);
  ok(S2.slot.found && S2.slot.open === false,
     `[2-d] 같은 화면의 **착용 슬롯 줄**([─] 뱃지)도 안 열린다 — 스코프는 «화면» 이 아니라 «카드» 다 (found=${S2.slot.found} open=${S2.slot.open})`);

  console.log('\n[3] 실효 — 강화 한 번의 픽셀');
  console.log(`  · 카드 ${Math.round(now.sel.card.w)}×${Math.round(now.sel.card.h)} · 뱃지 ${Math.round(now.sel.eq.w)}×${Math.round(now.sel.eq.h)} · 잉크 ${now.mask.n}px`);
  for (const x of now.rows) console.log(`    t=${String(x.t).padStart(3)}ms   가림률 ${x.cov.toFixed(1).padStart(5)}%`);
  ok(now.errs.length === 0, `[3-a] 콘솔 에러 0건 (${now.errs.length})`);
  ok(now.fired.flash === 1, `[3-b] 강화 한 번 = 플래시 한 장 (${now.fired.flash})`);
  ok(now.fired.keepEq === 1,
     `[3-c] 그 자리에 **뱃지** keep 패치가 한 장 선다 (${now.fired.keepEq}장 · 이 화면 패치 총 ${now.fired.keep}장)`);
  ok(peakOf(now) < COV_MAX, `[3-d] 0~240ms 봉우리 가림률 < ${COV_MAX}% (${peakOf(now).toFixed(1)}%)`);
  ok(now.rows[now.rows.length - 1].cov < 5, `[3-e] 320ms 는 종전 그대로 0% 다 (${now.rows[now.rows.length - 1].cov.toFixed(1)}%)`);
  ok(now.after.sel && now.after.eq && now.after.keep >= 1,
     `[3-f] ⚑ 재렌더를 **살아서 넘긴다** — `
     + `renderCos 가 격자를 innerHTML 로 갈아 끼운 뒤에도 패치 ${now.after.keep}장 (원본 뱃지 재생성 ${now.after.eq})`);

  /* ── §4 자리 ─────────────────────────────────────────────────────── */
  console.log('\n[4] 자리 — 패치 상자가 뱃지 상자와 같다(`FXKEEP_PAD` 를 안 쓴다)');
  const P = now.fired.patch, E = now.sel.eq, C = now.sel.card, LV = now.sel.lv;
  if (!P) { ok(false, '[4-a] 패치 안 `.sk-eq` 복제본을 못 찾았다'); }
  else {
    const dx = Math.abs(P.x - E.x), dy = Math.abs(P.y - E.y);
    const dw = Math.abs(P.w - E.w), dh = Math.abs(P.h - E.h);
    console.log(`  · 뱃지 (${E.x.toFixed(1)}, ${E.y.toFixed(1)}) ${E.w.toFixed(1)}×${E.h.toFixed(1)}`);
    console.log(`  · 패치 (${P.x.toFixed(1)}, ${P.y.toFixed(1)}) ${P.w.toFixed(1)}×${P.h.toFixed(1)}   Δ(${dx.toFixed(1)}, ${dy.toFixed(1)}) Δ크기(${dw.toFixed(1)}, ${dh.toFixed(1)})`);
    ok(dx <= 1 && dy <= 1 && dw <= 1 && dh <= 1,
       `[4-a] 패치가 뱃지와 **같은 자리·같은 크기**다 (Δ ≤ 1px)`);
    const right = P.x + P.w - C.x;
    ok(right <= 47.5, `[4-b] 패치 우변이 카드+${right.toFixed(1)} ≤ 47 — 등재문이 pad 4 에서 경고한 «Lv. n» 잉크 좌단 47 과 겹침 0`);
    if (LV) ok(P.x + P.w <= LV.x + 0.5,
       `[4-c] «Lv. n» 상자(${LV.x.toFixed(1)})를 안 밟는다 (패치 우변 ${(P.x + P.w).toFixed(1)})`);
  }

  /* ── §R 되돌림 시험 ──────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 목록에서 `.sk-eq` 를 빼면 다시 빨개지는가');
  const neg = html.replace(/const\s+FXKEEP_STILL\s*=\s*'[^']*'/, "const FXKEEP_STILL = '.fx-never-840'");
  ok(neg !== html, '[R-a] 되돌림 사본을 만들었다(선언 한 줄만 갈아 끼운다)');
  fs.writeFileSync(NEG, neg);
  const bad = await run('neg', NEG);
  for (const x of bad.rows) console.log(`    t=${String(x.t).padStart(3)}ms   가림률 ${x.cov.toFixed(1).padStart(5)}%`);
  ok(bad.fired.keepEq === 0,
     `[R-b] 되돌리면 **뱃지** 패치가 0장이다 (${bad.fired.keepEq}장 · 총 ${bad.fired.keep}장 — 814 8회차의 값 줄 패치는 남는다)`);
  ok(peakOf(bad) > COV_PRE, `[R-c] 되돌리면 봉우리 가림률이 ${COV_PRE}% 를 넘는다 — 등재문 재현 (${peakOf(bad).toFixed(1)}%)`);
  ok(peakOf(bad) - peakOf(now) > 40, `[R-d] 두 판 차 ${(peakOf(bad) - peakOf(now)).toFixed(1)}%p — 이 자가 재는 것이 실제로 이 수리다`);
  ok(bad.errs.length === 0, `[R-e] 되돌림 사본도 콘솔 에러 0건 (${bad.errs.length})`);

  try { fs.rmSync(NEG, { force: true }); } catch (_) {}
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  console.log(`\nVERIFY840 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); try { fs.rmSync(NEG, { force: true }); } catch (_) {} process.exit(1); });
