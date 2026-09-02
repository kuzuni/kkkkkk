#!/usr/bin/env node
/* 843 재현기 — `verify351.js` §8 [8-d]·[8-g] 가 빨간 이유를 «제품 산수» 와 «자의 부패» 로 가른다.
 *
 * 실행: node tools/probe843.js
 *
 * 등재문이 남긴 갈래(둘 중 하나다):
 *   ⓐ 20 스펙 리스트가 «패널 − 상수» 로 잡혀야 하는데 산수가 틀렸다   → 제품을 고친다
 *   ⓑ 리스트가 **행 피치 배수로 스냅**된다(812) — 눌린 20px 이 리스트가 아니라 간격으로
 *      가는 것이 정상 동작이고, 그러면 자를 스냅 잔차만큼 허용하도록 이관한다(333 처방)
 *
 * 가르는 방법은 «찍힌 값» 하나다 — 1600 에서 스냅 블록(`@supports (height: round(down,…))`)만
 * 걷어낸 사본과 현행을 **같은 트리에서** 재고, 걷어낸 사본이 [8-d]·[8-g] 를 초록으로
 * 되돌리는지 본다. 되돌리면 두 항이 재는 것은 «결함» 이 아니라 **812 그 자체**다.
 *
 * ⚠ 이 파일은 재현기다 — 누구의 통과 조건도 아니다(803 교훈). 그래도 항이 빨가면
 *   «812 의 스냅이 사라졌다» 는 뜻이므로, 그때는 자(verify351 §8)가 아니라 제품을 본다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log(`  ok  ${m}${d ? ' — ' + d : ''}`); };
const no = (m, d) => { fail++; console.log(`  NG  ${m}${d ? ' — ' + d : ''}`); };

/* 812 를 걷어낸 사본 — 스냅 «전» 의 한 줄(= 351 7회차가 세운 «남는 만큼» 그대로) */
const NOSNAP = `.spc-list{height:min(760px, calc(100% - 596px)) !important}`;

async function shot(browser, h, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (css) await page.addStyleTag({ content: css });
  await page.click('#profBtn', { force: true }).catch(() => {});
  await page.waitForTimeout(420);
  await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); }).catch(() => {});
  await page.waitForTimeout(520);
  const r = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (s) => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        top: Math.round((b.top - A.top) * 10) / 10, bot: Math.round((b.bottom - A.top) * 10) / 10,
        h: Math.round(b.height * 10) / 10,
      };
    };
    const row = document.querySelector('.spc-row');
    return {
      on: !!document.querySelector('#specw.on'),
      spc: box('.spc'), body: box('.spc-body'), list: box('.spc-list'), tabs: box('.spc-tabs'),
      pitch: row ? Math.round(row.getBoundingClientRect().height * 10) / 10 : null,
      pad: parseFloat(getComputedStyle(document.querySelector('.spc-list')).paddingTop) || 0,
      slv: parseFloat(getComputedStyle(document.querySelector('.spc-list')).getPropertyValue('--spc-slv')) || 0,
    };
  });
  await ctx.close();
  return r;
}

(async () => {
  const br = await launch(chromium);
  console.log('[§1] 현행 트리 — 두 프레임 실측');
  const a19 = await shot(br, 2280, null);
  const a13 = await shot(br, 1600, null);
  (a19.on && a13.on) ? ok('[P0] 두 해상도 다 20 스펙 화면에 들어갔다')
    : no('[P0] 두 해상도 다 20 스펙 화면에 들어갔다', `2280 ${a19.on} · 1600 ${a13.on}`);
  const dSpc = a19.spc.h - a13.spc.h, dList = a19.list.h - a13.list.h;
  const gap19 = Math.round((a19.tabs.top - a19.list.bot) * 10) / 10;
  const gap13 = Math.round((a13.tabs.top - a13.list.bot) * 10) / 10;
  console.log(`      패널 ${a19.spc.h} → ${a13.spc.h} (−${dSpc}) · 리스트 ${a19.list.h} → ${a13.list.h} (−${dList})`);
  console.log(`      간격(리스트 하변↔탭 줄 상변) 2280 ${gap19} · 1600 ${gap13} (Δ ${Math.round((gap13 - gap19) * 10) / 10})`);
  console.log(`      행 피치 ${a13.pitch} · 리스트 상단 패딩 ${a13.pad} · 슬라이버 --spc-slv ${a13.slv}`);

  /* [P1] 등재문의 관측을 그대로 다시 찍는다 — 이 항이 빨가면 재현 실패다(전제). */
  (dList > dSpc)
    ? ok('[P1] 등재문 재현 — 1600 에서 리스트가 패널보다 더 줄어든다', `패널 −${dSpc} · 리스트 −${dList} (차 ${dList - dSpc})`)
    : no('[P1] 등재문 재현 — 1600 에서 리스트가 패널보다 더 줄어든다', `패널 −${dSpc} · 리스트 −${dList}`);
  ((gap13 - gap19) > 1)
    ? ok('[P2] 등재문 재현 — 그 차이가 그대로 간격으로 갔다', `Δ간격 ${Math.round((gap13 - gap19) * 10) / 10} ≈ Δ리스트 ${dList - dSpc}`)
    : no('[P2] 등재문 재현 — 그 차이가 그대로 간격으로 갔다', `Δ간격 ${Math.round((gap13 - gap19) * 10) / 10}`);
  (Math.abs((gap13 - gap19) - (dList - dSpc)) <= 1)
    ? ok('[P3] 두 항은 한 뿌리의 앞뒤다 — 리스트가 더 준 만큼이 정확히 간격이다',
      `Δ리스트 ${dList - dSpc} ↔ Δ간격 ${Math.round((gap13 - gap19) * 10) / 10}`)
    : no('[P3] 두 항은 한 뿌리의 앞뒤다', `Δ리스트 ${dList - dSpc} · Δ간격 ${Math.round((gap13 - gap19) * 10) / 10}`);

  /* [P4] 812 의 스냅 항등식 — 리스트 = 패딩 + 온전한 행 n개 + ref 슬라이버.
     이것이 참이면 «리스트가 더 준 것» 은 산수 오류가 아니라 **의도된 내림 스냅**이다. */
  const body13 = (a13.list.h - a13.pad - a13.slv);
  const body19 = (a19.list.h - a19.pad - a19.slv);
  (a13.pitch > 0 && Math.abs(body13 % a13.pitch) < 0.5)
    ? ok('[P4] 1600 리스트는 «패딩 + 온전한 행 n + 슬라이버» 다(812 스냅 항등식)',
      `${a13.list.h} = ${a13.pad} + ${a13.pitch}×${Math.round(body13 / a13.pitch)} + ${a13.slv}`)
    : no('[P4] 1600 리스트는 «패딩 + 온전한 행 n + 슬라이버» 다(812 스냅 항등식)',
      `본문 ${body13} % 피치 ${a13.pitch} = ${Math.round((body13 % a13.pitch) * 10) / 10}`);
  (a19.pitch > 0 && Math.abs(body19 % a19.pitch) < 0.5)
    ? ok('[P5] 2280 도 같은 항등식 위에 있다(기준 프레임 Δ0px)',
      `${a19.list.h} = ${a19.pad} + ${a19.pitch}×${Math.round(body19 / a19.pitch)} + ${a19.slv}`)
    : no('[P5] 2280 도 같은 항등식 위에 있다', `본문 ${body19} % 피치 ${a19.pitch} = ${Math.round((body19 % a19.pitch) * 10) / 10}`);

  /* [P6]·[P7] 갈래를 가르는 항 — 스냅만 걷어낸 사본에서 두 항이 초록으로 돌아오는가. */
  console.log('[§2] 812 스냅을 걷어낸 사본 — 갈래 판정');
  const b13 = await shot(br, 1600, NOSNAP);
  const dListB = a19.list.h - b13.list.h;
  const gapB = Math.round((b13.tabs.top - b13.list.bot) * 10) / 10;
  console.log(`      스냅 없음: 리스트 ${a19.list.h} → ${b13.list.h} (−${dListB}) · 간격 ${gapB}`);
  (dListB <= dSpc + 1)
    ? ok('[P6] 스냅을 걷어내면 [8-d] 가 초록으로 돌아온다 — 리스트가 패널보다 더 줄지 않는다',
      `패널 −${dSpc} · 리스트 −${dListB}`)
    : no('[P6] 스냅을 걷어내면 [8-d] 가 초록으로 돌아온다', `패널 −${dSpc} · 리스트 −${dListB}`);
  (Math.abs(gapB - gap19) <= 1)
    ? ok('[P7] 스냅을 걷어내면 [8-g] 도 초록으로 돌아온다 — 간격이 2280 과 같아진다',
      `${gapB} ≈ ${gap19}`)
    : no('[P7] 스냅을 걷어내면 [8-g] 도 초록으로 돌아온다', `${gapB} vs 2280 ${gap19}`);

  /* [P8] 음성항 — 스냅을 걷어낸 사본이 «레퍼런스 프레임» 을 안 건드리는지.
     걷어낸 값이 2280 에서도 달랐다면 위 판정이 프레임 교차 오염이 된다. */
  const b19 = await shot(br, 2280, NOSNAP);
  (Math.abs(b19.list.h - a19.list.h) <= 0.5)
    ? ok('[P8] 음성항 — 스냅 유무와 무관하게 2280 리스트는 같다(min 이 상수 쪽을 고른다)', `${b19.list.h} = ${a19.list.h}`)
    : no('[P8] 음성항 — 2280 리스트가 스냅 유무로 갈린다', `${b19.list.h} vs ${a19.list.h}`);

  await br.close();
  console.log(`\nPROBE843 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  console.log(fail ? '⇒ 스냅 항등식이 깨졌다 — 자가 아니라 제품(812)을 본다.'
    : '⇒ 갈래 ⓑ 확정: [8-d]·[8-g] 가 재는 것은 결함이 아니라 812 의 내림 스냅이다. 자를 이관한다(333 처방).');
  process.exit(fail ? 1 : 0);
})();
