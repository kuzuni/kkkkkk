/* 작업 442 재현 프로브 — «적 머리 위 체력바 앵커가 그려진 스프라이트와 안 맞는다»
 *
 *   node tools/probe442.js
 *
 * 등재문(2026-08-30, sess-0537-19157 워커 B · 425 비평 1·3·4회차에서 비평가 다섯 명이 독립으로 관측):
 *   ① 던전 보스에서 바가 머리 위 **131px** 에 떠 있다(빈 배경).
 *   ② 적이 화면 위쪽에 서면 그 오프셋이 바를 던전 HUD 띠(#dunTtl/#dunTm/#dunBar)로 밀어 넣어
 *      «간격 0px» · «바 8행 중 6행(75%) 가림» 이 된다.
 *
 * 338 규칙 — 처방을 따르기 전에 **재현한다**. 이 파일은 게이트가 아니라 «무엇이 얼마나 어긋나는가» 를
 * 실측으로 찍는 자리다. 재는 것은 셋:
 *   [1] 앵커 대비 «그려진 잉크 윗변» ↔ 바 밑변의 거리(= 빈 배경) — 모든 적 종류 + 던전·탑 보스
 *   [2] 바가 화면 위쪽 HUD 띠와 겹치는가 — 적을 화면 상단에 세워 놓고 겹침 px·%
 *   [3] 아틀라스 배율 불일치 배수(= 등재문의 «1.59배 박스 불일치»)
 *
 * ⚠ `getImageData` 는 `file://` 에서 캔버스를 오염시킨다 — `--allow-file-access-from-files` 로 띄운다
 *    (verify348·probe425 선례).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1400);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 페이지 안에 «잉크 윗변» 자를 심는다 — 제품의 frameInk 는 중앙값만 돌려주므로(425)
     이 프로브는 같은 픽셀을 직접 읽어 **윗변**을 잰다. 제품을 고치기 전의 값을 재는 자리다. */
  const armed = await ev(() => {
    window.__inkTop = function (key, frameName) {
      const A = ATLAS[key];
      if (!A || !A.image || !A.f[frameName]) return null;
      const img = A.image, fr = A.f[frameName];
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      let D;
      try { D = g.getImageData(0, 0, c.width, c.height).data; } catch (e) { return null; }
      const W = c.width;
      for (let y = 0; y < fr[3]; y++) {
        for (let x = 0; x < fr[2]; x++) {
          if (D[((y + fr[1]) * W + (x + fr[0])) * 4 + 3] > 16) return y;
        }
      }
      return null;
    };
    /* 애니메이션 전 프레임의 잉크 윗변 분포 — 평균·중앙값·최소(가장 위 포즈)·최대를 같이 돌려준다.
       제품(442)이 고른 자는 **중앙값**이고, «어느 포즈가 얼마나 스치는가» 는 최소가 말한다. */
    window.__inkTopAvg = function (key, anim) {
      const A = ATLAS[key];
      if (!A || !A.a || !A.a[anim]) return null;
      const v = [];
      for (const nm of A.a[anim]) {
        const t = window.__inkTop(key, nm);
        if (t !== null) v.push(t);
      }
      if (!v.length) return null;
      v.sort((a, b) => a - b);
      return { avg: v.reduce((a, b) => a + b, 0) / v.length, med: v[v.length >> 1],
               min: v[0], max: v[v.length - 1], n: v.length };
    };
    return typeof ATLAS === 'object';
  });
  if (armed && armed.__err) { console.log('자 설치 실패: ' + armed.__err); await browser.close(); process.exit(1); }

  /* ---------------- [1] 앵커 ↔ 그려진 잉크 윗변 ---------------- */
  const measure = () => ev(() => {
    const out = [];
    for (const e of enemies) {
      const T = e.T || {}, A = ATLAS[e.akey];
      const fr0 = curFrame(e), fr = A && A.f[fr0];
      /* 자는 «쉬는 자세»(T.walk) — 제품 `eHeadTop` 이 고른 것과 같은 애니메이션을 본다 */
      const an = (T.walk && A && A.a && A.a[T.walk]) ? T.walk : e.anim;
      const ik = window.__inkTopAvg(e.akey, an);
      const s = T.scale || 1;
      const ey = e.y + (T.yo || 0);
      /* drawFrame 의 목적지 상자 윗변 = ey + (fr[5] − fr[7])·s · 잉크 윗변은 거기서 ink·s 아래 */
      const rectTop = fr ? ey + (fr[5] - fr[7]) * s : null;
      const inkMed = (rectTop !== null && ik) ? rectTop + (ik.med - (fr ? 0 : 0)) * s : null;
      const inkTop = (rectTop !== null && ik) ? rectTop + ik.med * s : null;
      const inkHigh = (rectTop !== null && ik) ? rectTop + ik.min * s : null;   /* 가장 위 포즈 */
      /* 수리 후에는 제품이 `eHeadTop()` 을 쓴다 — 있으면 그 값으로, 없으면(수리 전 트리) 옛 식으로. */
      const barY = (typeof eHeadTop === 'function') ? eHeadTop(e) - 6 : e.y - e.r * 3.1 - 6;
      out.push({
        tk: e.tk, name: T.name || e.tk, akey: e.akey, anim: an,
        r: e.r, scale: +s.toFixed(3), yo: T.yo || 0,
        rectTop: rectTop === null ? null : +(rectTop - e.y).toFixed(1),      /* 앵커 기준 */
        inkTop: inkTop === null ? null : +(inkTop - e.y).toFixed(1),
        barY: +(barY - e.y).toFixed(1),
        /* 바 밑변(barY+4) ↔ 쉬는 자세 잉크 윗변 사이의 빈 배경 */
        gap: inkTop === null ? null : +(inkTop - (barY + 4)).toFixed(1),
        /* 가장 위 포즈가 바 밑변을 얼마나 넘어서는가(양수 = 그 포즈에서 바를 스친다) */
        cross: inkHigh === null ? null : +((barY + 4) - inkHigh).toFixed(1),
        inkSpread: ik ? +((ik.max - ik.min) * s).toFixed(1) : null,
        _m: inkMed === null ? null : 0,
      });
    }
    return out;
  });

  const stageSpawn = (tk, n) => ev(([k, cnt]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    enemies.length = 0;
    for (let i = 0; i < cnt; i++) makeEnemy(k);
    for (const e of enemies) { e.born = 1; e.hp = e.max * 0.5; }
    step(1 / 60); drawHud();
    return enemies.length;
  }, [tk, n]);

  const dunSpawn = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const tw = TOWERS.find((x) => x.id === i);
    if (tw) challengeTower(i);
    else {
      const d = DUNGEONS.find((x) => x.id === i);
      S.dunTk[d.id] = 9;
      for (let k = 0; k < 8; k++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    if (!dunRun) return { err: '입장 실패' };
    /* 보스가 «필드에 실제로 설» 때까지 굴린다 */
    let f = 0;
    while (dunRun && !enemies.some((e) => e.tk === 'dunboss') && f++ < 900) { step(1 / 60); }
    let g = 0;
    while (dunRun && dunRun.introOn && g++ < 900) { step(1 / 60); }
    for (const e of enemies) { e.born = 1; e.hp = e.max * 0.5; }
    step(1 / 60); drawHud();
    return { ok: true, n: enemies.length };
  }, [id]);

  console.log('[1] 앵커(e.y) 기준 — 바 위치 vs «그려진 잉크» 윗변   (음수 = 앵커 위)');
  console.log('    빈 배경 = 바 밑변 ↔ 쉬는 자세 잉크 윗변(양수 = 떠 있다 · 음수 = 그림 안으로 파고듦)');
  console.log('    스침    = 가장 위 포즈가 바 밑변을 넘어서는 양');
  console.log('    종류          r     scale   rect윗변   잉크윗변   바 y      빈 배경   스침    포즈편차');

  const rows = [];
  for (const tk of ['zombie', 'goblin', 'dark', 'boss']) {
    const n = await stageSpawn(tk, 1);
    if (n && n.__err) { console.log('    ' + tk + ' 실패: ' + n.__err); continue; }
    const m = await measure();
    if (m.__err) { console.log('    ' + tk + ' 측정 실패: ' + m.__err); continue; }
    for (const r of m) rows.push(r);
  }

  const DUNS = await ev(() => DUNGEONS.concat(TOWERS).map((d) => ({ id: d.id, n: d.n })));
  for (const d of (DUNS.__err ? [] : DUNS)) {
    const r0 = await dunSpawn(d.id);
    if (r0.__err || r0.err) { console.log('    ' + d.id + ' 실패: ' + (r0.__err || r0.err)); continue; }
    const m = await measure();
    if (m.__err) { console.log('    ' + d.id + ' 측정 실패: ' + m.__err); continue; }
    for (const r of m) if (r.tk === 'dunboss') { r.name = d.id; rows.push(r); }
  }

  for (const r of rows) {
    console.log('    ' + String(r.name).padEnd(13) + String(r.r).padEnd(6) + String(r.scale).padEnd(8) +
      String(r.rectTop).padEnd(11) + String(r.inkTop).padEnd(11) + String(r.barY).padEnd(10) +
      String(r.gap).padEnd(10) + String(r.cross).padEnd(8) + String(r.inkSpread));
  }

  const bad = rows.filter((r) => r.gap !== null && r.gap > 24);
  const dig = rows.filter((r) => r.gap !== null && r.gap < 0);
  console.log('\n    · 빈 배경 24px 초과(= 머리 위에 떠 있다): ' + bad.length + ' / ' + rows.length +
              (bad.length ? '  [' + bad.map((r) => r.name + ' ' + r.gap).join(' · ') + ']' : ''));
  console.log('    · 빈 배경 음수(= 바가 쉬는 자세 그림 안으로 파고든다): ' + dig.length + ' / ' + rows.length +
              (dig.length ? '  [' + dig.map((r) => r.name + ' ' + r.gap).join(' · ') + ']' : ''));
  if (rows.length) {
    const mx = rows.reduce((a, r) => (r.gap > a.gap ? r : a), rows[0]);
    const mn = rows.reduce((a, r) => (r.gap < a.gap ? r : a), rows[0]);
    console.log('    · 최악(떠 있음) = ' + mx.name + ' ' + mx.gap + 'px (등재문 실측 131px)');
    console.log('    · 최악(파고듦) = ' + mn.name + ' ' + mn.gap + 'px');
    const rat = rows.filter((r) => r.inkTop !== null).map((r) => +(r.barY / r.inkTop).toFixed(3));
    console.log('    · 박스 불일치 배수(바 앵커 ÷ 잉크 윗변): ' +
      rat.map((v, i) => rows[i].name + ' ' + v).join(' · '));
  }

  /* ---------------- [2] 화면 위쪽 HUD 와의 겹침 ---------------- */
  console.log('\n[2] 적이 화면 위쪽에 설 때 — 바가 던전 HUD 띠(#dunTtl·#dunTm·#dunBar)를 파고드는가');
  const hud = await ev(() => {
    const st = document.getElementById('stagearea');
    const ar = document.getElementById('app');
    if (!st || !ar) return { err: 'stagearea 없음' };
    const sr = st.getBoundingClientRect(), arr = ar.getBoundingClientRect();
    const sc = (arr.width / FRAME_W) * SC;
    const box = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { id, y1: +((r.top - sr.top) / sc).toFixed(1), y2: +((r.bottom - sr.top) / sc).toFixed(1) };
    };
    return { sc: +sc.toFixed(4), VW, VH, boxes: ['dunTtl', 'dunTm', 'dunBar'].map(box).filter(Boolean) };
  });
  if (hud.__err || hud.err) console.log('    실패: ' + (hud.__err || hud.err));
  else {
    console.log('    캔버스 게임px — VW ' + hud.VW + ' · VH ' + hud.VH + ' (CSS→게임px 배율 ' + hud.sc + ')');
    for (const b of hud.boxes) console.log('    · #' + b.id + '  y ' + b.y1 + ' .. ' + b.y2);
  }

  const clip = await ev(() => {
    /* 던전 보스를 화면 «위쪽» 으로 옮겨 놓고 바의 화면 y 를 잰다 — 카메라 오프셋 포함 */
    const e = enemies.find((x) => x.tk === 'dunboss') || enemies[0];
    if (!e) return { err: '적 없음' };
    const out = [];
    /* 화면 상단 20% · 30% · 40% 지점에 세운다 */
    for (const f of [0.16, 0.24, 0.32, 0.42]) {
      const wantSy = VH * f;
      e.y = wantSy - camOy;
      step(1 / 60); draw(); drawHud();
      const raw = (typeof eHeadTop === 'function') ? eHeadTop(e) - 6 : e.y - e.r * 3.1 - 6;
      const by = (typeof fxClampY === 'function') ? fxClampY(raw) : raw, sy = by + camOy;
      out.push({ f, screenY: +sy.toFixed(1), barBottom: +(sy + 4).toFixed(1), bodySy: +(e.y + camOy).toFixed(1) });
    }
    return out;
  });
  if (clip.__err || clip.err) console.log('    겹침 측정 실패: ' + (clip.__err || clip.err));
  else {
    const hudY2 = hud.boxes ? Math.max(...hud.boxes.map((b) => b.y2)) : null;
    console.log('    HUD 하변(게임px) = ' + hudY2);
    console.log('    적 위치(화면비)   바 화면y    HUD 하변까지    판정');
    for (const c of clip) {
      const d = hudY2 === null ? null : +(c.screenY - hudY2).toFixed(1);
      console.log('    ' + String((c.f * 100).toFixed(0) + '%').padEnd(18) + String(c.screenY).padEnd(12) +
        String(d).padEnd(16) + (d !== null && d < 0 ? '⛔ HUD 안 (' + (-d).toFixed(1) + 'px 파고듦)' : 'ok'));
    }
  }

  console.log('\npageerror/console.error ' + errs.length + '건' + (errs.length ? '\n  ' + errs.slice(0, 3).join('\n  ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
