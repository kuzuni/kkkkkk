/* 126 ② 게이트 — 작은 라벨의 «속공간(카운터)» 이 실제로 열렸는지 픽셀로 센다.
 *
 *   node tools/m126counter.js
 *
 * 왜 필요한가: 3회차 비평가 H 의 1순위가 «작은 라벨에서 ㅇ 속이 막힌다» 였다. 4회차가 스트로크를
 * 고정 px → 글자 크기 비율(`--st-*`)로 옮겨 그걸 회수했는데, «회수됐다» 를 눈이 아니라 수치로
 * 붙들어 두지 않으면 다음 세션이 `font-size` 를 만지다 도로 막아 놓아도 아무도 모른다.
 *
 * 재는 법 — **제품 요소를 그대로 스크린샷 하면 안 된다.** 처음에 그렇게 짰다가 «옛 값이 더 열려
 * 있다» 는 정반대 결과를 얻었다. 이유는 두 가지다:
 *   ① `.mn-l::after` 처럼 **같은 글자를 흰 스트로크로 한 번 더 얹는 오버레이**가 있으면 그 흰
 *      테두리가 속공간을 바깥에서 다시 메운다 — 스트로크 폭과 무관한 제3의 변수가 낀다.
 *   ② 외곽선이 두꺼우면 이웃 글자끼리 검정이 붙어 «글자 사이·ㅅ/ㄹ 의 홈» 에 가짜 주머니가
 *      잔뜩 생긴다. 섬 «개수» 를 세면 두꺼울수록 늘어나 판정이 통째로 뒤집힌다.
 * 그래서 **계산된 타이포그래피만 뽑아 격리 렌더**하고(글꼴·크기·자간·스트로크·paint-order),
 * **가장 큰 갇힌 섬 하나**(= ㅇ 의 속공간)의 면적만 본다.
 *
 * 판정: 같은 자리를 «4회차 이전의 고정 px» 로 다시 그렸을 때보다 새 값의 속공간이 넓어야 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* [이름, 화면 여는 클릭, 선택자, 4회차 이전의 고정 스트로크(px)] — 카운터가 있는 글자를 가진 자리만 */
const SPOTS = [
  ['52 메뉴 «우편»',          '#menub', '#mnw [data-mn="mail"] .mn-l',  7],
  ['52 메뉴 «길라잡이»',       '#menub', '#mnw [data-mn="guide"] .mn-l', 7],
  ['52 메뉴 «설정»',          '#menub', '#mnw [data-mn="conf"] .mn-l',  7],
  ['10 상점 «10회 소환»', '.tab[data-t="shop"]', '#shopList .shp-card .cbtn>.lab', 6],
  ['10 상점 «1,000»',     '.tab[data-t="shop"]', '#shopList .shp-card .cbtn>.cost', 6],
  /* 팝업 타이틀 — 4회차 2차에서 `--st-title` 을 .15 → .22 로 되올린 자리라 같이 지킨다 */
  ['22 팝업 타이틀 «퀘스트»','.side .ibtn[data-pop="quest"]', '#mtitle', 10],
  /* 9회차 — ③ 에서 스트로크를 «올린» 자리들. 여기서는 «옛 값» 이 4회차 이전 고정 px 가 아니라
     **9회차 직전 값**이다(레일 2.32 · 19 라벨 4 · 「마을」 4). 즉 이 세 줄의 판정은
     «옛 고정 px 보다 열렸나» 가 아니라 **«올린 뒤에도 카운터가 살아 있나»** 를 본다 —
     회복 배율이 1.0 미만으로 내려가는 것은 정상이고, 새 값이 0 이 되면 절벽이다. */
  ['02 레일 «승급전»',       null, '#sideL .ibtn[data-pop="promo"] .sl', 2.32, 'alive'],
  ['02 레일 «축복»',         null, '#sideL .ibtn[data-pop="bless"] .sl', 2.32, 'alive'],
  /* 201(2026-08-27, 저장소 주인 지시) — «초상화»·«프레임» 탭이 폐기돼 `.pf-tab.t2` 는 더 없다.
     남겨 두면 0 매치라 «면적 0 = 절벽» 으로 항상 빨개진다(189 의 「마을」과 같은 부패한 빨강). 뺀다.
     ⚠ **빼기 전에 남은 칸으로 옮겨 재 봤다** — `.pf-tab.t1>i`(「칭호」)는 같은 CSS 인데
        속공간이 **4.6 px²**(하한 8 미만)로, 「초상화」의 30.4 와 6.6배 차이다. 즉 이 자리는
        내내 «초상화 의 ㅇ» 하나로 초록이었고 「칭호」의 작은 받침 ㅇ 은 126 10회차의 4 → 6.08px
        올림에 76% 막혀 있었다(옛 4px 에서는 18.9). 그 자리를 여기서 조용히 초록으로 덮지 않고
        **작업 240 으로 등재**했다 — 126 은 주인 지시로 마감돼 이 게이트가 토큰을 못 만진다.
     9회차 ③ 이 «올린» 3곳 중 「19 라벨」군은 아래 «해금 미션» 이 그대로 잇는다. */
  ['19 프로필 «해금 미션»',   '#profBtn', '#pfw .pf-msn>i', 4, 'alive'],
  /* 189(2026-08-27, 저장소 주인 지시) — 02 «마을» 칸이 삭제돼 이 자리는 더 없다.
     남겨 두면 셀렉터가 0 매치라 «면적 0 = 절벽» 으로 항상 빨개진다(부패한 빨강). 뺀다.
     9회차 ③ 이 «올린» 자리 3곳 중 하나가 사라진 것이고, 남은 둘(레일 2.32 · 19 라벨 4)이 판정을 잇는다. */
];

/* 판정 방향 —
 *   'open'  (기본) 4회차가 고정 px 를 비율 토큰으로 «내린» 자리. 새 값이 옛 값보다 1.2배 넓어야 한다.
 *   'alive' 9회차가 ③ 때문에 «올린» 자리. 넓어질 리가 없으므로 **절벽에 안 떨어졌는지**만 본다.
 *
 * 하한을 «자유 카운터의 몇 %» 로 잡으면 안 된다 — 위 'open' 4자리가 통과하는 지점이 각각
 * 14% · 150% · 27% · 11% 로 흩어져 있어(글리프마다 자유 카운터가 다르다) 비율에는 공통 기준이 없다.
 * 대신 **통과하는 자리들의 절대 면적 최솟값**을 쓴다: 10 상점 «1,000» 8.3 · 52 «우편» 8.9 가
 * 이 디자인이 «열려 있다» 고 인정한 하한선이므로 **8.0 px²** 로 둔다. */
const FLOOR_ABS = 8.0;

const probe = (page, sel, oldSw) => page.evaluate(async ({ sel, oldSw }) => {
  const src = document.querySelector(sel);
  if (!src) return null;
  const cs = getComputedStyle(src);
  const txt = (src.textContent || '').trim();
  if (!txt) return null;
  const nowSw = parseFloat(cs.webkitTextStrokeWidth) || 0;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;background:#808080;'
    + 'padding:24px;display:flex;gap:24px';
  document.body.appendChild(host);

  const mk = (sw) => {
    const s = document.createElement('span');
    s.textContent = txt;
    s.style.cssText = 'background:#808080;color:#fff;white-space:nowrap;'
      + 'font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';'
      + 'letter-spacing:' + cs.letterSpacing + ';'
      + '-webkit-text-stroke:' + sw + 'px #000;paint-order:' + (cs.paintOrder || 'normal') + ';';
    host.appendChild(s);
    return s;
  };
  const els = [mk(0), mk(nowSw), mk(oldSw)];
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* 한 span 을 확대 렌더해 «검정에 갇힌 회색 섬» 중 가장 큰 것의 면적(원본 px²)을 낸다.
     foreignObject 는 바깥 스타일시트를 안 들고 가므로 위에서 전부 인라인으로 넣었다. */
  const top1 = async (el) => {
    const r = el.getBoundingClientRect(), S = 6;
    const W = Math.ceil(r.width * S), H = Math.ceil(r.height * S);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">'
      + '<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"'
      + ' style="transform:scale(' + S + ');transform-origin:0 0">'
      + new XMLSerializer().serializeToString(el) + '</div></foreignObject></svg>';
    const img = new Image();
    await new Promise((ok, ng) => {
      img.onload = ok; img.onerror = ng;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#808080'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let k = 0, q = 0; k < d.length; k += 4, q++)
      if (Math.abs(d[k] - 128) < 26 && Math.abs(d[k + 1] - 128) < 26 && Math.abs(d[k + 2] - 128) < 26) gray[q] = 1;
    const seen = new Uint8Array(W * H), st = [];
    const push = q => { if (gray[q] && !seen[q]) { seen[q] = 1; st.push(q); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (st.length) {
      const q = st.pop(), x = q % W, y = (q / W) | 0;
      if (x > 0) push(q - 1); if (x < W - 1) push(q + 1);
      if (y > 0) push(q - W); if (y < H - 1) push(q + W);
    }
    const s2seen = new Uint8Array(W * H); let top = 0;
    for (let q = 0; q < W * H; q++) {
      if (!gray[q] || seen[q] || s2seen[q]) continue;
      let c = 0; const s2 = [q]; s2seen[q] = 1;
      while (s2.length) {
        const z = s2.pop(), x = z % W, y = (z / W) | 0; c++;
        const nb = [x > 0 ? z - 1 : -1, x < W - 1 ? z + 1 : -1, y > 0 ? z - W : -1, y < H - 1 ? z + W : -1];
        for (const t of nb) if (t >= 0 && gray[t] && !seen[t] && !s2seen[t]) { s2seen[t] = 1; s2.push(t); }
      }
      if (c > top) top = c;
    }
    return +(top / (S * S)).toFixed(1);
  };

  const out = {
    fs: +parseFloat(cs.fontSize).toFixed(1), nowSw: +nowSw.toFixed(2), oldSw,
    free: await top1(els[0]), now: await top1(els[1]), before: await top1(els[2]),
  };
  host.remove();
  return out;
}, { sel, oldSw });

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const rows = [];
  for (const [name, opener, sel, oldSw, dir] of SPOTS) {
    await page.goto(URL);
    await page.waitForTimeout(700);
    try { await page.click(opener, { timeout: 3000 }); } catch (_) {}
    await page.waitForTimeout(700);
    const r = await probe(page, sel, oldSw);
    if (r) rows.push({ name, dir: dir || 'open', ...r });
    else console.log('  (건너뜀 — 자리를 못 찾음) ' + name);
  }
  await browser.close();

  console.log('\n속공간 실측 — 검정에 갇힌 «바탕색 섬» 중 가장 큰 것(= ㅇ 의 속공간, 원본 px²)\n');
  console.log('| 자리 | fs | 옛 sw → 새 sw | 스트로크 0 | 옛 값 | 새 값 | 회복 |');
  console.log('|---|---|---|---|---|---|---|');
  /* «스트로크 0» 에서도 섬이 안 잡히는 자리는 이 측정기로 **볼 수 없는** 자리다 —
     막혔다는 뜻이 아니라 잣대가 그 글리프의 카운터를 못 찾는다는 뜻이므로 판정에서 뺀다.
     (실제로 52 «설정» 이 그렇다: 스트로크를 아예 빼도 0 이 나온다. 그 상태로 FAIL 을 내면
      «회수 실패» 로 오독된다.) */
  let bad = 0, skip = 0;
  for (const r of rows) {
    const blind = r.free < 3;
    const ok = !blind && (r.dir === 'alive' ? r.now >= FLOOR_ABS : r.now > r.before * 1.2);
    if (blind) skip++; else if (!ok) bad++;
    console.log('| ' + r.name + ' | ' + r.fs + ' | ' + r.oldSw + ' → ' + r.nowSw + ' | ' + r.free
      + ' | ' + r.before + ' | ' + r.now + ' | '
      + (blind ? '— **측정 불가**(스트로크 0 에서도 섬 없음 = 잣대가 이 글리프를 못 본다)'
               : (r.dir === 'alive'
                    ? r.now + ' px² (하한 ' + FLOOR_ABS + ')'
                    : (r.before ? (r.now / r.before).toFixed(1) + '×' : '—')) + (ok ? ' ✔' : ' **✗**')) + ' |');
  }
  const judged = rows.length - skip;
  console.log('\nCOUNTER126 ' + (judged - bad) + '/' + judged + ' ' + (bad ? 'FAIL' : 'PASS')
    + (skip ? '  (측정 불가 ' + skip + '건 제외)' : ''));
  process.exit(bad ? 1 : 0);
})();
