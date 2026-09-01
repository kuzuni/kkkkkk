/* 프로브 319 — «즉사 대신 그 항목만 빨개진다» 를 실제로 증명한다 (2026-08-28)
 *
 * 319 의 처방 ③ 은 «`page.evaluate` 안 미정의 참조가 다시 나면 즉사 대신 그 항목만 빨개지게» 다.
 * 고쳐 놓고 «이제 안 죽는다» 고 적기만 하면 다음 회귀 때 또 죽는다 — 그래서 **일부러 죽는 참조**를
 * `verify204` 와 같은 `ev`/`blk` 짝에 먹여 보고, ① 프로세스가 살아 있고 ② FAIL 이 1건만 세지고
 * ③ 뒤 항목이 계속 도는지를 센다.
 *
 *   node tools/probe319.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 731 — 이 자의 [A] 는 **일부러** 미정의 참조를 먹인다(그것이 이 프로브의 과녁이다).
   731 차단기는 «삼켜진 예외» 를 마감에서 빨갛게 만드는데, 여기 것은 설계이므로 미리 신고한다.
   신고가 없으면 6/6 PASS 인 채로 종료 코드만 1 이 된다 — 그 자체가 차단기가 산다는 증거다. */
require('./evguard731').expect(/bagUse is not defined/);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const blk = (r, m) => { if (r && r.__err) { ok(false, m + ' — 평가가 죽었다: ' + r.__err); return false; } return true; };

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const ev = async (fn, arg) => {
    try { return await p.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
  };
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* [A] 292 가 지운 이름을 그대로 부른다 — 319 를 낸 바로 그 호출이다 */
  const dead = await ev(() => ({ bag: bagUse() }));            /* eslint-disable-line no-undef */
  ok(dead && dead.__err && /bagUse is not defined/.test(dead.__err),
     '[A] 미정의 참조가 `__err` 로 잡힌다 — “' + ((dead && dead.__err) || '(안 잡혔다)') + '”');
  /* blk() 은 «일부러» FAIL 을 1건 찍는다 — 그 1건은 프로브 자신의 점수가 아니므로 되돌려 놓고 센다.
     (안 되돌리면 프로브가 늘 빨갛게 끝나서 진짜 실패와 구별이 안 된다.) */
  const p0 = pass, f0 = fail;
  const skipped = !blk(dead, '[A] 죽은 블록(일부러 낸 것 — 아래에서 되돌린다)');
  const dFail = fail - f0, dPass = pass - p0;
  pass = p0; fail = f0;
  ok(skipped, '[A] blk() 이 false 를 돌려 블록을 건너뛴다');
  ok(dFail === 1 && dPass === 0, '[A] 죽은 블록은 FAIL 을 **1건만** 센다 (실측 FAIL +' + dFail + ' · ok +' + dPass + ')');

  /* [B] 죽은 블록 뒤에도 페이지와 평가가 계속 산다 — «즉사» 였다면 여기까지 못 온다 */
  const alive = await ev(() => ({ n: DUNGEONS.length, tk: Object.keys(S.dunTk || {}).length }));
  ok(blk(alive, '[B] 죽은 블록 다음 평가'), '[B] 죽은 블록 다음 평가가 정상으로 돈다');
  ok(alive.n > 0 && alive.n === alive.tk,
     '[B] 실제 값도 그대로 읽힌다 — DUNGEONS ' + alive.n + '개 · S.dunTk ' + alive.tk + '키');

  /* [C] 살아 있는 블록에는 `__err` 가 없다 — 감싸기가 정상 결과를 오염시키지 않는다 */
  ok(!Object.prototype.hasOwnProperty.call(alive, '__err'), '[C] 정상 결과에는 `__err` 키가 없다');

  console.log('\nPROBE319 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
