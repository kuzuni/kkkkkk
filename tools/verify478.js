#!/usr/bin/env node
/* 478 검증 — 10 상점 «재화»·«이용권» 탭 바닥 청약철회 고지 띠
 * (저장소 주인 지시 2026-08-30: «상점 팝업 재화, 이용권 페이지 하단에 이 표시 있게해줘»)
 *
 *   node tools/verify478.js   →  마지막 줄이 `VERIFY478 n/n PASS` 여야 한다.
 *
 * 등재문(PROGRESS 478): 소스에 «청약철회» 문구 **0건** = 없는 요소였다.
 * 처방대로 부품 **하나**(`.shop-legal`)를 만들어 두 탭이 같이 쓰고(166 «한 곳» 규약),
 * 소환 탭에서는 CSS 가 통째로 끈다. 문구는 상수 `LEGAL_WITHDRAW` 한 곳에서만 온다.
 *
 * 검사 항목:
 *   [A] 부품 — 노드가 **정확히 1개**(탭마다 만들지 않았다) · 재화·이용권 탭에서 보이고
 *       **소환 탭에서는 0**(주인 원문이 두 탭만 지목했다).
 *   [B] 문구 — 띠 2줄이 제품 상수 `LEGAL_WITHDRAW[0..1]` 과 **글자 그대로** 같고 «더보기» 가 있다.
 *       (상수를 안 보고 문자열을 두 벌로 적으면 한쪽만 고쳐진다 — 333 교훈)
 *   [C] 기하 — 띠가 프레임 안이고, **서브탭 바와 겹침 0**(하변 ↔ `.stabs` 상변 ≥ 8px) ·
 *       리스트 하변과 겹침 0 · 글자 잉크가 띠 상자 안(좌우 여백 ≥ 0).
 *   [D] 마지막 항목을 안 가린다 — 리스트를 **끝까지 굴린 뒤** 마지막 카드/줄의 하변이 띠 상변 위.
 *       (띠는 스크롤 그릇 밖이라 이 조항이 없으면 «스크롤하면 보인다» 로 헛초록이 된다 — 470 교훈)
 *   [E] 찍힌 픽셀(350 처방) — 띠를 캡처해 페이지로 되돌려 ⓐ 흰 글자 ⓑ 파란 링크(#4FB3FF 계열)가
 *       **실제로 찍혔는지**. 상자만 맞춰 놓고 안 보이는 것을 막는다.
 *   [F] [더보기] 실동작(목업 금지 — 기능 완성 규칙) — 클릭하면 `#modal` 이 열리고,
 *       본문 문단이 상수 `LEGAL_WITHDRAW` 의 문단과 **한 글자도 안 틀리게** 같고,
 *       본문이 **세로 스크롤 가능**(길어서 잘리지 않는다 · 423 규약) · [확인] 로 닫힌다.
 *   [G] 소환 탭 Δ0px — 소환 탭의 `.shp-list` 하변이 예전 값(#shopw 바닥에서 154) 그대로다.
 *   [H] 두 프레임(2280 · 1600) 다 · 콘솔·페이지 에러 0.
 *   [R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다:
 *       R1 띠 노드를 지우면 [A] 의 자가 **못 찾는다**(지금 초록인 것이 자가 눈을 감아서가 아니다)
 *       R2 리스트 하변을 옛 154 로 되돌리면 [D] 의 «가림» 탐지기가 **실제로 잡는다**
 *       R3 띠 문구를 한 글자 바꾸면 [B] 의 상수 대조가 **빨개진다**
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const HELPERS = `
  const R = el => { const r = el.getBoundingClientRect();
    return { x1:+r.left.toFixed(2), x2:+r.right.toFixed(2), y1:+r.top.toFixed(2), y2:+r.bottom.toFixed(2),
             w:+r.width.toFixed(2), h:+r.height.toFixed(2) }; };
  const INK = el => { const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()]; if(!rs.length) return null;
    const x1 = Math.min(...rs.map(r=>r.left)), x2 = Math.max(...rs.map(r=>r.right));
    const y1 = Math.min(...rs.map(r=>r.top)), y2 = Math.max(...rs.map(r=>r.bottom));
    return { x1:+x1.toFixed(2), x2:+x2.toFixed(2), y1:+y1.toFixed(2), y2:+y2.toFixed(2), w:+(x2-x1).toFixed(2) }; };
  const SHOWN = el => { if(!el) return false; const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().height > 0; };
`;

/* 탭을 열고 연출·캔버스를 재운 뒤 리스트를 끝까지 굴린다 */
const openTab = async (page, cat) => {
  await page.evaluate(c => { S.dia = 2e6; S.gold = 1e9; openShopPage(null, c); }, cat);
  await page.waitForTimeout(420);
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  });
  await page.waitForTimeout(200);
};

/* 띠를 캡처해 페이지로 되돌리고 «찍힌» 흰 글자·파란 링크 픽셀을 센다(350 처방) */
async function painted(page, band, H) {
  const y = Math.max(0, Math.floor(band.y1));
  const clip = { x: 0, y, width: 1080, height: Math.max(4, Math.min(H - y, Math.ceil(band.h))) };
  const b64 = (await page.screenshot({ clip })).toString('base64');
  return page.evaluate(async ({ b64, w, h }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let white = 0, blue = 0, bx1 = 1e9, bx2 = -1e9;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4, r = d[i], gg = d[i + 1], b = d[i + 2];
      if (r > 200 && gg > 200 && b > 200) white++;
      /* #4FB3FF 계열 — 파랑이 확실히 우세한 밝은 화소 */
      else if (b > 150 && b - r > 60 && b - gg > 30) { blue++; if (xx < bx1) bx1 = xx; if (xx > bx2) bx2 = xx; }
    }
    return { white, blue, bx1, bx2 };
  }, { b64, w: clip.width, h: clip.height });
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];

  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push('H' + H + ' ' + e));
    page.on('console', m => { if (m.type() === 'error') errs.push('H' + H + ' ' + m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(900);

    console.log('');
    console.log('══ 프레임 1080×' + H);

    /* ── [A] 부품이 하나 · 소환 탭에서는 안 뜬다 ─────────────────────────── */
    await openTab(page, 'summon');
    const sum = await page.evaluate(`(() => { ${HELPERS}
      const b = document.querySelector('.shop-legal');
      const li = document.getElementById('shopList'), sw = document.getElementById('shopw');
      return { n: document.querySelectorAll('.shop-legal').length, shown: SHOWN(b),
               listBottomFromShopw: +(R(sw).y2 - R(li).y2).toFixed(2) };
    })()`);
    ok(sum.n === 1, 'A1 H' + H + ' `.shop-legal` 노드가 정확히 1개(탭마다 만들지 않았다)', sum.n + '개');
    ok(sum.shown === false, 'A2 H' + H + ' 소환 탭에서는 안 뜬다(주인 원문 = 재화·이용권)', '표시 ' + sum.shown);
    /* [G] 소환 탭 Δ0px — 리스트 하변이 옛 값 그대로 */
    ok(Math.abs(sum.listBottomFromShopw - 154) < 0.51, 'G1 H' + H + ' 소환 탭 `.shp-list` 하변 Δ0px(#shopw 바닥에서 154)',
      sum.listBottomFromShopw + 'px');

    for (const cat of ['coin', 'pass']) {
      await openTab(page, cat);
      const st = await page.evaluate(`(() => { ${HELPERS}
        const b = document.querySelector('.shop-legal');
        const li = document.getElementById('shopList'), sw = document.getElementById('shopw');
        const stabs = document.querySelector('#shopw .stabs');
        const lines = [...b.querySelectorAll('i')];
        li.scrollTop = li.scrollHeight;
        const wrap = li.firstElementChild;
        const kids = wrap ? [...wrap.children].filter(k => k.getBoundingClientRect().height > 0) : [];
        let last = null;
        kids.forEach(k => { const r = R(k); if(!last || r.y2 > last.y2) last = r; });
        return {
          shown: SHOWN(b), rect: R(b), ink: INK(b),
          txt: lines.map(el => el.textContent),
          more: b.querySelector('#lgMore') ? b.querySelector('#lgMore').textContent : null,
          CONST: [LEGAL_WITHDRAW[0], LEGAL_WITHDRAW[1]], MORE: LEGAL_MORE,
          stabs: stabs ? R(stabs) : null, list: R(li), shopw: R(sw), last,
          listBottomFromShopw: +(R(sw).y2 - R(li).y2).toFixed(2),
        };
      })()`);

      const tag = ' H' + H + ' [' + cat + ']';
      ok(st.shown, 'A3' + tag + ' 띠가 보인다', 'rect y ' + st.rect.y1 + '..' + st.rect.y2 + ' h' + st.rect.h);

      /* ── [B] 문구가 제품 상수와 글자 그대로 같다 ───────────────────────── */
      ok(st.txt.length === 2, 'B1' + tag + ' 띠가 2줄', st.txt.length + '줄');
      ok(st.txt[0] === st.CONST[0], 'B2' + tag + ' 1줄이 `LEGAL_WITHDRAW[0]` 과 일치', '"' + st.txt[0] + '"');
      ok(st.txt[1] === st.CONST[1] + st.MORE, 'B3' + tag + ' 2줄 = `LEGAL_WITHDRAW[1]` + «' + st.MORE + '»',
        '"' + st.txt[1] + '"');
      ok(st.more === st.MORE, 'B4' + tag + ' «더보기» 링크 노드가 있다', String(st.more));

      /* ── [C] 기하 ──────────────────────────────────────────────────────── */
      const gapTab = st.stabs ? +(st.stabs.y1 - st.rect.y2).toFixed(2) : null;
      ok(gapTab !== null && gapTab >= 8, 'C1' + tag + ' 띠 하변 ↔ 서브탭 상변 ≥ 8px', gapTab + 'px');
      const gapList = +(st.rect.y1 - st.list.y2).toFixed(2);
      ok(gapList >= 8, 'C2' + tag + ' 리스트 하변 ↔ 띠 상변 ≥ 8px(겹침 0)', gapList + 'px');
      ok(st.rect.y2 <= st.shopw.y2 + .5 && st.rect.y1 >= st.shopw.y1 - .5,
        'C3' + tag + ' 띠가 `#shopw` 안', 'y ' + st.rect.y1 + '..' + st.rect.y2 + ' ⊂ ' + st.shopw.y1 + '..' + st.shopw.y2);
      const lm = st.ink ? +(st.ink.x1 - st.rect.x1).toFixed(2) : -1;
      const rm = st.ink ? +(st.rect.x2 - st.ink.x2).toFixed(2) : -1;
      ok(!!st.ink && lm >= 0 && rm >= 0, 'C4' + tag + ' 글자 잉크가 띠 상자 안', '여백 좌 ' + lm + ' · 우 ' + rm + 'px');

      /* ── [D] 끝까지 굴려도 마지막 항목을 안 가린다 ────────────────────── */
      ok(!!st.last && st.last.y2 <= st.rect.y1 + .5,
        'D1' + tag + ' 스크롤 끝에서 마지막 항목 하변이 띠 상변 위',
        st.last ? ('마지막 ' + st.last.y2 + ' ≤ 띠 ' + st.rect.y1 + ' (여유 ' + (st.rect.y1 - st.last.y2).toFixed(2) + 'px)') : '못 찾음');
      ok(Math.abs(st.listBottomFromShopw - 256) < 0.51,
        'D2' + tag + ' 이 탭의 `.shp-list` 하변 = #shopw 바닥에서 256(띠 자리를 비웠다)',
        st.listBottomFromShopw + 'px');

      /* ── [E] 찍힌 픽셀 ─────────────────────────────────────────────────── */
      const px = await painted(page, st.rect, H);
      ok(px.white > 800, 'E1' + tag + ' 흰 글자가 실제로 찍힌다', px.white + 'px');
      ok(px.blue > 60, 'E2' + tag + ' 파란 «더보기» 링크가 실제로 찍힌다', px.blue + 'px (x ' + px.bx1 + '..' + px.bx2 + ')');

      /* ── [F] [더보기] 실동작 ───────────────────────────────────────────── */
      await page.click('#lgMore');
      await page.waitForTimeout(320);
      const md = await page.evaluate(`(() => { ${HELPERS}
        const m = document.getElementById('modal'), box = document.getElementById('mbox');
        /* 상수 → 문단(빈 줄로 끊고 문단 안 줄바꿈은 이어 붙인다) */
        const gs = []; LEGAL_WITHDRAW.forEach(t => {
          if(!t){ if(gs.length && gs[gs.length-1].length) gs.push([]); return; }
          if(!gs.length) gs.push([]);
          gs[gs.length-1].push(t.charAt(0) === '*' ? t.slice(1) : t);
        });
        const want = gs.filter(p => p.length).map(p => p.join(''));
        const got = [...box.querySelectorAll('.lgw p')].map(p => p.textContent);
        const yn = [...box.querySelectorAll('.lgw p.y')].map(p => getComputedStyle(p).color);
        /* 길어졌을 때 정말 «스크롤이 받는가» — 문단을 20개 더 심어 본다(원복 포함) */
        const well = box.querySelector('.lgw');
        const grow = document.createElement('div');
        for(let i=0;i<20;i++) grow.appendChild(Object.assign(document.createElement('p'),
          { textContent:'가나다라마바사아자차카타파하 ' + i }));
        well.appendChild(grow);
        const grown = { scrollH: box.scrollHeight, clientH: box.clientHeight,
                        boxRect: R(document.querySelector('#modal .mbox')) };
        grow.remove();
        return { on: m.classList.contains('on'), title: document.getElementById('mtitle').textContent,
                 want, got, yn, scrollH: box.scrollHeight, clientH: box.clientHeight,
                 overflowY: getComputedStyle(box).overflowY, grown,
                 hasOk: !!document.getElementById('okBtn'),
                 boxRect: R(document.querySelector('#modal .mbox')), vh: innerHeight };
      })()`);
      ok(md.on, 'F1' + tag + ' [더보기] 클릭 → `#modal` 열림', '제목 "' + md.title + '"');
      ok(md.title === '청약철회 규정', 'F2' + tag + ' 제목이 «청약철회 규정»', md.title);
      ok(md.got.length === md.want.length, 'F3' + tag + ' 본문 문단 수가 상수와 같다',
        md.got.length + ' / ' + md.want.length);
      const diff = md.want.findIndex((w, i) => w !== md.got[i]);
      ok(diff < 0, 'F4' + tag + ' 본문이 상수 `LEGAL_WITHDRAW` 와 한 글자도 안 틀린다',
        diff < 0 ? '전 문단 일치' : ('문단 ' + diff + ' 불일치: "' + String(md.got[diff]).slice(0, 40) + '"'));
      ok(md.yn.length === 2, 'F5' + tag + ' 노랑(`<color=#FFCC44>`) 문단 2개', md.yn.join(' / '));
      ok(md.yn.every(c => /rgb\(\s*255,\s*204,\s*68\s*\)/.test(c)), 'F6' + tag + ' 노랑 문단 색 = #FFCC44', md.yn.join(' / '));
      /* ⚑ 등재문은 «본문이 길어 세로 스크롤» 이라고 적었는데 실측은 **스크롤이 안 걸린다**(1063 = 1063).
         그래서 자는 «스크롤바가 있다» 가 아니라 **«잘리는 데가 없다»** 를 묻는다 — 셋으로 나눴다:
         F7 지금은 전 문단이 다 보인다(넘침 0) · F7b 그릇이 `overflow-y:auto`(길어지면 받는다) ·
         F7c 실제로 길어지면 스크롤이 생기고 팝업은 여전히 프레임 안(잘림이 아니라 스크롤로 간다). */
      ok(md.scrollH <= md.clientH + 0.5, 'F7' + tag + ' 본문이 안 잘린다(넘침 0 — 지금은 전 문단이 한 화면)',
        md.scrollH + ' ≤ ' + md.clientH);
      ok(md.overflowY === 'auto', 'F7b' + tag + ' 본문 그릇이 `overflow-y:auto`', md.overflowY);
      ok(md.grown.scrollH > md.grown.clientH && md.grown.boxRect.y1 >= -0.5 && md.grown.boxRect.y2 <= md.vh + 0.5,
        'F7c' + tag + ' 문단 20개를 더 심으면 스크롤이 받고 팝업은 프레임 안(423 규약)',
        md.grown.scrollH + ' > ' + md.grown.clientH + ' · y ' + md.grown.boxRect.y1 + '..' + md.grown.boxRect.y2);
      ok(md.boxRect.y1 >= -0.5 && md.boxRect.y2 <= md.vh + 0.5, 'F8' + tag + ' 팝업이 프레임 안(423 규약)',
        'y ' + md.boxRect.y1 + '..' + md.boxRect.y2 + ' / ' + md.vh);
      ok(md.hasOk, 'F9' + tag + ' [확인] 버튼이 있다');
      await page.click('#okBtn');
      await page.waitForTimeout(260);
      const closed = await page.evaluate(() => !document.getElementById('modal').classList.contains('on'));
      ok(closed, 'F10' + tag + ' [확인] 로 닫힌다');
    }

    /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
    await openTab(page, 'coin');
    const rev = await page.evaluate(`(() => { ${HELPERS}
      const b = document.querySelector('.shop-legal');
      const li = document.getElementById('shopList');

      /* R1 — 노드를 떼면 자가 못 찾는다 */
      const keep = b.nextSibling, par = b.parentNode;
      b.remove();
      const r1 = document.querySelectorAll('.shop-legal').length;
      par.insertBefore(b, keep);

      /* R2 — 리스트 하변을 옛 154 로 되돌리면 마지막 항목이 띠에 가린다 */
      const st = document.createElement('style');
      st.textContent = '.shp-list.coin,.shp-list.pass{bottom:154px}';
      document.head.appendChild(st);
      li.scrollTop = li.scrollHeight;
      const wrap = li.firstElementChild;
      let last = null;
      [...wrap.children].forEach(k => { const r = R(k); if(r.height !== 0 && (!last || r.y2 > last.y2)) last = r; });
      const band = R(b);
      const r2 = !!last && last.y2 > band.y1;      /* 가린다 = 탐지기가 잡는다 */
      st.remove();
      li.scrollTop = li.scrollHeight;

      /* R3 — 문구를 한 글자 바꾸면 상수 대조가 깨진다 */
      const i0 = b.querySelector('i');
      const orig = i0.textContent;
      i0.textContent = orig.replace('7일', '8일');
      const r3 = i0.textContent !== LEGAL_WITHDRAW[0];
      i0.textContent = orig;
      const r3b = i0.textContent === LEGAL_WITHDRAW[0];
      return { r1, r2, r3, r3b, bandY1: band.y1, lastY2: last ? last.y2 : null };
    })()`);
    ok(rev.r1 === 0, 'R1 H' + H + ' 띠 노드를 지우면 [A] 의 자가 못 찾는다', rev.r1 + '개');
    ok(rev.r2 === true, 'R2 H' + H + ' 리스트 하변을 옛 154 로 되돌리면 [D] 가 «가림» 을 잡는다',
      '마지막 ' + rev.lastY2 + ' > 띠 ' + rev.bandY1);
    ok(rev.r3 === true && rev.r3b === true, 'R3 H' + H + ' 문구를 한 글자 바꾸면 [B] 의 상수 대조가 깨진다(원복도 확인)',
      'changed ' + rev.r3 + ' · restored ' + rev.r3b);

    await ctx.close();
  }

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('');
  console.log('VERIFY478 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
