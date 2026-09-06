#!/usr/bin/env node
/* 888 재현기 — «`verify420` 이 빨간 것은 팝업이 아니라 **버튼이 움직였기 때문**» 을 커밋 대조로 못박는다.
 *
 * 실행:
 *   node tools/probe888.js                    현행 트리만
 *   node tools/probe888.js <sha> [<sha> …]    그 커밋들의 `index.html` 사본까지 같은 자로 잰다
 *
 * 왜 «커밋 대조» 인가(338 규칙 — 처방 전에 재현부터):
 *   `verify420` §2 는 「팝업 하변 ↔ `#rwBasin` 상변 여백 = 30」 을 못박는다. 그 30 은
 *   **두 값의 차**라 어느 쪽이 움직여도 빨개진다. 같은 절의 「팝업 하변 = H − 596」 이 **초록**이므로
 *   움직인 쪽은 버튼인데, 그것만으로는 «어느 작업이 옮겼나» 를 못 짚는다 — 여기서 그것을 잰다.
 *   재는 값은 셋뿐이다:
 *     · `ci.y2`  33 팝업 하변(프레임 좌표)
 *     · `btn.y1` `#rwBasin` 상변
 *     · **F = H − btn.y1**  = 420 이 상수 `F = 566` 으로 못박아 둔 파생값 그 자체
 *   F 가 커밋마다 어떻게 걷는지 한 표로 찍으면 뿌리가 한 줄로 갈린다.
 *
 * ⚠ 사본은 **저장소 루트**에 둔다(`.p888-<sha>.html` · .gitignore `/.*.html`) — `/tmp` 에 두면
 *   `index.html` 이 상대 경로로 무는 `assets/**` 가 통째로 404 라 레이아웃이 달라진다
 *   (360·367·438·439 가 같은 이유로 루트에 둔 선례).
 * ⚠ 정착은 `probe351lib` 의 것을 그대로 쓴다 — `verify420` 이 쓰는 자와 «다른 순간» 을 재면
 *   숫자를 대조할 수 없다(385 «자매 자 드리프트»).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const G756 = require('./gitrev756');           /* 756 — 얕은 클론에서 고정 SHA 를 데려오는 공용 부품 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { settle } = require('./probe351lib');

const ROOT = path.resolve(__dirname, '..');
/* 기본 스윕은 «클램프가 무는 바닥 3 + 1800 + 9:19» 다. 커밋 대조는 1600 한 프레임이면 갈리므로
   `P888_H=1600` 처럼 줄여 부를 수 있게 열어 둔다(대조 한 번에 브라우저 기동이 커밋 수만큼 든다). */
const SWEEP = (process.env.P888_H || '1600,1650,1700,1800,2280').split(',').map(Number);

/* `verify420` 의 오프너·자와 같은 것 — 베끼지 않고 같은 문자열을 쓴다 */
const OPEN_RELIC = `(async function(){
  const sel = '[data-cur="relic"]';
  const drawn = () => { const e = document.querySelector(sel); if (!e) return false;
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  if (!drawn()) {
    for (const t of [...document.querySelectorAll('.tab[data-t]')]) {
      t.click(); await new Promise(r => setTimeout(r, 340));
      if (drawn()) break;
    }
  }
  if (!drawn()) return { ok:false, why:'유물조각 알약이 어느 탭에서도 안 그려진다' };
  document.querySelector(sel).click();
  await new Promise(r => setTimeout(r, 500));
  return { ok: !!document.querySelector('#ciw.on') && !!document.querySelector('#relw.on') };
})`;

const MEAS = `(function(){
  const A = document.getElementById('app').getBoundingClientRect();
  const sc = A.width / 1080 || 1;
  const ci = document.querySelector('#ciw.on .ci');
  const btn = document.getElementById('rwBasin');
  if (!ci || !btn) return null;
  const rel = (v) => +((v - A.top) / sc).toFixed(1);
  const rc = ci.getBoundingClientRect(), rb = btn.getBoundingClientRect();
  const H = Math.round(A.height / sc);
  return { H, ciY2: rel(rc.bottom), btnY1: rel(rb.top),
    F: +(H - rel(rb.top)).toFixed(1),
    gap: +((rb.top - rc.bottom) / sc).toFixed(1),
    pad: getComputedStyle(document.getElementById('ciw')).paddingBottom };
})`;

async function measure(browser, file, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + file);
  await p.waitForTimeout(1100);
  const opened = await p.evaluate(OPEN_RELIC + '()');
  await settle(p);
  const m = opened.ok ? await p.evaluate(MEAS + '()') : null;
  await ctx.close();
  return m || { H: h, err: opened.why || '안 열렸다' };
}

(async () => {
  const shas = process.argv.slice(2);
  const targets = [{ tag: 'HEAD(작업 트리)', file: path.join(ROOT, 'index.html'), tmp: null }];
  /* 사본은 부품(756)을 지나 꺼낸다 — 얕은 클론이면 **먼저 판고**, 그래도 없을 때만 갈린다(965).
     ⚠ 갈림이 이 자의 안전핀이다: 얕으면 ⏸ 보류(그 대상만 건너뛴다) · 얕지 않은데 없으면
     그 SHA 는 **진짜 없는 것**(지워졌거나 오타)이라 빨강이다 — 조용히 건너뛰면 오타가 초록이 된다. */
  let skip = 0, bad = 0;
  for (const s of shas) {
    const g = G756.show(s, 'index.html', { cwd: ROOT, maxBuffer: 1 << 28 });
    if (!g.ok) {
      if (g.env) { skip++; console.log('\n■ ' + s + ' — ' + G756.skipNote(g)); }
      else { bad++; console.log('\n■ ' + s + ' — ✗ 사본을 못 꺼낸다: ' + g.why); }
      continue;
    }
    if (g.how) console.log('\n· ' + s + ' 를 판아 왔다 —' + g.how);
    const tmp = path.join(ROOT, '.p888-' + s + '.html');
    fs.writeFileSync(tmp, g.buf);
    const subj = execFileSync('git', ['log', '-1', '--format=%h %s', s], { cwd: ROOT, encoding: 'utf8' }).trim();
    targets.push({ tag: subj.slice(0, 72), file: tmp, tmp });
  }
  const browser = await launch(chromium);
  try {
    for (const t of targets) {
      console.log('\n■', t.tag);
      console.log('    H     팝업하변   버튼상변   F=H−상변   여백   #ciw padding-bottom');
      for (const h of SWEEP) {
        const m = await measure(browser, t.file, h);
        if (m.err) { console.log(`  ${String(h).padStart(4)}  — ${m.err}`); continue; }
        console.log(`  ${String(h).padStart(4)}  ${String(m.ciY2).padStart(8)}  ${String(m.btnY1).padStart(9)}` +
          `  ${String(m.F).padStart(8)}  ${String(m.gap).padStart(6)}   ${m.pad}`);
      }
    }
  } finally {
    await browser.close();
    for (const t of targets) if (t.tmp) fs.unlinkSync(t.tmp);
  }
  console.log('\n※ F = 420 이 상수로 못박은 파생값(등재 당시 566 · 짧은 구간). 여백 = 팝업 하변 ↔ 버튼 상변.');
  console.log('PROBE888 대상 ' + targets.length + '건' +
              (skip ? ' · ⏸ 보류 ' + skip + '건(환경 — 세지 않는다)' : '') +
              (bad ? ' · ✗ ' + bad + '건(그 SHA 가 진짜 없다)' : ''));
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('PROBE888 CRASH', e); process.exit(2); });
