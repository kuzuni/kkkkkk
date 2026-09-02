#!/usr/bin/env node
/* 작업 811 — 재현기: «전면 오버레이가 떠 있는 동안 팝업 **밖** HUD 가 딤 너머로 읽히고,
 * 짧은 프레임에서 팝업 콘텐츠와 겹쳐 보인다»
 *
 *   node tools/probe811.js            # 전 표본
 *   node tools/probe811.js --only 18  # 한 화면만
 *   node tools/probe811.js --json     # 수치만
 *
 * ── 왜 재현기가 먼저인가(338 규칙) ────────────────────────────────────────
 * 등재문(PROGRESS 811)은 «비평가 2인 독립 일치» 로 세 자리(ⓐ 18 · ⓑ 17 · ⓒ 21·22)를 적었지만,
 * 이 저장소에서 등재문 가설이 재현에 기각된 전례가 많다(338·341·402·654·726·736·810).
 * 그러니 **처방 전에 제품에게 직접 묻는다** — 겹치는가 · 몇 px 인가 · 프레임마다 다른가.
 *
 * ⚑ 이 자가 세는 것은 «z 층» 이 아니다. 등재문이 못박은 대로 z 는 정상이다
 * (`#statw` z38 · `#defw` z39 ↔ `#top` z6 · `#tuto` · `#slots`). 재는 것은 두 가지다:
 *   ⓐ **기하** — HUD 상자와 팝업 그릇/카드 상자가 겹치는 사각형(px)
 *   ⓑ **가시성** — 딤(rgba(0,0,0,.62))을 통과해 HUD 잉크가 실제로 읽히는가.
 *     ⓑ 는 «딤을 끄고 찍은 장 ↔ 켜고 찍은 장» 의 화소 차로 재지 않는다(딤이 전면을 덮으니 전부 다르다).
 *     대신 **HUD 를 지운 장 ↔ 그대로 둔 장** 을 같은 상태에서 찍어 그 차이 화소를 센다 —
 *     차이가 0 이면 «안 읽힌다», 크면 «읽힌다» 다. 딤 위로 새는 잉크만 정확히 남는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const ARG = process.argv.slice(2);
const argOf = (n, d) => { const i = ARG.indexOf(n); return i >= 0 ? ARG[i + 1] : d; };
const ONLY = argOf('--only', null);
const JSON_ONLY = ARG.includes('--json');
/* `--revert` — 811 의 한 줄을 **주입으로 무효화**해 수리 전 상태를 그대로 되살린다.
   얕은 클론이라 «수리 전 SHA 를 꺼내는» 길은 창 밖으로 나가면 곧 썩는다(ROUTINE [-2] · 756).
   같은 트리에서 규칙만 껐다 켜므로 대조군이 늙지 않는다 — 이것이 곧 되돌림 시험이다. */
const REVERT = ARG.includes('--revert');
const UNFIX = '#app :is(#top,#tuto,#slots){visibility:visible!important}';

/* probe754·cap754 와 **같은 프레임 5종·같은 오프너 문자열**을 쓴다(자와 눈이 같은 화면을 본다). */
const FRAMES = [1600, 1841, 1920, 2280, 2600];

const HOSTS = [
  { id: '17', name: '스탯업(능력 획득)', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})` },
  { id: '18', name: '패배화면',          sel: '#defw',  open: `openDefeat()` },
  { id: '21', name: '도감보너스',        sel: '#collw', open: `openColl21()` },
  { id: '22', name: '퀘스트',            sel: '#modal', open: `openQuest()` },
  { id: '09', name: '일괄강화결과',      sel: '#upw',   open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))` },
  /* 12 소환결과는 표본에서 뺐다 — 등재문 범위(17·18·21·22)가 아니고, 그 화면의 «팝업 밖 겹침» 은
     748 이 이미 닫았다(그 review §4 가 «남은 96px 은 811 의 축» 이라고 넘긴 자리다). */
];

/* 팝업 «밖» 의 HUD — 등재문이 지목한 셋. `#top` 은 상단 재화 표시(z6 · height 104),
   `#tuto` 는 가이드 미션 트래커(하단 앵커), `#slots` 는 스킬 슬롯줄(하단 앵커). */
const HUD = [
  { key: 'top',   sel: '#top',   name: '상단 재화 표시' },
  { key: 'tuto',  sel: '#tuto',  name: '미션 트래커' },
  { key: 'slots', sel: '#slots', name: '스킬 슬롯줄' },
];

/* ⚑ `visibility:hidden` 을 «없음» 으로 접지 않는다 — 811 의 처방이 정확히 «잉크는 없고 **상자는
   살아 있다**» 이고, 그것이 512·654 비행이 안 깨지는 근거이기 때문이다. 보이는지는 `vis` 로 따로 답한다. */
const rectOf = 'el => { if(!el) return null; const r = el.getBoundingClientRect();' +
  ' const cs = getComputedStyle(el);' +
  ' if(cs.display === "none") return null;' +
  ' if(r.width <= 0 || r.height <= 0) return null;' +
  ' return {x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1),' +
  '  x2:+(r.x+r.width).toFixed(1), y2:+(r.y+r.height).toFixed(1),' +
  '  vis: !(cs.visibility === "hidden" || Number(cs.opacity) === 0)}; }';

const overlap = (a, b) => {
  if (!a || !b) return null;
  const w = Math.min(a.x2, b.x2) - Math.max(a.x, b.x);
  const h = Math.min(a.y2, b.y2) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return { w: 0, h: 0, area: 0 };
  return { w: +w.toFixed(1), h: +h.toFixed(1), area: Math.round(w * h) };
};

/* 딤을 통과해 읽히는 HUD 잉크 — «HUD 를 visibility:hidden 으로 지운 장» 과의 화소 차를 센다.
   딤·팝업·전투 캔버스는 두 장에서 같으므로 차이는 «딤 위로 새어 나온 HUD 잉크» 뿐이다. */
/* ⚠ 두 장을 «시간 차» 로 찍으므로 **애니메이션이 곧 잡음**이다. 1회차에 이것을 안 막았더니
   수리 뒤에도 자리마다 4,000~13,000 화소가 남아 «아직 읽힌다» 로 읽혔다 — 전부 딤·팝업·리본의
   자기 애니메이션이었다. 재는 동안만 전 요소의 애니메이션·트랜지션을 세운다(제품은 안 바뀐다). */
const FREEZE = '*,*::before,*::after{animation-play-state:paused!important;' +
  'transition:none!important;caret-color:transparent!important}';

/* ⚠ FREEZE 는 **CSS 애니메이션만** 세운다 — rAF 로 도는 것(전투 파티클·쿨타임 링)은 계속 움직인다.
   그래서 차이 화소를 그 요소의 **자기 상자 안**으로 가둔다: 잉크는 자기 상자를 못 벗어나므로
   밖에서 나온 차이는 정의상 잡음이다(1회차 실측 — 2280·2600 에서 `#slots` 밖 97·94 화소가 그것이었다). */
async function inkThroughDim(page, sel) {
  const shot = async () => (await (await page.$('#app')).screenshot()).toString('base64');
  const clip = await page.evaluate((s) => {
    const el = document.querySelector(s), app = document.getElementById('app');
    if (!el || !app) return null;
    const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
    const k = a.width ? (app.offsetWidth ? a.width / app.offsetWidth : 1) : 1;   /* fit() 배율 되돌림 */
    return { x: (r.x - a.x) / k, y: (r.y - a.y) / k, x2: (r.right - a.x) / k, y2: (r.bottom - a.y) / k };
  }, sel);
  /* ⚑ **잡음 바닥을 먼저 잰다.** FREEZE 도 rAF 로 도는 것(골드 숫자 롤링·쿨타임 링)은 못 세운다 —
     그래서 «아무것도 안 바꾸고 두 번 찍은» 차이를 바닥값으로 두고, 잉크는 그 위로만 읽는다.
     안 하면 수리된 트리에서도 자리마다 1,000~5,000 화소가 나와 «아직 읽힌다» 로 오독된다(1회차). */
  /* ⚑ 바닥은 **같은 시간 간격**으로 잰다 — 연속 두 장으로 재면 rAF 연출(17 리본·09 플래시)이
     바닥에는 안 잡히고 잉크에만 잡혀 수리된 트리가 거짓으로 «읽힌다» 가 된다(1회차 실측). */
  const a = await shot();
  /* ⚠ 인라인 `!important` 여야 한다 — `--revert` 가 주입하는 대조군 규칙이 `!important` 라
     그냥 `style.visibility='hidden'` 은 **진다**(1회차에 그래서 대조군이 0 을 냈다). */
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) { el.dataset.p811 = '1'; el.style.setProperty('visibility', 'hidden', 'important'); }
  }, sel);
  const b = await shot();
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el && el.dataset.p811) { el.style.removeProperty('visibility'); delete el.dataset.p811; }
  }, sel);
  const a2 = await shot();
  const base = a === a2 ? { diff: 0 } : await diffPx(page, a, a2, clip);
  if (a === b) return { diff: 0, base: base.diff || 0, same: true };
  const got = await diffPx(page, a, b, clip);
  return Object.assign(got, { base: base.diff || 0 });
}

/* 화소 차 — 브라우저 안에서 센다(메인 세션은 이미지를 안 읽는다 — 지시서 [5]). */
function diffPx(page, aB64, bB64, clip) {
  return page.evaluate(async ([ba, bb, cl]) => {
    const load = (b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64;
    });
    const [ia, ib] = await Promise.all([load(ba), load(bb)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, sum = 0, max = 0, minY = 1e9, maxY = -1, minX = 1e9, maxX = -1;
    const lo = cl ? { x: Math.max(0, Math.floor(cl.x) - 2), y: Math.max(0, Math.floor(cl.y) - 2),
      x2: Math.min(c.width, Math.ceil(cl.x2) + 2), y2: Math.min(c.height, Math.ceil(cl.y2) + 2) } : null;
    for (let i = 0; i < da.length; i += 4) {
      if (lo) {
        const p = i / 4, yy = Math.floor(p / c.width), xx = p % c.width;
        if (xx < lo.x || xx >= lo.x2 || yy < lo.y || yy >= lo.y2) continue;
      }
      /* 채널 최대차 = «그 화소가 얼마나 밝게 새는가». 합이 아니라 최대를 쓰는 이유는
         회색조 잉크(HUD 숫자는 흰색·검정 테)가 세 채널에 고르게 실려 합이 3배로 부풀기 때문이다. */
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > 4) {
        n++; sum += d; if (d > max) max = d;
        const p = i / 4, y = Math.floor(p / c.width), x = p % c.width;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
      }
    }
    return { diff: n, mean: n ? +(sum / n).toFixed(1) : 0, max, same: false,
      box: n ? { x: minX, y: minY, x2: maxX + 1, y2: maxY + 1 } : null };
  }, [aB64, bB64, clip]);
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const hosts = HOSTS.filter((h) => (ONLY ? h.id === ONLY : true));
  for (const h of hosts) {
    for (const fh of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(650);
      const err = await page.evaluate(`(()=>{ try{ ${h.open}; return null }catch(e){ return String(e&&e.message||e) } })()`);
      await page.waitForTimeout(420);
      /* 전투 캔버스는 실행마다 다르게 그려진다 — 화소 차의 잡음이 되므로 끈다(cap754 와 같은 처리). */
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
      if (REVERT) await page.addStyleTag({ content: UNFIX });   /* 되돌림 대조군 — 위 머리말 */
      await page.addStyleTag({ content: FREEZE });   /* 잡음 제거 — 위 FREEZE 머리말 */
      await page.waitForTimeout(140);

      const host = await page.$eval(h.sel, eval(`(${rectOf})`)).catch(() => null);
      /* ⚑ «그릇» 은 호스트가 아니라 **그 안에 그려진 카드**다. 호스트는 `inset:0` 전면 딤이라
         무엇과도 겹치므로 겹침을 물으면 언제나 참이 된다(1회차에 실제로 그렇게 나왔다).
         직계 자식들의 합 bbox 를 카드 상자로 본다 — 팝업이 실제로 잉크를 얹은 자리다. */
      const card = await page.evaluate((s) => {
        const el = document.querySelector(s); if (!el) return null;
        let x = 1e9, y = 1e9, x2 = -1e9, y2 = -1e9, n = 0;
        for (const c of el.children) {
          const cs = getComputedStyle(c);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
          const r = c.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          n++; x = Math.min(x, r.x); y = Math.min(y, r.y); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
        }
        return n ? { x: +x.toFixed(1), y: +y.toFixed(1), x2: +x2.toFixed(1), y2: +y2.toFixed(1),
          w: +(x2 - x).toFixed(1), h: +(y2 - y).toFixed(1) } : null;
      }, h.sel);
      /* ⚑ 512·654 짝 — 재화 비행의 **도착지**가 오버레이가 떠 있는 동안에도 살아 있는가.
         `fxPill()` 은 `getBoundingClientRect().width` 만 보므로 `visibility:hidden` 에서는
         종전과 한 값도 안 다르고, `display:none` 이면 폭 0 이 되어 비행이 통째로 사라진다. */
      const pill = await page.evaluate(() => {
        try {
          const out = {};
          for (const k of ['gold', 'dia']) {
            const C = (typeof FXCUR !== 'undefined') ? FXCUR[k] : null;
            if (!C) { out[k] = null; continue; }
            const el = fxPill(C);
            if (!el) { out[k] = null; continue; }
            const r = el.getBoundingClientRect();
            out[k] = { w: +r.width.toFixed(1), cx: +(r.x + r.width / 2).toFixed(1), cy: +(r.y + r.height / 2).toFixed(1) };
          }
          return out;
        } catch (e) { return { err: String(e && e.message || e) }; }
      });
      const rec = { id: h.id, name: h.name, frameH: fh, err, host, card, pill, hud: {} };
      for (const u of HUD) {
        const box = await page.$eval(u.sel, eval(`(${rectOf})`)).catch(() => null);
        const ink = box ? await inkThroughDim(page, u.sel) : { diff: 0, same: true };
        /* «읽힌다» 의 판정 = 잡음 바닥을 **뚜렷이** 넘는가. 바닥의 3배 + 200 화소를 문턱으로 쓴다
           (실측 — 수리 후 바닥 0~9, 수리 전 잉크 5,000~138,000. 두 무리가 세 자릿수만큼 떨어져 있어
           문턱을 어디에 놓아도 같은 답이 나온다. 그래서 문턱이 아니라 **간격**이 이 자의 근거다). */
        const floor = (ink.base || 0) * 3 + 200;
        rec.hud[u.key] = { box, ov: overlap(card, box), ink: ink.diff,
          base: ink.base || 0, read: box ? ink.diff > floor : false,
          mean: ink.mean || 0, max: ink.max || 0, inkBox: ink.box || null };
      }
      rows.push(rec);
      await ctx.close();
    }
  }
  await browser.close();

  if (JSON_ONLY) { console.log(JSON.stringify(rows, null, 1)); return; }

  console.log(`PROBE811 — 전면 오버레이 뒤 HUD 가 딤을 통과해 읽히는가 / 팝업 카드와 겹치는가`
    + `${REVERT ? '   ⟨--revert: 811 의 한 줄을 무효화한 대조군⟩' : ''}\n`);
  let bad = 0, tot = 0;
  for (const h of hosts) {
    console.log(`── ${h.id} ${h.name} (${h.sel}) ──`);
    console.log('frameH  HUD          HUD 상자                   카드와 겹침(w×h)   딤 통과 잉크(px · 평균Δ · 최대Δ)');
    for (const r of rows.filter((x) => x.id === h.id)) {
      if (r.err) { console.log(`${r.frameH}  ⚠ 오프너 오류: ${r.err}`); continue; }
      if (r.card) console.log(`${String(r.frameH).padEnd(7)} [카드] ${r.card.x}..${r.card.x2} × ${r.card.y}..${r.card.y2}`
        + `   [비행 도착지 gold] ${r.pill && r.pill.gold ? `폭 ${r.pill.gold.w} @(${r.pill.gold.cx},${r.pill.gold.cy})` : '없음 ⚠'}`);
      for (const u of HUD) {
        const d = r.hud[u.key];
        const bx = d.box ? `${d.box.x}..${d.box.x2} × ${d.box.y}..${d.box.y2}${d.box.vis ? '' : ' (잉크 꺼짐)'}` : '(display:none)';
        const ov = d.ov && d.ov.area ? `${d.ov.w}×${d.ov.h}` : (d.box ? '0' : '–');
        if (!d.box) { console.log(`${String(r.frameH).padEnd(7)} ${u.name.padEnd(11)} ${bx.padEnd(26)} ${String(ov).padEnd(18)} –(그 상태에 없는 부품)`); continue; }
        tot++;
        if (d.read) bad++;
        console.log(`${String(r.frameH).padEnd(7)} ${u.name.padEnd(11)} ${bx.padEnd(26)} ${String(ov).padEnd(18)} `
          + `${d.read ? `읽힘 ${d.ink} · 평균 ${d.mean} · 최대 ${d.max}` : `안 읽힘 ${d.ink}`} (잡음바닥 ${d.base})`);
      }
    }
    console.log('');
  }
  /* 비행 도착지가 살아 있는가 — 512·654 짝(처방이 `display:none` 이면 여기가 먼저 죽는다) */
  const deadPill = rows.filter((r) => !r.err && !(r.pill && r.pill.gold && r.pill.gold.w > 0));
  console.log(`딤을 통과해 읽히는 HUD: ${bad}/${tot} 자리`);
  console.log(`재화 비행 도착지(fxPill gold)가 산 자리: ${rows.length - deadPill.length}/${rows.length}`
    + (deadPill.length ? '  ⚠ 512·654 비행이 깨진다' : '  (512·654 짝 — 상자가 살아 있다)'));
  if (REVERT) {
    console.log(bad === tot
      ? 'PROBE811 --revert — 규칙을 무효화하니 전 자리가 다시 읽힌다 = 이 한 줄이 원인이다.'
      : `PROBE811 --revert — ⚠ 되돌렸는데 ${tot - bad} 자리가 안 읽힌다(대조군이 성립 안 함).`);
  } else {
    console.log(bad > 0 ? 'PROBE811 재현됨 — 등재문대로 HUD 잉크가 딤 위로 읽힌다.'
      : 'PROBE811 재현 안 됨 — 딤 뒤 HUD 가 한 화소도 안 읽힌다(등재문 기각).');
  }
})();
