/* 작업 576 — «팝업·시트 스크림(딤) α 가 화면마다 0.28~0.80 으로 다르다» 재현/측정 (판정 없음, 측정 전용).
 *
 * LESSONS 338 ① — 등재문의 처방을 따르기 전에 **가설부터 재현해 기각하거나 확인한다.**
 * 등재문의 처방 후보는 둘이다:
 *   ⓐ 측정표에서 ref 딤을 재확인해 **한 상수**로 모으고 예외를 이름으로 적는다
 *   ⓑ 시트만 예외라면 그 이유를 규약으로 못박고 게이트에 음성항을 세운다
 * 둘 다 «흩어진 값 = 결함» 을 전제한다. 이 프로브가 재는 것은 그 전제 자체다:
 *
 *   ⓢ  제품에 선언된 α 전수            (정적 — 껍데기별 한 줄씩)
 *   ⓜ  그 화면 «자기» 측정표가 적은 α  (docs/measure/NN-*.md — 레퍼런스 픽셀 대조로 잰 값)
 *   ⓟ  실제로 찍힌 픽셀의 투과배율     (딤 끄고/켜고 같은 지점 → α = 1 − after/before)
 *   ⓒ  비평가가 쓴 자 «스크림 밖 최대 채널값» 이 α 의 함수인가 (배경이 다르면 같은 α 도 다른 값)
 *
 * 실행: node tools/probe576.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');

/* ── ⓜ 각 화면이 «자기 레퍼런스» 로 잰 α (근거는 그 화면 측정표) ──
   ⚠ 이 표는 손으로 적은 목록이 아니라 **측정표에서 옮긴 값**이다. 근거 칸이 곧 출처다. */
const REF = {
  '#modal':        { a: 0.54,  doc: 'docs/review/A5-모달.md §딤(측정 .65 vs 비평 2인 .54 → 2:1 로 .54 채택)' },
  '#modal.sk8':    { a: 0.55,  doc: 'docs/measure/08-스킬세부팝업.md «딤 65%|55%|❌차이» — 딤 아래가 07 바닥 시트' },
  '#modal.q22':    { a: 0.56,  doc: 'docs/measure/22-퀘스트팝업.md «rgba(0,0,0,0.56) 투과배율 0.437/0.442»' },
  '#modal.ml69':   { a: 0.56,  doc: '69 우편 — 22 와 같은 껍데기(A5 원본 레퍼런스)' },
  '#modal.at70':   { a: 0.65,  doc: 'docs/measure/70-출석보상팝업.md «.65»' },
  '#offw':         { a: 0.80,  doc: 'docs/measure/01-오프라인보상팝업.md — 결과 연출 계열' },
  '#dgdw':         { a: 0.50,  doc: 'docs/measure/04-던전세부팝업.md §딤 «0.50»' },
  '#wpnw':         { a: 0.55,  doc: 'docs/measure/05-무기팝업.md «0.55 (실측 투과배율 0.448)»' },
  '#prbw':         { a: 0.55,  doc: 'docs/measure/11-소환부분정보팝업.md «딤(.55)»' },
  '#collw':        { a: 0.53,  doc: 'docs/measure/21-도감보너스팝업.md «0.53 (투과 0.467)»' },
  '#ciw':          { a: 0.54,  doc: 'docs/measure/33-재화정보팝업.md «0.54 (투과 0.46)»' },
  '#specw':        { a: 0.55,  doc: 'docs/measure/20-프로필팝업스펙정보.md «0.55 (투과 0.444/0.456)»' },
  '#upw':          { a: 0.80,  doc: 'docs/measure/09-일괄강화결과팝업.md «rgba(0,0,0,.80) 딤 1장 — 결과 연출이라 훨씬 깊다»' },
  '#sumw':         { a: 0.80,  doc: 'docs/measure/12-소환결과팝업.md «0.80 (투과 0.198~0.2135)»' },
  '#blsw':         { a: 0.54,  doc: 'docs/measure/34-축복버프팝업.md «.54 (투과 0.463)»' },
  '#bagw':         { a: 0.545, doc: 'docs/measure/53-가방팝업.md «.545 (투과 0.448~0.463)»' },
  '#cfw':          { a: 0.55,  doc: 'docs/measure/55-설정팝업.md «딤(α .55)»' },
  '#dclw':         { a: 0.78,  doc: 'docs/measure/31-던전클리어화면.md «.78»' },
  '#defw':         { a: 0.62,  doc: 'docs/measure/18-패배화면.md «투과 0.38 → .62»' },
  '#eqw>.dim':     { a: 0.28,  doc: 'docs/measure/06-장비팝업.md §13 «0.28 (0.278 밝은픽셀 / 0.284 중앙값)»' },
  '#panel::before':{ a: 0.28,  doc: 'docs/measure/07-스킬팝업.md «투과배율 0.721 → 딤 0.28»' },
  '.tr-dim':       { a: 0.34,  doc: '23 훈련 시트 — 06·07 과 같은 (나) 바닥 시트 계열' },
};

/* ── 껍데기 종류 (docs/measure/A5-모달.md «이 게임의 팝업 껍데기는 2종류다» + 결과 연출) ── */
const KIND = {
  '#modal': '가', '#modal.sk8': '가', '#modal.q22': '가', '#modal.ml69': '가', '#modal.at70': '가',
  '#dgdw': '가', '#wpnw': '가', '#prbw': '가', '#collw': '가', '#ciw': '가', '#specw': '가',
  '#blsw': '가', '#bagw': '가', '#cfw': '가',
  '#eqw>.dim': '나', '#panel::before': '나', '.tr-dim': '나',
  '#offw': '연출', '#upw': '연출', '#sumw': '연출', '#dclw': '연출', '#defw': '연출',
};

/* ── ⓢ 정적 스캔 — 제품에 선언된 α 전수 ── */
function staticScan() {
  const src = fs.readFileSync(SRC, 'utf8');
  const lines = src.split('\n');
  const out = [];
  const re = /background:\s*rgba\(0,\s*0,\s*0,\s*(\.\d+|0?\.\d+|\d)\)/;
  lines.forEach((ln, i) => {
    /* 전면 스크림만 — inset:0(또는 그에 준하는 전면 덮기) 를 가진 선언 */
    if (!/inset:0|bottom:calc\(100% \+ 7px\)/.test(ln) && !/^\s*bottom:calc/.test(ln)) return;
    const m = re.exec(ln);
    if (!m) return;
    const sel = (lines[i].match(/^\s*([#.][^{]*)\{/) || [])[1]
             || (lines.slice(Math.max(0, i - 2), i + 1).join(' ').match(/([#.][A-Za-z0-9_>.:()\-#, ]*)\{[^{]*$/) || [])[1]
             || '?';
    out.push({ line: i + 1, sel: sel.trim(), a: parseFloat(m[1]) });
  });
  return out;
}

const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));

(async () => {
  console.log('\n=== probe576 ⓢ 정적 — 제품에 선언된 전면 스크림 α 전수 ===');
  const stat = staticScan();
  stat.forEach(h => console.log('  ' + pad(h.line, 7) + pad(h.sel, 16) + 'α=' + h.a));

  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForTimeout(1200);

  /* 프레임을 얼린다 — 캔버스가 매 프레임 바뀌면 딤 끄고/켜고 대조가 성립하지 않는다.
     loop() 는 머리에서 rAF 를 다시 걸므로, rAF 를 무력화하면 다음 프레임에서 멈춘다. */
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    document.getAnimations && document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} });
  });
  await p.waitForTimeout(300);

  /* 스크림을 켜고/끄는 손잡이 — 클래스 하나로 통일한다(내용은 비어도 α 는 그린다) */
  const TARGETS = [
    { key: '#modal',         on: () => { const m = document.getElementById('modal'); m.className = 'on'; } },
    { key: '#modal.sk8',     on: () => { const m = document.getElementById('modal'); m.className = 'on sk8'; } },
    { key: '#modal.q22',     on: () => { const m = document.getElementById('modal'); m.className = 'on q22'; } },
    { key: '#modal.ml69',    on: () => { const m = document.getElementById('modal'); m.className = 'on ml69'; } },
    { key: '#modal.at70',    on: () => { const m = document.getElementById('modal'); m.className = 'on at70'; } },
    { key: '#offw',          on: () => document.getElementById('offw').classList.add('on') },
    { key: '#dgdw',          on: () => document.getElementById('dgdw').classList.add('on') },
    { key: '#wpnw',          on: () => document.getElementById('wpnw').classList.add('on') },
    { key: '#prbw',          on: () => document.getElementById('prbw').classList.add('on') },
    { key: '#collw',         on: () => document.getElementById('collw').classList.add('on') },
    { key: '#ciw',           on: () => document.getElementById('ciw').classList.add('on') },
    { key: '#specw',         on: () => document.getElementById('specw').classList.add('on') },
    { key: '#upw',           on: () => document.getElementById('upw').classList.add('on') },
    { key: '#sumw',          on: () => document.getElementById('sumw').classList.add('on') },
    { key: '#blsw',          on: () => document.getElementById('blsw').classList.add('on') },
    { key: '#bagw',          on: () => document.getElementById('bagw').classList.add('on') },
    { key: '#cfw',           on: () => document.getElementById('cfw').classList.add('on') },
    { key: '#dclw',          on: () => document.getElementById('dclw').classList.add('on') },
    { key: '#defw',          on: () => document.getElementById('defw').classList.add('on') },
    { key: '#eqw>.dim',      on: () => document.getElementById('eqw').classList.add('on') },
    /* ⚠ `#panel` 은 inline `display:none` 으로 닫혀 있다(탭 스크립트가 켠다) — 클래스만 얹으면
       호스트가 안 보여 rect 가 0 이고 표본이 하나도 안 잡힌다(1회차 «표본 자리 없음»). */
    { key: '#panel::before', on: () => { document.querySelectorAll('#panel .body').forEach(e => e.classList.remove('on'));
                                          document.getElementById('panel').style.display = 'flex';
                                          document.getElementById('bSk').classList.add('on'); } },
    { key: '.tr-dim',        on: () => document.getElementById('trw').classList.add('on') },
  ];

  /* computed α — 선언이 아니라 «브라우저가 실제로 쓰는» 값 */
  const computed = await p.evaluate((keys) => {
    const val = (sel, pseudo) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const bg = getComputedStyle(el, pseudo || null).backgroundColor;
      const m = /rgba?\(([^)]+)\)/.exec(bg);
      if (!m) return null;
      const q = m[1].split(',').map(s => parseFloat(s));
      return { rgb: q.slice(0, 3), a: q.length > 3 ? q[3] : 1 };
    };
    const out = {};
    keys.forEach(k => {
      if (k === '#panel::before') { document.querySelectorAll('#panel .body').forEach(e => e.classList.remove('on'));
        document.getElementById('bSk').classList.add('on'); out[k] = val('#panel', '::before'); return; }
      if (k === '#eqw>.dim') { out[k] = val('#eqw>.dim'); return; }
      if (k === '.tr-dim') { out[k] = val('.tr-dim'); return; }
      if (k.startsWith('#modal.')) {
        const m = document.getElementById('modal'); const prev = m.className;
        m.className = 'on ' + k.slice(7); out[k] = val('#modal'); m.className = prev; return;
      }
      out[k] = val(k);
    });
    document.querySelectorAll('#panel .body').forEach(e => e.classList.remove('on'));
    return out;
  }, TARGETS.map(t => t.key));

  /* ── ⓟ 찍힌 픽셀 — 딤 끄고/켜고 같은 지점의 투과배율 ──
     표본 자리는 «스크림 안 · 대화상자 밖» 이어야 한다. 상단 HUD 띠(06 측정표가 쓴 그 자리)를
     쓰되, 스크림이 그 띠를 안 덮으면(#eqw 는 bottom:180) 스크림 rect 안에서 자식 rect 를 뺀
     빈 자리를 자동으로 고른다. */
  async function shotPix(pts) {
    const buf = await p.screenshot({ type: 'png' });
    const b64 = buf.toString('base64');
    return await p.evaluate(async ({ b64, pts }) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      return pts.map(([x, y]) => Array.from(g.getImageData(x, y, 1, 1).data).slice(0, 3));
    }, { b64, pts });
  }

  /* 표본 좌표는 **켠 상태에서** 잰다 — 꺼져 있으면 `display:none` 이라 rect 가 0 이고
     («표본 자리 없음» 이 1회차에 21자리에서 그렇게 나왔다) 자식(대화상자) 자리도 모른다. */
  const RESET = () => {
    ['modal', 'offw', 'dgdw', 'wpnw', 'prbw', 'collw', 'ciw', 'specw', 'upw', 'sumw',
     'blsw', 'bagw', 'cfw', 'dclw', 'defw', 'eqw', 'trw'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.className = e.className.replace(/\bon\b|\bsk8\b|\bq22\b|\bml69\b|\bat70\b/g, ' ').replace(/\s+/g, ' ').trim();
    });
    document.querySelectorAll('#panel .body').forEach(e => e.classList.remove('on'));
    document.getElementById('panel').style.display = 'none';
  };

  const pickPts = (key) => {
    const el = key === '#panel::before' ? document.getElementById('panel')
             : key === '#eqw>.dim' ? document.querySelector('#eqw>.dim')
             : key === '.tr-dim' ? document.querySelector('.tr-dim')
             : document.querySelector(key.startsWith('#modal') ? '#modal' : key);
    if (!el) return [];
    const r = el.getBoundingClientRect();
    /* #panel::before 는 패널 «위» 1800px 띠 — 패널 자신은 스크림이 아니다 */
    const box = key === '#panel::before'
      ? { x: 0, y: 6, w: 1080, h: Math.max(0, r.top - 12) }
      : { x: r.left, y: r.top, w: r.width, h: r.height };
    if (box.w < 20 || box.h < 20) return [];
    /* 스크림 «위» 에 얹힌 것 전부 — **자손 전수**(직계 자식만 빼면 대화상자 속 요소가 표본에 든다.
       1회차에 그래서 픽셀 α 가 음수로 나온 자리가 여섯이었다) + (시트일 때) 패널 자신 */
    /* ⚠ `#eqw>.dim` 은 형제(`.eqp` 시트)가 **자기 위**에 얹힌다 — 자기 자손만 빼면 크림 시트가
       표본에 들어와 α 가 음수로 나온다(1회차 −0.793). 스코프를 껍데기 전체로 올린다. */
    const scope = key === '#eqw>.dim' ? document.getElementById('eqw')
                : key === '.tr-dim' ? document.getElementById('trw') : el;
    const kids = Array.from(scope.querySelectorAll('*')).map(c => c.getBoundingClientRect())
      .filter(q => q.width > 2 && q.height > 2 && !(q.width > 1000 && q.height > 2000));
    if (key === '#panel::before') kids.push(r);
    /* 배경이 어두우면 나눗셈이 못 쓴다 — 밝은 자리(HUD 알약·탭바)를 우선으로 훑는다 */
    /* ⚠ 성글게 **전 구역**을 훑는다 — 1회차에 촘촘한 격자로 훑었더니 상한 400에 걸려
       표본이 전부 맨 위 24px 띠에 몰렸고, 그 띠 하나로 잰 α 가 0.047 로 나왔다. */
    const pts = [];
    for (let y = Math.ceil(box.y) + 4; y <= box.y + box.h - 4; y += 40) {
      for (let x = Math.ceil(box.x) + 4; x <= box.x + box.w - 4; x += 40) {
        if (x < 2 || x > 1078 || y < 2 || y > 2278) continue;
        if (kids.some(q => x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2)) continue;
        pts.push([x, y]);
      }
    }
    return pts;
  };

  const rows = [];
  for (const t of TARGETS) {
    await p.evaluate(RESET);
    await p.evaluate(t.on);
    await p.waitForTimeout(420);
    const pts = await p.evaluate(pickPts, t.key);
    if (!pts.length) { rows.push({ key: t.key, note: '표본 자리 없음' }); continue; }
    /* 끈 상태 */
    await p.evaluate(RESET);
    await p.waitForTimeout(420);
    const before = await shotPix(pts);
    await p.evaluate(t.on);
    await p.waitForTimeout(420);
    const after = await shotPix(pts);

    /* α = 1 − after/before, 채널별 · 어두운 배경은 나눗셈이 불안정하므로 before ≥ 40 인 채널만 */
    const as = [];
    for (let i = 0; i < pts.length; i++) {
      for (let c = 0; c < 3; c++) {
        if (before[i][c] < 40) continue;
        as.push(1 - after[i][c] / before[i][c]);
      }
    }
    as.sort((x, y) => x - y);
    const med = as.length ? as[as.length >> 1] : NaN;
    const maxCh = after.length ? Math.max(...after.flat()) : NaN;
    rows.push({ key: t.key, n: as.length, pix: med, maxCh, pts: pts.length });
  }
  await p.evaluate(RESET);

  console.log('\n=== probe576 ⓢⓜⓟ 대조 — 선언 α · 그 화면 «자기» 측정표 α · 찍힌 픽셀 α ===');
  console.log('  ' + pad('스크림', 16) + pad('종류', 6) + pad('선언', 8) + pad('측정표', 8) + pad('픽셀', 8) + pad('Δ(선언−측정표)', 16) + '표본');
  let mismatch = 0;
  rows.forEach(r => {
    const c = computed[r.key];
    const dec = c ? c.a : NaN;
    const ref = REF[r.key] ? REF[r.key].a : NaN;
    const d = dec - ref;
    if (Math.abs(d) > 0.005) mismatch++;
    console.log('  ' + pad(r.key, 16) + pad(KIND[r.key] || '?', 6) + pad(dec.toFixed(3), 8) +
      pad(ref.toFixed(3), 8) + pad(isFinite(r.pix) ? r.pix.toFixed(3) : '—', 8) +
      pad((d >= 0 ? '+' : '') + d.toFixed(3) + (Math.abs(d) > 0.005 ? '  ✗' : '  ✓'), 16) +
      (r.note || (r.pts + '점 / ' + r.n + '채널')));
  });
  console.log('\n  → 선언 α 가 «자기 측정표» 와 어긋나는 자리: ' + mismatch + ' / ' + rows.length);

  /* ⓒ 518 5회차 비평가 CZ·DA 가 쓴 자 = «스크림 밖 최대 채널값».
     그 네 수치(12 소환결과 51 · 09 일괄강화 51 · 21 도감 120 · 07 스킬 시트 184)를 그대로 재현하고,
     같은 배경(메인 화면) 위에서 그 값이 α 하나로 결정되는지 본다. */
  console.log('\n=== probe576 ⓒ 등재문의 자 «스크림 밖 최대 채널값» 재현 ===');
  const CRITIC = { '#sumw': 51, '#upw': 51, '#collw': 120, '#panel::before': 184 };
  console.log('  ' + pad('스크림', 16) + pad('α', 8) + pad('등재문', 8) + pad('재현', 8) + '차');
  Object.keys(CRITIC).forEach(k => {
    const r = rows.find(q => q.key === k), c = computed[k];
    const got = r && isFinite(r.maxCh) ? r.maxCh : NaN;
    console.log('  ' + pad(k, 16) + pad(c ? c.a.toFixed(2) : '?', 8) + pad(CRITIC[k], 8) +
      pad(isFinite(got) ? got : '—', 8) + (isFinite(got) ? (got - CRITIC[k] >= 0 ? '+' : '') + (got - CRITIC[k]) : '—'));
  });
  console.log('\n  같은 α 를 쓰는 자리끼리 그 값이 흩어지는가 (배경이 같으면 폭 0 이어야 한다):');
  const byA = {};
  rows.forEach(r => { const c = computed[r.key]; if (!c) return; const k = c.a.toFixed(3); (byA[k] = byA[k] || []).push(r); });
  Object.keys(byA).sort().forEach(a => {
    const g = byA[a];
    if (g.length < 2) return;
    const mx = g.map(r => r.maxCh).filter(v => isFinite(v));
    if (mx.length < 2) return;
    console.log('  α=' + a + ' 인 ' + g.length + '자리 → 최대 채널값 ' + mx.join(' / ') +
      '  (폭 ' + (Math.max(...mx) - Math.min(...mx)) + ')  ' + g.map(r => r.key).join(', '));
  });

  console.log('\n  콘솔 에러: ' + errs.length + (errs.length ? '\n   ' + errs.slice(0, 4).join('\n   ') : ''));
  await b.close();
})();
