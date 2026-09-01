/* 작업 752 재현 프로브 — «스킬 투사체가 위로 발사될 때 사각 경계에서 하드 컷»
 *
 *   node tools/probe752.js
 *
 * 주인 원문: «스킬중에서 위로 갔더니 랜더링 잘리는거 있던데 해결하라해. 이 발사스킬같은거나
 *            뭐나 위로 발사할때 저렇게 짤림»
 *
 * 등재문 가설: 이펙트 레이어의 경계가 플레이 영역보다 작다.
 * 정적 실측(이 프로브를 쓰기 전): draw() 의 투사체·잔상 구간이
 *   `ctx.rect(-ox, EDGE_TOP - oy, VW, VH); ctx.clip()` 로 **화면 게임 y 130 위를 하드 클립**하고,
 *   `edgeFade()`(edgeDist 의 `sy - EDGE_TOP`)와 운석 램프(`scrY < 180` 알파)가 같은 상수를 본다.
 *   즉 캔버스 상단 0..130 게임px(260 프레임px — 상단 사이드 아이콘 첫 줄 옆)는
 *   투사체가 실재해도 잉크가 0 인 «죽은 띠» 다. 이것이 주인이 본 «직선 절단면» 인지 픽셀로 확인한다.
 *
 * 재는 법 — «찍힌 픽셀 diff»(350 교훈 + 배경 오염 대책): 같은 프레임을 «투사체 있음 / 없음» 으로
 *   두 번 draw() 해 달라진 픽셀만 «투사체 잉크» 로 센다(바닥 타일·테두리·플레이어가 전부 상쇄된다).
 *   위로 나는 발(k:'ice', vy<0)을 클립선 아래에서 쏘아 선을 넘게 굴린 뒤,
 *   클립선(게임 y 130 = 캔버스 260) 위/아래 띠의 잉크를 나란히 센다.
 *     · 하드 컷 = 선 «아래» 띠에는 잉크가 많은데 «위» 띠는 0 (절단면이 직선이라는 뜻)
 *     · 수리 후 = 선 위에도 잉크가 이어진다(위/아래 비가 연속적) — 가장자리 페이드는
 *       캔버스 «실제» 상변에서만 흐른다(좌·우변과 같은 문법).
 *
 * 수리 후에도 «수리 전» 을 재현할 수 있어야 하므로(probe348·350 처방) EDGE_TOP 상수만 되돌린
 * 사본을 같은 폴더에 만들어 나란히 잰다 — 저장소 파일은 한 글자도 안 건드린다.
 *
 * 두 프레임(9:19 = 1080×2280 · 9:13.3 = 1080×1600) 다 잰다 — 좁은 프레임이 더 잘 잘린다(등재문).
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const FIXED = 'const EDGE_TOP = 0;';
const OLD = 'const EDGE_TOP = 130;';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  await ev(() => { window.requestAnimationFrame = () => 0; });

  const shot = await ev(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    enemies.length = 0; spawnQ.length = 0;
    step(1 / 60);
    draw();                                     /* camOx/camOy 확정 */
    const ox = camOx, oy = camOy;

    /* 위로 나는 발 — 클립선(게임 y 130) «아래» 화면 y 210 에서 출발시켜 선을 넘게 굴린다.
       k:'ice' 는 몸통+서리 띠 잔상이 있어 잉크가 뚜렷하고 mf 페이드(shuri 전용)가 없다. */
    const mk = (sx, sy, vx, vy) => shots.push({
      k: 'ice', x: sx - ox, y: sy - oy, vx, vy, a: Math.atan2(vy, vx),
      dmg: 0, life: 3, pierce: 99, hit: [], col: '#7ce8ff'
    });
    shots.length = 0;
    for (const sx of [80, 180, 300, 420]) mk(sx, 210, 0, -430);
    mk(240, 230, -260, -320);                   /* 대각 위-좌 (사이드 아이콘 열 쪽) */
    for (let i = 0; i < 16; i++) { enemies.length = 0; spawnQ.length = 0; step(0.016); }

    const heads = shots.map((b) => ({ sy: b.y + oy, sx: b.x + ox, life: b.life }));

    /* «있음/없음» diff — 달라진 픽셀만 투사체 잉크로 센다 */
    const snap = () => {
      draw();
      return ctx.getImageData(0, 0, cvs.width, cvs.height).data;
    };
    const withS = snap();
    const saved = shots.splice(0, shots.length);
    const without = snap();
    shots.push.apply(shots, saved);

    const W = cvs.width, H = cvs.height;
    const rows = new Array(H).fill(0);
    let ink = 0;
    for (let i = 0; i < withS.length; i += 4) {
      if (Math.abs(withS[i] - without[i]) > 8 || Math.abs(withS[i + 1] - without[i + 1]) > 8 ||
          Math.abs(withS[i + 2] - without[i + 2]) > 8) {
        rows[((i / 4) | 0) / W | 0]++; ink++;
      }
    }
    const LINE = 130 * SC;                       /* 클립선의 캔버스 px */
    const band = (y0, y1) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) n += rows[y]; return n; };
    return {
      VW, VH, ox, oy, ink, LINE, H,
      heads,
      above: band(0, LINE),                      /* 클립선 위 전체 */
      justAbove: band(LINE - 14, LINE),          /* 선 바로 위 7게임px 띠 */
      justBelow: band(LINE + 1, LINE + 15),      /* 선 바로 아래 7게임px 띠 */
      profile: rows.slice(Math.max(0, LINE - 40), LINE + 40)
    };
  });

  await page.close();
  return { shot, errs };
}

(async () => {
  console.log('=== PROBE 752 — 위로 발사한 투사체의 사각 경계 하드 컷 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  const src = fs.readFileSync(SRC, 'utf8');
  const fixed = src.includes(FIXED);
  const tmp = path.join(path.dirname(SRC), `.probe752-before-${process.pid}.html`);
  fs.writeFileSync(tmp, fixed ? src.replace(FIXED, OLD) : src);
  process.on('exit', () => { try { fs.unlinkSync(tmp); } catch (e) {} });
  console.log(fixed
    ? '현재 트리 = 수리 후 · 사본 = EDGE_TOP 130 으로 되돌린 «수리 전»'
    : '⚠ 현재 트리에 수리가 없다(EDGE_TOP 130) = «수리 전» — 두 열이 같은 값으로 나온다');

  const runs = {};
  for (const [fh, fname] of [[2280, '9:19'], [1600, '9:13.3']]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: fh }, deviceScaleFactor: 1 });
    for (const [tag, url] of [['before', 'file://' + tmp], ['after', 'file://' + SRC]]) {
      runs[fname + ':' + tag] = await measure(ctx, url);
    }
    await ctx.close();
  }
  await browser.close();

  for (const key of Object.keys(runs)) {
    const r = runs[key];
    if (!r.shot || r.shot.__err) { console.log('\n[' + key + '] 측정 실패: ' + (r.shot && r.shot.__err)); fail++; continue; }
    const s = r.shot;
    console.log('\n[' + key + '] VH=' + s.VH.toFixed(1) + ' 잉크 ' + s.ink +
      'px · 클립선 위 전체 ' + s.above + ' · 선 위 띠 ' + s.justAbove + ' · 선 아래 띠 ' + s.justBelow);
    console.log('  발 머리(화면 게임y): ' + s.heads.map((h) => h.sy.toFixed(0)).join(' ') +
      ' (전부 클립선 130 위인가: ' + s.heads.every((h) => h.sy < 130) + ')');
  }

  /* 판정 */
  for (const fname of ['9:19', '9:13.3']) {
    const b = runs[fname + ':before'].shot, a = runs[fname + ':after'].shot;
    if (b && !b.__err) {
      ok(b.heads.filter((h) => h.sy < 130 && h.life > 0).length >= 4,
        '[' + fname + '][전제] 수리 전 — 수직발 4개가 살아서 클립선 위(y<130)에 실재한다' +
        ' (대각발은 세로 성분이 작아 ' + b.heads[4].sy.toFixed(0) + ' — 선 위 도달은 수직발이 증명한다)');
      ok(b.above === 0 && b.justBelow > 100,
        '[' + fname + '][가설] 수리 전 — 선 아래 띠 잉크 ' + b.justBelow + ' vs 선 «위» 전체 0 (' + b.above + ') = 직선 절단면');
    } else fail++;
    if (a && !a.__err && fixed) {
      ok(a.above > 300,
        '[' + fname + '][수리] 클립선 위에도 잉크가 이어진다 (' + a.above + 'px)');
      ok(a.justAbove > a.justBelow * 0.25,
        '[' + fname + '][수리] 선 바로 위/아래 띠가 연속이다 (' + a.justAbove + ' / ' + a.justBelow + ')');
    }
  }
  for (const key of Object.keys(runs)) {
    const e = runs[key].errs;
    ok(e.length === 0, '[' + key + '] 콘솔/페이지 오류 ' + e.length + '건' + (e.length ? ' — ' + e[0].slice(0, 100) : ''));
  }

  console.log('\nPROBE752 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
