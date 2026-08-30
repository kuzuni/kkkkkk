/* 작업 464 재현 프로브 — «죽은 껍데기 클래스 `rl16`»
 *
 *   node tools/probe464.js
 *
 * 338·341·350·372 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341 은 여기서 등재문이 기각됐고, 350·363·455 는 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 464)의 주장:
 *   ⓐ `classList.add('rl16')` 하는 곳이 저장소에 **없다** — `grep rl16` 은 remove 목록 5곳과 주석뿐이다.
 *   ⓑ 그래서 «지금 룰렛인가» 를 `#modal.rl16` 으로 물으면 판정이 **영원히 거짓**이다(455 1회차가 실제로 걸렸다).
 *   ⓒ 처방 ⓐ = 다섯 목록에서 이름을 걷어낸다.
 *
 * 이 자가 **추가로** 묻는 것 — 처방이 «화면을 한 픽셀도 안 바꾼다» 는 근거:
 *   ⓓ 이 이름이 나르는 **선언이 하나라도 있는가**(CSSOM 전수 — `.rl16` 를 쓰는 규칙 수).
 *      선언이 0 이면 목록에서 빼도 `remove()` 는 이미 no-op 이므로 Δ0px 가 산술적으로 보장된다.
 *   ⓔ 그래도 그림으로 한 번 더 — 열린 모달에 손으로 `rl16` 을 **붙였다 뗐을 때** `#modal`·`.mbox` bbox Δ.
 *   ⓕ 껍데기 5종 오프너를 실제로 굴려 `#modal.className` 에 `rl16` 이 **한 번이라도** 뜨는가.
 *   ⓖ 345 의 `jzShellBack()` 은 목록을 하드코딩하지 않고 «그 클래스만 붙였을 때 뜨는가» 로 껍데기를
 *      가린다(LESSONS 265 — «목록은 다섯 곳에 흩어져 낡는다»). 죽은 이름이 그 판정에 섞이는지 본다.
 *   ⓗ **곁다리** — 같은 다섯 목록이 서로 **비대칭**이다(`openAttend` 는 `ml69` 를 안 뗀다 ·
 *      `openMail`·`openQuest` 는 `at70` 을 안 뗀다). 껍데기가 실제로 겹쳐 남는 경로가 있는지 잰다.
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455 규약). 결손 축 ⓕ 는 «rl16 이 안 뜬다» 로
 *   수리 전·후 둘 다 참이고, 갈리는 것은 ⓐ 의 **remove 목록 건수**(수리 전 5 → 수리 후 0)뿐이라
 *   그 항만 «트리에 따라 기대값이 갈린다» 고 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 껍데기 — [클래스, 여는 코드, 화면] */
const SHELLS = [
  ['ml69', 'openMail()', '69 우편함'],
  ['q22', 'openQuest()', '22 퀘스트'],
  ['at70', 'openAttend()', '70 출석'],
  ['sk8', 'showSkillDetail(Object.keys(SK)[0])', '08 스킬 세부'],
  ['rl16', 'openRoulette()', '16 룰렛(대조군 — 껍데기 override 없음)'],
];

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 1e5, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof closeModal === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춘다 — 킬 연출이 bbox 계측을 흔든다 */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { page, errs };
}

const run = (page, src) => ev(page, s => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  blk('[1] 소스 — 이름이 실제로 죽었는가(등재문 ⓐ)');
  const adds = (code.match(/classList\.add\([^)]{0,120}rl16/g) || []).length;
  const removes = (code.match(/remove\([^)]{0,120}rl16/g) || []).length;
  const cssDecl = (code.match(/\.rl16[^a-zA-Z0-9_-]/g) || []).length;
  const total = (src.match(/rl16/g) || []).length;
  ok(adds === 0, '[1-a] `classList.add(…rl16)` 은 제품에 **0건** — 이 이름을 켜는 곳이 없다', adds + '건');
  info('[1-b] `remove(…rl16)` 제품 줄 (수리 전 5 · 수리 후 0 — 트리에 따라 갈리는 유일한 축)', removes + '건');
  ok(cssDecl === 0, '[1-c] `.rl16` 선택자를 쓰는 **CSS 선언 0건** — 이름이 나르는 규격이 없다', cssDecl + '건');
  info('[1-d] `grep rl16` 총 건수(주석 포함)', total + '건');

  const browser = await launch(chromium);
  const b = await boot(browser);

  blk('[2] CSSOM — 이 이름이 나르는 선언을 브라우저에게 직접 묻는다(ⓓ)');
  {
    const r = await ev(b.page, () => {
      let hit = 0, seen = 0, sample = [];
      /* ⚠ 1회차 함정 — «cssRules 가 있으면 컨테이너» 로 갈랐더니 **전 규칙이 0건**으로 읽혔다:
         지금 크롬은 중첩(nesting) 때문에 평범한 CSSStyleRule 에도 **빈 `cssRules`** 가 달려 있다.
         ⇒ 선택자를 **먼저** 세고, 자식은 «길이가 있을 때만» 내려간다. [2-b] 대조군이 이 오독을 잡았다. */
      const walk = list => { for (const rule of list) {
        if (rule.selectorText) {
          seen++;
          if (/\.rl16\b/.test(rule.selectorText)) { hit++; if (sample.length < 3) sample.push(rule.selectorText); }
        }
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
      } };
      for (const ss of document.styleSheets) { try { walk(ss.cssRules); } catch (e) {} }
      return { hit, seen, sample };
    });
    ok(!!r && r.hit === 0, '★ [2-a] `.rl16` 를 쓰는 **스타일 규칙 0건** ⇒ 목록의 `remove` 는 이미 no-op 이다',
      r ? r.hit + '/' + r.seen + '규칙' + (r.sample.length ? ' · ' + r.sample.join(' , ') : '') : 'null');
    /* 살아 있는 넷은 실제로 규칙을 나른다 — 대조군이 있어야 [2-a] 가 «자가 없어서 0» 이 아님을 안다 */
    const live = await ev(b.page, () => {
      const out = {};
      for (const c of ['sk8', 'q22', 'ml69', 'at70']) out[c] = 0;
      const walk = list => { for (const rule of list) {
        if (rule.selectorText) for (const c of Object.keys(out))
          if (new RegExp('\\.' + c + '\\b').test(rule.selectorText)) out[c]++;
        if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
      } };
      for (const ss of document.styleSheets) { try { walk(ss.cssRules); } catch (e) {} }
      return out;
    });
    ok(!!live && Object.values(live).every(n => n > 0),
      '★ [2-b] 대조 — 살아 있는 껍데기 넷은 규칙을 나른다(자가 멀쩡하다는 증거)',
      live ? Object.entries(live).map(([k, v]) => k + ':' + v).join(' · ') : 'null');
  }

  blk('[3] 실동작 — 껍데기 5종을 굴려 `#modal` 클래스를 본다(ⓕ)');
  {
    for (const [cls, open, name] of SHELLS) {
      await run(b.page, 'closeModal()');
      await b.page.waitForTimeout(120);
      const r0 = await run(b.page, open);
      await b.page.waitForTimeout(260);
      const got = await ev(b.page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));
      if (r0 && r0.__err) { ok(false, '[3] ' + name + ' — 오프너 실패', r0.__err); continue; }
      const has = String(got || '').split(' ').includes('rl16');
      ok(!has, '[3-' + cls + '] ' + name + ' — 열린 `#modal` 에 `rl16` 없음', 'class="' + got + '"');
    }
    await run(b.page, 'closeModal()');
    await b.page.waitForTimeout(150);
  }

  blk('[4] 그림 — 이름을 손으로 붙였다 떼도 상자가 안 움직인다(ⓔ)');
  {
    await run(b.page, 'openMail()');
    await b.page.waitForTimeout(300);
    const d = await ev(b.page, () => {
      const m = document.getElementById('modal');
      const box = () => { const bx = m.querySelector('.mbox'); const a = m.getBoundingClientRect(), c = bx.getBoundingClientRect();
        return [a.x, a.y, a.width, a.height, c.x, c.y, c.width, c.height].map(v => +v.toFixed(2)); };
      const before = box();
      m.classList.add('rl16'); void m.offsetHeight;
      const on = box();
      m.classList.remove('rl16'); void m.offsetHeight;
      const after = box();
      const dmax = on.map((v, i) => Math.abs(v - before[i])).reduce((a, v) => Math.max(a, v), 0);
      const back = after.map((v, i) => Math.abs(v - before[i])).reduce((a, v) => Math.max(a, v), 0);
      return { before, on, dmax, back };
    });
    ok(!!d && d.dmax === 0, '★ [4-a] `rl16` 을 붙인 프레임의 `#modal`·`.mbox` bbox **Δ0.00px** ⇒ 목록에서 빼도 Δ0px',
      d ? 'Δmax=' + d.dmax + 'px · box=' + (d.before || []).join(',') : 'null');
    ok(!!d && d.back === 0, '[4-b] 떼고 나서도 제자리(계측 자체가 안 흔들린다)', d ? 'Δ=' + d.back + 'px' : 'null');
  }

  blk('[5] 345 `jzShellBack()` — 죽은 이름이 «껍데기» 판정에 섞이는가(ⓖ)');
  {
    const r = await ev(b.page, () => {
      const m = document.getElementById('modal');
      const was = [...m.classList];
      m.classList.remove('on');
      const probe = c => { const had = m.classList.contains(c); if (!had) m.classList.add(c);
        let dsp = 'none'; try { dsp = getComputedStyle(m).display; } catch (_) {}
        if (!had) m.classList.remove(c); return dsp; };
      const out = { rl16: probe('rl16'), ml69: probe('ml69'), on: probe('on') };
      m.classList.remove('on'); for (const c of was) m.classList.add(c);
      return out;
    });
    /* display:none 이면 jzShellBack 은 «껍데기» 로 보고 되살린다 — 죽은 이름도 그 목록에 섞인다(무해하지만 잡음) */
    ok(!!r && r.rl16 === 'none' && r.on !== 'none',
      '[5-a] `jzShellBack` 의 축으로 보면 `rl16` 은 «껍데기» 로 분류된다(치수 0인 빈 껍데기)',
      r ? 'rl16:' + r.rl16 + ' · ml69:' + r.ml69 + ' · on:' + r.on : 'null');
    info('[5-b] ⇒ 목록에서 빼는 것은 **345 연출에도 무해**하다(되살릴 선언이 애초에 없다)');
  }

  blk('[6] 곁다리 — 다섯 목록의 비대칭으로 껍데기가 겹쳐 남는가(ⓗ)');
  {
    const stale2 = [];
    const pairs = [
      ['openMail()', 'openAttend()', 'ml69', '우편(ml69) → 출석(at70): openAttend 는 ml69 를 안 뗀다'],
      ['openAttend()', 'openMail()', 'at70', '출석(at70) → 우편(ml69): openMail 은 at70 을 안 뗀다'],
      ['openAttend()', 'openQuest()', 'at70', '출석(at70) → 퀘스트(q22): openQuest 는 at70 을 안 뗀다'],
    ];
    for (const [a, c, stale, name] of pairs) {
      await run(b.page, 'closeModal()');
      await b.page.waitForTimeout(120);
      await run(b.page, a);
      await b.page.waitForTimeout(220);
      await run(b.page, c);                                  /* 닫지 않고 바로 갈아탄다 */
      await b.page.waitForTimeout(220);
      const got = await ev(b.page, () => [...document.getElementById('modal').classList].filter(x => !x.startsWith('jz-')).join(' '));
      const left = String(got || '').split(' ').includes(stale);
      info('[6-a] ' + name, 'class="' + got + '"' + (left ? '  ⚠ 껍데기 겹침' : '  겹침 없음'));
      if (left) stale2.push(stale);
    }
    /* ⚑ «겹친다» 만으로는 결함이 아니다 — 사람이 그 경로를 **밟을 수 있는가** 를 같이 잰다(463 «잠복» 규약).
       모달이 열려 있는 동안 다른 오프너의 버튼이 포인터에 잡히는지 `elementFromPoint` 로 묻는다. */
    await run(b.page, 'closeModal()');
    await b.page.waitForTimeout(120);
    await run(b.page, 'openAttend()');
    await b.page.waitForTimeout(260);
    const reach = await ev(b.page, () => {
      const out = [];
      const tryEl = (sel, label) => {
        const el = document.querySelector(sel);
        if (!el) return out.push({ label, hit: 'no-node' });
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return out.push({ label, hit: 'no-box' });
        const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        out.push({ label, hit: t === el || el.contains(t) ? 'REACHABLE' : (t ? (t.id || t.className || t.tagName) : 'null') });
      };
      tryEl('.side .ibtn[data-pop="attend"]', '사이드 출석');
      tryEl('.side .ibtn[data-pop="quest"]', '사이드 퀘스트');
      tryEl('#menub', '▦ 메뉴 버튼(우편 진입)');
      return out;
    });
    const reachable = (reach || []).filter(r => r.hit === 'REACHABLE');
    ok(reachable.length === 0,
      '★ [6-b] 모달이 열린 동안 다른 껍데기 오프너의 버튼은 포인터에 **안 잡힌다**(딤이 전면을 덮는다) ⇒ 겹침은 «잠복»',
      (reach || []).map(r => r.label + ':' + r.hit).join(' · '));
    info('[6-c] 판정', stale2.length
      ? '껍데기 겹침 ' + stale2.length + '경로 — 코드로는 재현되지만 포인터 경로가 ' +
        (reachable.length ? '**있다(실해)**' : '없다(잠복) ⇒ 곁다리 등재만 한다')
      : '겹침 없음');
    await run(b.page, 'closeModal()');
  }

  blk('[7] 콘솔');
  ok(b.errs.length === 0, '[7] 콘솔·페이지 에러 0', b.errs.slice(0, 2).join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE464 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
