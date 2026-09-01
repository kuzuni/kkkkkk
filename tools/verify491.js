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
 *
 * ⚑ 613·614 이관(2026-08-31): [충전](.cg)·[회수](.tp-ft)가 기능째 폐지됐다 — 그 두 자리를 보던
 *   항(§6 헤더 사다리 [6-e..l]·[6-i] 전환비 전제 · §8 ⓑ 자릿수 자리 · NAMED/HOSTS 의 tempchg)은
 *   대상과 함께 걷어냈다. §6 의 본체(«자멸 뒤에도 손 밑에서 노드를 안 간다»)는 [충전] 특유가
 *   아니라 가드(rtDownIn)의 성질이므로 **[단련] 행 + 잔액 1개**(1발 뒤 자멸)로 이식했다.
 *   기하 기록은 review 491 §31 에 남아 있다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.v491-neg-${process.pid}.html`);

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
  { id: 'tempup',  tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
  { id: 'train',   tab: 'train',  sel: '#trCards [data-tr]',      n: '★대조 훈련 카드' },
];

/* 세 자리의 «누른 채 픽셀 변화» — 되돌림 사본에서도 같은 코드로 잰다.
   ⚑ **619 13회차 이관** — 이 축이 재는 것은 «누른 그 노드가 반응했는가» 지 «그 자리에서 무엇이든
   움직였는가» 가 아니다(위 [R-a]/[R-b] 머리말이 이미 «주 축은 픽셀이 아니라 노드 생존» 이라고 적어
   뒀다). 619 가 홀드에 **회당 이펙트**를 얹으면서 그 구분이 깨졌다: 되돌림 사본은 «누른 노드가 죽는»
   사본인데도 619 의 스파크(`#fxl`)와 홀드 글로우(`.fx-holding`)가 버튼 상자 안에서 계속 터져
   [R-c] 가 룬 **32.74%** 로 빨개졌다(문턱 8%). 13회차의 `inM`(가둠 기준을 중심 → 잉크)이 입자를
   호스트 안쪽으로 들이면서 버튼 상자에 더 겹친 것이 직접 원인이다.
   ⇒ **문턱을 넓히지 않고**(그건 자를 무르게 푸는 것이다 — 333) **재는 동안만 이펙트 층을 가린다.**
   가린 채로도 [R-c] 는 빨개질 수 있다(대조군 [R-d] 훈련 카드가 같은 가림 아래에서 여전히 초록이라야
   통과다 — 이 자가 «아무거나 빨개지는 자» 가 아님을 그 항이 지킨다). */
async function pixelRun(page) {
  const out = {};
  await page.evaluate(() => {
    if (document.getElementById('v491mask')) return;
    const st = document.createElement('style');
    st.id = 'v491mask';
    st.textContent = '#fxl{visibility:hidden!important}.fx-holding{outline:0!important}';
    document.head.appendChild(st);
  });
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
  /* 가림은 이 자 안에서만 산다 — 뒤에 오는 절이 이펙트 노드를 세므로 반드시 걷는다 */
  await page.evaluate(() => { const s = document.getElementById('v491mask'); if (s) s.remove(); }).catch(() => {});
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

  /* ── §6 4회차 — 홀드가 «자멸» 해도 손 밑에서 노드를 안 간다 ─────────────────────────────
     613 이식 — 옛 표본이던 [충전](보유분 전부 1발 → 자멸)이 폐지돼, 같은 성질을 **[단련] 행 +
     잔액 = 첫 비용 1발분**으로 만든다: 1발 사고 나면 재고가 없어 홀드가 ≈350ms 에 스스로 멎고,
     그 뒤에도 손은 눌려 있는데 서명(tstone·lv)은 이미 달라져 있다 — 옛 코드에서는 0.35초 주기의
     `renderTrainLive()` → `renderTemper()` 가 **누른 손 밑에서** 행을 갈아 끼웠다.
     그래서 이 절은 **자멸 시각을 훌쩍 넘긴 800ms** 에 묻는다 — 350ms 안에서만 물으면 옛 코드도 초록이다.
     ⚠ 반대 결함(«미뤄 놓고 영영 안 돈다»)도 같이 묻는다 — [6-d] 가 그 자리다. */
  const holdRun = async (pg) => {
    await pg.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain();
      setTrSub('temper'); S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
      S.tstone = 1; renderTrain(); });                 /* 비용 1 × 1발 뒤 자멸 */
    await pg.waitForTimeout(450);
    const g = await pg.evaluate(() => {
      const b = document.querySelector('#trTemper .tr-tp.k0 .tb');
      const hd = document.querySelector('#trTemper .tr-tp.k0');
      if (!b || !hd) return null;
      b.dataset.v491 = 'stamp';
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2,
               b: r.toJSON(), hd: hd.getBoundingClientRect().toJSON() };
    });
    if (!g) return null;
    const snap = () => pg.evaluate(() => {
      const el = document.querySelector('#trTemper .tr-tp.k0 .tb');
      return { same: !!(el && el.dataset && el.dataset.v491 === 'stamp'),
               dn: !!(el && el.classList.contains('jz-dn')),
               no: !!(el && el.classList.contains('no')) };
    });
    /* ⚑ 659·660 이관(작업 693) — «회당 피드백» 의 **잉크가 무엇인지**가 바뀌었다.
       659(주인 «단련 버튼 눌렀더니 숫자들 뜨는 연출 없애기 존나 후지다»)가 숫자 플로터를 폐지하고
       660 이 그 자리에 «강화 버튼에서 터지는 단련석 아이콘 버스트» 를 세웠다. 그래서 종전처럼
       `.fx-plus.hb` 를 세면 이 자는 **영영 빈 배열**을 본다(수리 전 실측: 130/800ms 둘 다 0장).
       ⇒ 묻는 뜻은 그대로 두고 **자리만 옮긴다**(333 처방 · [7-c2]·[7-d0] 과 같은 꼴):
         ① 회당 피드백의 **잉크**(이제 `s.fx-spark`)가 행 상자 «안» 이다 — 종전 `inHd` 그대로
         ② 회당 **맥박**(`jz-hb`)의 호스트가 **행**(`.tr-tp`) 이다 — 488 «호스트는 버튼이 아니라 행»
            의 축 자체. 맥박은 한 beat 뒤 스스로 꺼지므로 **표본 시각에 걸리면 놓친다** → 누르기
            «전»에 MutationObserver 를 걸어 붙은 횟수를 센다(플레이키 없음).
         ③ 음성항 — 폐지된 숫자 플로터가 되살아나면 빨갛다(방향을 못 박는다).
       ⚠ 이 절의 표본은 `S.tstone = 1`(1발 뒤 자멸)이라 beat 는 **첫 발 한 번**이다. */
    await pg.evaluate(() => {
      const hd = document.querySelector('#trTemper .tr-tp.k0');
      window.__v491hb = 0;
      if (!hd) return;
      new MutationObserver(ms => { for (const m of ms)
        if (m.target === hd && m.target.classList.contains('jz-hb')) window.__v491hb++; })
        .observe(hd, { attributes: true, attributeFilter: ['class'] });
    });
    await pg.mouse.move(g.x, g.y);
    await pg.mouse.down();
    await pg.waitForTimeout(130);
    const fx = await pg.evaluate(() => {
      const box = n => { const r = n.getBoundingClientRect();
                         return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const live = s => [...document.querySelectorAll(s)]
        .filter(n => +getComputedStyle(n).opacity > 0.08).map(box);
      return { spark: live('#fxl s.fx-spark'), plus: live('#fxl .fx-plus.hb'), hb: window.__v491hb || 0 };
    });
    await pg.waitForTimeout(670);                       /* 누적 800ms — 자멸(≈350ms) 을 넘긴다 */
    const held = await snap();
    await pg.mouse.up();
    await pg.waitForTimeout(650);                       /* 되튐 200 + 밀린 렌더 210 + 여유 */
    const after = await snap();
    return { g, fx, held, after };
  };
  {
    const h = await holdRun(page);
    ok(!!h, '[6-0] 단련 [단련] 버튼·행을 찾았다(613 이식 — 잔액 1발분 자멸 표본)');
    if (h) {
      ok(h.held.same, '[6-a] ★ 자멸 뒤에도(누른 채 800ms) **누른 그 노드**가 살아 있다', 'same=' + h.held.same);
      ok(h.held.dn, '[6-b] ★ 그동안 jz-dn(눌림)이 유지된다', 'dn=' + h.held.dn);
      ok(!h.held.no, '[6-c] 누르는 중에는 회색(.no)이 안 덮인다(3회차 jzNo 회귀)', 'no=' + h.held.no);
      ok(!h.after.same && h.after.no,
         '[6-d] ★ 손을 뗀 뒤에는 밀린 통짜 렌더가 **실제로 돌아** 정합이 맞는다(«영영 안 갱신» 의 반대 결함 없음 — 잔액 0 이라 회색이 옳다)',
         'same=' + h.after.same + ' no=' + h.after.no);
      const inHd = n => n.y >= h.g.hd.y - 1 && n.y + n.h <= h.g.hd.y + h.g.hd.height + 1
                     && n.x >= h.g.hd.x - 1 && n.x + n.w <= h.g.hd.x + h.g.hd.width + 1;
      const yr = a => a.length ? Math.round(Math.min(...a.map(n => n.y))) + '..'
                               + Math.round(Math.max(...a.map(n => n.y + n.h))) : '—';
      ok(h.fx.spark.length >= 1 && h.fx.spark.every(inHd),
         '[6-f] 회당 피드백의 **잉크**가 행(.tr-tp) 상자 안이다(488 규약 유지 · 659·660 이관 — 숫자 플로터 → 아이콘 버스트)',
         h.fx.spark.length + '알 y' + yr(h.fx.spark) + ' / 행 '
           + Math.round(h.g.hd.y) + '..' + Math.round(h.g.hd.y + h.g.hd.height));
      ok(h.fx.hb >= 1,
         '[6-g] 회당 **맥박**(`jz-hb`)의 호스트가 **행**(.tr-tp) 이다 — 488 «버튼이 아니라 행» 의 축(693 신설)',
         'jz-hb ' + h.fx.hb + '회');
      ok(h.fx.plus.length === 0,
         '[6-h] ★음성항 — 폐지된 숫자 플로터(`.fx-plus.hb`)는 0장이다(659 «존나 후지다» 가 지켜진다 · 693 신설)',
         h.fx.plus.length + '장');
    }
  }


  /* ── §7 7회차 — **호스트 눌림**과 **첫 발 가산 오버레이** ────────────────────────────────
     비평가 넷(CC·CD·CE·CF)이 연속으로 낸 ①축의 유일한 원인은 «눌린 순간 호스트가 0.0%» 였다.
     대조군 23 훈련은 «누른 것 = 호스트(카드)» 라 저절로 눌리는데, 룬·단련은 488 주인 지시대로
     «누르는 것은 버튼 · 답하는 것은 카드/행/헤더» 라 호스트가 한 픽셀도 안 움직였다.
     ⚠ 층을 갈라 묻는다(519 교훈) — ⓐ 소스에 목록이 있다 ⓑ 실제로 클래스가 붙는다
       ⓒ **찍힌 픽셀**로 호스트가 달라진다 ⓓ 대조군에는 **안** 붙는다(같은 `scale` 을 두고 싸우면 안 된다)
       ⓔ 첫 발에만 오버레이가 뜬다.
     ⚠ [7-c] 의 하한은 §3 의 `PX_MIN`(8%)을 그대로 쓰지 않는다 — 호스트는 998×88~700 으로 버튼보다
       훨씬 커서 같은 배율이라도 «달라진 픽셀 비율» 이 낮게 나온다(가장자리만 움직인다).
       .985 는 998폭에서 좌우 각 7.5px 이므로 998×88 헤더에서 이론 하한이 약 1.5% 다 ⇒ **1.0%** 로 둔다.
       수리 전 값은 예외 없이 **0.00%** 였으므로 이 값이면 «부품이 빠지면 반드시 걸린다». */
  const HOSTS = [
    { id: 'rune',    tab: 'rune',   btn: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',        n: '룬 [강화] → 카드 `.tr-rn`' },
    { id: 'tempup',  tab: 'temper', btn: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0',    n: '단련 [단련] → 행 `.tr-tp`' },
  ];
  const HOST_PX_MIN = 1.0;

  ok(/const JZ_HOST_SEL = '[^']*\.tr-rn[^']*\.tr-tp[^']*\.tr-card'/.test(src)
     && !/JZ_HOST_SEL = '[^']*tp-(hd|ft)/.test(src),
     '[7-a] 소스에 호스트 목록 `JZ_HOST_SEL` 이 있고 산 호스트만 적는다(613·614 — 헤더·회수 행 제외)');
  ok(/const h = el\.closest\(JZ_HOST_SEL\);\s*\n\s*return \(h && h !== el\) \? h : null;/.test(src),
     '[7-b] 호스트가 «누른 그 노드» 자신이면 안 고른다(같은 `scale` 을 두고 싸우지 않는다)');
  ok(/\.jz-hdn\{scale:\.985;translate:0 6px;filter:brightness\(1\.05\)\}/.test(src),
     '[7-c0] `.jz-hdn` 은 **정적 값**이다 — `animation` 단축을 안 쓴다(그 자리는 488 `jz-hb` 임자)');
  ok(/\.tr-rn,\.tr-tp\{transition:scale [^}]*translate/.test(src),
     '[7-c1] 살아 있는 호스트 둘이 같은 트랜지션 한 줄을 공유한다(뗌도 같은 곡선 · `.tr-card` 는 목록 밖)');
  /* ⚑ 579 이관 — 이 항은 «누름 부품의 **진폭**(.94 / 8px)이 안 바뀌었다» 를 묻는 자리다(25자리 회귀 0).
     종전에는 그 진폭이 `@keyframes jzDn` 안에 있어 키프레임 문자열을 그대로 물었는데, 579 가
     `.jz-dn` 을 **정적 값 + 트랜지션**으로 갈면서(이유는 여기 [7-c0] 과 같다 — 488 맥박이 `animation`
     단축의 임자다) 그 키프레임이 사라졌다. **묻는 뜻은 그대로 두고 자리만 옮긴다**(333 처방):
     진폭 두 값과 «`animation` 을 안 쓴다» 를 같이 못박는다 — 헐거워지지 않는다. */
  const dnRule = (src.match(/\.jz-dn\{([^}]*)\}/) || [])[1] || '';
  ok(/(^|;)scale:\.94(;|$)/.test(dnRule) && /(^|;)translate:0 8px(;|$)/.test(dnRule) && !/animation:/.test(dnRule),
     '[7-c2] 기존 누름 부품의 진폭(.94 / 8px)은 한 글자도 안 바뀌었다 — 25자리 회귀 0 (579: 정적 값)',
     dnRule.slice(0, 80));
  /* ⚑ 583 이관 — 종전 regex 는 `rtFirstFx(o.host)` 와 «`fxFlash` 다음이 `fxBurst`» 를 글자로 물었다.
     583 이 그 자리에 **화폐 축**을 얹으면서(주인 지시 «단련·룬도 전부 강화하는 화폐 아이콘으로»)
     인자와 부품 순서가 바뀐다. **묻는 뜻은 그대로 두고 자리만 옮긴다**(333 처방 · [7-c2] 와 같은 꼴) —
     ① 첫 발 자리에서 부른다 ② 대조군(`fxUpOk`)과 **같은 갈아 끼움 규칙**을 쓴다
        (화폐 알갱이가 서면 그것, 못 쏘면 종전 앰버 버스트가 그대로 바닥이다)
     ③ 화폐 키를 **자리마다 손으로 적지 않는다** — `PAY_CUR[o.tag]` 한 표에서 온다.
     ⇒ 헐거워지지 않는다: `fxBurst(h, FXPAL.up, 10)` 폴백이 사라지면 여기가 빨개진다. */
  /* ⚑ 619 이관 — 619(«연속 강화 때 이펙트가 매 강화마다») 가 이 두 조각을 **공용 부품 `upFx()`** 한 곳으로
     모았다(첫 발과 반복분이 다른 부품이면 ④ 일관성이 깨진다). 583 이관과 **같은 꼴**로 자리만 따라간다 —
     묻는 뜻 셋(① 첫 발 자리에서 부른다 ② 대조군과 같은 갈아 끼움 규칙 ③ 화폐 키는 `PAY_CUR` 한 표)은
     그대로다. 헐거워지지 않는다: `fxBurst(el, FXPAL.up, …)` 폴백이 사라지거나 첫 발이 10개를 안 쏘면 빨개진다. */
  /* 619 9회차 이관 — 플래시 대상이 `--flash-to` 신고를 지나 `fel` 이 됐다(신고 없으면 = el, 룬만
     아이콘으로 좁힘 — 전면 워시 방지). 갈아 끼움 사다리(플래시 → 알갱이 → 앰버 폴백)의 뜻은 그대로다. */
  /* ⚑ 619 11회차 이관 — 「타격 순간」 몫만 진한 앰버(`FXPAL.upNow`)가 됐다(크림 위 첫 발 대비 1.28:1 →
     2.60:1 · 비평가 EA·DX 2인). **333 처방 그대로 자리만 옮긴다** — 색이 개수와 **같은 `grain` 갈래**를
     타는 것까지 못박아 두므로 헐거워지지 않는다: 앰버 폴백이 사라져도, 색·개수 갈래가 어긋나도,
     첫 발이 `UPFX_NOW` 를 안 쏘아도 여기가 그대로 빨개진다. */
  /* ⚑ 658·660 이관(작업 693) — 종전 이 자리는 `fxSpend(cur, el)`(583 «알약 → 버튼» 화폐 비행)과
     `fxBurst(el, grain ? FXPAL.upNow : FXPAL.up, grain ? UPFX_NOW : cnt, true, iv)`(619 3·11·14회차)를
     **글자로** 물었다. 주인 지시 658(«골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다»)과
     660 이 그 둘을 걷어냈다 — 비행이 사라지자 «알갱이가 섰는가» 를 조건으로 하던 `grain` 갈래도
     물어볼 것이 없어졌고, `iv` 는 «버스트를 틱 안에서 끊지 마라»(주인 보강 2)로 **뜻이 뒤집혀**
     플래시에만 남았다. 자를 눌러 초록으로 되돌리지 않는다(328-330 이관 교훈) — 뜻은 그대로 두고
     **자리만 옮긴다**(333 처방 · [7-c2] 와 같은 꼴). 살아 있는 표본으로 물으면 이렇다:
       ① 첫 발 자리에서 부른다(`rtHoldStart` → `rtFirstFx`)
       ② 대조군과 **같은 공용 부품** `upFx()` 한 곳을 지난다(619)
       ③ **화폐 축이 살아 있다** — `cur` 가 버스트의 아이콘 인자로 끝까지 간다(583 의 뜻)
       ④ **스폰 자리 규약** — 버스트는 `fxBurstAt(el)`(= 호스트가 신고한 강화 버튼)에서 태어난다(660)
       ⑤ `iv` 는 플래시가 계속 받는다(619 14회차 축은 그 자리에 남아 있다)
     ⇒ 헐거워지지 않는다: `cur` 가 빠지면(=아이콘이 구슬로 되돌아가면) · `fxBurstAt` 가 빠지면
       (=버스트가 행/카드 통짜에서 태어나면) · 플래시가 `iv` 를 잃으면 여기가 그대로 빨개진다.
       그 셋을 [7-dR] 이 사본으로 직접 못박는다. */
  const D0 = [
    [/rtFirstFx\(o\.host, PAY_CUR\[o\.tag\], o\.key\);/, '첫 발 자리'],
    [/function rtFirstFx\(sel, cur, key\)\{[\s\S]{0,400}?upFx\(key \|\| \('first:' \+ sel\), sel, cur, 10\)/, '공용 부품'],
    [/function upFx\(key, host, cur, n, noFlash, iv\)\{[\s\S]{0,3200}?fxFlash\(fel, iv, true\)[\s\S]{0,2400}?fxBurst\(fxBurstAt\(el\), FXPAL\.up, cnt, true, null, cur \|\| null\)/, '화폐 축·스폰 자리'],
  ];
  ok(D0.every(([r]) => r.test(src)),
     '[7-d0] 첫 발 가산 오버레이가 `rtHoldStart` 의 **첫 발 자리**에서 대조군과 같은 부품을 쓴다(583 화폐 축 · 619 공용 부품 · 658·660 이관)',
     D0.filter(([r]) => !r.test(src)).map(([, n]) => n).join(',') || undefined);
  /* ⚑ 660·666 이관(작업 693) — 두 조각이 «표를 글자로 굳혀» 부패했다:
       ⓐ `PAY_CUR` 를 **닫는 중괄호까지** 물었는데 666(유물 소환 버스트)이 `relic:'relic'` 을 한 칸
         더했다. 이 항이 묻는 뜻은 «세 탭 키가 **한 표**에서 온다» 이지 «표가 세 칸이다» 가 아니다.
       ⓑ 셋째 인자를 `txt` 로 물었는데 660 이 그 숫자 플로터를 폐지해 `null` 이 됐다. 이 항이 묻는
         뜻은 «화폐 키(넷째 인자)가 **결제가 돌려준 값**(`bi0.cur`)이다» — 셋째 인자는 남의 축이다.
     ⇒ 표는 «칸이 있는가» 로, 호출은 «넷째가 `bi0.cur` 인가» 로 묻는다. 자리마다 문자열을 손으로
       적으면(예: `fxUpOk(card, card, null, 'gold', true)`) 그대로 빨개진다 — 그것이 이 항의 과녁이다. */
  const D1 = [
    [/const PAY_CUR = \{[^}]*\btrain:'gold'/, 'train'],
    [/const PAY_CUR = \{[^}]*\brune:'rstone'/, 'rune'],
    [/const PAY_CUR = \{[^}]*\btemper:'tstone'/, 'temper'],
    [/fxUpOk\(card, card, [^,()]+, bi0\.cur, true\)/, '대조군 호출'],
  ];
  ok(D1.every(([r]) => r.test(src)),
     '[7-d1] 583 — 대조군(훈련 카드)도 **같은 표**에서 화폐 키를 받는다(결제가 돌려준다 · 자리마다 문자열 금지)',
     D1.filter(([r]) => !r.test(src)).map(([, n]) => n).join(',') || undefined);
  /* ⚑ [7-dR] 되돌림 시험(693 신설) — 위 둘을 «무르게 풀지 않았다» 는 증명. 부품을 한 조각씩 뺀
     **소스 사본**에서 같은 자가 빨개지는지 본다(브라우저를 안 띄운다 — 소스 축이라 문자열로 족하다). */
  const dR = [
    ['화폐 축(`cur`)을 빼면', src.replace('fxBurst(fxBurstAt(el), FXPAL.up, cnt, true, null, cur || null)',
                                          'fxBurst(fxBurstAt(el), FXPAL.up, cnt, true, null, null)'), D0],
    ['스폰 자리(`fxBurstAt`)를 빼면', src.replace('fxBurst(fxBurstAt(el), FXPAL.up, cnt, true, null, cur || null)',
                                          'fxBurst(el, FXPAL.up, cnt, true, null, cur || null)'), D0],
    ['플래시가 `iv` 를 잃으면', src.replace('fxFlash(fel, iv, true)', 'fxFlash(fel, null, true)'), D0],
    ['화폐 키를 손으로 적으면', src.replace('fxUpOk(card, card, null, bi0.cur, true)',
                                          "fxUpOk(card, card, null, 'gold', true)"), D1],
  ];
  for (const [n, mut, set] of dR)
    ok(mut !== src && !set.every(([r]) => r.test(mut)),
       '[7-dR] ★되돌림 — ' + n + ' 자가 빨개진다(693 신설)');

  const c2 = await boot(browser, SRC);
  const pg = c2.page;
  for (const t of HOSTS) {
    await pg.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain();
      setTrSub(k); if (typeof setRuneSub === 'function') setRuneSub('r1'); S.tstone = 1e6; renderTrain(); }, t.tab);
    await pg.waitForTimeout(420);
    const g = await pg.evaluate(([b, hs]) => {
      const B = document.querySelector(b), H = document.querySelector(hs);
      if (!B || !H) return null;
      const rb = B.getBoundingClientRect(), rh = H.getBoundingClientRect();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      return { bx: rb.x + rb.width / 2, by: rb.y + rb.height / 2, h: rh.toJSON() };
    }, [t.btn, t.host]);
    ok(!!g, '[7-' + t.id + '-0] ' + t.n + ' — 버튼·호스트를 찾았다');
    if (!g) continue;
    const clip = { x: Math.max(0, g.h.x - 4), y: Math.max(0, g.h.y - 4),
                   width: Math.min(1080 - Math.max(0, g.h.x - 4), g.h.width + 8),
                   height: Math.min(2280 - Math.max(0, g.h.y - 4), g.h.height + 8) };
    const before = await pg.screenshot({ clip });
    const rest = await pg.evaluate(([hs, bs]) => {
      const H = document.querySelector(hs), B = document.querySelector(bs);
      return { hw: H ? H.getBoundingClientRect().width : 0, bw: B ? B.getBoundingClientRect().width : 0 };
    }, [t.host, t.btn]);
    await pg.mouse.move(g.bx, g.by);
    /* ⚑ 594 — **표본을 «한 점» 에서 «구간» 으로 옮긴다.** 7회차는 200ms 한 점의 bbox 비를 물었고
       그것이 이 자의 유일한 플레이키였다(PROGRESS 594 · 재현 `tools/probe594.js`).
       뿌리는 값이 아니라 **표본의 자리**다 — 홀드 반복은 `TR_HOLD_DELAY`(350ms)에 시작해
       60~160ms 마다 488 맥박(`jz-hb`, `transform:scale(1.02~1.06)` · .08s)을 다시 쏘고,
       그 맥박은 누름(`scale:.985`)과 **다른 속성이라 곱해진다**. 그래서 350ms 를 넘겨 읽은
       프레임은 ×0.9888 ~ ×1.0047 로 흩어진다. 200ms 가 초록이었던 것은 «.985 가 맞아서» 가
       아니라 **그 점이 아직 350ms 앞이라서**이고, `probe594` 실측 실경과는 **241~315ms**
       (여유 35~62ms) — 스크린샷 두 장이 끼는 이 자에서 그 여유는 부하 한 번에 사라진다.
       ⇒ rAF 전수 표본으로 갈고 축을 둘로 나눈다(579-④):
         ⓐ **화면에서 실제로 줄었는가** — 구간 **최솟값**. 맥박은 `scale ≥ 1` 로만 곱하므로
           최솟값이 곧 누름의 진폭이다(양쪽으로 조인다 — 빠지면 1.0, 세면 .94 라 둘 다 빨강).
         ⓑ **누름 부품이 캐스케이드를 이겼는가** — 맥박과 다른 속성인 computed `scale` 자신을
           홀드 **전 구간**에서 묻는다(7회차의 원래 결손 «클래스는 붙었는데 scale 이 none» 자리).
       ⚠ 수집은 `mouse.down` **전에** 걸어 둔다 — 스크린샷·픽셀 대조가 도는 동안에도 계속 찍혀야
         한다(그 사이가 곧 맥박 구간이다). 눌린 시각은 `__dn` 으로 따로 찍어 정착 프레임을 가른다. */
    const SWEEP = 900, SETTLE = 150;
    await pg.evaluate(([hs, bs, dur]) => {
      window.__sw = []; window.__dn = 0;
      const H = document.querySelector(hs), B = document.querySelector(bs);
      (function step(now) {
        const cs = getComputedStyle(H);
        window.__sw.push({ t: now, w: H.getBoundingClientRect().width,
                           bw: B ? B.getBoundingClientRect().width : 0, sc: cs.scale });
        if (!window.__dn || now - window.__dn < dur) requestAnimationFrame(step);
      })(performance.now());
    }, [t.host, t.btn, SWEEP]);
    await pg.mouse.down();
    await pg.evaluate(() => { window.__dn = performance.now(); });
    /* 오버레이(`fx-flash` .34s)와 클래스는 **이른 점**에서 읽어야 한다 — 그 축은 «떠 있는가» 라
       한 점이 맞다(구간으로 옮길 이유가 없고, .34s 안에 읽어야 한다). */
    await pg.waitForTimeout(200);
    const live = await pg.evaluate(([hs, bs]) => {
      const H = document.querySelector(hs), B = document.querySelector(bs);
      const L = document.getElementById('fxl');
      const fl = L ? L.querySelectorAll('.fx-flash').length : 0;
      const pt = L ? L.querySelectorAll('.fx-spark').length : 0;
      return { hdn: !!(H && H.classList.contains('jz-hdn')),
               dnOnHost: !!(H && H.classList.contains('jz-dn')),
               scale: H ? getComputedStyle(H).scale : null, flash: fl, part: pt,
               btnScale: B ? getComputedStyle(B).scale : null,
               hw: H ? H.getBoundingClientRect().width : 0,
               bw: B ? B.getBoundingClientRect().width : 0,
               all: L ? L.childElementCount : 0 };
    }, [t.host, t.btn]);
    const down = await pg.screenshot({ clip });
    const px = await diffPct(pg, before, down);
    /* 594 — 수집이 홀드 전 구간을 덮을 때까지 기다렸다가 거둔다(스크린샷이 이미 그 일부를 썼다) */
    await pg.waitForFunction(d => window.__dn && performance.now() - window.__dn >= d, SWEEP,
                             { timeout: SWEEP + 2000 });
    const sw = await pg.evaluate(() => ({ f: window.__sw, dn: window.__dn }));
    await release(pg);
    ok(live.hdn, '[7-' + t.id + '-a] 누른 채 호스트에 `jz-hdn` 이 붙는다', 'scale=' + live.scale);
    ok(!live.dnOnHost, '[7-' + t.id + '-b] 호스트에 `jz-dn`(.94)은 안 붙는다 — 어휘가 겹치지 않는다');
    /* ⚠ 7회차 함정 — 커스텀 속성은 **상속**된다. 호스트의 `--jz-s:.985` 가 그 안의 버튼까지
       내려가면 누름이 통째로 약해진다(첫 실행에서 실제로 0.985 로 찍혔다). 폴백은 상속을 못 막으므로
       `.jz-dn` 이 자기 값을 직접 적는다 — 그 못이 빠지면 여기가 빨개진다. */
    const dn0 = sw.dn || 0;
    const held = sw.f.filter(f => f.t >= dn0);                     /* 누른 뒤 프레임 */
    const settled = held.filter(f => f.t >= dn0 + SETTLE);         /* 들어가는 트랜지션(.07s)이 앉은 뒤 */
    const hrs = held.map(f => (rest.hw ? f.w / rest.hw : 0));
    const brs = held.map(f => (rest.bw ? f.bw / rest.bw : 0));
    const hMin = hrs.length ? Math.min(...hrs) : 0, bMin = brs.length ? Math.min(...brs) : 0;
    const scs = [...new Set(settled.map(f => f.sc))];
    /* ★ 전제 — 표본이 실제로 모였다. 없으면 아래 «최솟값» 축이 통째로 헛초록이 된다. */
    ok(held.length >= 8 && settled.length >= 4,
       '[7-' + t.id + '-b0] 전제 — 홀드 구간 rAF 표본이 모였다(최솟값 축이 «표본 0» 으로 헛초록이 되지 않는다)',
       '누른 뒤 ' + held.length + '프레임 · 정착 ' + settled.length + '프레임 / ' + SWEEP + 'ms');
    /* ★ ⓐ 화면 — 이 항이 7회차의 본체다. 첫 시안은 `animation:jzDn` 이라 488 `jz-hb`(맥박)가
       캐스케이드에서 이겨 «클래스는 붙어 있는데 호스트가 한 픽셀도 안 줄어드는» 상태였다.
       ⚠ 594 — **최솟값**이다(한 점이 아니다). 맥박은 `scale ≥ 1` 로만 곱하므로 구간 최솟값이 곧
         누름의 진폭이고, 양쪽으로 조인다: 부품이 빠지면 1.0 · `.94` 가 새어 들면 .94 라 둘 다 빨강. */
    ok(Math.abs(hMin - 0.985) <= 0.004,
       '[7-' + t.id + '-b3] ★★ 호스트 폭이 실제로 **.985 배**로 줄었다 — 홀드 구간 최솟값(594: 맥박과 곱해지므로 «한 점» 이 아니다)',
       p2(rest.hw) + ' → 최소 ' + p2(Math.min(...held.map(f => f.w))) + ' = ×' + Math.round(hMin * 10000) / 10000
       + ' (구간 ×' + Math.round(hMin * 1e4) / 1e4 + '~' + Math.round(Math.max(...hrs) * 1e4) / 1e4 + ')');
    /* ★ ⓑ 캐스케이드 — 맥박과 **다른 속성**인 자기 값으로 묻는다(579-④ⓐ). 맥박이 `animation` 을
       가져가 누름이 사라지면 여기는 `none` 이 되므로, 위 ⓐ 와 달리 **맥박 구간에서도** 답한다. */
    ok(scs.length === 1 && Math.abs(parseFloat(scs[0]) - 0.985) <= 0.0005,
       '[7-' + t.id + '-b3s] ★★ 누름 부품이 홀드 **전 구간** 자기 속성을 지킨다 — computed `scale` 이 정착 뒤 «.985» 한 값뿐(맥박이 `animation` 을 가져가면 `none` 이 된다)',
       scs.map(s => '«' + s + '»').join(' , ') + ' / ' + settled.length + '프레임');
    ok(bMin > 0.90 && bMin < 0.965,
       '[7-' + t.id + '-b2] ★ 누른 **버튼**은 여전히 .94 배다 — 호스트 진폭이 버튼까지 약하게 만들지 않았다(594: 같은 구간 최솟값)',
       p2(rest.bw) + ' → 최소 ' + p2(Math.min(...held.map(f => f.bw))) + ' = ×' + Math.round(bMin * 10000) / 10000);
    ok(px >= HOST_PX_MIN, '[7-' + t.id + '-c] ★ 찍힌 픽셀 — 호스트가 실제로 달라진다(수리 전 0.00%)',
       p2(px) + '% (하한 ' + HOST_PX_MIN + '%)');
    ok(live.all >= 1, '[7-' + t.id + '-d] 첫 발에 가산 오버레이가 `#fxl` 에 뜬다',
       'flash=' + live.flash + ' 파티클=' + live.part + ' 총 ' + live.all + '개');
  }

  /* ⓓ 대조군 — «누른 것 = 호스트» 라 `jz-hdn` 이 붙으면 안 된다(같은 `scale` 을 두고 싸운다) */
  await pg.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub('train'); renderTrain(); });
  await pg.waitForTimeout(420);
  const tg = await pg.evaluate(() => {
    const c = document.querySelector('#trCards [data-tr]'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (tg) {
    await pg.mouse.move(tg.x, tg.y);
    await pg.mouse.down();
    await pg.waitForTimeout(70);
    const tr = await pg.evaluate(() => {
      const c = document.querySelector('#trCards [data-tr]');
      return { dn: !!(c && c.classList.contains('jz-dn')), hdn: !!(c && c.classList.contains('jz-hdn')),
               scale: c ? getComputedStyle(c).scale : null };
    });
    await release(pg);
    ok(tr.dn && !tr.hdn,
       '[7-train] ★대조군 훈련 카드는 `jz-dn`(.94) 하나만 — `jz-hdn` 이 겹치지 않는다',
       'dn=' + tr.dn + ' hdn=' + tr.hdn + ' scale=' + tr.scale);

  }
  ok(c2.errs.length === 0, '[7-Z] §7 실행 중 콘솔 에러 0', c2.errs.slice(0, 2).join(' | '));

  /* ── §8 8회차 — **홀드 내내 유지되는 호스트 밝기**와 **최악 자릿수 자리** ────────────────
     ⓐ 7회차의 첫 발 오버레이(`fx-flash` .34s)는 340ms 에 꺼진다. 그 뒤 «누른 채» 구간(800ms)에서
       호스트가 idle 과 구별되지 않는 것이 CG·CH 2인 공통 ② 감점이었다. 재현이 뿌리를 짚었다 —
       800ms 에 대조군 `.tr-card` 는 `brightness(1.1)`(자기가 눌린 노드라 `jz-dn` 을 그대로 쓴다),
       세 표적 호스트는 `filter:none`. ⇒ `.jz-hdn` 이 같은 어휘를 1.05 로 준다.
     ⓑ 헤더 사다리 자리는 «단련 포인트 500»(세 자리) 기준이라 잔액이 자라면 숫자에 붙었다(CH 7px).
       **최악 자릿수**에서도 «`.pv` 잉크 우단 ↔ 버튼 좌단» 안에 들어가는지 직접 묻는다. */
  {
    const c3 = await boot(browser, SRC);
    const p3 = c3.page;
    await p3.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain();
      setTrSub('temper'); S.tstone = 1e6; renderTrain(); });
    await p3.waitForTimeout(420);
    const g3 = await p3.evaluate(() => {
      const B = document.querySelector('#trTemper .tr-tp.k0 .tb');
      const r = B.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await p3.mouse.move(g3.x, g3.y);
    await p3.mouse.down();
    await p3.waitForTimeout(800);                       /* 비평 캡처의 `-hold` 와 같은 시각 */
    const hold = await p3.evaluate(() => {
      const H = document.querySelector('#trTemper .tr-tp.k0');
      const L = document.getElementById('fxl');
      const cs = getComputedStyle(H);
      /* ⚑ 619 이관 — 이제 홀드 중에는 **회당 발화**(619)의 오버레이가 계속 새로 뜬다. 이 항이 묻던 것은
         «첫 발의 것이 아직 안 꺼졌는가» 이므로 «개수» 가 아니라 **나이**로 센다(첫 발 오버레이의 수명은
         `fxBye` 500ms — 800ms 시점에 그보다 늙은 노드가 하나라도 있으면 전제가 깨진 것이다). */
      const age = el => { try { const a = el.getAnimations()[0]; return a ? +a.currentTime : 1e9; } catch(_) { return 1e9; } };
      const fl = L ? [...L.querySelectorAll('.fx-flash')] : [];
      return { filter: cs.filter, scale: cs.scale,
               flash: fl.length, flashOld: fl.filter(e => age(e) > 500).length };
    });
    await p3.mouse.up();
    await p3.waitForTimeout(150);
    await p3.evaluate(() => { if (typeof rtHoldStop === 'function') rtHoldStop(false); });
    /* ★ «첫 발 오버레이가 이미 꺼진 시각» 이어야 이 항이 뜻을 갖는다 — 그것부터 못박는다 */
    ok(hold.flashOld === 0, '[8-a] 800ms 에는 첫 발 오버레이(`fx-flash`)가 이미 꺼져 있다(이 항의 전제 · 619 이관: 남은 것은 회당 발화)',
       'flash=' + hold.flash + ' 중 500ms 초과 ' + hold.flashOld);
    ok(/brightness\(1\.05\)/.test(hold.filter),
       '[8-b] ★ 그런데도 호스트는 **밝기를 유지**한다 — 눌린 채 800ms 에 idle 과 구별된다',
       'filter=' + hold.filter);
    ok(String(hold.scale).indexOf('0.985') === 0,
       '[8-c] 같은 시각에 스케일도 유지된다(.985)', 'scale=' + hold.scale);

    /* ⓑ(사다리 자릿수 자리)는 [충전] 헤더와 함께 폐지 — 기하 기록은 review 491 §31 */
    ok(c3.errs.length === 0, '[8-Z] §8 실행 중 콘솔 에러 0', c3.errs.slice(0, 2).join(' | '));
    await c3.ctx.close();
  }

  await c2.ctx.close();

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.slice(0, 3).join(' | '));
  await ctx.close();

  /* ── §R 되돌림 — 옛 순서로 되돌린 사본은 빨개져야 한다 ──
     ⚑ **4회차에 이 절의 사본이 한 겹 늘었다.** 4회차가 놓은 가드(`rtDownIn` — «손가락이 이 안을 누르고
     있으면 통짜 렌더를 미룬다»)는 1회차가 막던 «첫 프레임» 도 같이 덮는다(60 위임이 `#app` 캡처에서
     `jzDown` 을 먼저 세우므로, 홀드가 시작되는 그 프레임에도 이미 손이 눌려 있다). 그래서 **순서만**
     되돌린 사본은 이제 안 빨개진다 — 4회차 실행으로 확인했다(세 자리 alive=true · dn=true).
     자를 무르게 하지 않으려면 답은 둘 중 하나다: ⓐ 기대값을 낮춘다 ⓑ **두 겹을 다 걷어낸 사본**으로
     묻는다. ⓑ 를 쓴다 — 이 절이 지키는 것은 «이 방어가 통째로 없으면 반드시 빨개진다» 이지
     «1회차 한 줄만으로 빨개진다» 가 아니다. 1회차 축 자체는 §1 [1-b]·[1-c] 가 소스에서 계속 못박고,
     4회차 축 하나만 걷어낸 사본은 아래 §R2 가 따로 묻는다(두 축이 각각 살아 있다는 증명). */
  const revert0 = src.replace(
    /  rtHold = \{ tag:o\.tag[\s\S]*?rtHold\.timer = setTimeout\(rtHoldTick, TR_HOLD_DELAY\);/,
    `  if(!o.once()){ o.end(0, false); rtShake(o.sel); return; }
  o.live();
  rtHold = { tag:o.tag, sel:o.sel, once:o.once, live:o.live, end:o.end, n:1, iv:TR_HOLD_IV0, timer:0 };
  rtHold.timer = setTimeout(rtHoldTick, TR_HOLD_DELAY);`);
  const revert = revert0
    .replace("if(rtHoldOn('temper') || rtDownIn('#trTemper')){ liveTemper(); rtPendRender = 1; return; }",
             "if(rtHoldOn('temper')){ liveTemper(); return; }")
    .replace("if(rtHoldOn('rune') || rtDownIn('#trRunes')){ liveRunes(curId); rtPendRender = 1; return; }",
             "if(rtHoldOn('rune')){ liveRunes(curId); return; }");
  ok(revert !== src && revert !== revert0,
     '[R-0] 되돌림 사본을 만들었다(옛 순서 + 4회차 가드 제거 = 방어 두 겹을 다 걷어낸 상태)');
  fs.writeFileSync(NEG, revert);
  try {
    const b2 = await boot(browser, NEG);
    const back = await pixelRun(b2.page);
    const three = ['rune', 'tempup'];
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

  /* ── §R2 되돌림(4회차) — 가드를 «홀드가 도는가» 로 되돌린 사본은 §6 이 빨개져야 한다 ──
     이 자를 무르게 푸는 길은 하나뿐이다: [6-a] 를 **자멸 전(≈350ms 안)** 에 묻는 것. 그러면 옛 코드도
     초록이라 자가 죽는다. 그래서 «되돌리면 실제로 빨개지는가» 를 직접 실행해 못박는다. */
  {
    const rev2 = src.replace(/if\(rtHoldOn\('temper'\) \|\| rtDownIn\('#trTemper'\)\)\{ liveTemper\(\); rtPendRender = 1; return; \}/,
                             "if(rtHoldOn('temper')){ liveTemper(); return; }");
    ok(rev2 !== src, '[R2-0] 되돌림 사본을 만들었다(가드를 «홀드가 도는가» 로만 되돌린다)');
    fs.writeFileSync(NEG, rev2);
    try {
      const b3 = await boot(browser, NEG);
      const h2 = await holdRun(b3.page);
      ok(!!h2 && h2.held.same === false,
         '[R2-a] ★ 되돌린 사본에서는 자멸 뒤 800ms 에 «누른 그 노드» 가 죽는다(주기 렌더에 진다)',
         h2 ? 'same=' + h2.held.same : '표본 없음');
      ok(!!h2 && h2.held.dn === false, '[R2-b] 같은 사본에서 jz-dn 도 함께 사라진다',
         h2 ? 'dn=' + h2.held.dn : '표본 없음');
      await b3.ctx.close();
    } finally {
      try { fs.unlinkSync(NEG); } catch (_) {}
    }
  }

  /* ── §R3 되돌림(7회차) — 호스트 눌림을 걷어낸 사본은 §7 이 빨개져야 한다 ──
     ⚠ 무르게 푸는 길이 둘 있어 **둘 다 막는다**: ⓐ 클래스만 안 붙이는 사본(JS) ⓑ CSS 정적 값을
       종전 시안처럼 `animation` 으로 되돌린 사본. ⓑ 는 클래스가 **붙어 있는데도** 맥박에 져서
       scale 이 `none` 이 되는 자리라, [7-*-a](클래스 유무)만 묻는 자였으면 헛초록이 났다. */
  for (const R3 of [
    { n: 'ⓐ 클래스를 안 붙인다',
      rev: s0 => s0.replace("if(hst){ jzDownHost = hst; hst.classList.add('jz-hdn'); }", "if(hst){ jzDownHost = null; }") },
    { n: 'ⓑ 정적 값 → `animation`(맥박에 진다)',
      rev: s0 => s0.replace('.jz-hdn{scale:.985;translate:0 6px;filter:brightness(1.05)}',
                            '.jz-hdn{animation:jzDn .06s ease-out both}') },
  ]) {
    const rev3 = R3.rev(src);
    ok(rev3 !== src, '[R3-0] 되돌림 사본을 만들었다 — ' + R3.n);
    fs.writeFileSync(NEG, rev3);
    try {
      const b4 = await boot(browser, NEG);
      await b4.page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain();
        setTrSub('temper'); S.tstone = 1e6; renderTrain(); });
      await b4.page.waitForTimeout(420);
      const g4 = await b4.page.evaluate(() => {
        const B = document.querySelector('#trTemper .tr-tp.k0 .tb'); if (!B) return null;
        const r = B.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (g4) {
        await b4.page.mouse.move(g4.x, g4.y);
        const w0 = await b4.page.evaluate(() =>
          document.querySelector('#trTemper .tr-tp.k0').getBoundingClientRect().width);
        /* ⚠ ⓑ 사본은 «안 줄어든다» 가 아니라 **«고르지 않다»** 로 틀린다 — 맥박이 도는 프레임에는
           `jz-hb` 가 `animation` 을 가져가 누름이 통째로 사라지고, 맥박 사이에는 `jzDn` 이 이겨
           .94(호스트에는 너무 센 값)로 튄다.
           ⚑ 594 — 종전에는 «세 시각 중 하나라도 .985 가 아니면 빨강» 이었는데, 그것은 **성한 트리도
             만족한다**: 홀드 반복(350ms~)이 쏘는 맥박이 성한 트리의 폭도 ×0.9888~1.0047 로 흔들어
             (`probe594` [C2] 실측 — ⚑ 627 로 인용을 갱신했다: 옛 인용 «500ms **한 점**에서 tempup 7/8»
             은 위상이 물린 쌍봉이라 회차마다 0/8 ↔ 8/8 로 갈렸다. 지금 자는 같은 뜻을 **반복 구간
             rAF 전수**로 말한다: 홀드 2판을 모아 밴드 밖 프레임 rune 12~18% · tempup 85~86%, 최대 ×1.0047)
             세 점 중 하나는 늘 밴드를
             벗어난다 ⇒ **되돌림을 안 해도 초록인 항**이었다. §7 과 **같은 축**(구간 최솟값)으로 옮긴다:
             맥박은 `scale ≥ 1` 로만 곱하므로 최솟값은 흔들리지 않고, ⓐ 사본은 1.0 · ⓑ 사본은 .94 로
             내려가 둘 다 밴드 밖이다. */
        const SW3 = 900;
        await b4.page.evaluate(dur => {
          window.__sw = []; window.__dn = 0;
          const H = document.querySelector('#trTemper .tr-tp.k0');
          (function step(now) {
            window.__sw.push({ t: now, w: H.getBoundingClientRect().width });
            if (!window.__dn || now - window.__dn < dur) requestAnimationFrame(step);
          })(performance.now());
        }, SW3);
        await b4.page.mouse.down();
        await b4.page.evaluate(() => { window.__dn = performance.now(); });
        await b4.page.waitForFunction(d => window.__dn && performance.now() - window.__dn >= d, SW3,
                                      { timeout: SW3 + 2000 });
        const sw3 = await b4.page.evaluate(() => ({ f: window.__sw, dn: window.__dn }));
        const hdn3 = await b4.page.evaluate(() =>
          !!document.querySelector('#trTemper .tr-tp.k0').classList.contains('jz-hdn'));
        await b4.page.mouse.up();
        const rs = sw3.f.filter(f => f.t >= sw3.dn).map(f => (w0 ? f.w / w0 : 1));
        const mn = rs.length ? Math.min(...rs) : 1;
        ok(rs.length >= 8 && Math.abs(mn - 0.985) > 0.004,
           '[R3-a] ★ 되돌린 사본에서는 호스트가 «.985 배로» 줄지 않는다(구간 최솟값) — ' + R3.n,
           'hdn=' + hdn3 + ' · ' + rs.length + '프레임 · 최소 ×' + Math.round(mn * 10000) / 10000
           + ' · 최대 ×' + Math.round(Math.max(...rs) * 10000) / 10000);
      }
      await b4.ctx.close();
    } finally {
      try { fs.unlinkSync(NEG); } catch (_) {}
    }
  }

  /* ── §R4 되돌림(8회차) — 밝기를 걷어낸 사본은 «누른 채 800ms» 에서 idle 과 구별되지 않아야 한다 ──
     [8-b] 를 무르게 푸는 길은 하나뿐이다: «`fx-flash` 가 아직 살아 있는 시각» 에 묻는 것.
     그러면 오버레이가 대신 답해 밝기가 없어도 초록이다 — [8-a] 가 그 전제를 먼저 못박고,
     여기서는 **밝기만 뺀 사본**이 실제로 빨개지는지를 직접 실행해 본다. */
  {
    const rev4 = src.replace('.jz-hdn{scale:.985;translate:0 6px;filter:brightness(1.05)}',
                             '.jz-hdn{scale:.985;translate:0 6px}');
    ok(rev4 !== src, '[R4-0] 되돌림 사본을 만들었다(호스트 밝기만 걷어낸다)');
    fs.writeFileSync(NEG, rev4);
    try {
      const b5 = await boot(browser, NEG);
      await b5.page.evaluate(() => { if (!$('trw').classList.contains('on')) openTrain();
        setTrSub('temper'); S.tstone = 1e6; renderTrain(); });
      await b5.page.waitForTimeout(420);
      const g5 = await b5.page.evaluate(() => {
        const B = document.querySelector('#trTemper .tr-tp.k0 .tb');
        const r = B.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await b5.page.mouse.move(g5.x, g5.y);
      await b5.page.mouse.down();
      await b5.page.waitForTimeout(800);
      const h5 = await b5.page.evaluate(() => {
        const H = document.querySelector('#trTemper .tr-tp.k0');
        const L = document.getElementById('fxl');
        const age = el => { try { const a = el.getAnimations()[0]; return a ? +a.currentTime : 1e9; } catch(_) { return 1e9; } };
        const fl = L ? [...L.querySelectorAll('.fx-flash')] : [];
        return { filter: getComputedStyle(H).filter, flash: fl.length, flashOld: fl.filter(e => age(e) > 500).length };
      });
      await b5.page.mouse.up();
      /* 619 이관 — [8-a] 와 같은 자(나이). 이 절이 묻는 축은 **호스트 자신의 밝기**이고, 619 의 회당
         오버레이는 «호스트 위에 잠깐 뜨는 별개 노드» 라 그 축을 대신하지 못한다. 밝기가 살아 있으면 빨개진다. */
      ok(h5.flashOld === 0 && !/brightness/.test(h5.filter),
         '[R4-a] ★ 밝기를 뺀 사본은 800ms 에 **호스트 자신**의 구별(밝기)이 없다 — 첫 발 오버레이도 이미 꺼져 있다(619 이관)',
         'flash=' + h5.flash + ' filter=' + h5.filter);
      await b5.ctx.close();
    } finally {
      try { fs.unlinkSync(NEG); } catch (_) {}
    }
  }

  /* ── §R5 되돌림(693 신설) — §6 의 갈아 끼운 두 항([6-f] 잉크 · [6-g] 맥박)이 무르지 않다는 증명 ──
     659·660 이관으로 «세는 것» 이 숫자 플로터에서 버스트·맥박으로 바뀌었으니, 그 둘을 **한 조각씩
     빼 본다**. 종전 [6-f] 는 폐지된 부품을 세고 있어 «제품이 무엇을 하든» 빨갰다(= 아무것도 안 지켰다) —
     이 절이 그 반대(«부품이 빠지면 빨개진다»)를 직접 실행으로 못박는다.
     ⚠ 둘을 한 사본에서 같이 뺀다 — 두 항의 부품이 서로 다른 함수라 서로를 가리지 않는다
       (`rtFirstFx` = 첫 발 버스트 · `hbBeat` = 회당 맥박). */
  {
    const rev5 = src
      .replace('  rtFirstFx(o.host, PAY_CUR[o.tag], o.key);', '  /* R5 */')
      .replace('      hbBeat(host, true, null, null);', '      /* R5 */');
    ok(rev5 !== src && !/rtFirstFx\(o\.host/.test(rev5) && !/hbBeat\(host, true, null, null\)/.test(rev5),
       '[R5-0] 되돌림 사본을 만들었다(첫 발 버스트 · 회당 맥박을 둘 다 걷어낸 상태)');
    fs.writeFileSync(NEG, rev5);
    try {
      const b6 = await boot(browser, NEG);
      const h6 = await holdRun(b6.page);
      ok(!!h6 && h6.fx.spark.length === 0,
         '[R5-a] ★ 버스트를 뺀 사본에서는 회당 **잉크**가 0알이다 — [6-f] 가 실제로 그것을 세고 있다',
         h6 ? h6.fx.spark.length + '알' : '표본 없음');
      ok(!!h6 && h6.fx.hb === 0,
         '[R5-b] ★ 맥박을 뺀 사본에서는 `jz-hb` 가 0회다 — [6-g] 가 실제로 그것을 세고 있다',
         h6 ? h6.fx.hb + '회' : '표본 없음');
      await b6.ctx.close();
    } finally {
      try { fs.unlinkSync(NEG); } catch (_) {}
    }
  }

  console.log('\nVERIFY491 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
