#!/usr/bin/env node
/* 게이트 — 작업 267 「팝업 버튼 통일」 (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify267.js
 *
 * 지시 원문: «룰렛 승급전 길라잡이 팝업에 닫기 버튼 없애기 / 룰렛 돌리기 버튼이나 승급전 도전
 * 버튼 같은 거 퀘스트 팝업에 일괄 받기 버튼처럼 크고 폰트도 그런 식으로 통일성 있게. 폰트도 좀 크고».
 *
 * 지시가 «없앤다» 와 «키운다» 두 축이라 게이트도 두 축이고, 각 축에 **음성항**을 붙였다 —
 * 없애기만 하면 «닫을 방법이 사라지는» 사고가 나고, 키우기만 하면 `.gbtn` 공용 클래스를 통해
 * 지정하지 않은 버튼까지 같이 커진다(등재문 주의 · 243 함정).
 *
 *   [A] 설치 확인 — `.pbtn` 규격 토큰이 살아 있는지(없으면 이하 전부 의미 없음)
 *   [B] 닫기 제거 — 룰렛 `#rouClose` · 승급전 `#pclose` · 길라잡이 `#okBtn` 이 **0개**
 *   [C] ★ 닫는 길은 남아 있다 — 세 팝업 전부 **딤 탭으로 실제로 닫힌다**(#modal.on 해제)
 *   [D] 크기·폰트 통일 — `#rouBtn` · `#pgo` · `#promoBtn` 이 22 `[모두 받기]`(`.qs-all`) 를
 *       **live 로 읽어** 높이·라운드·검정 테두리·라벨 fs 가 같다(22 가 바뀌면 같이 따라간다)
 *   [E] 과교정 잠금 — 공용 `.gbtn` 은 26px 그대로다(다른 팝업의 [확인]·[전체 초기화] 불변) ·
 *       `popup()` 의 나머지 호출부는 [확인] 이 그대로 있고 눌러서 닫힌다
 *   [F] 실동작(기능 완성 규칙) — 룰렛을 **진짜 포인터로** 눌러 돌리고, 회전 중 라벨이
 *       «돌아가는 중…» 으로 바뀌면서도 **46.6px 규격을 잃지 않고**(rouBtnTx 회귀), 멈춘 뒤
 *       라벨이 돌아오고 다이아가 늘고 세이브에 반영된다
 *   [G] 181 회귀 — 회전 중 `#modal.rou-spin` 에서 새 버튼도 `pointer-events:none` 이다
 *   [H] 콘솔 · 런타임 에러 0
 *
 * 되돌림 시험: `.pbtn` 을 `.gbtn` 으로 되돌리면 [D] 12건, [닫기] 를 되살리면 [B] 3건이 빨개진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const near = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 0.6 : t);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, totalKills: 5000, best: 40, rank: 0, summons: 500, upgrades: 3000 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(800);
  /* 전투 렌더를 멈춰 캡처·계측이 흔들리지 않게 한다(265·266 과 같은 관례) */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 22 [모두 받기] 를 live 로 읽어 «기준» 을 만든다 — 숫자를 손으로 적지 않는다(LESSONS 264-⑤) */
  const REF = await page.evaluate(() => {
    openQuest();
    const b = document.getElementById('qAll');
    const lb = b.querySelector('b');
    const cs = getComputedStyle(b), ls = getComputedStyle(lb);
    const out = { h: b.getBoundingClientRect().height, r: parseFloat(cs.borderTopLeftRadius),
                  bw: parseFloat(cs.borderTopWidth), fs: parseFloat(ls.fontSize) };
    closeModal();
    return out;
  });
  console.log('기준(22 [모두 받기] live) — 높이 ' + REF.h + ' · radius ' + REF.r
            + ' · 검정 테두리 ' + REF.bw + ' · 라벨 ' + REF.fs + 'px\n');
  ok(REF.h > 0 && REF.fs > 40, 'A1 기준 표본(22 `.qs-all`)을 읽었다',
     'h=' + REF.h + ' fs=' + REF.fs);

  /* 새 버튼 하나를 22 기준과 대조하는 공용 절 */
  const spec = async (sel, label) => {
    const g = await page.evaluate(s => {
      const b = document.querySelector(s);
      if (!b) return null;
      const lb = b.querySelector('b');
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return { h: r.height, w: r.width,
               r: parseFloat(cs.borderTopLeftRadius), bw: parseFloat(cs.borderTopWidth),
               cls: b.className, hasB: !!lb,
               fs: lb ? parseFloat(getComputedStyle(lb).fontSize) : -1,
               ink: lb ? lb.getBoundingClientRect().width : -1,
               inner: r.width - 2 * parseFloat(cs.borderLeftWidth) };
    }, sel);
    if (!g) { ok(false, label + ' 버튼이 있다', sel + ' 없음'); return null; }
    ok(/\bifbtn\b/.test(g.cls) && /\bpbtn\b/.test(g.cls), label + ' 이 `.ifbtn.pbtn` 부품이다', g.cls);
    ok(g.hasB, label + ' 라벨이 `<b>` 안에 있다(`.ifbtn` 규약)');
    ok(near(g.h, REF.h), label + ' 높이 = 22 기준', g.h + ' vs ' + REF.h);
    ok(near(g.r, REF.r), label + ' radius = 22 기준', g.r + ' vs ' + REF.r);
    ok(near(g.bw, REF.bw), label + ' 검정 테두리 = 22 기준', g.bw + ' vs ' + REF.bw);
    ok(near(g.fs, REF.fs, 0.1), label + ' 라벨 font-size = 22 기준', g.fs + ' vs ' + REF.fs);
    ok(g.ink <= g.inner, label + ' 라벨이 버튼 밖으로 안 넘친다', '잉크 ' + Math.round(g.ink) + ' ≤ 안쪽 ' + Math.round(g.inner));
    return g;
  };

  /* 딤 탭이 실제로 닫는지 — «닫기 버튼을 없앴다» 의 짝이 되는 음성항.
     `#modal` 자신을 눌러야 한다(핸들러가 `e.target === #modal` 만 본다). */
  const dimClose = async (label) => {
    const open0 = await page.evaluate(() => document.getElementById('modal').classList.contains('on'));
    ok(open0, label + ' 팝업이 열렸다');
    const box = await page.evaluate(() => {
      const r = document.querySelector('#modal .mbox').getBoundingClientRect();
      return { top: r.top };
    });
    await page.mouse.click(540, Math.max(8, Math.round(box.top / 2)));   /* 모달 «위» 딤 */
    await page.waitForTimeout(250);
    const open1 = await page.evaluate(() => document.getElementById('modal').classList.contains('on'));
    ok(!open1, '★ ' + label + ' — [닫기] 가 없어도 딤 탭으로 닫힌다');
  };

  /* ── 룰렛 ─────────────────────────────────────────────────────────────── */
  await page.evaluate(() => { S.daily.spins = ROUL_FREE; openRoulette(); });
  await page.waitForTimeout(400);
  {
    const n = await page.evaluate(() => ({
      close: document.querySelectorAll('#rouClose').length,
      dan: [...document.querySelectorAll('#modal button')].filter(b => /닫기/.test(b.textContent)).length,
      btns: document.querySelectorAll('#modal button').length,
    }));
    ok(n.close === 0, 'B1 룰렛 `#rouClose` 0개', '실측 ' + n.close);
    ok(n.dan === 0, 'B2 룰렛 팝업에 «닫기» 라벨 버튼 0개', '실측 ' + n.dan);
    ok(n.btns === 1, 'B3 룰렛 팝업 버튼은 [룰렛 돌리기] 하나뿐', '실측 ' + n.btns);
  }
  await spec('#rouBtn', 'D-룰렛 [룰렛 돌리기]');

  /* ── [F] 실동작 · [G] 181 회귀 — 진짜 포인터로 돌린다 ── */
  {
    const dia0 = await page.evaluate(() => S.dia);
    await page.click('#rouBtn');
    await page.waitForTimeout(500);
    const mid = await page.evaluate(() => {
      const b = document.getElementById('rouBtn'), lb = b.querySelector('b');
      return { spin: rouSpinning, mark: !!document.querySelector('#modal.rou-spin'),
               txt: (b.textContent || '').trim(), hasB: !!lb,
               fs: lb ? parseFloat(getComputedStyle(lb).fontSize) : -1,
               pe: getComputedStyle(b).pointerEvents, dis: b.disabled };
    });
    ok(mid.spin && mid.mark, 'F1 클릭으로 실제 회전이 시작됐다');
    ok(/돌아가는 중/.test(mid.txt), 'F2 회전 중 라벨이 «돌아가는 중…»', mid.txt);
    ok(mid.hasB && near(mid.fs, REF.fs, 0.1),
       '★ F3 라벨을 바꿔도 `<b>` 규격을 잃지 않는다(rouBtnTx)', 'fs=' + mid.fs);
    ok(mid.pe === 'none', 'G1 181 회귀 — 회전 중 `.pbtn` 도 pointer-events:none', mid.pe);
    ok(mid.dis === true, 'G2 회전 중 버튼 disabled');

    await page.waitForTimeout(5200);
    const end = await page.evaluate(() => {
      const b = document.getElementById('rouBtn'), lb = b.querySelector('b');
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || 'null'); } catch (e) {}
      return { spin: rouSpinning, txt: (b.textContent || '').trim(),
               fs: lb ? parseFloat(getComputedStyle(lb).fontSize) : -1,
               pe: getComputedStyle(b).pointerEvents,
               res: (document.getElementById('rouRes') || {}).textContent || '',
               dia: S.dia, savedDia: saved ? saved.dia : null };
    });
    ok(!end.spin, 'F4 회전이 끝났다');
    ok(/룰렛 돌리기|내일 다시/.test(end.txt), 'F5 라벨이 돌아왔다', end.txt);
    ok(near(end.fs, REF.fs, 0.1), 'F6 복귀 라벨도 46.6px 규격', 'fs=' + end.fs);
    ok(end.pe !== 'none', 'G3 회전이 끝나면 다시 눌린다', 'pointer-events=' + end.pe);
    ok(/획득/.test(end.res), 'F7 결과줄에 획득 표시', end.res.trim());
    ok(end.dia > dia0, 'F8 보상이 실제로 들어왔다', dia0 + ' → ' + end.dia);
    ok(end.savedDia === end.dia, 'F9 세이브(S)에 반영됐다', 'localStorage dia=' + end.savedDia);
  }
  await dimClose('C1 룰렛');

  /* ── 승급전 ───────────────────────────────────────────────────────────── */
  await page.evaluate(() => openPromo());
  await page.waitForTimeout(350);
  {
    const n = await page.evaluate(() => ({
      close: document.querySelectorAll('#pclose').length,
      dan: [...document.querySelectorAll('#modal button')].filter(b => /닫기/.test(b.textContent)).length,
      btns: document.querySelectorAll('#modal button').length,
      title: (document.getElementById('mtitle') || {}).textContent || '',
    }));
    ok(/승급전/.test(n.title), 'B4 승급전 팝업이 열렸다', n.title);
    ok(n.close === 0, 'B5 승급전 `#pclose` 0개', '실측 ' + n.close);
    ok(n.dan === 0, 'B6 승급전 팝업에 «닫기» 라벨 버튼 0개', '실측 ' + n.dan);
    ok(n.btns === 1, 'B7 승급전 팝업 버튼은 [승급전 시작] 하나뿐', '실측 ' + n.btns);
  }
  await spec('#pgo', 'D-승급전 [승급전 시작]');
  await dimClose('C2 승급전');

  /* ── 길라잡이 (▦ 메뉴 → 길라잡이) — 진짜 포인터 경로로 연다 ─────────────── */
  await page.evaluate(() => openMenu());
  await page.waitForTimeout(200);
  await page.click('#mnw .mn-col [data-mn="guide"]');
  await page.waitForTimeout(350);
  {
    const n = await page.evaluate(() => ({
      okb: document.querySelectorAll('#okBtn').length,
      btns: document.querySelectorAll('#modal button').length,
      title: (document.getElementById('mtitle') || {}).textContent || '',
      body: (document.getElementById('mbox') || {}).textContent || '',
    }));
    ok(/길라잡이/.test(n.title), 'B8 길라잡이 팝업이 열렸다', n.title);
    ok(n.okb === 0, 'B9 길라잡이 `#okBtn`(확인) 0개', '실측 ' + n.okb);
    ok(n.btns === 0, 'B10 길라잡이 팝업에 버튼이 하나도 없다', '실측 ' + n.btns);
    ok(n.body.trim().length > 0, 'B11 본문은 그대로 있다(내용을 지운 것이 아니다)');
  }
  await dimClose('C3 길라잡이');

  /* ── [E] 과교정 잠금 ──────────────────────────────────────────────────── */
  {
    /* E1~E2 — `popup()` 의 나머지 호출부는 [확인] 이 그대로다 */
    await page.evaluate(() => popup('🎧 고객 지원', '<p>테스트</p>'));
    await page.waitForTimeout(250);
    const e1 = await page.evaluate(() => {
      const b = document.getElementById('okBtn');
      return { has: !!b, fs: b ? parseFloat(getComputedStyle(b).fontSize) : -1,
               cls: b ? b.className : '' };
    });
    ok(e1.has, 'E1 다른 팝업의 [확인] 은 그대로 있다', e1.cls);
    ok(near(e1.fs, 26, 0.1), 'E2 공용 `.gbtn` 은 26px 그대로(안 커졌다)', e1.fs + 'px');
    await page.click('#okBtn');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => !document.getElementById('modal').classList.contains('on')),
       'E3 그 [확인] 은 여전히 닫는다');

    /* E4 — `.gbtn` 을 쓰는 자리가 아직 남아 있다(클래스를 죽이지 않았다는 확인) */
    const g = await page.evaluate(() => {
      const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
      return { rule: /\.gbtn\{[^}]*font-size:26px/.test(css.replace(/\s+/g, '')),
               pbtn: /\.ifbtn\.pbtn\{/.test(css.replace(/\s+/g, '')) };
    });
    ok(g.rule, 'E4 `.gbtn{font-size:26px}` 규칙이 그대로다');
    ok(g.pbtn, 'A2 `.ifbtn.pbtn` 규칙이 설치돼 있다');
  }

  /* ── [D] 내 정보 «승급전 도전» — 주인이 이름을 댄 자리 ────────────────── */
  await page.evaluate(() => {
    renderSt();
    /* 이 패널은 탭 매핑(`bodyOf`)이 가리키지 않는 자리라 화면에서 열리지 않는다 —
       계측을 위해 여기서만 펴 준다(`fnchk198.js` 도 같은 방식으로 renderSt 를 직접 부른다). */
    document.getElementById('panel').style.display = 'flex';
    document.getElementById('bSt').classList.add('on');
  });
  await page.waitForTimeout(200);
  await spec('#promoBtn', 'D-내 정보 [승급전 도전]');

  /* ── [H] ── */
  ok(errs.length === 0, 'H 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY267 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
