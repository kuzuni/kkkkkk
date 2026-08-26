/* 126 ② — `scaleX()` 288곳 전수 재검토용 실측기.
 *
 * 서체가 바뀌면 «압축 게임 서체 흉내» 로 넣었던 scaleX 보정은 대부분 필요 없어진다.
 * 어떤 자리가 정말로 압축이 필요한지(= 안 줄이면 넘친다)를 눈이 아니라 픽셀로 가른다.
 *
 *   node tools/m126sx.js            # 요약 + 상위 목록
 *   node tools/m126sx.js --all      # 전건
 *
 * 각 화면에서 «계산된 transform 에 scaleX≠1 이 들어 있고 텍스트를 가진 요소» 를 모아
 *   - sx      : 실제 적용된 가로 배율
 *   - need    : 압축을 끄고(scaleX 1) 쟀을 때 «담을 상자 대비 넘치는 비율» (1 이하 = 안 넘침)
 *   - verdict : need ≤ 1 이면 «불필요(삭제 후보)», 아니면 «필요(need 까지만 조이면 됨)»
 * 를 찍는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const ALL = process.argv.includes('--all');

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
    let n = el;
    while (n && n.id !== 'app' && n.nodeType === 1) {
      if (n.id) { s.unshift('#' + n.id); break; }
      const c = (typeof n.className === 'string' && n.className.trim()) ? '.' + n.className.trim().split(/\s+/)[0] : '';
      s.unshift(n.tagName.toLowerCase() + c);
      n = n.parentNode;
    }
    return s.join('>');
  };
  app.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    const m = cs.transform;
    if (!m || m === 'none') return;
    const nums = m.match(/matrix\(([^)]+)\)/);
    if (!nums) return;
    const a = parseFloat(nums[1].split(',')[0]);
    if (!isFinite(a) || Math.abs(Math.abs(a) - 1) < 0.005) return;   // scaleX 1 (·-1 미러는 |a|=1)
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 40) return;                             // 텍스트 요소만
    if (!/[가-힣A-Za-z0-9]/.test(txt)) return;                       // 이모지·기호만인 칸은 서체와 무관
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    /* 압축을 끈 자연 폭 vs 담을 상자 폭 */
    const prev = el.style.transform;
    el.style.transform = 'none';
    const nat = el.scrollWidth || el.getBoundingClientRect().width;
    el.style.transform = prev;
    const host = el.parentElement;
    const avail = host ? (host.clientWidth || host.getBoundingClientRect().width) : nat;
    out.push({ key: keyOf(el), txt: txt.slice(0, 14), sx: +a.toFixed(3), nat: Math.round(nat), avail: Math.round(avail) });
  });
  return out;
});

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1200);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(500); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(200);
    (await probe(page)).forEach((r) => rows.push({ scr: s.k, ...r }));
    await ctx.close();
  }
  await browser.close();

  /* 같은 CSS 규칙에서 온 자리는 key 로 묶인다(화면마다 반복되므로) */
  const seen = new Map();
  rows.forEach((r) => {
    const k = r.key + '|' + r.sx;
    const need = r.avail > 0 ? r.nat / r.avail : 1;
    const cur = seen.get(k);
    if (!cur || need > cur.need) seen.set(k, { ...r, need });
  });
  const list = [...seen.values()].sort((x, y) => y.need - x.need);
  const drop = list.filter((r) => r.need <= 1.0);
  const keep = list.filter((r) => r.need > 1.0);
  console.log(`scaleX≠1 텍스트 자리 ${list.length}종 (실측 ${rows.length}건)`);
  console.log(`  삭제 후보(압축 없이도 안 넘침) ${drop.length}종 · 유지 필요 ${keep.length}종`);
  console.log('\n[유지 필요] need = 압축 끈 자연폭 / 담을 상자 폭');
  keep.forEach((r) => console.log(`  need ${r.need.toFixed(2)}  sx ${r.sx}  ${r.scr} ${r.key} «${r.txt}» ${r.nat}/${r.avail}`));
  console.log('\n[삭제 후보]' + (ALL ? '' : ' (상위 25 · 전건은 --all)'));
  (ALL ? drop : drop.slice(0, 25)).forEach((r) => console.log(`  need ${r.need.toFixed(2)}  sx ${r.sx}  ${r.scr} ${r.key} «${r.txt}» ${r.nat}/${r.avail}`));
})();
