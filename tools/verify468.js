/* 작업 468 게이트 — «구분선 `.stab-sep` 은 활성 알약 **밑**을 지난다».
 *
 *   node tools/verify468.js
 *
 * 무엇을 지키는가 — 세 축이고, 셋이 서로를 막는다:
 *   [2] 걸치는 활성 알약의 코너 띠 24px 안에 구분선 색 `#483B2B` 이 **0px²** 다.
 *   [3] **음성항** — 안 덮이는 상태(칸1 활성)에서는 구분선이 자기 상자 6×54 를 **다 채운다**.
 *       ⚑ 이 항이 없으면 «구분선을 통째로 숨긴다» 도 [2] 를 통과한다(334 처방 — 기대값만 뒤집지 마라).
 *   [4] 그 알약의 변 단면이 **가운데 칸과 같다** — 352 가 «한 규약» 으로 못박은 베벨 7 이다.
 *       ⚑ 목표값을 상수로 안 적고 **같은 바의 가운데 칸에서 뽑는다**(368·393 처방 — 상수를 박아
 *         두면 알약 기하가 움직이는 날 게이트가 먼저 썩는다. 409 가 지금 바로 그 기하를 만지고 있다).
 *   [R] 되돌림 — z 를 auto 로 되돌리면 [2] 가 **324px² 로 되살아난다**(자가 공허하지 않다).
 *
 * ⚠ **색은 «가장 가까운 팔레트» 로 가르면 안 된다** — 구분선 `#483B2B` 과 알약 면색 `#4B3E2D` 은
 *   RGB 거리 **3** 이라 접힌다. `verify462` [기록] 이 이 자리를 `F`(면색)로 읽은 것이 468 의 등재
 *   계기였다. 이 자는 구분선만 **정확 일치**(거리 0)로 센다.
 *
 * ⚠ 라벨 글리프 AA 가 우연히 같은 값을 내므로 **상자 전체로 세면 바닥값이 2~5px²** 다
 *   (`probe468` 1회차 실측). 그래서 [2] 는 코너 띠 24px 로 좁힌다 — 거기서는 바닥이 0 이다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '468v.png');
const SEP = [0x48, 0x3B, 0x2B];
const PAL = [['K', '#000000'], ['B', '#634F37'], ['F', '#4B3E2D'], ['D', '#413122'],
  ['R', '#705F4B'], ['H', '#61503C']];
const STRIP = 24;          /* 코너 띠 폭 */
const SEP_MIN = 300;       /* [3] 음성항 하한 — 온전할 때 324px² (6×54) */

let pass = 0, fail = 0;
const ok = (name, cond, note) => {
  (cond ? pass++ : fail++);
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + name + (note != null ? ' — ' + note : ''));
};

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* 967 — `SETON`(사본 + 자기 핀)은 **선언째 지웠다**(402 · 963). 심는 손잡이는 공용 부품
   `__stab967`(`tools/stab967.js`) 하나다.

   ⚑ 이 자는 **주입과 읽기 사이에 캡처가 들어간다** — 캡처는 프로세스 밖으로 나갔다 오므로
      «한 틱» 으로 접을 수 없다(967 등재문 갈래 ⓑ). 그래서 두 겹으로 짠다:
        ① `hold()` — 핀(16ms 재주입)으로 캡처 구간을 붙든다  ← 옛 `SETON` 이 하던 일
        ② `held()` — **캡처 직후 되읽어 «그 사이 안 바뀌었다» 를 점수 줄로** 세운다  ← 새로 생긴 것
      ①만으로는 핀 틱 사이 <16ms 창이 남고, 그 창에 찍힌 판은 **다른 칸 그림을 이 칸이라고** 채점한다
      (963 이 verify379 에서 겪은 «조용한 대체» 의 캡처판). ②가 그 판을 빨갛게 만든다. */
/* `hold` 는 **붙든 칸**을 돌려준다(못 붙들면 <0). `i` 가 null 이면 «자연 활성» 이라 심지 않고
   지금 켜져 있는 칸을 그대로 쓴다 — 그 자리는 제품이 소유하므로 제품이 지킨다.
   `held` 는 그 «붙든 칸» 과 캡처 뒤의 칸을 견준다. */
const hold = (page, bar, i) => page.evaluate(([s, k]) => window.__stab967.pin(s, k), [bar, i]);
const held = async (page, bar, want, tag) => {
  const on = await page.evaluate(([s]) => window.__stab967.on(s), [bar]);
  await page.evaluate(() => window.__stab967.unpin());
  ok('[전제] ' + tag + ' — 캡처 사이에 활성이 안 바뀌었다 (967)', on === want,
    '붙든 칸 ' + (want + 1) + ' → 캡처 뒤 칸' + (on + 1));
  return on === want;
};

async function shoot(page) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(data => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      window.__v468v = c.getContext('2d');
      res(1);
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), b64);
}

const stripCount = (page, p, side) => page.evaluate(([b, sep, sd, sw]) => {
  const g = window.__v468v;
  const y0 = Math.ceil(b.y), h = Math.floor(b.y + b.h) - y0;
  const x0 = sd === 'L' ? Math.ceil(b.x) : Math.floor(b.x + b.w) - sw;
  const d = g.getImageData(x0, y0, sw, h).data;
  let n = 0;
  for (let i = 0; i < sw * h; i++) {
    if (d[i * 4] === sep[0] && d[i * 4 + 1] === sep[1] && d[i * 4 + 2] === sep[2]) n++;
  }
  return n;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, SEP, side, STRIP]);

const scan = (page, p, side) => page.evaluate(([b, sd, pal, sep]) => {
  const g = window.__v468v;
  const y = Math.round(b.y + b.h / 2);
  const cls = (R, G, B) => {
    if (R === sep[0] && G === sep[1] && B === sep[2]) return 'S';
    let best = '?', bd = Infinity;
    for (const [ch, hex] of pal) {
      const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      const d2 = (R - rr) ** 2 + (G - gg) ** 2 + (B - bb) ** 2;
      if (d2 < bd) { bd = d2; best = ch; }
    }
    return best;
  };
  let s = '';
  for (let d = 0; d < 24; d++) {
    const x = sd === 'L' ? Math.round(b.x) + d : Math.round(b.x + b.w) - 1 - d;
    const q = g.getImageData(x, y, 1, 1).data;
    s += cls(q[0], q[1], q[2]);
  }
  return s;
}, [{ x: p.x, y: p.y, w: p.w, h: p.h }, side, PAL, SEP]);

function runs(s) {
  const rs = [];
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; rs.push([s[i], j - i]); i = j; }
  return rs;
}
const fmt = s => runs(s).map(r => r[0] + r[1]).join(' ');
/* «검정 링 뒤 첫 실런» — 가운데 칸과 견줄 값. 앞머리 AA(1px)는 건너뛴다. */
function afterK(s) {
  const rs = runs(s);
  let i = 0;
  while (rs[i] && rs[i][0] !== 'K') i++;
  const k = rs[i] ? rs[i][1] : 0;
  let j = i + 1;
  while (rs[j] && rs[j][1] < 2) j++;
  return { k, a: rs[j] || ['-', 0] };
}

/* 구분선이 걸치는 활성 칸 — 자리 규칙에서 **유도**한다(상수 목록이 아니다).
   ⇒ «활성으로 만들었을 때 알약 상자가 구분선 상자와 겹치는 칸» 이 곧 대상이고,
     겹치는 변(L/R)도 그 기하가 정한다. 칸이 늘거나 구분선이 옮겨져도 자가 따라온다. */

(async () => {
  const browser = await launch(chromium);
  console.log('══════ VERIFY 468 — 구분선 `.stab-sep` 은 활성 알약 밑을 지나는가 ══════');
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const cerr = [];
    page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}'
      + '.stab>.bdg,.stabs .sk-lock{display:none!important}' });
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.evaluate(SETTLE);
    await page.waitForTimeout(700);

    console.log('\n[1] 선언 — 활성 알약이 구분선보다 위다');
    const decl = await page.evaluate(() => {
      const bar = document.getElementById('eqTabs');
      if (!bar) return null;
      const sep = bar.querySelector(':scope > .stab-sep');
      const cells = [...bar.querySelectorAll(':scope > .stab')];
      cells[0].classList.add('on');
      const on = getComputedStyle(cells[0]).zIndex;
      const off = getComputedStyle(cells[1]).zIndex;
      return { on, off, sepZ: sep ? getComputedStyle(sep).zIndex : null,
        sepAfterCells: sep ? [...bar.children].indexOf(sep) > [...bar.children].indexOf(cells[0]) : null,
        barZ: getComputedStyle(bar).zIndex, barPos: getComputedStyle(bar).position };
    });
    ok('[1] `.stab.on` 이 z-index 를 갖는다 (auto 가 아니다)', decl && decl.on !== 'auto', decl && ('on=' + decl.on));
    ok('[1] 비활성 칸은 안 올린다 (z 는 «활성» 축이다)', decl && decl.off === 'auto', decl && ('off=' + decl.off));
    ok('[1] 구분선 자신은 안 내렸다 (z auto — 고친 곳은 한 곳뿐)', decl && decl.sepZ === 'auto', decl && ('sep=' + decl.sepZ));
    ok('[1] 구분선은 여전히 마크업에서 칸들 **뒤** 다 (DOM 은 안 건드렸다 — `nth-of-type` 번호 불변)',
      decl && decl.sepAfterCells === true, decl && String(decl.sepAfterCells));
    ok('[1] `.stabs` 가 쌓임 맥락이라 이 z 는 바 안에서만 산다 (바 밖 Δ0)',
      decl && decl.barZ !== 'auto' && decl.barPos !== 'static', decl && (decl.barPos + ' z' + decl.barZ));

    /* 대상 칸을 기하에서 유도한다 */
    const bar = '#eqTabs';
    const nCells = await page.evaluate(s => document.querySelectorAll(s + ' > .stab').length, bar);
    const sepBox = await page.evaluate(s => {
      const e = document.querySelector(s + ' > .stab-sep');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x, w: r.width, y: r.y, h: r.height };
    }, bar);
    ok('[전제] 06 장비 바에 구분선이 있다', !!sepBox, sepBox && ('x ' + sepBox.x + '..' + (sepBox.x + sepBox.w)));

    const targets = [];
    const mids = [];
    for (let i = 0; i < nCells; i++) {
      /* 967 — 켜기와 읽기가 **한 evaluate** 다(기하 유도에는 캡처가 없으므로 핀도 필요 없다). */
      const p = await page.evaluate(([s, k]) => {
        if (window.__stab967.set(s, k) !== k) return null;
        const on = document.querySelector(s + ' > .stab.on');
        if (!on) return null;
        const b = on.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, label: (on.querySelector('i') || {}).textContent || '' };
      }, [bar, i]);
      if (!p || !sepBox) continue;
      const hit = p.x < sepBox.x + sepBox.w && p.x + p.w > sepBox.x;
      if (hit) {
        /* 구분선이 알약의 어느 변에 더 가까운가 = 밟히는 코너 */
        const dL = sepBox.x - p.x, dR = (p.x + p.w) - (sepBox.x + sepBox.w);
        targets.push([i, dL <= dR ? 'L' : 'R', p]);
      } else {
        mids.push([i, 'L', p]);
      }
    }
    ok('[전제] 구분선이 걸치는 활성 칸을 **기하에서** 찾았다 (상수 목록이 아니다 · ≥2곳)',
      targets.length >= 2, targets.map(t => '칸' + (t[0] + 1) + t[1]).join(' '));
    ok('[전제] 안 걸치는 대조 칸도 있다 (동치의 목표값을 뽑을 자리)', mids.length >= 1,
      mids.map(t => '칸' + (t[0] + 1)).join(' '));

    /* 가운데 칸(안 걸치는 칸 중 «검정 링이 있는 변» 을 가진 칸)에서 목표값을 뽑는다.
       ⚠ 칸1 은 셸에 닿는 변이라 검정 링이 없다(`B7 F17`) — 목표값 자리가 아니다(378·449 규약). */
    let target = null;
    console.log('\n[4] 목표값 — 안 걸치는 칸에서 «검정 링 뒤 첫 실런» 을 뽑는다');
    for (const [i, side, p] of mids) {
      await hold(page, bar, i);
      await page.waitForTimeout(200); await page.evaluate(SETTLE);
      await shoot(page);
      await held(page, bar, i, '[4] 칸' + (i + 1) + '«' + p.label + '» ' + side);
      const s = await scan(page, p, side);
      const r = afterK(s);
      console.log('    칸' + (i + 1) + '«' + p.label + '» ' + side + ' — ' + fmt(s));
      if (r.k >= 2 && r.a[0] === 'B' && !target) target = { k: r.k, b: r.a[1], from: '칸' + (i + 1) + '«' + p.label + '»' };
    }
    ok('[4] 목표값을 뽑았다 (검정 링 + 그 뒤 베벨 B)', !!target,
      target && (target.from + ' K' + target.k + ' B' + target.b));

    console.log('\n[2][4] 걸치는 칸 — 코너 띠 안 구분선색 0 · 단면은 목표값과 같다');
    for (const [i, side, p] of targets) {
      await hold(page, bar, i);
      await page.waitForTimeout(220); await page.evaluate(SETTLE);
      await shoot(page);
      const tag = '칸' + (i + 1) + '«' + p.label + '» ' + side;
      await held(page, bar, i, '[2][4] ' + tag);
      const n = await stripCount(page, p, side);
      ok('[2] ' + tag + ' — 코너 띠 ' + STRIP + 'px 안 구분선색이 **0px²** 다', n === 0, n + 'px²');
      const s = await scan(page, p, side);
      ok('[2] ' + tag + ' — 그 단면에 구분선 런(S)이 없다', s.indexOf('S') < 0, fmt(s));
      if (target) {
        const r = afterK(s);
        ok('[4] ' + tag + ' — 검정 뒤 베벨이 **' + target.from + ' 과 같다**(±1 · 352 규약 7)',
          r.a[0] === 'B' && Math.abs(r.a[1] - target.b) <= 1 && Math.abs(r.k - target.k) <= 1,
          'K' + r.k + ' ' + r.a[0] + r.a[1] + ' ↔ 목표 K' + target.k + ' B' + target.b);
      }
    }

    console.log('\n[3] 음성항 — 안 덮이는 상태에서는 구분선이 자기 상자를 다 채운다 (숨기지 않았다)');
    const sepVisible = async () => {
      await shoot(page);
      return page.evaluate(([s, sep]) => {
        const g = window.__v468v;
        const r = document.querySelector(s + ' > .stab-sep').getBoundingClientRect();
        const x0 = Math.ceil(r.x), y0 = Math.ceil(r.y);
        const w = Math.floor(r.x + r.width) - x0, h = Math.floor(r.y + r.height) - y0;
        const d = g.getImageData(x0, y0, w, h).data;
        let n = 0;
        for (let i = 0; i < w * h; i++) {
          if (d[i * 4] === sep[0] && d[i * 4 + 1] === sep[1] && d[i * 4 + 2] === sep[2]) n++;
        }
        return { n, w, h };
      }, [bar, SEP]);
    };
    for (const [i, , p] of mids) {
      await hold(page, bar, i);
      await page.waitForTimeout(220); await page.evaluate(SETTLE);
      const v = await sepVisible();
      await held(page, bar, i, '[3] 칸' + (i + 1) + '«' + p.label + '»');
      ok('[3] 칸' + (i + 1) + '«' + p.label + '» 활성 — 구분선 ' + v.w + '×' + v.h
        + ' 이 ≥' + SEP_MIN + 'px² 로 보인다', v.n >= SEP_MIN, v.n + 'px²');
    }

    console.log('\n[R] 되돌림 — z 를 auto 로 되돌리면 침범이 되살아난다 (자가 공허하지 않다)');
    await page.addStyleTag({ content: '.stab.on{z-index:auto!important}' });
    for (const [i, side, p] of targets) {
      await hold(page, bar, i);
      await page.waitForTimeout(220); await page.evaluate(SETTLE);
      await shoot(page);
      await held(page, bar, i, '[R] 칸' + (i + 1) + '«' + p.label + '» ' + side);
      const n = await stripCount(page, p, side);
      const s = await scan(page, p, side);
      ok('[R] 칸' + (i + 1) + '«' + p.label + '» ' + side + ' — 되돌리면 코너 띠에 구분선색이 **다시 300px² 넘게** 든다',
        n > 300, n + 'px²  단면 ' + fmt(s));
    }
    /* 되돌림을 걷고 원복 확인 — 주입이 남지 않았다 */
    await page.evaluate(() => {
      [...document.querySelectorAll('style')].forEach(s => {
        if (s.textContent.indexOf('z-index:auto!important') >= 0) s.remove();
      });
    });
    for (const [i, side, p] of targets) {
      await hold(page, bar, i);
      await page.waitForTimeout(220); await page.evaluate(SETTLE);
      await shoot(page);
      await held(page, bar, i, '[R] 원복 칸' + (i + 1) + '«' + p.label + '»');
      const n = await stripCount(page, p, side);
      ok('[R] 칸' + (i + 1) + '«' + p.label + '» — 주입을 걷으면 원복 (0px²)', n === 0, n + 'px²');
    }

    console.log('\n[C] 콘솔');
    ok('콘솔 에러 0건', cerr.length === 0, cerr.length + '건');
  } finally { await browser.close(); }

  console.log('\nVERIFY468 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
