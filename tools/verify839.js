#!/usr/bin/env node
/* 작업 839 게이트 — «배경이 pointer 인 오버레이의 «장식» 은 응답하지 않는다»
 *
 *   node tools/verify839.js
 *
 * 802 는 «누른 것 ↔ 답하는 것» 이 어긋난 **컨트롤**을 좁혔고, 그 폴백(«재걸음이 아무것도 못 찾으면
 * 옛 답을 그대로 쓴다»)이 **장식 그릇**까지 살려 줬다 — 리본 글자·타일·아이콘을 누르면
 * `.dcl-grp`·`.df-grp`·`.st-grp`·`.sm-rb`·`.upr-grp`·`.upr-close`·`.sm-close`(전부 1080px)가
 * 통째로 `scale:.94` 로 물러났다(수리 전 실측 **118자리** · `probe839` [1]).
 *
 * ⚑ 등재문이 «결함인지 «배경 탭» 사양인지 미판정» 으로 남겨 둔 것을 **재현이 갈랐다**:
 *   같은 오버레이의 **배경 자체는 무응답**이다(`probe839` [4] 다섯 전부 · 수리 전에도 그랬다).
 *   «아무 데나 누르면 닫힘» 이므로 장식을 누르는 것도 같은 배경 탭인데, 손가락이 리본 글자에 닿았는지
 *   빈 자리에 닿았는지로 답이 갈렸다 — 배경 탭의 응답이라면 배경에서도 나야 한다 ⇒ **사양이 아니라 결함**.
 *   ⇒ 등재문의 ⓐ(«장식은 응답하지 않는다»)를 채택했다(위임 규약 2026-09-01).
 *
 * 지키는 것 여섯:
 *   [A] 스코프 래칫 — 배경이 `cursor:pointer` 인 오버레이 목록(802 [A1] 과 **같은 다섯**).
 *       새 팝업이 배경 pointer 로 늘면 그 팝업의 장식도 이 병을 물려받으므로 여기서 먼저 빨개진다.
 *   [B] ★ 본체 — 다섯 오버레이 **전 노드** 스윕에서 «프레임 폭을 채우는 그릇» 이 답하는 자리 0건.
 *   [C] ★ 없애지 않았다 — 같은 스윕에서 **실컨트롤**은 한 자리도 호스트를 잃지 않는다(802 [D2] 의 짝).
 *   [D] 판정축 고정 — 배경 자체가 무응답이고 장식도 무응답 = **같은 손짓에 같은 답**.
 *   [E] 대조군 — 배경이 pointer 가 **아닌** 화면(89 유물·23 훈련·05 장비)에서는 답이 한 자리도 안 변한다.
 *   [R] 되돌림 시험 — 839 의 폭 가드만 지운 사본(= 802 상태)에서 [B] 가 **빨개지고**,
 *       같은 사본에서 [C]·[E] 는 초록이다(되돌림이 화면 전부가 아니라 **이 한 축**을 되돌린다 · 338 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

const OVL = [
  { id: 'sumw', n: '12 소환 결과',
    open: () => { const B = (typeof gmBan === 'function' && gmBan()) || 'weapon'; doSummon(B, 10); } },
  { id: 'upw', n: '09 일괄 강화 결과',
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
/* 배경이 pointer 가 **아닌** 화면 — 839 가 그쪽을 안 건드렸다는 증거(802 [E] 와 같은 셋). */
const PLAIN = [
  { id: 'relw', n: '89 유물 소환', open: () => openRelw() },
  { id: 'trw', n: '23 훈련', open: () => { openTrain(); renderTrain(); } },
  { id: 'wpnw', n: '05 장비', open: () => openWeapon(null, 'weapon') },
];
/* «컨트롤» 의 어휘 — 802 의 목록에서 `.sm-close`(터치하여 닫기 힌트 = 장식)만 빠졌다(839 이관). */
const CTRL_SEL = '[data-mul],.stab,.sm-b,.sm-sk,.ifbtn,.cbtn,button,[role="switch"]';

const HELPERS = function () {
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
    S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart();
  });
  await page.evaluate(HELPERS);
  return { ctx, page, errs };
}

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

/* 한 화면을 열고 **모든** 보이는 자손에서 호스트를 잰다 — 장식이 주제이므로 컨트롤만 봐서는 안 된다. */
async function sweep(page, site, ctrlOnly) {
  await reset(page);
  await page.evaluate(S2 => { try { eval('(' + S2 + ')').open(); } catch (_) {} }, `{open:${site.open}}`);
  await page.waitForTimeout(600);
  return page.evaluate(a => {
    const [id, sel, only] = a;
    const root = document.getElementById(id);
    if (!root) return { miss: true };
    const rr = root.getBoundingClientRect();
    if (!(rr.width > 0 && rr.height > 0)) return { miss: true };
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const rows = [];
    root.querySelectorAll(only ? sel : '*').forEach(el => {
      if (!vis(el)) return;
      const ctl = !!(el.tagName === 'BUTTON' || (el.matches && el.matches(sel)));
      const h = jzTarget(el);
      const hr = h ? h.getBoundingClientRect() : null;
      rows.push({
        el: window.__jzDesc(el), w: +el.getBoundingClientRect().width.toFixed(1), ctl,
        host: h ? window.__jzDesc(h) : null, hostW: hr ? +hr.width.toFixed(1) : null,
        self: h === el, quiet: h === null,
      });
    });
    const bg = jzTarget(root);
    return { miss: false, on: root.classList.contains('on'), rows,
             rootW: +rr.width.toFixed(1), bgQuiet: bg === null, bgHost: window.__jzDesc(bg) };
  }, [site.id, CTRL_SEL, !!ctrlOnly]);
}

async function run(file) {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, file);
  const out = { ovl: {}, plain: {}, bg: null, errs };
  out.bg = await page.evaluate(() => JZ_OVID.filter(id => {
    const e = document.getElementById(id);
    return e && getComputedStyle(e).cursor === 'pointer';
  }));
  for (const o of OVL) out.ovl[o.id] = await sweep(page, o);
  for (const p of PLAIN) out.plain[p.id] = await sweep(page, p, true);
  await ctx.close(); await browser.close();
  return out;
}

/* «프레임 폭을 채우는 그릇» 이 답한 자리 — 제품의 폭 가드와 **같은 눈금**(innerWidth 0.7)으로 센다. */
const GUARD = 1080 * 0.7;
function bigHosts(t) {
  const byName = new Map();
  let n = 0;
  for (const id of Object.keys(t.ovl)) {
    const r = t.ovl[id];
    if (r.miss) continue;
    r.rows.filter(x => x.host && !x.ctl && x.hostW > GUARD).forEach(x => {
      n++;
      const k = x.host.replace(/^div\./, '').split('.')[0];
      byName.set(k, (byName.get(k) || 0) + 1);
    });
  }
  return { n, byName };
}
function lostCtrls(t) {
  const out = [];
  for (const id of Object.keys(t.ovl)) {
    const r = t.ovl[id];
    if (r.miss) continue;
    r.rows.filter(x => x.ctl && x.quiet).forEach(x => out.push(id + ':' + x.el));
  }
  return out;
}

(async () => {
  const cur = await run(SRC);

  /* ── [A] 스코프 래칫 ── */
  const BG_EXPECT = ['upw', 'sumw', 'statw', 'defw', 'dclw'];
  console.log('[A] 배경이 cursor:pointer 인 오버레이 — 이 병이 사는 자리(802 [A1] 과 같은 다섯)');
  console.log('    · ' + cur.bg.join(' · '));
  ok(JSON.stringify(cur.bg.slice().sort()) === JSON.stringify(BG_EXPECT.slice().sort()),
     '[A1] 목록이 다섯 그대로다 — 늘면 그 팝업의 장식도 같은 병을 물려받는다',
     cur.bg.join(',') + ' vs ' + BG_EXPECT.join(','));

  /* ── [B] 본체 ── */
  console.log('[B] 다섯 오버레이 전 노드 — «프레임 폭을 채우는 그릇» 이 답하는 자리');
  const B = bigHosts(cur);
  OVL.forEach(o => {
    const r = cur.ovl[o.id];
    if (!r || r.miss || !r.on) { ok(false, '[B-' + o.id + '] 화면이 열린다 — ' + o.n,
      r && !r.miss && !r.on ? '보이지만 .on 이 아니다' : '안 열렸다'); return; }
    const big = r.rows.filter(x => x.host && !x.ctl && x.hostW > GUARD);
    console.log('    · ' + o.n.padEnd(18) + ' 노드 ' + String(r.rows.length).padStart(3)
      + '개 · 그릇이 답한 자리 ' + big.length);
    big.slice(0, 6).forEach(x => console.log('        ⚠ ' + x.el + '(' + x.w + 'px) → '
      + x.host + '(' + x.hostW + 'px)'));
    ok(true, '[B-' + o.id + '] 화면이 열린다 — ' + o.n, r.rows.length + '개 노드');
  });
  ok(B.n === 0, '[B★] 장식 그릇이 답하는 자리 0건 — 누른 것이 장식이면 배경과 같은 답(무응답)이다',
     B.n + '건' + (B.n ? ' · ' + [...B.byName].map(([k, c]) => k + '×' + c).join(' · ') : ''));

  /* ── [C] 없애지 않았다 ── */
  console.log('[C] 실컨트롤은 한 자리도 호스트를 잃지 않는다 — 802 [D2] 의 짝');
  const lost = lostCtrls(cur);
  let seen = 0, notSelf = [];
  OVL.forEach(o => {
    const r = cur.ovl[o.id];
    if (!r || r.miss) return;
    const cs = r.rows.filter(x => x.ctl);
    seen += cs.length;
    cs.filter(x => !x.self).forEach(x => notSelf.push(o.id + ':' + x.el + '→' + x.host));
    console.log('    · ' + o.n.padEnd(18) + ' 컨트롤 ' + String(cs.length).padStart(2)
      + '개 · 잃은 자리 ' + cs.filter(x => x.quiet).length);
  });
  ok(seen > 0, '[C0] 스윕이 실제로 컨트롤을 봤다', seen + '개');
  ok(lost.length === 0, '[C1] ★ 호스트를 잃은 컨트롤 0건 — 이 수리는 장식만 조용하게 한다',
     lost.join(' · ') || '0건');
  ok(notSelf.length === 0, '[C2] 컨트롤은 여전히 «자기 자신» 이 호스트다(802 가 세운 자리 그대로)',
     notSelf.join(' · ') || '0건');

  /* ── [D] 판정축 ── */
  console.log('[D] 판정축 — 배경 탭의 기준 응답(사양이라면 배경에서도 응답이 나야 한다)');
  OVL.forEach(o => {
    const r = cur.ovl[o.id];
    if (!r || r.miss) { ok(false, '[D-' + o.id + '] ' + o.n); return; }
    console.log('    · ' + o.n.padEnd(18) + ' 배경 = ' + (r.bgQuiet ? '무응답' : r.bgHost));
    ok(r.bgQuiet, '[D-' + o.id + '] ' + o.n + ' — 배경 자체가 무응답이다(장식이 맞춰야 할 기준)', r.bgHost);
  });

  /* ── [E] 대조군 ── */
  console.log('[E] 배경이 pointer 가 아닌 화면 — 839 는 그쪽을 안 건드렸다');
  PLAIN.forEach(p => {
    const r = cur.plain[p.id];
    if (!r || r.miss) { ok(false, '[E-' + p.id + '] 화면이 열린다 — ' + p.n); return; }
    const bad = r.rows.filter(x => x.quiet || !x.self);
    console.log('    · ' + p.n.padEnd(18) + ' 컨트롤 ' + String(r.rows.length).padStart(2)
      + '개 · 어긋난 자리 ' + bad.length);
    ok(r.rows.length > 0 && bad.length === 0,
       '[E-' + p.id + '] ' + p.n + ' — 컨트롤 전부가 여전히 자기 자신이 호스트다',
       bad.map(x => x.el + '→' + (x.host || 'null')).join(' · ') || r.rows.length + '개');
  });

  ok(cur.errs.length === 0, '[F] 콘솔 에러 0건', cur.errs.slice(0, 2).join(' | '));

  /* ── [R] 되돌림 시험 — 839 의 폭 가드만 지운 사본(= 802 상태) ── */
  console.log('[R] 되돌림 시험 — 839 의 폭 가드만 지운 사본');
  const src = fs.readFileSync(SRC, 'utf8');
  const HEAD = '  if(inner) return inner;';
  const TAIL = '  return w.best.getBoundingClientRect().width > innerWidth * 0.7 ? null : w.best;';
  const i0 = src.indexOf(HEAD), i1 = src.indexOf(TAIL, i0);
  ok(i0 > 0 && i1 > i0, '[R0] 전제 — 사본에서 갈아 끼울 자리를 찾았다');
  if (i0 > 0 && i1 > i0) {
    const tmp = path.join(ROOT, 'tools', '.verify839-revert.html');
    fs.writeFileSync(tmp, src.slice(0, i0) + '  return inner || w.best;' + src.slice(i1 + TAIL.length));
    try {
      const old = await run(tmp);
      const B0 = bigHosts(old);
      console.log('    · 되돌린 사본: 그릇이 답한 자리 ' + B0.n
        + (B0.n ? '  → ' + [...B0.byName].map(([k, c]) => k + '×' + c).join(' · ') : ''));
      ok(B0.n > 0, '[R1] ★ 되돌리면 [B★] 가 빨개진다 — 자가 이미 참인 것을 굳히고 있는 게 아니다',
         B0.n + '건');
      ok(lostCtrls(old).length === 0,
         '[R2] 되돌려도 컨트롤은 멀쩡하다 — 되돌림이 화면 전부가 아니라 **이 한 축**을 되돌린다',
         lostCtrls(old).join(' · ') || '0건');
      const pbad = PLAIN.filter(p => {
        const r = old.plain[p.id];
        return !r || r.miss || r.rows.some(x => x.quiet || !x.self);
      });
      ok(pbad.length === 0, '[R3] 되돌려도 대조군 셋은 그대로다 — 839 의 축은 배경 pointer 자리뿐이다',
         pbad.map(p => p.id).join(',') || '0건');
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  console.log('\nVERIFY839 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
