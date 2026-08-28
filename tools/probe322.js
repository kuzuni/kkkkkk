/* 작업 322 — 22 퀘스트 [보상 받기]·[모두 받기] 레드닷 자리 실측.
 *
 *   node tools/probe322.js
 *
 * ① 안쪽 우상단이 비어 있는가 — 라벨 `<b>` 잉크가 패딩 상자를 얼마나 먹는지(자리 선택 근거).
 * ② 실제 닷 rect — 우상단 사분면(299) · 라벨 잉크와 겹침 · 행/패널/mbody 클립 여유.
 * ③ 클릭 위임이 안 막히는지 — 닷 중심에서 elementFromPoint 가 버튼을 준다(pointer-events:none).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const px = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openQuest === 'function');
  await page.waitForTimeout(900);

  /* 반복 퀘스트 5행을 전부 «수령 가능» 으로 만든다(기준선을 0 으로 내린다) */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
    QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9;
    document.querySelector('.side .ibtn[data-pop="quest"]').click();
  });
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const px2 = n => Math.round(n * 100) / 100;
    const geo = (el, nm) => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const bw = parseFloat(cs.borderTopWidth);
      const b = el.querySelector('b'), br = b ? b.getBoundingClientRect() : null;
      const d = el.querySelector(':scope > .updot');
      let dot = null;
      if (d) {
        const ds = getComputedStyle(d);
        const dr = d.getBoundingClientRect();
        /* 등장 애니메이션(scale 0 시작)이 rect 를 0 으로 만들 수 있다 — 잠깐 끈다(104 함정) */
        const prev = d.style.animation; d.style.animation = 'none';
        const dr2 = d.getBoundingClientRect();
        d.style.animation = prev;
        const ring = parseFloat((ds.boxShadow.match(/0px 0px 0px ([\d.]+)px/g) || ['0px 0px 0px 0px'])
          .map(s => parseFloat(s.split(' ')[3])).sort((a, b2) => b2 - a)[0]) || 0;
        dot = { rect: [px2(dr2.left), px2(dr2.top), px2(dr2.width), px2(dr2.height)], ring, display: ds.display,
          pe: ds.pointerEvents, hidden0: dr.width === 0 };
      }
      return { nm, rect: [px2(r.left), px2(r.top), px2(r.width), px2(r.height)], bw,
        pad: [px2(r.width - bw * 2), px2(r.height - bw * 2)],
        label: br ? [px2(br.left), px2(br.top), px2(br.width), px2(br.height)] : null,
        alert: el.classList.contains('alert'), disabled: !!el.disabled, dot };
    };
    const out = [];
    document.querySelectorAll('.qs-b').forEach((e, i) => out.push(geo(e, 'qs-b#' + i)));
    const a = document.getElementById('qAll'); if (a) out.push(geo(a, 'qs-all'));
    const pnr = document.querySelector('.qs-pn').getBoundingClientRect();
    const pcs = getComputedStyle(document.querySelector('.qs-pn'));
    const mb = document.querySelector('.q22 .mbody').getBoundingClientRect();
    /* 행 안 다른 부품과의 충돌 — 첫 행 기준 */
    const row = document.querySelector('.qs-r');
    const sibs = [...row.children].filter(c => !c.classList.contains('qs-b'))
      .map(c => ({ cls: c.className, r: c.getBoundingClientRect() }));
    /* 닷 중심에서 무엇이 잡히는가 */
    let hit = null;
    const d0 = document.querySelector('.qs-b > .updot');
    if (d0) { const r = d0.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      hit = e ? (e.tagName + '.' + e.className) : 'null'; }
    return { out, hit,
      pn: { rect: [px2(pnr.left), px2(pnr.top), px2(pnr.width), px2(pnr.height)],
        padR: parseFloat(pcs.paddingRight), ovy: pcs.overflowY, ovx: pcs.overflowX },
      mbody: [px2(mb.left), px2(mb.top), px2(mb.width), px2(mb.height)],
      sibs: sibs.map(s => ({ cls: s.cls, r: [px2(s.r.left), px2(s.r.top), px2(s.r.width), px2(s.r.height)] })) };
  });

  console.log('패널 .qs-pn rect=' + m.pn.rect.join(',') + ' padR=' + m.pn.padR + ' overflow=' + m.pn.ovx + '/' + m.pn.ovy);
  console.log('mbody rect=' + m.mbody.join(','));
  for (const o of m.out) {
    console.log(`\n${o.nm}  rect=${o.rect.join(',')} bw=${o.bw} padbox=${o.pad.join('x')} alert=${o.alert} disabled=${o.disabled}`);
    console.log(`   라벨 rect=${o.label.join(',')} · 라벨 오른쪽 패딩상자 여백 ` +
      px((o.rect[0] + o.rect[2] - o.bw) - (o.label[0] + o.label[2])) + 'px');
    if (!o.dot) { console.log('   닷 없음'); continue; }
    const [dx, dy, dw, dh] = o.dot.rect, ring = o.dot.ring;
    const cx = dx + dw / 2, cy = dy + dh / 2;
    const hx = o.rect[0] + o.rect[2] / 2, hy = o.rect[1] + o.rect[3] / 2;
    console.log(`   닷 rect=${o.dot.rect.join(',')} 링 ${ring}px · display=${o.dot.display} pe=${o.dot.pe}`);
    console.log(`   중심 (${px(cx - o.rect[0])}, ${px(cy - o.rect[1])}) / 호스트 ${o.rect[2]}x${o.rect[3]}` +
      ` → 우상단 사분면 ${(cx > hx && cy < hy) ? 'OK' : 'NG'}`);
    /* 라벨 잉크와 겹침(링 포함) */
    const L = { x1: dx - ring, y1: dy - ring, x2: dx + dw + ring, y2: dy + dh + ring };
    const lb = { x1: o.label[0], y1: o.label[1], x2: o.label[0] + o.label[2], y2: o.label[1] + o.label[3] };
    const ov = Math.max(0, Math.min(L.x2, lb.x2) - Math.max(L.x1, lb.x1)) *
               Math.max(0, Math.min(L.y2, lb.y2) - Math.max(L.y1, lb.y1));
    ok(ov === 0, `${o.nm} 링이 라벨 상자를 안 밟는다`, ov ? '겹침 ' + px(ov) + 'px²' : '겹침 0');
    /* 클립 여유 */
    if (o.nm.startsWith('qs-b')) {
      const clipR = m.pn.rect[0] + m.pn.rect[2] - m.pn.padR;
      ok(L.x2 <= clipR, `${o.nm} 링 우단이 .qs-pn 콘텐츠 안`, `링 우 ${px(L.x2)} ≤ 클립 ${px(clipR)}`);
    } else {
      const clipR = m.mbody[0] + m.mbody[2];
      ok(L.x2 <= clipR, `${o.nm} 링 우단이 .mbody 안`, `링 우 ${px(L.x2)} ≤ 클립 ${px(clipR)}`);
      ok(L.y1 >= m.mbody[1], `${o.nm} 링 상단이 .mbody 안`, `링 상 ${px(L.y1)} ≥ ${px(m.mbody[1])}`);
    }
  }
  console.log('\n행 형제 rect(첫 행):');
  m.sibs.forEach(s => console.log('   ' + s.cls.padEnd(14) + s.r.join(',')));
  /* 첫 행 닷 링 vs 형제 충돌 */
  const first = m.out[0];
  if (first && first.dot) {
    const [dx, dy, dw, dh] = first.dot.rect, ring = first.dot.ring;
    const L = { x1: dx - ring, y1: dy - ring, x2: dx + dw + ring, y2: dy + dh + ring };
    let bad = [];
    m.sibs.forEach(s => {
      const r = { x1: s.r[0], y1: s.r[1], x2: s.r[0] + s.r[2], y2: s.r[1] + s.r[3] };
      const a = Math.max(0, Math.min(L.x2, r.x2) - Math.max(L.x1, r.x1)) *
                Math.max(0, Math.min(L.y2, r.y2) - Math.max(L.y1, r.y1));
      if (a > 0) bad.push(s.cls + ' ' + px(a) + 'px²');
    });
    ok(bad.length === 0, '첫 행 닷 링이 행 안 다른 부품과 안 겹친다', bad.join(' | ') || '겹침 0');
  }
  /* 닷은 버튼의 **둥근 코너 바깥**(r40)에 걸터앉으므로 그 점의 히트 대상은 행(.qs-r)이 맞다.
     확인해야 할 것은 «닷이 히트를 가로채지 않는다» 뿐이다 — `pointer-events:none` 이라 절대 안 잡힌다. */
  ok(m.hit && !/updot/.test(m.hit), '닷이 클릭 히트를 가로채지 않는다(pointer-events:none)', m.hit);
  ok(m.out.every(o => !o.dot || o.dot.pe === 'none'), '모든 닷 pointer-events:none',
     m.out.filter(o => o.dot).map(o => o.dot.pe).join(','));

  await browser.close();
  console.log('\nPROBE322 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
