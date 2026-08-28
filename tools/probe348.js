/* 작업 348 재현 프로브 — «화면 밖 몬스터의 HP바가 가장자리에 클램프돼 남는다»
 *
 *   node tools/probe348.js
 *
 * 주인 원문: «몬스터들 화면 벗어났는데 hp바 보여주는거 괜히 거슬림. 그거 빼셈»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify348.js`) **무엇이 어떻게
 * 어긋났는가를 눈으로 보는** 자리다. 338·341·350 규칙대로 등재문의 처방을 따르기 **전에** 재현한다.
 *
 * 재는 법 — «찍힌 픽셀» 이다(350 교훈: rect·상태값이 아니라 캔버스에 실제로 들어간 색을 읽는다).
 *   HP바는 `fillRect` 로 **불투명 단색**을 깐다 — 일반 적 `#ff6b8a`(255,107,138) ·
 *   보스류 `#ffca5c`(255,202,92). 아틀라스 아트에 그 정확한 값이 나올 일이 없으므로
 *   «그 색 픽셀의 개수와 bbox» 가 곧 «바가 그려졌는가/어디에» 다.
 *
 * 수리 뒤에도 이 파일이 살아 있으려면 «수리 전» 을 재현할 수 있어야 하므로,
 * 가시성 검사를 **한 줄 도로 뺀 사본**(index.html 임시 복사본)과 **현재 파일** 을 둘 다 띄워
 * 나란히 잰다 — 저장소 파일은 한 글자도 안 건드린다(343 §R · probe350 과 같은 처방).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');

/* 수리가 넣는 가시성 검사 — 사본에서는 이것을 «항상 참» 으로 되돌려 «수리 전» 을 만든다.
   (수리 전 트리에서 이 프로브를 돌리면 사본이 원본과 같아지므로 두 열이 같은 값으로 나온다) */
const GUARD = 'if(e.hp < e.max && grow >= 1 && eOnScreen(e)){';
const GUARD_OLD = 'if(e.hp < e.max && grow >= 1){';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 표본 자리 — 화면 좌표(게임px)를 `[VW 계수, VW 상수, VH 계수, VH 상수]` 로 준다
   (evaluate 인자는 직렬화되므로 함수를 넘길 수 없다 — VW·VH 는 페이지 안에서 곱한다) */
const CASES = [
  ['안-중앙',              'in',  [0.5, 0, 0.60, 0]],
  ['안-좌끝(사이드 열 위)', 'in',  [0, 34, 0.60, 0]],
  ['걸침-좌(반만 밖)',      'in',  [0, 4, 0.60, 0]],
  ['밖-좌',                'out', [0, -160, 0.60, 0]],
  ['밖-우',                'out', [1, 160, 0.60, 0]],
  ['밖-위',                'out', [0.5, 0, 0, -160]],
  ['밖-아래',              'out', [0.5, 0, 1, 160]],
];

async function measure(page, url, tag) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* 게임 루프를 얼린다 — 아래 draw() 호출만이 유일한 시계다(verify338·332 와 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const boot = await ev(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60);
    return { VW, VH, n: enemies.length };
  });
  if (boot.__err) return { err: boot.__err };

  const shot = await ev((cases) => {
    /* 표본마다 «적 한 마리만» 남긴다 — 다른 적의 바가 섞이면 픽셀 카운트의 뜻이 흐려진다 */
    const mk = (tk) => {
      enemies.length = 0; spawnQ.length = 0;
      makeEnemy(tk || 'zombie');
      const e = enemies[enemies.length - 1];
      if (!e) return null;
      e.born = 1; e.hp = e.max * 0.6;             /* 바가 그려질 조건(hp < max · grow ≥ 1) */
      return e;
    };
    const scan = (rgb) => {
      const g = cvs.getContext('2d');
      const d = g.getImageData(0, 0, cvs.width, cvs.height).data;
      let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2] && d[i + 3] === 255) {
          const p = (i / 4) | 0, x = p % cvs.width, y = (p / cvs.width) | 0;
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return n ? { n, x0: x0 / 2, x1: x1 / 2, y0: y0 / 2, y1: y1 / 2 } : { n: 0 };
    };
    const out = [];
    draw();                                        /* camOx/camOy 를 현재 카메라로 굳힌다 */
    const ox = camOx, oy = camOy;
    for (const c of cases) {
      const e = mk(null);
      if (!e) { out.push({ name: c[0], err: 'makeEnemy 실패' }); continue; }
      const p = c[2], sx = VW * p[0] + p[1], sy = VH * p[2] + p[3];
      e.x = sx - ox; e.y = sy - oy;
      draw();
      const px = scan([255, 107, 138]);
      out.push({ name: c[0], kind: c[1], sx, sy, r: e.r, px });
    }
    /* 보스 색(#ffca5c) 도 한 자리만 확인 — 같은 호출부라 같이 따라와야 한다 */
    let bossOut = null;
    {
      const e = mk('boss');
      if (e) {
        e.x = (VW + 160) - ox; e.y = (VH * 0.6) - oy;
        draw();
        bossOut = { name: '밖-우(보스)', kind: 'out', px: scan([255, 202, 92]) };
      }
    }
    return { out, boss: bossOut, VW, VH, ox, oy };
  }, CASES);

  return { shot, errs };
}

(async () => {
  console.log('=== PROBE 348 — 화면 밖 몬스터 HP바 ===\n');
  /* ⚠ `file://` 로 띄우면 아틀라스 이미지가 캔버스를 «오염» 시켜 getImageData 가 SecurityError 다.
     찍힌 픽셀을 읽는 것이 이 프로브의 본체라 파일 접근을 같은 출처로 취급하게 켠다(측정 전용 플래그). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  const src = fs.readFileSync(SRC, 'utf8');
  const fixed = src.includes(GUARD);
  /* ⚠ 사본은 **index.html 과 같은 폴더**여야 한다 — 이 저장소는 단일 파일 + 상대 경로 자산이라
     /tmp 에 두면 아틀라스가 통째로 404 가 된다(probe350 과 같은 함정) */
  const tmp = path.join(path.dirname(SRC), '.probe348-before.html');
  fs.writeFileSync(tmp, fixed ? src.replace(GUARD, GUARD_OLD) : src);
  process.on('exit', () => { try { fs.unlinkSync(tmp); } catch (e) {} });
  console.log(fixed
    ? '현재 트리 = 수리 후 · 사본 = 가시성 검사를 뺀 «수리 전»'
    : '⚠ 현재 트리에 가시성 검사가 없다 = «수리 전» 트리다(두 열이 같은 값으로 나온다)');

  const runs = {};
  for (const [tag, url] of [['before', 'file://' + tmp], ['after', 'file://' + SRC]]) {
    const page = await ctx.newPage();
    runs[tag] = await measure(page, url, tag);
    await page.close();
  }
  await browser.close();

  for (const tag of ['before', 'after']) {
    const r = runs[tag];
    if (!r || r.err || !r.shot || r.shot.__err) {
      console.log('\n[' + tag + '] 측정 실패: ' + ((r && (r.err || (r.shot && r.shot.__err))) || '알 수 없음'));
      fail++; continue;
    }
    const s = r.shot;
    console.log('\n[' + tag + '] VW=' + s.VW + ' VH=' + s.VH.toFixed(1) + ' cam=(' + s.ox.toFixed(1) + ',' + s.oy.toFixed(1) + ')');
    console.log('  자리                  적 화면좌표      바 픽셀   바 x범위(게임px)');
    for (const o of s.out.concat(s.boss ? [s.boss] : [])) {
      const p = o.px || { n: 0 };
      console.log('  ' + o.name.padEnd(20) +
        (o.sx === undefined ? '보스 우측 밖'.padEnd(16) : ('(' + Math.round(o.sx) + ',' + Math.round(o.sy) + ')').padEnd(16)) +
        String(p.n).padStart(7) + '   ' +
        (p.n ? p.x0.toFixed(1) + '..' + p.x1.toFixed(1) + ' / y ' + p.y0.toFixed(1) : '—'));
    }
  }

  /* 판정 — 등재문 가설: «수리 전» 에는 화면 밖 적의 바가 가장자리에 그려진다 */
  const b = runs.before && runs.before.shot;
  const a = runs.after && runs.after.shot;
  if (b && !b.__err) {
    const outs = b.out.filter((o) => o.kind === 'out');
    const drawn = outs.filter((o) => o.px && o.px.n > 0);
    ok(drawn.length > 0, '[가설] 수리 전 — 화면 밖 적 ' + outs.length + '자리 중 ' + drawn.length + '자리에서 바가 그려진다');
    const ins = b.out.filter((o) => o.kind === 'in');
    ok(ins.every((o) => o.px && o.px.n > 0), '[전제] 수리 전 — 화면 안 적 ' + ins.length + '자리는 전부 바가 그려진다');
  }
  if (a && !a.__err && fs.readFileSync(SRC, 'utf8').includes(GUARD)) {
    const outs = a.out.filter((o) => o.kind === 'out').concat(a.boss ? [a.boss] : []);
    ok(outs.every((o) => !o.px || o.px.n === 0), '[수리] 화면 밖 ' + outs.length + '자리 전부 바 픽셀 0');
    const ins = a.out.filter((o) => o.kind === 'in');
    ok(ins.every((o) => o.px && o.px.n > 0), '[불변] 화면 안 ' + ins.length + '자리는 그대로 그려진다');
  }
  for (const tag of ['before', 'after']) {
    const e = runs[tag] && runs[tag].errs;
    if (e) ok(e.length === 0, '[' + tag + '] 콘솔/페이지 오류 ' + e.length + '건' + (e.length ? ' — ' + e[0].slice(0, 120) : ''));
  }

  console.log('\nPROBE348 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
