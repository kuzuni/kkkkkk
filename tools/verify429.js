#!/usr/bin/env node
/* 429 검증 — 89 유물 페이지 좌상단 [?] 도움말 신설 + 유물 세부 팝업의 «공통 2줄» 이관
 * (저장소 주인 지시 2026-08-30, 269 코스튬 선례)
 *
 *   node tools/verify429.js   →  마지막 줄이 `VERIFY429 n/n PASS` 여야 한다.
 *
 * 지시 원문: «유물 세부팝업에 유물 설명에 공통으로 되는 말들 유물 팝업에 도움말 버튼 "?" 로 된거
 * 왼쪽 위에 만들고 해당 설명 써넣기 / 그 도움말 팝업에 ㅇㅇ».
 *
 * 검사 항목:
 *   [A] 버튼 존재·자리 — `#relw .rl-help` 76x76 r38 이 **프레임 좌상단 사분면**에 있고,
 *       41 재화 바(`.pcb`, 108px) 의 **세로 정중앙**이며(top 16 = (108−76)/2),
 *       알약 3개와 **겹침 0**. 2280·1600 에서 **프레임 좌표가 같다**(바가 고정 높이라 구조적).
 *   [B] 부품 공유 — 269 `#bCos .cos-help` 와 크기·radius·배경·링·글자가 **전부 같은 값**이다.
 *       값을 두 벌 적었으면 269 를 고칠 때 여기가 조용히 갈라진다(340 계열 결손).
 *       다른 것은 `top` 하나뿐이고 그 차이는 «띠 높이 114 vs 108 의 정중앙» 으로 설명된다.
 *       B4 는 269 의 스코프 잠금(07·26 시트로 안 샘)이 그대로인지 같이 본다.
 *   [C] 실동작 — 진짜 포인터로 누르면 A5 팝업이 뜨고, 제목이 «유물», 본문이 옮겨 온 공통 설명을
 *       말하며, **수치·이름이 제품 상수에서 나온다**(relicCost · RELICS.length · RELIC_EFF ·
 *       REL_DUN · TOWER.n). [확인]·딤 탭 둘 다로 닫힌다. `.mbox` 를 안 넘친다.
 *   [D] 세부 팝업에서 제거 — `showItem(<유물>)` 본문에 «보유만으로» · «소환할 때마다» 가
 *       **유물 10종 전수에서 0건**. 개별 효과 문장(«… 상승 유물입니다»)은 그대로 있다.
 *   [E] 남긴 것 — ⓐ 미보유 분기(«유물 소환으로 획득하세요») ⓑ 진행바 문구(«소환할 때마다 Lv +1»)
 *       — 후자는 «일반 설명» 이 아니라 진행 상태 표시라 남긴다(등재문 지시).
 *       ⓒ «보유 효과» 알약(E4a~E4d) — **칸마다 제 수치를 든다**. 861 이 옛 «`+` 한 글자» 대리
 *         지표를 걷어내고 성질 넷(숫자 · 그 칸의 값 · 뭉개짐 없음 · Lv 의존)으로 갈랐다.
 *   [F] 껍데기 1px 불변 — 08 규격 부품 8개 bbox 가 **펫 세부와 픽셀 동일**(`.sk-db` 750x290 포함).
 *   [R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다:
 *       R1 [?] 노드를 지우면 A1 이 빨개진다(«원래 있던 것을 세고 있는» 헛초록이 아니다)
 *       R2 세부 팝업에 옛 두 줄을 도로 주입하면 D 의 탐지기가 **잡는다**(문자열이 원래 없어서
 *          0건인 게 아니다 — 탐지기가 실제로 그 문장을 본다)
 *       R3 269 버튼은 그대로 살아 있다(선택자만 늘린 것이지 옮긴 게 아니다)
 *   [H] 콘솔/페이지 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { settleAnimOn } = require('./settle291');   /* 957 — 개폐·입장 연출 정착은 공용 §box 한 곳 */
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 옮겨 간 «공통» 두 줄의 지문 — 세부 팝업에 한 조각이라도 남으면 429 가 반쪽이다 */
const MOVED = ['보유</em>만으로', '만으로 항상 적용', '소환할 때마다 유물 하나가'];
/* 08 껍데기 부품 8개 — 268 §2·269 [F] 와 같은 읽기 */
const PARTS = ['.sk-ic', '.sk-gr', '.sk-lv', '.sk-pb', '.sk-ct', '.sk-sl', '.sk-db', '.sk-ow'];

/* 771 — **재기 전에 페이지 개폐 연출을 스스로 정착시킨다.**
   `#relw` 는 열 때 `.jz-o.jz-pg` 로 `jzPgIn .12s`(`@keyframes jzPgIn{0%{scale:.985}}` ·
   index.html 13960)를 탄다. 이 아래 [A] 는 그 직후의 rect 를 재므로, 0% 프레임을 잡으면
   `#relw` 가 **프레임 중심 기준 0.985 배로 등방 축소**돼 읽힌다 — `[?]` 좌상단이
   `(24,16)` 대신 `(31.74,27.19)`(= 540+(24−540)·.985 · 1140+(16−1140)·.985)가 되고
   A2(76×76)·A5·A7·A9 가 같이 물린다. 등재문(771)의 부하 4회 중 1회가 그 값이다.
   ⚠ **여태 초록이던 것은 이 자의 힘이 아니었다** — 공용 `settle291` 훅(`launch()` 가
   `verify*.js` 에만 자동으로 심는다 · `tools/pwlaunch.js`)이 `waitForTimeout` 뒤에
   대신 정착해 줬다. 그 사다리에는 창이 하나 남아 있다: 선검사(`PENDING_SRC`)가
   «부를 때 pending 이 0 이면 곧바로 끝낸다» 라, 연출이 **다음 프레임에 붙는** 순간을
   그대로 통과시킨다(`tools/probe771.js` [3] · 764 가 `settleBox` 를 따로 세운 이유 ⓑ 와 같은 구멍).
   ⚠ 그 창을 `settle291` 쪽에서 닫는 길은 **안 잡았다** — 그 자는 게이트 44개를 전부 지나가는데
   64·262·107 처럼 **시간 자체를 재는** 자는 rAF 두 프레임이 얹히면 문턱을 넘는다
   (그 파일 `PENDING_SRC` 주석). 그래서 764 와 같이 **자리 쪽**에서 세운다.
   ⇒ 「**두 프레임 연속으로 `jzPg…` 가 없을 때만** 끝낸다」. 상한 1500ms 는 291·764 와 같은 값 —
   어떤 이유로든 `finished` 가 안 오면 자를 멈추지 않고 지나간다.
   ⚑ **작업 957 — 여기도 규칙을 다시 안 적는다.** 950 의 §box 는 «이름 패턴을 받는 일반형»
   (`window.settleAnim291(pat, cap)`)이라 `jzBox` 말고 **`jzPg` 에도 그대로 쓴다** — 771 이 손으로
   적은 이 열 줄은 그 일반형과 **글자까지 같은 규칙**이었다(`verify957` [3-c] 가 그 동치를 못박는다).
   되돌림: `PW_SETTLEBOX=0` 이면 §box 가 즉시 돌아와 771 이전 상태가 재현된다
   (`tools/probe771.js` 가 그 상태를 [1] 로 재현한다). */
const settlePg = (page) => settleAnimOn(page, '^jzPg');

const openRel = async (page) => {
  await page.evaluate(() => { closeModal(); openRelw(); });
  await page.waitForTimeout(300);
  await settlePg(page);
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];

  /* ── [A] 자리 — 두 프레임에서 ─────────────────────────────────────── */
  console.log('[A] [?] 버튼의 자리 — 재화 바 안 좌상단, 알약과 겹침 0');
  const geo = {};
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errs.push(H + ': ' + m.text()); });
    page.on('pageerror', (e) => errs.push(H + ': ' + String(e)));
    await page.goto(URL);
    await page.waitForTimeout(900);
    await openRel(page);
    geo[H] = await page.evaluate(() => {
      const w = document.getElementById('relw');
      const n = w.querySelector('.rl-help');
      if (!n) return { has: false };
      const fr = document.getElementById('app').getBoundingClientRect();
      const R = (el) => { const b = el.getBoundingClientRect();
        return { x: +(b.x - fr.x).toFixed(2), y: +(b.y - fr.y).toFixed(2),
                 w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
      const btn = R(n), bar = R(w.querySelector('.pcb'));
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const pills = [...w.querySelectorAll('.pcb-p')].map(R);
      const cs = getComputedStyle(n);
      /* 실제로 눌리는가 — 딤도 없고 격자 위임도 없는 자리인지 포인터로 확인 */
      const c = { x: fr.x + btn.x + btn.w / 2, y: fr.y + btn.y + btn.h / 2 };
      const el = document.elementFromPoint(c.x, c.y);
      return { has: true, btn, bar, pills,
        overlap: pills.filter((p) => hit(btn, p)).length,
        /* 아이콘까지 포함한 «가장 왼쪽 알약 잉크» 좌변 */
        pillInkX: Math.min(...[...w.querySelectorAll('.pcb-p>i')].map((e) => R(e).x)),
        r: cs.borderRadius, top: cs.top, left: cs.left, z: cs.zIndex,
        hitTop: el ? (el.className ? String(el.className) : el.tagName) : null,
        inHelp: !!(el && el.closest && el.closest('[data-rlhelp]')) };
    });
    const g = geo[H];
    if (!g.has) { ok(false, 'A1 `#relw .rl-help` 가 있다 (' + H + ')'); }
    else {
      if (H === 2280) {
        ok(true, 'A1 `#relw .rl-help` 가 있다');
        ok(g.btn.w === 76 && g.btn.h === 76, 'A2 76×76', g.btn.w + '×' + g.btn.h);
        ok(g.r === '38px', 'A3 radius 38px', g.r);
        ok(g.btn.x < 200 && g.btn.y < 200, 'A4 프레임 좌상단 사분면', '(' + g.btn.x + ', ' + g.btn.y + ')');
        ok(near(g.btn.y - g.bar.y, (g.bar.h - g.btn.h) / 2, 0.6),
          'A5 재화 바의 세로 정중앙', '띠 ' + g.bar.h.toFixed(1) + ' · 위 여백 ' + (g.btn.y - g.bar.y).toFixed(2)
          + ' ↔ 기대 ' + ((g.bar.h - g.btn.h) / 2).toFixed(2));
        ok(g.overlap === 0, 'A6 재화 알약 3개와 겹침 0', '겹침 ' + g.overlap + '개');
        ok(g.btn.x + g.btn.w <= g.pillInkX, 'A7 알약 잉크(아이콘 포함) 좌변보다 왼쪽에서 끝난다',
          '버튼 우변 ' + (g.btn.x + g.btn.w).toFixed(1) + ' ≤ 잉크 좌변 ' + g.pillInkX.toFixed(1));
        ok(g.inHelp, 'A8 그 자리를 실제로 포인터가 집는다(딤·위임에 안 먹힌다)', g.hitTop);
      }
    }
    if (H === 1600) await ctx.close(); else global.__keep = { ctx, page };
  }
  {
    const a = geo[2280], b = geo[1600];
    ok(a.has && b.has && near(a.btn.x, b.btn.x, 0.01) && near(a.btn.y, b.btn.y, 0.01)
       && near(a.btn.w, b.btn.w, 0.01),
      'A9 2280 ↔ 1600 프레임 좌표 Δ0 (바가 108px 고정이라 구조적)',
      a.has && b.has ? '(' + a.btn.x + ',' + a.btn.y + ') ↔ (' + b.btn.x + ',' + b.btn.y + ')' : '—');
    ok(b.has && b.overlap === 0, 'A10 1600 에서도 알약과 겹침 0');
  }

  const { ctx, page } = global.__keep;

  /* ── [B] 부품 공유 ────────────────────────────────────────────────── */
  console.log('\n[B] 269 `.cos-help` 와 같은 부품인가 (값이 두 벌이면 갈라진다)');
  const B = await page.evaluate(() => {
    const keys = ['width', 'height', 'borderRadius', 'backgroundImage', 'boxShadow', 'boxSizing',
                  'zIndex', 'cursor', 'textAlign', 'lineHeight', 'position', 'left'];
    /* ⚠ `textShadow` 를 뺀 첫 판이 «외곽선 없는 ?» 를 놓쳤다 — `.ol4` 유틸이 세 시트·`.stabs`
       안에서만 켜져 있어서 같은 마크업이 `#relw` 에서만 민짜로 그려졌다. 그 자리를 이 항이 잡는다. */
    const ikeys = ['display', 'fontSize', 'color', 'transform', 'textShadow'];
    /* ⚠ **화면이 보이는 동안** 읽어야 한다 — 숨은(display:none) 조상 아래에서 읽으면 크롬이
       `transform` 을 `none` 으로 돌려준다(1회차에 실제로 «269 만 transform:none» 이라는
       거짓 실패를 냈다). 그래서 두 버튼을 각자 자기 화면이 열려 있을 때 따로 읽는다. */
    const read = (n) => { const cs = getComputedStyle(n), o = {};
      keys.forEach((k) => { o[k] = cs[k]; });
      const i = n.querySelector('i'); o.__i = {};
      if (i) { const ics = getComputedStyle(i); ikeys.forEach((k) => { o.__i[k] = ics[k]; }); }
      o.__top = cs.top;
      return o; };
    /* 코스튬 시트를 열어 269 버튼을 실물로 읽는다 */
    closeRelw();
    document.querySelector('.tab[data-t="hero"]').click();
    document.querySelector('[data-eqtab="cos"]').click();
    const cosN = document.querySelector('#bCos .cos-help');
    const a = cosN ? read(cosN) : null;
    document.querySelector('.tab[data-t="box"]').click();
    const relN = document.querySelector('#relw .rl-help');
    const b = relN ? read(relN) : null;
    if (!a || !b) return { none: true, cos: !!cosN, rel: !!relN };
    const diff = keys.filter((k) => a[k] !== b[k]);
    const idiff = ikeys.filter((k) => a.__i[k] !== b.__i[k]);
    /* CSS 규칙 자체 — `.cos-help` 항이 여전히 `#bCos` 로 갇혀 있나(269 B3 회귀) */
    let scoped = 0, loose = 0, shared = 0;
    for (const s of document.styleSheets) {
      let rules; try { rules = s.cssRules; } catch (_) { continue; }
      for (const r of rules) {
        if (!r.selectorText) continue;
        if (/\.cos-help/.test(r.selectorText)) { if (/#bCos\s/.test(r.selectorText)) scoped++; else loose++; }
        if (/\.cos-help/.test(r.selectorText) && /\.rl-help/.test(r.selectorText)) shared++;
      }
    }
    /* 07·26 시트에는 여전히 없다 */
    document.querySelector('.tab[data-t="hero"]').click();
    document.querySelector('[data-eqtab="sk"]').click();
    const sk = !!document.querySelector('#bSk .cos-help, #bSk .rl-help');
    document.querySelector('[data-eqtab="pet"]').click();
    const pet = !!document.querySelector('#bPet .cos-help, #bPet .rl-help');
    return { diff, idiff, cosTop: a.__top, relTop: b.__top, scoped, loose, shared, sk, pet };
  });
  if (B.none) ok(false, 'B0 두 버튼을 다 읽었다', 'cos ' + B.cos + ' · rel ' + B.rel);
  else {
    ok(B.diff.length === 0, 'B1 껍데기 계산값 12항이 전부 같다', B.diff.length ? '다름: ' + B.diff.join(',') : '전부 동일');
    ok(B.idiff.length === 0, 'B2 «?» 글자 5항(display·크기·색·변형·검정 외곽선)이 전부 같다',
      B.idiff.length ? '다름: ' + B.idiff.join(',') : '전부 동일');
    ok(B.cosTop === '19px' && B.relTop === '16px',
      'B3 다른 것은 top 하나 — 각자 띠의 정중앙((114−76)/2=19 · (108−76)/2=16)',
      '269 ' + B.cosTop + ' · 429 ' + B.relTop);
    ok(B.shared >= 1, 'B4 두 선택자가 **같은 규칙**에 들어 있다(값이 한 벌이다)', '공유 규칙 ' + B.shared + '개');
    ok(B.scoped >= 1 && B.loose === 0, 'B5 269 회귀 — `.cos-help` 규칙은 여전히 `#bCos` 로 갇혀 있다',
      '갇힘 ' + B.scoped + ' · 전역 ' + B.loose);
    ok(!B.sk && !B.pet, 'B6 269 회귀 — 07 스킬·26 펫 시트에는 [?] 가 없다');
  }

  /* ── [C] 실동작 ───────────────────────────────────────────────────── */
  console.log('\n[C] [?] 클릭 → 유물 일반 설명 팝업');
  await openRel(page);
  await page.click('#relw .rl-help', { force: true });
  await page.waitForTimeout(400);
  const C = await page.evaluate(() => {
    const m = document.getElementById('modal'), box = document.getElementById('mbox');
    const w = box.querySelector('.cos269');
    return { on: m.classList.contains('on'),
      title: document.getElementById('mtitle').textContent.trim(),
      wrap: !!w,
      ps: w ? [...w.querySelectorAll('p')].map((p) => p.textContent.trim()) : [],
      fs: w && w.querySelector('p') ? Math.round(parseFloat(getComputedStyle(w.querySelector('p')).fontSize) * 10) / 10 : 0,
      okBtn: !!document.getElementById('okBtn'),
      skd: !!box.querySelector('.skd'), act: !!box.querySelector('.sk-act'),
      overflow: w ? Math.round((w.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom) * 10) / 10 : 0,
      /* 가로도 같이 본다 — 문단이 길어지면 잉크가 래퍼 밖으로 삐져나올 수 있다.
         `.mbody` 좌우 여백 21px 은 A5 공용이라 못 건드리므로(269 와 **같은 값**),
         지킬 수 있는 것은 «문단 잉크가 래퍼 안에 든다» 뿐이다. 잰 것은 Range 의 줄 상자다. */
      sideMin: w ? (() => { let m = 1e9; const wb = w.getBoundingClientRect();
        for (const p of w.querySelectorAll('p')) { const r = document.createRange(); r.selectNodeContents(p);
          for (const q of r.getClientRects()) m = Math.min(m, q.left - wb.left, wb.right - q.right); }
        return Math.round(m * 10) / 10; })() : 0,
      bodyPad: getComputedStyle(box.closest('.mbody') || box).padding,
      /* 제품 상수 — 문구가 여기서 나와야 한다 */
      cost: fmt(relicCost()), kinds: RELICS.length,
      effs: Object.values(RELIC_EFF), dun: REL_DUN.map((r) => r.n), tower: TOWER.n };
  });
  ok(C.on, 'C1 팝업이 떴다');
  ok(C.title === '유물', 'C2 제목 «유물»(269 처럼 화면 이름)', C.title);
  ok(C.wrap, 'C3 269 본문 래퍼 `.cos269` 재사용(새 클래스 0개)');
  ok(C.ps.length >= 4, 'C4 설명 문단 ' + C.ps.length + '개');
  ok(C.fs >= 33, 'C5 본문 글씨 ' + C.fs + 'px (A5 공용 24px 보다 크다 — 179·265·269 처방)');
  ok(!C.skd && !C.act, 'C6 «설명만» — 08 껍데기도 행동 버튼도 없다');
  ok(C.okBtn, 'C7 [확인] 이 있다');
  {
    const all = C.ps.join(' ');
    const want = [['장착 없음', /장착/], ['보유만으로 상시', /가지고 있기만|항상 적용/],
                  ['소환 = Lv +1', /Lv \+1/], ['강화가 따로 없다', /강화/], ['유물조각 수급처', /얻습니다/]];
    for (const [n, re] of want) ok(re.test(all), 'C8 본문이 «' + n + '» 을 말한다');
    ok(all.includes('유물조각 ' + C.cost), 'C9 소환 비용이 상수(relicCost)에서 나온다', C.cost);
    ok(all.includes(String(C.kinds) + '종'), 'C10 유물 종 수가 상수(RELICS.length)에서 나온다', String(C.kinds));
    ok(C.effs.every((e) => all.includes(e)), 'C11 효과 ' + C.effs.length + '종 이름이 RELIC_EFF 에서 나온다');
    ok(C.dun.every((d) => all.includes(d)) && all.includes(C.tower),
      'C12 수급처 이름이 REL_DUN·TOWER 에서 나온다', C.dun.join('·') + ' / ' + C.tower);
    ok(!/층|레벨/.test(all), 'C13 탑을 «층»/«레벨» 로 안 부른다(427 이 그 낱말을 정하는 중이다)');
  }
  ok(C.overflow <= 0, 'C14 본문이 `.mbox` 를 안 넘친다', 'Δ' + C.overflow + 'px');
  ok(C.sideMin >= 0, 'C14b 문단 잉크가 래퍼 좌우를 안 넘는다(가장 빠듯한 줄 ' + C.sideMin + 'px)',
    '`.mbody` 좌우 여백 ' + C.bodyPad + ' 은 A5 공용 — 269 와 같은 값이라 못 건드린다');
  await page.click('#okBtn', { force: true });
  await page.waitForTimeout(350);
  ok(await page.evaluate(() => !document.getElementById('modal').classList.contains('on')),
    'C15 [확인] 으로 닫힌다');
  await openRel(page);
  await page.click('#relw .rl-help', { force: true });
  await page.waitForTimeout(350);
  await page.mouse.click(540, 40);
  await page.waitForTimeout(350);
  ok(await page.evaluate(() => !document.getElementById('modal').classList.contains('on')),
    'C16 딤 탭으로도 닫힌다(A5 규격)');

  /* ── [D][E][F] 세부 팝업 ──────────────────────────────────────────── */
  console.log('\n[D][E][F] 유물 세부 팝업 — 공통 2줄은 없고, 그 유물 하나만 말한다');
  const D = await page.evaluate(async (A) => {
    const { MOVED, PARTS } = A;
    /* 764 — **재기 전에 상자 개폐 연출을 정착시킨다.**
       `.mbox` 는 열 때 `jzBoxIn`(scale .92 → **1.02** → 1), 닫을 때 `jzBoxOut`(`to{scale:.94}` ·
       fill `both`)을 탄다. 이 블록은 «닫고 곧바로 다시 열어» 재므로, 직전 닫기의 채움이 아직
       걷히지 않은 프레임을 잡으면 bbox 가 **통째로 등방 축소**돼 읽힌다 — F1 은 유물↔펫 *상대*
       비교라 둘 다 같이 눌려 초록이고 **F2 만** 빨개진다(`705.07×272.63` = 750·290 × .9401).
       ⚠ «몇 ms 기다린다» 로는 못 닫는다 — `jzBoxIn` 이 62% 에서 1.02 로 넘겼다 돌아오므로
       고정 대기는 축소(690)나 확대(765) 중 한쪽을 잡는다(`tools/probe764.js` [1] 위상 스윕).
       ⚠ 공용 `settle291()`(291·353)을 `jzBox…` 로 넓혀 쓰는 길은 **두 이유로 안 잡았다**:
       ⓐ 그 자는 `waitForTimeout` 훅으로 게이트 44개를 전부 지나가는데, 64·262·107 처럼 **시간
          자체를 재는** 자는 rAF 두 프레임이 얹히면 문턱을 넘는다(그 파일 PENDING_SRC 주석).
       ⓑ 사다리가 «부를 때 pending 이 0 이면 곧바로 끝낸다» 라서, 연출이 **다음 프레임에 붙는**
          이 자리의 창은 못 닫는다(실측: 그대로 쓰면 g200·g300 에서 `jzBoxIn` 0% = 690 을 잡는다).
       ⇒ 여기서는 «**두 프레임 연속으로 돌 것이 없을 때만** 끝낸다» 로 세운다. 상한 1500ms 는
          291 과 같은 값 — 어떤 이유로든 `finished` 가 안 오면 자를 멈추지 않고 지나간다.
       ⚑ **작업 957 — 그 규칙은 이제 여기 안 적혀 있다.** 950 이 위 문단을 그대로 공용 부품
          `tools/settle291.js` **§box**(`window.settleBox`)로 올렸고, 957 이 이 자리를 그 부품으로
          갈아 끼웠다. 규칙(두 프레임 조용 · 상한 1500 · 무한 반복 제외)은 **한 곳에만** 있다.
       되돌림: `PW_SETTLEBOX=0` 이면 §box 가 즉시 돌아오므로 **764 이전의 흔들림이 그대로
          재현된다**(그것이 이 자의 되돌림 시험이다 — `verify957` [R]). */
    const settleBox = async () => {
      if (typeof window.settleBox === 'function') return void (await window.settleBox());
      /* 심기지 않은 페이지(= `pwlaunch` 밖) — 규칙을 다시 적지 않고 프레임만 한 번 넘긴다 */
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
    const readParts = () => {
      const box = document.getElementById('mbox'), b = box.getBoundingClientRect();
      return PARTS.map((s) => { const el = box.querySelector(s);
        if (!el) return { s, has: false };
        const r = el.getBoundingClientRect();
        return { s, has: true, x: +(r.left - b.left).toFixed(2), y: +(r.top - b.top).toFixed(2),
                 w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; });
    };
    closeModal();
    /* 전 유물을 소환 경로로 보유시킨다(상태를 손으로 안 짓는다) */
    S.relic = 1e7;
    for (let i = 0; i < 400 && RELICS.some((r) => !has(r.id)); i++) summonRelic(true);
    const out = { hits: [], own: [], ownExp: [], eff: 0, n: RELICS.length };
    for (const r of RELICS) {
      showItem(r.id);
      const p = document.querySelector('#mbox .sk-db p');
      const h = p ? p.innerHTML : '';
      out.hits.push(MOVED.filter((m) => h.includes(m)).length);
      if (h.includes(RELIC_EFF[r.eff] + '</em> 상승 유물입니다')) out.eff++;
      out.own.push((document.querySelector('#mbox .sk-ow .v b') || {}).textContent);
      /* 861 — «그 칸의 값» 을 제품 상수에서 다시 만든다(자가 문자열을 손으로 안 적는다).
         725 가 표기를 또 갈아도 이 기대값이 같이 따라가므로 여기는 다시 안 썩는다. */
      out.ownExp.push(RELIC_EFF[r.eff] + ' ' + fmtEff(relicVal(r)));
      if (r === RELICS[0]) { out.pb = (document.querySelector('#mbox .sk-pb b') || {}).textContent;
                             out.sl = (document.querySelector('#mbox .sk-sl') || {}).textContent;
                             await settleBox();
                             out.parts = readParts();
                             out.lines = p ? Math.round(p.getBoundingClientRect().height
                               / parseFloat(getComputedStyle(p).lineHeight)) : 0; }
      closeModal();
    }
    /* 861 [E4d] — «칸마다» 축의 **의존성 시험**: 한 유물의 Lv 만 올리면 그 칸의 알약만 바뀌어야
       한다. 위 [E4b] 는 제품이 쓰는 식을 다시 세운 것이라 «자기 값을 읽는가» 까지는 못 묻는다
       (140 교훈 — 재계산은 대리 지표의 다른 얼굴이다). 여기는 **실제로 상태를 흔들어** 본다. */
    {
      const tgt = RELICS[1].id;
      const before = [];
      for (const r of RELICS) { showItem(r.id);
        before.push((document.querySelector('#mbox .sk-ow .v b') || {}).textContent); closeModal(); }
      S.own[tgt].l += 1;
      const after = [];
      for (const r of RELICS) { showItem(r.id);
        after.push((document.querySelector('#mbox .sk-ow .v b') || {}).textContent); closeModal(); }
      S.own[tgt].l -= 1;
      out.dep = { i: RELICS.findIndex((r) => r.id === tgt),
                  moved: after.map((t, i) => t !== before[i]).map((b, i) => (b ? i : -1)).filter((i) => i >= 0) };
      /* 되돌렸는지 확인 — 이 자는 뒤의 [F] 대조군과 같은 페이지를 쓴다 */
      const back = [];
      for (const r of RELICS) { showItem(r.id);
        back.push((document.querySelector('#mbox .sk-ow .v b') || {}).textContent); closeModal(); }
      out.depBack = back.every((t, i) => t === before[i]);
    }
    /* 미보유 분기 — 세이브를 갈아 끼우지 않고 소유만 잠시 뺀다 */
    const one = RELICS[0].id, keep = S.own[one];
    delete S.own[one];
    showItem(one);
    out.none = (document.querySelector('#mbox .sk-db p') || {}).innerHTML;
    closeModal(); S.own[one] = keep;
    /* [F] 대조군 — 펫 세부(같은 08 껍데기) */
    const pet = PETS[0].id; S.own[pet] = S.own[pet] || { n: 0, l: 1 };
    showItem(pet); await settleBox(); out.petParts = readParts(); closeModal();
    return out;
  }, { MOVED, PARTS });
  ok(D.hits.every((n) => n === 0), 'D1 옮겨 간 두 줄이 유물 ' + D.n + '종 전수에서 0건',
    '최대 ' + Math.max(...D.hits) + '건');
  ok(D.eff === D.n, 'D2 개별 효과 문장(«… 상승 유물입니다»)은 ' + D.eff + '/' + D.n + '칸에 그대로');
  ok(D.lines === 1, 'D3 설명 상자는 한 줄이 됐다(269·346 의 코스튬과 같은 모양)', D.lines + '줄');
  ok(/유물 소환으로 획득하세요/.test(D.none || ''), 'E1 미보유 분기는 남아 있다', String(D.none).slice(0, 60));
  ok(D.pb === '소환할 때마다 Lv +1', 'E2 진행바 문구는 남아 있다(진행 상태 표시라 이관 대상이 아니다)', D.pb);
  ok(D.sl === '유물 설명', 'E3 라벨은 «유물 설명» 그대로', D.sl);
  /* 861 (2026-09-03) — 여기 있던 판정식은 `D.own.every(t => /\+/.test(t))` 한 줄이었다.
     «수치를 든다» 를 물으면서 실제로 센 것은 **더하기 기호 한 글자**다(140 교훈 — 대리 지표).
     725 가 효과 표기를 «+15%» → «×1.15배» 로 전면 전환하자 그 한 글자가 프로젝트에서 사라져
     이 항만 빨개졌고, 알약은 내내 제 수치를 들고 있었다(`probe861` [1]~[4] — 갈래 ⓐ 기각).
     ⇒ **문자열이 아니라 성질을 직접 센다.** 셋으로 갈랐고, 지금 지키는 것이 아니라
        «수치를 그대로 든다» 라는 뜻 자체다:
        a 칸마다 숫자를 든다        — 표기 규약이 또 바뀌어도 안 죽는다
        b 그 숫자가 **그 칸의 값**이다 — 제품 상수(RELIC_EFF·relicVal·fmtEff)에서 다시 만든다
        c 10칸이 한 문자열로 안 뭉갠다 — 등재문의 갈래 ⓐ(«칸마다 같은 값») 를 실제로 잡는 축
        d 그 칸의 Lv 를 올리면 **그 칸만** 바뀐다 — b 의 재계산이 못 묻는 «자기 값을 읽는가»
     되돌림 시험은 `node tools/probe861.js` [5] 가 네 축 전부에 대해 갖고 있다. */
  ok(D.own.every((t) => t && /\d/.test(t)),
    'E4a «보유 효과» 알약은 칸마다 수치를 든다',
    D.own.filter((t) => t && /\d/.test(t)).length + '/' + D.n + '칸');
  {
    const bad = D.own.map((t, i) => (t === D.ownExp[i] ? null : i)).filter((i) => i !== null);
    ok(bad.length === 0,
      'E4b 그 수치가 «그 칸의 값» 이다 — `RELIC_EFF[eff] + fmtEff(relicVal)` 와 글자까지 같다',
      bad.length ? bad.map((i) => '#' + i + ' «' + D.own[i] + '» ↔ «' + D.ownExp[i] + '»').join(' / ')
                 : D.n + '/' + D.n + '칸');
  }
  ok(new Set(D.own).size > 1,
    'E4c 10칸이 «한 문자열» 로 뭉개져 있지 않다(등재문 갈래 ⓐ)',
    '서로 다른 문자열 ' + new Set(D.own).size + '가지');
  ok(D.dep && D.dep.moved.length === 1 && D.dep.moved[0] === D.dep.i && D.depBack,
    'E4d 한 유물의 Lv 만 올리면 **그 칸의 알약만** 바뀐다(자기 값을 읽는다)',
    D.dep ? '바뀐 칸 [' + D.dep.moved.join(',') + '] · 올린 칸 #' + D.dep.i
            + ' · 원복 ' + (D.depBack ? 'OK' : '실패') : '측정 실패');
  {
    const a = D.parts, b = D.petParts;
    const bad = a.filter((p, i) => !p.has || !b[i].has || !(near(p.x, b[i].x, 0.5) && near(p.y, b[i].y, 0.5)
      && near(p.w, b[i].w, 0.5) && near(p.h, b[i].h, 0.5)));
    ok(bad.length === 0, 'F1 08 껍데기 부품 8개 bbox 가 펫 세부와 픽셀 동일',
      bad.length ? bad.map((p) => p.s).join(',') : 'Δ≤0.5px');
    const db = a.find((p) => p.s === '.sk-db');
    ok(db && near(db.w, 750, 1) && near(db.h, 290, 1), 'F2 `.sk-db` 는 750×290 그대로',
      db ? db.w + '×' + db.h : '—');
  }

  /* ── [R] 되돌림 시험 ─────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다');
  const R = await page.evaluate((A) => {
    const { MOVED } = A;
    const out = {};
    /* R1 — 노드를 지우면 [?] 경로가 사라진다 */
    const btn = document.querySelector('#relw .rl-help');
    const parent = btn.parentElement, next = btn.nextSibling;
    btn.remove();
    out.gone = !document.querySelector('#relw .rl-help');
    parent.insertBefore(btn, next);
    out.back = !!document.querySelector('#relw .rl-help');
    /* R2 — 옛 두 줄을 도로 주입하면 탐지기가 잡는다(문자열이 원래 없어서 0건인 게 아니다) */
    closeModal(); showItem(RELICS[0].id);
    const p = document.querySelector('#mbox .sk-db p');
    out.before = MOVED.filter((m) => p.innerHTML.includes(m)).length;
    p.innerHTML += '<br>장착 없이 <em>보유</em>만으로 항상 적용됩니다.'
                 + '<br>유물을 소환할 때마다 유물 하나가 <em>Lv +1</em> 됩니다.';
    out.after = MOVED.filter((m) => p.innerHTML.includes(m)).length;
    closeModal();
    /* R3 — 269 버튼은 그대로 살아 있다 */
    document.querySelector('.tab[data-t="hero"]').click();
    document.querySelector('[data-eqtab="cos"]').click();
    out.cos = !!document.querySelector('#bCos .cos-help');
    return out;
  }, { MOVED });
  ok(R.gone && R.back, 'R1 [?] 노드를 지우면 A1 의 자가 실제로 못 찾는다(헛초록 아님)');
  ok(R.before === 0 && R.after === MOVED.length,
    'R2 옛 두 줄을 주입하면 D1 의 탐지기가 ' + R.after + '/' + MOVED.length + '건으로 잡는다',
    '주입 전 ' + R.before + ' → 후 ' + R.after);
  ok(R.cos, 'R3 269 코스튬 [?] 는 그대로 살아 있다(선택자를 늘린 것이지 옮긴 게 아니다)');

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await ctx.close();
  await browser.close();
  const line = 'VERIFY429 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
