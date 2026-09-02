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
 * 그래서 판정은 **k 의 종류 수**다 — 1종이면 «한 그릇», 2종 이상이면 결함이다.
 * (겹침은 그 결과이지 원인이 아니므로 같이 찍되 판정은 k 로 한다.)
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
  { id: '55',  name: '설정',              sel: '#svw',   open: `openSave&&openSave()` },
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
      for (const fh of FRAMES) {
        if (fh === BASE) continue;
        const o = mapAt(fh).get(key);
        if (!o || o.cb !== it.cb) continue;      /* 담는 상자가 바뀌면 비교 불가 */
        ks.push((o.rel - it.rel) / (fh - BASE));
      }
      if (!ks.length) continue;
      /* 프레임 5종의 k 가 서로 다르면(비선형) 최대·최소를 같이 남긴다 */
      const kmin = Math.min(...ks), kmax = Math.max(...ks);
      anchors.set(key, { k: (kmin + kmax) / 2, spread: kmax - kmin, name: kName((kmin + kmax) / 2), cb: it.cb, it });
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
      if (kk.size > 1) mixedBoxes.push({ cb, kinds: [...kk.entries()].map(([k, v]) => ({ k, n: v.length, els: v.slice(0, 6) })) });
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
      const mixed = r.mixedBoxes.length > 0;
      if (mixed) bad++; else ok++;
      const ovl = FRAMES.map((f) => `${f}:${r.overlaps[f].n}`).join(' ');
      console.log(`  [${mixed ? '❌' : '✅'}] ${r.id} ${r.name.padEnd(14)} ${String(r.host).padEnd(8)} 요소 ${String(r.n).padStart(3)} · 앵커 ${r.kinds.map((k) => `${k.k}×${k.n}`).join(' + ')}${r.exempted.length ? ' · 예외 ' + r.exempted.join(',') : ''} · 겹침 ${ovl}`);
      for (const b of r.mixedBoxes) {
        console.log(`        └ 섞인 그릇 ${b.cb}`);
        for (const k of b.kinds) console.log(`            ${k.k.padEnd(7)} ${k.els.join(' ')}${k.n > k.els.length ? ` …+${k.n - k.els.length}` : ''}`);
      }
    }
    console.log(`\n  요약 — 한 그릇(앵커 1종) ${ok} · 섞임(앵커 2종 이상) ${bad} · 미측정 ${skipped}`);
  }
  await browser.close();
})();
