/* 작업 177 게이트 — 스테이지(적) 곡선 «순수 지수 → 선형×구간별 저지수» 의 **실동작** 회귀 방지.
   실행: node tools/verify177.js

   주인 지시(2026-08-27): «훈련 밸런스 바꾼 것에 맞게 스테이지도 밸런스 바꿔야 함».
   수치 판정(역산·난이도 프로파일·도달 시간)은 `node tools/sim177.js` 가 본다.
   이 게이트는 그 곡선이 **게임 안에서 실제로 그렇게 동작하는지** 를 본다(T2 «기능 완성 규칙»):

     ① 소스   — eScale/ES_* 정의 각 1곳 · eHp/eDmg 에서 구 지수 리터럴 소멸 · eGold 는 그대로
     ② 곡선   — 살아 있는 `eHp(s)`·`eDmg(s)` 가 공식과 **정확히** 일치(전 구간, 1e-12)
     ③ 불변   — 스테이지 1 은 구 곡선과 완전히 동일(55 · 6) · 무릎에서 점프 없음 · 단조 증가
     ④ 스폰   — **실제로 스폰된 몹·보스의 hp/dmg 가 곡선 값**이다(표시가 아니라 전투 개체)
     ⑤ 진행   — 훈련만 있는 캐릭터로 s60 몹을 **실제로 때려서** 곡선이 예고한 시간 안에 죽인다
                 (553 — «시뮬 대용식» 대조는 이 파일의 사본이 아니라 **sim177 이 찍은 DPS 계수**를
                  읽어서 한다. 되돌림 시험이 옛 대용식 사본으로 빨간 것을 확인한다)
     ⑥ 파급   — eHp 를 쓰는 다른 자리(승급 수호자 hp = eHp×60 · 재화 정보 팝업 표기)가 따라온다
     ⑦ 경제   — eGold 는 한 글자도 안 바뀌었다(112 가 TRAIN_COST_R 을 여기서 역산했다)
     ⑧ 교차   — `sim177` 이 SIM177 PASS 이고 그 [D] after 표가 실코드 값과 일치
     ⑨ 음성   — **구 순수 지수 곡선으로 되돌린 사본**(`.v177-neg.html`)을 **새로 열어** 재면
                 ②③④ 가 정확히 빨개진다(LESSONS 191·219 — 살아 있는 페이지에 주입하면 거짓 초록)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SRC = path.resolve(__dirname, '../index.html');
const NEG = path.resolve(__dirname, `../.v177-neg-${process.pid}.html`);
const FILE = 'file://' + SRC;

const R = [];
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });
const yes = (n, got) => R.push({ n, got: String(got), want: 'true', pass: got === true });
const near = (n, got, want, tol) => R.push({
  n, got: Number(got).toExponential(6), want: '≈' + Number(want).toExponential(6),
  pass: Math.abs(got - want) <= Math.abs(want) * tol + 1e-12 });

/* 게이트 자기 상수 — 화면이 쓴 식을 다시 계산하는 «항등식» 을 피하려고, 기대값은 여기서 만든다
   (LESSONS 212-①). 설치본과 어긋나면 ① 에서 먼저 빨개진다. */
/* 285 — 보스 체력 배수와 공격력 배수가 **갈렸다**(둘 다 22 였다). 보스전 제한 시간이 30 → 15초로
   반이 되면서 체력만 ×22 → ×11 로 같이 내렸고(시간만 줄이면 설계 플레이어가 못 잡는다), 공격력은
   그대로다 — «오래 걸리는 것이지 즉사가 아니다»(249 ②). 승급 수호자 배수도 60 → BOSS_SEC(15). */
/* ⚑ 199 4회차 이관(2026-08-31) — **이 게이트는 199 1·3회차 이관에서 빠져 있었다**(게이트 부패).
   r1 이 ES_M1 1.010 → 1.020 을, r3 이 BAND·GATE_N 10 → 40 을 옮기며 verify249·sim249 만 갈아
   끼우고 여기는 안 건드려, 수리 전 커밋(433ee10)에서도 **63/100 FAIL** 이었다(직접 대조 실행).
   333 처방대로 항을 지우지 않고 기대 상수를 199 확정값으로 갈아 끼운다 — M1 = 199 r1(두 자 동시
   상한의 최대값) · BAND = r3(벽 개수 손잡이) · RAMP = r4(밴드 내 상승면, 스윕 review §4). */
/* ⚑ 199 5회차 이관 — BAND·GATE_N 40 → 80(벽 개수 ① + 벽당 실오르막 ③ 의 공통 손잡이 ·
   근거는 review §5-2 스윕: 벽당 실오르막 21 → 41분 · 부지런 30일 벽 12 → 8칸 = 주인 목표).
   r3 가 «BAND = 199 가 정한 값과 같은가» 로 뜻을 바꿔 둔 그 자리라, 값만 따라온다. */
/* ⚑ 199 6회차 이관 — BAND·GATE_N 80 → **40 원복**. 5회차의 80 은 벽 «개수» 를 맞췄지만 3인
   전원이 ① 을 3·3·4 로 막았다 — 이 상수는 경계 점프 R^(1−RAMP·(B−1)/B)(B 80 → ×2,155 ·
   B 40 → ×47)를 통째로 정하고, ×2,155 이빨 하나(s640)가 30일의 29.5% 를 먹어 벽의 «자리» 가
   무너졌다(목표 칸 적중 6 → 3/8). 여기도 r3 가 뜻을 «BAND = 199 가 정한 값과 같은가» 로 바꿔 둔
   자리라 **값만 따라온다**. 근거 review §6-1·§6-2. */
const C = { K:0.888, KNEE:80, M1:1.020, M2:1.127, A:0.5872, HB:55, DB:6, BAND:40, GATE_N:40, GATE_HP:1.44,
            RAMP:0.2, BOSS_HP:11, BOSS_DMG:22, BOSS_SEC:15, PROMO_HP:15 };
/* 249 — 곡선에 «구간 계단» 이 얹혔고, 199 4회차가 구간 안에 «램프»(상승면)를 깔았다:
   eScale(s) = eSmooth(a)·(eSmooth(a+B)/eSmooth(a))^(RAMP·(s−a)/B), a = eBand(s).
   GATE_N 의 배수 스테이지의 **스테이지 보스**만 체력 배수 GATE_HP 를 탄다. 177 이 푼 다섯 상수와
   «s1 = 55/6» 은 그대로라 아래 대조는 전부 유효하다 — 기대식만 249·199 를 따라간다. */
const smooth = a => (1 + C.K*(a-1)) * Math.pow(C.M1, Math.min(a, C.KNEE)-1) * Math.pow(C.M2, Math.max(0, a-C.KNEE));
const band  = s => Math.max(1, C.BAND*Math.floor(s/C.BAND));
const scale = s => { const a = band(s);
  return smooth(a) * Math.pow(smooth(a + C.BAND) / smooth(a), C.RAMP * (s - a) / C.BAND); };
const wantHp  = s => C.HB * scale(s);
const wantDmg = s => C.DB * Math.pow(scale(s), C.A);
const wantBossHp = s => wantHp(s) * C.BOSS_HP * (s % C.GATE_N === 0 ? C.GATE_HP : 1);
const STAGES = [1,2,5,10,20,40,79,80,81,120,200,300];

(async () => {
  /* ── ① 소스 ─────────────────────────────────────────────────────── */
  const src = fs.readFileSync(SRC, 'utf8');
  eq('① eScale 정의 1곳', (src.match(/const eScale = /g) || []).length, 1);
  ['ES_K','ES_KNEE','ES_M1','ES_M2','ES_A'].forEach(k =>
    eq('① ' + k + ' 정의 1곳', (src.match(new RegExp('const ' + k + '\\s*=', 'g')) || []).length, 1));
  /* 설치 상수 = 이 게이트의 기대 상수. 값이 갈리면 곡선 대조가 통째로 무의미해지므로 여기서 막는다 */
  [['ES_K',C.K],['ES_KNEE',C.KNEE],['ES_M1',C.M1],['ES_M2',C.M2],['ES_A',C.A]].forEach(([k,v]) =>
    eq('① ' + k + ' 설치값', parseFloat((src.match(new RegExp('const ' + k + '\\s*=\\s*([\\d.]+)')) || [])[1]), v));
  yes('① eHp 가 eScale 을 쓴다',  /const eHp\s*=\s*s\s*=>\s*55\s*\*\s*eScale\(s\)/.test(src));
  yes('① eDmg 가 eScale\^A 를 쓴다', /const eDmg\s*=\s*s\s*=>\s*6\s*\*\s*Math\.pow\(eScale\(s\),\s*ES_A\)/.test(src));
  /* 구 지수 곡선의 «식» 이 남아 있으면 안 된다 — 주석 회고가 아니라 **정의 줄**만 센다 */
  eq('① 구 eHp 지수 정의 잔재 0곳',  (src.match(/const eHp\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(1\.25/g) || []).length, 0);
  eq('① 구 eDmg 지수 정의 잔재 0곳', (src.match(/const eDmg\s*=\s*s\s*=>\s*[\d.]+\s*\*\s*Math\.pow\(1\.14/g) || []).length, 0);
  yes('① eGold 는 종전 그대로(112 경제 축)', /const eGold\s*=\s*s\s*=>\s*4\s*\*\s*Math\.pow\(1\.175,\s*s-1\)/.test(src));

  /* ── 페이지 ─────────────────────────────────────────────────────── */
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ② 곡선 ── */
  const live = await p.evaluate(ss => ss.map(s => ({ s, hp: eHp(s), dmg: eDmg(s), gold: eGold(s) })), STAGES);
  live.forEach(r => {
    near('② eHp(' + r.s + ') = 55·eScale', r.hp, wantHp(r.s), 1e-12);
    near('② eDmg(' + r.s + ') = 6·eScale^A', r.dmg, wantDmg(r.s), 1e-12);
  });

  /* ── ③ 불변 ── */
  eq('③ 스테이지 1 적 체력 = 55 (구 곡선과 동일)', live[0].hp, 55);
  eq('③ 스테이지 1 적 공격 = 6 (구 곡선과 동일)',  live[0].dmg, 6);
  const shape = await p.evaluate(B => {
    let mono = true, bandUp = true;
    for(let s=1;s<400;s++) if(eHp(s+1) < eHp(s) || eDmg(s+1) < eDmg(s)) mono = false;
    /* 249 — 구간 안에서는 «그대로» 가 설계다. 강증가는 구간 앵커끼리 본다. */
    for(let s=B;s+B<=400;s+=B) if(eHp(s+B) <= eHp(s) || eDmg(s+B) <= eDmg(s)) bandUp = false;
    return { mono, bandUp, atKnee: eHp(90)/eHp(80), below: eHp(80)/eHp(70) };
  }, C.BAND);
  yes('③ eHp·eDmg 가 s 1..400 비감소 (249 — 구간 안은 그대로가 설계)', shape.mono);
  yes('③ eHp·eDmg 가 구간(' + C.BAND + ')마다 강증가', shape.bandUp);
  /* 199 4회차 — BAND 40 + 램프에서 s80→90 은 구간 안(램프) 비, s70→80 은 경계 점프 비다.
     «M2/M1 그대로» 라는 옛 라벨의 실체는 «기대식(scale)과 항등» 이므로 그 뜻으로 갈아 끼운다. */
  yes('③ 무릎 앞뒤 배율 = 기대식(계단×램프) 그대로 — s80→90 '
      + shape.atKnee.toFixed(4) + ' vs s70→80 ' + shape.below.toFixed(4),
      Math.abs(shape.atKnee - scale(90)/scale(80)) < 1e-9
      && Math.abs(shape.below - scale(80)/scale(70)) < 1e-9);

  /* ── ④ 실제로 스폰된 개체 ── */
  const spawn = await p.evaluate(async ss => {
    const out = [];
    for(const s of ss){
      S.stage = s; spawnStage();
      /* 몹 파도가 실제로 나올 때까지 프레임을 돌린다 */
      for(let i=0;i<240 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
      const mob = enemies[0];
      startBoss();
      for(let i=0;i<300 && !enemies.some(e => e.tk === 'boss');i++) await new Promise(r => requestAnimationFrame(r));
      const boss = enemies.find(e => e.tk === 'boss');
      out.push({ s,
        mobTk: mob ? mob.tk : null, mobMax: mob ? mob.max : null, mobDmg: mob ? mob.dmg : null,
        mobHpMul: mob ? ETYPE[mob.tk].hp : null, mobDmgMul: mob ? ETYPE[mob.tk].dmg : null,
        bossMax: boss ? boss.max : null, bossDmg: boss ? boss.dmg : null });
    }
    return out;
  }, [1, 20, 80, 120]);
  spawn.forEach(r => {
    yes('④ s' + r.s + ' 몹이 실제로 스폰됐다', r.mobMax !== null);
    if(r.mobMax !== null){
      near('④ s' + r.s + ' 스폰된 몹 체력 = eHp×종족배수', r.mobMax, wantHp(r.s)*r.mobHpMul, 1e-9);
      near('④ s' + r.s + ' 스폰된 몹 공격 = eDmg×종족배수', r.mobDmg, wantDmg(r.s)*r.mobDmgMul, 1e-9);
    }
    yes('④ s' + r.s + ' 보스가 실제로 스폰됐다', r.bossMax !== null);
    if(r.bossMax !== null){
      near('④ s' + r.s + ' 스폰된 보스 체력 = eHp×' + C.BOSS_HP + (r.s % C.GATE_N === 0 ? '×' + C.GATE_HP + '(249 관문)' : ''),
           r.bossMax, wantBossHp(r.s), 1e-9);
      near('④ s' + r.s + ' 스폰된 보스 공격 = eDmg×' + C.BOSS_DMG, r.bossDmg, wantDmg(r.s)*C.BOSS_DMG, 1e-9);
    }
  });

  /* ── ⑤ 진행 — «훈련만» 캐릭터가 s60 에서 실제로 싸워 이긴다 ──────────────────
     ★ 이 게임에는 **기본 공격이 없다** — 피해는 전부 «장착 스킬» 에서 나온다(step 의 자동 발동 루프).
       그래서 sim112/131/168/177 이 쓰는 «훈련만» DPS 대용식 `atk × 공속 × 치명배수` 는
       «일반 등급 스킬 1개를 낀 상태» 를 뜻한다. 여기서 그 대용식이 실제와 얼마나 맞는지도 같이 잰다.
     sim177 [B] 가 s60 도달 Lv 을 236 으로 실측한다. 그 상태 + 일반 등급 스킬 1개(검기, Lv 0)만 주고
     **직접 때려서** 몹이 죽는지, 스테이지 진행(killed)이 실제로 도는지 본다. */
  const fight = await p.evaluate(async () => {
    S.lv.atk = 236; S.lv.hp = 236; S.lv.regen = 236; S.trainStage = 3;
    S.own = { slash: { n:0, l:0 } };                 /* 일반 등급(g0) 스킬 1개 · Lv 0 = 배수 축 하한 */
    S.eqSkill = ['slash']; S.eqPet = [];
    S.eqSlot = { weapon:null, shield:null, amulet:null };
    S.avatars = {}; S.coll = {}; S.rank = 0; markDirty();
    S.stage = 60; spawnStage();
    for(let i=0;i<240 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
    const k0 = killed, start = performance.now();
    /* 553 이전에 이 파일이 «시뮬의 대용식» 이라고 손으로 적어 두던 식. 이제 판정에는 안 쓰고
       (판정은 sim177 이 찍은 계수로 한다) **수리 전후 대조용 숫자**로만 남긴다. */
    const proxy = stat.dmg * stat.rate * stat.critMul;
    const real  = stat.dps;                               /* 실코드의 DPS */
    while(killed - k0 < 3 && performance.now() - start < 25000) await new Promise(r => requestAnimationFrame(r));
    return { killed: killed - k0, sec: (performance.now()-start)/1000, proxy, real,
             mul: bonus().atk, tb: 1 + TRAIN_BONUS*(trainStage()-1),
             mobHp: eHp(60)*ETYPE.zombie.hp, atk: stat.dmg, raw: U.atk.val(236),
             hp: stat.maxHp, alive: player.dead <= 0 };
  });
  /* bonus().atk 에는 «훈련 단계 보너스»(tb)가 이미 곱해져 있다 — 그것은 훈련 축이지 배수 축이 아니다.
     배수 축만 떼어 보려면 tb 로 나눠야 한다(여기서 안 나누면 «하한» 판정이 통째로 어긋난다). */
  yes('⑤ 배수 축이 하한이다 (bonus().atk ' + fight.mul.toFixed(3) + ' ÷ 단계보너스 ' + fight.tb.toFixed(2)
      + ' = ' + (fight.mul/fight.tb).toFixed(3) + ' ≤ 1.05) — «훈련만» 이 맞다', fight.mul/fight.tb <= 1.05);
  yes('⑤ s60 «훈련만» 캐릭터가 25초 안에 몹 3마리를 실제로 잡는다 ('
      + fight.killed + '마리 / ' + fight.sec.toFixed(1) + '초)', fight.killed >= 3);
  yes('⑤ s60 에서 죽지 않는다 (체력 ' + fight.hp.toExponential(2) + ' vs 적 공격 ' + wantDmg(60).toExponential(2) + ')', fight.alive);
  near('⑤ s60 훈련 공격력(배수 전) = 168 선형식 18+20×236', fight.raw, 18+20*236, 1e-12);
  near('⑤ s60 실제 피해 = 훈련값 × bonus().atk(단계보너스 포함) ' + fight.mul.toFixed(3),
       fight.atk, (18+20*236)*fight.mul, 1e-9);
  /* ── ⑤ 대용식 대조 (553 에서 갈아 끼움) ────────────────────────────────────
     옛 항목은 대용식 `stat.dmg × stat.rate × stat.critMul` 을 **이 파일에 손으로 적어** 두고
     실측과 비교했다. 그 식은 시뮬이 쓰는 식의 **네 번째 사본**이었고, 그래서 이 항목은
     «시뮬이 실코드를 따라가는가» 가 아니라 «내가 적어 둔 식이 실코드를 따라가는가» 를 재고 있었다.
     504(`SK_DPS_REF` 1.84 → 6.49)가 그 사본을 통째로 낡게 만들자 비가 **4.64** 로 튀었다
     (`probe553` 이 항등식 «비 = SK_DPS_REF ÷ aspd Lv0» 로 뿌리를 못박았다).
     ⇒ 553 은 사본을 없애고(`tools/dpsk.js` 한 곳) 이 항목을 **시뮬이 실제로 찍은 계수**로 잰다.
       시뮬이 다시 뒤처지면 여기서 곧바로 빨개진다 — 게이트가 자기 사본을 보던 시절에는 그럴 수 없었다.
     ⚠ 허용 폭(0.5~2.0)은 **한 칸도 안 넓혔다.** 그 위에 «항등»(±1%) 을 한 항 더 얹는다 —
       이제 둘은 같은 것을 모델하므로 자릿수가 아니라 값이 같아야 한다. */
  /* ⚑ 696 — 자식이 죽으면 이 자가 **스택 트레이스로 즉사**했다(execFileSync 는 종료 코드 ≠ 0 에
     throw 한다). 199 21회차가 `OFF_MAX_H` 를 걷어내자 sim177 이 죽었고, 그 순간 verify177 은
     «FAIL n건» 이 아니라 «Error: Command failed» 로 끝나 **무엇이 몇 개 빨간지조차 안 보였다.**
     653 의 반대 방향 위생 사고다(그쪽은 FAIL 을 내고도 종료 코드 0). ⇒ 자식의 죽음도 **한 항의
     빨강**으로 적는다 — 아래 세 항이 자식 출력에 의존하므로 자연히 같이 빨개진다. */
  let simOut = '';
  try {
    simOut = execFileSync(process.execPath, [path.join(__dirname, 'sim177.js')], { encoding:'utf8' });
  } catch (e) {
    simOut = String((e && e.stdout) || '');
    const why = String((e && e.stderr) || e && e.message || '').trim().split('\n')[0];
    yes('⑤ sim177 이 끝까지 돌았다 [죽음: ' + why.slice(0, 160) + ']', false);
  }
  const simK = parseFloat((simOut.match(/DPS 계수 ([\d.]+)/) || [])[1]);
  yes('⑤ sim177 이 찍은 «DPS 계수» 를 읽었다 (K = ' + simK + ')', Number.isFinite(simK));
  const simDps = fight.atk * simK;                 /* 시뮬이 이 표본에 예측하는 DPS */
  const ratio  = fight.real / simDps;
  yes('⑤ 시뮬 DPS 대용식이 실코드와 같은 자릿수다 — 시뮬 예측 ' + simDps.toExponential(2)
      + ' vs 실측 ' + fight.real.toExponential(2) + ' (비 ' + ratio.toFixed(2)
      + ', 0.5~2.0 이어야 sim177 의 «훈련만» 판정이 성립한다)',
      ratio >= 0.5 && ratio <= 2.0);
  near('⑤ 그리고 항등이다 — 시뮬 계수 K = SK_DPS_REF × 공속항 × 치명배수 (±1%)'
       + ' [553 이전 대용식이었으면 ' + (fight.real/fight.proxy).toFixed(2) + ']', ratio, 1, 1e-2);
  /* 553 되돌림 시험 — 옛 대용식(`ASPD0 × critMul`, 스킬 항 없음)을 심은 **사본**을 만들어
     같은 자를 대면 이 항목이 빨개지는지 본다. 안 빨개지면 위 두 항은 아무것도 안 지키는 것이다.
     ⚠ 살아 있는 sim177.js 를 고쳤다 되돌리지 않는다 — 사본을 tools/ 안에 만들어 돌리고 지운다
       (상대 require `./dpsk`·`./ecurve` 가 그대로 풀리려면 같은 디렉터리여야 한다). */
  const SIMNEG = path.join(__dirname, `.v553-simneg-${process.pid}.js`);
  let negRatio = null, negErr = '';
  try {
    const simSrc = fs.readFileSync(path.join(__dirname, 'sim177.js'), 'utf8');
    const negSrc = simSrc.replace('const DPS_K = DK.K;',
                                  'const DPS_K = DK.ASPD0 * DK.CRITMUL;   /* 553 음성 — 504 이전 대용식 */');
    if(negSrc === simSrc) negErr = 'sim177.js 에서 `const DPS_K = DK.K;` 를 못 찾았다';
    else {
      fs.writeFileSync(SIMNEG, negSrc);
      /* 199 4회차 — M1 1.020(r1 이관)부터 옛 대용식 사본은 sim177 자체가 FAIL(비관 4.64배)로
         **exit 1** 을 낸다. execFileSync 가 그때 stdout 을 버리고 던져 이 항이 «— Command failed»
         로 굳어 있었다(수리 전 커밋에서도 같은 실패 — 게이트 부패). 사본이 빨간 것 자체가 정상이니
         exit 코드와 무관하게 stdout 의 «DPS 계수» 를 읽는다. */
      let negOut = '';
      try { negOut = execFileSync(process.execPath, [SIMNEG], { encoding:'utf8' }); }
      catch(e){ negOut = String(e && e.stdout || ''); if(!negOut) throw e; }
      const negK = parseFloat((negOut.match(/DPS 계수 ([\d.]+)/) || [])[1]);
      negRatio = fight.real / (fight.atk * negK);
    }
  } catch(e){ negErr = String(e && e.message || e); }
  finally { try { fs.unlinkSync(SIMNEG); } catch(_){} }
  yes('⑤ [되돌림] 옛 대용식(스킬 항 없음) 사본에서는 이 항목이 빨개진다 (비 '
      + (negRatio === null ? '—' : negRatio.toFixed(2)) + ' — 0.5~2.0 밖이어야 한다)'
      + (negErr ? ' ⚠ ' + negErr : ''),
      negRatio !== null && (negRatio < 0.5 || negRatio > 2.0));
  yes('⑤ 실측 DPS 로도 s60 몹 처치가 2초 이하다 (' + (fight.mobHp/fight.real).toFixed(2) + '초)',
      fight.mobHp / fight.real <= 2);

  /* ── ⑥ 파급 ── */
  /* 285 — 페이지가 실제로 쓰는 `BOSS_SEC` 을 읽어 기대값을 만든다. 기대값 쪽 배수(C.PROMO_HP)는
     게이트 자기 상수라, 설치본이 딴 값으로 새면 여기서 빨개진다(항등식이 되지 않는다). */
  const ripple = await p.evaluate(() => { S.stage = 40; return { promoHp: eHp(S.stage)*BOSS_SEC, bsec: BOSS_SEC }; });
  eq('⑥ 보스전 제한 시간 BOSS_SEC = 15 (285 — 던전·승급전이 이 하나를 참조한다)', ripple.bsec, C.BOSS_SEC);
  near('⑥ 승급 수호자 체력 = eHp(s)×BOSS_SEC (새 곡선을 그대로 탄다)', ripple.promoHp, wantHp(40)*C.PROMO_HP, 1e-9);
  /* 275 — 이 항목이 지키려는 성질은 «승급 수호자 hp 가 eHp(s)×60 을 그대로 탄다» 하나뿐인데,
     옛 판정식은 같은 문장의 `T2 = ETYPE.promo` 표기까지 통째로 물고 있었다. 208(승급 보스 아틀라스
     교체)이 그 자리를 `ETYPE.promo = promoType(ri)` 로 갈아 끼우자 hp 식은 한 글자도 안 바뀌었는데
     빨개졌다 — LESSONS 138-1(«정규식에 이웃 요소를 끼워 넣으면 남의 작업이 내 게이트를 깬다») 재발.
     처방도 같다: 문장을 **먼저 떼어 내고** 성질별로 항목을 쪼갠다.
       ⑥a 문장 존재(스폰 자리가 사라지면 잡는다) · ⑥b s = S.stage · ⑥c hp = eHp(s)*60
     남의 표기(`= promoType(ri)`)는 이제 어느 항목도 안 본다. */
  const promoStmt = (src.match(/^[^\n]*const T2 = ETYPE\.promo[^\n]*$/m) || [''])[0];
  yes('⑥ 승급 수호자 스폰 문장이 살아 있다 (const T2 = ETYPE.promo …)', promoStmt !== '');
  yes('⑥ 승급 수호자 스테이지가 S.stage 다', /\bs = S\.stage\b/.test(promoStmt));
  yes('⑥ 승급 수호자 hp 식이 eHp(s)*BOSS_SEC 다 (285 — 60초/×60 의 «초당 배수 1.0» 을 옮긴 자리)',
      /\bhp = eHp\(s\)\*BOSS_SEC;/.test(promoStmt));

  /* ── ⑦ 경제 축 ── */
  const econ = await p.evaluate(() => ({ r: eGold(2)/eGold(1), g1: eGold(1), g80: eGold(80),
                                         knee: TRAIN_KNEE, cr: TRAIN_COST_R }));
  near('⑦ eGold 배율 1.175 불변', econ.r, 1.175, 1e-12);
  eq('⑦ eGold(1) = 4 불변', econ.g1, 4);
  eq('⑦ 112 비용 무릎 Lv 불변', econ.knee, 15);
  eq('⑦ 112 비용 배율 불변', econ.cr, 1.05);

  /* ── ⑧ 교차 — sim177 (실행은 ⑤ 에서 이미 했다 · 553) ── */
  yes('⑧ sim177 이 SIM177 PASS', /SIM177 PASS/.test(simOut));
  const after = simOut.split('after  — 177 설치본')[1] || '';
  const rows = {};
  [...after.matchAll(/^\s+(\d+) \|\s+([\d.e+-]+) \|\s+([\d.e+-]+) \|/gm)]
    .forEach(m => { if(!(m[1] in rows)) rows[m[1]] = { ratio: parseFloat(m[2]), mob: parseFloat(m[3]) }; });
  yes('⑧ sim177 [D] after 표에서 s20·s80 행을 읽었다', !!rows['20'] && !!rows['80']);
  if(rows['20'] && rows['80']){
    const cross = await p.evaluate(() => {
      const tb = st => 1 + TRAIN_BONUS*(st-1);
      const ZOM = 1;                                   /* sim177 의 기준선(zombie)과 같은 정의 */
      /* 517 — «레벨 → 단계» 는 나눗셈이 아니라 구간표 누적합의 역함수다(제품 함수를 쓴다) */
      const at = (lv, s) => U.atk.val(lv) * tb(trainStageFor(lv)) / (eHp(s)*ZOM);
      return { s20: at(78, 20), s80: at(308, 80) };    /* 도달 Lv 은 sim177 [B] 실측값 */
    });
    near('⑧ 실코드 s20 공격/적HP = sim177 [D] after 값', cross.s20, rows['20'].ratio, 5e-3);
    near('⑧ 실코드 s80 공격/적HP = sim177 [D] after 값', cross.s80, rows['80'].ratio, 5e-3);
    /* 199 4회차 — «비가 1 근처» 는 M1 1.010 시절 값이다(r1 이 1.020 으로 올려 s80 비 0.43 이
       설계값이 됐다 — 수리 전 커밋에서도 같은 실패). 이 항이 지키려던 성질은 «무릎 아래 무벽»
       이고, 그 실체는 시간 예산이다: 몹 처치 = eHp/(공격×DPS 계수) ≤ 1초 ⇔ 비×K ≥ 1. */
    yes('⑧ 무릎 아래는 «훈련만» 으로도 몹 1초 예산 안이다 (s20 ×' + (cross.s20*simK).toFixed(2)
        + ' · s80 ×' + (cross.s80*simK).toFixed(2) + ' ≥ 1) — 177 이 벽을 걷어냈다',
        cross.s20*simK >= 1 && cross.s80*simK >= 1);
  }

  /* ── ⑨ 음성 — 구 지수 곡선 사본을 **새로 열어서** 잰다 ─────────────────────
     LESSONS 191: 살아 있는 페이지에 값을 주입해 재면 «옛 것도 멀쩡» 이라는 거짓 초록이 난다. */
  const negSrc = src.replace(
    /const eHp   = s => 55 \* eScale\(s\);\nconst eDmg  = s => 6  \* Math\.pow\(eScale\(s\), ES_A\);/,
    'const eHp   = s => 55 * Math.pow(1.25, s-1);\nconst eDmg  = s => 6  * Math.pow(1.14, s-1);');
  yes('⑨ 음성 사본에 구 지수 곡선을 실제로 심었다', negSrc !== src);
  fs.writeFileSync(NEG, negSrc);
  const np = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  await np.goto('file://' + NEG, { waitUntil: 'load' });
  await np.waitForTimeout(900);
  const neg = await np.evaluate(async () => {
    S.stage = 40; spawnStage();
    for(let i=0;i<240 && enemies.length === 0;i++) await new Promise(r => requestAnimationFrame(r));
    const mob = enemies[0];
    return { hp1: eHp(1), dmg1: eDmg(1), hp40: eHp(40), dmg40: eDmg(40),
             mobMax: mob ? mob.max : null, mobMul: mob ? ETYPE[mob.tk].hp : null, gold: eGold(2)/eGold(1) };
  });
  await np.close();
  try { fs.unlinkSync(NEG); } catch (e) {}
  yes('⑨ N1 — 구 곡선에서도 s1 은 같다(55·6) : 이 항목만으로는 회귀를 못 잡는다는 증명', neg.hp1 === 55 && neg.dmg1 === 6);
  yes('⑨ N2 — 구 곡선 eHp(40) 는 새 기대값과 다르다 (' + neg.hp40.toExponential(3)
      + ' vs ' + wantHp(40).toExponential(3) + ')', Math.abs(neg.hp40 - wantHp(40)) > wantHp(40)*0.5);
  yes('⑨ N3 — 구 곡선 eDmg(40) 도 다르다 (' + neg.dmg40.toExponential(3)
      + ' vs ' + wantDmg(40).toExponential(3) + ')', Math.abs(neg.dmg40 - wantDmg(40)) > wantDmg(40)*0.5);
  yes('⑨ N4 — 구 곡선에서 **스폰된 몹 체력**도 새 기대값과 다르다 : ④ 가 표시가 아니라 개체를 본다는 증명',
      neg.mobMax !== null && Math.abs(neg.mobMax - wantHp(40)*neg.mobMul) > wantHp(40)*neg.mobMul*0.5);
  near('⑨ N5 — 그러나 eGold 는 구 곡선에서도 1.175 다 : ⑦ 은 «안 건드림» 을 재는 항목이라 음성에서 초록이 맞다',
       neg.gold, 1.175, 1e-12);

  R.push({ n: '콘솔·런타임 에러', got: errs.length + (errs.length ? ' :: ' + errs[0].slice(0,140) : ''), want: '0', pass: errs.length === 0 });
  await br.close();

  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nVERIFY177 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
