#!/usr/bin/env node
/* 93 17회차 — **스포트라이트 두 절반의 «꺼지는 순간» 자**.
 *
 *   node probe93n.js
 *
 * 스포트라이트는 두 절반이다 — ① 딤 «위» 로 올라온 알약 복제판(`.fx-lit`) ② 형제 행 딤(`.fx-dim`).
 * r17 에서 두 사람이 독립으로 «한 스포트라이트가 두 번에 나눠 꺼진다» 를 잡았다(4명 2회차):
 *   AR #9  딤 해제 ~1250 vs 알약 소등 ~1450 = 200ms 어긋남
 *   AS #4  마지막 도착 1320 / 딤 해제 1250 / HUD ≥1600 = ≥350ms 로 3단
 *   15회차 AN ⓒ «행 스크림이 스프라이트 4개가 아직 비행 중일 때 220ms 먼저 풀린다»
 *
 * 화소가 아니라 **DOM 상태**로 잰다 — 「무엇이 언제 바뀌었나」를 묻는 것이고, 그 답은 클래스와
 * opacity 에 그대로 있다. 화소로 재면 딤 위/아래가 섞여 16회차가 데인 자리로 다시 간다
 * (probe93l 이 딤 «아래» 원본을 읽어 회귀를 통과시켰다 — 43 교훈 1).
 *
 * 판정 3가지
 *   [1] 형제 행 딤 해제가 **마지막 도착보다 앞서지 않는다**(AN·AR·AS 공통 지적).
 *   [2] 두 절반의 해제 간격 ≤ 60ms («한 번에 꺼진다»).
 *   [3] 마지막 도착 → 해제 시작 간격이 60~320ms («최종값을 읽을 시간» 은 있고 과잉은 아니다).
 *       하한 60 은 ⓑ(최종값이 소등 전에 찍힌다)를 지키기 위한 것이고, 상한 320 은 8회차
 *       비평가 Y ① «입자가 다 사라졌는데 형제 행이 계속 어둡다 — ≥249ms 과잉» 에서 왔다.
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
    const t0 = performance.now();
    b.click();
    const rows = [];
    const nf = () => new Promise(r => requestAnimationFrame(() => r()));
    while(performance.now() - t0 < 3200){
      const lits = [...document.querySelectorAll('#fxl .fx-lit')];
      /* 소등 «시작» = transition 이 걸리고 목표 opacity 가 0 이 된 순간. 인라인 style 로 읽는다
         (getComputedStyle 은 전이 «중간값» 을 주므로 시작 프레임을 못 집는다). */
      const off = lits.length ? lits.every(p => p.style.opacity === '0') : null;
      /* ⚠ 딤 «위» 에서 보이는 숫자는 원본(#goldN, 딤 아래)이 아니라 복제판이다 — 16회차b 가
         probe93l 에서 고친 것과 같은 자리(43 교훈 1). 여기서도 복제판을 읽는다. */
      const cn = lits.map(p => [...p.querySelectorAll('b')].map(x => x.textContent).join('|')).join('#');
      rows.push([+(performance.now() - t0).toFixed(1),
                 fxFlies.filter(f => f.ui).length,      /* 공중 아이콘 */
                 lits.length,                           /* 살아 있는 복제판 */
                 off === null ? -1 : (off ? 1 : 0),     /* 복제판 전원 소등 시작? */
                 document.querySelectorAll('#mbox .qs-r.fx-dim').length,   /* 아직 어두운 형제 행 */
                 cn]);                                  /* 복제판이 «보여 주고 있는» 숫자 */
      await nf();
    }
    return { rows };
  });
  await browser.close();
  if(tr.err){ console.log('probe93n 실패: ' + tr.err); process.exit(1); }
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,5).forEach(e => console.log('  ! ' + e)); process.exit(1); }

  const R = tr.rows;
  const first = (fn) => { for(const r of R) if(fn(r)) return r[0]; return null; };
  const last  = (fn) => { let v = null; for(const r of R) if(fn(r)) v = r[0]; return v; };

  const dimMax   = Math.max(...R.map(r => r[4]));
  const tArrive  = first(r => r[1] === 0 && r[0] > 200);      /* 마지막 도착(공중 0) */
  const tLitOff  = first(r => r[3] === 1);                    /* 알약 소등 시작 */
  const tDimOff  = dimMax > 0 ? first(r => r[4] === 0 && r[0] > 200) : null;   /* 형제 행 딤 해제 */
  const tLitGone = first(r => r[2] === 0 && r[0] > 200);
  /* 최종값 정착 = 복제판이 «마지막으로 숫자를 바꾼» 프레임(그 뒤로는 안 변한다).
     ⚠ 첫 판에서 이 자가 스스로 틀렸다 — 문자열을 «살아 있는 복제판 전부» 로 이어 붙였더니
        복제판이 하나 사라지는 것만으로 문자열이 바뀌어 «2492ms 에 정착» 이라는 허깨비가 났다
        (숫자는 그대로였다). 복제판이 **둘 다 살아 있는 구간**만 센다. */
  const maxLit = Math.max(...R.map(r => r[2]));
  const live = R.filter(r => r[2] === maxLit && r[5]);
  let tSettle = null, lastTxt = null;
  for(const r of live){ if(r[5] !== lastTxt){ lastTxt = r[5]; tSettle = r[0]; } }

  console.log('93 스포트라이트 두 절반 (트리거 기준 ms · rAF 표본 ' + R.length + '개)');
  console.log(`  · 어두워진 형제 행 최대 ${dimMax}개`);
  console.log(`  · 마지막 도착(공중 0)      ${tArrive}ms`);
  console.log(`  · ① 알약 소등 시작         ${tLitOff}ms`);
  console.log(`  · ② 형제 행 딤 해제        ${tDimOff}ms`);
  console.log(`  · 복제판 최종값 정착       ${tSettle}ms  («${lastTxt}»)`);
  console.log(`  · (복제판 DOM 제거          ${tLitGone}ms)`);

  let bad = 0;
  const chk = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name} — ${detail}`); if(!ok) bad++; };
  if(dimMax === 0){ console.log('  ✗ 형제 행 딤이 아예 안 걸렸다 — 이 자가 무력하다'); bad++; }
  else if(tArrive == null || tLitOff == null || tDimOff == null){
    console.log('  ✗ 세 시각 중 하나를 못 잡았다'); bad++;
  } else {
    const gap = Math.round(tDimOff - tLitOff), lead = Math.round(tDimOff - tArrive);
    chk('[1] 딤 해제가 마지막 도착보다 앞서지 않는다',
        tDimOff >= tArrive, `해제 ${Math.round(tDimOff)} − 도착 ${Math.round(tArrive)} = ${lead}ms (≥0)`);
    chk('[2] 두 절반이 한 번에 꺼진다',
        Math.abs(gap) <= 60, `|딤 해제 − 알약 소등| = ${Math.abs(gap)}ms (≤60)`);
    /* [3] 은 «도착» 이 아니라 **«최종값이 화면에 찍힌 시각»** 을 기준으로 재야 한다 —
       지키려는 것이 「최종값을 읽을 시간이 있는가」(ⓑ)이기 때문이다. 마지막 도착과 마지막
       롤링 스텝 사이에는 원래 한 스텝이 있다(두 비평가 모두 도착 1250 · 최종값 1320 으로 쟀다). */
    const exp = tSettle == null ? null : Math.round(tLitOff - tSettle);
    chk('[3] 최종값이 소등 전에 읽힌다 (ⓑ)',
        exp != null && exp >= 55, `최종값 정착 ${Math.round(tSettle)} → 소등 ${Math.round(tLitOff)} = ${exp}ms (≥55)`);
    chk('[4] 딤이 과하게 남지 않는다',
        lead <= 320, `도착 → 해제 ${lead}ms (≤320 — 8회차 비평가 Y ① «≥249ms 과잉»)`);
  }
  console.log(bad ? `\nPROBE93N FAIL (${bad}건)` : '\nPROBE93N PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('probe93n 실패:', e.message); process.exit(1); });
