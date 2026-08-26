/* 126 — 서체·토큰 교체의 «레이아웃 회귀» 스캐너.
 *
 * 지시서 [3]-(가)+126 ⑤ «레이아웃 ①~④ 는 불변, bbox 가 ±3px 넘게 움직이는 곳은 예외» 를
 * 기계적으로 재기 위한 도구다. 화면을 돌면서 #app 안의 **id 를 가진 요소 전부**의
 * x/y/w/h 를 찍어 JSON 으로 남긴다.
 *
 *   node tools/scan126.js before.json     # 폰트 넣기 전
 *   node tools/scan126.js after.json      # 넣은 뒤
 *   node tools/scan126.js --diff before.json after.json [허용px=3]
 *
 * 텍스트 폭이 바뀌면 «글자를 담는 상자» 는 대부분 그대로여야 한다(레이아웃은 절대 px 지정이므로).
 * 움직이는 건 auto 폭/컨텐츠 폭에 기대던 자리뿐이고, 그게 정확히 이 작업이 찾아야 할 곳이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* 돌 화면 — 탭 5개 + 사이드 팝업 + 2단계 진입 몇 개. smoke.js 의 오프너 수집과 달리
   «레이아웃이 굳어 있는» 대표 화면만 본다(회귀 비교라 매번 같은 집합이어야 한다). */
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

function rectsOf(page) {
  return page.evaluate(() => {
    const out = {};
    const app = document.getElementById('app');
    if (!app) return out;
    /* 키는 «id 가 있으면 #id, 없으면 부모경로 + 태그.클래스:n». 텍스트가 아니라 상자를 비교하므로
       DOM 이 그대로면 키도 그대로다(회귀 비교 전용). */
    const key = (el) => {
      const seg = [];
      let n = el;
      while (n && n.id !== 'app' && n.nodeType === 1) {
        if (n.id) { seg.unshift('#' + n.id); break; }
        const cls = (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        const i = Array.prototype.indexOf.call(n.parentNode ? n.parentNode.children : [], n);
        seg.unshift(n.tagName.toLowerCase() + cls + ':' + i);
        n = n.parentNode;
      }
      return seg.join('>');
    };
    app.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      out[key(el)] = [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)];
    });
    return out;
  });
}

async function scan(out) {
  const browser = await launch(chromium);
  const all = {};
  for (const s of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1200);
    for (const sel of s.steps) {
      await page.click(sel, { timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(250);
    all[s.k] = await rectsOf(page);
    console.log(`  ${s.k}: ${Object.keys(all[s.k]).length} 요소`);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(out, JSON.stringify(all));
  console.log('saved', out);
}

/* 상시 애니메이션 때문에 캡처 시점마다 값이 흔들리는 자리 — 같은 빌드를 두 번 떠서
   실측한 잡음 바닥(2026-08-26: 2013개 중 34개). 회귀 신호가 아니므로 뺀다. */
const ANIM = [/\.cdv/, /#prF$/, /#rwGrid/, /\.th:\d+>em/, /#pfGid>i/, /\.bgm-/, /#fxl/, /\.fx/];

function diff(a, b, tol) {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
  let moved = 0, same = 0, only = 0;
  const rows = [];
  for (const k of Object.keys(A)) {
    for (const id of Object.keys(A[k])) {
      if (ANIM.some((re) => re.test(id))) continue;
      const p = A[k][id], q = B[k] && B[k][id];
      if (!q) { only++; continue; }
      const d = p.map((v, i) => +(q[i] - v).toFixed(1));
      const m = Math.max(...d.map(Math.abs));
      if (m > tol) { moved++; rows.push({ k, id, d, m }); } else same++;
    }
  }
  rows.sort((x, y) => y.m - x.m);
  console.log(`허용 ±${tol}px — 유지 ${same} · 이동 ${moved} · 사라짐 ${only}`);
  rows.slice(0, 60).forEach((r) => console.log(`  ${r.k} ${r.id}  Δ[x${r.d[0]} y${r.d[1]} w${r.d[2]} h${r.d[3]}]`));
  if (rows.length > 60) console.log(`  … 외 ${rows.length - 60}건`);
  return moved;
}

(async () => {
  if (process.argv[2] === '--diff') {
    diff(process.argv[3], process.argv[4], +(process.argv[5] || 3));
  } else {
    await scan(process.argv[2] || path.join(ROOT, 'docs/review/126-rects.json'));
  }
})();
