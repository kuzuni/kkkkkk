#!/usr/bin/env node
/* 게이트 519 — 「단련 탭 레드닷은 «지금 누를 게 있을 때만» 켜진다」 (2026-08-31, 저장소 주인 보고)
 *
 *   node tools/verify519.js
 *
 * 이 결함은 **층이 둘**이었고 둘 다 실재했다(`tools/probe519.js` 가 재현):
 *   ⓑ 판정 — `temperAlert()` 첫 항이 `(S.tstone|0) >= TEMPER_PT_COST` 이고 `TEMPER_PT_COST = 1` 이라
 *      사실상 «단련석을 1개라도 들고 있는가» = 상시 참. 전환해도 못 올리면 누를 것이 없다.
 *   ⓓ 그리기 — `#trw i,#trw em,#trw b,#trw u,#trw s{display:inline-block}`(ID 급 1,0,1) 이
 *      `.stab>.bdg{display:none}`(0,2,0) 을 이겨 **`.alert` 와 무관하게 상시 점등**(166 ⓔ 계열 5번째).
 *
 * 그래서 이 자는 **양쪽을 따로** 묻는다 — 한쪽만 고치면 다른 쪽이 결함을 그대로 되살리기 때문이다.
 * §2 는 «식» 을, §3 은 «찍힌 픽셀» 을 본다. 둘 중 하나만 있으면 헛초록이 난다:
 *   · §2 만 있으면 — 식은 옳은데 CSS 함정이 살아 있어 화면은 상시 빨간점(수리 전 상태 그대로)이다.
 *   · §3 만 있으면 — 그림은 `.alert` 를 따라가는데 `.alert` 자체가 상시 참일 수 있다.
 * §R 은 그 둘을 각각 되돌려 «무르게 풀지 않았음» 을 못박는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 브라우저 안에서 한 상태를 만들고 «판정 + 그려진 닷» 을 한 번에 돌려주는 프로브.
   ⚠ 325 함정 — 등장 애니메이션(scale 0 시작)이 rect 를 0 으로 만든다. 잴 때만 끈다. */
const SNAP = `(spec => {
  S.tstone = spec.ts;
  S.temper = { pts: spec.pts, alloc: spec.alloc || {} };
  if (spec.dia != null) S.dia = spec.dia;
  setTrSub('temper'); renderRunes(); renderTrain();
  const tab = document.querySelector('#trSubs [data-trsub="temper"]');
  const bdg = tab && tab.querySelector('s.bdg');
  const prevA = bdg ? bdg.style.animation : null;
  if (bdg) bdg.style.animation = 'none';
  const cs = bdg ? getComputedStyle(bdg) : null, r = bdg ? bdg.getBoundingClientRect() : null;
  const out = {
    alert: !!temperAlert(),
    hasClass: !!(tab && tab.classList.contains('alert')),
    display: cs ? cs.display : '(없음)',
    area: r ? Math.round(r.width * r.height * 100) / 100 : -1,
    rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
    pts: temperPts(),
    minCost: Math.min.apply(null, TEMPERS.map(t => temperCost(t.k))),
    /* 진실 — «전환까지 마친 뒤 실제로 올릴 수 있는 축이 하나라도 있는가» */
    truly: (() => {
      const p = temperPts() + Math.floor((Math.floor(S.tstone) || 0) / TEMPER_PT_COST);
      return TEMPERS.some(t => p >= temperCost(t.k));
    })(),
    /* 수리 전 식 — §R 이 이것으로 «되돌리면 빨갛다» 를 본다 */
    oldAlert: (Math.floor(S.tstone) || 0) >= TEMPER_PT_COST || TEMPERS.some(t => temperUpOk(t.k)),
    resetOk: !!temperResetOk()
  };
  if (bdg) bdg.style.animation = prevA;
  return out;
})`;

/* ⑴ «실로드» — 상태를 localStorage 에 넣고 **페이지를 다시 띄워** load() 를 실제로 통과시킨다.
   메모리에 값을 꽂는 것만으로는 «세이브에서 온 상태» 를 못 본다(363 교훈 ①과 같은 자리). */
const KEY = (CODE.match(/const KEY = '([^']+)'/) || [])[1];

async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  if (seed) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, seed]);
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
    openTrain();
  });
  return { page, errs, ev: js => page.evaluate('(' + js + ')') };
}

/* 세 축 전부 Lv100 = 구간 1 → 다음 1레벨 3pt (temperSegCost(1) = 3) */
const HI = { atk: 100, hp: 100, regen: 100 };
const CASES = [
  { n: '① 단련석 0 · 포인트 0',                       s: { ts: 0, pts: 0, alloc: {} },       want: false },
  { n: '② 단련석 1 · 포인트 0 · 비용 1',              s: { ts: 1, pts: 0, alloc: {} },       want: true  },
  { n: '③ 단련석 0 · 포인트 1 · 비용 1',              s: { ts: 0, pts: 1, alloc: {} },       want: true  },
  { n: '④ 단련석 1 · 포인트 0 · 비용 3  ← 수리 전 점등', s: { ts: 1, pts: 0, alloc: HI },     want: false },
  { n: '⑤ 단련석 2 · 포인트 0 · 비용 3  ← 수리 전 점등', s: { ts: 2, pts: 0, alloc: HI },     want: false },
  { n: '⑥ 단련석 2 · 포인트 1 · 비용 3',              s: { ts: 2, pts: 1, alloc: HI },       want: true  },
  { n: '⑦ 단련석 3 · 포인트 0 · 비용 3',              s: { ts: 3, pts: 0, alloc: HI },       want: true  },
  { n: '⑧ 단련석 0 · 포인트 2 · 비용 3',              s: { ts: 0, pts: 2, alloc: HI },       want: false },
  { n: '⑨ 단련석 0 · 포인트 3 · 비용 3',              s: { ts: 0, pts: 3, alloc: HI },       want: true  }
];

(async () => {
  const browser = await launch(chromium);

  /* ══ §1 소스 ══════════════════════════════════════════════════════════════ */
  console.log('=== §1 소스 — 두 층이 각각 제자리에 있는가 ===');
  ok(/#trw \.stab>\.bdg\{display:none\}/.test(CODE),
    '[1-a] ⓓ 짝 ① — `#trw .stab>.bdg{display:none}` (ID 급이라 `#trw s` 를 이긴다)');
  ok(/#trw \.stab\.alert>\.bdg\{display:block\}/.test(CODE),
    '[1-b] ⓓ 짝 ② — `#trw .stab.alert>.bdg{display:block}`');
  ok(/#trw i,#trw em,#trw b,#trw u,#trw s\{display:inline-block/.test(CODE),
    '[1-c] 함정의 재료는 **아직 그대로다** — 짝이 그것을 이기는 것이지 지운 것이 아니다',
    '이 줄을 지워서 «고쳤다» 고 하면 #trw 안 모든 <i><b><s> 타이포가 무너진다');
  const alertSrc = (CODE.match(/const temperAlert = [\s\S]{0,420}?\n\};/) || [''])[0];
  ok(/temperPts\(\)\s*\+\s*Math\.floor\(/.test(alertSrc),
    '[1-d] ⓑ 판정 — 전환분과 보유분을 **한 판정으로 합친다**(두 벌 금지)');
  ok(!/>=\s*TEMPER_PT_COST[\s\S]{0,40}\|\|/.test(alertSrc),
    '[1-e] 옛 OR 꼴(«단련석 ≥ 전환비 || …»)이 돌아오지 않았다');
  ok(!/S\.dia|TEMPER_RESET_DIA/.test(alertSrc),
    '[1-f] 다이아 회수는 판정 축이 아니다(31790 주석 유지 — 회수는 상시 가능하다)');

  /* ══ §2 판정 — 실로드 상태 표 ═════════════════════════════════════════════ */
  console.log('\n=== §2 판정 — 실로드한 세이브에서 「점등 ≡ 올릴 수 있는 축 존재」 ===');
  ok(!!KEY, '[2-0] 세이브 KEY 를 소스에서 읽었다', KEY);
  for (const c of CASES) {
    const seed = JSON.stringify({ tstone: c.s.ts, temper: { pts: c.s.pts, alloc: c.s.alloc }, time: Date.now() });
    const h = await open(browser, seed);
    const r = await h.page.evaluate(([js, spec]) => eval(js)(spec), [SNAP, c.s]);
    ok(r.alert === c.want && r.truly === c.want,
      '[2] ' + c.n + ' → ' + (c.want ? '점등' : '소등'),
      '판정=' + (r.alert ? '점등' : '소등') + ' · 진실=' + (r.truly ? '가능' : '없음')
      + ' · pts=' + r.pts + ' · 최소비용=' + r.minCost);
    await h.page.context().close();
  }

  /* ══ §3 찍힌 픽셀 — 그림이 판정을 따라가는가 ═══════════════════════════════ */
  console.log('\n=== §3 찍힌 픽셀 — 「.alert 가 없으면 닷이 없다」 (166 특이성 회귀) ===');
  const SHOTS = path.join(ROOT, 'docs', 'shots');
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const h3 = await open(browser, null);

  /* 닷 색 #F22E52 를 «단련 칸 상자» 안에서만 센다 — 화면 다른 곳의 빨강에 안 속는다 */
  const dotPixels = async (tag) => {
    const box = await h3.page.evaluate(() => {
      const t = document.querySelector('#trSubs [data-trsub="temper"]');
      const r = t.getBoundingClientRect();
      /* 배지는 칸 우상단 «바깥» 으로 걸치므로 상자를 사방 24px 넓혀 잡는다 */
      return [Math.max(0, Math.round(r.left) - 24), Math.max(0, Math.round(r.top) - 24),
              Math.round(r.width) + 48, Math.round(r.height) + 48];
    });
    const shot = path.join(SHOTS, '519-' + tag + '.png');
    await h3.page.screenshot({ path: shot, clip: { x: box[0], y: box[1], width: box[2], height: box[3] } });
    const b64 = fs.readFileSync(shot).toString('base64');
    return h3.page.evaluate(data => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          /* #F22E52 (242,46,82) 및 안쪽 광택 #FF7596 을 «닷 색» 으로 본다 — 허용 오차 ±26 */
          const near = (r, gg, b) => Math.abs(d[i] - r) <= 26 && Math.abs(d[i + 1] - gg) <= 26 && Math.abs(d[i + 2] - b) <= 26;
          if (near(242, 46, 82) || near(255, 117, 150)) n++;
        }
        res({ n, w: c.width, h: c.height });
      };
      im.onerror = () => rej(new Error('이미지 로드 실패'));
      im.src = 'data:image/png;base64,' + data;
    }), b64);
  };

  /* «올릴 수 있는 축이 있는» 상태 = 점등이 옳은 자리 */
  const onSnap = await h3.page.evaluate(([js, spec]) => eval(js)(spec), [SNAP, { ts: 50, pts: 0, alloc: {} }]);
  await h3.page.waitForTimeout(700);                       /* 60 등장 쥬시가 앉을 때까지 */
  const onPix = await dotPixels('on');
  ok(onSnap.alert === true && onSnap.hasClass === true, '[3-a] 전제 — 이 상태는 점등이 옳다(`.alert` 가 붙었다)');
  ok(onPix.n > 200, '[3-b] 점등 상태에서 닷 색 픽셀이 실제로 찍힌다', onPix.n + 'px / ' + onPix.w + '×' + onPix.h);

  /* «누를 것이 없는» 상태 = 소등이 옳은 자리 */
  const offSnap = await h3.page.evaluate(([js, spec]) => eval(js)(spec), [SNAP, { ts: 0, pts: 0, alloc: {} }]);
  await h3.page.waitForTimeout(400);
  const offPix = await dotPixels('off');
  ok(offSnap.alert === false && offSnap.hasClass === false, '[3-c] 전제 — 이 상태는 소등이 옳다(`.alert` 가 없다)');
  ok(offPix.n === 0, '[3-d] **소등 상태에서 닷 색 픽셀 0** — 특이성 함정이 죽었다', offPix.n + 'px');

  /* 판정과 무관하게, 클래스만으로도 그림이 갈려야 한다(§2 가 옳아도 §3 이 따라와야 한다) */
  const forced = await h3.page.evaluate(() => {
    const t = document.querySelector('#trSubs [data-trsub="temper"]'), b = t.querySelector('s.bdg');
    const pa = b.style.animation; b.style.animation = 'none';
    t.classList.add('alert');    const on  = getComputedStyle(b).display;
    t.classList.remove('alert'); const off = getComputedStyle(b).display;
    b.style.animation = pa;
    return { on, off };
  });
  ok(forced.off === 'none' && forced.on !== 'none',
    '[3-e] `.alert` 클래스 하나로 그림이 갈린다', 'alert 없음=' + forced.off + ' · 있음=' + forced.on);

  /* ══ §4 이웃 회귀 ═══════════════════════════════════════════════════════════ */
  console.log('\n=== §4 이웃 — 300(룬은 대상 아님) · 회수 축 ===');
  const nodes = await h3.page.evaluate(() => {
    const o = {};
    ['train', 'rune', 'temper'].forEach(k => {
      const el = document.querySelector('#trSubs [data-trsub="' + k + '"]');
      o[k] = el ? { bdg: el.querySelectorAll('s.bdg').length, alert: el.classList.contains('alert') } : null;
    });
    return o;
  });
  ok(nodes.rune && nodes.rune.bdg === 0 && nodes.rune.alert === false,
    '[4-a] 300 회귀 — 룬 칸에는 배지 노드도 `.alert` 도 없다', JSON.stringify(nodes.rune));
  ok(nodes.train && nodes.train.bdg === 0, '[4-b] 훈련 칸에도 배지 노드가 없다');
  /* 회수만 가능한 상태 — 다이아 넉넉 + 투자 이력 있음 + 올릴 수 있는 축 없음 → 소등이 옳다 */
  const rst = await h3.page.evaluate(([js, spec]) => eval(js)(spec), [SNAP, { ts: 0, pts: 2, alloc: HI, dia: 999999 }]);
  ok(rst.resetOk === true, '[4-c] 전제 — 이 상태에서 «회수» 는 실제로 가능하다(다이아·투자 이력 충족)');
  ok(rst.alert === false && rst.area === 0,
    '[4-d] 회수만 가능한 상태는 **소등** — 회수는 상시 가능하므로 신호 축이 아니다',
    '판정=' + (rst.alert ? '점등' : '소등') + ' · 닷 면적=' + rst.area);

  /* ══ §R 되돌림 — 두 층을 각각 되돌리면 빨개진다 ════════════════════════════ */
  console.log('\n=== §R 되돌림 시험 — 무르게 풀지 않았음을 층마다 못박는다 ===');
  const rev = await h3.page.evaluate(([js, spec]) => {
    /* R-1: ⓓ — 519 가 놓은 두 줄을 걷어낸 사본 = 수리 전 그리기 */
    const killed = [];
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (let i = rs.length - 1; i >= 0; i--) {
        const r = rs[i];
        if (r.type === 1 && /^#trw \.stab(\.alert)?\s*>\s*\.bdg$/.test((r.selectorText || '').trim())) {
          killed.push({ sh, i, text: r.cssText }); sh.deleteRule(i);
        }
      }
    }
    const a = eval(js)(spec);                       /* 소등이 옳은 상태인데 그려지는가 */
    killed.reverse().forEach(k => k.sh.insertRule(k.text, k.i));
    const b = eval(js)(spec);                       /* 되돌리면 다시 꺼지는가 */
    return { killedN: killed.length, revert: a, restored: b };
  }, [SNAP, { ts: 0, pts: 0, alloc: {} }]);
  ok(rev.killedN === 2, '[R-a] 걷어낸 규칙이 정확히 2줄이다', rev.killedN + '줄');
  ok(rev.revert.display !== 'none' && rev.revert.area > 0,
    '[R-b] ⓓ 되돌림 — 두 줄을 걷으면 **소등이 옳은 상태에서도 닷이 그려진다**(수리 전)',
    'display=' + rev.revert.display + ' · 면적=' + rev.revert.area);
  ok(rev.restored.display === 'none' && rev.restored.area === 0,
    '[R-c] 되돌리면 다시 꺼진다 — 사본이 트리를 오염시키지 않았다');

  /* R-2: ⓑ — 옛 식이 표를 어긴다(§2 가 «이미 참인 것» 을 굳힌 게 아니라는 증거) */
  let oldWrong = 0, newWrong = 0;
  for (const c of CASES) {
    const r = await h3.page.evaluate(([js, spec]) => eval(js)(spec), [SNAP, c.s]);
    if (r.oldAlert !== c.want) oldWrong++;
    if (r.alert !== c.want) newWrong++;
  }
  ok(oldWrong > 0, '[R-d] ⓑ 되돌림 — **옛 식은 이 표를 어긴다**', oldWrong + ' / ' + CASES.length + '건 어긋남');
  ok(newWrong === 0, '[R-e] 현행 식은 표를 한 칸도 안 어긴다', newWrong + '건');
  console.log('     (옛 식이 틀리는 칸이 0 이었다면 §2 는 «이미 참인 것» 을 굳힌 헛초록이다 — 338 교훈)');

  ok(h3.errs.length === 0, '[Z] 콘솔 에러 0건', h3.errs.slice(0, 3).join(' / '));

  await browser.close();
  console.log('\nverify519: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
