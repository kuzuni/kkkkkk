#!/usr/bin/env node
/* 작업 602 — 재현 전용(판정은 verify356.js). 338 규칙: 처방 전에 «찍힌 것» 을 먼저 본다.
 *
 *   node tools/probe602.js                # 현재 트리
 *   node tools/probe602.js --html <경로>   # 다른 판본의 index.html 로 같은 것을 잰다(대조용)
 *
 * 묻는 것.
 *   ① 34 축복을 «부팅 상태 그대로» 열었을 때 시계(`.tm>b.ck`)가 그려져 있는가, `.tm` 의 클래스는 무엇인가
 *      — 등재문은 «축복이 돌고 있어야 시계가 렌더된다» 고 적었다. 그 가설이 맞는지부터 본다.
 *   ② `scan356.js` 의 수집기(COLLECT)가 그 시계 노드에 붙이는 **경로 문자열**은 무엇인가
 *      — `verify356` 의 SCOPE 는 이 문자열의 «부분 일치» 로만 자리를 찾는다.
 *   ③ **지금 자에 적혀 있는 키**가 그 문자열 안에 실제로 들어 있는가(= [A] 3항이 초록인가 회색인가).
 *      ⚠ 키를 여기 손으로 적지 않고 `verify356.js` 에서 읽는다 — 자와 자가 어긋나면 그것도 결함이다.
 *   ④ 581 이전의 키(`s.tm.alert>b.ck`)가 왜 회색인가 — 클래스 한 개를 떼는 대조로 못박는다.
 *   ⑤ 등재문 처방(«축복을 켜고 재라»)이 이 자리를 살리는가.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT } = require('./scan356.js');

const argHtml = (() => {
  const i = process.argv.indexOf('--html');
  return i > 0 ? path.resolve(process.argv[i + 1]) : path.resolve(__dirname, '..', 'index.html');
})();
const URL = 'file://' + argHtml.replace(/\\/g, '/');

/* 581 이전(356 6회차)에 박혀 있던 키 — 재현용 상수다. 고치지 마라. */
const OLD_KEYS = [
  'div#blsC_atk>div.b>s.tm.alert>b.ck',
  'div#blsC_hp>div.b>s.tm.alert>b.ck',
  'div#blsC_rate>div.b>s.tm.alert>b.ck',
];
/* 지금 자에 적혀 있는 34 축복 «시계» 키 — 소스에서 읽는다(손으로 옮겨 적으면 표가 둘이 된다: 402 교훈) */
const GATE_KEYS = [...fs.readFileSync(path.resolve(__dirname, 'verify356.js'), 'utf8')
  .matchAll(/\{\s*k:\s*'([^']*blsC_[^']*s\.tm[^']*)'/g)].map((m) => m[1]);

let pass = 0, fail = 0;
const ok = (m) => { console.log('  ✓ ' + m); pass++; };
const bad = (m) => { console.log('  ✗ ' + m); fail++; };

(async () => {
  console.log('[probe602] ' + argHtml);
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const el = document.querySelector('.side .ibtn[data-pop="bless"]'); if (el) el.click(); });
  await page.waitForTimeout(700);

  const cards = await page.evaluate(() => document.querySelectorAll('.bls-c').length);
  if (cards === 3) ok(`34 축복 진입 — 카드 ${cards}장`);
  else bad(`34 축복 진입 실패 — 카드 ${cards}장(3 이어야 한다)`);

  /* ① 부팅 상태의 `.tm` 국면 — 시계가 그려져 있는가, `.alert` 는 붙어 있는가 */
  const chips = await page.evaluate(() => [...document.querySelectorAll('.bls-c')].map((c) => {
    const tm = c.querySelector('.tm'), ck = c.querySelector('.tm>b.ck');
    const r = ck ? ck.getBoundingClientRect() : null;
    return {
      id: c.id, off: c.classList.contains('off'),
      cls: [...tm.classList], ck: !!ck, txt: ck ? ck.textContent : '',
      w: r ? +r.width.toFixed(1) : 0, h: r ? +r.height.toFixed(1) : 0,
    };
  }));
  chips.forEach((c) => console.log(`    ${c.id} off=${c.off} .tm class=[${c.cls.join(' ')}] ⏱=${c.ck ? `«${c.txt}» ${c.w}×${c.h}` : '없음'}`));
  if (chips.every((c) => c.ck && c.w > 0))
    ok('부팅 상태(축복 0개) 에서도 시계 노드 3개가 렌더돼 있다 — «켜져 있어야 뜬다» 가 아니다');
  else bad('부팅 상태에서 시계 노드가 없다 — 등재문 가설대로 «켜진 축복» 이 필요하다');

  /* ② 수집기가 붙이는 경로 문자열 */
  const rows = (await page.evaluate(COLLECT, { all: false })).filter((r) => /bls/i.test(r.sel));
  console.log('    — COLLECT 가 본 34 축복 아이콘 노드');
  rows.forEach((r) => console.log(`      ${r.sel}  «${r.txt}»  ${r.w}×${r.h}  ratio ${r.ratio}`));
  const ckRows = rows.filter((r) => /b\.ck$/.test(r.sel));
  if (ckRows.length === 3) ok(`시계 노드 ${ckRows.length}개가 수집기에도 잡힌다(= 스캐너는 보고 있다)`);
  else bad(`수집기가 본 시계 노드 ${ckRows.length}개 (3 이어야 한다)`);

  /* ③ 지금 자의 키가 그 경로의 부분 문자열인가 */
  if (GATE_KEYS.length === 3) ok(`verify356 에서 읽은 34 축복 시계 키 ${GATE_KEYS.length}개: ${GATE_KEYS.join(' · ')}`);
  else bad(`verify356 에서 읽은 시계 키가 ${GATE_KEYS.length}개다(3 이어야 한다) — 자의 키 모양이 바뀌었다`);
  GATE_KEYS.forEach((k) => {
    const seen = rows.filter((r) => r.sel.includes(k) && /b\.ck$/.test(r.sel));
    if (seen.length) ok(`자의 키 «${k}» — 시계 ${seen.length}노드 일치`);
    else bad(`자의 키 «${k}» — 0노드. 실제 경로: ${ckRows.map((r) => r.sel).join(' · ') || '(시계 노드 없음)'}`);
  });

  /* ④ 재현 + 대조 — 581 이전 키는 왜 회색인가.
     ⚠ 클래스를 떼고 «기다렸다가» 재면 안 된다: `blessTick()` 이 1초마다 열린 팝업을 다시 그려
     `ifbtn` 을 도로 붙인다(1회차에 이 자리가 실행마다 갈렸다). 떼기·재기를 **한 태스크 안**에서
     끝낸다 — 자바스크립트 태스크 중간에는 타이머가 못 끼어든다. */
  const hitOld = OLD_KEYS.filter((k) => rows.some((r) => r.sel.includes(k))).length;
  if (hitOld === 0) ok('재현 — 581 이전 키(`s.tm.alert>b.ck`)는 0/3 (=[A] 3항이 회색이던 자리)');
  else bad(`재현 — 581 이전 키가 ${hitOld}/3 으로 살아 있다: 이 결함은 다른 뿌리다`);

  const back = (await page.evaluate((src) => {
    const collect = new Function('return (' + src + ')')();
    const tms = [...document.querySelectorAll('.bls-c .tm')];
    tms.forEach((t) => t.classList.remove('ifbtn'));
    const got = collect({ all: false });
    tms.forEach((t) => t.classList.add('ifbtn'));
    return got;
  }, COLLECT.toString())).filter((r) => /bls/i.test(r.sel));
  const hitBack = OLD_KEYS.filter((k) => back.some((r) => r.sel.includes(k))).length;
  if (hitBack === 3) ok('대조 — 581 이 얹은 `ifbtn` **한 개만** 떼면 옛 키가 즉시 3/3: 뿌리는 클래스 한 개다');
  else bad(`대조 — 떼도 옛 키가 ${hitBack}/3 뿐이다: 뿌리가 클래스 한 개가 아니다`);

  /* ⑤ 등재문 처방 대조 — «축복을 켜 두고 재라». `.alert` 는 `!blessOn(k)` 이므로 켜면 **빠진다**
     (`.ifbtn` 도 같이 빠진다) ⇒ 켜는 처방으로는 옛 키가 여전히 0 이다. 처방을 갈아야 하는 근거. */
  await page.evaluate(() => {
    /* 325·117 이 쓰던 상태 주입 그대로 — 새 경로를 만들지 않는다 */
    S.bless.exp = { atk: Date.now() + 6e5, hp: Date.now() + 6e5, rate: Date.now() + 6e5 };
    markDirty(); renderBless();
  });
  await page.waitForTimeout(250);
  const onChips = await page.evaluate(() => [...document.querySelectorAll('.bls-c .tm')].map((t) => [...t.classList].join('.')));
  const onRows = (await page.evaluate(COLLECT, { all: false })).filter((r) => /bls/i.test(r.sel));
  console.log(`    축복 3개 점등 후 .tm class=[${onChips.join(' | ')}]`);
  const hitOnOld = OLD_KEYS.filter((k) => onRows.some((r) => r.sel.includes(k))).length;
  if (hitOnOld === 0) ok('등재문 처방 대조 — 축복을 켜면 `.alert` 가 오히려 빠져 옛 키는 여전히 0/3 (처방을 갈아야 한다)');
  else bad(`등재문 처방 대조 — 켰더니 옛 키가 ${hitOnOld}/3 이다(등재문 가설이 맞았다)`);

  /* 켠 국면에서도 시계는 살아 있고, 자의 키는 그 국면에서도 물려야 한다(= 국면 무관) */
  const ckOn = onRows.filter((r) => /b\.ck$/.test(r.sel));
  const hitOnGate = GATE_KEYS.filter((k) => onRows.some((r) => r.sel.includes(k) && /b\.ck$/.test(r.sel))).length;
  if (ckOn.length === 3) ok('켠 국면에서도 시계 노드 3개 — 자의 키는 국면과 무관해야 한다');
  else bad(`켠 국면의 시계 노드 ${ckOn.length}개(3 이어야 한다)`);
  if (hitOnGate === GATE_KEYS.length && GATE_KEYS.length === 3)
    ok('자의 키가 «시간이 남았다» 국면(`.tm`)에서도 3/3 으로 물린다');
  else bad(`자의 키가 켠 국면에서 ${hitOnGate}/${GATE_KEYS.length} 만 물린다 — 키가 상태 클래스에 물려 있다`);

  await ctx.close();
  await browser.close();
  console.log(`[probe602] ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
