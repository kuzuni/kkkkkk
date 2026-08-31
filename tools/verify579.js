#!/usr/bin/env node
/* 작업 579 게이트 — 「누름(`jz-dn`)이 488 맥박(`jz-hb`)에 캐스케이드로 지지 않는다」
 *
 *   node tools/verify579.js
 *
 * 이 자가 지키는 것은 «클래스가 붙었나» 가 아니라 **«그 프레임에 누름 값이 실제로 적용됐나»** 다.
 * 수리 전에는 클래스가 홀드 내내 붙어 있었는데도(그래서 `verify491` [2-a]·[7-train] 은 초록이었다)
 * 같은 `animation` 단축을 두 부품이 두고 싸워 뒤에 선언된 `.jz-hb` 가 이겼고,
 * `getComputedStyle(card).scale` 이 `none` 이었다 — **클래스만 묻는 자는 이 병을 못 본다.**
 *
 * 절:
 *   §1 소스   — `.jz-dn` 이 정적 값이고 진폭(.94 / 8px)·램프 길이(.06s)가 그대로다 · 죽은 키프레임 0건
 *   §2 실동작 — 훈련 카드 홀드 1.2초 rAF 전수 표본: 램프 뒤 **전 프레임**이 누름 값을 든다
 *   §3 곱셈   — 맥박이 **죽지도 않았다**: 같은 프레임의 실측 폭이 rest × .94 × (1.00~1.02) 안이다
 *   §4 뗌     — `jz-up` 프레임의 승자가 전부 `jzUp` 이고 오버슈트(>1.0)가 실제로 찍힌다
 *   §5 대조   — «누른 것 ≠ 호스트»(룬 [강화] 버튼)는 수리 전에도 100% 였다 = 이 자는 겹침만 본다
 *   §R 되돌림 — ⓐ 정적 값 → `animation` 사본에서 §2 가 빨개진다
 *               ⓑ `jzRelease` 의 맥박 제거 한 줄을 뺀 사본에서 §4 가 빨개진다
 *               ⓒ 맥박을 통째로 죽인 사본에서 §3 이 빨개진다(«누름만 살리고 맥박을 죽이는» 무른 수리 차단)
 *
 * ── 591(2026-08-31) — 이 자가 3회 중 1회 빨개지던 두 자리를 «찍어서» 고쳤다 (`tools/probe591.js`) ──
 * 등재문의 가설은 «문턱이 한 장도 안 봐준다» 였다. 재현이 그것을 **한 칸 정정했다** —
 * 문턱이 아니라 **재는 창(窓)의 앵커**가 틀렸다. 둘 다 «값» 이 아니라 «클래스/한 프레임» 에 걸려 있었다:
 *
 *  ⓐ §2 — 창을 «`jz-dn` 클래스가 보인 뒤 100ms» 로 잡았다. 그런데 누름은 클래스가 붙는 순간이 아니라
 *     **브라우저가 그 변화를 처음 그리는 순간** 램프를 시작한다. 기계가 바쁘면 그 사이가 벌어진다 —
 *     `probe591` 실측(코어 4에 부하 6): 클래스가 붙고 값이 도착하기까지 **96~242ms**(한가할 때는 90~120ms)
 *     = `jz-dn` 표본의 앞 **3~7장**. 창을 100ms 로 잡으면 그 앞 한두 장이 «아직 1» 인 채로 잡혀
 *     45/46 · 35/36 이 났다. **결함이 아니라 자의 착시다** — 같은 표본을 두 자로 채점해 못박았다
 *     (`probe591` [B]: 자① 빨강 3/8 · 자② 빨강 **0/8**, 같은 8회).
 *     ⇒ 앵커를 «클래스 + 100ms» 에서 **«누름 값이 도착한 프레임»** 으로 옮겼다. 뜻은 그대로다 —
 *       «한 번 눌리면 홀드 내내 안 놓친다». 무르게 푼 것이 아님은 [R-a] 가 못박는다:
 *       수리 전 사본은 새 자로도 **4.8~27.3%**(5/5 빨강)이고 맥박 프레임은 **0/13~19** 다.
 *  ⓑ §R-b — «`jz-up` 이 붙었는데 승자가 `jzHb` 인 프레임» 을 셌다. 그런데 되돌린 사본에서 그 프레임은
 *     **딱 한 장**이다: `jzOn` 이 `getAnimations()` 로 «다 끝나면 클래스를 뗀다» 를 걸어 두는데,
 *     맥박이 이긴 자리에서는 그 애니(`jzHb`)가 곧바로 끝나 **스프링 클래스를 한 프레임 만에 걷어 간다**.
 *     그 한 장을 60fps 표본이 놓치면 «표본 0장» → `lost === 0` → **초록**(실제로 그렇게 빨개졌다).
 *     ⇒ «밀린 프레임이 있나»(한 장을 잡아야 한다) 대신 **«스프링이 실제로 돌았나»**(`animationName === 'jzUp'`
 *       인 프레임이 한 장이라도 있나)를 묻는다. 되돌린 사본은 그 값이 **0장**이라 표본을 놓쳐도 빨갛다
 *       = 종전보다 **더** 민감하다. 현재 트리는 회당 5~10장이다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v579-neg.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;
const p4 = n => Math.round(n * 10000) / 10000;

/* 누름이 «그 프레임에 적용됐는가» — 폭이 아니라 computed `scale` 로 묻는다.
   ⚠ 폭을 축으로 쓰면 안 된다: 누름은 맥박(1.02)·첫 발 팝(`fx-hit` 1.05)과 **곱해지므로**
     제대로 눌린 프레임의 폭 비가 .987 까지 올라간다(1회차에 그렇게 잘못 읽었다). */
const isDown = r => r.sc && r.sc !== 'none' && parseFloat(r.sc) <= 0.96;
/* 591 — «램프가 언제 끝나는가» 를 **시간으로 추정하지 않는다**(위 머리말 ⓐ). 남은 울타리는
   «램프가 끝나기는 하는가» 하나뿐이고, 그것도 ms 가 아니라 **표본 장수의 비율**로 잡는다 —
   ms 로 잡으면 기계가 느려질수록 저절로 빨개진다(이 자가 고치는 병을 다른 얼굴로 되만드는 셈).
   실측 도착 지점(현재 트리 · 코어 4에 부하 6): 96~242ms = `jz-dn` 표본의 앞 **3~7장**.
   ⚠ 이것은 수리 전과 후를 가르는 축이 **아니다**(수리 전 사본도 224~344ms 에 «한 번은» 도착한다) —
     가르는 것은 [2-c] 의 듀티다. 여기 있는 이유는 «누름이 아예 안 온다» 를 초록으로 넘기지 않기 위해서다. */
const ARRIVE_FRAC = 1 / 3;

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    openTrain(); setTrSub('train'); renderTrain();
  });
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

/* 한 자리를 진짜로 누르고 rAF 로 전수 표본을 모은다(왕복 evaluate 로는 위상을 못 잡는다) */
async function hold(page, sel, ms, tail) {
  tail = tail || 460;
  const rest = await page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = (typeof jzRestRect === 'function') ? jzRestRect(el) : el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rest) return null;
  await page.evaluate(([s, all]) => {
    window.__s579 = [];
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector(s);
      const t = performance.now() - t0;
      if (el) { const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        window.__s579.push({ t, cls: el.className, an: cs.animationName, sc: cs.scale, w: r.width }); }
      if (t < all) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [sel, ms + tail]);
  await page.mouse.move(rest.x + rest.w / 2, rest.y + rest.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  const upAt = await page.evaluate(() => window.__s579.length ? window.__s579[window.__s579.length - 1].t : 0);
  await page.mouse.up();
  await page.waitForTimeout(tail + 120);
  const s = await page.evaluate(() => window.__s579);
  return { rest, s, upAt };
}

/* 홀드 표본 → «누름이 도착한 뒤의 듀티» 와 부속 수치
   ⚠ 591 — 앵커는 **값**이다: `jz-dn` 이 붙은 프레임 중 «누름 값이 처음 도착한» 그 장부터 센다.
     시간으로 «클래스 + 100ms» 를 잡으면 바쁜 기계에서 램프 시작이 밀려 앞 한두 장을 헛으로 문다. */
function duty(run) {
  const s = run.s;
  const cls = s.filter(r => /(^| )jz-dn( |$)/.test(r.cls));
  const t0 = cls.length ? cls[0].t : 0;
  const ai = cls.findIndex(isDown);                  /* 누름 값이 도착한 첫 프레임 = 창의 앵커 */
  const arr = ai >= 0 ? cls[ai] : null;
  const dn = arr ? cls.filter(r => r.t >= arr.t) : [];
  const hb = dn.filter(r => /(^| )jz-hb(x)?( |$)/.test(r.cls));
  const down = dn.filter(isDown);
  /* ⚠ 폭으로 «맥박이 살아 있나» 를 물을 때는 `fx-hit`(첫 발 팝 1.05)이 얹힌 프레임을 빼야 한다 —
     둘 다 `transform` 을 쓰므로 팝이 도는 동안의 폭 변화는 맥박의 것이 아니다(1회차에 이것 때문에
     되돌림 항 [R-c] 이 «맥박을 죽였는데도» 0.054 로 흔들렸다). */
  const hbPure = hb.filter(r => !/(^| )fx-hit( |$)/.test(r.cls));
  return { dn, hb, hbPure, down, hbDown: hb.filter(isDown), cls,
           arrived: !!arr, lag: arr ? arr.t - t0 : -1, lagN: ai,
           pct: dn.length ? down.length / dn.length * 100 : 0 };
}

/* 뗀 뒤 표본 → «스프링이 실제로 돌았나»(591 ⓑ). 클래스가 아니라 **승자**를 센다. */
function spring(run) {
  const tail = run.s.filter(r => r.t > run.upAt);
  const up = tail.filter(r => /(^| )jz-up( |$)/.test(r.cls));
  return { tail, up, run: tail.filter(r => r.an === 'jzUp'), lost: up.filter(r => r.an !== 'jzUp') };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium);

  /* ── §1 소스 ─────────────────────────────────────────────────────────────── */
  console.log('\n§1 소스 — 누름 부품이 `animation` 자리를 비웠는가');
  const dnRule = (src.match(/\.jz-dn\{([^}]*)\}/) || [])[1] || '';
  ok(!!dnRule && !/animation:/.test(dnRule),
     '[1-a] ★ `.jz-dn` 은 `animation` 단축을 쓰지 않는다(그 자리는 488 맥박의 임자다)', dnRule.slice(0, 90));
  ok(/(^|;)scale:\.94(;|$)/.test(dnRule) && /(^|;)translate:0 8px(;|$)/.test(dnRule),
     '[1-b] 진폭은 한 자도 안 바뀌었다 — `scale:.94` · `translate:0 8px`(491 3회차의 부등식 값)');
  ok(/transition:scale \.06s ease-out,translate \.06s ease-out/.test(dnRule),
     '[1-c] 램프 길이·이징이 종전 애니(`jzDn .06s ease-out`)와 같다 — 손맛이 안 바뀐다');
  ok(/(^|;)filter:brightness\(1\.10\)(;|$)/.test(dnRule),
     '[1-d] 밝기 어휘도 그대로다(491 8회차가 이 값을 대조군의 기준으로 쓴다)');
  ok(!/@keyframes jzDn\{/.test(src),
     '[1-e] 죽은 키프레임 `jzDn` 을 남기지 않았다(자리를 비우지 않고 옮겼다 — 333 처방)');
  ok(/\.jz-hb\{animation:jzHb/.test(src) && /\.jz-hbx\{animation:jzHbx/.test(src),
     '[1-f] 전제 — 맥박 둘은 여전히 `animation` 단축이다(488 를 안 건드렸다)');
  ok(/el\.classList\.remove\('jz-hb', 'jz-hbx'\);\s*\n\s*jzOn\(el, 'jz-up', 200\);/.test(src),
     '[1-g] ★ `jzRelease` 가 뗌 **직전**에 맥박을 떼어 스프링이 `animation` 자리를 갖는다');
  /* ⚑ 567 이 실제로 이 자리에서 빨개졌다 — 정적 값은 «트랜지션이 켜진 채로는 못 벗긴다».
     `jzRestRect` 가 `scale:none !important` 를 박아도 트랜지션이 있으면 값이 0.06초에 걸쳐
     돌아가서 같은 태스크의 rect 는 여전히 눌린 값이다(실측 394.8 vs 420). 살아 있는 자는
     `verify567` 이고 여기서는 **소스 래칫**으로 같이 못박는다(누가 이 줄을 빼면 둘이 같이 빨개진다). */
  ok(/s\.setProperty\('transition', 'none', 'important'\);\s*\n\s*JZ_TF_PROPS\.forEach/.test(src),
     '[1-h] ★ `jzRestRect` 가 벗기기 전에 **트랜지션부터 끈다**(정적 값의 대가 · `verify567` 과 한 쌍)');

  /* ── §2·§3·§4 실동작 ─────────────────────────────────────────────────────── */
  const c1 = await boot(browser, SRC);
  const run = await hold(c1.page, '#trCards [data-tr]', 1200);
  if (!run) { ok(false, '[2-0] 훈련 카드 홀드 표본을 못 얻었다'); }
  else {
    const d = duty(run), restW = run.rest.w;
    console.log('\n§2 실동작 — 23 훈련 카드 홀드 1.2초 (표본 ' + run.s.length + '장 · `jz-dn` '
      + d.cls.length + '장 · 값 도착 뒤 ' + d.dn.length + '장 · 그중 맥박 겹침 ' + d.hb.length + '장)');
    const miss = d.dn.filter(r => !isDown(r));
    if (miss.length) console.log('  ↯ 누름이 빠진 프레임: '
      + miss.slice(0, 6).map(r => Math.round(r.t) + 'ms(scale=' + r.sc + ' an=' + r.an + ')').join(' · '));
    ok(d.arrived && d.lagN <= Math.max(4, Math.floor(d.cls.length * ARRIVE_FRAC)),
       '[2-a0] 전제 — 누름 값이 **도착한다**(클래스가 붙은 뒤 램프가 실제로 돈다 · 591 앵커)',
       d.arrived ? '앞 ' + d.lagN + '장 뒤 도착(' + p2(d.lag) + 'ms) · 한도 '
         + Math.max(4, Math.floor(d.cls.length * ARRIVE_FRAC)) + '장' : '한 장도 도착 안 함');
    ok(d.dn.length >= 10, '[2-a] 전제 — 도착 뒤 표본이 10장 이상이다', d.dn.length + '장');
    ok(d.hb.length >= 5, '[2-b] 전제 — 그중 상당수에 488 맥박이 실제로 겹친다', d.hb.length + '장');
    ok(d.pct >= 99, '[2-c] ★★ 도착 뒤 **전 프레임**이 누름 값(scale .94)을 든다 — 수리 전 4.8~27.3%',
       p2(d.pct) + '% (' + d.down.length + '/' + d.dn.length + ')');
    ok(d.hb.length ? d.hbDown.length === d.hb.length : false,
       '[2-d] ★★ 맥박이 겹친 프레임도 **한 장도 안 빠진다**(수리 전 0/13~19)',
       d.hbDown.length + '/' + d.hb.length);

    console.log('\n§3 곱셈 — 맥박도 같이 산다(누름만 살리고 맥박을 죽이면 안 된다)');
    const ratios = d.hbPure.map(r => r.w / restW);
    const lo = Math.min(...ratios), hi = Math.max(...ratios);
    ok(d.hbPure.length >= 5, '[3-0] 전제 — 팝(`fx-hit`)이 안 겹친 맥박 프레임이 5장 이상이다',
       d.hbPure.length + '/' + d.hb.length + '장');
    /* 맥박은 0% 에 1.02 로 시작해 100% 에 1 로 붙는다 ⇒ 곱한 폭 비는 .94 ~ .9588 사이를 오간다.
       ⚠ 위쪽 여유 0.002 는 렌더 반올림 몫이다 — 넓히지 마라(맥박이 죽으면 폭이 .94 에 굳는다). */
    ok(lo >= 0.935 && hi <= 0.961,
       '[3-a] 맥박 프레임의 실측 폭이 rest × .94 × (1.00~1.02) 안이다',
       'rest ' + p2(restW) + 'px · ×' + p4(lo) + ' ~ ×' + p4(hi));
    ok(hi - lo >= 0.004,
       '[3-b] ★ 그 안에서 **실제로 뛴다** — 맥박이 살아 있다는 증거(폭이 .94 에 굳으면 빨강)',
       '진폭 ' + p4(hi - lo) + ' (≥ 0.004)');

    console.log('\n§4 뗌 — 스프링이 맥박에 안 진다');
    const sp = spring(run), tail = sp.tail, up = sp.up, lost = sp.lost;
    const over = tail.filter(r => r.w / restW > 1.005);
    ok(up.length >= 3, '[4-a] 전제 — 뗀 뒤 `jz-up` 표본이 3장 이상이다', up.length + '장');
    ok(lost.length === 0, '[4-b] ★ `jz-up` 프레임의 승자가 전부 `jzUp` 이다(수리 전 5/5 가 `jzHb`)',
       lost.length + '/' + up.length + '장이 밀림');
    /* 591 ⓑ — [R-b] 가 쓰는 축의 **양성항**. 되돌린 사본에서 0장이 되는 그 값이 여기서는 5~10장이다
       (클래스만 보면 되돌린 사본도 «1장» 은 나오므로, 클래스가 아니라 승자를 세야 둘이 갈린다). */
    ok(sp.run.length >= 3, '[4-b2] ★ 스프링이 **실제로 돈다** — 승자가 `jzUp` 인 프레임 수(되돌리면 0장)',
       sp.run.length + '장');
    ok(over.length >= 1, '[4-c] ★ 오버슈트(>1.005배)가 실제로 찍힌다 — 스프링이 눈에 보인다',
       over.length + '장 · 최대 ×' + p4(Math.max(...tail.map(r => r.w / restW))));
  }

  /* ── §5 대조 ─────────────────────────────────────────────────────────────── */
  console.log('\n§5 대조 — «누른 것 ≠ 호스트»(룬 [강화] 버튼)는 겹침이 없어 수리 전에도 100% 였다');
  await c1.page.evaluate(() => { setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); });
  await c1.page.waitForTimeout(420);
  const runR = await hold(c1.page, '#trRunes .rbt.b1', 1000);
  if (!runR) ok(false, '[5-0] 룬 [강화] 버튼 표본을 못 얻었다');
  else {
    const d = duty(runR);
    ok(d.pct >= 99, '[5-a] 대조군은 그대로 100% — 이 자는 «겹치는 자리» 만 본다',
       p2(d.pct) + '% (' + d.down.length + '/' + d.dn.length + ')');
    ok(d.hb.length === 0, '[5-b] 그 버튼에는 맥박이 안 붙는다(맥박 호스트는 카드 `.tr-rn`)', d.hb.length + '장');
  }
  ok(c1.errs.length === 0, '[5-Z] 실행 중 콘솔 에러 0', c1.errs.slice(0, 2).join(' | '));
  await c1.ctx.close();

  /* ── §R 되돌림 ───────────────────────────────────────────────────────────── */
  console.log('\n§R 되돌림 — 무르게 푸는 길 셋을 모두 막는다');
  const REV = [
    { id: 'a', n: 'ⓐ 정적 값 → `animation`(수리 전 그대로)',
      rev: s0 => s0.replace(/\.jz-dn\{scale:\.94;translate:0 8px;filter:brightness\(1\.10\);transition:[^}]*\}/,
        '.jz-dn{animation:jzDn .06s ease-out both;filter:brightness(1.10)}\n'
        + '  @keyframes jzDn{from{scale:1;translate:0 0}to{scale:.94;translate:0 8px}}'),
      check: async page => {
        const r = await hold(page, '#trCards [data-tr]', 1200);
        const d = duty(r);
        return { red: d.pct < 60, why: '누름 듀티 ' + p2(d.pct) + '% · 맥박 프레임 '
          + d.hbDown.length + '/' + d.hb.length + '장만 눌림' };
      } },
    { id: 'b', n: 'ⓑ `jzRelease` 의 맥박 제거 한 줄을 뺀다',
      rev: s0 => s0.replace("  el.classList.remove('jz-hb', 'jz-hbx');\n", ''),
      check: async page => {
        /* 뗌은 맥박 «직후» 여야 걸린다 — 홀드가 도는 동안은 60~160ms 마다 새 맥박이 온다.
           그래서 여러 번 눌러 보고 «한 번이라도 스프링이 아예 안 돌았는가» 를 묻는다.
           ⚠ 591 — 묻는 것을 «밀린 프레임» 에서 **«스프링이 돈 프레임»** 으로 바꿨다(머리말 ⓑ).
             되돌린 사본에서 `jz-up` 클래스는 `jzOn` 의 «애니 끝나면 뗀다» 훅에 한 프레임 만에 걷혀
             표본을 놓치면 0장이 되고, 그러면 «밀림 0» = 초록으로 읽혔다. 승자를 세면 놓쳐도 0장이라 빨갛다. */
        const round = [];
        for (let i = 0; i < 4; i++) {
          const r = await hold(page, '#trCards [data-tr]', 900);
          const sp = spring(r);
          round.push({ up: sp.up.length, run: sp.run.length, lost: sp.lost.length });
          await page.waitForTimeout(200);
        }
        const dead = round.filter(x => x.run === 0);
        return { red: dead.length > 0,
          why: '스프링이 한 프레임도 안 돈 회 ' + dead.length + '/' + round.length
            + ' · 회차별 (jz-up 클래스/jzUp 실행/밀림) '
            + round.map(x => '(' + x.up + '/' + x.run + '/' + x.lost + ')').join(' ') };
      } },
    { id: 'c', n: 'ⓒ 맥박을 통째로 죽인다(누름만 살리는 무른 수리)',
      rev: s0 => s0.replace('.jz-hb{animation:jzHb .08s ease-out both}', '.jz-hb{}'),
      check: async page => {
        const r = await hold(page, '#trCards [data-tr]', 1200);
        const d = duty(r), restW = r.rest.w;
        const ratios = d.hbPure.map(x => x.w / restW);
        const span = ratios.length ? Math.max(...ratios) - Math.min(...ratios) : 0;
        return { red: span < 0.004, why: '맥박 프레임 폭 진폭 ' + p4(span) + ' (< 0.004 = 굳었다)' };
      } },
  ];
  for (const R of REV) {
    const rev = R.rev(src);
    ok(rev !== src, '[R-' + R.id + '0] 되돌림 사본을 만들었다 — ' + R.n);
    if (rev === src) continue;
    fs.writeFileSync(NEG, rev);
    try {
      const cN = await boot(browser, NEG);
      const res = await R.check(cN.page);
      ok(res.red, '[R-' + R.id + '] ★ 되돌린 사본에서는 이 자가 빨개진다 — ' + R.n, res.why);
      await cN.ctx.close();
    } finally { try { fs.unlinkSync(NEG); } catch (_) {} }
  }

  console.log('\nVERIFY579 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
