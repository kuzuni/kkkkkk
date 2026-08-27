/* 작업 189 기능 체크 — «마을» 버튼 · «배속»(#spdb) 버튼 삭제 (2026-08-27, 저장소 주인 지시)
 *
 * 지시서 ROUTINE.md «기능 완성 규칙»: T2(주인 지시) 작업의 완료 조건은 «만들어 놓음» 이 아니라
 * «실제 게임 데이터로 동작하고 결과가 다른 화면에 반영됨» 이다. 이 작업은 **삭제** 라서
 * «무엇이 눌러지는가» 가 아니라 «무엇이 더는 없고, 옆 칸은 그대로인가» 가 기능 표다.
 *
 * 삭제 작업의 함정 두 가지를 같이 잰다:
 *   ⓐ 진입점(마크업)만 지우고 «상태»·핸들러·CSS 가 남으면 게이트는 초록인 채 화면이 거짓말을 한다
 *      (LESSONS 182-①). → 소스 grep 으로 CSS 규칙·핸들러·토스트 문구까지 0 건을 센다.
 *   ⓑ 칸을 지우면 **남은 칸의 앵커가 움직인다**(LESSONS 182-⑤ 의 뒷면). #botleft 는 bottom 앵커
 *      flex 컬럼이라 «마을» 을 빼면 채팅이 아래로 내려앉는다. → 채팅 bbox 를 측정표 §3 으로 잰다.
 *
 * 실행: node tools/fnchk189.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, d) => { c ? pass++ : (fail++, bad.push(n)); console.log(' ' + (c ? 'ok  ' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const near = (n, got, want, tol) => ok(n + ' = ' + want + '±' + tol, Math.abs(got - want) <= tol, 'got ' + (+got).toFixed(1));

(async () => {
  console.log('\n[1] 소스 — 삭제가 «진입점만» 이 아니었나 (LESSONS 182-①)');
  ok('마크업 [data-util="town"] 0건',        !/data-util\s*=\s*"town"/.test(SRC));
  ok('CSS 규칙 [data-util=town] 0건',        !/\[data-util=town\]/.test(SRC));
  ok('마크업 id="spdb" 0건',                 !/id\s*=\s*"spdb"/.test(SRC));
  /* 주석 안의 «#spdb» 는 근거 기록이라 남는다 — 셀렉터로 쓰인 것만 센다 */
  ok('CSS 선택자 #spdb{ / #spdb . / #spdb:: 0건', !/#spdb\s*[{.:]/.test(SRC));
  ok("핸들러 $('spdb') 0건",                 !/\$\(\s*['"]spdb['"]\s*\)/.test(SRC));
  ok('토스트 «마을은 아직 준비 중입니다» 0건', !SRC.includes('마을은 아직 준비 중입니다'));
  ok('토스트 «전투 배속은 아직 해금되지 않았습니다» 0건', !SRC.includes('전투 배속은 아직 해금되지 않았습니다'));

  const browser = await launch(chromium);
  const errs = [];
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1600);

  /* 프레임 px — #app 은 fit() 이 scale 한다. 하단 고정 요소는 «stagearea 바닥 기준» 으로 잰다
     (측정표 02 서두: bottom = 2160 − ref_bottom). */
  const G = await page.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), k = ar.width / 1080;
    const sa = document.getElementById('stagearea').getBoundingClientRect();
    const F = s => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: (b.left - ar.left) / k, y: (b.top - ar.top) / k, w: b.width / k, h: b.height / k,
               cx: ((b.left + b.right) / 2 - ar.left) / k, saBot: (sa.bottom - b.bottom) / k }; };
    return {
      spdb: !!document.getElementById('spdb'),
      town: !!document.querySelector('#botleft [data-util="town"]'),
      chat: F('#botleft .ubtn[data-util="chat"]'),
      botleft: F('#botleft'),
      kids: document.querySelectorAll('#botleft .ubtn').length,
      tuto: F('#tuto'),
      hasChatPage: !!document.getElementById('chw')
    };
  });

  console.log('\n[2] DOM — 두 칸이 실제로 없다');
  ok('#spdb 없음',            !G.spdb);
  ok('«마을» 칸 없음',        !G.town);
  ok('#botleft 자식 .ubtn 1개(채팅만)', G.kids === 1, G.kids + '개');

  console.log('\n[3] 남은 칸 — 💬 채팅이 측정표 §3 자리에 앉았나 (앵커 재정렬)');
  ok('💬 채팅 칸 존재', !!G.chat);
  if (G.chat) {
    near('채팅 Ø(w)', G.chat.w, 100, 1.5);
    near('채팅 Ø(h)', G.chat.h, 100, 1.5);
    near('채팅 중심 x(ref 85)', G.chat.cx, 85, 1.5);
    /* ref 채팅 하단 1812 → stagearea 바닥(= ref 2160) 기준 348 */
    near('채팅 하단(stagearea 바닥 기준 348)', G.chat.saBot, 348, 1.5);
    near('#botleft 좌단(ref 17)', G.botleft.x, 17, 1.5);
  }
  console.log('\n[4] 이웃 — 우하단 미션 배너(#tuto)는 안 움직였다');
  if (G.tuto) {
    near('#tuto left(ref 620)', G.tuto.x, 620, 1.5);
    near('#tuto w(ref 460)', G.tuto.w, 460, 1.5);
    near('#tuto 하단(stagearea 바닥 기준 171)', G.tuto.saBot, 171, 2);
  } else ok('#tuto 존재', false);

  console.log('\n[5] 채팅은 여전히 «눌리면 채팅 페이지가 열린다» (103 무회귀)');
  ok('#chw 페이지가 있다', G.hasChatPage);
  const chatOpen = await page.evaluate(() => {
    document.querySelector('#botleft .ubtn[data-util="chat"]').click();
    const w = document.getElementById('chw');
    return !!w && getComputedStyle(w).display !== 'none' && w.getBoundingClientRect().width > 300;
  });
  ok('💬 클릭 → 채팅 페이지 열림', chatOpen);
  await page.evaluate(() => { try { closeChat(); } catch (e) { try { closeTop(); } catch (e2) {} } });
  await page.waitForTimeout(300);

  console.log('\n[6] 던전 런 — 배속만 자리를 옮기던 규칙이 사라져도 나머지는 그대로 (30 무회귀)');
  const dun = await page.evaluate(async () => {
    try { openDungeon(); } catch (e) { return { err: String(e) }; }
    return { opened: !!document.querySelector('#dunw') };
  });
  ok('03 던전 페이지 열림', !dun.err && dun.opened, dun.err || '');

  console.log('\n[7] 콘솔');
  ok('콘솔·런타임 에러 0', errs.length === 0, errs.slice(0, 3).join(' / ') || '0건');

  await browser.close();
  console.log('');
  if (bad.length) { console.log('실패 항목:'); bad.forEach(b => console.log('  · ' + b)); }
  console.log('FNCHK189 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
