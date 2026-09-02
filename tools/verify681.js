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
const { SAMPLE, summarize } = require('./envelope681');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const STEPS = Number(process.env.V681_STEPS || 20);

/* 수리 전 곡선(= 되돌림 시험의 재료). `probe681` 과 같은 문자열이다. */
const OLD = '@keyframes fxSpark{0%{transform:translate(0,0) scale(1);opacity:1}'
  + '52%{transform:translate(calc(var(--dx)*.78),calc(var(--dy)*.78)) scale(1);opacity:1}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.62);opacity:0}}';

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
  const KF = [...body.matchAll(/(\d+)%\{transform:[^}]*?scale\(([\d.]+)\);opacity:([\d.]+)\}/g)]
    .map(m => ({ p: +m[1], s: parseFloat(m[2]), a: parseFloat(m[3]) }));
  const kf0 = KF.find(k => k.p === 0);
  ok(!!kf0 && kf0.s < 0.6, 'A1 ★ **작게 태어난다** — 0% 의 scale 이 0.6 미만(수리 전 1)',
     kf0 ? 'scale(' + kf0.s + ')' : '0% 를 못 읽음');
  const kfFull = KF.find(k => k.p > 0 && k.s >= 1);
  ok(!!kfFull && kfFull.p <= 15,
     'A2 ★ **제 크기까지 한 박자** — 최대 크기에 닿는 키프레임이 15% 이내다(수명의 ≤57ms)',
     kfFull ? kfFull.p + '%' : '최대에 닿는 키프레임이 없다');
  ok(KF.length > 0 && KF.every(k => k.s <= 1),
     'A3 ★ 어느 지점도 scale 1 을 **안 넘는다** — 619 13·14회차의 가둠(`sz/2 + FXB_INPAD`)이 그 전제 위에 있다',
     '최대 scale ' + Math.max(...KF.map(k => k.s)));
  const kf52 = KF.find(k => k.p === 52);
  ok(!!kf52 && kf52.s === 1 && kf52.a === 1 && /52%\{transform:translate\(calc\(var\(--dx\)\*\.78\),calc\(var\(--dy\)\*\.78\)\) scale\(1\);opacity:1\}/.test(body),
     'A4 ★ 52% 고원 경계·이동 계수(.78d)가 **불변** — 42회차가 «퇴장 ≥180ms» 를 그 위에서 계산했다',
     kf52 ? '52% s' + kf52.s + '/α' + kf52.a : '52% 가 없다');
  const kf100 = KF.find(k => k.p === 100);
  ok(!!kf100 && kf100.s >= 0.5 && kf100.a === 0,
     'A5 ★ 끝 크기가 .5 아래로 **안 내려간다** — 16회차 «.38 은 중간 프레임이 12px 로 읽힌다»(구슬 26px 이 같이 탄다)',
     kf100 ? 'scale(' + kf100.s + ')/α' + kf100.a : '100% 가 없다');
  ok(/animation:fxSpark \.38s ease-out forwards/.test(code) && /FXSPARK_MS = 380/.test(code),
     'A6 수명 선언(.38s)·`FXSPARK_MS`(380) **불변** — `verify660` [E2]·`verify666` [G] 가 이 값을 읽는다');
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
    ok(now.tail35 <= 45,
       'B3 ★ ⓑ **꼬리가 빈 껍데기가 아니다** — α≤0.35 구간이 45ms 이하(수리 전 96.9ms · 수명의 25.5%)',
       p2(now.tail35) + 'ms (수명의 ' + p2(now.tail35 / now.dur * 100) + '%)');
    ok(now.ink(290) >= 0.35 && now.ink(340) >= 0.12,
       'B4 ★ 캡처 격자의 늦은 프레임이 **정보량을 지닌다** — 290ms 잉크 ≥0.35 · 340ms ≥0.12(수리 전 0.17 · 0.03)',
       '290ms ' + p2(now.ink(290)) + ' · 340ms ' + p2(now.ink(340)));
    /* ⚑ 짝 항 — 꼬리를 줄인다고 «하드컷» 이 되면 42회차(«퇴장 50~90ms 는 동시 전멸로 읽힌다»)로 되돌아간다.
       퇴장 폭 = 알파가 처음 1 아래로 내려간 시각 → 수명 끝. 52% 경계가 지켜지면 182ms 다. */
    ok(now.dur - now.fadeStart >= 180,
       'B5 ★ 그런데 **퇴장은 여전히 계조다** — 알파가 내려가기 시작해 사라지기까지 ≥180ms(42회차 규약)',
       p2(now.dur - now.fadeStart) + 'ms · 페이드 시작 ' + Math.round(now.fadeStart) + 'ms');
    /* 중간 프레임이 실제로 «있는가» — 95ms 격자에서 완전 불투명도 완전 투명도 아닌 표본이 둘 이상 */
    const mid = now.rel.filter(r => r.op > 0.02 && r.op < 0.98).length;
    ok(mid >= 4, 'B6 ★ 퇴장에 **중간 알파 프레임**이 실재한다(≥4표본 — 하드컷이면 0~1이다)',
       mid + '/' + now.rel.length + ' 표본');
  }
  ok(errs.length === 0, 'B7 콘솔 에러 0', errs.slice(0, 2).join(' | '));

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
    ok(old.tail35 >= 80,
       'R2 되돌리면 **꼬리가 다시 빈 껍데기다** — [B3] 이 빨개지는 자리',
       'α≤0.35 ' + p2(old.tail35) + 'ms');
    ok(old.ink(290) < 0.35 && old.ink(340) < 0.12,
       'R3 되돌리면 늦은 프레임의 **정보량이 다시 0** 이다 — [B4] 가 빨개지는 자리',
       '290ms ' + p2(old.ink(290)) + ' · 340ms ' + p2(old.ink(340)));
    /* ⚠ 짝 항 — 되돌림이 [B5]·[B6](퇴장 계조)까지 죽이지는 **않는다**. 그 둘은 수리 전에도 참이었고
       (52% 경계는 42회차 것이다) 이 작업이 «지켜야 할 것» 이지 «고친 것» 이 아니다. */
    ok(old.dur - old.fadeStart >= 180,
       'R4 그러나 퇴장 폭(≥180ms)은 되돌려도 참이다 — [B5] 는 «고친 것» 이 아니라 «안 깬 것»',
       p2(old.dur - old.fadeStart) + 'ms');
  }

  await browser.close();
  console.log('\nVERIFY681 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
