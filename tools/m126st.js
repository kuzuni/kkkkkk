/* 126 ② — `-webkit-text-stroke` 역할별 4단 토큰화용 실측기.
 *
 * 비평가 H 의 1순위: «작은 라벨(24~30px)에서 고정 px 스트로크가 ㅇ 속공간을 막는다».
 * 스트로크는 «px 고정» 인데 글자 크기는 24~64px 로 흩어져 있어, 같은 6px 이라도
 * 64px 글자에서는 9%, 24px 글자에서는 25% 를 잡아먹는다. 눈이 아니라 비율로 가른다.
 *
 *   node tools/m126st.js           # 요약(비율 구간별) + 과다 자리 상위
 *   node tools/m126st.js --all     # 전건
 *   node tools/m126st.js --json out.json
 *
 * 각 화면에서 «계산된 -webkit-text-stroke-width > 0 이고 글자를 가진 요소» 를 모아
 *   - fs   : 계산된 font-size(px)
 *   - sw   : 계산된 스트로크 폭(px)
 *   - r    : sw / fs  (= 글자 한 획 두께 대비 외곽선이 먹는 비율의 대용치)
 * 를 찍고, 같은 (선택자키, fs, sw) 는 한 종으로 묶는다.
 *
 * 목표 비율(§2 4단 토큰): HUD .20 · 타이틀 .13 · 본문 .17 · 작은라벨 .17 근방 —
 * 실제로는 «r 이 .22 를 넘는 자리» 가 속공간을 막는 자리다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs_ = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const ALL = process.argv.includes('--all');
const JI = process.argv.indexOf('--json');

const SCREENS = [
  { k: '02-메인', steps: [] },
  { k: '06-영웅', steps: ['.tab[data-t="hero"]'] },
  { k: '23-훈련', steps: ['.tab[data-t="grow"]'] },
  { k: '03-던전', steps: ['.tab[data-t="adv"]'] },
  { k: '14-보물상자', steps: ['.tab[data-t="box"]'] },
  { k: '10-상점', steps: ['.tab[data-t="shop"]'] },
  { k: '22-퀘스트', steps: ['.side .ibtn[data-pop="quest"]'] },
  { k: '52-메뉴', steps: ['#menub'] },
  { k: '19-프로필', steps: ['#profBtn'] },
];

const probe = (page) => page.evaluate(() => {
  const out = [];
  const app = document.getElementById('app');
  if (!app) return out;
  const keyOf = (el) => {
    const s = [];
    let n = el, d = 0;
    while (n && n !== app && d < 4) {
      let t = n.tagName.toLowerCase();
      if (n.id) { s.unshift('#' + n.id); break; }
      if (n.classList.length) t += '.' + [...n.classList].filter(c => !/^(on|off|jz-|fx)/.test(c)).slice(0, 2).join('.');
      s.unshift(t); n = n.parentElement; d++;
    }
    return s.join('>');
  };
  for (const el of app.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;
    if (!(sw > 0)) continue;
    // 자기 자신이 직접 글자를 가진 칸만 (부모 상속으로 중복 계상 방지)
    let txt = '';
    for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
    txt = txt.trim();
    if (!txt) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const fs = parseFloat(cs.fontSize) || 0;
    if (!fs) continue;
    const po = (cs.paintOrder || '').trim() || 'normal';
    out.push({ key: keyOf(el), fs: +fs.toFixed(1), sw: +sw.toFixed(2), po, txt: txt.slice(0, 10) });
  }
  return out;
});

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const rows = [];
  for (const s of SCREENS) {
    await page.goto(URL);
    await page.waitForTimeout(700);
    for (const sel of s.steps) {
      try { await page.click(sel, { timeout: 2500 }); } catch (_) {}
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(300);
    const got = await probe(page);
    for (const g of got) rows.push({ ...g, screen: s.k });
  }
  await browser.close();

  // 종으로 묶기
  const kinds = new Map();
  for (const r of rows) {
    const k = r.key + '|' + r.fs + '|' + r.sw + '|' + r.po;
    if (!kinds.has(k)) kinds.set(k, { key: r.key, fs: r.fs, sw: r.sw, po: r.po, n: 0, txt: r.txt, screens: new Set() });
    const v = kinds.get(k); v.n++; v.screens.add(r.screen);
  }
  const list = [...kinds.values()].map(v => ({ ...v, screens: [...v.screens].join(','), r: +(v.sw / v.fs).toFixed(3) }));
  list.sort((a, b) => b.r - a.r);

  const inward = (v) => !/stroke/.test(v.po);   // paint-order 가 stroke 를 앞세우지 않으면 스트로크가 «채움 위» = 안쪽을 파먹는다
  const band = (r) => r >= 0.26 ? 'a >=.26 (막힘 확실)' : r >= 0.22 ? 'b .22~.26 (막힘 의심)' : r >= 0.17 ? 'c .17~.22' : r >= 0.12 ? 'd .12~.17' : 'e <.12 (얇음)';
  const sum = new Map();
  for (const v of list) {
    const b = band(v.r);
    if (!sum.has(b)) sum.set(b, { kinds: 0, places: 0 });
    sum.get(b).kinds++; sum.get(b).places += v.n;
  }
  const bad = list.filter(inward);
  console.log('총 ' + rows.length + '곳 = ' + list.length + '종');
  console.log('그중 paint-order 가 stroke 를 앞세우지 «않는» 자리(= 스트로크가 글자 속을 파먹는 자리): '
    + bad.length + '종 / ' + bad.reduce((a, b) => a + b.n, 0) + '곳\n');
  console.log('| 비율대 | 종 | 곳 |');
  console.log('|---|---|---|');
  for (const b of [...sum.keys()].sort()) console.log('| ' + b + ' | ' + sum.get(b).kinds + ' | ' + sum.get(b).places + ' |');
  console.log('\n| r | fs | sw | paint-order | 곳 | 자리 | 글자 | 화면 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const v of (ALL ? list : list.slice(0, 40)))
    console.log('| ' + v.r + ' | ' + v.fs + ' | ' + v.sw + ' | ' + (inward(v) ? '**파먹음**' : 'stroke fill') + ' | ' + v.n + ' | `' + v.key + '` | ' + v.txt + ' | ' + v.screens + ' |');

  if (JI > 0 && process.argv[JI + 1]) {
    fs_.writeFileSync(process.argv[JI + 1], JSON.stringify(list, null, 1));
    console.log('\n→ ' + process.argv[JI + 1]);
  }
})();
