#!/usr/bin/env node
/* 484 검증 — 스킬은 «같은 등급 안에서는 전부 같은 세기(DPS), 등급이 오를 때만 ×3»
 *
 *   node tools/verify484.js
 *
 * 주인 원문(2026-08-30): «스킬은 dps로 쳤을때나 뭐나 같은 등급끼리 더 쎌필요없고
 *                         등급 바뀔때마다 더 쎼져야함. 3배정도 더 쎼지면 될듯»
 *
 *   [A] 자(尺) — `stat.dps` 가 실제로 쓰는 발수 모델과 게이트의 모델이 같다(모델 부패 방지)
 *   [B] 등급 안 — 27종 기본 DPS(m × hits / cd) 등급별 최대/최소 ≤ 1.03
 *   [C] 등급 간 — 실제 피해로 잰 인접 등급 비 = 3.0 ±2% (gWear 가 낸다)
 *   [D] 안 건드린 축 — cd·발수·범위·연출 파라미터가 전 종 그대로(«개성은 모양, 세기는 동일»)
 *   [E] 실전 — 고정 표적형만 본다(불사 하네스). ⚑ 관통·링·장판 축은 **`tools/verify504.js` 로
 *       옮겼다** — 이 하네스는 적이 안 죽어 플레이어에게 뭉치므로 광역기를 최대 14배 부풀린다
 *       (`probe504` [C]). 여기 E3 는 그 «뭉친 값» 이 484 전후로 안 움직였다는 대조만 남는다.
 *   [R] 되돌림 시험 — 한 스킬의 m 을 옛 값으로 되돌리면 [B] 가 빨개진다
 *   [Z] 콘솔 에러 0건
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const IN_MAX   = 1.03;   /* [B] 등급 안 최대/최소 상한 */
const EDGE_TOL = 0.02;   /* [C] 인접 등급 비 3.0 의 허용 오차 */
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 484 이전의 m 값(되돌림 시험 [R] 의 재료). 이 표는 «옛 값» 이므로 갱신하지 마라. */
const OLD_M = { slash:1.00, shuri:0.55, stone:1.35, curve:0.90, multi:0.80, orbit:0.45,
  ice:1.30, whirl:0.95, aura:0.55, bolt:1.60, arrow:1.15, rico:1.60, spiral:0.95,
  boom:2.40, poison:0.80, drain:2.40, frost:1.25, bounce:1.15, boomer:1.80, meteor:5.00,
  gale:0.85, drone:0.85, flask:1.30, holy:4.00, lance:3.00, nova:5.20, laser:6.00 };
/* 484 가 «안 건드린 축» = 쿨타임(cd). 484 도 504 도 m·hits 만 만졌으므로 이 표는 영구히 같다. */
const OLD_CD = { slash:0.85, shuri:2.20, stone:1.30, curve:1.60, multi:1.10, orbit:0.00,
  ice:1.60, whirl:1.60, aura:0.00, bolt:1.40, arrow:1.50, rico:2.00, spiral:2.60,
  boom:2.00, poison:3.20, drain:2.60, frost:2.10, bounce:2.20, boomer:2.40, meteor:4.00,
  gale:2.80, drone:6.00, flask:3.60, holy:3.00, lance:2.30, nova:3.60, laser:3.40 };
/* 504 가 다시 적은 발수 선언 27종. **이 표를 손으로 고치지 마라** — 값의 출처는 실측이고,
   갈아 끼울 때는 `node tools/probe504.js` 를 다시 돌려 `verify504` 와 **같이** 옮긴다.
   ⚑ 484 는 이 축을 한 글자도 안 건드렸다(그때의 표는 260 이 남긴 것이었다). 바꾼 것은 504 다. */
const HITS_504 = { slash:1, shuri:8, stone:1.77, curve:4.22, multi:3, orbit:6.65,
  ice:3.13, whirl:17.88, aura:9.4, bolt:3, arrow:4.54, rico:2.4, spiral:9.32,
  boom:4.05, poison:29.36, drain:1, frost:4, bounce:5, boomer:2.54, meteor:10.19,
  gale:12, drone:16, flask:20.71, holy:9.5, lance:4.45, nova:14.19, laser:15.44 };
/* [E] 실전 실측 — «수리 전(a72cad0) 커밋에서 같은 하네스로 잰 값». 338·344 규칙대로 대조용이다.
   관통·링형(lance·gale)은 모델과 크게 어긋나는데 **그 어긋남이 484 이전에도 똑같이 있었다** —
   484 는 m 만 바꿨으므로 이 축은 내 작업 단위가 아니다(→ PROGRESS 504 등재). */
const PRE484_HITS = { slash:1.02, shuri:8.00, bolt:3.00, lance:12.22, gale:7.93 };
const FIXED_TGT = ['slash', 'shuri', 'bolt'];   /* 발수가 «몇 명/몇 발» 로 확정되는 종 */

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillDmg === 'function'
    && typeof SK_DPS_REF !== 'undefined');
  await page.waitForTimeout(500);

  /* ── [A] 자 ─────────────────────────────────────────────── */
  const A = await page.evaluate(() => {
    /* 504 — 게이트가 제품의 모델을 **베껴 적지 않는다.** 484 당시에는 다섯 곳이 같은 삼항 사슬을
       각자 적고 있어서 이 항이 «소스에 그 사슬이 있는가» 를 정규식으로 봐야 했다. 504 가 입구를
       `skillHits()` 하나로 모았으므로, 이제 볼 것은 **제품이 그 하나만 쓰는가** 다. */
    const src = Object.getOwnPropertyDescriptor(stat, 'dps').get.toString();
    return { usesFn: /skillHits\s*\(/.test(src),
             noChain: !/shuri'\s*\?/.test(src) && !/bolt'\s*\?/.test(src),
             noHard3: !/:\s*dmg\s*\*\s*3\b/.test(src),
             multiLv: typeof skillHits === 'function'
                      && skillHits(SK.multi) === Math.min((SK.multi.hits || 1) + Math.floor(oLv('multi') / 2), 9),
             ref: SK_DPS_REF, n: SKILLS.length };
  });
  ok(A.usesFn && A.noChain, 'A1 `stat.dps` 가 발수를 `skillHits()` 하나로만 읽는다(베껴 적은 삼항 사슬 0건)');
  ok(A.noHard3 && A.multiLv, 'A2 지속형의 «×3» 상수가 사라지고(선언으로), `multi` 의 Lv 성장은 그대로다');
  ok(A.n === 27, 'A3 스킬 27종', String(A.n));
  ok(Math.abs(A.ref - 6.49) < 1e-9, 'A4 SK_DPS_REF = 6.49 (504 — 27종 «실제» 기여 DPS 의 평균. 옛 1.84 는 «선언» 평균)', String(A.ref));

  /* ── [B] 등급 안 DPS 동일 ───────────────────────────────── */
  const B = await page.evaluate(() => {
    /* 504 — 제품과 같은 문을 쓴다(베껴 적지 않는다). cd 0 인 지속형의 발수는 «초당» 이다. */
    const D = s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s);
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (!t.length) return;
      const d = t.map(D);
      rows.push({ g, n: t.length, min: Math.min(...d), max: Math.max(...d),
                  ratio: Math.max(...d) / Math.min(...d),
                  offRef: Math.max(...d.map(x => Math.abs(x / SK_DPS_REF - 1))) });
    });
    return rows;
  });
  B.forEach(r => console.log('     g' + r.g + ' n=' + r.n + ' DPS ' + r.min.toFixed(3) + '~' + r.max.toFixed(3)
    + ' · 최대/최소 ' + r.ratio.toFixed(4)));
  ok(B.every(r => r.ratio <= IN_MAX), 'B1 등급 안 최대/최소 ≤ ' + IN_MAX.toFixed(2),
     '최악 ' + Math.max(...B.map(r => r.ratio)).toFixed(4));
  ok(B.every(r => r.offRef <= 0.01), 'B2 27종 전부 기준선(SK_DPS_REF)에서 ±1% 안',
     '최대 이탈 ' + (Math.max(...B.map(r => r.offRef)) * 100).toFixed(3) + '%');
  ok(B.length === 6, 'B3 6등급 전부 잰다(스킬은 신화까지)', B.map(r => 'g' + r.g).join('·'));

  /* ── [C] 등급 간 ×3 ─────────────────────────────────────── */
  const C = await page.evaluate(() => {
    /* «실제 피해» 로 잰다 — skillDmg 는 gWear 를 타므로 등급 비가 여기서 나온다 */
    const real = s => skillDmg(s) * skillHits(s) / (s.cd > 0 ? s.cd : 1);
    const per = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (!t.length) return;
      per.push({ g, mean: t.map(real).reduce((a, b) => a + b, 0) / t.length });
    });
    return per.slice(1).map((p, i) => ({ from: per[i].g, to: p.g, r: p.mean / per[i].mean }));
  });
  ok(C.every(x => Math.abs(x.r - 3) <= 3 * EDGE_TOL), 'C1 인접 등급 실피해 DPS 비 = 3.0 ±2%',
     C.map(x => 'g' + x.from + '→g' + x.to + ' ' + x.r.toFixed(4)).join(' / '));

  /* ── [D] 안 건드린 축 ───────────────────────────────────── */
  const D = await page.evaluate(({ oldCd, hits504 }) => {
    const badCd = [], badHit = [];
    SKILLS.forEach(s => {
      if (!(s.id in oldCd)) { badCd.push(s.id + '(표에 없음)'); return; }
      if (Math.abs(s.cd - oldCd[s.id]) > 1e-9) badCd.push(s.id + ' ' + oldCd[s.id] + '→' + s.cd);
      if (s.hits === undefined) { badHit.push(s.id + '(선언 없음)'); return; }
      if (Math.abs(s.hits - hits504[s.id]) > 1e-9) badHit.push(s.id + ' ' + hits504[s.id] + '→' + s.hits);
    });
    const shape = ['cnt','sp','spread','pierce','life','r','r0','ring','cv','wb','bnc','zk','zr',
                   'zlife','av','rv','vol','gap','dur','len','w','tick','slow','scale'];
    return { badCd, badHit, n: SKILLS.length,
             shapeSig: SKILLS.map(s => s.id + ':' + shape.map(k => s[k] === undefined ? '' : s[k]).join(',')).join('|') };
  }, { oldCd: OLD_CD, hits504: HITS_504 });
  ok(D.badCd.length === 0, 'D1 27종 쿨타임(cd)이 484 전 값 그대로', D.badCd.join(' / ') || '위반 0');
  ok(D.badHit.length === 0, 'D2 27종 발수 선언(hits)이 504 의 실측 표 그대로 · 빈칸 0건(선언 누락 금지)',
     D.badHit.join(' / ') || '위반 0');
  /* 표본 두 종의 «모양» 지문을 통째로 못박는다 — 발사체 수·속도·관통·수명·링 여부가 하나라도
     움직이면 여기가 빨개진다(발수 선언 hits 는 D2 가 따로 본다). */
  const GALE_SHAPE = 'gale:12,560,,2,1.5,,,1,,,,,,,,,,,,,,,,';
  const NOVA_SHAPE = 'nova:,,,,,250,,,,,,,,,,,,,,,,,,4.2';
  ok(D.shapeSig.indexOf(GALE_SHAPE) >= 0 && D.shapeSig.indexOf(NOVA_SHAPE) >= 0 && D.n === 27,
     'D3 범위·발사체 파라미터(«모양» 축)도 그대로 — 484 가 바꾼 것은 m 27개뿐',
     D.shapeSig.split('|').find(x => x.startsWith('gale:')) + ' · '
     + D.shapeSig.split('|').find(x => x.startsWith('nova:')));

  /* ── [E] 실전 60초(모델 ↔ 실측 타격수) ─────────────────── */
  const E = await page.evaluate(() => {
    /* 114 하네스 준용 — 실제 전투 루프(`step`)를 손으로 굴려 «한 발동이 실제로 몇 번 때리는가» 를
       센다. 모델(발수 선언)이 실제와 어긋나면 [B]·[C] 가 «맞춰 놓고도 틀린» 표가 된다(260 이
       poison·boomer 에서 겪은 그 자리다). 후크는 `castSkill`·`hitEnemy` 두 전역에 건다. */
    const probe = ['slash', 'shuri', 'bolt', 'lance', 'gale'];
    const out = [];
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    for (const id of probe) {
      const s = SK[id];
      S.own[id] = { l: 0 }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy  = function () { hits++; return rawHit.apply(this, arguments); };
      /* 적을 상시 채워 둔다 — 죽어서 비면 «맞을 대상이 없어» 타격수가 낮게 잡힌다 */
      for (let f = 0; f < 60 * 40; f++) {
        while (enemies.length < 6) { const e = makeEnemy(0); if (!e) break; }
        enemies.forEach(e => { e.hp = e.maxHp = 1e30; });
        step(1 / 60);
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      const declared = skillHits(s);
      const per = casts ? hits / casts : 0;
      out.push({ id, declared, casts, hits, per: +per.toFixed(2),
                 off: declared ? Math.abs(per / declared - 1) : 1 });
    }
    S.eqSkill = ['slash']; markDirty();
    return out;
  });
  E.forEach(x => console.log('     ' + x.id + ' 발동 ' + x.casts + '회 · 타격 ' + x.hits
    + ' → 발동당 ' + x.per + ' (모델 ' + x.declared + ' · 오차 ' + (x.off * 100).toFixed(1) + '%)'));
  ok(E.every(x => x.casts > 0), 'E1 표본 5종이 실제 전투에서 발동했다',
     E.map(x => x.id + ' ' + x.casts + '회').join(' · '));
  const fixed = E.filter(x => FIXED_TGT.indexOf(x.id) >= 0);
  ok(fixed.every(x => x.off <= 0.15), 'E2 고정 표적형(slash·shuri·bolt) 실측 ↔ 모델 ±15%',
     fixed.map(x => x.id + ' ' + (x.off * 100).toFixed(1) + '%').join(' · '));
  /* E3 — 관통·링형은 «몇 명이 겹쳐 서 있는가» 로 타격수가 흔들려 모델이 환경 의존이다.
     484 는 이 축을 안 건드렸다는 것만 못박는다(수리 전 실측과 같은 자리인가). */
  const pierce = E.filter(x => FIXED_TGT.indexOf(x.id) < 0);
  ok(pierce.every(x => {
       const pre = PRE484_HITS[x.id];
       return x.per > 0 && Math.abs(x.per / pre - 1) <= 0.35;   /* 표본 흔들림 폭 */
     }), 'E3 관통·링형(lance·gale)의 모델 이탈은 484 이전과 같은 자리다(→ 504)',
     pierce.map(x => x.id + ' 실측 ' + x.per + ' / 수리 전 ' + PRE484_HITS[x.id]
       + ' / 모델 ' + x.declared).join(' · '));

  /* ── [R] 되돌림 시험 ────────────────────────────────────── */
  const R = await page.evaluate(old => {
    const D = (s, m) => s.cd > 0 ? m * skillHits(s) / s.cd : m * skillHits(s);
    /* g5(신화) 네 종 중 laser 하나만 옛 값으로 되돌린 사본을 만들어 다시 잰다 */
    const t = SKILLS.filter(s => s.g === 5 && !s.sup);
    const d = t.map(s => D(s, s.id === 'laser' ? old.laser : s.m));
    const d0 = t.map(s => D(s, s.m));
    return { reverted: Math.max(...d) / Math.min(...d), now: Math.max(...d0) / Math.min(...d0) };
  }, OLD_M);
  ok(R.reverted > IN_MAX, 'R1 laser 의 m 을 옛 값(6.00)으로 되돌리면 B1 이 빨개진다',
     '되돌림 ' + R.reverted.toFixed(3) + ' > ' + IN_MAX + ' (현행 ' + R.now.toFixed(4) + ')');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
