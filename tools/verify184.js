#!/usr/bin/env node
/* 작업 184 회귀 게이트 — «보스 연출이 UI 를 뚫고 나옴» + «풀스크린 플래시 폐지»
 *
 *   node tools/verify184.js
 *
 * 검사 항목
 *   §1 폐지 — `.jz-wf` CSS 규칙·`@keyframes jzWf`·호출부가 소스에서 사라졌는가 (주석은 제외)
 *   §2 전수 — `inset:0` + 흰/적 배경 + opacity 애니메이션인 «풀스크린 플래시» 클래스가 0개인가
 *   §3 레이어 — 보스 등장(`.jz-vig`·`.jz-slam`)이 `#fxlc`(z7, 팝업 아래)에 붙는가 (`#fxl` z60 아님)
 *   §4 가림 — 팝업이 열린 상태에서 보스 등장 연출이 **팝업에 덮이는가**(elementFromPoint 로 실측)
 *   §5 처치 — 보스 종료 시 어떤 레이어에도 풀스크린 흰 판이 생기지 않는가
 *   §6 입력 — 두 연출 모두 `pointer-events:none` 이라 탭을 막지 않는가
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const URL = 'file://' + FILE.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

/* 주석(/* … *\/ 과 <!-- … -->)을 지운 소스 — «삭제됐다» 를 주석 문구로 오판하지 않기 위해 */
function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

(async () => {
  const SRC = fs.readFileSync(FILE, 'utf8');
  const BARE = stripComments(SRC);

  console.log('§1 처치 흰 플래시 폐지');
  ok('.jz-wf CSS 규칙 없음', !/\.jz-wf\s*\{/.test(BARE));
  ok('@keyframes jzWf 없음', !/@keyframes\s+jzWf/.test(BARE));
  ok("jzFx('jz-wf'…) 호출부 없음", !/jz-wf/.test(BARE));

  console.log('§2 풀스크린 플래시 전수 — inset:0 + 흰/적 + opacity 애니메이션');
  /* 전체 화면을 덮는(=inset:0) 요소 중 배경이 순백/순적이고 animation 을 가진 규칙을 센다.
     대상 요소 한정 플래시(.jz-badov 처럼 부모 크기 100%)는 inset:0 이 아니라 잡히지 않는다. */
  const rules = BARE.match(/\.[A-Za-z0-9_-]+\s*\{[^{}]*\}/g) || [];
  const bad = rules.filter(r =>
    /inset\s*:\s*0\s*[;}]/.test(r) &&
    /background\s*:\s*(#fff\b|#ffffff\b|#f00\b|white\b|red\b)/i.test(r) &&
    /animation\s*:/.test(r));
  ok('풀스크린 흰/적 플래시 규칙 0개', bad.length === 0, bad.length ? bad.map(b => b.slice(0, 60)).join(' | ') : '');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /* 레이어 z-index 실측 */
  const z = await page.evaluate(() => {
    const g = id => { const el = document.getElementById(id); return el ? +getComputedStyle(el).zIndex : null; };
    return { fxl: g('fxl'), fxlc: g('fxlc') };
  });

  console.log('§3 보스 등장 연출이 붙는 레이어');
  ok('#fxlc z-index 가 #fxl 보다 낮다', z.fxlc !== null && z.fxl !== null && z.fxlc < z.fxl, `fxlc=${z.fxlc} fxl=${z.fxl}`);

  /* 보스 등장 트리거 — jzInit 의 MutationObserver 는 #stinfo 의 .bfight 전환을 본다 */
  const where = await page.evaluate(async () => {
    const si = document.getElementById('stinfo');
    si.classList.remove('bfight', 'bfarm');
    await new Promise(r => setTimeout(r, 60));
    si.classList.add('bfight');
    await new Promise(r => setTimeout(r, 120));
    const pick = sel => {
      const el = document.querySelector(sel);
      return el ? (el.parentElement && el.parentElement.id) || '?' : null;
    };
    return { vig: pick('.jz-vig'), slam: pick('.jz-slam') };
  });
  ok('.jz-vig 가 #fxlc 에 붙는다', where.vig === 'fxlc', `실측 부모=${where.vig}`);
  ok('.jz-slam 가 #fxlc 에 붙는다', where.slam === 'fxlc', `실측 부모=${where.slam}`);

  console.log('§4 팝업이 열려 있으면 연출이 팝업에 덮인다');
  const covered = await page.evaluate(async () => {
    /* 아무 모달이나 하나 연다 — 22 퀘스트 팝업(#modal) 이 가장 단순하다 */
    const md = document.getElementById('modal');
    md.style.display = 'flex';
    const si = document.getElementById('stinfo');
    si.classList.remove('bfight');
    await new Promise(r => setTimeout(r, 60));
    si.classList.add('bfight');
    await new Promise(r => setTimeout(r, 120));
    const vig = document.querySelector('.jz-vig');
    if (!vig) return { err: 'no vig' };
    const r = vig.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    /* 연출은 pointer-events:none 이라 hit-test 로는 안 잡힌다 → 쌓임 순서를 z-index 로 비교한다 */
    const zi = el => { let n = el, out = []; while (n && n !== document.body) { const s = getComputedStyle(n); if (s.zIndex !== 'auto') out.push(+s.zIndex); n = n.parentElement; } return out.length ? Math.max(...out) : 0; };
    const top = document.elementFromPoint(cx, cy);
    const res = { modalZ: zi(md), vigZ: zi(vig), topId: top ? (top.id || top.className) : null };
    md.style.display = '';
    si.classList.remove('bfight');
    return res;
  });
  ok('보스 비네트 z < 모달 z (팝업이 덮는다)', !covered.err && covered.vigZ < covered.modalZ, `vig=${covered.vigZ} modal=${covered.modalZ}`);

  console.log('§5 보스 처치 — 풀스크린 흰 판 없음');
  const kill = await page.evaluate(async () => {
    const si = document.getElementById('stinfo');
    si.classList.remove('bfarm');
    si.classList.add('bfight');
    await new Promise(r => setTimeout(r, 120));
    si.classList.remove('bfight');                 /* 처치 = bfight 해제 */
    await new Promise(r => setTimeout(r, 80));
    const W = document.getElementById('app').getBoundingClientRect();
    let worst = 0, who = null;
    for (const el of document.querySelectorAll('#fxl>*, #fxlc>*')) {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const area = (r.width * r.height) / (W.width * W.height);
      const bg = s.backgroundColor || '';
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const bright = m && +m[1] > 200 && +m[2] > 200 && +m[3] > 200;
      if (area > 0.5 && bright && +s.opacity > 0.05) { if (area > worst) { worst = area; who = el.className; } }
    }
    return { worst, who, kids: document.querySelectorAll('#fxl>*, #fxlc>*').length };
  });
  ok('처치 직후 화면 절반 이상을 덮는 흰 판 0개', kill.worst === 0, kill.who ? `발견=${kill.who} (면적 ${(kill.worst * 100).toFixed(0)}%)` : '');

  console.log('§6 입력 차단 없음');
  const pe = await page.evaluate(async () => {
    const si = document.getElementById('stinfo');
    si.classList.remove('bfight');
    await new Promise(r => setTimeout(r, 60));
    si.classList.add('bfight');
    await new Promise(r => setTimeout(r, 120));
    const g = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).pointerEvents : null; };
    const out = { vig: g('.jz-vig'), slam: g('.jz-slam'), lay: getComputedStyle(document.getElementById('fxlc')).pointerEvents };
    si.classList.remove('bfight');
    return out;
  });
  ok('.jz-vig pointer-events:none', pe.vig === 'none', String(pe.vig));
  ok('.jz-slam pointer-events:none', pe.slam === 'none', String(pe.slam));
  ok('#fxlc pointer-events:none', pe.lay === 'none', String(pe.lay));

  console.log('§7 콘솔');
  ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const total = pass + fail;
  console.log(`\nVERIFY184 ${pass}/${total} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
