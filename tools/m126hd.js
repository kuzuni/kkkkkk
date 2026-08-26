/* 126 ②-2 (8회차) — **A5 공용 모달 헤더 타이틀 `.mhead h2`** 게이트.
 *
 *   node tools/m126hd.js          # 게이트 (M126HD n/n PASS)
 *   node tools/m126hd.js --list   # 지금 값만 표로 보기(기대값 대조 없이)
 *
 * 왜 필요한가 — `.mhead h2` 는 **A5 공용 모달 헤더**다. 22 퀘스트 하나를 맞추려고 손대면
 * 이 헤더를 쓰는 모든 팝업(04·08·11·16·21·22·69·70·87·103 …)이 같이 움직인다.
 * §12 가 «게이트를 먼저 세우고 들어가라» 고 한 자리다. 그래서 이 도구는
 *   ① 헤더를 쓰는 팝업을 **자동으로 찾아서**(오프너를 돌며 `#modal .mhead h2` 가 보이는지 본다)
 *   ② 각 팝업의 **타이틀 잉크 bbox** 를 차분법으로 재고
 *   ③ «넘침 없음»(잉크가 헤더 바 안에 들어간다) + «기대 bbox ±허용»
 * 를 단언한다.
 *
 * 잉크 측정은 `m126t7.js` 와 같은 차분법이다 — 요소를 숨기기 전/후 두 장의 차이에서
 * 잡음(연속 2장 차이)을 뺀 픽셀만 «그 글자가 그린 것» 으로 센다. 배경이 무엇이든 오염되지 않는다.
 * 흰 채움 임계는 저장소 관례인 **min(rgb) > 150** (`box52.js`·`m126lbl.js`·`m126t7.js` 와 같은 값).
 *
 * 기대값의 출처(8회차에 확정) — «ref 가 있는 자리» 만 ref 를 쓰고, 나머지는 회귀 감시용 현재값이다:
 *   · 22 「퀘스트」 116×36 — §12 에서 비평가 K·L·5회차 측정자 3명이 일치, `m126t7.js` 가 4번째로 재확인
 *   · 04 「보석 던전」 184×44 — `docs/measure/04-던전세부팝업.md` §1-1
 *   · 69 「우편함」 89×31 — `docs/measure/69-우편함팝업.md` (⚠ ref 는 육각 타이틀 «탭» 이고 우리는
 *     지시(UI-REFERENCE 69)대로 공용 `.mhead` 로 통일했다 → **구속 목표가 아니다**. 감시만 한다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const LIST = process.argv.includes('--list');
const TH = 150, NOISE_TH = 18, BLK = 90, RAD = 5, PAD = 24;

/* 오프너 — `.mhead` 를 쓰는 팝업으로 가는 최단 경로. 클릭 순서대로 누른다. */
/* 오프너 — 8회차에 실측으로 «`#modal` 껍데기(= `.mhead`)를 실제로 쓰는» 것만 남겼다.
   03 던전·04 던전세부·21 도감은 각자 **전용 오버레이**를 쓰므로 이 헤더와 무관하다
   (등재 당시 §12 목록이 «03·04·21 도 같이 움직인다» 고 적은 것은 사실이 아니었다 — 여기서 정정한다). */
const OPENERS = [
  { k: '22-퀘스트', steps: ['.side .ibtn[data-pop="quest"]'] },
  { k: '69-우편함', steps: ['#menub', '#mnw [data-mn="mail"]'] },
  { k: '70-출석',   steps: ['.side .ibtn[data-pop="attend"]'] },
];

/* 기대 잉크 bbox — {w, h, 허용%, 출처}. */
const EXPECT = {
  /* 구속 목표 — ref 대조 */
  '22-퀘스트|퀘스트': { w: 116, h: 36, tol: 7, src: 'ref(§12 에서 K·L·5회차 측정자 3명 일치 + m126t7 재확인)' },
  /* 감시 — ref 가 아니라 «8회차 이후 현재값» 이다. 값이 흔들리면 공용 헤더를 누가 건드린 것이다.
     69 의 ref 는 89×31 이지만 그 ref 는 «육각 타이틀 탭» 이고 우리는 지시(UI-REFERENCE 69)대로
     공용 `.mhead` 로 통일했다 → ref 는 구속 목표가 아니다(measure/69 §2 가 그렇게 적어 뒀다). */
  '69-우편함|우편함':   { w: 122, h: 39, tol: 8, src: '8회차 현재값(공용 헤더 회귀 감시 — ref 89×31 은 구속 아님)' },
  /* 70 은 `.at70 .mhead h2` 로 화면별 fs 를 이미 갖고 있다. 8회차가 공용 sx 를 넣으면서
     `transform:none` 으로 제외했으므로 **값이 변하면 안 된다** — 그 제외가 살아 있는지 보는 자물쇠다. */
  '70-출석|출석 보상': { w: 181, h: 43, tol: 5, src: '7회차와 동일해야 함(.at70 override 가 공용 sx 에서 제외됐는지)' },
};

async function main() {
  const browser = await launch(chromium);
  const rows = [];
  for (const o of OPENERS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of o.steps) {
      await page.click(sel, { timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(700);
    }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await page.waitForTimeout(300);

    const meta = await page.evaluate((PAD) => {
      const h = document.querySelector('.mhead h2');
      if (!h) return null;
      const hd = h.closest('.mhead');
      const r = h.getBoundingClientRect(), hr = hd.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      const cs = getComputedStyle(h);
      if (cs.visibility === 'hidden' || cs.display === 'none') return null;
      const m = cs.transform.match(/matrix\(([^)]+)\)/);
      h.setAttribute('data-hd', '1');
      return {
        text: (h.textContent || '').trim().slice(0, 14),
        fs: parseFloat(cs.fontSize), sx: m ? +parseFloat(m[1].split(',')[0]).toFixed(4) : 1,
        head: { x: hr.left, y: hr.top, w: hr.width, h: hr.height },
        win: [Math.max(0, Math.floor(hr.left)), Math.ceil(hr.right),
              Math.max(0, Math.floor(hr.top - PAD)), Math.ceil(hr.bottom + PAD)],
      };
    }, PAD);
    if (!meta) { rows.push({ k: o.k, miss: true }); await ctx.close(); continue; }

    const clip = { x: meta.win[0], y: meta.win[2], width: meta.win[1] - meta.win[0], height: meta.win[3] - meta.win[2] };
    const shot = async () => (await page.screenshot({ clip })).toString('base64');
    const a = await shot();
    await page.waitForTimeout(100); const n1 = await shot();
    await page.waitForTimeout(100); const n2 = await shot();
    await page.evaluate(() => { const e = document.querySelector('[data-hd]'); if (e) e.style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    const b = await shot();

    const r = await page.evaluate(async ({ a, n1, n2, b, TH, NOISE_TH, BLK, RAD }) => {
      const dec = async (b64) => {
        const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height };
      };
      const A = await dec(a), N1 = await dec(n1), N2 = await dec(n2), B = await dec(b);
      const df = (p, q, o) => Math.abs(p[o] - q[o]) + Math.abs(p[o + 1] - q[o + 1]) + Math.abs(p[o + 2] - q[o + 2]);
      const bb = () => ({ x0: 1e9, x1: -1, y0: 1e9, y1: -1, n: 0 });
      const put = (o, x, y) => { o.n++; if (x < o.x0) o.x0 = x; if (x > o.x1) o.x1 = x; if (y < o.y0) o.y0 = y; if (y > o.y1) o.y1 = y; };
      const done = (o) => o.n < 6 ? null : { w: o.x1 - o.x0 + 1, h: o.y1 - o.y0 + 1, x0: o.x0, y0: o.y0 };
      /* 흰 코어 — 반경 RAD 안에 근흑이 있는 흰 픽셀만 (이 게임 글자는 «흰 채움 + 검정 외곽선») */
      const core = (d, W, H, x, y) => {
        const o = (y * W + x) * 4;
        if (Math.min(d[o], d[o + 1], d[o + 2]) <= TH) return false;
        for (let dy = -RAD; dy <= RAD; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = -RAD; dx <= RAD; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= W) continue;
            const q = (yy * W + xx) * 4;
            if (Math.max(d[q], d[q + 1], d[q + 2]) < BLK) return true;
          }
        }
        return false;
      };
      const ink = bb(), fill = bb();
      for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
        const o = (y * A.W + x) * 4;
        if (df(A.d, B.d, o) < NOISE_TH) continue;
        if (df(A.d, N1.d, o) >= NOISE_TH || df(A.d, N2.d, o) >= NOISE_TH || df(N1.d, N2.d, o) >= NOISE_TH) continue;
        put(ink, x, y);
        if (core(A.d, A.W, A.H, x, y)) put(fill, x, y);
      }
      return { ink: done(ink), fill: done(fill) };
    }, { a, n1, n2, b, TH, NOISE_TH, BLK, RAD });

    rows.push(Object.assign({ k: o.k }, meta, r));
    await ctx.close();
  }
  await browser.close();

  let pass = 0, total = 0, fail = [];
  const chk = (ok, msg) => { total++; if (ok) pass++; else fail.push(msg); };

  console.log(`\n126 8회차 게이트 — A5 공용 모달 헤더 \`.mhead h2\` 타이틀 잉크 (임계 ${TH})\n`);
  console.log('화면          타이틀        fs    sx   외곽선bbox  흰코어    기대(ref)    Δw      Δh');
  for (const r of rows) {
    if (r.miss) { console.log(`${r.k.padEnd(12)}  — \`.mhead h2\` 를 못 찾았다(오프너 확인)`); chk(false, `${r.k}: .mhead h2 없음`); continue; }
    const f = r.fill, ex = EXPECT[`${r.k}|${r.text}`];
    const dw = ex && f ? (f.w - ex.w) / ex.w * 100 : null;
    const dh = ex && f ? (f.h - ex.h) / ex.h * 100 : null;
    const p = (v) => v == null ? '   —  ' : ((v >= 0 ? '+' : '') + v.toFixed(1) + '%').padStart(7);
    console.log(
      `${r.k.padEnd(12)}  ${r.text.padEnd(12).slice(0, 12)} ${String(r.fs).padStart(5)} ${String(r.sx).padStart(6)}  ` +
      `${(r.ink ? `${r.ink.w}×${r.ink.h}` : 'null').padStart(9)} ${(f ? `${f.w}×${f.h}` : 'null').padStart(9)}  ` +
      `${(ex ? `${ex.w}×${ex.h}` : '감시만').padStart(9)} ${p(dw)} ${p(dh)}`);

    /* ① 넘침 — 타이틀이 헤더 바 안에 들어가야 한다.
       ⚠ 판정에는 **흰 코어**(`fill`)를 쓴다. 「외곽선bbox」(차분 잉크 전체)는 이 자리에서 못 쓴다 —
       헤더 바는 h2 를 숨기는 순간 바탕 그라디언트까지 미세하게 다시 칠해져 차분이 바 전체(819×89)로
       번진다. 흰 코어는 바가 짙은 갈색(82,62,61 — min(rgb)=61 < 150)이라 오염되지 않는다. */
    if (f) {
      chk(f.y0 >= PAD - 1 && f.y0 + f.h <= PAD + r.head.h + 1,
        `${r.k}: 타이틀이 헤더 바(높이 ${r.head.h})를 세로로 넘친다 — 잉크 y ${f.y0 - PAD}..${f.y0 + f.h - PAD}`);
      chk(f.x0 >= 1 && f.x0 + f.w <= r.head.w - 1,
        `${r.k}: 타이틀이 헤더 바(폭 ${Math.round(r.head.w)})를 가로로 넘친다 — 잉크 x ${f.x0}..${f.x0 + f.w}`);
    } else chk(false, `${r.k}: 타이틀 잉크를 못 쟀다`);

    /* ② 기대 bbox — ref 가 있는 자리만 */
    if (ex) {
      chk(f && Math.abs(dw) <= ex.tol, `${r.k} 「${r.text}」 폭 ${f && f.w} vs ref ${ex.w} (${p(dw).trim()}, 허용 ±${ex.tol}%) — ${ex.src}`);
      chk(f && Math.abs(dh) <= ex.tol, `${r.k} 「${r.text}」 높이 ${f && f.h} vs ref ${ex.h} (${p(dh).trim()}, 허용 ±${ex.tol}%) — ${ex.src}`);
    }
  }
  console.log('');
  if (LIST) { console.log('(--list: 대조 결과는 무시한다)\n'); return; }
  if (fail.length) { fail.forEach((m) => console.log('  ✗ ' + m)); console.log(''); }
  console.log(`M126HD ${pass}/${total} ${pass === total ? 'PASS' : 'FAIL'}\n`);
  if (pass !== total) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
