/* 작업 974 — 게이트: «창은 찍힌 판을 가리켜야 한다»
 *
 * 지키는 것 넷.
 *   [1] 정적 — 모집단 래칫 · 감사자가 공용 자리(`pwlaunch`)에 걸려 있다 · **기본은 꺼짐**
 *   [2] 감사자가 옳게 가른다 — **제품이 부른 rect 는 안 세고**, 자가 찍기 전에 읽은 것만 센다
 *   [3] [D0] 축 — 찍은 뒤 읽은 창은 찍힌 잉크를 담고, 찍기 전에 읽은 창은 문다
 *   [4] §R 되돌림 — 순서를 뒤집은 사본에서 [3] 이 **빨개진다**(무르게 푼 수리가 아님)
 *
 * ⚑ 이 자는 **모집단 30자를 굴리지 않는다.** 그 전수 조사는 `tools/sweep974.js` 몫이고(자마다
 * 브라우저를 띄워 20분이 든다), 게이트는 «축이 살아 있는가» 만 본다 — 축이 죽으면 스윕도 거짓말한다.
 *
 * 실행: node tools/verify974.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();
const geo974 = require('./geo974');

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'verify974-'));
const PEAK_WASH = 0.0001;

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const f1 = (n) => (n === null || n === undefined ? '—' : n.toFixed(1));

const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

async function boot(withAudit) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  /* 감사자는 «켰을 때만» pwlaunch 사슬이 붙인다 — 게이트는 이 자리에서 손으로 붙여
     `PW_GEO974` 없이도 축을 잴 수 있게 한다(자가 환경변수에 기대면 «없는 자» 가 된다 · 913 교훈). */
  if (withAudit) { await p.addInitScript(geo974.REC_SRC); }
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.addInitScript(FREEZE);
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {};
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' }); el.click();
  });
  await p.waitForTimeout(250);
  return { b, p };
}

const lvInk = () => {
  const card = document.querySelector('#bCos .sk-card.sel');
  if (!card) return null;
  const el = card.querySelector('.sk-clv');
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t, bb = null;
  while ((t = w.nextNode())) {
    if (!t.nodeValue.trim()) continue;
    const g = document.createRange(); g.selectNodeContents(t);
    const r = g.getBoundingClientRect(); if (!r.width || !r.height) continue;
    bb = bb ? { x: Math.min(bb.x, r.left), y: Math.min(bb.y, r.top),
                r2: Math.max(bb.r2, r.right), b2: Math.max(bb.b2, r.bottom) }
            : { x: r.left, y: r.top, r2: r.right, b2: r.bottom };
  }
  const lb = el.getBoundingClientRect();
  return bb ? { ink: { x: bb.x, y: bb.y, w: bb.r2 - bb.x, h: bb.b2 - bb.y },
                box: { x: lb.left, y: lb.top, w: lb.width, h: lb.height } } : null;
};

const shot = async (p, tag) => {
  const f = path.join(TMP, tag + '.png');
  await p.screenshot({ path: f });
  return PNG.sync.read(fs.readFileSync(f));
};

function inkMask(a, b2, box) {
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(a.width, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(a.height, Math.ceil(box.y + box.h));
  const on = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.width + x) * 4;
    const d = Math.abs(a.data[i] - b2.data[i]) + Math.abs(a.data[i + 1] - b2.data[i + 1])
            + Math.abs(a.data[i + 2] - b2.data[i + 2]);
    if (d > 3) on.push([x, y]);
  }
  return on;
}
function cover(ink, bx) {
  if (!bx || !ink.length) return 0;
  const x0 = Math.round(bx.x) + 1, x1 = Math.round(bx.x + bx.w) - 1;
  const y0 = Math.round(bx.y) + 1, y1 = Math.round(bx.y + bx.h) - 1;
  let n = 0;
  for (const [x, y] of ink) if (x >= x0 && x < x1 && y >= y0 && y < y1) n++;
  return n / ink.length;
}

/* 모집단 — `probe974` §1 과 **같은 정의**(자가 갈리면 둘 중 하나가 거짓말한다) */
function population() {
  const dir = path.join(ROOT, 'tools');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).filter((f) => {
    let s = ''; try { s = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_) { return false; }
    return /getBoundingClientRect/.test(s) && /screenshot/.test(s) && /pngjs|PNG\.sync|png913/.test(s);
  });
}

(async () => {
  console.log('=== verify974 — «창은 찍힌 판을 가리켜야 한다» ===\n');

  /* ── [1] 정적 ── */
  console.log('[1] 정적 — 자리와 기본값');
  const pop = population();
  const pl = fs.readFileSync(path.join(ROOT, 'tools', 'pwlaunch.js'), 'utf8');
  const g = fs.readFileSync(path.join(ROOT, 'tools', 'geo974.js'), 'utf8');
  console.log('  · 모집단(rect + screenshot + 화소 해독) ' + pop.length + '자');
  ok(pop.length >= 28,
    '[1a] 모집단 래칫 — ' + pop.length + '자 ≥ 28. 줄면 자가 사라졌거나 정의가 좁아진 것이다');
  ok(/geo974/.test(pl) && /geo974\.armBrowser/.test(pl),
    '[1b] 감사자가 **공용 자리**에 걸려 있다 — `pwlaunch` 사슬(955 교훈: 30벌 사본이 아니라 한 자리)');
  const envSave = process.env.PW_GEO974; delete process.env.PW_GEO974;
  const offDefault = geo974.enabled() === false;
  process.env.PW_GEO974 = '1'; const onEnv = geo974.enabled() === true;
  if (envSave === undefined) delete process.env.PW_GEO974; else process.env.PW_GEO974 = envSave;
  ok(offDefault && onEnv,
    '[1c] **기본은 꺼짐**이고 `PW_GEO974` 로만 켜진다 — 감사자는 상시 게이트가 아니라 감사자다'
    + '(모든 rect 호출에 스택을 뜨는 값을 평소에 물지 않는다)');
  ok(/index\.html/.test(g) && /stackTraceLimit/.test(g),
    '[1d] 감사자가 **제품 호출을 스택으로 가른다** — 안 가르면 `drawHud`→`cpRoom` 이 매 프레임 부르는 '
    + 'rect 가 «낡은 읽기» 로 수백 건 잡혀 자가 잡음에 묻힌다(실측: 89건 → 2건)');

  /* ── [2] 감사자가 옳게 가른다 (라이브) ── */
  console.log('\n[2] 감사자 — 무엇을 세고 무엇을 안 세는가');
  {
    const { b, p } = await boot(true);
    try {
      /* ⓐ 음성 대조 — **자가 아무것도 안 읽은** 판. 제품은 그동안 rect 를 계속 부른다. */
      await p.evaluate(() => window.__geo974.start());
      await p.waitForTimeout(900);
      const neg = await p.evaluate((a) => window.__geo974.audit(a[0], a[1]), [0.75, 1500]);
      ok(neg.young === 0,
        '[2a] ★ 음성 대조 — **제품이 부른 rect 는 안 센다**. 자가 한 건도 안 읽은 900ms 뒤 창 나이 낡은 읽기 '
        + neg.young + '건(=0). HUD 숫자는 그 사이에도 팝(`jz-up-n`)하며 움직인다');

      /* ⓑ 양성 대조 — 창을 읽어 두고 **그 호스트에 팝을 건다**(노드는 그대로 살아 있다).
         ⚠ 여기서 [강화]를 눌러 실제 연출을 태우면 안 된다 — `renderUI()` 가 격자를 갈아 끼워
         읽은 노드가 **떨어져 나가고**, 그것은 «크기가 갈렸다» 가 아니라 «잰 것이 없어졌다» 라
         `detached` 축으로 빠진다(§2 세 번째 걷어냄). 이 항이 묻는 것은 «살아 있는 창이
         어긋나면 세는가» 이므로 변형만 건다 — 실물 시나리오는 [3] 이 따로 잰다. */
      await p.evaluate(() => window.__geo974.start());
      const posRead = await p.evaluate(() => {
        const el = document.querySelector('#bCos .sk-card.sel .sk-clv');
        const r = el.getBoundingClientRect();              /* ← 창을 먼저 읽는다 */
        return { w: r.width, h: r.height };
      });
      await p.evaluate(() => {
        const el = document.querySelector('#bCos .sk-card.sel .sk-clv');
        el.style.transform = 'scale(1.18)';                /* `fxCvSwapS` 55% 프레임과 같은 배율 */
        void el.offsetHeight;
      });
      const pos = await p.evaluate((a) => window.__geo974.audit(a[0], a[1]), [0.75, 1500]);
      await p.evaluate(() => {
        document.querySelector('#bCos .sk-card.sel .sk-clv').style.transform = '';
      });
      ok(pos.young >= 1,
        '[2b] ★ 양성 대조 — **찍기 전에 읽은 창이 어긋나면 센다**. ' + pos.young + '건 ≥ 1'
        + ' (읽은 값 ' + f1(posRead.w) + '×' + f1(posRead.h)
        + (pos.worst ? ' · 최악 Δ' + pos.worst.d.toFixed(2) + 'px ' + pos.worst.tag : '') + ')'
        + '. 이 항이 없으면 [2a] 의 «0» 은 **«눈이 멀었다»** 와 못 가른다(891 §R 감도표 규율)');
    } finally { await b.close(); }
  }

  /* ── [3]·[4] [D0] 축과 되돌림 ── */
  console.log('\n[3] [D0] 축 — 그 창이 «찍힌 잉크» 를 담는가 (50 코스튬 [강화] 워시 봉우리)');
  const { b, p } = await boot(false);
  let cvPre = 0, cvPost = 0, pre = null, post = null, ink = 0;
  try {
    await p.evaluate((peak) => {
      document.querySelector('#bCos [data-cosup]').click();
      for (const a of document.getAnimations()) {
        try { const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
          if (d) { a.currentTime = d * peak; a.pause(); } } catch (_) {}
      }
    }, PEAK_WASH);
    await p.waitForTimeout(120);

    pre = await p.evaluate(lvInk);            /* 찍기 «전» */
    const imgOn = await shot(p, 'on');
    post = await p.evaluate(lvInk);           /* 찍은 «뒤» */

    await p.evaluate(() => {
      const card = document.querySelector('#bCos .sk-card.sel');
      const nodes = [card.querySelector('.sk-clv')];
      const L2 = document.getElementById('fxl');
      if (L2) for (const k of L2.querySelectorAll('.fx-keep')) {
        const s = (k.textContent || '').replace(/\s+/g, ' ').trim();
        if (s && /^Lv\./.test(s)) nodes.push(k);
      }
      for (const n of nodes) {
        n.style.setProperty('visibility', 'hidden', 'important');
        for (const d of n.querySelectorAll('*')) d.style.setProperty('visibility', 'hidden', 'important');
      }
    });
    const imgOff = await shot(p, 'off');
    const bx = post.box, pad = { x: bx.x - 8, y: bx.y - 8, w: bx.w + 16, h: bx.h + 16 };
    const mask = inkMask(imgOn, imgOff, pad);
    ink = mask.length;
    cvPre = cover(mask, pre.ink); cvPost = cover(mask, post.ink);
  } finally { await b.close(); }

  console.log('  · 찍기 전 ' + f1(pre.ink.w) + '×' + f1(pre.ink.h) + ' (잉크 ' + (cvPre * 100).toFixed(1)
    + '%)  ↔  찍은 뒤 ' + f1(post.ink.w) + '×' + f1(post.ink.h) + ' (잉크 ' + (cvPost * 100).toFixed(1)
    + '%) · 배율 ' + (post.ink.w / pre.ink.w).toFixed(3) + ' · 찍힌 잉크 ' + ink + 'px');
  ok(ink >= 120 && ink <= 4000,
    '[3a] 잉크 마스크가 글자 크기다 — ' + ink + 'px (120~4000). 0 이면 아래 두 항은 무의미하다(814 [D1] 교훈)');
  ok(cvPost >= 0.85,
    '[3b] ★ **찍은 뒤 읽은 창이 찍힌 잉크를 담는다** — ' + (cvPost * 100).toFixed(1) + '% ≥ 85%');
  ok(cvPre <= 0.78,
    '[3c] ★ **찍기 전에 읽은 창은 문다** — ' + (cvPre * 100).toFixed(1) + '% ≤ 78%. '
    + '⚑ 이 항이 «되돌림 시험» 을 겸한다 — 순서를 뒤집은 사본이 곧 이 값이고, 그 창으로 재면 '
    + '같은 프레임이 3.19:1 로 읽힌다(옳은 창은 5.08:1). **문턱은 실측(90.3 ↔ 67.5)에 안 붙였다** — '
    + '가르는 것은 «담는다 ↔ 문다» 이므로 두 값 사이를 넉넉히 가르는 자리(85 / 78)에 세웠다');
  ok(post.ink.w / pre.ink.w >= 1.10,
    '[3d] 두 창이 실제로 갈린다 — 배율 ' + (post.ink.w / pre.ink.w).toFixed(3) + ' ≥ 1.10. '
    + '안 갈리면 위 두 항은 «이미 참인 것을 게이트로 굳힌 것» 이다(338 규칙)');

  console.log('\nVERIFY974 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
