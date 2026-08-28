/* 122 22회차 §26-7 1번 — **gm 강제 상자 자(尺) 대조: 먼저 «칸» 을 못 박는다.**
 *
 * 21회차의 판정 불가는 이랬다 — 같은 연출을 네 자가 24.3 / 14.4 / 27.9~34.7 / 3.8~6.2 로 읽고,
 * 게다가 자체 프로브가 **실행마다** 3.8 / 4.0 / 6.1 / 6.2 로 흔들렸다.
 * §26-6 의 결론: «자가 아니라 측정 대상이 실행마다 다르다»(73 강제 상자가 어느 칸에 붙는지가 고정 안 됨).
 *
 * 이 프로브가 하는 일은 두 가지다.
 *   ① **흔들림의 출처를 분해한다** — 같은 브라우저에서 페이지만 새로 여는 방식(21회차 프로브의 방식)과
 *      **매 실행 새 컨텍스트(localStorage 격리)** 를 나란히 돌려 «세이브 이월» 이 원인인지 본다.
 *   ② **제품의 문으로 칸을 못 박고**(`S.guide.idx` = 그 미션 + 기준선 재설정 = `gmStart()`)
 *      네 자를 **같은 상태·같은 프레임**에서 잰다.
 *
 * 네 자 (21회차 §26-6 표와 같은 정의):
 *   §17   — 바깥 2~14px 띠 · 16위상 · max−min           (규약 22±3 을 정의한 자)
 *   AT    — 바깥 4~16px 띠 · 4위상  · max−min
 *   AS    — 바깥 3px 한 줄 · 4위상  · DFT 1차 진폭(2|X1|/N)  ※ max−min 도 같이 낸다
 *   자체  — 바깥 2~14px 띠 · 16위상 · max−min           (§17 과 같은 정의 = 재현 대조군)
 *
 * 실행: node tools/probe122gm2.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const RUNS = +(process.env.RUNS || 3);
const PAD = 30;

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

/* 한 번 찍은 프레임 열을 여러 «창» 으로 다시 읽는다 — 그래야 «창만 다르다» 가 성립한다.
   창은 [lo,hi) 이고 거리는 요소 변까지의 «가장 가까운 변» 거리(=max(dx,dy))다. */
async function frames(p, sel, per, n, wins) {
  /* ⚑ clip 을 재기 전에 등장 애니메이션을 걷는다 — 안 걷으면 «아직 작은» rect 로 띠를 잡는다 */
  await seek(p, 0);
  const clip = await p.evaluate(([s, pad]) => {
    const e = document.querySelector(s); if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    const x = Math.round(r.x) - pad, y = Math.round(r.y) - pad;
    const w = Math.round(r.width) + pad * 2, h = Math.round(r.height) + pad * 2;
    if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
    return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
  }, [sel, PAD]);
  if (!clip) return null;
  const { iw, ih, ...box } = clip;
  const series = wins.map(() => []);
  for (let i = 0; i < n; i++) {
    await seek(p, Math.round(per * i / n));
    const b64 = (await p.screenshot({ clip: box })).toString('base64');
    const vals = await p.evaluate(async ([src, w, h, pad, ws]) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      return ws.map(([lo, hi]) => {
        let s = 0, n2 = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const dx = x < pad ? pad - x : (x >= pad + w ? x - (pad + w - 1) : 0);
          const dy = y < pad ? pad - y : (y >= pad + h ? y - (pad + h - 1) : 0);
          const dist = Math.max(dx, dy);
          if (dist < lo || dist >= hi) continue;
          const j = (y * c.width + x) * 4;
          s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n2++;
        }
        return n2 ? s / n2 : null;
      });
    }, [b64, iw, ih, PAD, wins]);
    vals.forEach((v, k) => { if (v != null) series[k].push(v); });
  }
  return series;
}

const range = v => (v && v.length) ? +(Math.max(...v) - Math.min(...v)).toFixed(2) : null;
/* DFT 1차 진폭 — 위상 열이 한 주기를 균등히 훑는다는 전제(AS 의 «4위상 DFT») */
function dft1(v) {
  if (!v || v.length < 2) return null;
  const N = v.length;
  let re = 0, im = 0;
  for (let k = 0; k < N; k++) {
    re += v[k] * Math.cos(2 * Math.PI * k / N);
    im -= v[k] * Math.sin(2 * Math.PI * k / N);
  }
  return +(2 * Math.hypot(re, im) / N).toFixed(2);
}

/* 제품의 문으로 상태를 고정한다 — 값을 직접 쓰지 않고 게임이 쓰는 그 필드·그 함수만 쓴다.
   pin=true 면 «무기 1종 보유하기»(ban:'weapon') 로 못 박는다: 무기 0개 + 기준선 재설정. */
async function setup(p, pin) {
  await p.evaluate(pin => {
    openShopPage(); shopCat = 'summon'; setShopCatTabs('summon');
    S.dia = 5e6;
    if (pin) {
      /* ① 대상 미션을 이름으로 찾는다(인덱스 상수를 박으면 GUIDE 가 바뀔 때 조용히 딴 칸을 잰다) */
      const idx = GUIDE.findIndex(m => m.ban === 'weapon');
      /* ② 그 미션이 «미달» 이어야 gmBan() 이 그 칸을 지목한다 — 무기를 전부 비운다 */
      S.eq = (S.eq || []).filter(e => e.t !== 'weapon');
      if (S.worn) Object.keys(S.worn).forEach(k => { if (k === 'weapon') S.worn[k] = null; });
      S.guide.idx = idx; gmStart();
    }
    /* §17 과 같은 상태 — 무료분·무광고분 소진(▶AD 뱃지가 있는 상태) */
    SHOP_BOXES.forEach(x => { if (freeLeft(x.b) > 0) useFreeSum(x.b); else S.daily.noAdSum[x.b] = 0; });
    renderShopPage();
  }, pin);
  await p.waitForTimeout(300);
  return await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const gmi = cards.findIndex(c => c.classList.contains('gm'));
    return { need: gmBan(), gmi, n: cards.length,
             gidx: S.guide.idx, gname: (gmCur() || {}).n || '—',
             nofad: gmi >= 0 ? cards[gmi].classList.contains('nofad') : null };
  });
}

(async () => {
  const WINS = [[2, 14], [4, 16], [3, 4]];
  const browser = await launch(chromium);

  const row = (tag, st, r) => {
    const s17 = r ? r.p16[0] : null, at = r ? r.p4[1] : null, as = r ? r.p4[2] : null, own = r ? r.p16[0] : null;
    console.log('  ' + tag.padEnd(30)
      + ('칸' + (st.gmi < 0 ? '없음' : st.gmi + 1) + '/' + st.n + ' ' + (st.need || '—')).padEnd(18)
      + ('idx' + st.gidx).padEnd(7)
      + ['§17 2~14·16위상 ' + (s17 == null ? '—' : range(s17).toFixed(2)),
         'AT 4~16·4위상 ' + (at == null ? '—' : range(at).toFixed(2)),
         'AS 3px·4위상 rng ' + (as == null ? '—' : range(as).toFixed(2)) + ' dft ' + (as == null ? '—' : dft1(as)),
        ].join(' | '));
  };

  for (const mode of ['공유 컨텍스트 · 미고정(21회차 방식)', '격리 컨텍스트 · 미고정', '격리 컨텍스트 · 고정(제품의 문)']) {
    const shared = mode.startsWith('공유');
    const pin = mode.includes('고정(제품');
    console.log('\n' + mode);
    let ctx = shared ? await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 }) : null;
    for (let i = 0; i < RUNS; i++) {
      const c = ctx || await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const p = await c.newPage();
      await p.goto(URL); await p.waitForTimeout(700);
      const st = await setup(p, pin);
      let r = null;
      if (st.gmi >= 0) {
        const p16 = await frames(p, '#shopList .shp-card.gm>.cfr', 2800, 16, WINS);
        const p4 = await frames(p, '#shopList .shp-card.gm>.cfr', 2800, 4, WINS);
        r = { p16, p4 };
      }
      row('실행 ' + (i + 1), st, r);
      await p.close();
      if (!ctx) await c.close();
    }
    if (ctx) await ctx.close();
  }

  console.log('\n읽는 법: «칸» 열이 실행마다 같아야 자 대조가 성립한다. 칸이 같은데도 Δ 가 갈리면 그때가 «자» 문제다.');
  await browser.close();
})();
