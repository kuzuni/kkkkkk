#!/usr/bin/env node
/* 93 19회차 — **점등 램프의 «자»**. (§4-17-8 1번 — «자 없이 상수를 올리지 마라»)
 *
 *   node probe93o.js
 *
 * r17 에서 두 사람이 램프를 **부분 일치**로 잡았는데 **길이만** 갈렸다:
 *   AR «램프 350ms» · 만휘도 − 첫도착 −151ms
 *   AS «램프 478ms» · 만휘도 − 첫도착 −10ms
 * 선언값은 `FX3_LIT_IN` **0.64s** 다. 셋이 다 다르다. 16회차가 0.44 → 0.64 로 올릴 때 겪은
 * «선언만 바꾸고 실측은 그대로» 가 재발하지 않으려면 **무엇을 재는 자인지부터** 갈라야 한다.
 *
 * 갈림의 정체는 «임계» 다. 램프는 `cubic-bezier(.25,.1,.25,1)` 라 앞뒤 꼬리가 눈에 안 보인다 —
 * 어디를 «시작·끝» 으로 보느냐에 따라 같은 640ms 가 350 도 되고 478 도 된다. 그래서 이 자는
 * **하나의 숫자를 내지 않고 임계별 표**를 낸다. 다음 회차부터 두 비평가의 수치는 이 표의
 * 어느 칸인지로 대조하면 된다.
 *
 * 화소가 아니라 **computed opacity** 로 잰다(probe93n 과 같은 이유 — 딤 위/아래가 섞이면
 * 16회차가 데인 자리로 다시 간다. 43 교훈 1).
 *
 * 판정
 *   [1] 램프가 실제로 걸린다(transition 이 접히지 않았다 — `.jz-badp` 함정).
 *   [2] **가시 램프(.10→.95)** 가 선언값의 50% 이상이다 — 이 아래면 «선언만 640» 이다.
 *   [3] **만휘도(.95) 가 첫 도착의 ±120ms 안**이다 — 「코인이 다가올수록 밝아진다」의 실측 조건.
 *       16회차가 0.64 를 고른 근거가 바로 이것이고, r17 두 사람이 −151·−10 으로 갈린 자리다.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

function launch(){
  const c = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'];
  for(const p of c){ try { if(p && fs.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  return chromium.launch();
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia;  fxDisp.dia = S.dia;  fxAcc.dia = 0;  fxHold.dia = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
  });
  await page.waitForTimeout(400);

  const tr = await page.evaluate(async () => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 보상 버튼을 못 찾았다' };
    const decl = (typeof FX3_LIT_IN === 'number') ? FX3_LIT_IN : null;
    const t0 = performance.now();
    b.click();
    const rows = [];
    const nf = () => new Promise(r => requestAnimationFrame(() => r()));
    let nMax = 0;
    while(performance.now() - t0 < 1800){
      const lits = [...document.querySelectorAll('#fxl .fx-lit')];
      /* 전이 «중간값» 이 필요하므로 여기서는 getComputedStyle 이 맞다(probe93n 은 반대로
         «목표값» 이 필요해 인라인 style 을 읽는다 — 재는 것이 다르면 자도 다르다). */
      const op = lits.map(p => parseFloat(getComputedStyle(p).opacity) || 0);
      const air = fxFlies.filter(f => f.ui).length;
      if(air > nMax) nMax = air;
      rows.push([+(performance.now() - t0).toFixed(1), air, op.length ? Math.min(...op) : -1,
                 op.length ? Math.max(...op) : -1, lits.length]);
      await nf();
    }
    return { rows, decl, nMax };
  });
  await browser.close();
  if(tr.err){ console.log('probe93o 실패: ' + tr.err); process.exit(1); }
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); process.exit(1); }

  const R = tr.rows, DECL = tr.decl;
  const lit = R.filter(r => r[4] > 0);
  if(!lit.length){ console.log('probe93o 실패: 복제판(.fx-lit)이 한 프레임도 안 떴다'); process.exit(1); }

  const tBirth = lit[0][0];                                  /* 복제판이 생긴 프레임 */
  /* 임계 교차 = «그 값 이상» 이 처음 찍힌 프레임을 앞 표본과 선형 보간한다(rAF 33~45ms 격자를
     그대로 쓰면 임계 하나가 한 프레임 = 40ms 씩 튄다). 최소 진폭을 쓴다 — 두 알약 중 «늦은 쪽»
     이 화면에서 램프의 끝으로 읽힌다. */
  const cross = (v) => {
    let prev = null;
    for(const r of lit){
      const o = r[2];
      if(o >= v){
        if(!prev) return r[0];
        const dt = r[0] - prev[0], dv = o - prev[2];
        return dv <= 0 ? r[0] : +(prev[0] + dt * (v - prev[2]) / dv).toFixed(1);
      }
      prev = r;
    }
    return null;
  };
  const TH = [.02, .10, .25, .50, .75, .90, .95, .98];
  const at = {}; TH.forEach(v => at[v] = cross(v));

  /* 첫 도착 = 공중 아이콘이 최대치에서 처음 줄어든 프레임 */
  let tArr0 = null;
  for(const r of R){ if(r[1] > 0 && r[1] < tr.nMax){ tArr0 = r[0]; break; } }

  const opMax = Math.max(...lit.map(r => r[2]));

  console.log(`93 점등 램프 자 (트리거 기준 ms · rAF 표본 ${R.length}개 · 선언 FX3_LIT_IN = ${DECL}s)`);
  console.log(`  · 복제판 생성 ${tBirth.toFixed(0)}ms · 첫 도착 ${tArr0 == null ? '—' : tArr0.toFixed(0)}ms · 공중 최대 ${tr.nMax}개`);
  console.log('  · 임계별 도달 시각 (트리거 기준 / 복제판 생성 기준)');
  TH.forEach(v => {
    const t = at[v];
    console.log(`      opacity ≥ ${v.toFixed(2)}  ${t == null ? '   —' : String(Math.round(t)).padStart(4)}ms   ${t == null ? '  —' : String(Math.round(t - tBirth)).padStart(4)}ms`);
  });
  const vis = (at[.95] != null && at[.10] != null) ? at[.95] - at[.10] : null;
  const full = (at[.98] != null && at[.02] != null) ? at[.98] - at[.02] : null;
  console.log(`  · **가시 램프(.10 → .95) = ${vis == null ? '—' : Math.round(vis)}ms** · 꼬리 포함(.02 → .98) = ${full == null ? '—' : Math.round(full)}ms · 선언 ${Math.round(DECL*1000)}ms`);
  const lead = (at[.95] != null && tArr0 != null) ? at[.95] - tArr0 : null;
  console.log(`  · 만휘도(.95) − 첫 도착 = ${lead == null ? '—' : (lead > 0 ? '+' : '') + Math.round(lead)}ms  (음수 = 코인보다 먼저 다 밝아졌다)`);

  let bad = 0;
  const chk = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name} — ${detail}`); if(!ok) bad++; };
  chk('[1] 램프가 접히지 않았다',
      lit.filter(r => r[2] > .02 && r[2] < .98).length >= 3 && opMax >= .98,
      `중간값 프레임 ${lit.filter(r => r[2] > .02 && r[2] < .98).length}개 (≥3) · 최대 진폭 ${opMax.toFixed(3)} (≥.98)`);
  chk('[2] 가시 램프가 선언값의 50% 이상',
      vis != null && vis >= DECL*1000*0.5,
      `${vis == null ? '—' : Math.round(vis)}ms / 선언 ${Math.round(DECL*1000)}ms = ${vis == null ? '—' : Math.round(vis/(DECL*10))}%  (≥50%)`);
  chk('[3] 만휘도가 첫 도착의 ±120ms 안',
      lead != null && Math.abs(lead) <= 120,
      `${lead == null ? '—' : (lead > 0 ? '+' : '') + Math.round(lead)}ms (|Δ| ≤ 120)`);

  console.log(bad ? `\nPROBE93O FAIL (${bad}건)` : '\nPROBE93O PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93o 실패:', e.message); process.exit(1); });
