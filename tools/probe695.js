#!/usr/bin/env node
/* 695 재현 — `verify504` 눈금 504-RUL 이 `orbit`·`aura`·`whirl` 을 밴드 밖으로 찍는다
 *            (T1 «버그(선언 부패 또는 눈금 미적용 — 미판정)»)
 *
 *   node tools/probe695.js
 *
 * ⚑ **등재문이 후보 둘을 세우고 «재현이 정한다» 고 적었다**(338 규칙):
 *   ⓐ 선언이 낡았다(제품이 그 뒤 바뀌어 실측이 내려갔다) · ⓑ 눈금이 이 구조에 안 맞는다.
 *   이 프로브는 그 둘을 **네 칸 대조**로 가른다 — 트리(504 당시 ↔ 오늘) × 자(504 당시 ↔ 오늘).
 *   ⓐ 라면 «504 트리 + 오늘 자» 가 선언값을 되짚어야 하고, ⓑ 라면 어느 칸에서도 안 나온다.
 *
 *   [1] 재현 — 오늘 트리·오늘 자로 셋이 밴드 밖(등재문 71~85% 확인)
 *   [2] 제품 드리프트 기각 — **504 당시 트리**(023cd738)에서도 선언이 안 나온다 ⇒ ⓐ 기각
 *       ⚑ **791 이 이 절의 축을 갈았다.** 옛 꼴은 자유 장면에서 «셋 다 밴드 밖»(`off > tol`) 과
 *       «두 트리 평균비 < 3» 을 물었는데, 자유 장면은 695 자신이 «이 눈금으로 못 잰다» 로
 *       등재한 장면이라 둘 다 동전이었고(실측 11회 중 1회 빨강), «제품이 옮긴 것이 아니다» 는
 *       고정 장면에서 재면 **거짓**이었다(orbit ×1.4 · aura ×2.7 · whirl ×1.5).
 *       지금 꼴 — [2] 방향만(문턱 0) · [2-b] 자유 장면은 못 가른다(≤0.70) · [2-c] 고정 장면은
 *       갈린다(≥1.76) · [2-d] 그 장면에서 **오늘** 트리만 자기 선언과 맞는다 ⇒ ⓐ 기각 · [2-e] 되돌림.
 *   [3] 자기 재현성 — 같은 자·같은 트리인데 **평균이 재실행 사이에 배로 갈린다** ⇒ 판정 불가
 *   [4] 기계 — 값을 정하는 것은 «판 위 개체수»(POP 로 고정됨)가 아니라 **«반경 안 개체수»**(안 갇힘)
 *   [5] 선언의 출처 — 카이팅을 끄면(플레이어 고정) `aura` 가 **선언 9.4 그 값**으로 돌아온다
 *   [6] 왜 여태 안 보였나 — 표본 PROBE 에 이 구조가 0종이었고, cd 0 은 옛 [C1] 에 헛빨강이 난다
 *   [7] 게이트가 이제 말한다 — ⏸접촉 칸·구조 덮개 [C3]·자물쇠(«낡은 선언 그 값일 때만»)
 *
 * ⚠ [2] 는 저장소 이력에서 `023cd738:index.html`(= `done(504)`) 을 꺼내 임시 파일로 재는데,
 *   **얕은 클론이면 그 커밋이 없다**. 없으면 그 항은 «판정 보류» 로 건너뛰고(실패 아님)
 *   `git fetch --deepen=3000 origin main` 을 안내한다.
 * ⚠ [3]·[4]·[5] 는 **같은 자**(`rul504.js`)를 부른다. 사본을 만들어 재면 그 값이 게이트의 값이
 *   아니다(553·620 이 값을 치른 자리).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const RUL = require('./rul504');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const { K, SEC, POP } = RUL;
const IDS = ['orbit', 'aura', 'whirl'];
const DONE504 = '023cd738';   /* done(504) — 선언 6.65/9.4/17.88 을 적어 넣은 커밋 그 자체 */

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

const launch = async () => {
  try { return await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    return chromium.launch({ executablePath: p });
  }
};
const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillHits === 'function'
    && typeof step === 'function' && typeof makeEnemy === 'function');
  return page;
};
/* 게이트와 **같은 식**으로 이탈·허용을 붙인다(사본 0개 — 판정은 `rul504.js` 것을 쓴다) */
const dress = (rows) => rows.map(x => Object.assign({}, x, {
  tol: +RUL.tolOf(x.spread, K).toFixed(3), off: +RUL.offOf(x.mean, x.decl).toFixed(3)
}));
const show = (tag, rows) => rows.forEach(x => console.log('     ' + tag.padEnd(22) + x.id.padEnd(7)
  + 'cd ' + String(x.cd).padEnd(6) + '선언 ' + String(x.decl).padEnd(7) + '실측 ' + String(x.mean).padEnd(8)
  + '이탈 ' + ((x.off * 100).toFixed(0) + '%').padEnd(7) + '허용 ±' + ((x.tol * 100).toFixed(0) + '%').padEnd(7)
  + 'K회 ' + x.each.join('/')));

(async () => {
  const browser = await launch();
  const errs = [];

  /* ── [1] 재현 ─────────────────────────────────────────── */
  /* ⚑ **794 가 이 절의 축을 갈았다(2026-09-02).** 옛 꼴은 자유 장면에서 «셋 다 밴드 밖»(`off > tol`)
     을 물었다 — 791 이 [2] 에서 걷어낸 것과 **같은 밴드 멤버십을 같은 장면**에서 물은 것이라
     같은 동전이다. 허용은 `max(TOL_FLOOR, 폭 ÷ 2√K)` 이고 이 셋의 K회 폭은 실측 44~283% 라,
     폭이 **196%** 를 넘는 실행부터 허용이 바닥을 뜨고 **343%** 를 넘으면 이탈(70~85%)을 앞질러
     판정이 뒤집힌다. 등재 시점 실측 최대 283% — **아직 안 넘었고 여유가 23%p 뿐이다**(794).
     ⚠ 뒤집힘의 대가는 이 프로브의 빨강 하나가 아니다 — **같은 비교가 게이트 `[C2]` 의 «⏸접촉»
     소속도 정한다.** 폭이 큰 실행에서는 셋이 밴드 «안» 으로 읽혀 «이 눈금으로 못 잰다» 는 사실이
     표에서 조용히 사라진다(헛초록). 그래서 이 절은 **밴드를 재현의 축으로 안 쓴다.**
     지금 꼴 — ① **부호**(선언이 K회 구름 밖 · 문턱 0) · ② **장면 대조**(같은 실행이 잰 두 값 ·
     문턱 0 · 791-④ 의 모양) · ③ 밴드는 **잴 수 있는 장면에서만** 쓴다(고정 장면 폭 2~13%).
     ⚠ 옛 축의 값은 지우지 않고 매 실행 표에 그대로 찍는다(아래 «참고» 줄) — 뒤집힘까지의 여유가
     좁아지는 것을 다음 세션이 눈으로 본다. 옛 꼴이 왜 동전인지는 `probe794` 가 표본째 들고 있다. */
  const page = await open(browser, URL);
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const now = dress(await RUL.measure(page, IDS, {}));
  show('[1] 자유(눈금 장면)', now);
  /* 같은 트리를 **고정 장면**으로도 잰다(695 [5] 가 열어 둔 `freeze` 손잡이 · 791-①).
     [2] 절이 이 표를 그대로 다시 쓴다 — 재는 횟수는 옛 꼴과 같다. */
  const pF = await open(browser, URL);
  const nowF = dress(await RUL.measure(pF, IDS, { freeze: true }));
  await pF.context().close();
  show('[1] 고정(같은 트리)', nowF);
  const offF = (id) => nowF.find(x => x.id === id).off;

  ok(now.every(x => RUL.shakeSep(x).outside && x.decl > Math.max(...x.each)),
     '1 재현 ① 부호 — 자유 장면에서는 K회 표본이 **하나도** 선언에 못 닿는다(선언이 구름 위쪽 밖 · 문턱 0)',
     now.map(x => x.id + ' 최고 표본 ' + Math.max(...x.each) + ' < 선언 ' + x.decl
       + '(거리 ÷ 폭 ×' + RUL.shakeSep(x).ratio.toFixed(2) + ')').join(' / '));
  ok(IDS.every(id => now.find(x => x.id === id).off > offF(id)),
     '1-b 재현 ② 크기 — 같은 트리·같은 자인데 **장면 하나로** 이탈이 갈린다(같은 실행이 잰 두 값 · 문턱 0)',
     IDS.map(id => id + ' 자유 ' + (now.find(x => x.id === id).off * 100).toFixed(0)
       + '% ↔ 고정 ' + (offF(id) * 100).toFixed(0) + '%').join(' / '));
  ok(nowF.every(x => x.off < RUL.TOL_FLOOR),
     '1-c ⇒ «밴드 밖» 을 만든 것은 선언이 아니라 **장면**이다 — 잴 수 있는 장면(폭이 좁다)에서는 셋 다 밴드 안이다',
     nowF.map(x => x.id + ' 이탈 ' + (x.off * 100).toFixed(0) + '% · K회 폭 ' + (x.spread * 100).toFixed(0) + '%').join(' / ')
     + ' · 밴드 ±' + (RUL.TOL_FLOOR * 100).toFixed(0) + '%');
  ok(RUL.c2Split(now).bad.length === 0 && RUL.c2Split(now).hold.length === 0,
     '1-d 게이트 면 — 밴드 밖으로 읽히든 안 읽히든 이 셋은 **하드 빨강이 아니다**(⏸접촉 자물쇠가 받는다)',
     '하드 ' + RUL.c2Split(now).bad.length + ' · ⏸199 ' + RUL.c2Split(now).hold.length
     + ' · ⏸접촉 ' + RUL.c2Split(now).contact.length + '/3(밴드 밖으로 읽힌 수 — 실행마다 갈려도 좋다)');
  /* 참고 — 옛 축(밴드 멤버십)의 값과 «뒤집히는 폭» 까지의 여유. **단언 아님**(그것이 794 의 결론이다). */
  console.log('     [1] (참고 · 단언 아님) 옛 축 «이탈 > 허용» — '
    + now.map(x => x.id + ' 이탈 ' + (x.off * 100).toFixed(0) + '% ' + (x.off > x.tol ? '>' : '≤')
      + ' 허용 ' + (x.tol * 100).toFixed(0) + '% · K회 폭 ' + (x.spread * 100).toFixed(0)
      + '% ↔ 뒤집히는 폭 ' + (x.off * 2 * Math.sqrt(K) * 100).toFixed(0) + '%').join(' / '));

  /* ── [2] 제품 드리프트 기각 — 504 당시 트리를 오늘 자로 ── */
  let old = null;
  try {
    /* 756 — 얕은 클론이면 먼저 판다(규약 ①) · 못 가져오면 «환경/진짜 없음» 을 밝혀 던진다(규약 ②) */
    const got756 = require('./gitrev756').show(DONE504, 'index.html');
    if (!got756.ok) throw new Error((got756.env ? '[보류·환경] ' : '[빨강] ') + got756.why);
    if (got756.how) console.log('[i]' + got756.how);
    const html = got756.buf;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe695-'));
    const f = path.join(tmp, 'index.html');
    fs.writeFileSync(f, html);
    const p2 = await open(browser, 'file://' + f.replace(/\\/g, '/'));
    old = dress(await RUL.measure(p2, IDS, {}));
    await p2.context().close();
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch (e) { old = null; }
  if (!old) {
    na('2 제품 드리프트 기각 — 504 당시 트리(' + DONE504 + ')를 오늘 자로',
       '얕은 클론이라 그 커밋이 없다 · `git fetch --deepen=3000 origin main` 후 다시');
  } else {
    show('[2] 504 트리·오늘 자', old);
    /* [2] 자유 장면이 지는 몫은 **방향 하나**다(문턱 0). «선언이 504 트리에서도 안 나온다» 가
       후보 ⓐ 기각의 알맹이이고, 그것은 평균의 부호만으로 말할 수 있다 — 실측 11회 × 3종
       33/33 이 같은 방향이고 가장 가까운 표본조차 선언의 65%(`aura` 6.113 ↔ 9.4)다.
       ⚠ 옛 [2]`old.every(off > tol)` 는 여기서 **밴드 멤버십**을 물었고 그것이 동전이었다(791). */
    ok(old.every(x => x.mean < x.decl),
       '2 후보 ⓐ 기각 ① — **504 당시 트리**에서도 K회 평균이 선언에 못 미친다(방향만 · 문턱 0)',
       old.map(x => x.id + ' ' + x.mean + ' < ' + x.decl).join(' / ')
       + ' · 선언은 이 트리에서 적힌 값 그대로다');

    /* [2-b]~[2-d] 잴 수 있는 장면(고정)으로 옮겨 같은 물음을 다시 던진다 — 695 [5] 가 이 장면을
       이미 열어 두었고(`freeze` 손잡이), 거기서는 K회 폭이 3~13% 라 두 트리가 실제로 갈린다(실측 21표본 최소 1.76).
       ⚠ **자유 장면의 갈림 자체를 단언하지 않는다.** «이 장면에서는 못 가른다»(`ratio < 1`)도 세어 보면
       동전이다 — 실측 36표본 중 최대 **1.17** 로 단위를 한 번 넘었다(`probe791` [4] 가 그 실행을 잡았다).
       자유 장면이 지는 몫은 위 [2] 의 **방향 하나**이고, 여기서는 «자유 장면이 실제 차이를 얼마나
       줄여 보이는가» 만 [2-b] 로 묻는다(둘 다 그 실행이 스스로 잰 값끼리의 비교다). */
    /* ⚑ 794 — 오늘 트리의 고정 장면은 **[1] 이 이미 쟀다**(`nowF`). 여기서 다시 재면 같은 물음의
       두 표가 생기고 «어느 표로 잰 값인가» 가 다시 값을 바꾼다(680 이 모듈을 뽑은 그 이유). */
    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'probe695f-'));
    const f2 = path.join(tmp2, 'index.html');
    fs.writeFileSync(f2, require('./gitrev756').show(DONE504, 'index.html').buf);
    const p4 = await open(browser, 'file://' + f2.replace(/\\/g, '/'));
    const oldF = dress(await RUL.measure(p4, IDS, { freeze: true }));
    await p4.context().close();
    fs.rmSync(tmp2, { recursive: true, force: true });
    show('[2] 고정 오늘(=[1] 표)', nowF);
    show('[2] 고정 504 트리', oldF);

    const fixSep = IDS.map(id => ({ id,
      s: RUL.treeSep(nowF.find(x => x.id === id), oldF.find(x => x.id === id)) }));
    const dOf = (rows, id) => Math.abs(rows[0].find(x => x.id === id).mean - rows[1].find(x => x.id === id).mean);
    ok(IDS.every(id => dOf([now, old], id) < dOf([nowF, oldF], id)),
       '2-b 자유 장면은 그 갈림을 **줄여 보인다** — 종마다 두 트리 평균차가 고정 장면의 것보다 작다(그래서 이 장면에서 «같은 자리»·«밴드 밖» 을 물으면 답을 잡음이 정한다)',
       IDS.map(id => id + ' 자유 Δ' + dOf([now, old], id).toFixed(2) + ' < 고정 Δ' + dOf([nowF, oldF], id).toFixed(2)).join(' / ')
       + ' · 참고 — 자유 장면 갈림 '
       + IDS.map(id => id + ' ×' + RUL.treeSep(now.find(x => x.id === id), old.find(x => x.id === id)).ratio.toFixed(2)).join('/') + '(단언 아님)');
    ok(fixSep.every(x => x.s.apart),
       '2-c ⚑ 고정 장면에서는 **두 트리가 갈린다** — 제품은 그 사이 실제로 움직였다(옛 [2-b] «제품이 옮긴 것이 아니다» 는 자유 장면의 잡음이 덮고 있던 **거짓**이었다)',
       fixSep.map(x => x.id + ' ×' + x.s.ratio.toFixed(2)).join(' / ') + ' · 값 '
       + IDS.map(id => id + ' ' + oldF.find(x => x.id === id).mean + '→' + nowF.find(x => x.id === id).mean).join(' / '));

    /* ⇒ 그래도 후보 ⓐ(«선언이 낡았다»)는 기각이다 — **낡은 쪽은 504 트리**다.
       문턱은 새로 안 뽑았다. 여기 쓰는 밴드는 자 자신의 `TOL_FLOOR` 그대로다(실측 오늘 0~11% · 504 트리 48~168%). */
    ok(nowF.every(x => x.off < RUL.TOL_FLOOR) && oldF.every(x => x.off > RUL.TOL_FLOOR),
       '2-d 후보 ⓐ 기각 ② — 그 장면에서 **오늘** 트리만 자기 선언과 맞는다(504 트리는 자기 선언 밖) ⇒ 선언은 낡지 않았다',
       '오늘 ' + nowF.map(x => x.id + ' ' + (x.off * 100).toFixed(0) + '%').join('/')
       + ' ↔ 504 트리 ' + oldF.map(x => x.id + ' ' + (x.off * 100).toFixed(0) + '%').join('/')
       + ' · 밴드 ±' + (RUL.TOL_FLOOR * 100).toFixed(0) + '%');

    /* [2-e] 되돌림 — 새 눈금이 «다 통과» 도 «다 빨강» 도 아님을 그 함수에 직접 친다(759-②).
       ⚠ 표본은 **이번 실행의 실측**이다(합성 강짜 아님) — 같은 구름끼리는 안 갈리고,
       한 구름을 폭의 세 벌만큼 밀면 갈린다. */
    const a0 = now.find(x => x.id === 'aura');
    const shift = (x, d) => ({ each: x.each.map(v => v + d), mean: x.mean + d });
    const w = Math.max(...a0.each) - Math.min(...a0.each);
    ok(!RUL.treeSep(a0, a0).apart && RUL.treeSep(a0, shift(a0, 3 * w)).apart
       && !RUL.treeSep(a0, shift(a0, w / 4)).apart,
       '2-e 되돌림 — `RUL.treeSep` 은 같은 구름을 «갈렸다» 로 안 읽고(×0), 폭 3벌 이동은 읽고, 폭 1/4 이동은 안 읽는다',
       '같은 ×' + RUL.treeSep(a0, a0).ratio.toFixed(2) + ' / +3폭 ×' + RUL.treeSep(a0, shift(a0, 3 * w)).ratio.toFixed(2)
       + ' / +¼폭 ×' + RUL.treeSep(a0, shift(a0, w / 4)).ratio.toFixed(2));
  }

  /* ── [3] 자기 재현성 — 판정할 수 있는 자인가 ───────────── */
  /* ⚑ 이 항이 이 작업의 갈림길이다. 선언이 맞는지 틀린지 말하려면 **자가 같은 값을 두 번 내야** 한다.
     poison(622·680)은 K회 폭 13% 로 그 조건을 만족했다 — 그래서 «선언이 낡았다» 를 말할 수 있었다. */
  const again = dress(await RUL.measure(page, IDS, {}));
  show('[3] 오늘 트리 재실행', again);
  const drift = IDS.map(id => {
    const a = now.find(x => x.id === id).mean, b = again.find(x => x.id === id).mean;
    return { id, a, b, r: Math.max(a, b) / Math.max(1e-9, Math.min(a, b)) };
  });
  const worst = drift.reduce((a, b) => a.r > b.r ? a : b);
  ok(worst.r > 1.5 || now.some(x => x.spread > 0.45),
     '3 판정 불가 — 같은 자·같은 트리인데 K회 평균이 재실행 사이에 갈린다(또는 K회 폭이 밴드만 하다)',
     drift.map(x => x.id + ' ' + x.a + '↔' + x.b + ' = ×' + x.r.toFixed(2)).join(' / ')
     + ' · K회 폭 ' + now.map(x => x.id + ' ' + (x.spread * 100).toFixed(0) + '%').join('/'));
  ok(now.concat(again).every(x => x.shut === 0),
     '3-b 전제 — 재는 동안 22708 가드가 한 프레임도 안 닫혔다(620 [C0] 과 같은 항)',
     '닫힌 프레임 0 / ' + (IDS.length * K * SEC * 60 * 2) + '프레임');

  /* ── [4]·[5] 기계 — 무엇이 값을 정하는가 ───────────────── */
  /* 반경 안 개체수를 세면서 같은 판을 굴린다. 눈금이 고정하는 것은 `enemies.length`(POP)이고
     이 종들이 먹는 것은 **반경 안 개체수**다. 둘이 갈리면 «고정했다» 는 말이 이 구조에는 거짓이다. */
  const mech = await page.evaluate(({ POP, SEC }) => {
    const rawHit = window.hitEnemy; let ownSave;
    const run = (id, freeze) => {
      S.stage = 20; spawnStage(); enemies.length = 0; spawnQ.length = 0;
      player.vx = 0; player.vy = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      /* 반경 — 제품에서 온 값이다(손으로 적은 상수 아님): aura 는 `92 + 6*oLv`, orbit 은 칼날
         궤도 78 에 판정 반경 16 을 더한 자리, whirl 은 링 발사체가 `life` 동안 가는 거리 */
      const R = id === 'aura' ? 92 + 6 * oLv('aura')
              : id === 'orbit' ? 78 + 16
              : (SK.whirl.r0 || 0) + SK.whirl.sp * SK.whirl.life;
      let hits = 0, bub = 0, frames = 0;
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * SEC; f++) {
        step(1 / 60);
        while (enemies.length > POP) {
          let wi = 0, wd = -1;
          for (let i = 0; i < enemies.length; i++) {
            const d = (enemies[i].x - player.x) ** 2 + (enemies[i].y - player.y) ** 2;
            if (d > wd) { wd = d; wi = i; }
          }
          enemies.splice(wi, 1);
        }
        while (enemies.length < POP) { const b = enemies.length; makeEnemy('zombie'); if (enemies.length === b) break; }
        killed = 0;
        if (freeze) { player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0; }
        let inb = 0;
        for (const e of enemies) {
          const dx = e.x - player.x, dy = (e.y - e.r * 0.7) - (player.y - 20);
          if (dx * dx + dy * dy < R * R) inb++;
        }
        bub += inb; frames++;
      }
      window.hitEnemy = rawHit; S.own = ownSave; markDirty();
      return { hps: +(hits / SEC).toFixed(2), bubble: +(bub / frames).toFixed(2), pop: enemies.length, R: Math.round(R) };
    };
    const out = {};
    for (const id of ['aura', 'orbit', 'whirl']) {
      out[id] = { free: [], froz: [] };
      for (let k = 0; k < 3; k++) out[id].free.push(run(id, false));
      for (let k = 0; k < 3; k++) out[id].froz.push(run(id, true));
    }
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { POP, SEC });

  const mean = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  ['aura', 'orbit', 'whirl'].forEach(id => {
    const m = mech[id];
    console.log('     [4] ' + id.padEnd(7) + '반경 ' + m.free[0].R + 'px · 판 위 개체수 ' + POP + ' 고정'
      + ' · 반경 안 개체수 자유 ' + m.free.map(x => x.bubble).join('/')
      + ' ↔ 고정 ' + m.froz.map(x => x.bubble).join('/'));
    console.log('     [5] ' + id.padEnd(7) + '초당 타격 자유 ' + m.free.map(x => x.hps).join('/')
      + ' ↔ **플레이어 고정** ' + m.froz.map(x => x.hps).join('/')
      + '   (선언 ' + (id === 'whirl' ? '17.88/발동' : (id === 'aura' ? 9.4 : 6.65) + '/초') + ')');
  });
  const bubRatio = ['aura', 'orbit'].map(id => mean(mech[id].froz.map(x => x.bubble)) / Math.max(1e-9, mean(mech[id].free.map(x => x.bubble))));
  ok(bubRatio.every(r => r > 1.8),
     '4 값을 정하는 것은 «판 위 개체수»(고정됨)가 아니라 «반경 안 개체수»(안 갇힘) ⇒ 후보 ⓑ 확인',
     ['aura', 'orbit'].map((id, i) => id + ' 반경 안 ' + mean(mech[id].free.map(x => x.bubble))
       + ' → ' + mean(mech[id].froz.map(x => x.bubble)) + ' = ×' + bubRatio[i].toFixed(2)
       + ' (판 위는 둘 다 ' + POP + ')').join(' / '));
  const auraFroz = mean(mech.aura.froz.map(x => x.hps));
  ok(Math.abs(auraFroz / 9.4 - 1) < 0.15,
     '5 선언의 출처 — 카이팅을 끄면 `aura` 가 **선언 9.4 그 값**으로 돌아온다(선언은 «서서 맞는 장면» 의 값)',
     '고정 판 ' + mech.aura.froz.map(x => x.hps).join('/') + ' 평균 ' + auraFroz + ' ↔ 선언 9.4 = 이탈 '
     + (Math.abs(auraFroz / 9.4 - 1) * 100).toFixed(0) + '%');
  const auraFree = mean(mech.aura.free.map(x => x.hps));
  ok(auraFroz / Math.max(1e-9, auraFree) > 1.8,
     '5-b 그 장면은 실제 판이 아니다 — 같은 판에서 카이팅만 켜면 값이 배로 내려간다',
     '자유 ' + auraFree + ' ↔ 고정 ' + auraFroz + ' = ×' + (auraFroz / auraFree).toFixed(2)
     + ' ⇒ 값을 밴드에 맞춰 넣는 것도, 고정 판 값을 선언에 넣는 것도 금지(680 등재문)');

  /* ── [6] 왜 여태 안 보였나 ─────────────────────────────── */
  const gate = fs.readFileSync(path.join(__dirname, 'verify504.js'), 'utf8');
  const probeList = (gate.match(/const PROBE = \[[\s\S]*?\];/) || [''])[0];
  const cdOf = await page.evaluate(ids => ids.map(id => SK[id].cd), IDS);
  ok(cdOf.filter(c => c === 0).length === 2,
     '6-a 구조 확인 — 셋 중 둘은 `cd 0` 지속형이라 `castSkill` 을 아예 안 지난다',
     IDS.map((id, i) => id + ' cd ' + cdOf[i]).join(' / '));
  ok(now.filter(x => !x.cd).every(x => x.casts === 0),
     '6-b 그래서 옛 [C1](«casts > 0»)을 그대로 두고 표본에 넣으면 **헛빨강**이 난다',
     now.filter(x => !x.cd).map(x => x.id + ' casts ' + x.casts + ' · 타격은 ' + x.mean + '/초').join(' / '));
  ok(/cd > 0 \? x\.casts : x\.mean/.test(gate),
     '6-c 게이트가 그 두 뜻을 갈라 묻는다(620-② «0 은 두 가지 뜻»)',
     '[C1] 이 cd 0 은 «타격이 났는가» 로 묻는다');

  /* ── [7] 게이트가 이제 말한다 ─────────────────────────── */
  ok(IDS.every(id => id in RUL.HOLD695), '7-a ⏸접촉 등재 — 셋이 눈금 모듈에 이름으로 적혀 있다',
     Object.keys(RUL.HOLD695).join(','));
  ok(IDS.every(id => probeList.includes("'" + id + "'")),
     '7-b 표본 PROBE 에 셋이 들어갔다 — 못 잰다는 사실이 매 실행 표에 찍힌다',
     IDS.filter(id => !probeList.includes("'" + id + "'")).join(',') || '셋 전부 표본 안');
  /* 자물쇠 — 199 가 값을 넣으면 면제가 **스스로** 풀린다(손으로 지울 목록이 아니다) */
  const lockOn = RUL.held695({ id: 'aura', decl: 9.4 });
  const lockOff = RUL.held695({ id: 'aura', decl: 3.1 });
  ok(lockOn && !lockOff, '7-c 자물쇠 = «낡은 선언 그 값일 때만» — 199 가 값을 넣는 순간 하드로 돌아온다',
     '선언 9.4 → 면제 ' + lockOn + ' · 선언 3.1 → 면제 ' + lockOff);
  const split = RUL.c2Split([
    { id: 'aura', decl: 9.4, off: 0.71, tol: 0.43 },      /* 등재분 · 밴드 밖 → ⏸접촉 */
    { id: 'aura', decl: 3.1, off: 0.71, tol: 0.43 },      /* 값이 갈린 뒤 → 하드 빨강 */
    { id: 'flask', decl: 20.71, off: 0.9, tol: 0.4 }      /* 등재 안 된 종 → 하드 빨강 */
  ]);
  ok(split.contact.length === 1 && split.bad.length === 2,
     '7-d 면제는 «이름이 적힌 종 · 낡은 값일 때» 뿐 — 다른 종·다른 값은 그대로 빨갛다',
     '⏸접촉 ' + split.contact.length + ' · 하드 ' + split.bad.length);
  ok(RUL.c2Split([{ id: 'aura', decl: 9.4, off: 0.1, tol: 0.43 }]).contact.length === 0,
     '7-e 등재 종이라도 밴드 안이면 애초에 안 걸린다 — 면제가 «항상 켜진 우회로» 가 아니다',
     '이탈 10% → ⏸접촉 0');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail)
    + (skip ? ' · ⏸ 판정 보류 ' + skip : ''));
  process.exit(fail ? 1 : 0);
})();
