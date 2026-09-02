#!/usr/bin/env node
/* 작업 681 재현기 — 「공용 `.fx-spark` 버스트 곡선에 «탄생 박자» 가 없고 페이드 꼬리가 빈 껍데기다」
 *
 *   node tools/probe681.js
 *
 * 등재문(666 4·5회차 비평 2인 공통)이 말한 둘을 **찍힌 값**으로 각각 잰다(338 규칙 — 처방 전에 재현):
 *   ⓐ 탄생 박자 0 — 0% 가 `scale(1)` 이라 알이 **첫 프레임에 이미 최대 크기**다.
 *   ⓑ 꼬리가 빈 껍데기 — 알파가 일찍 내려가 수명의 끝 4분의 1이 «흐린 얼룩» 이다.
 *
 * ⚠ 이 자는 «지금 무엇인가» 를 찍을 뿐 통과·실패를 말하지 않는다(판정은 `tools/verify681.js`).
 *   다만 **수리 전 사본**(옛 곡선을 덮어씌운 페이지)을 같이 재서 «등재문이 이 트리에서 재현되는가»
 *   를 [P] 로 남긴다 — 고쳐진 뒤에도 이 재현기는 계속 성립한다(803 의 «옛 재현이 굳는» 함정 회피).
 * ⚠ 트리거는 실제 사용자 경로다(훈련 카드 강화 버튼 pointerdown) — `fxBurst` 를 직접 부르지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { SAMPLE, summarize } = require('./envelope681');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const STEPS = Number(process.env.P681_STEPS || 20);

/* 수리 전 곡선 — 등재문이 잰 그 선언 그대로. 이름이 같은 `@keyframes` 를 나중에 얹으면 덮인다. */
const OLD = '@keyframes fxSpark{0%{transform:translate(0,0) scale(1);opacity:1}'
  + '52%{transform:translate(calc(var(--dx)*.78),calc(var(--dy)*.78)) scale(1);opacity:1}'
  + '100%{transform:translate(var(--dx),var(--dy)) scale(.62);opacity:0}}';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const info = (k, v) => console.log('       · ' + k + ': ' + v);
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

  console.log('[D] 선언 — 지금 트리의 공용 곡선');
  const m = code.match(/@keyframes fxSpark\{([\s\S]*?\})\}/);   /* 블록의 끝은 `}}` 다 */
  info('@keyframes fxSpark', m ? m[1].replace(/\s+/g, ' ').trim() : '못 찾음');
  info('선언 수명', (code.match(/animation:fxSpark ([\d.]+)s/) || [, '?'])[1] + 's');
  info('FXSPARK_MS', (code.match(/FXSPARK_MS = (\d+)/) || [, '?'])[1] + 'ms');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  const setup = () => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    openTrain();
  };
  await page.evaluate(setup);
  await page.waitForTimeout(400);

  const now = await burstAndSample(page);
  ok(!!now && now.n > 0, 'P0 공용 봉투를 타는 알이 실제로 태어난다(훈련 강화 버튼)',
     now ? now.n + '알 · 수명 ' + now.dur + 'ms' : '0알');
  if (!now) { await browser.close(); process.exit(1); }

  console.log('\n[E] 지금 트리의 봉투 — 알의 «제 최대 대비 크기»(s) 와 알파(α)');
  info('표본', now.line);
  info('출생 크기', p2(now.s0 * 100) + '% · 최대 도달 ' + Math.round(now.peakT) + 'ms · 첫 프레임에 최대인 알 '
       + now.bornFull + '/' + now.n);
  info('꼬리', 'α≤0.50 ' + p2(now.tail50) + 'ms · α≤0.35 ' + p2(now.tail35) + 'ms (수명의 '
       + p2(now.tail35 / now.dur * 100) + '%)');
  info('잉크(α·s²)', [0, 95, 190, 240, 290, 340].map(T => T + 'ms ' + p2(now.ink(T))).join(' · '));
  info('«큰 채로 흐림»', p2(now.smudge) + 'ms · 재가속 비 ' + p2(now.reaccel) + '배 · 가장 긴 정지 구간 ' + p2(now.still) + 'ms');

  /* ── 수리 전 사본 — 옛 곡선을 얹고 같은 자로 다시 잰다 ─────────────────── */
  await page.addStyleTag({ content: OLD });
  await page.waitForTimeout(60);
  const old = await burstAndSample(page);
  ok(!!old, 'P1 수리 전 곡선을 얹은 사본에서도 알이 태어난다(대조군 성립)', old ? old.n + '알' : 'n/a');
  if (old) {
    console.log('\n[P] 재현 — 등재문의 두 관측이 «수리 전 곡선» 에서 그대로 보인다');
    info('수리 전 표본', old.line);
    ok(old.s0 >= 0.99 && old.bornFull === old.n,
       'P2 ⓐ 탄생 박자 0 — 출생 크기 ' + p2(old.s0 * 100) + '% · 첫 프레임에 최대인 알 ' + old.bornFull + '/' + old.n,
       '등재문 «10알이 동시에 최대 크기로 시작»');
    ok(old.tail35 >= 80,
       'P3 ⓑ 꼬리가 빈 껍데기 — α≤0.35 가 ' + p2(old.tail35) + 'ms(수명의 ' + p2(old.tail35 / old.dur * 100) + '%)',
       '등재문 «90~100ms · 수명의 26%»');
    ok(old.ink(290) < 0.25 && old.ink(340) < 0.10,
       'P4 그 구간의 잉크가 실제로 비어 있다 — 290ms ' + p2(old.ink(290)) + ' · 340ms ' + p2(old.ink(340)),
       '등재문 «290·340ms 프레임이 정보량 0»');
    console.log('\n[Δ] 지금 ↔ 수리 전');
    info('재가속 비', p2(now.reaccel) + '배 ↔ ' + p2(old.reaccel) + '배');
    info('«큰 채로 흐림»', p2(now.smudge) + 'ms ↔ ' + p2(old.smudge) + 'ms');
    info('가장 긴 정지 구간', p2(now.still) + 'ms ↔ ' + p2(old.still) + 'ms');
    info('출생 크기', p2(now.s0 * 100) + '% ↔ ' + p2(old.s0 * 100) + '%');
    info('α≤0.35 꼬리', p2(now.tail35) + 'ms ↔ ' + p2(old.tail35) + 'ms');
    info('290ms 잉크', p2(now.ink(290)) + ' ↔ ' + p2(old.ink(290)));
    info('340ms 잉크', p2(now.ink(340)) + ' ↔ ' + p2(old.ink(340)));
  }

  ok(errs.length === 0, 'P5 콘솔 에러 0', errs.slice(0, 2).join(' | '));
  await browser.close();
  console.log('\nPROBE681 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
