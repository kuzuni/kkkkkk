/* 126 ② (11회차) — **한글 ↔ 라틴·숫자 잉크 «높이» 부호 분리기.**
 *
 *   node tools/m126hk.js            # 전 대상
 *   node tools/m126hk.js 02         # 화면 키 필터
 *
 * 왜 필요한가 — §19-7 3.
 *   r9 의 S·T 가 ② 에서 **부호가 반대인 두 무리**를 동시에 들었다:
 *     라틴·숫자 잉크 높이  전역 **+7~10%** (10 「2/2」 +10.0 · 「1,000」 +9.5 · 02 계정 ID +25)
 *     한글      잉크 높이  전역 **−5~8%**  (02 「도감」 −8.0 · 「마을」 −6.2 · 23 「Lv.」 −5.3)
 *   같은 `font-size` 에서 부호가 갈리는 것은 개별 자리의 실수가 아니라 **폴백 서체의
 *   라틴/한글 메트릭 비율이 ref 게임 서체와 다르기** 때문이다. 개별 자리를 만지면
 *   반대쪽이 어긋나므로, 먼저 «두 무리가 정말 반대 부호인가» 를 한 코드로 확인해야 한다.
 *
 * 재는 것 — 흰 코어 bbox 의 **높이**(잉크 높이). m126sh 와 같은 코어 판정을 쓴다
 * (ref/우리에 같은 함수를 두 번. LESSONS 21). 글자 종류는 텍스트로 자동 분류한다:
 *   han  = 한글이 하나라도 있음        lat = 한글 없이 라틴/숫자만
 * 출력 끝에 **무리별 중앙값**을 찍는다 — 이 두 수가 반대 부호로 벌어져 있으면
 * 「숫자·라틴 전용 font-size 계수 토큰」이 정당화된다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const FILT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const argN = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const PAD = argN('--pad', 16), TH = argN('--th', 150), BLK = argN('--blk', 90), RAD = argN('--rad', 5);

const MEASURE = fs.readFileSync(path.join(__dirname, 'm126sh.js'), 'utf8')
  .match(/const MEASURE = `([\s\S]*?)`;/)[1];

const SCREENS = [
  { k: '02-메인', ref: 'docs/ref/02-기본-메인-화면.jpg', steps: [],
    sels: ['#chapN', '#chapN>em', '#goldN', '#diaN', '#cpN', '#nickN', '.tab .tl', '#sideL .ibtn .sl', '#botleft .ubtn .ul'] },
  { k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg', steps: ['.tab[data-t="shop"]'],
    sels: ['.shp-card .chd>i', '.shp-card .cbtn .lab', '.shp-card .cbtn u.sub', '#shopw .pcb-p b'] },
  { k: '23-훈련', ref: 'docs/ref/23-훈련-팝업.jpg', steps: ['.tab[data-t="grow"]'],
    sels: ['.mhead h2', '.tr-card .ch>i', '.tr-card .cv>i', '.tr-card .cb>i'] },
  { k: '22-퀘스트', ref: 'docs/ref/22-퀘스트-팝업.jpg', steps: ['.side .ibtn[data-pop="quest"]'],
    sels: ['.mhead h2', '.qs-t', '.qs-p b>em'] },
];

const kind = (t) => /[가-힣]/.test(t) ? 'han' : (/[A-Za-z0-9]/.test(t) ? 'lat' : '—');

async function main() {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of SCREENS) {
    if (FILT && !s.k.includes(FILT)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(700); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await page.waitForTimeout(400);

    const items = await page.evaluate(({ sels, PAD }) => {
      const out = []; let i = 0;
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return;
          if (r.bottom < 4 || r.top > innerHeight - 4) return;
          out.push({ i, sel, text: (el.textContent || '').trim().slice(0, 12),
            fs: +parseFloat(cs.fontSize).toFixed(1),
            win: [Math.max(0, Math.floor(r.left - PAD)), Math.ceil(r.right + PAD),
                  Math.max(0, Math.floor(r.top - PAD)), Math.ceil(r.bottom + PAD)] });
          i++;
        });
      }
      return out;
    }, { sels: s.sels, PAD });
    if (!items.length) { await ctx.close(); continue; }

    const shot = (await page.screenshot()).toString('base64');
    const refB64 = fs.readFileSync(path.join(ROOT, s.ref)).toString('base64');
    const refMime = /\.png$/i.test(s.ref) ? 'image/png' : 'image/jpeg';

    const res = await page.evaluate(async ({ shot, refB64, refMime, items, P, SRC }) => {
      eval(SRC);
      const dec = async (b64, mime) => {
        const im = new Image(); im.src = `data:${mime};base64,` + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
      };
      const A = await dec(shot, 'image/png'), R = await dec(refB64, refMime);
      const out = [];
      for (const it of items) {
        const [wx0, wx1, wy0, wy1] = it.win;
        const ours = measure(A.d, A.W, A.H, wx0, wx1, wy0, wy1, P);
        let ref = { core: null };
        if (ours.core) {
          const gx = Math.max(10, Math.round(ours.core.w * .18)), gy = Math.max(10, Math.round(ours.core.h * .30));
          ref = measure(R.d, R.W, R.H, ours.core.x0 - gx, ours.core.x0 + ours.core.w + gx,
            ours.core.y0 - gy + 84, ours.core.y0 + ours.core.h + gy + 84, P);
        }
        out.push({ i: it.i, ours, ref });
      }
      return out;
    }, { shot, refB64, refMime, items, P: { TH, BLK, RAD, EXIT: 110, MAXD: 16, EDGE: 4, BAND: true }, SRC: MEASURE });

    for (const r of res) rows.push(Object.assign({ screen: s.k }, items.find((x) => x.i === r.i), r));
    await ctx.close();
  }
  await browser.close();

  console.log('\n126 ② 잉크 «높이» — 한글 ↔ 라틴·숫자 부호 분리 (흰 코어 bbox h)\n');
  console.log('화면        자리                    종류   fs   우리h  ref h     Δ%');
  const groups = { han: [], lat: [] };
  for (const r of rows) {
    const k = kind(r.text);
    const oh = r.ours.core ? r.ours.core.h : null, fh = r.ref.core ? r.ref.core.h : null;
    let d = null;
    if (oh != null && fh) { d = +((oh - fh) / fh * 100).toFixed(1); if (groups[k]) groups[k].push(d); }
    console.log(`${r.screen.padEnd(10)}  ${(r.text + ' [' + r.sel.split(' ').pop() + ']').padEnd(23).slice(0, 23)} ${k.padEnd(4)} ` +
      `${String(r.fs).padStart(5)} ${String(oh == null ? '—' : oh).padStart(6)} ${String(fh == null ? '—' : fh).padStart(6)} ` +
      `${String(d == null ? '—' : (d >= 0 ? '+' : '') + d + '%').padStart(7)}`);
  }
  const med = (a) => { if (!a.length) return null; a.sort((x, y) => x - y); return +a[a.length >> 1].toFixed(1); };
  console.log('\n무리별 중앙값 (Δ% = 우리 − ref)');
  console.log(`  한글      n=${groups.han.length}  중앙값 ${med(groups.han)}%`);
  console.log(`  라틴·숫자 n=${groups.lat.length}  중앙값 ${med(groups.lat)}%`);
  const h = med(groups.han), l = med(groups.lat);
  if (h != null && l != null) {
    console.log(`  → 두 무리 차 = ${(l - h).toFixed(1)}%p ` +
      (Math.sign(h) !== Math.sign(l) && Math.abs(l - h) >= 8
        ? '· **부호가 반대이고 8%p 이상 벌어졌다 — 라틴 전용 계수 토큰이 정당하다**'
        : '· 부호가 갈리지 않았다 — 계수 토큰은 근거 부족(개별 자리 문제)'));
  }
  console.log('');
}
main().catch((e) => { console.error(e); process.exit(1); });
