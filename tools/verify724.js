#!/usr/bin/env node
/* 작업 724 게이트 — «전 스탯 합성 모델»(주인 확정 2026-09-02 04:05)
 *
 *   node tools/verify724.js
 *
 * 모델: 총배율 = (1+Σ장비)×(1+Σ스킬)×(1+Σ코스튬)×(1+Σ펫)×(1+Σ훈련)×(1+Σ룬)×(1+Σ단련)×(1+Σ유물)
 *       ⇒ **카테고리 «안» 은 합 · 카테고리 «간» 은 곱.**
 *
 *   [A] 카테고리 «안» = Σ — 8 카테고리 각각 2표본 대조(Σ 예측과 1e-12 안, Π 예측과는 벌어진다)
 *   [B] 카테고리 «간» = × — 두 카테고리를 동시에 켜면 각각의 곱(7쌍 + 3중 조립 1건)
 *   [C] 표시 = 실계산  — 07 스킬 · 26 펫 · 50 코스튬 · 05 장비 시트의 «총(보유) 효과» 표기
 *   [D] 총배율 조립    — 전 카테고리를 켜고 «Π(1+Σ)» 를 게이트가 **따로 계산해** bonus() 와 맞춘다
 *   [E] 죽은 선언 0    — 옛 곱 모델의 잔재(`cosOwnMul`)가 소스에 없다 · 장부는 한 벌뿐이다
 *   [R] 되돌림 시험    — 일부러 옛 곱으로 되돌린 사본에서 [A]·[B]·[C] 가 정말 빨개지는가(LESSONS 43-①)
 *
 * ⚠ 이 자는 **값(밸런스 계수)을 단언하지 않는다** — 계수 확정은 199 몫이다. 여기서 지키는 것은
 *   «어떻게 결합하는가» 하나다(값이 바뀌어도 초록이어야 하고, 결합이 바뀌면 빨개야 한다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };
const f = n => (Math.abs(n) >= 1e6 ? n.toExponential(4) : (+n).toFixed(8));
const EPS = 1e-12;

/* 페이지 안에서 «맨몸» 을 만드는 한 벌 — probe724 와 같은 눈이다 */
const RESET_SRC = `() => { S.own = {}; S.coll = {}; S.avatars = {}; S.cosLv = {}; S.rune = {};
  S.eqSlot = {}; S.eqSkill = []; S.eqPet = []; S.temper = null;
  S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} }; markDirty(); }`;

/* 8 카테고리 «안» 의 2표본 — 페이지 안에서 도는 한 벌(음성항 사본에서도 같은 것을 쓴다) */
const CATS_SRC = `(RESET) => {
  const R = eval('(' + RESET + ')');
  const out = {};
  /* ① 장비 — 보유 무기 2 + 장착 무기 1 이 한 장부(축 atk) */
  R();
  { const w = EQUIPS.filter(e => e.slot === 'weapon').slice(0, 2);
    S.own[w[0].id] = { l: 1 }; markDirty(); const one = bonus().atk;
    S.own[w[1].id] = { l: 1 }; S.eqSlot.weapon = w[0].id; markDirty(); const two = bonus().atk;
    const x1 = ownVal(w[0]), x2 = ownVal(w[1]) + equipVal(EQ[w[0].id]);
    out.eq = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ② 스킬 — 보유 2 */
  R();
  { const s = SKILLS.slice(0, 2);
    S.own[s[0].id] = { l: 1 }; markDirty(); const one = bonus().atk;
    S.own[s[1].id] = { l: 1 }; markDirty(); const two = bonus().atk;
    const x1 = ownVal(s[0]), x2 = ownVal(s[1]);
    out.sk = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ③ 코스튬 — 보유 2 + 강화(보유·강화가 한 장부다) */
  R();
  { S.avatars[AVATARS[0].id] = 1; markDirty(); const one = bonus().atk;
    S.avatars[AVATARS[1].id] = 1; S.cosLv[AVATARS[0].id] = 4; markDirty(); const two = bonus().atk;
    const x1 = cosOwnStep('atk', 1), x2 = cosOwnStep('atk', 2) + cosLvVal('atk');
    out.cos = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ④ 펫 — 보유 2 + 485 장착(축 atk) */
  R();
  { const q = PETS.slice(0, 2);
    S.own[q[0].id] = { l: 1 }; markDirty(); const one = bonus().atk;
    S.own[q[1].id] = { l: 1 }; S.eqPet = [q[0].id]; markDirty(); const two = bonus().atk;
    const x1 = ownVal(q[0]) * 0.6, x2 = ownVal(q[1]) * 0.6 + petEquipVal(PT[q[0].id]);
    out.pet = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ⑤ 훈련 — 단계 2 ↔ 3. 항이 하나인 카테고리라 «선형인가» 가 곧 Σ 다 */
  R();
  { S.trainStage = 2; markDirty(); const one = bonus().atk;
    S.trainStage = 3; markDirty(); const two = bonus().atk;
    const x1 = TRAIN_BONUS, x2 = TRAIN_BONUS;
    out.train = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ⑥ 룬 — 2룬 */
  R();
  { const r = RUNES.filter(x => x.eff && x.eff.atk).slice(0, 2);
    S.rune[r[0].id] = 5; markDirty(); const one = bonus().atk;
    S.rune[r[1].id] = 5; markDirty(); const two = bonus().atk;
    const x1 = runeVal(r[0].id, 'atk'), x2 = runeVal(r[1].id, 'atk');
    out.rune = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ⑦ 단련 — 같은 축 레벨 2 ↔ 4(선형) */
  R();
  { S.temper = { alloc: { atk: 2 } }; markDirty(); const one = bonus().atk;
    S.temper = { alloc: { atk: 4 } }; markDirty(); const two = bonus().atk;
    const x1 = TEMPER_EFF.atk * 2, x2 = TEMPER_EFF.atk * 2;
    out.temper = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  /* ⑧ 유물 — 같은 축 2종 */
  R();
  { const byEff = {};
    RELICS.forEach(r => { (byEff[r.eff] = byEff[r.eff] || []).push(r); });
    const pick = Object.keys(byEff).map(k => byEff[k]).filter(a => a.length >= 2)
      .map(a => a.slice(0, 2)).find(a => ['all', 'atk', 'gold', 'hp'].indexOf(a[0].eff) >= 0);
    const axis = pick[0].eff === 'gold' ? 'gold' : pick[0].eff === 'hp' ? 'hp' : 'atk';
    S.own[pick[0].id] = { l: 1 }; markDirty(); const one = bonus()[axis];
    S.own[pick[1].id] = { l: 1 }; markDirty(); const two = bonus()[axis];
    const x1 = relicVal(pick[0]), x2 = relicVal(pick[1]);
    out.relic = { one, two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) }; }
  return out;
}`;

const CATN = { eq: '장비', sk: '스킬', cos: '코스튬', pet: '펫', train: '훈련', rune: '룬', temper: '단련', relic: '유물' };

const boot = async (b, url) => {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(url);
  await p.waitForFunction(() => typeof bonus === 'function' && typeof SKILLS !== 'undefined');
  await p.waitForTimeout(500);
  return { ctx, p, errs };
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const { ctx, p, errs } = await boot(b, URL);

  /* ══════════ [A] 카테고리 «안» = Σ ══════════ */
  console.log('[A] 카테고리 «안» 은 합이다 — 8 카테고리 2표본');
  const A = await p.evaluate(new Function('RESET', 'return (' + CATS_SRC + ')(RESET)'), RESET_SRC);
  let ai = 0;
  for (const k of Object.keys(CATN)) {
    ai++;
    const o = A[k];
    const isSum = Math.abs(o.two - o.sum) < EPS;
    const gap = Math.abs(o.sum - o.prod);
    ok(isSum, 'A' + ai + ' ' + CATN[k] + ' — 2표본이 Σ 예측과 일치',
       '실측 ' + f(o.two) + ' · Σ ' + f(o.sum) + ' · Π ' + f(o.prod));
    /* ⚠ Σ 와 Π 가 애초에 같은 표본이면 위 항은 «아무것도 안 지키는» 초록이다 — 벌어짐을 따로 못박는다 */
    ok(gap > EPS, 'A' + ai + 'b ' + CATN[k] + ' — 표본이 Σ ↔ Π 를 실제로 가른다(둘의 차 ' + f(gap) + ')');
  }

  /* ══════════ [B] 카테고리 «간» = × ══════════ */
  console.log('[B] 카테고리 «간» 은 곱이다');
  const B = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    /* 카테고리별 «켜는 손» 하나씩 — 축은 전부 atk */
    const ON = {
      eq:     () => { S.own[EQUIPS.filter(e => e.slot === 'weapon')[0].id] = { l: 3 }; },
      sk:     () => { S.own[SKILLS[0].id] = { l: 3 }; },
      cos:    () => { S.avatars[AVATARS[0].id] = 1; S.cosLv[AVATARS[0].id] = 2; },
      pet:    () => { S.own[PETS[0].id] = { l: 3 }; },
      train:  () => { S.trainStage = 3; },
      rune:   () => { S.rune[RUNES.filter(x => x.eff && x.eff.atk)[0].id] = 4; },
      temper: () => { S.temper = { alloc: { atk: 5 } }; },
      relic:  () => { const r = RELICS.find(x => x.eff === 'all' || x.eff === 'atk'); S.own[r.id] = { l: 2 }; }
    };
    const solo = {};
    Object.keys(ON).forEach(k => { R(); ON[k](); markDirty(); solo[k] = bonus().atk; });
    const pairs = Object.keys(ON).filter(k => k !== 'sk').map(k => {
      R(); ON.sk(); ON[k](); markDirty();
      return { k, got: bonus().atk, want: solo.sk * solo[k] };
    });
    R(); ON.sk(); ON.cos(); ON.relic(); markDirty();
    const tri = { got: bonus().atk, want: solo.sk * solo.cos * solo.relic };
    return { solo, pairs, tri };
  }, RESET_SRC);
  B.pairs.forEach((r, i) => ok(Math.abs(r.got - r.want) < 1e-9,
    'B' + (i + 1) + ' 스킬 × ' + CATN[r.k] + ' = 각각의 곱', f(r.got) + ' ↔ ' + f(r.want)));
  ok(Math.abs(B.tri.got - B.tri.want) < 1e-9, 'B8 스킬 × 코스튬 × 유물 3중도 곱',
     f(B.tri.got) + ' ↔ ' + f(B.tri.want));

  /* ══════════ [C] 표시 = 실계산 ══════════ */
  console.log('[C] 시트 표기 = 실계산(같은 식을 본다)');
  const C = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    R();
    SKILLS.slice(0, 4).forEach(s => { S.own[s.id] = { l: 7 }; });
    PETS.slice(0, 3).forEach(s => { S.own[s.id] = { l: 7 }; });
    EQUIPS.filter(e => e.slot === 'weapon').slice(0, 3).forEach(e => { S.own[e.id] = { l: 7 }; });
    AVATARS.slice(0, 3).forEach(a => { S.avatars[a.id] = 1; });
    S.cosLv[AVATARS[0].id] = 5;
    markDirty();
    /* ⚠ 값을 «비슷한가» 로 재면 표기 반올림(`pct` 는 정수 자리다)에 묻혀 결합 모델이 바뀌어도
       초록이 될 수 있다 — **제품이 쓰는 포매터로 만든 문자열과 글자까지 맞춘다**(340·194 규약). */
    const txt = (fn, sel) => { try { fn(); } catch (e) { return 'ERR:' + e.message; }
      const el = document.querySelector(sel); return el ? el.textContent.trim() : ''; };
    let wp = ''; try { renderWpn(); const el = document.getElementById('wpnTotal'); wp = el ? el.textContent.trim() : ''; }
    catch (e) { wp = 'ERR:' + e.message; }
    return {
      skTxt: txt(renderSkill, '#bSk .sk-tot em'),
      skWant: '공격력 +' + pct(SKILLS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0)),
      ptTxt: txt(renderPet, '#bPet .sk-tot em'),
      ptWant: '공격력 +' + pct(PETS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0)),
      csTxt: txt(renderCos, '#bCos .sk-tot em'),
      csWant: '공격력 ' + pct(cosOwnSum('atk') + cosLvVal('atk')),
      wpTxt: wp, wpWant: '총 보유 효과: 공격력 +' + wpct2(wpnTotalOwn())
    };
  }, RESET_SRC);
  ok(C.skTxt === C.skWant, 'C1 07 스킬 시트 «총 보유 효과» = Σ ownVal', C.skTxt + ' ↔ ' + C.skWant);
  ok(C.ptTxt === C.ptWant, 'C2 26 펫 시트 «총 보유 효과» = Σ ownVal', C.ptTxt + ' ↔ ' + C.ptWant);
  ok(C.csTxt === C.csWant, 'C3 50 코스튬 시트 «총효과» = 보유 Σ + 강화(한 장부)', C.csTxt + ' ↔ ' + C.csWant);
  ok(C.wpTxt === C.wpWant, 'C4 05 장비 시트 «총 보유 효과» = Σ ownVal(수리 전부터 합이었다)', C.wpTxt + ' ↔ ' + C.wpWant);

  /* ══════════ [D] 총배율 조립 ══════════ */
  console.log('[D] 총배율 = Π(1+Σ카테고리) — 게이트가 따로 계산해 맞춘다');
  const D = await p.evaluate(RESET => {
    const R = eval('(' + RESET + ')');
    R();
    SKILLS.slice(0, 5).forEach(s => { S.own[s.id] = { l: 4 }; });
    PETS.slice(0, 4).forEach(s => { S.own[s.id] = { l: 4 }; });
    S.eqPet = [PETS[0].id];
    EQUIPS.slice(0, 9).forEach(e => { S.own[e.id] = { l: 4 }; });
    S.eqSlot.weapon = EQUIPS.filter(e => e.slot === 'weapon')[0].id;
    RELICS.slice(0, 3).forEach(r => { S.own[r.id] = { l: 2 }; });
    AVATARS.slice(0, 4).forEach(a => { S.avatars[a.id] = 1; });
    S.cosLv[AVATARS[1].id] = 3;
    RUNES.slice(0, 2).forEach(r => { S.rune[r.id] = 3; });
    S.temper = { alloc: { atk: 4, hp: 2, regen: 1 } };
    S.trainStage = 4; S.rank = 2;
    COLL_SETS.slice(0, 3).forEach(st => { S.coll[st.key] = 2; });
    markDirty();

    /* ── 게이트가 **제품과 무관하게** 다시 쌓는 장부 ── */
    const ax = ['atk', 'hp', 'regen', 'gold', 'rate', 'pet'];
    const cats = [];
    const mk = () => { const c = {}; ax.forEach(k => c[k] = 0); return c; };
    const axisOf = slot => slot === 'weapon' ? 'atk' : slot === 'shield' ? 'hp' : 'regen';
    { const c = mk(); SKILLS.forEach(s => { if (has(s.id)) c.atk += ownVal(s); }); cats.push(c); }
    { const c = mk();
      PETS.forEach(q => { if (has(q.id)) { c.atk += ownVal(q) * 0.6; c.gold += ownVal(q); } });
      S.eqPet.forEach(id => { const q = PT[id]; if (q && has(id)) c.atk += petEquipVal(q); });
      cats.push(c); }
    { const c = mk();
      EQUIPS.forEach(e => { if (has(e.id)) c[axisOf(e.slot)] += ownVal(e); });
      SLOTS.forEach(s => { const id = S.eqSlot[s.k]; if (id && has(id)) c[axisOf(s.k)] += equipVal(EQ[id]); });
      cats.push(c); }
    { const c = mk();
      RELICS.forEach(r => { if (!has(r.id)) return; const v = relicVal(r);
        if (r.eff === 'all') { c.atk += v; c.hp += v; c.regen += v; c.gold += v; }
        else if (r.eff !== 'crit' && r.eff !== 'cdmg') c[r.eff] += v; });
      cats.push(c); }
    { const c = mk(); ['atk', 'hp', 'gold'].forEach(k => c[k] += cosOwnSum(k) + cosLvVal(k)); cats.push(c); }
    { const c = mk(); c.atk += runeSum('atk'); c.hp += runeSum('hp'); c.gold += runeSum('gold'); cats.push(c); }
    { const c = mk(); c.atk += temperVal('atk'); c.hp += temperVal('hp'); c.regen += temperVal('regen'); cats.push(c); }
    { const c = mk(); COLL_SETS.forEach(st => { const n = collStep(st.key); if (!n) return;
        Object.keys(st.eff).forEach(k => { if (k !== 'cdmg') c[k] += st.eff[k] * n; }); }); cats.push(c); }
    { const c = mk(); c.atk += S.rank * 0.25; c.hp += S.rank * 0.25; cats.push(c); }
    { const c = mk(); const tb = TRAIN_BONUS * (trainStage() - 1);
      c.atk += tb; c.hp += tb; c.regen += tb; cats.push(c); }

    const want = {}; ax.forEach(k => { want[k] = cats.reduce((m, c) => m * (1 + c[k]), 1); });
    const got = bonus();
    return { want, got: { atk: got.atk, hp: got.hp, regen: got.regen, gold: got.gold, rate: got.rate, pet: got.pet },
             nCat: cats.length };
  }, RESET_SRC);
  ['atk', 'hp', 'regen', 'gold', 'rate', 'pet'].forEach((k, i) => {
    const rel = Math.abs(D.got[k] - D.want[k]) / Math.max(1, Math.abs(D.want[k]));
    ok(rel < 1e-12, 'D' + (i + 1) + ' b.' + k + ' = Π(1+Σ카테고리) — ' + D.nCat + ' 장부 조립',
       f(D.got[k]) + ' ↔ ' + f(D.want[k]));
  });

  /* ══════════ [E] 죽은 선언 0 · 장부 한 벌 ══════════ */
  console.log('[E] 옛 곱 모델의 잔재가 없다');
  ok(!/cosOwnMul/.test(src), 'E1 `cosOwnMul`(코스튬 보유 곱)이 소스에서 사라졌다 — 죽은 선언 0(333·399 규약)');
  ok((src.match(/const catApply/g) || []).length === 1 && (src.match(/const catSum/g) || []).length === 1,
     'E2 장부 부품(`catSum`·`catApply`)은 선언이 한 벌뿐이다');
  ok((src.match(/catApply\(b, c\)/g) || []).length >= 8,
     'E3 카테고리 장부가 8개 이상 닫힌다', (src.match(/catApply\(b, c\)/g) || []).length + '곳');
  ok(!/b\.atk \*= 1 \+ ownVal/.test(src) && !/m \* \(1 \+ ownVal\(s\)\)/.test(src),
     'E4 «개체마다 곱» 꼴(`*= 1 + ownVal` · `m * (1 + ownVal(s))`)이 한 곳도 안 남았다');

  await ctx.close();
  ok(errs.length === 0, 'E9 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  /* ══════════ [R] 되돌림 시험 ══════════ */
  console.log('[R] 되돌림 — 옛 곱으로 되돌린 사본에서 이 자가 정말 빨개지는가');
  const negPath = n => path.resolve(__dirname, '../.neg724-' + n + '.html');
  const rmNeg = fp => { try { fs.unlinkSync(fp); } catch (e) { if (e.code !== 'ENOENT') console.log('WARN 사본 정리 실패 ' + e.code); } };

  /* R1 — 스킬 절만 옛 «스킬마다 곱» 으로 */
  const SK_LINE = 'SKILLS.forEach(s => { if(has(s.id)) c.atk += ownVal(s); });';
  ok(src.indexOf(SK_LINE) >= 0, 'R0 되돌릴 스킬 절을 찾았다');
  const N1 = negPath(1);
  fs.writeFileSync(N1, src.replace(SK_LINE, 'SKILLS.forEach(s => { if(has(s.id)) b.atk *= 1 + ownVal(s); });'));
  try {
    const n1 = await boot(b, 'file://' + N1);
    const a1 = await n1.p.evaluate(new Function('RESET', 'return (' + CATS_SRC + ')(RESET)'), RESET_SRC);
    ok(Math.abs(a1.sk.two - a1.sk.sum) > EPS && Math.abs(a1.sk.two - a1.sk.prod) < EPS,
       'R1 스킬을 «스킬마다 곱» 으로 되돌리면 [A2] 가 빨개진다',
       '되돌린 사본 실측 ' + f(a1.sk.two) + ' = Π ' + f(a1.sk.prod));
    await n1.ctx.close();
  } finally { rmNeg(N1); }

  /* R2 — 코스튬을 «보유 곱 × 강화 곱» 두 카테고리로 */
  const COS_LINE = "['atk', 'hp', 'gold'].forEach(k => { c[k] += cosOwnSum(k) + cosLvVal(k); });";
  ok(src.indexOf(COS_LINE) >= 0, 'R0b 되돌릴 코스튬 절을 찾았다');
  const N2 = negPath(2);
  fs.writeFileSync(N2, src.replace(COS_LINE,
    "['atk', 'hp', 'gold'].forEach(k => { b[k] *= (1 + cosOwnSum(k)) * (1 + cosLvVal(k)); });"));
  try {
    const n2 = await boot(b, 'file://' + N2);
    const a2 = await n2.p.evaluate(new Function('RESET', 'return (' + CATS_SRC + ')(RESET)'), RESET_SRC);
    ok(Math.abs(a2.cos.two - a2.cos.sum) > EPS,
       'R2 코스튬을 «보유 × 강화» 두 번 곱으로 되돌리면 [A3] 가 빨개진다',
       '되돌린 사본 실측 ' + f(a2.cos.two) + ' · Σ ' + f(a2.cos.sum));
    await n2.ctx.close();
  } finally { rmNeg(N2); }

  /* R3 — 07 스킬 시트 표기만 옛 Π−1 로(제품 계산은 그대로) */
  const DISP_LINE = 'const tot = SKILLS.reduce((t, s) => has(s.id) ? t + ownVal(s) : t, 0);';
  ok(src.indexOf(DISP_LINE) >= 0, 'R0c 되돌릴 스킬 시트 표기 줄을 찾았다');
  const N3 = negPath(3);
  fs.writeFileSync(N3, src.replace(DISP_LINE,
    'const tot = SKILLS.reduce((m, s) => has(s.id) ? m * (1 + ownVal(s)) : m, 1) - 1;'));
  try {
    const n3 = await boot(b, 'file://' + N3);
    const c3 = await n3.p.evaluate(RESET => {
      const R = eval('(' + RESET + ')');
      R(); SKILLS.slice(0, 4).forEach(s => { S.own[s.id] = { l: 7 }; }); markDirty();
      renderSkill();
      const el = document.querySelector('#bSk .sk-tot em');
      return { got: el ? el.textContent.trim() : '',
               want: '공격력 +' + pct(SKILLS.reduce((x, s) => has(s.id) ? x + ownVal(s) : x, 0)) };
    }, RESET_SRC);
    ok(!!c3.got && c3.got !== c3.want,
       'R3 스킬 시트 표기만 Π−1 로 되돌리면 [C1] 이 빨개진다',
       '표기 ' + c3.got + ' ↔ 실계산 ' + c3.want);
    await n3.ctx.close();
  } finally { rmNeg(N3); }

  await b.close();
  console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
