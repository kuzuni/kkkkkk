#!/usr/bin/env node
/* 작업 605 재현 — `verify409` [6] «링이 덮는 코너 자리의 히트 테스트» 가 왜 뜨고 지는가 (338 규칙)
 *
 *   node tools/probe605.js [살아있는판_초]      (기본 60초 · 0 이면 그 절을 건너뛴다)
 *
 * 등재문의 가설은 «60 쥬시 애니(`jz-o jz-pg`)가 도는 동안 `elementFromPoint` 가 알약이 아니라
 * 그 노드를 돌려준다» 였다. 이 자는 그 앞을 묻는다 — **덮는 것이 «애니» 인가 «오버레이» 인가.**
 *
 * 절:
 *   [A] 기하   — 표본점(코너에서 8px 안)이 알약의 둥근 코너 **밖**이고 `ol4` 상자 **안**이라
 *                정답이 `ol4` 인 이유를 수치로 적는다(이 절이 [E] 되돌림의 근거이기도 하다).
 *   [B] 살아 있는 판 — 아무것도 안 하고 표본을 계속 뜨면서 «언제 빨개지는가» 를 본다.
 *   [C] 결정적 재현 — 제품 경로 `openDefeat()` 를 직접 불러 18 패배 화면을 띄우고 같은 표본을 뜬다.
 *                     `#defw` 는 z39 · `inset:0` 이라 한 번 켜지면 **그 뒤 표본이 전부 빨갛다**.
 *   [D] 등재문 가설 — `jz-o jz-pg`(scale .985)를 실제로 걸어 놓고 같은 표본을 뜬다.
 *   [E] 무장   — `closers540`(작업 540)을 `arm:true` 로 걸고 [C] 를 그대로 되풀이한다.
 *   [F] 되돌림 — `ol4` 의 `pointer-events` 를 끄면 표본이 알약 밖으로 떨어진다
 *                (= [6] 이 «이미 참인 것을 굳힌 항» 이 아니라는 증거).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install, defeatBlocked } = require('./closers540');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const LIVE_SEC = process.argv[2] === undefined ? 60 : Number(process.argv[2]);
const SEL = '#bSk .stabs';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d === undefined ? '' : ' — ' + d)); }
  else { fail++; console.log('  FAIL ' + n + (d === undefined ? '' : ' — ' + d)); }
};
const p2 = n => Math.round(n * 100) / 100;

/* verify409 [6] 과 **같은 표본**이다 — 활성 칸 상자의 좌하 코너에서 8px 안.
   덮은 것이 있으면 그 노드의 id·클래스와 그때 돌던 쥬시 애니를 같이 돌려준다. */
const HIT = sel => {
  const bar = document.querySelector(sel);
  if (!bar) return { err: '바 없음' };
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const on = cells.findIndex(c => c.classList.contains('on'));
  if (on < 0) return { err: '활성 칸 없음' };
  const b = cells[on].getBoundingClientRect();
  const el = document.elementFromPoint(b.x + 8, b.y + b.height - 8);
  const jz = (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jz(Pg|Sheet|Dim|Box)/.test(a.animationName || ''))
    .map(a => a.animationName + ':' + a.playState);
  return {
    inside: !!el && (el === cells[on] || cells[on].contains(el)),
    tag: el ? (el.tagName + (el.id ? '#' + el.id : '') + '.' + (el.className || '')) : 'null',
    h: b.height, jz,
  };
};

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof heroSubGo === 'function');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
    + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });
  return page;
}
async function host(page) {                       /* verify409 가 [6] 앞에서 서 있는 화면 */
  await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await boot(browser);
    await host(page);

    /* ── [A] 기하 ── */
    console.log('\n[A] 기하 — 표본점이 «알약의 둥근 코너 밖 · `ol4` 상자 안» 이라 정답이 `ol4` 다');
    const g = await page.evaluate(sel => {
      const c = document.querySelector(sel + ' > .stab.on');
      const b = c.getBoundingClientRect();
      const kid = c.querySelector('.ol4');
      const kb = kid.getBoundingClientRect();
      const cs = getComputedStyle(c), ks = getComputedStyle(kid);
      const px = b.x + 8, py = b.y + b.height - 8;
      const gap = (r, rad) => Math.hypot(px - (r.x + rad), py - (r.bottom - rad)) - rad;
      return {
        pillRad: parseFloat(cs.borderBottomLeftRadius), kidRad: parseFloat(ks.borderBottomLeftRadius),
        outPill: gap(b, parseFloat(cs.borderBottomLeftRadius)),
        inKidX: px - kb.x, inKidY: kb.bottom - py,
        kidPe: ks.pointerEvents,
      };
    }, SEL);
    ok('표본점은 알약의 둥근 코너(r=' + g.pillRad + ') **밖**이다', g.outPill > 0,
      '윤곽에서 ' + p2(g.outPill) + 'px 밖');
    ok('그 자리를 덮는 것은 자식 `ol4`(r=' + g.kidRad + ') 다', g.inKidX > 2 && g.inKidY > 2,
      '좌변에서 ' + p2(g.inKidX) + 'px · 하변에서 ' + p2(g.inKidY) + 'px 안 · pointer-events ' + g.kidPe);
    const base = await page.evaluate(HIT, SEL);
    ok('정지 상태에서 표본은 활성 칸으로 간다', base.inside === true, base.tag);

    /* ── [B] 살아 있는 판 ── */
    if (LIVE_SEC > 0) {
      console.log('\n[B] 살아 있는 판 — 아무것도 안 하고 ' + LIVE_SEC + '초 동안 같은 표본을 뜬다');
      let n = 0, bad = 0, first = null;
      const t0 = Date.now();
      while (Date.now() - t0 < LIVE_SEC * 1000) {
        const r = await page.evaluate(HIT, SEL);
        n++;
        if (r.err || !r.inside) { bad++; if (!first) first = { t: Math.round((Date.now() - t0) / 100) / 10, ...r }; }
        await page.waitForTimeout(120);
      }
      console.log('    표본 ' + n + '개 · 어긋남 ' + bad + '개'
        + (first ? ' · 첫 어긋남 t=' + first.t + 's — ' + first.tag + ' · 쥬시 애니 [' + first.jz.join(' ') + ']' : ''));
      ok('[B] 표본을 실제로 떴다 (절이 공허하지 않다)', n >= 20, n + '개');
      /* ⚑ 등재문이 인용한 «`on jz-o jz-pg`» 는 **알약도 페이지도 아니고 그 껍데기의 className** 이다 —
         `jz-o jz-pg` 는 «그 껍데기가 **방금 열렸다**» 는 표시일 뿐이라, 애니가 원인이 아니라 결과다. */
      if (bad) ok('[B] 덮은 것은 알약 계열이 아니라 **껍데기 오버레이**다 (등재문 가설 정정)',
        !!first && /^DIV#/.test(first.tag || '') && !/\.stab/.test(first.tag || ''), first.tag);
      else console.log('    (이 실행에서는 자연 사망이 안 났다 — [C] 가 같은 자리를 결정적으로 재현한다)');
    }

    /* ── [C] 결정적 재현 ── */
    console.log('\n[C] 결정적 재현 — 제품 경로 `openDefeat()` 로 18 패배 화면을 띄운다');
    /* [B] 에서 자연 사망이 났으면 껍데기가 아직 켜져 있다 — 기준선을 잡으려면 먼저 걷는다
       (닫개 함수가 없어 DOM 으로 끈다 · `closers540` SHELL_IDS 와 같은 자리). */
    await page.evaluate(() => { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); });
    await host(page);
    const before = await page.evaluate(HIT, SEL);
    await page.evaluate(() => { openDefeat(); });
    await page.waitForTimeout(400);
    const after = await page.evaluate(HIT, SEL);
    const stuck = await page.evaluate(() => { const d = document.getElementById('defw'); return !!d && d.classList.contains('on'); });
    ok('패배 화면 **전**에는 활성 칸으로 간다', before.inside === true, before.tag);
    ok('★ 패배 화면이 뜨면 같은 표본이 그 오버레이로 간다 (= [6] 이 빨개지는 자리)',
      after.inside === false && /defw/.test(after.tag), after.tag + ' · 쥬시 애니 [' + after.jz.join(' ') + ']');
    ok('그 껍데기는 스스로 안 걷힌다 — 그 뒤 표본이 전부 빨갛다', stuck === true, '#defw.on=' + stuck);
    /* 알약 자체는 한 픽셀도 안 움직였다 — 제품이 아니라 «자가 무엇을 보고 있는가» 의 문제다 */
    ok('알약 상자는 그대로다 (제품 결함이 아니다)', Math.abs(after.h - before.h) < 0.01,
      before.h.toFixed(2) + ' → ' + after.h.toFixed(2));
    await page.evaluate(() => { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); });

    /* ── [D] 등재문 가설 ── */
    console.log('\n[D] 등재문 가설 — `jz-o jz-pg`(scale .985)가 도는 **동안** 재 본다');
    await host(page);
    const jzr = await page.evaluate(sel => {
      const pg = document.querySelector('#bSk');
      pg.classList.remove('jz-o', 'jz-pg');
      void pg.offsetWidth;
      pg.classList.add('jz-o', 'jz-pg');
      void pg.offsetWidth;
      const bar = document.querySelector(sel);
      const cells = [...bar.querySelectorAll(':scope > .stab')];
      const on = cells.findIndex(c => c.classList.contains('on'));
      const b = cells[on].getBoundingClientRect();
      const el = document.elementFromPoint(b.x + 8, b.y + b.height - 8);
      const run = (document.getAnimations ? document.getAnimations() : [])
        .filter(a => /^jzPg/.test(a.animationName || '')).map(a => a.animationName + ':' + a.playState);
      pg.classList.remove('jz-o', 'jz-pg');
      return { inside: !!el && (el === cells[on] || cells[on].contains(el)),
        tag: el ? (el.tagName + (el.id ? '#' + el.id : '') + '.' + (el.className || '')) : 'null',
        h: b.height, run };
    }, SEL);
    ok('★ 쥬시 애니가 도는 동안에도 표본은 활성 칸으로 간다 (등재문 가설 **기각**)',
      jzr.inside === true && jzr.run.length > 0,
      jzr.tag + ' · 상자 ' + jzr.h.toFixed(2) + '(scale .985 반영) · [' + jzr.run.join(' ') + ']');

    /* ── [E] 무장 ── */
    console.log('\n[E] 무장 — `closers540` 을 `arm:true` 로 걸고 [C] 를 그대로 되풀이한다');
    await install(page, { arm: true });
    await host(page);
    await page.evaluate(() => { openDefeat(); });
    await page.waitForTimeout(400);
    const armed = await page.evaluate(HIT, SEL);
    const blocked = await defeatBlocked(page);
    ok('★ 같은 호출인데 표본이 활성 칸으로 간다', armed.inside === true, armed.tag);
    ok('껍데기를 실제로 걷었다 (팔이 빈 껍데기가 아니다 · LESSONS 353-④)', blocked >= 1, '막은 횟수 ' + blocked + '회');

    /* ── [F] 되돌림 ── */
    console.log('\n[F] 되돌림 — `ol4` 의 `pointer-events` 를 끄면 표본이 알약 밖으로 떨어진다');
    await page.evaluate(() => {
      const s = document.createElement('style'); s.id = 'p605';
      s.textContent = '.stab.on>.ol4{pointer-events:none}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(150);
    const off = await page.evaluate(HIT, SEL);
    await page.evaluate(() => { const s = document.getElementById('p605'); if (s) s.remove(); });
    await page.waitForTimeout(150);
    const back = await page.evaluate(HIT, SEL);
    ok('★ 끄면 빨갛다 ([6] 이 «이미 참인 것» 을 굳힌 항이 아니다)', off.inside === false, off.tag);
    ok('되살리면 다시 초록', back.inside === true, back.tag);
  } catch (e) {
    ok('재현 실행', false, String(e && e.message || e).slice(0, 200));
  } finally {
    await browser.close();
  }
  console.log('\nPROBE605 ' + pass + '/' + (pass + fail) + '  ' + (fail ? fail + ' FAIL' : 'ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
