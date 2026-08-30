/* 41 검증 — ① 기능 체크(T2 «기능 완성 규칙») ② 회귀(02 메인 · 03 · 14 좌표/픽셀).
   node verify41.js
   비교 기준본은 `git show <ref>:index.html` 을 임시 파일로 떨궈서 쓴다(스크립트가 알아서 만든다).
   <ref> 는 인자로 준다 — 기본값 HEAD~1. 41 이 손대기 «전» 커밋을 줘야 회귀 대조가 유효하다.
     예) node verify41.js 0384edc   (33 이 올라온 직후 = 41 직전 상태) */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BEFORE = path.resolve('.before41.tmp.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  OK   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const eq = (m, a, b, tol = 0) => (Math.abs(a - b) <= tol ? ok(`${m} (${a})`) : no(`${m}: ${a} ≠ ${b}`));

/* 02 유휴 루프가 굴리는 값 — 픽셀 대조에서 빼야 한다 (51 함정 3) */
const VOLATILE = ['nickN', 'cpN', 'hpT', 'chapN'];

const GEO_SEL = {
  main: ['#top', '.prof', '.curs', '#stagearea', '#stinfo', '#slots', '#tabbar', '#sideL', '#sideR'],
  dun: ['#dunw', '.dns-list', '.dns-sub', '#dunList .dnc'],
  /* 534(2026-08-30) — 옛 이름 `#relicw`·`.rlx-strip`·`.rlx-sub`·`#relicBody` 는 89 가 유물 페이지를
     통째로 갈아 끼울 때 사라졌다(130·133 이 같은 이름을 verify77·verify73 에서 이미 걷어냈다).
     넷 다 문서에 0건이라 `querySelectorAll` 이 빈 집합을 돌려주고 [2] rel 이 «0종 Δ0» 으로
     **헛초록**이었다 — 그래서 이름만 바꾸지 않고 «이 페이지가 실제로 그리는 블록» 을 적는다. */
  rel: ['#relw', '.rw-panel', '#rwGrid', '.rw-mid', '#rwBasin', '.rw-cost', '.rw-cap'],
};

async function snap(page, which) {
  return page.evaluate(({ w, sels }) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const out = {};
    sels[w].forEach((s) => {
      document.querySelectorAll(s).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        out[s + '#' + i] = [+(r.left - app.left).toFixed(1), +(r.top - app.top).toFixed(1),
          +r.width.toFixed(1), +r.height.toFixed(1)];
      });
    });
    return out;
  }, { w: which, sels: GEO_SEL });
}

async function open(browser, file, which, freeze) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  /* 픽셀 회귀 전용 — 렌더 루프를 «켜지자마자» 세운다. 살아 있는 게임을 두 번 찍으면
     골드·쿨다운·스킬 발동이 매번 달라져서 대조가 근본적으로 비결정적이다.
     rAF 를 죽이면 두 캡처가 같은 초기 프레임에서 멈춘다. */
  if (freeze) { await page.waitForTimeout(60); await page.evaluate(() => { window.requestAnimationFrame = () => 0; }); }
  await page.waitForTimeout(900);
  if (which === 'dun') await page.evaluate(() => openDungeon());
  if (which === 'rel') await page.evaluate(() => openRelw());
  await page.waitForTimeout(500);
  await page.evaluate((v) => {
    const el = document.getElementById('view'); if (el) el.style.visibility = 'hidden';
    /* 51 함정 3 — 유휴 루프가 굴리는 값은 매 프레임 다시 쓰이므로 «소스» 를 고정해야 한다.
       S.nick 은 'U_'+Date.now() 라 textContent 만 바꾸면 다음 프레임에 되돌아온다. */
    S.nick = 'U_FIXED'; if (typeof uiDirty !== 'undefined') uiDirty = true;
    v.forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = 'X'; });
  }, VOLATILE);
  await page.waitForTimeout(100);
  return { ctx, page, errs };
}

(async () => {
  /* 회귀 기준본을 «옛 커밋» 으로 잡으면 그 사이에 다른 워커가 넣은 변경까지 섞여 들어온다
     (실제로 작업 63 의 탭바 테두리 제거가 섞여 오검출이 났다). 그래서 기준본은
     **현재 파일에서 41 의 마크업만 들어낸 것** 으로 만든다 — 41 단독 영향만 남는다.
     CSS 는 남겨도 마크업이 없으면 아무것도 그리지 않으므로 그대로 둔다. */
  {
    const cur = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const re = /\n\s*<!-- 41 팝업 내장 재화 바[\s\S]*?<div class="pcb">[\s\S]*?<\/div>\n\s*<\/div>/g;
    const stripped = cur.replace(re, '');
    const n = (cur.match(re) || []).length;
    if (n !== 2) { no(`기준본 생성 실패 — .pcb 마크업 ${n}개만 제거됨(2개여야 한다)`); }
    else ok('회귀 기준본 = 현재 파일에서 .pcb 마크업 2개만 제거');
    fs.writeFileSync(BEFORE, stripped);
  }
  const browser = await launch(chromium);
  const NOW = path.resolve('index.html');

  /* ---------- ① 기능 체크 ---------- */
  console.log('\n[1] 기능 체크 — 재화 변동이 팝업 내 재화 바에 반영되는가');
  for (const which of ['dun', 'rel']) {
    const { ctx, page, errs } = await open(browser, NOW, which);
    const st = await page.evaluate(() => ({ g: S.gold, d: S.dia, key: KEY }));
    const read = () => page.evaluate((w) => {
      const root = document.getElementById(w === 'rel' ? 'relw' : 'dunw');
      const b = root.querySelector('.pcb');
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect(), t = document.getElementById('top').getBoundingClientRect();
      return {
        gold: root.querySelector('.pcb-g>b').textContent,
        dia: root.querySelector('.pcb-d>b').textContent,
        hud: { gold: document.getElementById('goldN').textContent, dia: document.getElementById('diaN').textContent },
        visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0,
        coversHud: r.top <= t.top + 0.5 && r.bottom >= t.bottom - 0.5 && r.width >= t.width - 0.5,
        zOverProf: (() => {
          const p = document.querySelector('.prof').getBoundingClientRect();
          const cx = p.left + p.width / 2, cy = p.top + p.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          return !!(hit && hit.closest('.pcb'));
        })(),
      };
    }, which);

    let v = await read();
    ok(`[${which}] 재화 바 렌더됨 (visible=${v.visible})`);
    if (v.coversHud) ok(`[${which}] 바가 상단 HUD 스트립을 전부 덮는다`); else no(`[${which}] HUD 스트립 미덮음`);
    if (v.zOverProf) ok(`[${which}] 프로필 플레이트 자리를 바가 점유(메인 HUD 노출 0)`); else no(`[${which}] 프로필 플레이트가 노출된다`);
    /* 534(2026-08-30) — 자가 «콤마 표기» 를 손으로 기대하고 있었다. 150(«골드만 접는다»)·188
       («전투 수치도 접는다»)이 표기를 재화 종류별로 갈라 놓은 뒤로 골드는 `fmtG`(35.0A),
       나머지 재화는 `fmt`(1,300,000) 다 — 제품이 앞서간 것이 아니라 자가 뒤처진 것이다.
       ⇒ 숫자도 함수 이름도 자에 박지 않고 **제품의 디스패처 `fmtCur(k, n)` 하나**에게 묻는다
       (402 «표 두 벌» 부패 방지 — 규약이 또 갈리면 제품과 자가 같이 움직인다). */
    /* 534 — 초기 표기 두 항은 **표본이 놓인 자리**도 틀려 있었다(368 과 같은 꼴).
       바 문자열과 `S.gold` 를 **다른 순간에** 읽는데, 부팅 직후 골드는 전투가 매 프레임 올리고
       그 구간은 1000 미만이라 `fmtG` 가 한 자리까지 그대로 보인다 ⇒ 두 읽기 사이에 값이 움직여
       «반영 안 됨» 이 아니라 «읽은 시각이 다름» 으로 빨개진다(실측: 바 8 ↔ S.gold 12).
       ⇒ 한 번의 `evaluate` 안에서 둘을 같이 읽고, 58 롤링이 따라잡을 시간(≤2s)만 준다.
       바가 정말 상태를 안 따라가면 2초 안에 한 번도 안 맞으므로 무르게 푼 것이 아니다 —
       §R 되돌림 시험(renderPcb 정지)이 그것을 못박는다. */
    const settle = async (w, k) => {
      const sel = k === 'gold' ? '.pcb-g>b' : '.pcb-d>b';
      const root = w === 'rel' ? 'relw' : 'dunw';
      for (let i = 0; i < 20; i++) {
        const r = await page.evaluate(({ s, rt, kk }) => {
          const bar = document.getElementById(rt).querySelector(s).textContent;
          return { bar, exp: fmtCur(kk, kk === 'gold' ? S.gold : S.dia) };   /* 같은 순간 */
        }, { s: sel, rt: root, kk: k });
        if (r.bar === r.exp) return r;
        await page.waitForTimeout(100);
      }
      return await page.evaluate(({ s, rt, kk }) => {
        const bar = document.getElementById(rt).querySelector(s).textContent;
        return { bar, exp: fmtCur(kk, kk === 'gold' ? S.gold : S.dia) };
      }, { s: sel, rt: root, kk: k });
    };
    const i0 = await settle(which, 'gold'), i1 = await settle(which, 'dia');
    i0.bar === i0.exp ? ok(`[${which}] 초기 골드 표기 = fmtCur('gold', S.gold) (${i0.bar})`)
      : no(`[${which}] 초기 골드 표기: 바 ${i0.bar} ≠ ${i0.exp}`);
    i1.bar === i1.exp ? ok(`[${which}] 초기 다이아 표기 = fmtCur('dia', S.dia) (${i1.bar})`)
      : no(`[${which}] 초기 다이아 표기: 바 ${i1.bar} ≠ ${i1.exp}`);

    /* 실제 게임 동작으로 재화를 움직인다 — 우편 일괄 수령(claimAllMail) */
    const gained = await page.evaluate(() => {
      const before = { g: S.gold, d: S.dia };
      claimAllMail();
      return { before, after: { g: S.gold, d: S.dia } };
    });
    /* 534 — 고정 700ms 대기도 상수를 베낀 자리였다(129 교훈: «게이트 대기를 늘리는 땜질» 금지).
       58 롤링은 0 → 35,000 같은 큰 뜀을 여러 프레임에 걸쳐 수렴시키므로 700ms 안에 닿는지는
       프레임 타이밍에 달렸다(실측: 같은 트리에서 35.0A 로 닿기도, 13.1A 에 머물기도 했다 = 플레이키).
       ⇒ 묻는 것을 «700ms 안에 같은가» 에서 «따라잡는가(≤2s)» 로 옮긴다. */
    const g1 = await settle(which, 'gold'), d1 = await settle(which, 'dia');
    v = await read();
    if (gained.after.g > gained.before.g) ok(`[${which}] claimAllMail() 로 S.gold ${Math.round(gained.before.g)} → ${Math.round(gained.after.g)}`);
    else no(`[${which}] claimAllMail() 이 골드를 안 줬다`);
    g1.bar === g1.exp ? ok(`[${which}] 골드 변동이 바에 반영 (${g1.bar})`) : no(`[${which}] 골드 미반영: 바 ${g1.bar} ≠ ${g1.exp}`);
    d1.bar === d1.exp ? ok(`[${which}] 다이아 변동이 바에 반영 (${d1.bar})`) : no(`[${which}] 다이아 미반영: 바 ${d1.bar} ≠ ${d1.exp}`);
    v.gold === v.hud.gold ? ok(`[${which}] 바 표기 = 메인 HUD 표기(같은 소스)`) : no(`[${which}] 바(${v.gold}) ≠ HUD(${v.hud.gold})`);

    /* 세이브 반영 */
    const saved = await page.evaluate((k) => { const j = JSON.parse(localStorage.getItem(k) || '{}'); return { g: j.gold, d: j.dia }; }, st.key);
    saved.g === gained.after.g ? ok(`[${which}] localStorage[KEY].gold 반영`) : no(`[${which}] 세이브 미반영 ${saved.g} ≠ ${gained.after.g}`);

    /* 소비 방향도 본다 — 재화를 빼면 바가 줄어드는가 */
    const half = await page.evaluate(() => { S.gold = Math.floor(S.gold / 2); uiDirty = true; return S.gold; });
    const g2 = await settle(which, 'gold');
    g2.bar === g2.exp ? ok(`[${which}] 감소 방향도 반영 (${g2.bar} · S.gold ${half})`)
      : no(`[${which}] 감소 미반영 ${g2.bar} ≠ ${g2.exp}`);

    /* 534 — 위 세 항이 «제품 함수에게 묻는» 꼴이 됐으므로, 규약 자체가 조용히 뒤집히면
       셋이 **같이** 초록으로 남는다. 그래서 «지금 규약이 무엇인가» 를 따로 한 항으로 못박는다
       (150·188: 골드는 접힌 꼴 `35.0A`, 다른 재화는 세 자리 콤마). 이 항이 빨개지면
       규약이 바뀐 것이니 150·188 과 함께 다시 판단할 것 — 위 세 항을 손대는 것은 답이 아니다. */
    const FOLD = /^\d+(\.\d+)?[A-Z]+$/, COMMA = /^\d{1,3}(,\d{3})+$/;
    FOLD.test(v.gold) ? ok(`[${which}] 150·188 규약 — 골드는 접힌 표기 (${v.gold})`)
      : no(`[${which}] 골드가 접힌 표기가 아니다: ${v.gold}`);
    COMMA.test(v.dia) ? ok(`[${which}] 150 규약 — 다이아는 콤마 표기 (${v.dia})`)
      : no(`[${which}] 다이아가 콤마 표기가 아니다: ${v.dia}`);

    errs.length ? no(`[${which}] 콘솔 에러 ${errs.length}건: ${errs[0]}`) : ok(`[${which}] 콘솔 에러 0`);
    await ctx.close();
  }

  /* ---------- ② 회귀 ---------- */
  console.log('\n[2] 회귀 — 수정 전(HEAD~1) 대비 좌표 변화');
  for (const which of ['main', 'dun', 'rel']) {
    const a = await open(browser, BEFORE, which === 'main' ? null : which);
    const before = await snap(a.page, which); await a.ctx.close();
    const b = await open(browser, NOW, which === 'main' ? null : which);
    const after = await snap(b.page, which); await b.ctx.close();
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const diff = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    diff.length === 0
      ? ok(`[${which}] 요소 ${keys.length}종 좌표 Δ0`)
      : no(`[${which}] 좌표 변화 ${diff.length}건: ` + diff.map((k) => `${k} ${JSON.stringify(before[k])}→${JSON.stringify(after[k])}`).join(' | '));
  }

  /* ---------- ③ 02 메인 픽셀 회귀 ---------- */
  console.log('\n[3] 02 메인 픽셀 회귀 (팝업 닫힌 기본 상태)');
  const shots = {};
  for (const [tag, file] of [['before', BEFORE], ['after', NOW]]) {
    const { ctx, page } = await open(browser, file, null, true);
    shots[tag] = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
    await ctx.close();
  }
  fs.writeFileSync('.v41a.png', shots.before); fs.writeFileSync('.v41b.png', shots.after);
  /* 스킬 슬롯(#slots)은 쿨다운 링이 rAF 로 도는 «유휴 애니메이션» 이라 같은 파일을 두 번 찍어도
     달라진다 — 대조에서 제외한다(51 함정 3 과 같은 부류). 제외 박스는 실측으로 잡는다. */
  /* 제외 박스 2개 — 둘 다 «유휴 루프가 굴리는 값» 이라 같은 파일을 두 번 찍어도 달라진다(51 함정 3).
       #slots : 쿨다운 링이 rAF 로 돈다
       .curs  : 전투가 골드를 계속 벌어 #goldN/#diaN 문자열이 바뀐다 (S.gold 가 소스라 덮어써도 되돌아온다) */
  const ex = await (async () => { const { ctx, page } = await open(browser, NOW, null, true);
    const r = await page.evaluate(() => {
      const a = document.getElementById('app').getBoundingClientRect();
      const box = (el) => { const s = el.getBoundingClientRect();
        return [Math.floor(s.left - a.left) - 4, Math.floor(s.top - a.top) - 4,
          Math.ceil(s.right - a.left) + 4, Math.ceil(s.bottom - a.top) + 4]; };
      return [...box(document.getElementById('slots')), ...box(document.querySelector('.curs'))];
    });
    await ctx.close(); return r; })();
  const diff = execSync(`python3 pxdiff41.py .v41a.png .v41b.png ${ex.join(' ')}`).toString().trim();
  const nd = parseInt(diff.split(' ')[0], 10);
  nd === 0 ? ok('02 메인 픽셀 Δ0 (#slots 쿨다운 · .curs 골드 증가 제외)') : no('02 메인 픽셀 ' + diff);

  /* ---------- ④ 화면비 ---------- */
  console.log('\n[4] 화면비 5종 × 페이지 2종 — 바 기하가 프레임 좌표계에서 불변인가');
  /* 534(2026-08-30) — 알약 기대치가 «두 페이지 공용 2개(505/805)» 로 굳어 있었다. 41 당시엔
     03·14 가 픽셀 동일해서 맞았지만, 그 뒤 두 지시가 유물 페이지만 바꿨다:
       · 89  — 유물 페이지에 «유물조각» 알약 신설 ⇒ 3개 (`.pcb-r{left:805px}`)
       · 429 — 좌상단 [?] 도움말이 들어가며 세 알약을 왼쪽으로 당김
               (`#relw .pcb-g{left:205px}` · `#relw .pcb-d{left:505px}`)
     칸 규격(254×49 · top 31)은 두 페이지가 여전히 같은 부품이다. 측정표 41 §2 는 2개 시절
     기록이라 정오표를 달았다(docs/measure/41-팝업내장재화바.md §2 정오표). */
  const PILLS = {
    dun: [[505, 31, 254, 49], [805, 31, 254, 49]],
    rel: [[205, 31, 254, 49], [505, 31, 254, 49], [805, 31, 254, 49]],
  };
  for (const [W, H] of [[1080, 2280], [1920, 1080], [1024, 768], [1080, 2340], [768, 1024]]) {
    for (const which of ['dun', 'rel']) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('file://' + NOW); await page.waitForTimeout(800);
      await page.evaluate((w) => { if (w === 'rel') openRelw(); else openDungeon(); }, which);
      await page.waitForTimeout(400);
      /* 534(2026-08-30) — 이 자리도 «유휴 루프가 굴리는 값» 위에 놓여 있었다(51 함정 3 의 기하판).
         전투가 골드를 벌 때마다 58 이 도착 알약에 `fx-punch`(0.42s · 봉우리 ×1.17)를 건다.
         그 프레임에 재면 골드 알약이 [485,27,294,57] 로 읽힌다(중심 고정 · 등방 ×1.16 =
         펄스지 어긋남이 아니다). 실측으로 10칸 중 1칸이 그렇게 걸렸다 = 플레이키.
         ⇒ 대기를 늘리는 대신 **펄스가 없는 프레임을 기다려서** 잰다(129 «상수 베끼기» 금지).
         끝내 안 가라앉으면 마지막 측정값을 그대로 들고 빨개진다 — 가리지 않는다. */
      const meas = async () => page.evaluate((w) => {
        const root = document.getElementById(w === 'rel' ? 'relw' : 'dunw');
        const a = document.getElementById('app').getBoundingClientRect();
        const sc = a.width / 1080;   /* fit() 이 프레임을 scale 로 맞춘다 — 정규화해서 잰다 */
        const bar = root.querySelector('.pcb').getBoundingClientRect();
        const t = document.getElementById('top').getBoundingClientRect();
        const ps = [...root.querySelectorAll('.pcb-p')];
        const pills = ps.map((e) => {
          const q = e.getBoundingClientRect();
          return [Math.round((q.left - a.left) / sc), Math.round((q.top - a.top) / sc),
            Math.round(q.width / sc), Math.round(q.height / sc)];
        });
        return { top: +((bar.top - a.top) / sc).toFixed(1), h: +(bar.height / sc).toFixed(1),
          covers: bar.top <= t.top + 0.5 && bar.bottom >= t.bottom - 0.5,
          inside: bar.top >= a.top - 0.5 && bar.left >= a.left - 0.5 && bar.right <= a.right + 0.5, pills,
          pulsing: ps.some((e) => getComputedStyle(e).transform !== 'none') };
      }, which);
      let r = await meas();
      for (let i = 0; i < 20 && r.pulsing; i++) { await page.waitForTimeout(100); r = await meas(); }
      const pulsing = r.pulsing; delete r.pulsing;
      const expP = JSON.stringify(PILLS[which]);
      const good = r.top === 0 && Math.abs(r.h - 108) <= 1 && r.covers && r.inside
        && JSON.stringify(r.pills) === expP;
      good ? ok(`${W}×${H} [${which}] 바 top0 h108 · 알약 ${PILLS[which].map((p) => p[0]).join('/')} 254×49 · HUD 덮음 · 프레임 안`)
        : no(`${W}×${H} [${which}] ` + JSON.stringify(r) + ' ≠ 알약 ' + expP + (pulsing ? ' (2초 동안 펄스가 안 멎었다)' : ''));
      await ctx.close();
    }
  }

  await browser.close();
  fs.unlinkSync(BEFORE);
  console.log(`\n${fail === 0 ? 'VERIFY41 PASS' : 'VERIFY41 FAIL'} (${pass}/${pass + fail})`);
  process.exit(fail === 0 ? 0 : 1);
})();
