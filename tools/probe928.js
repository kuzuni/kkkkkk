/* 작업 928 재현기 — `verify856` [B11] 이 8회에 1회 빨간(flask 덮임 0.745 ↔ 문턱 0.75) 뿌리를 가른다.
 *
 *   node tools/probe928.js            한 판(페이지 안에서 6회 되풀이)
 *   node tools/probe928.js --n 10     되풀이 횟수
 *   node tools/probe928.js --json     기계용 한 줄
 *
 * ⚑ **무엇을 가르는가** — 등재문이 남긴 물음은 «flask 의 덮임이 왜 실행마다 흔들리는가 —
 *   재는 자리의 잡음인가 굽기의 잡음인가» 다. 가르는 법은 «같은 트리에서 N회» 인데,
 *   **어디서 N회 도는가**가 답을 가른다:
 *     ⓐ 한 페이지 안에서 같은 발을 N번 그려 재면 → 자·굽기가 흔들리는지 본다.
 *     ⓑ 프로세스를 N번 띄우면 → 판(브라우저·페이지)이 흔들리는지 본다.
 *   그래서 이 자는 **화소 자체의 지문**(FNV-1a)을 찍는다. 덮임 같은 파생값이 아니라 원판을 찍어야
 *   «자가 흔들렸다» 와 «그림이 흔들렸다» 가 갈린다(자는 순수 함수라 같은 그림이면 같은 값이다).
 *
 * ⚠ 이 자는 **판정하지 않는다**(종료 코드 0 · 344·873·903 선례 — 먼저 분포부터 센다).
 *   판정은 `tools/verify928.js` 가 한다.
 *
 * ⚠ 자를 새로 만들지 않는다(402) — 덮임·폭을 재는 자는 `verify856` 한 곳이고 여기서는
 *   **그 자가 먹는 재료**(a0·a2·base 화소 블록)만 찍는다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const argN = (() => { const i = process.argv.indexOf('--n'); return i > 0 ? (+process.argv[i + 1] || 6) : 6; })();
const JSONOUT = process.argv.includes('--json');
/* --pin — 처방 A/B: 측정 상자를 매단 **플레이어를 제자리에 못박고** 잰다.
   자는 이미 «적» 을 못박고 있다(`foe.x = 300 - ox`) — 빠진 것은 플레이어 한 쪽뿐이다. */
const PIN = process.argv.includes('--pin');
/* --shift N — 관측된 표류(무보정 4판에서 player.x 952.6~975.9)를 **손으로** 재현한다.
   자연 표류는 판마다 값이 달라 되돌림 시험의 재료로 못 쓴다(그 자체가 플레이키다) —
   같은 크기를 결정적으로 넣어야 «상자가 움직이면 값이 바뀐다» 를 흔들림 없이 보일 수 있다. */
const SHIFT = (() => { const i = process.argv.indexOf('--shift'); return i > 0 ? (+process.argv[i + 1] || 0) : 0; })();

(async () => {
  /* `verify856` 과 **같은 깃발** — 캔버스가 file:// 자산으로 더러워지면 `getImageData` 가 막힌다. */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1100);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.evaluate((v) => { window.__PIN928 = v[0]; window.__SHIFT928 = v[1]; }, [PIN, SHIFT]);

  const out = await page.evaluate((N) => {
    /* ── verify856 과 **같은 자리·같은 처방**의 고정(855) ── */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null, foeSteps = -1;
    const putFoe = () => {
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; foeSteps = g; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    const specs = {};
    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }

    putFoe(); clearFx();
    if (window.__PIN928) { player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0; }
    /* ⚠ 밀기는 **못박은 뒤**다 — 못박기 전에 밀면 자연 표류가 그대로 얹혀 판마다 또 달라진다.
       되돌림 시험의 재료는 «결정적으로 옮긴 상자» 라야 한다(자연 표류는 그 자체가 플레이키다). */
    player.x += (window.__SHIFT928 || 0);
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;

    /* FNV-1a 32bit — 화소 블록의 지문. 값이 아니라 «같은가» 만 묻는다. */
    const fnv = (u8) => { let h = 0x811c9dc5 >>> 0;
      for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };

    const mkShot = (sp) => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                              dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                              spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                              tx: sp.tx === undefined ? undefined : CX - ox,
                              ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });

    /* 본체 마스크 화소 수만 센다 — 덮임·폭은 verify856 의 몫이고 여기서는 «그림이 같은가» 가 물음이다. */
    const A_BODY = 0.80;
    const bodyN = (a0, a2, base) => {
      let n = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) { const v = Math.abs(a0[i + k] - base[i + k]); if (v > best) { best = v; c = k; } }
        if (best <= 8) continue;
        const d1 = a0[i + c] - base[i + c], d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        if (al >= A_BODY) n++;
      }
      return n;
    };

    /* 표본 — 등재문이 지목한 flask 와, 같은 판에서 흔들리는지 대조할 이웃 셋. */
    /* ⚠ verify856 의 표는 «형상(sh) (종 id)» 순으로 찍는다 — 여기서 고르는 열쇠는 **종 id** 다
       (`bottle (flask)` 의 열쇠는 `flask`). 형상 이름으로 고르면 표본이 통째로 0 종이 된다. */
    const WANT = ['flask', 'meteor', 'boom', 'slash'];
    const ids = WANT.filter(k => specs[k]);
    const iter = [];
    for (let r = 0; r < N; r++) {
      clearFx();
      const base = grab();                      /* ⚠ 되풀이마다 **다시** 찍는다 — 바탕이 흔들리는지도 묻는다 */
      const row = { r, base: fnv(base), sp: {} };
      for (const id of ids) {
        const sp = specs[id];
        clearFx(); shots.push(mkShot(sp));                  const a0 = grab();
        clearFx(); shots.push(mkShot(sp), mkShot(sp));      const a2 = grab();
        clearFx();
        row.sp[id] = { a0: fnv(a0), a2: fnv(a2), nb: bodyN(a0, a2, base) };
      }
      iter.push(row);
    }
    performance.now = _now;

    /* 굽기 지문 — 구운 스프라이트의 화소가 판마다 다른지(굽기의 잡음인가) */
    const baked = {};
    if (typeof SPEC_SPR !== 'undefined') for (const [k, v] of SPEC_SPR.entries()) {
      if (!v || !v.c) continue;
      try {
        const g2 = v.c.getContext('2d');
        const im2 = g2.getImageData(0, 0, v.c.width, v.c.height).data;
        let a = 0, mxA = 0;
        for (let i = 3; i < im2.length; i += 4) { if (im2[i]) a++; if (im2[i] > mxA) mxA = im2[i]; }
        baked[String(k).split('|')[0]] = { h: fnv(im2), n: a, mx: mxA, w: v.c.width };
      } catch (_) {}
    }
    return { ids, iter, baked, box: [bx, by, bw, bh],
             diag: { px: +player.x.toFixed(3), py: +player.y.toFixed(3), ox, oy, CX, CY,
                     foeSteps, nspec: Object.keys(specs).length, SC,
                     pin: !!window.__PIN928, shift: (window.__SHIFT928 || 0) } };
  }, argN);

  await ctx.close();
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify(out)); return; }

  console.log('probe928 — 같은 페이지 안에서 ' + out.iter.length + '회 되풀이 (상자 ' + out.box.join(',') + ')');
  const d = out.diag;
  console.log('  [자리] player ' + d.px + ',' + d.py + ' · cam ' + d.ox + ',' + d.oy +
              ' · 측정중심 ' + d.CX + ',' + d.CY + ' · putFoe step ' + d.foeSteps + '회 · 종 ' + d.nspec +
              ' · SC ' + d.SC + (d.pin ? ' · [못박음]' : '') + (d.shift ? ' · [밀기 ' + d.shift + 'px]' : ''));
  console.log('');
  console.log('  회차  바탕지문   ' + out.ids.map(i => (i + '(a0지문/본체화소)').padEnd(26)).join(''));
  for (const row of out.iter) {
    console.log('  ' + String(row.r).padStart(3) + '   ' + row.base.padStart(8) + '   ' +
      out.ids.map(i => (row.sp[i].a0 + ' / ' + row.sp[i].nb).padEnd(26)).join(''));
  }
  console.log('');
  const uniq = (f) => { const s = new Set(out.iter.map(f)); return s.size; };
  console.log('  판 안 갈래 — 바탕 ' + uniq(r => r.base) + '종 · ' +
    out.ids.map(i => i + ' ' + uniq(r => r.sp[i].a0) + '종').join(' · '));
  const b = out.baked;
  const keys = Object.keys(b).sort();
  console.log('');
  console.log('  구운 스프라이트(굽기 지문) — ' + keys.length + '종');
  for (const k of keys.filter(k => out.ids.includes(k))) {
    console.log('    ' + k.padEnd(10) + ' 지문 ' + b[k].h + '  알파화소 ' + b[k].n + '  최대알파 ' + b[k].mx + '  판 ' + b[k].w);
  }
})().catch(e => { console.error('probe928 즉사: ' + (e && e.message || e)); process.exit(1); });
