/* 작업 265 — 「행운 룰렛 팝업 글씨가 22 퀘스트 팝업보다 작다」 실측기.
 *
 * 두 팝업을 차례로 열어 **글자 크기(px)와 잉크 폭**을 뽑는다. 눈대중 금지(지시서 [2]).
 * 룰렛 세그먼트 라벨은 45° 부채꼴 안에 들어가야 하므로(등재문 주의 ⓑ) 줄마다
 *   · 잉크 폭(getBoundingClientRect 가 아니라 Range 로 «글리프가 실제로 차지한 폭»)
 *   · 그 줄 «아래변» 에서의 부채꼴 가용 폭 = 2·(R − y_bottom)·tan(22.5°)
 * 을 같이 내서 «여유 px» 를 계산한다. 여유가 음수면 조각 밖으로 삐져나온 것이다.
 *
 *   node tools/measure265.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const SAVE = { gold: 5e7, dia: 12000, totalKills: 1000, best: 12, summons: 500, upgrades: 3000 };

const probe = () => {
  const px = s => Math.round(parseFloat(s) * 100) / 100;
  const cs = el => el && getComputedStyle(el);
  /* Range 로 잉크 폭을 잰다 — inline-block 박스 폭이 아니라 «글리프가 먹은 폭» */
  const ink = el => {
    if (!el) return null;
    const r = document.createRange(); r.selectNodeContents(el);
    const b = r.getBoundingClientRect(); r.detach && r.detach();
    return { w: px(b.width), h: px(b.height), top: px(b.top), bottom: px(b.bottom) };
  };
  const one = (el, tag) => {
    if (!el) return { tag, missing: true };
    const c = cs(el), b = el.getBoundingClientRect(), i = ink(el);
    return {
      tag, text: (el.textContent || '').trim().slice(0, 14),
      fs: px(c.fontSize), lh: c.lineHeight, fw: c.fontWeight,
      box: { w: px(b.width), h: px(b.height), top: px(b.top), bottom: px(b.bottom) },
      ink: i
    };
  };
  return { one, ink, px };
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ── 1. 룰렛 ── */
  await page.evaluate(() => openRoulette());
  await page.waitForTimeout(500);
  const rou = await page.evaluate(pf => {
    const { one, px } = (new Function('return ' + pf))()();
    const q = s => document.querySelector(s);
    const out = { fs: {}, segs: [], modalClass: q('#modal').className };
    out.title = one(q('#modal .mhead h2'), '.mhead h2');
    out.guide = one(q('#modal .mbody .mwell p'), '안내 p');
    out.res   = one(q('#rouRes'), '#rouRes');
    out.btn   = one(q('#rouBtn'), '#rouBtn');
    /* 267 — [닫기] 버튼은 삭제됐다(딤 탭으로 닫는다). 선택자를 남겨 두면 «항상 missing» 인 죽은 칸이 된다. */
    /* 부채꼴 기하 — .rlt 660x660, 중심(330,330). 세그먼트는 45°(반각 22.5°). */
    const rlt = q('#modal .rlt').getBoundingClientRect();
    const R = rlt.width / 2, cx = rlt.left + R, cy = rlt.top + R;
    const TAN = Math.tan(22.5 * Math.PI / 180);
    const disc = q('#rouDisc').getBoundingClientRect();
    out.geo = { rltW: px(rlt.width), discR: px(disc.width / 2), cx: px(cx), cy: px(cy), tan225: Math.round(TAN * 1e4) / 1e4 };
    document.querySelectorAll('#rouDisc .rlt-seg').forEach((sg, i) => {
      const lines = ['.rlt-ic', '.rlt-tx', '.rlt-vl'].map(sel => {
        const o = one(sg.querySelector(sel), sel);
        if (o.missing) return o;
        /* 회전된 세그먼트라 화면 좌표로는 못 잰다 — 0번(회전 0deg)만 실좌표가 맞다.
           대신 «중심에서의 세로 거리» 는 회전 불변이므로 레이아웃 오프셋으로 계산한다. */
        return o;
      });
      out.segs.push({ i, lines });
    });
    /* 라벨의 «회전 전» 레이아웃 좌표 — offsetTop 사슬로 .rlt 기준 y 를 얻는다 */
    const sg0 = document.querySelector('#rouDisc .rlt-seg');
    const lb = sg0.querySelector('.rlt-lb');
    const lbTop = lb.offsetTop;
    out.lb = { top: lbTop, w: px(lb.getBoundingClientRect().width), h: px(lb.getBoundingClientRect().height) };
    out.wedge = [];
    ['.rlt-ic', '.rlt-tx', '.rlt-vl'].forEach(sel => {
      const el = sg0.querySelector(sel);
      const yTop = lbTop + el.offsetTop, yBot = yTop + el.offsetHeight;
      const availTop = 2 * (R - yTop) * TAN, availBot = 2 * (R - yBot) * TAN;
      out.wedge.push({ sel, yTop, yBot, availTop: px(availTop), availBot: px(availBot) });
    });
    return out;
  }, probe.toString());

  /* 세그먼트별 잉크 폭 — 회전 때문에 rect 가 기울어지므로 문자열 폭만 canvas 로 잰다 */
  const inkW = await page.evaluate(() => {
    const cv = document.createElement('canvas'), c = cv.getContext('2d');
    const meas = (el) => {
      const s = getComputedStyle(el);
      c.font = s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + '/' + s.lineHeight + ' ' + s.fontFamily;
      const ls = parseFloat(s.letterSpacing) || 0;
      const t = (el.textContent || '');
      const sx = (s.transform && s.transform !== 'none') ? Math.abs(parseFloat(s.transform.split('(')[1])) : 1;
      return Math.round((c.measureText(t).width + ls * t.length) * sx * 100) / 100;
    };
    const out = [];
    document.querySelectorAll('#rouDisc .rlt-seg').forEach((sg, i) => {
      out.push({ i,
        tx: meas(sg.querySelector('.rlt-tx')), txT: sg.querySelector('.rlt-tx').textContent,
        vl: meas(sg.querySelector('.rlt-vl')), vlT: sg.querySelector('.rlt-vl').textContent });
    });
    return out;
  });

  /* ── 2. 22 퀘스트(비교 기준) ── */
  await page.evaluate(() => { closeModal(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(600);
  const qs = await page.evaluate(pf => {
    const { one } = (new Function('return ' + pf))()();
    const q = s => document.querySelector(s);
    return {
      modalClass: q('#modal').className,
      title: one(q('#modal .mhead h2'), '.mhead h2'),
      qst:   one(q('.qs-t'), '.qs-t'),
      qsb:   one(q('.qs-b b'), '.qs-b b'),
      qsall: one(q('.qs-all b'), '.qs-all b'),
      qstg:  one(q('.qs-tg b'), '.qs-tg b')
    };
  }, probe.toString());

  console.log(JSON.stringify({ rou, inkW, qs, errs }, null, 1));
  await browser.close();
})();
