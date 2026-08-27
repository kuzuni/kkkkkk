/* 작업 83 — 메인 좌측 사이드 «도감» 아이콘 기능 게이트.  실행: node tools/verify83.js
   기하(행 그리드·잉크 bbox)는 tools/verifyA2.js + tools/scanA2.py 담당. 여기서는
   ① 클릭 → #collw.on ② 다른 팝업이 열려 있어도 걷고 연다 ③ 레드닷 = collReady 연동
   ④ 수령 후 레드닷 소멸 ⑤ 닫기 → 메인 복귀 를 실제 게임 데이터로 확인한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);

  /* [1] 아이콘 존재 + 클릭 → 21 팝업 */
  console.log('[1] 진입');
  ok(await p.$('#sideL .ibtn[data-pop="coll"]'), '#sideL 에 도감 칸이 있다');
  await p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').click());
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => $('collw').classList.contains('on')), '클릭 → #collw.on');

  /* [2] 닫기 → 메인 복귀 (팝업이 실제로 걷힌다) */
  await p.evaluate(() => closeColl21());
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => !$('collw').classList.contains('on')), '닫기 → #collw off');

  /* [3] 다른 팝업(축복)이 열린 채 클릭해도 걷고 연다 — gmPage 경로 */
  await p.evaluate(() => { openBless(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').click());
  await p.waitForTimeout(250);
  const st3 = await p.evaluate(() => ({ coll: $('collw').classList.contains('on'),
                                        panel: panelOpen }));
  ok(st3.coll, '축복 팝업이 열린 상태에서 클릭 → #collw.on');
  ok(!st3.panel, '패널은 닫힌 상태(gmCloseAll 경로)');
  await p.evaluate(() => closeColl21());

  /* [4] 레드닷 — 실제 데이터: 스킬 세트 하나를 «구성원 전원» 보유 → on, 수령(claimColl) → off

     ⚑ 232(2026-08-27) — 이 절은 죽은 키 모양 위에 서 있었다. 91·118 이 도감을 «부위/등급 세트»
     로 다시 키잉한 뒤 `COLL_SET` 의 키는 `skill:0`…`skill:5` · `equip:<슬롯>:<등급>` ·
     `pet:<등급>` · `relic:0~2` 인데, 게이트만 옛 **카테고리 이름**(`'skill'`)을 물고 있었다.
       - `collReady('skill')` → `COLL_SET['skill'] === undefined` → **원리적으로 항상 false**(빨강 2건).
       - 반대로 `['skill','equip','pet','relic'].some(collReady)` 는 네 이름이 전부 없는 키라
         **항상 false** → 부정이 항상 참 → «수령 후» 2건이 **아무것도 안 재면서 초록**이었다(헛초록).
     카테고리 단위 질의는 `collReady` 가 아니라 **`collCatReady(cat)`** 가 담당한다(index.html ~14127).
     설정도 같이 죽어 있었다. 다만 **원인은 PROGRESS 232 행이 적어 둔 «등급이 섞여» 가 아니다** —
     `SKILLS.slice(0,3)`(slash·shuri·stone)은 셋 다 g:0 으로 등급이 같다. 진짜 원인은 **개수**다:
     91 이후 세트 단계는 «보유 종 수 ≥ need» 가 아니라 **구성원 전원의 최저 Lv**(`collLv` = min)라
     `skill:0` = [slash, shuri, stone, **vigor**] 4종 중 vigor 를 안 켜면 min = 0 → `cap 0` → 영영 false 다.
     («need 3» 은 91 이 폐기한 옛 규칙이고, 옛 셋업의 3종은 그 규칙 시절의 잔재다.)
     → 세트 하나를 **그 세트의 구성원 전원**으로 채운다.
     세트 구성은 데이터에서 읽어 온다(종수·등급이 늘어도 이 파일을 다시 안 고치게 — LESSONS 91-4). */
  console.log('[4] 레드닷');
  const dot = () => p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').classList.contains('on'));
  const st4 = await p.evaluate(() => {
    Object.assign(S, DEF());
    const st = COLL_SETS.find(s => s.cat === 'skill');       /* 첫 스킬 세트(= 최저 등급) */
    if (!st) return null;
    st.it.forEach(id => { if (!S.own[id]) S.own[id] = { n: 0, l: 1 }; });
    uiDirty = true; renderUI();
    return { key: st.key, n: st.n, cnt: st.it.length, cap: collCap(st), step: collStep(st.key) };
  });
  await p.waitForTimeout(150);
  /* 키 모양이 또 바뀌면 여기가 **먼저** 빨개진다 — 232 가 겪은 «헛초록» 재발 방지용 앵커 */
  ok(!!st4 && (await p.evaluate(k => !!COLL_SET[k], st4.key)),
     '스킬 세트 키가 COLL_SET 에 실재한다 (' + (st4 ? st4.key : 'null') + ')');
  ok(!!st4 && st4.cap >= 1 && st4.step === 0,
     '세트 «' + (st4 ? st4.n : '?') + '» 구성원 ' + (st4 ? st4.cnt : 0) + '종 전원 Lv1 → cap '
     + (st4 ? st4.cap : 0) + ' / 받은 단계 ' + (st4 ? st4.step : -1));
  ok(await p.evaluate(k => collReady(k), st4.key), '세트 전원 보유 → collReady(' + st4.key + ')');
  ok(await p.evaluate(() => collCatReady('skill')), '카테고리 질의 → collCatReady(skill)');
  ok(await dot(), '레드닷 on');
  await p.evaluate(k => { claimColl(k); closeModal(); uiDirty = true; renderUI(); }, st4.key);
  await p.waitForTimeout(150);
  ok(await p.evaluate(k => !collReady(k), st4.key), '수령 후 그 세트는 더 이상 ready 아님');
  ok(await p.evaluate(() => !['skill','equip','pet','relic'].some(collCatReady)), '수령 후 남은 보너스 없음');
  ok(!(await dot()), '수령 후 레드닷 off');

  console.log('[5] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0 ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : ''));

  await b.close();
  console.log(`\nVERIFY83 ${pass}/${pass + fail}` + (fail ? ' — FAIL' : ''));
  process.exit(fail ? 1 : 0);
})();
