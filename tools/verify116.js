#!/usr/bin/env node
/* 116 검증 — 13 재화 상점의 다이아 상품 5종 + 마일리지 교환 다이아
 *
 *   node tools/verify116.js
 *
 * ⚑ **497(2026-08-31, 주인 확정)이 116 의 «÷2» 를 되돌렸다 — 이 게이트의 [A]·[B]·[D]·[E] 기대값을
 *   그 결정으로 갈아 끼웠다**(295 가 149 를, 402 가 verify125 H2 를 갈아 끼운 것과 같은 자리다:
 *   두 지시가 정면으로 부딪히면 **나중 지시가 옳은 쪽**이고, 게이트는 자리를 비우지 않고 이사한다).
 *   116 이 지키려던 나머지(가격·쿠폰·MILE_NEED 불변 · 라벨이 값에서 파생 · 우편 경유 지급 ·
 *   구 세이브 무변경 · 넘침 0)는 **한 항도 안 지웠고 허용 오차도 안 넓혔다.**
 *   «÷2 로 되돌아가면 빨개진다» 는 A5 가 그대로 맡는다(방향만 뒤집혔다).
 *
 * 지시서(PROGRESS 116 «검증 [3]-(가)») 가 요구한 항목 그대로. [3]-(가) 기계적 작업이므로 비평가는 띄우지 않는다.
 *   [A] 상수 — `DIA_PACKS.map(p=>p.dia)` = 10,000 / 70,000 / 150,000 / 900,000 / 2,000,000 · `MILE_DIA` = 5,000,000
 *       116 값(5000·35000·75000·450000·1000000·2500000)·옛 라벨(«×1만»류) 소스 스캔 부재
 *   [B] 라벨 — 카드 수량 문자열이 **150 규약(다이아 = 숫자 그대로 · 1000 이상 쉼표)** 과 일치.
 *       라벨은 손으로 적은 문자열이 아니라 `fmt(dia)` 파생이어야 한다(값·라벨 동시 이동 보장)
 *   [C] 폭 — 13 재화 탭 실캡처에서 라벨이 카드 안쪽(`.bg` 264px)을 넘치는 칸 0 ·
 *       자릿수가 칸마다 다른 것은 150 이후 **정상**이므로 «폭» 이 아니라 **타입 크기·우변 정렬**을 잰다
 *   [D] 구매 — 헤드리스 `devBuyDia(id)` 5종의 `S.dia` 증가분 = 새 값 · 쿠폰(cp) 지급 = 0/0/0/1/2
 *   [E] 교환 — 쿠폰 10개로 `mileageExchange()` → 다이아 **+5,000,000** · 쿠폰 −10 · 부족하면 false(Δ0) ·
 *       결과 안내는 149 이후 **팝업이 아니라 토스트**(`#fxl .fx-toast`)다
 *   [F] 44 회귀 — 가격 `won`(1,000/5,000/11,000/55,000/110,000)·`MILE_NEED`=10 불변 ·
 *       카드 [구매] 클릭 · 쿠폰 10 미만이면 교환 버튼에 `#cnExch` 자체가 없음
 *       ⚠ **589(2026-08-31) 이관** — F4 가 재던 «클릭 → «결제 준비 중» 팝업만» 은 주인 지시
 *       («클릭시 걍 결제된거로 쳐주기»)로 폐기됐다. 116 이 이 자리에서 소유한 성질은 «클릭이
 *       지갑을 직접 안 건드린다»(= 즉시 지급 0) 였고 **그건 그대로 참**이다 — 지급이 우편으로
 *       가기 때문이다(153). 그래서 «Δ지갑 0» 은 남기고 문구만 새 진실로 갈아 끼운다.
 *   [G] 구 세이브 — 이미 받은 다이아는 안 건드린다(마이그레이션 없음). 44 교훈 1 대로 `addInitScript` 로 심는다
 *   [H] 콘솔 에러 0건 · 화면 텍스트에 NaN/undefined 0건
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* 497(2026-08-31, 주인 확정) — 116 의 «÷2» 를 되돌린 값. 기대값은 페이지의 상수를 다시 읽지 않고
   게이트가 자기 표로 들고 있는다(LESSONS 212-①: 화면이 쓴 식이 아니라 화면이 써야 할 근거에서). */
const DIA = [10000, 70000, 150000, 900000, 2000000];
const MILE = 5000000;
const WON = [1000, 5000, 11000, 55000, 110000];
const CP = [0, 0, 0, 1, 2];
/* 217 (2026-08-27) — 라벨 기대값이 111 알파벳 단위(«×5.00A»…)에 굳어 있었다. 150(주인 지시)이
   «골드 빼고 나머지 숫자는 A B C 안 쓰고 숫자 그대로» 로 표기층을 가른 뒤라 다이아는 `fmt` =
   쉼표 숫자가 맞다 — **게임이 옳고 게이트가 111 시절에 멈춰 있었다**(212 `verify112` 와 같은 계열).
   기대값은 화면이 쓴 식(`fmt(p.dia)`)을 다시 부르지 않고 **게이트가 자기 상수(DIA)에서 직접
   만든다** — 페이지의 `fmt` 를 부르면 표기층이 망가져도 기대값이 같이 틀려 초록으로 샌다
   (LESSONS 212-①: 기대값은 «화면이 쓴 식» 이 아니라 «화면이 써야 할 근거 데이터» 에서). */
const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LAB = DIA.map(d => '×' + comma(d));       /* ×5,000 ×35,000 ×75,000 ×450,000 ×1,000,000 */
const LAB111 = ['×10.0A', '×70.0A', '×150A', '×900A', '×2.00B'];  /* 옛 111 알파벳 규약 — 되돌림 감지용 */
const DIA116 = [5000, 35000, 75000, 450000, 1000000];   /* 116 «÷2» 값 — 되돌아가면 A5 가 잡는다 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const openCoin = async page => page.evaluate(() => {
  openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCoinPage === 'function');
  await page.waitForTimeout(400);

  /* ---- [A] 상수 ---- */
  const A = await page.evaluate(() => ({
    dia: DIA_PACKS.map(p => p.dia), won: DIA_PACKS.map(p => p.won), cp: DIA_PACKS.map(p => p.cp),
    ids: DIA_PACKS.map(p => p.id), mile: MILE_DIA, need: MILE_NEED,
  }));
  ok(JSON.stringify(A.dia) === JSON.stringify(DIA), 'A1 DIA_PACKS.dia = ' + DIA.map(comma).join('/') + ' (497 «×2»)', A.dia.join('·'));
  ok(A.mile === MILE, 'A2 MILE_DIA = ' + comma(MILE) + ' (497 «×2»)', String(A.mile));
  ok(A.need === 10, 'A3 MILE_NEED = 10 유지(지시 ③)', String(A.need));
  ok(JSON.stringify(A.ids) === JSON.stringify(['d1', 'd2', 'd3', 'd4', 'd5']), 'A4 상품 id 5종 유지', A.ids.join('·'));
  /* 옛 값의 «부재» 는 런타임으로는 못 본다 — 소스 스캔이다(LESSONS 111-1 ⓐ) */
  /* 497 — 방향이 뒤집혔다. 이제 «되돌아가면 안 되는 값» 은 116 의 절반 값이다. */
  const oldLit = [/dia:\s*5000\b/, /dia:\s*35000\b/, /dia:\s*75000\b/, /dia:\s*450000\b/, /dia:\s*1000000\b/,
    /MILE_DIA\s*=\s*2500000/];
  ok(oldLit.every(r => !r.test(SRC)), 'A5 116 «÷2» 리터럴(5천·3.5만·7.5만·45만·100만·250만) 부재(소스 스캔)',
     oldLit.filter(r => r.test(SRC)).map(String).join(' ') || '0건');
  const oldLab = /q:\s*'×(1만|7만|15만|90만|200만)'/;
  ok(!oldLab.test(SRC), 'A6 옛 수량 라벨 문자열(«×1만»류) 부재(소스 스캔)');

  /* ---- [B] 라벨 — 값에서 파생되는가 ---- */
  const B = await page.evaluate(() => ({
    q: DIA_PACKS.map(p => p.q),
    derived: DIA_PACKS.every(p => p.q === '×' + fmt(p.dia)),
    name: diaPackName(DIA_PACKS[0]),
    /* 217 — «이 다섯 값에서 두 규약이 실제로 갈리는가». 갈리지 않는 크기(1000 미만)에서 재면
       «골드 규약으로 되돌아간 회귀» 를 빨간 게 아니라 초록으로 통과시킨다(LESSONS 212-②). */
    split: DIA_PACKS.map(p => fmtG(p.dia) !== fmt(p.dia)),
  }));
  ok(JSON.stringify(B.q) === JSON.stringify(LAB), 'B1 라벨 = ' + LAB.join('/') + ' (150 규약)', B.q.join(' '));
  ok(B.split.every(Boolean), 'B1-1 다섯 값 전부에서 골드 규약(fmtG)과 기본 규약(fmt)이 갈린다 — 단언이 유효한 크기',
     B.split.map(v => v ? 'o' : 'x').join(''));
  ok(B.q.every((s, i) => s !== LAB111[i]), 'B1-2 옛 111 알파벳 단위 라벨(«×5.00A»류)로 되돌아가지 않았다',
     B.q.filter((s, i) => s === LAB111[i]).join(' ') || '0건');
  ok(B.derived, 'B2 라벨은 손으로 적은 문자열이 아니라 fmt(dia) 파생');
  ok(B.name === '다이아 ' + comma(DIA[0]) + '개', 'B3 구매 팝업 상품명도 같은 표기', B.name);

  /* ---- [C] 폭 — 실제 카드에서 안쪽(.bg 264px) 넘침 0 ---- */
  await openCoin(page);
  await page.waitForTimeout(200);
  if (page.settle291) await page.settle291();   /* 921 — 여는 동작 뒤 <250ms 대기라 291 훅이 구조적으로 안 돈다(915 선례) */
  const C = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#shopList .cn-cd.dia').forEach(cd => {
      const q = cd.querySelector('.qt'), bg = cd.querySelector('.bg');
      const qr = q.getBoundingClientRect(), br = bg.getBoundingClientRect();
      out.push({ t: q.textContent, w: +qr.width.toFixed(1),
        l: +(qr.left - br.left).toFixed(1), r: +(br.right - qr.right).toFixed(1),
        fs: +parseFloat(getComputedStyle(q).fontSize).toFixed(2),
        inline: (q.getAttribute('style') || '').includes('font-size') });
    });
    return out;
  });
  ok(C.length === 5, 'C1 다이아 카드 5칸 렌더', String(C.length));
  ok(JSON.stringify(C.map(c => c.t)) === JSON.stringify(LAB), 'C2 카드 DOM 라벨 문자열 일치', C.map(c => c.t).join(' '));
  const over = C.filter(c => c.l < 0 || c.r < 0);
  ok(over.length === 0, 'C3 라벨 카드 안쪽 넘침 0칸',
     over.length ? over.map(c => c.t + ' l' + c.l + '/r' + c.r).join(', ')
                 : 'left ' + Math.min(...C.map(c => c.l)).toFixed(1) + '~ · width ' + C.map(c => c.w).join('/'));
  /* 217 — 옛 C4 는 «다섯 칸 렌더 폭 편차 ≤ 6px» 였다. 111 규약에서는 다섯 라벨이 전부 6자
     («×5.00A»…«×1.00B»)라 폭이 같아야 맞았지만, 150 이후 라벨은 «×5,000»(6자)~«×1,000,000»(10자)로
     **자릿수가 칸마다 다른 것이 정상**이라 폭 편차 84.5px 는 결함이 아니라 설계다 — 전제가 죽은 단언이다.
     LESSONS 185-④ 대로 지우지 않고, 이 자리가 원래 지키려던 것(«다섯 칸이 제각각 튀지 않는다»)을
     150 에서도 살아 있는 축으로 이사시킨다: 폭은 자릿수를 따라가되 **타입 크기와 우변 정렬**은 같아야 한다.
       · C4 타입 크기 — fitNum(150)이 한 칸만 눌러 넣으면 여기가 빨개진다(현재는 다섯 칸 다 클램프 없음).
       · C5 우변 정렬 — `.qt` 는 우변 고정으로 왼쪽으로 자라므로, 자릿수가 달라도 우측 여백은 같다. */
  const fss = C.map(c => c.fs), fsDev = Math.max(...fss) - Math.min(...fss);
  ok(fsDev <= 0.5 && !C.some(c => c.inline), 'C4 라벨 타입 크기 다섯 칸 동일(편차 ≤ 0.5px) · fitNum 인라인 클램프 0칸',
     fss.join('/') + 'px · 클램프 ' + C.filter(c => c.inline).length + '칸');
  const rs = C.map(c => c.r), rDev = Math.max(...rs) - Math.min(...rs);
  ok(rDev <= 1, 'C5 라벨 우변 정렬 유지 — 카드 안쪽 우측 여백 편차 ≤ 1px', 'r ' + rs.join('/') + ' · Δ' + rDev.toFixed(1) + 'px');

  /* ---- [D] 구매 지급 ---- */
  /* 153 은 지급 «경로» 를 우편으로 옮겼고, **697(2026-09-02)이 그것을 되돌렸다** — 구매가 곧
     지급이다. 116 이 지키려는 것은 내내 «수량» 이라 재는 자리만 «수령 뒤» 에서 «구매 직후» 로
     옮겼다. 경로 자체(새 우편 0)는 VERIFY697·VERIFY153 이 본다. */
  const D = await page.evaluate(ids => ids.map(id => {
    const d0 = S.dia, m0 = S.mileage || 0, p0 = S.cnt.paid || 0, n0 = (S.mailx || []).length;
    devBuyDia(id);
    const dMail = S.mailx.length - n0;
    return { id, dDia: S.dia - d0, dCp: (S.mileage || 0) - m0, dPaid: (S.cnt.paid || 0) - p0, dMail };
  }), ['d1', 'd2', 'd3', 'd4', 'd5']);
  D.forEach((r, i) => ok(r.dDia === DIA[i], 'D' + (i + 1) + ' ' + r.id + ' 구매 그 틱에 S.dia +' + DIA[i], '+' + r.dDia));
  ok(JSON.stringify(D.map(r => r.dCp)) === JSON.stringify(CP), 'D6 쿠폰 지급 0/0/0/1/2 유지', D.map(r => r.dCp).join('/'));
  ok(D.every(r => r.dPaid === 1), 'D7 누적 결제수 S.cnt.paid 각 +1', D.map(r => r.dPaid).join('/'));
  ok(D.every(r => r.dMail === 0), 'D8 구매가 우편을 안 만든다(697 — 153 의 반대 방향)', D.map(r => r.dMail).join('/'));

  /* ---- [E] 마일리지 교환 ---- */
  const E = await page.evaluate(() => {
    S.mileage = 3;
    const d0 = S.dia, r0 = mileageExchange(), lack = { r: r0, d: S.dia - d0, m: S.mileage };
    S.mileage = 10;
    const d1 = S.dia, n1 = (S.mailx || []).length, r1 = mileageExchange();
    /* 697 — 교환 보상도 그 틱에 들어온다(153 의 «우편으로 온다» 를 뒤집었다) */
    const dMail = S.mailx.length - n1;
    return { lack, okc: { r: r1, d: S.dia - d1, m: S.mileage, dMail } };
  });
  ok(E.lack.r === false && E.lack.d === 0 && E.lack.m === 3, 'E1 쿠폰 부족(3/10) → false · 다이아 Δ0',
     'r=' + E.lack.r + ' Δ' + E.lack.d);
  ok(E.okc.r === true && E.okc.d === MILE, 'E2 쿠폰 10 → 그 틱에 다이아 +' + comma(MILE), '+' + E.okc.d);
  ok(E.okc.dMail === 0, 'E2-1 교환 보상이 우편을 안 만든다(697)', String(E.okc.dMail));
  ok(E.okc.m === 0, 'E3 쿠폰 −10', String(E.okc.m));
  /* 교환 결과 안내문도 새 값으로(문자열은 fmt 파생).
     217 — 이 단언은 부패가 **둘 겹쳐** 있었다(got `{has:false, old:false}` = 새 문자열도 옛 문자열도 없음).
       ⓐ 표기 — 「2.50B」는 111 알파벳 단위다. 150 이후 다이아는 `fmt` = 「2,500,000」.
       ⓑ 자리 — 149(주인 지시)가 «한 줄 안내는 팝업이 아니라 토스트» 로 뒤집어 안내는 `#fxl .fx-toast`
          에 뜨고 **≈1초 뒤 스스로 사라진다**(206). 앞선 [E] 블록은 교환 뒤 `claimMail` 까지 태워
          토스트가 여러 장 쌓이거나 이미 걷혔을 수 있어 «본문 어딘가에 있나» 로는 못 잰다.
     215 가 `verify123` 에서 세운 처방 그대로 — **재는 자리만 이사**하고(185-④) 기대 문구는 리터럴로
     박지 않고 게이트 상수에서 만든다(185-①·212-①). 토스트를 걷고 교환을 한 번 더 태워
     «이 교환이 낸 안내» 만 보게 한 뒤 300ms 기다린다(185-⑥). «팝업으로 되돌아가면 잡힌다» 도 같이 박는다. */
  const E4 = await page.evaluate(() => {
    document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
    document.querySelectorAll('#modal.on, .modal.on').forEach(m => m.classList.remove('on'));
    S.mileage = MILE_NEED;
    mileageExchange();
    return { split: fmtG(MILE_DIA) !== fmt(MILE_DIA) };
  });
  await page.waitForTimeout(300);
  const E4r = await page.evaluate(() => ({
    toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | '),
    modal: !!document.querySelector('.modal.on, #modal.on'),
  }));
  ok(E4r.toast.includes(comma(MILE)) && !E4r.toast.includes('5.00B'),
     'E4 교환 결과 안내(149 토스트)에 «' + comma(MILE) + '»(옛 알파벳 «5.00B» 부재)', E4r.toast || '(토스트 없음)');
  ok(E4.split, 'E4-1 MILE_DIA 에서 골드 규약과 기본 규약이 갈린다 — 단언이 유효한 크기', String(E4.split));
  ok(!E4r.modal, 'E4-2 교환 결과 안내는 팝업이 아니다(149)', String(E4r.modal));
  await page.evaluate(() => { document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove()); });
  await page.evaluate(() => { document.querySelectorAll('.modal.on .x, .modal.on').forEach(m => m.classList && m.classList.remove('on')); });

  /* ---- [F] 44 회귀 ---- */
  ok(JSON.stringify(A.won) === JSON.stringify(WON), 'F1 가격(won) 1,000/5,000/11,000/55,000/110,000 불변', A.won.join('·'));
  ok(JSON.stringify(A.cp) === JSON.stringify(CP), 'F2 쿠폰(cp) 0/0/0/1/2 불변', A.cp.join('·'));
  const F = await page.evaluate(() => {
    S.mileage = 0; S.dia = 1000; renderCoinPage(document.getElementById('shopList'));
    const noEx = !document.getElementById('cnExch') && !!document.querySelector('#cnMile.off');
    const d0 = S.dia, p0 = S.cnt.paid | 0, n0 = (S.mailx || []).length;
    document.querySelector('#shopList [data-diabuy="d5"]').click();
    const txt = document.body.innerText;
    const mail = (S.mailx || [])[(S.mailx || []).length - 1] || null;
    return { noEx, dDia: S.dia - d0, dPaid: (S.cnt.paid | 0) - p0, dMail: (S.mailx || []).length - n0,
             mailDia: mail ? mail.c : null, ready: txt.includes('결제 준비 중'),
             done: txt.includes('결제 완료') && txt.includes('즉시 지급'),
             won: [...document.querySelectorAll('#shopList [data-diabuy="d5"]')]
                    .some(el => el.textContent.includes('110,000원')) };
  });
  ok(F.noEx, 'F3 쿠폰 10 미만이면 교환 버튼 id(#cnExch) 자체가 없음(비활성 클릭 = Δ0)');
  /* 589 이관 — «지갑을 직접 안 건드린다» 는 116 의 성질이라 그대로 남기고, 그 뒤에 무엇이
     일어나는가를 새 진실로 적는다. 옛 문구가 되살아나면 F4-b 가 빨개진다(자리를 안 비웠다). */
  /* 697 — 116 의 성질(«클릭이 표대로 준다»)은 그대로이고 지급처만 바뀌었다: 지갑이 그 자리에서
     d5 수량만큼 늘어야 한다(차감이 되살아나면 Δ가 200만보다 작아진다). */
  ok(F.dDia === 2000000, 'F4 카드 [구매] 클릭이 지갑을 그 틱에 d5 수량만큼 채운다(697)', 'Δ' + F.dDia);
  ok(F.dPaid === 1 && F.dMail === 0,
     'F4-a 589·697 — 클릭 = 결제 완료 1건 · 새 우편 0통',
     '결제 +' + F.dPaid + ' · 우편 +' + F.dMail);
  ok(F.done && !F.ready, 'F4-b 589·697 — 안내가 «즉시 지급» 이고 옛 «결제 준비 중» 은 0건',
     '완료 ' + F.done + ' · 준비중 ' + F.ready);
  ok(F.won, 'F5 구매 버튼에 원화가 «110,000원» 표기');

  /* ---- [G] 구 세이브 보존 — 이미 받은 다이아는 안 건드린다(지시 ④) ---- */
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(() => {
    /* 44 교훈 1 — 살아 있는 페이지에서 localStorage 를 고치면 5초 자동 저장이 옛 값을 되쓴다.
       페이지 스크립트보다 먼저 심어야 결정적이다. */
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({ dia: 987654321, mileage: 7, gold: 1000 }));
  });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto(URL);
  await p2.waitForFunction(() => typeof S !== 'undefined');
  await p2.waitForTimeout(400);
  const G = await p2.evaluate(() => ({ dia: S.dia, mile: S.mileage }));
  ok(G.dia === 987654321, 'G1 구 세이브의 보유 다이아 무변경(마이그레이션 없음)', String(G.dia));
  ok(G.mile === 7, 'G2 구 세이브의 마일리지 쿠폰 무변경', String(G.mile));
  ok(errs2.length === 0, 'G3 구 세이브 로드 시 런타임 에러 0건', errs2.join(' | '));

  /* ---- [H] 콘솔 에러 · NaN 스캔 ---- */
  const H = await p2.evaluate(() => {
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const t = document.getElementById('shopList').innerText;
    return { nan: (t.match(/NaN|undefined/g) || []).length, len: t.length };
  });
  ok(H.nan === 0, 'H1 13 재화 탭 텍스트에 NaN/undefined 0건', H.nan + '건 / ' + H.len + '자');
  ok(errs.length === 0, 'H2 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY116 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
