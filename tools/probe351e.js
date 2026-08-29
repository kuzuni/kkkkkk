#!/usr/bin/env node
/* 351e 프로브 — 축 **F1 «스크롤 0 에서 누를 것이 몇 % 보이나»** (8회차 신설).
 *
 * 실행: node tools/probe351e.js [--only <라벨조각>] [--json <경로>]
 *
 * 왜 또 새 자인가 (5회차 D7 · 6회차 E1 · 7회차 paints() 와 **정확히 같은 사고가 네 번째**다):
 *   8회차에 비평가 6명이 r8 캡처를 채점했는데, 배치2 의 셋 중 둘(CI·CJ)이 **각자 1순위**로
 *   «10 상점 재화 탭의 [받기] 2개와 «평생 광고 제거» [이동] CTA 가 1600 스크롤 0 에서 0% 보인다»
 *   를 짚었다. 같은 커밋에서 `probe351` 은 **한 건도 안 냈다**(D5=0 · D6=0). 원리적으로 못 본다:
 *
 *     · **D5 는 «그릇이 넘치나» 를 key 차분으로 묻는다.** 상점 본문은 **2280 에서도 넘친다**
 *       (다이아 상품 리본이 이미 클립선 밖이다) ⇒ 같은 key 가 두 해상도에 다 서서 **차분에서 소거된다.**
 *       6회차가 D6 에서 겪은 그 소거이고, 그때 D7 을 세운 이유와 같다.
 *     · **D4 는 «절반 넘게 사라졌나» 를 «지금 보이는 상자» 로 묻는데**, 클립선 아래로 통째로 나간
 *       버튼은 `getBoundingClientRect` 가 여전히 온전한 값을 주고 조상 클리핑을 접은 뒤에도
 *       **면적이 음수(=0)** 가 되어 «raw 대비 0%» 인데, 이 자는 그것을 **두 해상도에서 비교하지
 *       않으므로** 2280 에서도 잘리는 상점 4번째 카드와 구별하지 못한다.
 *     · `probe351b`(5회차)가 정확히 이 질문(«스크롤 전 보임 %»)을 물었지만 **`#panel` 세 시트에
 *       하드코딩**돼 있다 — 403·404 가 그 셋을 닫자 자도 같이 조용해졌다.
 *
 *   ⇒ **주인 규약이 이미 답을 정해 뒀다**(351 재지시 ①): «스크롤로 닿으면 감점 아님» 은 폐기됐고
 *      **액션 버튼·주 CTA 는 스크롤 0 에서 100% 를 요구한다.** 그 문장을 그대로 자로 세운다.
 *
 * 재는 법 (E1 규약과 같은 «차분이 아니라 같은 요소의 두 해상도 값»):
 *   F1 — 같은 액션 요소가 2280 에서 **온전히 보이는데**(≥ FULL%) 1600 에서 그보다 낮으면 결함.
 *        2280 에서 이미 잘려 있으면 **판정 불가**로 뺀다(기준선이 없으면 «침범 없음» 이 아니다 —
 *        406 규약 · LESSONS 351-④). 그것은 «짧다» 가 만든 것이 아니라 9:19 에도 있는 결함이라
 *        이 루프가 아니라 별도 등재가 갈 자리다.
 *   detail `back` — 그 그릇을 **끝까지 스크롤하면** 회수되나. 규약상 감점 여부는 안 바뀌지만
 *        («스크롤로 닿으면 됨» 은 폐기), 처방이 갈린다: 회수되면 **그릇/앵커** 문제, 안 되면
 *        **콘텐츠가 그릇보다 길다**(403·404 가 푼 꼴).
 *
 * ⚠ 이 자는 «덮임» 을 안 본다 — 그건 E1(probe351c)의 몫이다. 여기서 묻는 것은 **클리핑**뿐이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
/* --selftest — **되돌림 시험**(334·348 처방). 이 자가 «영원히 초록인 자» 가 아님을 못박는다:
   404 가 푼 그 꼴을 인위로 되살린다 — 시트 액션 버튼을 스크롤 그릇의 **콘텐츠 높이 밖**
   (`.shsc-in` 1289px 아래)으로 밀면 어떤 스크롤 위치에서도 안 보인다. 그때 F1 이 빨개져야 한다.
   ⚠ 이것은 «잘 되는지» 를 묻는 자가 아니라 «못 보면 정말 빨개지나» 를 묻는 자다. */
const SELFTEST = process.argv.includes('--selftest');

/* 화면 목록·진입·정착·기준 해상도는 probe351·probe351c 와 **같은 한 벌**(385 «자매 자 드리프트» 예방). */
const { collectOpeners, drive, fresh, settle, TALL, SHORT } = require('./probe351lib');

/* «온전히 보인다» 통과선. 100 이 아니라 99 인 것은 서브픽셀(테두리 0.5px) 때문이다. */
const FULL = 99;
/* 이 면적보다 작은 것은 «주 CTA» 로 안 센다 — 알약 안 칩·뱃지까지 세면 유령이 쏟아진다. */
const MIN_AREA = 3000;

const SCAN = function (opts) {
  const app = document.getElementById('app');
  if (!app) return { act: {} };
  /* ⚠ 상수는 **인자로 건넨다** — 노드 스코프의 const 는 페이지 안에 없다(첫 판이 `MIN_AREA is not
     defined` 로 통째로 죽었는데 `.catch` 가 그것을 `act:{}` 로 삼켜 «누를 것 0개» = 초록으로 읽혔다.
     그래서 실패는 위 러너가 **줄로 찍는다** — 조용한 실패가 이 자를 만든 원인 그 자체다). */
  const MIN_AREA = opts.minArea;
  const A = app.getBoundingClientRect();
  const act = {};

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
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

  /* 조상 클리핑(+ 앱 프레임)을 접은 «지금 실제로 그려지는» 상자. probe351c 와 같은 셈. */
  const drawnRect = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    d.x1 = Math.max(d.x1, A.left); d.x2 = Math.min(d.x2, A.right);
    d.y1 = Math.max(d.y1, A.top); d.y2 = Math.min(d.y2, A.bottom);
    d.w = Math.max(0, d.x2 - d.x1); d.h = Math.max(0, d.y2 - d.y1);
    return d;
  };

  /* «누를 것» 후보. D4 의 목록을 그대로 쓰면 **같은 사각지대를 물려받는다** —
     실제로 이 화면의 [받기](`.cn-cd` 안 알약)·[이동](`.cn-mv`)이 그 목록 어디에도 없다.
     ⇒ 목록은 «확실한 것» 을 담는 데만 쓰고, 판정은 **`cursor:pointer` + 자기 글자**로 한다.
     사람이 «누를 것» 을 알아보는 방식이 그것이고, 새 버튼을 만들어도 자가 저절로 따라온다. */
  const SEL = 'button, .cbtn, .ifbtn, .mbtn, .ubtn, .clk, .sk-btn, .sk-b1, .sk-b2, [data-pop], [data-mn], [data-cur], [data-ct]';
  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    if (t.trim()) return t.trim();
    /* 알약 안 글자가 `<i>`·`<b>` 한 겹 안에 있는 꼴이 흔하다 — 자식이 하나면 그 글자를 자기 것으로 본다 */
    if (el.children.length === 1 && !el.children[0].children.length) return (el.textContent || '').trim();
    return '';
  };
  const candidate = (el) => {
    if (el.matches(SEL)) return true;
    return getComputedStyle(el).cursor === 'pointer' && !!ownText(el);
  };

  const key = (el) => {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 14);
    return pathOf(el) + '|' + t;
  };

  /* ⚑ 갈래를 «스크롤로 회수되나» 로 그으면 **404 를 놓친다** — 404 가 고친 `.sk-btn` 은
     `.shsc-in` 안에 151px 스크롤 여유가 있어 **회수는 됐다**. 그런데도 주인은 그것을 결함이라
     못박았고(재지시 ①), 처방은 버튼을 스크롤 그릇 **밖으로** 꺼내는 것이었다.
     ⇒ 갈리는 것은 «회수» 가 아니라 **무엇인가**다:
       · **리스트 급** — 같은 꼴의 형제가 셋 이상인 아이템 안의 버튼(상품 카드의 [받기] 넷).
         짧은 프레임에서 덜 보이는 것은 «짧다» 의 정의다(6회차가 E2 를 버린 그 선). 상품이
         하나 늘 때마다 빨개지는 자를 만들면 안 된다.
       · **액션 바 급** — 그런 반복 밖에 홀로 선 버튼(시트의 [스킬 소환]·배너의 [이동]).
         화면이 «이걸 누르라» 고 내놓은 것이라 스크롤 0 에서 보여야 한다. */
  const listish = (el) => {
    /* ⚠ 위로 **끝까지** 걸어 올라가면 안 된다 — 되돌림 시험이 그것을 잡았다:
       `.sk-btn` 을 콘텐츠 밖으로 밀어도 자가 조용했는데, 조상 `#bSk`·`#bPet`·`#bCos`(형제 셋)가
       «반복» 으로 읽혀 버튼이 통째로 «리스트 급» 이 됐기 때문이다. 아이템은 버튼 바로 위 몇 겹
       안에 있다(카드 → 그 안 알약) ⇒ **세 겹까지만** 본다. */
    let depth = 0;
    for (let e = el; e && e !== app && depth < 3; e = e.parentElement, depth++) {
      const cls = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/)[0] : '';
      if (!cls || !e.parentElement) continue;
      let same = 0;
      for (const sib of e.parentElement.children) {
        const sc = (sib.className && typeof sib.className === 'string') ? sib.className.trim().split(/\s+/)[0] : '';
        if (sc === cls) same++;
      }
      if (same >= 3) return cls;
    }
    return null;
  };

  for (const el of app.querySelectorAll('*')) {
    if (!vis(el) || !candidate(el)) continue;
    /* 부모가 이미 후보이고 상자가 사실상 같으면(알약 ↔ 그 안 글자) 부모만 센다 */
    const par = el.parentElement;
    if (par && par !== app && vis(par) && candidate(par)) {
      const pr = par.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (Math.abs(pr.width - er.width) < 12 && Math.abs(pr.height - er.height) < 12) continue;
    }
    const raw = el.getBoundingClientRect();
    const area = raw.width * raw.height;
    if (area < MIN_AREA) continue;
    const d = drawnRect(el);
    const pct = Math.round(100 * (d.w * d.h) / area);
    const k = key(el);
    /* 같은 key 가 여럿이면 **가장 나쁜 것**을 남긴다(카드 격자의 [받기] 넷은 문자열이 같다) */
    if (!(k in act) || pct < act[k].pct) act[k] = { pct, by: pathOf(el), list: listish(el), n: 1 };
    else act[k].n++;
  }

  if (!opts || !opts.scrollEnd) return { act };

  /* «스크롤로 회수되나» — 처방을 가르는 값이지 감점 기준이 아니다(«스크롤로 닿으면 됨» 은 폐기).
     ⚠ 그릇을 **끝까지** 내리는 방식은 틀린다: 그러면 위쪽 버튼은 뷰포트 **위로** 지나가 버려
     «회수 불가» 로 잘못 읽힌다(첫 판에 상점 [이동] 이 그렇게 «스크롤 끝 0%» 로 나왔다).
     ⇒ 요소마다 **그 요소를 향해** 스크롤해서 잰다. 회수되면 그릇/앵커 문제, 안 되면 콘텐츠가
     그릇보다 길어 구조를 바꿔야 하는 자리다(403·404 가 푼 꼴). */
  const after = {};
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el) || !candidate(el)) continue;
    const raw = el.getBoundingClientRect();
    const area = raw.width * raw.height;
    if (area < MIN_AREA) continue;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r2 = el.getBoundingClientRect();
    const a2 = r2.width * r2.height;
    if (a2 <= 0) continue;
    const d = drawnRect(el);
    const pct = Math.round(100 * (d.w * d.h) / a2);
    const k = key(el);
    if (!(k in after) || pct > after[k]) after[k] = pct;   /* 회수는 «가장 좋은 것» 으로 본다 */
  }
  return { act, after };
};

(async () => {
  const browser = await launch(chromium);
  const results = [];
  let total = 0, softTotal = 0;
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[351e] 화면 ${openers.length}개 × 2해상도 — F1 «스크롤 0 에서 누를 것 보임 %» (2280 ≥${FULL}% → 1600 <${FULL}%)`);

    for (const o of openers) {
      const scan = async ([w, h], scrollEnd) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        if (SELFTEST && scrollEnd) {
          /* SHORT 쪽에만 넣는다 — 2280 기준선은 성해야 «1600 에서 나빠졌다» 가 성립한다.
             ⚠ `addStyleTag` 로 넣지 않는다: 실패해도 조용하고(파일 URL·CSP) 그러면 시험이
             «안 빨개졌다» 가 아니라 «주입이 안 됐다» 가 되어 정반대 결론이 난다 — 이 자를
             만든 원인이 바로 그 조용한 실패다. 인라인으로 박고 **몇 개 박았는지 세서 돌려준다**. */
          const hit = await page.evaluate(() => {
            const els = document.querySelectorAll('.sk-btn');
            els.forEach((e) => { e.style.top = '2400px'; e.style.bottom = 'auto'; });
            return els.length;
          }).catch(() => 0);
          console.log(`        [selftest] .sk-btn ${hit}개를 콘텐츠 밖(top:2400)으로 밀었다`);
          if (!hit) console.log('        [selftest] ⚠ 주입 0개 — 시험이 성립하지 않는다');
          await page.waitForTimeout(150);
        }
        await settle(page);
        const r = await page.evaluate(SCAN, { scrollEnd, minArea: MIN_AREA }).catch((e) => ({ act: {}, err: String(e.message || e) }));
        if (r.err) console.log('        ⚠ 스캔 실패 — ' + r.err.slice(0, 200));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL, false);
      const short = await scan(SHORT, true);

      const regress = [];
      for (const k of Object.keys(short.act)) {
        if (!(k in tall.act)) continue;                  /* 2280 에 없던 것 = 판정 불가 */
        if (tall.act[k].pct < FULL) continue;            /* 2280 에서 이미 잘린다 = 이 루프 밖(별도 등재) */
        if (short.act[k].pct >= FULL) continue;          /* 1600 에서도 온전하다 = 정상 */
        regress.push({
          kind: 'F1', path: short.act[k].by, key: 'F1|' + k,
          k: k.split('|')[1] || '(글자 없음)',
          vis: short.act[k].pct, was: tall.act[k].pct,
          list: short.act[k].list,
          back: (short.after && k in short.after) ? short.after[k] : null,
        });
      }
      regress.sort((a, b) => a.vis - b.vis);
      /* ⚑ 두 갈래로 가른다 — **이 갈래가 없으면 F1 은 6회차 E2 의 재판이 된다**(366건 유령).
         리스트는 짧은 프레임에서 덜 보이는 것이 «짧다» 의 정의이고, 그래서 그 안 아이템 버튼이
         첫 화면 밖으로 밀리는 것은 결함이 아니다 — 그걸 결함으로 세면 **상품이 하나 늘 때마다**
         자가 빨개진다. 규약이 실제로 요구하는 것은 **화면의 액션 바**다(404 가 [스킬 소환] 을
         스크롤 그릇 **밖으로** 꺼내 푼 그 자리) ⇒ 판정선은 «스크롤로 회수되나» 로 긋는다.
           · 회수 불가 = 결함  — 어떤 스크롤 위치에서도 온전히 못 보는 버튼(404 꼴)
           · 회수 가능 = 참고  — 리스트가 이어지는 것뿐(감점 아님, 그러나 눈이 매번 짚으므로 찍어 둔다) */
      const hard = regress.filter((d) => !d.list);
      const soft = regress.filter((d) => !!d.list);
      results.push({ label: o.label, regress: hard, soft });
      total += hard.length;
      softTotal += soft.length;
      const mark = hard.length ? `⚠ ${hard.length}` : (soft.length ? `· (참고 ${soft.length})` : '·');
      console.log(`  ${mark.padEnd(12)} ${o.label.padEnd(22)} 누를 것 ${Object.keys(short.act).length}개`);
      for (const d of hard.slice(0, 8)) {
        console.log(`        F1 «${d.k}» ${d.path} — 2280 ${d.was}% → 1600 ${d.vis}%` +
          ` · 스크롤하면 ${d.back}%${d.back >= FULL ? ' (회수는 되지만 액션 바는 스크롤 0 이 규약 — 404)' : ' ⚠ 회수 불가'}`);
      }
      for (const d of soft.slice(0, 4)) {
        console.log(`        참고(리스트 «${d.list}») «${d.k}» ${d.path} — 2280 ${d.was}% → 1600 ${d.vis}% · 스크롤하면 ${d.back}%`);
      }
    }
  } finally { await browser.close(); }

  console.log(`\n[351e] 1600 스크롤 0 에서 잘리는 **액션 바 급** ${total}건 · 화면 ${results.filter((r) => r.regress.length).length}/${results.length}` +
    `\n       (참고 — 반복 아이템 안 버튼 ${softTotal}건: 리스트가 이어지는 것뿐이라 감점 아님, 6회차가 E2 를 버린 그 선이다)`);
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(results, null, 2)); console.log('  → ' + JSONOUT); }
})();
