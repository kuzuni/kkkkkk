#!/usr/bin/env node
/* 작업 356 — «아이콘 원본 비율» 전수 스캐너 (측정 전용 · 판정은 verify356.js)
 *
 *   node tools/scan356.js              # 전 화면 순회 → 비균등 스케일 아이콘 목록
 *   node tools/scan356.js --json       # 기계 판독용
 *   node tools/scan356.js --all        # 아이콘이 아닌 노드(라벨 등)까지 같이 찍는다(대조용)
 *
 * 주인 지시(2026-08-29): «모든 아이콘들이 안 찌그러지게 — 원본 비율».
 * ⚠ 라벨(글자)의 scaleX 는 대상이 아니다. 그래서 이 스캐너의 본체는 «무엇이 아이콘인가» 를
 *   기계가 판정하는 부분이다 — 사람이 목록을 손으로 고르면 다음 세션이 그 목록을 못 잇는다.
 *
 * 아이콘 판정(하나라도 맞으면 아이콘):
 *   ⓐ IMG / CANVAS / SVG 노드
 *   ⓑ 자기 «직접» 텍스트가 그림문자(Extended_Pictographic)로만 이뤄진 노드 — 이모지 아이콘
 *   ⓒ 텍스트가 없고 자식이 ⓐ 하나뿐인 노드 — 이모지/SVG 를 감싼 자리
 * 라벨은 ⓑ 에서 한글·숫자·라틴 한 글자만 섞여도 곧바로 탈락한다.
 *
 * 스케일은 **조상까지 누적**해서 잰다 — 아이콘 자신은 등방인데 감싼 상자가 scaleX 를 걸면
 * 화면에 찍히는 것은 찌그러진 아이콘이다(A1 `.ti` · A2 `.si` 가 그 구조다).
 * 개별 `scale` 속성(transform 과 별개 프로퍼티)도 같이 읽는다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const HTML = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + HTML.replace(/\\/g, '/');
const JSON_OUT = process.argv.includes('--json');
const ALL = process.argv.includes('--all');
const TOL = Number(process.env.SCAN356_TOL || 0.02);   /* |sx/sy − 1| 허용치 */

/* ---------- 화면 목록 ----------
   smoke.js 오프너 목록과 같은 자리를 돈다. 단계는 «셀렉터를 페이지 안에서 찾아 누른다» 로 통일 —
   재렌더가 잦은 화면에서 resolve↔click 사이에 노드가 detach 되는 함정을 피한다(LESSONS 50-①). */
/* ⚑ 397 — 이 목록의 «무음 실패» 가 356 의 스코프 구멍이었다(2026-08-29).
   단계는 `querySelector(q); if (el) el.click()` 이라 **셀렉터가 안 맞으면 예외 없이 조용히 넘어간다.**
   그래서 «화면 이름은 있는데 한 번도 그 화면에 간 적이 없는» 줄이 넷 있었고
   (`[data-eqtab="eq"]`·`[data-eqtab="mate"]`·`#relTabs [data-reltab="rel"]`·`[data-opencoll]`
   — 넷 다 DOM 에 없는 이름이다), 그 줄들은 직전 화면을 두 번 센 것이었다.
   ⇒ `tools/probe397.js` 가 단계마다 resolved/moved 를 찍어 이것을 감시한다.
   **이 목록에 줄을 더할 때는 반드시 probe397 을 돌려 resolved=true 를 확인할 것.**
   그리고 «탭·서브탭을 갈아타야만 붙는 CSS»(`#psw.att …` 처럼)는 그 탭에 실제로 가야 보인다 —
   397 의 눌린 젬이 그 자리였다. */

/* ⚑ 443(2026-08-30) — **패스 탭 줄은 손으로 안 적는다. 마크업에서 파생한다**(402 «표가 아니라 id 파생»).
   397 이 이 목록을 손으로 채운 뒤 428(주인 지시)이 패스 탭을 «보물상자·시련의탑» →
   «시련의 탑·절망의 탑»(box → tower·tower2)으로 갈았는데, 여기 박아 둔
   `#psBar [data-ptab="box"]` 한 줄은 안 따라와 **다시 무음 실패**했다(verify356 [C] 92/93).
   = 397 이 고친 것은 «그때의 네 줄» 이지 «목록이 뒤처지는 구조» 가 아니었다.
   ⇒ `#psBar` 마크업의 `data-ptab` 을 읽어 탭 수만큼 줄을 만든다. 탭이 개명·신설·폐지돼도 따라온다.
   ⚠ **못 읽으면 조용히 빈 목록을 내지 않고 던진다** — 무음 실패를 «화면 0개» 라는 다른 무음으로
   갈아 끼우면 [B] 래칫이 헛초록이 된다(397 의 «직전 화면을 두 번 셌다» 와 같은 사고).
   ⚠ 라벨 글자는 renderPass() 가 PASS_TABS[].tab 으로 덮어쓰므로(210 «한 곳 규약») 화면 이름은
   읽기 편하라고 쓰는 것뿐이고, **자리를 정하는 것은 키(`data-ptab`)** 다. */
function derivePassScreens(src) {
  const bar = src.match(/id="psBar"[\s\S]*?<\/div>\s*<\/div>/);
  if (!bar) throw new Error('[scan356] index.html 에서 `#psBar` 마크업을 못 찾았다 — 패스 탭 화면을 파생할 수 없다');
  const tabs = [...bar[0].matchAll(/data-ptab="([^"]+)"[\s\S]*?<b><em>([^<]*)<\/em><\/b>/g)]
    .map((m) => ({ k: m[1], txt: m[2].trim() }));
  if (tabs.length < 2)
    throw new Error(`[scan356] \`#psBar\` 에서 파생한 탭이 ${tabs.length}개다 — 파생 규칙이 마크업과 어긋났다`);
  return tabs.map((t) => [`35 패스(${t.txt || t.k})`, ['#menub', '#psGo', `#psBar [data-ptab="${t.k}"]`]]);
}
const PASS_SCREENS = derivePassScreens(fs.readFileSync(HTML, 'utf8'));

const SCREENS = [
  ['02 메인', []],
  ['A1 탭바 열림', ['.tab[data-t="hero"]']],
  ['06 장비', ['.tab[data-t="hero"]', '#eqTabs .stab-c1']],
  ['07 스킬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]']],
  ['50 코스튬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]']],
  ['26 펫', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]']],
  ['23 훈련', ['.tab[data-t="grow"]']],
  ['23 룬', ['.tab[data-t="grow"]', '#trSubs [data-trsub="rune"]']],
  ['23 단련', ['.tab[data-t="grow"]', '#trSubs [data-trsub="temper"]']],
  ['03 던전', ['.tab[data-t="adv"]']],
  ['03 레이드', ['.tab[data-t="adv"]', '#dunSub [data-dsub="raid"]']],
  ['03 탑', ['.tab[data-t="adv"]', '#dunSub [data-dsub="tower"]']],
  ['89 유물', ['.tab[data-t="box"]']],
  ['10 상점', ['.tab[data-t="shop"]']],
  ['13 재화 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="coin"]']],
  ['124 이용권 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="pass"]']],
  ['52 메뉴', ['#menub']],
  ['53 우편', ['#menub', '#mnw [data-mn="mail"]']],
  ['54 랭킹', ['#menub', '#mnw [data-mn="rank"]']],
  ['55 설정', ['#menub', '#mnw [data-mn="conf"]']],
  ['56 가방', ['#menub', '#mnw [data-mn="bag"]']],
  /* ⚑ 397 — `#psw.att …` 규칙은 출석 탭에서만 붙는다. 그 탭이 스캔 밖이라 눌린 젬이 살아남았다.
     ⚑ 443 — 그 네 줄을 손으로 적는 대신 마크업에서 파생한다(위 derivePassScreens 주석).
     지금 파생값: 35 패스(스테이지) · 35 패스(시련의 탑) · 35 패스(절망의 탑) · 35 패스(출석) */
  ...PASS_SCREENS,
  ['70 출석', ['.side .ibtn[data-pop="attend"]']],
  ['29 룰렛', ['.side .ibtn[data-pop="roul"]']],
  ['22 퀘스트', ['.side .ibtn[data-pop="quest"]']],
  ['승급전', ['.side .ibtn[data-pop="promo"]']],
  ['21 도감(스킬)', ['.side .ibtn[data-pop="coll"]']],
  ['21 도감(무기)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="weapon"]']],
  ['21 도감(방패)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="shield"]']],
  ['21 도감(목걸이)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="amulet"]']],
  ['21 도감(펫)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="pet"]']],
  ['21 도감(유물)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="relic"]']],
  ['34 축복', ['.side .ibtn[data-pop="bless"]']],
  ['19 프로필', ['#profBtn']],
  ['20 스펙', ['#profBtn', '.pf-tgl>.lb']],
  ['33 재화 정보(골드)', ['[data-cur="gold"]']],
  ['33 재화 정보(다이아)', ['[data-cur="dia"]']],
  ['33 재화 정보(유물조각)', ['[data-cur="relic"]']],
  ['103 채팅', ['#botleft .ubtn[data-util="chat"]']],
  /* ⚑ 11회차(2026-08-31) — **스코프 구멍 여섯 자리.** 397(36 출석 패스)·443(패스 탭)·
     5회차(23 훈련)에 이어 **네 번째 같은 자리**다: 목록에 없는 화면은 [A]·[B]·[S3] 에게
     «0건» 이고, 그래서 «전 화면 0건» 이라는 이 작업의 결론이 그만큼 좁았다.
     후보를 고른 근거는 눈이 아니라 **같은 저장소의 다른 목록**이다 —
     351 오프너(`tools/cap351.js` SET1~SET3)는 **55화면**인데 여기는 42화면이었다.
     그 차집합을 `tools/probe356r11.js` 로 먼저 열어 재현했고(338 규칙),
     **56 절전에서 비균등 3노드**가 나왔다(⏱️ .706 · 💀 .862 · 배지 💀 1.19).
     ⚠ 05 장비 세부 세 슬롯은 `#wpnw` 한 껍데기를 공유해 **큰 상자 서명이 셋 다 같다** —
       진입 확인은 서명이 아니라 «부위별로 다른 내용»(아이콘 노드 수 76/78/78)이 한다. */
  ['05 장비 세부(무기)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="weapon"]']],
  ['05 장비 세부(방패)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="shield"]']],
  ['05 장비 세부(목걸이)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="amulet"]']],
  ['55 길라잡이', ['#menub', '#mnw [data-mn="guide"]']],
  ['56 절전', ['#menub', '#mnw [data-mn="saver"]']],
  ['22 퀘스트(반복)', ['.side .ibtn[data-pop="quest"]', '.qs-tg b[data-t="rep"]']],
];

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT = function (opt) {
  const PIC = /\p{Extended_Pictographic}/u;
  const app = document.getElementById('app');
  if (!app) return [];

  /* 자기 «직접» 텍스트만 — 자식 라벨의 글자가 섞이면 아이콘 판정이 무너진다 */
  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s;
  }
  function isMedia(el) {
    const t = el.tagName;
    return t === 'IMG' || t === 'CANVAS' || t === 'svg' || t === 'SVG';
  }
  function iconKind(el) {
    if (isMedia(el)) return 'media';
    const raw = ownText(el).replace(/[\s‍️︎]/g, '');
    if (raw) {
      /* 한 글자라도 그림문자가 아니면 라벨이다 */
      for (const ch of raw) if (!PIC.test(ch)) return null;
      return 'emoji';
    }
    /* 텍스트가 없고 미디어 자식 하나뿐인 상자 */
    const kids = [...el.children];
    if (kids.length === 1 && isMedia(kids[0]) && !ownText(el).trim()) return 'wrap';
    return null;
  }

  /* transform 문자열 + 개별 scale 프로퍼티에서 (sx, sy) 를 뽑는다 */
  function selfScale(cs) {
    let sx = 1, sy = 1, txt = '';
    const t = cs.transform;
    if (t && t !== 'none') {
      txt = t;
      const m = t.match(/^matrix\(([^)]+)\)/);
      const m3 = t.match(/^matrix3d\(([^)]+)\)/);
      if (m) {
        const v = m[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1]); sy = Math.hypot(v[2], v[3]);
      } else if (m3) {
        const v = m3[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1], v[2]); sy = Math.hypot(v[4], v[5], v[6]);
      }
    }
    const sc = cs.scale;
    if (sc && sc !== 'none') {
      const v = sc.trim().split(/\s+/).map(Number);
      if (v.length === 1) { sx *= v[0]; sy *= v[0]; }
      else { sx *= v[0]; sy *= v[1]; }
      txt += (txt ? ' + ' : '') + 'scale:' + sc;
    }
    return { sx, sy, txt };
  }

  function pathOf(el) {
    const out = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  }

  const out = [];
  const all = app.querySelectorAll('*');
  for (const el of all) {
    const kind = iconKind(el);
    if (!kind && !opt.all) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;               /* 안 보이는 것은 안 센다 */
    /* 자기 + 조상 누적 */
    let sx = 1, sy = 1, own = '', chain = [];
    let e = el;
    while (e && e !== document.documentElement) {
      const cs = getComputedStyle(e);
      const s = selfScale(cs);
      if (Math.abs(s.sx - 1) > 1e-6 || Math.abs(s.sy - 1) > 1e-6) {
        sx *= s.sx; sy *= s.sy;
        chain.push(pathOf(e) + ' {' + s.txt + '}');
        if (e === el) own = s.txt;
      }
      e = e.parentElement;
    }
    if (sy === 0) continue;
    let ratio = sx / sy;
    /* ⚠ 이미지는 transform 이 등방이어도 «상자 종횡비 ≠ 원본 종횡비 + object-fit:fill» 이면
       그대로 찌그러진다(`.gem>.cic{width:58;height:47;object-fit:fill}` 가 그 자리였다).
       그래서 img 는 transform 비가 아니라 **화면 종횡비 ÷ 원본 종횡비**를 본다. */
    let imgNote = '';
    if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight) {
      const fit = getComputedStyle(el).objectFit;
      if (fit === 'fill') {
        const shown = (r.width / r.height);
        const nat = (el.naturalWidth / el.naturalHeight);
        ratio = shown / nat;
        imgNote = `object-fit:fill · 원본 ${el.naturalWidth}×${el.naturalHeight}`;
      }
    }
    out.push({
      /* ⚠ SVG 노드의 `className` 은 문자열이 아니라 `SVGAnimatedString` 이라 `.slice` 가 없다.
         23 훈련의 ↑ 돌파 버튼(`#trUp`)이 SVG 라 이 한 줄이 그 화면 진입을 통째로 죽이고 있었다
         (5회차에 잡음 — 스캐너가 못 도는 화면은 래칫 [B] 의 감시 밖이다 = 헛초록). */
      kind, sel: pathOf(el), txt: (ownText(el).trim() || el.getAttribute('class') || '').slice(0, 12),
      sx: +sx.toFixed(4), sy: +sy.toFixed(4), ratio: +ratio.toFixed(4),
      own: own + (imgNote ? (own ? ' + ' : '') + imgNote : ''), chain,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    });
  }
  return out;
};

module.exports = { SCREENS, COLLECT, URL, TOL, derivePassScreens, PASS_SCREENS, HTML };

if (require.main !== module) return;

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        /* ⚑ 443 — 안 맞는 셀렉터는 **조용히 넘어가지 않는다**. 예전에는 `if (el) el.click()` 이라
           그 줄이 직전 화면을 두 번 세고도 아무 표시가 없었다(397·443 이 같은 자리에서 두 번). */
        const found = await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}' 가 DOM 에 없다`);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(250);
      const got = await page.evaluate(COLLECT, { all: ALL });
      for (const g of got) rows.push(Object.assign({ screen: label }, g));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  /* 같은 자리가 화면마다 반복되므로 «선택자 + 비율» 로 접는다 */
  const bad = rows.filter((r) => Math.abs(r.ratio - 1) > TOL);
  const byKey = new Map();
  for (const r of bad) {
    const k = r.sel + '|' + r.ratio;
    if (!byKey.has(k)) byKey.set(k, Object.assign({}, r, { screens: new Set() }));
    byKey.get(k).screens.add(r.screen);
  }
  const list = [...byKey.values()].map((r) => {
    r.screens = [...r.screens];
    return r;
  }).sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, scanned: rows.length, bad: bad.length, groups: list, errs }, null, 1));
  } else {
    console.log(`[scan356] 아이콘 노드 ${rows.length}개 관측 · 비균등(|sx/sy−1| > ${TOL}) ${bad.length}개 → ${list.length}자리`);
    for (const r of list) {
      const pct = ((r.ratio - 1) * 100).toFixed(1);
      console.log(`  ${r.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${r.kind}] ${r.sel}  «${r.txt}»  ${r.w}×${r.h}`);
      console.log(`      화면: ${r.screens.join(', ')}`);
      for (const c of r.chain) console.log(`      ← ${c}`);
    }
    if (errs.length) { console.log('\n[!] 화면 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
