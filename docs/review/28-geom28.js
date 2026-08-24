/* 작업 28 — 보스 헤더 요소의 실제 렌더 좌표를 stagearea 기준으로 덤프하고,
 * 레퍼런스(1080x2340) 실측값을 «가로 1:1 · 세로 ref_y−188» 로 변환한 기대값과 대조한다.
 * 동시에 39/40 두 상태의 캡처를 남겨 잉크(흰 글자) 실측용으로 쓴다.
 */
const { chromium } = require('playwright');
const FILE = 'file:///home/user/kkkkkk/index.html';
const OUT = '/tmp/claude-0/-home-user-kkkkkk/912aed5d-6007-59e8-8f18-60ebe7454177/scratchpad/';

/* [요소, ref_x, ref_y, ref_w, ref_h] — ref 는 1080x2340 좌표 */
const EXPECT_FIGHT = [
  ['#bossTm',    397, 231, 242, 79],
  ['#bossTm s',  397, 231,  66, 79],
  ['#bossHp',    190, 315, 700, 67],
  ['#bossGv',    447, 471, 186, 80],
];
const EXPECT_FARM = [
  ['#bossRt',    402, 482, 276, 82],
];

const fails = [];
const chk = (name, got, ex) => {
  const d = ['x','y','w','h'].map((k,i) => Math.round(got[i] - ex[i]));
  const bad = d.some(v => Math.abs(v) > 1);
  const line = `${name.padEnd(12)} got ${got.map(Math.round).join(',')}  ref→${ex.join(',')}  Δ ${d.join(',')}`;
  if (bad) { fails.push(line); console.log('  ✗ ' + line); } else console.log('  ✓ ' + line);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const rects = async (sels) => page.evaluate((sels) => {
    const sa = document.getElementById('stagearea').getBoundingClientRect();
    const sc = sa.width / 1080;                       /* fit() 스케일 */
    const out = {};
    for (const s of sels) {
      const el = document.querySelector(s); if (!el) { out[s] = null; continue; }
      const r = el.getBoundingClientRect();
      out[s] = [(r.x - sa.x)/sc, (r.y - sa.y)/sc, r.width/sc, r.height/sc];
    }
    return out;
  }, sels);

  /* ---- 39 상태 ---- */
  console.log('[39] 보스전 진행 중');
  await page.evaluate(async () => {
    S.stage = 80; S.bossFarm = false; spawnStage();
    await new Promise(r => setTimeout(r, 2400));
  });
  const r1 = await rects(EXPECT_FIGHT.map(e => e[0]).concat(['#stinfo .chap', '#bossHp i', '#bossHp u']));
  for (const [sel, x, y, w, h] of EXPECT_FIGHT) chk(sel, r1[sel], [x, y - 188, w, h]);
  chk('#bossHp i', r1['#bossHp i'], [205, 327 - 188, 671, 43]);
  console.log('  · chap(라벨) 상자 = ' + r1['#stinfo .chap'].map(Math.round).join(',') + '  (잉크 상단 기대 ' + (421-188) + ')');
  await page.evaluate(() => { document.getElementById('view').style.visibility = 'hidden'; });
  await page.screenshot({ path: OUT + '28-r39.png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.evaluate(() => { document.getElementById('view').style.visibility = ''; });

  /* ---- 40 상태 ---- */
  console.log('[40] 재도전 대기');
  await page.evaluate(async () => { failBoss('테스트'); await new Promise(r => setTimeout(r, 500)); });
  const r2 = await rects(EXPECT_FARM.map(e => e[0]).concat(['#stinfo .kboss', '#stinfo .chap']));
  for (const [sel, x, y, w, h] of EXPECT_FARM) chk(sel, r2[sel], [x, y - 188, w, h]);
  /* ref 40 노드 bbox 는 (478,366,124,116)·⌀118~124 로 자체 오차가 있어 «중심 + 지름» 으로 대조한다 */
  const kb = r2['#stinfo .kboss'];
  chk('kboss 중심/지름', [kb[0]+kb[2]/2, kb[1]+kb[3]/2, kb[2], kb[3]], [540, 424 - 188, 120, 120]);
  console.log('  · chap(라벨) 상자 = ' + r2['#stinfo .chap'].map(Math.round).join(',') + '  (잉크 상단 기대 ' + (311-188) + ')');
  await page.evaluate(() => { document.getElementById('view').style.visibility = 'hidden'; });
  await page.screenshot({ path: OUT + '28-r40.png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.evaluate(() => { document.getElementById('view').style.visibility = ''; });

  /* ---- 숨김 상태(02 기본) 회귀 — 클래스가 전부 빠졌는지 ---- */
  console.log('[02] 기본 상태 회귀');
  const r3 = await page.evaluate(async () => {
    S.stage = 37; S.bossFarm = false; spawnStage();
    await new Promise(r => setTimeout(r, 400));
    const si = document.getElementById('stinfo');
    const vis = s => { const e = document.querySelector(s); return getComputedStyle(e).display !== 'none'; };
    const sa = document.getElementById('stagearea').getBoundingClientRect();
    const sc = sa.width / 1080;
    const g = s => { const r = document.querySelector(s).getBoundingClientRect();
                     return [(r.x-sa.x)/sc, (r.y-sa.y)/sc, r.width/sc, r.height/sc].map(v => Math.round(v)); };
    return { cls: si.className, bossVis: ['#bossTm','#bossHp','#bossGv','#bossRt'].filter(vis),
             stinfo: g('#stinfo'), chap: g('#stinfo .chap'), kbar: g('#stinfo .kbar'),
             kboss: g('#stinfo .kboss'), n1: g('#stinfo .n1'), n2: g('#stinfo .n2'),
             bg: getComputedStyle(si).backgroundColor, chapTxt: document.getElementById('chapN').textContent };
  });
  const base = { stinfo: [320,136,480,92], chap: [320,123,440,27], kbar: [335,170,410,24],
                 kboss: [699,141,82,82], n1: [337,158,48,48], n2: [520,162,40,40] };
  for (const k of Object.keys(base)) chk('02 ' + k, r3[k], base[k]);
  chk('02 클래스/표시', [r3.cls === '' ? 0 : 1, r3.bossVis.length, 0, 0], [0, 0, 0, 0]);
  console.log('  · #stinfo 배경 = ' + r3.bg + ' (기대 rgba(0, 0, 0, 0.3))');
  console.log('  · 헤더 문자열 = "' + r3.chapTxt + '"');
  await page.evaluate(() => { document.getElementById('view').style.visibility = 'hidden'; });
  await page.screenshot({ path: OUT + '28-r02.png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });

  await ctx.close(); await browser.close();
  console.log('');
  console.log(fails.length ? 'GEOM28 FAIL (' + fails.length + ')' : 'GEOM28 PASS');
  process.exit(fails.length ? 1 : 0);
})();
