#!/usr/bin/env node
/* 게이트 — 작업 742: `verify471` [T] 두 항의 플레이키를 «자 밖» 이 아니라 **자 안**에서 못박는다.
 *
 *   node tools/verify742.js
 *
 * 무엇이 있었나 — [T] 는 자매 자 둘(`cap471` 잉크코너 ↔ `probe471c` 글리프 잉크)을 같이 돌려
 * «같은 코너를 보는가»(≤1px) 와 «그림 코너가 상자 밖이 아닌가» 를 묻는데, 같은 트리에서
 * 47/49 ↔ 49/49 로 갈렸다(등재문 실측 · 빨간 회차 값 **#1 잉크코너 146** · **드리프트 10.00px**).
 *
 * 뿌리(`probe742` 재현) — **재는 동안 이웃 칸이 뛰고 있었다.**
 *   ⓐ `cap471.grab()` 은 호스트 subtree 와 조상만 세운다(7회차) — **형제 칸은 안 센다**.
 *   ⓑ 잉크는 «호스트 상자 + 여백 30» 클립에서 재는데 02 사이드는 피치 134 · 칸 높이 114 라
 *      아래 여백이 **다음 칸을 10px 먹는다**(30 − 20).
 *   ⓒ 그 자리에 이웃 닷의 바깥 링(box-shadow 7.5px)이 있고 그 닷은 `jzDotPulse ∞×2000` 으로 뛴다.
 *   ⇒ A↔B 사이에 위상이 바뀌면 그 링이 «달라진 화소» 로 잡히고, 주기 2초라 A↔A2 는 같은 위상으로
 *      돌아와 배제 규칙(j≤10)마저 통과한다 ⇒ 이웃의 링이 **내 글리프의 잉크 우변**으로 실린다.
 *   실측 `probe742`: 세우지 않으면 20회 중 2회 · 튄 값 151.5/151(상자 145) · 튄 화소 (145.5~146, 301.5~303).
 *
 * 처방 — `cap471.inkCorner()` 가 세 장을 찍기 **직전에 화면 전체**를 센다(`probe471c` 와 같은 규칙:
 * 무한은 0프레임 · 유한은 끝). **문턱은 한 칸도 안 넓혔다** — [T] 의 ≤1px 도 «상자 밖 0» 도 그대로다.
 *
 * ⚠ 이 자의 [2] 는 «몇 번 돌리면 나온다» 가 아니라 **결정적 양성 대조**다 — 이웃 닷의 위상을
 *   A↔B 사이에 손으로 1000ms 옮겨 그 사건을 만든다. 자연 경합(10%)에 기대면 시험이 또 플레이키해진다(560 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 2;
const SEL = '.side .ibtn';
const ROUNDS = Number(process.env.V742_ROUNDS || 8);

let pass = 0, fail = 0;
const ok = (c, label, note) => {
  if (c) { pass++; console.log('  ✓ ' + label + (note ? '  — ' + note : '')); }
  else { fail++; console.log('  ✗ ' + label + (note ? '  — ' + note : '')); }
};
const r2 = v => (v === null || v === undefined ? '—' : String(Math.round(v * 100) / 100));

(async () => {
  console.log('VERIFY742 — `cap471` 잉크 자가 «이웃 칸의 맥박» 을 안 센다\n');

  /* ── [S] 소스 — 처방이 코드에 남아 있는가 (지워지면 다음 회차가 조용히 옛 병으로 돌아간다) ── */
  const capSrc = fs.readFileSync(path.join(ROOT, 'tools/cap471.js'), 'utf8');
  console.log('[S] 소스');
  ok(/const settleAll = \(\) => page\.evaluate/.test(capSrc),
    '[S] `cap471` 이 «화면 전체를 세우는» 함수를 갖는다', 'settleAll');
  ok(/iterations === Infinity \) \? \{ a\.currentTime = 0; a\.pause\(\); \}|iterations === Infinity\) \{ a\.currentTime = 0; a\.pause\(\); \}/.test(capSrc.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')),
    '[S] 세우는 규칙이 `probe471c` 와 같다 (무한 → 0프레임 · 유한 → 끝)',
    /iterations === Infinity/.test(capSrc) ? '무한/유한을 가른다' : '안 가른다');
  ok(/if \(process\.env\.P471_NOSETTLE !== '1'\) await settleAll\(\);[\s\S]{0,200}?const A = await page\.screenshot/.test(capSrc),
    '[S] 세우기가 **세 장을 찍기 직전**에 있다 (장면마다 새 애니가 난다 — 한 번만으로는 부족)',
    '세우기 → A/B/A2 순서');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; });
  await page.evaluate(() => { document.querySelectorAll('.side .ibtn').forEach(b => b.classList.add('on')); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.querySelectorAll('.side .ibtn').forEach(b => {
      const d = b.querySelector('.bdg');
      if (d && getComputedStyle(d).display === 'none') d.style.display = 'block';
    });
  });
  await page.waitForTimeout(250);

  /* ── [1] 전제 — 노출이 실제로 있다: 클립이 이웃 칸을 먹고, 그 자리에 ∞ 맥박 닷이 있다 ── */
  console.log('\n[1] 전제 — 노출');
  const geo = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('.side .ibtn')];
    const R = bs.map(b => b.getBoundingClientRect());
    const pulses = document.getAnimations().filter(a => {
      try { const t = a.effect.getTiming(); return t.iterations === Infinity && a.effect.target && a.effect.target.closest('.side .ibtn'); }
      catch (_) { return false; }
    }).length;
    /* «옆 칸» 이 실제로 뛰는지가 이 자의 표본 조건이다 — 6칸이 다 뛰지는 않는다
       (promo·coll 은 닷이 나중에 켜져 jz 가 맥박을 안 붙였다 · 실측 4/6). */
    const nbPulse = document.getAnimations().filter(a => {
      try { return a.effect.getTiming().iterations === Infinity && a.effect.target && bs[1].contains(a.effect.target); }
      catch (_) { return false; }
    }).length;
    const d1 = bs[1].querySelector('.bdg').getBoundingClientRect();
    const cs = getComputedStyle(bs[1].querySelector('.bdg'));
    return {
      n: bs.length, h: R[0].height, pitch: R[1].top - R[0].top,
      hr: R[0].right, hy: R[0].top,
      d1r: d1.right, d1t: d1.top, ring: cs.boxShadow,
      pulses, nbPulse,
    };
  });
  ok(geo.n === 6, '[1] 02 사이드는 6칸이다 (부품이 바뀌면 이 자의 전제를 다시 볼 것)', geo.n + '칸');
  ok(geo.pitch - geo.h > 0 && geo.pitch - geo.h < 30,
    '[1] 클립 여백 30 이 다음 칸을 먹는다 — 칸 높이 ' + r2(geo.h) + ' · 피치 ' + r2(geo.pitch),
    '겹침 ' + r2(30 - (geo.pitch - geo.h)) + 'px (이 값이 0 이 되면 노출이 사라진 것이다)');
  ok(geo.nbPulse >= 1, '[1] **재는 칸의 옆 칸**(#2)이 «무한 맥박» 을 돈다 — 세우지 않으면 위상이 저절로 바뀐다',
    '#2 의 ∞ 애니 ' + geo.nbPulse + '개 · 사이드 전체 ' + geo.pulses + '개(6칸 중 4칸만 뛴다 — promo·coll 은 닷이 나중에 켜진다)');
  ok(/px/.test(geo.ring),
    '[1] 그 닷은 상자 밖으로 나가는 링(box-shadow)을 두른다 — 이웃 상자 우변 ' + r2(geo.d1r),
    geo.ring.slice(0, 60) + '…');

  /* ── 잉크 코너 — `cap471.inkCorner` 와 같은 규칙(닷 아닌 자식 전부 숨김) ──
     `phase` 가 주어지면 **A 를 찍은 뒤** 이웃 닷의 맥박을 그 위상으로 옮긴다(결정적 양성 대조). */
  const inkCorner = async (idx, clip, opt) => {
    const o = opt || {};
    const kids = (show) => page.evaluate(([s, i, sh]) => {
      const h = document.querySelectorAll(s)[i];
      const ks = [...h.children].filter(e => !e.matches('.updot,.bdg,s.dot,.dot'));
      ks.forEach(e => { e.style.visibility = sh ? '' : 'hidden'; });
      return ks.length;
    }, [SEL, idx, show]);
    const dot = (show) => page.evaluate(([s, i, sh]) => {
      const h = document.querySelectorAll(s)[i];
      h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.visibility = sh ? '' : 'hidden'; });
    }, [SEL, idx, show]);
    const view = (show) => page.evaluate(sh => {
      const v = document.getElementById('view'); if (v) v.style.visibility = sh ? '' : 'hidden';
    }, show);
    /* 수리(= `cap471` 이 하는 것) */
    if (o.settle) await page.evaluate(() => {
      for (let k = 0; k < 12; k++) document.getAnimations().forEach(a => { try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
      } catch (_) {} });
    });
    /* 이웃 닷의 맥박 위상을 결정적으로 옮긴다 — **실시간이 하는 일을 대신한다.**
       ⚠ «도는» 애니만 옮긴다(멎은 것은 실시간에도 안 는다) — 그래야 이 손잡이가 수리를 우회하지 않는다.
       ⚠ 위상은 진행도(progress)로 준다: `jzDotPulse{0%,72%,100%{scale:1}84%{scale:1.14}}` 라
          **0.84 가 봉우리**이고 0~0.72 는 평평하다(그래서 자연 경합이 «10회에 한 번» 이었다). */
    const tick = (frac) => page.evaluate(([s, i, f]) => {
      const nb = document.querySelectorAll(s)[i];
      if (!nb) return 0;
      let n = 0;
      document.getAnimations().forEach(a => { try {
        const tg = a.effect && a.effect.target;
        const t = a.effect.getTiming();
        if (tg && nb.contains(tg) && t.iterations === Infinity && a.playState === 'running') {
          a.currentTime = (t.delay || 0) + (t.duration || 0) * f; n++;
        }
      } catch (_) {} });
      return n;
    }, [SEL, idx + 1, frac]);
    await view(true);
    await dot(false);
    if (o.phaseA !== undefined) await tick(o.phaseA);
    const A = await page.screenshot({ clip });
    await kids(false);
    if (o.phaseB !== undefined) await tick(o.phaseB);
    const B = await page.screenshot({ clip });
    await kids(true);
    if (o.phaseA !== undefined) await tick(o.phaseA);
    const A2 = await page.screenshot({ clip });
    await dot(true);
    await view(false);
    return page.evaluate(async ([a64, b64, a264, cl, dsf]) => {
      const load = async (s) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height);
      };
      const A = await load(a64), B = await load(b64), A2 = await load(a264);
      if (A.width !== B.width || A.height !== B.height || A2.width !== A.width) return null;
      let t = 1e9, r = -1e9, cnt = 0;
      for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > 60 && j <= 10) { cnt++; if (x > r) r = x; if (y < t) t = y; }
      }
      return cnt ? { r: cl.x + (r + 1) / dsf, t: cl.y + t / dsf, n: cnt } : null;
    }, [A.toString('base64'), B.toString('base64'), A2.toString('base64'), clip, DSF]);
  };

  const clip = {
    x: Math.max(0, Math.floor(45 - 30)), y: Math.max(0, Math.floor(geo.hy - 30)),
    width: Math.ceil(100 + 60), height: Math.ceil(geo.h + 60),
  };

  /* ── [2] 양성 대조(결정적) — 이웃의 위상이 A↔B 사이에 바뀌면 그 링이 «내 잉크» 로 실린다 ── */
  console.log('\n[2] 양성 대조 — 이웃 맥박이 움직이면 실제로 튄다 (결정적)');
  const bad = await inkCorner(0, clip, { settle: false, phaseA: 0, phaseB: 0.84 });
  ok(bad && bad.r > geo.hr - 1,
    '[2] 이웃 닷 위상을 A↔B 사이에 봉우리(0.84)로 옮기면 잉크 우변이 **상자 밖**으로 튄다 (자가 그 사건을 만들 수 있다)',
    bad ? '우변 ' + r2(bad.r) + ' > 상자 ' + r2(geo.hr - 1) + ' (기준 회차 값 136)' : '측정 불가');

  /* ── [3] 수리 — 세우면 위상이 «움직일 수 있는 상태» 가 아니다 ── */
  console.log('\n[3] 수리 — 세운 뒤에는 도는 애니가 없다');
  const running = await page.evaluate(() => {
    for (let k = 0; k < 12; k++) document.getAnimations().forEach(a => { try {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
    } catch (_) {} });
    return document.getAnimations().filter(a => a.playState === 'running').length;
  });
  ok(running === 0, '[3] `settleAll` 뒤 «running» 애니 0개 (세 장이 같은 프레임을 본다)', running + '개');

  /* ── [4] 수리 확인 — 세운 채 반복해서 재면 값이 한 자리다 ── */
  console.log('\n[4] 수리 확인 — ' + ROUNDS + '회 반복 (세운 채)');
  const rs = [];
  for (let k = 0; k < ROUNDS; k++) {
    const r = await inkCorner(0, clip, { settle: true });
    if (r) rs.push(r.r);
    await page.waitForTimeout(120);
  }
  const spread = rs.length ? Math.max(...rs) - Math.min(...rs) : null;
  ok(rs.length === ROUNDS, '[4] ' + ROUNDS + '회 전부 쟀다 (측정 불가가 섞이면 «흔들림 0» 이 거짓이 된다)',
    rs.length + '/' + ROUNDS + '회');
  ok(spread !== null && spread <= 0.5,
    '[4] 반복해도 잉크 우변이 한 자리다 (수리 전 실측: 20회 중 2회가 15px 튀었다)',
    rs.length ? '최소 ' + r2(Math.min(...rs)) + ' · 최대 ' + r2(Math.max(...rs)) + ' ⇒ 폭 ' + r2(spread) + 'px' : '—');
  ok(rs.length === ROUNDS && rs.every(v => v <= geo.hr - 1),
    '[4] `verify471` [T] «그림 코너가 상자 밖이 아니다» 가 ' + ROUNDS + '회 전부 초록',
    rs.length ? '상자 ' + r2(geo.hr) + ' · 최대 우변 ' + r2(Math.max(...rs)) : '—');

  /* ── [R] 되돌림 — 세우기를 끄면 노출이 되살아난다(«무르게 푼 것이 아님» 의 반대편 증거) ── */
  console.log('\n[R] 되돌림 시험');
  const back = await page.evaluate(() => {
    document.querySelectorAll('.side .ibtn .bdg').forEach(d => { d.style.animation = 'none'; d.offsetHeight; d.style.animation = ''; });
    return document.getAnimations().filter(a => {
      try { return a.effect.getTiming().iterations === Infinity && a.playState === 'running'; } catch (_) { return false; }
    }).length;
  });
  ok(back > 0, '[R] 맥박은 되살아날 수 있다 — 세우기를 빼면 다시 도는 애니가 있다 (수리는 «없앤 것» 이 아니라 «세운 것»)',
    '되살린 ∞ 애니 ' + back + '개');
  const bad2 = await inkCorner(0, clip, { settle: false, phaseA: 0, phaseB: 0.84 });
  ok(bad2 && bad2.r > geo.hr - 1,
    '[R] 세우기 없이 같은 위상 이동을 주면 다시 상자 밖이다 (이 자가 통과를 «허용치» 로 사지 않았다)',
    bad2 ? '우변 ' + r2(bad2.r) : '측정 불가');
  const good2 = await inkCorner(0, clip, { settle: true, phaseA: 0, phaseB: 0.84 });
  ok(good2 && Math.abs(good2.r - 136) <= 0.5,
    '[R] 음성 — 같은 자리를 «세운 채» 재면 136 이다 (제품은 결백하다 — 글리프는 상자 안 9px)',
    good2 ? '우변 ' + r2(good2.r) + ' · 상자 ' + r2(geo.hr) : '측정 불가');

  await browser.close();
  console.log('\nVERIFY742 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
