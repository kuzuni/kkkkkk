#!/usr/bin/env node
/* 게이트 — 작업 426 「31 던전 클리어 «클리어 보상» 묶음의 앵커를 **프레임 세로 중앙**으로」
 *          (저장소 주인 지시 2026-08-30 — «던전 클리어 보상 앵커? 피벗? 그거가 화면 중앙으로
 *           되있어야할듯. 하단 말고»)
 *
 *   node tools/verify426.js
 *
 * 지키는 성질: **묶음은 어떤 프레임에서도 세로 중앙에 걸리고, 묶음 «안» 은 한 픽셀도 안 바뀐다.**
 *   [A] 구조 — 묶음 자리 전부가 `.dcl-grp` **한 컨테이너 안**이다(딤 `#dclw` 직속으로 새어 나간
 *       자리가 하나라도 있으면 그 자리만 프레임 상단에 남아 «묶음» 이 깨진다)
 *   [B] 앵커 — 프레임 3종(2280·1920·1600)에서 묶음 bbox 중심 y = **VH/2 ±2px**
 *       ⚠ 수리 전 실측(`tools/probe426.js`): 중심이 **1114 로 고정**이라 Δ 가 2280 −26 · 1920 +154 ·
 *          1600 **+314**(하단 몰림) 이었다. 이 항은 «옮겼다» 가 아니라 «앵커가 생겼다» 는 뜻이다.
 *   [C] 묶음 안 불변 — 자리끼리의 상대 Δ(밴드 기준)가 세 프레임에서 **완전히 같다**.
 *       측정표 31 §1-C 의 값(리본 top ↔ 밴드 top = −71 · 타일 +116 · 확인 버튼 +522 …)을 직접 단언한다.
 *   [D] 닿나 — 406 규약. 1600 에서도 묶음이 상단 HUD(`.pedge`)·하단 탭바(`#tabbar`)에 안 닿는다.
 *       ⚠ 수리 전 1600 에서 묶음 하변 1510 이 탭바 상변 1420 을 **90px** 넘었다.
 *   [E] 클릭 닫힘 — 딤 빈 면을 누르면 닫힌다. **묶음을 «높이 있는 상자» 로 싸면 이 항이 빨개진다** —
 *       `#dclw` 는 `e.target === #dclw` 로만 닫히기 때문이다(그래서 `.dcl-grp` 는 height 0 이다).
 *   [F] 339 동승 — «연속 도전» 토글·카운트다운이 묶음과 **같이** 움직인다(밴드 기준 Δ 불변).
 *   [G] 화소 — 세로 중앙 행(y = VH/2)에 밴드 채움색이 실제로 찍힌다. «CSS 는 맞는데 안 보인다» 를 막는다.
 *   [R] 되돌림 시험 — `.dcl-grp` 의 앵커를 옛 값(`top:0`)으로 되돌리면 [B] 가 **실제로 빨개진다**.
 *       이 항이 없으면 «무르게 푼 게이트» 다(334 교훈). 걷으면 다시 초록인 것까지 센다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «프레임 → 기하» 판정이라 비평가를 띄우지 않는다.
 *   ⚑ 2280 에서 묶음이 ref 대비 26px 내려가는 것은 **주인 지시에 따른 의도적 이탈**이다
 *     (측정표 31 §1-C 정오표 · 360 선례) — 그래서 이 자는 «ref y − 84» 절대값을 묻지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const W = 1080;
const FRAMES = [2280, 1920, 1600];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = n => Math.round(n * 10) / 10;

/* 묶음을 이루는 자리 — 측정표 31 §1-C. `.dcl-grp` 안에 전부 들어 있어야 한다([A]). */
const PARTS = [
  ['스파클', '.dcl-spk'], ['리본 그룹', '.upr-grp'], ['밴드', '.dcl-band'],
  ['보상 타일', '.dcl-tile'], ['보상 아이콘', '#dclIc'], ['수량', '.dcl-amt'],
  ['연속 도전 줄', '.dcl-auto'], ['카운트다운', '.dcl-cd'],
  ['알약 좌', '.dcl-pill.l'], ['알약 우', '.dcl-pill.r'], ['티켓 좌', '.dcl-tk.l'],
  ['[재도전]', '#dclRe'], ['[확인]', '#dclOk'], ['[다음]', '#dclNx'],
];

/* 측정표 31 §1-C 의 «밴드 top 기준» 상대 Δ — 묶음 안은 이 값에서 한 픽셀도 안 움직인다 */
const DELTA = {
  '스파클': -121, '리본 그룹': -71, '보상 타일': 116, '수량': 207,
  '연속 도전 줄': 364, '카운트다운': 416, '알약 좌': 492, '[재도전]': 538, '[확인]': 522,
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const snap = {};

  /* 한 프레임을 열고 재는 한 벌. revert 가 있으면 앵커를 그 값으로 갈아 끼운 뒤 잰다(§R). */
  async function measure(H, revertTop) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errs.push('[' + H + '] ' + m.text()); });
    page.on('pageerror', (e) => errs.push('[' + H + '] ' + String(e)));
    await page.goto(URL);
    await page.waitForTimeout(1100);

    const ev = async (fn, arg) => {
      try { return await page.evaluate(fn, arg); }
      catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
    };

    if (revertTop !== undefined) {
      await ev((t) => {
        const st = document.createElement('style');
        st.id = '__rv426'; st.textContent = '.dcl-grp{top:' + t + ' !important}';
        document.head.appendChild(st);
      }, revertTop);
    }

    /* 실제 진입점으로 연다 — 골드 던전 1층 클리어 + 339 «연속 도전» 켬(카운트다운까지 자리 잡게) */
    const opened = await ev(() => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      const d = DUNGEONS[0];
      S.dunTk[d.id] = 9; S.dun[d.id] = 3;
      openDunClear(d, 1, false, true);
      return true;
    });
    if (opened && opened.__err) { await ctx.close(); return { __err: opened.__err }; }
    /* ⚠ 60 쥬시의 등장 연출이 걷힐 때까지 기다린다 — 안 기다리면 [G] 가 «반쯤 투명한 밴드» 를
       읽어 색이 안 맞는다(1회차에 2280·1600 만 0px 이 나온 자리다. rect 는 연출 시작 전이라
       정확했고 캡처만 연출 한복판이었다 = «rect 와 캡처를 같은 순간에 잡아라» 350 교훈). */
    await page.waitForTimeout(700);

    const out = await ev((parts) => {
      const app = document.getElementById('app');
      const A = app.getBoundingClientRect();
      const res = { VH: +A.height.toFixed(1), parts: {}, loose: [], appTop: A.top, appLeft: A.left };
      for (const [nm, sel] of parts) {
        const el = document.querySelector('#dclw ' + sel);
        if (!el) { res.parts[nm] = null; continue; }
        const r = el.getBoundingClientRect();
        res.parts[nm] = { y: +(r.top - A.top).toFixed(1), h: +r.height.toFixed(1),
                          inGrp: !!el.closest('.dcl-grp') };
      }
      /* [A] 딤 직속으로 새어 나간 자리 — `.dcl-grp` 하나만 남아 있어야 한다 */
      res.loose = [...document.getElementById('dclw').children]
        .filter((c) => !c.classList.contains('dcl-grp'))
        .map((c) => c.className || c.tagName);
      const pe = document.querySelector('.pedge'), tb = document.getElementById('tabbar');
      const rr = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
        return { y: +(r.top - A.top).toFixed(1), h: +r.height.toFixed(1) }; };
      res.pedge = rr(pe); res.tabbar = rr(tb);
      res.cd = (document.getElementById('dclCd').textContent || '').trim();
      return res;
    }, parts0());

    if (out.__err) { await ctx.close(); return { __err: out.__err }; }

    /* [G] 세로 중앙 행에 밴드 채움색이 찍히는가 — «찍힌 픽셀» (350 처방) */
    const shot = await page.screenshot({ clip: { x: 0, y: out.appTop, width: W, height: out.VH } });
    const mid = await ev(async (b64) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const y = Math.round(img.height / 2);
      const d = c.getContext('2d').getImageData(0, y, img.width, 1).data;
      /* 밴드 채움 #2A2835 = (42,40,53). 딤 위 배경과 확실히 다르다. */
      let hit = 0;
      for (let x = 0; x < img.width; x++) {
        const i = x * 4;
        if (Math.abs(d[i] - 42) <= 3 && Math.abs(d[i + 1] - 40) <= 3 && Math.abs(d[i + 2] - 53) <= 3) hit++;
      }
      return { y, hit, w: img.width };
    }, shot.toString('base64'));

    /* [E] 딤 빈 면 클릭 → 닫힘. ⚠ **반드시 [G] 캡처 뒤**다 — 이 클릭이 화면을 닫는다. */
    const close = await ev(() => {
      const w = document.getElementById('dclw');
      const A = document.getElementById('app').getBoundingClientRect();
      const el = document.elementFromPoint(A.left + 40, A.top + 40);
      const hit = el ? (el.id || el.className || el.tagName) : 'none';
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { hit: String(hit), closed: !w.classList.contains('on') };
    });

    await ctx.close();
    return { ...out, close, mid };
  }

  function parts0() { return PARTS; }

  const bbox = (o) => {
    let top = Infinity, bot = -Infinity;
    for (const [nm] of PARTS) { const p = o.parts[nm]; if (!p || !p.h) continue; top = Math.min(top, p.y); bot = Math.max(bot, p.y + p.h); }
    return { top, bot, cy: (top + bot) / 2, h: bot - top };
  };

  console.log('작업 426 게이트 — 31 클리어 보상 묶음 앵커 = 프레임 세로 중앙\n');

  for (const H of FRAMES) {
    const m = await measure(H);
    if (m.__err) { ok(false, '[' + H + '] 화면 열기', m.__err); continue; }
    snap[H] = m;
  }
  if (Object.keys(snap).length !== FRAMES.length) {
    console.log('\nVERIFY426 ' + pass + '/' + (pass + fail) + ' FAIL');
    await browser.close(); process.exit(1);
  }

  /* ---- [A] 구조 ---- */
  const s0 = snap[2280];
  ok(s0.loose.length === 0, '[A] `#dclw` 직속에 남은 자리 0개 — 묶음 전부가 `.dcl-grp` 안이다',
     s0.loose.join(' | '));
  const outside = PARTS.filter(([nm]) => !s0.parts[nm] || !s0.parts[nm].inGrp).map(([nm]) => nm);
  ok(outside.length === 0, '[A] 묶음 자리 ' + PARTS.length + '개가 전부 `.dcl-grp` 안에 있다', outside.join(','));

  /* ---- [B] 앵커 ---- */
  for (const H of FRAMES) {
    const b = bbox(snap[H]), fc = snap[H].VH / 2;
    ok(Math.abs(b.cy - fc) <= 2,
       '[B] ' + H + ' — 묶음 중심 = 프레임 중심 ±2px',
       '중심 ' + r1(b.cy) + ' vs VH/2 ' + fc + ' (Δ ' + (b.cy - fc >= 0 ? '+' : '') + r1(b.cy - fc) + ')');
  }
  /* 수리 전 상태(중심 1114 고정)로는 절대 못 통과하는 항 — 세 프레임의 중심이 서로 달라야 한다 */
  const cys = FRAMES.map((H) => bbox(snap[H]).cy);
  ok(new Set(cys.map(r1)).size === FRAMES.length,
     '[B] 세 프레임의 묶음 중심이 서로 다르다 = 앵커가 프레임을 따라간다(고정 px 가 아니다)',
     cys.map(r1).join(' / '));

  /* ---- [C] 묶음 안 불변 ---- */
  for (const H of FRAMES) {
    const P = snap[H].parts, band = P['밴드'];
    let worst = 0, who = '';
    for (const nm of Object.keys(DELTA)) {
      const p = P[nm]; if (!p) { worst = 999; who = nm + '(없음)'; break; }
      const d = p.y - band.y;
      if (Math.abs(d - DELTA[nm]) > Math.abs(worst)) { worst = d - DELTA[nm]; who = nm; }
    }
    ok(Math.abs(worst) <= 0.6,
       '[C] ' + H + ' — 묶음 안 상대 Δ 가 측정표 31 §1-C 값 그대로',
       '최악 ' + r1(worst) + 'px (' + (who || '없음') + ')');
  }

  /* ---- [D] 닿나 (406 규약) ---- */
  for (const H of FRAMES) {
    const b = bbox(snap[H]), m = snap[H];
    const pe = m.pedge ? m.pedge.y + m.pedge.h : 0;
    const tb = m.tabbar ? m.tabbar.y : m.VH;
    ok(b.top >= pe && b.bot <= tb,
       '[D] ' + H + ' — 묶음이 HUD·탭바 어느 것에도 안 닿는다',
       '묶음 ' + r1(b.top) + '..' + r1(b.bot) + ' vs HUD 하변 ' + r1(pe) + ' · 탭바 상변 ' + r1(tb));
  }

  /* ---- [E] 클릭 닫힘 ---- */
  for (const H of FRAMES) {
    ok(snap[H].close.closed,
       '[E] ' + H + ' — 딤 빈 면 클릭으로 닫힌다(묶음 상자가 딤의 클릭을 안 가로챈다)',
       'elementFromPoint «' + snap[H].close.hit + '»');
  }

  /* ---- [F] 339 동승 ---- */
  for (const H of FRAMES) {
    const P = snap[H].parts, band = P['밴드'];
    const cd = P['카운트다운'], au = P['연속 도전 줄'];
    ok(!!(cd && au) && Math.abs((au.y - band.y) - DELTA['연속 도전 줄']) <= 0.6
       && Math.abs((cd.y - band.y) - DELTA['카운트다운']) <= 0.6 && snap[H].cd !== '',
       '[F] ' + H + ' — 339 토글·카운트다운이 묶음과 같이 움직인다',
       '토글 Δ' + r1(au.y - band.y) + ' · 카운트다운 Δ' + r1(cd.y - band.y) + ' «' + snap[H].cd + '»');
  }

  /* ---- [G] 화소 ---- */
  for (const H of FRAMES) {
    const m = snap[H].mid;
    ok(m && !m.__err && m.hit > W * 0.9,
       '[G] ' + H + ' — 세로 중앙 행(y=' + (m ? m.y : '?') + ')에 밴드 채움 #2A2835 이 실제로 찍힌다',
       m ? m.hit + '/' + m.w + 'px' : '측정 실패');
  }

  /* ---- [R] 되돌림 시험 ---- */
  const rv = await measure(1600, '0px');
  if (rv.__err) { ok(false, '[R] 되돌림 측정', rv.__err); }
  else {
    const b = bbox(rv), fc = rv.VH / 2;
    ok(Math.abs(b.cy - fc) > 2,
       '[R] 앵커를 옛 값(top:0 = 프레임 상단 고정)으로 되돌리면 [B] 가 실제로 빨개진다',
       '중심 ' + r1(b.cy) + ' vs VH/2 ' + fc + ' (Δ +' + r1(b.cy - fc) + ')');
    ok(Math.abs(b.cy - 1114) <= 2,
       '[R] 그 되돌림이 정확히 «수리 전» 값(중심 1114)을 재현한다 = 옮긴 것이 앵커 한 줄뿐이다',
       r1(b.cy));
  }
  const back = await measure(1600);
  ok(!back.__err && Math.abs(bbox(back).cy - back.VH / 2) <= 2,
     '[R] 되돌림을 걷으면 다시 초록 (시험이 상태를 안 남긴다)',
     back.__err ? back.__err : r1(bbox(back).cy));

  ok(errs.length === 0, '[전역] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY426 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
