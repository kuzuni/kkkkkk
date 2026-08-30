/* 537 재현 — `verify44.js` 가 «#okBtn 없음» 으로 즉사한 자리와, 그 뒤로 한 번도 안 돌던 절이
   무엇을 보고 있었는지 «제품에게 직접» 묻는다 (338 규칙 — 처방 전에 재현).

   묻는 것 넷:
     [1] 즉사 지점 — 다이아 상품 [1,000원] 을 눌렀을 때 «준비 중» 이 팝업인가 토스트인가.
         (206 «알림 전면 토스트화» 가 옳다면 `#okBtn` 은 애초에 안 생긴다 = 게이트가 뒤처진 것)
     [2] 지급 경로 — `devBuyDia()` 가 재화를 «즉시» 더하는가 «우편으로» 보내는가 (153).
     [3] 마일리지 교환 — 결과가 팝업인가 토스트인가 · 다이아가 즉시 오르는가 (153).
     [4] 재화 탭 기하 — 리본 수·`.cn-wrap` 높이·마지막 요소(게이트 A1/A3/A23 의 기대값 출처).

   실행: node tools/probe537.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const rows = [], fails = [];
const ok = (t, d) => rows.push(['✓', t, d || '']);
const bad = (t, d) => { rows.push(['✗', t, d || '']); fails.push(t + ' — ' + d); };
const eq = (t, got, want) => String(got) === String(want) ? ok(t, String(got))
                                                          : bad(t, '실측 ' + got + ' / 기대 ' + want);

const clearFx = page => page.evaluate(() => {
  document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
  try { closeModal(); } catch (e) {}
});
const seen = page => page.evaluate(() => {
  const t = [...document.querySelectorAll('#fxl .fx-toast')];
  const md = document.getElementById('modal');
  return { toast: t.length, txt: t.map(e => e.textContent).join(' | '),
           modal: !!(md && md.classList.contains('on')),
           okBtn: !!document.getElementById('okBtn') };
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.click('.tab[data-t="shop"]', { force: true });
  await page.waitForTimeout(300);
  await page.$eval('#shopCats .shp-ct[data-cat="coin"]', el => el.click());
  await page.waitForTimeout(300);

  /* ---------- [1] 즉사 지점 ---------- */
  await clearFx(page);
  const d0 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0 }));
  await page.$eval('[data-diabuy="d1"]', el => el.click());
  await page.waitForTimeout(200);
  const s1 = await seen(page);
  const d1 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0 }));
  eq('1-a [1,000원] 클릭 → 토스트 1장', s1.toast, 1);
  eq('1-b 같은 클릭에 `#modal` 은 안 열린다', s1.modal, false);
  eq('1-c `#okBtn` 노드 없음 (= 게이트 즉사의 실체)', s1.okBtn, false);
  /준비 중/.test(s1.txt) && /1,000원/.test(s1.txt)
    ? ok('1-d 토스트 문구에 «1,000원»·«준비 중»', s1.txt)
    : bad('1-d 토스트 문구', s1.txt);
  eq('1-e 다이아 변동 0', d1.dia - d0.dia, 0);
  /* 제품 소스 — 206 규약대로 `notify()` 를 쓰는지 (팝업 분기가 남았으면 여기서 보인다) */
  const src = await page.evaluate(() =>
    ({ notify: /data-diabuy[\s\S]{0,400}?결제 준비 중/.test(document.documentElement.outerHTML) }));
  eq('1-f 제품이 «준비 중» 을 notify 경로로 낸다', src.notify, true);

  /* ---------- [2] 지급 경로 (153) ---------- */
  await clearFx(page);
  const g0 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0, paid: S.cnt.paid | 0,
                                          mails: (S.mailx || []).length }));
  const gr = await page.evaluate(() => window.devBuyDia('d4'));
  await page.waitForTimeout(300);
  const g1 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0, paid: S.cnt.paid | 0,
                                          mails: (S.mailx || []).length,
                                          last: (S.mailx || []).slice(-1)[0] }));
  const s2 = await seen(page);
  eq('2-a devBuyDia(d4) 즉시 다이아 Δ', g1.dia - g0.dia, 0);
  eq('2-b devBuyDia(d4) 즉시 마일리지 Δ', g1.mil - g0.mil, 0);
  eq('2-c 우편 1통 신설', g1.mails - g0.mails, 1);
  eq('2-d 그 우편이 실은 다이아', g1.last && g1.last.c, 900000);
  eq('2-e 그 우편이 실은 마일리지', g1.last && g1.last.m, 1);
  eq('2-f 결제 카운터만 즉시 +1', g1.paid - g0.paid, 1);
  eq('2-g 발송 통보도 토스트', s2.toast + '/' + s2.modal, '1/false');
  /* 수령하면 그때 오른다 */
  await page.evaluate(id => claimMail(id), gr.mail);
  await page.waitForTimeout(200);
  const g2 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0 }));
  eq('2-h 우편 수령 뒤 다이아 +90만', g2.dia - g1.dia, 900000);
  eq('2-i 우편 수령 뒤 마일리지 +1', g2.mil - g1.mil, 1);

  /* ---------- [3] 마일리지 교환 (153) ---------- */
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.devBuyDia('d5'); claimAllMail(); });
  await page.waitForTimeout(400);
  await clearFx(page);
  const m0 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0, mails: (S.mailx || []).length }));
  const ex = await page.evaluate(() => mileageExchange());
  await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => ({ dia: S.dia, mil: S.mileage | 0, mails: (S.mailx || []).length,
                                          last: (S.mailx || []).slice(-1)[0] }));
  const s3 = await seen(page);
  eq('3-a 마일리지 11개 이상 확보', m0.mil >= 10, true);
  eq('3-b mileageExchange() 반환', ex, true);
  eq('3-c 쿠폰 −10', m0.mil - m1.mil, 10);
  eq('3-d 다이아는 즉시 안 오른다(우편)', m1.dia - m0.dia, 0);
  eq('3-e 우편 1통 신설 · 500만', (m1.mails - m0.mails) + '/' + (m1.last && m1.last.c), '1/5000000');
  /* ⚠ 토스트는 스택이라 앞선 발송 통보가 아직 안 사라졌으면 여러 장이 겹쳐 보인다(최대 4).
     여기서 묻는 것은 «장수» 가 아니라 «팝업이 아니다» 이므로 문구·modal·okBtn 으로 묻는다. */
  eq('3-f 교환 결과도 토스트 · `#okBtn` 없음', (s3.toast >= 1) + '/' + s3.modal + '/' + s3.okBtn, 'true/false/false');
  /우편함으로 발송/.test(s3.txt) ? ok('3-g 교환 토스트 문구', s3.txt) : bad('3-g 교환 토스트 문구', s3.txt);

  /* ---------- [4] 재화 탭 기하 — 게이트 A 절 기대값의 출처 ---------- */
  const geo = await page.evaluate(() => {
    const w = document.querySelector('.cn-wrap'), W = w.getBoundingClientRect();
    const rb = [...document.querySelectorAll('.cn-rb')].map(e =>
      ({ t: (e.querySelector('i') || {}).textContent, y: Math.round(e.getBoundingClientRect().top - W.top) }));
    const kids = [...w.children].map(e => ({ c: e.className,
      y: Math.round(e.getBoundingClientRect().top - W.top),
      b: Math.round(e.getBoundingClientRect().bottom - W.top) }));
    const last = kids[kids.length - 1];
    const cds = [...document.querySelectorAll('.cn-cd.dia')].map(e =>
      ({ qt: e.querySelector('.qt').textContent, cp: (e.querySelector('.cp>i') || {}).textContent || '' }));
    return { h: Math.round(W.height), rb, last, cds, kidsN: kids.length };
  });
  ok('4-a .cn-wrap 높이', geo.h + ' (게이트 기대 3066)');
  ok('4-b 리본 ' + geo.rb.length + '개', geo.rb.map(r => r.t + '@' + r.y).join(' · '));
  ok('4-c .cn-wrap 마지막 자식', geo.last.c + ' y' + geo.last.y + '..' + geo.last.b);
  ok('4-d 다이아 카드 수량·뱃지', geo.cds.map(c => c.qt + (c.cp ? '(' + c.cp + ')' : '')).join(' · '));

  await browser.close();
  const w1 = Math.max(...rows.map(r => r[1].length));
  rows.forEach(r => console.log(r[0] + ' ' + r[1].padEnd(w1) + '  ' + r[2]));
  console.log(fails.length ? '\nPROBE537 FAIL — ' + fails.length + '건\n' + fails.join('\n')
                           : '\nPROBE537 PASS — ' + rows.length + '항목');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
