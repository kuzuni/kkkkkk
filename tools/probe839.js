#!/usr/bin/env node
/* 작업 839 재현기 — «배경이 pointer 인 오버레이 다섯의 «장식» 노드는 여전히 1080px 그릇이 답한다»
 *
 *   node tools/probe839.js
 *
 * 등재문(PROGRESS 839 · review 802 §5)의 주장:
 *   리본 글자·타일·아이콘 같은 **장식** 노드를 누르면 `div.dcl-grp`·`div.df-grp`·`div.st-grp`·
 *   `div.sm-rb`·`div.upr-grp`·`div.upr-close`(전부 1080px)가 호스트로 나와 `scale:.94` 로 물러난다.
 *   802 의 재걸음은 이 자리들을 못 좁힌다 — 오염을 끊고 다시 걸어도 **아무것도 안 나와서**
 *   폴백(«옛 답을 그대로 쓴다»)이 그릇을 도로 돌려주기 때문이다.
 *   등재문은 이것을 «결함인지 «배경 탭» 사양인지 **미판정**» 으로 남겨 두었다.
 *
 * 338 규칙 — 처방을 쓰기 전에 무엇이 참인지부터 못박는다. 축 넷:
 *   [1] 등재문의 여섯 이름이 실제로 호스트로 나오는가(수리 전 트리 실측 · 폭까지)
 *   [2] 그 호스트가 cursor:pointer 를 **스스로 선언**했는가, 배경에서 **물려받기만** 했는가
 *       (= 802 가 «중간 그릇» 이라고 부른 그것인가. 배경 선언만 인라인으로 끄고 다시 재서 가른다)
 *   [3] 대가가 눈에 보이는가 — 장식 노드를 실제로 pointerdown 했을 때 `.jz-dn` 이 붙는 노드와 그 폭
 *   [4] 같은 오버레이의 **배경 자체**를 눌렀을 때의 답 — «배경 탭» 의 기준 응답이 무엇인가
 *       (등재문의 ⓐ/ⓑ 를 가르는 축이다: 배경이 무응답이면 장식만 응답하는 것이 **불일치**다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? '  [' + d + ']' : '')); };

/* 등재문이 이름으로 적어 둔 여섯 그릇 */
const NAMED = ['dcl-grp', 'df-grp', 'st-grp', 'sm-rb', 'upr-grp', 'upr-close'];

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

const HELPERS = function () {
  window.__jzDesc = n => !n ? '—' : (n.id ? '#' + n.id : (n.tagName || '?').toLowerCase()
    + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
  /* 배경(오버레이) 의 cursor 선언만 잠깐 끄고 노드가 여전히 pointer 인가 — 802 와 같은 손 */
  window.__declares = function (root, el) {
    const s = root.style, old = s.getPropertyValue('cursor'), pr = s.getPropertyPriority('cursor');
    s.setProperty('cursor', 'auto', 'important');
    let c = ''; try { c = getComputedStyle(el).cursor; } catch (_) {}
    if (old) s.setProperty('cursor', old, pr); else s.removeProperty('cursor');
    return c === 'pointer';
  };
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
    S.gold = 1e18; S.dia = 1e12; S.relic = 1e12;
  });
  await page.waitForTimeout(180);
}

/* 한 오버레이를 열고 **모든** 보이는 자손에서 호스트를 잰다(컨트롤만이 아니다 — 장식이 주제다) */
async function sweep(page, site) {
  await reset(page);
  await page.evaluate(S2 => { try { eval('(' + S2 + ')').open(); } catch (_) {} }, `{open:${site.open}}`);
  await page.waitForTimeout(600);
  return page.evaluate(id => {
    const root = document.getElementById(id);
    if (!root) return { miss: true };
    const rr = root.getBoundingClientRect();
    if (!(rr.width > 0 && rr.height > 0)) return { miss: true };
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const rows = [];
    root.querySelectorAll('*').forEach(el => {
      if (!vis(el)) return;
      const h = jzTarget(el);
      if (!h) { rows.push({ el: window.__jzDesc(el), host: null }); return; }
      const hr = h.getBoundingClientRect(), er = el.getBoundingClientRect();
      rows.push({
        el: window.__jzDesc(el), elW: +er.width.toFixed(1),
        host: window.__jzDesc(h), hostW: +hr.width.toFixed(1),
        self: h === el,
        /* 호스트가 pointer 를 스스로 선언했는가(배경 선언을 끈 채로 물어본다) */
        decl: window.__declares(root, h),
        /* 눌린 노드 자신이 «컨트롤 어휘» 를 갖고 있는가 — 장식 판정의 보조축 */
        ctl: !!(el.tagName === 'BUTTON' || (el.matches && el.matches('[data-mul],.stab,.sm-b,.sm-sk,.sm-close,.ifbtn,.cbtn,button,[role="switch"]'))),
      });
    });
    /* [4] 배경 자체를 눌렀을 때 */
    const bg = jzTarget(root);
    return { miss: false, rows, bgHost: window.__jzDesc(bg), bgNull: bg === null,
             rootW: +rr.width.toFixed(1) };
  }, site.id);
}

/* [3] 실제 pointerdown 으로 `.jz-dn` 이 어디에 붙는지 — 자가 아니라 «그려진 것» 을 본다 */
async function pressed(page, site, sel) {
  await reset(page);
  await page.evaluate(S2 => { try { eval('(' + S2 + ')').open(); } catch (_) {} }, `{open:${site.open}}`);
  await page.waitForTimeout(600);
  return page.evaluate(a => {
    const [id, s] = a;
    const root = document.getElementById(id);
    const el = root && root.querySelector(s);
    if (!el) return { miss: true };
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true }));
    const dn = [...document.querySelectorAll('.jz-dn')].map(n => ({
      d: window.__jzDesc(n), w: +n.getBoundingClientRect().width.toFixed(1) }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }));
    return { miss: false, el: window.__jzDesc(el), elW: +r.width.toFixed(1), dn };
  }, [site.id, sel]);
}

const PRESS = [
  { i: 4, sel: '.dcl-grp *', n: '31 던전 클리어 리본 글자' },
  { i: 3, sel: '.df-grp *', n: '18 패배 장식' },
  { i: 0, sel: '.sm-rb *', n: '12 소환 결과 리본' },
];

/* 한 트리를 통째로 재서 돌려준다 — 현재 트리와 «839 를 되돌린 사본» 을 나란히 놓는다. */
async function run(file) {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await boot(browser, file);
  const out = { ovl: {}, press: [], errs };
  for (const o of OVL) out.ovl[o.id] = await sweep(page, o);
  for (const p of PRESS) out.press.push({ n: p.n, r: await pressed(page, OVL[p.i], p.sel) });
  await ctx.close(); await browser.close();
  return out;
}

/* 1080급 그릇이 답한 자리를 센다(그릇 이름별로). */
function bigOf(t) {
  const named = new Map();
  let n = 0, decl = 0;
  for (const id of Object.keys(t.ovl)) {
    const r = t.ovl[id];
    if (r.miss) continue;
    const big = r.rows.filter(x => x.host && x.hostW >= r.rootW * 0.9 && !x.ctl);
    n += big.length; decl += big.filter(x => x.decl).length;
    big.forEach(x => {
      const k = x.host.replace(/^div\./, '').split('.')[0];
      if (!named.has(k)) named.set(k, { w: x.hostW, n: 0, ov: id });
      named.get(k).n++;
    });
  }
  return { n, decl, named };
}

(async () => {
  const cur = await run(SRC);

  /* 839 를 되돌린 사본 — 802 의 폴백(«옛 답을 그대로 쓴다»)만 되살린다. */
  const fs = require('fs');
  const src = fs.readFileSync(SRC, 'utf8');
  const HEAD = '  if(inner) return inner;';
  const TAIL = '  return w.best.getBoundingClientRect().width > innerWidth * 0.7 ? null : w.best;';
  const i0 = src.indexOf(HEAD), i1 = src.indexOf(TAIL, i0);
  ok(i0 > 0 && i1 > i0, '[0] 전제 — 사본에서 839 의 폭 가드를 찾았다');
  const tmp = path.join(path.resolve(__dirname, '..'), 'tools', '.probe839-revert.html');
  fs.writeFileSync(tmp, src.slice(0, i0) + '  return inner || w.best;' + src.slice(i1 + TAIL.length));
  let old;
  try { old = await run(tmp); } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

  const B0 = bigOf(old), B1 = bigOf(cur);

  console.log('[1] 등재문의 «장식 노드 → 1080px 그릇» — 되돌린 사본(= 수리 전)에서 재현되는가');
  console.log('    · 되돌린 사본: 1080급 그릇이 답한 자리 ' + B0.n
    + '  → ' + [...B0.named].map(([k, v]) => k + '×' + v.n).join(' · '));
  ok(B0.n > 0, '[1a] 수리 전에는 1080급 그릇이 답하는 자리가 실재한다(등재문 확인)', B0.n + '자리');
  NAMED.forEach(k => ok(B0.named.has(k),
    '[1-' + k + '] 등재문이 이름으로 적은 그릇 «' + k + '» 이 실제로 호스트였다',
    B0.named.has(k) ? B0.named.get(k).w + 'px · 자손 ' + B0.named.get(k).n + '자리' : '안 나온다'));

  console.log('[2] 뿌리 — 그 그릇은 pointer 를 «스스로 선언» 했는가(802 의 «중간 그릇» 인가)');
  console.log('    · 수리 전 ' + B0.n + '자리 중 «스스로 선언» 한 것 ' + B0.decl);
  ok(B0.decl === 0, '[2] 그 그릇은 **한 자리도** 스스로 선언하지 않았다 = 물려받기만 한 중간 그릇',
     B0.decl + '자리가 선언');

  console.log('[3] 실제 pointerdown — 눌린 것과 물러나는 것(사본 ↔ 현재)');
  PRESS.forEach((p, k) => {
    const o = old.press[k].r, c = cur.press[k].r;
    if (o.miss || c.miss) { ok(false, '[3-' + p.n + '] 표본이 실재한다'); return; }
    console.log('    · ' + p.n.padEnd(24) + ' 누른 것 ' + c.el + '(' + c.elW + 'px)'
      + '  수리 전 jz-dn ' + (o.dn.length ? o.dn.map(d => d.d + '(' + d.w + 'px)').join(' · ') : '없음')
      + '  → 현재 ' + (c.dn.length ? c.dn.map(d => d.d + '(' + d.w + 'px)').join(' · ') : '없음'));
    ok(o.dn.some(d => d.w >= 1000), '[3a-' + p.n + '] 수리 전에는 1000px 급 노드가 실제로 물러났다',
       o.dn.map(d => d.w).join(',') || '없음');
    ok(c.dn.length === 0, '[3b-' + p.n + '] ★ 지금은 아무것도 안 물러난다 = 배경 탭과 같은 답',
       c.dn.map(d => d.d).join(',') || '없음');
  });

  console.log('[4] 판정축 — «배경 탭» 의 기준 응답(사양이라면 배경에서도 나야 한다)');
  for (const o of OVL) {
    const r = cur.ovl[o.id], r0 = old.ovl[o.id];
    if (r.miss) { ok(false, '[4-' + o.id + '] ' + o.n + ' 오버레이가 열린다'); continue; }
    console.log('    · ' + o.n.padEnd(16) + ' 배경 호스트 = ' + (r.bgNull ? '없음(무응답)' : r.bgHost)
      + '  (수리 전에도 ' + (r0.miss ? '?' : (r0.bgNull ? '무응답' : r0.bgHost)) + ')');
    ok(r.bgNull && (r0.miss || r0.bgNull),
       '[4-' + o.id + '] 배경 자체는 수리 전에도 지금도 **무응답** — 장식만 응답한 것은 사양이 아니다',
       r.bgHost);
  }

  console.log('[5] 수리 뒤 — 1080급 그릇이 답하는 자리');
  console.log('    · 현재 트리: ' + B1.n + '자리 (수리 전 ' + B0.n + '자리)');
  ok(B1.n === 0, '[5] ★ 장식 그릇이 답하는 자리 0건', B1.n + '자리');

  ok(cur.errs.length === 0, '[6] 콘솔 에러 0건', cur.errs.slice(0, 2).join(' | '));

  console.log('\nPROBE839 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
