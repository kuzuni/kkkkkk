#!/usr/bin/env node
/* 351 프로브 — 9:19(1080×2280) 대비 9:13.3(1080×1600) «에서만 나빠진 것» 을 기계로 좁힌다.
 *
 * 실행: node tools/probe351.js [--only <라벨조각>] [--json <경로>]
 *
 * 왜 프로브를 먼저 두는가(338·341·350·363·368 규칙):
 *   351 은 «비평가 3명 × 전 화면» 루프라 회차가 비싸다. 등재문의 네 축 중 ⓐ 잘림 · ⓑ 겹침 ·
 *   ⓒ 글자 잘림 · ⓓ 조작성은 **사람 눈이 아니라 자로 재는 것이 더 정확**하고, 그렇게 좁힌
 *   자리만 비평가에게 캡처 짝으로 주면 «9:19 에도 있는 문제» 를 되짚느라 회차를 태우지 않는다.
 *
 * 판정의 핵심은 **차분**이다 — 같은 화면을 2280 과 1600 에서 각각 재고, 1600 에만 있는 결함을
 * 낸다. 9:19 에도 있는 것은 351 의 대상이 아니다(등재문: «별도 등재»).
 *
 * 재는 것 네 가지 (전부 «실제로 그려지는 상자» 기준 — 클리핑 조상을 전부 접어서 잰다):
 *   D1 프레임 밖   — 잘린 뒤에도 남는 잉크가 #app 밖에 있다(= 화면 밖으로 나갔다)
 *   D2 내용 잘림   — overflow:hidden 그릇의 scrollH/W 가 clientH/W 를 넘는다(스크롤도 못 한다)
 *   D3 글자 잘림   — 텍스트 노드를 가진 요소의 잉크가 그릇 밖으로 나간다
 *   D4 조작 불가   — 버튼/탭이 클리핑 뒤에 절반 이상 사라졌다
 *
 * ⚠ 오버레이를 후보로 적으면 안 된다(smoke.js 241 주석과 같은 함정) — `#pfw{inset:0}` 류는
 *   프레임에 앵커돼 «항상 프레임과 같은 크기» 라 원리적으로 안 걸린다. 그래서 D1 은 후보 목록이
 *   아니라 **#app 안의 모든 가시 요소**를 훑되, 클리핑을 접은 «실제 잉크 상자» 로만 판정한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const TALL = [1080, 2280];   /* 9:19 기준 */
const SHORT = [1080, 1600];  /* 9:13.3 — 지원 최저 세로 */

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page, errs };
}

/* 60 쥬시 개봉 연출이 도는 중에 재면 scale 구간이 잡혀 오검출이 난다(smoke.js 135 주석). */
async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
}

/* ---------------- 화면 목록 (smoke.js [2] 오프너와 같은 경로) ---------------- */
async function collectOpeners(browser) {
  const openers = [];
  const { ctx, page } = await fresh(browser, ...TALL);
  const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
  const pops = await page.$$eval('.side .ibtn[data-pop]', (els) => els.map((e) => e.dataset.pop)).catch(() => []);
  tabs.forEach((t) => openers.push({ label: 'tab:' + t, sel: `.tab[data-t="${t}"]` }));
  pops.forEach((p) => openers.push({ label: 'side:' + p, sel: `.side .ibtn[data-pop="${p}"]` }));
  if (await page.$('#menub')) openers.push({ label: 'menu', sel: '#menub' });
  if (await page.$('#chw')) openers.push({ label: 'util:chat', sel: '#botleft .ubtn[data-util="chat"]' });
  const mns = await page.$$eval('#mnw [data-mn]', (els) => els.map((e) => e.dataset.mn)).catch(() => []);
  mns.forEach((k) => openers.push({ label: 'menu:' + k, mn: k }));
  const curs = await page.$$eval('[data-cur]', (els) => els.map((e) => e.dataset.cur)).catch(() => []);
  [...new Set(curs)].forEach((c) => openers.push({ label: 'cur:' + c, sel: `[data-cur="${c}"]` }));
  const dsubs = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => e.dataset.dsub)).catch(() => []);
  dsubs.forEach((k) => openers.push({ label: 'dunsub:' + k, dun: `#dunSub [data-dsub="${k}"]` }));
  const tsubs = await page.$$eval('#trSubs [data-trsub]', (els) => els.map((e) => e.dataset.trsub)).catch(() => []);
  tsubs.forEach((k) => openers.push({ label: 'trsub:' + k, tr: `#trSubs [data-trsub="${k}"]` }));
  const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
  cats.forEach((k) => openers.push({ label: 'shopcat:' + k, shop: `#shopCats .shp-ct[data-cat="${k}"]` }));
  const eqtabs = await page.$$eval('#eqTabs [data-eqtab]', (els) => els.map((e) => e.dataset.eqtab)).catch(() => []);
  eqtabs.forEach((k) => openers.push({ label: 'eqtab:' + k, hero: `#eqTabs [data-eqtab="${k}"]` }));
  const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot)).catch(() => []);
  slots.forEach((k) => openers.push({ label: 'eqslot:' + k, hero: `#eqCards [data-eqslot="${k}"]` }));
  const costabs = await page.$$eval('#bCos [data-costab]', (els) => els.map((e) => e.dataset.costab)).catch(() => []);
  costabs.forEach((k) => openers.push({ label: 'costab:' + k, cos: `#bCos [data-costab="${k}"]` }));
  if (await page.$('#profBtn')) {
    openers.push({ label: 'prof:19', sel: '#profBtn' });
    openers.push({ label: 'prof:20-스펙', prof: '.pf-tgl>.lb' });
  }
  if (await page.$('[data-opencoll]')) {
    openers.push({ label: 'coll21', coll: true });
    const cts = await page.$$eval('#collTabs .cltab[data-ct]', (els) => els.map((e) => e.dataset.ct)).catch(() => []);
    cts.forEach((k) => openers.push({ label: 'colltab:' + k, coll: `#collTabs .cltab[data-ct="${k}"]` }));
  }
  openers.push({ label: 'qtab:daily', quest: 'daily' });
  openers.push({ label: 'qtab:rep', quest: 'rep' });
  if (await page.$('#psw')) {
    openers.push({ label: 'pass:35', pass: true });
    for (const k of ['stage', 'box', 'tower', 'att']) openers.push({ label: 'ptab:' + k, pass: `#psBar [data-ptab="${k}"]` });
  }
  openers.push({ label: 'saver:56', saver: true });
  await ctx.close();
  return openers;
}

async function drive(page, o) {
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(() => {});
  if (o.sel) await page.click(o.sel, { timeout: 3000, force: true }).catch(() => {});
  else if (o.hero) {
    await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.hero);
  } else if (o.mn) {
    await ev(() => document.querySelector('#menub').click());
    await page.waitForTimeout(320);
    await ev((k) => { const el = document.querySelector(`#mnw [data-mn="${k}"]`); if (el) el.click(); }, o.mn);
  } else if (o.dun) {
    await page.click('.tab[data-t="adv"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.dun);
  } else if (o.tr) {
    await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.tr);
  } else if (o.pass) {
    await ev(() => document.getElementById('menub').click());
    await page.waitForTimeout(300);
    await ev(() => document.getElementById('psGo').click());
    await page.waitForTimeout(400);
    if (typeof o.pass === 'string') await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.pass);
  } else if (o.cos) {
    await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev(() => { const el = document.querySelector('#eqTabs [data-eqtab="cos"]'); if (el) el.click(); });
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.cos);
  } else if (o.prof) {
    await page.click('#profBtn', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.prof);
  } else if (o.coll) {
    await page.click('.tab[data-t="box"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await ev(() => { const el = document.querySelector('[data-opencoll]'); if (el) el.click(); });
    await page.waitForTimeout(400);
    if (typeof o.coll === 'string') await ev((s) => { const el = document.querySelector(s); if (el) el.click(); }, o.coll);
  } else if (o.quest) {
    await page.click('.side .ibtn[data-pop="quest"]', { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(400);
    if (o.quest === 'rep') {
      await ev(() => { const el = document.querySelector('.qs-tg b[data-t="daily"]'); if (el) el.click(); });
      await page.waitForTimeout(300);
    }
    await ev((t) => { const el = document.querySelector(`.qs-tg b[data-t="${t}"]`); if (el) el.click(); }, o.quest);
  } else if (o.saver) {
    await ev(() => { if (typeof openSaver === 'function') openSaver(); });
  }
  await page.waitForTimeout(450);
}

/* ---------------- 페이지 안에서 재는 자 ---------------- */
const SCAN = function () {
  const app = document.getElementById('app');
  if (!app) return { defects: [] };
  const A = app.getBoundingClientRect();
  const out = [];
  const seen = new Set();

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  /* 조상의 클리핑을 접은 상자 두 벌.
       drawn    — 모든 overflow≠visible 조상으로 자른 «지금 실제로 그려지는» 상자
       reach    — **스크롤로 닿을 수 있는 조상은 빼고** 자른 상자
     둘을 가르는 이유가 이 프로브의 핵심이다: 긴 리스트에서 접힌 카드는 «잘린 것» 이 아니라
     **스크롤하면 나오는 것**이고, 2280 과 1600 은 접히는 카드 수가 다르므로 그대로 세면
     화면마다 수십 건이 «1600 에서만 생긴 결함» 으로 둔갑한다(1회차 실측: 그런 유령이 다수).
     ⓐⓒⓓ 는 **스크롤로 회수 못 하는 손실**만 결함이다. */
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    const k = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    /* ⚠ 축마다 «스크롤로 닿는 순간 그 위 클리핑은 더 볼 것이 없다».
       1회차에 이걸 빼먹어 유령이 나왔다 — 스크롤 그릇을 «건너뛰기만» 하면 요소는 «스크롤 전»
       자리에 남고, 그 바깥의 hidden 조상(#bCos 등)이 그 자리를 잘라 «글자 21px 잘림» 이 찍힌다.
       실제로는 그 그릇을 스크롤하면 카드가 뷰포트 안으로 올라오고, 뷰포트는 바깥 조상 «안» 이다.
       ⇒ 그 축에서 스크롤 가능한 조상을 만나면 reachable 로 표시하고 **그 축은 거기서 끝낸다.** */
    let doneX = false, doneY = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (doneX && doneY) break;
      const cs = getComputedStyle(p);
      const ox = cs.overflowX, oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const pr = p.getBoundingClientRect();
      const scX = /auto|scroll/.test(ox) && p.scrollWidth > p.clientWidth + 2;
      const scY = /auto|scroll/.test(oy) && p.scrollHeight > p.clientHeight + 2;
      if (ox !== 'visible') {
        d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right);
        if (!doneX) { if (scX) doneX = true; else { k.x1 = Math.max(k.x1, pr.left); k.x2 = Math.min(k.x2, pr.right); } }
      }
      if (oy !== 'visible') {
        d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom);
        if (!doneY) { if (scY) doneY = true; else { k.y1 = Math.max(k.y1, pr.top); k.y2 = Math.min(k.y2, pr.bottom); } }
      }
    }
    d.w = d.x2 - d.x1; d.h = d.y2 - d.y1;
    k.w = k.x2 - k.x1; k.h = k.y2 - k.y1;
    return { drawn: d, reach: k };
  };
  const pathOf = (el) => {
    const bits = [];
    for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { bits.unshift('#' + e.id); break; }
      const c = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      bits.unshift(c ? s + '.' + c : s);
    }
    return bits.join('>');
  };
  const push = (kind, el, detail) => {
    const key = kind + '|' + pathOf(el) + '|' + detail.k;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, path: pathOf(el), key, ...detail });
  };

  const all = app.querySelectorAll('*');
  for (const el of all) {
    if (!vis(el)) continue;
    const raw = el.getBoundingClientRect();
    if (raw.width < 1 || raw.height < 1) continue;
    const { drawn: c, reach: k } = clipped(el);
    const drawn = c.w > 0.5 && c.h > 0.5;
    const onScreen = k.w > 0.5 && k.h > 0.5;   /* 스크롤하면 닿는 자리인가 */

    /* D1 — 잘린 뒤에도 남는 잉크가 프레임 밖 */
    if (drawn) {
      const over = Math.max(A.top - c.y1, c.y2 - A.bottom, A.left - c.x1, c.x2 - A.right);
      if (over > 1.5) {
        /* 자식이 부모와 같은 이유로 나갔으면 부모 하나만 센다 */
        push('D1', el, { k: 'out', over: Math.round(over) });
      }
    }

    /* D2 — overflow:hidden 그릇에서 내용이 넘쳐 스크롤도 못 한다 */
    const cs = getComputedStyle(el);
    const hidY = cs.overflowY === 'hidden', hidX = cs.overflowX === 'hidden';
    if (hidY && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 8) {
      push('D2', el, { k: 'ovfY', by: el.scrollHeight - el.clientHeight });
    }
    if (hidX && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 8) {
      push('D2', el, { k: 'ovfX', by: el.scrollWidth - el.clientWidth });
    }

    /* D3 — 글자 잉크가 그릇 밖으로 (텍스트를 직접 가진 요소만) */
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { hasText = true; break; }
    if (hasText && onScreen) {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const ir = rg.getBoundingClientRect();
      if (ir.width > 0 && ir.height > 0) {
        const cut = Math.max(k.x1 - ir.left, ir.right - k.x2, k.y1 - ir.top, ir.bottom - k.y2);
        if (cut > 2) push('D3', el, { k: 'textcut', cut: Math.round(cut), t: (el.textContent || '').trim().slice(0, 18) });
      }
    }

    /* D5 — «1600 안에 다 안 들어온다»(등재문 ⓐ 의 본체).
       스크롤 그릇 자체가 2280 에서는 안 넘치는데 1600 에서만 넘치면, 그 화면은 짧은 프레임에서
       **스크롤해야 전부 보이는 화면**이 된 것이다. D2 와 달리 내용을 «못 보는» 것은 아니지만
       팝업의 닫기 ✕ 나 확인 버튼이 첫 화면 밖으로 나가면 ⓓ 조작성까지 같이 깎인다.
       (그래서 스크롤로 닿는다는 이유로 D3·D4 에서 뺀 손실이 여기서 한 번 잡힌다.) */
    if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 200) {
      push('D5', el, { k: 'needscroll', by: el.scrollHeight - el.clientHeight });
    }

    /* D4 — 누를 것이 클리핑 뒤로 절반 넘게 사라졌다 */
    /* `[data-eqslot]`(08 장비 칸)은 3회차에 **빠져 있던 것을 비평가 3인이 먼저 찾아** 넣었다 —
       자의 후보 목록이 곧 사각지대다. 새 «누를 것» 을 만들면 여기에도 같이 적어라. */
    const isBtn = el.matches('button, .tab, .ibtn, .ubtn, .cbtn, .ifbtn, .mbtn, [data-pop], [data-mn], [data-cur], [data-eqtab], [data-eqslot], [data-costab], [data-dsub], [data-trsub], [data-ptab], [data-ct], .stab, .shp-ct, .clk');
    if (isBtn) {
      const visArea = Math.max(0, k.w) * Math.max(0, k.h);
      const rawArea = raw.width * raw.height;
      if (rawArea > 100 && visArea < rawArea * 0.5) {
        push('D4', el, { k: 'hidbtn', pct: Math.round(100 * visArea / rawArea) });
      }

      /* D6 — «가려짐»(ⓑ·ⓓ). 클리핑이 아니라 **z 순서로 남이 위를 덮는** 경우는 위 자들이 원리적으로
         못 본다(상자는 멀쩡히 프레임 안에 있다). 그래서 실제 포인터가 닿는 것을 묻는다 —
         버튼 상자 안 9점을 `elementFromPoint` 로 찍어 자기(또는 자기 자손·조상)가 아닌 것이
         잡히는 비율을 센다. 이것이 ⓓ 조작성의 정의 그 자체다.
         ⚠ `pointer-events:none` 인 장식(HUD `#stinfo` 류, LESSONS 350)은 포인터를 통과시키므로
            «시각적 겹침» 은 여기 안 걸린다 — 그건 ⓑ 로 사람이 볼 몫이다. */
      if (drawn && k.w > 4 && k.h > 4) {
        let blocked = 0, tested = 0, by = '';
        for (const fx of [0.5, 0.2, 0.8]) for (const fy of [0.5, 0.2, 0.8]) {
          const x = k.x1 + k.w * fx, y = k.y1 + k.h * fy;
          if (x < A.left || x > A.right || y < A.top || y > A.bottom) continue;
          tested++;
          const hit = document.elementFromPoint(x, y);
          if (!hit) { blocked++; continue; }
          if (hit === el || el.contains(hit) || hit.contains(el)) continue;
          blocked++;
          if (!by) by = hit.id ? '#' + hit.id : hit.tagName.toLowerCase() + '.' + String(hit.className).trim().split(/\s+/).slice(0, 2).join('.');
        }
        if (tested >= 5 && blocked > tested * 0.5) {
          push('D6', el, { k: 'covered', pct: Math.round(100 * blocked / tested), by });
        }
      }
    }
  }
  return { defects: out, frame: { top: A.top, bottom: A.bottom, h: A.height } };
};

(async () => {
  const browser = await launch(chromium);
  const results = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[351] 화면 ${openers.length}개 × 2해상도 스캔`);

    for (const o of openers) {
      const scan = async ([w, h]) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN).catch((e) => ({ defects: [], err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL);
      const short = await scan(SHORT);
      const tallKeys = new Set(tall.defects.map((d) => d.key));
      const regress = short.defects.filter((d) => !tallKeys.has(d.key));
      results.push({ label: o.label, tall: tall.defects.length, short: short.defects.length, regress });
      const mark = regress.length ? `⚠ ${regress.length}` : '·';
      console.log(`  ${mark.padEnd(5)} ${o.label.padEnd(22)} 2280:${String(tall.defects.length).padStart(3)}  1600:${String(short.defects.length).padStart(3)}`);
      for (const d of regress.slice(0, 6)) {
        console.log(`        ${d.kind} ${d.path} ${JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !['kind', 'path', 'key'].includes(k))))}`);
      }
    }
  } finally { await browser.close(); }

  const tot = results.reduce((a, r) => a + r.regress.length, 0);
  const bad = results.filter((r) => r.regress.length);
  console.log(`\n[351] 1600 에서만 생긴 결함 ${tot}건 · 화면 ${bad.length}/${results.length}`);
  /* 종류별 집계 — 어떤 축(ⓐⓑⓒⓓ)이 실재하는지 한눈에 */
  const byKind = {};
  for (const r of results) for (const d of r.regress) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  console.log('  종류별: ' + (Object.keys(byKind).length ? Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join(' · ') : '없음'));
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(results, null, 1)); console.log('  JSON → ' + JSONOUT); }
  process.exit(0);
})().catch((e) => { console.error('PROBE351 CRASH', e); process.exit(2); });
