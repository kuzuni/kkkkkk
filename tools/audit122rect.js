/* 작업 122 · 23회차 — §27-11 3번 «`getBoundingClientRect` 를 쓰는 나머지 게이트를 훑는다».
   136 이 예고했고 122 §17 이 그중 하나였다(21회차의 «흔들리는 자» 는 실은 **등장 애니메이션
   한복판에서 잡은 clip** 이었다 — §27-1). **나머지가 몇 개인지 아직 아무도 안 세지 않았다.**
   이 도구가 세어 준다.

   ⚠ 이것은 **정적 훑기**다. «이 게이트가 틀렸다» 를 단정하지 않는다 — «위험한 지문이 있다» 를
      셀 뿐이다. 판정은 그 게이트를 실제로 돌려서 한다(그래서 출력이 «후보 목록» 이다).

   지문(§27-1):
     ⓐ 위험 = `getBoundingClientRect()` 를 부르는데, 같은 파일에 **정착 장치가 하나도 없다**.
        정착 장치 = `getAnimations()` 로 finish/cancel/pause 하기 · `.finished` 대기 ·
        `requestAnimationFrame` 두 번 대기 · `settle(` 헬퍼(47 선례).
     ⓑ 특히 위험 = 위 ⓐ 이면서, rect 를 재기 전에 **여는 동작**(`open*()` · `render*()` · `click(`)이 있고
        그 뒤 대기가 **고정 `waitForTimeout` 뿐**이다. 60 의 `jzPgIn`(.12s)은 느린 러너에서
        300~520ms 뒤에 끝나므로 고정 대기는 «끝났을 수도, 안 끝났을 수도» 다(122 §1-3 이 45 에서 겪었다).

   실행: node tools/audit122rect.js  [--all]     (--all 은 안전 판정 파일까지 전부 찍는다) */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname);
const ALL = process.argv.includes('--all');

const SETTLE = [
  /getAnimations\s*\(/,          /* 애니메이션을 직접 걷어내는 계열(seek/freeze) */
  /\.finished/,                  /* 애니메이션 finished 대기 (122 §1-3 이 45 에 넣은 처방) */
  /requestAnimationFrame[\s\S]{0,120}requestAnimationFrame/,  /* 페인트 두 번 대기 */
  /\bsettle\s*\(/,               /* 47 의 페이지 컨텍스트 헬퍼 */
  /waitForFunction/,             /* 상태 대기 */
  /require\(['"]\.\/pwlaunch['"]\)/,  /* 291 — 공용 부트스트랩이 `settle291` 을 심어 준다(아래 주석) */
];
/* 291 (2026-08-28) — 정착 장치가 «파일 안» 에만 있으란 법은 없다.
   `tools/pwlaunch.js` 의 `launch()` 가 브라우저에 `settle291` 을 심으면서,
   entry 가 `verify*.js` 인 게이트의 `waitForTimeout(≥250ms)` 뒤에 입장 연출 정착이
   자동으로 붙는다 — 그래서 «pwlaunch 를 지나간다» 도 정착 장치로 센다.
   ⚠ 이 지문은 «켜져 있다» 가 아니라 «장치가 닿는다» 를 뜻한다. 실제로 껐는지
   (`PW_SETTLE=0`)는 정적 훑기가 알 수 없다 — 판정은 `node tools/repro291.js` 로 한다. */
const OPENER = /\b(open[A-Z]\w*\s*\(|render[A-Z]\w*\s*\(|\.click\s*\(|setShopCatTabs\s*\()/;

const rows = [];
for (const f of fs.readdirSync(DIR).filter(x => /^verify.*\.js$/.test(x)).sort()) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const rects = (src.match(/getBoundingClientRect\s*\(/g) || []).length;
  if (!rects) continue;
  const settles = SETTLE.filter(re => re.test(src));
  const opener = OPENER.test(src);
  const waits = (src.match(/waitForTimeout\s*\(\s*(\d+)/g) || [])
    .map(s => parseInt(s.replace(/\D/g, ''), 10));
  const maxWait = waits.length ? Math.max(...waits) : 0;
  rows.push({ f, rects, settle: settles.length, opener, maxWait });
}

const risky = rows.filter(r => r.settle === 0);
const worst = risky.filter(r => r.opener);

console.log('작업 122 · 23회차 — `getBoundingClientRect` 게이트 정적 훑기 (§27-11 3번)');
console.log('');
console.log('  rect 를 쓰는 게이트          : ' + rows.length + '개 (총 호출 '
  + rows.reduce((a, b) => a + b.rects, 0) + '회)');
console.log('  정착 장치가 하나도 없는 것 ⓐ : ' + risky.length + '개');
console.log('  그중 여는 동작이 있는 것   ⓑ : ' + worst.length + '개  ← 27-1 과 같은 함정 후보');
console.log('');
const show = ALL ? rows : worst;
console.log((ALL ? '전체' : 'ⓑ 후보') + ' (rect 호출 수 내림차순 · 최대 고정 대기 표시)');
for (const r of show.sort((a, b) => b.rects - a.rects)) {
  console.log('  ' + (r.settle === 0 ? (r.opener ? '⚠ⓑ' : '· ⓐ') : '  ✓')
    + ' ' + r.f.padEnd(22) + ' rect ' + String(r.rects).padStart(3)
    + ' · 정착장치 ' + r.settle
    + ' · 최대 고정대기 ' + (r.maxWait ? r.maxWait + 'ms' : '없음'));
}
console.log('');
console.log('※ 정적 훑기다. 후보 = «지문이 있다» 이지 «틀렸다» 가 아니다 — 판정은 실행으로 한다.');
