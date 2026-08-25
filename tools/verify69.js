/* 작업 69 — 우편함 팝업 회귀·기능 게이트.
   실행: node tools/verify69.js
   §1 진입 · §2 기하(측정표 §10 채택값) · §3 실데이터 반영 · §4 기능(행별 수령·전체 수령·닫기)
   §5 화면비 회귀. 전부 통과해야 «VERIFY69 PASS».

   LESSONS 34-⑤ — addInitScript 는 reload 마다 다시 도므로 세이브를 다시 깔지 않게 가드한다.
   LESSONS 51-③ — 유휴 루프가 굴리는 값(자동구매·자동강화)은 «수령 전후 재화 비교» 를 오염시키므로 끈다. */
const { chromium } = require('playwright');
const path = require('path');

let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log('  ✓ ' + m); };
const fail = (m) => { failed++; console.log('  ✗ ' + m); };
const near = (name, got, want, tol = 1.0) =>
  Math.abs(got - want) <= tol ? ok(`${name} ${got} (기준 ${want})`) : fail(`${name} ${got} ≠ ${want} (허용 ±${tol})`);

const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function fresh(browser, w = 1080, h = 2280) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(800);
  /* 유휴 루프가 재화를 굴리지 못하게 자동화를 끈다 */
  await page.evaluate(() => { if (typeof S === 'object') { S.autoBuy = false; S.spAuto = false; } });
  return { ctx, page, errs };
}

(async () => {
  const browser = await chromium.launch();
  try {
    /* ---------- 1. 진입 ---------- */
    console.log('[1] 진입 — ▦ 메뉴 → 우편');
    let { ctx, page, errs } = await fresh(browser);
    await page.evaluate(() => { document.querySelector('#menub').click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { document.querySelector('#mnw [data-mn="mail"]').click(); });
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({
      on: document.getElementById('modal').classList.contains('on'),
      ml: document.getElementById('modal').classList.contains('ml69'),
      q22: document.getElementById('modal').classList.contains('q22'),
      title: document.getElementById('mtitle').textContent,
      rows: document.querySelectorAll('.ml-r').length,
      mails: typeof MAILS !== 'undefined' ? MAILS.length : -1,
      xVisible: getComputedStyle(document.getElementById('mailX')).display !== 'none'
    }));
    st.on ? ok('모달 열림') : fail('모달이 안 열렸다');
    st.ml ? ok('.ml69 껍데기 override 적용') : fail('.ml69 클래스 없음');
    !st.q22 ? ok('다른 화면 override(q22) 안 남음') : fail('q22 가 같이 걸려 있다');
    st.title === '우편함' ? ok('타이틀 «우편함»') : fail('타이틀 = ' + st.title);
    st.rows === st.mails ? ok(`행 ${st.rows}개 = MAILS ${st.mails}통`) : fail(`행 ${st.rows} ≠ MAILS ${st.mails}`);
    st.xVisible ? ok('✕ 가 .ml69 에서만 보임') : fail('✕ 가 안 보인다');

    /* 사이드 아이콘이 아니라 52 메뉴가 진입점이다(작업 71 이 좌측 아이콘을 뺄 예정) —
       사이드 아이콘이 아직 있다면 그 경로로도 열려야 한다 */
    await page.evaluate(() => closeModal());
    const sideOpened = await page.evaluate(() => {
      const b = document.querySelector('.side .ibtn[data-pop="mail"]');
      if (!b) return 'none';
      b.click();
      return document.getElementById('modal').classList.contains('ml69');
    });
    await page.waitForTimeout(250);
    sideOpened === 'none' ? ok('좌측 사이드 우편 아이콘 없음(작업 71 완료 상태)')
      : (sideOpened ? ok('좌측 사이드 아이콘으로도 열림') : fail('사이드 아이콘 경로가 안 열린다'));

    /* ---------- 2. 기하 (측정표 §10 채택값) ---------- */
    console.log('[2] 기하 — 측정표 §10 채택값');
    await page.evaluate(() => { closeModal(); openMail(); });
    await page.waitForTimeout(300);
    const g = await page.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const R = (sel) => {
        const e = document.querySelector(sel); if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      };
      const rows = [...document.querySelectorAll('.ml-r')].map((e) => e.getBoundingClientRect().top - A.top);
      return { box: R('.mbox'), body: R('#mbox'), pn: R('.ml-pn'), r1: R('.ml-r'),
        i1: R('.ml-r .ml-i'), b1: R('.ml-r .ml-b'), note: R('.ml-note'),
        btns: R('.ml-btns'), sub: R('.ml-all.sub'), all: R('#mailBtn'), x: R('#mailX'), rowTops: rows };
    });
    near('상자 폭', g.box.w, 898);
    near('상자 높이', g.box.h, 1310);
    near('본문 높이', g.body.h, 1196);
    near('패널 폭', g.pn.w, 830);
    near('패널 높이', g.pn.h, 851);
    near('행 폭', g.r1.w, 784);
    near('행 높이', g.r1.h, 147);
    near('행 pitch', g.rowTops[1] - g.rowTops[0], 164);
    near('썸네일 변', g.i1.w, 108);
    near('썸네일 = 정사각', g.i1.h, g.i1.w);
    near('행 버튼 폭', g.b1.w, 151);
    near('행 버튼 높이', g.b1.h, 89);
    near('하단 버튼 폭', g.all.w, 305);
    near('하단 버튼 높이', g.all.h, 117);
    near('하단 버튼 2개 간격', g.all.x - (g.sub.x + g.sub.w), 27);
    near('하단 버튼 합 span', (g.all.x + g.all.w) - g.sub.x, 637);
    near('✕ 지름', g.x.w, 115);
    /* 비율 불변식 — 레퍼런스에서 그대로 가져온 값 */
    const rr = (n, got, want, tol) => near(n, +got.toFixed(4), want, tol);
    rr('패널 w ÷ 상자 w (ref .9241)', g.pn.w / g.box.w, 0.9241, 0.004);
    rr('썸네일 ÷ 행 높이 (ref .735)', g.i1.w / g.r1.h, 0.735, 0.006);
    rr('행 버튼 w:h (ref 1.69)', g.b1.w / g.b1.h, 1.69, 0.03);
    rr('행 h ÷ 상자 w (ref .1640)', g.r1.h / g.box.w, 0.1640, 0.004);
    rr('하단 버튼 span ÷ 상자 w (ref .7105)', ((g.all.x + g.all.w) - g.sub.x) / g.box.w, 0.7105, 0.005);
    /* 썸네일·버튼은 행 세로 중앙 */
    near('썸네일 세로 중앙', (g.i1.y + g.i1.h / 2) - (g.r1.y + g.r1.h / 2), 0, 1.2);
    near('행 버튼 세로 중앙', (g.b1.y + g.b1.h / 2) - (g.r1.y + g.r1.h / 2), 0, 1.2);
    /* ✕ 중심이 상자 바닥선에 걸친다 */
    near('✕ 중심 = 상자 바닥선', (g.x.y + g.x.h / 2) - (g.box.y + g.box.h), 0, 1.5);
    /* 5행이 패널 안에 스크롤 없이 들어간다 */
    const fits = await page.evaluate(() => {
      const p = document.querySelector('.ml-pn');
      return { sc: p.scrollHeight, cl: p.clientHeight };
    });
    fits.sc <= fits.cl + 1 ? ok(`5행이 스크롤 없이 들어감 (${fits.sc} ≤ ${fits.cl})`)
      : fail(`리스트가 넘친다 ${fits.sc} > ${fits.cl}`);
    /* 프레임 밖 0건 */
    const outside = await page.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const bad = [];
      document.querySelectorAll('#modal.ml69 .mbox, #modal.ml69 .ml-close, .ml-r, .ml-all, .ml-note').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width && (r.left < A.left - 1 || r.right > A.right + 1 || r.top < A.top - 1 || r.bottom > A.bottom + 1))
          bad.push(e.className);
      });
      return bad;
    });
    outside.length === 0 ? ok('프레임 밖 요소 0건') : fail('프레임 밖: ' + outside.join(', '));

    /* ---------- 3. 실데이터 반영 ---------- */
    console.log('[3] 실데이터 — MAILS 를 그대로 그린다');
    const data = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.ml-r')];
      return rows.map((r, i) => ({
        id: r.querySelector('[data-ml]').dataset.ml,
        title: r.querySelector('.ml-t').textContent.trim(),
        sum: r.querySelector('.ml-s').textContent.trim(),
        qty: r.querySelector('.ml-i>i').textContent.trim(),
        btn: r.querySelector('.ml-b').textContent.trim(),
        dis: r.querySelector('.ml-b').disabled,
        expect: MAILS[i]
      }));
    });
    data.every((d, i) => d.id === d.expect.id) ? ok('행 순서 = MAILS 순서') : fail('행 순서가 MAILS 와 다르다');
    data.every((d) => d.title.length > 0 && !/undefined|NaN/.test(d.title)) ? ok('제목 정상') : fail('제목에 undefined/NaN');
    data.every((d) => /외 \d개$/.test(d.sum) || /^(골드|다이아|유물석)$/.test(d.sum))
      ? ok('보상 요약 «N 외 n개» 형식') : fail('보상 요약 형식 이상: ' + data.map((d) => d.sum).join(' | '));
    data.every((d) => d.qty.length > 0 && !/NaN|undefined/.test(d.qty)) ? ok('수량 표기 정상') : fail('수량에 NaN/undefined');
    /* 대표 썸네일 = 값이 가장 큰 보상인지.
       ⚠ 수량은 `fmt()` 표기라 «3.00K» 처럼 접미사가 붙는다 — 숫자만 발라내서 비교하면 안 된다. */
    const topOk = await page.evaluate(() => MAILS.every((m, i) => {
      const rw = mailRw(m).slice().sort((a, b) => b.v - a.v)[0];
      const cell = document.querySelectorAll('.ml-r')[i];
      const q = cell.querySelector('.ml-i>i').textContent.trim();
      const ic = cell.querySelector('.ml-i').firstChild.textContent.trim();
      return q === fmt(rw.v) && ic === rw.ic;
    }));
    topOk ? ok('대표 썸네일 = 최대 보상') : fail('대표 썸네일이 최대 보상이 아니다');
    data.every((d) => !d.dis) ? ok('미수령 상태에서 [받기] 전부 활성') : fail('미수령인데 비활성인 행이 있다');

    /* ---------- 4. 기능 — 실제 클릭으로 상태가 바뀌는가 ---------- */
    console.log('[4] 기능 — 헤드리스 «실제 클릭»');
    const before = await page.evaluate(() => ({ g: S.gold, c: S.dia, r: S.relic, mail: { ...S.mail } }));
    const m0 = await page.evaluate(() => ({ ...MAILS[0] }));
    await page.evaluate(() => { document.querySelector('.ml-r [data-ml]').click(); });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      g: S.gold, c: S.dia, r: S.relic, mail: { ...S.mail },
      saved: JSON.parse(localStorage.getItem(KEY) || '{}').mail || {},
      btn: document.querySelector('.ml-r .ml-b').textContent.trim(),
      dis: document.querySelector('.ml-r .ml-b').disabled,
      done: document.querySelector('.ml-r').classList.contains('done')
    }));
    after.mail[m0.id] === 1 ? ok('S.mail[m1] = 1 (수령 기록)') : fail('S.mail 이 안 바뀌었다');
    near('골드 증가분', after.g - before.g, m0.g, 0);
    near('다이아 증가분', after.c - before.c, m0.c, 0);
    near('유물석 증가분', after.r - before.r, m0.r || 0, 0);
    after.saved[m0.id] === 1 ? ok('localStorage[KEY] 에 세이브 반영') : fail('세이브에 반영 안 됨');
    after.dis ? ok('수령한 행 버튼 비활성') : fail('수령했는데 버튼이 아직 활성');
    after.done ? ok('수령한 행 .done 상태(악센트 밴드·썸네일 회색)') : fail('.done 클래스 없음');
    after.btn === '완료' ? ok('수령한 행 라벨 «완료»') : fail('라벨 = ' + after.btn);

    /* HUD 반영 — 렌더 루프가 갱신하므로 한 프레임 기다린다(LESSONS 25 함정) */
    await page.waitForTimeout(500);
    const hud = await page.evaluate(() => {
      const t = document.getElementById('app').textContent;
      return { hasNaN: /NaN|undefined/.test(t), gold: S.gold };
    });
    !hud.hasNaN ? ok('화면에 NaN/undefined 0건') : fail('화면에 NaN/undefined');

    /* 전체 수령 */
    const leftBefore = await page.evaluate(() => mailLeft());
    const sumRest = await page.evaluate(() => MAILS.filter((m) => !S.mail[m.id])
      .reduce((a, m) => ({ g: a.g + m.g, c: a.c + m.c, r: a.r + (m.r || 0) }), { g: 0, c: 0, r: 0 }));
    const pre2 = await page.evaluate(() => ({ g: S.gold, c: S.dia, r: S.relic }));
    await page.evaluate(() => { document.getElementById('mailBtn').click(); });
    await page.waitForTimeout(600);
    const post2 = await page.evaluate(() => ({
      g: S.gold, c: S.dia, r: S.relic, left: mailLeft(),
      allDis: [...document.querySelectorAll('.ml-b')].every((b) => b.disabled),
      allDone: [...document.querySelectorAll('.ml-r')].every((r) => r.classList.contains('done')),
      btn: document.getElementById('mailBtn').textContent.trim(),
      btnDis: document.getElementById('mailBtn').disabled,
      stillOpen: document.getElementById('modal').classList.contains('ml69')
    }));
    leftBefore > 0 ? ok(`전체 수령 전 미수령 ${leftBefore}통`) : fail('미수령이 0이라 전체 수령을 검증 못 함');
    near('전체 수령 골드', post2.g - pre2.g, sumRest.g, 0);
    near('전체 수령 다이아', post2.c - pre2.c, sumRest.c, 0);
    near('전체 수령 유물석', post2.r - pre2.r, sumRest.r, 0);
    post2.left === 0 ? ok('미수령 0통') : fail('아직 ' + post2.left + '통 남음');
    post2.allDis && post2.allDone ? ok('전 행 비활성 + .done') : fail('전 행 상태가 안 바뀜');
    post2.btnDis && post2.btn === '수령 완료' ? ok('[전체 수령] → 비활성 «수령 완료»') : fail('하단 버튼 상태 = ' + post2.btn);
    post2.stillOpen ? ok('수령 후에도 우편함이 열려 있다(옛 popup() 덮어쓰기 회귀 없음)') : fail('수령 후 팝업이 덮였다');

    /* 새로고침 후에도 유지 */
    await page.reload();
    await page.waitForTimeout(900);
    const persisted = await page.evaluate(() => mailLeft());
    persisted === 0 ? ok('새로고침 후에도 수령 상태 유지') : fail('새로고침 후 미수령 ' + persisted + '통으로 되돌아감');

    /* 닫기 2종 */
    await page.evaluate(() => openMail());
    await page.waitForTimeout(250);
    await page.evaluate(() => { document.getElementById('mailClose').click(); });
    await page.waitForTimeout(200);
    let closed = await page.evaluate(() => !document.getElementById('modal').classList.contains('on')
      && !document.getElementById('modal').classList.contains('ml69'));
    closed ? ok('[닫기] 로 닫힘 + ml69 해제') : fail('[닫기] 가 안 닫힌다');
    await page.evaluate(() => openMail());
    await page.waitForTimeout(250);
    await page.evaluate(() => { document.getElementById('mailX').click(); });
    await page.waitForTimeout(200);
    closed = await page.evaluate(() => !document.getElementById('modal').classList.contains('on'));
    closed ? ok('✕ 로 닫힘') : fail('✕ 가 안 닫힌다');
    /* 다른 모달을 열면 ml69 가 남지 않는다 */
    await page.evaluate(() => { openMail(); if (typeof openQuest === 'function') openQuest(); });
    await page.waitForTimeout(300);
    const leak = await page.evaluate(() => document.getElementById('modal').classList.contains('ml69'));
    !leak ? ok('퀘스트 팝업으로 전환 시 ml69 잔여 없음') : fail('ml69 가 다른 모달에 남는다');
    await page.evaluate(() => { closeModal(); if (typeof popup === 'function') popup('테스트', '<p>x</p>'); });
    await page.waitForTimeout(250);
    const leak2 = await page.evaluate(() => document.getElementById('modal').classList.contains('ml69'));
    !leak2 ? ok('공용 popup() 으로 전환 시 ml69 잔여 없음') : fail('ml69 가 공용 popup 에 남는다');

    errs.length === 0 ? ok('콘솔 에러 0') : errs.slice(0, 5).forEach((e) => fail('콘솔: ' + e));
    await ctx.close();

    /* ---------- 5. 화면비 회귀 ---------- */
    console.log('[5] 화면비 — 우편함이 프레임 밖으로 안 나간다');
    for (const [w, h] of [[1080, 2280], [1080, 1920], [1920, 1080], [1024, 768], [1080, 2520]]) {
      const s = await fresh(browser, w, h);
      await s.page.evaluate(() => openMail());
      await s.page.waitForTimeout(350);
      const bad = await s.page.evaluate(() => {
        const A = document.getElementById('app').getBoundingClientRect();
        const out = [];
        document.querySelectorAll('#modal.ml69 .mbox, #modal.ml69 .ml-close').forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5) out.push(`${e.className} top${Math.round(r.top - A.top)} bottom${Math.round(r.bottom - A.bottom)}`);
        });
        return out;
      });
      bad.length === 0 ? ok(`${w}×${h} 잘림 없음`) : fail(`${w}×${h}: ${bad.join(' / ')}`);
      if (s.errs.length) fail(`${w}×${h} 콘솔 에러 ${s.errs.length}`);
      await s.ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${failed === 0 ? 'VERIFY69 PASS' : 'VERIFY69 FAIL'} ${pass}/${pass + failed}`);
  process.exit(failed === 0 ? 0 : 1);
})();
