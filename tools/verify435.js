#!/usr/bin/env node
/* 435 게이트 — `probe351.js --selftest`(D2 축의 되돌림 시험)이 **실제로 빨개질 수 있는가**.
 *
 * 실행: node tools/verify435.js
 *
 * 이 자가 지키는 것은 제품이 아니라 **자의 시험**이다. 435 로 등재된 사고는 이랬다:
 *   주입(`page.evaluate` #1)과 판정(`page.evaluate` #2)이 갈라져 있어, 그 사이 프레임에
 *   게임 루프가 심은 `<s>` 를 지웠다 ⇒ 「심었다 2개」 만 찍고 결함 0건으로 조용히 끝났다.
 *   그 상태로 8회차를 돌았고, D2 를 손대는 세션이 «selftest 0건 = 안전» 으로 읽으면 위험했다.
 *
 * 그래서 절이 넷이다 — **지금 초록인 것만으로는 아무것도 증명 못 한다**:
 *   §1 전제      — 주입 표본이 실재하고, 손으로 적은 목록이 아니라 «성질» 로 골린다
 *   §2 뿌리      — 옛 순서(라운드트립 분리)는 지금도 심은 것을 잃는다 (= 등재문의 뿌리가 그것이었다)
 *   §3 지금      — 원자 주입은 같은 라운드트립에서 D2 조건을 켠다
 *   §4 자 전체   — `--selftest` 가 «심은 n · 잡힌 n» 을 찍고 종료 코드 0 으로 닫는다
 *   §5 음성항    — 주입을 끄면 그 자리는 조용하다 (= §4 의 초록은 주입이 만든 것이다)
 *   §6 되돌림    — **D2 축을 끈 사본**에서는 `--selftest` 가 종료 코드 1 로 빨개진다
 *                  (334 처방 — «무르게 푼 수리가 아님» 을 못박는 절)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, collectOpeners, drive, SHORT } = require('./probe351lib');

const P351 = path.resolve(__dirname, 'probe351.js');
const LABEL = 'tab:box';   /* 89 유물 상자 탭 — 435 등재문이 실측한 바로 그 화면 */

/* probe351 의 주입 규칙과 **같은 조건**으로 대상을 고른다(자에서 읽어 온 것이 아니라 같은 성질). */
const PICK = function () {
  const app = document.getElementById('app');
  window.__v435 = [];
  const out = [];
  for (const el of app.querySelectorAll('*')) {
    if (out.length >= 2) break;
    const cs = getComputedStyle(el);
    if (cs.overflowX !== 'hidden' || cs.display === 'none') continue;
    if (el.clientWidth < 40 || el.clientHeight < 40) continue;
    if (el.scrollWidth > el.clientWidth + 2) continue;
    window.__v435.push(el);
    out.push({ id: el.id || el.className || el.tagName, cw: el.clientWidth, sw: el.scrollWidth });
  }
  return out;
};
const PLANT = function () {
  return (window.__v435 || []).map((el) => {
    const s = document.createElement('s');
    s.className = 'v435';
    s.style.cssText = 'display:block;width:' + (el.clientWidth + 400) + 'px;height:4px';
    el.appendChild(s);
    return { sw: el.scrollWidth, cw: el.clientWidth, d2: el.scrollWidth > el.clientWidth + 2, hasS: !!el.querySelector('s.v435') };
  });
};
const RECHECK = function () {
  return (window.__v435 || []).map((el) => ({
    sw: el.scrollWidth, cw: el.clientWidth,
    d2: el.scrollWidth > el.clientWidth + 2,
    hasS: !!el.querySelector('s.v435'),
  }));
};

function run(file, args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [file, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status == null ? 2 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

(async () => {
  /* ── 브라우저로 직접 재는 절 (§1~§3) ── */
  const browser = await launch(chromium);
  let picked = [], planted = [], rechecked = [], atomic = [];
  try {
    const openers = (await collectOpeners(browser)).filter((o) => o.label === LABEL);
    if (!openers.length) throw new Error(`[435] 오프너 «${LABEL}» 이 목록에 없다 — 화면 이름이 바뀌었는지 볼 것`);
    const { ctx, page } = await fresh(browser, ...SHORT);
    await drive(page, openers[0]);
    await settle(page);
    picked = await page.evaluate(PICK);
    planted = await page.evaluate(PLANT);       /* evaluate #1 — 옛 순서의 주입 */
    rechecked = await page.evaluate(RECHECK);   /* evaluate #2 — 옛 순서의 판정 시점 */
    atomic = await page.evaluate(() => (window.__v435 || []).map((el) => {   /* 한 라운드트립 */
      const s = document.createElement('s');
      s.className = 'v435b';
      s.style.cssText = 'display:block;width:' + (el.clientWidth + 400) + 'px;height:4px';
      el.appendChild(s);
      return { sw: el.scrollWidth, cw: el.clientWidth, d2: el.scrollWidth > el.clientWidth + 2 };
    }));
    await ctx.close();
  } finally { await browser.close(); }

  /* ── 자를 통째로 돌리는 절 (§4~§6) ── */
  const self = run(P351, ['--only', LABEL, '--selftest']);
  const plain = run(P351, ['--only', LABEL]);

  /* §6 되돌림 — D2 의 ovfX 항을 **소스에서 걷어낸 사본**을 만든다(임시 파일 · 끝나면 지운다). */
  const src = fs.readFileSync(P351, 'utf8');
  const D2LINE = "      push('D2', el, { k: 'ovfX', by: el.scrollWidth - el.clientWidth });";
  const cut = src.split(D2LINE).length - 1;
  const TMP = path.join(__dirname, `.verify435-nod2.tmp-${process.pid}.js`);
  let reverted = { code: -1, out: '' };
  if (cut === 1) {
    fs.writeFileSync(TMP, src.replace(D2LINE, '      /* [verify435] D2 ovfX 를 걷어낸 사본 */'));
    try { reverted = run(TMP, ['--only', LABEL, '--selftest']); } finally { try { fs.unlinkSync(TMP); } catch (e) {} }
  }

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

  console.log('\n§1 전제 — 시험이 성립하는가 ──────────────────────────────────');
  ok(picked.length >= 1,
    `[1-a] 주입 표본이 실재한다 — «overflow-x:hidden · 40px 이상 · 아직 안 넘치는» 그릇 ${picked.length}개 `
    + `(${picked.map((p) => `${p.id} ${p.cw}px`).join(' · ')})`);
  ok(picked.every((p) => p.sw <= p.cw + 2),
    '[1-b] 고른 그릇은 **이미 넘치고 있지 않다** — 이미 넘치면 2280 판에도 같은 key 가 있어 '
    + '차분이 소거하고 「1600 전용 1건」 이라는 시험의 뜻이 사라진다');

  console.log('\n§2 뿌리 — 옛 순서(라운드트립 분리)는 심은 것을 잃는다 ────────────');
  ok(planted.every((p) => p.hasS && p.d2),
    `[2-a] 심는 것 자체는 먹는다 — 심은 직후 scrollW ${planted.map((p) => `${p.cw}→${p.sw}`).join(' · ')} · D2 전부 true`);
  ok(rechecked.every((r) => !r.hasS),
    `[2-b] ⚑ 그런데 **다음 라운드트립에는 <s> 가 없다** — ${rechecked.filter((r) => !r.hasS).length}/${rechecked.length}자리 `
    + '(게임 루프가 그 노드 내용을 통째로 다시 쓴다)');
  ok(rechecked.every((r) => !r.d2),
    `[2-c] 그래서 옛 순서의 판정 시점 D2 는 **전부 false** — scrollW ${rechecked.map((r) => r.sw).join(' · ')} `
    + '(= 435 등재문의 「0건」 이 나온 자리다)');

  console.log('\n§3 지금 — 원자 주입은 같은 라운드트립에서 켠다 ────────────────');
  ok(atomic.length === picked.length && atomic.every((a) => a.d2),
    `[3-a] 한 evaluate 안에서 심고 재면 D2 조건이 켜진다 — ${atomic.filter((a) => a.d2).length}/${atomic.length}자리 `
    + `(scrollW ${atomic.map((a) => `${a.cw}→${a.sw}`).join(' · ')})`);
  ok(atomic.every((a) => a.sw - a.cw > 2),
    `[3-b] 넘침 폭이 D2 문턱(clientW+2)을 확실히 넘는다 — 최소 ${Math.min(...atomic.map((a) => a.sw - a.cw))}px `
    + '(문턱은 한 칸도 안 건드렸다)');

  console.log('\n§4 자 전체 — `--selftest` 가 심은 것을 실제로 잡는다 ──────────────');
  const mInj = self.out.match(/심은 자리 (\d+) · D2 가 1600 전용으로 잡은 자리 (\d+)/);
  ok(self.code === 0, `[4-a] 종료 코드 0 — ${self.code}`);
  ok(!!mInj && Number(mInj[1]) > 0, `[4-b] 심은 자리 ${mInj ? mInj[1] : '(집계 줄 없음)'}개`);
  ok(!!mInj && Number(mInj[2]) === Number(mInj[1]),
    `[4-c] **심은 만큼 잡았다** — 잡은 자리 ${mInj ? mInj[2] : '?'} / 심은 ${mInj ? mInj[1] : '?'}`);
  ok(/D2=\d+/.test(self.out) && /1600 에서만 생긴 결함 [1-9]/.test(self.out),
    '[4-d] 그 결함이 «1600 에서만 생긴 것» 으로 차분에 남는다 — '
    + (self.out.match(/1600 에서만 생긴 결함 \d+건/) || ['(없음)'])[0] + ' · '
    + (self.out.match(/종류별: .*/) || ['(없음)'])[0]);

  console.log('\n§5 음성항 — 주입을 끄면 그 자리는 조용하다 ────────────────────');
  ok(plain.code === 0, `[5-a] 통상 실행(`+'`--selftest` 없이'+`)도 종료 코드 0 — ${plain.code}`);
  ok(/1600 에서만 생긴 결함 0건/.test(plain.out),
    '[5-b] 그리고 결함 0건 — ' + (plain.out.match(/1600 에서만 생긴 결함 \d+건/) || ['(없음)'])[0]
    + ' ⇒ §4 의 초록은 **주입이 만든 것**이지 화면의 실재 결함이 아니다');
  ok(!/\[selftest\]/.test(plain.out),
    '[5-c] 통상 실행은 아무것도 심지 않는다 — selftest 줄이 한 줄도 안 찍힌다(자의 평시 결과가 안 바뀐다)');

  console.log('\n§6 되돌림 시험 — D2 축을 끄면 이 시험은 빨개진다 ───────────────');
  ok(cut === 1, `[6-a] 되돌릴 자리를 소스에서 정확히 한 곳 찾았다 — ${cut}건 (0/2 면 이 절이 헛돈다)`);
  ok(reverted.code === 1,
    `[6-b] **D2 ovfX 를 걷어낸 사본은 종료 코드 1** — ${reverted.code} `
    + '(= 이 시험은 「영원히 초록」 이 아니다. 435 전에는 이 사본도 0 으로 닫혔다)');
  ok(/심었는데 못 잡은 화면/.test(reverted.out),
    '[6-c] 그리고 이유를 말한다 — ' + ((reverted.out.match(/\[selftest\] ❌ .*/) || ['(없음)'])[0]).trim());

  console.log(`\nVERIFY435 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY435 CRASH', e); process.exit(2); });
