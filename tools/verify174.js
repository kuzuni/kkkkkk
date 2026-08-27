/* 작업 174 회귀 게이트 — «펫 그림 = 전투 씬과 똑같은 스프라이트» (T2, 주인 지시 2026-08-27).
   실행: node tools/verify174.js   → 마지막 줄이 `VERIFY174 n/n PASS` 여야 한다.

   주인 보고: «펫 이미지가 전투씬에 있을 때랑 똑같은 이미지로 슬롯 썸네일에 있어야 하는데 안 그렇게 됨».
   처방: 192 가 09 결과 팝업 한 자리에서만 쓰던 `drawSpriteTo` 캔버스를 **펫 그림이 뜨는 자리 전부**로.
     ① 07/26 펫 시트 장착 슬롯 · ② 카드 격자 · ③ 12 소환 결과 · ④ 21 도감 펫 칸 (+ ⑤ 09 = 192 회귀)

   본다:
     §1 원인   PETS 전 종이 `ic` 없이 `sp`(PET_SP 등재)만 갖는다 — 이모지를 채우는 처방이 왜 오답인가.
     §2 슬롯   장착 3칸이 전부 캔버스(이모지 0) · 69x69 · 잉크가 있고 «칸 중앙»에 앉는다(97-②).
     §3 격자   36칸이 전부 캔버스 92x92 · 잉크 최대변이 이모지 잉크 대역 · 카드 중앙.
     §4 82     미보유 카드도 캔버스가 있고 흐림(opacity .35 + grayscale(1))이 그대로 먹는다.
     §5 동일   썸네일 픽셀이 **전투 씬이 쓰는 그 아틀라스·그 프레임**과 같다 —
               같은 sp/tint 로 다시 그린 캔버스와 지문 일치 · tint 유무가 실제로 다른 픽셀.
     §6 12     펫 소환 결과 칸은 캔버스, **무기 소환 결과는 이모지 그대로**(과교정 잠금).
     §7 21     도감 펫 칸은 캔버스 + `transform:none`(이모지 폭 보정 scaleX 가 그림을 늘리면 안 된다),
               스킬 탭은 이모지 그대로.
     §8 09     192 회귀 — 일괄 강화 결과가 여전히 캔버스 90x90.
     §9 살아있음 재렌더(`renderUI`)가 여러 번 돌아도 캔버스가 «빈 칸» 으로 남지 않는다.
     §10 기능  장착 해제 → 슬롯이 잠금으로, 다시 장착 → 그 펫 스프라이트로 (실제 클릭).
     §11 콘솔·페이지 에러 0. */
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

/* 한 캔버스의 «잉크» — 알파 > 8 인 픽셀의 bbox·개수·지문. 배경 연출과 무관하게 정확하다
   (스크린샷 차분은 121/122 의 카드 상시 연출에 오염된다 — 측정 때 실제로 그랬다). */
const INK = `(cv => {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, sig = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const q = (y * cv.width + x) * 4;
    if (d[q + 3] < 8) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    n++; sig = (sig * 31 + d[q] * 7 + d[q + 1] * 3 + d[q + 2]) % 1000000007;
  }
  return n ? { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, px: n, sig } : null;
})`;

/* 칸 하나를 읽는다 — 캔버스면 픽셀, 이모지면 글자. 부모 박스 대비 캔버스 중심도 같이 준다. */
const CELL = `((host) => {
  const cv = host.querySelector('canvas');
  const hb = host.getBoundingClientRect();
  const o = { canvas: !!cv, txt: cv ? '' : host.textContent.trim(),
              hostW: Math.round(hb.width), hostH: Math.round(hb.height) };
  if (!cv) return o;
  const b = cv.getBoundingClientRect();
  o.cw = cv.width; o.ch = cv.height; o.sp = cv.dataset.usp; o.tint = cv.dataset.utc || null;
  o.dx = +(b.x + b.width / 2 - (hb.x + hb.width / 2)).toFixed(1);   /* 칸 중심 대비 캔버스 중심 */
  o.dy = +(b.y + b.height / 2 - (hb.y + hb.height / 2)).toFixed(1);
  o.tr = getComputedStyle(host).transform;
  o.ink = ${INK}(cv);
  return o;
})`;

const seedPets = p => p.evaluate(() => {
  const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
  pick.forEach(x => { S.own[x.id] = { n: 5000, l: 1 }; });
  S.eqPet = pick.map(x => x.id);
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
    th: typeof PET_TH !== 'undefined' ? PET_TH : null
  }));
  ok(d1.total === 36, `PETS 36종 (${d1.total})`);
  eq('ic 를 가진 펫', d1.withIc, 0);
  eq('PET_SP 에 없는 sp 를 쓰는 펫', d1.badSp.length, 0);
  ok(!!d1.th && ['up', 'slot', 'card', 'sum', 'coll'].every(k => d1.th[k]),
     'PET_TH 가 다섯 자리(up/slot/card/sum/coll)를 전부 갖는다');
  ok(/petIcon\(it, *'slot'\)/.test(SRC) && /petIcon\(it, *'card'\)/.test(SRC),
     'renderPet 이 슬롯·카드 모두 petIcon() 을 쓴다(itemIcon 이모지 직결 폐기)');
  ok(!/COLL21_PETIC\s*=/.test(SRC), '21 도감 펫 이모지 표(COLL21_PETIC) 폐기 — 폴백은 UPR_FB 한 벌');

  const seeded = await seedPets(p);
  /* ⚠ A1 규칙 — 열린 탭을 다시 누르면 패널이 «닫힌다». 이미 펫 시트면 다시 열지 않는다
     (게이트 1차가 이걸 몰라 [일괄 강화] 를 «보이지 않는 버튼» 이라고 30초 기다렸다). */
  await p.evaluate(() => {
    if (!$('bPet').classList.contains('on')) { goTab('hero'); heroSubGo('pet'); }
  });
  await p.waitForTimeout(600);

  /* ── §2 장착 슬롯 ── */
  console.log('§2 슬롯 — 장착 3칸이 스프라이트 캔버스');
  const s2 = await p.evaluate(C => [...document.querySelectorAll('#bPet .sk-slot[data-ptun] .sk-si')]
    .map(eval(C)), CELL);
  eq('장착 슬롯 칸 수', s2.length, 3);
  eq('이모지로 남은 슬롯', s2.filter(c => !c.canvas).length, 0);
  eq('슬롯 sp 순서', s2.map(c => c.sp).join(','), seeded.map(s => s.sp).join(','));
  s2.forEach(c => {
    eq(`슬롯 ${c.sp}: 캔버스 크기`, `${c.cw}x${c.ch}`, '69x69');
    eq(`슬롯 ${c.sp}: 칸 박스`, `${c.hostW}x${c.hostH}`, '115x70');
    ok(!!c.ink && c.ink.px > 200, `슬롯 ${c.sp}: 잉크 픽셀 ${c.ink ? c.ink.px : 0}개 (>200)`);
    ok(Math.abs(c.dx) <= 1 && Math.abs(c.dy) <= 1,
       `슬롯 ${c.sp}: 캔버스가 칸 정중앙 (Δ${c.dx},${c.dy})`);
    if (c.ink) inRange(`슬롯 ${c.sp}: 잉크 최대변`, Math.max(c.ink.w, c.ink.h), 58, 64);
  });

  /* ── §3 카드 격자 ── */
  console.log('§3 격자 — 36칸이 스프라이트 캔버스');
  const s3 = await p.evaluate(C => [...document.querySelectorAll('#bPet .sk-gp .sk-card .sk-ci')]
    .map(eval(C)), CELL);
  eq('카드 칸 수', s3.length, 36);
  eq('이모지로 남은 카드', s3.filter(c => !c.canvas).length, 0);
  eq('캔버스 크기가 92x92 가 아닌 카드', s3.filter(c => `${c.cw}x${c.ch}` !== '92x92').length, 0);
  eq('잉크가 없는 카드', s3.filter(c => !c.ink || c.ink.px < 200).length, 0);
  eq('칸 중앙(±1)을 벗어난 카드', s3.filter(c => Math.abs(c.dx) > 1 || Math.abs(c.dy) > 1).length, 0);
  const mx = s3.filter(c => c.ink).map(c => Math.max(c.ink.w, c.ink.h));
  inRange('카드 잉크 최대변 — 최솟값', Math.min(...mx), 78, 84);
  inRange('카드 잉크 최대변 — 최댓값', Math.max(...mx), 78, 84);

  /* ── §4 82 규칙(미보유 카드) ── */
  console.log('§4 82 — 미보유 카드도 그림이 보이고 흐림이 먹는다');
  const s4 = await p.evaluate(() => {
    const lk = [...document.querySelectorAll('#bPet .sk-gp .sk-card.lk')];
    return { n: lk.length, bad: lk.filter(c => {
      const ci = c.querySelector('.sk-ci'), st = ci && getComputedStyle(ci);
      return !(ci && ci.querySelector('canvas') && Math.abs(+st.opacity - 0.35) < 0.01
               && /grayscale\(1\)/.test(st.filter) && !/brightness\(0\)/.test(st.filter));
    }).length };
  });
  ok(s4.n >= 3, `미보유 카드 ${s4.n}장 (≥3)`);
  eq('캔버스가 없거나 흐림이 안 먹은 미보유 카드', s4.bad, 0);

  /* ── §5 전투 씬과 같은 픽셀 ── */
  console.log('§5 동일 — 전투 씬이 쓰는 아틀라스·프레임과 같은 그림');
  const s5 = await p.evaluate(({ C, I }) => {
    const read = eval(C), ink = eval(I);
    return [...document.querySelectorAll('#bPet .sk-slot[data-ptun] .sk-si')].map(host => {
      const got = read(host), cv = host.querySelector('canvas');
      /* 전투 씬이 그 펫에 쓰는 바로 그 키·애니메이션의 0번 프레임으로 다시 그린다 */
      const sp = PET_SP[got.sp], list = ATLAS[got.sp].a[sp.anim];
      const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height;
      drawSpriteTo(t, { k: got.sp, frame: list[0], tint: cv.dataset.utc || null, fit: +cv.dataset.ufit });
      const same = ink(t);
      /* 틴트를 뺀 것과는 달라야 한다(= multiply 가 실제로 먹었다) */
      const t2 = document.createElement('canvas'); t2.width = cv.width; t2.height = cv.height;
      drawSpriteTo(t2, { k: got.sp, frame: list[0], tint: null, fit: +cv.dataset.ufit });
      const bare = ink(t2);
      /* «똑같은 이미지» 의 근거 — 밝기 보정(72 `bright`)을 **안 걸었다**. 걸었다면 여기서 갈린다. */
      const t3 = document.createElement('canvas'); t3.width = cv.width; t3.height = cv.height;
      drawSpriteTo(t3, { k: got.sp, frame: list[0], tint: cv.dataset.utc || null, fit: +cv.dataset.ufit, bright: 1.6 });
      const lifted = ink(t3);
      return { sp: got.sp, tint: cv.dataset.utc || null, sig: got.ink && got.ink.sig,
               refSig: same && same.sig, bareSig: bare && bare.sig, frames: list.length,
               liftSig: lifted && lifted.sig };
    });
  }, { C: CELL, I: INK });
  s5.forEach(r => {
    ok(r.sig === r.refSig,
       `${r.sp}: 썸네일 = 전투 아틀라스 ${r.frames}프레임 중 0번 + 그 틴트(지문 일치)`,
       r.sig + ' vs ' + r.refSig);
    if (r.tint) ok(r.sig !== r.bareSig, `${r.sp}: 틴트 ${r.tint} 가 실제로 픽셀을 바꾼다`);
    else ok(r.sig === r.bareSig, `${r.sp}: 틴트 없는 종은 원본 그대로`);
    /* 주인 지시는 «전투씬과 똑같은 이미지» 다 — 보기 좋으라고 밝히지 않았다는 근거 */
    ok(r.sig !== r.liftSig, `${r.sp}: 밝기 보정 없음(72 bright 를 걸면 지문이 갈린다)`);
  });

  /* ── §5b 대비 — 97-⑤ 의 펫 판. 카드 면은 등급별(`SK_FILL` 8단, 휘도 48~170)이라 «어두운 스프라이트가
     어두운 면에 묻히는» 조합이 실제로 나온다. **이 작업은 그것을 고치지 않는다** — 주인 지시가
     «전투씬과 똑같은 이미지» 라 픽셀을 밝히면 전제가 깨지고, 72 식 상수 하나로는 8가지 면을 못 맞춘다
     (1회차에 «면 휘도 + 45» 자동 보정을 실제로 만들어 봤더니 밝은 면 위의 밝은 종이 포화해 오히려
     51.2% → 66.5% 로 나빠졌다 — 되돌렸다. 근거는 docs/review/174-*.md).
     그래서 여기서는 **재서 기록**하고, «아예 안 보이는 수준» 만 막는다. 후속은 PROGRESS 221. ── */
  console.log('§5b 대비 — 잉크가 등급 면에 완전히 묻히지는 않는다(수치는 기록용)');
  const s5b = await p.evaluate(() => {
    const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hex = h => { h = h.trim(); const m = /^#([0-9a-f]{6})$/i.exec(h);
      if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
      const q = /rgba?\(([^)]+)\)/.exec(h); return q ? q[1].split(',').slice(0, 3).map(Number) : [0, 0, 0]; };
    return [...document.querySelectorAll('#bPet .sk-gp .sk-card')].map(card => {
      const cv = card.querySelector('canvas'); if (!cv) return null;
      const face = L(...hex(getComputedStyle(card).getPropertyValue('--f')));
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, bur = 0;
      for (let q = 0; q < d.length; q += 4) {
        if (d[q + 3] < 8) continue;
        n++; if (Math.abs(L(d[q], d[q + 1], d[q + 2]) - face) < 25) bur++;
      }
      return { id: card.dataset.ptit, buried: n ? Math.round(bur / n * 1000) / 10 : 100, face: Math.round(face) };
    }).filter(Boolean);
  });
  const worst = s5b.reduce((a, b) => a.buried > b.buried ? a : b);
  const over = s5b.filter(c => c.buried >= 30).length;
  ok(s5b.length === 36, `대비를 잰 카드 ${s5b.length}장`);
  console.log(`  · 기록 — 30% 이상 묻힌 카드 ${over}장 / 최악 ${worst.id} ${worst.buried}%(면 휘도 ${worst.face})`);
  ok(worst.buried < 80,
     `가장 묻힌 카드 ${worst.id}: 잉크 ${worst.buried}% 가 면(휘도 ${worst.face})과 같은 대역 — «안 보임»(≥80%) 은 아니다`);
  /* 11 = 이 게이트의 시드(3종 보유·장착) 기준 실측. 전 종 보유 기준으로는 9장이다 —
     장착 카드는 면이 `skDim`(×0.65)으로 더 어두워져 2장이 더 걸린다. 시드가 바뀌면 이 수도 바뀐다. */
  ok(over <= 11, `30% 이상 묻힌 카드 ${over}장 (1회차 실측 11장에서 더 나빠지지 않았다)`);

  /* ── §6 12 소환 결과 (+ 과교정 잠금) ── */
  console.log('§6 12 — 펫 결과는 캔버스, 무기 결과는 이모지 그대로');
  const s6 = await p.evaluate(C => {
    const read = eval(C);
    const pick = ['bird', 'robo', 'dragon'].map(sp => PETS.find(x => x.sp === sp));
    showSummonResult('pet', 3, pick.map(it => ({ it })), null);
    const pets = [...document.querySelectorAll('#sumGridIn .sm-c > b')].map(read);
    closeSummonResult && closeSummonResult();
    showSummonResult('weapon', 3, BANNERS.weapon.list.slice(0, 3).map(it => ({ it })), null);
    const wpns = [...document.querySelectorAll('#sumGridIn .sm-c > b')].map(read);
    closeSummonResult && closeSummonResult();
    return { pets, wpns };
  }, CELL);
  eq('펫 결과 칸 수', s6.pets.length, 3);
  eq('펫 결과 중 이모지로 남은 칸', s6.pets.filter(c => !c.canvas).length, 0);
  eq('펫 결과 캔버스 크기가 78x63 이 아닌 칸', s6.pets.filter(c => `${c.cw}x${c.ch}` !== '78x63').length, 0);
  eq('펫 결과 중 잉크 없는 칸', s6.pets.filter(c => !c.ink || c.ink.px < 200).length, 0);
  eq('무기 결과 중 캔버스가 생긴 칸(과교정)', s6.wpns.filter(c => c.canvas).length, 0);
  eq('무기 결과 중 글자가 빈 칸', s6.wpns.filter(c => !c.txt).length, 0);

  /* ── §7 21 도감 ── */
  console.log('§7 21 — 도감 펫 칸은 캔버스 + scaleX 해제, 스킬 칸은 이모지');
  const s7 = await p.evaluate(C => {
    const read = eval(C);
    openColl21('pet');
    const pet = [...document.querySelectorAll('#collw .clb .cd > i.cdic')].map(read);
    openColl21('skill');
    const sk = [...document.querySelectorAll('#collw .clb .cd > i.cdic')].map(read);
    closeColl21();
    return { pet, sk };
  }, CELL);
  ok(s7.pet.length >= 36, `도감 펫 칸 ${s7.pet.length}개 (≥36)`);
  eq('도감 펫 칸 중 이모지로 남은 칸', s7.pet.filter(c => !c.canvas).length, 0);
  eq('도감 펫 칸 캔버스 크기가 66x70 이 아닌 칸', s7.pet.filter(c => `${c.cw}x${c.ch}` !== '66x70').length, 0);
  eq('도감 펫 칸 중 잉크 없는 칸', s7.pet.filter(c => !c.ink || c.ink.px < 200).length, 0);
  eq('도감 펫 칸 중 scaleX 가 남은 칸', s7.pet.filter(c => c.tr !== 'none').length, 0);
  ok(s7.sk.length > 0 && s7.sk.every(c => !c.canvas && c.txt),
     `도감 스킬 칸 ${s7.sk.length}개는 이모지 그대로(과교정 잠금)`);

  /* ── §8 09 (192 회귀) ── */
  console.log('§8 09 — 일괄 강화 결과 캔버스(192 회귀)');
  /* ⚠ A1 규칙 — 열린 탭을 다시 누르면 패널이 «닫힌다». 이미 펫 시트면 다시 열지 않는다
     (게이트 1차가 이걸 몰라 [일괄 강화] 를 «보이지 않는 버튼» 이라고 30초 기다렸다). */
  await p.evaluate(() => {
    if (!$('bPet').classList.contains('on')) { goTab('hero'); heroSubGo('pet'); }
  });
  await p.waitForTimeout(400);
  const btn = await p.$('#bPet [data-ptup]');
  ok(!!btn, '[일괄 강화] 버튼이 있다');
  await btn.click();
  await p.waitForTimeout(500);
  const s8 = await p.evaluate(C => {
    const read = eval(C);
    const out = [...document.querySelectorAll('#upCards .upr-card > b')].map(read);
    closeUpAll && closeUpAll();
    return out;
  }, CELL);
  ok(s8.length > 0, `09 결과 칸 ${s8.length}개`);
  eq('09 결과 중 ❔ 로 뜬 칸', s8.filter(c => (c.txt || '').indexOf('❔') >= 0).length, 0);
  eq('09 결과 캔버스 크기가 90x90 이 아닌 칸', s8.filter(c => `${c.cw}x${c.ch}` !== '90x90').length, 0);

  /* ── §9 재렌더 생존 ── */
  console.log('§9 살아있음 — 재렌더가 여러 번 돌아도 빈 칸이 안 생긴다');
  /* ⚠ A1 규칙 — 열린 탭을 다시 누르면 패널이 «닫힌다». 이미 펫 시트면 다시 열지 않는다
     (게이트 1차가 이걸 몰라 [일괄 강화] 를 «보이지 않는 버튼» 이라고 30초 기다렸다). */
  await p.evaluate(() => {
    if (!$('bPet').classList.contains('on')) { goTab('hero'); heroSubGo('pet'); }
  });
  await p.waitForTimeout(400);
  const s9 = await p.evaluate(async I => {
    const ink = eval(I);
    const blanks = [];
    for (let i = 0; i < 6; i++) {
      S.gold = (S.gold || 0) + 1;                  /* 내용이 바뀌어야 setBody 가 실제로 갈아끼운다 */
      uiDirty = true; renderUI();
      await new Promise(r => setTimeout(r, 120));
      blanks.push([...document.querySelectorAll('#bPet canvas.pt-cv')].filter(c => !ink(c)).length);
    }
    return { blanks, n: document.querySelectorAll('#bPet canvas.pt-cv').length };
  }, INK);
  ok(s9.n >= 39, `펫 시트 캔버스 ${s9.n}개 (슬롯 3 + 카드 36)`);
  eq('재렌더 6회 동안 나온 빈 캔버스', s9.blanks.reduce((a, b) => a + b, 0), 0);

  /* ── §10 기능 — 장착 해제 / 재장착이 슬롯 그림에 반영된다 ── */
  console.log('§10 기능 — 장착 토글이 슬롯 썸네일에 반영된다');
  const before = await p.evaluate(() => S.eqPet.slice());
  await p.click('#bPet .sk-slot[data-ptun]');            /* 첫 칸 해제 */
  await p.waitForTimeout(450);
  const off = await p.evaluate(() => ({
    eq: S.eqPet.slice(),
    lockFirst: !!document.querySelector('#bPet .sk-eqp .sk-slot.lock'),
    canvases: document.querySelectorAll('#bPet .sk-slot[data-ptun] canvas.pt-cv').length
  }));
  ok(off.eq.filter(Boolean).length === before.filter(Boolean).length - 1, '해제로 장착 수 −1',
     JSON.stringify(off.eq));
  ok(off.lockFirst, '빈 칸이 잠금 슬롯으로 바뀐다');
  eq('남은 슬롯 캔버스', off.canvases, before.filter(Boolean).length - 1);

  const reId = before.find(x => x && off.eq.indexOf(x) < 0);
  await p.evaluate(id => { toggleEquip(PT[id], 'pet'); save(); uiDirty = true; renderUI(); }, reId);
  await p.waitForTimeout(450);
  const on = await p.evaluate(({ C, id }) => {
    const read = eval(C);
    const want = PT[id];
    const cells = [...document.querySelectorAll('#bPet .sk-slot[data-ptun]')].map(s => ({
      id: s.dataset.ptun, c: read(s.querySelector('.sk-si')) }));
    const mine = cells.find(c => c.id === id);
    return { n: cells.length, sp: mine && mine.c.sp, wantSp: want.sp,
             ink: !!(mine && mine.c.ink && mine.c.ink.px > 200) };
  }, { C: CELL, id: reId });
  eq('재장착 후 장착 슬롯 수', on.n, before.filter(Boolean).length);
  eq('재장착한 칸의 스프라이트', on.sp, on.wantSp);
  ok(on.ink, '재장착한 칸이 실제로 그려져 있다(빈 캔버스 아님)');

  /* ── §11 콘솔 ── */
  ok(errs.length === 0, '콘솔·페이지 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  const good = fail === 0;
  console.log(`\nVERIFY174 ${pass}/${pass + fail} ${good ? 'PASS' : 'FAIL'}`);
  process.exit(good ? 0 : 1);
})();
