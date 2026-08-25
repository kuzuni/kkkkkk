/* 작업 16 — 유물 세부 팝업 채점용 캡처. 1080x2280 (2026-08-25 기준 화면비).
 * 앞 회차(1~8)는 전부 1080x1920 캡처였다(cap_y = ref_y − 210). 9회차부터 폐기 —
 * 기준 프레임 1080x2280 · 세로 변환은 «ref y − 84» 하나뿐이다.
 * 레퍼런스(docs/ref/16-유물-세부-팝업.jpg)와 «같은 상태»로 맞춘다(LESSONS 04-①):
 *   · 커먼 등급 유물 1개 보유 · Lv.2 · 조각 1/3 · 강화 버튼 활성
 * 캡처 오염 방지: 캔버스를 내리고(28-③) 렌더 루프를 세운다(41-④).
 *   node tools/cap16.js [출력이름]   → docs/review/16-r{n}.png
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const name = process.argv[2] || '16-r11.png';
const out = path.resolve(__dirname, '..', 'docs', 'review', name);

const SAVE = { gold: 5e7, dia: 12000, own: { rl0: { l: 2, n: 1 } } };

/* 번들 브라우저 경로가 어긋나는 러너 대비(smoke.js launchOpts 와 같은 취지) */
function launchOpts(){
  const fs = require('fs');
  const cands = [process.env.PW_CHROMIUM,
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const o = launchOpts();
    if (!o.executablePath) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + o.executablePath);
    browser = await chromium.launch(o);
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
    /* ref 효과문은 «한 줄» 이다 — 장착 중이면 «장착 중 — 효과 2배» 한 줄이 더 붙어 2줄이 된다.
       autoEquipAll 이 보유 유물을 자동 장착하므로 캡처 전에 장착을 비운다(레퍼런스와 같은 상태). */
    S.eqRelic = [];
    showRelicDetail('rl0');
  });
  await page.waitForTimeout(400);

  /* 레퍼런스와 같은 «1/3» 진행 상태로 라벨·채움을 맞춘다(우리 밸런스는 fragNeed(2)=6).
     캡처 전용 표시 보정이며 게임 로직은 건드리지 않는다. */
  await page.evaluate(() => {
    const b = document.querySelector('#mbox .rl-pb b i');
    const f = document.querySelector('#mbox .rl-pb>i');
    if (b) b.textContent = '1/3';
    if (f) f.style.width = '33.3%';
    /* 제목 자수를 레퍼런스와 맞춘다 — ref 는 «오우거의 돌망치»(8칸)인데 우리 커먼 유물은
       «낡은 부적»(5칸)이라 그대로 재면 제목 잉크 폭이 −43% 로 나와 **허위 지적**이 된다(9회차에 실제로 발생).
       자수를 맞춰야 «자당 폭·잉크 높이» 를 비교할 수 있다. 캡처 전용 표시 보정. */
    const t = document.getElementById('mtitle');
    if (t) t.textContent = '오우거의 돌망치';
  });
  await page.waitForTimeout(200);

  const st = await page.evaluate(() => {
    const g = s => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      frameH: document.getElementById('app').style.height,
      scale: getComputedStyle(document.getElementById('app')).transform,
      wrap: [document.getElementById('wrap').clientWidth, document.getElementById('wrap').clientHeight],
      title: document.getElementById('mtitle').textContent,
      lv: (document.querySelector('#mbox .rl-lv b') || {}).textContent,
      grade: (document.querySelector('#mbox .rl-gr b') || {}).textContent,
      pb: (document.querySelector('#mbox .rl-pb b i') || {}).textContent,
      act: !document.querySelector('#mbox .rl-act').disabled,
      box: { mbox: g('#mbox'), card: g('#mbox .rld'), ic: g('#mbox .rl-ic'), gr: g('#mbox .rl-gr'),
             lvb: g('#mbox .rl-lv'), pb: g('#mbox .rl-pb'), fl: g('#mbox .rl-fl'),
             ow: g('#mbox .rl-ow'), eb: g('#mbox .rl-eb'), act: g('#mbox .rl-act') }
    };
  });
  console.log(JSON.stringify(st, null, 1));
  console.log('console errors:', errs.length, errs.slice(0, 5).join(' | '));

  await page.screenshot({ path: out });
  console.log('saved', out);
  await browser.close();
})();
