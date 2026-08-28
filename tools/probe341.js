/* 작업 341 재현 프로브 — «03 던전 카드 «입장 가능» 레드닷 누락»
 *
 *   node tools/probe341.js
 *
 * 등재문(72 18회차 비평가 AP·AQ 2인 일치)의 주장:
 *   «부품 부재다 — `<s class="updot">` 노드도 `.dnc` 호스트 규칙도 **둘 다 없다**.
 *    (`grep updot index.html` 에 `.dnc` 항 없음) ⇒ 카드 마크업에 노드를 새로 달아라.»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **그 주장이 참인지 눈으로 보는** 자리다(338 선례).
 * 찍는 것:
 *   ① 카드 렌더가 실제로 dot 노드를 만드는가 — 부품 이름(`.dot` vs `.updot`)과 CSS 규칙 유무
 *   ② 캡처와 같은 상태(cap72 = 해금만)에서 8장의 `dunCardOk` 축 값 — lock/left/cp/req
 *   ③ 그 축을 참으로 만든 상태에서 dot 이 실제로 그려지는가 — bbox·색 픽셀
 *   ④ ref 실측 bbox(x1005..1032 · 카드상변 −1~+29) 와의 어긋남
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length)));

  /* ── ① 부품이 정말 없는가 ─────────────────────────────────────────── */
  blk('① 부품 — 등재문 «노드도 CSS 도 둘 다 없다» 검증');
  const part = await ev(() => {
    /* cap72 와 같은 해금(72 8회차 주석 — pre 체인까지) */
    S.guide.idx = 99;
    Object.keys(DUN_UI).forEach((id) => { if (DUN_UI[id].pre) S.dun[id] = 1; });
    Object.values(DUN_UI).forEach((u) => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
    document.querySelector('#tabbar [data-t="adv"]').click();
    const html = document.getElementById('dunList').innerHTML;
    let css = null;
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.selectorText && /\.dnc\s+\.dot\b/.test(r.selectorText)) css = r.cssText;
    }
    return { hasDotMarkup: /class="dot"/.test(html), hasUpdotMarkup: /class="updot"/.test(html), css };
  });
  if (part.__err) { console.log('  ❌ ' + part.__err); fail++; }
  else {
    console.log('  카드 HTML 안 `class="dot"`   : ' + part.hasDotMarkup);
    console.log('  카드 HTML 안 `class="updot"` : ' + part.hasUpdotMarkup);
    console.log('  `.dnc .dot` CSS 규칙          : ' + (part.css ? part.css.slice(0, 120) + '…' : '(없음)'));
    ok(!!part.css, '`.dnc .dot` 위치 규칙이 **이미 있다**(등재문의 «CSS 없음» 은 거짓 — 이름이 `.updot` 이 아닐 뿐)');
  }

  /* ── ② 캡처와 같은 상태에서 판정 축이 어떻게 서 있나 ──────────────── */
  blk('② 캡처 상태(cap72 = 해금만) — dunCardOk 축 8장');
  const axes = await ev(() => {
    const P = cp();
    return {
      cp: P,
      rows: DUNGEONS.map((d) => ({
        id: d.id, n: d.n, lock: !!dunLocked(d), left: S.dunTk[d.id],
        f: S.dun[d.id], req: Math.round(d.req(S.dun[d.id])), okc: !!dunCardOk(d),
      })),
      dots: document.querySelectorAll('#dunList .dnc .dot').length,
      cards: document.querySelectorAll('#dunList .dnc').length,
    };
  });
  if (axes.__err) { console.log('  ❌ ' + axes.__err); fail++; }
  else {
    console.log('  cp() = ' + axes.cp);
    console.log('  ' + 'id'.padEnd(10) + 'lock  left  층  요구전투력      dot');
    for (const r of axes.rows) {
      console.log('  ' + r.id.padEnd(10) + String(r.lock).padEnd(6) + String(r.left).padEnd(6)
        + String(r.f).padEnd(4) + String(r.req).padEnd(16) + (r.okc ? '●' : '·'));
    }
    console.log('  카드 ' + axes.cards + '장 / dot 노드 ' + axes.dots + '개');
    const cpShort = axes.rows.every((r) => r.lock || r.left <= 0 || axes.cp < r.req);
    ok(cpShort, '캡처 상태에서 dot 0 개인 이유 = **166 조건(요구 전투력)이 8장 전부 거짓** '
      + '(부품 부재가 아니다 — 비평가는 «켤 수 없는 상태의 화면» 을 봤다)');
  }

  /* ── ③ 축을 참으로 만들면 그려지는가 ─────────────────────────────── */
  blk('③ 입장 가능 상태 — dot 이 실제로 그려지는가');
  /* ⚠ 여기서 렌더 직후에 재면 안 된다 — `.dnc .dot` 은 `jzDotIn`(0%{scale:0})을 타므로
     같은 틱의 bbox 가 **0×0** 으로 나온다(1회차에 이 함정을 그대로 밟았다).
     0.3s 등장 + 펄스가 scale:1 로 돌아오는 자리까지 기다린 뒤 잰다. */
  await ev(() => { S.lv.atk = 4000; markDirty(); renderDunPage(); });
  await page.waitForTimeout(700);
  const drawn = await ev(() => {
    const cards = [...document.querySelectorAll('#dunList .dnc')];
    const host = document.getElementById('dunList').getBoundingClientRect();
    return {
      cp: cp(),
      okn: DUNGEONS.filter((d) => dunCardOk(d)).length,
      dots: cards.map((c, i) => {
        const d = c.querySelector('.dot');
        if (!d) return { i, has: false };
        const r = d.getBoundingClientRect(), cr = c.getBoundingClientRect();
        const st = getComputedStyle(d);
        return { i, has: true, x: +r.x.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          dy: +(r.y - cr.y).toFixed(1), disp: st.display, bg: st.backgroundColor, vis: st.visibility,
          x2: +(r.x + r.width).toFixed(1) };
      }).filter((x) => x.has || true),
      _host: +host.x.toFixed(1),
    };
  });
  if (drawn.__err) { console.log('  ❌ ' + drawn.__err); fail++; }
  else {
    console.log('  cp() = ' + drawn.cp + ' · dunCardOk 참인 던전 ' + drawn.okn + '종');
    for (const d of drawn.dots) {
      if (!d.has) { console.log('  카드' + (d.i + 1) + ' — dot 없음'); continue; }
      console.log('  카드' + (d.i + 1) + ' — x ' + d.x + '..' + d.x2 + ' · ' + d.w + '×' + d.h
        + ' · 카드상변 +' + d.dy + ' · display ' + d.disp + ' · ' + d.bg);
    }
    const shown = drawn.dots.filter((d) => d.has);
    ok(shown.length > 0, '전투력을 올리면 dot 이 **실제로 그려진다** — 부품·CSS·토글 전부 살아 있다');
    /* ④ ref 대조: AP «26×31 @ x1005..1032 · 카드상변 −1~+29» · AQ «28×31 @ 동일» */
    if (shown.length) {
      const d = shown[0];
      console.log('\n  ref(AP/AQ 실측) : x1005..1032 · 26~28×31 · 카드상변 −1~+29');
      console.log('  현행 실측        : x' + d.x + '..' + d.x2 + ' · ' + d.w + '×' + d.h + ' · 카드상변 +' + d.dy);
      ok(Math.abs(d.x - 1005) <= 3 && Math.abs(d.x2 - 1032) <= 3,
        '가로 자리가 ref 와 3px 이내 — 위치 결손도 아니다');
    }
  }

  /* ── ⑤ 되돌림: 입장권을 0 으로 만들면 꺼지는가 ───────────────────── */
  blk('⑤ 되돌림 — 입장권 0 이면 소등');
  const off = await ev(() => {
    DUNGEONS.forEach((d) => { S.dunTk[d.id] = 0; });
    renderDunPage();
    return document.querySelectorAll('#dunList .dnc .dot').length;
  });
  if (off.__err) { console.log('  ❌ ' + off.__err); fail++; }
  else ok(off === 0, '입장권 0 ⇒ dot ' + off + '개(기대 0) — 토글이 살아 있다');

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\nprobe341 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
