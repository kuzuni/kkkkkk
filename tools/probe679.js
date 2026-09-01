/* 679 재현기 — `tools/verify124.js` [카드 밖으로 새는 요소 0] 1건 실패의 «새는 노드» 를 특정한다.
   실행: node tools/probe679.js   (1080x2280 · 헤드리스)

   등재문이 남긴 갈래를 가른다:
     ⓐ 실재 돌출 — 471 «점 중심 = 호스트 코너» 규약이 의도한 돌출인데 자의 «의도한 돌출 제외»
        목록(.stt · .pil · .bdg · .rb)에 그 자리가 안 적혀 있다  ⇒ 제품이 아니라 자를 고친다.
     ⓑ 게이트 부패 — 자가 옛 자리를 기준으로 «샌다» 를 판정한다.
     ⓒ 진짜 결함 — 아무도 의도하지 않은 돌출  ⇒ 제품을 고친다.

   자는 `e.className || e.tagName` 만 찍어서 «S» 세 글자밖에 안 남긴다(빈 className).
   여기서는 **부모 사슬 · 클래스 · 계산된 스타일 · 카드 대비 Δ** 를 전부 찍는다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(900);

  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300);
  await page.click('#shopCats .shp-ct[data-cat="pass"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => Promise.all(
    document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);

  console.log('\n[A] 새는 노드 특정 — 자와 **같은 규칙**(제외 .stt/.pil/.bdg/.rb · ±1px)으로 훑고 전부 찍는다');
  const A = await page.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .pvc')];
    const out = ['stt', 'pil', 'bdg', 'rb'];
    const chain = e => { const p = []; let n = e; while (n && n !== document.body) {
      p.push(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string'
        ? '.' + n.className.trim().split(/\s+/).join('.') : '')); n = n.parentElement; } return p.join(' < '); };
    return cds.map((c, ci) => {
      const cb = c.getBoundingClientRect();
      return {
        ci, card: { x: +cb.x.toFixed(2), y: +cb.y.toFixed(2), r: +cb.right.toFixed(2), b: +cb.bottom.toFixed(2) },
        name: c.querySelector('.pvt>i') ? c.querySelector('.pvt>i').textContent : '?',
        leaks: [...c.querySelectorAll('*')].filter(e => {
          if (out.some(k => e.closest('.' + k))) return false;
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.x < cb.x - 1 || b.right > cb.right + 1
            || b.y < cb.y - 1 || b.bottom > cb.bottom + 1);
        }).map(e => {
          const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
          return {
            tag: e.tagName, cls: e.className || '(없음)', id: e.id || '',
            parent: e.parentElement ? e.parentElement.tagName.toLowerCase()
              + (e.parentElement.className ? '.' + String(e.parentElement.className).trim().split(/\s+/).join('.') : '') : '',
            chain: chain(e),
            rect: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) },
            d: { L: +(cb.x - b.x).toFixed(2), R: +(b.right - cb.right).toFixed(2),
                 T: +(cb.y - b.y).toFixed(2), B: +(b.bottom - cb.bottom).toFixed(2) },
            pos: cs.position, top: cs.top, right: cs.right, left: cs.left, bottom: cs.bottom,
            disp: cs.display, z: cs.zIndex, bg: cs.background.slice(0, 60),
            html: e.outerHTML.slice(0, 160),
          };
        }),
      };
    });
  });
  A.forEach(c => {
    console.log('  카드' + (c.ci + 1) + ' «' + c.name + '» 상자 x' + c.card.x + '..' + c.card.r
      + ' / y' + c.card.y + '..' + c.card.b + ' — 새는 노드 ' + c.leaks.length + '개');
    c.leaks.forEach(l => {
      console.log('    · <' + l.tag + '> class="' + l.cls + '" 부모 ' + l.parent);
      console.log('      사슬 ' + l.chain);
      console.log('      상자 x' + l.rect.x + ' y' + l.rect.y + ' ' + l.rect.w + '×' + l.rect.h
        + ' — 넘침 L' + l.d.L + ' R' + l.d.R + ' T' + l.d.T + ' B' + l.d.B);
      console.log('      style position:' + l.pos + ' top:' + l.top + ' right:' + l.right
        + ' left:' + l.left + ' bottom:' + l.bottom + ' display:' + l.disp + ' z:' + l.z);
      console.log('      html ' + l.html.replace(/\s+/g, ' '));
    });
  });
  ok('[A1] 카드 3장', A.length === 3, A.length + '장');
  const total = A.reduce((n, c) => n + c.leaks.length, 0);
  ok('[A2] 자와 같은 1건 재현 — 카드마다 정확히 1개',
    A.every(c => c.leaks.length === 1), '카드별 ' + A.map(c => c.leaks.length).join(',') + ' (합 ' + total + ')');
  ok('[A3] 새는 노드는 전부 <S> 태그', A.every(c => c.leaks.every(l => l.tag === 'S')),
    A.map(c => c.leaks.map(l => l.tag).join('/')).join(' · '));

  console.log('\n[B] 그 <s> 가 무엇인가 — 카드 안 모든 <s> 를 클래스별로 센다');
  const B = await page.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .pvc')];
    const m = {};
    cds.forEach(c => [...c.querySelectorAll('s')].forEach(e => {
      const k = (e.className || '(클래스 없음)') + ' @ ' + (e.parentElement
        ? e.parentElement.tagName.toLowerCase() + '.' + String(e.parentElement.className || '').trim().split(/\s+/).join('.')
        : '');
      m[k] = (m[k] || 0) + 1;
    }));
    return m;
  });
  Object.entries(B).forEach(([k, v]) => console.log('    ' + v + '개  ' + k));

  console.log('\n[C] 판정 — ⓐ(471 돌출) · ⓑ(게이트 부패) · ⓒ(진짜 결함) 중 어느 것인가');
  const C = await page.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .pvc')];
    const out = ['stt', 'pil', 'bdg', 'rb'];
    return cds.map(c => {
      const cb = c.getBoundingClientRect();
      const leak = [...c.querySelectorAll('*')].find(e => {
        if (out.some(k => e.closest('.' + k))) return false;
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.x < cb.x - 1 || b.right > cb.right + 1 || b.y < cb.y - 1 || b.bottom > cb.bottom + 1);
      });
      if (!leak) return null;
      const b = leak.getBoundingClientRect();
      /* 클리핑 조상을 카드까지 훑어 «보이는 상자» 를 만든다 */
      let r = { x: b.x, y: b.y, right: b.right, bottom: b.bottom };
      const clips = [];
      for (let n = leak.parentElement; n; n = n.parentElement) {
        if (getComputedStyle(n).overflow !== 'visible') {
          const nb = n.getBoundingClientRect();
          clips.push(n.tagName.toLowerCase() + '.' + String(n.className || '') + ' overflow:' + getComputedStyle(n).overflow);
          r = { x: Math.max(r.x, nb.x), y: Math.max(r.y, nb.y),
                right: Math.min(r.right, nb.right), bottom: Math.min(r.bottom, nb.bottom) };
        }
        if (n === c) break;
      }
      return {
        cls: leak.className || leak.tagName, parent: String(leak.parentElement.className || ''),
        rawW: +b.width.toFixed(2), rawR: +b.right.toFixed(2),
        visW: +(r.right - r.x).toFixed(2), visR: +r.right.toFixed(2),
        cardR: +cb.right.toFixed(2),
        rawOver: +(b.right - cb.right).toFixed(2), visOver: +(r.right - cb.right).toFixed(2),
        clips,
        /* 471 규약(«점 중심 = 호스트 코너») 과 맞는가 — 레드닷이면 중심이 코너에 앉는다 */
        isDot: leak.classList.contains('updot') || leak.classList.contains('dot'),
      };
    });
  });
  C.forEach((l, i) => {
    if (!l) { console.log('  카드' + (i + 1) + ' — 새는 노드 없음'); return; }
    console.log('  카드' + (i + 1) + ' <' + l.cls + '> @ ' + l.parent
      + ' — raw 폭 ' + l.rawW + ' 우변 ' + l.rawR + ' (카드 우변 ' + l.cardR + ' 대비 +' + l.rawOver + ')');
    console.log('      보이는 폭 ' + l.visW + ' 우변 ' + l.visR + ' ⇒ 카드 밖 ' + l.visOver + 'px');
    console.log('      자르는 조상: ' + (l.clips.length ? l.clips.join(' | ') : '없음'));
  });
  ok('[C1] 새는 노드는 레드닷(471 계열)이 아니다 ⇒ 갈래 ⓐ 기각',
    C.every(l => l && !l.isDot), C.map(l => l && l.isDot).join(','));
  ok('[C2] raw 로는 카드 밖 32px 로 나간다(자가 본 값)',
    C.every(l => l && Math.abs(l.rawOver - 32) <= 1), C.map(l => l && l.rawOver).join(','));
  ok('[C3] 그러나 클리핑 조상이 있고 «보이는» 넘침은 0 ⇒ 화면에는 한 픽셀도 안 나온다 (갈래 ⓑ)',
    C.every(l => l && l.clips.length > 0 && l.visOver <= 0),
    C.map(l => l && l.visOver).join(','));
  ok('[C4] 보이는 폭 = .ntc 창 폭 32px (설계: 타원 중심이 카드 우변 위 ⇒ 왼쪽 절반만 쓴다)',
    C.every(l => l && Math.abs(l.visW - 32) <= 1), C.map(l => l && l.visW).join(','));

  console.log('\n[D] 되돌림 — .ntc 의 클리핑을 떼면 «진짜로» 샌다(제품이 옳다는 증거)');
  const D = await page.evaluate(() => {
    const c = document.querySelector('#shopList .pvc');
    const s = c.querySelector('.ntc>s');
    const cb0 = c.getBoundingClientRect();
    const seen = e => { /* 화면에 실제로 그려진 우변 */
      const b = e.getBoundingClientRect(); let r = b.right;
      for (let n = e.parentElement; n; n = n.parentElement) {
        if (getComputedStyle(n).overflow !== 'visible') r = Math.min(r, n.getBoundingClientRect().right);
        if (n === c) break;
      } return r;
    };
    const before = +(seen(s) - cb0.right).toFixed(2);
    const st = document.createElement('style');
    st.textContent = '#shopw .pvc>.ntc{overflow:visible !important}';
    document.head.appendChild(st);
    const off = +(seen(s) - c.getBoundingClientRect().right).toFixed(2);
    st.remove();
    const after = +(seen(s) - c.getBoundingClientRect().right).toFixed(2);
    return { before, off, after };
  });
  console.log('    보이는 넘침 — 지금 ' + D.before + 'px · 클리핑 떼면 ' + D.off + 'px · 되돌리면 ' + D.after + 'px');
  ok('[D1] 지금은 0 이하', D.before <= 0, D.before + 'px');
  ok('[D2] 클리핑을 떼면 32px 새어 나온다 (자가 잡아야 할 «진짜» 결함의 모양)',
    Math.abs(D.off - 32) <= 1, D.off + 'px');
  ok('[D3] 되돌리면 다시 0 이하', D.after <= 0, D.after + 'px');

  console.log('\nPROBE679 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
