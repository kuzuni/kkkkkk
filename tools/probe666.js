/* 작업 666 재현 프로브 — «유물 소환 텍스트 이펙트 폐지 · 소환 버튼에서 유물화폐 아이콘 버스트»
 *
 *   node tools/probe666.js
 *
 * 338·341·350·363·372·429 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * 주인 원문: «유물소환부분도 텍스트로 존나 이펙트 하는거 빼기. 그리고 유물소환 버튼에서
 *            유물화폐 아이콘 파티클 이펙트 떠야함».
 *
 * 등재문(PROGRESS 666)의 주장은 셋이다 —
 *   ⓐ 89 유물 소환에 «텍스트가 떠오르는 이펙트»(숫자·문구 플로터)가 실제로 있다
 *   ⓑ 파티클은 있는데 **버튼이 아닌 자리**(격자 칸)에서 태어난다
 *   ⓒ 그 파티클의 그림은 유물화폐 아이콘이 아니라 크림 구슬이다
 *
 * 이 자가 세는 것은 **찍힌 노드**다(코드 grep 이 아니다). `#fxl` 에 붙는 순간을 MutationObserver 로
 * 잡아 종류·문자열·태어난 좌표를 기록하고, 그 좌표가 «소환 버튼 상자 안인가 · 격자 상자 안인가» 를 가른다.
 *
 * 절:
 *   [1] 단발 소환 1회 — 뜨는 노드 전수(텍스트 · 파티클 · 파티클의 그림)
 *   [2] 홀드 1.5초    — 소환 N회 ↔ 텍스트 N · 파티클 자리 분포(1:1 축의 전제)
 *   [3] 자리         — 파티클 발화점이 «버튼 밖» 인 건수(등재문 ⓑ)
 *   [4] 그림         — 파티클이 `img.cic`(125 규약 자산)를 물고 있는가(등재문 ⓒ)
 *   [5] 대조         — 660 이 끝낸 23 훈련(단련 행)은 이미 «버튼 발 · 아이콘 버스트» 인가
 *   [6] 콘솔 에러 0
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464·498·520 규약).
 *   구조 축([5]·[6])은 수리 전·후 같은 답이고, 갈리는 것은 [1]~[4] 의 **건수**뿐이라 `info` 로 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const HOLD = 1500;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 페이지 안에 심는 «연출 레이어 관찰자» — `#fxl` 에 붙는 순간의 모습을 그대로 적는다.
   ⚠ 좌표는 **붙은 직후**에 잰다(애니메이션이 옮기기 전) — «어디서 태어났는가» 가 이 자의 축이다. */
const WATCH = () => {
  window.__p666 = { nodes: [], sum: 0 };
  const L = document.getElementById('fxl');
  const snap = (el) => {
    let r = null;
    try { r = el.getBoundingClientRect(); } catch (_) {}
    const im = el.querySelector && el.querySelector('img.cic');
    window.__p666.nodes.push({
      cls: (el.className || '') + '',
      txt: (el.textContent || '').trim().slice(0, 24),
      x: r ? r.left + r.width / 2 : null,
      y: r ? r.top + r.height / 2 : null,
      w: r ? r.width : null, h: r ? r.height : null,
      ic: im ? (im.getAttribute('data-cur-ic') || '?') : null
    });
  };
  new MutationObserver(ms => {
    for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) snap(n);
  }).observe(L, { childList: true });
  /* 소환 횟수는 제품 함수를 감싸 센다(349·354 규약 — 화면이 아니라 실제 호출을 센다)
     ⚑⚑ 793 이관 — 감는 자리가 `summonRelic` → **`summonRelicBatch`** 다. 700(배수 토글)이
     홀드 틱·첫 발을 `summonRelicBatch(relMul, …)` 로 갈아 `summonRelic` 은 아무도 안 부르는
     껍데기가 됐고, 옛 훅은 그 껍데기를 감고 있어 [1-a]·[2-a] 두 **전제**가 «0회» 로 빨갰다
     (수리 전 실측 3/5). 단위는 «장» 이 아니라 «실행» 이다 — 700 규약이 «1 실행 = 버스트 1회» 라
     이 자의 [2] «소환당 텍스트 n장» 도 실행 기준으로 읽어야 뜻이 산다. */
  const o = window.summonRelicBatch;
  window.summonRelicBatch = function () { const r = o.apply(this, arguments); if (r) window.__p666.sum++; return r; };
};

const RESET = () => { window.__p666.nodes = []; window.__p666.sum = 0;
  const L = document.getElementById('fxl'); while (L.firstChild) L.removeChild(L.firstChild); };

/* 「버튼 안 / 격자 안 / 그 밖」 — 발화점을 세 갈래로 가른다 */
const SPLIT = () => {
  const b = document.getElementById('rwBasin').getBoundingClientRect();
  const g = document.getElementById('rwGrid').getBoundingClientRect();
  const inR = (r, n) => n.x != null && n.x >= r.left && n.x <= r.right && n.y >= r.top && n.y <= r.bottom;
  const N = window.__p666.nodes;
  const spark = N.filter(n => /fx-spark/.test(n.cls));
  const text = N.filter(n => /fx-delta|fx-plus/.test(n.cls));
  return {
    sum: window.__p666.sum,
    all: N.length,
    text: text.length, texts: text.map(n => n.cls.split(/\s+/)[0] + ':' + n.txt).slice(0, 12),
    spark: spark.length,
    sparkIn: spark.filter(n => inR(b, n)).length,
    sparkGrid: spark.filter(n => !inR(b, n) && inR(g, n)).length,
    sparkOut: spark.filter(n => !inR(b, n) && !inR(g, n)).length,
    sparkIc: spark.filter(n => n.ic).length,
    icKeys: [...new Set(spark.map(n => n.ic).filter(Boolean))],
    kinds: [...new Set(N.map(n => n.cls.split(/\s+/)[0]))],
    basin: { x: b.left, y: b.top, w: b.width, h: b.height }
  };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const cdp = await p.context().newCDPSession(p);
  const box = async sel => {
    const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
    return r;
  };
  const holdTouch = async (c, ms) => {
    if (!c) return;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
  };
  const tapTouch = async (c) => {
    if (!c) return;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(420);
  };

  /* ── 대조군([5])을 **먼저** 잰다 — 89 페이지를 열고 닫은 뒤에 재면 23 훈련 시트가 그 프레임에
     아직 자리를 못 잡아 터치가 헛나간다(1회차에 «파티클 0» 이 그래서 나왔다). 순서만 바꾼다. */
  await ev(p, WATCH);
  const CTL = await (async () => {
    const okOpen = await ev(p, () => { try { openTrain(); setTrSub('temper'); S.tstone = 1e12; renderTrain(); }
      catch (_) { return false; } return !!document.querySelector('.tr-tp .tb'); });
    if (!okOpen) return null;
    await p.waitForTimeout(400);
    await ev(p, RESET);
    await holdTouch(await box('.tr-tp .tb'), 900);
    return ev(p, () => {
      const b = document.querySelector('.tr-tp .tb').getBoundingClientRect();
      const N = window.__p666.nodes.filter(n => /fx-spark/.test(n.cls));
      const inR = n => n.x != null && n.x >= b.left && n.x <= b.right && n.y >= b.top && n.y <= b.bottom;
      return { spark: N.length, inB: N.filter(inR).length, ic: N.filter(n => n.ic).length,
               keys: [...new Set(N.map(n => n.ic).filter(Boolean))] };
    });
  })();

  /* 89 유물 페이지를 열고 조각을 넉넉히 심는다(274 — 비용은 상수 100) */
  await ev(p, () => { try { closeModal(); closeTrain(); closeDungeon(); } catch (_) {}
    S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RESET);

  blk('[1] 단발 소환 1회 — #fxl 에 뜨는 노드 전수');
  await ev(p, RESET);
  await tapTouch(await box('#rwBasin'));
  const A = await ev(p, SPLIT);
  if (A) {
    info('소환 ' + A.sum + '회 · 노드 ' + A.all + '개 · 종류 ' + A.kinds.join(','));
    info('텍스트 플로터 ' + A.text + '건', A.texts.join(' | ') || '없음');
    info('파티클 ' + A.spark + '개 — 버튼 안 ' + A.sparkIn + ' · 격자 안 ' + A.sparkGrid + ' · 그 밖 ' + A.sparkOut);
    info('파티클 중 재화 아이콘(img.cic) ' + A.sparkIc + '개', A.icKeys.join(',') || '없음');
    /* ⚠ 문턱이 «= 1» 이 아닌 이유(계측 아티팩트) — CDP `Input.dispatchTouchEvent` 는 호환 마우스
       이벤트를 하나 더 내보내 같은 리스너가 두 번 돈다(실측: 탭 1회 → 소환 2회). 제품 쪽은
       `#relw #rwBasin{touch-action:none}` 이라 실기기에서는 안 겹친다. 이 자의 축은 «몇 번 눌렸나» 가
       아니라 «한 번의 소환이 무엇을 띄우나» 라 소환 수로 나눠 본다(아래 «소환당» 값). */
    ok(A.sum >= 1, '[1-a] 단발 탭이 소환을 돌린다(전제)', A.sum + '회');
  } else ok(false, '[1] 측정 실패');

  blk('[2] 홀드 1.5초 — 소환 N회 ↔ 연출 분포');
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const B = await ev(p, SPLIT);
  if (B) {
    info('소환 ' + B.sum + '회 · 노드 ' + B.all + '개');
    info('텍스트 플로터 ' + B.text + '건 (소환당 ' + (B.sum ? (B.text / B.sum).toFixed(2) : '—') + '장)', B.texts.join(' | ') || '없음');
    info('파티클 ' + B.spark + '개 — 버튼 안 ' + B.sparkIn + ' · 격자 안 ' + B.sparkGrid + ' · 그 밖 ' + B.sparkOut);
    info('파티클 중 재화 아이콘 ' + B.sparkIc + '개', B.icKeys.join(',') || '없음');
    ok(B.sum >= 4, '[2-a] 홀드가 여러 번 소환한다(전제 · 488 [E1] 과 같은 문턱)', B.sum + '회');
  } else ok(false, '[2] 측정 실패');

  blk('[3]·[4] 등재문 세 주장의 판정 (수리 전이면 ⓐⓑⓒ 가 참 = 결손 실재)');
  const T = (A && B) ? { text: A.text + B.text, spark: A.spark + B.spark,
                         out: A.sparkGrid + A.sparkOut + B.sparkGrid + B.sparkOut,
                         inB: A.sparkIn + B.sparkIn, ic: A.sparkIc + B.sparkIc, sum: A.sum + B.sum } : null;
  if (T) {
    info('합계 — 소환 ' + T.sum + ' · 텍스트 ' + T.text + ' · 파티클 ' + T.spark
       + ' (버튼 안 ' + T.inB + ' · 버튼 밖 ' + T.out + ') · 아이콘 ' + T.ic);
    info('ⓐ 텍스트 이펙트가 있는가', T.text > 0 ? '예 — ' + T.text + '건' : '아니오 — 0건');
    info('ⓑ 파티클이 버튼 밖에서 태어나는가', T.out > 0 ? '예 — ' + T.out + '개' : '아니오 — 0개');
    info('ⓒ 파티클 그림이 유물화폐 아이콘이 아닌가', T.ic < T.spark ? '예 — 아이콘 ' + T.ic + '/' + T.spark : '아니오 — 전부 아이콘');
  }

  blk('[5] 대조 — 660 이 끝낸 23 훈련(단련 행)은 이미 «버튼 발 · 아이콘 버스트» 인가 (맨 처음 측정분)');
  if (CTL) info('단련 홀드 — 파티클 ' + CTL.spark + ' · 버튼 안 ' + CTL.inB + ' · 아이콘 ' + CTL.ic + ' ' + (CTL.keys.join(',') || ''));
  ok(!!CTL && CTL.spark > 0, '[5-a] 대조군(단련)이 실제로 파티클을 낸다 — 이 자의 눈금이 살아 있다는 증거',
     CTL ? CTL.spark + '개' : '측정 실패');
  ok(!!CTL && CTL.ic > 0 && CTL.inB === CTL.spark,
     '[5-b] 대조군은 이미 «버튼 안 · 재화 아이콘» 이다 — 666 이 맞출 목표가 저장소 안에 실물로 있다',
     CTL ? '버튼 안 ' + CTL.inB + '/' + CTL.spark + ' · 아이콘 ' + CTL.ic : '측정 실패');

  blk('[6] 콘솔 에러');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\n결과: ' + pass + ' / ' + (pass + fail) + (fail ? '  ❌ FAIL ' + fail : '  ✅ PASS'));
  process.exit(fail ? 1 : 0);
})();
