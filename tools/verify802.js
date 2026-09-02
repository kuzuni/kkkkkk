#!/usr/bin/env node
/* 작업 802 게이트 — «누른 것 ↔ 답하는 것» (60 쥬시 호스트가 배경 탭 선언에 오염되지 않는가)
 *
 *   node tools/verify802.js
 *
 * 지키는 것 여섯:
 *   [A] 스코프 래칫 — `JZ_OVID` 중 **배경이 `cursor:pointer`** 인 오버레이 목록(이 병이 사는 자리).
 *       새 팝업이 배경 pointer 로 늘면 여기서 먼저 빨개진다 = «다음 사람이 802 를 다시 겪지 않는다».
 *   [B] 802 본체 — 배수 바 **네 자리 전수**에서 칸을 누르면 호스트가 «그 칸» 이다.
 *   [C] 다섯 오버레이 전수 스윕 — 안의 컨트롤에서 «옛 걸음 ↔ 새 걸음» 을 나란히 재서
 *       어긋나던 자리가 **0건**이 됐는지, 그리고 수리가 실제로 몇 자리를 좁혔는지.
 *   [D] **좁히기만 한다** — 새 호스트는 언제나 옛 호스트와 같거나 그 자손이다(넓어진 자리 0 ·
 *       사라진 자리 0). 이 축이 «무르게 풀지 않았다» 의 반대편을 지킨다 — 멀쩡하던 누름을
 *       null 로 떨어뜨리는 수리는 여기서 빨개진다.
 *   [E] 대조군 — 배경이 pointer 가 **아닌** 화면(89 유물·23 훈련·05 장비)에서는 옛 답과 새 답이
 *       한 자리도 안 다르다 = 제품이 그쪽을 안 건드렸다.
 *   [R] 되돌림 시험 — `jzTarget` 의 «오염 재걸음» 을 지운 사본에서 [B] 의 12 결과 팝업 항이
 *       **빨개진다**(자가 이미 참인 것을 굳히고 있는 게 아님을 못박는다 · 338 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

/* 페이지 안에 심는 «옛 걸음» — 802 이전의 `jzTarget` 그대로다(대조군이자 되돌림의 눈금). */
const OLD_WALK = function () {
  window.__jzOld = function (t) {
    let best = null;
    for (let el = t, i = 0; el && el.nodeType === 1 && i < 8; el = el.parentElement, i++) {
      if (JZ_NOPRESS.has(el.id)) break;
      if (el.tagName === 'BUTTON' || jzDead(el)) return el;
      let c = ''; try { c = getComputedStyle(el).cursor; } catch (_) {}
      if (c !== 'pointer' && el.tagName !== 'BUTTON') { if (best) break; else continue; }
      const r = el.getBoundingClientRect();
      if (r.width > innerWidth * 0.7 && r.height > innerHeight * 0.3) break;
      best = el;
    }
    return best;
  };
  window.__jzDesc = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
    + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
};

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof jzTarget === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();   /* 73 ③ */
  });
  await page.evaluate(OLD_WALK);
  return { ctx, page, errs };
}

/* 배수 바 네 자리 — 797·802 재현기와 같은 진입점을 쓴다(자를 위해 새 경로를 만들지 않는다). */
const BARS = [
  { id: 'sumMulBar', n: '12 결과 팝업(713)', bg: 'pointer',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); } },
  { id: 'rwMulBar', n: '89 유물 소환(700)', bg: 'auto', open: () => openRelw() },
  { id: 'tpMulBar', n: '23 단련(701)', bg: 'auto',
    open: () => { openTrain(); setTrSub('temper'); renderTrain(); } },
  { id: 'rnMulBar', n: '23 룬(701)', bg: 'auto',
    open: () => { openTrain(); setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); } },
];

/* 배경이 pointer 인 다섯 오버레이 — 이 병이 사는 자리 전부를 실제로 열어 스윕한다. */
const OVL = [
  { id: 'sumw', n: '12 소환 결과',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); } },
  { id: 'upw', n: '09 일괄 강화 결과',
    /* 실제 경로 그대로 — 05 장비 시트를 열고 [일괄 강화] 를 누른다(골드는 boot 가 채웠다).
       한 종도 안 올랐으면(이미 만렙) 같은 목록으로 결과 팝업만 직접 세운다 = 칸은 진짜 장비다. */
    open: () => {
      openWeapon(null, 'weapon');
      const r = levelUpAll(wpnList());
      if (!openUpAll(r.ups)) openUpAll(wpnList().slice(0, 3).map(it => ({ it, from: 1, to: 5 })));
      closeWeapon();
    } },
  { id: 'statw', n: '17 스탯업 보너스',
    open: () => openStatUp({ ic: '⚔️', desc: '훈련 3 단계 달성! 모든 능력치 10%' }) },
  { id: 'defw', n: '18 패배', open: () => openDefeat() },
  { id: 'dclw', n: '31 던전 클리어', open: () => openDunClear(DUNGEONS[0], 1, false, false) },
];

/* 대조군 — 배경이 pointer 가 아닌 화면 셋. */
const PLAIN = [
  { id: 'relw', n: '89 유물 소환', open: () => openRelw() },
  { id: 'trw', n: '23 훈련', open: () => { openTrain(); renderTrain(); } },
  { id: 'wpnw', n: '05 장비', open: () => openWeapon(null, 'weapon') },
];

const CTRL_SEL = '[data-mul],.stab,.sm-b,.sm-sk,.sm-close,.ifbtn,.cbtn,button,[role="switch"]';

async function reset(page) {
  await page.evaluate(() => {
    ['closeSummonResult', 'closeRelw', 'closeTrain', 'closeModal', 'closeUpAll', 'closeDunClear']
      .forEach(f => { try { window[f] && window[f](); } catch (_) {} });
    ['statw', 'defw', 'upw', 'dclw'].forEach(id => {
      const e = document.getElementById(id); if (e) e.classList.remove('on');
    });
    S.gold = 1e18; S.dia = 1e12; S.relic = 1e12; S.tstone = 1e12; S.rstone = 1e12;
  });
  await page.waitForTimeout(180);
}

/* 한 화면을 열고 그 안 컨트롤 전수에서 «옛 답 ↔ 새 답» 을 나란히 잰다. */
async function sweep(page, site, scope) {
  await reset(page);
  await page.evaluate(S2 => { try { eval('(' + S2 + ')').open(); } catch (_) {} }, `{open:${site.open}}`);
  await page.waitForTimeout(600);
  return page.evaluate(a => {
    const [scopeId, sel] = a;
    const root = document.getElementById(scopeId);
    if (!root) return { miss: true };
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    if (!vis(root)) return { miss: true };
    const on = root.classList.contains('on');
    const rows = [];
    root.querySelectorAll(sel).forEach(el => {
      if (!vis(el)) return;
      const o = window.__jzOld(el), n = jzTarget(el);
      const orr = o ? o.getBoundingClientRect() : null, nr = n ? n.getBoundingClientRect() : null;
      rows.push({
        el: window.__jzDesc(el), w: +el.getBoundingClientRect().width.toFixed(1),
        old: window.__jzDesc(o), oldW: orr ? +orr.width.toFixed(1) : null, oldSelf: o === el,
        neu: window.__jzDesc(n), newW: nr ? +nr.width.toFixed(1) : null, newSelf: n === el,
        same: o === n,
        /* 좁히기만 했는가 — 새 호스트가 옛 호스트와 같거나 그 «자손» 인가 */
        inside: !!(o && n && (o === n || o.contains(n))),
        lost: !!(o && !n),
      });
    });
    return { miss: false, on, rows };
  }, [scope || site.id, CTRL_SEL]);
}

async function run(file, label, quiet) {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, file);
  const out = { bars: {}, ovl: {}, plain: {}, bg: null, errs };

  out.bg = await page.evaluate(() => JZ_OVID.filter(id => {
    const e = document.getElementById(id);
    return e && getComputedStyle(e).cursor === 'pointer';
  }));

  for (const b of BARS) {
    await reset(page);
    await page.evaluate(S2 => { try { eval('(' + S2 + ')').open(); } catch (_) {} }, `{open:${b.open}}`);
    await page.waitForTimeout(600);
    out.bars[b.id] = await page.evaluate(id => {
      const bar = document.getElementById(id);
      if (!bar) return { miss: true };
      const cell = bar.querySelector('[data-mul]:not(.on)') || bar.querySelector('[data-mul]');
      if (!cell) return { miss: true };
      const h = jzTarget(cell), o = window.__jzOld(cell);
      const cr = cell.getBoundingClientRect(), hr = h ? h.getBoundingClientRect() : null;
      return { miss: false, self: h === cell, oldSelf: o === cell,
               cellW: +cr.width.toFixed(1), hostW: hr ? +hr.width.toFixed(1) : null,
               host: window.__jzDesc(h), old: window.__jzDesc(o) };
    }, b.id);
  }
  for (const o of OVL) out.ovl[o.id] = await sweep(page, o);
  for (const p of PLAIN) out.plain[p.id] = await sweep(page, p);

  await ctx.close(); await browser.close();
  return out;
}

(async () => {
  const cur = await run(SRC, '현재 트리');

  /* ── [A] 스코프 래칫 ── */
  const BG_EXPECT = ['upw', 'sumw', 'statw', 'defw', 'dclw'];
  console.log('[A] 배경이 cursor:pointer 인 오버레이(이 병이 사는 자리)');
  console.log('    · ' + cur.bg.join(' · '));
  ok(JSON.stringify(cur.bg.slice().sort()) === JSON.stringify(BG_EXPECT.slice().sort()),
     '[A1] 목록이 다섯 그대로다 — 늘었으면 그 팝업도 802 의 식구다',
     cur.bg.join(',') + ' vs ' + BG_EXPECT.join(','));

  /* ── [B] 802 본체 ── */
  console.log('[B] 배수 바 네 자리 — 칸을 누르면 호스트가 «그 칸» 인가');
  BARS.forEach(b => {
    const r = cur.bars[b.id];
    if (!r || r.miss) { ok(false, '[B-' + b.id + '] 바·칸이 실재한다 — ' + b.n); return; }
    console.log('    · ' + b.n.padEnd(20) + ' 칸 ' + r.cellW + 'px → ' + r.host + '(' + r.hostW + 'px)'
      + '   (옛 걸음: ' + r.old + ')');
    ok(r.self, '[B-' + b.id + '] ' + b.n + ' — 호스트 = 누른 칸', r.host + ' ' + r.hostW + 'px');
  });
  ok(cur.bars.sumMulBar && !cur.bars.sumMulBar.oldSelf,
     '[B★] 12 결과 팝업은 **옛 걸음으로는 빨갛다**(자가 이미 참인 것을 굳히는 게 아니다)',
     cur.bars.sumMulBar ? '옛 호스트 ' + cur.bars.sumMulBar.old : '—');

  /* ── [C]·[D] 다섯 오버레이 전수 ── */
  console.log('[C] 배경 pointer 오버레이 다섯 — 안의 컨트롤 전수(옛 걸음 ↔ 새 걸음)');
  let narrowed = 0, widened = 0, lost = 0, mismatch = 0, seen = 0;
  OVL.forEach(o => {
    const r = cur.ovl[o.id];
    if (!r || r.miss || !r.on) { ok(false, '[C-' + o.id + '] 화면이 열린다 — ' + o.n,
      r && !r.miss && !r.on ? '보이지만 .on 이 아니다' : '안 열렸다'); return; }
    ok(true, '[C-' + o.id + '] 화면이 열린다 — ' + o.n, r.rows.length + '개 컨트롤');
    const bad = r.rows.filter(x => !x.newSelf);
    const nar = r.rows.filter(x => !x.same);
    seen += r.rows.length; narrowed += nar.length;
    widened += r.rows.filter(x => !x.inside && !x.lost && !x.same).length;
    lost += r.rows.filter(x => x.lost).length;
    mismatch += bad.length;
    console.log('    · ' + o.n.padEnd(18) + ' 컨트롤 ' + String(r.rows.length).padStart(3)
      + '개 · 좁혀진 자리 ' + nar.length + ' · 새 걸음에서 어긋난 자리 ' + bad.length);
    nar.forEach(x => console.log('        ↳ ' + x.el + '(' + x.w + 'px): '
      + x.old + '(' + x.oldW + ') → ' + x.neu + '(' + x.newW + ')'));
    bad.forEach(x => console.log('        ⚠ ' + x.el + '(' + x.w + 'px) → ' + x.neu + '(' + x.newW + ')'));
  });
  ok(seen > 0, '[C0] 스윕이 실제로 컨트롤을 봤다', seen + '개');
  ok(mismatch === 0, '[C1] ★ 다섯 오버레이 안에 «누른 것 ↔ 답하는 것» 이 어긋난 컨트롤 0건', mismatch + '건');
  ok(narrowed > 0, '[C2] ★ 수리가 실제로 좁힌 자리가 있다(있어야 이 자가 무엇을 지키는지가 참이다)',
     narrowed + '건');
  ok(widened === 0, '[D1] ★ 넓어진 자리 0건 — 새 호스트는 옛 호스트와 같거나 그 자손이다', widened + '건');
  ok(lost === 0, '[D2] ★ 사라진 자리 0건 — 멀쩡하던 누름을 null 로 떨어뜨리지 않았다', lost + '건');

  /* ── [E] 대조군 ── */
  console.log('[E] 배경이 pointer 가 아닌 화면 — 옛 답과 새 답이 완전히 같아야 한다');
  PLAIN.forEach(p => {
    const r = cur.plain[p.id];
    if (!r || r.miss) { ok(false, '[E-' + p.id + '] 화면이 열린다 — ' + p.n); return; }
    const diff = r.rows.filter(x => !x.same);
    console.log('    · ' + p.n.padEnd(18) + ' 컨트롤 ' + String(r.rows.length).padStart(3) + '개 · 달라진 자리 ' + diff.length);
    diff.forEach(x => console.log('        ⚠ ' + x.el + ': ' + x.old + ' → ' + x.neu));
    ok(diff.length === 0, '[E-' + p.id + '] ' + p.n + ' — 옛 답과 새 답이 같다', diff.length + '건');
  });

  ok(cur.errs.length === 0, '[F] 콘솔 에러 0건', cur.errs.slice(0, 2).join(' | '));

  /* ── [R] 되돌림 시험 ── */
  console.log('[R] 되돌림 시험 — «오염 재걸음» 을 지운 사본');
  const src = fs.readFileSync(SRC, 'utf8');
  const HEAD = 'function jzTarget(t){\n  const w = jzWalk(t);';
  const TAIL = '  return inner || w.best;\n}';
  const i0 = src.indexOf(HEAD), i1 = src.indexOf(TAIL, i0);
  ok(i0 > 0 && i1 > i0, '[R0] 전제 — 사본에서 갈아 끼울 자리를 찾았다');
  if (i0 > 0 && i1 > i0) {
    const tmp = path.join(ROOT, 'tools', '.verify802-revert.html');
    const rev = src.slice(0, i0)
      + 'function jzTarget(t){\n  return jzWalk(t).best;\n}'
      + src.slice(i1 + TAIL.length);
    fs.writeFileSync(tmp, rev);
    try {
      const old = await run(tmp, '되돌린 사본');
      const r = old.bars.sumMulBar;
      console.log('    · 되돌린 사본의 12 결과 팝업 호스트: ' + (r ? r.host + '(' + r.hostW + 'px)' : '—'));
      ok(!!r && !r.miss && !r.self, '[R1] ★ 되돌리면 12 결과 팝업이 «바 전체» 로 되돌아간다(빨강)',
         r ? r.host : '—');
      ok(!!old.bars.rwMulBar && old.bars.rwMulBar.self,
         '[R2] 되돌려도 대조군 세 자리는 초록이다 — 되돌림이 화면 전부를 깨는 게 아니다',
         old.bars.rwMulBar ? old.bars.rwMulBar.host : '—');
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  console.log('\nVERIFY802 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
