/* 작업 200 — 13 재화 탭 다이아 팩 뱃지 «쿠폰 +n» → «마일리지 +n» (주인 지시 2026-08-27, 가독성)
 *
 * 주인 원문: «다이아 파는 거에 쿠폰+1 말고 마일리지+1 이라 써 있어야 가독성 좋다».
 * 등재문이 정한 표기 규약(PROGRESS 200 행):
 *   - 노출 표기는 «마일리지». **«쿠폰» 단독 금지.**
 *   - «마일리지 쿠폰» 은 무방(우편 제목·본문·패널 타이틀·151 알약).
 *     단 뱃지처럼 좁은 자리는 «마일리지 +N».
 *   - 55 설정의 «쿠폰»(= «쿠폰 코드», 별개 기능)은 **바꾸지 않는다** — 회귀 방지로 여기서 같이 못 박는다.
 *
 * 재는 것
 *   [A] 뱃지 — 문구 · bbox 불변(측정표 13 «카드 쿠폰 뱃지» 120×46) · 글자가 안쪽 폭 안에 들어감
 *   [B] 마일리지 패널 보상 줄 — «마일리지 10개 → 💎 …» · [교환] 버튼과 안 겹침
 *   [C] 교환 토스트 — «남은 마일리지 N개»(소스 + 실행 둘 다)
 *   [D] «쿠폰» 단독 금지 — 재화 탭 화면 텍스트에 «마일리지» 를 앞에 달지 않은 «쿠폰» 0건
 *   [E] 55 «쿠폰 코드» 회귀 방지 — 설정 버튼 라벨은 «쿠폰» 그대로
 *
 * 실행: node tools/verify200.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (got !== undefined ? '   got ' + got : '')); }
};

/* 측정표 13 §«카드 쿠폰 뱃지» — 120×46 (r23, 검정 4). 문구가 길어져도 이 판은 안 건드린다. */
const BADGE = { w: 120, h: 46 };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
    shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  /* 122 의 «흔들림»(±4°)이 도는 중에는 bbox 가 회전 외접 사각형이라 폭 판정에 못 쓴다 → t=0 고정 */
  await p.evaluate(() => document.getAnimations().forEach(a => {
    try { a.pause(); a.currentTime = 0; } catch (_) {}
  }));

  const A = await p.evaluate(() => {
    /* ⚠ 122 의 «흔들림»(±4°)·«펄스»(scale) 때문에 `getBoundingClientRect()` 는 **회전 외접
       사각형**이라 판(120×46)을 재는 자로 쓸 수 없다(t=0 고정도 `--jz-d` 음수 딜레이라 무의미).
       판·겹침은 전부 `offsetWidth/offsetLeft`(레이아웃 박스, transform 무관)로 잰다.
       글자 폭만 Range bbox 를 쓰되 그건 `i` 의 scaleX 가 안 곱해진 advance 박스다. */
    const rows = [...document.querySelectorAll('#shopList .cn-cd>.cp')].map(cp => {
      const i = cp.querySelector('i');
      const cs = getComputedStyle(i), bd = parseFloat(getComputedStyle(cp).borderLeftWidth) || 0;
      const r = document.createRange(); r.selectNodeContents(i);
      const t = r.getBoundingClientRect();
      const m = cs.transform.match(/matrix\(([-\d.]+)/);
      return { s: i.textContent, w: cp.offsetWidth, h: cp.offsetHeight,
               inner: cp.offsetWidth - bd * 2, rawW: t.width, sx: m ? parseFloat(m[1]) : 1 };
    });
    const ml = document.querySelector('#shopList .cn-ml');
    const rw = ml && ml.querySelector('.rw'), ex = ml && ml.querySelector('.ex');
    return {
      rows,
      rw: rw ? { s: rw.textContent.trim(), right: rw.offsetLeft + rw.offsetWidth,
                 exLeft: ex.offsetLeft } : null,
      /* 재화 탭 화면 텍스트 전체 — «쿠폰» 단독 스캔용 */
      pageTxt: document.getElementById('shopList').innerText,
    };
  });

  console.log('[A] 다이아 팩 뱃지');
  ok('A1 뱃지 2개(45만·100만 상품)', A.rows.length === 2, 'n=' + A.rows.length);
  ok('A2 문구 = «마일리지 +1» / «마일리지 +2»',
    A.rows.map(r => r.s).join('/') === '마일리지 +1/마일리지 +2', A.rows.map(r => r.s).join('/'));
  ok('A3 옛 «쿠폰 +n» 문자열 부재(소스 스캔)', !/>쿠폰 \+/.test(SRC) && !SRC.includes("'<i>쿠폰 +'"));
  ok('A4 뱃지 bbox 120×46 불변(측정표 13)',
    A.rows.every(r => Math.abs(r.w - BADGE.w) <= 0.6 && Math.abs(r.h - BADGE.h) <= 0.6),
    A.rows.map(r => r.w.toFixed(1) + '×' + r.h.toFixed(1)).join(' '));
  const overs = A.rows.filter(r => r.rawW * r.sx > r.inner);
  ok('A5 글자 렌더 폭이 뱃지 안쪽(112) 을 넘지 않음 — 넘침 0칸',
    overs.length === 0,
    A.rows.map(r => r.s + ' ' + (r.rawW * r.sx).toFixed(1) + '/' + r.inner.toFixed(1)).join(' · '));

  console.log('[B] 마일리지 패널 보상 줄');
  ok('B1 «마일리지 10개 → …»', !!A.rw && /^마일리지 10개 →/.test(A.rw.s), A.rw && A.rw.s);
  ok('B2 [교환] 버튼과 안 겹침', !!A.rw && A.rw.right <= A.rw.exLeft,
    A.rw && (A.rw.right.toFixed(1) + ' ≤ ' + A.rw.exLeft.toFixed(1)));

  console.log('[C] 교환 토스트');
  ok('C1 소스 문구 = «남은 마일리지 \' + S.mileage»', SRC.includes("남은 마일리지 ' + S.mileage"));
  ok('C2 옛 «남은 쿠폰» 부재', !SRC.includes('남은 쿠폰'));
  const C = await p.evaluate(() => {
    const before = S.mileage;
    const r = mileageExchange();
    return { r, before, after: S.mileage,
             toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | ') };
  });
  ok('C3 교환 성공(쿠폰 12 → 2)', C.r === true && C.after === C.before - 10,
    C.before + '→' + C.after);
  ok('C4 실행 토스트에 «남은 마일리지 2개»', C.toast.includes('남은 마일리지 2개'), C.toast);
  ok('C5 실행 토스트에 «남은 쿠폰» 없음', !C.toast.includes('남은 쿠폰'), C.toast);

  console.log('[D] «쿠폰» 단독 금지 (재화 탭 화면 텍스트)');
  /* «마일리지 쿠폰» 은 허용이므로 지운 뒤 남은 «쿠폰» 만 센다 */
  const solo = (A.pageTxt.replace(/마일리지 쿠폰/g, '') .match(/쿠폰/g) || []).length;
  ok('D1 «마일리지» 를 안 단 «쿠폰» 0건', solo === 0, 'n=' + solo);

  console.log('[E] 55 «쿠폰 코드» 회귀 방지');
  const E = await p.evaluate(() => {
    const e = document.querySelector('[data-cf="coupon"] i');
    return e ? e.textContent.trim() : null;
  });
  ok('E1 설정 버튼 라벨은 «쿠폰» 그대로(별개 기능)', E === '쿠폰', String(E));
  ok('E2 쿠폰 코드 입력 프롬프트 문구 유지', SRC.includes('쿠폰 코드를 입력하세요.'));

  ok('Z1 콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY200 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
