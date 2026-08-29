/* 작업 411 대조 캡처 — 07 스킬 · 26 펫 · 50 코스튬의 **슬롯 줄만** 잘라 한 장에 세로로 쌓는다.
 *
 * ⚑ 이 «나란히 놓기» 가 채점의 핵심이다(등재문). 세 시트를 따로 보면 셋 다 그럴듯해서
 *   덩치 어긋남이 안 보인다 — 실제로 수리 전 1.765배 차이가 화면별 캡처에서는 안 잡혔다.
 *
 * 만드는 것:
 *   411-row-2280.png   9:19  (1080x2280) 세 줄 + 라벨
 *   411-row-1600.png   9:13.3(1080x1600) 세 줄 + 라벨
 *   411-sheet-sk-2280.png / -pet- / -cos-   시트 전체(맥락 확인용)
 *
 * 실행: node tools/cap411.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const OUT = path.resolve(__dirname, '..', 'docs/review');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SHEETS = [['sk', '07 스킬', '#bSk'], ['pet', '26 펫', '#bPet'], ['cos', '50 코스튬', '#bCos']];

async function rowsAt(H, tag) {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 200; S.stage = 200;
    S.own = {}; SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    S.eqSkill = [];
    /* 8칸 중 6칸만 채운다 — «빈 칸([+])» 과 «장착 칸» 이 한 줄에 같이 보여야
       형제 부품(`.sk-plus`)의 덩치도 같이 채점된다(394 선례) */
    SKILLS.slice(0, 6).forEach(s => toggleEquip(s, 'skill'));
    S.pet = {}; S.eqPet = [];
    PETS.slice(0, 2).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; toggleEquip(t, 'pet'); });
    buildSlots(); uiDirty = true; renderUI();
  });

  const shots = [];
  for (const [sub, , host] of SHEETS) {
    await p.evaluate(s => gmHero(s), sub);
    await p.waitForTimeout(900);
    const b = await p.evaluate(h => {
      const el = document.querySelector(h + ' .sk-eqp');
      if (!el) throw new Error('슬롯 줄 없음: ' + h);
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }, host);
    const buf = await p.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
    shots.push({ url: 'data:image/png;base64,' + buf.toString('base64'), w: b.w, h: b.h });
    await p.screenshot({ path: path.join(OUT, '411-sheet-' + sub + '-' + tag + '.png'),
                         clip: { x: 0, y: 0, width: 1080, height: Math.min(H, 2280) } });
  }

  /* 세 줄을 한 캔버스에 쌓고 시트 이름을 왼쪽에 적는다 */
  const merged = await p.evaluate(async ({ shots, names, tag }) => {
    const PAD = 18, LAB = 46;
    const W = Math.max(...shots.map(s => s.w)) + PAD * 2;
    const Hc = shots.reduce((a, s) => a + s.h + LAB + PAD, 0) + PAD + 40;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hc;
    const g = cv.getContext('2d');
    g.fillStyle = '#2A2622'; g.fillRect(0, 0, W, Hc);
    g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textBaseline = 'top';
    g.fillText('411 슬롯 줄 대조 — ' + tag, PAD, 8);
    let y = 48;
    for (let i = 0; i < shots.length; i++) {
      g.fillStyle = '#FFD24A'; g.font = 'bold 26px sans-serif';
      g.fillText(names[i], PAD, y);
      y += LAB;
      const im = new Image(); im.src = shots[i].url; await im.decode();
      g.drawImage(im, PAD, y);
      y += shots[i].h + PAD;
    }
    return cv.toDataURL('image/png');
  }, { shots, names: SHEETS.map(s => s[1]), tag });

  const fs = require('fs');
  fs.writeFileSync(path.join(OUT, '411-row-' + tag + '.png'),
                   Buffer.from(merged.split(',')[1], 'base64'));
  console.log('411-row-' + tag + '.png');
  await browser.close();
}

(async () => {
  await rowsAt(2280, '2280');
  await rowsAt(1600, '1600');
})().catch(e => { console.error(e); process.exit(1); });
