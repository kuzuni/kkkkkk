/* 작업 197 — 파워 커브 계단화의 **총전투력 영향** 측정기
 *
 *   등재문 요구: «적용 시 177(적 곡선)과 같은 시뮬로 총전투력 재확인 — 실수치 확정은 199 의 몫».
 *   이 도구는 판정하지 않는다. 같은 세이브 상태에서 `cp()` 를 **197 규칙 / 197 이전 규칙** 두 벌로
 *   재서 배수만 표로 뱉는다. 199(밸런스 비평 라운드)가 이 표를 근거로 실수치를 정한다.
 *
 *   197 이전 규칙 = ① 착용값이 `wear` 가 아니라 `mul` ② 착용 레벨 기울기 0.18(= lvMul) ③ 코스튬 보유가 평평(COS_OWN)
 *   — 세 갈래를 페이지 안에서 되돌린 «구 cp()» 를 손으로 다시 조립해서 비교한다(원본을 건드리지 않는다).
 *
 *   실행: node tools/sim197.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');

/* 진행 구간 3개 — «초반 / 중반 / 엔드» 를 보유·등급·레벨로만 정의한다(스테이지는 177 의 축) */
const SNAPS = [
  { n: '초반',  maxG: 1, lv: 3,   nCos: 1,  slots: 1, sk: 2, pt: 1 },
  { n: '중반',  maxG: 4, lv: 30,  nCos: 12, slots: 3, sk: 6, pt: 3 },
  { n: '엔드',  maxG: 7, lv: 100, nCos: 50, slots: 3, sk: 8, pt: 3 }
];

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof GRADE !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(300);

  const rows = await page.evaluate((SNAPS) => {
    const out = [];
    /* 구 규칙의 배수를 «지금 상태» 위에서 다시 계산한다 —
       cp() 는 stat 게터를 통해 bonus() 를 보므로, 구 규칙 cp 는 «축별 배수의 비» 로 환산한다. */
    const OLD_LV = 0.18;
    const oldLvMul = l => 1 + l * OLD_LV;

    SNAPS.forEach(sn => {
      /* 상태 조립 */
      S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
      S.eqSkill = []; S.eqPet = []; S.coll = {}; S.cosLv = {};
      S.avatars = {}; S.rank = 0;   /* 축복(S.bless)은 건드리지 않는다 — blessLeft 가 exp 맵을 본다 */
      AVATARS.slice(0, sn.nCos).forEach(a => S.avatars[a.id] = 1);

      const pick = (arr, g) => arr.filter(x => x.g === g);
      /* 보유: maxG 이하 전 종을 lv 로. 장착: 부위·스킬·펫을 maxG 최고등급으로 */
      [].concat(EQUIPS, SKILLS, PETS).forEach(x => {
        if (x.g <= sn.maxG) S.own[x.id] = { l: sn.lv, n: 0 };
      });
      SLOTS.slice(0, sn.slots).forEach(s => {
        const c = EQUIPS.filter(e => e.slot === s.k && e.g <= sn.maxG).sort((a, b) => b.g - a.g)[0];
        if (c) S.eqSlot[s.k] = c.id;
      });
      SKILLS.filter(s => s.g <= sn.maxG).sort((a, b) => b.g - a.g).slice(0, sn.sk)
        .forEach(s => S.eqSkill.push(s.id));
      PETS.filter(p => p.g <= sn.maxG).sort((a, b) => b.g - a.g).slice(0, sn.pt)
        .forEach(p => S.eqPet.push(p.id));
      markDirty();

      const now = { cp: cp(), dps: stat.dps, atk: bonus().atk, hp: bonus().hp };

      /* ── 구 규칙 배수 ────────────────────────────────────────────────
         ① 장착 장비 — equipVal 이 wear→mul, lvMul 0.012→0.18
         ② 스킬·펫 피해 — 같은 두 갈래
         ③ 보유(ownVal) — 197 이 손대지 않은 축(mul · 기울기 0.18). 비교에서 상쇄된다
         ④ 코스튬 보유 — 계단 → 평평(COS_OWN) */
      let atkOldF = 1, hpOldF = 1, regOldF = 1;
      /* ③ 보유 */
      /* ③ 보유 축은 197 이 손대지 않았다(mul·0.18 그대로) — 비율 1, 아래 표에서 상쇄된다 */
      /* ① 장착 */
      const eqOld = it => 0.10 * GRADE[it.g].mul * oldLvMul(oLv(it.id)) * ((it.slot && it.v) ? it.v : 1);
      SLOTS.forEach(s => {
        const id = S.eqSlot[s.k]; if (!id || !has(id)) return;
        const it = EQ[id], r = (1 + eqOld(it)) / (1 + equipVal(it));
        if (s.k === 'weapon') atkOldF *= r; else if (s.k === 'shield') hpOldF *= r; else regOldF *= r;
      });
      /* ④ 코스튬 */
      /* ⚑ 724 — 코스튬 보유 축이 «곱» 에서 «합» 으로 바뀌었다(주인 확정 모델).
         197 이 묻는 것은 «평평 → 계단» 한 축의 비이므로, 양쪽을 **같은 결합**(합)으로 재야
         비가 197 의 것으로 남는다. 한쪽만 옛 곱으로 두면 724 의 변화가 197 표에 섞여 든다. */
      const nc = AVATARS.filter(a => S.avatars[a.id]).length;
      atkOldF *= (1 + nc * COS_OWN.atk) / (1 + cosOwnSum('atk'));
      hpOldF  *= (1 + nc * COS_OWN.hp)  / (1 + cosOwnSum('hp'));

      /* ② 장착 스킬·펫 피해 — dps 만 따로 환산 */
      let dpsOld = 0;
      const rateNow = stat.rate;
      S.eqSkill.forEach(id => {
        const s = SK[id]; if (!s || s.sup) return;
        const dmgOld = stat.dmg * atkOldF * s.m * GRADE[s.g].mul * oldLvMul(oLv(s.id));
        const hits = skillHits(s);   /* 504 — 제품의 발수 입구 하나 */
        dpsOld += s.cd > 0 ? dmgOld * hits / (s.cd / Math.max(0.35, rateNow / 1.4)) : dmgOld * hits;
      });
      /* ⚑ 508(2026-08-30) — 펫 항이 `NaN` 을 세 줄 전부에 흘리고 있었다.
         뿌리는 **481**(2026-08-30, 주인 확정 «펫 피해 = 플레이어 공격력 그대로 · 등급은 공격 주기만»)이
         `PETS` 에서 `m` 을 **선언째 걷어낸 것**이다 — 여기 남아 있던 `p.m` 이 `undefined` 가 되면서
         `dpsOld` → NaN → `cpOld` → NaN 으로 번졌고, 표의 «cp 이전 / 배수 / dps 배수» 열이 통째로 NaN 이 됐다
         (`probe507` 아님 — 이 자리는 제품 셰이프를 직접 찍어 확인했다: `PETS[0]` 의 키는
          id·n·g·j·sp·tint·v·cd 뿐이고 `m` 은 없다).
         ⇒ 펫에는 **197 축이 더 이상 걸리지 않는다.** 197 이 바꾼 것은 «착용값 mul→wear · 착용 레벨 기울기
            0.18→0.012» 인데, 481 이 펫에서 등급·레벨 계수를 양쪽 규칙에서 **똑같이** 걷어냈기 때문이다.
            남는 차이는 장비 축(`atkOldF`)이 `stat.dmg` 에 얹히는 것 하나뿐이라, 제품의 현행 식
            (`petDmg(p)/p.cd` = `stat.dmg × bonus().pet / p.cd`)에 그 배수만 곱한다.
         ⚠ 이 줄은 «펫 밸런스» 를 재는 자가 아니다 — 481 의 축은 `tools/verify481.js` 몫이고, 여기는
            197 의 영향만 분리해 199 에 넘기는 입력값이다. */
      S.eqPet.forEach(id => {
        const p = PT[id]; if (!p) return;
        dpsOld += (stat.dmg * atkOldF * bonus().pet) / p.cd;
      });
      dpsOld *= stat.critMul;

      const dmgOldA = stat.dmg * atkOldF, hpOldA = stat.maxHp * hpOldF, regOldA = stat.regen * regOldF;
      const cpOld = Math.round(dpsOld * 1.2 + hpOldA * 0.6 + regOldA * 80 + dmgOldA * 3);

      out.push({ n: sn.n, cpNew: now.cp, cpOld: cpOld,
                 dpsNew: now.dps, dpsOld: dpsOld,
                 atkR: 1 / atkOldF, hpR: 1 / hpOldF });
    });
    return out;
  }, SNAPS);

  const f = v => (v >= 1e6 ? v.toExponential(2) : Math.round(v).toLocaleString('en-US'));
  console.log('작업 197 — 총전투력 영향 (197 이전 → 197)\n');
  console.log('구간   |        cp 이전 |          cp 197 |   배수 |  dps 배수 | atk배수 | hp배수');
  console.log('-------+----------------+-----------------+--------+-----------+---------+--------');
  rows.forEach(r => {
    console.log(
      r.n.padEnd(6) + ' | ' + f(r.cpOld).padStart(14) + ' | ' + f(r.cpNew).padStart(15)
      + ' | ' + ('×' + (r.cpNew / r.cpOld).toFixed(2)).padStart(6)
      + ' | ' + ('×' + (r.dpsNew / r.dpsOld).toFixed(2)).padStart(9)
      + ' | ' + ('×' + r.atkR.toFixed(2)).padStart(7)
      + ' | ' + ('×' + r.hpR.toFixed(2)).padStart(6));
  });
  console.log('\n※ 판정하지 않는다 — 199(최종 밸런스 비평 라운드)의 입력값이다.');
  await ctx.close(); await browser.close();
})();
