#!/usr/bin/env node
/* 421 프로브 — `probe351.js` D2 가 `shopcat:coin` 의 `.cn-cd.dia>.pn` 에서 내는
 * `ovfX 3~4px` 가 **무엇 때문에 회차마다 흔들리는지**를 «찍힌 값» 으로 좁힌다(338 규칙).
 *
 * 실행: node tools/probe421.js [--n 6]
 *
 * 등재문의 가설 둘:
 *   ⓐ `.pn` 안 숫자·아이콘이 폰트 로드·`fitNum` 류 되맞춤 «전» 에 재져 3~4px 넘친다
 *   ⓑ 광고 상품 상태가 실행마다 달라 문자열 길이가 바뀐다(노드 총수 46/47/48 흔들림)
 *
 * 재는 것:
 *   [1] 같은 프레임(1600)을 N 회 새로 띄워 `.pn` 의 scrollW−clientW 를 찍는다(흔들리는가)
 *   [2] 흔들린다면 **누가 넘치는가** — `.pn` 의 자식·의사요소를 하나씩 재서 오른쪽 끝을 찍는다
 *   [3] 그 순간 살아 있는 애니메이션(이름·playState·currentTime·rotate)을 같이 찍는다
 *   [4] `document.fonts.ready` 전/후, 그리고 500ms 뒤 값이 바뀌는가(ⓐ 검증)
 *   [5] 카드 문자열·클래스·광고 상품 상태가 실행마다 다른가(ⓑ 검증)
 *   [6] 2280 에서도 같은 값이 나오는가(= «1600 전용» 이 아니라 **양쪽 공통 플레이키**인가)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const N = (() => { const i = process.argv.indexOf('--n'); return i > 0 ? Number(process.argv[i + 1]) : 6; })();
const OPENER = { label: 'shopcat:coin', shop: '#shopCats .shp-ct[data-cat="coin"]' };

/* 페이지 안에서 `.pn` 한 장을 해부한다 */
const DISSECT = function () {
  /* ⚠ `querySelector('.cn-cd.dia>.pn')` 은 **첫 다이아 카드**를 집는다 — 넘치는 자는 다섯째
     (`.cn-cd.dia.top`, 광선 `.ray` 를 가진 칸)라 첫 판만 보면 «재현 안 됨» 이 된다.
     ⇒ 넘치는 판을 먼저 고르고, 하나도 없으면 첫 판을 해부한다. */
  const all = [...document.querySelectorAll('.cn-cd>.pn')];
  const pn = all.find((p) => p.scrollWidth - p.clientWidth > 0) || document.querySelector('.cn-cd.dia>.pn');
  if (!pn) return { err: 'no .cn-cd>.pn' };
  const card = pn.parentElement;
  const pr = pn.getBoundingClientRect();
  const kids = [];
  for (const c of pn.children) {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    kids.push({
      tag: c.tagName.toLowerCase(), cls: String(c.className || ''),
      left: +(r.left - pr.left).toFixed(2), right: +(r.right - pr.left).toFixed(2),
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      rotate: cs.rotate, transform: cs.transform === 'none' ? 'none' : cs.transform,
      txt: (c.textContent || '').trim().slice(0, 12),
    });
  }
  /* 의사요소도 자리를 찍는다(::before/::after 는 rect 를 못 잡으니 계산값으로) */
  const pseudo = ['::before', '::after'].map((p) => {
    const cs = getComputedStyle(pn, p);
    return { p, content: cs.content, left: cs.left, top: cs.top, w: cs.width, h: cs.height, transform: cs.transform, rotate: cs.rotate };
  });
  const anims = [];
  for (const a of pn.getAnimations({ subtree: true })) {
    const t = a.effect && a.effect.getTiming();
    anims.push({
      name: a.animationName || '', state: a.playState,
      cur: a.currentTime == null ? null : Math.round(Number(a.currentTime)),
      inf: !!(t && t.iterations === Infinity),
      target: a.effect && a.effect.target ? (a.effect.target.tagName.toLowerCase() + '.' + String(a.effect.target.className || '')) : '?',
      pseudo: a.effect && a.effect.pseudoElement || '',
    });
  }
  /* 카드 전체의 «넘침 후보» — .pn 안에서 오른쪽 끝이 clientWidth 를 넘는 자를 고른다 */
  return {
    ovfX: pn.scrollWidth - pn.clientWidth,
    ovfY: pn.scrollHeight - pn.clientHeight,
    clientW: pn.clientWidth, scrollW: pn.scrollWidth,
    cardCls: String(card.className || ''),
    kids, pseudo, anims,
    cards: [...document.querySelectorAll('.cn-cd')].map((c) => String(c.className || '').replace(/\s+/g, '.')),
    nodes: document.querySelectorAll('#app *').length,
    /* 판 전수 — 어느 칸이 넘치는가 */
    pans: all.map((p, i) => ({ i, cls: String(p.parentElement.className || '').replace(/\s+/g, '.'), ovfX: p.scrollWidth - p.clientWidth })).filter((o) => o.ovfX > 0),
  };
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  try {
    for (let i = 0; i < N; i++) {
      for (const [w, h] of [[1080, 1600], [1080, 2280]]) {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, OPENER);
        const before = await page.evaluate(DISSECT).catch((e) => ({ err: String(e.message || e) }));
        await settle(page);
        const after = await page.evaluate(DISSECT).catch((e) => ({ err: String(e.message || e) }));
        await page.waitForTimeout(600);
        const late = await page.evaluate(DISSECT).catch((e) => ({ err: String(e.message || e) }));
        const fonts = await page.evaluate(() => document.fonts.status).catch(() => '?');
        rows.push({ i, h, before, after, late, fonts });
        await ctx.close();
      }
    }
  } finally { await browser.close(); }

  let fail = 0, pass = 0;
  const ck = (name, ok, note) => { if (ok) { pass++; console.log(`  ✅ ${name}${note ? ' — ' + note : ''}`); } else { fail++; console.log(`  ❌ ${name}${note ? ' — ' + note : ''}`); } };

  console.log('\n[421] ── [1] 실행별 `.pn` ovfX (settle 전 / settle 후 / +600ms) ──');
  for (const r of rows) {
    const f = (x) => (x && x.err ? 'ERR' : `${x.ovfX}`);
    console.log(`  h=${r.h} #${r.i}  before=${String(f(r.before)).padStart(4)}  after=${String(f(r.after)).padStart(4)}  late=${String(f(r.late)).padStart(4)}  fonts=${r.fonts}  nodes=${r.after && r.after.nodes}  pans=${JSON.stringify((r.after||{}).pans)}`);
  }
  const afterVals = rows.map((r) => (r.after && !r.after.err ? r.after.ovfX : null));
  const uniq = [...new Set(afterVals)];
  console.log(`  settle 후 값의 종류: ${JSON.stringify(uniq)}`);
  ck('[1] settle 후에도 값이 흔들린다(= 플레이키가 재현됐다)', uniq.length > 1, `종류 ${uniq.length}`);

  console.log('\n[421] ── [2] 넘치는 자 (settle 후, ovfX>0 인 첫 실행) ──');
  const hit = rows.find((r) => r.after && !r.after.err && r.after.ovfX > 0);
  if (hit) {
    console.log(`  clientW=${hit.after.clientW} scrollW=${hit.after.scrollW} card=«${hit.after.cardCls}»`);
    for (const k of hit.after.kids) console.log(`    kid ${k.tag}.${k.cls} left=${k.left} right=${k.right} w=${k.w} rotate=${k.rotate} tf=${String(k.transform).slice(0, 40)} «${k.txt}»`);
    for (const p of hit.after.pseudo) console.log(`    ${p.p} content=${p.content} left=${p.left} w=${p.w} rotate=${p.rotate} tf=${String(p.transform).slice(0, 40)}`);
    console.log('    애니메이션:');
    for (const a of hit.after.anims) console.log(`      ${a.name || '(무명)'} ${a.state} cur=${a.cur} inf=${a.inf} on=${a.target}${a.pseudo}`);
  } else console.log('  (이번 실행에는 ovfX>0 이 한 번도 안 나왔다)');
  ck('[2] 넘침 순간의 해부가 찍혔다', !!hit);

  console.log('\n[421] ── [3] 두 해상도 비교(양쪽 공통 플레이키인가) ──');
  const byH = {};
  for (const r of rows) { const v = r.after && !r.after.err ? r.after.ovfX : -1; (byH[r.h] = byH[r.h] || []).push(v); }
  for (const h of Object.keys(byH)) console.log(`  h=${h}: ${JSON.stringify(byH[h])}`);
  const both = Object.values(byH).every((a) => a.some((v) => v > 0));
  ck('[3] 1600 뿐 아니라 2280 에서도 넘침이 난다(= «1600 전용» 이 아니다)', both);

  console.log('\n[421] ── [4] 카드 구성이 실행마다 같은가(가설 ⓑ) ──');
  const sigs = [...new Set(rows.map((r) => (r.after && r.after.cards ? r.after.cards.join('|') : 'ERR')))];
  console.log(`  카드 클래스 서명 종류: ${sigs.length}`);
  for (const s of sigs) console.log(`    ${s.slice(0, 200)}`);
  ck('[4] 카드 구성은 실행마다 같다(⇒ ⓑ «상품 상태가 다르다» 는 뿌리가 아니다)', sigs.length === 1);

  console.log('\n[421] ── [5] settle 전후로 값이 달라지는가(가설 ⓐ 폰트/되맞춤) ──');
  const moved = rows.filter((r) => r.before && r.after && !r.before.err && !r.after.err && r.before.ovfX !== r.after.ovfX).length;
  const lateMoved = rows.filter((r) => r.after && r.late && !r.after.err && !r.late.err && r.after.ovfX !== r.late.ovfX).length;
  console.log(`  settle 전→후 값이 바뀐 실행 ${moved}/${rows.length} · settle 후→+600ms 바뀐 실행 ${lateMoved}/${rows.length}`);
  ck('[5] 값이 시간(위상)에 따라 움직인다', moved + lateMoved > 0, `전→후 ${moved} · 후→+600 ${lateMoved}`);

  console.log(`\n[421] ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE421 CRASH', e); process.exit(2); });
