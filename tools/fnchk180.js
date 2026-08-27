/* 작업 180 — 기능 체크 표. `node tools/fnchk180.js`
 *
 * T2 «기능 완성 규칙»(주인 지시 2026-08-25)이 요구하는 «버튼별 — 눌렀을 때 무엇이 바뀌는지» 를
 * 헤드리스 실측으로 한 줄씩 찍는다. **읽기 전용** — 제품도 게이트도 고치지 않는다.
 * 판정은 `verify180`/`neg180` 이 하고, 이 파일은 review 문서에 붙일 «표» 를 만든다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const snap = () => ({
  dia: S.dia, hud: document.getElementById('diaN').textContent,
  mail: (S.mailx||[]).filter(m=>m.src==='monthly').length,
  unread: mailLeft(), dot: document.getElementById('menub').classList.contains('alert'),
  key: S.lastMonthly
});
(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport:{width:1080,height:2280}, deviceScaleFactor:1 });
  await ctx.addInitScript(k => { try{localStorage.removeItem(k);}catch(e){} }, KEY);
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForTimeout(1200);
  await p.addScriptTag({ content: 'window.__snap = ' + snap.toString() + ';' });
  const s0 = await p.evaluate(() => window.__snap());
  console.log('① 신규 부팅          ', JSON.stringify(s0));
  const row = await p.evaluate(() => {
    openMail();
    const m = S.mailx.find(x => x.src==='monthly');
    const r = document.querySelector('#mbox [data-ml="'+m.id+'"]').closest('.ml-r');
    window.__id = m.id;
    return { title:r.querySelector('.ml-t').textContent.trim(),
             sum:r.querySelector('.ml-s').textContent.trim(),
             qty:r.querySelector('.ml-i>i').textContent.trim(),
             btn:r.querySelector('.ml-b').textContent.trim() };
  });
  console.log('② 우편함 행           ', JSON.stringify(row));
  await p.click('#mbox [data-ml="' + (await p.evaluate(()=>window.__id)) + '"]');
  await p.waitForTimeout(1800);
  const s1 = await p.evaluate(() => window.__snap());
  console.log('③ [받기] 클릭 후      ', JSON.stringify(s1));
  const s2 = await p.evaluate(() => { for(let i=0;i<30;i++) dailyCheck(); return window.__snap(); });
  console.log('④ dailyCheck ×30 후   ', JSON.stringify(s2));
  const s3 = await p.evaluate(() => { S.lastMonthly='2026-07'; dailyCheck(); return window.__snap(); });
  console.log('⑤ 달이 바뀐 뒤        ', JSON.stringify(s3));
  await b.close();
})();
