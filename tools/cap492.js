/* 작업 492 캡처 — «카드 안에서 잘 보이는가 · 형제 시트와 덩치가 고른가» 를 눈으로 채점하기 위한
 * **한 장짜리 대조 캡처**. 411 교훈: 따로 보면 셋 다 그럴듯하다 — 나란히 놓아야 어긋남이 보인다.
 *
 * 한 장 안에 위에서부터:
 *   ① 08 세부 팝업 아이콘 박스 (주인이 «기준» 이라고 한 자리)
 *   ② 50 코스튬 시트 격자 첫 두 행
 *   ③ 26 펫 시트 격자 첫 두 행 (같은 `.sk-ci` 부품을 쓰는 형제)
 * 합성은 페이지 안 캔버스에서 한다(외부 이미지 의존성 0 — probe350/probe492 와 같은 data URL 왕복).
 *
 * 실행: node tools/cap492.js <회차>   →  docs/shots/492-r<회차>.png (캡처는 커밋하지 않는다)
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const R = process.argv[2] || '1';

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.goto(URL);
  await p.waitForFunction(() => typeof AVATARS !== 'undefined' && AVATARS.length > 0);
  await p.waitForTimeout(1500);

  await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 400; S.stage = 400; S.rank = 6;
    S.avatars = {}; S.cosLv = {};
    AVATARS.forEach((a, i) => { if (i % 5 !== 4) { S.avatars[a.id] = 1; S.cosLv[a.id] = (i * 7) % 400; } });
    S.pet = {}; S.eqPet = [];
    PETS.slice(0, 8).forEach(t => { S.pet[t.id] = { n: 3, l: 2 }; });
    PETS.slice(0, 3).forEach(t => toggleEquip(t, 'pet'));
    uiDirty = true; renderUI();
  });

  const clip = async (fn, sel, pad) => {
    await p.evaluate(f => eval(f), fn);
    await p.waitForTimeout(900);
    const b = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
    if (!b) throw new Error('없는 자리: ' + sel);
    const h = pad ? Math.min(b.h, pad) : b.h;
    const buf = await p.screenshot({ clip: { x: Math.round(b.x), y: Math.round(b.y),
                                             width: Math.round(b.w), height: Math.round(h) } });
    return 'data:image/png;base64,' + buf.toString('base64');
  };

  const shots = [];
  shots.push({ t: '① 08 세부 팝업 아이콘 박스 (주인 기준)',
    u: await clip("showCosDetail(AVATARS[3].id)", '#mbox .skd', 240) });
  await p.evaluate(() => closeModal());
  shots.push({ t: '② 50 코스튬 시트 격자 (이번 작업 대상)',
    u: await clip("gmHero('cos')", '#bCos .sk-gp', 460) });
  shots.push({ t: '③ 26 펫 시트 격자 (같은 .sk-ci 부품 — 형제)',
    u: await clip("gmHero('pet')", '#bPet .sk-gp', 460) });

  const out = await p.evaluate(async (shots) => {
    const ims = [];
    for (const s of shots) { const im = new Image(); im.src = s.u; await im.decode(); ims.push(im); }
    const W = Math.max(...ims.map(i => i.width)) + 40;
    const LH = 46;
    const H = ims.reduce((a, i) => a + i.height + LH + 20, 20);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, W, H);
    let y = 20;
    ims.forEach((im, k) => {
      g.fillStyle = '#fff'; g.font = '700 28px sans-serif'; g.textBaseline = 'top';
      g.fillText(shots[k].t, 20, y); y += LH;
      g.drawImage(im, 20, y); y += im.height + 20;
    });
    return cv.toDataURL('image/png');
  }, shots);

  const dir = path.resolve(__dirname, '..', 'docs', 'shots');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, '492-r' + R + '.png');
  fs.writeFileSync(f, Buffer.from(out.split(',')[1], 'base64'));
  console.log('저장 ' + f);
  await browser.close();
})();
