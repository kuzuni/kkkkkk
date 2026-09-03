#!/usr/bin/env node
/* 439 게이트 — `tools/probe351.js` D7 의 «고정 내비» 목록에 더한 **넷째 축**
 * («페이지가 소유한 주 행동 버튼»)이 ⓐ 실제로 서 있고 ⓑ 손으로 적은 표가 아니며
 * ⓒ 앞의 세 축을 하나도 밀어내지 않았음을 못박는다.
 *
 * 실행: node tools/verify439.js
 *
 * 판정의 뼈대는 **407 이 `#tuto` 를 넣을 때 쓴 것과 같은 대조**다(등재문이 지정한 판정):
 *   «수리 전 트리에서 420 자리가 D7 에 잡히고, 수리 후 0건».
 *   ⚠ 그래서 이 자는 **되돌림 사본**을 만들어 자를 두 번 돌린다(888 부터 «420 규칙 제거 +
 *      `#rwBasin` 80px 위로» — 아래 `NEG_RULE` 주석이 왜 수레를 바꿨는지 적는다). 사본은
 *      저장소 루트에 `.v439-neg.html` 로 쓰고 끝나면 지운다(.gitignore 등재) —
 *      `/tmp` 에 두면 `assets/**` 상대 경로가 404 라 레이아웃이 달라진다(360·367 선례).
 *   ⚠ 제품 `index.html` 은 **한 바이트도 안 건드린다** — 게이트가 중간에 죽어도 트리가
 *      깨끗하다(병렬 워커가 도는 저장소다).
 *
 * §E 가 이 자의 핵심이다 — 축이 «있다» 가 아니라 **«표가 아니다»** 를 묻는다. 402 가
 * 등재한 «표는 손으로 적는 목록이라 뒤처진다» 가 이 자리에서 다시 서는 길은 하나뿐이다:
 * 누군가 화면별 CTA id 를 판정 코드에 적는 것. 그러면 §E 가 빨개진다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROBE = path.join(ROOT, 'tools', 'probe351.js');
const INDEX = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.v439-neg-${process.pid}.html`);
/* 420 이 넣은 한 줄 — 이것을 빼면 33 재화 팝업이 89 유물 CTA 쪽으로 65px 내려온다 */
const RULE420 = '  #relw.on ~ #ciw{padding-bottom:calc(234px + max(0px, 1931px - var(--frameh, 2280px)))}';
/* ⚑ 888(2026-09-03) — [C] 의 되돌림 «수레» 를 바꿨다.
   원래는 «420 규칙 한 줄만 빼면 35px 겹친다» 였는데, 그 35 는 **버튼의 그때 자리에서 나온 파생값**이다.
   813 5회차(`47924ea`)가 `#rwBasin` 을 46px 내리고 866 1회차가 10px 되돌린 뒤로는
   규칙을 빼도 **−1px(안 겹친다)** 라 C2~C5 가 통째로 빨갰고, 그러면 이 절이 물으려던 것
   («축이 이 자리를 실제로 잡는가»)을 더는 **못 묻는다**(자가 무는 힘을 잃었다).
   ⇒ 사본을 «420 규칙 제거 + 버튼을 80px 위로» 로 바꾼다 — 420 이 서 있던 세계(f 566)보다
     조금 더 나쁜 자리를 **일부러** 만들어 축을 시험한다. 80 은 제품 파생값이 아니라 시험용 크기이고,
     세로 스택이 ±40px 어느 쪽으로 걸어도 겹침이 남아 C5(≥20px)가 성립한다.
     ⚠ 다시 «지금 스택에서 몇 px 겹치나» 를 이 절의 상수로 적지 마라 — 그것이 888 의 부패다.
   같은 처방을 `verify420` §2·§R 이 같이 받았다(그쪽은 §N 음성 시험이 짝이다). */
const NEG_RULE = '  /* [439 되돌림 대조] 420 규칙 제거 + 버튼 80px 위로(888) */\n  #rwBasin{position:relative;top:-80px}';

let ok = 0, bad = 0;
const T = (name, cond, extra) => {
  if (cond) { ok++; console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`); }
  else { bad++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
};

const run = (args, env) => {
  try {
    return { out: execFileSync('node', [PROBE, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...(env || {}) } }), code: 0 };
  } catch (e) {
    return { out: String((e.stdout || '') + (e.stderr || '')), code: e.status === undefined ? 1 : e.status };
  }
};
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } };
const d7of = (rows) => {
  const d = [];
  for (const r of rows || []) for (const x of r.regress || []) if (x.kind === 'D7') d.push(x);
  return d;
};

const J1 = path.join(ROOT, `.v439-now-${process.pid}.json`);
const J2 = path.join(ROOT, `.v439-neg-${process.pid}.json`);
const cleanup = () => { for (const p of [NEG, J1, J2]) { try { fs.unlinkSync(p); } catch (_) {} } };

try {
  const src = fs.readFileSync(PROBE, 'utf8');

  /* ── [A] 축이 소스에 있고, 앞의 세 축을 하나도 안 밀어냈다 ───────────────── */
  console.log('\n[A] 네 축이 나란히 서 있다');
  T('A1 탭바 축 유지', /navs\.push\(\{ name: 'tabbar'/.test(src));
  T('A2 HUD 판때기 축 유지(.pedge)', /navs\.push\(\{ name: 'hud'/.test(src));
  T('A3 미션 배너 축 유지(#tuto · 407)', /navs\.push\(\{ name: 'tuto'/.test(src));
  T('A4 CTA 축 신설(439)', /navs\.push\(\{ name: 'cta:' \+ pathOf/.test(src));
  T('A5 판정 key·문턱은 그대로(ov > 2 && ox > 40)', /if \(ov > 2 && ox > 40\)/.test(src));
  T('A6 424 이름표(navReach·axis)가 CTA 축에도 그대로 돈다', /const navReach = \{\};/.test(src) && /for \(const nav of navs\)/.test(src));

  /* ── [E] «표가 아니다» — 화면별 CTA 이름을 판정 코드에 적지 않았다 ────────── */
  console.log('\n[E] 402 규약 — 표를 적지 않았다(성질로 고른다)');
  const ctaBlock = (src.match(/⚑ 439 — 목록의 \*\*넷째 축[\s\S]*?for \(const k of Object\.keys\(best\)\) navs\.push[^\n]*\n/) || [''])[0];
  T('E0 CTA 블록을 찾았다', ctaBlock.length > 400, ctaBlock.length + '자');
  const code = ctaBlock.split('*/').slice(1).join('*/');            /* 주석을 뺀 «도는 코드» 만 */
  const idLits = (code.match(/['"]#[A-Za-z][\w-]*['"]/g) || []);
  T('E1 판정 코드에 화면별 id 리터럴 0개', idLits.length === 0, idLits.join(' ') || '0개');
  for (const name of ['rwBasin', 'rouBtn', 'pgo', 'mailBtn', 'psBuy', 'relw', 'shopw', 'dunw']) {
    T('E2 «' + name + '» 을 코드에 안 적었다', !code.includes(name));
  }
  T('E3 성질 네 개를 다 묻는다(pointer · .on · 유일 클릭 · 스크롤/크기)',
    /cursor.*!== 'pointer'/.test(code) && /classList\.contains\('on'\)/.test(code)
    && /ptr !== 1/.test(code) && /scrollable/.test(code) && /dd\.w < 160 \|\| dd\.h < 60/.test(code));

  /* ── [B] 지금 트리 — 그 자리는 0건이어야 한다(420 이 닫았다) ─────────────── */
  console.log('\n[B] 지금 트리(420 수리 후) — cur:relic');
  const now = run(['--only', 'cur:relic', '--json', J1]);
  const nowRows = readJson(J1);
  T('B0 자가 돌았다', now.code === 0 && !!nowRows, 'exit ' + now.code);
  const nowD7 = d7of(nowRows);
  T('B1 D7 1600 전용 결함 0건', nowD7.length === 0, nowD7.map((d) => d.k).join(',') || '0건');
  T('B2 그중 CTA 축 0건', nowD7.filter((d) => /^covers:cta:/.test(d.k || '')).length === 0);
  T('B3 이 화면의 CTA 를 실제로 골랐다(축이 «없어서 0» 이 아니다)',
    /cur:relic/.test(now.out), '스캔 로그 확인');

  /* ── [C] 되돌림 대조 — 420 규칙을 뺀 사본에서는 잡혀야 한다 ───────────────── */
  console.log('\n[C] 되돌림 대조 — 420 규칙을 빼고 버튼을 80px 올린 사본(.v439-neg.html · 888)');
  const html = fs.readFileSync(INDEX, 'utf8');
  T('C0 420 규칙 한 줄이 제품에 있다', html.includes(RULE420));
  fs.writeFileSync(NEG, html.replace(RULE420, NEG_RULE));
  const neg = run(['--only', 'cur:relic', '--json', J2], { P351_FILE: NEG });
  const negRows = readJson(J2);
  T('C1 사본으로 자가 돌았다', neg.code === 0 && !!negRows, 'exit ' + neg.code);
  const negD7 = d7of(negRows);
  const negCta = negD7.filter((d) => /^covers:cta:/.test(d.k || ''));
  T('C2 CTA 축이 그 자리를 낸다(≥1건)', negCta.length >= 1, negCta.map((d) => `${d.k} by${d.by}`).join(' · ') || '0건');
  T('C3 잡힌 자리가 89 유물 CTA(#rwBasin) 다', negCta.some((d) => String(d.k).includes('#rwBasin')),
    negCta.map((d) => d.k).join(' · '));
  T('C4 무는 상자는 33 재화 팝업(#ciw 안 다이얼로그) 이다', negCta.some((d) => /ciw|\.ci\b/.test(String(d.path))),
    negCta.map((d) => d.path).join(' · '));
  const by = negCta.map((d) => d.by).filter((v) => typeof v === 'number');
  T('C5 겹침이 «있어서» 잡혔다(≥20px — 사본이 만든 자리)', by.length > 0 && Math.max(...by) >= 20,
    by.length ? '최대 ' + Math.max(...by) + 'px' : '없음');
  /* ⚠ 대조가 «자를 넓혀서 아무거나 더 잡는 것» 이 아님을 못박는다 — 앞의 세 축은 사본에서도
     이 화면에서 조용해야 한다(그 셋으로는 원리적으로 못 보는 자리라는 것이 439 등재문이다). */
  T('C6 앞의 세 축은 사본에서도 이 자리를 못 본다(자 구멍의 증거)',
    negD7.filter((d) => /^covers:(tabbar|hud|tuto)$/.test(d.k || '')).length === 0,
    negD7.map((d) => d.k).join(' · ') || '없음');

  /* ── [D] 되돌림 시험 — 축·이름표가 «한 번도 안 켜지는» 것이 아니다 ─────────── */
  console.log('\n[D] 되돌림 시험(435 교훈 — 심어서 빨개지는지 본다)');
  const ct = run(['--only', 'cur:relic', '--ctatest']);
  T('D1 --ctatest PASS(심은 상자를 cta 축이 잡는다)', ct.code === 0 && /\[ctatest\] PASS/.test(ct.out),
    (ct.out.match(/\[ctatest\][^\n]*/g) || ['(출력 없음)'])[0]);
  const nt = run(['--only', 'tab:hero', '--navtest']);
  T('D2 --navtest PASS(424 이름표 회귀 — 넷째 축이 셋을 안 망가뜨렸다)',
    nt.code === 0 && /\[navtest\] PASS/.test(nt.out),
    (nt.out.match(/\[navtest\][^\n]*/g) || ['(출력 없음)'])[0]);
} finally {
  cleanup();
}

console.log(`\nVERIFY439 ${ok}/${ok + bad} ${bad ? 'FAIL' : 'PASS'}`);
process.exit(bad ? 1 : 0);
