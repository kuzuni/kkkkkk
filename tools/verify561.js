#!/usr/bin/env node
/* 게이트 — 작업 561 「56 절전 모드 아이콘 슬롯 `<u>` 의 기본 밑줄」
 *
 *   node tools/verify561.js   → 마지막 줄이 `VERIFY561 PASS n/n` 이어야 한다.
 *
 * 이 자가 지키는 것은 «밑줄이 없다» 하나가 아니다. 148 이 겪은 대로 이 함정은 **화면마다 재발**하고,
 * 무르게 잠그면(«선언만 본다») 규칙이 사라져도 초록이다. 그래서 세 겹으로 잠근다:
 *   [A] 선언 — 세 슬롯의 computed `text-decoration-line` 이 none.
 *   [B] 찍힌 픽셀 — «지금» 과 «밑줄을 도로 켠 사본» 이 **달라야** 한다. 같으면 밑줄이 애초에 안 그려지는
 *       자리라는 뜻이고, 그러면 [A] 는 아무것도 안 지키는 헛초록이다(334 처방 · 되돌림 시험).
 *   [C] 기하 Δ0 — 561 은 밑줄 하나다. 아이콘 상자 48×48 @ (16,8)·`--icfs`·`--icsx` 3칸이 그대로여야 한다
 *       (56 은 ①~④ 8점으로 마감된 화면이다).
 *   [D] 사각지대 두 종을 **이름으로** 등재한다 — `<img>` 만 든 슬롯 3, 글자가 `position:absolute` 손자에
 *       있는 `.sv-st>s`. 둘 다 audit148 의 판정 밖이고, 후자는 **그리기에도 안 나온다**(probe561 [F]).
 *       여기 적어 두지 않으면 다음 세션이 같은 자리를 «놓친 결함» 으로 다시 판다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + m + (d !== undefined ? '  — ' + d : '')); };
const near = (m, a, b, tol) => ok(Math.abs(a - b) <= tol, m, a + ' vs ' + b + ' (허용 ' + tol + ')');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    document.getElementById('menub').click();
    document.querySelector('#mnw [data-mn="saver"]').click();
  });
  await page.waitForTimeout(700);

  ok(await page.evaluate(() => document.getElementById('app').classList.contains('sv')),
     '[전제] 절전 화면이 열렸다(#app.sv)');
  ok(await page.evaluate(() => document.querySelectorAll('#svw .sv-r').length === 3),
     '[전제] 방치 요약 알약이 3줄이다');

  /* ── [A] 선언 ─────────────────────────────────────────────── */
  const slots = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r>u')].map((u, i) => {
    /* ⚠ `getBoundingClientRect` 은 못 쓴다 — 이 슬롯들은 `scaleX(--icsx)`·`translateY(--icdy)` 를 달고
       있어서 그 자는 **그려진 잉크 상자**를 돌려준다(슬롯 1 은 23.06, 슬롯 3 은 7.5 로 읽힌다).
       561 이 지키려는 것은 «레이아웃 상자» 이므로 변환 전 값인 `offsetLeft/offsetTop` 을 쓴다. */
    const cs = getComputedStyle(u);
    return { i: i + 1,
             txt: [...u.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim(),
             deco: cs.textDecorationLine, color: cs.color,
             icfs: cs.getPropertyValue('--icfs').trim(), icsx: cs.getPropertyValue('--icsx').trim(),
             left: u.offsetLeft, top: u.offsetTop, offParent: u.offsetParent && u.offsetParent.className,
             w: +cs.width.replace('px', ''), h: +cs.height.replace('px', '') };
  }));
  for (const s of slots) ok(s.deco === 'none', '[A' + s.i + '] 슬롯 ' + s.i + ' text-decoration-line = none', s.deco);
  ok(slots.filter(s => s.txt).length === 2, '[A4] 글자가 든 칸은 두 칸이다(⏱️·💀)', slots.map(s => s.txt || '<img>').join(' '));

  /* ── [C] 기하 Δ0 — 밑줄만 끄고 상자는 안 건드렸다 ─────────── */
  for (const s of slots) {
    near('[C' + s.i + 'a] 슬롯 ' + s.i + ' 상자 48×48', s.w, 48, 0.01);
    near('[C' + s.i + 'b] 슬롯 ' + s.i + ' 상자 높이', s.h, 48, 0.01);
    near('[C' + s.i + 'c] 슬롯 ' + s.i + ' 알약 좌변 기준 left 16(변환 전)', s.left, 16, 0.01);
    near('[C' + s.i + 'd] 슬롯 ' + s.i + ' 알약 상변 기준 top 8(변환 전)', s.top, 8, 0.01);
    ok(s.offParent === 'sv-r', '[C' + s.i + 'e] 슬롯 ' + s.i + ' 의 기준 상자가 알약이다', s.offParent);
  }
  ok(slots[0].icfs === '39.3px' && slots[1].icfs === '40.2px' && slots[2].icfs === '42px',
     '[C5] `--icfs` 3칸 불변(39.3 · 40.2 · 42)', slots.map(s => s.icfs).join(' · '));
  ok(slots[0].icsx === '.706' && slots[1].icsx === '.862' && slots[2].icsx === '.833',
     '[C6] `--icsx` 3칸 불변(.706 · .862 · .833)', slots.map(s => s.icsx).join(' · '));

  /* ── 픽셀 도구(probe561 과 같은 자) ────────────────────────── */
  const shot = async (clip) => (await page.screenshot({ clip })).toString('base64');
  const diff = (a, b) => page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(B, 0, 0);
    const db = g.getImageData(0, 0, c.width, c.height).data;
    /* 임계 8 — 둥근 모서리 안티에일리어싱이 ±1 계단으로 흔들린다. 밑줄은 160 계단이다. */
    let n = 0; const rows = {};
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const o = (y * c.width + x) * 4;
      const d = Math.max(Math.abs(da[o] - db[o]), Math.abs(da[o + 1] - db[o + 1]), Math.abs(da[o + 2] - db[o + 2]));
      if (d > 8) { n++; rows[y] = (rows[y] || 0) + 1; }
    }
    return { n, rows };
  }, [a, b]);
  const clips = await page.evaluate(() => [...document.querySelectorAll('#svw .sv-r')].slice(0, 2).map((r) => {
    const b = r.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), width: 70, height: Math.round(b.height) };
  }));

  /* ── [B] 되돌림 시험 — 밑줄을 도로 켠 사본과 달라야 한다 ──── */
  const now = [await shot(clips[0]), await shot(clips[1])];
  const same = await diff(now[0], await shot(clips[0]));
  ok(same.n === 0, '[B0] 같은 상태 두 장의 다른 화소 = 0 (전제 · 잡음)', same.n + 'px');

  await page.evaluate(() => {
    const st = document.createElement('style'); st.id = '__v561';
    st.textContent = '#svw .sv-r>u{text-decoration:underline}';
    document.head.appendChild(st);
  });
  await page.waitForTimeout(120);
  const back = [await shot(clips[0]), await shot(clips[1])];
  const rev = [await diff(now[0], back[0]), await diff(now[1], back[1])];
  await page.evaluate(() => { const st = document.getElementById('__v561'); if (st) st.remove(); });
  await page.waitForTimeout(120);

  ok(rev[0].n >= 30, '[B1] §R 되돌림 — 밑줄을 도로 켜면 ⏱️ 칸이 달라진다(헛초록 방지)', rev[0].n + 'px');
  ok(rev[1].n >= 60, '[B2] §R 되돌림 — 💀 칸도 달라진다', rev[1].n + 'px');
  const ys = Object.keys(rev[0].rows).map(Number).sort((a, b) => a - b);
  ok(ys.length >= 2 && ys.every((y, k) => k === 0 || y === ys[k - 1] + 1),
     '[B3] 되돌린 화소가 «연속한 몇 줄» 이다 = 띠(밑줄)', 'y ' + ys.join(','));

  const restored = await diff(now[0], await shot(clips[0]));
  ok(restored.n === 0, '[B4] 사본을 걷어내면 원래 그림으로 돌아온다', restored.n + 'px');

  /* ── [D] 사각지대 등재 ────────────────────────────────────── */
  const blind = await page.evaluate(() => {
    const out = { imgSlot: null, grandchild: [] };
    const u3 = document.querySelectorAll('#svw .sv-r>u')[2];
    out.imgSlot = !!(u3 && !u3.textContent.trim() && u3.querySelector('img,.cic'));
    for (const el of document.querySelectorAll('#svw s,#svw u,#svw strike')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
      if (own || !(el.textContent || '').trim()) continue;
      const kid = el.querySelector('*');
      out.grandchild.push({ sel: (el.parentElement.className ? '.' + String(el.parentElement.className).split(' ')[0] + '>' : '') + el.tagName.toLowerCase(),
                            txt: el.textContent.trim(),
                            deco: getComputedStyle(el).textDecorationLine,
                            kidPos: kid ? getComputedStyle(kid).position : null });
    }
    return out;
  });
  ok(blind.imgSlot, '[D1] 슬롯 3 은 글자가 없다(<img>/.cic) = audit148 판정 밖 — 밑줄이 그려질 글자가 없다');
  ok(blind.grandchild.length === 1 && blind.grandchild[0].sel === '.sv-st>s',
     '[D2] 손자에만 글자가 있는 자리는 `.sv-st>s` 하나다', JSON.stringify(blind.grandchild.map(g => g.sel)));
  ok(blind.grandchild.every(g => g.kidPos === 'absolute'),
     '[D3] 그 자리의 글자는 `position:absolute` 손자다 = 취소선이 상속되지 않는다(probe561 [F] 0px)',
     JSON.stringify(blind.grandchild.map(g => g.kidPos)));

  ok(errs.length === 0, '[E] 콘솔 pageerror 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log((fail ? 'VERIFY561 FAIL ' : 'VERIFY561 PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
