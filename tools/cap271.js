/* 작업 271 — 룬 하위 탭 캡처 + 글자 넘침 스캔.
 * 실행: node tools/cap271.js [출력디렉터리]
 *
 * 기준 해상도 1080×2280(지시서 [2] · 2026-08-25 확정). 세 장을 찍는다:
 *   271-a-r1.png  일반룬(열림, Lv0)          — 고급·천상 칸 자물쇠
 *   271-b-r2.png  고급룬(잠김)               — 잠긴 칸을 골랐을 때의 덮개
 *   271-c-r3.png  천상룬(열림, 셋 다 개방)   — 3축 효과 · 계단 5/5 · MAX 판
 * 캡처와 함께 카드 안 글자 상자의 **넘침(scrollWidth > clientWidth)** 을 수치로 찍는다 —
 * 이 카드는 한 줄짜리 절대좌표 상자가 많아 «길어지면 조용히 잘리는» 자리가 생긴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1200);

  const shots = [
    { f: '271-a-r1.png', lv: { r1: 0, r2: 0, r3: 0 }, pick: 'r1' },
    { f: '271-b-r2.png', lv: { r1: 0, r2: 0, r3: 0 }, pick: 'r2' },
    { f: '271-c-r3.png', lv: { r1: 500, r2: 500, r3: 480 }, pick: 'r3' }
  ];
  for (const s of shots) {
    const over = await p.evaluate(o => {
      S.rune = o.lv; S.rstone = 500000; S.dia = 90000;
      openTrain(); setTrSub('rune'); setRuneSub(o.pick); renderTrain();
      /* 한 줄 상자의 넘침 — 잉크가 상자보다 넓으면 잘린다(절대좌표 카드의 고질) */
      /* 접힘 스캔 — 한 줄이어야 하는 상자의 **높이**를 line-height 와 견준다.
         잉크가 상자보다 넓으면 접혀서 높이가 늘고, 늘어난 줄이 아래 줄 위로 올라탄다.
         (폭으로 재면 안 된다 — 이 상자들은 절대좌표라 bbox 폭이 항상 선언 폭 그대로다) */
      return ['.rd>.rw>i', '.rd>.rw>s', '.rst>i', '.rhint>i', '.rn>i', '.rl>i', '.rlk>i']
        .map(sel => {
          const es = [...document.querySelectorAll('.tr-rn>' + sel)];
          if (!es.length) return sel + ':—';
          return sel + ':' + es.map(e => {
            const h = e.getBoundingClientRect().height;
            const lh = parseFloat(getComputedStyle(e.parentElement).lineHeight);
            return h.toFixed(0) + '/' + (lh || '—') + (lh && h > lh + 1 ? ' ⚠접힘' : '');
          }).join(',');
        }).join('  ');
    }, s);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, s.f) });
    console.log(s.f + '\n  ' + over);
  }
  await b.close();
})();
