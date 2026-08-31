#!/usr/bin/env node
/* 작업 491 — UI 쥬시니스 비평 루프 «누르는 순간» 캡처 하네스
 *
 *   node tools/cap491.js [회차]        기본 1
 *
 * 1회차 범위는 주인이 이름을 댄 두 곳이다 — 23 훈련 팝업의 «룬» · «단련» 탭.
 * 장면마다 세 장을 같은 clip 으로 찍는다(비평가가 겹쳐 보게):
 *   -idle : 손을 대기 «전»
 *   -down : 누른 채(pointerdown 후 ≥60ms · 손은 아직 안 뗐다)
 *   -up   : 뗀 뒤 140ms(결과가 화면에 남았는가)
 *
 * ⚠ «0/50/150ms 세 장» 이 아니라 «idle/down/up» 인 이유는 `probe491` 이 찍었다 —
 *   누름 상태는 `.jz-dn`(animation … both)이라 **누르고 있는 동안 값이 고정**이고
 *   16ms·50ms 표본이 같은 값이다(둘 다 scale .94). 셋을 다 찍어도 비평가에게는 같은 그림 세 장이라
 *   판단 근거가 늘지 않는다. 대신 «전 / 누른 채 / 뗀 뒤» 로 갈라야 ①즉시반응·②결과잔존이 갈린다.
 *
 * ⚠ 페이지가 둘이면 뒤로 밀린 쪽의 애니메이션이 재워져 시트 좌표가 통째로 어긋난다(probe491 주석) —
 *   여기서는 페이지를 하나만 쓴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

const SCENES = [
  { id: 'rune',    tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화] 버튼(홀드)' },
  { id: 'tempup',  tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [투자] 버튼(홀드)' },
  { id: 'tempchg', tab: 'temper', sel: '#trTemper .tp-hd .cg',    n: '단련 [충전] 버튼(홀드)' },
  { id: 'train',   tab: 'train',  sel: '#trCards [data-tr]',      n: '★대조 훈련 카드(64 홀드 — 주인 미지적)' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    /* 전투 캔버스는 매 프레임 달라 «달라진 픽셀» 을 오염시킨다 — 비평 대상이 아니라 가린다 */
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    if (S.temper) S.temper.pts = 500;
    openTrain();
  });
  await page.waitForTimeout(600);

  const made = [];
  for (const s of SCENES) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, s.tab);
    await page.waitForTimeout(450);
    const box = await page.evaluate(() => {
      const b = document.querySelector('#trw .tr-box').getBoundingClientRect();
      return { x: Math.round(b.x) - 6, y: Math.round(b.y) - 6, width: Math.round(b.width) + 12, height: Math.round(b.height) + 12 };
    });
    const r = await page.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, s.sel);
    if (!r) { console.log('  [skip] ' + s.id + ' — 요소 없음 ' + s.sel); continue; }

    const shot = async tag => {
      const f = path.join(OUT, '491-r' + R + '-' + s.id + '-' + tag + '.png');
      await page.screenshot({ clip: box, path: f });
      made.push(path.relative(path.resolve(__dirname, '..'), f));
    };
    /* ⚠ 2회차 — **캡처 한 장이 누름을 늘린다.** `page.screenshot` 은 수백 ms 를 먹으므로 «-down 을 찍고
       손을 떼는» 옛 순서는 실제로 ≈360ms 를 누른 것이 되고, `-up` 프레임은 «누름 뒤 ≈500ms» 다.
       회당 플로터 수명이 .3s 라 그 프레임에는 이미 없다 — 1회차 비평가 둘이 «뗀 뒤 140ms 에 잉크 0» 으로
       읽은 것의 절반이 이 드리프트였다. ⇒ **누름을 두 번 나눠** 찍는다: 1패스는 idle·down, 2패스는
       «짧게 눌렀다 떼고 140ms» 만 재현해 up 을 찍는다. 두 패스의 상태 차이는 «시도 1회» 뿐이다. */
    await shot('idle');
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await shot('down');
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                                if (typeof trHoldStop === 'function') trHoldStop(false); });
    await page.waitForTimeout(400);
    /* 2패스 — 캡처가 끼지 않은 «진짜» 짧은 탭 */
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(140);
    await shot('up');
    await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                                if (typeof trHoldStop === 'function') trHoldStop(false); });
    await page.waitForTimeout(250);
    console.log('  ' + s.id.padEnd(8) + ' 버튼 ' + Math.round(r.w) + '×' + Math.round(r.h)
      + ' @(' + Math.round(r.x) + ',' + Math.round(r.y) + ')  ' + s.n);
  }
  console.log('\n' + made.length + '장 — ' + OUT);
  for (const f of made) console.log('  ' + f);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
