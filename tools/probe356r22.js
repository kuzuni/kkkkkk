#!/usr/bin/env node
/* 356 22회차 재현기 — 21회차가 넘긴 넷째 프런티어 «문»: smoke.js 오프너 우주 ↔ scan356 SCREENS 차집합
 *
 *   node tools/probe356r22.js          # [1] 우주 파생 → [2] 차집합 → [3] 미커버 화면 COLLECT
 *   node tools/probe356r22.js --json
 *
 * 왜(338 규칙 — 처방 전에 재현):
 *   21회차 인계문: «SCREENS 는 이제 71화면이지만 smoke.js 오프너 우주와 아직 같지 않다(610 이
 *   351 에서 같은 병을 잡았다: 66 vs 54). 두 목록의 차집합을 한 번 찍어라.»
 *   smoke 오프너는 손 목록이 아니라 **살아 있는 DOM 의 속성 파생**이다(data-t·data-pop·data-mn·
 *   data-cur·data-eqslot·data-eqtab·data-costab·data-cat·data-dsub·data-trsub·data-ct·data-ptab …).
 *   ⇒ 이 자도 같은 속성에서 **같은 방식으로 파생**해 라벨 우주를 만들고, 각 라벨을 scan356
 *   SCREENS 의 어느 줄이 밟는지 명시 표(COVER)로 대조한다. 표에 없는 라벨 = 스코프 구멍 후보.
 *
 * ⚠ 파생 로직이 smoke.js 와 **두 벌**이 되는 위험(385 «자매 자 드리프트»)은 [0] 이 막는다 —
 *   smoke.js 소스에서 `label: '<접두>…'` 를 전수 추출해, 이 자가 모르는 접두가 생기면 빨개진다.
 *   (smoke 에 새 오프너 갈래가 생겼는데 이 자가 조용히 초록이 되는 길을 끊는다.)
 * ⚠ LESSONS 356-⑬ — 미커버 화면을 열 때는 «눌렀다» 가 아니라 «갔다» 를 서명으로 확인한다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, SCREENS, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

/* ---------- [0] 드리프트 가드 — smoke.js 의 라벨 접두 전수 ---------- */
/* 이 자가 아는 접두(= 아래 파생·COVER 가 다루는 갈래). smoke 소스에 이 밖의 접두가 생기면 FAIL. */
const KNOWN_PREFIX = [
  'tab:', 'side:', 'menu', 'util:chat', 'menu:', 'cur:', 'sub:', 'eqslot:', 'eqtab:',
  'costab:', 'cos:', 'shopcat:', 'shoplegal:', 'dunsub:', 'trsub:', 'prof:', 'rel:help',
  'colltab:', 'qtab:', 'pass:', 'ptab:',
];
function smokeLabelPrefixes() {
  const src = fs.readFileSync(path.join(__dirname, 'smoke.js'), 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/label:\s*'([^']+)'/g)) out.add(m[1]);
  for (const m of src.matchAll(/label:\s*'([^']+)'\s*\+/g)) out.add(m[1] + '*'); /* 동적 꼬리 */
  return [...out];
}

/* ---------- [2] 라벨 → SCREENS 커버 표 (명시적으로 적는다 — 판정 근거가 곧 문서다) ---------- */
/* 값: SCREENS 라벨(그 줄이 같은 화면을 밟는다) 또는 '−' = 화면이 아니라 항법(뒤로가기 등).
   함수 값은 라벨 나머지(k)를 받아 SCREENS 라벨을 돌려준다. 못 돌리면 미커버. */
const S_HAS = new Set(SCREENS.map(([l]) => l));
const COVER = {
  'tab:hero': 'A1 탭바 열림', 'tab:grow': '23 훈련', 'tab:adv': '03 던전',
  'tab:box': '89 유물', 'tab:shop': '10 상점',
  'side:attend': '70 출석', 'side:roul': '29 룰렛', 'side:quest': '22 퀘스트',
  'side:promo': '승급전', 'side:coll': '21 도감(스킬)', 'side:bless': '34 축복',
  menu: '52 메뉴', 'util:chat': '103 채팅',
  'menu:mail': '53 우편', 'menu:rank': '54 랭킹', 'menu:conf': '55 설정',
  'menu:bag': '56 가방', 'menu:guide': '55 길라잡이', 'menu:saver': '56 절전',
  'menu:pass': '35 패스(스테이지)', /* 같은 문(#menub→패스) — PASS_SCREENS 가 4탭 전부 밟는다 */
  'cur:gold': '33 재화 정보(골드)', 'cur:dia': '33 재화 정보(다이아)', 'cur:relic': '33 재화 정보(유물조각)',
  'eqslot:weapon': '05 장비 세부(무기)', 'eqslot:shield': '05 장비 세부(방패)', 'eqslot:amulet': '05 장비 세부(목걸이)',
  'eqtab:sk': '07 스킬', 'eqtab:pet': '26 펫', 'eqtab:cos': '50 코스튬',
  /* 50 시트 «안쪽» 서브탭 바 — heroSubGo(k)(index.html 33929)로 eqtab 과 **같은 렌더러**에 간다.
     22회차 [3] 실측: 네 문 전부 비균등 0 · 새 kind 0(노드 32/56/131/100) — 다른 문, 같은 화면. */
  'costab:eq': '06 장비', 'costab:sk': '07 스킬', 'costab:cos': '50 코스튬', 'costab:pet': '26 펫',
  'cos:data-coshelp': '50 코스튬 도움말(269)',
  'cos:data-coswear': '50 코스튬', /* [착용] — 같은 시트의 상태 변화(팝업 없음) */
  'cos:data-cosup': '50 코스튬', /* [강화] — 같은 시트의 상태 변화(토스트뿐) */
  'cos:data-cospromo': '승급전', /* openPromo() — side:promo 와 같은 #prw 팝업(index.html 32823 근처) */
  'cos:data-cosun': '08 코스튬 세부', /* showCosDetail() — 08 껍데기 상세 */
  'shopcat:summon': '10 상점', /* 상점 기본 탭 = 소환 */
  'shopcat:coin': '13 재화 탭', 'shopcat:pass': '124 이용권 탭',
  'shoplegal:coin': '13 재화 청약철회(478)', 'shoplegal:pass': '124 이용권 청약철회(478)',
  'dunsub:dun': '03 던전', /* 기본 서브탭 */
  'dunsub:raid': '03 레이드', 'dunsub:tower': '03 탑',
  'trsub:train': '23 훈련', /* 기본 서브탭 */
  'trsub:rune': '23 룬', 'trsub:temper': '23 단련',
  'prof:19': '19 프로필', 'prof:20-스펙': '20 스펙',
  'rel:help': '89 유물 도움말(429)',
  'colltab:skill': '21 도감(스킬)', 'colltab:weapon': '21 도감(무기)', 'colltab:shield': '21 도감(방패)',
  'colltab:amulet': '21 도감(목걸이)', 'colltab:pet': '21 도감(펫)', 'colltab:relic': '21 도감(유물)',
  'qtab:daily': '22 퀘스트', /* 기본 토글 = 일일 */
  'qtab:rep': '22 퀘스트(반복)',
  'pass:35': '35 패스(스테이지)', 'pass:back': '−', /* 항법 — 화면이 아니다 */
  'ptab:stage': '35 패스(스테이지)', 'ptab:tower': '35 패스(시련의 탑)',
  'ptab:tower2': '35 패스(절망의 탑)', 'ptab:att': '35 패스(출석)',
};

/* ---------- [1] 우주 파생 — smoke.js [2] 절과 같은 속성·같은 순서 ---------- */
async function deriveUniverse(page) {
  const U = [];
  const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t));
  const pops = await page.$$eval('.side .ibtn[data-pop]', (els) => els.map((e) => e.dataset.pop));
  tabs.forEach((t) => U.push('tab:' + t));
  pops.forEach((p) => U.push('side:' + p));
  if (await page.$('#menub')) U.push('menu');
  if (await page.$('#chw')) U.push('util:chat');
  const mns = await page.$$eval('#mnw [data-mn]', (els) => els.map((e) => e.dataset.mn)).catch(() => []);
  mns.forEach((k) => U.push('menu:' + k));
  const curs = await page.$$eval('[data-cur]', (els) => els.map((e) => e.dataset.cur)).catch(() => []);
  [...new Set(curs)].forEach((c) => U.push('cur:' + c));
  const subs = await page.$$eval('#panel [id^="b"][class*="sub"], #panel .sub [data-sub], #panel .subtab',
    (els) => els.map((e) => e.id || e.dataset.sub || e.textContent.trim()).filter(Boolean)).catch(() => []);
  subs.forEach((s) => U.push('sub:' + s));
  await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot)).catch(() => []);
  slots.forEach((k) => U.push('eqslot:' + k));
  const eqtabs = await page.$$eval('#eqTabs [data-eqtab]', (els) => els.map((e) => e.dataset.eqtab)).catch(() => []);
  eqtabs.forEach((k) => U.push('eqtab:' + k));
  /* smoke 는 여기서 cos 탭을 실제로 연다(50 시트 안 버튼 5종은 그래야 DOM 에 있다) */
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click()).catch(() => {});
  await page.waitForTimeout(400);
  const costabs = await page.$$eval('#bCos [data-costab]', (els) => els.map((e) => e.dataset.costab)).catch(() => []);
  costabs.forEach((k) => U.push('costab:' + k));
  for (const b of ['data-coswear', 'data-cosup', 'data-cospromo', 'data-cosun', 'data-coshelp'])
    if (await page.$(`#bCos [${b}]`)) U.push('cos:' + b);
  await page.click('.tab[data-t="shop"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
  cats.forEach((k) => U.push('shopcat:' + k));
  if (await page.$('#shopLegal')) ['coin', 'pass'].forEach((k) => U.push('shoplegal:' + k));
  await page.click('.tab[data-t="adv"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const dsubs = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => e.dataset.dsub)).catch(() => []);
  dsubs.forEach((k) => U.push('dunsub:' + k));
  await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const tsubs = await page.$$eval('#trSubs [data-trsub]', (els) => els.map((e) => e.dataset.trsub)).catch(() => []);
  tsubs.forEach((k) => U.push('trsub:' + k));
  if (await page.$('#profBtn')) { U.push('prof:19'); U.push('prof:20-스펙'); }
  /* smoke 는 rel:help 판정 전에 보물상자 탭을 실제로 연다(#relw 는 그래야 채워진다) */
  await page.click('.tab[data-t="box"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(400);
  if (await page.$('#relw [data-rlhelp]')) U.push('rel:help');
  if (await page.$('.side .ibtn[data-pop="coll"]')) {
    const cts = await page.$$eval('#collTabs .cltab[data-ct]', (els) => els.map((e) => e.dataset.ct)).catch(() => []);
    cts.forEach((k) => U.push('colltab:' + k));
  }
  U.push('qtab:daily'); U.push('qtab:rep');
  if (await page.$('#psw')) {
    U.push('pass:35');
    for (const k of ['stage', 'tower', 'tower2', 'att']) U.push('ptab:' + k);
    U.push('pass:back');
  }
  return [...new Set(U)];
}

(async () => {
  const res = { prefixGuard: [], universe: [], uncovered: [], deadCover: [], scans: [], errs: [] };

  /* [0] 접두 드리프트 가드 (정적 — 브라우저 불요) */
  for (const lbl of smokeLabelPrefixes()) {
    const known = KNOWN_PREFIX.some((p) => lbl === p || lbl.startsWith(p) || (p.endsWith(':') && lbl.replace(/\*$/, '').startsWith(p)));
    if (!known) res.prefixGuard.push(lbl);
  }

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  res.universe = await deriveUniverse(page);
  await ctx.close();

  /* [2] 차집합 — 우주의 각 라벨이 SCREENS 어느 줄로 커버되는가 */
  for (const lbl of res.universe) {
    const c = COVER[lbl];
    if (c === undefined) { res.uncovered.push(lbl); continue; }
    if (c !== '−' && !S_HAS.has(c)) res.deadCover.push(lbl + ' → ' + c + ' (SCREENS 에 그 줄이 없다)');
  }
  /* COVER 에 적혀 있는데 우주에 더 이상 없는 라벨 — 죽은 표(기록만, 판정 아님) */
  const uniSet = new Set(res.universe);
  res.staleCover = Object.keys(COVER).filter((k) => !uniSet.has(k));

  /* [3] 미커버 라벨이 있으면 그 문을 열고 COLLECT 로 비균등을 잰다 */
  for (const lbl of res.uncovered) {
    /* 미커버 라벨의 문은 라벨에서 역산한다 — 접두별 진입 경로는 smoke.js 와 같다 */
    const [pfx, k] = lbl.includes(':') ? [lbl.slice(0, lbl.indexOf(':') + 1), lbl.slice(lbl.indexOf(':') + 1)] : [lbl, ''];
    const DOOR = {
      'tab:': [`.tab[data-t="${k}"]`], 'side:': [`.side .ibtn[data-pop="${k}"]`],
      'menu:': ['#menub', `#mnw [data-mn="${k}"]`], 'cur:': [`[data-cur="${k}"]`],
      'eqslot:': ['.tab[data-t="hero"]', `#eqCards [data-eqslot="${k}"]`],
      'eqtab:': ['.tab[data-t="hero"]', `#eqTabs [data-eqtab="${k}"]`],
      'costab:': ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', `#bCos [data-costab="${k}"]`],
      'shopcat:': ['.tab[data-t="shop"]', `#shopCats .shp-ct[data-cat="${k}"]`],
      'dunsub:': ['.tab[data-t="adv"]', `#dunSub [data-dsub="${k}"]`],
      'trsub:': ['.tab[data-t="grow"]', `#trSubs [data-trsub="${k}"]`],
      'colltab:': ['.side .ibtn[data-pop="coll"]', `#collTabs .cltab[data-ct="${k}"]`],
      'ptab:': ['#menub', '#psGo', `#psBar [data-ptab="${k}"]`],
    }[pfx];
    if (!DOOR) { res.errs.push(lbl + ': 문 역산 불가 — 손으로 열어 볼 것'); continue; }
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    try {
      await p2.goto(URL, { waitUntil: 'load' });
      await p2.waitForTimeout(700);
      for (const s of DOOR) {
        const ok = await STEP(p2, s);
        if (!ok) res.errs.push(`${lbl}: 무음 실패 — '${s}'`);
        await p2.waitForTimeout(420);
      }
      const got = await p2.evaluate(COLLECT, {});
      const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
      res.scans.push({ label: lbl, nodes: got.length, bad: bad.map((b) => ({ sel: b.sel, ratio: b.ratio, w: b.w, h: b.h })) });
    } catch (e) { res.errs.push(lbl + ': ' + String(e.message || e).split('\n')[0]); }
    await c2.close();
  }
  await browser.close();

  /* ---------- 판정 ---------- */
  let pass = 0, fail = 0;
  const say = (ok, name, extra) => {
    ok ? pass++ : fail++;
    if (!JSON_OUT) console.log(`  ${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`);
  };
  if (!JSON_OUT) console.log(`[probe356r22] smoke 오프너 우주 ${res.universe.length}라벨 · SCREENS ${SCREENS.length}화면`);
  say(res.prefixGuard.length === 0, '[0] smoke.js 라벨 접두가 전부 아는 갈래다', res.prefixGuard.join(', '));
  say(res.uncovered.length === 0, '[2-a] 우주 전 라벨이 SCREENS 에 커버된다',
    res.uncovered.length ? '미커버: ' + res.uncovered.join(', ') : `${res.universe.length}/${res.universe.length}`);
  say(res.deadCover.length === 0, '[2-b] COVER 가 가리키는 SCREENS 줄이 전부 실재한다', res.deadCover.join(', '));
  for (const s of res.scans)
    say(s.bad.length === 0, `[3] 미커버 «${s.label}» 비균등 0 (노드 ${s.nodes})`,
      s.bad.map((b) => `${b.sel} ${b.ratio}`).join(', '));
  say(res.errs.length === 0, '[E] 무음 실패 0', res.errs.join(' · '));
  if (res.staleCover.length && !JSON_OUT)
    console.log(`  (기록) COVER 에만 있고 우주에 없는 라벨 ${res.staleCover.length}: ${res.staleCover.join(', ')}`);

  if (JSON_OUT) console.log(JSON.stringify(Object.assign({ pass, fail }, res), null, 1));
  else console.log(`[probe356r22] ${pass}/${pass + fail}${fail ? ' FAIL' : ' PASS'}`);
  process.exit(fail ? 1 : 0);
})();
