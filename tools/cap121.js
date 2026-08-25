/* 작업 121 — 비평용 캡처 하네스. 03 던전·컨텐츠 카드의 «움직이는 배경» 과 «썸네일 들썩» 을
   연속 프레임으로 뽑는다([3]-(다) 연출 작업: 정지 1장이 아니라 6~8장).

   실행: node tools/cap121.js [r<회차>]      기본 r1
   내보내는 것 (docs/review/):
     121-<r>-flow-1..6.png   던전 탭 전체 — 배경 흐름 위상 6단계
     121-<r>-bob-1..8.png    던전 카드1 확대 — 썸네일 들썩 한 바퀴(0.86s를 8등분)
     121-<r>-raid-1..8.png   컨텐츠 탭 카드1 확대 — 아이들 프레임 순환 + 들썩

   ⚠ 재현성(LESSONS 28-③·29-②): 벽시계로 기다리면 회차마다 다른 위상이 찍혀 «회귀» 오판이 난다.
   애니메이션을 전부 **일시정지시킨 뒤 `currentTime` 을 직접 찍어** 표본을 만든다 — 같은 커밋이면
   언제 돌려도 같은 그림이 나오고, 30초짜리 배경 흐름도 1초 안에 6단계를 뽑을 수 있다.
   스프라이트 아이들 프레임은 CSS 가 아니라 타이머라 캔버스 쪽만 프레임을 직접 지정해 그린다. */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const R = (process.argv[2] || 'r1').replace(/^r?/, 'r');
const OUT = path.resolve(__dirname, '../docs/review');
const shot = (p, name, clip) => p.screenshot({ path: path.join(OUT, `121-${R}-${name}.png`), clip });

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);

  /* ---- 전부 일시정지 → 위상을 직접 찍는다 ---- */
  const freeze = () => p.evaluate(() => {
    document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      const d = a.effect && a.effect.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0) { try { a.currentTime = t % (d * 4); } catch (_) {} }
    });
  }, ms);
  await freeze();

  /* ---- ① 배경 흐름 6단계 (0 → 30s 를 6등분) : 던전 탭 전체 ---- */
  for (let i = 0; i < 6; i++) {
    await seek(i * 6000);
    await p.waitForTimeout(90);
    await shot(p, 'flow-' + (i + 1));
  }
  console.log('flow 6장 — 배경 흐름 0/6/12/18/24/30s 위상');

  /* ---- ② 썸네일 들썩 8단계 : 던전 카드1 확대 ---- */
  const card1 = await p.evaluate(() => {
    const r = document.querySelector('#dunList .dnc').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  /* 짧은 들썩 1바퀴 = --thb/5 (카드1 은 3.9s/5 = 780ms). 큰 점프까지 보려면 한 바퀴 전체(3.9s)를 8등분한다 */
  for (let i = 0; i < 8; i++) {
    await seek(Math.round(i * 3900 / 8));
    await p.waitForTimeout(70);
    await shot(p, 'bob-' + (i + 1), card1);
  }
  console.log('bob 8장 — 카드1 확대, 들썩 한 바퀴(3.9s)를 8등분 (487ms 간격)');

  /* ---- ③ 컨텐츠(레이드) 탭 8장 — 아이들 프레임 순환 ---- */
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  await freeze();
  const rcard = await p.evaluate(() => {
    const r = document.querySelector('#dunList .dnc.rd').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const FR = await p.evaluate(() => (window.ATLAS.elves.a.blue_idle || []));
  for (let i = 0; i < 8; i++) {
    await seek(Math.round(i * 3900 / 8));
    /* 스프라이트 프레임은 타이머가 굴리므로 여기서 직접 지정해 그린다(정지 상태에서도 순환이 보이게) */
    await p.evaluate(f => {
      const cv = document.querySelector('#dunList canvas.thcv');
      if (cv) { cv._fr = f; drawSpriteTo(cv, { k: cv.dataset.thk, frame: f, tint: cv.dataset.thc }); }
    }, FR[i % FR.length]);
    await p.waitForTimeout(70);
    await shot(p, 'raid-' + (i + 1), rcard);
  }
  console.log('raid 8장 — 컨텐츠 카드1 확대, 아이들 프레임 ' + FR.join(',') + ' 순환');

  console.log('콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
