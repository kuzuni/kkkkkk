/* 작업 256 — 가이드 미션 «상태 도달» 목표치 실측기 (2026-08-27)
   실행: node tools/measure256.js

   무엇을 재나 — 등재 256 은 «행위 반복»(소환 n회 더 · 몬스터 n마리 처치 · 훈련 n회 강화) 미션을
   «상태 수치 도달» 로 바꾼다. 그러려면 **바꿀 자리의 체감 난이도**를 숫자로 알아야 한다.
   눈대중으로 고른 임계는 체인을 막거나(너무 높음) 공짜로 통과시킨다(너무 낮음).

   ① 훈련 공격력 레벨 — `tools/sim112.js --csv` 의 `lv_new`(그 스테이지까지의 누적 골드를
      3스탯에 고르게 썼을 때 도달 레벨)를 그대로 읽는다. 여기서 다시 계산하지 않는다.
   ② 전투력 cp() — 체인 각 지점의 «그때 플레이어 상태» 를 실제 게임에 심고 `cp()` 를 읽는다.
      (cp 는 getter 라 상태만 세우면 바로 읽힌다 — 재계산 호출이 없다)

   출력의 숫자를 GUIDE 표의 goal 에 그대로 넣는다. 상수를 바꾸면 이 파일을 다시 돌릴 것. */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const { execFileSync } = require('child_process');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* ---------- ① 훈련 레벨 (sim112 재사용) ---------- */
function trainLevels(){
  const csv = execFileSync('node', [path.join(__dirname, 'sim112.js'), '--csv'], { encoding:'utf8' });
  const out = {};
  for(const ln of csv.split('\n')){
    const c = ln.split(',');
    if(c.length < 9) continue;
    const s = Math.round(parseFloat(c[0]));
    if(!Number.isFinite(s)) continue;
    out[s] = Math.round(parseFloat(c[8]));
  }
  return out;
}

/* ---------- ② 전투력 ---------- */
(async () => {
  const lvT = trainLevels();
  console.log('[A] 훈련 공격력 레벨 (sim112 — 누적 골드를 3스탯에 고르게)');
  [3, 5, 10, 15, 20, 25, 30, 40, 80].forEach(s => {
    if(lvT[s] !== undefined) console.log('     스테이지 ' + String(s).padStart(2) + ' → Lv ' + lvT[s]);
  });
  console.log('');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport:{ width:1080, height:2280 } });
  await page.addInitScript(() => { try{ localStorage.clear(); }catch(e){} });
  await page.goto(URL);
  await page.waitForFunction(() => typeof cp === 'function' && typeof S === 'object');

  const rows = await page.evaluate(() => {
    const out = [];
    /* 등급 0(첫 티어)의 «기본» 항목 = 실제 첫 소환에서 나올 수 있는 최소 성능대 */
    const eq0 = k => (EQUIPS.find(e => e.slot === k && e.g === 0) || {}).id;
    const sk0 = (SKILLS.find(s => s.g === 0) || SKILLS[0]).id;
    function reset(){
      S.own = {}; S.eqSlot = {}; S.eqSkill = []; S.eqPet = [];
      S.lv = {}; S.upgrades = 0; S.trainStage = 1;
    }
    function give(id){ S.own[id] = { n:0, l:1 }; }
    /* ⚠ bonus() 는 `bonusDirty` 로 캐시된다 — 상태를 손으로 심었으면 반드시 무효화해야
       장비·스킬 배율이 cp 에 들어온다(안 그러면 «장착해도 cp 가 그대로» 로 보인다). */
    function shot(n){
      bonusDirty = true;
      out.push({ n, cp: cp(), dmg: Math.round(stat.dmg), dps: Math.round(stat.dps), hp: Math.round(stat.maxHp) });
    }

    reset(); shot('① 신규(아무것도 없음)');
    give(sk0); S.eqSkill = [sk0];                     shot('② idx1 스킬 장착 직후');
    give(eq0('weapon')); S.eqSlot.weapon = eq0('weapon'); shot('③ idx3 무기 장착 직후');
    S.lv.atk = 10;                                    shot('④ idx4 훈련 공격력 Lv10 직후');
    give(eq0('shield')); S.eqSlot.shield = eq0('shield');
    give(eq0('amulet')); S.eqSlot.amulet = eq0('amulet');
    shot('⑤ idx6 방패·목걸이까지 (= idx7 시작 시점)');
    S.lv.atk = 15; S.lv.hp = 15; S.lv.regen = 15;     shot('⑥ 스테이지 5 지점(훈련 Lv15)');
    S.lv.atk = 33; S.lv.hp = 33; S.lv.regen = 33;     shot('⑦ 스테이지 10 지점(훈련 Lv33)');
    S.lv.atk = 55; S.lv.hp = 55; S.lv.regen = 55;     shot('⑧ 스테이지 15 지점(훈련 Lv55)');
    return out;
  });

  console.log('[B] 전투력 cp() — 가이드 체인 각 지점의 실제 상태를 심고 읽었다');
  console.log('     지점                                    |       cp |    dps |   dmg |    maxHp');
  rows.forEach(r => console.log('     ' + r.n.padEnd(38) + ' | ' + String(r.cp).padStart(8)
    + ' | ' + String(r.dps).padStart(6) + ' | ' + String(r.dmg).padStart(5) + ' | ' + String(r.hp).padStart(8)));
  console.log('');
  console.log('     ⚠ 등급 0 첫 티어 기준의 **하한**이다 — 상위 등급이 뜨면 cp 는 더 높다.');

  await browser.close();
})();
