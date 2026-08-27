/* 작업 192 회귀 게이트 — 09 일괄 강화 결과 팝업의 펫 카드가 «❔» 로 뜨던 버그 (2026-08-27, T1).
   실행: node tools/verify192.js   → 마지막 줄이 `VERIFY192 n/n PASS` 여야 한다.

   주인 보고: «펫 일괄 강화 했더니 슬롯 표시가 ? 로 뜸 — 강화 결과가 그렇게 뜸».
   원인: `openUpAll()` 이 카드를 `u.it.ic || '❔'` 로 그리는데 **`PETS` 에는 `ic` 가 없다**(sp+tint).
   처방: 174 확정(«펫 그림 = 전투 스프라이트») 대로 이모지가 아니라 **스프라이트 캔버스**를 그린다.

   본다:
     §1 원인   PETS 전 종이 `ic` 없이 `sp`(PET_SP 등재)만 갖는다 — «이모지를 채워 넣는» 처방이
               왜 오답인지의 근거이자, 나중에 누가 `ic` 를 넣으면 여기서 먼저 걸린다.
     §2 실사용 영웅 탭 → 동료 서브탭 → [일괄 강화] **진짜 포인터 클릭**(LESSONS 65-②).
               팝업이 열리고 카드 수가 맞고 **❔ 가 0개**이며 칸마다 캔버스가 있다.
     §3 그림   캔버스마다 잉크 픽셀 > 0 · 잉크 bbox 최대변이 이모지 잉크 대역(51~66) 안 ·
               잉크가 90x90 칸 **중앙**에 앉는다(97-② «액자에 담기» — 논리 앵커면 한쪽으로 몰린다).
     §4 틴트   `tint` 가 있는 종과 없는 종이 실제로 다른 픽셀을 낸다(multiply 가 먹었는가).
     §5 대비   97-⑤ — 곱한 뒤 잉크가 카드 초록(#9DC838, 휘도 180.5)에 묻히지 않는다(묻힘 < 30%).
     §6 과교정 잠금 — 무기·스킬 일괄 강화는 **이모지 그대로**다(캔버스 0개). 펫만 바뀌어야 한다.
     §7 폴백   아틀라스 이미지가 없을 때 빈 캔버스를 남기지 않고 이모지로 되돌아간다
               (❔ 보다 나쁜 «빈 칸» 방지).
     §8 콘솔·페이지 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const inRange = (m, got, lo, hi) => ok(got >= lo && got <= hi, `${m} (기대 ${lo}~${hi} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 카드 칸을 «같은 자» 로 읽는다 — 캔버스면 픽셀, 이모지면 글자. */
const READ = () => {
  const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const BG = L(157, 200, 56);                       /* .upr-card 중심색 #9DC838 */
  return [...document.querySelectorAll('#upCards .upr-cel')].map((cel, i) => {
    const b = cel.querySelector('.upr-card > b');
    const cv = b.querySelector('canvas');
    const o = { i, canvas: !!cv, txt: cv ? '' : b.textContent, sp: cv ? cv.dataset.usp : null,
                tint: cv ? (cv.dataset.utc || null) : null };
    if (!cv) return o;
    o.cw = cv.width; o.ch = cv.height;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, bur = 0, sig = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const q = (y * cv.width + x) * 4;
      if (d[q + 3] < 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      n++; if (Math.abs(L(d[q], d[q + 1], d[q + 2]) - BG) < 25) bur++;
      sig = (sig * 31 + d[q] * 7 + d[q + 1] * 3 + d[q + 2]) % 1000000007;   /* 픽셀 지문 */
    }
    o.ink = n ? { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, px: n,
                  buried: Math.round(bur / n * 1000) / 10, sig } : null;
    return o;
  });
};

/* 펫 3종(bird/robo/dragon)을 보유시키고 재료를 채운다. 3종이 곧 PET_SP 의 전 스프라이트다. */
const seedPets = (p) => p.evaluate(() => {
  const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
  pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
  save(); uiDirty = true;
  return pick.map(x => ({ id: x.id, sp: x.sp, tint: x.tint }));
});

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1500);

  /* ── §1 원인 ── */
  console.log('§1 원인 — PETS 는 ic 가 없고 sp 만 있다');
  const d1 = await p.evaluate(() => ({
    total: PETS.length,
    withIc: PETS.filter(x => x.ic).length,
    badSp: PETS.filter(x => !x.sp || !PET_SP[x.sp]).map(x => x.id),
    sps: [...new Set(PETS.map(x => x.sp))].sort(),
    petSp: Object.keys(PET_SP).sort()
  }));
  ok(d1.total >= 27, `PETS 등재 ${d1.total}종`);
  eq('ic 를 가진 펫', d1.withIc, 0);
  eq('PET_SP 에 없는 sp 를 쓰는 펫', d1.badSp.length, 0);
  ok(JSON.stringify(d1.sps) === JSON.stringify(d1.petSp), `sp 집합 = PET_SP 키 (${d1.sps.join(',')})`);
  /* 174 — 같은 부품을 슬롯·카드·12·21 에서도 쓰게 되면서 `uprIcon(it)` → `petIcon(it, kind)` 로 넓혔다.
     이 단언이 지키는 것은 «openUpAll 이 ❔ 직결이 아니라 스프라이트 헬퍼를 쓴다» 이므로 이름만 옮긴다. */
  ok(/petIcon\(u\.it, *'up'\)/.test(SRC), "openUpAll 이 petIcon(u.it,'up') 을 쓴다(❔ 직결 폐기)");

  /* ── §2 실사용 경로 ── */
  console.log('§2 실사용 — 영웅 → 동료 → [일괄 강화] 진짜 클릭');
  const seeded = await seedPets(p);
  await p.evaluate(() => { goTab('hero'); heroSubGo('pet'); });
  await p.waitForTimeout(400);
  const btn = await p.$('[data-ptup]');
  ok(!!btn, '[일괄 강화] 버튼이 있다');
  ok(await p.evaluate(() => !!document.querySelector('[data-ptup].ok'), 'ok'), '버튼이 활성(ok)이다');
  await btn.click();
  await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById('upw').classList.contains('on')), '09 팝업이 열렸다');
  const cards = await p.evaluate(READ);
  eq('카드 수', cards.length, seeded.length);
  eq('❔ 로 뜬 칸', cards.filter(c => c.txt.indexOf('❔') >= 0).length, 0);
  eq('캔버스가 있는 칸', cards.filter(c => c.canvas).length, seeded.length);
  eq('sp 순서', cards.map(c => c.sp).join(','), seeded.map(s => s.sp).join(','));

  /* ── §3 그림 ── */
  console.log('§3 그림 — 잉크가 있고, 이모지 잉크 대역이며, 칸 중앙에 앉는다');
  cards.forEach(c => {
    ok(!!c.ink && c.ink.px > 200, `${c.sp}: 잉크 픽셀 ${c.ink ? c.ink.px : 0}개 (>200)`);
    if (!c.ink) return;
    eq(`${c.sp}: 캔버스 ${c.cw}x${c.ch}`, `${c.cw}x${c.ch}`, '90x90');
    inRange(`${c.sp}: 잉크 최대변`, Math.max(c.ink.w, c.ink.h), 51, 66);
    const cx = c.ink.x0 + c.ink.w / 2, cy = c.ink.y0 + c.ink.h / 2;
    ok(Math.abs(cx - 45) <= 2, `${c.sp}: 잉크 중심 x ${cx} (칸 중앙 45±2)`);
    ok(Math.abs(cy - 45) <= 2, `${c.sp}: 잉크 중심 y ${cy} (칸 중앙 45±2)`);
    ok(c.ink.w <= 90 && c.ink.h <= 90, `${c.sp}: 잉크가 칸을 안 넘는다 (${c.ink.w}x${c.ink.h})`);
  });

  /* ── §4 틴트 ── */
  console.log('§4 틴트 — multiply 가 실제로 먹는다');
  const tinted = cards.filter(c => c.tint), plain = cards.filter(c => c.canvas && !c.tint);
  ok(tinted.length > 0 && plain.length > 0, `틴트 있는 종 ${tinted.length} · 없는 종 ${plain.length}`);
  tinted.forEach(c => ok(/^#[0-9a-f]{3,8}$/i.test(c.tint), `${c.sp}: data-utc=${c.tint}`));
  const sigTint = await p.evaluate(() => {
    /* 같은 프레임을 틴트 없이 한 번 더 그려 지문을 비교한다 — 틴트가 no-op 이면 같은 값이 나온다.
       ⚠ 수정 전 트리(캔버스가 아예 없는 상태)에서도 **크래시가 아니라 FAIL** 로 떨어져야 한다
       (LESSONS 110 — 크래시하는 게이트는 다음 사람에게 «죽은 줄도 모르는 게이트» 가 된다). */
    const cv = document.querySelector('#upCards canvas[data-utc]');
    if (!cv || typeof drawSpriteTo !== 'function' || typeof UPR_ART === 'undefined') return -1;
    const k = cv.dataset.usp, A = ATLAS[k], list = A.a[PET_SP[k].anim];
    const t = document.createElement('canvas'); t.width = 90; t.height = 90;
    drawSpriteTo(t, { k, frame: list[0], tint: null, fit: UPR_ART });
    const a = cv.getContext('2d').getImageData(0, 0, 90, 90).data;
    const b = t.getContext('2d').getImageData(0, 0, 90, 90).data;
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    return diff;
  });
  ok(sigTint > 200, `틴트본 ↔ 무틴트본 다른 픽셀 ${sigTint}개 (>200)`);

  /* ── §5 대비 (97-⑤) ── */
  console.log('§5 대비 — 곱한 뒤 잉크가 카드 초록에 묻히지 않는다');
  cards.forEach(c => c.ink && ok(c.ink.buried < 30, `${c.sp}: 배경 휘도(180.5)±25 에 묻힌 잉크 ${c.ink.buried}%`));

  /* ── §6 과교정 잠금 ── */
  console.log('§6 과교정 잠금 — 무기·스킬은 이모지 그대로');
  const others = await p.evaluate(() => {
    const out = {};
    [['equip', EQUIPS.slice(0, 3)], ['skill', SKILLS.slice(0, 3)]].forEach(([k, list]) => {
      closeUpAll();
      list.forEach(it => { S.own[it.id] = { n: 5000, l: 1 }; });
      const r = levelUpAll(list);
      openUpAll(r.ups);
      out[k] = [...document.querySelectorAll('#upCards .upr-card > b')]
        .map(b => ({ canvas: !!b.querySelector('canvas'), txt: b.textContent }));
    });
    closeUpAll();
    return out;
  });
  ['equip', 'skill'].forEach(k => {
    eq(`${k}: 칸 수`, others[k].length, 3);
    eq(`${k}: 캔버스가 낀 칸`, others[k].filter(c => c.canvas).length, 0);
    eq(`${k}: 이모지가 빈 칸`, others[k].filter(c => !c.txt.trim()).length, 0);
    eq(`${k}: ❔ 칸`, others[k].filter(c => c.txt.indexOf('❔') >= 0).length, 0);
  });

  /* ── §7 폴백 ── */
  console.log('§7 폴백 — 아틀라스가 없으면 이모지로 되돌아간다(빈 칸 금지)');
  const fb = await p.evaluate(() => {
    const keep = {};
    Object.keys(PET_SP).forEach(k => { keep[k] = ATLAS[k].image; ATLAS[k].image = null; });
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
    const r = levelUpAll(pick);
    openUpAll(r.ups);
    const out = [...document.querySelectorAll('#upCards .upr-card > b')]
      .map(b => ({ canvas: !!b.querySelector('canvas'), txt: b.textContent }));
    Object.keys(keep).forEach(k => { ATLAS[k].image = keep[k]; });
    closeUpAll();
    return out;
  });
  eq('폴백: 남은 캔버스', fb.filter(c => c.canvas).length, 0);
  eq('폴백: 빈 칸', fb.filter(c => !c.txt.trim()).length, 0);
  eq('폴백 글리프', fb.map(c => c.txt).join(''), '🐦🤖🐉');

  /* ── §8 에러 ── */
  console.log('§8 콘솔·페이지 에러');
  eq('에러 건수', errs.length, 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  const n = pass + fail;
  console.log(`\nVERIFY192 ${pass}/${n} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
