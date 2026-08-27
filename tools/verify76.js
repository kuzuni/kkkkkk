/* 작업 76 회귀 게이트 — 상점 소환 상자 4종(무기·방패·목걸이·스킬, «방어구» 명칭 폐기).
   실행: node tools/verify76.js   → 마지막 줄이 `VERIFY76 n/n PASS` 여야 한다.

   본다:
     §1 카드 4장 — 순서 무기→방패→목걸이→스킬 · 이름에 «방어구» 없음 · 목걸이 카드 색 테마 4번째 톤.
     §2 목걸이 10연 실동작 — 다이아 1,000 차감 · S.cnt.sumEquip +10 · S.sum.amulet.exp 증가 ·
        획득이 전부 목걸이 부위(EQUIPS slot==='amulet').
     §3 목걸이 무료 10연 2회 소진 — 2→1→0, 3번째는 «무료 소환 소진» 안내 + 상태 불변.
        (218 — 안내 자리는 149 이후 팝업이 아니라 `#fxl .fx-toast` 다. 아래 §3 주석 참조)
     §4 구 세이브 호환 — ⓐ freeSum 에 amulet 키 없음 → freeLeft 가 SHOP_FREE 폴백 + dailyCheck 가 채움
        ⓑ S.sum 에 amulet 없음 → load() 가 {lv:1,exp:0} 로 채움
        ⓒ 가이드 gv≤2 · idx≥6 → idx+1 이관, idx<6 은 그대로, gv=3 은 무이관, idx=20(완주) → GUIDE.length 클램프
           (154 로 미션이 21→20 개가 되면서 그 클램프값도 20 이다).
     §5 11 확률 정보 팝업 — openProbInfo('amulet') 가 열리고 목록이 목걸이 아이템만이다.
     §6 미션표 — idx5 «방패 1회 소환하기»(보상 = 목걸이 10연 1,000) · idx6 «목걸이 1회 소환하기»(ban:amulet) ·
        가이드 이동 gmShop('amulet') 이 목걸이 카드로 스크롤.
     §7 콘솔 에러 0 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* smoke.js 와 같은 폴백 — 번들 브라우저 버전이 어긋난 러너는 /opt/pw-browsers/chromium 을 쓴다 */
async function launchAny(){
  try { return await launch(chromium); }
  catch (e) {
    const fs = require('fs');
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean).find(x => { try { return fs.existsSync(x); } catch (_) { return false; } });
    if (!cand) throw e;
    return await launch(chromium, { executablePath: cand });
  }
}

(async () => {
  const b = await launchAny();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* ── §1 카드 4장 ─────────────────────────────────────────────── */
  /* 106(2026-08-26, 주인 지시) — 상자가 5장이 됐다(«동료 상자» 5번째 추가).
     76 이 못박은 것은 «앞 4장의 순서·이름·색» 이므로 그 4장만 그대로 단언하고,
     5번째는 «106 이 늘린 칸» 으로 따로 본다. 색 전부 다름 규칙은 5장 전체에 그대로 적용한다. */
  console.log('§1 상자 카드 — 앞 4장(76) + 동료 상자(106)');
  const cards = await p.evaluate(() => {
    openShopPage();
    return {
      boxes: SHOP_BOXES.map(x => ({ b: x.b, n: x.n, hd: x.hd })),
      dom: [...document.querySelectorAll('#shopList .shp-card .chd i')].map(i => i.textContent.trim()),
      hasArmorWord: document.getElementById('shopList').innerHTML.indexOf('방어구') >= 0
    };
  });
  ok(cards.boxes.slice(0, 4).map(x => x.b).join(',') === 'weapon,shield,amulet,skill',
    '앞 4장 순서 weapon→shield→amulet→skill (' + cards.boxes.map(x => x.b).join(',') + ')');
  ok(cards.dom.slice(0, 4).join(',') === '무기 상자,방패 상자,목걸이 상자,스킬 상자',
    '앞 4장 이름 (' + cards.dom.slice(0, 4).join(',') + ')');
  ok(!cards.hasArmorWord, '상점 DOM 에 «방어구» 문자열 없음');
  ok(new Set(cards.boxes.map(x => x.hd)).size === cards.boxes.length,
    '헤더 색 ' + cards.boxes.length + '종 전부 다름 (목걸이 = 4번째 톤 · 동료 = 5번째 톤)');
  ok(cards.boxes.length === 5 && cards.boxes[4].b === 'pet' && cards.dom[4] === '펫 상자',
    '106 — 5번째 «펫 상자»(173 개명) (' + cards.dom.join(',') + ')');

  /* ── §2 목걸이 10연 실동작 ───────────────────────────────────── */
  console.log('§2 목걸이 10연 — 차감·카운터·소환레벨·부위');
  const buy = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.guide.idx = GUIDE.length;                 /* 가이드 차단 없이 순수 소환만 본다 */
    S.dia = 5000;
    const own0 = JSON.parse(JSON.stringify(S.own));
    const a = { dia: S.dia, eq: S.cnt.sumEquip, exp: S.sum.amulet.exp + S.sum.amulet.lv * 1e6 };
    doSummon('amulet', 10);
    const gained = Object.keys(S.own).filter(id => !own0[id] || S.own[id].n !== own0[id].n || S.own[id].l !== own0[id].l);
    const allAmu = gained.length > 0 && gained.every(id => EQ[id] && EQ[id].slot === 'amulet');
    return { paid: a.dia - S.dia, got: S.cnt.sumEquip - a.eq,
             expUp: (S.sum.amulet.exp + S.sum.amulet.lv * 1e6) > a.exp, allAmu };
  });
  ok(buy.paid === 1000, `다이아 1,000 차감 (실제 ${buy.paid})`);
  ok(buy.got === 10, `S.cnt.sumEquip +10 (실제 +${buy.got})`);
  ok(buy.expUp, 'S.sum.amulet 소환 경험치 증가');
  ok(buy.allAmu, '획득 아이템 전부 목걸이 부위');

  /* ── §3 무료 10연 2회 소진 ───────────────────────────────────── */
  /* 218 (2026-08-27) — 소진 단언이 «모달» 을 보고 있어 굳어 있었다(22/23, `got` 이 빈 팝업).
     149(주인 지시)가 «부족·소진·잠김 같은 한 줄 안내는 팝업이 아니라 토스트» 로 뒤집은 뒤라
     `$('modal').classList.contains('on')` 은 원리적으로 항상 false 다 — 215(`verify123`)·
     214(`verify94`)·217(`verify116`) 과 같은 계열의 게이트 부패다.
     `tools/probe218.js` 로 실측해 «진짜 회귀» 를 먼저 배제했다: 소진 클릭은 지금도
     `#fxl .fx-toast` 에 «목걸이 무료 소환 소진 — 내일 충전» 을 띄우고 다이아·획득 수는 안 변한다.
     LESSONS 185-④ 대로 묻는 것(«소진되면 더 안 나가고 화면이 그 이유를 말하는가»)은 그대로 두고
     재는 자리만 `.modal` → `.fx-toast` 로 옮긴다.
       · 기대 문구를 리터럴로 박지 않는다(185-①) — 상자 이름은 `BANNERS.amulet.n` 에서 런타임 계산한다
         (173 이 «동료»→«펫» 으로 개명했듯 이름은 바뀐다. 횟수·획득 수도 `SHOP_FREE` 에서 센다).
       · 클릭과 판정을 가른다 — 토스트는 시간에 걸려 있다(760ms 퇴장 시작 · 1060ms 제거) → 300ms(185-⑥).
         probe218 실측: t=0~500ms 온전, t=700ms `out`, t=900ms 제거. 300ms 는 양쪽에 여유가 있다.
       · 소진 클릭 «전» 에 앞 회차의 토스트를 치운다 — `fxToast` 는 4장부터 드롭해서(`stack > 3`)
         쌓인 채로 재면 «안내 없음» 으로 오독한다.
       · «소진 안내는 팝업이 아니다» 를 같이 박는다 — 팝업으로 되돌아가면 그 자리에서 잡힌다. */
  console.log('§3 목걸이 무료 10연 — 2회 소진 후 차단');
  const free = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.guide.idx = GUIDE.length; S.dia = 0;
    closeModal && closeModal();
    renderShopPage();
    const seq = [freeLeft('amulet')];
    const eq0 = S.cnt.sumEquip;
    for (let k = 0; k < SHOP_FREE; k++) {        /* 무료 잔량을 0 까지 태운다 */
      closeModal && closeModal();
      /* 소환 때마다 renderShopPage() 가 innerHTML 재렌더 — 노드를 매번 다시 잡아야
         위임 리스너(#shopList)까지 버블이 산다(떼어진 노드 click 은 무음 무효) */
      document.querySelector('#shopList .shp-card:nth-child(3) [data-shfree]').click();
      seq.push(freeLeft('amulet'));
    }
    closeModal && closeModal();
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    const n = +document.querySelector('#shopList .shp-card:nth-child(3) [data-shfree]').dataset.shn;
    return { seq, eq0, name: BANNERS.amulet.n, free: SHOP_FREE, want: SHOP_FREE * n };
  });
  /* 소진(잔량 0) 상태에서 한 번 더 — 149 이후 안내는 토스트라 클릭과 판정을 갈라야 한다 */
  await p.evaluate(() => { document.querySelector('#shopList .shp-card:nth-child(3) [data-shfree]').click(); });
  await p.waitForTimeout(300);
  const blocked = await p.evaluate(() => ({
    left: freeLeft('amulet'), got: S.cnt.sumEquip, dia: S.dia,
    toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | '),
    modal: !!document.querySelector('.modal.on, #modal.on')
  }));
  const seq = [...free.seq, blocked.left].join(',');
  const wantSeq = [...Array(free.free + 1).keys()].map(i => free.free - i).concat(0).join(',');
  ok(seq === wantSeq, `무료 횟수 ${wantSeq.replace(/,/g, '→')} (실제 ${seq.replace(/,/g, '→')})`);
  ok(blocked.got - free.eq0 === free.want && blocked.dia === 0,
    `무료로 ${free.want}개 획득 · 다이아 0 유지 (획득 ${blocked.got - free.eq0})`);
  ok(blocked.toast.includes('무료 소환 소진') && blocked.toast.includes(free.name),
    `3번째는 «무료 소환 소진» 안내 (149 토스트 — «${free.name}» 명시) [${blocked.toast}]`);
  ok(!blocked.modal, '소진 안내는 팝업이 아니다 (149)');
  await p.evaluate(() => {
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    document.querySelectorAll('#modal.on, .modal.on').forEach(m => m.classList.remove('on'));
  });

  /* ── §4 구 세이브 호환 ───────────────────────────────────────── */
  console.log('§4 구 세이브(3상자 시절) 마이그레이션');
  const mig = await p.evaluate(() => {
    closeModal && closeModal(); gmCloseAll();
    const snap = JSON.stringify(S);
    const run = old => {                        /* localStorage 에 심고 load() 로 통과시킨다 */
      localStorage.setItem(KEY, JSON.stringify(old));
      load();
      const r = { free: freeLeft('amulet'), sum: S.sum.amulet && S.sum.amulet.lv === 1 && S.sum.amulet.exp === 0,
                  idx: S.guide.idx, gv: S.guide.gv, prog: S.guide.prog };
      return r;
    };
    const base = JSON.parse(snap);
    /* ⓐⓑ 3상자 시절: freeSum·sum 에 amulet 없음 + ⓒ gv2 에서 idx 7(«적 100마리» 자리) */
    const oldSave = JSON.parse(JSON.stringify(base));
    oldSave.daily.freeSum = { weapon: 1, shield: 2, skill: 0 };
    oldSave.sum = { skill: { lv: 3, exp: 2 }, weapon: { lv: 1, exp: 0 }, shield: { lv: 1, exp: 0 },
                    pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } };
    oldSave.guide = { idx: 7, prog: 55, gv: 2 };
    const r1 = run(oldSave);
    oldSave.guide = { idx: 5, prog: 3, gv: 2 };  const r2 = run(oldSave);
    oldSave.guide = { idx: 7, prog: 0, gv: 3 };  const r3 = run(oldSave);
    oldSave.guide = { idx: 20, prog: 0, gv: 2 }; const r4 = run(oldSave);
    Object.assign(S, JSON.parse(snap)); save();  /* 원상 복구 */
    return { r1, r2, r3, r4, glen: GUIDE.length, ver: GUIDE_V };
  });
  ok(mig.r1.free === 2 && mig.r1.sum, 'ⓐⓑ amulet 키 없음 → freeLeft 2(폴백) · S.sum.amulet {lv1,exp0}');
  /* 154 — 이관 후 gv 는 «그때의 최신 버전» 이다(3 고정이 아니다). 76 이 보는 것은 «idx 가 8 로
     밀렸는가 · 기준선이 미확정으로 돌아갔는가» 이므로 버전은 현재 GUIDE_V 와 대조한다. */
  ok(mig.r1.idx === 8 && mig.r1.prog === -1 && mig.r1.gv === mig.ver, `ⓒ gv2·idx7 → idx8 이관 + 기준선 -1 (실제 idx${mig.r1.idx}·gv${mig.r1.gv})`);
  ok(mig.r2.idx === 5, `ⓒ gv2·idx5(삽입점 앞) → 그대로 5 (실제 ${mig.r2.idx})`);
  ok(mig.r3.idx === 7, `ⓒ gv3 세이브는 무이관 (실제 ${mig.r3.idx})`);
  /* 154 — «출석 보상 받기» 삭제로 21 → 20. v2 완주 세이브는 +1(v3) 후 −1(v5) 로 20 = 새 GUIDE.length 다. */
  ok(mig.r4.idx === 20 && mig.glen === 20, `ⓒ 완주(20) → 20 = GUIDE.length 클램프 (실제 ${mig.r4.idx}/${mig.glen})`);

  /* ── §5 확률 정보 팝업 ───────────────────────────────────────── */
  console.log('§5 11 확률 정보 팝업 — 목걸이');
  const prb = await p.evaluate(() => {
    const mag = document.querySelector('#shopList .shp-card:nth-child(3) [data-shinfo]');
    mag && mag.click();
    const on = $('prbw').classList.contains('on');
    const names = [...document.querySelectorAll('#prbList .prb-row .nm i')].map(i => i.textContent);
    const amuNames = BANNERS.amulet.list.map(x => x.n);
    closeProbInfo();
    return { on, bank: prbBank, n: names.length, allAmu: names.length > 0 && names.every(x => amuNames.indexOf(x) >= 0) };
  });
  ok(prb.on && prb.bank === 'amulet', '카드 🔍 → #prbw 열림 · prbBank=amulet');
  ok(prb.allAmu, `확률 목록 ${prb.n}행 전부 목걸이 아이템`);

  /* ── §6 미션표 ───────────────────────────────────────────────── */
  console.log('§6 가이드 미션 — 방패 개명 · 목걸이 삽입 · 이동');
  const gm = await p.evaluate(() => {
    const d5 = typeof GUIDE[5].dia === 'function' ? GUIDE[5].dia() : GUIDE[5].dia;
    Object.assign(S, DEF());
    S.guide.idx = 6; S.guide.prog = -1; gmBase(GUIDE[6]);
    uiDirty = true; renderUI(); drawTuto();
    $('tuto').click();                          /* 미완 배너 → 목걸이 카드로 이동해야 한다 */
    const li = $('shopList');
    const c = li.children[2];
    const cr = c.getBoundingClientRect(), lr = li.getBoundingClientRect();
    return { n5: GUIDE[5].n, d5, n6: GUIDE[6].n, ban6: GUIDE[6].ban,
             shopOn: $('shopw').classList.contains('on'),
             inView: cr.top >= lr.top - 1 && cr.bottom <= lr.bottom + 1 };
  });
  ok(gm.n5 === '방패 1회 소환하기' && gm.d5 === 1000, `idx5 «${gm.n5}» 보상 ${gm.d5} = 목걸이 10연`);
  ok(gm.n6 === '목걸이 1회 소환하기' && gm.ban6 === 'amulet', `idx6 «${gm.n6}» ban:${gm.ban6}`);
  ok(gm.shopOn && gm.inView, '미완 배너 클릭 → 상점 열림 + 목걸이 카드 뷰 안');

  /* ── §7 콘솔 ─────────────────────────────────────────────────── */
  console.log('§7 콘솔');
  ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  /* 카드 4장 캡처 (지시 검증항목 — docs/review/76-r1-shop.png) */
  await p.evaluate(() => { Object.assign(S, DEF()); closeModal && closeModal(); openShopPage(); renderShopPage(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.resolve(__dirname, '../docs/review/76-r1-shop.png') });

  await b.close();
  const tot = pass + fail;
  console.log(`\nVERIFY76 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
