#!/usr/bin/env node
/* 게이트 — 작업 325 「34 축복 카드 «받기» 알약: 레드닷(받을 수 있으면) + 알약 초록색」
 *          (저장소 주인 지시 2026-08-28 — «축복도 받기 버튼에 빨간점 알림 뜨게 해주기 받기 버튼 그리고 초록색으로 해줘»)
 *
 *   node tools/verify325.js
 *
 * 지키는 성질: **축복 한 칸을 «지금 켤 수 있으면» 그 칸의 «받기» 알약이 초록이고 레드닷이 붙는다.
 *               켜는 순간 그 칸만 즉시 갈색으로 돌아가고 닷이 꺼진다. 만료되면 다시 켜진다.**
 *   [A] 세 칸 다 만료 — 닷 3개 · 알약 3장 초록 · 사이드 «축복» 아이콘 점등
 *   [B] 섞인 국면(2 만료 / 1 활성) — 닷 정확히 2개 · 활성 칸은 갈색 + 닷 소등(짝이 안 어긋난다)
 *   [C] 세 칸 다 활성 — 닷 0개 · 알약 3장 갈색 · 사이드 소등
 *   [D] 카드 클릭 — **그 칸만** 즉시 소등·갈색, 나머지 유지. 기능 완성 규칙: `S.bless` 저장·
 *       `bonus()` 배율 상승까지 실제로 움직이는지 본다(«만들어 놓음» 이 아니라 «동작함»).
 *   [E] 만료 — 1초 `blessTick()` 이 열려 있는 팝업을 다시 그려 **재점등**한다.
 *   [F] 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트 `.tm.alert` 로만. 클래스를 떼면 꺼진다.
 *       ⚠ 되돌림 감시: `#blsw` 는 `#blsw s{display:inline-block}`(ID 급)로 `<s>` 를 켜 두는 화면이라
 *       스코프 짝(`#blsw .updot{display:none}`)이 없으면 **조건과 무관하게 상시 점등**이 된다.
 *   [G] 299 규약 — 닷 중심이 호스트(알약) 우상단 사분면 · `.bls-c{overflow:hidden}` 에 안 잘린다.
 *   [H] 34 레이아웃 회귀 — 배지를 넣어도 알약 219×98 · 글자/시계 잉크 자리가 한 픽셀도 안 움직인다
 *       (34 는 이미 통과한 화면이다 — 색·배지만 얹는 것이 이 작업의 범위).
 *
 * 판정은 «논리(class·computed)» 와 «화소(bbox 안 빨강/초록 수)» 를 **같이** 본다 —
 * 292 «열렸는가 ≠ 보이는가» · 189-③ «헛초록» 처방.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

/* 34 가 통과했을 때의 알약 규격(측정표 34 §15 · 325 착수 전 실측) — 회귀 기준선 */
const TM_W = 219, TM_H = 98;
const BASE = {                          /* 카드1 기준. 카드2·3 은 +315 / +630 */
  tm: [116, 1045], ck: [165.79, 1049, 38.8, 97], i_claim: [212.62, 1047, 56.55, 97],
};
const GREEN = [76, 186, 46];            /* #4CBA2E — 202 «가능=초록» (.ifbtn --gb-mid) */
const BROWN = [146, 106, 36];           /* #926A24 — 활성(시간 표시) 알약, 34 원본 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;
const near = (a, b, t) => Math.abs(a - b) <= t;

/* bbox 안의 «빨강»·«초록» 화소 수 — 안 보이면 0 이다.
   ⚠ 60 쥬시 `jzDotIn`(scale 0→1)이 방금 시작했으면 rect 가 0 으로 잡힌다(104·202 함정) —
   재기 전에 `animation:none` 을 잠깐 강제한다. */
async function shot(page, sel) {
  const s = await page.evaluate(q => {
    const e = document.querySelector(q);
    if (!e) return { exists: false };
    const prevA = e.style.animation; e.style.animation = 'none';
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const out = { exists: true, display: cs.display, opacity: +cs.opacity, visibility: cs.visibility,
      bg: cs.backgroundColor, rect: [r.left, r.top, r.width, r.height] };
    e.style.animation = prevA;
    return out;
  }, sel);
  if (!s.exists) return { exists: false, red: 0, green: 0 };
  const [x, y, w, h] = s.rect;
  s.red = 0; s.green = 0;
  if (w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H) {
    const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
    const c = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let red = 0, green = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        if (R > 150 && G < 110 && B < 130) red++;
        if (G > 110 && R < G - 40 && B < G - 40) green++;
      }
      return { red, green };
    }, buf.toString('base64'));
    s.red = c.red; s.green = c.green;
  }
  return s;
}

/* 세 카드의 «논리» 를 한 번에 — 알약 색 · .alert · 닷 display · 글자 */
async function state(page) {
  return page.evaluate(() => {
    const p = n => Math.round(n * 100) / 100;
    const R = el => { const r = el.getBoundingClientRect(); return [p(r.left), p(r.top), p(r.width), p(r.height)]; };
    const out = [];
    document.querySelectorAll('.bls-c').forEach(c => {
      const tm = c.querySelector('.tm'), i = tm.querySelector('i'), ck = tm.querySelector('b.ck');
      const dots = tm.querySelectorAll(':scope > .updot');
      const d = dots[0];
      out.push({
        id: c.id, k: c.dataset.bless, off: c.classList.contains('off'),
        alert: tm.classList.contains('alert'), txt: i.textContent,
        tmBg: getComputedStyle(tm).backgroundColor, tmSh: getComputedStyle(tm).boxShadow,
        tm: R(tm), i: R(i), ck: R(ck),
        nDot: dots.length, dotDisp: d ? getComputedStyle(d).display : 'none',
        dotRect: d ? R(d) : null, card: R(c),
      });
    });
    /* ⚠ 사이드 아이콘의 점등 클래스는 `.alert` 가 아니라 **`.on`** 이다
       (`sideAlert()` 20514: `SIDEB[k].classList.toggle('on', …)` · 배지 CSS 도 `.ibtn.on .bdg`).
       팝업 안 호스트(`.tm.alert`)와 클래스 이름이 다르다 — 여기서 `.alert` 를 보면 항상 false 다. */
    const sb = document.querySelector('.side .ibtn[data-pop="bless"]');
    return { out, side: sb ? sb.classList.contains('on') : null,
      sideBdgDisp: sb ? getComputedStyle(sb.querySelector('.bdg')).display : null,
      on: { atk: blessOn('atk'), hp: blessOn('hp'), rate: blessOn('rate') }, any: blessAny() };
  });
}

const rgb = s => (s.match(/\d+/g) || []).slice(0, 3).map(Number);
const isCol = (s, c) => { const v = rgb(s); return v[0] === c[0] && v[1] === c[1] && v[2] === c[2]; };
/* «닷이 켜져 있다» 의 논리 요약 — 노드가 있고 .alert 이고 computed display 가 none 이 아니다 */
const lit = o => o.nDot === 1 && o.alert && o.dotDisp !== 'none';
const sig = st => st.out.map(o => (o.alert ? '1' : '0') + (o.dotDisp !== 'none' ? '1' : '0')).join(' ');

async function boot(browser, exp) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 500, best: 20, totalKills: 500 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openBless === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춰 화소 판정이 흔들리지 않게 한다(다른 게이트와 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.evaluate(e => { S.bless.exp = { atk: e[0], hp: e[1], rate: e[2] }; uiDirty = true; renderUI(); }, exp);
  await page.waitForTimeout(300);
  await page.evaluate(() => openBless());
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}
const NOW = () => Date.now();

(async () => {
  const browser = await launch(chromium);
  const HOUR = 3600e3;

  /* ══ [A] 세 칸 다 만료 — 전부 점등 + 전부 초록 ═════════════════════════ */
  console.log('\n[A] 세 칸 다 «받을 수 있음»');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    const st = await state(page);
    ok(st.out.length === 3, '카드 3장', String(st.out.length));
    ok(st.out.every(o => o.nDot === 1), '칸마다 배지 노드 정확히 1개(부품은 하나)', st.out.map(o => o.nDot).join(','));
    ok(st.out.every(lit), '세 칸 전부 점등', sig(st));
    ok(st.out.every(o => o.txt === '받기'), '세 칸 글자가 «받기»', st.out.map(o => o.txt).join(','));
    ok(st.out.every(o => isCol(o.tmBg, GREEN)), '세 칸 알약이 초록 #4CBA2E', st.out.map(o => o.tmBg).join(' '));
    ok(st.side === true && st.sideBdgDisp !== 'none', '사이드 «축복» 아이콘도 점등(경로 앞칸)',
      'alert=' + st.side + ' bdg=' + st.sideBdgDisp);
    /* 화소 — 닷 안에 빨강이 실제로 찍히는가 / 알약 안에 초록이 실제로 찍히는가 */
    for (let n = 0; n < 3; n++) {
      const id = st.out[n].id;
      const d = await shot(page, '#' + id + ' .tm > .updot');
      ok(d.red > 200, `${id} 닷 bbox 안 빨강 화소 > 200`, String(d.red));
      const t = await shot(page, '#' + id + ' .tm');
      ok(t.green > 8000, `${id} 알약 bbox 안 초록 화소 > 8000`, String(t.green));
    }
    /* [H] 34 레이아웃 회귀 — 배지를 넣어도 알약·글자 자리가 안 움직인다 */
    st.out.forEach((o, n) => {
      ok(o.tm[2] === TM_W && o.tm[3] === TM_H, `[H] ${o.id} 알약 ${TM_W}x${TM_H} 불변`, o.tm[2] + 'x' + o.tm[3]);
      ok(near(o.tm[0], BASE.tm[0] + 315 * n, 0.5) && near(o.tm[1], BASE.tm[1], 0.5),
        `[H] ${o.id} 알약 좌상단 불변`, o.tm[0] + ',' + o.tm[1]);
      ok(near(o.i[0], BASE.i_claim[0] + 315 * n, 0.5) && near(o.i[2], BASE.i_claim[2], 0.5),
        `[H] ${o.id} «받기» 글자 잉크 자리·폭 불변`, o.i.join(','));
      ok(near(o.ck[0], BASE.ck[0] + 315 * n, 0.5) && near(o.ck[2], BASE.ck[2], 0.5),
        `[H] ${o.id} 시계 ⏱ 자리·폭 불변`, o.ck.join(','));
    });
    /* [G] 299 + overflow 클립
       ⚠ 319 처방(278) — 배지 노드가 아예 없는 트리(되돌림 시험)에서 `o.dotRect` 가 null 이면
       구조분해가 **게이트를 즉사**시킨다. 없으면 그 항목만 빨갛게 하고 계속 돈다. */
    st.out.forEach(o => {
      if (!o.dotRect) { ok(false, `[G] ${o.id} 배지 노드가 없다 — 자리 판정 불가`, 'dotRect=null'); return; }
      const [dx, dy, dw, dh] = o.dotRect;
      const cx = dx + dw / 2, cy = dy + dh / 2;
      ok(cx > o.tm[0] + o.tm[2] / 2 && cy < o.tm[1] + o.tm[3] / 2, `[G] ${o.id} 299 우상단 사분면`,
        `중심 (${px(cx - o.tm[0])}, ${px(cy - o.tm[1])})`);
      const ring = 7.5;
      ok(dx - ring >= o.card[0] && dy - ring >= o.card[1] &&
         dx + dw + ring <= o.card[0] + o.card[2] && dy + dh + ring <= o.card[1] + o.card[3],
        `[G] ${o.id} 링이 .bls-c{overflow:hidden} 안 — 안 잘린다`, '');
    });
    ok(errs.length === 0, '[A] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [B] 섞인 국면 — 2 만료 / 1 활성 ═════════════════════════════════ */
  console.log('\n[B] 섞인 국면(공격력·체력 만료 / 획득률 활성)');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, NOW() + HOUR]);
    const st = await state(page);
    ok(sig(st) === '11 11 00', '점등 정확히 2칸 · 활성 칸만 소등(짝이 안 어긋난다)', sig(st));
    const a = st.out.find(o => o.id === 'blsC_rate');
    ok(a.txt !== '받기' && /^\d\d:\d\d:\d\d$/.test(a.txt), '활성 칸 글자는 남은 시간', a.txt);
    ok(isCol(a.tmBg, BROWN), '활성 칸 알약은 34 원본 갈색 #926A24 유지', a.tmBg);
    ok(st.out.filter(o => o.off).every(o => isCol(o.tmBg, GREEN)), '만료 칸 2장만 초록',
      st.out.map(o => o.tmBg).join(' '));
    /* 활성 칸: 노드는 있어도 화소가 0 이어야 한다(«열렸는가 ≠ 보이는가») */
    const d = await shot(page, '#blsC_rate .tm > .updot');
    ok(d.exists && d.display === 'none' && d.red === 0, '활성 칸 닷 — 노드는 있으나 화소 0',
      'display=' + d.display + ' red=' + d.red);
    /* 활성 칸 알약 안에 초록이 안 찍혀야 한다 */
    const t = await shot(page, '#blsC_rate .tm');
    ok(t.green < 500, '활성 칸 알약에 초록 화소 거의 없음', String(t.green));
    ok(st.side === true, '한 칸이라도 받을 수 있으면 사이드 점등', String(st.side));
    /* [H] 활성 국면에서도 알약 규격 불변 */
    ok(a.tm[2] === TM_W && a.tm[3] === TM_H, '[H] 활성 칸 알약 219x98 불변', a.tm[2] + 'x' + a.tm[3]);
    ok(errs.length === 0, '[B] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [C] 세 칸 다 활성 — 전부 소등 ═══════════════════════════════════ */
  console.log('\n[C] 세 칸 다 활성');
  {
    const { ctx, page, errs } = await boot(browser, [NOW() + HOUR, NOW() + HOUR, NOW() + HOUR]);
    const st = await state(page);
    ok(sig(st) === '00 00 00', '닷 0개', sig(st));
    ok(st.out.every(o => isCol(o.tmBg, BROWN)), '알약 3장 전부 갈색', st.out.map(o => o.tmBg).join(' '));
    ok(st.side === false && st.any === false, '사이드 «축복» 아이콘도 소등',
      'alert=' + st.side + ' blessAny=' + st.any);
    let red = 0;
    for (const o of st.out) red += (await shot(page, '#' + o.id + ' .tm > .updot')).red;
    ok(red === 0, '세 칸 닷 화소 합 0', String(red));
    ok(errs.length === 0, '[C] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [D] 클릭 — 그 칸만 즉시 소등 + 실제로 동작(기능 완성 규칙) ═════════ */
  console.log('\n[D] 카드 클릭 — 즉시 소등 + 기능');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    /* ⚠ 만료 시각은 `Date.now()`(13자리 ≈ 1.79e12) 라 `|0` 로 받으면 **32비트로 잘려** 음수가 된다.
       («미래인가» 가 −1786704595534ms 로 나온 자리다 — 시각에는 `|0` 을 쓰지 않는다.) */
    const before = await page.evaluate(() => ({
      atk: bonus().atk, on: blessOn('atk'), prog: S.bless.prog | 0, lv: blessLv(),
      exp: Number(S.bless.exp.atk) || 0,
    }));
    ok(before.on === false, '누르기 전 공격력 축복 꺼짐', String(before.on));
    /* 진짜 포인터 클릭 — 위임(`[data-bless]`)을 그대로 탄다(LESSONS 65-②) */
    await page.click('#blsC_atk');
    await page.waitForTimeout(120);      /* 22 와 달리 지연 재렌더가 없다 — 즉시여야 한다 */
    const st = await state(page);
    ok(sig(st) === '00 11 11', '누른 칸만 즉시 소등 · 나머지 두 칸 유지', sig(st));
    ok(isCol(st.out[0].tmBg, BROWN), '누른 칸 알약이 즉시 갈색으로', st.out[0].tmBg);
    ok(/^\d\d:\d\d:\d\d$/.test(st.out[0].txt), '누른 칸 글자가 남은 시간으로', st.out[0].txt);
    const d = await shot(page, '#blsC_atk .tm > .updot');
    ok(d.red === 0, '누른 칸 닷 화소 0', String(d.red));
    /* 기능 완성 규칙 — «만들어 놓음» 이 아니라 «동작함»: 상태·저장·배율까지 */
    const after = await page.evaluate(() => ({
      atk: bonus().atk, on: blessOn('atk'), prog: S.bless.prog | 0, lv: blessLv(),
      exp: Number(S.bless.exp.atk) || 0,
      saved: (() => { try { const j = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
        return Number((j.bless && (j.bless.exp || {}).atk)) || 0; } catch (e) { return -1; } })(),
    }));
    ok(after.on === true, '[기능] 공격력 축복이 실제로 켜졌다', String(after.on));
    ok(after.exp > Date.now(), '[기능] 만료 시각이 미래로 설정', String(after.exp - Date.now()) + 'ms 남음');
    ok(after.atk > before.atk, '[기능] bonus().atk 배율이 올랐다',
      px(before.atk) + ' → ' + px(after.atk));
    ok(after.prog === before.prog + 1 || after.lv > before.lv, '[기능] 축복 경험치 n/4 가 올랐다',
      before.prog + '→' + after.prog + ' lv ' + before.lv + '→' + after.lv);
    ok(after.saved === after.exp, '[기능] 세이브(S)에 반영됐다', 'saved=' + after.saved);
    /* 두 번 눌러도 시간이 덧붙지 않는다(기존 계약) */
    await page.click('#blsC_atk');
    await page.waitForTimeout(100);
    const twice = await page.evaluate(() => Number(S.bless.exp.atk) || 0);
    ok(twice === after.exp, '이미 켜진 칸을 또 눌러도 시간이 안 덧붙는다', String(twice - after.exp));
    ok(errs.length === 0, '[D] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [E] 만료 — 재점등 ═══════════════════════════════════════════════ */
  console.log('\n[E] 만료 후 재점등');
  {
    const { ctx, page, errs } = await boot(browser, [NOW() + HOUR, NOW() + HOUR, NOW() + HOUR]);
    ok(sig(await state(page)) === '00 00 00', '시작은 전부 소등', sig(await state(page)));
    /* 만료를 흉내낸다 — `blessTick()` 이 1초마다 열린 팝업을 다시 그린다 */
    await page.evaluate(() => { S.bless.exp.hp = Date.now() - 1; });
    await page.waitForTimeout(1400);
    const st = await state(page);
    ok(sig(st) === '00 11 00', '만료된 칸만 다시 점등', sig(st));
    ok(isCol(st.out[1].tmBg, GREEN), '재점등한 칸 알약이 다시 초록', st.out[1].tmBg);
    ok(st.out[1].txt === '받기', '재점등한 칸 글자가 «받기» 로', st.out[1].txt);
    const d = await shot(page, '#blsC_hp .tm > .updot');
    ok(d.red > 200, '재점등한 닷 화소 > 200', String(d.red));
    ok((await state(page)).side === true, '사이드 아이콘도 다시 점등', '');
    ok(errs.length === 0, '[E] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [F] 166 규약 + 특이성 되돌림 감시 ═══════════════════════════════ */
  console.log('\n[F] 166 규약 · #blsw 특이성 짝');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    /* 클래스를 떼면 꺼진다 — 점등은 오직 호스트 `.alert` 로만 갈린다 */
    /* ⚠ 319 처방(278) — 노드가 없는 트리에서도 즉사하지 않고 그 항목만 빨개지게 한다 */
    const off = await page.evaluate(() => {
      const tm = document.querySelector('#blsC_atk .tm');
      if (!tm) return '호스트 없음';
      tm.classList.remove('alert');
      const d = tm.querySelector('.updot');
      return d ? getComputedStyle(d).display : '배지 노드 없음';
    });
    ok(off === 'none', '`.alert` 를 떼면 닷이 꺼진다(점등 축이 하나다)', off);
    await page.evaluate(() => document.querySelector('#blsC_atk .tm').classList.add('alert'));
    /* ⚠ 되돌림 감시 — 스코프 짝을 지우면 상시 점등으로 돌아간다.
       `#blsw .updot{display:none}` 을 무력화해 보고, 그때 «안 켜져야 할 칸» 이 켜지는지 본다. */
    const bad = await page.evaluate(() => {
      S.bless.exp.rate = Date.now() + 3600e3; renderBless();
      const tm = document.querySelector('#blsC_rate .tm'), d = tm && tm.querySelector('.updot');
      if (!d) return { wasNone: false, now: 'none', missing: true };
      const wasNone = getComputedStyle(d).display === 'none';
      /* 스코프 짝만 빼고 클래스 급 규칙만 남긴 상태를 흉내낸다 */
      const s = document.createElement('style');
      s.textContent = '#blsw .updot{display:revert}';
      document.head.appendChild(s);
      const now = getComputedStyle(d).display;
      s.remove();
      return { wasNone, now };
    });
    ok(bad.wasNone === true, '활성 칸은 꺼져 있다(기준선)', String(bad.wasNone));
    ok(bad.now !== 'none', '스코프 짝을 빼면 상시 점등으로 돌아간다 — 그 두 줄이 실제로 일한다',
      'display=' + bad.now + ' (#blsw s{display:inline-block} 가 클래스 급을 이긴다)');
    /* 부품은 `updot` 한 종류뿐이다 — 34 안에 다른 배지 클래스를 새로 만들지 않았다 */
    const n = await page.evaluate(() => ({
      updot: document.querySelectorAll('#blsw .updot').length,
      bdg: document.querySelectorAll('#blsw .bdg,#blsw .dot,#blsw .nw').length,
    }));
    ok(n.updot === 3 && n.bdg === 0, '배지 부품은 `.updot` 3개뿐(새 클래스 안 만들었다)',
      'updot=' + n.updot + ' 기타=' + n.bdg);
    ok(errs.length === 0, '[F] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY325 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
