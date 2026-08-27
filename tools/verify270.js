#!/usr/bin/env node
/* 270 검증 — 08 세부 팝업 진행바(`.sk-pb`) 라벨은 «바 내부 가운데» 고정이다.
 *
 *   node tools/verify270.js
 *
 * 버그(주인 보고 2026-08-27): 「진행바 안의 글자가 왼쪽으로 쏠려 안 보인다」.
 *   원인은 라벨이 **채움(fill) 끝을 따라다니는** 인라인 좌표였다 —
 *   `<b style="left:calc(<p>% + 3px)">`(스킬 세부 · 코스튬 세부 2곳).
 *   재료가 적어 p 가 0~10% 면 글자가 바 좌단에 처박히고, 6px 검정 스트로크가
 *   바 테두리(검정 6px)와 겹쳐 읽을 수 없다.
 *
 * ⚠ 이 배치는 08 측정표 §2.4 의 **실측값**(«주황 채움이 끝나는 지점 바로 오른쪽 3px 뒤»)이다.
 *   즉 «가운데» 는 레퍼런스가 아니라 **주인 지시에 의한 의도적 이탈**이다 → 측정표 §15 정오표.
 *   이 게이트는 그 «이탈» 을 못 박는 자다 — ref 대조로 되돌리지 마라.
 *
 * 검사 항목 (156 비고 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 스킬 세부 — p 가 0%·중간·MAX 어디서든 라벨 잉크 중심이 트랙 중심과 ±2px
 *   [B] 가독성 — 라벨 잉크(스트로크 포함)가 바 좌우 검정 테두리를 침범하지 않는다
 *   [C] 코스튬 세부 — 보유(진행도)·미보유(긴 🔒획득조건) 둘 다 가운데
 *   [D] 과교정 잠금 — 채움 `<i>` 는 여전히 «비율만큼» 자란다(라벨만 고정한 것이지 바를 죽인 게 아니다)
 *   [E] 인라인 좌표 잔재 0 — `style="left:calc(...%"` 가 소스에 남아 있지 않다
 *   [F] 전수 — 다른 진행바 라벨(`.sk-bar>b` · `.qs-p b`)은 종전대로 inset:0 가운데
 *   [G] 콘솔·페이지 에러 0
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const fails = [];
let n = 0;
const fail = (m) => { n++; fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => { n++; console.log('  ✓ ' + m); };
const eq = (label, got, want) => (got === want ? ok(label + ' = ' + JSON.stringify(got))
                                              : fail(label + ' = ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(want) + ')'));
const near = (label, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(label + ' = ' + got.toFixed(2) + ' (기대 ' + want.toFixed(2) + ' ±' + tol + ')')
  : fail(label + ' = ' + got.toFixed(2) + ' (기대 ' + want.toFixed(2) + ' ±' + tol + ')'));

/* 열려 있는 `.sk-pb` 의 기하를 잰다.
   - 트랙(패딩 박스) = 겉 박스에서 검정 테두리 두께를 뺀 안쪽. 라벨의 left/right:0 기준이 이 박스다.
   - 라벨 잉크 폭은 `<b>` 안의 텍스트에 Range 를 씌워 잰다(플렉스 박스 자체는 트랙 전폭이라 소용없다). */
const probe = () => {
  const bar = document.querySelector('#mbox .sk-pb');
  if (!bar) return null;
  const b = bar.querySelector('b'), i = bar.querySelector('i');
  const cs = getComputedStyle(bar);
  const br = bar.getBoundingClientRect();
  const bw = parseFloat(cs.borderLeftWidth) || 0;
  const track = { l: br.left + bw, r: br.right - bw };
  const r = document.createRange();
  r.selectNodeContents(b);
  const ink = r.getBoundingClientRect();
  return {
    text: b.textContent,
    trackL: track.l, trackR: track.r, trackC: (track.l + track.r) / 2, border: bw,
    inkL: ink.left, inkR: ink.right, inkC: (ink.left + ink.right) / 2, inkW: ink.width,
    stroke: parseFloat(getComputedStyle(b).webkitTextStrokeWidth) || 0,
    fillW: i ? i.getBoundingClientRect().width : -1,
    trackW: track.r - track.l,
    inlineLeft: b.getAttribute('style') || '',
  };
};

/* 팝업 열림 애니메이션(스케일)이 도는 동안 재면 트랙 폭이 424 가 아니라 407 로 나온다.
   중심 판정은 같은 프레임 안이라 영향이 없지만, 로그 수치가 흔들려 다음 세션을 헷갈리게 한다.
   유한 애니메이션이 끝날 때까지 기다린 뒤 잰다 (164 가 쓴 것과 같은 수법). */
const settle = async (page) => {
  await page.evaluate(() => Promise.all(document.getAnimations({ subtree: true })
    .filter(a => { try { return a.effect && a.effect.getComputedTiming().iterations !== Infinity; } catch (e) { return false; } })
    .map(a => a.finished.catch(() => {}))).catch(() => {}));
};

/* 한 케이스를 채점한다 — [A]/[C] 공통 */
const grade = (tag, g) => {
  if (!g) { fail(tag + ' — `.sk-pb` 를 못 찾았다'); return; }
  near(tag + ' 라벨 잉크 중심 − 트랙 중심', g.inkC - g.trackC, 0, 2);
  /* [B] 가독성 — 스트로크는 잉크 밖으로 한쪽 절반씩 나간다. 그 바깥선이 검정 테두리를 안 먹어야 한다 */
  const half = g.stroke / 2;
  const left = g.inkL - half - g.trackL;
  const right = g.trackR - (g.inkR + half);
  (left >= 0 ? ok : fail)(tag + ' 좌측 여유(스트로크 포함) = ' + left.toFixed(2) + 'px ≥ 0');
  (right >= 0 ? ok : fail)(tag + ' 우측 여유(스트로크 포함) = ' + right.toFixed(2) + 'px ≥ 0');
  eq(tag + ' 인라인 style 좌표 없음', /left\s*:/.test(g.inlineLeft), false);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward();
                              if (typeof closeModal === 'function') closeModal(); });

  /* ---- [A]·[B] 스킬 세부 — 진행도 3구간 ----
     세이브 모양은 `S.own[id] = {l: 레벨, n: 조각}` 이다(index.html ~16153 의 has/oLv/frag).
     «재료가 거의 없는» 최악(p≈0) 을 직접 심어 주인이 본 그 상태를 재현한다. */
  console.log('[A] 08 스킬 세부 진행바 라벨 — 0% / 중간 / MAX');
  const skId = await page.evaluate(() => SKILLS[0].id);
  const cases = [
    { name: 'p≈0% (재료 0)', frac: 0 },
    { name: 'p≈50%',        frac: 0.5 },
    { name: 'p=100%',       frac: 1 },
  ];
  for (const c of cases) {
    await page.evaluate(({ id, frac }) => {
      S.own[id] = { l: 1, n: Math.round(fragNeed(1) * frac) };
      showSkillDetail(id);
    }, { id: skId, frac: c.frac });
    await page.waitForTimeout(120); await settle(page);
    const g = await page.evaluate(probe);
    console.log('  · ' + c.name + ' 라벨 «' + (g ? g.text : '?') + '» 채움 ' + (g ? g.fillW.toFixed(1) : '?') + 'px / 트랙 ' + (g ? g.trackW.toFixed(1) : '?') + 'px');
    grade('  ' + c.name, g);
  }

  /* MAX 표기도 본다 — 문자열이 짧아 가운데 정렬이 가장 눈에 띄는 칸이다 */
  console.log('[A2] MAX 표기');
  await page.evaluate((id) => { S.own[id] = { l: maxLv(SK[id]), n: 0 }; showSkillDetail(id); }, skId);
  await page.waitForTimeout(120); await settle(page);
  const gMax = await page.evaluate(probe);
  console.log('  · 라벨 «' + (gMax ? gMax.text : '?') + '»');
  eq('  MAX 표기다', gMax && gMax.text.trim(), 'MAX');
  grade('  MAX', gMax);

  /* ---- [D] 과교정 잠금 — 채움 막대는 여전히 비율대로 자란다 ---- */
  console.log('[D] 과교정 잠금 — 채움 <i> 는 비율대로 자란다(라벨만 고정한 것)');
  /* 기대값은 «심은 조각 / 필요 조각» 을 페이지에서 되받아 쓴다 —
     fragNeed 가 작은 정수(5)라 0.5 를 심어도 실제 비율은 3/5=0.6 이다.
     여기서 0.5 를 상수로 박으면 게이트가 «제품이 아니라 내 산수» 를 재게 된다. */
  const fills = [];
  for (const frac of [0, 0.5, 1]) {
    const want = await page.evaluate(({ id, frac }) => {
      const need = fragNeed(1), n = Math.round(need * frac);
      S.own[id] = { l: 1, n }; showSkillDetail(id);
      return Math.min(1, n / need);
    }, { id: skId, frac });
    await page.waitForTimeout(80); await settle(page);
    const g = await page.evaluate(probe);
    fills.push({ got: g ? g.fillW / g.trackW : -1, want });
  }
  fills.forEach(f => near('  채움비', f.got, f.want, 0.02));
  (fills[0].got < fills[1].got && fills[1].got < fills[2].got ? ok : fail)(
    '  채움이 단조 증가: ' + fills.map(f => (f.got * 100).toFixed(1) + '%').join(' < '));

  /* ---- [C0] 268 이 08 껍데기로 통일한 계열 — 펫 · 장비 · 유물 ----
     268(1회차)이 `showItem()` 하나로 세 계열을 `.skd` 로 이관하면서 **옛 fill 추종 문법을
     그대로 복사**해 왔다(내 작업과 같은 시각에 main 에 들어왔다). 같은 버그가 3계열에 번지므로
     여기서 같이 잠근다 — 새 세부 팝업을 만들 때 인라인 좌표를 다시 박으면 이 칸이 빨개진다. */
  console.log('[C0] 268 통일 계열(펫·장비·유물) 세부 — 재료 0 에서도 가운데');
  const famIds = await page.evaluate(() => ({
    pet: (typeof PETS !== 'undefined' && PETS[0]) ? PETS[0].id : null,
    equip: (typeof EQUIPS !== 'undefined' && EQUIPS[0]) ? EQUIPS[0].id : null,
    relic: (typeof RELICS !== 'undefined' && RELICS[0]) ? RELICS[0].id : null,
  }));
  for (const [fam, id] of Object.entries(famIds)) {
    if (!id) { fail('  ' + fam + ' — 표본 id 를 못 찾았다'); continue; }
    const shown = await page.evaluate((id) => {
      if (typeof closeModal === 'function') closeModal();
      S.own[id] = { l: 1, n: 0 };            /* 재료 0 = 가장 나쁜 칸 */
      showItem(id);
      return !!document.querySelector('#mbox .sk-pb');
    }, id);
    await page.waitForTimeout(150); await settle(page);
    if (!shown) { ok('  ' + fam + ' — 이 계열엔 `.sk-pb` 가 없다(진행바 없음) — 해당 없음'); continue; }
    const g = await page.evaluate(probe);
    console.log('  · ' + fam + ' 라벨 «' + (g ? g.text : '?') + '»');
    grade('  ' + fam + '(재료 0)', g);
  }

  /* ---- [C] 코스튬 세부 — 보유 / 미보유(긴 🔒 문구) ---- */
  console.log('[C] 50 코스튬 세부 진행바 라벨 — 보유 / 미보유');
  /* AV 는 `byId(AVATARS)` 인 «맵» 이다 — 배열은 원본 `AVATARS` 쪽이다 */
  const cosIds = await page.evaluate(() => AVATARS.map(a => a.id).slice(0, 60));
  /* 보유 칸 */
  await page.evaluate((id) => {
    if (typeof closeModal === 'function') closeModal();
    S.avatars = S.avatars || {}; S.cosLv = S.cosLv || {};
    S.avatars[id] = true; S.cosLv[id] = 1; showCosDetail(id);
  }, cosIds[0]);
  await page.waitForTimeout(150); await settle(page);
  const gCosOwn = await page.evaluate(probe);
  console.log('  · 보유 라벨 «' + (gCosOwn ? gCosOwn.text : '?') + '»');
  grade('  코스튬 보유', gCosOwn);
  /* 미보유 칸 — 라벨이 «🔒 + 획득 조건» 이라 가장 길다. 좌단 처박힘이 제일 잘 드러난다 */
  const lockedId = await page.evaluate((ids) => {
    for (const id of ids) if (!cosOwn(id)) return id;
    return null;
  }, cosIds);
  if (lockedId == null) {
    fail('  미보유 코스튬을 못 찾았다(전 종 보유 상태)');
  } else {
    await page.evaluate((id) => { showCosDetail(id); }, lockedId);
    await page.waitForTimeout(150); await settle(page);
    const gCosLock = await page.evaluate(probe);
    console.log('  · 미보유 라벨 «' + (gCosLock ? gCosLock.text : '?') + '»');
    grade('  코스튬 미보유', gCosLock);
  }

  /* ---- [F] 전수 — 다른 진행바 라벨은 종전대로 «inset 가운데» ---- */
  console.log('[F] 전수 — 다른 진행바 라벨은 종전대로 가운데(회귀 잠금)');
  const others = await page.evaluate(() => {
    /* CSSOM 은 `.sk-bar>b` 를 `.sk-bar > b` 로 정규화해 돌려준다 —
       공백을 전부 지우고 비교하지 않으면 «규칙이 없다»(빈 문자열)로 잘못 읽는다. */
    const norm = (s) => String(s).replace(/\s+/g, '');
    const pick = (sel) => {
      const r = [];
      for (const s of document.styleSheets) {
        let rules; try { rules = s.cssRules; } catch (e) { continue; }
        for (const x of rules) if (x.selectorText && norm(x.selectorText) === norm(sel)) r.push(x.style.cssText);
      }
      return r.join(' | ');
    };
    return { skBar: pick('.sk-bar>b'), qsP: pick('.qs-p b'), skPb: pick('.sk-pb b') };
  });
  (/inset: ?0|left: ?0px/.test(others.skBar) && /text-align: ?center/.test(others.skBar) ? ok : fail)(
    '  `.sk-bar>b` 종전 가운데 유지: ' + JSON.stringify(others.skBar.slice(0, 90)));
  (/inset: ?0|left: ?0px/.test(others.qsP) && /justify-content: ?center/.test(others.qsP) ? ok : fail)(
    '  `.qs-p b` 종전 가운데 유지: ' + JSON.stringify(others.qsP.slice(0, 90)));
  (/justify-content: ?center/.test(others.skPb) ? ok : fail)(
    '  `.sk-pb b` 가운데 정렬 선언: ' + JSON.stringify(others.skPb.slice(0, 110)));

  /* ---- [E] 소스에 fill 추종 인라인 좌표가 남아 있지 않다 ---- */
  console.log('[E] 소스 잔재 — `style="left:calc(…%` 0건');
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const leftover = (src.match(/style="left:calc\([^"]*%/g) || []);
  eq('  fill 추종 인라인 좌표 건수', leftover.length, 0);

  /* ---- [G] 에러 0 ---- */
  console.log('[G] 콘솔·페이지 에러');
  eq('  에러 건수', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    ' + e));

  await browser.close();
  console.log('\nVERIFY270 ' + (n - fails.length) + '/' + n + (fails.length ? ' FAIL' : ' PASS'));
  if (fails.length) { fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
