#!/usr/bin/env node
/* 작업 726 게이트 — 「09 일괄 강화 결과 팝업은 **강화한 것을 전부** 보여 준다」
 *
 *   node tools/verify726.js
 *
 * 주인 원문(2026-09-02 04:20): «강화를 분명히 20개 넘게 일괄강화했는데 강화결과가 6개밖에
 * 안뜨더라 강화결과 팝업 화면이. 그거도 수정해줘야함. 장비, 스킬, 펫 전부».
 *
 * 지킬 것(등재문 게이트 문면 그대로):
 *   [S] 선언 — 옛 표시 상한(`ups.slice(0, UPR_MAX)`)이 소스에 0건
 *   [A] 20+·50+ 일괄 강화 → 팝업 칸 수 = **실제 강화 건수**(합침 반영) — 장비·스킬·펫 **세 시트 각각**
 *   [B] 헤더 합계 = 실측 건수
 *   [C] **6칸 이하는 레퍼런스 그대로 Δ0px** — 측정표 09 §3 의 x321/471/623 · 카드 상변에 그대로 선다
 *   [D] 짧은 프레임(9:13.3)에서도 **잘림 0** — 가려진 행은 스크롤로 전부 닿고, «터치하여 닫기» 를 안 먹는다
 *   [E] 합침 — 같은 아이템이 여러 줄로 와도 한 칸 «Lv min→max»(187 규약)
 *   [F] 밀어서 스크롤한 손짓으로는 안 닫힌다 / 그냥 탭하면 종전대로 닫힌다
 *   [R] 되돌림 — 옛 `slice(0, 6)` 을 되살린 사본에서 [A] 가 **실제로** 빨개진다
 *
 * ⚑ 왜 [R] 이 있는가 — [A] 는 «상한이 없으면 그냥 참» 이라 무르게 잡기 쉽다. 되돌린 사본이
 *   빨개지는 것을 같이 못박아야 이 자가 «전부 보여 주는가» 를 정말로 묻는 자가 된다.
 * ⚑ 왜 [C] 가 있는가 — 이 수리는 **레퍼런스 화면(3칸)을 한 픽셀도 건드리면 안 된다.**
 *   [C] 가 없으면 «많이 보이게» 하면서 ref 자리를 밀어 놓고도 초록일 수 있다.
 * ⚠ `goTab('hero')` 는 이미 열린 탭을 다시 누르면 패널을 **닫는다**(A1) — 시트를 연속으로
 *   오갈 때 조건 없이 부르면 두 번째 시트가 안 열린다(probe726 1회차에 실제로 그랬다).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 표본 — 앞 n 종에 조각을 심고 나머지는 강화 불가로 눌러 둔다(기대값 = 심은 종 수) */
const SEED = ({ kind, n, frag }) => {
  const list = kind === 'skill' ? SKILLS : kind === 'pet' ? PETS : wpnList();
  const ids = list.slice(0, n).map(it => it.id);
  ids.forEach(id => { S.own[id] = { n: frag, l: 1 }; });
  list.slice(n).forEach(it => { if (S.own[it.id]) S.own[it.id].n = 0; });
  save();
  return { want: ids.length, listLen: list.length };
};

const READ = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const grid = document.getElementById('upCards'), g = grid.getBoundingClientRect();
  const cards = [...grid.querySelectorAll('.upr-cel')];
  const cnt = document.getElementById('upCnt');
  const close = document.querySelector('#upw .upr-close');
  const cr = close.getBoundingClientRect();
  const R = e => { const r = e.getBoundingClientRect();
    return { x: +(r.left - app.left).toFixed(1), y: +(r.top - app.top).toFixed(1),
             w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  return {
    on: document.getElementById('upw').classList.contains('on'),
    many: document.getElementById('upw').classList.contains('many'),
    n: cards.length,
    boxes: cards.map(R),
    grp: R(document.querySelector('#upw .upr-grp')),
    grid: Object.assign(R(grid), { sh: grid.scrollHeight, ch: grid.clientHeight, st: grid.scrollTop }),
    cntTxt: (cnt.textContent || '').trim(),
    cntNum: +((cnt.querySelector('em') || {}).textContent || 0),
    cntShown: getComputedStyle(cnt).display !== 'none',
    closeTop: +(cr.top - app.top).toFixed(1),
    app: { w: app.width, h: app.height },
    lv: cards.map(c => [...c.querySelectorAll('.upr-lv>i')].map(i => i.textContent).join('>'))
  };
};

const OPEN = async (page, kind) => {
  if (kind === 'skill') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('sk'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bSk [data-skup]').click(); });
  } else if (kind === 'pet') {
    await ev(page, () => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo('pet'); uiDirty = true; renderUI(); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.querySelector('#bPet [data-ptup]').click(); });
  } else {
    await ev(page, () => { openWeapon('wpn'); });
    await page.waitForTimeout(250);
    await ev(page, () => { document.getElementById('wpnBtnUp').click(); });
  }
  await page.waitForTimeout(450);
};

async function boot(browser, url, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  blk('S — 선언: 표시 상한이 소스에서 사라졌다');
  /* ⚠ 주석은 **일부러** 옛 이름을 적어 둔다(왜 6이었는지가 다음 세션의 근거다) —
     그러니 이 절은 «주석을 걷어낸 코드» 만 본다. 통째로 grep 하면 자기 기록에 걸려 빨개진다. */
  const bare = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  ok(!/slice\(0,\s*UPR_MAX\)/.test(bare), 'S1 `ups.slice(0, UPR_MAX)` 0건 (주석 제외 코드)');
  ok(!/\bUPR_MAX\b/.test(bare), 'S2 `UPR_MAX` 라는 이름이 코드에 0건 (뜻이 바뀌었다)');
  ok(/const UPR_COLS = 6;/.test(code), 'S3 `UPR_COLS = 6` — 6은 «상한» 이 아니라 «한 줄 칸수»');
  ok(/function uprMerge\(ups\)/.test(code) && /uprMerge\(ups\)/.test(code.replace('function uprMerge(ups)', '')),
     'S4 `uprMerge` 선언 1 + 호출 1 (187 합침 규약)');
  ok(/id="upCnt"/.test(code) && /\$\('upCnt'\)\.innerHTML/.test(code), 'S5 «총 N건» 합계 줄이 마크업 + 갱신 양쪽에 있다');

  /* ── [A]·[B] 세 시트 20+ ─────────────────────────────────────────── */
  const { ctx, page, errs } = await boot(browser, URL);
  const SHEETS = [
    { key: 'equip', ko: '장비(05 무기)', n: 24 },
    { key: 'skill', ko: '스킬(07)',      n: 24 },
    { key: 'pet',   ko: '펫(26)',        n: 30 }   /* 50+ 는 한 시트 종수(27~36)를 넘어 못 만든다 — [E] 가 합성 목록으로 센다 */
  ];
  blk('A·B — 20개+ 일괄 강화: 팝업 칸 수 = 실제 강화 건수 · 헤더 합계 = 실측');
  for (const s of SHEETS) {
    const seed = await ev(page, SEED, { kind: s.key, n: s.n, frag: 30 });
    await OPEN(page, s.key);
    const r = await ev(page, READ);
    if (!seed || !r) { ok(false, 'A-' + s.key + ' 읽기'); continue; }
    ok(r.on && r.n === seed.want, 'A1 ' + s.ko + ' — 칸 ' + r.n + ' = 강화 ' + seed.want + '건',
       '칸 ' + r.n + ' / 건수 ' + seed.want);
    ok(r.cntNum === seed.want && /총/.test(r.cntTxt), 'B1 ' + s.ko + ' — 헤더 합계 «총 ' + seed.want + '건»',
       '"' + r.cntTxt + '"');
    ok(r.many && r.cntShown, 'B2 ' + s.ko + ' — 7칸 이상이라 합계 줄이 보인다');
    const outs = r.boxes.filter(b => b.x < -0.5 || b.y < -0.5 || b.x + b.w > r.app.w + 0.5 || b.y + b.h > r.app.h + 0.5);
    ok(outs.length === 0, 'A2 ' + s.ko + ' — 프레임 밖 칸 0', outs.length ? JSON.stringify(outs[0]) : '0/' + r.n);
    const rows = new Set(r.boxes.map(b => Math.round(b.y))).size;
    info(s.ko, '행 ' + rows + ' · 격자 y' + r.grid.y + ' h' + r.grid.h + ' · scroll ' + r.grid.sh + '/' + r.grid.ch);
    await ev(page, () => closeUpAll());
    await page.waitForTimeout(120);
  }

  /* ── [C] 레퍼런스(3칸) Δ0px ──────────────────────────────────────── */
  blk('C — 6칸 이하는 레퍼런스 그대로 (측정표 09 §3 · Δ0px)');
  {
    const seed = await ev(page, SEED, { kind: 'skill', n: 3, frag: 30 });
    await OPEN(page, 'skill');
    const r = await ev(page, READ);
    if (!r) ok(false, 'C0 읽기'); else {
      ok(r.n === 3 && r.on, 'C1 3칸이 떴다', '칸 ' + r.n);
      ok(!r.many && !r.cntShown, 'C2 `many` 가 안 붙는다 — 합계 줄도 없다(ref 에 없는 요소)');
      ok(Math.abs(r.grp.h - 300) < 0.5, 'C3 묶음 높이 300 (측정표 값 그대로)', r.grp.h);
      /* ref x321/471/623 (측정표 §3) — 프레임 가로는 1:1 이라 그대로 비교한다 */
      const wantX = [320.5, 471.5, 622.5];
      const dx = r.boxes.map((b, i) => +(b.x - wantX[i]).toFixed(1));
      ok(dx.every(d => Math.abs(d) <= 1), 'C4 칸 좌변 = ref x321/471/623 (±1px)', 'Δ ' + JSON.stringify(dx));
      /* 카드 상변 — 묶음 top + 131. 묶음은 세로 중앙(661)이라 프레임 높이로 역산한다 */
      const wantY = (r.app.h - 300) / 2 + 131;
      ok(Math.abs(r.grid.y - wantY) <= 1, 'C5 카드 상변 = 묶음 top + 131', r.grid.y + ' vs ' + wantY.toFixed(1));
      ok(r.grid.sh <= r.grid.ch + 8, 'C6 스크롤이 안 생긴다(한 줄)', r.grid.sh + '/' + r.grid.ch);
      ok(Math.abs(r.boxes[0].w - 137) < 0.5 && Math.abs(r.boxes[0].h - 166) < 1.5,
         'C7 칸 규격 137 x 166 불변', r.boxes[0].w + 'x' + r.boxes[0].h);
    }
    await ev(page, () => closeUpAll());
  }

  /* ── [E] 합침 · [F] 스크롤 손짓 ──────────────────────────────────── */
  blk('E — 합침(187): 같은 아이템이 여러 줄로 와도 한 칸 «min→max»');
  {
    const r = await ev(page, () => {
      const it = SKILLS[0], it2 = SKILLS[1];
      openUpAll([{ it, from: 1, to: 4 }, { it, from: 4, to: 9 }, { it: it2, from: 2, to: 3 }]);
      const cels = [...document.querySelectorAll('#upCards .upr-cel')];
      return { n: cels.length,
               lv: cels.map(c => [...c.querySelectorAll('.upr-lv>i')].map(i => i.textContent).join('>')) };
    });
    ok(r && r.n === 2, 'E1 세 줄 → 두 칸으로 합쳐진다', r ? r.n + '칸' : 'n/a');
    ok(r && r.lv[0] === '1>9', 'E2 합친 칸은 «1 → 9»(min → max)', r ? r.lv[0] : 'n/a');
    ok(r && r.lv[1] === '2>3', 'E3 다른 아이템은 그대로', r ? r.lv[1] : 'n/a');
    /* 합침 뒤 2칸이면 `many` 가 아니어야 한다 — 헤더는 «표시 칸 수» 를 말한다 */
    const m = await ev(page, () => document.getElementById('upw').classList.contains('many'));
    ok(m === false, 'E4 합친 뒤 칸 수로 판정한다(2칸 = ref 모드)');
  }

  blk('F — 밀어서 스크롤한 손짓으로는 안 닫힌다 / 탭은 닫힌다');
  {
    await ev(page, SEED, { kind: 'skill', n: 24, frag: 30 });
    await ev(page, () => { closeUpAll(); const r = levelUpAll(SKILLS); openUpAll(r.ups); });
    await page.waitForTimeout(300);
    let on = await ev(page, () => document.getElementById('upw').classList.contains('on'));
    ok(on === true, 'F0 팝업이 열려 있다');
    await page.mouse.move(540, 1200);
    await page.mouse.down();
    await page.mouse.move(540, 1080, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    on = await ev(page, () => document.getElementById('upw').classList.contains('on'));
    ok(on === true, 'F1 ★ 120px 끈 손짓 뒤의 click 은 닫지 않는다');
    await page.mouse.move(540, 1200);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(150);
    on = await ev(page, () => document.getElementById('upw').classList.contains('on'));
    ok(on === false, 'F2 제자리 탭은 종전대로 닫는다');
  }
  ok(errs.length === 0, 'F3 콘솔 에러 0', errs.slice(0, 2).join(' | ') || '없음');
  await ctx.close();

  /* ── [D] 짧은 프레임(9:13.3) ────────────────────────────────────── */
  blk('D — 9:13.3(1080x1600) 에서도 잘림 0 · 가려진 행은 스크롤로 전부 닿는다');
  {
    const r0 = await boot(browser, URL, 1600);
    const seed = await ev(r0.page, SEED, { kind: 'pet', n: 36, frag: 30 });
    await OPEN(r0.page, 'pet');
    const r = await ev(r0.page, READ);
    if (!seed || !r) ok(false, 'D0 읽기'); else {
      ok(r.n === seed.want, 'D1 칸 수 = 강화 건수 ' + seed.want + ' (짧은 프레임에서도 데이터는 다 온다)', r.n);
      ok(r.grid.y + r.grid.h <= r.closeTop + 0.5,
         'D2 격자 하변이 «터치하여 닫기» 잉크를 안 먹는다',
         '격자 ' + (r.grid.y + r.grid.h).toFixed(1) + ' ≤ 닫기 ' + r.closeTop);
      ok(r.grp.y >= -0.5, 'D3 묶음 상변이 프레임 안', r.grp.y);
      ok(r.grid.sh > r.grid.ch + 1, 'D4 가려진 행이 있으므로 격자가 스크롤된다', r.grid.sh + '/' + r.grid.ch);
      ok(/밀어서/.test(r.cntTxt), 'D5 헤더가 «밀어서 더 보기» 로 그 사실을 말한다', '"' + r.cntTxt + '"');
      /* 스크롤 끝까지 밀면 마지막 칸이 격자 안으로 들어온다 = 한 칸도 못 보는 자리가 없다 */
      const last = await ev(r0.page, () => {
        const g = document.getElementById('upCards');
        g.scrollTop = g.scrollHeight;
        const cels = [...g.querySelectorAll('.upr-cel')];
        const gr = g.getBoundingClientRect(), lr = cels[cels.length - 1].getBoundingClientRect();
        return { in: lr.top >= gr.top - 1 && lr.bottom <= gr.bottom + 1, top: +(lr.top - gr.top).toFixed(1),
                 bot: +(gr.bottom - lr.bottom).toFixed(1) };
      });
      ok(last && last.in, 'D6 ★ 스크롤 끝에서 마지막 칸이 온전히 보인다',
         last ? 'top +' + last.top + ' · bottom +' + last.bot : 'n/a');
    }
    ok(r0.errs.length === 0, 'D7 콘솔 에러 0', r0.errs.slice(0, 2).join(' | ') || '없음');
    await r0.ctx.close();
  }

  /* ── [R] 되돌림 ─────────────────────────────────────────────────── */
  blk('R — 되돌림: 옛 표시 상한을 되살린 사본은 [A] 가 빨개진다');
  {
    const rev = code.replace('$(\'upCards\').innerHTML = list.map(u =>',
                             '$(\'upCards\').innerHTML = list.slice(0, 6).map(u =>');
    ok(rev !== code, 'R0 되돌림 사본을 만들었다(`list.slice(0, 6)`)');
    const tmp = path.resolve(__dirname, '..', '.rev726.html');
    fs.writeFileSync(tmp, rev);
    try {
      const r0 = await boot(browser, 'file://' + tmp.replace(/\\/g, '/'));
      const seed = await ev(r0.page, SEED, { kind: 'skill', n: 24, frag: 30 });
      await OPEN(r0.page, 'skill');
      const r = await ev(r0.page, READ);
      ok(r && r.n === 6, 'R1 ★ 되돌린 사본은 6칸만 그린다 = [A1] 이 실제로 빨개진다',
         r ? r.n + '칸 / 강화 ' + seed.want + '건' : 'n/a');
      ok(r && r.cntNum === seed.want, 'R2 그 사본에서도 헤더는 24 라 «헤더 ≠ 칸 수» 로 갈린다',
         r ? '헤더 ' + r.cntNum + ' vs 칸 ' + r.n : 'n/a');
      await r0.ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

    /* 무르게 잡아 통과한 게 아님 — 같은 자로 원본이 다시 초록이어야 한다 */
    const r2 = await boot(browser, URL);
    const seed2 = await ev(r2.page, SEED, { kind: 'skill', n: 24, frag: 30 });
    await OPEN(r2.page, 'skill');
    const g = await ev(r2.page, READ);
    ok(g && g.n === seed2.want, 'R3 원본은 같은 자로 다시 초록', g ? g.n + '칸' : 'n/a');
    await r2.ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY726 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
