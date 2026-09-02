#!/usr/bin/env node
/* 작업 583 — 「«강화에 쓰는 화폐» 가 연출에 안 나온다」 **재현**
 * (338 규칙 — 처방 전에 먼저 제품에게 묻는다. 등재문의 ⓐ~ⓓ 는 실측으로만 확인한다.)
 *
 *   node tools/probe583.js
 *
 * 등재문의 주장은 셋이다:
 *   ⓐ 소모(감소) 연출은 `fxPay` 하나이고 «−n» 금액을 띄운다(43회차가 넣었다).
 *   ⓑ 강화 «성공» 알갱이는 `fxUpOk` 의 `fxBurst`(FXPAL.up 앰버) — **재화와 무관한 색 하나**다.
 *   ⓒ/ⓓ 화폐 아이콘·색은 `CUR_ICON`·`FXCUR` 에 이미 다 있다.
 * 이 프로브는 그것을 믿지 않고 **찍힌 노드**로 다시 묻는다:
 *
 *   [A] 정적 — 543 손잡이(FX_GRAIN_SC·FX3_FLYS·FX3_GINK)와 상한(FXMAX·FXFLY_MAX).
 *   [B] 세 자리 실경로 — 23 훈련(골드) · 룬(룬강화석) · 단련(단련석) 강화를 **실제 버튼**으로
 *       1회씩 눌러 700ms 를 40ms 격자로 훑는다. 자리마다 다음을 센다:
 *         · `#fxl .fx-plus.pay` (fxPay 의 «−n» 금액)      · 알약 `.fx-pay` (움푹)
 *         · `#fxl .fx-plus.hb`  (488 회당 사다리 «−n»)     · `#fxl .fx-spark` (알갱이) 수·색·크기
 *         · `#fxl .fx-fly`      (화폐 아이콘 알갱이)       → 수리 전 기대 0
 *       그리고 **알갱이 무리의 중심이 호스트 중심에서 어느 쪽으로 흐르는가**(방향 축).
 *   [C] 출발 자리 — 세 화폐의 «보유·비용 표시» 가 화면 어디에 있는가(`fxPill` · `[data-cur-ic]`).
 *       «알약 → 카드» 방향을 세우려면 출발점이 실재해야 한다. 룬강화석·단련석은 알약이 **없다**.
 *
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(338·344 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };
const n1 = v => (v == null ? 'n/a' : (+v).toFixed(1));

/* 세 자리 — 호스트(회당 피드백이 붙는 노드)와 실제로 누를 버튼 */
const SITES = [
  { k:'train',  sub:'train',  cur:'gold',   host:'#trCards [data-tr="atk"]',
    btn:'#trCards [data-tr="atk"]' },
  { k:'rune',   sub:'rune',   cur:'rstone', host:'#trRunes .tr-rn',
    btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', sub:'temper', cur:'tstone', host:'#trTemper .tr-tp',
    btn:'#trTemper .tr-tp .tb' }
];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxPay === 'function' && typeof FXCUR !== 'undefined');
  await p.waitForTimeout(1200);

  console.log('\n=== [A] 정적 — 543 손잡이와 상한 ===');
  const A = await p.evaluate(() => ({
    FX_GRAIN_SC: typeof FX_GRAIN_SC !== 'undefined' ? FX_GRAIN_SC : null,
    FX3_FLYS, FX3_LAND, FX3_GINK: typeof FX3_GINK !== 'undefined' ? FX3_GINK : null,
    FXMAX, FXFLY_MAX,
    up: FXPAL.up,
    grainSc: { gold: fxGrainSc('gold'), rstone: fxGrainSc('rstone'), tstone: fxGrainSc('tstone') },
    hasSpend: typeof fxSpend === 'function'
  }));
  console.log('  FX_GRAIN_SC ' + A.FX_GRAIN_SC + ' · FX3_FLYS ' + n1(A.FX3_FLYS)
    + ' · FX3_GINK ' + A.FX3_GINK + ' · FXMAX ' + A.FXMAX + ' · FXFLY_MAX ' + A.FXFLY_MAX);
  console.log('  FXPAL.up ' + A.up + ' · fxGrainSc gold ' + n1(A.grainSc.gold)
    + ' / rstone ' + n1(A.grainSc.rstone) + ' / tstone ' + n1(A.grainSc.tstone));
  console.log('  `fxSpend` 부품: ' + (A.hasSpend ? '있다(수리 후)' : '**없다**(수리 전)'));

  /* 재화를 넉넉히 채우고 훈련 팝업을 연다 */
  await p.evaluate(() => {
    /* ⚠ 큰 수를 넣으면 안 된다 — `1e18` 은 float64 의 ulp 가 128 이라 «−45» 를 빼도 값이
       한 비트도 안 바뀐다. `fxWatch` 는 «값이 줄었는가» 로 보므로 그 순간 `fxPay` 가 통째로
       안 돈다(1회차에 [B3]·[B4] 가 그래서 0 으로 나왔다 — 제품이 아니라 표본의 결함이었다). */
    S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6;
    try { temperObj().pts = 1e6; } catch (_) {}
    RUNES.forEach(r => { try { S.runes = S.runes || {}; } catch (_) {} });
    openTrain();
  });
  await p.waitForTimeout(400);

  console.log('\n=== [C] 출발 자리 — 세 화폐의 «보유·비용 표시» 가 화면에 있는가 ===');
  const C = await p.evaluate((sites) => {
    const out = {};
    for (const s of sites) {
      setTrSub(s.sub); renderTrain();
      const C0 = FXCUR[s.cur];
      const pill = C0 ? fxPill(C0) : null;
      const host = document.querySelector(s.host);
      const ics = [...document.querySelectorAll('img.cic[data-cur-ic="' + s.cur + '"]')]
        .map(n => ({ r: n.getBoundingClientRect(), inHost: !!(host && host.contains(n)) }))
        .filter(o => o.r.width > 0)
        .map(o => ({ x: Math.round(o.r.left + o.r.width / 2), y: Math.round(o.r.top + o.r.height / 2),
                     w: Math.round(o.r.width), inHost: o.inHost }));
      const pr = pill ? pill.getBoundingClientRect() : null;
      out[s.k] = {
        pill: pr && pr.width ? { x: Math.round(pr.left + pr.width / 2), y: Math.round(pr.top + pr.height / 2) } : null,
        ics,
        host: host ? (() => { const r = host.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
                   w: Math.round(r.width), h: Math.round(r.height) }; })() : null
      };
    }
    return out;
  }, SITES);
  for (const s of SITES) {
    const o = C[s.k];
    console.log('  · ' + s.k + '(' + s.cur + ') — 알약 ' + (o.pill ? '(' + o.pill.x + ',' + o.pill.y + ')' : '**없음**')
      + ' · 호스트 ' + (o.host ? o.host.w + '×' + o.host.h + ' @(' + o.host.x + ',' + o.host.y + ')' : 'n/a')
      + ' · 화면의 아이콘 ' + o.ics.length + '개 [' + o.ics.map(i => (i.inHost ? '호스트안' : '바깥') + '(' + i.x + ',' + i.y + ')').join(' ') + ']');
  }
  ok(!!C.train.pill, '[C1] 훈련(골드)은 HUD 알약이 있다 — «알약 → 카드» 를 문자 그대로 세울 수 있다',
     C.train.pill ? '(' + C.train.pill.x + ',' + C.train.pill.y + ')' : '없음');
  ok(!C.rune.pill && !C.temper.pill,
     '[C2] ★ 룬강화석·단련석은 알약이 **없다** — 출발 자리를 표시 노드에서 찾아야 한다',
     '룬 ' + (C.rune.pill ? '있음' : '없음') + ' · 단련 ' + (C.temper.pill ? '있음' : '없음'));

  console.log('\n=== [B] 세 자리 실경로 — 강화 1회의 «찍힌 노드» ===');
  const B = {};
  for (const s of SITES) {
    await p.evaluate((s) => {
      setTrSub(s.sub); renderTrain();
      window.__p583 = [];
      /* 남아 있는 연출을 비운다 */
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      document.querySelectorAll('.fx-pay').forEach(n => n.classList.remove('fx-pay'));
    }, s);
    await p.waitForTimeout(120);
    const box = await p.$(s.btn);
    if (!box) { console.log('  · ' + s.k + ' — 버튼을 못 찾음(' + s.btn + ')'); continue; }
    const r = await box.boundingBox();
    /* 실제 포인터 — 홀드가 아니라 «한 번 누름» (100ms) */
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.down();
    const samp = p.evaluate((s) => new Promise(res => {
      const out = [];
      const t0 = performance.now();
      const iv = setInterval(() => {
        const L = document.getElementById('fxl');
        const host = document.querySelector(s.host);
        const hr = host ? host.getBoundingClientRect() : null;
        /* ⚑ 660·678 이관 — 스파크에도 «화폐 아이콘» 을 같이 담는다. 660 이 «알약 → 버튼» 비행을
           폐지하면서 아이콘을 **버스트 안**으로 옮겼기 때문이다(종전에는 `.fx-fly` 쪽에만 있었다). */
        const sparks = [...(L ? L.querySelectorAll('.fx-spark') : [])].map(n => {
          const b = n.getBoundingClientRect();
          const si = n.querySelector('img.cic');
          return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width,
                   c: n.style.getPropertyValue('--c').trim(),
                   cur: si ? si.dataset.curIc : null };
        });
        const flies = [...(L ? L.querySelectorAll('.fx-fly') : [])].map(n => {
          const b = n.getBoundingClientRect();
          const im = n.querySelector('img.cic');
          return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width,
                   cur: im ? im.dataset.curIc : null };
        });
        out.push({
          t: Math.round(performance.now() - t0),
          pay: [...(L ? L.querySelectorAll('.fx-plus.pay') : [])].map(n => n.textContent),
          hb:  [...(L ? L.querySelectorAll('.fx-plus.hb') : [])].map(n => n.textContent),
          dent: document.querySelectorAll('.fx-pay').length,
          sparks, flies,
          host: hr ? { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2, w: hr.width, h: hr.height } : null
        });
        if (performance.now() - t0 > 760) { clearInterval(iv); res(out); }
      }, 40);
    }), s);
    await p.waitForTimeout(100);
    await p.mouse.up();
    B[s.k] = await samp;
    await p.waitForTimeout(300);
  }

  for (const s of SITES) {
    const fr = B[s.k]; if (!fr) continue;
    const payTxt = [...new Set(fr.flatMap(f => f.pay))];
    const hbTxt  = [...new Set(fr.flatMap(f => f.hb))];
    const dent   = Math.max(...fr.map(f => f.dent));
    const spMax  = Math.max(...fr.map(f => f.sparks.length));
    const spCols = [...new Set(fr.flatMap(f => f.sparks.map(x => x.c)))].filter(Boolean);
    const spW    = fr.flatMap(f => f.sparks.map(x => x.w));
    const spCur  = [...new Set(fr.flatMap(f => f.sparks.map(x => x.cur)))].filter(Boolean);
    const flMax  = Math.max(...fr.map(f => f.flies.length));
    const flCur  = [...new Set(fr.flatMap(f => f.flies.map(x => x.cur)))].filter(Boolean);
    /* 방향 — 알갱이 무리 중심이 호스트 중심에서 얼마나·어느 쪽으로 떨어져 있는가(시간 평균) */
    let dx = 0, dy = 0, dn = 0;
    for (const f of fr) {
      if (!f.host) continue;
      for (const g of f.sparks.concat(f.flies)) { dx += g.x - f.host.x; dy += g.y - f.host.y; dn++; }
    }
    console.log('  · ' + s.k + ' — «−n»(fxPay) ' + (payTxt.length ? payTxt.join(',') : '0건')
      + ' · 488 사다리 [' + hbTxt.join(',') + '] · 알약 움푹 ' + dent
      + ' · 알갱이 최대 ' + spMax + '개 색[' + spCols.join(',') + '] 폭 '
      + (spW.length ? n1(Math.min(...spW)) + '~' + n1(Math.max(...spW)) : 'n/a')
      + ' · 화폐 아이콘 — 비행 ' + flMax + '개 [' + flCur.join(',') + '] · 버스트 [' + spCur.join(',') + ']'
      + ' · 무리 중심 오프셋 (' + (dn ? n1(dx / dn) : '0') + ',' + (dn ? n1(dy / dn) : '0') + ')');
    B[s.k].__sum = { payTxt, hbTxt, dent, spMax, spCols, spCur, flMax, flCur, off: dn ? { x: dx / dn, y: dy / dn } : null };
  }

  /* ⚠ 프로브는 «옳음» 이 아니라 «지금 무엇이 찍히는가» 를 묻는 자다 — 그래서 수리 전/후 **둘 다**
     PASS 여야 하고, 항목은 상태(`fxSpend` 가 있는가)에 따라 기대를 바꿔 적는다(338 규칙).
     1회차 실측(수리 전 = 등재문 확인) / 2회차 실측(수리 후)은 review 파일에 나란히 있다. */
  const sum = k => (B[k] && B[k].__sum) || {};
  /* ⚑⚑ 678 이관 — **상태 키를 갈았다.** 종전 키는 «`fxSpend` 가 있는가»(A.hasSpend) 한 축이라
     시대를 **둘**로만 봤는데, 그 사이 660 이 «알약 → 버튼» 비행을 폐지하고 678 이 그 선언을 걷어
     시대가 **셋**이 됐다. 그대로 두면 678 뒤의 트리가 «수리 전» 으로 읽혀 [B3]·[B5](«−n» 금액이
     뜬다)가 빨개진다 — 제품이 옳은데 자가 옛 시대를 요구하는, 333 이 말한 그 얼굴이다.
       · pre583  — «−n» 금액 노드를 아직 만든다(`fxPay` 소스)
       · post583 — 금액은 없고 **비행 알갱이**(`.fx-fly` + 화폐 아이콘)가 있다(`fxSpend` 선언)
       · post660 — 비행도 없고 아이콘은 **버스트 안**(`.fx-spark` + 화폐 아이콘) · 678 이 선언 철거
     ⚠ pre583 과 post660 은 **둘 다 `fxSpend` 가 없다** — 그래서 한 축으로는 못 가른다. */
  const ERA = /el\.textContent = '−' \+ fmtCur\(cur, n\);/.test(fs.readFileSync(SRC, 'utf8'))
    ? 'pre583' : (A.hasSpend ? 'post583' : 'post660');
  console.log('\n  시대 판정: **' + ERA + '**'
    + (ERA === 'post660' ? ' (660 이 비행을 폐지하고 678 이 선언을 걷었다)' : ''));
  const AFTER = ERA !== 'pre583';
  const flAll = ['train', 'rune', 'temper'].map(k => sum(k).flMax || 0);
  if(!AFTER){
    ok(sum('train').spMax > 0 && sum('train').spCols.length === 1 && sum('train').spCols[0].toUpperCase() === String(A.up).toUpperCase(),
       '[B1] ★ (수리 전) 훈련 알갱이는 «재화와 무관한 앰버 하나»(FXPAL.up) — 등재문 ⓑ',
       '색 [' + (sum('train').spCols || []).join(',') + '] · ' + sum('train').spMax + '개');
    ok(flAll.every(v => v === 0), '[B2] ★ (수리 전) 세 자리 어디에도 «화폐 아이콘» 알갱이가 없다',
       flAll.join(' · '));
    ok((sum('train').payTxt || []).length > 0,
       '[B3] (수리 전) 훈련에서 `fxPay` 의 «−n» 금액이 뜬다(43회차) — 주인이 빼라고 한 것',
       (sum('train').payTxt || []).join(','));
    ok((sum('train').hbTxt || []).some(t => /−/.test(t)),
       '[B5] ★ (수리 전) 훈련 카드에도 488 회당 사다리의 «−n» 금액이 **따로** 있다 — 등재문이 안 적은 두 번째 자리',
       (sum('train').hbTxt || []).join(','));
  }else if(ERA === 'post583'){
    ok(sum('train').spMax === 0,
       '[B1] ★ (583 수리 후) 훈련의 앰버 알갱이는 화폐 알갱이로 **갈렸다**(겹쳐 쏘지 않는다)',
       '앰버 ' + sum('train').spMax + '개');
    ok(flAll.every(v => v >= 3)
       && sum('train').flCur[0] === 'gold' && sum('rune').flCur[0] === 'rstone' && sum('temper').flCur[0] === 'tstone',
       '[B2] ★ (583 수리 후) 세 자리가 각각 gold · rstone · tstone **비행** 알갱이를 쏜다',
       flAll.join(' · ') + ' [' + [sum('train').flCur, sum('rune').flCur, sum('temper').flCur].join(' / ') + ']');
    ok((sum('train').payTxt || []).length === 0,
       '[B3] ★ (수리 후) `fxPay` 의 «−n» 금액이 0건이다', (sum('train').payTxt || []).join(',') || '0건');
    ok(!(sum('train').hbTxt || []).some(t => /−/.test(t)),
       '[B5] ★ (수리 후) 훈련 카드의 488 사다리 «−n» 금액도 0건이다 — 주인이 지운 것은 «금액» 둘 다였다',
       '[' + (sum('train').hbTxt || []).join(',') + ']');
  }else{
    /* ⚑⚑ 660·678 이관 — **같은 질문을 다른 층에 던진다.** 583 은 «화폐가 연출에 나오는가» 를
       물었고 그 답이 그때는 «비행 알갱이»(`.fx-fly`)였다. 660 이 비행을 폐지하고 아이콘을
       **버스트 안**(`.fx-spark` 의 자식 `img.cic`)으로 옮겼으므로, 종전 두 항을 그대로 두면
       «폐지된 축이 있어야 통과» 가 된다(333). ⇒ 표본을 버스트로 옮기고 뜻은 그대로 둔다.
       ⚠ [B1] 의 «앰버 0» 도 뒤집힌다 — 660 뒤에는 **그 앰버가 곧 화폐 아이콘의 몸**이다. */
    const spAll = ['train', 'rune', 'temper'].map(k => (sum(k).spMax || 0));
    ok(spAll.every(v => v >= 3),
       '[B1] ★ (660 뒤) 세 자리 모두 버튼에서 **버스트가 난다** — 걷어낸 비행 대신 선 층이 있다',
       spAll.join(' · '));
    ok(flAll.every(v => v === 0)
       && (sum('train').spCur || [])[0] === 'gold' && (sum('rune').spCur || [])[0] === 'rstone'
       && (sum('temper').spCur || [])[0] === 'tstone',
       '[B2] ★ (660 뒤) 화폐 아이콘이 **버스트 안**에 있다(비행은 0) — gold · rstone · tstone',
       '비행 ' + flAll.join('·') + ' / 버스트 ['
         + [sum('train').spCur, sum('rune').spCur, sum('temper').spCur].join(' / ') + ']');
    ok((sum('train').payTxt || []).length === 0,
       '[B3] ★ (수리 후) `fxPay` 의 «−n» 금액이 0건이다', (sum('train').payTxt || []).join(',') || '0건');
    ok(!(sum('train').hbTxt || []).some(t => /−/.test(t)),
       '[B5] ★ (수리 후) 훈련 카드의 488 사다리 «−n» 금액도 0건이다 — 주인이 지운 것은 «금액» 둘 다였다',
       '[' + (sum('train').hbTxt || []).join(',') + ']');
  }
  ok((sum('train').dent || 0) > 0,
     '[B4] ★ 알약 «움푹»(.fx-pay)은 **수리 전후 모두** 1건이다 — 43회차의 «HUD 반응» 은 안 걷어냈다',
     sum('train').dent + '건');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  await b.close();
  console.log('\n=== probe583 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail) + ' ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
