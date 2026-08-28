#!/usr/bin/env node
/* 266 검증 — 21 도감 «일괄 강화» 버튼 (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify266.js
 *
 * 지시 원문: «도감에 강화할 게 생기면 일괄강화 버튼이 탭들 위에 가운데에 생기게. 적당히 큰
 * 크기로. 무기 탭 클릭해서 일괄강화 누르고, 펫 탭 클릭하고 일괄강화 누르고 그런 느낌».
 *
 * 검사 항목:
 *   [A] 표시 조건 = `collTabReady` 와 1:1 — 6탭 전부에서 «버튼이 보인다» == «그 탭에 강화 가능한
 *       세트가 있다». 새 판정을 만들지 않았다는 것을 렌더된 화면으로 못 박는다.
 *   [B] 배치·크기 — 가로 가운데(프레임 중심 540) · 깃발 서브탭 «위» · 모달 «안» ·
 *       380×130 · 라벨 46.6px · 라벨이 버튼 밖으로 넘치지 않음.
 *   [C] 실동작(기능 완성 규칙) — 진짜 포인터 클릭으로 무기 탭 일괄 강화 → 그 탭 세트가 전부
 *       가능 단계까지 오르고 · 버튼이 사라지고 · 레드닷이 꺼지고 · **localStorage 에 저장**된다.
 *   [D] 탭 독립 — 무기를 일괄 강화해도 펫·유물 단계는 한 칸도 안 움직인다. 이어서 펫 탭을
 *       눌러 다시 일괄 강화가 된다(지시 원문의 «무기 탭 … 펫 탭 …» 순서 그대로).
 *   [E] 과교정 잠금 — 강화할 게 없으면 버튼이 **통째로 없고**(display:none) 목록 아래 패딩이
 *       원래 값(40px) 이며 첫 세트 블록 top 이 레퍼런스 값 그대로다(레퍼런스 화면 1px 불변).
 *   [F] 회귀 — 세트별 `[강화]` 는 여전히 «한 번에 한 단계» 다(266 이 넣은 `quiet` 인자가 기존
 *       경로를 바꾸지 않는다) + 그 경로의 토스트가 그대로 뜬다.
 *   [G] 라벨 «(n)» == `collTabPend(tab)` == 실제로 오른 단계 합.
 *   [H] 콘솔 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const TABS = ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'];
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderColl21 === 'function');
  await page.waitForTimeout(600);

  /* ── [0] 설치 확인 ─────────────────────────────────────────────────────────
     LESSONS 254 — 되돌린 트리에서 게이트가 **FAIL 이 아니라 TimeoutError 로 죽으면** 가장
     잡아야 할 회귀에서 아무것도 못 잡는다. 부품이 없으면 여기서 빨갛게 끝낸다. */
  {
    const have = await page.evaluate(() => ({
      pend: typeof collTabPend === 'function',
      up: typeof collUpAll === 'function',
      btn: !!document.getElementById('collAll'),
    }));
    ok(have.pend, '0A `collTabPend()` 가 있다');
    ok(have.up, '0B `collUpAll()` 가 있다');
    ok(have.btn, '0C `#collAll` 버튼이 마크업에 있다');
    if (!have.pend || !have.up || !have.btn) {
      await browser.close();
      console.log('\nVERIFY266 ' + pass + '/' + (pass + fail) + ' FAIL — 266 이 설치돼 있지 않다(이후 항목 생략)');
      process.exit(1);
    }
  }

  /* 화면 상태를 만드는 헬퍼 — `lv` 를 전 아이템에 주고 도감 단계를 0 으로 되돌린다.
     lv 0 이면 어떤 세트도 강화 불가(= 신규 유저) 다. */
  const setup = (lv, tab) => page.evaluate(([lv, tab]) => {
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => {
      if (lv) S.own[it.id] = { l: lv, n: 0 }; else delete S.own[it.id];
    });
    S.coll = {};
    openColl21(tab);
  }, [lv, tab]);

  const read = () => page.evaluate(() => {
    const b = document.getElementById('collAll');
    const lab = b.querySelector('b');
    const rb = b.getBoundingClientRect(), rl = lab.getBoundingClientRect();
    const cl = document.querySelector('.cl').getBoundingClientRect();
    const tabs = document.querySelector('.cl-tabs').getBoundingClientRect();
    const first = document.querySelector('#collList .clb');
    const dot = document.querySelector('#collTabs .cltab[data-ct="' + collTab + '"]');
    return {
      tab: collTab,
      shown: getComputedStyle(b).display !== 'none',
      ready: collTabReady(collTab),
      pend: collTabPend(collTab),
      text: b.textContent,
      fs: parseFloat(getComputedStyle(lab).fontSize),
      pad: getComputedStyle(document.getElementById('collList')).paddingBottom,
      btn: { x: rb.x, y: rb.y, w: rb.width, h: rb.height, cx: rb.x + rb.width / 2, bottom: rb.bottom },
      lab: { x: rl.x, w: rl.width, right: rl.right },
      cl: { top: cl.top, bottom: cl.bottom },
      tabsTop: tabs.top,
      firstTop: first ? +first.getBoundingClientRect().top.toFixed(1) : null,
      alert: dot ? dot.classList.contains('alert') : null,
      steps: COLL_SETS.filter(s => s.tab === collTab).map(s => collStep(s.key)),
      caps: COLL_SETS.filter(s => s.tab === collTab).map(s => collCap(s)),
    };
  });

  /* ── [A] 표시 조건 = collTabReady 와 1:1 ───────────────────────────────────── */
  /* lv 6 = 세트마다 6단계까지 가능(COLL_MAX_STEP 이내) · 유물까지 전 탭이 ready */
  await setup(6, 'weapon');
  for (const t of TABS) {
    await page.evaluate(tab => { collTab = tab; renderColl21(); }, t);
    const r = await read();
    ok(r.shown === r.ready && r.ready === true, 'A1 ' + t + ' — 강화 가능 → 버튼 보임',
      'shown=' + r.shown + ' ready=' + r.ready);
  }
  /* 아무것도 보유하지 않은 상태 = 어떤 탭도 강화 불가 */
  await setup(0, 'weapon');
  for (const t of TABS) {
    await page.evaluate(tab => { collTab = tab; renderColl21(); }, t);
    const r = await read();
    ok(r.shown === r.ready && r.ready === false, 'A2 ' + t + ' — 강화 불가 → 버튼 없음',
      'shown=' + r.shown + ' ready=' + r.ready);
  }
  /* 부분 상태 — 무기만 올린다. 무기 탭만 켜져야 한다. */
  await page.evaluate(() => {
    [].concat(SKILLS, EQUIPS, PETS, RELICS).forEach(it => { delete S.own[it.id]; });
    EQUIPS.filter(e => e.slot === 'weapon').forEach(e => { S.own[e.id] = { l: 4, n: 0 }; });
    S.coll = {}; openColl21('weapon');
  });
  {
    const on = [];
    for (const t of TABS) {
      await page.evaluate(tab => { collTab = tab; renderColl21(); }, t);
      const r = await read();
      if (r.shown) on.push(t);
      if (r.shown !== r.ready) ok(false, 'A3 ' + t + ' — 표시 == collTabReady', 'shown=' + r.shown + ' ready=' + r.ready);
    }
    ok(on.length === 1 && on[0] === 'weapon', 'A3 부분 상태 — 무기 탭에서만 버튼', 'on=[' + on + ']');
  }

  /* ── [B] 배치·크기 ────────────────────────────────────────────────────────── */
  await setup(6, 'weapon');
  {
    const r = await read();
    ok(near(r.btn.cx, 540, 0.5), 'B1 가로 가운데 — 프레임 중심 540', 'cx=' + r.btn.cx.toFixed(1));
    ok(near(r.btn.w, 380, 0.5) && near(r.btn.h, 130, 0.5), 'B2 크기 380×130',
      r.btn.w.toFixed(1) + '×' + r.btn.h.toFixed(1));
    ok(r.btn.bottom <= r.tabsTop, 'B3 «탭들 위» — 버튼 하단이 깃발탭 상단 위',
      'btn.bottom=' + r.btn.bottom.toFixed(1) + ' tabsTop=' + r.tabsTop.toFixed(1));
    ok(r.btn.y > r.cl.top && r.btn.bottom < r.cl.bottom, 'B4 모달 «안»',
      'cl=' + r.cl.top.toFixed(1) + '..' + r.cl.bottom.toFixed(1));
    ok(near(r.fs, 46.6, 0.1), 'B5 라벨 46.6px (22 [모두 받기] 통일 기준)', 'fs=' + r.fs);
    ok(r.lab.x >= r.btn.x + 8 && r.lab.right <= r.btn.x + r.btn.w - 8,
      'B6 라벨 넘침 0 (좌우 8px 이상 여유)',
      'lab=' + r.lab.x.toFixed(1) + '..' + r.lab.right.toFixed(1) + ' btn=' + r.btn.x.toFixed(1) + '..' + (r.btn.x + r.btn.w).toFixed(1));
    /* 워스트 라벨(탭 최대 단계 합)로도 안 넘친다 */
    const worst = await page.evaluate(() => {
      const b = document.getElementById('collAll');
      const keep = b.innerHTML;
      b.innerHTML = '<b>일괄 강화 (80)</b>';
      const rl = b.querySelector('b').getBoundingClientRect(), rb = b.getBoundingClientRect();
      const out = { fits: rl.x >= rb.x + 8 && rl.right <= rb.right - 8, w: rl.width };
      b.innerHTML = keep;
      return out;
    });
    ok(worst.fits, 'B7 워스트 라벨 «일괄 강화 (80)» 도 안 넘침', 'labW=' + worst.w.toFixed(1));
  }

  /* ── [G] 라벨 «(n)» == collTabPend ────────────────────────────────────────── */
  {
    const r = await read();
    const m = /\((\d+)\)/.exec(r.text);
    ok(!!m && +m[1] === r.pend, 'G1 라벨 (n) == collTabPend', r.text + ' / pend=' + r.pend);
    ok(r.pend > 0 && r.pend === r.caps.reduce((a, c, i) => a + (c - r.steps[i]), 0),
      'G2 pend == Σ(가능 단계 − 받은 단계)', 'pend=' + r.pend);
  }

  /* ── [C][D] 실동작 — 진짜 포인터 클릭 ─────────────────────────────────────── */
  await setup(6, 'weapon');
  const before = await page.evaluate(() => ({
    weapon: COLL_SETS.filter(s => s.tab === 'weapon').map(s => collStep(s.key)),
    pet: COLL_SETS.filter(s => s.tab === 'pet').map(s => collStep(s.key)),
    relic: COLL_SETS.filter(s => s.tab === 'relic').map(s => collStep(s.key)),
    pend: collTabPend('weapon'),
  }));
  await page.click('#collAll');
  await page.waitForTimeout(250);
  {
    /* 세트마다 토스트를 띄우면 8장이 쌓인다(그나마 fxToast 가 4장에서 잘라 버린다) —
       일괄은 «합계 한 장» 이어야 한다. `quiet` 인자가 실제로 먹었는지를 화면으로 잡는 항목. */
    const toast = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.fx-toast')];
      return { n: t.length, txt: t.map(e => e.textContent).join(' | ') };
    });
    ok(toast.n === 1 && /48\s*단계/.test(toast.txt), 'C7 토스트는 «합계» 한 장뿐',
      'n=' + toast.n + ' txt=' + toast.txt);
    const r = await read();
    ok(r.steps.every((s, i) => s === r.caps[i]), 'C1 무기 탭 전 세트가 가능 단계까지 올랐다',
      'steps=[' + r.steps + '] caps=[' + r.caps + ']');
    const gained = r.steps.reduce((a, s) => a + s, 0) - before.weapon.reduce((a, s) => a + s, 0);
    ok(gained === before.pend, 'C2 오른 단계 합 == 누르기 전 라벨 (n)', gained + ' vs ' + before.pend);
    ok(!r.shown, 'C3 누른 뒤 버튼이 사라진다(더 올릴 게 없다)', 'shown=' + r.shown);
    ok(r.alert === false, 'C4 그 탭 레드닷 소등', 'alert=' + r.alert);
    ok(r.pad === '40px', 'C5 버튼이 사라지면 목록 아래 패딩도 원복', 'pad=' + r.pad);
  }
  {
    const saved = await page.evaluate(() => {
      const raw = Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v && v.indexOf('"coll"') >= 0);
      if (!raw) return null;
      try { return JSON.parse(raw).coll; } catch (_) { return null; }
    });
    const live = await page.evaluate(() => COLL_SETS.filter(s => s.tab === 'weapon')
      .map(s => [s.key, collStep(s.key)]));
    ok(!!saved && live.every(([k, v]) => (saved[k] | 0) === v),
      'C6 localStorage 에 저장됐다(새로고침해도 남는다)',
      saved ? live.map(([k, v]) => k + '=' + v + '/' + (saved[k] | 0)).join(' ') : 'no save');
  }
  {
    const after = await page.evaluate(() => ({
      pet: COLL_SETS.filter(s => s.tab === 'pet').map(s => collStep(s.key)),
      relic: COLL_SETS.filter(s => s.tab === 'relic').map(s => collStep(s.key)),
    }));
    ok(JSON.stringify(after.pet) === JSON.stringify(before.pet)
      && JSON.stringify(after.relic) === JSON.stringify(before.relic),
      'D1 다른 탭(펫·유물) 단계는 한 칸도 안 움직였다',
      'pet=[' + after.pet + '] relic=[' + after.relic + ']');
  }
  /* 지시 원문 그대로 — 이어서 «펫 탭 클릭 → 일괄강화» */
  await page.click('#collTabs .cltab[data-ct="pet"]');
  await page.waitForTimeout(200);
  {
    const r = await read();
    ok(r.tab === 'pet' && r.shown, 'D2 펫 탭으로 갈아타면 버튼이 다시 뜬다',
      'tab=' + r.tab + ' shown=' + r.shown);
    await page.click('#collAll');
    await page.waitForTimeout(250);
    const r2 = await read();
    ok(r2.steps.every((s, i) => s === r2.caps[i]) && !r2.shown,
      'D3 펫 탭도 일괄 강화된다', 'steps=[' + r2.steps + '] shown=' + r2.shown);
  }

  /* ── [E] 과교정 잠금 — 버튼이 없을 때 레퍼런스 화면 불변 ──────────────────── */
  await setup(0, 'weapon');
  {
    const r = await read();
    ok(!r.shown, 'E1 강화할 게 없으면 버튼이 통째로 없다(display:none)');
    ok(r.pad === '40px', 'E2 목록 아래 패딩 = 21 측정표 값 40px', 'pad=' + r.pad);
    /* 측정표 §«6회차» — 첫 블록 헤더 상단 프레임 412.5 (ref 495.5 − 84 + 1) */
    ok(r.firstTop !== null && near(r.firstTop, 412.5, 1.5),
      'E3 첫 세트 블록 top 이 레퍼런스 값 그대로', 'firstTop=' + r.firstTop);
    const hidden = await page.evaluate(() => !document.getElementById('collw').classList.contains('upall'));
    ok(hidden, 'E4 `#collw.upall` 도 안 붙는다(패딩 규칙이 잠들어 있다)');
  }

  /* ── [F] 회귀 — 세트별 [강화] 는 여전히 한 단계씩 + 토스트 ────────────────── */
  await setup(6, 'weapon');
  {
    const r0 = await page.evaluate(() => {
      const st = COLL_SETS.find(s => s.tab === 'weapon');
      return { key: st.key, step: collStep(st.key), cap: collCap(st) };
    });
    await page.click('#collList .clb-btn.rdy');
    await page.waitForTimeout(250);
    const r1 = await page.evaluate(k => {
      const t = [...document.querySelectorAll('.fx-toast')];
      return { step: collStep(k), n: t.length, txt: t.map(e => e.textContent).join(' | '),
               name: COLL_SET[k].n };
    }, r0.key);
    ok(r1.step === r0.step + 1, 'F1 세트별 [강화] 는 한 번에 한 단계',
      r0.step + ' → ' + r1.step + ' (cap ' + r0.cap + ')');
    ok(r1.n === 1 && r1.txt.indexOf(r1.name) >= 0 && /1\s*단계/.test(r1.txt),
      'F2 그 경로의 «세트명 + n단계» 토스트가 그대로다', 'txt=' + r1.txt);
  }

  /* ── [H] 콘솔 ─────────────────────────────────────────────────────────────── */
  ok(errs.length === 0, 'H1 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY266 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
