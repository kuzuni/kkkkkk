#!/usr/bin/env node
/* 58 28회차 신설 — **«정답표 ↔ 프레임 페인트» 시계 어긋남**을 직접 잰다.
 *
 *   node probe58ad.js
 *
 * 왜 만들었나 — 25·26차 비평 2인 공통 3번은 «HUD 카운터가 정답표보다 한 계단 늦다» 였다.
 * 26회차의 `probe58z` 가 «크레딧 − 실도착 = 0»(전 프레임)을 내서 «카운터↔도착» 축은 이미
 * 맞아 있는 것이 확인됐다. 그러면 남는 축은 **«도착↔정답표»**, 즉 하네스다 —
 * 27회차가 «28회차는 cap58.js 의 정답표 생성부터 볼 것» 으로 넘긴 자리가 여기다.
 *
 * `cap58.js` 의 정답표는 `#goldN`.textContent 를 rAF 마다 표본으로 찍어 두고,
 * 프레임 시각 T 에 대해 **«T 이하의 마지막 표본»** 을 고른다(22회차 수정). 이 규칙이 옳으려면
 * «타임스탬프 T 인 스크린캐스트 프레임의 그림 = 시각 T 의 DOM» 이어야 한다.
 * 그런데 합성 프레임은 **마지막 커밋 시점의 DOM** 을 그린다 — T 보다 앞선다. 앞선 만큼
 * 정답표가 프레임보다 «한 계단 빠른» 값을 적게 되고, 비평가는 그것을 정직하게
 * «카운터가 늦다» 로 읽는다.
 *
 * 재는 법 — 게임 숫자를 읽으려 하지 않는다(OCR 은 그 자체가 오차원이다).
 * rAF 마다 값이 1 씩 오르는 **색 계단 막대**를 화면에 얹고, (계단 번호, Date.now()) 를 기록한다.
 * 프레임을 PNG 로 받아 막대 색에서 계단 번호를 되읽으면 **그 그림이 어느 시각의 DOM 인지**가
 * 나온다. `lag = T − t(그려진 계단)` 이 곧 정답표가 앞서는 양이다.
 *
 * 계단은 R 채널만 8 씩 올린다(0,8,…,248 → 32계단, 허용오차 ±3). G·B 는 0 고정.
 * 막대는 200×200 이고 중심 화소만 읽으므로 크로마 서브샘플링·압축 번짐에 안전하다.
 */
const path = require('path'), fs = require('fs');
/* 110 공용 부트스트랩 — 번들 브라우저 빌드 번호가 어긋난 컨테이너에서도 뜬다(127 교훈) */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const OUT = process.env.P58AD_OUT || path.resolve(require('os').tmpdir(), 'probe58ad');
const DUR = 2000;                                    /* 계측 길이(ms) — 재화 흡수 1.4s 를 덮는다 */

(async () => {
  fs.rmSync(OUT, { recursive:true, force:true });
  fs.mkdirSync(path.join(OUT, 'f'), { recursive:true });

  const browser = await launch(chromium, { args:['--allow-file-access-from-files','--disable-lcd-text'] });
  const page = await browser.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForFunction(() => typeof fxTick === 'function' || typeof draw === 'function', null, { timeout:15000 });
  await page.waitForTimeout(800);

  const cdp = await page.context().newCDPSession(page);
  const buf = [];
  cdp.on('Page.screencastFrame', async (e) => {
    buf.push({ t: e.metadata.timestamp * 1000, data: e.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch(_){}
  });
  await cdp.send('Page.startScreencast', { format:'png', everyNthFrame:1 });

  /* 계단 막대를 얹고 rAF 마다 한 칸 올린다. 게임은 그대로 돌려 둔다 —
     합성 부하가 실제 캡처와 같아야 lag 도 같다. */
  const rows = await page.evaluate(async (dur) => {
    const bar = document.createElement('div');
    bar.id = '__p58ad';
    bar.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;z-index:99999;pointer-events:none;background:rgb(0,0,0)';
    document.body.appendChild(bar);
    const out = [];
    let i = 0;
    const t0 = Date.now();
    await new Promise(res => {
      const step = () => {
        const v = (i % 32) * 8;
        bar.style.background = `rgb(${v},0,0)`;
        out.push([i, Date.now()]);                   /* 이 계단이 «커밋될» 프레임의 DOM 시각 */
        i++;
        if(Date.now() - t0 < dur) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
    bar.remove();
    return { rows: out, t0 };
  }, DUR);

  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); }

  const man = { rows: rows.rows, step: 8, cycle: 32, frames: [] };
  buf.forEach((f, n) => {
    const fp = path.join(OUT, 'f', String(n).padStart(4,'0') + '.png');
    fs.writeFileSync(fp, Buffer.from(f.data, 'base64'));
    man.frames.push({ n, t: f.t, file: fp });
  });
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man));
  console.log(`probe58ad: 프레임 ${buf.length}장 · rAF 표본 ${rows.rows.length}개 → ${OUT}`);

  const { execFileSync } = require('child_process');
  const py = path.resolve(__dirname, 'probe58ad.py');
  try {
    console.log(execFileSync('python3', [py, path.join(OUT, 'manifest.json')], { encoding:'utf8' }));
  } catch(e) {
    console.log('probe58ad: 판독 실패 — ' + (e.stdout || e.message));
  }
})().catch(e => { console.error(e); process.exit(1); });
