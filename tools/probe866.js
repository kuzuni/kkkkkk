#!/usr/bin/env node
/* 작업 866 — 우리 렌더를 캡처해 `tools/probe866.py`(자 하나)에 물린다.
 *
 *   node tools/probe866.js            # 캡처 + 기하 → python 자 실행
 *   node tools/probe866.js --keep     # 캡처 파일을 지우지 않는다(눈으로 볼 때)
 *
 * ⚠ 캡처는 **프레임 전체(1080×2280)** 다 — `cap89.js` 의 «패널 크롭» 은 859 가 패널을 영역에
 *   꽉 채우게 바꾼 뒤로 고정 y370 이 패널 상변과 어긋나 있어, 자의 좌표계로 쓰면 안 된다.
 *   대신 여기서 **패널 좌상단을 같이 찍어** python 이 «패널 기준 → 프레임» 환산을 직접 한다.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const KEEP = process.argv.includes('--keep');
const OUT = path.join(KEEP ? path.join(ROOT, 'docs/review') : os.tmpdir(), 'probe866-cap.png');
const GEO = path.join(os.tmpdir(), 'probe866-geo.json');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(900);
  /* cap89 와 같은 상태 — 10칸 전부 보유·점등 · 비용 잉크는 ref 와 같은 3자리 */
  await p.evaluate(() => {
    RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
    S.relic = 99999;
    document.querySelector('#tabbar [data-t="box"]').click();
  });
  await p.waitForTimeout(1000);   /* 열림 연출이 끝난 뒤 — 애니 중에 찍으면 다른 것을 잰다 */
  await p.evaluate(() => { document.querySelector('#rwCost b').textContent = '822'; });
  await p.waitForTimeout(140);

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const R = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    const P = R('.rw-panel');
    const rel = (sel) => { const v = R(sel); if (!v) return null;
      return { x: +(v.x - P.x).toFixed(1), y: +(v.y - P.y).toFixed(1), w: v.w, h: v.h }; };
    /* 격자 행 — RW_POS 의 y 로 묶는다(3열·4열·3열) */
    const rows = {};
    document.querySelectorAll('#relw .rw-c').forEach((e) => {
      const r = e.getBoundingClientRect();
      const k = Math.round(r.top - A.top);
      (rows[k] = rows[k] || []).push([r.left - A.left, r.right - A.left]);
    });
    const named = {}; let i = 0;
    Object.keys(rows).sort((a, c) => a - c).forEach((k) => {
      const xs = rows[k];
      named['r' + (++i) + '(' + xs.length + '열)'] =
        { x: +Math.min(...xs.map((v) => v[0])).toFixed(1),
          w: +(Math.max(...xs.map((v) => v[1])) - Math.min(...xs.map((v) => v[0]))).toFixed(1) };
    });
    /* 배수 바 칸 · 라벨 잉크(Range 로 글리프 상자를 직접 잰다) */
    const tabs = [];
    document.querySelectorAll('#rwMulBar .stab').forEach((e) => {
      const r = e.getBoundingClientRect();
      const g = document.createRange(); g.selectNodeContents(e);
      const ink = g.getBoundingClientRect().width;
      tabs.push({ t: e.textContent.trim(), w: +r.width.toFixed(1), ink: +ink.toFixed(1) });
    });
    return { panel: P, basin: rel('.rw-basin'), cost: rel('.rw-cost'), cap: rel('.rw-cap'),
             bar: rel('#rwMulBar'), rows: named, tabs };
  });

  fs.writeFileSync(GEO, JSON.stringify(geo, null, 1));
  await p.screenshot({ path: OUT });
  /* 차분용 사본 둘 — 부품 하나씩 숨긴다(레이아웃은 그대로 두는 visibility) */
  const hide = async (sel) => { await p.evaluate((s) => {
    document.querySelector(s).style.visibility = 'hidden'; }, sel); await p.waitForTimeout(60); };
  const show = async (sel) => { await p.evaluate((s) => {
    document.querySelector(s).style.visibility = ''; }, sel); await p.waitForTimeout(60); };
  await hide('.rw-stone');
  await p.screenshot({ path: OUT.replace('.png', '-nostone.png') });
  await show('.rw-stone');
  await hide('.rw-cost');
  await p.screenshot({ path: OUT.replace('.png', '-nocost.png') });
  await show('.rw-cost');
  await b.close();
  if (errs.length) { console.log('PAGE ERRORS:'); errs.forEach((e) => console.log('  ' + e)); }
  /* ⚑ 932 4회차 — 남은 인자를 파이썬 자에 그대로 넘긴다(`--int` 로 옛 정수 걸음을
     **같은 캡처 위에서** 다시 재기 위해서다. 캡처는 이 자가 만들고 바로 지우므로
     밖에서 따로 물릴 수가 없었다 — 옛 자와의 대조가 재현 불가능했던 자리). */
  const extra = process.argv.slice(2).filter((a) => a !== '--keep');
  const r = py([path.join(__dirname, 'probe866.py'), '--cap', OUT, '--geo', GEO, ...extra],
    { cwd: ROOT, encoding: 'utf-8' });
  process.stdout.write(r);
  if (!KEEP) {
    [OUT, OUT.replace('.png', '-nostone.png'), OUT.replace('.png', '-nocost.png')]
      .forEach((f) => { try { fs.unlinkSync(f); } catch (e) {} });
  }
  else console.log('\n  캡처 보관 — ' + OUT);
})();
