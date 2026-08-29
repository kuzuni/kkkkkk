#!/usr/bin/env node
/* 402 검증 — 던전 입장권이 «던전마다 한 장» 인가
 *
 *   node tools/verify402.js
 *
 * 주인 지시(2026-08-29): «던전 입장권 색이 다 달라야하는데 안그러고 있네 수정해».
 * 결손은 그림이 아니라 **매핑**이었다 — `dunTk()` 의 마지막 폴백 `'tkRelic'` 이 relic1~4 네 던전을
 * 같은 보라 한 장으로 접었고, `DUN_UI[].tk` 에도 그 값이 **손으로 네 번** 적혀 있었다(probe402 재현).
 *
 * 이 자가 보는 것:
 *   [A] 매핑   — 8던전의 권종 키가 CUR_ICON 에 전부 있다(폴백의 «조용한 골드» 에 안 기댄다) ·
 *                권종·그림이 던전마다 유일하다(중복 0건) · 유물 4단이 서로 다르다.
 *   [B] 자산   — 새 4장이 실재하고, **껍데기 기하가 기존 장들과 픽셀 동일**하며 색만 다르다 ·
 *                색이 그 던전 카드의 두 톤(`DUN_UI[id].s`/`.r`)과 같다.
 *   [C] 화면   — 03 카드 · 04 세부 팝업 · 13 재화 교환 카드 **세 자리**가 실제 진입점에서
 *                던전마다 다른 그림을 그린다(선언이 아니라 그려진 `<img src>` 를 센다).
 *   [D] 잔재   — 옛 단일 출처가 남아 있지 않다: `tkRelic` 키 · `cur-ticket-relic.svg` 파일 ·
 *                `DUN_UI[].tk` 사본 · `CUR_ALIAS` 의 죽은 `ticket`/`tk` · `#dgdTki` 정적 기본값.
 *   [E] 탑     — 스코프는 `DUNGEONS` 8개다. 탑 2장(tower·despair)은 «♾️ 없음» 을 그리고
 *                죽은 `tk:` 필드가 사라졌다(despair 는 입장권이 아니라 **단련석** 아이콘이었다).
 *   [F] 세이브 — 이관 «없음» 이 정답임을 실물로 못 박는다. `S.dunTk` 는 처음부터 던전 id 별이라
 *                구 세이브를 실제로 로드해도 8칸 수량이 한 값도 안 바뀐다(KEY 안 올렸다).
 *   §R 되돌림 시험 — 수리를 되돌린 사본이 실제로 빨개지는가(무르게 푼 자가 아님을 못 박는다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const bare = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
                     .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

/* 입장권 SVG 의 «껍데기 기하» = 첫 path 의 d. 402 처방이 «픽셀 동일» 을 요구한 그 한 줄이다. */
const shellD = (txt) => (txt.match(/<path d="(M4 17h56[^"]*)"/) || [])[1] || null;
const fills = (txt) => [...txt.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1000);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const guard = (r, tag) => { if (r && r.__err) { ok(false, tag + ' evaluate 실패', r.__err); return true; } return false; };

  /* ══════════ [A] 매핑 ══════════════════════════════════════════════ */
  blk('[A] 매핑 — dunTk() 가 던전을 접지 않는가');
  const A = await ev(() => DUNGEONS.map((d) => ({
    id: d.id, k: dunTk(d.id), src: CUR_ICON[dunTk(d.id)] || null,
  })));
  if (!guard(A, 'A')) {
    const miss = A.filter((x) => !x.src);
    ok(miss.length === 0, 'A1 8던전의 권종 키가 CUR_ICON 에 전부 있다(조용한 골드 폴백 0건)',
       miss.length ? miss.map((x) => x.id + '→' + x.k).join(',') : A.map((x) => x.id + ':' + x.k).join(' · '));
    ok(A.length === 8, 'A2 스코프는 DUNGEONS 8개다(탑 2장은 여기 없다)', A.length + '개');
    ok(new Set(A.map((x) => x.k)).size === A.length, 'A3 권종 키가 던전마다 유일하다',
       A.length + '던전 → ' + new Set(A.map((x) => x.k)).size + '종');
    ok(new Set(A.map((x) => x.src)).size === A.length, 'A4 권종 **그림**이 던전마다 유일하다(중복 0건)',
       [...new Set(A.map((x) => String(x.src).split('/').pop()))].join(', '));
    const rel = A.filter((x) => /^relic\d$/.test(x.id));
    ok(rel.length === 4 && new Set(rel.map((x) => x.src)).size === 4,
       'A5 유물 던전 4단이 서로 다른 그림이다(주인이 본 «보라 넷» 이 사라졌다)',
       rel.map((x) => x.id + ':' + String(x.src).split('/').pop().replace('cur-ticket-', '').replace('.svg', '')).join(' · '));
    /* 폴백 문자열을 되살리지 못하게 — 이름은 id 에서 기계적으로 나온다 */
    const derived = A.every((x) => x.k === 'tk' + x.id.charAt(0).toUpperCase() + x.id.slice(1));
    ok(derived, 'A6 권종 이름이 던전 id 에서 기계적으로 나온다(표·폴백 문자열 없음)',
       derived ? '8/8' : A.map((x) => x.id + '→' + x.k).join(','));
  }

  /* ══════════ [B] 자산 ══════════════════════════════════════════════ */
  blk('[B] 자산 — 8장이 «갈리면서 한 세트» 인가 (412 로 갈아 끼운 절)');
  const NEW = ['relic1', 'relic2', 'relic3', 'relic4'];
  const OLDS = ['gold', 'dia'];
  const ALL8 = NEW.concat(OLDS, ['stone', 'rstone']);
  const files = {};
  let readBad = [];
  for (const n of ALL8) {
    const p = path.join(ROOT, 'assets/ui/cur-ticket-' + n + '.svg');
    if (!fs.existsSync(p)) { readBad.push(n); continue; }
    files[n] = fs.readFileSync(p, 'utf8');
  }
  ok(readBad.length === 0, 'B1 입장권 SVG 8장이 실재한다(새 4장 포함)',
     readBad.length ? '없음: ' + readBad.join(',') : Object.keys(files).length + '장');
  const shells = Object.entries(files).map(([n, t]) => [n, shellD(t)]);
  const shellBad = shells.filter(([, d]) => d !== shells[0][1]);
  ok(shells.length > 0 && shellBad.length === 0,
     'B2 껍데기 기하(첫 path d)가 8장 픽셀 동일 — 색만 다르다',
     shellBad.length ? shellBad.map(([n]) => n).join(',') : shells[0][1]);
  const bandD = (txt) => (txt.match(/<path d="(M10 23h44[^"]*)"/) || [])[1] || null;
  const bands = Object.entries(files).map(([n, t]) => [n, bandD(t)]);
  ok(bands.every(([, d]) => d && d === bands[0][1]),
     'B3 속띠 기하(둘째 path d)도 8장 픽셀 동일 — «한 세트» 를 지탱하는 두 줄이다',
     bands.filter(([, d]) => d !== bands[0][1]).map(([n]) => n).join(',') || '8/8');

  /* ── 412 —— «확실하게 갈리는가» 와 «한 세트로 읽히는가» 를 같은 절에서 잰다.
     402 의 옛 B4 «색 = DUN_UI.s/.r» 은 여기서 폐기됐다 — 그 규칙이 곧 결손이었기 때문이다
     (유물 카드 3장이 색상각 6° 안이라 권종도 6° 안으로 굳었다 · probe412 로 12.4 재현).
     자리를 비우지 않고 **주인 지시가 새로 세운 규칙**으로 갈아 끼운다(333·402 처방):
       ① 쌍별 최소 ΔE ≥ 35   ② «Δh ≥ 30° 또는 ΔL ≥ 18»(둘을 AND 가 아니라 각각)
       ③ 한 밴드(L* 폭 ≤ 4 · 최소 C* ≥ 30)  ④ 테는 같은 색상의 어두운 짝
     ⚠ 이 자는 카드색을 **안 본다** — 402 의 «카드↔권종 색 연상» 은 주인 지시로 끊겼고,
        대신 «껍데기·속띠 기하 픽셀 동일»(B2·B3)과 «문양 규격 공용»(B8)이 세트를 지탱한다. */
  /* ── 430 이관(주인 재재지시 2026-08-30 «노랑(황금) … 파랑(룬) 으로 해야할거 같다») ─────────
     412 가 세운 두 규칙이 여기서 **폐기**됐다 — ⓐ «L* 폭 ≤ 4 한 밴드» · ⓑ «최소 C* ≥ 30».
     그 둘이 여덟을 전부 L*64 중채도로 묶어 색상환 이웃 넷을 «파랑 계열 넷» 으로 만들었고
     (probe430: 412 팔레트는 이름 일치 **0/8**), 주인이 세 번째로 같은 결함을 지적했다.
     자리는 비우지 않는다(333 처방) — B6 은 정반대 축(«회색조 사다리»)으로 갈아 끼웠고,
     «이름대로의 색인가» 는 tools/verify430.js [A] 가 **찍힌 픽셀**로 본다.
     B5 에는 축이 하나 늘었다(채도) — 430 팔레트에는 무채색 2장(회색·흰색)이 있어서
     «채도가 0 이라는 것» 자체가 갈림의 축이다(회색 ↔ 파랑은 색상각이 아니라 채도로 갈린다). */
  const DE_MIN = 35, DH_MIN = 30, DL_MIN = 18, DC_MIN = 25, GRAY_MIN = 8;
  const finv = (t) => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
  const lab = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = finv(((n >> 16) & 255) / 255), g = finv(((n >> 8) & 255) / 255), b = finv((n & 255) / 255);
    const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
    const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
    const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = k(X), fy = k(Y), fz = k(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const hueOf = (l) => (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360;
  const chOf = (l) => Math.hypot(l[1], l[2]);
  const dHue = (a, b) => { const d = Math.abs(hueOf(a) - hueOf(b)); return d > 180 ? 360 - d : d; };
  /* fills(txt)[0] = 껍데기 · [1] = 속띠 (B2·B3 이 그 순서를 못 박는다) */
  const tone = {};
  for (const n of ALL8) { const f = fills(files[n] || ''); tone[n] = { s: f[0], r: f[1] }; }
  const pairs = [];
  for (let i = 0; i < ALL8.length; i++) for (let j = i + 1; j < ALL8.length; j++) {
    const a = ALL8[i], b = ALL8[j], la = lab(tone[a].r), lb = lab(tone[b].r);
    pairs.push({ p: a + '↔' + b, e: dE(la, lb), h: dHue(la, lb), l: Math.abs(la[0] - lb[0]),
                 c: Math.abs(chOf(la) - chOf(lb)) });
  }
  pairs.sort((x, y) => x.e - y.e);
  ok(pairs.length === 28 && pairs[0].e >= DE_MIN,
     'B4 속띠 28쌍의 최소 ΔE ≥ ' + DE_MIN + ' (412 전 실측 12.4 — dia↔rstone)',
     '최소 ' + pairs[0].e.toFixed(1) + ' (' + pairs[0].p + ') · 중앙값 ' + pairs[14].e.toFixed(1));
  const weak = pairs.filter((r) => r.h < DH_MIN && r.l < DL_MIN && r.c < DC_MIN);
  ok(weak.length === 0,
     'B5 «색상각 ≥ ' + DH_MIN + '° 또는 L* 차 ≥ ' + DL_MIN + ' 또는 C* 차 ≥ ' + DC_MIN + '» 을 못 넘는 쌍 0건',
     weak.length ? weak.map((r) => r.p + ' Δh' + r.h.toFixed(0) + '/ΔL' + r.l.toFixed(0) + '/ΔC' + r.c.toFixed(0)).join(', ')
                 : '0건 (축 셋 — 색상 · 명도 · 채도)');
  /* B6 — 412 의 «한 밴드» 자리에 430 의 정반대 규칙이 들어왔다: 회색조에서도 갈려야 한다.
     412 는 이 자리에서 L* 폭 0.1 로 초록이었고, 그 초록이 곧 주인이 본 결함이었다. */
  const Ls = ALL8.map((n) => lab(tone[n].r)[0]).sort((a, b) => a - b);
  let gmin = 1e9, gp = '';
  for (let i = 1; i < Ls.length; i++) if (Ls[i] - Ls[i - 1] < gmin) { gmin = Ls[i] - Ls[i - 1]; gp = Ls[i - 1].toFixed(1) + '→' + Ls[i].toFixed(1); }
  ok(gmin >= GRAY_MIN,
     'B6 회색조(L* 만) 최소 인접차 ≥ ' + GRAY_MIN + ' — 430 이 412 의 «한 밴드»(0.0)를 폐기한 자리',
     gmin.toFixed(1) + ' (' + gp + ') · 사다리 ' + Ls.map((x) => x.toFixed(0)).join('/'));
  /* B7 — 테는 여전히 «같은 손잡이» 지만, 430 의 무채색 2장(회색·흰색)은 색상각이 없다.
     ⇒ 유채색은 «같은 색상의 어두운 짝», 무채색은 «중성 회색». 밝은 장(노랑·흰색·주황)은
        테를 채움 −26 에 두면 배경에서 녹으므로 **테 L* 상한 45** 로 눌렀다(문양 잉크도 그 테색이다). */
  const twoTone = ALL8.map((n) => {
    const ls = lab(tone[n].s), lr = lab(tone[n].r);
    return { n, dh: dHue(ls, lr), dl: lr[0] - ls[0], sl: ls[0], sc: chOf(ls), rc: chOf(lr) };
  });
  const ttBad = twoTone.filter((t) => (t.rc <= 8 ? t.sc > 8 : t.dh > 6) || t.dl < 15 || t.sl > 45);
  ok(ttBad.length === 0,
     'B7 테는 «더 어두운 짝» 이다(유채색 Δh ≤ 6° · 무채색 C* ≤ 8 · ΔL ≥ 15 · 테 L* ≤ 45)',
     ttBad.length ? ttBad.map((t) => t.n + ' Δh' + t.dh.toFixed(0) + '/ΔL' + t.dl.toFixed(1) + '/테L*' + t.sl.toFixed(0)).join(', ')
                  : 'ΔL ' + twoTone.map((t) => t.dl.toFixed(0)).join('/'));

  /* ── 문양 — 색이 죽어도 남는 축(색각 이상·회색조·저해상도) */
  const motif = {};
  for (const n of ALL8) motif[n] = [...(files[n] || '').matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).slice(2);
  const sig = {}; ALL8.forEach((n) => sig[n] = motif[n].join('|'));
  const dup = [];
  for (let i = 0; i < ALL8.length; i++) for (let j = i + 1; j < ALL8.length; j++)
    if (sig[ALL8[i]] === sig[ALL8[j]]) dup.push(ALL8[i] + '↔' + ALL8[j]);
  ok(dup.length === 0, 'B8 속 문양 path 중복 0건 — 8장이 서로 다른 실루엣이다(412 전 6장이 같은 별 = 15쌍)',
     dup.length ? dup.join(', ') : '8장 → ' + new Set(Object.values(sig)).size + '종');
  /* B9 — 430 이관: 잉크가 «흰색 고정» 에서 «흰색 ↔ 테색 중 대비가 큰 쪽» 으로 넓어졌다.
     채움이 밝은 장 셋(노랑 L*85.8 · 흰색 100 · 주황 74)은 흰 문양이 1.0~2.0:1 로 안 보인다.
     넓어진 것은 **잉크 하나뿐**이고 나머지 규격(opacity .92 · stroke = 테색 · width 1.6)은 그대로다.
     «어느 쪽을 골랐나» 의 판정은 verify430 [D3] 이 대비로 본다(여기서는 규격만). */
  const specBad = ALL8.filter((n) => {
    const m = (files[n] || '').match(/<path d="[^"]+" fill="(#[0-9A-Fa-f]{6})" opacity="\.92" stroke="(#[0-9A-Fa-f]{6})" stroke-width="1\.6"/);
    if (!m) return true;
    const ink = m[1].toUpperCase();
    return (ink !== '#FFFFFF' && ink !== tone[n].s) || m[2].toUpperCase() !== tone[n].s;
  });
  ok(specBad.length === 0,
     'B9 문양 획 규격이 8장 공용이다(잉크 = 흰색 또는 그 장의 테색 · opacity .92 · stroke = 테색 · width 1.6)',
     specBad.length ? specBad.join(',') : '8/8');
  /* 잉크 bbox — «실루엣만 바꾸고 덩치는 같게» 를 브라우저 getBBox 로 잰다(선언이 아니라 그려진 것) */
  const BOX = await ev((mo) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64'); svg.style.position = 'absolute'; svg.style.left = '-999px';
    document.body.appendChild(svg);
    const out = {};
    for (const k in mo) {
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      for (const d of mo[k]) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); svg.appendChild(p);
        const b = p.getBBox();
        x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
        svg.removeChild(p);
      }
      out[k] = { w: x2 - x1, h: y2 - y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
    }
    svg.remove();
    return out;
  }, motif);
  if (!guard(BOX, 'B10')) {
    const ws = ALL8.map((n) => BOX[n].w), hs = ALL8.map((n) => BOX[n].h);
    const rw = Math.max(...ws) / Math.min(...ws), rh = Math.max(...hs) / Math.min(...hs);
    ok(rw <= 1.05 && rh <= 1.05,
       'B10 문양 잉크 덩치가 한 세트다(최대÷최소 ≤ 1.05 — 411 이 세운 눈금)',
       'w ' + rw.toFixed(3) + ' · h ' + rh.toFixed(3) + ' · ' + ws[0].toFixed(1) + '×' + hs[0].toFixed(1));
    const offBad = ALL8.filter((n) => Math.abs(BOX[n].cx - 32) > 1 || Math.abs(BOX[n].cy - 35.5) > 1);
    ok(offBad.length === 0, 'B11 문양 중심이 8장 같은 자리다 (32, 35.5) ±1',
       offBad.length ? offBad.map((n) => n + ' (' + BOX[n].cx.toFixed(1) + ',' + BOX[n].cy.toFixed(1) + ')').join(', ')
                     : '8/8');
  }

  /* ══════════ [C] 화면 세 자리 ══════════════════════════════════════ */
  blk('[C] 화면 — 03 카드 · 04 세부 · 13 교환 카드가 실제로 그린 그림');
  const C = await ev(() => {
    const nm = (el) => (el ? el.getAttribute('src').split('/').pop() : null);
    /* 카드 8장이 전부 보이도록 **해금만** 연다(cap72 선례 — 상태 조작은 해금 축 하나) */
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach((u) => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
    openDungeon();
    const card = {}, det = {}, ex = {};
    DUNGEONS.forEach((d) => {
      card[d.id] = nm(document.querySelector('#dunList [data-dcard="' + d.id + '"] .sp.tk img.cic'));
    });
    for (const d of DUNGEONS) {
      openDunDetail(d);
      det[d.id] = nm(document.querySelector('#dgdTki img.cic'));
      closeDunDetail();
    }
    openShopTab('coin');
    document.querySelectorAll('#shopList .cn-cd.dtk').forEach((c) => {
      const bt = c.querySelector('[data-dunex]');
      if (bt) ex[bt.dataset.dunex] = nm(c.querySelector('.pn img.cic'));
    });
    return { card, det, ex, want: DUNGEONS.reduce((o, d) => (o[d.id] = CUR_ICON[dunTk(d.id)].split('/').pop(), o), {}) };
  });
  if (!guard(C, 'C')) {
    for (const [tag, key, where] of [['C1', 'card', '03 던전 카드 `.sp.tk`'],
                                     ['C2', 'det', '04 세부 팝업 `#dgdTki`'],
                                     ['C3', 'ex', '13 재화 교환 카드 `.cn-cd.dtk`']]) {
      const got = C[key], ids = Object.keys(C.want);
      const bad = ids.filter((id) => got[id] !== C.want[id]);
      const kinds = new Set(ids.map((id) => got[id]));
      ok(bad.length === 0 && kinds.size === ids.length,
         tag + ' ' + where + ' — 8던전이 서로 다른 그림 · 선언과 일치',
         bad.length ? bad.map((id) => id + ' 그림 ' + got[id] + ' ≠ 선언 ' + C.want[id]).join(' | ')
                    : ids.length + '장 → ' + kinds.size + '종');
    }
  }

  /* ══════════ [D] 잔재 ══════════════════════════════════════════════ */
  blk('[D] 잔재 — 옛 단일 출처가 남아 있지 않은가');
  const cl = bare(SRC);
  ok(!/['"]tkRelic['"]/.test(cl), "D1 소스에 `'tkRelic'` 리터럴 0건(주석 제외)",
     (cl.match(/['"]tkRelic['"]/g) || []).length + '건');
  ok(!fs.existsSync(path.join(ROOT, 'assets/ui/cur-ticket-relic.svg')),
     'D2 옛 공용 그림 `cur-ticket-relic.svg` 가 없다(4장이 갈라 가졌다)');
  ok(!/\btk\s*:\s*curIc\(/.test(cl), 'D3 `DUN_UI[].tk` 사본 0건(카드는 dunTk() 한 곳에서만 읽는다)',
     (cl.match(/\btk\s*:\s*curIc\(/g) || []).length + '건');
  const alias = (cl.match(/const CUR_ALIAS = \{[\s\S]*?\};/) || [''])[0];
  ok(alias && !/\b(?:ticket|tk)\s*:/.test(alias),
     'D4 CUR_ALIAS 에 죽은 `ticket`/`tk` 항이 없다(쓰는 곳 0곳이었고 보라로 굳은 함정이었다)',
     alias.replace(/\s+/g, ' ').slice(0, 120));
  ok(!/id="dgdTki"[^>]*data-cur-slot/.test(cl),
     'D5 `#dgdTki` 에 정적 기본값이 없다(던전마다 다른 자리에는 «기본 권종» 이 없다)');

  /* ══════════ [E] 탑 2장 ════════════════════════════════════════════ */
  blk('[E] 탑 — 스코프 밖이고 죽은 필드가 사라졌다');
  const E = await ev(() => {
    dunSub = 'tower'; renderDunPage();
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach((c) => {
      const sp = c.querySelector('.sp.tk');
      out.push({ nm: (c.querySelector('.nm i') || {}).textContent || '?',
                 txt: (sp ? sp.textContent : '').replace(/\s+/g, ''),
                 img: sp && sp.querySelector('img') ? sp.querySelector('img').getAttribute('src') : null });
    });
    dunSub = 'dun'; renderDunPage();
    return { rows: out, inDun: DUNGEONS.some((d) => d.id === 'tower' || d.id === 'despair'),
             hasTk: ('tk' in DUN_UI.tower) || ('tk' in DUN_UI.despair) };
  });
  if (!guard(E, 'E')) {
    ok(!E.inDun, 'E1 탑 2장은 `DUNGEONS` 에 없다(209 — 입장권 없음)');
    ok(E.rows.length >= 2 && E.rows.every((x) => !x.img && /없음/.test(x.txt)),
       'E2 탑 카드 `.sp.tk` 는 «♾️ 없음» 이고 그림을 안 그린다',
       E.rows.map((x) => x.nm + ':' + x.txt).join(' · '));
    ok(!E.hasTk, 'E3 `tower.tk`·`despair.tk` 죽은 필드가 사라졌다(despair 는 **단련석** 아이콘이었다)');
  }

  /* ══════════ [F] 세이브 이관 «없음» ════════════════════════════════ */
  blk('[F] 세이브 — 이관 «없음» 이 정답임을 실물로');
  const F = await ev(() => {
    /* 구 세이브(권종이 접혀 있던 시절) 를 실제로 만들어 로드한다.
       `S.dunTk` 는 처음부터 **던전 id 별**이라 계열을 쪼개도 한 값이 안 바뀌어야 한다. */
    const before = {}; DUNGEONS.forEach((d, i) => { before[d.id] = 3 + i; });
    S.dunTk = JSON.parse(JSON.stringify(before));
    save();
    const raw = localStorage.getItem(KEY);
    load();
    const after = {}; DUNGEONS.forEach((d) => { after[d.id] = S.dunTk[d.id]; });
    return { same: JSON.stringify(before) === JSON.stringify(after), before, after,
             keyInRaw: /"dunTk"/.test(String(raw)) };
  });
  if (!guard(F, 'F')) {
    ok(F.same, 'F1 구 세이브를 실로드해도 8칸 수량이 한 값도 안 바뀐다(KEY 안 올렸다)',
       JSON.stringify(F.after));
    ok(F.keyInRaw, 'F2 `S.dunTk` 는 던전 id 별로 저장돼 있다(수량은 애초에 접혀 있지 않았다)');
  }

  /* ══════════ §R 되돌림 시험 ════════════════════════════════════════ */
  blk('§R 되돌림 시험 — 수리를 되돌린 사본이 실제로 빨개지는가');
  const R = await ev(() => {
    /* 판정식 하나를 두 매핑에 통과시킨다. `dunTk` 는 `const` 라 덮을 수 없으므로(덮으려 들면
       윗줄들이 여전히 진짜를 보고 있어 시험이 «항상 초록» 이 된다 — 1회차에 실제로 그랬다)
       **옛 식을 그대로 적어 두고 같은 자에 넣는다.** */
    const kinds = (fn) => new Set(DUNGEONS.map((d) => CUR_ICON[fn(d.id)] || 'MISSING')).size;
    const folded = (id) => (id === 'gold' ? 'tkGold' : id === 'dia' ? 'tkDia'
                          : id === 'stone' ? 'tkStone' : id === 'rstone' ? 'tkRstone'
                          : 'tkRelic1');   /* ← 402 이전의 «마지막 폴백 한 문자열» */
    return { now: kinds(dunTk), old: kinds(folded), sameFn: String(dunTk) === String(folded) };
  });
  if (!guard(R, 'R')) {
    ok(R.now === 8, '§R0 수리된 지금은 8종이다', String(R.now));
    ok(R.old === 5, '§R1 옛 «폴백 한 문자열» 식을 같은 자에 넣으면 5종으로 접힌다(자가 그 결손을 본다)',
       String(R.old));
    ok(!R.sameFn && R.now !== R.old,
       '§R2 제품이 그 옛 식이 아니고, 두 매핑을 자가 서로 다르게 읽는다(«항상 초록» 이 아니다)',
       R.now + ' vs ' + R.old);
  }
  /* ⓑ 자산 층 — 껍데기 기하를 한 글자만 흔들면 B2 의 판정식이 갈라진다 */
  const tampered = (files.relic2 || '').replace('v10a5 5', 'v12a5 5');
  const tD = shellD(tampered), rD = shellD(files.relic1 || '');
  ok(tD && rD && tD !== rD,
     '§R3 껍데기 d 를 한 글자만 바꿔도 B2 의 판정식이 갈라진다(기하 자가 무르지 않다)',
     String(tD) + ' ≠ ' + String(rD));
  /* ⓒ 화면 층 — «카드가 옛 사본을 그린다» 를 흉내 내면 C1 의 판정식이 잡는다 */
  if (!(C && C.__err)) {
    const ids = Object.keys(C.want);
    const faked = Object.assign({}, C.card, { relic2: C.want.relic1 });   /* 2단이 1단 그림을 그린다 */
    const caught = ids.some((id) => faked[id] !== C.want[id])
                && new Set(ids.map((id) => faked[id])).size !== ids.length;
    ok(caught, '§R4 카드 한 장이 남의 권종을 그리면 C1 의 판정식이 잡는다(중복·불일치 두 축 모두)',
       caught ? 'relic2 → ' + C.want.relic1 + ' 을 두 축이 다 잡았다' : '못 잡았다');
  }

  /* ⓓ 412 색 층 — 한 장을 «412 이전 이웃 색» 으로 되돌리면 B4·B5 판정식이 갈라지는가.
     제품 파일은 안 건드리고 **같은 판정식에 두 팔레트를 통과**시킨다(§R1 과 같은 꼴 —
     1회차에 `dunTk` 를 덮으려다 헛초록이 났던 그 함정을 피한다). */
  {
    const worst = (map) => {
      let mn = 1e9, mp = '', weakN = 0;
      const ks = Object.keys(map);
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
        const a = lab(map[ks[i]]), b = lab(map[ks[j]]);
        const e = dE(a, b), h = dHue(a, b), l = Math.abs(a[0] - b[0]);
        const c = Math.abs(chOf(a) - chOf(b));
        if (e < mn) { mn = e; mp = ks[i] + '↔' + ks[j]; }
        if (h < DH_MIN && l < DL_MIN && c < DC_MIN) weakN++;
      }
      return { mn, mp, weakN };
    };
    const now = {}; ALL8.forEach((n) => now[n] = tone[n].r);
    /* ← 430 이관: 되돌림 표본이 «이웃 계열로 접힌 한 장» 이다(402 의 «보라 넷» 이 그 꼴이었다).
       412 시절 표본(`rstone: '#2FD4C4'`)은 430 팔레트에서는 아무 쌍과도 안 가까워
       §R5 가 «되돌려도 초록» 이 됐다 — 표본을 지금 팔레트의 이웃(갈색 옆 밝은 갈색)으로 갈아 끼운다. */
    const old = Object.assign({}, now, { relic3: '#8C4A18' });
    const N = worst(now), O = worst(old);
    ok(N.mn >= DE_MIN && O.mn < DE_MIN,
       '§R5 한 장을 이웃 계열로 되돌리면 B4 가 빨개진다(자가 무르지 않다)',
       '지금 ' + N.mn.toFixed(1) + ' (' + N.mp + ') vs 되돌림 ' + O.mn.toFixed(1) + ' (' + O.mp + ')');
    ok(N.weakN === 0 && O.weakN > 0,
       '§R6 그 되돌림은 B5(«색상각 또는 명도») 도 같이 빨갛게 한다',
       '지금 0건 vs 되돌림 ' + O.weakN + '건');
  }
  /* ⓔ 412 문양 층 — 한 장이 남의 실루엣을 베끼면 B8 판정식이 잡는가 */
  {
    const faked = Object.assign({}, sig, { relic3: sig.relic1 });
    const ks = Object.keys(faked);
    let n = 0;
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (faked[ks[i]] === faked[ks[j]]) n++;
    ok(n === 1, '§R7 한 장이 남의 문양을 베끼면 B8 의 중복 세기가 잡는다(색이 죽는 경우의 안전망)',
       '베낀 사본 중복 ' + n + '쌍 vs 지금 ' + dup.length + '쌍');
  }

  blk('콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY402 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
