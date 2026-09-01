/* 124 검증 — 10 상점 «이용권» 탭 (평생 광고 제거 · 자동 축복)
   [3]-(가) 기계적/기능 작업 검증: 비평가 없이 «DOM 실측 + 실동작 + 저장 반영» 으로 판정한다.
   실행: node tools/verify124.js   (1080x2280 · 헤드리스)

   자동 축복 오프라인 정산은 **여기서 독립적으로 다시 시뮬**해 기대값을 만든다(게임 코드를
   그대로 불러 쓰면 «자기 자신과 비교» 가 되어 아무것도 검증하지 못한다).
   시각 경계 문제: 페이지의 Date.now() 는 하네스가 세이브를 쓴 시각보다 수백 ms 뒤다.
   그래서 «마지막 발동 ~ 지금» 과 «지금 ~ 다음 발동» 이 **둘 다 90초 이상** 떨어지는
   경과시간을 후보 중에서 골라 쓴다(경계에 걸려 발동 수가 1 흔들리는 것을 원천 차단). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const W = 1080, H = 2280;
const KEY = 'idle_hunter_save_v4';
const DAY = 24 * 3600 * 1000;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
/* 122·60 — «300ms 면 열기 연출이 끝났겠지» 는 낡은 가정이다. 느린 러너에서는 페이지 등장 팝이
   300~520ms 뒤에 끝나고, 그 중간에 재면 `#shopCats` 가 0.985 로 줄어든 채 찍혀 124 와 무관한
   FAIL 이 뜬다(verify45 가 같은 이유로 먼저 겪었다). 애니메이션이 끝날 때까지 기다린다. */
const settled = async page => {
  await page.evaluate(() => Promise.all(
    document.getElementById('shopw').getAnimations().map(a => a.finished.catch(() => {}))));
  await page.waitForTimeout(60);
};

/* ── 게임과 **독립인** 축복 모델 (index.html 의 상수와 같은 값을 손으로 다시 적는다) ──
   495(2026-08-30) — 이 모델이 **456 이전**에 굳어 있었다: 지속을 `30분 + 레벨당 5분` 으로 적어 두어
   §6·§7 이 6건 빨갰다(게임 Lv19 / 기대 Lv11 · 만료 −5분/−20분/−35분). 주인 지시 456(«축복은 늘
   30분으로 해줘 렙업되도», 2026-08-30)이 나중이므로 **456 이 이긴다** — 지속은 레벨을 안 읽는다.
   ⚠ 기대값만 갈아 끼우면 «지속이 통째로 사라져도 초록» 이 되므로, 30분이라는 **값 자체**를 §6 [6-e]
   («만료 = 마지막 발동 + 30분»)·[6-f](3종이 서로 같다)가 따로 단언하고 §R 이 되돌림을 못박는다. */
/* ── 679(2026-09-01) — «카드 밖으로 새는 요소» 를 재는 자. 한 벌만 두고 본 측정·음성항·되돌림이
   **같은 소스**를 쓴다(둘로 적으면 «음성항만 옛 규칙» 같은 헛초록이 난다).
   `spillOf(card, clip)` — `clip=true` 면 «보이는 상자»(클리핑 조상과 교차한 나머지),
   `clip=false` 면 옛 raw 상자. 판정은 카드 상자 ±1px. 자세한 사연은 §2 의 `spill` 주석. */
const SPILL_SRC = `((c, clip) => {
  const cb = c.getBoundingClientRect();
  const out = ['stt', 'pil', 'bdg', 'rb'];
  const vis = e => {
    const b = e.getBoundingClientRect();
    let r = { x: b.x, y: b.y, right: b.right, bottom: b.bottom };
    if (!clip) return r;
    for (let n = e.parentElement; n; n = n.parentElement) {
      if (getComputedStyle(n).overflow !== 'visible') {
        const nb = n.getBoundingClientRect();
        r = { x: Math.max(r.x, nb.x), y: Math.max(r.y, nb.y),
              right: Math.min(r.right, nb.right), bottom: Math.min(r.bottom, nb.bottom) };
      }
      if (n === c) break;
    }
    return r;
  };
  return [...c.querySelectorAll('*')].filter(e => {
    if (out.some(k => e.closest('.' + k))) return false;
    const b = e.getBoundingClientRect(); if (!(b.width > 0)) return false;
    const r = vis(e);
    if (r.right - r.x <= 0 || r.bottom - r.y <= 0) return false;   /* 통째로 잘렸다 */
    return r.x < cb.x - 1 || r.right > cb.right + 1
      || r.y < cb.y - 1 || r.bottom > cb.bottom + 1;
  }).map(e => (e.className || e.tagName)
    + (e.parentElement && e.parentElement.className ? '@' + e.parentElement.className : ''));
})`;

const B_KEYS = ['atk', 'hp', 'rate'];
const B_DUR = 30 * 60 * 1000, B_MAXLV = 51;
/* 500(2026-08-30) — 레벨업 «필요 경험치» 가 상수 하나에서 **레벨별 표**로 바뀌었다(주인 지시).
   이 자의 시뮬은 그 전 규칙(«어느 레벨에서나 4»)을 손으로 적어 두고 있어서, 표로 바꾸는 순간
   §6·§7 이 495·499 와 **같은 자리에서 세 번째로** 빨개질 참이었다 — 그래서 여기서 같이 갈아 끼운다.
   ⚠ 값을 index.html 에서 읽어 오지 않는다(그러면 «둘이 같이 틀리면 초록» 이 된다) —
   주인 지시문에서 다시 적고, «표대로 도는가» 자체는 `tools/verify500.js` 가 따로 못박는다. */
const B_NEED = [4, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100];
const needAt = lv => B_NEED[Math.min(Math.max(1, lv), B_NEED.length) - 1];
/* «Lv1·prog0 에서 여기까지 오는 데 든 발동 수» — 옛 닫힌 식 (lv−1)×4 + prog 의 표 버전 */
const firesTo = (lv, prog) => { let n = prog; for (let l = 1; l < lv; l++) n += needAt(l); return n; };
/* 456 — 인자도 분기도 없다(레벨을 읽는 지속시간이 되살아날 자리를 이 자에도 안 남긴다) */
const durAt = () => B_DUR;
/* «가장 먼저 만료되는 축복 하나» 를 시간순으로 재발동. lastTime ~ min(now, until) 구간만. */
function sim(bless, lastTime, until, now) {
  let lv = bless.lv, prog = bless.prog, fires = 0;
  const t = {}; B_KEYS.forEach(k => t[k] = bless.exp[k] || 0);
  const end = Math.min(now, until);
  let last = -Infinity, next = Infinity;
  for (let g = 0; g < 20000; g++) {
    let k = null, tm = Infinity;
    B_KEYS.forEach(x => { if (t[x] < tm) { tm = t[x]; k = x; } });
    const at = Math.max(tm, lastTime);
    if (at > end) { next = at; break; }
    if (lv < B_MAXLV) { const need = needAt(lv); if (++prog >= need) { prog -= need; lv++; } } else prog = 0;
    t[k] = at + durAt();
    last = at; fires++;
  }
  return { lv, prog, fires, exp: t, last, next };
}
/* 경계에서 90초 이상 떨어진 경과시간을 고른다 */
function safeElapsed(bless, until0, cands) {
  for (const ms of cands) {
    const now = 1e12, lastTime = now - ms;      /* 상대 관계만 보면 되므로 기준 시각은 아무 값 */
    const r = sim(bless, lastTime, lastTime + until0, now);
    if (r.fires > 0 && now - r.last > 90e3 && r.next - now > 90e3) return ms;
  }
  return cands[0];
}

(async () => {
  let browser;
  try { browser = await launch(chromium); }
  catch (e) { browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const boot = async () => { await page.goto(URL); await page.waitForTimeout(900); };
  const reboot = async () => { await page.reload(); await page.waitForTimeout(1100); };
  await boot();

  /* ================= 1. 탭 3칸 ================= */
  console.log('\n[1] 카테고리 탭 3칸 (소환 · 재화 · 이용권)');
  const mk = await page.evaluate(() => ({
    cats: [...document.querySelectorAll('#shopCats .shp-ct')].map(e => e.dataset.cat),
    labels: [...document.querySelectorAll('#shopCats .shp-ct>i')].map(e => e.textContent),
    sp3: document.getElementById('shopCats').classList.contains('sp3'),
    sp2: document.getElementById('shopCats').classList.contains('sp2'),
  }));
  ok('data-cat = summon,coin,pass', mk.cats.join(',') === 'summon,coin,pass', mk.cats.join(','));
  ok('라벨 = 소환,재화,이용권', mk.labels.join(',') === '소환,재화,이용권', mk.labels.join(','));
  ok('바가 .sp3 (.sp2 폐기)', mk.sp3 && !mk.sp2, 'sp3=' + mk.sp3 + ' sp2=' + mk.sp2);

  await page.evaluate(() => openShopPage());
  await page.waitForTimeout(300); await settled(page);
  const g = await page.evaluate(() => {
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, w: b.width, cx: b.x + b.width / 2 }; };
    const bar = document.getElementById('shopCats');
    return { bar: r(bar), bw: parseFloat(getComputedStyle(bar).borderTopWidth),
      /* 379 — 활성 칸은 «알약» 이라 칸과 상자가 다르다(오버행). 격자 판정에서 가려내려고 표시한다. */
      cells: [...bar.querySelectorAll('.shp-ct')].map(e => ({ ...r(e), on: e.classList.contains('on') })),
      inks: [...bar.querySelectorAll('.shp-ct>i')].map(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const b = rg.getBoundingClientRect(); return { x: b.x, w: b.width, cx: b.x + b.width / 2 };
      }) };
  });
  const inner = g.bar.w - g.bw * 2, sw = g.bar.w / 3;
  ok('칸 3개', g.cells.length === 3, g.cells.length + '개');
  /* ── 379 이관 (2026-08-29) — **나누는 상자가 패딩박스에서 «바깥 상자» 로 바뀌었다.**
     ref 07 에서 픽셀로 확정된 유일한 칸 경계(구분선 3 중심 777)가 바깥 4등분 경계 777.5 와
     Δ0.5 다(측정표 07 §9). 수리 전 이 바의 칸은 325.98 ↔ 바깥/3 330.00 = **−4.02** 였다.
     ⚠ 값만 `bar.w/3` 으로 갈면 «칸 == 알약» 이던 옛 그림도 초록이므로 **활성 칸을 가려내고**
     (알약은 오버행 때문에 칸보다 넓다) 그 알약은 아래 §오버행 절이 따로 문다. */
  const onIdx = g.cells.findIndex(c => c.on);
  const rest = g.cells.map((c, i) => ({ c, i })).filter(o => o.i !== onIdx);
  ok('전제 — 활성 칸이 정확히 1개 (알약은 칸과 상자가 다르다 — 379)',
    g.cells.filter(c => c.on).length === 1, '활성 idx ' + onIdx);
  ok('칸 폭 = **바깥 상자** ÷3 = ' + sw.toFixed(1) + ' (379 — 패딩박스 ÷3 = ' + (inner / 3).toFixed(1) + ' 이 아니다)',
    rest.every(o => near(o.c.w, sw)), rest.map(o => o.c.w.toFixed(1)).join(' / '));
  rest.forEach(o => ok('칸' + (o.i + 1) + ' 왼끝 = 바깥 ' + o.i + '/3 지점',
    near(o.c.x, g.bar.x + sw * o.i), (o.c.x - g.bar.x).toFixed(2) + ' vs ' + (sw * o.i).toFixed(2)));
  ok('칸3 오른끝 = 바 **바깥** 오른끝',
    onIdx === 2 || near(g.cells[2].x + g.cells[2].w, g.bar.x + g.bar.w),
    onIdx === 2 ? '활성 — 면제' : (g.cells[2].x + g.cells[2].w - g.bar.x).toFixed(1) + ' vs ' + g.bar.w.toFixed(1));
  /* 오버행 — ref 07 활성 알약 291/261 ↔ 그 칸 302.5..540 ⇒ 면당 11.75.
     셸 안쪽 변에 닿는 면은 내밀지 않고 패딩 변에 붙는다(378 이 그 면의 검정을 셸에 넘겼다). */
  if (onIdx >= 0) {
    const p = g.cells[onIdx], gl = g.bar.x + sw * onIdx, gr = gl + sw;
    ok('활성 알약 좌 오버행 ' + (onIdx === 0 ? '= 패딩 왼변에 붙음 (378)' : '+11.75'),
      onIdx === 0 ? near(p.x, g.bar.x + g.bw) : near(gl - p.x, 11.75),
      onIdx === 0 ? (p.x - g.bar.x - g.bw).toFixed(2) : '+' + (gl - p.x).toFixed(2));
    ok('활성 알약 우 오버행 ' + (onIdx === 2 ? '= 패딩 오른변에 붙음 (378)' : '+11.75'),
      onIdx === 2 ? near(p.x + p.w, g.bar.x + g.bar.w - g.bw) : near(p.x + p.w - gr, 11.75),
      onIdx === 2 ? (p.x + p.w - (g.bar.x + g.bar.w - g.bw)).toFixed(2) : '+' + (p.x + p.w - gr).toFixed(2));
  }
  g.inks.forEach((l, i) => ok('라벨' + (i + 1) + ' 잉크가 칸 안 중앙 (±3px, 잘림 0)',
    near(l.cx, g.cells[i].cx, 3) && l.x >= g.cells[i].x - 0.5 && l.x + l.w <= g.cells[i].x + g.cells[i].w + 0.5,
    '잉크 ' + l.x.toFixed(1) + '~' + (l.x + l.w).toFixed(1) + ' / 칸 ' + g.cells[i].x.toFixed(1)
    + '~' + (g.cells[i].x + g.cells[i].w).toFixed(1)));

  /* ================= 2. 이용권 탭 — 카드(151 이 규격을 교체했다) ================= */
  /* ⚠ 151(2026-08-27 주인 지시)이 이 탭의 카드를 **레퍼런스 디자인 `.pvc` 3장**으로 갈아 끼웠다.
     124 시절의 `.cn-cd.pv`(13 카드를 빌려 쓴 278×309 2장)는 더 이상 없다. 그래서 이 절은
     «124 가 만든 것» 중 151 이 이어받은 불변식만 본다 — 카드 규격·문구는 `tools/verify151.js` 소관. */
  console.log('\n[2] 이용권 탭 — 카드 · 미보유 상태 (규격은 151, 여기선 공통 불변식만)');
  await page.click('#shopCats .shp-ct[data-cat="pass"]');
  await page.waitForTimeout(350); await settled(page);
  const pv = await page.evaluate(SPILL_SRC => {
    const cds = [...document.querySelectorAll('#shopList .pvc')];
    const spillOf = eval(SPILL_SRC);
    return {
      cat: shopCat, cls: document.getElementById('shopList').classList.contains('pass'),
      n: cds.length,
      old: document.querySelectorAll('#shopList .cn-cd.pv').length,
      names: cds.map(c => c.querySelector('.pvt>i').textContent),
      st: cds.map(c => c.querySelector('.stt>i').textContent),
      buy: cds.map(c => { const b = c.querySelector('[data-pvbuy]'); return b ? b.dataset.pvbuy : null; }),
      /* 카드 안 요소가 카드 밖으로 새지 않는지. 151 은 **상태 탭·알약·가치 배지·리본**이
         레퍼런스대로 카드 밖으로 일부러 나온다(ref 탭 −27 · 알약 −25 · 리본 좌 −2 × k)
         ⚑ **679(2026-09-01) — 축이 «상자» 에서 «보이는 상자» 로 바뀌었다.**
         이 자는 `getBoundingClientRect()` 하나만 보고 «샌다» 를 판정했는데, 그 상자는
         **조상의 `overflow:hidden` 을 모른다**. 667 이 우변 물결 노치를 «구멍 + 덧댄 호» 로
         올리면서(`c552a67`) `.pvc>.ntc{width:32px;overflow:hidden}` 안에 **64px 짜리 타원 링**
         `<s>` 를 넣었다 — 오른쪽 절반이 카드 밖 좌표에 있지만 `.ntc` 가 잘라서 **화면에는 한
         픽셀도 안 나온다**(설계 그대로: 타원 중심이 카드 우변 위라 왼쪽 절반만 쓴다).
         ⚠ **항을 눌러 초록으로 만들지 않았다**(328-330 이관 교훈 — 그러면 헛초록이 된다).
         축을 **«잘리고 남은 상자»** 로 바꿔 명제를 더 참되게 만들고, 무르게 푼 것이 아님을
         아래 세 겹이 못 박는다: ⑴ raw 축을 버리지 않고 **래칫**으로 남겨 «잘려 있음이 확인된
         자리» 밖의 새 넘침은 그대로 빨개진다 ⑵ 음성항(정말 새는 노드 주입) ⑶ §R2 되돌림
         (`.ntc` 의 `overflow` 를 떼면 그 `<s>` 는 진짜로 새고 [2-s] 가 빨개진다). */
      spill: cds.map(c => spillOf(c, true)),
      /* 래칫 — 클리핑을 안 보는 옛 축. 값이 «.ntc>s 세 자리» 를 벗어나면 빨개진다 */
      spillRaw: cds.map(c => spillOf(c, false)),
      wrapH: Math.round(document.querySelector('#shopList .cn-wrap.pv').getBoundingClientRect().height
        / (document.getElementById('app').getBoundingClientRect().width / 1080)),
    };
  }, SPILL_SRC);
  ok('shopCat = pass · #shopList.pass', pv.cat === 'pass' && pv.cls, pv.cat + ' / ' + pv.cls);
  ok('이용권 카드 3장(151)', pv.n === 3, pv.n + '장');
  ok('124 의 옛 카드(.cn-cd.pv) 0장', pv.old === 0, pv.old + '장');
  ok('첫 카드 = 광고 제거', pv.names[0] === '광고 제거', pv.names.join(','));
  ok('전부 «비활성화»', pv.st.every(t => t === '비활성화'), pv.st.join(','));
  ok('구매 버튼 3개 (noads · abless · offplus)',
    pv.buy.join(',') === 'noads,abless,offplus', pv.buy.join(','));
  ok('[2-s] 카드 밖으로 **보이게** 새는 요소 0 (의도한 돌출 제외 · 클리핑 반영 — 679)',
    pv.spill.every(a => a.length === 0), JSON.stringify(pv.spill));
  /* 679 래칫 — raw 축은 «잘려 있음이 확인된 자리» 하나만 허용한다. `.ntc>s` 는 667 의 물결
     노치이고 `.ntc{overflow:hidden}` 가 오른쪽 절반을 자른다(위 주석). 그 밖의 raw 넘침이
     새로 생기면 여기서 먼저 빨개져 «클리핑에 가려진 결함»(LESSONS 151-③)이 조용히 지나가지 않는다. */
  ok('[2-s2] raw 넘침은 «잘려 있음이 확인된» .ntc>s 세 자리뿐 (래칫 — 679)',
    pv.spillRaw.every(a => a.length === 1 && a[0] === 'S@ntc'),
    JSON.stringify(pv.spillRaw));
  /* 679 음성항 — 정말 새는 노드(클리핑 조상 없음)를 주입하면 [2-s] 가 빨개져야 한다.
     안 그러면 «축을 바꾼 것» 이 아니라 «항을 끈 것» 이다. */
  const neg = await page.evaluate(SPILL_SRC => {
    const spillOf = eval(SPILL_SRC);
    const c = document.querySelector('#shopList .pvc');
    const mk = (parent, cls) => {
      const s = document.createElement('div');
      s.className = cls;
      s.style.cssText = 'position:absolute;right:-80px;top:40px;width:60px;height:60px;background:#f0f';
      parent.appendChild(s); return s;
    };
    /* ⓐ 카드 직속 = 자르는 조상이 없다 ⇒ 진짜로 샌다 ⇒ [2-s] 가 빨개져야 한다 */
    const a = mk(c, 'v679nega');
    const hitA = spillOf(c, true).filter(t => t.indexOf('v679nega') === 0).length;
    a.remove();
    /* ⓑ 같은 노드를 `.ntc`(overflow:hidden) 안에 넣으면 화면에 안 나오므로 «샌다» 가 아니다 */
    const ntc = c.querySelector('.ntc');
    const b = mk(ntc, 'v679negb');
    const hitB = spillOf(c, true).filter(t => t.indexOf('v679negb') === 0).length;
    const rawB = spillOf(c, false).filter(t => t.indexOf('v679negb') === 0).length;
    b.remove();
    return { hitA, hitB, rawB, clean: spillOf(c, true).length };
  }, SPILL_SRC);
  ok('[2-s3] 음성항 ⓐ — 안 잘리는 곳에 카드 밖 노드를 주입하면 [2-s] 가 잡는다 (679)',
    neg.hitA === 1, '잡힌 수 ' + neg.hitA);
  ok('[2-s4] 음성항 ⓑ — 같은 노드를 .ntc(overflow:hidden) 안에 넣으면 «보이는 넘침» 0 · raw 는 1 (679)',
    neg.hitB === 0 && neg.rawB === 1, '보임 ' + neg.hitB + ' / raw ' + neg.rawB);
  ok('[2-s5] 주입을 걷으면 다시 0 (679)', neg.clean === 0, neg.clean + '건');
  ok('페이지 높이 = 카드 3장을 담는다(≥2000)', pv.wrapH >= 2000, pv.wrapH + 'px');

  /* ================= 3. 588 — 다이아 경로가 아예 없다 =================
     ⚠ **이 절은 588(2026-08-31, 주인 «그 이용권들은 다이아로 못사게 하기») 이관이다.**
     원래 여기는 «다이아가 모자라면 구매 거절» 을 쟀다 — 그 명제는 이용권을 다이아로 사던 시절의
     것이라 지시로 통째로 죽었다. 자리를 비우지 않고(333 처방) **정확히 반대 명제**로 갈아 끼운다:
     다이아가 10 밖에 없어도 사지고, 그래도 다이아는 **1도 안 줄어든다**.
     ⚑ 이 두 항은 588 이 사라지면(대체가가 되살아나면) 첫 항이, 589 가 사라지면(못 사게 되면)
        둘째 항이 빨개진다 — 어느 쪽으로 되돌려도 잡힌다. */
  console.log('\n[3] 588 — 다이아로는 사지도 차감되지도 않는다');
  const lack = await page.evaluate(() => {
    S.dia = 10; S.mailx = []; S.mailSeq = 0; S.mail = {};
    renderPassPage(document.getElementById('shopList'));
    const before = S.dia, r = buyPass('noads');
    return { r: r, dia: S.dia, before: before, noAds: !!S.pass.noAds,
             field: PASS_ITEMS.filter(q => 'dia' in q).length,
             src: /S\.dia\s*-=/.test(String(buyPass)) };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('588 — 다이아 10 뿐이어도 구매 성공 · 다이아 Δ0 · 권한은 즉시 반영',
    lack.r === true && lack.dia === lack.before && lack.noAds === true,
    'r=' + lack.r + ' dia=' + lack.dia + '/' + lack.before + ' noAds=' + lack.noAds);
  ok('588 — 상품표에 `dia` 필드 0건 · `buyPass` 본문에 다이아 차감 0건',
    lack.field === 0 && lack.src === false, '필드 ' + lack.field + '개 · 차감식 ' + lack.src);

  /* ================= 4. 광고 제거 구매 → 표식·문구·저장 ================= */
  console.log('\n[4] 평생 광고 제거 구매');
  const buy = await page.evaluate(() => {
    S.dia = 1e9; S.mailx = []; S.mailSeq = 0; S.mail = {}; S.mileage = 0;
    /* 588 이후 [3] 절이 실제로 «구매에 성공» 하므로 여기서 권한을 되돌려 놓아야 이 절이 산다
       (옛날엔 [3] 이 «거절» 이라 이 초기화가 필요 없었다 — 588 이관이 만든 자리다). */
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    syncNoAds();
    const p = PASS_ITEMS.find(x => x.id === 'noads'), d0 = S.dia, m0 = S.mileage || 0;
    const paid0 = S.cnt.paid | 0;
    const r = buyPass('noads');
    /* 153 — «즉시 보석»·마일리지 쿠폰은 **상점 구매품** 이라 우편함으로 간다(`grantPass()` 의
       `sendMail()`). 그래서 구매 순간 지갑에서 나가는 것은 **정가 그대로**이고, once 는 우편을
       수령해야 비로소 들어온다. 옛 기대식(`p.dia − p.once`)은 153 이전의 «즉시 입금» 을 전제한
       것이라 부패했다 — 기대값은 게이트 상수가 아니라 PASS_ITEMS·S.mailx 런타임에서 뽑는다. */
    /* 588 — 옛 «정가(다이아 대체가)만큼 차감» 은 죽었다. 이제 기대 차감은 **0** 이다. */
    const cost = d0 - S.dia, price = 0;
    const mail = (S.mailx || []).find(m => (m.t || '').indexOf(p.n) >= 0) || null;
    const c0 = S.dia, cp0 = S.mileage || 0;
    if (mail) claimMail(mail.id);
    return { r: r, cost: cost, price: price, once: p.once || 0, cp: p.cp || 0,
      dPaid: (S.cnt.paid | 0) - paid0,
      dCp: cp0 - m0, mails: (S.mailx || []).length,
      mailC: mail ? mail.c : null, mailM: mail ? mail.m : null,
      claimedDia: S.dia - c0, claimedCp: (S.mileage || 0) - cp0,
      noAds: !!S.pass.noAds,
      cls: document.getElementById('app').classList.contains('noads'),
      saved: !!(JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').pass || {}).noAds };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('588·153 — 구매 성공 · 다이아 순차감 0(가격은 원화, 지급은 우편)',
    buy.r === true && buy.cost === buy.price,
    '차감 ' + buy.cost + ' / 기대 ' + buy.price);
  /* 위 단언만으로는 «once 를 0 으로 지워도» 통과한다 — 즉시 보석이 실제로 존재하고 우편으로
     갔음을 같이 못 박는다(153 을 되돌려 지갑에 직입금하면 cost 가 어긋나 위가, once 를 없애면
     아래가 빨개진다). 값이 «잴 수 있는 크기» 인지도 함께 본다. */
  ok('즉시 보석·쿠폰이 0 이 아니다(단언이 빈 값을 통과시키지 않게)',
    buy.once > 0 && buy.cp > 0, 'once=' + buy.once + ' cp=' + buy.cp);
  ok('153 — 구매 순간 지갑에 즉시 보석·쿠폰이 들어오지 않는다',
    buy.dCp === 0 && buy.cost === buy.price, 'Δ쿠폰=' + buy.dCp + ' Δ다이아=' + buy.cost);
  /* 589 — 결제가 «일어났다» 는 이력이 남는가. 이 항이 없으면 «지급만 하고 결제는 안 센» 경로가 초록이 된다 */
  ok('589 — 이용권 구매가 결제 1건으로 세어진다(S.cnt.paid +1)',
    buy.dPaid === 1, '+' + buy.dPaid);
  ok('153 — 구매가 우편 1통을 만든다(즉시 보석 + 쿠폰)',
    buy.mails === 1 && buy.mailC === buy.once && buy.mailM === buy.cp,
    buy.mails + '통 · c=' + buy.mailC + '/' + buy.once + ' m=' + buy.mailM + '/' + buy.cp);
  ok('153 — 우편 수령으로 즉시 보석·쿠폰이 들어온다',
    buy.claimedDia === buy.once && buy.claimedCp === buy.cp,
    'Δ다이아=' + buy.claimedDia + '/' + buy.once + ' Δ쿠폰=' + buy.claimedCp + '/' + buy.cp);
  ok('S.pass.noAds = true', buy.noAds === true, String(buy.noAds));
  ok('#app.noads 클래스', buy.cls === true, String(buy.cls));
  ok('localStorage 에 저장됨', buy.saved === true, String(buy.saved));

  const adv = await page.evaluate(() => {
    document.querySelector('#shopCats [data-cat="coin"]').click();
    const cd = document.querySelector('#shopList .cn-cd:not(.done)');
    const badge = cd.querySelector('.bt>.ad');
    const mv = document.getElementById('cnMove');
    return { lab: cd.querySelector('.bt>.lab').textContent,
      adVis: badge ? getComputedStyle(badge).display : 'none',
      mv: mv.querySelector('i').textContent, mvOff: mv.classList.contains('off') };
  });
  ok('13 광고 상품 라벨 = «무료 수령»', adv.lab === '무료 수령', adv.lab);
  ok('13 ▶AD 뱃지 숨김', adv.adVis === 'none', adv.adVis);
  ok('13 §6 배너 = «구매 완료»(잠김)', adv.mv === '구매 완료' && adv.mvOff, adv.mv + ' off=' + adv.mvOff);

  /* 광고 상품 클릭 → 즉시 수령 · 일일 횟수는 그대로 줄어든다 */
  const claim = await page.evaluate(() => {
    const a = COIN_ADS[0];
    S.dia = 0; S.daily.adBuy = {};
    renderCoinPage(document.getElementById('shopList'));
    const before = S.dia, l0 = adLeft(a);
    document.querySelector('#shopList [data-cnad="' + a.id + '"]').click();
    return { got: S.dia - before, want: a.r.dia, l0: l0, l1: adLeft(a) };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('광고 상품 클릭 → 즉시 수령(재화 증가)', claim.got === claim.want, '+' + claim.got + ' / 기대 ' + claim.want);
  ok('일일 횟수 제한은 유지된다', claim.l1 === claim.l0 - 1, claim.l0 + ' → ' + claim.l1);

  /* ⚠ 190 이후 — 10 소환 칸의 ▶AD 는 **두 가지 이유**로 숨는다: ① 이용권(`#app.noads`, 이 절이 재는 것)
     ② 오늘 «무광고 1회» 가 남아 있음(`.shp-card.nofad`). 그냥 재면 ② 때문에 항상 초록이라
     이 단언이 «헛초록» 이 된다(LESSONS 232 ①). 그래서 먼저 ② 를 소진시켜 놓고 ① 만 남긴다. */
  const adOther = await page.evaluate(() => {
    SHOP_BOXES.forEach(x => useFreeSum(x.b));          /* 190 ② 소진 — 뱃지를 숨길 이유를 ① 하나로 */
    document.querySelector('#shopCats [data-cat="summon"]').click();
    const b = document.querySelector('#shopList .shp-card .adbadge');
    const of = document.querySelector('.ofr-ad');
    return { sum: b ? getComputedStyle(b).display : 'missing',
      nofad: !!document.querySelector('#shopList .shp-card.nofad'),
      ofr: of ? getComputedStyle(of).display : 'missing' };
  });
  ok('190 ② 가 소진돼 있다(이 절이 ① 만 재는지 확인)', adOther.nofad === false, String(adOther.nofad));
  ok('10 무료 소환 ▶AD 숨김', adOther.sum === 'none', adOther.sum);
  ok('01 오프라인 «1.5배 받기» AD 숨김', adOther.ofr === 'none', adOther.ofr);

  /* ================= 5. 자동 축복 구매 → 즉시 3종 활성 ================= */
  console.log('\n[5] 자동 축복 이용권 구매');
  const ab = await page.evaluate(() => {
    S.dia = 1e9;
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    const t0 = Date.now(), r = buyPass('abless');
    return { r: r, until: S.pass.autoBlessUntil, t0: t0,
      on: BLESS.map(x => blessOn(x.k)), lv: S.bless.lv, prog: S.bless.prog,
      days: autoBlessDays() };
  });
  await page.evaluate(() => closeModal && closeModal());
  ok('구매 성공', ab.r === true, String(ab.r));
  ok('만료 = 지금 + 30일 (±5초)', Math.abs(ab.until - (ab.t0 + 30 * DAY)) < 5000,
    new Date(ab.until).toISOString());
  ok('구매 즉시 3종 축복이 켜진다', ab.on.every(Boolean), JSON.stringify(ab.on));
  ok('3회 발동분이 축복 경험치에 들어간다 (Lv1 · 3/' + needAt(1) + ')', ab.lv === 1 && ab.prog === 3,
    'Lv' + ab.lv + ' · ' + ab.prog + '/' + needAt(ab.lv));
  ok('남은 일수 = 30', ab.days === 30, ab.days + '일');

  /* ================= 6. 오프라인 정산 — 12시간 ================= */
  console.log('\n[6] 오프라인 정산 — 이용권 유효 구간(12시간)');
  const bless0 = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
  /* 12h 근처에서 경계 90초 이상 떨어진 경과시간을 고른다 */
  const el12 = safeElapsed(bless0, 30 * DAY,
    [12 * 3600e3, 12 * 3600e3 + 137e3, 12 * 3600e3 + 311e3, 12 * 3600e3 + 523e3, 12 * 3600e3 + 907e3]);
  const r6 = await page.evaluate(async ([key, el, day, b0]) => {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = now - el;                               /* «마지막 저장» 을 12시간 전으로 */
    raw.bless = b0;
    raw.pass = Object.assign({}, raw.pass, { noAds: true, autoBlessUntil: now + 30 * day });
    localStorage.setItem(key, JSON.stringify(raw));
    /* ⚠ index.html 은 beforeunload 에 save() 를 걸어 둔다 — reload 하면 «지금 메모리의 S» 가
       방금 심은 세이브를 덮는다(리스너가 함수 참조를 잡고 있어 save 를 덮어써도 소용없다).
       그래서 setItem 자체를 막는다. 새로 로드된 페이지에서는 프로토타입이 원래대로 돌아온다. */
    Storage.prototype.setItem = function () {};
    return { lastTime: raw.time, until: raw.pass.autoBlessUntil };
  }, [KEY, el12, DAY, bless0]);
  await reboot();
  const got6 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, exp: Object.assign({}, S.bless.exp),
    on: BLESS.map(x => blessOn(x.k)),
    line: (document.getElementById('ofrAuto') || {}).textContent,
    lineOn: !!(document.getElementById('ofrAuto') || { classList: { contains: () => false } }).classList.contains('on'),
    now: Date.now(),
  }));
  const want6 = sim(bless0, r6.lastTime, r6.until, got6.now);
  ok('축복 Lv 가 시뮬 기대값과 일치', got6.lv === want6.lv, '게임 Lv' + got6.lv + ' / 기대 Lv' + want6.lv);
  ok('축복 경험치(prog)가 시뮬 기대값과 일치', got6.prog === want6.prog,
    got6.prog + '/' + needAt(got6.lv) + ' / 기대 ' + want6.prog + '/' + needAt(want6.lv));
  /* 500 — 닫힌 식이 «(Lv−1)×4 + prog» 에서 **표의 누적합**으로 바뀌었다(필요량이 레벨마다 다르다) */
  ok('발동 수 = 표 누적합(Lv−1까지) + prog = ' + want6.fires,
    firesTo(got6.lv, got6.prog) === want6.fires, firesTo(got6.lv, got6.prog) + '회');
  ok('3종 만료 시각이 시뮬과 일치 (±0ms)',
    B_KEYS.every(k => got6.exp[k] === want6.exp[k]),
    B_KEYS.map(k => (got6.exp[k] - want6.exp[k])).join(' / ') + ' ms 차');
  /* 495 — 시뮬 대조만으로는 «지속» 이라는 뜻이 자에서 빠져나간다(둘이 같이 틀리면 초록이다).
     30분이라는 값을 게임이 낸 만료 시각에서 **직접** 읽어 못박는다. */
  ok('[6-e] 만료 = 마지막 발동 + 30분 (456 — 지속이 레벨을 안 읽는다)',
    B_KEYS.every(k => got6.exp[k] - want6.last === B_DUR),
    B_KEYS.map(k => Math.round((got6.exp[k] - want6.last) / 60000) + '분').join(' / '));
  ok('[6-f] 3종 만료 시각이 서로 같다 (레벨당 가산이면 벌어진다)',
    got6.exp.atk === got6.exp.hp && got6.exp.hp === got6.exp.rate,
    (got6.exp.atk - got6.exp.hp) + ' / ' + (got6.exp.hp - got6.exp.rate) + ' ms 차');
  ok('정산 후 3종이 전부 켜져 있다', got6.on.every(Boolean), JSON.stringify(got6.on));
  ok('01 오프라인 팝업에 «자동 축복 n회 발동 · 축복 Lv a→b» 한 줄', got6.lineOn
    && /자동 축복 \d+회 발동 · 축복 Lv \d+→\d+/.test(got6.line || ''), (got6.line || '(없음)').trim());

  /* ================= 7. 이용권 만료 이후 구간은 계산하지 않는다 ================= */
  console.log('\n[7] 이용권 만료 이후 구간 미계산');
  const r7 = await page.evaluate(async ([key, day, b0]) => {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = now - 12 * 3600e3;                     /* 12시간 전에 저장 */
    raw.bless = b0;
    raw.pass = Object.assign({}, raw.pass, { autoBlessUntil: now - 6 * 3600e3 });  /* 6시간 전 만료 */
    localStorage.setItem(key, JSON.stringify(raw));
    Storage.prototype.setItem = function () {};      /* [6] 과 같은 이유 */
    return { lastTime: raw.time, until: raw.pass.autoBlessUntil };
  }, [KEY, DAY, bless0]);
  await reboot();
  const got7 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, exp: Object.assign({}, S.bless.exp),
    on: BLESS.map(x => blessOn(x.k)), now: Date.now(),
  }));
  const want7 = sim(bless0, r7.lastTime, r7.until, got7.now);
  const wantFull = sim(bless0, r7.lastTime, r7.lastTime + 99 * DAY, got7.now);
  ok('만료 시각까지만 발동 (Lv·prog 일치)', got7.lv === want7.lv && got7.prog === want7.prog,
    '게임 Lv' + got7.lv + '·' + got7.prog + '/' + needAt(got7.lv)
    + ' / 기대 Lv' + want7.lv + '·' + want7.prog + '/' + needAt(want7.lv));
  ok('«만료 무시» 였다면 더 많이 발동했을 것 (' + want7.fires + ' < ' + wantFull.fires + ')',
    want7.fires < wantFull.fires && firesTo(got7.lv, got7.prog) === want7.fires,
    'Lv' + got7.lv + '·' + got7.prog + ' = ' + firesTo(got7.lv, got7.prog) + '회');
  ok('만료 6시간 뒤라 지금은 축복이 전부 꺼져 있다', got7.on.every(v => v === false), JSON.stringify(got7.on));

  /* ================= 8. 이용권 없으면 옛 동작 그대로 ================= */
  console.log('\n[8] 이용권 미보유 — 옛 동작 그대로');
  await page.evaluate(([key]) => {
    const raw = JSON.parse(localStorage.getItem(key));
    raw.time = Date.now() - 12 * 3600e3;
    raw.bless = { lv: 3, prog: 2, exp: { atk: 0, hp: 0, rate: 0 } };
    raw.pass = { prem: {}, got: {} };                 /* 두 이용권 키를 아예 지운다 */
    localStorage.setItem(key, JSON.stringify(raw));
    Storage.prototype.setItem = function () {};      /* [6] 과 같은 이유 */
  }, [KEY]);
  await reboot();
  const got8 = await page.evaluate(() => ({
    lv: S.bless.lv, prog: S.bless.prog, on: BLESS.map(x => blessOn(x.k)),
    noAds: S.pass.noAds, until: S.pass.autoBlessUntil,
    cls: document.getElementById('app').classList.contains('noads'),
    lineOn: document.getElementById('ofrAuto').classList.contains('on'),
  }));
  ok('구 세이브(pass 키 없음) → noAds=false · autoBlessUntil=0',
    got8.noAds === false && got8.until === 0, 'noAds=' + got8.noAds + ' until=' + got8.until);
  ok('#app.noads 안 붙음', got8.cls === false, String(got8.cls));
  ok('자동 발동 0회 — 축복 Lv·prog 그대로(3 · 2/' + needAt(3) + ')', got8.lv === 3 && got8.prog === 2,
    'Lv' + got8.lv + ' · ' + got8.prog + '/' + needAt(got8.lv));
  ok('축복은 꺼진 채로 남는다', got8.on.every(v => v === false), JSON.stringify(got8.on));
  ok('정산 한 줄도 숨김', got8.lineOn === false, String(got8.lineOn));
  const lab8 = await page.evaluate(() => {
    openShopPage();
    document.querySelector('#shopCats [data-cat="coin"]').click();
    const cd = document.querySelector('#shopList .cn-cd:not(.done)');
    return { lab: cd.querySelector('.bt>.lab').textContent,
      ad: getComputedStyle(cd.querySelector('.bt>.ad')).display,
      mv: document.getElementById('cnMove').querySelector('i').textContent };
  });
  ok('13 라벨 = «받기» · ▶AD 보임 · 배너 «이동»',
    lab8.lab === '받기' && lab8.ad !== 'none' && lab8.mv === '이동',
    lab8.lab + ' / ad=' + lab8.ad + ' / ' + lab8.mv);
  /* §6 배너 [이동] → 이용권 탭으로 간다 */
  const mv = await page.evaluate(() => { document.getElementById('cnMove').click(); return shopCat; });
  ok('§6 배너 [이동] → 이용권 탭', mv === 'pass', String(mv));

  /* ================= R. 되돌림 시험 (495) =================
     334 처방 — 자리를 비우지 않았음을 못박는다. 456 이전 곡선(`30분 + 레벨당 5분`)을 게임에 다시
     깔면 §6 의 단언들이 **실제로** 빨개져야 하고(걷으면 초록), 그래야 «기대값만 맞춰 놓은 자» 가
     아니다. 정산 함수를 직접 부른다 — reload 로는 정의 전에 끼어들 수 없다(456 [R] 과 같은 방식). */
  console.log('\n[R] 되돌림 시험 — 456 이전 «레벨당 가산» 곡선을 다시 깔면 §6 이 빨개진다');
  const rr = await page.evaluate(([b0, day, el]) => {
    const now = Date.now(), lastTime = now - el, until = now + 30 * day;
    const run = () => {
      S.bless = { lv: b0.lv, prog: b0.prog, exp: { atk: 0, hp: 0, rate: 0 } };
      S.pass = Object.assign({}, S.pass, { noAds: true, autoBlessUntil: until });
      const r = autoBlessSettle(lastTime);
      return { n: r ? r.n : 0, lv: S.bless.lv, prog: S.bless.prog,
        exp: Object.assign({}, S.bless.exp) };
    };
    const orig = window.blessDur;
    window.blessDur = () => 30 * 60 * 1000 + 5 * 60 * 1000 * (blessLv() - 1);  /* 456 이전 곡선 */
    const bad = run();
    window.blessDur = orig;                                    /* 시험이 상태를 안 남긴다 */
    const good = run();
    /* 500 — 두 번째 되돌림: «어느 레벨에서나 4» 를 다시 깔면 표 기반 기대값이 깨진다 */
    const origNeed = window.blessNeed;
    window.blessNeed = () => 4;
    const flat = run();
    window.blessNeed = origNeed;
    const good2 = run();
    return { lastTime: lastTime, until: until, now: now, bad: bad, good: good, flat: flat, good2: good2 };
  }, [bless0, DAY, el12]);
  const wantR = sim(bless0, rr.lastTime, rr.until, rr.now);
  ok('[R1] 옛 곡선을 깔면 Lv·발동 수·만료가 전부 어긋난다',
    rr.bad.lv !== wantR.lv && rr.bad.n !== wantR.fires
    && B_KEYS.some(k => rr.bad.exp[k] !== wantR.exp[k]),
    'Lv' + rr.bad.lv + ' · ' + rr.bad.n + '회 (기대 Lv' + wantR.lv + ' · ' + wantR.fires + '회)');
  ok('[R2] 옛 곡선에서는 3종 만료가 서로 벌어진다 ([6-f] 가 빨개진다)',
    !(rr.bad.exp.atk === rr.bad.exp.hp && rr.bad.exp.hp === rr.bad.exp.rate),
    Math.round((rr.bad.exp.atk - rr.bad.exp.rate) / 60000) + '분 차');
  ok('[R3] 되돌림을 걷으면 다시 초록 (Lv·prog·발동 수·만료 ±0ms)',
    rr.good.lv === wantR.lv && rr.good.prog === wantR.prog && rr.good.n === wantR.fires
    && B_KEYS.every(k => rr.good.exp[k] === wantR.exp[k]),
    'Lv' + rr.good.lv + '·' + rr.good.prog + '/' + needAt(rr.good.lv) + ' · ' + rr.good.n + '회');
  /* 500 — 표를 상수 4 로 되돌리면 §6 의 Lv·prog 가 실제로 어긋난다(발동 수·만료는 지속만 보므로 그대로다).
     이 항이 없으면 이 자의 시뮬은 «표를 안 쓰는 게임» 앞에서도 초록일 수 있다(334 «무르게 풀지 마라»). */
  ok('[R4] 필요 경험치를 «어느 레벨에서나 4» 로 되돌리면 Lv·prog 가 어긋난다',
    rr.flat.lv !== wantR.lv || rr.flat.prog !== wantR.prog,
    'Lv' + rr.flat.lv + '·' + rr.flat.prog + ' (기대 Lv' + wantR.lv + '·' + wantR.prog + ')');
  ok('[R5] 그 되돌림을 걷으면 다시 초록',
    rr.good2.lv === wantR.lv && rr.good2.prog === wantR.prog && rr.good2.n === wantR.fires,
    'Lv' + rr.good2.lv + '·' + rr.good2.prog + '/' + needAt(rr.good2.lv) + ' · ' + rr.good2.n + '회');

  /* ===== [R6] 679 되돌림 시험 — 「새는 요소」 축이 무르게 풀린 것이 아님을 못 박는다 =====
     `.ntc` 의 `overflow:hidden` 을 떼면 667 의 64px 타원 링 `<s>` 는 **정말로** 카드 밖 32px 에
     그려진다 ⇒ [2-s] 가 빨개져야 한다. 걷으면 다시 0. 이 항이 없으면 «클리핑을 본다» 는 새 축이
     «아무것도 안 본다» 와 구별되지 않는다(334 처방). */
  console.log('\n[R6] 679 되돌림 — .ntc 의 클리핑을 떼면 물결 노치가 진짜로 샌다');
  await page.evaluate(() => { document.querySelector('#shopCats [data-cat="pass"]').click(); });
  await page.waitForTimeout(350); await settled(page);
  const r2 = await page.evaluate(SPILL_SRC => {
    const spillOf = eval(SPILL_SRC);
    const cds = [...document.querySelectorAll('#shopList .pvc')];
    const before = cds.map(c => spillOf(c, true).length);
    const st = document.createElement('style');
    st.id = 'v679r2'; st.textContent = '#shopw .pvc>.ntc{overflow:visible !important}';
    document.head.appendChild(st);
    const off = cds.map(c => spillOf(c, true));
    st.remove();
    const after = cds.map(c => spillOf(c, true).length);
    return { before, off, offN: off.map(a => a.length), after };
  }, SPILL_SRC);
  ok('[R6-a] 되돌림 전 «보이는 넘침» 0', r2.before.every(n => n === 0), JSON.stringify(r2.before));
  ok('[R6-b] .ntc 클리핑을 떼면 카드마다 그 <s> 가 «샌다» 로 잡힌다',
    r2.offN.every(n => n === 1) && r2.off.every(a => a[0] === 'S@ntc'),
    JSON.stringify(r2.off));
  ok('[R6-c] 되돌림을 걷으면 다시 0', r2.after.every(n => n === 0), JSON.stringify(r2.after));

  /* ================= 9. 콘솔 ================= */
  console.log('\n[9] 콘솔');
  ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');

  await page.evaluate(() => { document.querySelector('#shopCats [data-cat="pass"]').click(); });
  await page.waitForTimeout(300); await settled(page);
  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/124-r1.png') });
  await browser.close();
  console.log('\nVERIFY124 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
