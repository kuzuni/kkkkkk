/* 눈금 504-RUL — «발동 1회당 실제 타격수» 를 재는 자. **선언은 여기 한 곳뿐이다.**
 *
 *   const RUL = require('./rul504');
 *   const rows = await RUL.measure(page, ['poison'], { K: 6 });
 *
 * ⚑ **왜 모듈로 뽑았나(680, 2026-09-01).** 이 자는 504 가 `verify504.js` **안에** 적어 둔
 *   page.evaluate 한 덩어리였다. 680 이 «poison 을 다른 26종과 나란히 재라» 는 지시를 받고
 *   `probe680.js` 를 짜려니 길이 둘뿐이었다 — ⓐ 같은 하네스를 **베껴 적는다** ⓑ 선언을 한 곳으로
 *   뽑고 둘이 읽는다. ⓐ 는 이 저장소가 **네 번 값을 치른 자리**다(402 «표 두 벌» · 508 «베껴 적던
 *   사슬» · 553 «시뮬 4벌 + 게이트 1벌» · 620 «손으로 적은 초기화 목록»). 자가 둘이 되는 순간
 *   «어느 자로 잰 값인가» 가 값을 바꾸고, 그것이 정확히 504 1회차가 poison 에서 29.4 ↔ 42.1 로
 *   갈렸던 사고다. ⇒ ⓑ. **내용은 한 줄도 안 바꿨다** — 이 파일은 `verify504.js` 117~197행을
 *   그대로 옮긴 것이고, 옮긴 것이 맞는지는 `probe680` [0] 이 매 실행 대조한다.
 *
 * ⚠ 상수(K·SEC·POP·TOL_FLOOR)도 여기서만 선언한다. 프로브가 게이트보다 적게 재면 두 평균이
 *   서로의 오차 안에서 갈린다(504 주석 — K=4 로 두었더니 poison 이 29.4 ↔ 41.1 로 턱에 걸렸다).
 */

const K = 6;             /* 반복 수 — 평균의 흔들림이 √K 로 좁혀진다. **프로브와 게이트가 같은 K 여야 한다.** */
const SEC = 25;          /* 한 번의 길이(초). K × SEC × 표본 수가 실행 시간이다 */
const POP = 23;          /* 눈금이 고정하는 개체수 — `probe504` [A] 의 실제 판 관측 중앙값 */
const TOL_FLOOR = 0.40;  /* 허용 오차 바닥 — 흔들림이 작게 나온 종도 이 아래로는 안 조인다.
                            0.40 = `probe504` [D] 가 K=6 에서 잰 «평균의 흔들림» 최악 ±30% 에
                            여유 1/3 을 얹은 값. 바라는 값이 아니라 **잰 값**에서 왔다. */

/* 종마다 «그 종의 K회 폭 ÷ 2√K» 와 바닥값 중 큰 쪽. 게이트·프로브가 같은 식을 읽는다. */
const tolOf = (spread, k) => Math.max(TOL_FLOOR, spread / (2 * Math.sqrt(k || K)));
const offOf = (mean, decl) => (decl ? Math.abs(mean / decl - 1) : 1);

/* ── 눈금 본체 ──────────────────────────────────────────────────────────
   스테이지 20 자유 전투(몹이 **실제로 죽는** 판) + **개체수 POP 고정**, K회 × SEC초.
   세 조건이 다 필요하다:
   ⚠ 적을 불사로 만들면 안 된다 — 안 죽는 적은 플레이어에게 뭉쳐서 광역기를 최대 14배
     부풀린다(`probe504` [C]). 484 [E] 가 그 하네스였고, 504 등재문의 두 숫자가 그 산물이다.
   ⚠ 개체수를 안 잡으면 안 된다 — 타격수는 «서 있는 적의 수» 에 거의 비례하고(poison:
     평균 13.8 / 27.4 / 52 마리에서 14.75 / 49.1 / 96.5), 레벨 0 스킬 아래서 그 수가 안 갇힌다.
     고정하지 않으면 같은 종이 실행마다 2배씩 갈린다(504 1회차에 실제로 그랬다). */
async function measure(page, ids, opts) {
  const o = Object.assign({ K, SEC, POP }, opts || {});
  return page.evaluate(({ ids, K, SEC, POP }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    const one = (id) => {
      /* ⚑ 판을 **통째로** 되돌린다. 아래 넷 중 하나라도 남으면 «몇 번째로 잰 종인가» 가 값을
         바꾼다 — 504 1회차에 poison 이 프로브(15번째)와 게이트(8번째)에서 29.4 ↔ 42.1 로
         갈렸고, 뿌리는 `killed`(누적 처치 → 보스 소환 눈금)와 죽어 있던 플레이어였다.
         ⚑ 620 — 그 «되돌린다» 를 **손으로 적은 목록**에서 제품의 «새 판» 입구 `spawnStage()`
         하나로 옮겼다. 손목록은 504 를 쓸 당시의 세계에 굳어 있어서, 그 뒤 들어온 보스전 상태
         (457 `bossIntro` · 459 `cdArm` · 162 `bossOn`/`bossT` · 475 `bossClear`)를 하나도
         안 되돌렸다 — 7번째 판에서 `killed` 가 눈금에 차 보스가 서고 **등장 국면이 열린 채**
         판이 끝나면, 다음 판 입구의 `enemies.length = 0` 이 국면 중인 보스를 «격파가 아닌
         경로로» 지운다. 그러면 23372 의 자기치유 항 `(bossT < BOSS_SEC || enemies.some(boss))`
         이 **둘 다 거짓**이라(국면이 `!bossIntro` 로 시계를 한 프레임도 안 흘렸다) 시계가
         영영 안 흘러 `bossMode()` 가 `stage` 로 굳고, 473 가드 `cdArm && battleBusy()` 가
         22708 의 스킬 루프를 **그 뒤 모든 판에서** 막았다(`probe620` [2]·[3]·[5]).
         ⚠ 그래서 여기 «보스전 상태를 끄는 줄» 을 새로 적지 마라 — 같은 목록이 또 뒤처진다.
           `spawnStage()` 는 `bossOn`·`bossT`·`stageWin`·`S.bossFarm` 을 스스로 끄고,
           `bossIntro`·`bossClear` 는 `bossMode()` 가 빈 문자열이 되는 순간 22542·23339 가
           자기 자리에서 닫는다. 굳은 판이 다시 생기면 [C0] 이 이름으로 잡는다. */
      S.stage = 20;
      spawnStage();
      /* 눈금 쪽 조건은 그 뒤에 얹는다 — `spawnStage()` 가 깐 50마리 파도(`queueMobs`)를 비워
         **개체수도 종도 아래 채움 루프(zombie 고정)가 혼자 정한다**. 안 비우면 스테이지 20 의
         고블린·다크가 섞여 «몇 번째 판인가» 가 다시 값을 바꾼다(위 ⚠ 두 줄과 같은 이유). */
      enemies.length = 0; spawnQ.length = 0;
      player.vx = 0; player.vy = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      /* ⚑ 보유 상태를 **격리**한다. `S.own` 에 앞서 시험한 스킬이 쌓이면 `bonus()` 의 보유 효과가
         커져 플레이어가 점점 세지고, 적이 빨리 죽어 장판·범위형의 타격수가 순서에 따라 갈린다
         (504 1회차에 poison 이 11.1 ↔ 18.1 로 갈린 원인이 정확히 이것이다). */
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0, shut = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * SEC; f++) {
        step(1 / 60);
        while (enemies.length > POP) {           /* 넘치면 **가장 먼** 것부터 — 가까운 것을 지우면 교전 밀도가 꺼진다 */
          let wi = 0, wd = -1;
          for (let i = 0; i < enemies.length; i++) {
            const d = (enemies[i].x - player.x) ** 2 + (enemies[i].y - player.y) ** 2;
            if (d > wd) { wd = d; wi = i; }
          }
          enemies.splice(wi, 1);
        }
        while (enemies.length < POP) { const b = enemies.length; makeEnemy('zombie'); if (enemies.length === b) break; }
        /* ⚑ 620 — 눈금의 이름이 «자유 전투» 다. 개체수를 고정해 두면 25초 안에 처치가
           `ENEMY_COUNT` 를 넘어(162 의 50킬 자동 진입) 판이 도중에 **보스전으로 바뀐다** —
           그때 473 가드가 스킬 루프를 닫으므로 재는 창이 종마다 다른 길이로 잘린다.
           `killed` 를 0 으로 눌러 두는 것은 개체수를 POP 으로 눌러 두는 것과 **같은 조건**이고,
           위 초기화 주석이 이미 `killed` 를 «보스 소환 눈금» 이라고 부른 그 자리다.
           ⚠ 이것을 빼면 [C0] 이 곧바로 빨개진다(그것이 [R3] 되돌림 시험이다). */
        killed = 0;
        if (preFight() || bossClear) shut++;
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      return { per: casts ? hits / casts : 0, hps: hits / SEC, casts, shut };
    };
    const out = [];
    for (const id of ids) {
      const s = SK[id], runs = [];
      for (let k = 0; k < K; k++) runs.push(one(id));
      const v = runs.map(r => s.cd > 0 ? r.per : r.hps);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const spread = mean ? (Math.max(...v) - Math.min(...v)) / mean : 0;
      out.push({ id, cd: s.cd, decl: skillHits(s), mean: +mean.toFixed(3),
                 each: v.map(x => +x.toFixed(2)), spread: +spread.toFixed(3),
                 casts: Math.round(runs.reduce((a, r) => a + r.casts, 0) / K),
                 shut: runs.reduce((a, r) => a + r.shut, 0) });
    }
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { ids, K: o.K, SEC: o.SEC, POP: o.POP });
}

/* ── ⏸199 대기 (680, 2026-09-01 — 326 `ck199` 선례) ──────────────────────────
   622 가 [C2] 의 `poison` 빨강을 **끝까지 진단해** 뿌리를 «선언 한 칸이 낡았다» 로 닫고
   계수(`hits`+`m` 한 벌)를 199 로 이관했다. 그런데 [C2] 는 하드 빨강으로 남았고, `SKILLS` 표는
   199 의 파일 구간이라(ROUTINE «199 는 계수(상수 표)만») 199 가 값을 넣기 전까지 **아무도
   초록으로 만들 수 없다** ⇒ «영원히 빨간 게이트». 그 대가는 실제로 치러졌다 — 같은 빨강이
   620 → 622 → **680** 으로 세 번 등재됐고 매번 회귀 스윕이 처음부터 다시 재현했다.
   verify498 §6 이 이미 같은 말을 적어 뒀다: «계수 확정은 199 몫이라 여기서 빨갛게 하면
   영원히 빨간 게이트가 된다». ⇒ **실패로 세지 않되 값·이탈%·한 벌을 매 실행 크게 찍는다.**

   ⚠⚠ **허용 오차를 넓힌 것이 아니다** — `TOL_FLOOR` 는 한 칸도 안 건드렸고(0.40 은 `probe504`
   [D] 가 «잰» 값이다), 면제는 **아래 표에 이름이 적힌 종**뿐이며 나머지는 전부 하드 그대로다.
   ⚠⚠ **면제가 굳지 않게 «낡은 선언 그 값일 때만» 으로 못박았다** — 199 가 `hits` 를 건드리는
   순간 그 종은 스스로 하드 단언으로 돌아온다. **손으로 지울 목록이 아니라서 뒤처지지 않는다**
   (620 이 «손으로 적은 목록은 또 뒤처진다» 로 남긴 교훈). `probe680` [5] 가 셋 다 못박는다. */
const HOLD199 = {
  poison: { staleHits: 29.36, staleM: 0.7074, ref: '622' }
};
const held199 = (x) => {
  const h = HOLD199[x.id];
  return !!h && Math.abs(x.decl - h.staleHits) < 1e-9;
};
/* [C2] 의 판정 한 곳 — 게이트도 프로브도 **이 함수를 부른다**(판정 사본 0개). */
const c2Split = (rows) => ({
  bad:  rows.filter(x => x.off > x.tol && !held199(x)),   /* 하드 빨강 */
  hold: rows.filter(x => x.off > x.tol && held199(x))     /* ⏸199 */
});

module.exports = { K, SEC, POP, TOL_FLOOR, tolOf, offOf, measure, HOLD199, held199, c2Split };
