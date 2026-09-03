#!/usr/bin/env node
'use strict';
/* ==========================================================================
   verify852 — 「보유 축(`ownVal`)을 «종마다 곱» 이라고 말하는 197 주석」 방지 자
                                                              (작업 852, 2026-09-03)
   --------------------------------------------------------------------------
   무엇이 깨져 있었나
     724(주인 확정 2026-09-02 «카테고리 «안» 은 합»)가 보유 축을 Π → Σ 로 뒤집었는데
     **선언 옆의 말은 안 따라왔다** — `lvMul`·`ownValAt` 선언 바로 옆 두 자리다:
       · 197 지시 ② 블록 «보유는 … 전 종(장비 36 + 스킬 27 + 펫 27)에 하나씩 곱하는 축이라
         기울기를 같이 낮추면 «(1+x)^90» 이 통째로 줄어 전 구간 파워가 무너진다»
       · 197 gMul/gWear 블록 «보유 효과는 … 하나씩 곱하는 축이라 여기에 계단을 태우면
         «(1+계단)^N» 으로 지수가 두 번 걸려 밸런스가 통째로 터진다»
     값·식(`ownValAt`·`bonus()` ①~③)은 내내 옳았다 — **거짓인 것은 말뿐**이고, 그 말이
     다음 자·다음 워커에게 옛 모델을 물려준다(837 이 코스튬 축에서 고친 것과 같은 종).

   ⚑ 재현(`probe852`)이 등재문보다 **한 겹 더** 찾았다 — 같은 문장의 **종수**(«36 + 27 + 27 = 90»)도
     낡은 수다(지금 108 + 27 + 35 = 170 · 그중 무기 36). 그래서 이 자의 [B1] 은 낱말이 아니라
     **종수 자체**를 제품에 다시 묻는다.

   무엇을 고쳤나 (제품 동작 **0줄** — 고친 것은 주석 두 자리다)
     ⚠ 값·식은 한 줄도 안 건드렸다. [A9]~[A15] 가 그것을 못박는다
       (`verify724` 45/45 · `verify197` 무수정이 통과선).
     새 주석이 적는 수는 **손으로 센 사본이 아니라 `probe852` 가 제품에게 물은 값**이고,
     [B] 가 매 실행 그 둘을 다시 맞춰 본다 — 모델이 또 바뀌면 **말이 먼저 빨개진다.**

   절
     [A] 정적 — 낡은 «하나씩 곱하는» 주장이 없고, 새 말이 724·결합식·출처를 밝힌다 (+ 값·식 0줄)
     [B] 실측 대조 — 주석이 «지금 값» 이라고 적은 수 = 제품(`bonus()`/`ownValAt`/`GRADE`)이 답한 수
     [R] 되돌림 시험 — 옛 문장을 되심으면 [A] 가, 수만 옛것이면 [B1] 이, 제품이 Π 로 돌아가면 [B0] 이 빨갛다

   사용
     node tools/verify852.js [--html <경로>] [--table]
   ⚠ 임시 사본은 `.v852-*-<pid>.html`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const HTMLP = (() => { const i = argv.indexOf('--html'); return i >= 0 ? path.resolve(argv[i + 1]) : path.join(ROOT, 'index.html'); })();
const TABLE = argv.indexOf('--table') >= 0;
const SUB = argv.indexOf('--sub') >= 0;          /* §R 이 부르는 자기 자신 — R 절을 다시 돌지 않는다 */
const HTML = fs.readFileSync(HTMLP, 'utf8');

const R = [];
const yes = (n, got, d) => R.push({ n: n + (d ? ' — ' + d : ''), pass: got === true, got: String(got) });
const near = (n, got, want, tol, d) => R.push({
  n: n + (d ? ' — ' + d : ''), pass: Number.isFinite(got) && Math.abs(got - want) <= tol,
  got: String(got) + ' (기대 ' + (typeof want === 'number' ? want.toFixed(4) : want) + ' ±' + tol + ')' });

/* ── 주석 블록 잘라내기 ── */
const cut = (from, to) => { const i = HTML.indexOf(from); if (i < 0) return ''; const j = HTML.indexOf(to, i); return j < 0 ? '' : HTML.slice(i, j); };
const BSLOPE = cut('/* 197 지시 ② — 동티어 안(레벨 강화)은', 'const LV_STEP');
const BGRADE = cut('/* 197 — **보유(ownVal)는 gMul', 'const ownValAt');

/* ══════════ [A] 정적 ══════════ */
/* 낡은 주장은 런타임에 조립한다(696 함정 — 폐지를 지키는 자가 그 말을 적어 스스로 걸리는 자리).
   ⚠ «하나씩 곱» 이라는 낱말 자체는 새 주석도 «옛날에는 그랬다» 로 인용한다 —
      그래서 자는 낱말이 아니라 **옛 주장 문장 그대로**를 찾는다. */
const OLD_SLOPE = '하나씩 ' + '곱하는 축이라 기울기를 같이 낮추면';
const OLD_GRADE = '보유 중인 전 종(장비 36 + 스킬 27 + 펫 27)에 하나씩 ' + '곱하는';

yes('[A1] 197 지시 ② 블록에 옛 주장(«…' + OLD_SLOPE + '») 0건',
  BSLOPE !== '' && BSLOPE.indexOf(OLD_SLOPE) < 0, BSLOPE === '' ? '블록을 못 찾았다' : '');
yes('[A2] 그 블록이 724·합·결합 경로를 말한다',
  /724/.test(BSLOPE) && /카테고리 «안» 이 \*\*합\*\*/.test(BSLOPE) && /catSum/.test(BSLOPE) && /catApply/.test(BSLOPE));
yes('[A3] 그 블록이 수의 출처를 밝힌다(probe852)', /probe852/.test(BSLOPE));
yes('[A4] 그 블록의 옛 `sim197` 수(3.48e47 → 6.54e18)에 «724 이전» 딱지가 붙어 있다',
  /3\.48e47/.test(BSLOPE) ? /724 이전/.test(BSLOPE) : true,
  /3\.48e47/.test(BSLOPE) ? '딱지 있음' : '옛 수 자체가 없음');
yes('[A5] 그 블록의 결론(199 몫)은 살아 있다', /199\(밸런스 비평 라운드\)의 몫/.test(BSLOPE));

yes('[A6] gMul/gWear 블록에 옛 주장(«' + OLD_GRADE + '») 0건',
  BGRADE !== '' && BGRADE.indexOf(OLD_GRADE) < 0, BGRADE === '' ? '블록을 못 찾았다' : '');
yes('[A7] 그 블록이 «더한 뒤 한 번만 곱하는» 축이라고 말한다(724)',
  /더한 뒤 한 번만 곱하는/.test(BGRADE) && /724/.test(BGRADE)
  && /catSum/.test(BGRADE) && /catApply/.test(BGRADE));
yes('[A8] 그 블록이 수의 출처를 밝힌다(probe852)', /probe852/.test(BGRADE));
yes('[A9] 살아 있는 논거(91 도감 «축별로 합산한 뒤 1회 곱»)를 안 지웠다',
  /91 도감/.test(BGRADE) && /합산한 뒤 1회 곱/.test(BGRADE));
yes('[A10] 옛 종수(«장비 36 + 스킬 27 + 펫 27 = 90»)에 «낡은 수» 딱지가 붙어 있다',
  /장비 36 \+ 스킬 27 \+ 펫 27/.test(BGRADE) ? /낡은 수/.test(BGRADE) : true);

/* 값·식 0줄 — 852 는 «말» 만 고치는 작업이다 */
yes('[A11] `LV_STEP` 값 불변', /const LV_STEP = 0\.012;/.test(HTML));
yes('[A12] `lvMul` 식·기울기 불변', /const lvMul\s+= l => 1 \+ l\*0\.18;/.test(HTML));
yes('[A13] `lvWear` 식 불변', /const lvWear = l => 1 \+ l\*LV_STEP;/.test(HTML));
yes('[A14] `ownValAt` 식 불변(gMul × lvMul × eqv)',
  /const ownValAt = \(it, l\) => 0\.02 \* gMul\(it\.g\) \* lvMul\(l\) \* eqv\(it\);/.test(HTML));
yes('[A15] `gMul`·`gWear` 선언 불변',
  /const gMul\s+= g => GRADE\[g\]\.mul;/.test(HTML) && /const gWear = g => GRADE\[g\]\.wear;/.test(HTML));
yes('[A16] `bonus()` ① 스킬이 합으로 쌓고 한 번만 곱한다',
  /SKILLS\.forEach\(s => \{ if\(has\(s\.id\)\) c\.atk \+= ownVal\(s\); \}\);\s*\n\s*catApply\(b, c\);/.test(HTML));
yes('[A17] `bonus()` ③ 장비가 합으로 쌓는다',
  /const v = ownVal\(e\); eqAxes\(e\.slot\)\.forEach\(k => c\[k\] \+= v\);/.test(HTML));
yes('[A18] `catApply` 가 축마다 한 번만 곱한다',
  /const catApply = \(b, c\) => \{ for\(const k of CAT_AXES\) if\(c\[k\]\) b\[k\] \*= 1 \+ c\[k\]; \};/.test(HTML));

/* ══════════ 주석이 적은 수 ══════════ */
const SLOPE = HTML.match(/기울기 \*\*([\d.]+) → ([\d.]+)\*\* 면 카테고리 배수 \*\*×([\d.]+) → ×([\d.]+)\*\*/);
const WEAR  = HTML.match(/전 종 보유 Σ 가 \*\*스킬 ×([\d.]+) · 장비 ×([\d.]+)\*\*/);
const TOP   = HTML.match(/`GRADE\.wear` 는 꼭대기가 (\d+), `gMul` 은 (\d+)/);
const CNT   = HTML.match(/\*\*장비 (\d+) \+ 스킬 (\d+) \+ 펫 (\d+) = (\d+)\*\*\(그중 무기 (\d+)\)/);
const num = (m, i) => (m ? parseFloat(m[i]) : NaN);

(async () => {
  /* ══════════ [B] 실측 — 제품에게 직접 묻는다(probe852 와 같은 눈) ══════════ */
  const { chromium } = pw();
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + HTMLP);
  await p.waitForFunction(() => typeof bonus === 'function' && typeof ownValAt === 'function'
    && typeof SKILLS !== 'undefined' && typeof EQUIPS !== 'undefined' && typeof PETS !== 'undefined');
  await p.waitForTimeout(400);
  const D = await p.evaluate(() => {
    const R0 = () => { S.own = {}; S.coll = {}; S.avatars = {}; S.cosLv = {}; S.rune = {};
      S.eqSlot = {}; S.eqSkill = []; S.eqPet = []; S.temper = null;
      S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} }; markDirty(); };
    const o = {};
    /* 결합 — 스킬 2표본이 Σ 인가 Π 인가 */
    R0();
    S.own[SKILLS[0].id] = { l: 1 }; markDirty();
    S.own[SKILLS[1].id] = { l: 1 }; markDirty();
    const two = bonus().atk, x1 = ownVal(SKILLS[0]), x2 = ownVal(SKILLS[1]);
    o.pair = { two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) };
    /* 종수 */
    o.n = { equip: EQUIPS.length, skill: SKILLS.length, pet: PETS.length,
            weapon: EQUIPS.filter(e => e.slot === 'weapon').length };
    o.n.all = o.n.equip + o.n.skill + o.n.pet;
    /* 기울기 — lvMul(l) = 1 + l·k 의 항등으로 «낮은 기울기» 를 제품 함수로 흉내낸다 */
    o.kOwn = lvMul(1) - lvMul(0);
    o.kWear = lvWear(1) - lvWear(0);
    const L = 100, eqL = L * o.kWear / o.kOwn;
    const sumAt = (list, lv) => list.reduce((s, it) => s + ownValAt(it, lv), 0);
    o.skillNow = 1 + sumAt(SKILLS, L);
    o.skillLow = 1 + sumAt(SKILLS, eqL);
    /* 계단 — 보유 축에 gWear 를 태웠을 때 Σ 가 부푸는 배수 */
    const wearX = list => list.reduce((s, it) => s + ownValAt(it, 0) * gWear(it.g) / gMul(it.g), 0)
                        / list.reduce((s, it) => s + ownValAt(it, 0), 0);
    o.wearSkill = wearX(SKILLS);
    o.wearEquip = wearX(EQUIPS);
    o.topWear = Math.max.apply(null, GRADE.map(g => g.wear));
    o.topMul  = Math.max.apply(null, GRADE.map(g => g.mul));
    R0();
    return o;
  });
  await b.close();

  yes('[B0] 제품의 보유 축 카테고리 «안» 결합은 Σ 다',
    Math.abs(D.pair.two - D.pair.sum) < Math.abs(D.pair.two - D.pair.prod),
    'Σ ' + D.pair.sum.toFixed(4) + ' · Π ' + D.pair.prod.toFixed(4) + ' · 실측 ' + D.pair.two.toFixed(4));

  near('[B1a] 주석의 종수 «장비» = 제품', num(CNT, 1), D.n.equip, 0);
  near('[B1b] 주석의 종수 «스킬» = 제품', num(CNT, 2), D.n.skill, 0);
  near('[B1c] 주석의 종수 «펫» = 제품',   num(CNT, 3), D.n.pet, 0);
  near('[B1d] 주석의 종수 «합» = 제품',   num(CNT, 4), D.n.all, 0);
  near('[B1e] 주석의 «그중 무기» = 제품', num(CNT, 5), D.n.weapon, 0);

  near('[B2a] 주석의 보유 축 기울기 = 제품 `lvMul`', num(SLOPE, 1), D.kOwn, 0.0005);
  near('[B2b] 주석의 착용 축 기울기 = 제품 `lvWear`', num(SLOPE, 2), D.kWear, 0.0005);
  near('[B3a] 주석의 «지금 배수»(Lv100 스킬 전 종) = 제품', num(SLOPE, 3), D.skillNow, 0.01);
  near('[B3b] 주석의 «기울기 인하 후 배수» = 제품',       num(SLOPE, 4), D.skillLow, 0.01);
  yes('[B3c] 인하가 지수가 아니라 선형이다(배수가 0 으로 안 무너진다)',
    D.skillLow / D.skillNow > 0.05, (D.skillLow / D.skillNow * 100).toFixed(1) + '%');

  near('[B4a] 주석의 «계단 태우면 스킬 Σ ×n» = 제품', num(WEAR, 1), D.wearSkill, 0.05);
  near('[B4b] 주석의 «계단 태우면 장비 Σ ×n» = 제품', num(WEAR, 2), D.wearEquip, 0.05);
  near('[B5a] 주석의 `GRADE.wear` 꼭대기 = 제품', num(TOP, 1), D.topWear, 0);
  near('[B5b] 주석의 `gMul` 꼭대기 = 제품',       num(TOP, 2), D.topMul, 0);
  yes('[B6] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ══════════ [R] 되돌림 시험 ══════════ */
  if (!SUB) {
    const tmps = [];
    const mk = body => { const q = path.join(ROOT, '.v852-' + tmps.length + '-' + process.pid + '.html');
                         fs.writeFileSync(q, body); tmps.push(q); return q; };
    const runSelf = f => { try {
        return execFileSync(process.execPath, [__filename, '--html', f, '--sub'],
          { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); } };
    const red = (out, tag) => new RegExp('✗ \\[' + tag + '\\]').test(out);

    /* R1 — 197 지시 ② 블록을 옛 주장으로 되돌린다 */
    const o1 = runSelf(mk(HTML.replace(
      '보유 축은 이제 카테고리 «안» 이 **합**이라',
      '보유는 `bonus()` 가 보유 중인 전 종에 ' + OLD_SLOPE + ' 「(1+x)^90」 이 통째로 줄어 ')));
    yes('[R1] 197 지시 ② 블록을 옛 주장으로 되돌리면 [A1] 이 빨갛다', red(o1, 'A1'));

    /* R2 — gMul/gWear 블록을 옛 주장으로 되돌린다 */
    const o2 = runSelf(mk(HTML.replace(
      '보유 효과는 `bonus()` 가 **보유 중인 전 종을 카테고리 «안» 에서 더한 뒤 한 번만 곱하는** 축이라',
      '보유 효과는 `bonus()` 가 **' + OLD_GRADE + '** 축이라')));
    yes('[R2] gMul/gWear 블록을 옛 주장으로 되돌리면 [A6]·[A7] 이 빨갛다', red(o2, 'A6') && red(o2, 'A7'));

    /* R3 — 말은 새것, «수» 만 옛 종수(90)로 적는다 (= 852 가 막으려는 그 병) */
    const o3 = runSelf(mk(HTML.replace('**장비 108 + 스킬 27 + 펫 35 = 170**(그중 무기 36)',
                                       '**장비 36 + 스킬 27 + 펫 27 = 90**(그중 무기 36)')));
    yes('[R3] 종수만 옛 값으로 적으면 [B1a]·[B1d] 가 빨갛다', red(o3, 'B1a') && red(o3, 'B1d'));

    /* R4 — 제품을 Π 로 되돌리면 말이 아니라 [B0] 이 빨갛다 */
    const o4 = runSelf(mk(HTML.replace(
      'SKILLS.forEach(s => { if(has(s.id)) c.atk += ownVal(s); });',
      'SKILLS.forEach(s => { if(has(s.id)) c.atk = (1 + c.atk) * (1 + ownVal(s)) - 1; });')));
    yes('[R4] 제품을 Π 로 되돌리면 [B0] 이 빨갛다', red(o4, 'B0'));

    tmps.forEach(q => { try { fs.unlinkSync(q); } catch (e) {} });
  }

  /* ── 출력 ── */
  const bad = R.filter(x => !x.pass);
  if (TABLE || bad.length) R.forEach(x => console.log('  ' + (x.pass ? '✓' : '✗') + ' ' + x.n + (x.pass ? '' : '  → ' + x.got)));
  console.log('VERIFY852 ' + (R.length - bad.length) + '/' + R.length + (bad.length ? ' FAIL' : ' PASS'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
