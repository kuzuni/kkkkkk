/* 작업 218 실측 프로브 — verify76 §3 «3번째는 «무료 소환 소진» 팝업» 이 빨간 이유를 가른다.
   물음: 149(팝업→토스트)가 자리를 옮긴 «게이트 부패» 인가, 아니면 안내 자체가 사라진 «진짜 회귀» 인가.
   실행: node tools/probe218.js
   재는 것:
     ⓐ 무료 잔량 소진 뒤 3번째 클릭이 실제로 무엇을 띄우는가(#fxl .fx-toast · #modal.on 둘 다)
     ⓑ 그 문구에 «무료 소환 소진» · «목걸이» 가 들어 있는가
     ⓒ 토스트 수명(760 퇴장 · 1060 제거) 안에서 언제까지 읽히는가 — 대기 시간 근거
     ⓓ 소진 클릭이 상태를 안 바꾸는가(다이아·획득 수) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function launchAny(){
  try { return await launch(chromium); }
  catch (e) {
    const fs = require('fs');
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean).find(x => { try { return fs.existsSync(x); } catch (_) { return false; } });
    if (!cand) throw e;
    return await launch(chromium, { executablePath: cand });
  }
}

(async () => {
  const b = await launchAny();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* 무료 2회를 미리 태워 잔량 0 으로 만든다 (verify76 §3 과 같은 준비) */
  const prep = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.guide.idx = GUIDE.length; S.dia = 0;
    closeModal && closeModal();
    openShopPage(); renderShopPage();
    const seq = [freeLeft('amulet')];
    for (let k = 0; k < 2; k++) {
      closeModal && closeModal();
      document.querySelector('#shopList .shp-card:nth-child(3) [data-shfree]').click();
      seq.push(freeLeft('amulet'));
    }
    closeModal && closeModal();
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    return { seq, dia: S.dia, eq: S.cnt.sumEquip, notifySrc: String(notify).slice(0, 120) };
  });
  console.log('[prep] 무료 잔량', prep.seq.join('→'), '· 다이아', prep.dia, '· 누적획득', prep.eq);
  console.log('[prep] notify() =', prep.notifySrc.replace(/\s+/g, ' '));

  /* ⓐⓑ 3번째(소진) 클릭 — 토스트/모달 양쪽을 시각별로 읽는다 */
  const shot = t => p.evaluate(() => ({
    toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | '),
    toastHTML: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.innerHTML).join(' | '),
    out: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.classList.contains('out')).join(','),
    modal: !!document.querySelector('.modal.on, #modal.on'),
    mtitle: document.getElementById('mtitle') ? document.getElementById('mtitle').textContent : '(없음)',
    mbox: document.getElementById('mbox') ? document.getElementById('mbox').textContent.slice(0, 60) : '(없음)',
    dia: S.dia, eq: S.cnt.sumEquip, left: freeLeft('amulet')
  }));

  await p.evaluate(() => { document.querySelector('#shopList .shp-card:nth-child(3) [data-shfree]').click(); });
  for (const t of [0, 100, 300, 500, 700, 900, 1100]) {
    if (t) await p.waitForTimeout(t === 100 ? 100 : 200);
    const s = await shot();
    console.log(`  t=${String(t).padStart(4)}ms  toast="${s.toast}"  out=[${s.out}]  modal=${s.modal}  (mtitle="${s.mtitle}")  dia=${s.dia} eq=${s.eq} left=${s.left}`);
  }

  const fin = await shot();
  console.log('\n[판정 재료]');
  console.log('  · «무료 소환 소진» 포함?', /무료 소환 소진/.test(fin.toast) || /무료 소환 소진/.test(fin.mbox));
  console.log('  · «목걸이» 포함?      ', /목걸이/.test(fin.toast) || /목걸이/.test(fin.mbox));
  console.log('  · 상태 불변?          ', fin.dia === prep.dia && fin.eq === prep.eq, `(dia ${prep.dia}→${fin.dia} · eq ${prep.eq}→${fin.eq})`);
  console.log('  · 콘솔 에러', errs.length, errs.slice(0, 3));
  await b.close();
})();
