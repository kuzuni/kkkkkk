/* 작업 814 — 8회차 자: «플래시 워시가 두 값 줄의 대비를 무너뜨린다»(7회차 채점 2인 공통 ⓐ)를
   **찍힌 픽셀**로 재고, 8회차 처방(`--flash-keep` + `--flash-k`)이 그것을 실제로 회수했는지 판정한다.

   ── 계측 «정의» 를 먼저 적는다 (A1 10회차 교훈: 정의가 다르면 두 사람이 일치해도 틀린다) ──
   * 대비비 = **그 값 줄 잉크 상자 안에서** (휘도 상위 1% 값 + .05) ÷ (**중앙값** + .05).
     상위 1% = 흰 글리프 채움 · 중앙값 = 그 글자가 앉은 면(바/카드)이다. 상자는 DOM `Range` 의
     잉크 bbox 를 사방 1px 줄여 잡는다(AA 가장자리 제외).
   * ⚠ **«최대 ÷ 최소» 로 재면 안 된다** — 이 라벨들은 `ol1`/`ol2`(검은 외곽선)를 두르고 있어
     상자 안에 항상 «순백 ↔ 순검» 이 같이 있고, 그러면 이 자는 **어느 판에서나 21.00:1**(WCAG 상한)
     을 읽는다. 8회차에 실제로 그렇게 만들었다가 §R 이 안 빨개져서 잡았다 — 그 자는 글자와
     **자기 외곽선**의 비를 재고 있었지 7회차 채점자가 잰 «글자 ↔ 배경» 이 아니다.
   * L 은 WCAG 상대휘도(sRGB 역감마)다 — 7회차 채점자 둘(CX·CY)이 쓴 자와 같은 정의다.
   * «정지» = 같은 카드·같은 값에서 연출을 한 번도 안 켠 프레임. 이 자의 과녁은 «정지와 같아지는
     것» 이지 4.5:1 이 아니다 — 무연출 바 색(122,126,157) 자체가 3.7~3.9:1 이라 워시를 0 으로 해도
     4.5 는 구조적으로 못 넘는다(2인 각자 확인 · 그 이상은 바 색을 바꾸는 별도 행).

   ── 왜 캡처가 아니라 이 자인가 ──
   7회차 §4-8-2 가 못박았다: `.fx-spark` 는 .38s 에 끝나는데 스크린샷 한 장이 230~350ms 라
   «연속 프레임» 벌의 2번째 장부터는 이미 끝난 뒤다. 그래서 **수거·시간을 정지시키고**(FREEZE +
   `getAnimations().pause()`) 봉우리 한 장을 정확히 찍는다.

   실행: node tools/probe814c.js
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('pngjs').PNG;

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe814c-'));
/* 봉우리 = `@keyframes fxFlash` 의 52%(opacity .92 · scale 1.06) — 워시가 가장 두꺼운 때다.
   ⚠ 0% 가 아니라 52% 를 재는 이유: 0% 는 opacity 1 이지만 scale 1 이라 상자가 가장 작다.
     «값 줄을 덮는 면적 × 알파» 가 최대인 자리를 재야 최악을 잰다. */
const PEAK = 0.52;

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };
const f1 = (n) => (n === null || n === undefined ? '—' : n.toFixed(2));

/* 연출 노드 수거 무력화 — 4회차가 세운 것과 같은 것(probe814b 머리말) */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

const srgb = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

/* 잉크 상자 안 «글리프 채움 ↔ 앉은 면» 의 비 — 위 «정의» 절 그대로 */
function ratio(img, box) {
  const v = [];
  const x0 = Math.max(0, Math.round(box.x) + 1), x1 = Math.min(img.width, Math.round(box.x + box.w) - 1);
  const y0 = Math.max(0, Math.round(box.y) + 1), y1 = Math.min(img.height, Math.round(box.y + box.h) - 1);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * 4;
    v.push(L(img.data[i], img.data[i + 1], img.data[i + 2]));
  }
  if (!v.length) return null;
  v.sort((a, b) => a - b);
  const at = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
  const fg = at(0.99), bg = at(0.50);
  return { r: (fg + 0.05) / (bg + 0.05), fg, bg, out: at(0.05), n: v.length };
}

async function boot(file) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.addInitScript(FREEZE);
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {};
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;   /* 7회차 채점과 같은 표본(«Lv. 13» · «13/500») */
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  /* 이미 선택된 칸을 다시 누르면 상세 팝업이라 측정이 통째로 무효다(cap814 규약) */
  const opened = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' }); el.click();
    const md = document.querySelector('#modal');
    return !!(md && md.offsetParent !== null);
  });
  if (opened) throw new Error('상세 팝업이 열렸다 — 측정 무효');
  await p.waitForTimeout(250);
  return { b, p, errs };
}

/* 두 값 줄의 잉크 상자를 **화면 좌표**로 준다(패치가 아니라 «그 자리» 를 재는 것이다) */
async function boxes(p) {
  return await p.evaluate(() => {
    const card = document.querySelector('#bCos .sk-card.sel');
    if (!card) return null;
    const ink = (el) => {
      if (!el) return null;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t, bb = null;
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(t);
        const r = g.getBoundingClientRect(); if (!r.width || !r.height) continue;
        bb = bb ? { x: Math.min(bb.x, r.left), y: Math.min(bb.y, r.top),
                    r2: Math.max(bb.r2, r.right), b2: Math.max(bb.b2, r.bottom) }
                : { x: r.left, y: r.top, r2: r.right, b2: r.bottom };
      }
      return bb ? { x: bb.x, y: bb.y, w: bb.r2 - bb.x, h: bb.b2 - bb.y } : null;
    };
    const c = card.getBoundingClientRect();
    return { lv: ink(card.querySelector('.sk-clv')), bar: ink(card.querySelector('.sk-bar>b')),
             card: { x: c.left, y: c.top, w: c.width, h: c.height },
             lvTxt: (card.querySelector('.sk-clv') || {}).textContent,
             barTxt: (card.querySelector('.sk-bar>b') || {}).textContent };
  });
}

/* [강화] 를 누르고 **봉우리 한 장**을 찍는다 — 시간은 그 전에 멈춘다 */
async function shotPeak(p, tag) {
  await p.evaluate((peak) => {
    const btn = document.querySelector('#bCos [data-cosup]'); if (!btn) throw new Error('[강화] 없음');
    btn.click();
    /* 봉우리로 감고 정지. `fxFlash`·`fxCvSwap` 둘 다 이 한 줄에 걸린다(자를 두 벌 만들지 않는다). */
    for (const a of document.getAnimations()) {
      try { const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
        if (d) { a.currentTime = d * peak; a.pause(); } } catch (_) {}
    }
  }, PEAK);
  await p.waitForTimeout(120);
  const f = path.join(TMP, tag + '.png');
  await p.screenshot({ path: f });
  return PNG.sync.read(fs.readFileSync(f));
}

async function measure(file, tag) {
  const { b, p, errs } = await boot(file);
  const pre = await boxes(p);
  const still = PNG.sync.read(fs.readFileSync(await (async () => {
    const f = path.join(TMP, tag + '-still.png'); await p.screenshot({ path: f }); return f;
  })()));
  const img = await shotPeak(p, tag);
  const post = await boxes(p);
  /* 연출 중 DOM 상태 — «패치가 실제로 섰는가 · 무엇을 들고 있는가 · 애니가 도는가» */
  const dom = await p.evaluate(() => {
    const L2 = document.getElementById('fxl');
    const keeps = L2 ? [...L2.querySelectorAll('.fx-keep')] : [];
    const flash = L2 ? L2.querySelector('.fx-flash') : null;
    const txt = (n) => (n.textContent || '').replace(/\s+/g, ' ').trim();
    const anim = (n) => { try { return n.getAnimations().map((a) => a.animationName || (a.effect && a.effect.getKeyframes ? 'css' : '?')).join('+'); } catch (_) { return ''; } };
    return {
      keeps: keeps.map((k) => ({ txt: txt(k), cls: (k.firstElementChild || {}).className || '',
                                 anim: k.firstElementChild ? anim(k.firstElementChild) : '' })),
      flashBg: flash ? getComputedStyle(flash).backgroundColor : '',
      /* 그리는 순서가 곧 위아래 — 패치가 플래시 «뒤» 에 있어야 그 위에 그려진다 */
      keepAfterFlash: !!(flash && keeps.length && keeps.every((k) => (flash.compareDocumentPosition(k) & 4) !== 0))
    };
  });
  await b.close();
  return { pre, post, still, img, dom, errs };
}

(async () => {
  console.log('=== probe814c — 값 줄 대비(찍힌 픽셀) · 8회차 ===');
  console.log('정의: 대비비 = (잉크 상자 안 상위1% L + .05) ÷ (중앙값 L + .05) · WCAG 상대휘도');
  console.log('      («최대÷최소» 는 검은 외곽선 탓에 어느 판에서나 21.00 이다 — 머리말 ⚠)\n');

  const cur = await measure('index.html', 'cur');
  if (!cur.pre || !cur.pre.lv || !cur.pre.bar) { console.log('  ✗ 값 줄 상자를 못 잡았다'); process.exit(1); }

  const sLv = ratio(cur.still, cur.pre.lv), sBar = ratio(cur.still, cur.pre.bar);
  const pLv = ratio(cur.img, cur.post.lv), pBar = ratio(cur.img, cur.post.bar);
  console.log('[1] 지금 판 — 정지 ↔ 연출 봉우리(52%)');
  console.log('  · «' + cur.pre.lvTxt + '» 정지 ' + f1(sLv.r) + ':1 → 연출 ' + f1(pLv.r) + ':1');
  console.log('  · «' + cur.pre.barTxt + '» 정지 ' + f1(sBar.r) + ':1 → 연출 ' + f1(pBar.r) + ':1');
  console.log('  · 플래시 채움 = ' + cur.dom.flashBg + ' · 패치 ' + cur.dom.keeps.length + '장 '
    + JSON.stringify(cur.dom.keeps.map((k) => k.txt)));

  ok(pLv.r >= 3.0, '[P1] «Lv. n» 이 연출 중에도 3.0:1 이상 — ' + f1(pLv.r) + ':1 (7회차 2.78~2.88)');
  ok(pBar.r >= 3.0, '[P2] «n/500» 이 연출 중에도 3.0:1 이상 — ' + f1(pBar.r) + ':1 (7회차 2.30~2.63)');
  /* ⚑ [P3] — **사본이 약속한 것은 «글리프» 하나다.** 사본은 글자를 워시 «위» 에 다시 그리므로
     글리프 채움은 정지와 **같은 밝기**로 돌아온다. 하지만 그 글자가 **앉은 면**(바·카드)은 여전히
     워시 밑이라 합성비는 정지에 못 미친다 — 남는 몫이 `--flash-k` 가 미는 자리이고, 그러고도
     남는 것은 «바 색» 축(2인 각자 «이 작업 밖» 으로 못박았다)이다.
     ⇒ 이 항은 «정지와 같아졌는가» 가 아니라 **«사본이 제 몫을 다했는가»** 를 묻는다. 문턱을
       실측값 옆에 붙여 만들지 않는다(863 계보 — 문턱에 붙은 항은 다음 손잡이에 바로 빨개진다). */
  const dLv = Math.abs(pLv.fg - sLv.fg), dBar = Math.abs(pBar.fg - sBar.fg);
  console.log('  · 글리프 채움 L — «Lv» 정지 ' + sLv.fg.toFixed(3) + ' → 연출 ' + pLv.fg.toFixed(3)
    + ' (Δ' + dLv.toFixed(3) + ') · «n/500» 정지 ' + sBar.fg.toFixed(3) + ' → 연출 ' + pBar.fg.toFixed(3)
    + ' (Δ' + dBar.toFixed(3) + ')');
  ok(dLv <= 0.02 && dBar <= 0.02,
    '[P3] ★ 사본이 **글리프 채움을 정지와 같은 밝기**로 되돌린다 — Δ ' + dLv.toFixed(3) + ' · '
    + dBar.toFixed(3) + ' (≤0.02). 남는 몫은 «글자가 앉은 면» 이고 그것이 `--flash-k` 와 «바 색» 축이다');
  ok(pLv.r > sLv.r * 0.6 && pBar.r > sBar.r * 0.6,
    '[P4] 합성비도 정지의 60% 위로 돌아왔다 — «Lv» ' + f1(pLv.r) + '/' + f1(sLv.r) + ' = '
    + (pLv.r / sLv.r * 100).toFixed(0) + '% · «n/500» ' + f1(pBar.r) + '/' + f1(sBar.r) + ' = '
    + (pBar.r / sBar.r * 100).toFixed(0) + '% (7회차 CY 실측은 −70.8% · −48.9% 였다)');

  console.log('\n[2] 사본이 «새 값 + 도는 팝» 을 들고 있는가 (7회차 §4-8-1 이 적어 둔 함정)');
  const kt = cur.dom.keeps.map((k) => k.txt);
  const lvNew = cur.post.lvTxt;
  ok(kt.some((t) => t === (lvNew || '').trim()),
    '[P5] 사본이 **새 값**을 들고 있다 — 사본 ' + JSON.stringify(kt) + ' ∋ «' + lvNew + '» '
    + '(발화 시각 사본은 `renderUI()` 앞이라 옛 값이다 — `fxFlashRekeep` 이 다시 뜬 증거)');
  const lvKeep = cur.dom.keeps.find((k) => k.txt === (lvNew || '').trim());
  ok(!!(lvKeep && /fxCvSwapS|fxCvLit/.test(lvKeep.anim)),
    '[P6] ★ **팝이 사본에서 실제로 돈다** — 사본 애니 «' + (lvKeep ? lvKeep.anim : '—') + '» '
    + '(정지 사본을 얹으면 [B3]~[B5] 는 초록인 채 화면에서 팝이 가려진다)');
  ok(cur.dom.keepAfterFlash,
    '[P7] 사본이 플래시 **뒤**에 그려진다 — 앞에 서면 워시가 사본 위에 다시 얹힌다');
  ok(cur.errs.length === 0, '[P8] 콘솔 에러 0건 — ' + (cur.errs[0] || '없음'));

  /* ── [3] **연출이 끝난 뒤** — 프리즈 없는 실런타임에서 자리가 완전히 비는가 ──
     ⚑ 9회차 채점 2인(DH·DI)이 **각자 1순위**로 «keep 사본이 안 걷혀 «Lv. n» 이 영구히 금색(4.13:1)
       으로 남는다» 를 냈다. 그 판정의 근거는 `cap814` 의 `step-6/7/8`·`live-2..6` 인데, 그 벌은
       스크린샷 8장을 찍으려고 **`#fxl` 안 노드의 `remove()` 를 무력화**한다 — 그래서 «수명이 다한
       사본» 이 영원히 남은 것처럼 찍힌다(제품에는 없는 상태다).
     ⇒ 말로 반박하지 않고 **자를 하나 더 세운다.** 프리즈 없이 실제로 굴려 «플래시와 패치가 같이
       사라지는가 · 값 줄이 정지 색으로 돌아오는가» 를 묻는다. 이 항이 초록이면 두 채점자의
       지적은 하네스가 만든 유령이고, 빨개지면 **그들이 옳다.** */
  console.log('\n[3] 연출이 끝난 뒤 (프리즈 없음 · 실런타임)');
  {
    const b2 = await launch(chromium);
    const ctx2 = await b2.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await ctx2.newPage();
    await p2.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });   /* ⚠ FREEZE 를 **안** 건다 */
    await p2.goto('file://' + path.join(ROOT, 'index.html'));
    await p2.waitForTimeout(1200);
    await p2.evaluate(() => {
      if (typeof window.step === 'function') window.step = () => {};
      S.gold = 1e12; S.dia = 1e12; S.stone = 1e12; S.avatars = S.avatars || {};
      for (const a of AVATARS) S.avatars[a.id] = 1;
      S.avatar = AVATARS[0].id; S.cosLv = S.cosLv || {};
      for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;
      goTab('hero'); heroSubGo('cos'); uiDirty = true; renderUI();
    });
    await p2.waitForTimeout(400);
    await p2.evaluate(() => { const all = [...document.querySelectorAll('#bCos [data-cosit]')];
      (all.find((e) => e.dataset.cosit !== cosSel) || all[0]).click(); });
    await p2.waitForTimeout(250);
    const life = await p2.evaluate(() => new Promise((res) => {
      const Lr = document.getElementById('fxl'), t0 = performance.now();
      let flashGone = -1, keepGone = -1;
      document.querySelector('#bCos [data-cosup]').click();
      const tick = () => { const t = performance.now() - t0;
        if (flashGone < 0 && !Lr.querySelector('.fx-flash')) flashGone = t;
        if (keepGone < 0 && !Lr.querySelector('.fx-keep')) keepGone = t;
        if (t < 1500) requestAnimationFrame(tick); else res({ flashGone, keepGone });
      }; requestAnimationFrame(tick);
    }));
    /* ⚑ 10회차 — 사본이 «금색에 갇히는가» 를 프레임마다 묻는다(채점 DK 의 «단 하나»).
       ⚠ 이 항은 `step` 벌로는 못 판정한다 — 그 벌은 `currentTime` 을 손으로 감는데 사본의
         애니는 갓 등록돼 그 감기를 놓칠 수 있다. **실런타임에서 원본과 나란히** 읽는 것이 답이다. */
    const track = await p2.evaluate(() => new Promise((res) => {
      const Lr = document.getElementById('fxl'), t0 = performance.now();
      let n = 0, bad = 0; const sample = [];
      document.querySelector('#bCos [data-cosup]').click();
      const tick = () => {
        const kp = [...Lr.querySelectorAll('.fx-keep')].find((k) => /Lv\./.test(k.textContent || ''));
        const cl = kp && kp.firstElementChild;
        const or = document.querySelector('#bCos .sk-card.sel .sk-clv');
        if (cl && or) { n++;
          const a = getComputedStyle(cl).color, b = getComputedStyle(or).color;
          if (a !== b) bad++;
          if (sample.length < 3) sample.push(Math.round(performance.now() - t0) + 'ms ' + a);
        }
        if (performance.now() - t0 < 700) requestAnimationFrame(tick);
        else res({ n, bad, sample: sample.join(' · ') });
      }; requestAnimationFrame(tick);
    }));
    await p2.waitForTimeout(900);
    const rest = await p2.evaluate(() => {
      const cards = [...document.querySelectorAll('#bCos .sk-card')];
      const sel = document.querySelector('#bCos .sk-card.sel');
      /* ⚠ 이웃은 **같은 상태**의 칸이라야 한다 — `.dim`(착용 중)·`.lk`(미보유)는 `--clv-c` 가
         `#ACACAC` 라 애초에 색이 다르다(`.sk-card.dim>.sk-clv` 규칙). 상태가 다른 칸과 견주면
         이 항은 제품과 무관하게 빨개진다. */
      const same = (c) => c && !c.classList.contains('dim') && !c.classList.contains('lk');
      const other = cards.find((c) => c !== sel && same(c) && c.querySelector('.sk-clv'));
      const col = (c) => c ? getComputedStyle(c.querySelector('.sk-clv')).color : '';
      return { keeps: document.getElementById('fxl').querySelectorAll('.fx-keep').length,
               fx: document.getElementById('fxl').childElementCount,
               selDim: !!(sel && (sel.classList.contains('dim') || sel.classList.contains('lk'))),
               sel: col(sel), other: col(other) };
    });
    await b2.close();
    console.log('  · 플래시 사라짐 ' + Math.round(life.flashGone) + 'ms · 패치 사라짐 '
      + Math.round(life.keepGone) + 'ms · 정지 «Lv» 색 = ' + rest.sel + ' (이웃 카드 ' + rest.other + ')');
    ok(Math.abs(life.flashGone - life.keepGone) <= 34,
      '[P9] ★ 패치가 **플래시와 같이** 사라진다 — 플래시 ' + Math.round(life.flashGone) + 'ms · 패치 '
      + Math.round(life.keepGone) + 'ms (두 프레임 이내). 패치가 더 오래 살면 워시가 없는데 사본만 남아 글자가 이중으로 찍힌다');
    ok(track.bad === 0,
      '[P12] ★ 사본 색이 **원본과 매 프레임 같다** — 어긋난 프레임 ' + track.bad + '/' + track.n
      + ' (표본: ' + track.sample + '). 10회차 채점 DK 가 «사본이 금색에 평평하게 갇힌다» 를 냈는데'
      + ' 그 근거도 `step` 벌이었다 — 실런타임에서는 사본이 원본의 램프를 그대로 따라간다');
    ok(rest.keeps === 0 && rest.fx === 0,
      '[P10] ★ 연출이 끝나면 레이어가 **완전히 빈다** — 패치 ' + rest.keeps + '장 · `#fxl` 자식 ' + rest.fx + '개');
    ok(!rest.selDim && rest.sel === rest.other && /^rgb\(255, ?255, ?255\)$/.test(rest.sel),
      '[P11] ★ 정지 «Lv. n» 이 **이웃 카드와 같은 색**으로 돌아온다 — 강화한 칸 ' + rest.sel
      + ' · 이웃 ' + rest.other + ' (9회차 2인 공통 지적이 실제였다면 여기가 금색으로 빨개진다)');
  }

  /* ── §R 되돌림 시험 — 두 손잡이를 각각 빼면 실제로 빨개지는가 ──
     안 세우면 이 회차는 «이미 참인 것을 게이트로 굳힌» 것이 된다(338 규칙). */
  console.log('\n§R 되돌림 — 손잡이를 하나씩 빼면 빨개지는가');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const DECL = '--burst-rx:.60;--flash-keep:.sk-clv,.sk-bar>b;--flash-k:.70';
  if (src.indexOf(DECL) < 0) { ok(false, '[R] 주입 앵커를 못 찾았다 — 조용한 통과 금지'); }
  else {
    for (const [tag, to, why] of [
      ['R-e', '--burst-rx:.60', '두 손잡이를 다 뺀다 (7회차 판)'],
      ['R-f', '--burst-rx:.60;--flash-keep:.sk-clv,.sk-bar>b', '세기만 뺀다 (라벨은 올리되 바는 그대로)']
    ]) {
      const tmp = '.p814c-' + process.pid + '-' + tag + '.html';
      fs.writeFileSync(path.join(ROOT, tmp), src.split(DECL).join(to));
      try {
        const N = await measure(tmp, tag);
        const nLv = ratio(N.img, N.post.lv), nBar = ratio(N.img, N.post.bar);
        console.log('  · [' + tag + '] ' + why + ' — «Lv» ' + f1(nLv.r) + ':1 · «n/500» ' + f1(nBar.r) + ':1');
        if (tag === 'R-e') ok(nLv.r < 3.0 || nBar.r < 3.0,
          '[R-e] 두 손잡이를 빼면 빨개진다 — «Lv» ' + f1(nLv.r) + ' · «n/500» ' + f1(nBar.r)
          + ' (7회차가 실제로 이 자리였다)');
        else ok(nBar.r < pBar.r,
          '[R-f] 세기(`--flash-k`)를 빼면 «n/500» 이 내려간다 — ' + f1(nBar.r) + ' < 지금 ' + f1(pBar.r)
          + ' (라벨만 올려서는 못 닫힌다는 CX 스윕의 재확인)');
      } finally { try { fs.unlinkSync(path.join(ROOT, tmp)); } catch (_) {} }
    }
  }

  console.log('\nPROBE814C ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
