/* 103 채팅 페이지 캡처 + 기하 게이트 — 1080×2280 (ROUTINE [3]-(나) 1번 · (가) 검증 겸용).
   레퍼런스와 «같은 상태» 로 맞추는 것이 캡처의 절반이다(LESSONS 04-①):
   ref 는 리스트가 **바닥까지 스크롤된** 상태이고 맨 위 행이 반쯤 잘려 있다 → openChat() 이 그 상태로 연다.
   사용: node tools/cap103.js [출력경로]
   출력: 스크린샷 + 실측 bbox JSON + «CAP103 …» 요약(측정표 §1·§3·§5·§6 대조용). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'docs/review/103-r1.png';

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)) {
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {}
  }
  return {};
}

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /* 58 재화 파티클(#fxl)이 전체화면 페이지 «위» 를 지나가 채점을 오염시킨다(cap53/72/54 와 같은 대책) */
  await page.addStyleTag({ content: '#fxl{display:none!important}' });

  const injected = await page.evaluate(() => {
    if (typeof S === 'undefined' || typeof openChat !== 'function') return 'no-hooks';
    S.autoBuy = false; S.spAuto = false;
    S.nick = '용사_9174';
    openChat();
    return true;
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(700);            /* 아바타 캔버스 재시도(200ms 간격)를 몇 번 태운다 */
  await page.evaluate(() => { const l = document.getElementById('chList'); l.scrollTop = l.scrollHeight; });
  await page.waitForTimeout(200);

  const on = await page.evaluate(() => document.getElementById('chw').classList.contains('on'));
  if (injected === 'no-hooks' || !on) {
    console.error('CAP103 FAIL — 주입/오픈 실패:', injected, 'on=' + on);
    await browser.close(); process.exit(1);
  }

  await page.screenshot({ path: OUT });

  const box = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const rel = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { x: +(r.left - app.left).toFixed(1), y: +(r.top - app.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const q = (s) => rel(document.querySelector(s));
    const rows = [...document.querySelectorAll('#chList .ch-row')];
    const bub = rows.map((r) => r.querySelector('.ch-bb')).filter(Boolean);
    const byLines = {};
    bub.forEach((b) => { const n = Math.round((b.getBoundingClientRect().height - 26) / 37);
      if (!byLines[n]) byLines[n] = +b.getBoundingClientRect().height.toFixed(1); });
    return {
      scale: +(app.width / 1080).toFixed(4),
      list: q('.ch-list'), bar: q('.ch-bar'), back: q('.ch-back'), input: q('.ch-in'),
      rows: rows.length,
      row1: rel(rows[0]), av1: q('#chList .ch-row .ch-av'),
      nm1: q('#chList .ch-row .ch-nm'), tm1: q('#chList .ch-row .ch-tm'),
      bb1: q('#chList .ch-row .ch-bb'),
      bubbleH: byLines,
      card: q('.ch-cd'), cw: q('.ch-cd>.ch-cw'), cl: q('.ch-cd>.ch-cl'),
      cardAv: q('.ch-cd>.ch-cw .ch-cav'), cardAvR: q('.ch-cd>.ch-cl .ch-cav'),
      cardWl: q('.ch-cd .ch-wl'),
      cardNk: q('.ch-cd>.ch-cw .ch-cnk'), cardCp: q('.ch-cd>.ch-cw .ch-ccp'), rp: q('.ch-rp'),
      nmInk: ['.ch-gd', '.ch-nk', '.ch-sx', '.ch-bd'].map((s2) => q('#chList .ch-row .ch-nm ' + s2)),
      pitch: rows.slice(0, 6).map((r, i, a) => i ? +(r.getBoundingClientRect().top
        - a[i - 1].getBoundingClientRect().top).toFixed(1) : 0).slice(1),
      /* 캔버스는 file:// 아틀라스로 tainted 라 getImageData 가 막힌다 →
         drawHeroTo 의 «그렸다» 반환값을 다시 한 번 받아 센다(같은 경로, 부작용 없음). */
      painted: chLog.reduce((n, m, i) => n + (chPaint('chAv' + i, m.look) ? 1 : 0)
        + (m.vs ? (chPaint('chVs' + i + 'w', { avatar:'av' + (m.vs[0] % 6) }) ? 1 : 0)
                + (chPaint('chVs' + i + 'l', { avatar:'av' + (m.vs[1] % 6) }) ? 1 : 0) : 0), 0),
      canvases: document.querySelectorAll('#chList canvas').length
    };
  });

  /* ---- (가) 기능 검증: 입력 → 전송 → 행 추가 ---- */
  const before = await page.evaluate(() => document.querySelectorAll('#chList .ch-row').length);
  await page.click('#chIn');
  await page.type('#chIn', '테스트 전송 <b>xss</b>');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const send = await page.evaluate(() => {
    const rows = document.querySelectorAll('#chList .ch-row');
    const last = rows[rows.length - 1];
    const l = document.getElementById('chList');
    return { rows: rows.length, text: last.querySelector('.ch-bb') ? last.querySelector('.ch-bb').textContent : '',
             html: last.querySelector('.ch-bb') ? last.querySelector('.ch-bb').innerHTML : '',
             nick: last.querySelector('.ch-nm .ch-nk') ? last.querySelector('.ch-nm .ch-nk').textContent : '',
             cleared: document.getElementById('chIn').value === '',
             atBottom: l.scrollHeight - l.scrollTop - l.clientHeight < 4 };
  });
  /* 빈 문자열은 전송되지 않아야 한다 */
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const emptyGuard = await page.evaluate(() => document.querySelectorAll('#chList .ch-row').length);
  /* 뒤로가기 = 닫기 */
  await page.click('#chBack');
  await page.waitForTimeout(200);
  const closed = await page.evaluate(() => !document.getElementById('chw').classList.contains('on'));

  const M = [];                                  /* [항목, 실측, 기대, 허용오차] */
  const near = (n, a, b, t) => M.push([n, a, b, Math.abs(a - b) <= t]);
  near('입력 바 h', box.bar.h, 186, 1);
  near('입력 바 top', box.bar.y, 2280 - 186, 1);
  near('리스트 bottom', box.list.y + box.list.h, 2280 - 186, 1);
  near('뒤로 버튼 w×h', box.back.w * 1000 + box.back.h, 76 * 1000 + 63, 1);
  near('뒤로 버튼 x', box.back.x, 22, 1);
  near('입력창 x', box.input.x, 123, 1);
  near('입력창 w', box.input.w, 931, 1);
  near('입력창 h', box.input.h, 100, 1);
  near('아바타 x', box.av1.x, 136, 1);
  near('아바타 w', box.av1.w, 95, 1);
  near('이름줄 x', box.nm1.x, 240, 1);
  near('시각 우끝', box.tm1.x + box.tm1.w, 969, 2);   /* 3회차 P·Q 실측 ref 잉크 967.5~973.9 */
  near('버블 x', box.bb1.x, 240, 1);
  near('버블 w', box.bb1.w, 699, 1);
  near('버블 top(행 기준)', box.bb1.y - box.row1.y, 49, 1);
  near('1줄 버블 h', box.bubbleH[1] || 0, 62, 1);
  near('2줄 버블 h', box.bubbleH[2] || 0, 98, 1);
  near('3줄 버블 h', box.bubbleH[3] || 0, 134, 1);
  /* 1회차 비평(X D1~D3 · Y D1~D2)이 둘 다 잡은 «카드 우칸이 42px 위로» — 21 도감의 전역 `.cl`
     (`transform:translateY(-42px)` + 검정 5px 테두리)과 클래스명이 충돌한 것이었다.
     두 칸의 top·height 가 같은지를 게이트에 박아 재발을 막는다. */
  near('카드 두 칸 top 일치', box.cw.y - box.cl.y, 0, 0.5);
  near('카드 승리칸 h', box.cw.h, 206, 1);
  near('카드 상대칸 h', box.cl.h, 206, 1);
  near('카드 상대칸 x(구분선 0)', box.cl.x - (box.cw.x + box.cw.w), 0, 0.5);
  near('카드 w', box.card.w, 699, 1);
  near('카드 h', box.card.h, 206, 1);
  near('카드 승리칸 w', box.cw.w, 351, 1);
  near('카드 상대칸 w', box.cl.w, 348, 1);
  near('카드 아바타 w', box.cardAv.w, 95, 1);
  near('카드 좌 아바타 top(카드 기준)', box.cardAv.y - box.card.y, 15, 1);
  near('카드 우 아바타 top(카드 기준)', box.cardAvR.y - box.card.y, 15, 1);
  near('관전 배지 x', box.rp.x, 931, 1);
  M.push(['1줄 행 pitch 132', box.pitch[0], 132, Math.abs(box.pitch[0] - 132) <= 2]);
  M.push(['아바타 전부 그려짐', box.painted + '/' + box.canvases, box.canvases, box.painted === box.canvases]);
  M.push(['전송 → 행 +1', send.rows, before + 1, send.rows === before + 1]);
  M.push(['전송 본문 보존', send.text, '테스트 전송 <b>xss</b>', send.text === '테스트 전송 <b>xss</b>']);
  M.push(['HTML 주입 차단', send.html.indexOf('&lt;b&gt;') >= 0, true, send.html.indexOf('&lt;b&gt;') >= 0]);
  M.push(['내 닉네임 행', send.nick, '용사_9174', send.nick === '용사_9174']);
  M.push(['입력창 비움', send.cleared, true, send.cleared]);
  M.push(['전송 후 바닥 스크롤', send.atBottom, true, send.atBottom]);
  M.push(['빈 입력 전송 차단', emptyGuard, send.rows, emptyGuard === send.rows]);
  M.push(['◀ = 닫기', closed, true, closed]);
  M.push(['콘솔 에러 0건', errs.length, 0, errs.length === 0]);

  console.log('CAP103 →', OUT);
  console.log(JSON.stringify(box, null, 1));
  let bad = 0;
  for (const [n, a, b, okk] of M) { if (!okk) bad++; console.log((okk ? '  ✓ ' : '  ✗ ') + n + ' = ' + a + ' (기대 ' + b + ')'); }
  if (errs.length) { console.log('CONSOLE ERRORS:'); errs.forEach((e) => console.log(' ', e)); }
  console.log(bad ? `VERIFY103 FAIL ${M.length - bad}/${M.length}` : `VERIFY103 ${M.length}/${M.length} PASS`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
