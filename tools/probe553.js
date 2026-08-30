/* 553 재현 — «`verify177` ⑤ 시뮬 DPS 대용식이 실코드와 4.64 배 어긋난다» 를 제품에게 직접 묻는다
   (338 규칙 — 등재문의 처방을 따르기 전에 재현부터).

   등재문이 갈래를 둘로 열어 뒀다:
     ⓐ 대용식이 낡았다 (스킬 1개 기준인데 실코드 `stat.dps` 가 그 사이 다른 항을 더 곱하게 됐다)
     ⓑ 표본 상태(`S.own={slash}` · Lv 0 · 배수 축 하한)가 더 이상 «훈련만» 이 아니다
   둘 중 하나를 고르는 것이 이 재현기의 일이다.

   묻는 것 다섯:
     [1] 재현 — `verify177` ⑤ 와 **같은 표본**(Lv 236 · 검기 1개 · 펫·장비·도감 없음)에서
         대용 `stat.dmg × stat.rate × stat.critMul` 과 실측 `stat.dps` 의 비를 찍는다.
     [2] 분해 — 그 비를 실코드 `get dps()` 의 항별로 뜯는다. 어느 곱이 4.64 를 만드는가.
         항등식 **비 = (m × hits / cd) / 1.4 = SK_DPS_REF / ASPD0** 이 성립하는지까지 본다.
     [3] ⓑ 기각 — 표본이 «훈련만» 인가(배수 축 하한 · 펫 0 · 장비 0 · 도감 0), 그리고
         **훈련 레벨·공속 레벨을 흔들어도 비가 상수인가.** 상수면 결손은 «상태» 가 아니라 «식» 이다.
     [4] ⓐ 확인 — 일반 등급(g0) 4종 전부 같은 비인가(504 가 27종을 평평하게 만들었다),
         그리고 등급이 오르면 비가 `gWear` 배로 자라는가. «일반 등급 스킬 1개» 를 뜻하는
         대용식이라면 g0 에서 1 근처여야 하는데 실제로 얼마인지 적는다.
     [5] 뿌리 — `SK_DPS_REF` 현재값과 «1.84 → 6.49» 재정박(504)이 만든 비의 예측값
         6.49/1.4 = 4.636 이 [1] 의 실측과 같은가.

   ⚠ 이 재현기는 **제품을 안 고친다** — 결손이 `tools/` 쪽(sim131·sim168·sim177·sim249 의 `DPS_K`)
     이면 수리 후에도 제품 실측은 그대로다. 그래서 [1]·[2] 는 «맞다/틀리다» 가 아니라
     **값을 적는** 자리로 두고, 수리 전후 대조에 쓴다(338 규칙).

   실행: node tools/probe553.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

const rows = [], fails = [];
const ok  = (t, d) => rows.push(['✓', t, d || '']);
const bad = (t, d) => { rows.push(['✗', t, d || '']); fails.push(t + ' — ' + d); };
const yes = (t, c, d) => c ? ok(t, d) : bad(t, d);
const near = (t, got, want, tol) => Math.abs(got - want) <= tol
  ? ok(t, got.toPrecision(6) + ' ≈ ' + want.toPrecision(6))
  : bad(t, '실측 ' + got.toPrecision(6) + ' / 기대 ' + want.toPrecision(6) + ' (±' + tol + ')');

/* `verify177` ⑤ 와 **같은** 표본을 만든다 — 그 자가 무엇을 재고 있는지 그대로 물어야 한다.
   ⚠ 훈련 «밖» 7종(aspd·crit·cdmg…)의 Lv 도 0 으로 되돌린다. 그 자는 새 페이지에서 한 번만 재서
     기본값 0 이지만, 이 재현기는 한 페이지에서 표본을 여러 번 갈아 끼우므로 [3] 의 공속 흔들기가
     [4] 로 새면 **지속형(cd 0)만** 값이 달라진다(1회차에 실제로 g2 aura 가 41.72 → 7.30 으로 읽혔다). */
const SAMPLE = `
  S.lv.atk = 236; S.lv.hp = 236; S.lv.regen = 236; S.trainStage = 3;
  S.lv.aspd = 0; S.lv.crit = 0; S.lv.cdmg = 0; S.lv.pierce = 0;
  S.own = { slash: { n:0, l:0 } };
  S.eqSkill = ['slash']; S.eqPet = [];
  S.eqSlot = { weapon:null, shield:null, amulet:null };
  S.avatars = {}; S.coll = {}; S.rank = 0; markDirty();`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* ---------- [1] 재현 ---------- */
  const a = await page.evaluate(S0 => {
    eval(S0);
    return { proxy: stat.dmg * stat.rate * stat.critMul, real: stat.dps,
             dmg: stat.dmg, rate: stat.rate, critMul: stat.critMul };
  }, SAMPLE);
  ok('1-a 대용 stat.dmg × stat.rate × stat.critMul', a.proxy.toExponential(3)
     + '  (dmg ' + a.dmg.toExponential(3) + ' · rate ' + a.rate.toFixed(4) + ' · critMul ' + a.critMul.toFixed(4) + ')');
  ok('1-b 실측 stat.dps', a.real.toExponential(3));
  ok('1-c ⇒ 비 real/proxy', (a.real / a.proxy).toFixed(4)
     + (a.real / a.proxy > 2.0 || a.real / a.proxy < 0.5 ? '  ← 허용 0.5~2.0 밖 (결손 재현)' : '  ← 허용 안'));

  /* ---------- [2] 분해 ---------- */
  const b = await page.evaluate(S0 => {
    eval(S0);
    const s = SK['slash'];
    const dmg1 = skillDmg(s), hits = skillHits(s);
    const rateTerm = Math.max(0.35, stat.rate / 1.4);
    return { m: s.m, cd: s.cd, hits, gw: gWear(s.g), lw: lvWear(oLv(s.id)),
             skillDmgOverAtk: dmg1 / stat.dmg, rateTerm, rate: stat.rate,
             base: s.m * hits / s.cd, ref: SK_DPS_REF, aspd0: U.aspd.val(0) };
  }, SAMPLE);
  ok('2-a 검기 항', 'm ' + b.m + ' · hits ' + b.hits + ' · cd ' + b.cd
     + ' · gWear(g0) ' + b.gw + ' · lvWear(Lv0) ' + b.lw);
  ok('2-b skillDmg/stat.dmg = m×gWear×lvWear', b.skillDmgOverAtk.toFixed(4));
  ok('2-c 공속 항 max(0.35, rate/1.4)', b.rateTerm.toFixed(4) + '  (rate ' + b.rate.toFixed(4) + ')');
  ok('2-d 스킬 기본 DPS m×hits/cd', b.base.toFixed(4) + '  (= SK_DPS_REF ' + b.ref + ' 여야 한다 — 504)');
  /* ★ 항등식 — 비는 «스킬 기본 DPS ÷ 공속 기준값» 하나다. 나머지 항은 대용식과 그대로 약분된다. */
  near('2-e 항등식 비 = (m×hits/cd) ÷ aspd Lv0 — 대용식이 빠뜨린 항이 이것 하나뿐임을 증명',
       a.real / a.proxy, b.base / b.aspd0, 1e-9);
  ok('2-f ⇒ 빠진 항', 'SK_DPS_REF ' + b.ref + ' ÷ aspd Lv0 ' + b.aspd0
     + ' = ' + (b.base / b.aspd0).toFixed(4));

  /* ---------- [3] 갈래 ⓑ 기각 ---------- */
  const c = await page.evaluate(S0 => {
    eval(S0);
    const bb = bonus(), tbv = 1 + TRAIN_BONUS * (trainStage() - 1);
    return { mul: bb.atk, tb: tbv, axis: bb.atk / tbv, pet: S.eqPet.length,
             eq: Object.values(S.eqSlot).filter(Boolean).length,
             coll: Object.keys(S.coll).length, av: Object.keys(S.avatars).length };
  }, SAMPLE);
  yes('3-a 배수 축이 하한이다 (bonus().atk ' + c.mul.toFixed(3) + ' ÷ 단계보너스 ' + c.tb.toFixed(2)
      + ' = ' + c.axis.toFixed(3) + ' ≤ 1.05)', c.axis <= 1.05, '«훈련만» 이 맞다');
  yes('3-b 표본에 펫·장비·도감·아바타가 0 이다', c.pet === 0 && c.eq === 0 && c.coll === 0 && c.av === 0,
      '펫 ' + c.pet + ' · 장비 ' + c.eq + ' · 도감 ' + c.coll + ' · 아바타 ' + c.av);
  /* 상태를 흔든다 — 비가 상수면 «표본이 훈련만이 아니다»(ⓑ)는 기각된다. */
  const shake = await page.evaluate(S0 => {
    const out = [];
    [[0, 0], [236, 0], [1000, 0], [236, 20], [236, 60]].forEach(([atkL, aspdL]) => {
      eval(S0);
      S.lv.atk = atkL; S.lv.aspd = aspdL; markDirty();
      out.push({ atkL, aspdL, rate: stat.rate,
                 ratio: stat.dps / (stat.dmg * stat.rate * stat.critMul) });
    });
    return out;
  }, SAMPLE);
  shake.forEach(r => ok('3-c atk Lv ' + String(r.atkL).padStart(4) + ' · aspd Lv ' + String(r.aspdL).padStart(2)
                        + ' (rate ' + r.rate.toFixed(2) + ')', '비 ' + r.ratio.toFixed(4)));
  const spread = Math.max(...shake.map(r => r.ratio)) - Math.min(...shake.map(r => r.ratio));
  yes('3-d ⇒ 훈련·공속 레벨을 흔들어도 비가 상수다 (폭 ' + spread.toExponential(2) + ' ≤ 1e-9) '
      + '— 결손은 «상태»(ⓑ)가 아니라 «식»(ⓐ)이다', spread <= 1e-9);

  /* ---------- [4] 갈래 ⓐ 확인 ---------- */
  const d = await page.evaluate(S0 => {
    const g0 = SKILLS.filter(s => s.g === 0).map(s => s.id);
    const one = id => { eval(S0); S.own = { [id]: { n:0, l:0 } }; S.eqSkill = [id]; markDirty();
                        return { id, g: SK[id].g,
                                 ratio: stat.dps / (stat.dmg * stat.rate * stat.critMul) }; };
    const byGrade = [0,1,2,3,4,5].map(g => { const s = SKILLS.find(x => x.g === g && !x.sup); return one(s.id); });
    return { g0: g0.map(one), byGrade };
  }, SAMPLE);
  d.g0.forEach(r => ok('4-a g0 ' + r.id, '비 ' + r.ratio.toFixed(4)));
  const g0spread = Math.max(...d.g0.map(r => r.ratio)) - Math.min(...d.g0.map(r => r.ratio));
  yes('4-b 일반 등급 4종이 전부 같은 비다 (폭 ' + g0spread.toExponential(2) + ' ≤ 1e-3) — 504 가 평평하게 만들었다',
      g0spread <= 1e-3);
  d.byGrade.forEach(r => ok('4-c g' + r.g + ' ' + r.id, '비 ' + r.ratio.toFixed(4)));
  yes('4-d 등급이 오르면 비가 gWear(×3) 배로 자란다 — 대용식은 «일반 1개» 기준이므로 g0 만 봐야 한다',
      Math.abs(d.byGrade[1].ratio / d.byGrade[0].ratio - 3) < 0.02,
      'g1/g0 = ' + (d.byGrade[1].ratio / d.byGrade[0].ratio).toFixed(4));
  /* ★ 고칠 식의 **적용 범위**를 여기서 못박는다 — 빠진 항 `SK_DPS_REF ÷ aspd Lv0` 은
     `cd > 0` 스킬에서만 «상수» 다. `cd = 0` 지속형은 실코드가 공속 항을 아예 안 곱하므로
     (`d += dmg*hits`) 비가 `1/rate` 로 움직인다. 시뮬의 기준 스킬은 부팅 스킬 `slash`(cd 0.85)라
     보정은 정확하지만, 나중에 기준 스킬을 지속형으로 바꾸면 이 항이 다시 어긋난다. */
  const e = await page.evaluate(S0 => {
    const out = [];
    [['slash', 0], ['slash', 60], ['aura', 0], ['aura', 60]].forEach(([id, aspdL]) => {
      eval(S0);
      S.own = { [id]: { n:0, l:0 } }; S.eqSkill = [id]; S.lv.aspd = aspdL; markDirty();
      out.push({ id, cd: SK[id].cd, aspdL, rate: stat.rate,
                 ratio: stat.dps / (stat.dmg * stat.rate * stat.critMul) });
    });
    return out;
  }, SAMPLE);
  e.forEach(r => ok('4-e ' + r.id + '(cd ' + r.cd.toFixed(2) + ') · aspd Lv ' + String(r.aspdL).padStart(2)
                    + ' (rate ' + r.rate.toFixed(2) + ')', '비 ' + r.ratio.toFixed(4)));
  yes('4-f ⇒ 빠진 항은 cd>0 에서만 상수다 (slash 불변 · aura 는 공속에 반비례) '
      + '— 시뮬 기준 스킬이 부팅 스킬 slash(cd 0.85)라 보정이 정확하다',
      Math.abs(e[0].ratio - e[1].ratio) < 1e-9 && Math.abs(e[2].ratio * e[2].rate - e[3].ratio * e[3].rate) < 1e-6,
      'slash ' + e[0].ratio.toFixed(4) + '=' + e[1].ratio.toFixed(4)
      + ' · aura ' + e[2].ratio.toFixed(2) + '→' + e[3].ratio.toFixed(2));

  /* ---------- [5] 뿌리 ---------- */
  const refSrc = (SRC.match(/const SK_DPS_REF\s*=\s*([\d.]+)/) || [])[1];
  ok('5-a 소스의 SK_DPS_REF', refSrc + '  (484 는 1.84 였다 — 504 가 «실제 기여 DPS» 평균으로 재정박)');
  near('5-b 예측 비 SK_DPS_REF ÷ 1.4 = 실측 비', a.real / a.proxy, parseFloat(refSrc) / 1.4, 1e-6);
  ok('5-c ⇒ 484 시절 비', (1.84 / 1.4).toFixed(4) + '  (허용 0.5~2.0 안 — 그 때는 초록이었다)');
  ok('5-d ⇒ 504 이후 비', (parseFloat(refSrc) / 1.4).toFixed(4) + '  (허용 밖 — 자가 빨개진 자리)');

  yes('콘솔·런타임 에러 0', errs.length === 0, errs.join(' | '));

  await browser.close();
  const w = [2, 78, 0];
  rows.forEach(r => console.log(r[0] + ' ' + r[1].padEnd(w[1]) + (r[2] ? '  →  ' + r[2] : '')));
  console.log('\nPROBE553 ' + (rows.length - fails.length) + '/' + rows.length + (fails.length ? ' FAIL' : ' PASS'));
  process.exit(fails.length ? 1 : 0);
})();
