/* probe613 — 613·614 실동작 재현: 직접 지불 · 헤더 표시 · 구 세이브 pts 이관 · 회수 부재 */
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
(async () => {
  const b = await launch(chromium);   /* 931 — 폴백까지 사슬이 맡는다 */ const p = await b.newPage({ viewport:{width:540,height:1140} });
  const errs=[]; p.on('pageerror', e=>errs.push('PAGEERROR: '+e.message));
  p.on('console', m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text()); });
  await p.goto('file://'+process.cwd()+'/index.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const out = {};
    // [1] 직접 지불
    S.tstone = 10; S.temper = { alloc:{} };
    out.upOkAt10 = temperUpOk('atk');                       // cost 1 at lv0
    const ok1 = temperUp('atk');
    out.up1 = ok1 && temperLv('atk') === 1 && Math.floor(S.tstone) === 9;
    // [2] 부족이면 거절
    S.tstone = 0;
    out.upFailAt0 = !temperUp('hp') && temperLv('hp') === 0;
    // [3] 폐지 선언 부재
    out.deadGone = (typeof temperCharge === 'undefined') && (typeof temperReset === 'undefined')
      && (typeof temperResetOk === 'undefined') && (typeof temperSpent === 'undefined')
      && (typeof TEMPER_PT_COST === 'undefined') && (typeof TEMPER_RESET_DIA === 'undefined')
      && (typeof temperPts === 'undefined');
    // [4] UI — 탭 렌더
    S.tstone = 1234; openTrain(); setTrSub('temper'); renderTrain();
    const w = document.getElementById('trTemper');
    out.headTxt = (w.querySelector('.tp-hd .pv i')||{}).innerHTML || '';
    /* 688 — 헤더에서 한글 «단련석» 라벨이 사라졌다(주인 지시). 화폐는 아이콘이 말한다(125) */
    out.headHasCount = /cur-tstone/.test(out.headTxt) && /1,?234/.test(out.headTxt);
    out.noChargeBtn = !w.querySelector('.cg') && !w.querySelector('[data-tpchg]');
    out.noResetRow = !w.querySelector('.tp-ft') && !w.querySelector('[data-tpreset]');
    out.btnTxt = (w.querySelector('.tr-tp .tb i')||{}).innerHTML || '';
    out.btnNoPt = !/pt/.test(out.btnTxt) && /단련/.test(out.btnTxt) && /cur-tstone/.test(out.btnTxt);
    out.costHasIcon = /cur-tstone/.test((w.querySelector('.tr-tp .tc i')||{}).innerHTML||'');
    // [5] 레드닷 — 단련석 0 이면 꺼짐, 비용만큼 있으면 켜짐
    S.tstone = 0; out.alert0 = temperAlert() === false;
    S.tstone = 1; out.alert1 = temperAlert() === true;
    // [6] 구 세이브 pts 이관 — load() 직접(363 교훈: reload 금지)
    const seed = { tstone: 7, temper: { pts: 55, alloc: { atk: 3 } }, time: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(seed));
    load();
    out.mig = Math.floor(S.tstone) === 62 && temperLv('atk') === 3
      && !('pts' in S.temper);
    out.migVals = { tstone: S.tstone, atk: temperLv('atk'), hasPts: 'pts' in S.temper };
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('errors:', errs.slice(0,5));
  await b.close();
})();
