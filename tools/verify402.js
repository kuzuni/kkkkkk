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
  blk('[B] 자산 — 새 4장이 «기하 동일 · 색만 다름» 인가');
  const NEW = ['relic1', 'relic2', 'relic3', 'relic4'];
  const OLDS = ['gold', 'dia'];   /* 별 문양을 공유하는 기존 장 = 기하 기준선 */
  const files = {};
  let readBad = [];
  for (const n of NEW.concat(OLDS, ['stone', 'rstone'])) {
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
  const B3 = await ev((ns) => ns.map((n) => ({ n, s: DUN_UI[n].s.toUpperCase(), r: DUN_UI[n].r.toUpperCase() })), NEW);
  if (!guard(B3, 'B3')) {
    const colBad = [];
    for (const c of B3) {
      const f = fills(files[c.n] || '');
      /* 껍데기 = DUN_UI.s · 속띠 = DUN_UI.r (그 던전 카드의 두 톤 그대로) */
      if (f[0] !== c.s || f[1] !== c.r) colBad.push(c.n + ' [' + f.slice(0, 2).join(',') + '] ≠ [' + c.s + ',' + c.r + ']');
    }
    ok(colBad.length === 0, 'B4 새 4장의 색이 그 던전 카드의 두 톤(DUN_UI.s / .r)과 같다',
       colBad.length ? colBad.join(' | ') : B3.map((c) => c.n + ':' + c.s + '/' + c.r).join(' · '));
    ok(new Set(B3.map((c) => c.r)).size === 4, 'B5 속띠 4색이 서로 다르다', B3.map((c) => c.r).join(','));
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

  blk('콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY402 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
