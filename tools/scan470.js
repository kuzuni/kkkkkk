/* 작업 470 — «Lv.» 글자가 잘려 보이는 자리 전수 스캔.
 *
 * 왜 전수인가: 등재문이 지목한 자리(10 상점 소환 탭 `.shp-card .clv`)는 `probe470` 이
 * **찍힌 픽셀로 초록**을 냈다(레벨 1·2·6·10·24·25 × 카드 5장 = 30 표본, 최소 좌우 여백 13px).
 * 주인 원문은 «레벨**들** 글씨가 잘려보임»(복수)이므로 자리는 하나가 아닐 수 있다.
 * 338 규칙 — 처방보다 재현이 먼저이고, 재현이 등재문을 기각하면 **자리를 다시 찾는다**(341 선례).
 *
 * 자(尺) 두 축 — 둘 다 «글자가 잘려 보인다» 의 서로 다른 원인이다:
 *   [C] 하드 클립  — 잉크가 «잘라내는 조상»(overflow≠visible)의 클라이언트 박스를 넘는다 ⇒ 진짜로 안 그려진다.
 *   [B] 테두리 물림 — 잉크가 자기 호스트의 **패딩 박스**를 넘어 테두리 위로 올라탄다.
 *                    글자마다 `-webkit-text-stroke` 검정이 얹혀 있어(126 ②) 검정 테두리와
 *                    한 덩어리로 읽히므로 «반쯤 안 보인다» 가 된다 — 주인 보고의 문장 그대로다.
 *
 * 잉크는 «레이아웃 상자» 가 아니라 **글자가 실제로 칠하는 범위**로 잡는다 —
 * Range 로 글리프 상자를 받아 조상까지의 transform 을 반영한 화면 좌표를 쓰고,
 * 거기에 스트로크가 바깥으로 나가는 몫(폭/2)을 더한다. 340 교훈: 사람이 보는 것은 잉크다.
 *
 * 실행: node tools/scan470.js [--all]      (--all = 초록까지 전부 찍는다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ALL = process.argv.includes('--all');

/* scan356 의 화면 목록과 같은 꼴 — «탭·서브탭을 갈아타야 보이는 화면» 까지 연다(397 교훈). */
const SCREENS = [
  ['02 메인', []],
  ['06 장비', ['.tab[data-t="hero"]', '#eqTabs .stab-c1']],
  ['07 스킬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]']],
  ['50 코스튬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]']],
  ['26 펫', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]']],
  ['05 장비 세부', ['.tab[data-t="hero"]', '#eqTabs .stab-c1', '#eqCards [data-eqslot="weapon"]']],
  ['23 훈련', ['.tab[data-t="grow"]']],
  ['23 룬', ['.tab[data-t="grow"]', '#trSubs [data-trsub="rune"]']],
  ['23 단련', ['.tab[data-t="grow"]', '#trSubs [data-trsub="temper"]']],
  ['03 던전', ['.tab[data-t="adv"]']],
  ['03 레이드', ['.tab[data-t="adv"]', '#dunSub [data-dsub="raid"]']],
  ['03 탑', ['.tab[data-t="adv"]', '#dunSub [data-dsub="tower"]']],
  ['89 유물', ['.tab[data-t="box"]']],
  ['10 상점(소환)', ['.tab[data-t="shop"]']],
  ['13 재화 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="coin"]']],
  ['124 이용권 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="pass"]']],
  ['52 메뉴', ['#menub']],
  ['56 가방', ['#menub', '#mnw [data-mn="bag"]']],
  ['70 출석', ['.side .ibtn[data-pop="attend"]']],
  ['22 퀘스트', ['.side .ibtn[data-pop="quest"]']],
  ['21 도감(스킬)', ['.side .ibtn[data-pop="coll"]']],
  ['21 도감(무기)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="weapon"]']],
  ['21 도감(펫)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="pet"]']],
  ['21 도감(유물)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="relic"]']],
  ['34 축복', ['.side .ibtn[data-pop="bless"]']],
  ['19 프로필', ['#profBtn']],

  /* ── 4회차(2026-08-30) 증설 — 1~3회차가 «한 번도 안 연» 자리들 ────────────────────
     3회차 기록 §9-2 가 남긴 숙제 그대로다: 소환 확률 팝업(카드 🔍) · 12 소환 결과 팝업 ·
     승급전·레이드 계열. 397 «스코프 구멍» 선례대로 **문을 채우는 것까지가 이 회차의 범위**다.
     ⚠ 주인 원문이 «소환팝업쪽» 이므로 소환 계열 둘을 맨 앞에 둔다 — 1~3회차가 «10 상점 소환 탭»
     하나만 소환으로 읽었는데, 그 탭에서 열리는 팝업이 둘 더 있다. */
  ['11 소환 확률', ['.tab[data-t="shop"]', '#shopList [data-shinfo]']],
  ['12 소환 결과', ['.tab[data-t="shop"]', '#shopList [data-shsum]'], 1400],
  /* 카드 → 세부 팝업(공용 `showItem`) 계열 — 카드에서 안 잘려도 세부에서 잘릴 수 있다 */
  ['08 스킬 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]', '#bSk [data-skit]']],
  ['26 펫 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]', '#bPet [data-ptslot]']],
  ['50 코스튬 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-cosit]']],
  ['05 방패 세부', ['.tab[data-t="hero"]', '#eqTabs .stab-c1', '#eqCards [data-eqslot="shield"]']],
  ['05 목걸이 세부', ['.tab[data-t="hero"]', '#eqTabs .stab-c1', '#eqCards [data-eqslot="amulet"]']],
  ['16 유물 세부', ['.tab[data-t="box"]', '#rwGrid [data-rw]']],
  /* ⚠ 던전 카드의 문은 `[data-dun]`(=03 패널 본문의 [도전] 버튼)이 아니라 **`#dunList [data-dcard]`** 다.
     잠긴 카드는 팝업 대신 토스트를 내므로 `RAISE` 가 올린 전투력으로 첫 칸이 열려 있어야 한다(341 선례). */
  ['04 던전 세부', ['.tab[data-t="adv"]', '#dunList [data-dcard]']],
  /* 21 도감 — 1~3회차는 여섯 칸 중 넷만 열었다(방어구·장신구가 빠져 있었다) */
  ['21 도감(방어구)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="shield"]']],
  ['21 도감(장신구)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="amulet"]']],
  /* 52 ▦ 메뉴 8칸 — 1~3회차는 «가방» 하나만 열었다 */
  ['52 우편', ['#menub', '#mnw [data-mn="mail"]']],
  ['52 랭킹', ['#menub', '#mnw [data-mn="rank"]']],
  ['55 설정', ['#menub', '#mnw [data-mn="conf"]']],
  ['32 가이드', ['#menub', '#mnw [data-mn="guide"]']],
  ['56 절전', ['#menub', '#mnw [data-mn="saver"]']],
  /* 35 패스 4탭 — 397 이 «스캐너가 출석 패스 탭을 한 번도 안 봤다» 로 걸린 바로 그 자리다 */
  ['35 패스(스테이지)', ['#menub', '#mnw [data-mn="pass"]']],
  ['35 패스(시련의탑)', ['#menub', '#mnw [data-mn="pass"]', '#psBar [data-ptab="tower"]']],
  ['35 패스(절망의탑)', ['#menub', '#mnw [data-mn="pass"]', '#psBar [data-ptab="tower2"]']],
  ['36 패스(출석)', ['#menub', '#mnw [data-mn="pass"]', '#psBar [data-ptab="att"]']],
  /* 33 재화 정보 팝업 — 재화 아이콘 전부가 오프너다(smoke 와 같은 `data-cur` 축) */
  ['33 재화(골드)', ['[data-cur="gold"]']],
  ['33 재화(다이아)', ['[data-cur="dia"]']],
  ['33 재화(유물조각)', ['.tab[data-t="box"]', '[data-cur="relic"]']],
  ['20 스펙 정보', ['#profBtn', '.pf-tgl>.lb']],
  ['103 채팅', ['#botleft .ubtn[data-util="chat"]']],
  ['승급전', ['.side .ibtn[data-pop="promo"]'], 700],
  ['16 룰렛', ['.side .ibtn[data-pop="roul"]']],
  ['09 일괄 강화 결과', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]', '#bSk [data-skup]'], 700],
];

/* 레벨이 한 자리면 안 보이던 넘침도 두 자리·세 자리에서 난다 — 상태를 «가장 긴 문자열» 로 올린다.
   ⚠ 실제 상한을 넘겨 적지 않는다(제품이 스스로 자르는 값과 어긋나면 유령을 만든다). */
const RAISE = `
  try {
    S.gold = 1e12; S.dia = 1e7; S.relic = 1e6; S.stage = 200;
    /* ⚠ 1·2회차의 주입은 «세이브에 이미 있는 값» 만 올려서 대부분 빗나갔다 — 21 도감이 'Lv. 0/1',
       89 유물이 'Lv.0', 07·26·50 슬롯은 **전 칸 잠금**이라 «Lv» 노드가 한 개도 안 잡혔다.
       즉 긴 문자열 축이 통째로 안 돌았다. ⇒ **보유·장착부터 만들고** 레벨을 올린다.
       (자리 찾기용 스트레스 축이다 — 제품이 스스로 자르는 상한이 있으면 그 값이 이긴다.) */
    const own = (id, l) => { S.own[id] = S.own[id] || { l: 0, n: 0 }; S.own[id].l = l; S.own[id].n = 5; };
    const LMAX = (typeof MAX_LEVEL === 'number' ? MAX_LEVEL : 99);
    if (typeof SKILLS !== 'undefined') SKILLS.forEach(x => own(x.id, LMAX));
    if (typeof EQUIPS !== 'undefined') EQUIPS.forEach(x => own(x.id, LMAX));
    if (typeof PETS   !== 'undefined') PETS.forEach(x => own(x.id, LMAX));
    if (typeof RELICS !== 'undefined') RELICS.forEach(x => own(x.id, LMAX));
    if (typeof AVATARS!== 'undefined') AVATARS.forEach(x => own(x.id, LMAX));
    if (typeof SKILLS !== 'undefined') S.eqSkill = SKILLS.slice(0, 8).map(x => x.id);
    if (typeof PETS   !== 'undefined' && PETS.length) S.eqPet = PETS.slice(0, 8).map(x => x.id);
    if (typeof EQUIPS !== 'undefined') ['weapon', 'shield', 'amulet'].forEach(k => {
      const e = EQUIPS.find(x => x.p === k || x.slot === k || x.part === k);
      if (e) S.eqSlot[k] = e.id;
    });
    /* 363 «연출 스킵» — 12 소환 결과 팝업을 애니메이션 없이 최종 상태로 세운다(스캔은 정지 화면을 잰다) */
    if (S.opt) S.opt.sumSkip = true;
    if (typeof SUM_MAXLV === 'number') Object.keys(S.sum || {}).forEach(k => {
      S.sum[k].lv = SUM_MAXLV; S.sum[k].exp = Math.floor(sumNeedExp(SUM_MAXLV) * 0.5);
    });
    /* 남은 «lv/l/level» 숫자 필드(축복·룬·단련 등 화면별 주머니)도 같이 올린다 */
    const seen = new Set();
    (function walk(o, d) {
      if (!o || typeof o !== 'object' || d > 5 || seen.has(o)) return;
      seen.add(o);
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'number' && (k === 'lv' || k === 'level')) { o[k] = 99; continue; }
        if (v && typeof v === 'object') walk(v, d + 1);
      }
    })(S, 0);
  } catch (e) {}
`;

/* 페이지 안에서 도는 스캐너 — 보이는 노드 중 «Lv» 를 직접 품은 잎을 찾아 잉크를 잰다. */
const SCAN = `(() => {
  const out = [];
  const RE = /Lv\\s*\\.?\\s*\\d|Lv\\s*\\.\\s*$|\\bLv\\b/;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  /* 잉크 = 글리프 상자(Range) ∪ 스트로크 바깥 몫 */
  const inkOf = (el) => {
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, any = false;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (!r.width || !r.height) continue;
        any = true;
        if (r.left < x1) x1 = r.left; if (r.top < y1) y1 = r.top;
        if (r.right > x2) x2 = r.right; if (r.bottom > y2) y2 = r.bottom;
      }
    }
    if (!any) return null;
    const sw = parseFloat(getComputedStyle(el).webkitTextStrokeWidth) || 0;
    const o = sw / 2;                                  /* 스트로크는 절반이 글리프 «밖» 이다 */
    return { x1: x1 - o, y1: y1 - o, x2: x2 + o, y2: y2 + o, sw };
  };
  const clipAncestor = (el) => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (/hidden|clip|scroll|auto/.test(cs.overflow)) return n;
      n = n.parentElement;
    }
    return null;
  };
  const sel = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cl = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
    return (el.tagName.toLowerCase() + id + cl).slice(0, 40);
  };
  document.querySelectorAll('body *').forEach(el => {
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.nodeValue).join('');
    if (!own.trim() || !RE.test(own)) return;
    if (!vis(el)) return;
    const ink = inkOf(el); if (!ink) return;
    /* 호스트 = 자기 자신에 배경·테두리가 있으면 자기, 아니면 그런 조상 중 가장 가까운 것 */
    let host = el, n = el, hop = 0;
    while (n && hop < 4) {
      const cs = getComputedStyle(n);
      const hasEdge = (parseFloat(cs.borderTopWidth) || 0) > 0
        || (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
      if (hasEdge) { host = n; break; }
      n = n.parentElement; hop++;
    }
    const hcs = getComputedStyle(host), hr = host.getBoundingClientRect();
    const bl = parseFloat(hcs.borderLeftWidth) || 0, br = parseFloat(hcs.borderRightWidth) || 0;
    const bt = parseFloat(hcs.borderTopWidth) || 0, bb = parseFloat(hcs.borderBottomWidth) || 0;
    /* [B] 패딩 박스(테두리 안쪽) 대비 여백 */
    const pad = { l: ink.x1 - (hr.left + bl), r: (hr.right - br) - ink.x2,
                  t: ink.y1 - (hr.top + bt),  b: (hr.bottom - bb) - ink.y2 };
    /* [C] 잘라내는 조상의 클라이언트 박스 대비 여백 */
    const ca = clipAncestor(el);
    let clip = null, caSel = '', caOv = ['visible', 'visible'];
    if (ca) {
      const cr = ca.getBoundingClientRect(), ccs = getComputedStyle(ca);
      const cl2 = parseFloat(ccs.borderLeftWidth) || 0, cr2 = parseFloat(ccs.borderRightWidth) || 0;
      const ct2 = parseFloat(ccs.borderTopWidth) || 0, cb2 = parseFloat(ccs.borderBottomWidth) || 0;
      clip = { l: ink.x1 - (cr.left + cl2), r: (cr.right - cr2) - ink.x2,
               t: ink.y1 - (cr.top + ct2),  b: (cr.bottom - cb2) - ink.y2 };
      caSel = sel(ca);
      /* ⚑ 4회차 — 축마다 «스크롤로 닿는가» 를 같이 들고 나온다. 그릇이 auto/scroll 이면
         밖에 있는 잉크는 **스크롤하면 보인다** = 잘림이 아니다(3회차 §3 이 손으로 내린 판정과
         같은 말인데, 자에는 그 조항이 없어서 «스크롤 위치» 하나로 결과가 흔들렸다).
         ⚠ 이 주석에 백틱을 쓰지 마라 — SCAN 은 템플릿 문자열 안이라 그 자리에서 끊긴다. */
      caOv = [ccs.overflowX, ccs.overflowY];
    }
    const ecs = getComputedStyle(el);
    out.push({ sel: sel(el), host: sel(host), txt: own.trim().slice(0, 12), sw: ink.sw,
               po: ecs.paintOrder, fs: parseFloat(ecs.fontSize) || 0,
               w: +(ink.x2 - ink.x1).toFixed(1), h: +(ink.y2 - ink.y1).toFixed(1),
               hostW: +(hr.width - bl - br).toFixed(1),
               pad: [+pad.l.toFixed(1), +pad.r.toFixed(1), +pad.t.toFixed(1), +pad.b.toFixed(1)],
               clip: clip ? [+clip.l.toFixed(1), +clip.r.toFixed(1), +clip.t.toFixed(1), +clip.b.toFixed(1)] : null,
               ca: caSel, caOv: caOv, border: bl > 0 || bt > 0 });
  });
  return out;
})()`;

/* ── 축 판정 한 벌 — 스캐너와 게이트가 **같은 정의**를 읽는다 ──────────────────────
   [C] 하드 클립 = «잘라내는 조상 안에서 잉가 안 그려진다». 그릇이 그 축으로 `auto`/`scroll`
       이면 밖에 있는 잉크는 **스크롤하면 보이므로 잘림이 아니다** — 축마다 따로 본다
       (세로 스크롤러 안에서 가로로 넘치는 글자는 여전히 진짜 잘림이다).
   ⚠ 이 조항이 없던 3회차의 자는 «스크롤 위치» 에 따라 같은 화면이 초록도 빨강도 됐다
      (4회차에 10 상점 소환 탭이 그렇게 «클립 1건» 으로 찍혔다 — 화면 밖으로 스크롤된
       배너 카드였고, 3회차 기록 §3 이 손으로 «잘림이 아니다» 라고 판정한 바로 그 자리다). */
const scrollable = (ov) => /auto|scroll/.test(ov || '');
function clipHit(r) {
  if (!r.clip) return false;
  const ov = r.caOv || ['hidden', 'hidden'];
  const x = Math.min(r.clip[0], r.clip[1]) < -0.5 && !scrollable(ov[0]);
  const y = Math.min(r.clip[2], r.clip[3]) < -0.5 && !scrollable(ov[1]);
  return x || y;
}
const padHit = (r) => Math.min(r.pad[0], r.pad[1], r.pad[2], r.pad[3]) < -0.5;
const strokeHit = (r) => r.sw > 0 && !/^stroke/.test(r.po);
function classify(rows) {
  const C = [], B = [], S = [];
  for (const r of rows) {
    if (strokeHit(r)) S.push(r);
    if (clipHit(r)) C.push(r);
    else if (padHit(r)) B.push(r);
  }
  return { C, B, S };
}

/* 4회차 — 게이트(`verify470`)가 이 네 조각을 그대로 읽는다. 스캐너와 자가 «같은 화면 목록·같은
   상태 주입·같은 잉크 정의» 를 쓰지 않으면 자는 스캐너가 실제로 본 것을 못 지킨다(397 교훈). */
module.exports = { SCREENS, RAISE, SCAN, classify, clipHit, padHit, strokeHit };

if (require.main === module) (async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  console.log('SCAN470 — «Lv.» 잉크 잘림 전수 (1080×2280)');
  console.log('  [C] 하드 클립  = 잘라내는 조상의 클라이언트 박스를 잉크가 넘음(음수 = 안 그려진다)');
  console.log('  [B] 테두리 물림 = 호스트 패딩 박스를 잉크가 넘어 테두리 위로 올라탐(음수 = 물림)');
  console.log('');

  const hitsC = [], hitsB = [], hitsS = [], seen = new Set(), miss = [];
  let nodes = 0, scanned = 0;
  for (const [name, steps, extra] of SCREENS) {
    /* 화면마다 새로 시작 — 팝업이 겹쳐 열려 남의 화면을 스캔하지 않게 한다(448 교훈) */
    await p.reload();
    await p.waitForTimeout(700);
    await p.evaluate(RAISE);
    let ok = true;
    for (const s of steps) {
      const done = await p.evaluate((sel) => {
        const el = document.querySelector(sel); if (!el) return false;
        el.click(); return true;
      }, s).catch(() => false);
      if (!done) { ok = false; break; }
      await p.waitForTimeout(420);
    }
    if (!ok) { console.log('  [!] ' + name + ' — 오프너 없음(건너뜀)'); miss.push(name); continue; }
    /* 연출이 붙은 화면(소환 결과·승급전)은 최종 상태에 닿을 때까지 더 기다린다 */
    if (extra) await p.waitForTimeout(extra);
    await p.evaluate(RAISE);
    await p.evaluate(() => { try { renderAll && renderAll(); } catch (e) {} });
    await p.waitForTimeout(320);
    const rows = await p.evaluate(SCAN);
    scanned++;
    nodes += rows.length;
    for (const r of rows) {
      const key = name + '|' + r.sel + '|' + r.txt;
      if (seen.has(key)) continue; seen.add(key);
      if (strokeHit(r)) hitsS.push({ name, ...r });
      if (clipHit(r)) hitsC.push({ name, ...r });
      else if (padHit(r)) hitsB.push({ name, ...r });
      else if (ALL) hitsB.push({ name, ok: true, ...r });
    }
  }

  const show = (t, arr, kind) => {
    console.log(t + ' — ' + arr.length + '건');
    if (!arr.length) { console.log('    (없음)'); console.log(''); return; }
    console.log('     화면            노드                       문자열      잉크w×h    호스트폭  좌/우/상/하 여백');
    for (const r of arr) {
      const m = kind === 'C' ? r.clip : r.pad;
      console.log('    ' + r.name.padEnd(15) + r.sel.padEnd(27) + String(r.txt).padEnd(11)
        + String(r.w + '×' + r.h).padStart(11) + String(r.hostW).padStart(9) + '   '
        + m.map(v => String(v)).join(' / ') + (r.ok ? '' : '  ★')
        + (kind === 'C' ? '   [자르는 조상 ' + r.ca + ']' : ''));
    }
    console.log('');
  };
  /* [S] 획이 글자를 파먹는 자리 — `-webkit-text-stroke` 는 절반이 글리프 «안쪽» 이라
     `paint-order:stroke fill`(126 ② 규약) 이 없으면 획이 채움 위에 얹혀 **글자가 얇아지고
     속공간이 막힌다**. 등재문 처방 ②·LESSONS 240 이 말하는 «잘려 보임» 의 다른 원인이다. */
  console.log('[S] 스트로크가 채움 위에 얹힌 «Lv» 노드(paint-order 누락) — ' + hitsS.length + '건');
  if (!hitsS.length) console.log('    (없음)');
  else {
    console.log('     화면            노드                       문자열      fs   stroke  안쪽 파먹힘  획/글자');
    for (const r of hitsS) console.log('    ' + r.name.padEnd(15) + r.sel.padEnd(27) + String(r.txt).padEnd(11)
      + String(r.fs).padStart(4) + String(r.sw).padStart(8) + String((r.sw / 2).toFixed(1)).padStart(11)
      + String((r.sw / Math.max(1, r.fs) * 100).toFixed(1) + '%').padStart(9) + '  paint-order=' + r.po);
  }
  console.log('');
  show('[C] 하드 클립', hitsC, 'C');
  show('[B] 테두리 물림', hitsB, 'B');
  /* ⚠ 못 연 문은 «조용한 초록» 이 된다(smoke 351-13회차 교훈) — 이름을 반드시 찍는다. */
  if (miss.length) console.log('[!] 못 연 화면 ' + miss.length + '건 — ' + miss.join(' · ') + '\n');
  console.log('스캔 화면 ' + scanned + '/' + SCREENS.length + ' · «Lv» 노드 ' + nodes
    + ' · 클립 ' + hitsC.length + ' · 물림 ' + hitsB.filter(x => !x.ok).length + ' · 획 파먹힘 ' + hitsS.length);
  console.log('페이지 에러 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close();
})();
