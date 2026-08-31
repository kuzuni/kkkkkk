#!/usr/bin/env node
/* 작업 491 — UI 쥬시니스(누름 손맛) 게이트
 *
 *   node tools/verify491.js
 *
 * 주인 지시: «룬강화 부분이랑, 단련부분 너무 안 쥬시해서 버튼을 누른건지 안누른건지 헷갈릴정도임.»
 *
 * 1회차 재현(`probe491`)이 등재문의 세 가설 중 둘을 기각하고 하나를 확정했다:
 *   ⓐ «jzTarget 이 못 고른다» — **기각**. 아홉 자리 전부 cursor:pointer 이고 호스트도 자기 자신이다.
 *   ⓒ «반응이 약하다» — **기각**. 반응이 «약한» 게 아니라 **0** 이었다(누른 채 bbox 변화 0.00%).
 *   ⓑ «누른 노드가 사라진다» — **확정**. 룬 [강화]·단련 [투자]·단련 [충전] 세 자리만
 *      «같은 노드» false · `jz-dn` 0장. 뿌리는 `rtHoldStart` 가 «홀드 중» 표시(`rtHold`)를
 *      **첫 발과 첫 렌더를 다 부른 뒤에** 세운 것이다 — 297 이 세운 «홀드 중에는 노드를 갈지 않는다»
 *      규약이 **첫 프레임에만 꺼져 있었다.**
 *
 * 그래서 이 자는 층을 갈라 묻는다 — 한 층만 물으면 헛초록이 난다(519 교훈):
 *   §1 소스 — 순서(표시가 첫 발보다 먼저) · 실패 갈래에서 표시를 도로 내린다
 *   §2 실행 — 23 훈련 팝업의 **눌리는 요소 전수**에서 «누른 그 노드» 가 살아남고 `jz-dn` 이 붙는다
 *   §3 찍힌 픽셀 — 주인이 이름을 댄 세 버튼 + 대조군이 «누른 채» 로 실제로 달라진다
 *   §4 소리 — pointerdown 마다 `sfx('tap')` 이 한 번(78 규약)
 *   §5 홀드 — 350ms 넘게 누르면 반복이 돌고 그동안 노드가 안 갈린다
 *   §R 되돌림 — 옛 순서로 되돌린 사본에서는 §2·§3 이 빨개진다(무르게 풀지 않았다는 증명)
 *   §Z 콘솔 에러 0
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v491-neg.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* «누른 채» 픽셀 변화 통과선. 대조군 실측(1회차)이 27.5~36.1% 이고 수리 전 세 자리는 0.00% 였다.
   경계는 그 사이에서 «부품이 통째로 빠지면 반드시 걸리는» 자리로 잡는다 — 부품 하나(scale .94)가
   420×112 버튼에서 내는 최소치가 약 22.9% 이므로 그 3분의 1인 8% 를 하한으로 둔다.
   ⚠ 넓히지 마라 — 이 값이 수리 전 0.00% 와 갈리는 유일한 축이다. */
const PX_MIN = 8;

/* ── 페이지 준비 ── */
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
    if (S.temper) S.temper.pts = 500;
    /* 78 — `sfx` 는 최상위 함수 선언이라 전역 객체 속성이다. 감싸서 호출을 센다(§4). */
    window.__sfx = [];
    const _s = window.sfx;
    window.sfx = function (n, o) { window.__sfx.push(n); return _s.apply(this, arguments); };
    openTrain();
  });
  await page.waitForTimeout(500);
  return { ctx, page, errs };
}

/* 그 탭에서 «눌리는 것» 전수 — jzTarget 이 자기 자신을 고르는, 보이는, 안 죽은 요소 */
async function pressables(page, tab) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain();
    setTrSub(k); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); }, tab);
  await page.waitForTimeout(420);
  return await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    for (const el of document.querySelectorAll('#trw *')) {
      let c = ''; try { c = getComputedStyle(el).cursor; } catch (_) { continue; }
      if (c !== 'pointer') continue;
      if (typeof jzTarget === 'function' && jzTarget(el) !== el) continue;
      if (typeof jzDead === 'function' && jzDead(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.y < 0 || r.y + r.height > 2280) continue;
      if (getComputedStyle(el).visibility === 'hidden' || !el.offsetParent) continue;
      const key = Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: (el.tagName + '.' + (el.className || '').toString().trim().split(/\s+/).join('.')).slice(0, 40),
                 x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return out;
  });
}

/* 한 자리를 눌러 «같은 노드에 jz-dn 이 붙었나» 를 묻는다. 좌표로 누르고 좌표로 되찾는다
   (셀렉터로 되찾으면 재렌더가 놓은 **새 노드**를 같은 것으로 착각한다 — probe491 1회차 함정). */
async function pressAt(page, x, y, holdMs) {
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    const h = (typeof jzTarget === 'function' && el) ? jzTarget(el) : el;
    window.__p491 = h || null;
    if (h) h.dataset.v491 = '1';
    window.__sfx = [];
  }, [x, y]);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(holdMs || 50);
  const r = await page.evaluate(() => {
    const h = window.__p491;
    return {
      had: !!h,
      alive: !!(h && h.isConnected),
      dn: !!(h && h.isConnected && h.classList.contains('jz-dn')),
      scale: h && h.isConnected ? getComputedStyle(h).scale : null,
      tap: window.__sfx.filter(n => n === 'tap').length,
      sfx: window.__sfx.slice(0, 4),
    };
  });
  return r;
}
async function release(page) {
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false);
                              if (typeof trHoldStop === 'function') trHoldStop(false); });
  await page.waitForTimeout(150);
}

/* 두 PNG 의 «달라진 픽셀 %» — 같은 페이지 안에서 읽는다(캡처를 data URL 로 되돌리는 350 처방).
   ⚠ 스크래치 페이지를 따로 만들면 게임 페이지가 뒤로 밀려 애니메이션이 재워진다(probe491 주석) —
     그래서 여기서는 **같은 페이지**의 캔버스로 읽는다. */
async function diffPct(page, a, b) {
  return await page.evaluate(async ([a, b]) => {
    const load = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i; };
    const ia = await load(a), ib = await load(b);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    if (!w || !h) return 0;
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, w, h).data; };
    const A = px(ia), B = px(ib);
    let n = 0;
    for (let i = 0; i < A.length; i += 4)
      if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i+1] - B[i+1]), Math.abs(A[i+2] - B[i+2])) > 12) n++;
    return n / (w * h) * 100;
  }, [a.toString('base64'), b.toString('base64')]);
}

const NAMED = [
  { id: 'rune',    tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'tempup',  tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [투자]' },
  { id: 'tempchg', tab: 'temper', sel: '#trTemper .tp-hd .cg',    n: '단련 [충전]' },
  { id: 'train',   tab: 'train',  sel: '#trCards [data-tr]',      n: '★대조 훈련 카드' },
];

/* 세 자리의 «누른 채 픽셀 변화» — 되돌림 사본에서도 같은 코드로 잰다 */
async function pixelRun(page) {
  const out = {};
  for (const t of NAMED) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain();
      setTrSub(k); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); }, t.tab);
    await page.waitForTimeout(420);
    const r = await page.evaluate(sel => {
      const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, t.sel);
    if (!r) { out[t.id] = null; continue; }
    const clip = { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: r.w + 8, height: r.h + 8 };
    const before = await page.screenshot({ clip });
    await page.evaluate(sel => { const e = document.querySelector(sel); window.__p491 = e || null; }, t.sel);
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(60);
    const live = await page.evaluate(() => ({ alive: !!(window.__p491 && window.__p491.isConnected),
      dn: !!(window.__p491 && window.__p491.isConnected && window.__p491.classList.contains('jz-dn')) }));
    const down = await page.screenshot({ clip });
    await release(page);
    out[t.id] = { px: await diffPct(page, before, down), alive: live.alive, dn: live.dn };
  }
  return out;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── §1 소스 — 순서 ── */
  const m = /function rtHoldStart\(o\)\{[\s\S]{0,900}?\n\}/.exec(src);
  ok(!!m, '[1-a] rtHoldStart 를 소스에서 찾았다');
  const body = m ? m[0] : '';
  const iSet = body.indexOf('rtHold = {');
  const iOnce = body.indexOf('o.once()');
  const iLive = body.indexOf('o.live()');
  ok(iSet >= 0 && iOnce >= 0 && iSet < iOnce,
     '[1-b] «홀드 중» 표시(rtHold)를 첫 발(o.once())보다 **먼저** 세운다', 'set@' + iSet + ' once@' + iOnce);
  ok(iSet >= 0 && iLive >= 0 && iSet < iLive,
     '[1-c] 표시를 첫 렌더(o.live())보다 먼저 세운다 — 297 규약이 첫 프레임에도 걸린다', 'live@' + iLive);
  ok(/rtHold = null;\s*\n\s*o\.end\(0, false\)/.test(body),
     '[1-d] 첫 발 실패 갈래에서는 표시를 **o.end() 전에** 도로 내린다(통짜 렌더 유지)');
  ok(/rtHoldOn\(tag\)\{ return !!\(rtHold && rtHold\.tag === tag\); \}/.test(src),
     '[1-e] rtHoldOn 판정은 그대로다(자를 무르게 하려고 판정을 넓히지 않았다)');
  ok(/sfx\('tap'\);\s*\/\* 78/.test(src), '[1-f] 60 위임이 pointerdown 에서 sfx(\'tap\') 을 부른다(78 규약)');

  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, SRC);

  /* ── §2 실행 — 눌리는 요소 전수 ── */
  let sweep = 0, sweepBad = [];
  for (const tab of ['train', 'rune', 'temper']) {
    const list = await pressables(page, tab);
    ok(list.length >= 3, '[2-0] ' + tab + ' 탭에서 눌리는 요소를 찾았다', list.length + '개');
    for (const e of list) {
      const r = await pressAt(page, e.x + e.w / 2, e.y + e.h / 2, 50);
      await release(page);
      /* ⚠ 표본을 누르면 **상태가 갈린다** — 탭 칸을 누르면 탭이, 룬 하위 탭 칸을 누르면 하위 룬이 바뀐다.
         하위 룬이 잠긴 칸(r2·r3)으로 넘어간 채 다음 표본을 재면 [강화] 버튼이 잠금 덮개(.rlk) 아래라
         «누를 수 없는 자리» 인데 «반응이 없다» 로 읽힌다(이 자의 1회차에 실제로 그렇게 났다).
         그래서 표본마다 탭 **과 하위 룬**을 둘 다 되돌린다. */
      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain();
        setTrSub(k); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); }, tab);
      await page.waitForTimeout(220);
      sweep++;
      if (!(r.alive && r.dn)) sweepBad.push(tab + ' ' + e.name + '(alive=' + r.alive + ' dn=' + r.dn + ')');
    }
  }
  ok(sweepBad.length === 0,
     '[2-a] 23 훈련 팝업의 눌리는 요소 **전수** ' + sweep + '자리에서 «누른 그 노드» 가 살아남고 jz-dn 이 붙는다',
     sweepBad.slice(0, 4).join(' | '));

  /* ── §4 소리 ── */
  {
    await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain();
      setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); });
    await page.waitForTimeout(420);
    const b = await page.evaluate(() => {
      const e = document.querySelector('#trRunes .rbt.b1'); const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const r = await pressAt(page, b.x, b.y, 50);
    await release(page);
    ok(r.tap === 1, '[4-a] 룬 [강화] pointerdown 한 번에 sfx(\'tap\') 이 정확히 1회',
       'tap=' + r.tap + ' 전체=' + JSON.stringify(r.sfx));
  }

  /* ── §5 홀드 — 반복이 돌고 그동안 노드가 안 갈린다 ── */
  {
    await page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('temper'); renderTrain(); });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const e = document.querySelector('#trTemper .tr-tp.k0 .tb'); const b = e.getBoundingClientRect();
      window.__lv0 = temperLv(TEMPERS[0].k);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    const p = await pressAt(page, r.x, r.y, 900);
    const after = await page.evaluate(() => ({ lv: temperLv(TEMPERS[0].k), lv0: window.__lv0,
                                               holding: (typeof rtHoldOn === 'function') && rtHoldOn('temper') }));
    await release(page);
    ok(after.lv > after.lv0, '[5-a] 900ms 꾹 누르면 반복 투자가 돈다', 'Lv ' + after.lv0 + ' → ' + after.lv);
    ok(after.holding, '[5-b] 그동안 «홀드 중» 표시가 켜져 있다');
    ok(p.alive && p.dn, '[5-c] 반복이 도는 900ms 내내 **누른 그 노드**가 그대로이고 jz-dn 이 붙어 있다',
       'alive=' + p.alive + ' dn=' + p.dn + ' scale=' + p.scale);
  }

  /* ── §3 찍힌 픽셀 ── */
  const now = await pixelRun(page);
  for (const t of NAMED)
    ok(now[t.id] && now[t.id].px >= PX_MIN,
       '[3-' + t.id + '] ' + t.n + ' 이 «누른 채» bbox 픽셀 ≥ ' + PX_MIN + '% 변한다',
       now[t.id] ? p2(now[t.id].px) + '%' : '없음');
  for (const t of NAMED)
    ok(now[t.id] && now[t.id].alive && now[t.id].dn,
       '[2-b] ' + t.n + ' — 누른 그 노드가 살아남고 jz-dn 이 붙는다(§3 과 같은 누름에서)',
       now[t.id] ? 'alive=' + now[t.id].alive + ' dn=' + now[t.id].dn : '없음');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  await ctx.close();

  /* ── §R 되돌림 — 옛 순서로 되돌린 사본은 빨개져야 한다 ── */
  const revert = src.replace(
    /  rtHold = \{ tag:o\.tag[\s\S]*?rtHold\.timer = setTimeout\(rtHoldTick, TR_HOLD_DELAY\);/,
    `  if(!o.once()){ o.end(0, false); rtShake(o.sel); return; }
  o.live();
  rtHold = { tag:o.tag, sel:o.sel, once:o.once, live:o.live, end:o.end, n:1, iv:TR_HOLD_IV0, timer:0 };
  rtHold.timer = setTimeout(rtHoldTick, TR_HOLD_DELAY);`);
  ok(revert !== src, '[R-0] 되돌림 사본을 만들었다(옛 순서 = 표시를 첫 발 뒤에 세운다)');
  fs.writeFileSync(NEG, revert);
  try {
    const b2 = await boot(browser, NEG);
    const back = await pixelRun(b2.page);
    const three = ['rune', 'tempup', 'tempchg'];
    /* ⚠ 되돌림의 **주 축은 픽셀이 아니라 노드 생존**이다 — 「단련 [충전]」은 누름 반응이 0 이어도
       머리 띠의 «포인트 n» 이 통째로 바뀌어 bbox 픽셀이 76% 변한다. 그건 «결과» 지 «누름» 이 아니다.
       픽셀만 보는 자였으면 그 자리를 «초록» 으로 읽고 수리 전과 못 갈랐다(1회차에 실제로 그랬다). */
    ok(three.every(k => back[k] && back[k].alive === false),
       '[R-a] 옛 순서에서는 세 자리 전부 «누른 그 노드» 가 죽는다(재렌더에 진다)',
       three.map(k => k + ':alive=' + (back[k] && back[k].alive)).join(' · '));
    ok(three.every(k => back[k] && back[k].dn === false),
       '[R-b] 옛 순서에서는 세 자리 전부 jz-dn 이 0장이다',
       three.map(k => k + ':dn=' + (back[k] && back[k].dn)).join(' · '));
    ok(['rune', 'tempup'].every(k => back[k] && back[k].px < PX_MIN),
       '[R-c] 그 결과 룬 [강화]·단련 [투자] 는 «누른 채» 픽셀이 ' + PX_MIN + '% 미만이다',
       ['rune', 'tempup'].map(k => k + ' ' + p2(back[k].px) + '%').join(' · '));
    ok(back.train && back.train.alive && back.train.px >= PX_MIN,
       '[R-d] 같은 사본에서 **대조군(훈련 카드)은 그대로 초록**이다 — 이 자가 «아무거나 빨개지는 자» 가 아님',
       back.train ? 'alive=' + back.train.alive + ' ' + p2(back.train.px) + '%' : '없음');
    await b2.ctx.close();
  } finally {
    try { fs.unlinkSync(NEG); } catch (_) {}
  }

  console.log('\nVERIFY491 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
