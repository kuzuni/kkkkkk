#!/usr/bin/env node
/* 작업 754 — 팝업·오버레이 «앵커/피벗» 전면 감사 재현기
 *
 *   node tools/probe754.js               # 전 오버레이 × 프레임 5종 스윕
 *   node tools/probe754.js --only statw  # 한 호스트만
 *   node tools/probe754.js --json        # 원자료(JSON)
 *
 * ── 무엇을 재는가 ────────────────────────────────────────────────────────────
 * 등재문(754)의 증상은 «넓은(= 세로가 짧은) 화면에서 한 오버레이 안의 요소들이
 * 제각각의 높이로 흩어지고 겹친다» 다. 그 뿌리는 **요소마다 앵커 기준이 다른 것**이므로
 * 재현기는 «어긋난 그림» 이 아니라 **앵커 계수 k** 를 잰다.
 *
 *   k = Δ(요소의 프레임 y) / Δ(프레임 높이)
 *
 *   k = 0.0  → 프레임 **상단** 앵커(top:<abs>)
 *   k = 0.5  → 프레임 **중앙** 앵커(top:calc(50% − …))
 *   k = 1.0  → 프레임 **하단** 앵커(bottom:<abs>)
 *
 * 한 오버레이 **안**의 요소가 서로 다른 k 를 가지면 프레임 높이가 바뀔 때
 * 요소끼리의 상대 거리가 벌어진다 = 등재문이 말한 «요소별로 앵커 기준이 다르다».
 *
 * ⚑ **판정은 «k 의 종류 수» 가 아니다(1회차에 세 번 고쳤다).** 종류 수만 세면
 * 351·403·404 가 «잘림을 막으려고» 넣어 둔 설계가 전부 ❌ 로 찍힌다 — 그릇이 짧은 프레임에서
 * 줄어들고 그 **하변**에 매달린 자식이 따라 올라오는 것은 **맞게 매달린** 것이다.
 * 그래서 두 겹으로 판정한다:
 *   ⓐ 요소가 그릇의 상변·하변·중앙 **어느 하나에도** 안 붙었나 (= 아무 데도 안 매달림)
 *   ⓑ 한 그릇 안에서 기준이 갈린 형제 쌍의 **간극이 지원 범위 안에서 무너지나**
 *      (`overlap` = 0 이하로 겹침 · `collapse` = 최댓값의 1/4 미만으로 붕괴 · 아니면 `관찰`)
 * 17 이 −35px(겹침), 18 이 703 → 23px(붕괴)로 잡힌 것이 이 축이다. 420-③ 대로 최악을
 * 1600 으로 가정하지 않고 프레임 5종을 다 재서 최솟값을 쓴다.
 *
 * 프레임 5종은 화면비 5종과 같은 말이다 — `fit()` 이 frameH 를 1600..2600 으로
 * clamp 하므로(9:13.3 보다 넓은 화면은 전부 1600 으로 눌린다) **레이아웃이 갈리는 축은
 * frameH 하나**다: 1600(9:13.3 및 그보다 넓은 전부) · 1841(`.shortf` 경계 바로 아래) ·
 * 1920(9:16) · 2280(9:19 = 기준) · 2600(clamp 상한).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const ARG = process.argv.slice(2);
const ONLY = (ARG.indexOf('--only') >= 0) ? ARG[ARG.indexOf('--only') + 1] : null;
const JSONOUT = ARG.includes('--json');

/* ── 754 예외 목록 ────────────────────────────────────────────────────────────
 * 규약 ① 은 «하단 고정이 정당한 것(바닥 시트·탭바)만 예외 목록으로 명시» 다.
 * 여기 적힌 것만 «묶음 밖의 하단 앵커» 로 인정되고, 나머지 하단 앵커는 전부 결함이다.
 * 목록을 늘릴 때는 **왜 그 자리가 바닥에 매달려야 하는지**를 같이 적어라 —
 * 적을 말이 없으면 그것은 예외가 아니라 아직 안 고친 자리다. */
const EXEMPT = [
  { sel: '.upr-close', why: '«터치하여 닫기» — 탭바 상단 기준(09·17·18 공용 부품, index.html .upr-close 주석)' },
  { sel: '.sm-close',  why: '«터치하여 닫기» — 12 소환 결과의 같은 부품' },
  { sel: '#psBar',     why: '35 패스 하단 고정 바 — 탭바 자리를 대신하는 바' },
  /* 3회차 등재(위임 규약 채택) — 56 절전은 **잠금화면**이고 이 줄은 그 화면의 «밀어서 잠금 해제»
     안내다. 바닥에 매달리는 것이 곧 뜻이라 규약 ① 의 «바닥 시트» 예외와 같은 자리이고,
     **351 6회차가 이미 클램프를 씌워 놓았다** — `bottom:min(195px, calc(100% − 1561px))` 이라
     통계 패널 하변 + 여백 30 위로는 올라오지 못한다. 그래서 간극이 1600 에서 30 으로 멈추고
     **겹침은 어떤 프레임에서도 0** 이다(1600:30 · 1841:115 · 1920:194 · 2280:554 · 2600:874).
     ⚠ 자의 ⓑ 축(«최댓값의 1/4 미만이면 붕괴»)은 **하한이 상수로 박힌 쌍**을 붕괴로 읽는다 —
     30 은 무너진 값이 아니라 351 이 고른 여백이다. 되돌리는 법: 이 줄을 빼면 [❌] 로 돌아온다. */
  { sel: '.sv-hint',   why: '56 절전(잠금화면) «밀어서 잠금 해제» — 바닥 매달림이 곧 뜻 · 351 클램프가 여백 30 을 바닥으로 보장(겹침 0)' },
];
const isExempt = (key) => EXEMPT.some((e) => key === e.sel || key.startsWith(e.sel + '['));

/* 프레임 5종(= 화면비 5종). 폭은 1080 고정이라 뷰포트 높이 = frameH 다. */
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const BASE = 2280;                    /* 기준 해상도(지시서 [2]) */

/* 감사 대상 — «딤 위에 요소가 떠 있는» 오버레이가 1순위다(요소별 앵커가 가능한 구조).
   sel = 호스트, open = 페이지 안에서 평가할 여는 코드. */
const HOSTS = [
  { id: '17',  name: '스탯업(능력 획득)', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})` },
  { id: '09',  name: '일괄강화결과',      sel: '#upw',   open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))` },
  { id: '31',  name: '던전클리어',        sel: '#dclw',  open: `openDunClear(DUNGEONS[0],1,false,false)` },
  { id: '18',  name: '패배화면',          sel: '#defw',  open: `openDefeat()` },
  { id: '12',  name: '소환결과',          sel: '#sumw',  open: `showSummonResult('weapon',10,SKILLS.concat(PETS).slice(0,10).map(it=>({it})),0)` },
  { id: '01',  name: '오프라인보상',      sel: '#offw',  open: `showOfflineReward(7200,12000,30)` },
  { id: '34',  name: '축복',              sel: '#blsw',  open: `openBless()` },
  { id: '35',  name: '패스',              sel: '#psw',   open: `openPass('stage')` },
  { id: '70',  name: '출석',              sel: '#modal', open: `openAttend()` },
  { id: '22',  name: '퀘스트',            sel: '#modal', open: `openQuest()` },
  { id: '29',  name: '룰렛',              sel: '#modal', open: `openRoulette()` },
  { id: '23',  name: '훈련',              sel: '#trw',   open: `openTrain()` },
  { id: '53',  name: '가방',              sel: '#bagw',  open: `openBag()` },
  { id: '21',  name: '도감보너스',        sel: '#collw', open: `openColl21()` },
  { id: '33',  name: '재화정보',          sel: '#ciw',   open: `openCurInfo('gold')` },
  { id: '19',  name: '프로필',            sel: '#pfw',   open: `openProfile()` },
  { id: '20',  name: '종합스탯',          sel: '#specw', open: `openSpec()` },
  { id: '11',  name: '소환확률정보',      sel: '#prbw',  open: `openProbInfo('weapon',1)` },
  { id: '05',  name: '무기팝업',          sel: '#wpnw',  open: `openWeapon(null,'weapon')` },
  { id: '103', name: '채팅',              sel: '#chw',   open: `document.querySelector('#botleft .ubtn[data-util="chat"]').click()` },
  /* ⚑ 3회차 정정 — 1·2회차의 이 줄은 **두 군데가 틀렸다**(21종 중 유일한 MISSING 이었다):
     `#svw` 는 55 설정이 아니라 **56 절전 모드**이고, 그 오프너 이름은 `openSave` 가 아니라
     `openSaver()` 다(index.html ~38123). 55 설정 팝업의 호스트는 `#cfw`·`openConf()`(~35072)다.
     ⇒ 55 를 제 호스트로 돌리고, 잘못 적힌 김에 표본 밖이던 56 도 같이 세웠다. */
  { id: '55',  name: '설정',              sel: '#cfw',   open: `openConf()` },
  { id: '56',  name: '절전 모드',          sel: '#svw',   open: `openSaver()` },
  /* ⚑ 5회차 편입 — 1~4회차 표본은 `tools/smoke.js` 의 오프너 목록보다 **좁았다**.
     smoke 가 여는 `#*w` 호스트 18종 중 아래 여섯이 표본 밖이었다(= 한 번도 안 재 봤다).
     주인 지시 문면이 «전 팝업·오버레이 오프너 목록(smoke 66/최신)» 이므로 이 여섯이 빠진 채로는
     «전면 스윕» 이 아니다. ⚠ 이 여섯은 팝업이 아니라 **탭/페이지 시트**가 섞여 있다 —
     하단 앵커가 정당한 자리가 더 많을 수 있으니 [❌] 가 나오면 «예외인가» 를 먼저 물어라. */
  { id: '03',  name: '던전 페이지',        sel: '#dunw',  open: `openDungeon()` },
  { id: '10',  name: '상점 페이지',        sel: '#shopw', open: `openShopPage()` },
  { id: '89',  name: '유물 소환',          sel: '#relw',  open: `openRelw()` },
  { id: '52',  name: '▦ 메뉴',            sel: '#mnw',   open: `openMenu()` },
  { id: '54',  name: '랭킹',              sel: '#rkw',   open: `openRank()` },
  /* 06 장비 시트는 «여는 함수» 가 없다 — 패널 상태(panelOpen · curTab · heroTab)의 파생이다.
     그래서 상태를 만들고 동기화 함수를 부르는 것이 이 화면의 오프너다. */
  { id: '06',  name: '장비 시트',          sel: '#eqw',   open: `panelOpen = true; curTab = 'hero'; heroTab = 'eq'; syncPanel()` },
];

/* 한 호스트의 «떠 있는 자식» 기하를 프레임 좌표로 훑는다.
   - 대상은 position:absolute|fixed 인 자식(= 앵커를 스스로 정하는 것)만. static/relative 는
     부모 흐름을 따르므로 앵커 축이 아니다.
   - 깊이는 3대까지. 그 아래는 부모 상자를 따라오므로 같은 k 를 반복해 세게 된다.
   ⚑ **자를 두 번 고쳤다(1회차)** — 첫 판에서 나온 ❌ 11건 중 셋(23 훈련 · 103 채팅 · 일부 «k0.15»)이
     **유령**이었다. 뿌리는 «무엇을 기준으로 k 를 재는가» 하나다(LESSONS 335 «앵커가 둘»):
     ⓐ **k 는 프레임이 아니라 «자기 담는 상자» 기준이어야 한다.** 부모가 통째로 움직이면 자식도
        같이 움직이는데, 프레임 기준으로 재면 그 자식이 «다른 앵커» 로 찍힌다. 실제로 103 채팅은
        `#chList`(하단 앵커 스크롤러) **안**의 말풍선 77개가 전부 «bottom» 으로 찍혀 ❌ 였지만,
        리스트 기준으로는 **전부 k 0** = 한 그릇이다. 결함이 아니라 **자가 부모를 안 본 것**이다.
     ⓑ **딤·전면 덮개는 요소가 아니다.** `inset:0` 짜리 층(23 훈련 `.tr-dim`)은 프레임을 그대로
        따라가므로 k 0 으로 찍히는데, 그것과 시트(k 1)를 «앵커 2종» 으로 세면 모든 바닥 시트가 ❌ 다.
     ⓒ **스크롤 그릇 «안» 은 앵커 축이 아니다** — 내용 흐름이라 프레임과 무관하게 움직인다. */
const PROBE = (SEL) => `(() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const fy = (v) => Math.round((v - A.top) * 100) / 100;
  const vis = (e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  let host = null;
  for (const s of ${JSON.stringify(SEL)}.split(',')) {
    const e = document.querySelector(s.trim()); if (e && vis(e)) { host = e; break; }
  }
  if (!host) return { missing: true };
  const tag = (e) => e.id ? '#' + e.id
    : '.' + ((e.className || '').toString().trim().split(/\\s+/).filter(Boolean).join('.') || e.tagName.toLowerCase());
  const HR = host.getBoundingClientRect();
  const scrolly = (e) => { const cs = getComputedStyle(e); return /auto|scroll/.test(cs.overflowY); };
  const kids = [...host.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *')]
    .filter(vis)
    .filter((e) => { const p = getComputedStyle(e).position; return p === 'absolute' || p === 'fixed'; })
    /* ⓑ 전면 덮개(딤) 제외 — 호스트를 9할 이상 덮고 상변이 호스트와 같은 층 */
    .filter((e) => { const r = e.getBoundingClientRect();
      return !(r.height >= HR.height * 0.9 && Math.abs(r.top - HR.top) < 3); })
    /* ⓒ 스크롤 그릇 «안» 제외 — 호스트까지 올라가며 스크롤러를 만나면 앵커 축이 아니다 */
    .filter((e) => { for (let p = e.parentElement; p && p !== host; p = p.parentElement) if (scrolly(p)) return false; return true; });
  const seen = new Map();
  const items = [];
  for (const e of kids) {
    const r = e.getBoundingClientRect();
    if (r.height < 2 || r.width < 2) continue;
    const t = tag(e);
    const n = (seen.get(t) || 0); seen.set(t, n + 1);
    /* ⓐ k 의 기준 = «자기를 담는 상자». offsetParent 가 호스트 밖이면 호스트를 기준으로 본다. */
    let cb = e.offsetParent;
    if (!cb || !host.contains(cb)) cb = host;
    const cbr = cb.getBoundingClientRect();
    items.push({ k: t + (n ? '[' + n + ']' : ''), y: fy(r.top), b: fy(r.bottom),
                 rel: Math.round((r.top - cbr.top) * 100) / 100,
                 /* 세 기준을 다 남긴다 — 자식이 그릇의 상변·하변·중앙 **어느 하나**에라도
                    붙어 있으면 그것은 «제대로 매달린» 것이다(아래 ⓓ). */
                 relB: Math.round((cbr.bottom - r.top) * 100) / 100,
                 relC: Math.round((r.top - (cbr.top + cbr.height / 2)) * 100) / 100,
                 cb: cb === host ? '(host)' : tag(cb),
                 x: Math.round(r.left - A.left), w: Math.round(r.width), h: Math.round(r.height),
                 txt: (e.textContent || '').trim().slice(0, 12) });
  }
  return { frameH: Math.round(A.height), host: host.id || tag(host), items };
})()`;

async function open1(page, h) {
  await page.evaluate(`try{ ${h.open} }catch(e){ window.__p754 = String(e && e.message || e); }`);
  await page.waitForTimeout(420);
  return page.evaluate(() => window.__p754 || null);
}

/* 앵커 계수 k 를 «종류» 로 접는다 — 0/0.5/1 에서 ±0.06 안이면 그 이름표, 아니면 실수 그대로 */
function kName(k) {
  if (k == null) return '?';
  if (Math.abs(k - 0) <= 0.06) return 'top';
  if (Math.abs(k - 0.5) <= 0.06) return 'center';
  if (Math.abs(k - 1) <= 0.06) return 'bottom';
  return 'k' + k.toFixed(2);
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const h of HOSTS) {
    if (ONLY && h.sel.replace('#', '') !== ONLY && h.id !== ONLY) continue;
    const rec = { id: h.id, name: h.name, sel: h.sel, err: null, byFrame: {} };
    for (const fh of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(650);
      const oe = await open1(page, h);
      if (oe && !rec.err) rec.err = oe;
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
      const p = await page.evaluate(PROBE(h.sel)).catch((e) => ({ probeErr: String(e.message || e) }));
      if (errs.length && !rec.err) rec.err = errs[0];
      rec.byFrame[fh] = p;
      await ctx.close();
    }
    rows.push(rec);
  }

  /* ── 판정 ──────────────────────────────────────────────────────────────── */
  const report = [];
  for (const r of rows) {
    const base = r.byFrame[BASE];
    if (!base || base.missing || base.probeErr) {
      report.push({ id: r.id, name: r.name, skip: base && base.missing ? 'MISSING' : (base && base.probeErr) || r.err || 'MISSING' });
      continue;
    }
    const mapAt = (fh) => new Map(((r.byFrame[fh] || {}).items || []).map((it) => [it.k, it]));
    const mBase = mapAt(BASE);
    /* k 는 «자기를 담는 상자» 기준(rel)으로 잰다 — 부모가 통째로 움직이는 것은 결함이 아니다.
       담는 상자가 호스트면 rel = 프레임 y 이므로 같은 식이 그대로 프레임 앵커를 낸다. */
    const anchors = new Map();      /* 요소 → k 이름표 */
    for (const [key, it] of mBase) {
      const ks = [];
      const inv = { rel: true, relB: true, relC: true };
      for (const fh of FRAMES) {
        if (fh === BASE) continue;
        const o = mapAt(fh).get(key);
        if (!o || o.cb !== it.cb) continue;      /* 담는 상자가 바뀌면 비교 불가 */
        ks.push((o.rel - it.rel) / (fh - BASE));
        for (const b of ['rel', 'relB', 'relC']) if (Math.abs(o[b] - it[b]) > 1.5) inv[b] = false;
      }
      if (!ks.length) continue;
      /* ⓓ **세 기준 중 하나에라도 불변이면 «제대로 매달린» 것이다.**
         그릇 자체가 짧은 프레임에서 줄어드는 것(`max-height:100%`·`clamp()`·`.shortf` 가드)은
         351·403·404 가 «잘림을 막으려고» 넣은 설계다. 그때 그릇 **하변**에 매달린 자식(21 깃발탭
         `.cl-tabs{bottom:-154px}` 처럼)은 그릇을 따라 올라오는 것이 **맞다** — 그것을 «상변 기준»
         하나로만 재면 전부 ❌ 가 되고, 고치라는 처방은 351 이 막아 둔 잘림을 도로 여는 길이다.
         결함은 «그릇의 어느 변에도 안 붙은 것» 과 «형제끼리 서로 다른 변에 붙어 사이가 벌어지는 것»
         이며, 앞의 것이 이 이름표로 갈린다(1회차에 21·22·19·20 넷이 이 유령이었다). */
      const anchoredTo = inv.rel ? 'top' : inv.relB ? 'bottom' : inv.relC ? 'center' : null;
      const kmin = Math.min(...ks), kmax = Math.max(...ks);
      anchors.set(key, { k: (kmin + kmax) / 2, spread: kmax - kmin,
                         name: anchoredTo || kName((kmin + kmax) / 2), loose: !anchoredTo, cb: it.cb, it });
    }
    /* 판정 단위 = «담는 상자». 한 상자 안에서 k 가 두 종류 이상이면 그 상자가 섞였다. */
    const boxes = new Map();
    const exempted = [];
    for (const [key, a] of anchors) {
      if (isExempt(key)) { exempted.push(key); continue; }   /* 예외 목록 — 판정에서 뺀다 */
      if (!boxes.has(a.cb)) boxes.set(a.cb, new Map());
      const kk = boxes.get(a.cb);
      if (!kk.has(a.name)) kk.set(a.name, []);
      kk.get(a.name).push(key);
    }
    const kinds = new Map();        /* 화면 단위 요약 — 섞인 상자만 모은다 */
    const mixedBoxes = [];
    for (const [cb, kk] of boxes) {
      if (kk.size > 1) {
        /* ⓔ **섞였다고 다 결함은 아니다 — 해를 같이 재라.**
           그릇이 줄어드는 설계에서 상변 자식과 하변 자식이 공존하는 것 자체는 정상이고,
           결함은 그 둘이 **지원 범위 안에서 마주 보고 다가와 겹치거나 간극이 무너질 때**다
           (17 이 −35px 로 겹쳤고, 18 은 703 → 23px 로 97% 무너졌다. 420-③ — 최악을 1600 으로
           가정하지 말고 5종을 다 재서 최솟값을 쓴다). */
        const names = [...kk.keys()];
        const gaps = FRAMES.map((fh) => {
          const m = mapAt(fh);
          let g = Infinity;
          for (const a of names) for (const b of names) {
            if (a === b) continue;
            for (const ka of kk.get(a)) for (const kb of kk.get(b)) {
              const A2 = m.get(ka), B2 = m.get(kb);
              if (!A2 || !B2 || A2.b > B2.y) continue;            /* A 가 위, B 가 아래인 쌍만 */
              const xo = Math.min(A2.x + A2.w, B2.x + B2.w) - Math.max(A2.x, B2.x);
              if (xo <= 1.5) continue;                             /* 같은 세로 띠가 아니면 안 만난다 */
              g = Math.min(g, B2.y - A2.b);
            }
          }
          return { fh, g: g === Infinity ? null : Math.round(g * 10) / 10 };
        });
        const seen = gaps.filter((x) => x.g != null);
        const min = seen.length ? Math.min(...seen.map((x) => x.g)) : null;
        const at = seen.length ? Math.max(...seen.map((x) => x.g)) : null;
        const harm = min == null ? 'none' : min <= 0 ? 'overlap' : (at && min < at * 0.25) ? 'collapse' : 'none';
        mixedBoxes.push({ cb, harm, minGap: min, maxGap: at, gaps,
                          kinds: [...kk.entries()].map(([k, v]) => ({ k, n: v.length, els: v.slice(0, 6) })) });
      }
      for (const [k, v] of kk) kinds.set(k, (kinds.get(k) || []).concat(v));
    }
    /* 겹침 — 프레임별로 «상자 y 구간이 겹치는 형제 쌍» 을 센다(같은 x 띠에서만). */
    const overlaps = {};
    for (const fh of FRAMES) {
      const its = ((r.byFrame[fh] || {}).items || []);
      let n = 0; const ex = [];
      for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) {
        const a = its[i], b = its[j];
        const yo = Math.min(a.b, b.b) - Math.max(a.y, b.y);
        const xo = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        if (yo > 1.5 && xo > 1.5) {
          /* 부모-자식·형제 포함 관계는 겹침이 아니다 — 한쪽이 다른 쪽을 완전히 담으면 제외 */
          const contains = (p, c) => p.y <= c.y + .5 && p.b >= c.b - .5 && p.x <= c.x + .5 && p.x + p.w >= c.x + c.w - .5;
          if (contains(a, b) || contains(b, a)) continue;
          n++; if (ex.length < 4) ex.push(`${a.k}↔${b.k} ${yo.toFixed(0)}px`);
        }
      }
      overlaps[fh] = { n, ex };
    }
    report.push({ id: r.id, name: r.name, host: base.host, n: anchors.size,
                  kinds: [...kinds.entries()].map(([k, v]) => ({ k, n: v.length, els: v.slice(0, 6) })),
                  mixedBoxes, exempted, overlaps, err: r.err });
  }

  if (JSONOUT) { console.log(JSON.stringify({ frames: FRAMES, base: BASE, rows, report }, null, 1)); }
  else {
    console.log('PROBE754 — 오버레이 앵커 계수 k = Δ(요소 y) / Δ(프레임 높이)');
    console.log(`  프레임 ${FRAMES.join(' · ')} (기준 ${BASE}) · k 0=상단 0.5=중앙 1=하단\n`);
    let bad = 0, ok = 0, skipped = 0;
    for (const r of report) {
      if (r.skip) { skipped++; console.log(`  [--] ${r.id} ${r.name.padEnd(14)} — ${r.skip}`); continue; }
      const harmed = r.mixedBoxes.filter((b) => b.harm !== 'none');
      const watch = r.mixedBoxes.filter((b) => b.harm === 'none');
      const mixed = harmed.length > 0;
      if (mixed) bad++; else ok++;
      const mark = mixed ? '❌' : watch.length ? '⚠' : '✅';
      console.log(`  [${mark}] ${r.id} ${r.name.padEnd(14)} ${String(r.host).padEnd(8)} 요소 ${String(r.n).padStart(3)} · 앵커 ${r.kinds.map((k) => `${k.k}×${k.n}`).join(' + ')}${r.exempted.length ? ' · 예외 ' + r.exempted.join(',') : ''}`);
      for (const b of r.mixedBoxes) {
        console.log(`        └ ${b.harm === 'overlap' ? '겹침' : b.harm === 'collapse' ? '간극붕괴' : '관찰'} · 그릇 ${b.cb} · 간극 ${b.gaps.map((g) => `${g.fh}:${g.g == null ? '-' : g.g}`).join(' ')}`);
        for (const k of b.kinds) console.log(`            ${k.k.padEnd(7)} ${k.els.join(' ')}${k.n > k.els.length ? ` …+${k.n - k.els.length}` : ''}`);
      }
    }
    console.log(`\n  요약 — 성한 화면 ${ok} · 해가 있는 자리 ${bad} · 미측정 ${skipped}`);
  }
  await browser.close();
})();
