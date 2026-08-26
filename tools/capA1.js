/* 작업 A1 하단 탭바 — 캡처 하네스 (1080×2280, 9:19 기준 해상도)
   실행: node tools/capA1.js <회차>
     → docs/review/A1-r<회차>.png          닫힘 상태 전체 화면 (채점용)
       docs/review/A1-r<회차>-open.png     열림 상태(영웅 패널) 전체 화면 (채점용)
     + 차분용 5장(단방향으로 «끄기만» 한다 — A2-⑤):
       -dA.png  탭바 전부 켜짐        -dB.png  레드닷·리본 끔      -dC.png  라벨까지 끔
       -dD.png  아이콘까지 끔(껍데기)  -dE.png  탭바까지 끔(기준판)
       차분:  레드닷·리본 = A−B · 라벨 = B−C · 아이콘 = C−D · 바 껍데기 = D−E
     + docs/review/A1-r<회차>-dom.json     getBoundingClientRect 실측

   A2 교훈을 그대로 따른다:
   - A2-③ 박스 밖으로 나가는 부속(레드닷·NEW 리본)은 아이콘 차분에서 먼저 끈다.
   - A2-⑤ `visibility` 를 껐다 켰다 하지 않는다 — 장마다 새 스타일을 «더하기만» 한다.
     그리고 rAF 만 얼려서는 CSS 애니메이션(60 쥬시)이 계속 돌아 차분이 번진다 →
     `animation-play-state:paused` + `transition:none` 까지 얹는다.
   - 28 교훈 3 캔버스가 흰 잉크 스캔을 오염시킨다 → `#view` 를 내리고 찍는다.
   상태는 레퍼런스 02 와 동일(패널 닫힘 · STAGE 37). */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const r = process.argv[2] || '1';
const dir = path.resolve(__dirname, '../docs/review');
const out = s => path.join(dir, 'A1-r' + r + (s ? '-' + s : '') + '.png');

/* ⚠ 채점본을 «비평가가 읽고 있는 동안» 덮어쓰면 그 회차 채점이 통째로 무효가 된다.
   실제로 7회차에 그랬다 — I·J 를 띄운 뒤 수정하고 같은 이름으로 다시 찍어, 두 비평가가
   서로 다른 빌드를 봤을 수 있는 상태가 됐다. 이미 있는 회차는 `--force` 를 줘야 덮어쓴다. */
if (require('fs').existsSync(out('')) && !process.argv.includes('--force')) {
  console.error('A1-r' + r + '.png 이 이미 있다. 회차 번호를 올리거나 --force 를 줘라.\n' +
    '(비평가가 읽는 중인 채점본을 덮어쓰면 그 회차는 무효다)');
  process.exit(2);
}

const setup = () => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  S.stage = 37; S.best = 37;
  S.gold = 1234567; S.dia = 8900;
  S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0;
  S.totalKills = 500;
  /* 레퍼런스 02 의 탭바 상태를 그대로 만든다 —
     레드닷은 성장·모험·보물상자 3칸(측정표 §6), NEW 리본은 상점 칸(측정표 §7). */
  S.seen = S.seen || {};
  S.seen.hero = 1; S.seen.grow = 1; S.seen.adv = 1; S.seen.box = 1;
  S.seen.shop = 0;
  if (panelOpen) { panelOpen = false; syncPanel(); }
  uiDirty = true; renderUI(); drawHud(); drawTuto();
  document.querySelectorAll('.tab').forEach(t => {
    const k = t.dataset.t;
    t.classList.toggle('alert', k === 'grow' || k === 'adv' || k === 'box');
    t.classList.toggle('fresh', k === 'shop');
  });
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  /* 58 연출 모듈의 재화 파티클이 탭바 위를 지나가 채점을 오염시킨다(02·53 이 같은 사고) */
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(setup);
  await p.waitForTimeout(700);
  await p.evaluate(() => { killed = Math.round(stageTotal() * 0.32);
    const f = $('prF'); if (f) f.style.width = (killed / stageTotal() * 100) + '%'; });
  await p.waitForTimeout(150);

  /* 차분을 쓰려면 장들이 «탭바 말고는 동일» 해야 한다 */
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i);
  });
  /* ⚠ `animation-play-state:paused` 로는 부족하다 — «어느 위상에서» 멈췄는지가 실행마다 다르다.
     60 쥬시의 `jzDotPulse`(scale 1→1.14 무한)가 `.tab.fresh .nw` 에 걸려 있어서, 일시정지 캡처의
     NEW 리본이 회차마다 최대 +14% 로 부푼 채 찍힌다(r6 에서 rect 117.6 = 설계 107.0 × 1.10).
     `animation:none` 은 요소를 «애니메이션이 없었을 때의 상태» 로 되돌려 재현성이 있다. */
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await p.waitForTimeout(250);

  /* 레퍼런스 02 의 배지 상태를 «얼린 뒤에» 못 박는다 (LESSONS 04-1 — 캡처 상태가
     레퍼런스와 다르면 그 회차 비평은 통째로 무효다). setup 안에서 걸면 그 뒤 700ms 동안
     게임 자신의 renderUI 가 알림 조건을 다시 계산해 덮어쓴다. */
  const pin = () => document.querySelectorAll('.tab').forEach(t => {
    const k = t.dataset.t;
    t.classList.toggle('alert', k === 'grow' || k === 'adv' || k === 'box');
    t.classList.toggle('fresh', k === 'shop');
  });
  await p.evaluate(pin);
  await p.waitForTimeout(120);

  /* [1] 채점용 — 닫힘 */
  await p.screenshot({ path: out('') });

  /* [2] 채점용 — 열림(영웅 패널). 측정표 §2 «✕칸 296 + 나머지 196» 확인용 */
  await p.evaluate(() => { goTab('hero'); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out('open') });
  await p.evaluate(() => { goTab('hero'); });          /* 재클릭 = 닫힘 */
  await p.waitForTimeout(500);
  await p.evaluate(pin);                               /* goTab 이 배지를 다시 계산한다 */
  await p.waitForTimeout(120);

  /* [3] DOM 실측 — 프레임 좌표(= 캡처 좌표) */
  const dom = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { if (!e) return null; const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(1), y: +(b.y - app.y).toFixed(1),
               w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const bar = document.getElementById('tabbar');
    const tabs = [...document.querySelectorAll('.tab')].map(e => {
      const ti = e.querySelector('.ti'), cs = ti ? getComputedStyle(ti) : null;
      return { t: e.dataset.t, label: e.querySelector('.tl').textContent,
        cell: g(e), ti: g(ti), tl: g(e.querySelector('.tl')),
        bdg: e.classList.contains('alert') ? g(e.querySelector('.bdg')) : null,
        nw: e.classList.contains('fresh') ? g(e.querySelector('.nw')) : null,
        fs: cs ? cs.fontSize : null,
        sf: e.style.getPropertyValue('--sf'), sx: e.style.getPropertyValue('--sx') };
    });
    return { appH: +app.height.toFixed(1), bar: g(bar), tabs };
  });
  require('fs').writeFileSync(path.join(dir, 'A1-r' + r + '-dom.json'),
    JSON.stringify({ dom, errs }, null, 1));

  /* [4] 차분용 5장 — «끄면 끝까지 끈 채로» 단방향 (A2-⑤) */
  await p.addStyleTag({ content: '#view{visibility:hidden!important}' });   /* 28 교훈 3 */
  await p.waitForTimeout(150);
  await p.screenshot({ path: out('dA') });
  /* 박스 밖으로 나가는 부속부터 끈다 (A2-③ — 레드닷이 아이콘 bbox 를 오염시킨다) */
  await p.addStyleTag({ content: '.tab .bdg,.tab .nw{visibility:hidden!important}' });
  await p.waitForTimeout(120);
  await p.screenshot({ path: out('dB') });
  await p.addStyleTag({ content: '.tab .tl{visibility:hidden!important}' });
  await p.waitForTimeout(120);
  await p.screenshot({ path: out('dC') });
  await p.addStyleTag({ content: '.tab .ti{visibility:hidden!important}' });
  await p.waitForTimeout(120);
  await p.screenshot({ path: out('dD') });
  await p.addStyleTag({ content: '#tabbar{visibility:hidden!important}' });
  await p.waitForTimeout(120);
  await p.screenshot({ path: out('dE') });

  await b.close();
  console.log('A1 캡처 r' + r + ' 완료 · 콘솔에러 ' + errs.length + (errs.length ? '\n' + errs.join('\n') : ''));
})();
