/* 작업 295 회귀 게이트 — 승급전 «입장 제한 폐지» (저장소 주인 지시 2026-08-27)
 *
 *   실행: node tools/verify295.js   (1080x2280 · 헤드리스)
 *
 * 지시: «승급전은 입장 못하게 하지 말기, 제한 없애».
 * 지키는 성질 셋 —
 *   ⓐ **입장 게이트가 없다.** 최고 스테이지 0 · 전투력 최저인 새 세이브에서도 [승급전 도전]·
 *      [승급전 시작] 이 활성이고, 눌렀을 때 승급전이 **실제로 시작된다**(ROUTINE «기능 완성 규칙» —
 *      «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작» 이 완료 조건이다).
 *   ⓑ **레드닷은 상시 점등하지 않는다.** 게이트를 그대로 레드닷에 물리면 «다음 계급만 있으면 켜짐» 이
 *      되어 166 규약(«레드닷은 누를 게/받을 게 있다는 신호»)에 걸린다. 그래서 옛 두 조건은
 *      `promoReady()` = **권장 기준**으로 남아 레드닷 전용이 됐다 — 미달이면 꺼지고 충족이면 켜진다.
 *   ⓒ **실패해도 잃는 것이 없다.** 무제한이 된 만큼 «될 때까지 재도전» 이 기본 동선인데,
 *      재화·입장권이 깎이면 그건 «제한» 이 이름만 바꾼 것이다. 실패 1회 전후로 S 가 그대로여야 한다.
 *
 * [3]-(가) 기계적·기능 검증: 레퍼런스 대조가 아니라 «상태 → 동작/DOM» 판정이라 비평가를 띄우지 않는다.
 *
 * ⚠ 상태를 만드는 방법 — `cp()` 는 `const` 화살표라 스텁이 안 된다(재할당 불가). verify166 과 같은 수를
 *   쓴다: **요구치 쪽**(`RANKS[1].stage` · `RANKS[1].cp`)을 갈아 끼워 «충족/미달» 두 상태를 만들고
 *   원래 값으로 되돌린다. 객체 프로퍼티라 자유롭게 바꿀 수 있다.
 */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
const R = [];
const ok = (n, c, got) => { R.push({ n, c: !!c, got }); };

(async () => {
  /* ── [0] 소스 — 게이트가 정말 걷혔나 ─────────────────────────────────── */
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  /* ⚠ 정의를 «첫 `;` 까지» 로 자르면 `promoReady` 처럼 본문에 `;` 가 있는 화살표가 잘린다 —
     줄 단위로 집는다(둘 다 한 줄 정의다). */
  const defOf = n => (code.split('\n').find(l => new RegExp('const\\s+' + n + '\\s*=').test(l)) || '');
  const defCan = defOf('canPromote');
  const defRdy = defOf('promoReady');
  ok('[0] `canPromote()` 는 «다음 계급이 있는가» 하나만 본다 — S.best·cp() 참조 0',
    /nextRank\(\)/.test(defCan) && !/S\.best/.test(defCan) && !/cp\(\)/.test(defCan),
    defCan.trim().slice(0, 90) || '정의를 못 찾음');
  ok('[0] 옛 두 조건은 `promoReady()`(권장 기준)로 남아 있다 — S.best·cp() 둘 다 참조',
    /S\.best/.test(defRdy) && /cp\(\)/.test(defRdy) && /nextRank\(\)/.test(defRdy),
    defRdy.trim().slice(0, 110) || '정의를 못 찾음');

  /* 버튼 두 개에 조건부 `disabled` 가 남아 있으면 «회색으로 막힌» 상태가 그대로다(지시 ⓐ) */
  const btnLines = code.split('\n').filter(l => /id="(promoBtn|pgo)"/.test(l));
  ok('[0] [승급전 도전]·[승급전 시작] 마크업 2줄에 조건부 `disabled` 가 없다',
    btnLines.length === 2 && btnLines.every(l => !/disabled/.test(l)),
    btnLines.length + '줄 · ' + btnLines.map(l => l.trim().slice(0, 46)).join(' ‖ '));

  /* startPromo() 의 «조건 미달» 반려가 남아 있으면 버튼만 활성이고 실제로는 못 들어간다 */
  ok('[0] `startPromo()` 에 «승급 조건 미달» 반려가 없다',
    !/승급 조건 미달/.test(code), (code.match(/.{0,40}승급 조건 미달.{0,20}/) || [''])[0]);

  /* 레드닷 호출부가 게이트를 물면 상시 점등이다(166) */
  /* ⚑ 453(주인 지시 2026-08-30) — 이 항을 **갈아 끼웠다.** 종전 정규식은 인자가 `promoReady()` **하나뿐**
     이어야 통과했는데, 453 이 «전투 중에는 승급전 팝업을 못 연다» 를 넣으면서 축이 한 항 늘었다
     (`promoReady() && !battleBusy()`). 295 의 뜻(«점등축은 권장 기준이지 입장 게이트가 아니다»)은
     그대로이므로 **자리를 비우지 않고** 두 항으로 나눠 물었다 —
     ⓐ 축이 여전히 `promoReady()` 이고 게이트(`canPromote()`)가 아니다 ⓑ 453 항이 실제로 붙어 있다.
     ⚠ 334 처방 — 「그냥 정규식을 느슨하게」 하면 `promoReady()` 가 통째로 사라져도 초록이 된다. */
  const saLine = (code.match(/sideAlert\('promo',[^;]*\);/) || [''])[0];
  ok("[0] `sideAlert('promo', …)` 의 점등축은 `promoReady()` 다(입장 게이트 `canPromote()` 가 아니다)",
    /promoReady\(\)/.test(saLine) && !/canPromote\(\)/.test(saLine), saLine);
  /* ⚑ 665(주인 지시 2026-09-02) — 같은 항을 **한 번 더 갈아 끼운다.** 453 의 `!battleBusy()` 가
     `!battleLocked()` 로 바뀌었다: 스테이지 도전 중에는 승급전에 실제로 들어갈 수 있으므로 그때
     닷을 끄면 이번에는 «누를 수 있는데 안 켜지는 닷» = 반대 방향의 거짓 신호가 된다.
     295 의 뜻은 여전히 그대로이고 바뀐 것은 **어느 자를 보는가** 뿐이다. */
  ok("[0-b] 453·665 — 그 축에 `!battleLocked()` 가 함께 걸려 **갈아탈 수 없는 전투** 중에만 꺼진다(321 «누를 수 있다» 규약)",
    /!battleLocked\(\)/.test(saLine) && !/!battleBusy\(\)/.test(saLine), saLine);

  /* 팝업 문구 — 표기와 동작이 어긋나면 안 된다(기능 완성 규칙) */
  ok('[0] 승급전 팝업에 «조건을 만족하면 … 등장합니다» 문구가 없다',
    !/조건을 만족하면/.test(code), (code.match(/.{0,30}조건을 만족하면.{0,30}/) || [''])[0]);
  /* ⚠ `pr-note` 는 CSS 에도 있다(`.mbody .pr179 .pr-note{…}`) — 그쪽이 먼저 걸리면 이 단언이
     엉뚱한 자리를 보고 통과한다. 마크업 쪽만 집도록 `class="pr-note"` 로 못 박는다. */
  const noteJs = (code.match(/class="pr-note"[\s\S]{0,260}/) || [''])[0];
  ok('[0] 제한 시간 문구가 하드코딩(«60초»)이 아니라 `BOSS_SEC` 참조다',
    /BOSS_SEC/.test(noteJs) && !/60초/.test(noteJs),
    noteJs.replace(/\s+/g, ' ').slice(0, 130) || 'pr-note 마크업을 못 찾음');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1100);

  const ev = (fn, a) => page.evaluate(fn, a);
  const wait = ms => page.waitForTimeout(ms == null ? 400 : ms);

  /* ── [1] 최저 상태 — 새 세이브(최고 스테이지 0 · 전투력 최저)에서도 열려 있다 ──── */
  const base = await ev(() => {
    S.rank = 0; S.best = 0; markDirty(); uiDirty = true;
    const r = nextRank();
    return { can: canPromote(), ready: promoReady(), best: S.best, cp: cp(), needS: r.stage, needC: r.cp };
  });
  ok('[1] 새 세이브(최고 스테이지 0)에서 **권장 기준은 미달**이다 — 시험 전제',
    base.ready === false && (base.best < base.needS || base.cp < base.needC),
    'best ' + base.best + '/' + base.needS + ' · cp ' + base.cp + '/' + base.needC);
  ok('[1] 그래도 `canPromote()` 는 참 — 입장 게이트가 걷혔다',
    base.can === true, 'canPromote=' + base.can);

  /* 정보 탭 [승급전 도전] 버튼이 실제로 활성인가 */
  const stBtn = await ev(() => {
    /* 정보 탭 본문을 실제로 그린다(verify249·267·88 과 같은 경로 — renderSt 직접 호출) */
    renderSt();
    const b = document.getElementById('promoBtn');
    return b ? { has: true, dis: b.disabled, txt: b.textContent.trim() } : { has: false };
  });
  ok('[1] 정보 탭 [승급전 도전] 버튼이 활성이다(disabled 아님)',
    stBtn.has && stBtn.dis === false, stBtn.has ? '«' + stBtn.txt + '» disabled=' + stBtn.dis : '버튼 없음');

  /* 승급전 팝업 [승급전 시작] 버튼 */
  const pop = await ev(() => {
    openPromo();
    const g = document.getElementById('pgo');
    const note = (document.querySelector('.pr179 .pr-note') || {}).textContent || '';
    return { has: !!g, dis: g ? g.disabled : null, note: note.replace(/\s+/g, ' ').trim() };
  });
  await wait(200);
  ok('[1] 승급전 팝업 [승급전 시작] 버튼이 활성이다(disabled 아님)',
    pop.has && pop.dis === false, pop.has ? 'disabled=' + pop.dis : '버튼 없음');
  ok('[1] 팝업 문구가 «언제든 도전» 을 말한다 — 표기와 동작이 일치',
    /언제든 도전/.test(pop.note), pop.note.slice(0, 90));

  /* ── [2] 실제로 시작된다 — «만들어 놓음» 이 아니라 동작 (기능 완성 규칙) ────── */
  const started = await ev(() => {
    startPromo();
    return { on: !!promo, t: promo ? promo.t : -1, max: promo ? promo.max : -1,
             guard: enemies.filter(e => e.tk === 'promo').length,
             /* ⚠ `closeModal()` 은 `#modal` 의 `.on` 만 뗀다 — 본문 DOM(`#pgo`)은 남는다.
                그러니 «닫혔나» 는 노드 유무가 아니라 `.on` 클래스로 본다. */
             modal: document.getElementById('modal').classList.contains('on') };
  });
  ok('[2] 최저 상태에서 `startPromo()` 가 **실제로 승급전을 연다**(promo 상태 + 수호자 1기)',
    started.on === true && started.guard === 1,
    'promo=' + started.on + ' · 수호자 ' + started.guard + '기 · t ' + started.t);
  ok('[2] 제한 시간이 `BOSS_SEC`(=15) 다 — 285 통일값 유지',
    started.max === 15, 'max ' + started.max);
  ok('[2] 시작과 함께 모달이 닫힌다(#modal.on 해제)', started.modal === false, '#modal.on=' + started.modal);

  /* ── [3] 실패해도 잃는 것이 없다(지시 ⓒ) ──────────────────────────────── */
  const lose = await ev(() => {
    const keys = ['gold', 'dia', 'relic', 'coin', 'ticket', 'best', 'rank'];
    const snap = k => keys.reduce((o, x) => (o[x] = S[x], o), {});
    const before = snap();
    const dunTkBefore = JSON.stringify(S.dunTk || {});
    endPromo(false);                        /* 시간 초과 = 실패 경로 */
    const after = snap();
    return { before, after, dunTkBefore, dunTkAfter: JSON.stringify(S.dunTk || {}), promo: !!promo };
  });
  const diff = Object.keys(lose.before).filter(k => lose.before[k] !== lose.after[k]);
  ok('[3] 승급 실패로 깎이는 재화·계급이 하나도 없다(gold·dia·relic·coin·ticket·best·rank)',
    diff.length === 0, diff.length ? diff.map(k => k + ' ' + lose.before[k] + '→' + lose.after[k]).join(' · ') : '전부 동일');
  ok('[3] 던전 입장권도 안 깎인다', lose.dunTkBefore === lose.dunTkAfter,
    lose.dunTkBefore + ' → ' + lose.dunTkAfter);
  ok('[3] 실패 뒤 승급전 상태가 정리된다(재도전 가능)', lose.promo === false, 'promo=' + lose.promo);

  /* 실패 직후 곧바로 다시 도전할 수 있는가 — «될 때까지 재도전» 이 막히면 제한이 남은 것이다 */
  const again = await ev(() => { startPromo(); const r = { on: !!promo }; endPromo(false); return r; });
  ok('[3] 실패 직후 재도전이 즉시 열린다(횟수 제한 없음)', again.on === true, 'promo=' + again.on);

  /* ── [4] 레드닷 — 166 규약(상시 점등 금지) ───────────────────────────── */
  const dotLow = await ev(() => {
    S.rank = 0; S.best = 0; markDirty(); uiDirty = true; drawHud();
    const b = document.querySelector('.side .ibtn[data-pop="promo"]');
    const c = document.querySelector('#mnw .mn-b[data-mn="promo"]');
    return { ready: promoReady(), can: canPromote(),
             side: b ? b.classList.contains('on') : '노드없음',
             cell: c ? c.classList.contains('alert') : '노드없음' };
  });
  ok('[4] 권장 기준 미달 → 승급 레드닷 **꺼짐**(게이트가 상시 참이어도 따라 켜지지 않는다)',
    dotLow.ready === false && dotLow.can === true && dotLow.side === false,
    'ready=' + dotLow.ready + ' can=' + dotLow.can + ' side=' + dotLow.side + ' cell=' + dotLow.cell);

  /* 요구치를 내려 «충족» 상태를 만든다(verify166 과 같은 수 — cp() 는 const 라 스텁 불가) */
  const dotHigh = await ev(() => {
    const r = RANKS[1], keep = { stage: r.stage, cp: r.cp };
    r.stage = 0; r.cp = 0;
    S.rank = 0; markDirty(); uiDirty = true; drawHud();
    const b = document.querySelector('.side .ibtn[data-pop="promo"]');
    const out = { ready: promoReady(), side: b ? b.classList.contains('on') : '노드없음' };
    r.stage = keep.stage; r.cp = keep.cp;      /* 원상 복구 */
    markDirty(); uiDirty = true; drawHud();
    const after = { ready: promoReady(), side: b ? b.classList.contains('on') : '노드없음' };
    return { out, after };
  });
  ok('[4] 권장 기준 충족 → 승급 레드닷 **켜짐**',
    dotHigh.out.ready === true && dotHigh.out.side === true,
    'ready=' + dotHigh.out.ready + ' side=' + dotHigh.out.side);
  ok('[4] 요구치를 되돌리면 다시 꺼진다 — «상시 점등» 이 아니다',
    dotHigh.after.ready === false && dotHigh.after.side === false,
    'ready=' + dotHigh.after.ready + ' side=' + dotHigh.after.side);

  /* ── [5] 승급 성공은 그대로 동작한다(회귀) ───────────────────────────── */
  const win = await ev(() => {
    S.rank = 0; S.best = 0;
    const before = S.rank;
    startPromo(); endPromo(true);
    const raw = localStorage.getItem(KEY) || '';       /* 16550 `const KEY = 'idle_hunter_save_v4'` */
    let saved = null; try { saved = JSON.parse(raw).rank; } catch (_) {}
    return { before, after: S.rank, saved };
  });
  ok('[5] 승급 성공 → 계급이 오르고 그 값이 저장(S·localStorage)에 반영된다',
    win.after === win.before + 1 && (win.saved === null || win.saved === win.after),
    'rank ' + win.before + '→' + win.after + ' · 저장 ' + win.saved);

  /* ── [6] 최고 계급에서는 여전히 닫혀 있다 ─────────────────────────────── */
  const top = await ev(() => {
    S.rank = RANKS.length - 1; markDirty(); uiDirty = true;
    const r = { can: canPromote(), ready: promoReady() };
    startPromo();
    r.on = !!promo;
    return r;
  });
  ok('[6] 최고 계급(다음 계급 없음) → `canPromote()` 거짓 · 승급전이 안 열린다',
    top.can === false && top.ready === false && top.on === false,
    'can=' + top.can + ' ready=' + top.ready + ' promo=' + top.on);

  /* ── [7] 콘솔 ────────────────────────────────────────────────────────── */
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const bad = R.filter(r => !r.c);
  R.forEach(r => console.log((r.c ? '  ok   ' : '  FAIL ') + r.n + (r.got === undefined ? '' : '  [' + r.got + ']')));
  console.log('\nVERIFY295 ' + (bad.length ? 'FAIL' : 'PASS') + ' ' + (R.length - bad.length) + '/' + R.length);
  process.exit(bad.length ? 1 : 0);
})();
