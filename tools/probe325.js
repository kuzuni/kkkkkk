#!/usr/bin/env node
/* 작업 325 — 34 축복 카드 «받기» 알약(`.tm`) 레드닷 **자리 선택의 근거 실측**.
 *
 *   node tools/probe325.js
 *
 * 322 가 남긴 교훈 두 개를 그대로 집행한다:
 *   ① «버튼 안쪽 우상단이 빈다» 는 버튼마다 다시 재라 — 라벨 잉크가 알약을 얼마나 먹는지.
 *   ② 자리 검사는 정지 rect 로 끝나지 않는다 — 닷은 `jzDotIn`(→1.3)·`jzDotPulse`(1.14)로
 *      영원히 커졌다 작아진다. 여유는 **봉우리 배율**에서 재야 한다.
 * 여기에 34 만의 축이 둘 더 있다:
 *   ③ `.bls-c{overflow:hidden}` — 322·318 이 쓴 «바깥 코너» 는 여기서 **잘린다**(안쪽이어야 한다).
 *   ④ `<s>` 안에 `<s>` 를 넣었다 — 파서가 정말 `.tm` 의 자식으로 붙였는지(형제로 밀려나면
 *      `right:12px` 의 기준 상자가 통째로 달라진다).
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
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openBless === 'function');
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const p = n => Math.round(n * 100) / 100;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
    /* 카드1·2 = 받을 수 있음(만료) · 카드3 = 활성 중(시간 표시) — 두 국면을 한 화면에서 본다 */
    S.bless.exp = { atk: 0, hp: 0, rate: Date.now() + 3600e3 };
    openBless();
    const R = el => { const r = el.getBoundingClientRect(); return [p(r.left), p(r.top), p(r.width), p(r.height)]; };
    const out = [];
    document.querySelectorAll('.bls-c').forEach(c => {
      const tm = c.querySelector('.tm'), ck = tm.querySelector('b.ck'), i = tm.querySelector('i');
      const d = tm.querySelector(':scope > .updot');
      const ccs = getComputedStyle(c), tcs = getComputedStyle(tm);
      let dot = null;
      if (d) {
        const ds = getComputedStyle(d);
        const r0 = d.getBoundingClientRect();
        /* 등장 애니메이션(scale 0 시작)이 rect 를 0 으로 만들 수 있다 — 잠깐 끄고 잰다(104 함정) */
        const prevA = d.style.animation, prevD = d.style.display;
        d.style.animation = 'none'; d.style.display = 'block';
        const r1 = d.getBoundingClientRect();
        d.style.animation = prevA; d.style.display = prevD;
        /* 바깥 링 = box-shadow 의 가장 큰 spread */
        const ring = ((ds.boxShadow.match(/0px 0px 0px ([\d.]+)px/g) || [])
          .map(s => parseFloat(s.split(' ')[3])).sort((a, b) => b - a)[0]) || 0;
        dot = { rect: [p(r1.left), p(r1.top), p(r1.width), p(r1.height)], ring,
          display: ds.display, pe: ds.pointerEvents,
          parent: d.parentElement.className, shownNow: r0.width > 0 };
      }
      out.push({ id: c.id, off: c.classList.contains('off'), txt: i.textContent,
        alert: tm.classList.contains('alert'),
        card: R(c), cardOv: ccs.overflow, tm: R(tm), tmBg: tcs.backgroundColor, tmSh: tcs.boxShadow,
        ck: R(ck), i: R(i), dot });
    });
    /* 닷 중심에서 무엇이 잡히나 — 클릭 위임(`[data-bless]`)을 가로채면 안 된다 */
    let hit = null;
    const d0 = document.querySelector('.bls-c .tm > .updot');
    if (d0) {
      const r = d0.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      hit = e ? (e.tagName + '.' + (e.className || '')) : 'null';
      hit += ' | closest[data-bless]=' + (e && e.closest('[data-bless]') ? e.closest('[data-bless]').id : 'null');
    }
    return { out, hit };
  });

  console.log('── 국면별 알약 실측 ──');
  for (const o of m.out) {
    const tmR = o.tm[0] + o.tm[2], inkR = o.i[0] + o.i[2];
    console.log(`\n${o.id}  받을수있음=${o.off} 글자="${o.txt}" .alert=${o.alert}`);
    console.log(`   card=${o.card.join(',')} overflow=${o.cardOv} · .tm=${o.tm.join(',')}`);
    console.log(`   알약색 ${o.tmBg} / ${o.tmSh}`);
    console.log(`   글자 잉크 <i>=${o.i.join(',')} → 알약 안 «글자 오른쪽 남는 폭» ${px(tmR - inkR)}px`);
    if (!o.dot) { console.log('   닷 노드 없음'); continue; }
    console.log(`   닷 rect=${o.dot.rect.join(',')} 링 ${o.dot.ring}px display=${o.dot.display} pe=${o.dot.pe} parent=.${o.dot.parent}`);
  }

  console.log('\n── ① 안쪽 우상단이 정말 비는가 ──');
  const claim = m.out.filter(o => o.off);
  claim.forEach(o => {
    const free = (o.tm[0] + o.tm[2]) - (o.i[0] + o.i[2]);
    ok(free >= 42, `${o.id} 받기 상태 «글자 오른쪽 남는 폭» ≥ 닷 42px(27+링 7.5×2)`, px(free) + 'px');
  });
  const act = m.out.find(o => !o.off);
  if (act) console.log(`   (참고) 활성 국면 «${act.txt}» 의 남는 폭은 ` +
    px((act.tm[0] + act.tm[2]) - (act.i[0] + act.i[2])) + 'px — 그 국면은 닷이 안 켜지므로 자리 싸움이 없다');

  console.log('\n── ④ `<s>` 안 `<s>` 파싱 ──');
  m.out.forEach(o => ok(o.dot && o.dot.parent === 'updot' ? false : !!o.dot && o.dot.parent.includes('tm'),
    `${o.id} 닷의 부모가 .tm 이다(형제로 안 밀렸다)`, o.dot ? '.' + o.dot.parent : '없음'));

  console.log('\n── ②③ 자리·잘림·봉우리 배율 ──');
  claim.forEach(o => {
    const [dx, dy, dw, dh] = o.dot.rect, ring = o.dot.ring;
    const cx = dx + dw / 2, cy = dy + dh / 2;
    const hx = o.tm[0] + o.tm[2] / 2, hy = o.tm[1] + o.tm[3] / 2;
    ok(cx > hx && cy < hy, `${o.id} 299 «우상단 사분면»`,
      `중심 (${px(cx - o.tm[0])}, ${px(cy - o.tm[1])}) / 호스트 ${o.tm[2]}x${o.tm[3]}`);
    /* 정지 상태 — 링이 알약 안에 들어가는가(알약 자체엔 overflow 가 없지만 «변을 안 넘는다» 가 규격) */
    ok(dx - ring >= o.tm[0] && dy - ring >= o.tm[1] &&
       dx + dw + ring <= o.tm[0] + o.tm[2] && dy + dh + ring <= o.tm[1] + o.tm[3],
      `${o.id} 링이 알약 219x98 안`,
      `좌 ${px(dx - ring - o.tm[0])} 상 ${px(dy - ring - o.tm[1])} 우 ${px(o.tm[0] + o.tm[2] - dx - dw - ring)} 하 ${px(o.tm[1] + o.tm[3] - dy - dh - ring)}`);
    /* ③ 카드 overflow:hidden 안 */
    ok(dx - ring >= o.card[0] && dy - ring >= o.card[1] &&
       dx + dw + ring <= o.card[0] + o.card[2] && dy + dh + ring <= o.card[1] + o.card[3],
      `${o.id} 링이 .bls-c{overflow:hidden} 안 — 안 잘린다`, 'ring x ' + px(dx - ring) + '..' + px(dx + dw + ring));
    /* ② 봉우리 배율 1.3 에서 글자 잉크 상자까지의 여유 — 닷은 «원» 이라 상자겹침이 아니라 거리로 잰다 */
    const rad = (dw / 2 + ring) * 1.3;
    const inkL = o.i[0], inkT = o.i[1], inkR2 = o.i[0] + o.i[2], inkB = o.i[1] + o.i[3];
    const nx = Math.max(inkL, Math.min(cx, inkR2)), ny = Math.max(inkT, Math.min(cy, inkB));
    const dist = Math.hypot(cx - nx, cy - ny);
    ok(dist > rad, `${o.id} jzDotIn 봉우리(1.3)에서도 글자 상자를 안 밟는다`,
      `거리 ${px(dist)} > 반지름 ${px(rad)} (여유 +${px(dist - rad)}px)`);
    /* 시계 `.ck` 와도 */
    const cL = o.ck[0], cT = o.ck[1], cR = o.ck[0] + o.ck[2], cB = o.ck[1] + o.ck[3];
    const nx2 = Math.max(cL, Math.min(cx, cR)), ny2 = Math.max(cT, Math.min(cy, cB));
    ok(Math.hypot(cx - nx2, cy - ny2) > rad, `${o.id} 봉우리에서 시계 ⏱ 상자도 안 밟는다`,
      `거리 ${px(Math.hypot(cx - nx2, cy - ny2))} > ${px(rad)}`);
  });

  console.log('\n── 클릭 위임 ──');
  ok(m.hit && !/updot/.test(m.hit), '닷이 클릭 히트를 가로채지 않는다(pointer-events:none)', m.hit);
  ok(m.out.every(o => !o.dot || o.dot.pe === 'none'), '모든 닷 pointer-events:none',
    m.out.filter(o => o.dot).map(o => o.dot.pe).join(','));
  ok(errs.length === 0, '콘솔 에러 0', errs.join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE325 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
