#!/usr/bin/env node
'use strict';
/* ==========================================================================
   verify837 — 「코스튬 보유 축을 «곱» 이라고 말하는 주석」 방지 자   (작업 837, 2026-09-03)
   --------------------------------------------------------------------------
   무엇이 깨져 있었나
     724(주인 확정 2026-09-02 «카테고리 «안» 은 합»)가 코스튬 보유 축을 Π → Σ 로 뒤집었는데
     **선언 옆의 말은 안 따라왔다**:
       · `const COS_OWN = …;   /* … 곱연산 * /`            (선언 꼬리)
       · 194 블록 «보유 효과 — 예전처럼 코스튬마다 곱한다. 50종 전부 = ×(1.10)^50 ≈ ×117»
       · 197 블록 «어떤 순서든 총곱은 같다» · 총량 3수(×113·×45.4·×11.4 = 곱 모델 값)
       · 50 상세 팝업 주석 «보유 효과»(코스튬마다 곱)
     값·식(`cosOwnSum`·`bonus()` ⑤)은 내내 옳았다 — **거짓인 것은 말뿐**이고, 그 말이
     다음 자·다음 워커에게 옛 모델을 물려준다(835 [A3] 기대식이 정확히 그 모델이었다).

   무엇을 고쳤나 (제품 동작 **0줄** — 고친 것은 주석 네 자리다)
     ⚠ 값·식은 한 줄도 안 건드렸다. [A8] 이 그것을 못박는다(`verify724` 45/45 무수정이 통과선).
     새 주석이 적는 배수는 **손으로 센 사본이 아니라 `probe837` 이 제품에게 물은 값**이고,
     [B] 가 매 실행 그 둘을 다시 맞춰 본다 — 모델이 또 바뀌면 **말이 먼저 빨개진다.**
     ⚑ 이것이 837 의 본체다. «곱연산» 이라는 낱말을 지우기만 했으면 다음 변경에서 똑같이 썩는다.

   절
     [A] 정적 — 낡은 말이 없고, 새 말이 결합식·출처를 밝힌다 (+ 값·식 0줄)
     [B] 실측 대조 — 주석이 «지금 값» 이라고 적은 수 = 제품(`cosOwnSum`/`cosLvVal`)이 답한 수
     [R] 되돌림 시험 — 옛 문장을 되심은 사본은 [A] 가, 수를 틀리게 적은 사본은 [B] 가 빨개진다

   사용
     node tools/verify837.js [--html <경로>] [--table]
   ⚠ 임시 사본은 `.v837-*-<pid>.html`(648 — 고정 이름 사본은 병렬 실행에서 서로를 지운다).
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
  got: String(got) + ' (기대 ' + want + ' ±' + tol + ')' });

/* ── 주석 블록 잘라내기 ── */
const cut = (from, to) => { const i = HTML.indexOf(from); if (i < 0) return ''; const j = HTML.indexOf(to, i); return j < 0 ? HTML.slice(i) : HTML.slice(i, j); };
const B194 = cut('/* 194 ① — 코스튬 강화.', 'const COS_MAXLV');
const DECL = (HTML.match(/const COS_OWN = \{[^\n]*\n/) || [''])[0];
const B197 = cut('/* 197 ③(2026-08-27', 'const COS_STEP_EVERY');
const BDET = cut('/* 194 — 두 줄로 나눈다', '*/');

/* ══════════ [A] 정적 ══════════ */
/* 낡은 낱말은 런타임에 조립한다(696 함정 — 폐지를 지키는 자가 그 말을 적어 스스로 걸리는 자리) */
const OLD_WORD = '곱' + '연산';
yes('[A1] `COS_OWN` 선언 꼬리에 «' + OLD_WORD + '» 0건', DECL !== '' && DECL.indexOf(OLD_WORD) < 0,
  DECL.trim().slice(0, 110));
yes('[A2] 그 꼬리가 724·합을 말한다', /724/.test(DECL) && /합산 후 1회 곱/.test(DECL));
yes('[A3] 194 블록에 «코스튬마다 곱한다»(현재형 주장) 0건',
  B194 !== '' && !/보유 효과 — 예전처럼 코스튬마다 곱한다/.test(B194));
yes('[A4] 194 블록이 결합식을 적는다(1 + cosOwnSum + cosLvVal)',
  /cosOwnSum/.test(B194) && /cosLvVal/.test(B194) && /더해진 뒤 한 번만/.test(B194));
yes('[A5] 194 블록이 수의 출처를 밝힌다(probe837)', /probe837/.test(B194));
yes('[A6] 197 블록에 «어떤 순서든 총곱은 같다» 0건',
  B197 !== '' && !/어떤 순서든 총곱은 같다/.test(B197));
yes('[A7] 197 블록의 옛 3수(×113·×45.4·×11.4)에 «724 이전» 딱지가 붙어 있다',
  /×113/.test(B197) ? /724 이전/.test(B197) : true, /×113/.test(B197) ? '딱지 있음' : '옛 수 자체가 없음');
yes('[A8] 50 상세 팝업 주석에 «(코스튬마다 곱)» 0건',
  BDET !== '' && !/«보유 효과»\(코스튬마다 곱\)/.test(BDET) && /724/.test(BDET));

/* 값·식 0줄 — 837 은 «말» 만 고치는 작업이다 */
const lit = re => (HTML.match(re) || [])[1];
yes('[A9] `COS_OWN` 값 불변', lit(/const COS_OWN = (\{[^}]*\})/) === '{ atk:0.10, hp:0.08, gold:0.05 }');
yes('[A10] `COS_LV` 값 불변', lit(/const COS_LV\s+= (\{[^}]*\})/) === '{ atk:0.004, hp:0.003, gold:0.002 }');
yes('[A11] `COS_STEP` 값 불변', lit(/const COS_STEP = (\[[^\]]*\])/) === '[0.40, 0.70, 1.00, 1.30, 1.60]');
yes('[A12] `COS_STEP_EVERY` / `COS_MAXLV` 불변',
  /const COS_STEP_EVERY = 10;/.test(HTML) && /const COS_MAXLV = 500;/.test(HTML));
yes('[A13] 합산 경로가 그대로다(`cosOwnSum` 이 `+=`)',
  /const cosOwnSum = k => \{[\s\S]{0,220}s \+= cosOwnStep\(k, i\)/.test(HTML));
yes('[A14] `bonus()` ⑤ 가 두 축을 더해 한 장부로 넣는다',
  /c\[k\] \+= cosOwnSum\(k\) \+ cosLvVal\(k\)/.test(HTML));

/* ══════════ 주석이 적은 수 ══════════ */
const trio = re => { const m = HTML.match(re); return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null; };
const SAY0   = trio(/50종 보유 · Lv 0\s+— 공격 \*\*×([\d.]+)\*\* · 체력 ×([\d.]+) · 골드 ×([\d.]+)/);
const SAYMAX = trio(/50종 보유 · Lv 500 — 공격 \*\*×([\d.]+)\*\* · 체력 ×([\d.]+) · 골드 ×([\d.]+)/);
const SAY197 = trio(/공격 ×([\d.]+) · 체력 ×([\d.]+) · 골드 ×([\d.]+) 이다\(`probe837` 실측\)/);
const SAYRUNG = (() => { const m = HTML.match(/atk: \+([\d]+)% → \+([\d]+)% → \+([\d]+)% → \+([\d]+)% → \+([\d]+)%/);
  return m ? m.slice(1, 6).map(Number) : null; })();

(async () => {
  /* ══════════ [B] 실측 — 제품에게 직접 묻는다 ══════════ */
  const { chromium } = pw();
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + HTMLP);
  await p.waitForFunction(() => typeof bonus === 'function' && typeof cosOwnSum === 'function');
  await p.waitForTimeout(400);
  const D = await p.evaluate(() => {
    S.own = {}; S.coll = {}; S.avatars = {}; S.cosLv = {}; S.rune = {};
    S.eqSlot = {}; S.eqSkill = []; S.eqPet = []; S.temper = null;
    S.rank = 0; S.trainStage = 1; S.bless = { lv: 1, prog: 0, exp: {} }; markDirty();
    const K = ['atk', 'hp', 'gold'], o = {};
    /* 2표본 — 결합이 Σ 인가 */
    S.avatars[AVATARS[0].id] = 1; markDirty(); const one = bonus().atk;
    S.avatars[AVATARS[1].id] = 1; markDirty(); const two = bonus().atk;
    const x1 = cosOwnStep('atk', 1), x2 = cosOwnStep('atk', 2);
    o.pair = { two, sum: 1 + x1 + x2, prod: (1 + x1) * (1 + x2) };
    AVATARS.forEach(a => { S.avatars[a.id] = 1; }); markDirty();
    o.n = cosOwnCount();
    o.lv0 = K.map(k => 1 + cosOwnSum(k));
    AVATARS.forEach(a => { S.cosLv[a.id] = COS_MAXLV; }); markDirty();
    o.max = K.map(k => 1 + cosOwnSum(k) + cosLvVal(k));
    o.rung = COS_STEP.map((_, i) => cosOwnStep('atk', i * COS_STEP_EVERY + 1) * 100);
    return o;
  });
  await b.close();

  yes('[B0] 제품의 코스튬 «안» 결합은 Σ 다',
    Math.abs(D.pair.two - D.pair.sum) < Math.abs(D.pair.two - D.pair.prod),
    'Σ ' + D.pair.sum.toFixed(4) + ' · Π ' + D.pair.prod.toFixed(4) + ' · 실측 ' + D.pair.two.toFixed(4));
  yes('[B1] 코스튬 ' + D.n + '종 (표본이 전 종이다)', D.n === 50);
  ['공격', '체력', '골드'].forEach((k, i) => {
    near('[B2' + 'abc'[i] + '] 194 주석의 «50종 Lv 0 ' + k + '» = 제품값', SAY0 ? SAY0[i] : NaN, D.lv0[i], 0.005);
    near('[B3' + 'abc'[i] + '] 194 주석의 «50종 Lv 500 ' + k + '» = 제품값', SAYMAX ? SAYMAX[i] : NaN, D.max[i], 0.005);
    near('[B4' + 'abc'[i] + '] 197 주석의 «지금은 합이라 ' + k + '» = 제품값', SAY197 ? SAY197[i] : NaN, D.lv0[i], 0.005);
  });
  yes('[B5] 197 주석의 계단(+4%→+16%) = 제품 계단',
    !!SAYRUNG && SAYRUNG.length === D.rung.length && SAYRUNG.every((v, i) => Math.abs(v - D.rung[i]) < 0.05),
    (SAYRUNG || []).join('/') + ' vs ' + D.rung.map(v => v.toFixed(0)).join('/'));
  yes('[B6] 콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));

  /* ══════════ [R] 되돌림 시험 ══════════ */
  if (!SUB) {
    const tmps = [];
    const mk = body => { const q = path.join(ROOT, '.v837-' + tmps.length + '-' + process.pid + '.html');
                         fs.writeFileSync(q, body); tmps.push(q); return q; };
    const runSelf = f => { try {
        return execFileSync(process.execPath, [__filename, '--html', f, '--sub'],
          { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); } };
    const red = (out, tag) => new RegExp('✗ \\[' + tag.replace(/[[\]]/g, '') + '\\]').test(out);

    /* R1 — 선언 꼬리를 옛 말로 되돌린다 */
    const o1 = runSelf(mk(HTML.replace('724: 합산 후 1회 곱', OLD_WORD)));
    yes('[R1] 꼬리를 «' + OLD_WORD + '» 으로 되돌리면 [A1] 이 빨갛다', red(o1, 'A1'));
    /* R2 — 50 상세 팝업 주석을 옛 말로 되돌린다 */
    const o2 = runSelf(mk(HTML.replace('/* 194 — 두 줄로 나눈다: «보유 효과» · «강화 효과»(레벨 1당).',
      '/* 194 — 두 줄로 나눈다: «보유 효과»(코스튬마다 곱) · «강화 효과»(레벨 1당, 총합에 1회 곱).')));
    yes('[R2] 상세 팝업 주석을 되돌리면 [A8] 이 빨갛다', red(o2, 'A8'));
    /* R3 — 말은 그대로 두고 «수» 만 옛 곱 모델 값으로 적는다(= 837 이 막으려는 그 병) */
    const o3 = runSelf(mk(HTML.replace('· 50종 보유 · Lv 0   — 공격 **×6.00**', '· 50종 보유 · Lv 0   — 공격 **×113.10**')));
    yes('[R3] 수만 옛 곱 모델로 적으면 [B2a] 가 빨갛다', red(o3, 'B2a'));
    /* R4 — 제품을 옛 Π 모델로 되돌리면 말이 아니라 [B0]·[B2] 가 빨갛다 */
    const o4 = runSelf(mk(HTML.replace('let s = 0, n = cosOwnCount();\n  for(let i = 1; i <= n; i++) s += cosOwnStep(k, i);\n  return s;',
      'let s = 1, n = cosOwnCount();\n  for(let i = 1; i <= n; i++) s *= (1 + cosOwnStep(k, i));\n  return s - 1;')));
    yes('[R4] 제품을 Π 로 되돌리면 [B0]·[B2a] 가 빨갛다', red(o4, 'B0') && red(o4, 'B2a'));
    tmps.forEach(q => { try { fs.unlinkSync(q); } catch (e) {} });
  }

  /* ── 출력 ── */
  const bad = R.filter(x => !x.pass);
  if (TABLE || bad.length) R.forEach(x => console.log('  ' + (x.pass ? '✓' : '✗') + ' ' + x.n + (x.pass ? '' : '  → ' + x.got)));
  console.log('VERIFY837 ' + (R.length - bad.length) + '/' + R.length + (bad.length ? ' FAIL' : ' PASS'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
