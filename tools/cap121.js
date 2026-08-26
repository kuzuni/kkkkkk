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
  /* 기본 세이브는 6장 중 4장이 잠겨 있어 «테마 4종» 중 둘밖에 안 보인다.
     비평가가 유물석 보랏빛 안개·컨텐츠 붉은 열기를 볼 수 있도록 해금 상태로 찍는다.
     ⚠ 4회차 — 다만 **전부 해금하면 안 된다.** 3·4회차 하네스가 relic1~3 을 모두 열어 버려서
     비평가 E·F 가 둘 다 «지시 ④ 의 절반(잠금 카드 정지+어둡게)을 판정할 표본이 18장 중 0장» 이라고 적었다.
     relic1·2 만 열어 보라색 테마를 보여 주고 **relic3·4 는 잠근 채로 남겨** 같은 캡처 안에 대조군을 둔다. */
  /* ⚠⚠ 5회차 — **잠금 대조군이 3회차 연속 0장이었다.** 비평가 G·H 가 독립으로 같은 뿌리를 짚었다:
     `dunLocked(relic3)` 은 `(S.dun.relic2|0) <= pre.f(5)` 라서 여기서 `relic2 = 99` 를 넣으면
     **relic3 까지 같이 해금된다.** 그 결과 유일하게 잠긴 카드가 relic4 = 카드 인덱스 5(y1957~2307)뿐인데
     `#dunList` 가 y1939 에서 잘려 **화면 밖**이라 flow 6장 어디에도 잠금 카드가 안 찍혔다.
     → `relic1` 만 연다. 그러면 relic2 가 **잠긴 채 카드 4번째 자리(전체 가시)** 에 남아 대조군이 된다. */
  await p.evaluate(() => {
    S.guide.idx = 99; S.best = 999;
    S.dun.relic1 = 99;
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => renderDunPage());
  await p.waitForTimeout(400);

  /* ---- 전부 일시정지 → 위상을 직접 찍는다 ---- */
  /* ⚠ CSS 로 paused 인 애니메이션(잠금 카드)은 **건드리지 않는다** — 억지로 위상을 찍으면
     캡처가 «잠금인데 움직인다» 는 거짓을 만들고, 비평가가 그 거짓을 지적으로 돌려준다(1회차에 실제로 그랬다). */
  /* ⚠ 5회차 — `freeze()` 가 CSS 애니메이션만 멈추고 **스프라이트 아이들 타이머는 그대로 뒀다.**
     그래서 `cv._fr` 로 프레임을 찍어 놔도 70ms 대기 중에 `raidIdleTick`(125ms 주기)이 자기 프레임으로
     덮어써, «같은 CSS 상태인데 그림이 다른» 표본이 나왔다(G 4: bob-1 vs bob-3 잉크 상단 11px 차 ·
     raid-2/4/5 mean|Δ| 14.98·15.50). 위상 정확성이 이 하네스의 존재 이유이므로 타이머도 같이 세운다.
     `raidIdleTick` 은 `window.__idleFrozen` 을 보고 즉시 반환한다(index.html 5회차 3줄). */
  const freeze = () => p.evaluate(() => {
    window.__idleFrozen = true;
    document.getAnimations().forEach(a => { a._css = a.playState; try { a.pause(); } catch (_) {} });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      if (a._css !== 'running') return;
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
  /* ⚠ 5회차 — 6장이 0~30s 인데 `--bgt1` 은 40~90s 라 **루프 이음매(wrap) 위상이 표본에 하나도 없다**
     (H 15). 즉 «이음매 팝» 을 그림으로 반증할 수가 없었다. 등간격 6장은 «등속성» 판정의 근거라
     건드리지 않고(두 비평가 다 이 시리즈를 근거로 σ≤0.4px 를 냈다) **wrap 직전 1장을 덧붙인다.**
     카드1 의 실제 --bgt1 을 읽어 99% 지점을 찍는다 — 주기를 또 바꿔도 안 빗나간다. */
  const bgt1 = await p.evaluate(() => {
    const el = document.querySelector('#dunList .dnc');
    return parseFloat(getComputedStyle(el).getPropertyValue('--bgt1')) * 1000;
  });
  await seek(Math.round(bgt1 * 0.99));
  await p.waitForTimeout(90);
  await shot(p, 'flow-7');
  console.log('flow 7장 — 배경 흐름 0/6/12/18/24/30s 위상 + wrap 직전 '
    + (bgt1 * 0.99 / 1000).toFixed(1) + 's (--bgt1 ' + (bgt1 / 1000) + 's 의 99%)');

  /* ---- ② 썸네일 들썩 8단계 : 던전 카드1 확대 ---- */
  const card1 = await p.evaluate(() => {
    const r = document.querySelector('#dunList .dnc').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  /* ⚠ 한 바퀴를 «균등 8등분» 하면 안 된다 — 짧은 들썩 주기가 --thb/5(780ms)라 487ms 표본은
     나이퀴스트(390ms)를 넘겨 **큰 점프(84% 깊은 웅크림 / 90% 정점)가 표본 사이로 빠진다.**
     비평가 D 가 «8장 실측 최대 진폭 10.25px = 지시 14px 의 73%» 로 잡아낸 것이 이 에일리어싱이다.
     그래서 균등 간격이 아니라 **키프레임 위치**를 찍는다: 착지·정점·깊은 웅크림·점프 정점이 전부 들어간다. */
  const BOB = [0, 10, 20, 50, 70, 84, 90, 95];      /* % of --thb */
  for (let i = 0; i < BOB.length; i++) {
    await seek(Math.round(3900 * BOB[i] / 100));
    await p.waitForTimeout(70);
    await shot(p, 'bob-' + (i + 1), card1);
  }
  console.log('bob ' + BOB.length + '장 — 카드1 확대, 키프레임 위치 ' + BOB.map(v => v + '%').join('/')
    + ' (착지 0/20 · 짧은 들썩 정점 10/50/70 · 깊은 웅크림 84 · 큰 점프 정점 90)');

  /* ---- ③ 컨텐츠(레이드) 탭 8장 — 아이들 프레임 순환 ---- */
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  await freeze();
  const rcard = await p.evaluate(() => {
    const r = document.querySelector('#dunList .dnc.rd').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  /* ⚠ 6회차 — «제품이 실제로 도는 프레임» 을 그대로 써야 표본이 거짓말을 안 한다.
     아이들 창(`TH_IDLE`)이 생겼으므로 전 사이클이 아니라 그 창을 읽는다(창이 없으면 전 사이클). */
  const FR = await p.evaluate(() => {
    const cv = document.querySelector('#dunList canvas.thcv');
    const key = cv && cv.dataset.thk, nm = cv && cv.dataset.thi;
    return (TH_IDLE[key + '/' + nm] || (ATLAS[key] && ATLAS[key].a[nm]) || []);
  });
  /* ⚠ 4회차 — 여기도 균등 8등분이면 안 된다(bob 은 3회차에 고쳤는데 raid 는 그대로였다).
     487.5ms 간격은 780ms 짧은 들썩에 대해 에일리어싱이라 84%·90% 를 비켜가고, 그래서
     비평가 E·F 가 둘 다 «컨텐츠 탭 표본에는 큰 점프가 아예 없다 — 실측 진폭이 실제의 55%» 로 적었다.
     bob 과 같은 키프레임 위치로 찍는다. 그리고 **번개 잔광(bgmFlash, 9s 주기의 86~94% 구간)** 은
     3.9s 안에 절대 안 들어오므로 raid-9·10 을 그 시각(7.92s·8.46s)에 따로 찍는다 —
     그 연출도 «18장 중 0장» 이라는 지적이 같이 나왔다. */
  const RAID = [0, 10, 20, 50, 70, 84, 90, 95];
  for (let i = 0; i < RAID.length; i++) {
    await seek(Math.round(3900 * RAID[i] / 100));
    /* 스프라이트 프레임은 타이머가 굴리므로 여기서 직접 지정해 그린다(정지 상태에서도 순환이 보이게) */
    /* ⚠ 6회차 — 여기서 `drawSpriteTo` 를 **직접** 부르면 제품이 쓰는 옵션(padY·bright·fit·스쿼시 축)이
       빠져 표본이 화면과 다른 그림이 된다(실제로 padY 가 생기자 갈렸다). 제품과 **같은 경로**로 그린다. */
    await p.evaluate(f => {
      const cv = document.querySelector('#dunList canvas.thcv');
      if (cv) raidDraw(cv, f);
    }, FR[i % FR.length]);
    await p.waitForTimeout(70);
    await shot(p, 'raid-' + (i + 1), rcard);
  }
  /* 번개 잔광 2장 — bgmFlash 의 발광 구간(86~94%, 정점 90%)에 직접 앉힌다.
     ⚠ 5회차 — 여기가 **상수 7920/8460 이었고 그건 «주기 9s» 를 가정한 값**이다. 실제 `--bgt3` 는
     `bgmVars` 가 카드 인덱스에서 파생하므로 카드1 은 8.0s 였다 → 찍힌 위상이 99.0% / 5.75% 로
     **둘 다 평탄 구간**이라 잔광이 10장 중 0장 잡혔다(G·H 독립 동일 지적: signed 차 +0.004/255).
     이제 **그 카드의 실제 --bgt3 를 읽어** 90%·93% 를 계산해 찍는다 — 주기를 또 바꿔도 안 빗나간다. */
  const bgt3 = await p.evaluate(() => {
    const el = document.querySelector('#dunList .dnc.rd');
    return parseFloat(getComputedStyle(el).getPropertyValue('--bgt3')) * 1000;
  });
  const FLASH = [Math.round(bgt3 * 0.90), Math.round(bgt3 * 0.93)];
  console.log('  번개 잔광 스톱: --bgt3 ' + (bgt3 / 1000) + 's → ' + FLASH.join('ms / ') + 'ms (90% · 93%)');
  for (let i = 0; i < 2; i++) {
    await seek(FLASH[i]);
    await p.waitForTimeout(70);
    await shot(p, 'raid-' + (RAID.length + i + 1), rcard);
  }
  /* ---- ④ 아레나 카드 4장 (6회차 신설 — 5회차 H 12: «표본 0장») ----
     `.dnc.rd.arn2` 는 `fit:0` 이라 측정장 카드와 **같은 천장 절단 위험을 공유**하는데(5회차 ⓐ 의
     최대 감점원이 바로 그 절단이었다) 판정할 그림이 한 장도 없었다. 게다가 이 카드만 썸네일이
     둘(마주 본 기사 2명)이고 위상이 서로 달라야 하므로, 「둘이 한 몸처럼 움직이지 않는가」도
     여기서만 볼 수 있다. 들썩 키프레임 중 **극단 4개**(착지 0 · 짧은 정점 50 · 깊은 웅크림 84 ·
     큰 점프 정점 90)만 찍는다 — 절단은 정점에서, 겹침은 웅크림에서 난다. */
  const acard = await p.evaluate(() => {
    const el = document.querySelector('#dunList .dnc.rd.arn2');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  if (!acard) console.log('  ⚠ 아레나 카드 없음 — S.best 가 ARENA.open 미만인가?');
  else {
    const AFR = await p.evaluate(() => (ATLAS.knight && ATLAS.knight.a && ATLAS.knight.a.idle) || []);
    const ARN = [0, 50, 84, 90];
    for (let i = 0; i < ARN.length; i++) {
      await seek(Math.round(3900 * ARN[i] / 100));
      /* 두 칸의 위상은 «내 칸/상대 칸» 으로 갈린다 — 하네스도 같은 규칙으로 프레임을 어긋나게 준다 */
      await p.evaluate(([fa, fb]) => {
        const me = document.querySelector('#dunList .dnc.rd.arn2 canvas.arn-me');
        const op = document.querySelector('#dunList .dnc.rd.arn2 canvas.arn-op');
        [[me, fa], [op, fb]].forEach(([cv, f]) => { if (cv) raidDraw(cv, f); });
      }, [AFR[i % AFR.length], AFR[(i + 2) % AFR.length]]);
      await p.waitForTimeout(70);
      await shot(p, 'arn-' + (i + 1), acard);
    }
    console.log('arn ' + ARN.length + '장 — 아레나 카드 확대, 키프레임 위치 ' + ARN.map(v => v + '%').join('/')
      + ', 기사 아이들 프레임 ' + AFR.length + '장 중 두 칸을 2프레임 어긋나게');
  }

  console.log('raid ' + (RAID.length + 2) + '장 — 컨텐츠 카드1 확대, 키프레임 위치 '
    + RAID.map(v => v + '%').join('/') + ' + 번개 잔광 ' + FLASH.map(v => (v / 1000).toFixed(2) + 's').join('·')
    + ', 아이들 프레임 ' + FR.join(',') + ' 순환');

  console.log('콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
