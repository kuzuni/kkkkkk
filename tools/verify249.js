#!/usr/bin/env node
/* 249 검증 — 스테이지 클리어 체감 «톱니» 가 **실제 게임에서** 동작한다
 *   (저장소 주인 지시 2026-08-27 · 지시서 «기능 완성 규칙»: 만들어 놓은 것이 아니라
 *    실제 게임 데이터로 동작하고 결과가 화면·판정에 반영돼야 완료다)
 *
 *   node tools/verify249.js
 *
 * 검사 항목 — 전부 **살아 있는 페이지**에서 잰다(정규식 대조는 [A] 한 절뿐이다).
 *   [A] 배선   — ES_BAND·eBand·eSmooth·eScale·BOSS_GATE_* 정의 각 1곳 · makeEnemy 의 관문 분기
 *   [B] 곡선   — 살아 있는 eHp/eDmg 가 «구간 계단» 과 정확히 일치(1e-12) · 구간 안 동일 · 앵커에서 점프
 *   [C] 개체   — 실제 스폰된 **몹**이 구간 안에서 같은 체력이고 관문에서 오른다(표시가 아니라 개체)
 *   [D] 관문   — 관문 스테이지의 **스테이지 보스**만 체력 ×BOSS_GATE_HP · 비관문은 ×1 · 공격력은 불변
 *   [E] 파급   — 던전 보스(178)·승급 수호자(208)·아레나(123)는 관문 배수를 **안** 탄다
 *   [F] 실동작 — 관문 스테이지에서 보스를 실제로 격파하면 S.stage/S.best 가 오르고 다음 구간이 선다
 *   [G] 화면   — 재화 정보 팝업의 «현재 스테이지 적 체력» 이 새 곡선 값을 그대로 보여 준다
 *   [H] 음성   — ES_BAND=1 사본(=249 이전)에서는 구간 계단이 사라진다 ([B][C] 가 진짜로 계단을 본다는 증명)
 *   [I] 콘솔 에러 0
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRCF = path.resolve(__dirname, '..', 'index.html');
const NEG  = path.resolve(__dirname, '..', '.neg249.html');
const URL  = 'file://' + SRCF.replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (name, got, want, tol) =>
  ok(Math.abs(got - want) <= Math.abs(want)*tol + 1e-12, name,
     Number(got).toExponential(6) + ' vs ' + Number(want).toExponential(6));

/* 게이트 자기 상수 — 화면 식을 그대로 다시 부르는 «항등식» 을 피한다(LESSONS 212-①).
   설치본과 어긋나면 [A] 에서 먼저 빨개진다. */
/* 285 — 보스 체력 배수와 공격력 배수가 갈렸다(BOSS_MUL 하나로 둘 다 재던 자리). 보스전 제한 시간이
   30 → 15초로 반이 되면서 **체력만** ×22 → ×11 로 같이 내렸다 — 시간만 줄이면 «훈련만» 설계
   플레이어가 평범한 보스조차 못 잡는다(sim249 [C] 상한이 «없음» 으로 떨어진다). 공격력은 그대로다.
   ⚑ GATE_HP 1.44 는 **안 바뀐다**: 시간과 체력이 같은 비율로 줄어 역산 상한(1.4469)이 불변이다. */
/* ⚑ 199 1회차 이관(2026-08-31) — **M1 1.010 → 1.020.** 249 는 «ES_* 다섯 상수를 한 글자도
   안 건드린다» 를 자기 범위 제한으로 적어 두고 [A] 로 그것을 지켰는데, 199 의 손잡이 ①(적 체력
   지수)은 주인이 199 행에 명시로 열어 둔 축이다. 그래서 항을 **지우지 않고 방향만 바꿔** 갈아
   끼운다(333 처방) — ES_M1 은 «불변» 이 아니라 «199 가 정한 값과 같은가» 를 묻고, 나머지 넷은
   그대로 «불변(177)» 이다. 값의 근거는 sim177 ⑤(상한 1.03063)와 sim249 ⑨(톱니 진폭, 실측
   상한 ~1.024) 두 자를 **동시에** 통과하는 최대값이라는 것이다. */
/* ⚑ 199 3회차 이관(2026-08-31) — **BAND·GATE_N 10 → 40.** 10 은 «구 isBossStage 의 벽 주기» 에서
   온 값이었는데, 봇 실측(199 2회차)에서 30일 벽 32칸 = 주인 목표(간격 ×1.4 · 30일에 ~8칸)의
   4배였다. 주기는 199 행이 연 손잡이 ①(구간 점프)이라 M1 과 같은 꼴로 항을 지우지 않고 방향만
   바꾼다(333 처방) — BAND 는 «불변(162 잔재)» 이 아니라 «199 가 벽 개수에서 정한 값과 같은가»
   를 묻는다. 스윕 근거는 199 review §3(sim177 ⑧ 불변 · 진폭 1.98 → 2.42 · 관문 상한 3.2035). */
const C = { K:0.888, KNEE:80, M1:1.020, M2:1.127, A:0.5872, HB:55, DB:6,
            BAND:40, GATE_N:40, GATE_HP:1.44, BOSS_HP:11, BOSS_DMG:22 };
const smooth = a => (1 + C.K*(a-1)) * Math.pow(C.M1, Math.min(a, C.KNEE)-1) * Math.pow(C.M2, Math.max(0, a-C.KNEE));
const eband  = s => Math.max(1, C.BAND*Math.floor(s/C.BAND));
const wHp    = s => C.HB * smooth(eband(s));
const wDmg   = s => C.DB * Math.pow(smooth(eband(s)), C.A);
const wGate  = s => (s % C.GATE_N === 0 ? C.GATE_HP : 1);

/* 곡선을 볼 스테이지 — 구간 안(같아야 함) · 관문(올라야 함) · 무릎 앞뒤 */
const IN_BAND = [11, 13, 17, 39];   /* 199 3회차 — 전부 첫 구간(1..39) 안 · 39 는 경계 검사용 */
const GATES   = [40, 80, 120, 160]; /* 199 3회차 — GATE_N 40 의 배수 */
const CURVE_S = [1, 2, 5, 9, 10, 11, 19, 20, 39, 40, 79, 80, 81, 89, 90, 120, 200];

(async () => {
  const src = fs.readFileSync(SRCF, 'utf8');

  /* ── [A] 배선 ─────────────────────────────────────────────── */
  const cnt = re => (src.match(re) || []).length;
  ok(cnt(/const ES_BAND\s*=/g) === 1,      '[A] ES_BAND 정의 1곳', cnt(/const ES_BAND\s*=/g));
  ok(cnt(/const eBand\s*=/g) === 1,        '[A] eBand 정의 1곳',   cnt(/const eBand\s*=/g));
  ok(cnt(/const eSmooth\s*=/g) === 1,      '[A] eSmooth 정의 1곳', cnt(/const eSmooth\s*=/g));
  ok(cnt(/const eScale = /g) === 1,        '[A] eScale 정의 1곳',  cnt(/const eScale = /g));
  ok(cnt(/const BOSS_GATE_HP\s*=/g) === 1, '[A] BOSS_GATE_HP 정의 1곳', cnt(/const BOSS_GATE_HP\s*=/g));
  ok(parseFloat((src.match(/const ES_BAND\s*=\s*(\d+)/) || [])[1]) === C.BAND,
     '[A] ES_BAND 설치값 = ' + C.BAND, (src.match(/const ES_BAND\s*=\s*(\d+)/) || [])[1]);
  ok(parseFloat((src.match(/const BOSS_GATE_HP\s*=\s*([\d.]+)/) || [])[1]) === C.GATE_HP,
     '[A] BOSS_GATE_HP 설치값 = ' + C.GATE_HP, (src.match(/const BOSS_GATE_HP\s*=\s*([\d.]+)/) || [])[1]);
  ok(/const eScale = s => eSmooth\(eBand\(s\)\);/.test(src), '[A] eScale = eSmooth(eBand(s))');
  ok(/const hp = eHp\(s\) \* T2\.hp \* \(tk === 'boss' \? bossGateHp\(s\) : 1\);/.test(src),
     '[A] makeEnemy 가 스테이지 보스에만 관문 배수를 건다');
  /* 177 이 푼 다섯 상수는 249 가 한 글자도 안 건드린다 */
  const M1_LBL = { ES_M1: ' = 199 1회차 확정값(sim177 ⑤ · sim249 ⑨ 동시 상한)' };
  [['ES_K',C.K],['ES_KNEE',C.KNEE],['ES_M1',C.M1],['ES_M2',C.M2],['ES_A',C.A]].forEach(([k,v]) =>
    ok(parseFloat((src.match(new RegExp('const ' + k + '\\s*=\\s*([\\d.]+)')) || [])[1]) === v,
       '[A] ' + k + (M1_LBL[k] || ' 불변(177)'), v));
  ok(/const eGold\s*=\s*s\s*=>\s*4\s*\*\s*Math\.pow\(1\.175,\s*s-1\)/.test(src), '[A] eGold(경제 축) 불변(112)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof eHp === 'function' && typeof makeEnemy === 'function');
  await page.waitForTimeout(700);

  /* ── [B] 곡선 ─────────────────────────────────────────────── */
  const live = await page.evaluate(ss => ss.map(s => ({ s, hp: eHp(s), dmg: eDmg(s), band: eBand(s) })), CURVE_S);
  live.forEach(r => {
    near('[B] eHp(' + r.s + ') = 55·eSmooth(eBand)', r.hp, wHp(r.s), 1e-12);
    near('[B] eDmg(' + r.s + ') = 6·eSmooth(eBand)^A', r.dmg, wDmg(r.s), 1e-12);
  });
  const bandFlat = await page.evaluate(B => {
    let flat = true, up = true, drop = false;
    for(let s=1;s<400;s++){
      const a = Math.max(1, B*Math.floor(s/B)), a2 = Math.max(1, B*Math.floor((s+1)/B));
      if(a === a2 && Math.abs(eHp(s+1) - eHp(s)) > 1e-9) flat = false;   /* 같은 구간이면 같아야 한다 */
      if(a !== a2 && !(eHp(s+1) > eHp(s))) up = false;                   /* 구간이 바뀌면 올라야 한다 */
      if(eHp(s+1) < eHp(s) - 1e-9 || eDmg(s+1) < eDmg(s) - 1e-9) drop = true;
    }
    return { flat, up, drop };
  }, C.BAND);
  ok(bandFlat.flat, '[B] 구간 안에서는 적 스탯이 한 글자도 안 오른다 (s 1..400)');
  ok(bandFlat.up,   '[B] 구간이 바뀌는 칸(관문)에서 반드시 오른다 (s 1..400)');
  ok(!bandFlat.drop,'[B] 어느 스테이지에서도 적이 약해지지 않는다');
  near('[B] 스테이지 1 은 여전히 55', live[0].hp, 55, 1e-12);
  near('[B] 스테이지 1 은 여전히 6',  live[0].dmg, 6, 1e-12);

  /* ── [C][D] 실제 스폰된 개체 ───────────────────────────────── */
  const spawn = await page.evaluate(async ss => {
    const out = [];
    for(const s of ss){
      S.stage = s; bossOn = false; enemies.length = 0; spawnQ.length = 0;
      spawnStage();
      for(let i=0;i<240 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
      const mob = enemies[0];
      startBoss();
      for(let i=0;i<300 && !enemies.some(e => e.tk === 'boss');i++) await new Promise(r => requestAnimationFrame(r));
      const boss = enemies.find(e => e.tk === 'boss');
      out.push({ s,
        mobMax: mob ? mob.max : null, mobMul: mob ? ETYPE[mob.tk].hp : null,
        bossMax: boss ? boss.max : null, bossDmg: boss ? boss.dmg : null });
      bossOn = false; enemies.length = 0; spawnQ.length = 0;
    }
    return out;
  }, IN_BAND.concat(GATES));
  const byS = {}; spawn.forEach(r => byS[r.s] = r);
  IN_BAND.forEach(s => {
    const r = byS[s];
    ok(r.mobMax !== null, '[C] s' + s + ' 몹이 실제로 스폰됐다');
    if(r.mobMax !== null) near('[C] s' + s + ' 스폰된 몹 체력 = 계단 eHp×종족배수', r.mobMax, wHp(s)*r.mobMul, 1e-9);
  });
  /* 구간 안 네 스테이지의 «같은 종족 기준» 체력이 서로 같다 — 개체로 본 계단 */
  const norm = s => byS[s].mobMax / byS[s].mobMul;
  ok(IN_BAND.every(s => Math.abs(norm(s) - norm(IN_BAND[0])) < 1e-9),
     '[C] 구간 안(s' + IN_BAND.join('·s') + ') 몹 체력이 서로 같다',
     IN_BAND.map(s => norm(s).toExponential(4)).join(' '));
  ok(norm(40) > norm(39) * 1.5, '[C] 구간 경계 s40 에서 몹 체력이 뛴다',
     (norm(40)/norm(39)).toFixed(3) + '배');
  GATES.forEach(s => {
    const r = byS[s];
    ok(r.bossMax !== null, '[D] s' + s + ' 스테이지 보스가 실제로 스폰됐다');
    if(r.bossMax !== null){
      near('[D] s' + s + ' 관문 보스 체력 = eHp×' + C.BOSS_HP + '×' + C.GATE_HP,
           r.bossMax, wHp(s)*C.BOSS_HP*wGate(s), 1e-9);
      near('[D] s' + s + ' 관문 보스 **공격력은 불변** = eDmg×' + C.BOSS_DMG,
           r.bossDmg, wDmg(s)*C.BOSS_DMG, 1e-9);
    }
  });
  IN_BAND.forEach(s => {
    const r = byS[s];
    if(r.bossMax !== null)
      near('[D] s' + s + '(비관문) 보스 체력 = eHp×' + C.BOSS_HP + ' (배수 없음)',
           r.bossMax, wHp(s)*C.BOSS_HP, 1e-9);
  });

  /* ── [E] 파급 — 다른 «보스» 들은 관문 배수를 안 탄다 ───────────── */
  const ripple = await page.evaluate(async () => {
    S.stage = 20;
    const promoHp = eHp(S.stage)*60;                    /* 208 승급 수호자 식 */
    /* 던전 보스(178) — 요구 피해에서 나오므로 스테이지 곡선과 무관하다 */
    const dunK = typeof DUN_BOSS_HPK === 'number' ? DUN_BOSS_HPK : null;
    /* 아레나(123) — makeEnemy('arena') 는 tk 가 'arena' 라 관문 분기를 안 탄다 */
    bossOn = false; enemies.length = 0; spawnQ.length = 0;
    makeEnemy('arena');
    const ar = enemies.find(e => e.tk === 'arena');
    const arMax = ar ? ar.max : null, arMul = ar ? ETYPE.arena.hp : null;
    enemies.length = 0;
    return { promoHp, dunK, arMax, arMul, gate: bossGateHp(20), notGate: bossGateHp(19) };
  });
  near('[E] 승급 수호자 체력 = eHp(s)×60 (관문 배수 없음)', ripple.promoHp, wHp(20)*60, 1e-9);
  near('[E] 아레나 도전자 체력 = eHp×ETYPE.arena.hp (관문 배수 없음)', ripple.arMax, wHp(20)*ripple.arMul, 1e-9);
  ok(ripple.dunK !== null, '[E] 던전 보스는 DUN_BOSS_HPK(요구 피해) 축이라 스테이지 곡선과 무관', ripple.dunK);
  ok(ripple.gate === C.GATE_HP && ripple.notGate === 1,
     '[E] bossGateHp — 관문 ' + C.GATE_HP + ' · 비관문 1', ripple.gate + '/' + ripple.notGate);

  /* ── [F] 실동작 — 관문 스테이지를 실제로 «격파해서» 넘는다 ──────── */
  const play = await page.evaluate(async () => {
    /* 관문 s20 로 세팅하고 50킬을 채운 뒤 보스를 실제로 잡는다(판정은 건드리지 않는다) */
    S.stage = 20; S.best = Math.max(S.best, 20); S.bossFarm = false;
    bossOn = false; enemies.length = 0; spawnQ.length = 0;
    spawnStage();
    for(let i=0;i<120 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
    startBoss();
    for(let i=0;i<300 && !enemies.some(e => e.tk === 'boss');i++) await new Promise(r => requestAnimationFrame(r));
    const boss = enemies.find(e => e.tk === 'boss');
    const bossMax = boss ? boss.max : null;
    const before = S.stage, goldBefore = S.gold;
    /* 실제 처치 경로(hitEnemy → killEnemy)로 죽인다 — 스테이지 클리어 판정이 그 경로에 달려 있다 */
    if(boss) hitEnemy(boss, boss.hp * 10, false);
    for(let i=0;i<240 && S.stage === before;i++) await new Promise(r => requestAnimationFrame(r));
    return { bossMax, before, after: S.stage, best: S.best, goldUp: S.gold > goldBefore,
             newBand: eBand(S.stage), curHp: eHp(S.stage) };
  }).catch(e => ({ err: String(e) }));
  if(play.err){
    ok(false, '[F] 관문 보스 격파 실동작', play.err);
  } else {
    ok(play.after === play.before + 1, '[F] 관문 s20 보스를 격파하니 스테이지가 올랐다',
       play.before + ' → ' + play.after);
    ok(play.best >= play.after, '[F] S.best 가 따라 올랐다 (세이브 반영)', play.best);
    ok(play.goldUp, '[F] 클리어 보상 골드가 들어왔다');
    ok(play.newBand === 20, '[F] 다음 스테이지(21)는 새 구간(앵커 20) 안이다 — 계단이 실제 진행에 붙었다',
       play.newBand);
    near('[F] s21 적 체력 = 앵커 20 값 (돌파 구간)', play.curHp, wHp(21), 1e-9);
  }

  /* ── [G] 화면 반영 — 재화/정보 팝업의 «현재 스테이지 적 체력» ───── */
  const shown = await page.evaluate(() => {
    S.stage = 30; bossOn = false; enemies.length = 0; spawnQ.length = 0;
    renderSt();                                        /* 설정/정보 탭 본문을 실제로 그린다 */
    const el = document.getElementById('bSt');
    const txt = el ? el.innerText.replace(/\s+/g, ' ') : '';
    return { txt, hp: eHp(30), dmg: eDmg(30), want: fmtB(eHp(30)), wantD: fmtB(eDmg(30)) };
  });
  near('[G] 표기가 읽는 eHp(30) 가 계단 값이다',  shown.hp,  wHp(30),  1e-12);
  near('[G] 표기가 읽는 eDmg(30) 가 계단 값이다', shown.dmg, wDmg(30), 1e-12);
  ok(shown.txt.indexOf(shown.want) >= 0 && shown.txt.indexOf(shown.wantD) >= 0,
     '[G] «현재 스테이지» 절이 새 곡선 값을 실제로 찍는다 (' + shown.want + ' · ' + shown.wantD + ')');
  ok(shown.txt.indexOf(C.BAND + '스테이지') >= 0 && shown.txt.indexOf('관문') >= 0,
     '[G] «' + C.BAND + '스테이지마다 관문» 이 화면 문구로 나온다 (162 이전 «10스테이지마다 보스» 문구 교체)');
  ok(shown.txt.indexOf('10스테이지마다 보스') < 0, '[G] 구 문구(«10스테이지마다 보스»)가 화면에 없다');

  /* ── [H] 음성 — ES_BAND=1 사본(=249 이전)에서는 계단이 사라진다 ─── */
  const negSrc = src.replace(/const ES_BAND = \d+;/, 'const ES_BAND = 1;');   /* 199 3회차 — 설치값 리터럴에 안 묶는다 */
  ok(negSrc !== src, '[H] 음성 사본에 «구간 계단 없음»(ES_BAND=1)을 실제로 심었다');
  fs.writeFileSync(NEG, negSrc);
  const np = await ctx.newPage();
  await np.goto('file://' + NEG.replace(/\\/g, '/'));
  await np.waitForFunction(() => typeof eHp === 'function');
  await np.waitForTimeout(600);
  const neg = await np.evaluate(() => ({
    same: Math.abs(eHp(19) - eHp(11)) < 1e-9, hp19: eHp(19), hp11: eHp(11), hp1: eHp(1)
  }));
  ok(!neg.same, '[H] N1 — 계단이 없으면 구간 안 s11 ≠ s19 (설치본에서는 같다)',
     neg.hp11.toExponential(4) + ' vs ' + neg.hp19.toExponential(4));
  near('[H] N2 — 그래도 s1 은 55 다 : [B] 의 s1 항목만으로는 회귀를 못 잡는다는 증명', neg.hp1, 55, 1e-12);
  await np.close();
  try{ fs.unlinkSync(NEG); }catch(e){}

  ok(errs.length === 0, '[I] 콘솔·런타임 에러 0', errs.length + (errs.length ? ' : ' + errs.slice(0,3).join(' | ') : ''));

  await browser.close();
  console.log('');
  console.log('VERIFY249 ' + pass + '/' + (pass+fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
