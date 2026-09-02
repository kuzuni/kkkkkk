#!/usr/bin/env node
/* 작업 681 게이트 — 「공용 `.fx-spark` 봉투: **탄생 박자**와 **퇴장 계조**」
 * (666 4·5회차 비평 2인이 «단 하나» 로 남긴 곡선 · LESSONS 666-⑨ 가 등재로 넘긴 자리)
 *
 *   node tools/verify681.js
 *
 *   [A] 선언   — 곡선이 «작게 태어나 커지고», 어디서도 1 을 안 넘고, 끝 크기가 .5 아래로 안 내려간다
 *                (수명 380ms · 52% 경계 · 이동 계수 .78 은 **불변** — 남의 자들이 그 위에 서 있다)
 *   [B] 봉투   — 브라우저가 **실제로 그린** 상자·알파로 잰다(탄생 · 꼬리 · 잉크 · 퇴장 폭)
 *   [C] 불변   — 전용 봉투 `fxRlic`(753)·수명·발화는 한 값도 안 바뀌었다
 *   [R] 되돌림 — 옛 곡선을 얹으면 [B] 의 탄생·꼬리 항이 **빨개진다**(무르게 푼 수리가 아님 · 334·368 규약)
 *
 * ⚠ 자를 두 벌로 안 적는다 — 표본기·요약은 `tools/envelope681.js` 를 `probe681` 과 **같이** 쓴다.
 * ⚠ 문턱의 출처는 전부 실측이다(수리 전 ↔ 수리 후, `probe681`):
 *     출생 크기 100% ↔ 34% · α≤0.35 꼬리 96.9ms ↔ 27.9ms · 290ms 잉크 0.17 ↔ 0.53 · 340ms 0.03 ↔ 0.24.
 *   문턱은 그 사이에 놓되 프레임 흔들림에 안 뒤집히는 자리로 잡았다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { SAMPLE, summarize, gridSteps } = require('./envelope681');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const STEPS = Number(process.env.V681_STEPS || 20);
/* 비평가가 실제로 보는 여덟 장의 시각(`cap681` 의 STOPS). [B12] 는 **이 격자에서만** 뜻이 있다. */
const STOPS = [0, 20, 45, 70, 110, 175, 250, 320];

/* 수리 전 곡선(= 되돌림 시험의 재료). `probe681` 과 같은 문자열이다. */
const OLD = '@keyframes fxSpark{0%{transform:translate(0,0) scale(1);opacity:1}'
  + '52%{transform:translate(calc(var(--dx)*.78),calc(var(--dy)*.78)) scale(1);opacity:1}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.62);opacity:0}}';

/* ⚑ 6회차 — [R7] 전용 재료. **5회차 곡선**이다(수리 전 곡선이 아니다).
   [B12] 가 «무르게 푼 자» 가 아님을 보이려면 되돌릴 상대가 **바로 앞 회차**여야 한다 —
   수리 전 곡선은 0~52% 가 통째로 평평해서 어떤 격자에서도 빨개지므로 이 항을 못 가른다. */
const PREV5 = '@keyframes fxSpark{0%{transform:translate(0,0) scale(.26);opacity:.6;animation-timing-function:linear}'
  + '11%{transform:translate(calc(var(--dx)*.18),calc(var(--dy)*.18)) scale(.86);opacity:1;animation-timing-function:linear}'
  + '18%{transform:translate(calc(var(--dx)*.28),calc(var(--dy)*.28)) scale(1);opacity:1;animation-timing-function:linear}'
  + '33%{transform:translate(calc(var(--dx)*.48),calc(var(--dy)*.48)) scale(.92);opacity:.97;animation-timing-function:linear}'
  + '44%{transform:translate(calc(var(--dx)*.61),calc(var(--dy)*.61)) scale(.87);opacity:.93;animation-timing-function:linear}'
  + '56%{transform:translate(calc(var(--dx)*.73),calc(var(--dy)*.73)) scale(.81);opacity:.88;animation-timing-function:linear}'
  + '70%{transform:translate(calc(var(--dx)*.85),calc(var(--dy)*.85)) scale(.73);opacity:.73;animation-timing-function:linear}'
  + '86%{transform:translate(calc(var(--dx)*.945),calc(var(--dy)*.945)) scale(.62);opacity:.38;animation-timing-function:linear}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.5);opacity:0}}';

/* 격자 판정 한 벌 — [B12] 와 [R7] 이 **같은 자**를 쓴다(402 «두 벌 금지»). */
function gridVerdict(g) {
  const post = g.steps.filter(x => x.from >= STOPS[g.peak]);
  const rise = g.steps.find(x => x.to === STOPS[g.peak]);
  return {
    peakT: STOPS[g.peak],
    rise: rise ? rise.d : 0,
    first: post.length ? post[0].d : 0,
    worst: post.length ? Math.max(...post.map(x => x.d)) : 0,   /* 가장 얕은 하강(= 0 에 가까운 쪽) */
    line: g.steps.map(x => x.from + '→' + x.to + ' ' + (x.d >= 0 ? '+' : '') + (x.d * 100).toFixed(1) + '%').join(' · '),
  };
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const blk = (t) => console.log('\n[' + t);
const p2 = n => Math.round(n * 100) / 100;

async function burstAndSample(page) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = h.querySelector('.cb') || h; const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const env = await page.evaluate(SAMPLE, STEPS);
  return env ? summarize(env) : null;
}

/* ⚑ 6회차 — **캡처 격자에서 한 번 더** 태워 잰다([B12]·[R7]).
   같은 버스트를 재활용할 수 없다 — `SAMPLE` 은 끝에 노드를 걷어 내기 때문이다(페이지를 망가뜨린
   채 끝내지 않는다는 그 자의 규약). 그래서 «태우고 → 격자에서 재고» 를 한 벌 더 돈다. */
async function burstAndGrid(page) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = h.querySelector('.cb') || h; const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const env = await page.evaluate(SAMPLE, STOPS);
  return env ? gridVerdict(gridSteps(env)) : null;
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  blk('A] 선언 — 곡선이 탄생 박자를 갖고, 남이 서 있는 값은 안 건드렸다');
  /* ⚠ 블록의 끝은 `}}` 다 — `}\n` 로 끊으면 **첫 키프레임 하나**만 잡힌다(1회차에 그래서 [A] 다섯이
     제품이 멀쩡한데 빨갰다). 여기서 잡는 것은 «키프레임들» 이므로 마지막 `}` 까지 통째로 받는다. */
  const mk = code.match(/@keyframes fxSpark\{([\s\S]*?\})\}/);
  const body = mk ? mk[1].replace(/\s+/g, ' ') : '';
  ok(!!mk, 'A0 공용 곡선 `@keyframes fxSpark` 가 있다');
  /* 키프레임을 «퍼센트 → scale·opacity» 표로 읽는다 — 값을 자에 다시 적지 않기 위해서다 */
  /* ⚠ 마디 끝을 `}` 로 못박지 않는다 — 3회차부터 `;animation-timing-function:linear}` 가 뒤에 붙는다
     (그렇게 적었더니 [A] 세 항이 «제품이 멀쩡한데» 빨갰다. 1회차의 `}\n` 함정과 같은 계열이다). */
  const KF = [...body.matchAll(/(\d+)%\{transform:[^}]*?scale\(([\d.]+)\);opacity:([\d.]+)/g)]
    .map(m => ({ p: +m[1], s: parseFloat(m[2]), a: parseFloat(m[3]) }));
  const kf0 = KF.find(k => k.p === 0);
  ok(!!kf0 && kf0.s < 0.6, 'A1 ★ **작게 태어난다** — 0% 의 scale 이 0.6 미만(수리 전 1)',
     kf0 ? 'scale(' + kf0.s + ')' : '0% 를 못 읽음');
  const kfFull = KF.find(k => k.p > 0 && k.s >= 1);
  /* ⚠ 3회차에 11% → 18% 로 폈다 — 2회차 램프는 «s<70% 가 15.8ms = 60fps 한 프레임» 이라
     정지컷에서만 읽혔다(비평 CI ①). 상한 20% 는 «한 박자» 의 경계다(76ms). */
  ok(!!kfFull && kfFull.p <= 20,
     'A2 ★ **제 크기까지 한 박자** — 최대 크기에 닿는 키프레임이 20% 이내다(수명의 ≤76ms)',
     kfFull ? kfFull.p + '%' : '최대에 닿는 키프레임이 없다');
  ok(KF.length > 0 && KF.every(k => k.s <= 1),
     'A3 ★ 어느 지점도 scale 1 을 **안 넘는다** — 619 13·14회차의 가둠(`sz/2 + FXB_INPAD`)이 그 전제 위에 있다',
     '최대 scale ' + Math.max(...KF.map(k => k.s)));
  /* ⚑ 3회차 이관 — 1·2회차의 A4 는 «52% 가 **글자 그대로** .78d/scale 1/α1» 이었다. 그 항이 지키던
     것은 계수가 아니라 **42회차의 «퇴장 ≥180ms»**(= 알파가 늦어도 수명의 52% 에는 내려가기 시작한다)
     이고, 3회차가 마디 경계의 속도 튐을 없애며 계수를 다시 배분하자 «지키는 뜻은 그대로인데 글자만
     틀린» 항이 됐다. ⇒ 뜻으로 고쳐 적는다(333) — 알파 고원의 끝 시점 + 이동 계수의 단조성. */
  const kfFade = KF.find(k => k.a < 1);
  const coefs = [...body.matchAll(/(\d+)%\{transform:translate\((?:calc\(var\(--dx\)\*([\d.]+)\)|0)/g)]
    .map(m => ({ p: +m[1], c: m[2] ? parseFloat(m[2]) : 0 }));
  const mono = coefs.every((c, i) => i === 0 || c.c > coefs[i - 1].c);
  ok(!!kfFade && kfFade.p <= 52 && mono && /100%\{transform:translate\(var\(--dx\),var\(--dy\)\)/.test(body),
     'A4 ★ **퇴장이 늦어도 52% 에는 시작한다**(42회차 «퇴장 ≥180ms») · 이동 계수는 **단조 증가**하고 100% 에서 정확히 d 다',
     (kfFade ? '알파 고원 끝 ' + kfFade.p + '%' : '알파가 안 내려간다') + ' · 계수 ' + coefs.map(c => c.c).join('→'));
  const kf100 = KF.find(k => k.p === 100);
  ok(!!kf100 && kf100.s >= 0.5 && kf100.a === 0,
     'A5 ★ 끝 크기가 .5 아래로 **안 내려간다** — 16회차 «.38 은 중간 프레임이 12px 로 읽힌다»(구슬 26px 이 같이 탄다)',
     kf100 ? 'scale(' + kf100.s + ')/α' + kf100.a : '100% 가 없다');
  ok(/animation:fxSpark \.38s ease-out forwards/.test(code) && /FXSPARK_MS = 380/.test(code),
     'A6 수명 선언(.38s)·`FXSPARK_MS`(380) **불변** — `verify660` [E2]·`verify666` [G] 가 이 값을 읽는다');
  /* ⚑ 3회차 신설 [A8] — **마디마다 `linear`.** 요소 규칙의 `ease-out` 이 «마디마다» 걸리면
     경계에서 속도가 0 으로 죽었다가 다시 서서 «앞머리가 가장 느린 버스트» 가 된다(2회차 비평 CI 가
     구간속도 0.430 → 0.284 → 0.634%/ms 로 역산). 감속은 계수 자신이 진다. */
  const lin = (body.match(/animation-timing-function:linear/g) || []).length;
  ok(lin >= KF.length - 1,
     'A8 ★ **마디마다 `linear`** — 감속은 계수가 지고 마디 경계에서 속도가 안 튄다(3회차 본체)',
     lin + '/' + (KF.length - 1) + ' 마디');
  ok(/@keyframes fxRlic\{0%\{transform:translate\(0,0\) scale\(1\);opacity:\.55\}/.test(code)
     && /\.fx-spark\.fx-rlic\{[\s\S]{0,400}?animation-name:fxRlic/.test(code),
     'A7 전용 봉투 `fxRlic`(753 유물 획득 알)은 **한 값도 안 바뀌었다** — 이 곡선을 안 탄다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    openTrain();
  });
  await page.waitForTimeout(400);

  const now = await burstAndSample(page);
  const grid = await burstAndGrid(page);

  /* ── [B] 봉투 — 그려진 것으로 잰다 ────────────────────────────────── */
  blk('B] 봉투 — 브라우저가 실제로 그린 상자·알파');
  ok(!!now && now.n >= 8, 'B0 전제 — 공용 봉투를 타는 알이 실제로 태어난다(≥8알)',
     now ? now.n + '알 · 수명 ' + now.dur + 'ms' : '0알');
  if (now) {
    console.log('       · 표본: ' + now.line);
    ok(now.s0 <= 0.45 && now.bornFull === 0,
       'B1 ★ ⓐ **탄생 박자** — 출생 크기가 제 최대의 45% 이하이고, 첫 프레임에 이미 최대인 알이 0 이다(수리 전 100% · 14/14)',
       '출생 ' + p2(now.s0 * 100) + '% · 최대인 알 ' + now.bornFull + '/' + now.n);
    ok(now.peakT > 0 && now.peakT <= 80,
       'B2 ★ 그 박자가 **한 박자**로 끝난다 — 최대 크기 도달 ≤80ms(늦으면 «느리게 부푼다» 가 된다)',
       Math.round(now.peakT) + 'ms');
    /* ⚑⚑ 2회차 — **자를 «시간» 에서 «큰 채로 흐린 시간» 으로 옮겼다.** 1회차 자(«α≤0.35 구간 ≤45ms»)는
       비평 2인이 같이 짚은 «퇴장이 컷으로 읽힌다» 와 **정면으로 부딪힌다** — 그 구간을 짧게 하는 유일한
       길이 «마지막에 몰아서 끄기» 이기 때문이다. 등재문이 말한 결함은 «흐리다» 가 아니라 **«흐린데 아직
       크다»**(660 이 아이콘을 26 → 44~47px 로 키운 뒤의 얼룩)이므로 그 둘을 한 조건으로 묶어 잰다. */
    ok(now.smudge <= 25,
       'B3 ★ ⓑ **«큰 채로 흐린» 구간이 없다** — α≤0.35 이면서 크기 ≥60% 인 시간 ≤25ms(수리 전 96.9ms 전부가 그 구간이었다)',
       p2(now.smudge) + 'ms · α≤0.35 총 ' + p2(now.tail35) + 'ms · 그 구간 최대 크기 ' + p2(now.faintMaxS * 100) + '%');
    /* ⚠ 판별 축은 **290ms** 다 — 240ms 는 수리 전에도 0.49 라 문턱을 세워도 두 세계를 못 가른다
       (4회차에 그 항을 세웠다가 실측 0.55 로 문턱에 붙어 «흔들리는 자» 가 될 뻔했다 · 574 선례). */
    /* ⚠ 5회차 — 문턱을 0.28 → **0.25** 로 내렸다. 5회차 곡선의 실측이 0.29 라 0.28 은 «문턱에 붙은 자»
       가 되고(574 가 등재한 플레이키 게이트의 얼굴이다), 두 세계를 가르는 것은 수리 전 0.17 이므로
       0.25 는 그 사이에 넉넉히 선다. 자를 헐겁게 한 것이 아니라 **흔들리지 않는 자리로 옮긴 것**이다. */
    ok(now.ink(290) >= 0.25,
       'B4 ★ 캡처 격자의 늦은 프레임이 **정보량을 지닌다** — 290ms 잉크 ≥0.25(수리 전 0.17)',
       '240ms ' + p2(now.ink(240)) + ' · 290ms ' + p2(now.ink(290)) + ' · 340ms ' + p2(now.ink(340)));
    /* ⚑ 짝 항 — 꼬리를 줄인다고 «하드컷» 이 되면 42회차(«퇴장 50~90ms 는 동시 전멸로 읽힌다»)로 되돌아간다.
       퇴장 폭 = 알파가 처음 1 아래로 내려간 시각 → 수명 끝. 52% 경계가 지켜지면 182ms 다. */
    ok(now.dur - now.fadeStart >= 180,
       'B5 ★ 그런데 **퇴장은 여전히 계조다** — 알파가 내려가기 시작해 사라지기까지 ≥180ms(42회차 규약)',
       p2(now.dur - now.fadeStart) + 'ms · 페이드 시작 ' + Math.round(now.fadeStart) + 'ms');
    /* 중간 프레임이 실제로 «있는가» — 95ms 격자에서 완전 불투명도 완전 투명도 아닌 표본이 둘 이상 */
    const mid = now.rel.filter(r => r.op > 0.02 && r.op < 0.98).length;
    ok(mid >= 4, 'B6 ★ 퇴장에 **중간 알파 프레임**이 실재한다(≥4표본 — 하드컷이면 0~1이다)',
       mid + '/' + now.rel.length + ' 표본');
    /* ⚑ 2회차 신설 [B7] — **끝에서 급정거하지 않는다.** 비평 2인이 1회차 곡선을 같은 자로 쟀다
       (CF «마지막 40ms 기울기가 직전 60ms 의 2.6배» · CG «2.7배»). 그 축을 그대로 자로 세운다:
       실측 — 1회차 2.8 · 수리 전 0.38 · 2회차 0.77. 문턱 1.5 는 그 사이이고, «컷» 쪽만 잡는다. */
    /* ⚑ 3회차 신설 [B9] — **재가속 0**. 2회차 비평 CI 의 «41.8ms 에 속도 0 → 45~90ms 가 전체
       최고속(직전의 2.2배)» 을 자로 세운 것이다. 실측 — 3회차 1.00 · 수리 전 1.42 · 2회차 곡선 2.2.
       문턱 1.20 은 그 사이이고 표본 격자(19ms) 흔들림에 안 뒤집힌다. */
    /* ⚑ 4회차 신설 [B10] — **가운데가 계속 변한다.** 3회차 비평 2인이 «90~210ms(수명 32%)가
       지각적으로 정지» 를 같이 짚었다(CJ «90·150ms 두 장이 이 축에서 구분 불가» · CK «60fps 환산
       0.17px/frame = 가시 문턱 아래 · 8장 중 3장이 같은 그림»). 그 구간의 **크기·알파 변화량**을 잰다.
       ⚠ 알파만 물으면 못 가른다 — 수리 전에도 그 구간의 α 는 1.00 → 0.90 이었다(크기가 4% 로 굳어
       있었을 뿐이다). 그래서 **둘 다** 요구한다(수리 전 크기 4% · 3회차 5.4% · 4회차 12%). */
    const dS = now.at(90).s - now.at(210).s, dA = now.at(90).op - now.at(210).op;
    ok(dS >= 0.08 && dA >= 0.08,
       'B10 ★ **가운데가 정지하지 않는다** — 90 → 210ms 에 크기·알파가 각각 ≥8% 내려간다(수리 전 크기 4%)',
       '크기 −' + p2(dS * 100) + '% · α −' + p2(dA * 100) + '%');
    ok(now.s0 <= 0.45 && now.at(0).op <= 0.7,
       'B11 ★ **탄생에 알파 온셋이 있다** — 첫 프레임이 «작고 옅다»(출생 α ≤0.7 · 수리 전 1.00)',
       '출생 α ' + p2(now.at(0).op) + ' · 크기 ' + p2(now.s0 * 100) + '%');
    ok(now.reaccel <= 1.20,
       'B9 ★ **이동이 단조 감속한다** — 구간속도의 직전 대비 최대 증가 ≤1.20배(수리 전 1.42 · 2회차 곡선 2.2)',
       p2(now.reaccel) + '배 · 가장 긴 «아무것도 안 변하는» 구간 ' + p2(now.still) + 'ms');
    const aAt = (T) => now.at(T).op;
    const sLast = aAt(now.dur - 40) / 40, sPrev = Math.max(1e-9, (aAt(now.dur - 100) - aAt(now.dur - 40)) / 60);
    ok(sLast / sPrev <= 1.5,
       'B7 ★ **끝에서 급정거하지 않는다** — 마지막 40ms 기울기가 직전 60ms 의 1.5배 이하(1회차 2.8배 = «컷»)',
       p2(sLast / sPrev) + '배 · α(280ms) ' + p2(aAt(now.dur - 100)) + ' → α(340ms) ' + p2(aAt(now.dur - 40)));
  }
  /* ⚑⚑ 6회차 신설 [B12] — **캡처 격자의 이웃이 전부 구분된다.** 5회차 비평 2인이 같이 짚은 것을
     그대로 자로 세운다(CN «70→110ms −4.0% 로 지각 임계 아래 · train-4/5 가 같은 그림» ·
     CO «B 는 70·110 이 0.0% · A 는 105ms 가 한 장»). 문턱의 출처는 그 두 사람이 쓴 **지각 임계 7~8%**
     이고, 봉우리 직후만 «−10% 이상» 으로 더 세운 것은 5회차 §5-1 ⓐ 가 적어 둔 처방 기준이다.
     ⚠ 이 항은 **캡처 격자에서만** 뜻이 있다 — 균등 격자로 보간하면 봉우리가 두 표본 사이로 뭉개져
       같은 곡선이 −10.1% 대신 −6.9% 로 읽힌다(6회차에 실제로 그렇게 나왔다).
     ⚠ 짝 항 [R7] 이 이 자가 무르지 않다는 것을 못박는다 — 되돌릴 상대는 **5회차 곡선**이다. */
  if (grid) {
    console.log('       · 격자 델타: ' + grid.line);
    ok(grid.rise >= 0.12 && grid.first <= -0.10 && grid.worst <= -0.08,
       'B12 ★ **봉우리가 표본 한 장이다** — 오르는 마지막 쌍 ≥+12% · 봉우리 직후 ≤−10% · 봉우리 뒤 모든 쌍 ≤−8%',
       '봉우리 ' + grid.peakT + 'ms · 진입 +' + p2(grid.rise * 100) + '% · 직후 ' + p2(grid.first * 100)
       + '% · 가장 얕은 하강 ' + p2(grid.worst * 100) + '%');
  } else ok(false, 'B12 ★ 캡처 격자 표본을 못 얻었다');
  ok(errs.length === 0, 'B8 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  /* ── [C] 불변 — 남의 것을 안 건드렸다 ─────────────────────────────── */
  blk('C] 불변 — 전용 봉투·수명·발화');
  const inv = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const el = document.createElement('s'); el.className = 'fx-spark';
    (document.getElementById('fxl') || document.body).appendChild(el);
    const a = getComputedStyle(el).animationName, d = getComputedStyle(el).animationDuration;
    el.className = 'fx-spark fx-rlic';
    const a2 = getComputedStyle(el).animationName;
    el.remove();
    return { a, d, a2, ms: (typeof FXSPARK_MS !== 'undefined' ? FXSPARK_MS : null) };
  });
  ok(inv.a === 'fxSpark' && inv.d === '0.38s',
     'C1 `.fx-spark` 가 그대로 `fxSpark` 0.38s 를 탄다', inv.a + ' · ' + inv.d);
  ok(inv.a2 === 'fxRlic', 'C2 `.fx-rlic` 는 그대로 전용 봉투를 탄다(753 — 이 작업이 안 건드린다)', String(inv.a2));
  ok(inv.ms === 380, 'C3 `FXSPARK_MS` 380 불변', String(inv.ms));

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  blk('R] 되돌림 — 옛 곡선을 얹으면 [B1]·[B3]·[B4] 가 빨개진다');
  await page.addStyleTag({ content: OLD });
  await page.waitForTimeout(60);
  const old = await burstAndSample(page);
  ok(!!old, 'R0 대조군 성립 — 옛 곡선 사본에서도 알이 태어난다', old ? old.n + '알' : 'n/a');
  if (old) {
    ok(old.s0 >= 0.99 && old.bornFull === old.n,
       'R1 되돌리면 **탄생 박자가 사라진다** — [B1] 이 빨개지는 자리',
       '출생 ' + p2(old.s0 * 100) + '% · 최대인 알 ' + old.bornFull + '/' + old.n);
    ok(old.smudge >= 60,
       'R2 되돌리면 **«큰 채로 흐린» 구간이 돌아온다** — [B3] 이 빨개지는 자리',
       p2(old.smudge) + 'ms · α≤0.35 총 ' + p2(old.tail35) + 'ms · 그 구간 최대 크기 ' + p2(old.faintMaxS * 100) + '%');
    ok(old.ink(290) < 0.30,
       'R3 되돌리면 늦은 프레임의 **정보량이 다시 0** 이다 — [B4] 가 빨개지는 자리',
       '240ms ' + p2(old.ink(240)) + ' · 290ms ' + p2(old.ink(290)) + ' · 340ms ' + p2(old.ink(340)));
    /* ⚠ 짝 항 — 되돌림이 [B5]·[B6](퇴장 계조)까지 죽이지는 **않는다**. 그 둘은 수리 전에도 참이었고
       (52% 경계는 42회차 것이다) 이 작업이 «지켜야 할 것» 이지 «고친 것» 이 아니다. */
    ok(old.dur - old.fadeStart >= 180,
       'R4 그러나 퇴장 폭(≥180ms)은 되돌려도 참이다 — [B5] 는 «고친 것» 이 아니라 «안 깬 것»',
       p2(old.dur - old.fadeStart) + 'ms');
    ok(old.reaccel > 1.20,
       'R5 되돌리면 **이동이 다시 재가속한다** — [B9] 가 빨개지는 자리(마디마다 걸린 ease-out)',
       p2(old.reaccel) + '배');
    ok((old.at(90).s - old.at(210).s) < 0.08 && old.at(0).op >= 0.99,
       'R6 되돌리면 **가운데가 다시 굳고 출생 알파 온셋이 사라진다** — [B10]·[B11] 이 빨개지는 자리',
       '90→210ms 크기 −' + p2((old.at(90).s - old.at(210).s) * 100) + '% · 출생 α ' + p2(old.at(0).op));
  }

  /* ⚑ 6회차 신설 [R7] — **5회차 곡선**을 얹으면 [B12] 가 빨개진다.
     여기만 되돌릴 상대가 «수리 전» 이 아니라 «바로 앞 회차» 다 — 5회차 곡선은 [B1]~[B11] 을 전부
     통과하고 오직 이 항에서만 무너진다. 그것이 6회차가 «새로 닫은 것» 의 정확한 크기다. */
  await page.addStyleTag({ content: PREV5 });
  await page.waitForTimeout(60);
  const p5 = await burstAndGrid(page);
  ok(!!p5, 'R7-0 대조군 성립 — 5회차 곡선 사본에서도 알이 태어난다');
  if (p5) {
    console.log('       · 5회차 격자 델타: ' + p5.line);
    ok(p5.first > -0.10,
       'R7 되돌리면 **봉우리가 다시 고원이 된다** — [B12] 가 빨개지는 자리(5회차 비평 2인 공통 지적)',
       '봉우리 ' + p5.peakT + 'ms · 직후 ' + p2(p5.first * 100) + '%(6회차 ' + (grid ? p2(grid.first * 100) : '—') + '%)');
  }

  await browser.close();
  console.log('\nVERIFY681 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
