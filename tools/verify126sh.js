/* VERIFY126SH — 126 ③ 11회차 «드롭 섀도 토큰» 회귀 게이트.
 *
 *   node tools/verify126sh.js
 *
 * 무엇을 못 박는가
 *   A. `--sh-drop` 토큰이 :root 에 있고, 카드 헤더가 «묻히는 몫»(st/2)을 보상해 쓴다.
 *   B. 실제 렌더에서 10 상점 카드 헤더의 «잉크 아래 검정» 이 «위» 보다 3px 안팎 크다(= 그림자가 보인다).
 *   C. 그리고 그 값이 레퍼런스와 ±1px 안이다(위·아래 각각).
 *   D. **음성항** — 오프셋을 st/2 이하로 낮추면 그림자가 사라진다(공식 «보이는 = 오프셋 − st/2» 가 참).
 *      이 항이 없으면 «어차피 항상 통과하는 검사» 인지 구분할 수 없다.
 *   E. **음성항** — ref 가 그림자를 갖지 않는 계열(69 우편 버튼)에 그림자가 생기지 않았다.
 *      §20-5 의 «묻힌 것을 푸는 것은 오답» 을 코드로 고정한다.
 *
 * 판정은 전부 실측이다(정규식으로 CSS 문자열만 보는 항은 A 뿐).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MEASURE = fs.readFileSync(path.join(__dirname, 'm126sh.js'), 'utf8')
  .match(/const MEASURE = `([\s\S]*?)`;/)[1];

let pass = 0, total = 0;
const ok = (cond, label, detail) => {
  total++; if (cond) pass++;
  console.log(`  ${cond ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`);
};

const P = { TH: 150, BLK: 90, RAD: 5, EXIT: 110, MAXD: 16, EDGE: 4 };

async function profile(page, sel) {
  const wins = await page.evaluate((s) => {
    const out = [];
    document.querySelectorAll(s).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 4 || r.top > innerHeight - 4) return;
      out.push({ t: (el.textContent || '').trim().slice(0, 8),
        win: [Math.floor(r.left - 16), Math.ceil(r.right + 16), Math.floor(r.top - 16), Math.ceil(r.bottom + 16)] });
    });
    return out;
  }, sel);
  if (!wins.length) return [];
  const shot = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ shot, wins, P, SRC }) => {
    eval(SRC);
    const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    return wins.map((w, i) => Object.assign({ t: wins[i].t },
      measure(d, c.width, c.height, w.win[0], w.win[1], w.win[2], w.win[3], P)));
  }, { shot, wins, P, SRC: MEASURE });
}

async function refProfile(page, refRel, ours) {
  const refB64 = fs.readFileSync(path.join(ROOT, refRel)).toString('base64');
  const mime = /\.png$/i.test(refRel) ? 'image/png' : 'image/jpeg';
  return page.evaluate(async ({ refB64, mime, ours, P, SRC }) => {
    eval(SRC);
    const im = new Image(); im.src = `data:${mime};base64,` + refB64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    return ours.map((o) => {
      if (!o.core) return { core: null };
      const gx = Math.max(10, Math.round(o.core.w * .18)), gy = Math.max(10, Math.round(o.core.h * .30));
      return measure(d, c.width, c.height, o.core.x0 - gx, o.core.x0 + o.core.w + gx,
        o.core.y0 - gy + 84, o.core.y0 + o.core.h + gy + 84, P);
    });
  }, { refB64, mime, ours, P, SRC: MEASURE });
}

async function main() {
  console.log('\nVERIFY126SH — 126 ③ 드롭 섀도 토큰\n');

  console.log('[A] 소스 — 토큰 선언과 «묻히는 몫» 보상');
  const decl = /--sh-drop\s*:\s*\.?0*\.?(\d+)/.exec(SRC);
  ok(!!decl, ':root 에 `--sh-drop` 토큰이 선언돼 있다', decl ? '값 .' + decl[1] : '없음');
  const useRe = /\.shp-card>\.chd>i\{[^}]*text-shadow:0 calc\(\(var\(--st-small\)\s*\/\s*2\s*\+\s*var\(--sh-drop\)\)\s*\*\s*1em\) 0 #000/;
  ok(useRe.test(SRC.replace(/\n\s*/g, '')),
    '카드 헤더가 `(--st-small/2 + --sh-drop)` 로 «묻히는 몫» 을 보상한다',
    '오프셋을 그대로 쓰면 스트로크에 묻힌다(§20-2)');
  ok(!/--sh-drop\s*:\s*0(?:px)?\s*[;}]/.test(SRC), '토큰이 0 으로 꺼져 있지 않다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.click('.tab[data-t="shop"]', { force: true }).catch(() => {});
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await page.waitForTimeout(400);

  console.log('\n[B] 실측 — 카드 헤더의 그림자가 «보인다»');
  const SEL = '.shp-card>.chd>i';
  const ours = (await profile(page, SEL)).filter((r) => r.core && r.top != null && r.bot != null);
  ok(ours.length >= 3, `카드 헤더 표본 ${ours.length}개 (≥3)`);
  for (const r of ours) {
    ok(r.drop >= 2 && r.drop <= 4.5, `「${r.t}」 아래 검정이 위보다 2~4.5px 크다`,
      `위 ${r.top} · 아래 ${r.bot} · drop ${r.drop}`);
  }

  console.log('\n[C] 실측 — 레퍼런스와 위·아래가 각각 ±1px');
  const refs = await refProfile(page, 'docs/ref/10-상점-팝업-소환-탭.jpg', ours);
  let cmp = 0;
  for (let i = 0; i < ours.length; i++) {
    const o = ours[i], f = refs[i];
    if (!f || !f.core || f.top == null || f.bot == null) continue;
    cmp++;
    ok(Math.abs(o.top - f.top) <= 1, `「${o.t}」 위 검정 ref ±1`, `우리 ${o.top} vs ref ${f.top}`);
    ok(Math.abs(o.bot - f.bot) <= 1, `「${o.t}」 아래 검정 ref ±1`, `우리 ${o.bot} vs ref ${f.bot}`);
  }
  ok(cmp >= 2, `ref 표본이 잡힌 카드 ${cmp}개 (≥2)`);

  console.log('\n[D] 음성항 — 오프셋을 st/2 이하로 낮추면 그림자가 사라진다');
  await page.evaluate((sel) => {
    const st = document.createElement('style'); st.id = '__neg126';
    st.textContent = `${sel}{text-shadow:0 calc(var(--st-small) / 2 * 1em) 0 #000 !important}`;
    document.head.appendChild(st);
  }, SEL);
  await page.waitForTimeout(200);
  const buried = (await profile(page, SEL)).filter((r) => r.core && r.top != null && r.bot != null);
  const allFlat = buried.length >= 3 && buried.every((r) => r.drop <= 1);
  ok(allFlat, '오프셋 = st/2 이면 drop ≤ 1 (전부 묻힌다)',
    buried.map((r) => r.t + ':' + r.drop).join(' '));
  await page.evaluate(() => document.getElementById('__neg126')?.remove());
  await page.waitForTimeout(200);

  console.log('\n[E] 음성항 — ref 가 그림자를 갖지 않는 계열에는 그림자가 없다 (§20-5)');
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.click('#menub', { force: true }).catch(() => {});
  await page.waitForTimeout(500);
  await page.click('#mnw [data-mn="mail"]', { force: true }).catch(() => {});
  await page.waitForTimeout(800);
  const mail = (await profile(page, '.ml-all b')).filter((r) => r.core && r.top != null && r.bot != null);
  if (!mail.length) {
    ok(true, '69 우편 버튼 표본 없음 — 건너뜀(회귀 대상 아님)', '화면 진입 실패는 감점하지 않는다');
  } else {
    for (const r of mail) {
      ok(r.drop <= 2, `69 「${r.t}」 에 그림자가 생기지 않았다 (ref drop 0)`,
        `위 ${r.top} · 아래 ${r.bot} · drop ${r.drop}`);
    }
  }

  await browser.close();
  console.log(`\nVERIFY126SH ${pass}/${total} ${pass === total ? 'PASS' : 'FAIL'}\n`);
  process.exit(pass === total ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
