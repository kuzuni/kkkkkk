#!/usr/bin/env node
/* 게이트 — 작업 320 「승급전 팝업 기준 표시 = «권장 스테이지» 한 줄」
 *          + 작업 323 「권장 기준 도달 시 [승급전 시작]·[승급전 도전] 버튼에 레드닷」
 *          (저장소 주인 지시 2026-08-28)
 *
 *   node tools/verify320.js
 *
 * 지키는 성질
 *   [A] 320 — 승급전 팝업 본문에 «최고 스테이지»·«전투력 n / n» 대비 표기가 **0건**이고
 *             «권장 스테이지 <다음 계급 stage>» 가 **1건**이다. 모든 계급에서.
 *             되돌림 시험: 옛 두 줄이 되살아나면 즉시 FAIL 이다.
 *             남색 상자(#0e1428) 위 잉크가 실제로 밝은지도 본다 — 갈색 `.mbody p b` 로
 *             돌아가면 «있는데 안 보이는» 179 결함이 재발한다(화소 판정).
 *   [B] 323 — 두 버튼(#pgo 팝업 · #promoBtn 내 정보)에 «권장 충족» 이면 레드닷이
 *             «논리 + 화소» 로 켜지고, 미달이면 노드 자체가 없다(166 규약).
 *             299 규약 — 배지 중심이 버튼 우상단 사분면.
 *             음성 — 승급에 성공하면 다음 계급 기준으로 저절로 꺼진다.
 *   [C] 회귀 — promoReady() 정의는 그대로(320 은 «표시만» 바꾼다) ·
 *             267 규약(라벨은 b 태그, 팝업 버튼 1개)이 배지 추가로 안 깨진다 ·
 *             295 회귀(버튼 두 줄에 조건부 disabled 없음).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* 배지 하나의 «논리 + 화소» — 318 이 쓰는 그 도구 그대로(안 보이면 red = 0). */
async function badge(page, sel) {
  const s = await page.evaluate((q) => {
    const e = document.querySelector(q);
    if (!e) return { exists: false };
    const prevA = e.style.animation; e.style.animation = 'none';
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const out = { exists: true, display: cs.display, rect: [r.left, r.top, r.width, r.height] };
    e.style.animation = prevA;
    return out;
  }, sel);
  if (!s.exists) return { exists: false, red: 0 };
  const [x, y, w, h] = s.rect;
  s.red = 0;
  if (w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H) {
    const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
    s.red = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 130) n++;
      return n;
    }, buf.toString('base64'));
  }
  return s;
}

/* 요소 잉크의 «밝기» — 남색 상자 위 글자가 실제로 밝은지(179 결함 재발 감시). */
async function inkBright(page, sel) {
  const r = await page.evaluate(q => {
    const e = document.querySelector(q); if (!e) return null;
    const b = e.getBoundingClientRect();
    return [b.left, b.top, b.width, b.height];
  }, sel);
  if (!r || r[2] < 1 || r[3] < 1) return { n: 0, bright: 0 };
  const buf = await page.screenshot({ clip: { x: Math.floor(r[0]), y: Math.floor(r[1]), width: Math.ceil(r[2]), height: Math.ceil(r[3]) } });
  return await page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      n++; if (lum > 150) bright++;
    }
    return { n, bright };
  }, buf.toString('base64'));
}

async function boot(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPromo === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 정지 — 화소 판정 안정화 */
  return { page, errs };
}

/* 권장 기준을 «넉넉히 넘기는» / «못 미치는» 상태를 만든다(verify179·208 이 쓰는 방식).
   `stat` 은 전부 getter 라 따로 재계산할 게 없다.
   ⚠ 상위 계급은 강화 레벨만으로 전투력을 못 만든다 — `lv()` 가 `S.lv[id] | 0`(32비트) 라
   레벨이 2^31 에서 잘리고 cp() 는 ≈3.5e12 에서 멈추는데, 마스터 이상 기준은 8e14~2e21 이다.
   그 계급에서는 **기준치 쪽을 잠깐 0 으로 내려** 「충족」 상태를 만든다(원복은 이 함수가 한다).
   320·323 이 지키는 것은 «판정 결과 → 표시» 이지 «전투력 곡선» 이 아니다. */
const reach = (want) => {
  closeModal();
  RANKS.forEach((r, i) => { r.cp = window.__CP0[i]; });    /* 앞 회차의 완화 원복 */
  const nx = nextRank();
  let relaxed = false;
  if (want) {
    S.best = Math.max(S.best, nx.stage); S.stage = S.best;
    let L = Math.min(2e9, Math.max(1000, Math.ceil(nx.cp / 1000)));
    S.lv.atk = L; S.lv.hp = L; S.lv.regen = L;
    for (let i = 0; i < 40 && cp() < nx.cp && L < 2e9; i++) {
      L = Math.min(2e9, L * 2); S.lv.atk = L; S.lv.hp = L; S.lv.regen = L;
    }
    if (cp() < nx.cp) { nx.cp = 0; relaxed = true; }
  } else {
    S.best = 1; S.stage = 1; S.lv.atk = 0; S.lv.hp = 0; S.lv.regen = 0;
  }
  return { ready: promoReady(), best: S.best, need: nx.stage, cp: cp(), needCp: nx.cp, relaxed };
};

(async () => {
  const browser = await launch(chromium);
  const code = fs.readFileSync(SRC, 'utf8');

  /* ══ [C0] 소스 회귀 — 320 은 «표시만» 바꾼다 ═══════════════════════════════ */
  const defRdy = (code.match(/const promoReady\s*=[^\n]*/) || [''])[0];
  ok(/S\.best/.test(defRdy) && /cp\(\)/.test(defRdy) && /nextRank\(\)/.test(defRdy),
    '[C0] 320 은 판정을 안 건드렸다 — promoReady() 가 여전히 두 조건을 본다', defRdy.trim().slice(0, 100));
  ok(/sideAlert\('promo',\s*promoReady\(\)\)/.test(code),
    "[C0] 295 회귀 — sideAlert('promo', promoReady()) 그대로");
  const btnLines = code.split('\n').filter(l => /id="(promoBtn|pgo)"/.test(l));
  ok(btnLines.length === 2 && btnLines.every(l => !/disabled/.test(l)),
    '[C0] 295 회귀 — 버튼 마크업 2줄에 조건부 disabled 없음', btnLines.length + '줄');

  /* ══ A/B. 계급을 돌면서 표기와 배지를 같이 본다 ═════════════════════════════ */
  const { page, errs } = await boot(browser, { gold: 5e8, dia: 50000, best: 30, totalKills: 5000 });
  const ranks = await page.evaluate(() => { window.__CP0 = RANKS.map(r => r.cp); return RANKS.length; });

  for (let ri = 1; ri <= ranks - 1; ri++) {
    const tag = '계급 ' + ri;

    /* ── 미달 상태 ───────────────────────────────────────────────────────── */
    await page.evaluate(r => { closeModal(); S.rank = r - 1; }, ri);
    const lo = await page.evaluate(reach, false);
    await page.evaluate(() => openPromo());
    await page.waitForTimeout(220);
    const off = await page.evaluate(() => {
      const mb = document.querySelector('#modal .mbody');
      const cond = mb.querySelector('.pr-cond');
      const g = document.getElementById('pgo');
      return {
        condTxt: (cond ? cond.textContent : '').replace(/\s+/g, ' ').trim(),
        condPs: cond ? cond.querySelectorAll('p').length : -1,
        bodyTxt: mb.textContent.replace(/\s+/g, ' '),
        alert: g ? g.classList.contains('alert') : null,
        dots: g ? g.querySelectorAll('.updot').length : -1,
        btns: document.querySelectorAll('#modal button').length,
        hasB: g ? !!g.querySelector('b') : false,
      };
    });
    ok(lo.ready === false, '[B] ' + tag + ' 미달 상태를 만들었다 (판정 재료)',
      'best ' + lo.best + '/' + lo.need + ' · cp ' + lo.cp + '/' + lo.needCp);
    ok(off.condPs === 1, '[A] ' + tag + ' — 조건 상자는 «한 줄»(p 1개)', String(off.condPs));
    ok(/^권장 스테이지 /.test(off.condTxt) && off.condTxt.indexOf(String(lo.need)) >= 0,
      '[A] ' + tag + ' — «권장 스테이지 ' + lo.need + '» 한 줄', off.condTxt);
    ok(!/최고 스테이지/.test(off.bodyTxt), '[A] ' + tag + ' — 본문에 «최고 스테이지» 0건 (되돌림 감시)');
    ok(!/전투력/.test(off.bodyTxt), '[A] ' + tag + ' — 본문에 «전투력» 대비 표기 0건 (되돌림 감시)');
    ok(off.dots === 0 && off.alert === false,
      '[B] ' + tag + ' 미달 — [승급전 시작] 배지 노드 0개 · .alert 없음',
      '닷 ' + off.dots + ' · alert ' + off.alert);
    ok(off.btns === 1 && off.hasB,
      '[C] ' + tag + ' — 267 회귀: 팝업 버튼 1개 · 라벨이 b 태그 안', '버튼 ' + off.btns);

    /* ── 충족 상태 ───────────────────────────────────────────────────────── */
    await page.evaluate(() => closeModal());
    const hi = await page.evaluate(reach, true);
    await page.evaluate(() => openPromo());
    await page.waitForTimeout(420);
    const on = await page.evaluate(() => {
      const g = document.getElementById('pgo');
      const d = g && g.querySelector('.updot');
      let quad = null;
      if (d) {
        const pa = d.style.animation; d.style.animation = 'none';
        const dr = d.getBoundingClientRect(), hr = g.getBoundingClientRect();
        d.style.animation = pa;
        quad = { cx: dr.left + dr.width / 2 - hr.left, cy: dr.top + dr.height / 2 - hr.top, hw: hr.width, hh: hr.height };
      }
      const cond = document.querySelector('#modal .pr-cond');
      return {
        alert: g ? g.classList.contains('alert') : null,
        dots: g ? g.querySelectorAll('.updot').length : -1,
        condTxt: (cond ? cond.textContent : '').replace(/\s+/g, ' ').trim(),
        condPs: cond ? cond.querySelectorAll('p').length : -1,
        quad,
      };
    });
    ok(hi.ready === true, '[B] ' + tag + ' 충족 상태를 만들었다 (판정 재료)',
      'best ' + hi.best + '/' + hi.need + ' · cp ' + hi.cp + '/' + hi.needCp
      + (hi.relaxed ? ' · 기준 완화(32비트 레벨 상한)' : ''));
    ok(on.condPs === 1 && /^권장 스테이지 /.test(on.condTxt),
      '[A] ' + tag + ' 충족일 때도 «권장 스테이지» 한 줄 그대로', on.condTxt);
    ok(on.alert === true && on.dots === 1,
      '[B] ' + tag + ' 충족 — [승급전 시작] 에 레드닷 1개', 'alert ' + on.alert + ' · 닷 ' + on.dots);
    ok(on.quad && on.quad.cx > on.quad.hw / 2 && on.quad.cy < on.quad.hh / 2,
      '[B] ' + tag + ' — 299 규약: 배지 중심이 버튼 우상단 사분면',
      on.quad ? 'cx ' + on.quad.cx.toFixed(1) + '/' + on.quad.hw.toFixed(0)
              + ' · cy ' + on.quad.cy.toFixed(1) + '/' + on.quad.hh.toFixed(0) : '없음');

    if (ri === 1 || ri === ranks - 1) {
      const b = await badge(page, '#pgo > .updot');
      ok(b.exists && b.display === 'block' && b.red > 100,
        '[B] ' + tag + ' — 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + b.display + ' 빨강=' + b.red + '화소');
      const ink = await inkBright(page, '#modal .pr-cond p b');
      ok(ink.bright > 0, '[A] ' + tag + ' — 남색 상자 위 «권장 스테이지» 숫자가 밝게 찍힌다(179 결함 재발 감시)',
        '밝은 화소 ' + ink.bright + '/' + ink.n);
    }

    /* ── 166 호스트 감사 — .alert 를 떼면 꺼진다 ─────────────────────────── */
    const audit = await page.evaluate(() => {
      const g = document.getElementById('pgo'), e = g && g.querySelector('.updot');
      if (!e) return null;
      g.classList.remove('alert'); const o = getComputedStyle(e).display;
      g.classList.add('alert');    const n = getComputedStyle(e).display;
      return { off: o, on: n };
    });
    ok(audit && audit.off === 'none' && audit.on === 'block',
      '[B] ' + tag + ' — .ifbtn.pbtn>.updot 는 .alert 없으면 꺼짐 / 있으면 켜짐',
      audit ? audit.off + ' → ' + audit.on : '없음');
    await page.evaluate(() => closeModal());
  }

  /* ══ [B2] «내 정보» 탭 [승급전 도전] ═══════════════════════════════════════ */
  await page.evaluate(() => { closeModal(); S.rank = 0; });
  await page.evaluate(reach, false);
  /* 이 패널은 탭 매핑이 가리키지 않는 자리라 화면에서 저절로 열리지 않는다 —
     계측을 위해 여기서만 펴 준다(verify267 [D]·fnchk198 과 같은 방식). */
  await page.evaluate(() => {
    renderSt();
    document.getElementById('panel').style.display = 'flex';
    document.getElementById('bSt').classList.add('on');
  });
  await page.waitForTimeout(500);
  const stOff = await page.evaluate(() => {
    const b = document.getElementById('promoBtn');
    return { exists: !!b, dots: b ? b.querySelectorAll('.updot').length : -1,
             alert: b ? b.classList.contains('alert') : null };
  });
  ok(stOff.exists, '[B2] 내 정보 탭에 [승급전 도전] 버튼이 있다');
  ok(stOff.dots === 0 && stOff.alert === false,
    '[B2] 내 정보 미달 — [승급전 도전] 배지 0개', '닷 ' + stOff.dots + ' · alert ' + stOff.alert);

  await page.evaluate(reach, true);
  await page.evaluate(() => { renderSt(); });
  await page.waitForTimeout(450);
  const stOn = await page.evaluate(() => {
    const b = document.getElementById('promoBtn'), d = b && b.querySelector('.updot');
    let quad = null;
    if (d) {
      const pa = d.style.animation; d.style.animation = 'none';
      const dr = d.getBoundingClientRect(), hr = b.getBoundingClientRect();
      d.style.animation = pa;
      quad = { cx: dr.left + dr.width / 2 - hr.left, cy: dr.top + dr.height / 2 - hr.top, hw: hr.width, hh: hr.height };
    }
    return { dots: b ? b.querySelectorAll('.updot').length : -1,
             alert: b ? b.classList.contains('alert') : null,
             cls: b ? b.className : '', hasB: b ? !!b.querySelector('b') : false, quad };
  });
  ok(stOn.dots === 1 && stOn.alert === true,
    '[B2] 내 정보 충족 — [승급전 도전] 에 레드닷 1개', '닷 ' + stOn.dots + ' · alert ' + stOn.alert);
  ok(/\bifbtn\b/.test(stOn.cls) && /\bpbtn\b/.test(stOn.cls) && stOn.hasB,
    '[C] 267 회귀 — [승급전 도전] 이 여전히 .ifbtn.pbtn + b 태그 라벨', stOn.cls);
  ok(stOn.quad && stOn.quad.cx > stOn.quad.hw / 2 && stOn.quad.cy < stOn.quad.hh / 2,
    '[B2] 299 규약 — 배지 중심이 버튼 우상단 사분면',
    stOn.quad ? 'cx ' + stOn.quad.cx.toFixed(1) + '/' + stOn.quad.hw.toFixed(0)
              + ' · cy ' + stOn.quad.cy.toFixed(1) + '/' + stOn.quad.hh.toFixed(0) : '없음');
  const stB = await badge(page, '#promoBtn > .updot');
  ok(stB.exists && stB.display === 'block' && stB.red > 100,
    '[B2] 내 정보 배지가 «논리 + 화소» 로 실제 보인다', 'display=' + stB.display + ' 빨강=' + stB.red + '화소');

  /* ══ [B3] 음성 — 승급에 성공하면 다음 계급 기준으로 저절로 꺼진다 ══════════ */
  const after = await page.evaluate(() => {
    const r0 = S.rank;
    promo = { t: BOSS_SEC, max: BOSS_SEC, rank: nextRank() };
    endPromo(true);                                  /* 실제 승급 경로 */
    renderSt();
    const b = document.getElementById('promoBtn');
    return { r0, r1: S.rank, ready: promoReady(),
             dots: b ? b.querySelectorAll('.updot').length : -1,
             alert: b ? b.classList.contains('alert') : null };
  });
  await page.waitForTimeout(350);
  ok(after.r1 === after.r0 + 1, '[B3] 실제로 승급했다 (S.rank +1)', after.r0 + ' → ' + after.r1);
  ok(after.ready === false, '[B3] 다음 계급 기준으로는 미달이다 (판정 재료)');
  ok(after.dots === 0 && after.alert === false,
    '[B3] 음성 — 승급 직후 [승급전 도전] 배지 꺼짐', '닷 ' + after.dots + ' · alert ' + after.alert);
  const goAfter = await page.evaluate(() => {
    openPromo();
    const g = document.getElementById('pgo');
    return { dots: g ? g.querySelectorAll('.updot').length : -1, alert: g ? g.classList.contains('alert') : null };
  });
  await page.waitForTimeout(250);
  ok(goAfter.dots === 0 && goAfter.alert === false,
    '[B3] 음성 — 승급 직후 [승급전 시작] 배지도 꺼짐', '닷 ' + goAfter.dots + ' · alert ' + goAfter.alert);
  await page.evaluate(() => closeModal());

  ok(errs.length === 0, '[D] 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY320 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
