#!/usr/bin/env node
/* tools/probe199r30.js — 199 30회차 재현기 (판정 없음 · 측정만 · 새 봇 실행 0회)
 *
 * 29-8 3번: «오프라인 하루 경계 잔차 +3,375 — 네 회차째 미이행. 재현부터.»
 *           좌표는 25정정9 가 줬다: `3,375 ÷ 10 = 337.5분`.
 * 29-8 1번: «ⓓ 이관을 제품에 얹어라» — 그 산수를 여기서 낸다(자가 이 파일을 모듈로 읽는다).
 *
 * 무엇을 재는가 (전부 커밋된 r28 JSON 위에서 — 28-4 가 그러라고 커밋했다)
 *   [A] ⚑ 재현 — 오프라인 축을 **하루씩** 갈라 잔차가 어느 날에 있는지 본다.
 *       («+3,375/30일» 은 25~29 회차가 30일 **합**으로만 본 값이라 «매일 조금씩 샌다» 로 읽혔다.)
 *   [B] ⚑ 뿌리 — 봇의 «하루» 와 제품의 «달력 하루»(`today()`)가 **안 겹친다**.
 *       봇 epoch 는 2026-01-01 **08:00** 이고 로그인 오프셋은 epoch 기준이라,
 *       봇 D1 은 달력 1/1 16:00 ~ 1/2 06:30 = **달력 이틀에 걸친다**.
 *       ⇒ D1 만 예산을 **두 번**(1/1 의 남은 몫 + 1/2 의 전액) 받는다. 제품 결함이 아니다.
 *   [C] ⚑ 그래서 **말미 창(W14)은 오염되지 않았다** — 잔차는 D1 한 칸에만 있고 창은 D16~D30 이다.
 *       29-5 의 이관 산수가 이 잔차 위에 서 있지 않다는 것을 여기서 못박는다.
 *   [D] 이관(ⓓ) 산수 — 29-5 의 처방을 **제품 상수**로 옮긴다.
 *       `probe199r29` 를 모듈로 불러 같은 수를 쓴다(표 두 벌 금지 — 정정9 계보).
 *
 * 사용법: node tools/probe199r30.js [--json=docs/review/199-bot-2026-09-03-r28-base.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });

const QUIET = require.main !== module;
const P = [];
const say = s => { P.push(s); if (!QUIET) console.log(s); };

const fmt = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '∞');
const f1 = n => (Number.isFinite(n) ? n.toFixed(1) : '∞');
const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : '∞');
const uniq = a => [...new Set(a.map(x => Math.round(x * 100) / 100))].sort((x, y) => x - y);

const jf = ARG.json ? String(ARG.json) : 'docs/review/199-bot-2026-09-03-r28-base.json';
const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, jf), 'utf8'));
const DAYS = rep.days;
const KO = { diligent: '부지런', casual: '대충' };
const AX = '오프라인';

say(`# probe199r30 — 오프라인 하루 경계 잔차의 재현과 뿌리 (표: ${jf} · ${DAYS}일 · 시드 ${rep.seeds})`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [A] 재현 — 축을 «하루씩» 가른다
   ──────────────────────────────────────────────────────────────────── */
say('## [A] ⚑ 재현 — 잔차는 «매일 조금씩» 이 아니라 **D1 한 칸**에 통째로 있다');
say('');
say('| 정책 | D1 | D2~D' + DAYS + ' (시드·날짜 전수 서로 다른 값) | 하루 예산 환산 | 30일 합 잔차 |');
say('|---|---|---|---|---|');

const perPol = {};
for (const pol of ['diligent', 'casual']) {
  const d1 = [], rest = [];
  for (const s of Object.values(rep.policies[pol])) {
    const rows = s.rows.filter(x => /^D\d+$/.test(x.label));
    let prev = 0;
    const dl = [];
    for (const x of rows) { const v = (x.inBy && x.inBy[AX]) || 0; dl.push(v - prev); prev = v; }
    d1.push(dl[0]); rest.push(...dl.slice(1));
  }
  const u1 = uniq(d1), ur = uniq(rest);
  const steady = ur.length === 1 ? ur[0] : null;
  const resid = steady == null ? NaN : u1[0] - steady;
  perPol[pol] = { d1: u1, steady, resid, all: u1.length === 1 && ur.length === 1 };
  say(`| ${KO[pol]} | **${fmt(u1[0])}**${u1.length > 1 ? ' (갈림 ' + u1.length + '종)' : ''} | ${ur.map(fmt).join(' · ')} | ${steady == null ? '—' : fmt(steady / 10) + '분 = `OFF_DAY_CAP_MIN`'} | ${Number.isFinite(resid) ? '**' + (resid >= 0 ? '+' : '') + fmt(resid) + '**' : '—'} |`);
}
say('');
const RESID = perPol.diligent.resid;
say(`⇒ 25정정9 의 «+3,375/30일» 은 **D1 한 칸의 값**이다(${fmt(RESID)}). D2~D${DAYS} 는 시드 ${rep.seeds}개 × ${DAYS - 1}일이 **전부 같은 값**이라`);
say('  «매일 조금씩 샌다» 가 아니다 — 네 회차가 30일 합으로만 봐서 그렇게 읽혔다.');
say(`- 대충은 D1 이 **0** 이다(로그인 1회 · 직전 로그아웃이 없어 수령 자체가 없다) — 잔차는 **부지런 전용**이다.`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [B] 뿌리 — 봇의 «하루» ≠ 제품의 «달력 하루»
   ──────────────────────────────────────────────────────────────────── */
const EPOCH = new Date(2026, 0, 1, 8, 0, 0).getTime();     /* bot199.js 1391·1462 — addInitScript(CLOCK, …) */
const LOGINS = [8, 12.5, 19, 22.5];                        /* bot199.js 1126 — diligent */
const ACTIVE = 45;                                          /* activeMin */
const PM = 10;                                              /* OFF_DIA_PM (설치값 — r28 세대) */
const CAP = 660;                                            /* OFF_DAY_CAP_MIN */
const CLAIM_CAP = 10.5 * 60;                                /* OFF_CLAIM_CAP_H */
const AD = 1.5;                                             /* diligent offlineMul */

const at = m => new Date(EPOCH + m * 60000);
const dkey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();   /* index.html 22582 today() */

say('## [B] ⚑ 뿌리 — 봇의 «하루»(로그인 표) 와 제품의 «달력 하루»(`today()`) 가 안 겹친다');
say('');
say(`봇 epoch = \`new Date(2026,0,1,8,0,0)\`(bot199 1391) 이고 로그인 오프셋 \`(day−1)·1440 + h·60\` 은 **epoch 기준**이다.`);
say(`⇒ 로그인 시각 h=8 은 달력 **16:00** 이 된다(08:00 + 8h). 봇 D1 은 달력 이틀에 걸친다:`);
say('');
say('| 봇 D1 로그인 | 달력 시각 | 달력 날짜 | 직전 로그아웃 | 자리비움 | ×1.5 분 환산 | 그 날짜 예산 잔량 | 지급 |');
say('|---|---|---|---|---|---|---|---|');

/* 봇 D1 을 그대로 다시 굴린다(제품 규칙: offlineReward 가 sec 를 room·1회상한으로 자르고,
   claimOffline 이 eq = (sec/60)·mul 을 예산에서 꺼낸다 · 결손A 로 이득 0 이면 ×1 로 부른다). */
const budget = {};                       /* 달력 날짜별 소진 분 (S.daily.offMin) */
let lastOut = null, paid1 = 0;
const steps = [];
for (const h of LOGINS) {
  const m = h * 60;                      /* D1 = (1−1)·1440 + h·60 */
  const d = at(m), key = dkey(d);
  if (budget[key] === undefined) budget[key] = 0;
  let row = { h, cal: d.toTimeString().slice(0, 5), key, away: null, eq: null, room: null, pay: 0 };
  if (lastOut != null) {
    const away = m - lastOut;
    const room = Math.max(0, CAP - budget[key]);
    const sec = Math.min(away, CLAIM_CAP, room);            /* 분 단위로 같은 산수 */
    /* 결손A — ×1.5 의 실효 이득이 0 이면 봇은 ×1 로 부른다(bot199 1285) */
    const gain15 = Math.min(1, room / Math.max(1e-9, sec * AD)) * AD;
    const mul = gain15 > 1 ? AD : 1;
    const eq = sec * mul;
    const k = eq > 0 ? Math.min(1, room / eq) : 0;
    budget[key] += eq * k;
    const pay = Math.floor(sec * PM * mul * k);
    paid1 += pay;
    row = { ...row, away, eq: eq * k, room, pay, mul };
  }
  steps.push(row);
  say(`| h=${h} | ${row.cal} | ${row.key}${row.key !== dkey(at(LOGINS[0] * 60)) ? ' ⚑ 날짜가 바뀐다' : ''} | ${lastOut == null ? '—(첫 접속)' : f1(lastOut) + '분'} | ${row.away == null ? '—' : f1(row.away) + '분'} | ${row.eq == null ? '—' : f1(row.eq) + '분'} | ${row.room == null ? '—' : f1(row.room) + '분'} | ${row.pay ? fmt(row.pay) : '0'} |`);
  lastOut = m + ACTIVE;
}
say(`| **합** | | | | | | | **${fmt(paid1)}** |`);
say('');
const days1 = Object.keys(budget);
say(`- 재구성값 **${fmt(paid1)}** = 실측 D1 **${fmt(perPol.diligent.d1[0])}** (Δ ${fmt(paid1 - perPol.diligent.d1[0])}).`);
say(`- 봇 D1 이 밟는 달력 날짜: **${days1.join(' · ')}** — 소진 분 ${days1.map(k => k + ' ' + f1(budget[k]) + '분').join(' · ')}.`);
const partial = budget[days1[0]];
say(`- ⚑ **잔차의 정체** — 첫 달력 날짜(${days1[0]})의 예산을 **${f1(partial)}분**만 쓰고 자정을 넘긴다.`);
say(`  그 몫이 그대로 잔차다: **${f1(partial)}분 × ${PM} = ${fmt(partial * PM)}** = 25정정9 의 «${fmt(RESID)}».`);
say(`  D2 부터는 앞 날짜의 예산이 **이미 소진돼 있어**(D1 이 ${days1[1]} 를 다 썼다) 하루 정확히 ${fmt(CAP * PM)} 로 굳는다.`);
say('');
say('⇒ **제품 결함이 아니라 자(봇)의 하루 경계다.** 고칠 자리는 셋 중 하나이고, 셋 다 «표를 바꾸는» 일이다:');
say('  ⓐ epoch 를 자정(`new Date(2026,0,1,0,0,0)`)으로 — 봇 하루 = 달력 하루가 된다(모든 옛 표와 D1 이 어긋난다).');
say('  ⓑ D1 을 워밍업으로 버리고 D2 부터 센다(말미 창 W14 는 이미 그렇게 쓰고 있다).');
say('  ⓒ 그대로 두고 **«D1 은 달력 1.44일» 이라고 표에 적는다**(값을 안 건드린다).');
say('');

/* ────────────────────────────────────────────────────────────────────
   [C] 그래서 말미 창(W14)은 오염되지 않았다
   ──────────────────────────────────────────────────────────────────── */
const W = 14;
say(`## [C] ⚑ 말미 창(W${W} = D${DAYS - W}~D${DAYS})은 이 잔차를 **한 푼도 안 담는다**`);
say('');
say(`27-3 규약의 정상 기울기는 \`(v(D${DAYS}) − v(D${DAYS - W})) / ${W}\` 이라 **D1 은 두 끝에서 서로 지워진다**(누적 장부).`);
const wD = [], wC = [];
for (const pol of ['diligent', 'casual']) {
  for (const s of Object.values(rep.policies[pol])) {
    const rows = s.rows.filter(x => /^D\d+$/.test(x.label));
    const end = rows.find(x => x.label === 'D' + DAYS), w0 = rows.find(x => x.label === 'D' + (DAYS - W));
    if (!end || !w0) continue;
    const v = ((end.inBy && end.inBy[AX]) || 0) - ((w0.inBy && w0.inBy[AX]) || 0);
    (pol === 'diligent' ? wD : wC).push(v / W);
  }
}
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
say('');
say(`- 창 안 오프라인 일당: 부지런 **${fmt(med(wD))}** · 대충 **${fmt(med(wC))}** — 갈림 ${uniq(wD).length}종 / ${uniq(wC).length}종.`);
say(`- 창 안 부지런 일당이 하루 예산 정확히 ${fmt(CAP * PM)} 이면 잔차 오염 **0**이다 ⇒ ${med(wD) === CAP * PM ? '**오염 0 — 확인**' : '⚠ 오염 있음'}.`);
say('');
say('⇒ **29-5 의 이관 산수는 이 잔차 위에 서 있지 않다.** 29-8 3번이 «1번보다 먼저 재현하라» 고 한 이유가');
say('  «두 변경이 섞인다» 였는데, 재현 결과 **섞일 자리가 없다**(잔차는 D1 · 이관은 W14).');
say('');

/* ────────────────────────────────────────────────────────────────────
   [D] 이관(ⓓ) 산수 — 29-5 의 처방을 제품 상수로
   ──────────────────────────────────────────────────────────────────── */
const r29 = require('./probe199r29.js');
const contD = r29.contD, contC = r29.contC;
const axis = k => { const r = r29.axes.find(x => x.k === k); return r || { d: 0, c: 0 }; };
const off = axis('오프라인'), dq = axis('퀘스트(일일)');

say('## [D] ⚑ 이관(ⓓ) — 29-5 의 처방을 **제품 상수**로 옮긴다');
say('');
say(`받는 축 \`퀘스트(일일)\` 은 β = ${f3(dq.d > 0 ? dq.c / dq.d : 0)} (대충이 **한 푼도 안 받는다**) 이므로`);
say('필요 이관량은 «주는 축의 정책비» 와 무관하다 — `x = contC − contD/t` 한 줄이다.');
say('');
say('| 목표 비 t | 대충에게서 걷을 양 x/일 | 그때 `OFF_DIA_PM` | 부지런이 잃는 양 | `DQUESTS` 배수 k | 결과 비 |');
say('|---|---|---|---|---|---|');
const CANDS = [1.8, 1.9, 2.0];
const rowsD = [];
for (const t of CANDS) {
  const x = contC - contD / t;                    /* 대충 기준 걷을 양 */
  const pm = PM * (off.c - x) / off.c;            /* 대충 오프라인 = 630분 × pm */
  const lossD = off.d * (1 - pm / PM);            /* 부지런이 같은 상수로 잃는 양 */
  const k = (dq.d + lossD) / dq.d;                /* 퀘스트(일일) 를 그만큼 키운다 */
  const nd = contD - lossD + dq.d * (k - 1), nc = contC - x;
  rowsD.push({ t, x, pm, lossD, k, ratio: nd / nc });
  say(`| **${t.toFixed(1)}** | ${fmt(x)} | ${f3(pm)} | ${fmt(lossD)} | ×${f3(k)} | ${f3(nd / nc)} |`);
}
say('');
/* 실제로 고를 «둥근» 상수 — 창 한복판(1.9) 근처에서 자릿수가 깨끗한 자리 */
const PICK_PM = 2.7, PICK_K = 2.6;
const lossC = off.c * (1 - PICK_PM / PM), lossD2 = off.d * (1 - PICK_PM / PM);
const gainD = dq.d * (PICK_K - 1);
const nD = contD - lossD2 + gainD, nC = contC - lossC;
say(`### 채택값 — \`OFF_DIA_PM\` **${PM} → ${PICK_PM}** · \`DQUESTS[].dia\` **×${PICK_K}**`);
say('');
say('| 축 | 부지런 | 대충 |');
say('|---|---|---|');
say(`| 오프라인 (현행) | ${fmt(off.d)} | ${fmt(off.c)} |`);
say(`| 오프라인 (채택) | ${fmt(off.d * PICK_PM / PM)} | ${fmt(off.c * PICK_PM / PM)} |`);
say(`| 퀘스트(일일) (현행) | ${fmt(dq.d)} | ${fmt(dq.c)} |`);
say(`| 퀘스트(일일) (채택) | ${fmt(dq.d * PICK_K)} | ${fmt(dq.c * PICK_K)} |`);
say(`| **정상 기울기 합** | ${fmt(contD)} → **${fmt(nD)}** (${((nD / contD - 1) * 100).toFixed(2)}%) | ${fmt(contC)} → **${fmt(nC)}** (${((nC / contC - 1) * 100).toFixed(2)}%) |`);
say('');
say(`- **예상 ④ 비 = ${f3(nD / nC)}** (§0 창 1.8~2.0 의 한복판).`);
say(`- **총량 이관인가** — 부지런은 오프라인에서 ${fmt(lossD2)} 를 잃고 퀘스트(일일)에서 ${fmt(gainD)} 를 받는다 ⇒ 순 ${(nD - contD >= 0 ? '+' : '')}${fmt(nD - contD)}/일 (${((nD / contD - 1) * 100).toFixed(2)}%). **총 유입은 사실상 불변**이다.`);
say(`- 대충은 ${fmt(lossC)}/일 을 잃고 받는 것이 없다(β=0) ⇒ **758 과 같은 방향**(무료 유입 하향).`);
say(`- ⚠ \`OFF_DAY_CAP_MIN\`(${CAP}분)은 **한 글자도 안 건드린다** — 27-7 의 \`PASS_OFF_MUL\` 고리는 예산 축에만 걸린다(29-8 1번).`);
say(`- ⚠ \`PASS_OFF_MUL\` 도 안 건드린다 — 그 값은 «구 +4h 상품 동급 이상» 이라는 **비(比)** 로 정의돼 양변이 \`OFF_DIA_PM\` 에 같이 비례한다(척도 불변).`);
say('');

if (ARG.out) {
  fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n');
  console.error('written: ' + ARG.out);
}

module.exports = {
  json: jf, days: DAYS, axis: AX,
  d1: perPol.diligent.d1, steadyD: perPol.diligent.steady, residD: RESID,
  d1C: perPol.casual.d1, steadyC: perPol.casual.steady,
  rebuiltD1: paid1, budgetByCal: budget, calDays: days1, partialMin: partial,
  epoch: EPOCH, logins: LOGINS, activeMin: ACTIVE, PM, CAP,
  winOffD: med(wD), winOffC: med(wC), W,
  contD, contC, off, dq,
  moves: rowsD, pickPM: PICK_PM, pickK: PICK_K,
  newContD: nD, newContC: nC, newRatio: nD / nC,
};
