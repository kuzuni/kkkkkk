#!/usr/bin/env node
/* 작업 144 — «22 보상 프레임 안 아이콘 잉크가 ref 대비 작다» 진단기.
 *
 *   node tools/probe144.js            # 표로 출력
 *   node tools/probe144.js --json a.json
 *
 * 등재(PROGRESS 144)는 원인을 «126 서체 교체가 이모지 폴백 메트릭을 바꿨다» 로 의심했다.
 * 그 가설을 확인·반증하려면 «지금 무엇이 그려지고 있는지» 부터 알아야 한다 —
 * 그래서 이 프로브는 **DOM(무엇이 들어 있나) + 픽셀(실제 잉크가 몇 px 인가)** 을 같이 낸다.
 *
 * 재는 것:
 *   ① `.qs-i`(22 보상 프레임) — 프레임 border-box · 아이콘 노드의 종류/rect · 아이콘 잉크 bbox
 *   ② `.ifr>.ifi` 를 함께 쓰는 나머지 다섯 화면(05 `.wgc` · 12 `.sm-c` · 53 `.bg53-c` ·
 *      69 `.ml-i` · 70 `.at-if`) — 같은 방식으로. «다른 화면 아이콘도 같이 줄었는가» 가
 *      폴백 가설의 판별식이다(등재 지시: 값을 바로 키우지 말 것).
 *
 * 잉크 측정 방식 — **차분**이다(ink141.js 와 같은 이유). 처음에 «면색 기준 마스크» 로 짰다가
 *   버렸다: 프레임 코너가 둥글고(r = 폭×.233) 안쪽에 등급 림 6px 이 있어서, 면색 표본을 어디서
 *   뜨든 림/검정선이 섞여 마스크가 안쪽 «전체» 를 잉크로 삼켰다(106 프레임에서 82×82 = 안쪽 전부).
 *   대신 아이콘 노드만 `visibility:hidden` 으로 껐다 켠 두 장을 빼면 프레임·림·그라디언트가
 *   통째로 상쇄돼 아이콘 잉크만 남는다. 임계는 최대채널차 > 16.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const DSF = (() => { const i = process.argv.indexOf('--dsf'); return i > 0 ? +process.argv[i + 1] : 3; })();

/* cap22.js 와 같은 세이브 — 5행 전부 진행 중, 레퍼런스와 같은 상태 */
const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 },
    upg:    { s: 4, base: 3000 - 70 },
    kill:   { s: 3, base: 1000 - 50 },
    stage:  { s: 2, base: 0 },
    coll:   { s: 1, base: 0 }
  }
};

/* 레퍼런스 규격 — 144 등재의 비평가 Y 실측 + 코드 주석의 «ref 젬 잉크 55×55» */
const REF_QS = { w: 54, h: 55, note: 'Y 실측 54×55 · .qs-i 코드 주석 55×55' };

/* 각 화면의 여는 법. 팝업이 열린 뒤 첫 프레임을 잡는다. */
const SCREENS = [
  { id: '22', sel: '.qs-i',    open: () => document.querySelector('.side .ibtn[data-pop="quest"]').click() },
  /* 05 무기 그리드 — cap05.js 와 같은 진입 */
  { id: '05', sel: '.wgc',     open: () => {
      S.own.weapon0 = { n: 0, l: 5 }; S.own.weapon1 = { n: 2, l: 2 };
      S.eqSlot.weapon = 'weapon1'; openWeapon('weapon1'); } },
  /* 12 소환 결과 10칸 — cap12.js 와 같은 진입 */
  { id: '12', sel: '.sm-c',    open: () => {
      S.dia = 1e9; const res = [];
      for (let i = 0; i < 10; i++) res.push(summonOne('weapon'));
      showSummonResult('weapon', 10, res, false); } },
  { id: '53', sel: '.bg53-c',  open: () => { openBag(); } },
  /* 69 우편 — cap69.js 와 같은 2단 진입(메뉴 → 우편) */
  { id: '69', sel: '.ml-i',    open: () => {
      document.querySelector('#menub').click();
      document.querySelector('#mnw [data-mn="mail"]').click(); } },
  { id: '70', sel: '.at-if',   open: () => document.querySelector('.side .ibtn[data-pop="attend"]').click() },
];

/* ---- 페이지 안에서 도는 잉크 측정기 ---- */
const INK_FN = function (a) {
  const sel = a.sel, dsf = a.dsf;
  const el = document.querySelector(sel);
  if (!el) return { miss: true };
  const cs = getComputedStyle(el);
  const fr = el.getBoundingClientRect();
  /* 아이콘 노드 = .ifi | .cic | em | i(배지 .ifq 제외) 중 첫 번째 */
  const icon = el.querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
  const ir = icon ? icon.getBoundingClientRect() : null;
  /* .cic 이면 그 안쪽에 또 img 가 있을 수 있다 */
  const inner = icon && icon.tagName !== 'IMG' ? icon.querySelector('img') : null;
  return {
    frame: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
    fontSize: cs.fontSize,
    ifIc: cs.getPropertyValue('--if-ic').trim(),
    ifW: cs.getPropertyValue('--if-w').trim(),
    face: cs.getPropertyValue('--if-face').trim(),
    iconTag: icon ? icon.tagName + (icon.className ? '.' + String(icon.className).split(' ').join('.') : '') : null,
    iconText: icon ? (icon.textContent || '').slice(0, 4) : null,
    iconSrc: icon && icon.tagName === 'IMG' ? icon.getAttribute('src') : (inner ? inner.getAttribute('src') : null),
    iconRect: ir ? { x: ir.x, y: ir.y, w: ir.width, h: ir.height } : null,
    innerRect: inner ? (r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(inner.getBoundingClientRect()) : null,
    dsf
  };
};

/* 스크린샷 PNG 를 페이지 안 캔버스로 되돌려 잉크를 잰다(파일 의존성 0).
 * ⚠ 전체 화면을 3× 로 찍으면 3240×6840 이라 data: URI 디코드가 실패한다 —
 *   반드시 프레임만 `clip` 으로 잘라 넘긴다(그래서 아래는 «잘린 이미지의 (0,0) = 프레임 좌상단» 이다). */
async function inkOf(page, aB64, bB64, frame, dsf) {
  return page.evaluate(async ({ aB64, bB64, frame, dsf }) => {
    const load = async (b64) => {
      const im = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i); i.onerror = () => rej(new Error('decode'));
        i.src = 'data:image/png;base64,' + b64;
      });
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height };
    };
    const A = await load(aB64), B = await load(bB64);
    if (A.W !== B.W || A.H !== B.H) return { bad: 'size mismatch' };
    const TH = 16;
    let ax = 1e9, ay = 1e9, bx = -1, by = -1, n = 0;
    for (let yy = 0; yy < A.H; yy++) for (let xx = 0; xx < A.W; xx++) {
      const i = ((yy * A.W) + xx) * 4;
      const df = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]),
                          Math.abs(A.d[i + 2] - B.d[i + 2]));
      if (df > TH) { n++; if (xx < ax) ax = xx; if (xx > bx) bx = xx; if (yy < ay) ay = yy; if (yy > by) by = yy; }
    }
    if (n === 0) return { ink: null, px: 0 };
    return {
      px: n,
      ink: {
        w: +((bx - ax + 1) / dsf).toFixed(2), h: +((by - ay + 1) / dsf).toFixed(2),
        /* 프레임 좌상단 기준 */
        left: +(ax / dsf).toFixed(2), top: +(ay / dsf).toFixed(2),
        /* 프레임 중심 대비 잉크 중심의 어긋남(+ = 잉크가 위/왼쪽) */
        cx: +((frame.w / 2) - ((ax + bx + 1) / 2 / dsf)).toFixed(2),
        cy: +((frame.h / 2) - ((ay + by + 1) / 2 / dsf)).toFixed(2)
      }
    };
  }, { aB64, bB64, frame, dsf });
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const sc of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEY, JSON.stringify(SAVE)]);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(900);
    /* 캔버스·연출이 캡처를 오염시킨다(LESSONS 28-③ · 41-④) */
    await page.evaluate(() => {
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
      window.step = () => {};
    });
    let err = null;
    try { await page.evaluate(sc.open); } catch (e) { err = String(e.message || e); }
    /* 60 쥬시 스태거·스케일이 끝나기를 기다린다(136 교훈 — 고정 400ms 는 짧다) */
    await page.waitForTimeout(1400);
    await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }));
    await page.waitForTimeout(120);

    const dom = await page.evaluate(INK_FN, { sel: sc.sel, dsf: DSF })
      .catch(e => ({ miss: true, err: String(e.message || e) }));
    let ink = null;
    if (!dom.miss && dom.frame && dom.frame.w > 0) {
      /* ⚠ `encoding:'base64'` 는 이 버전에서 Buffer 를 그대로 돌려준다 — evaluate 로 넘기면
         `[object Object]` 가 돼 디코드에서 죽는다. ink141.js 와 같이 Buffer→toString 으로 간다.
         ⚠ 전체 화면을 3× 로 찍어도 죽는다(3240×6840) — 프레임만 clip 한다. */
      const clip = { x: dom.frame.x, y: dom.frame.y, width: dom.frame.w, height: dom.frame.h };
      const shot = async () => (await page.screenshot({ clip })).toString('base64');
      const withIcon = await shot();
      /* 아이콘 노드만 끈다 — 프레임·림·그라디언트·배지는 그대로 남아 차분에서 상쇄된다 */
      await page.evaluate(({ sel }) => {
        const el = document.querySelector(sel);
        const ic = el && el.querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
        if (ic) { ic.dataset.p144vis = ic.style.visibility || ''; ic.style.visibility = 'hidden'; }
      }, { sel: sc.sel });
      await page.waitForTimeout(140);
      const without = await shot();
      await page.evaluate(({ sel }) => {
        const el = document.querySelector(sel);
        const ic = el && el.querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
        if (ic) ic.style.visibility = ic.dataset.p144vis || '';
      }, { sel: sc.sel });
      ink = await inkOf(page, withIcon, without, dom.frame, DSF);
    }
    rows.push({ id: sc.id, sel: sc.sel, openErr: err, ...dom, ...(ink || {}) });
    await ctx.close();
  }
  await browser.close();

  const fmt = r => {
    if (r.miss) return `${r.id.padStart(3)} ${r.sel.padEnd(10)}  — 요소 없음 (open: ${r.openErr || 'ok'})`;
    const i = r.ink;
    const fw = r.frame.w, fh = r.frame.h;
    return `${r.id.padStart(3)} ${r.sel.padEnd(10)} frame ${fw.toFixed(0)}x${fh.toFixed(0)}`
      + `  --if-ic ${(r.ifIc || '(기본)').padEnd(6)} fs ${r.fontSize.padEnd(7)}`
      + `  node ${String(r.iconTag).padEnd(12)} ${r.iconSrc ? 'src=' + r.iconSrc.split('/').pop() : 'text=' + JSON.stringify(r.iconText)}`
      + `\n      iconRect ${r.iconRect ? r.iconRect.w.toFixed(1) + 'x' + r.iconRect.h.toFixed(1) : '—'}`
      + `  잉크 ${i ? i.w + 'x' + i.h : '없음'}`
      + (i ? `  (프레임 채움 ${(i.w / fw * 100).toFixed(0)}%x${(i.h / fh * 100).toFixed(0)}%, 중심Δ ${i.cx}/${i.cy})` : '');
  };
  console.log('=== 144 프로브 — .ifr 여섯 화면 아이콘 잉크 ===');
  for (const r of rows) console.log(fmt(r));
  const q = rows.find(r => r.id === '22');
  if (q && q.ink) {
    console.log(`\n[22 대 ref] ref ${REF_QS.w}x${REF_QS.h} (${REF_QS.note})`);
    console.log(`           우리 ${q.ink.w}x${q.ink.h}  →  폭 ${((q.ink.w / REF_QS.w - 1) * 100).toFixed(1)}% · 높이 ${((q.ink.h / REF_QS.h - 1) * 100).toFixed(1)}%`);
  }
  if (JSON_AT) require('fs').writeFileSync(JSON_AT, JSON.stringify(rows, null, 1));
})();
