/* 작업 442 게이트 — «적 머리 위 체력바 앵커 = 그려진 스프라이트 · 상단 HUD 뒤로 안 들어간다»
 *
 *   node tools/verify442.js
 *
 * 등재문(2026-08-30, sess-0537-19157 워커 B — 425 비평 1·3·4회차에서 비평가 다섯 명이 독립 관측):
 *   ⓐ 던전 보스에서 바가 머리 위 131px 에 떠 있다(빈 배경)  ⓑ 적이 화면 위쪽에 서면 바가 HUD 뒤로
 *   최대 75% 가려진다. 수리는 처방 ⓐ·ⓑ **둘 다**다 — 앵커를 `frameInk` 의 잉크 윗변으로 갈고,
 *   그 위에 세로 클램프(`fxClampY`)를 한 겹 세웠다.
 *
 * 이 자가 묻는 것:
 *   [전제] 제품에 세 부품(`frameInk().ty` · `eHeadTop` · `fxClampY` · `eBarBox`)이 있다
 *   [1] `frameInk().ty` 가 **독립 픽셀 스캔**과 한 줄도 안 다르다 (자 자신의 검산)
 *   [2] 적 전 종류 + 던전·탑 보스에서 «빈 배경»(바 밑변 ↔ 쉬는 자세 잉크 윗변)이 규약 밴드 안이다
 *   [3] 바가 **안 흔들린다** — 애니메이션이 돌아도·공격 모션으로 갈아타도 바 y 가 Δ0
 *   [4] 화면 위쪽에 선 적의 바가 상단 HUD 띠 아래에 있다 (던전 HUD · 28 규격 보스 HUD 둘 다)
 *   [5] 폴백 — 아틀라스를 못 읽는 적은 옛 근사로 떨어지고 **바가 사라지지 않는다**
 *   [6] 348 규약이 그대로다(화면 밖 0 · 사이드 열 클램프) — 442 가 같은 한 줄을 지난다
 *   [R] 되돌림 시험 — ① 앵커를 옛 식으로 되돌린 사본에서 [2] 가 빨개진다
 *                     ② 세로 클램프를 뺀 사본에서 [4] 가 빨개진다
 *
 * ⚠ `file://` 은 아틀라스가 캔버스를 오염시켜 getImageData 가 SecurityError 다 →
 *    측정 전용으로 `--allow-file-access-from-files` 를 켠다(verify348·probe425 선례).
 *    그 플래그가 없으면 제품은 **설계대로** 옛 근사로 떨어지므로 [2] 가 의미를 잃는다 — [전제]가 그것을 먼저 막는다.
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
/* 되돌림 사본의 앵커가 되는 제품 한 줄(`eBarBox` 안) */
const ANCHOR = 'const y = fxClampY(eHeadTop(e) - 6);';
const ANCHOR_OLD = 'const y = e.y - e.r*3.1 - 6;';        /* §R① 442 이전의 앵커 */
const ANCHOR_NOCLAMP = 'const y = eHeadTop(e) - 6;';      /* §R② 세로 클램프만 뺀다 */

/* 규약 밴드 — «빈 배경»(바 밑변 ↔ 쉬는 자세 잉크 윗변, 게임px).
   위: 24 = 좀비(수리 전 21.6)조차 넘지 않던 값이자 등재문이 «떠 있다» 로 읽은 131 의 1/5.
   아래: −6 = 바 높이(4) + 여유 2. 그 아래로 내려가면 바가 쉬는 자세 그림 안으로 파고든다. */
const GAP_HI = 24, GAP_LO = -6;

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (c, m) => (c ? ok(m) : no(m));

/* ── 페이지 안 공용 하네스 (되돌림 사본에도 똑같이 건다) ───────────────────────── */
const HARNESS = () => {
  window.requestAnimationFrame = () => 0;                /* 유일한 시계는 아래 step()/draw() 다 */
  localStorage.clear(); Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  msgTxt = ''; msgT = 0;                                 /* 372/LESSONS 30-② — 부팅 토스트를 지운다 */
  spawnStage(); step(1 / 60); draw(); drawHud();

  window.__t442 = {
    /* 스테이지 전투에 그 종류의 적 하나만 세운다 */
    mk(tk) {
      enemies.length = 0; if (typeof spawnQ !== 'undefined') spawnQ.length = 0;
      makeEnemy(tk || 'zombie');
      const e = enemies[enemies.length - 1];
      e.born = 1; e.hp = e.max * 0.6;
      return e;
    },
    put(e, sx, sy) { draw(); e.x = sx - camOx; e.y = sy - camOy; draw(); },
    /* 아틀라스 픽셀을 **제품과 다른 경로로** 직접 읽어 한 프레임의 잉크 윗변을 구한다(자 자신의 검산) */
    inkTopRaw(key, nm) {
      const A = ATLAS[key];
      if (!A || !A.image || !A.f[nm]) return null;
      const fr = A.f[nm], c = document.createElement('canvas');
      c.width = fr[2]; c.height = fr[3];
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
      let D;
      try { D = g.getImageData(0, 0, fr[2], fr[3]).data; } catch (e) { return null; }
      for (let y = 0; y < fr[3]; y++) {
        for (let x = 0; x < fr[2]; x++) if (D[(y * fr[2] + x) * 4 + 3] > 16) return y;
      }
      return null;
    },
    /* 그 적의 «빈 배경» — 바 밑변 ↔ 쉬는 자세(T.walk) 잉크 윗변의 중앙값 */
    gapOf(e) {
      const T = e.T || {}, A = ATLAS[e.akey];
      if (!A || !A.a) return null;
      const an = T.walk && A.a[T.walk] ? T.walk : e.anim;
      const list = A.a[an]; if (!list || !list.length) return null;
      const s = T.scale || 1, tops = [];
      for (const nm of list) {
        const fr = A.f[nm], t = window.__t442.inkTopRaw(e.akey, nm);
        if (!fr || t === null) continue;
        tops.push(-fr[7] + fr[5] + t);
      }
      if (!tops.length) return null;
      tops.sort((a, b) => a - b);
      const inkTop = e.y + (T.yo || 0) + tops[tops.length >> 1] * s;
      const hi = e.y + (T.yo || 0) + tops[0] * s;                 /* 가장 위 포즈 */
      /* **지금 화면에 그려지고 있는 그 한 장**의 잉크 윗변 — 중앙값과 독립이라 [2-b] 가 헛초록이 아니다 */
      const nm = curFrame(e), frN = nm && A.f[nm], tN = nm ? window.__t442.inkTopRaw(e.akey, nm) : null;
      const inkNow = (frN && tN !== null) ? e.y + (T.yo || 0) + (-frN[7] + frN[5] + tN) * s : null;
      const b = eBarBox(e);
      return { gap: inkTop - (b.y + b.h), cross: (b.y + b.h) - hi, barY: b.y, inkTop: inkTop - e.y,
               gapNow: inkNow === null ? null : inkNow - (b.y + b.h) };
    },
    /* 상단 HUD 띠의 캔버스 게임px 하변 — 게이트도 제품과 **같은 자**(measureHudBox)를 쓴다 */
    hudY2() { return (typeof hudBox === 'object' && hudBox) ? hudBox.y2 : null; },
  };
  return { VW, VH };
};

/* 던전·탑 입장(probe442 와 같은 경로) */
const ENTER = ([i]) => {
  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  msgTxt = ''; msgT = 0;
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
  let f = 0;
  while (dunRun && !enemies.some((e) => e.tk === 'dunboss') && f++ < 900) step(1 / 60);
  let g = 0;
  while (dunRun && dunRun.introOn && g++ < 900) step(1 / 60);
  for (const e of enemies) { e.born = 1; e.hp = e.max * 0.5; }
  step(1 / 60); draw(); drawHud();
  const b = enemies.find((e) => e.tk === 'dunboss');
  if (!b) return { err: '보스가 안 섰다' };
  /* [2] 가 재는 것은 **앵커**다 — 보스를 화면 한복판에 세워 세로 클램프가 안 걸리는 자리로 옮긴다
     (클램프 자체는 [4] 가 따로 묻는다. 스폰 좌표는 난수라 그냥 재면 둘이 섞인다). */
  window.__t442.put(b, VW / 2, VH * 0.62);
  return Object.assign({ ok: true, clamped: eBarBox(b).y > eHeadTop(b) - 6 + 0.001 },
                       window.__t442.gapOf(b) || {});
};

async function open(ctx, url) {
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
  const dim = await ev(HARNESS);
  return { page, ev, errs, dim };
}

(async () => {
  console.log('=== VERIFY 442 — 적 머리 위 HP바 앵커 · 상단 HUD 클램프 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  /* ═══ [전제] 부품이 제자리에 있는가 ══════════════════════════════════════════ */
  console.log('[전제] 제품 부품');
  is(/m\[nm\] = n === 0 \? null : \{ my: mid\(row\), mx: mid\(col\), ty \}/.test(src),
     '[전제-a] frameInk 가 잉크 윗변 `ty` 를 같이 돌려준다');
  is(src.includes('function eHeadTop(e){'), '[전제-b] eHeadTop() 이 있다');
  is(src.includes('function fxClampY(wy){'), '[전제-c] fxClampY() 가 있다');
  is(src.includes('function eBarBox(e){'), '[전제-d] eBarBox() 가 자리를 한 곳에서 정한다');
  is(src.includes(ANCHOR), '[전제-e] 앵커 한 줄이 그대로다 — ' + ANCHOR);
  is(!/const w = Math\.max\(22, e\.r\*2\.2\), h = 4, by = e\.y - e\.r\*3\.1/.test(src),
     '[전제-f] 그리기 블록에 옛 앵커(e.y − e.r*3.1 − 6)가 남아 있지 않다');

  /* 되돌림 사본 — 상대 경로 자산 때문에 반드시 같은 폴더에 둔다(probe350 함정) */
  const revPath = path.join(path.dirname(SRC), `.verify442-rev-${process.pid}.html`);
  const nocPath = path.join(path.dirname(SRC), `.verify442-noclamp-${process.pid}.html`);
  if (src.includes(ANCHOR)) {
    fs.writeFileSync(revPath, src.replace(ANCHOR, ANCHOR_OLD));
    fs.writeFileSync(nocPath, src.replace(ANCHOR, ANCHOR_NOCLAMP));
  }
  process.on('exit', () => {
    try { fs.unlinkSync(revPath); } catch (e) {}
    try { fs.unlinkSync(nocPath); } catch (e) {}
  });

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await open(ctx, 'file://' + SRC);
  if (cur.dim && cur.dim.__err) { no('[전제] 하네스 실패: ' + cur.dim.__err); console.log('\nVERIFY442 ' + pass + '/' + (pass + fail) + ' — FAIL ' + fail); process.exit(1); }
  ok('[전제-g] 하네스 — 스테이지 전투 부팅 · VW ' + cur.dim.VW + ' · VH ' + cur.dim.VH.toFixed(0));

  /* ═══ [1] 자 자신의 검산 — frameInk().ty ↔ 독립 픽셀 스캔 ═══════════════════ */
  console.log('\n[1] frameInk().ty 검산 — 제품의 값 ↔ 프레임을 따로 그려 읽은 값');
  {
    const r = await cur.ev(() => {
      const out = [];
      for (const key of ['zombie', 'elves', 'knight', 'dragon']) {
        const A = ATLAS[key]; if (!A || !A.f) continue;
        const ink = frameInk(key, A);
        if (!ink) { out.push({ key, err: 'frameInk 가 null — 캔버스 오염(플래그 없음)' }); continue; }
        let n = 0, bad = 0, first = null;
        for (const nm in A.f) {
          const t = window.__t442.inkTopRaw(key, nm);
          const k = ink[nm];
          if (t === null || !k) continue;
          n++;
          if (k.ty !== t) { bad++; if (!first) first = nm + ' 제품 ' + k.ty + ' ↔ 검산 ' + t; }
        }
        out.push({ key, n, bad, first });
      }
      return out;
    });
    if (r.__err) no('[1] 평가 실패 — ' + r.__err);
    else for (const x of r) {
      if (x.err) no('[1] ' + x.key + ' — ' + x.err);
      else is(x.n > 0 && x.bad === 0, '[1] ' + x.key + ' — 프레임 ' + x.n + '장 전부 일치' +
              (x.bad ? ' (어긋남 ' + x.bad + '건: ' + x.first + ')' : ''));
    }
  }

  /* ═══ [2] 앵커 — «빈 배경» 이 규약 밴드 안인가 ══════════════════════════════ */
  console.log('\n[2] 빈 배경(바 밑변 ↔ 쉬는 자세 잉크 윗변) — 규약 ' + GAP_LO + ' ≤ g ≤ ' + GAP_HI + ' px');
  const gaps = [];
  {
    for (const tk of ['zombie', 'goblin', 'dark', 'boss']) {
      const r = await cur.ev(([k]) => {
        const e = window.__t442.mk(k);
        window.__t442.put(e, VW / 2, VH * 0.62);
        return Object.assign({ name: (e.T || {}).name || k }, window.__t442.gapOf(e) || { err: '잉크를 못 쟀다' });
      }, [tk]);
      if (r.__err || r.err) { no('[2] ' + tk + ' — ' + (r.__err || r.err)); continue; }
      gaps.push(r);
      is(r.gap >= GAP_LO && r.gap <= GAP_HI,
         '[2] ' + r.name.padEnd(8) + ' 빈 배경 ' + r.gap.toFixed(1) + 'px');
    }
    const DUNS = await cur.ev(() => DUNGEONS.concat(TOWERS).map((d) => d.id));
    for (const id of (DUNS.__err ? [] : DUNS)) {
      const r = await cur.ev(ENTER, [id]);
      if (r.__err || r.err) { no('[2] ' + id + ' — ' + (r.__err || r.err)); continue; }
      gaps.push(Object.assign({ name: id }, r));
      is(r.gap >= GAP_LO && r.gap <= GAP_HI && r.clamped === false,
         '[2] ' + String(id).padEnd(8) + ' 빈 배경 ' + r.gap.toFixed(1) + 'px' +
         (r.clamped ? ' ⚠ 표본이 클램프에 걸렸다 — 자리를 잃었다' : ''));
    }
    if (gaps.length) {
      const mx = gaps.reduce((a, b) => (b.gap > a.gap ? b : a));
      const mn = gaps.reduce((a, b) => (b.gap < a.gap ? b : a));
      ok('[2-요약] 표본 ' + gaps.length + '종 — 최대 ' + mx.name + ' ' + mx.gap.toFixed(1) +
         'px · 최소 ' + mn.name + ' ' + mn.gap.toFixed(1) + 'px (수리 전 −107.2 ~ +112.1)');
      /* [2-b] — 중앙값이 아니라 **지금 그려지는 그 한 장**으로 다시 묻는다. [2] 는 제품이 고른 자와
         같은 통계를 쓰므로 값이 상수 2.0 으로 굳지만, 이 항은 포즈가 다르면 값이 달라진다 =
         «앵커식·배율·yo·프레임 rect» 중 하나라도 틀리면 여기서 벌어진다.
         ⚠ 묻는 것은 **위쪽 한 방향뿐**이다(«떠 있는가»). 아래로 넘치는 값은 설계다 —
            442 는 «치켜든 날개 한 장» 을 따라가지 않으려고 중앙값을 골랐고, 그 대가로 그 포즈에서만
            날개 끝이 4px 짜리 바를 스친다(그 양은 [2-c] 가 기록한다). */
      const now = gaps.filter((g) => g.gapNow !== null && g.gapNow !== undefined);
      const bad = now.filter((g) => g.gapNow > GAP_HI);
      is(now.length === gaps.length && bad.length === 0,
         '[2-b] 지금 그려지는 프레임 기준 — 표본 ' + now.length + '종 전부 «빈 배경 ≤ ' + GAP_HI + '» [' +
         now.map((g) => g.name + ' ' + g.gapNow.toFixed(1)).join(' · ') + ']');
      ok('[2-c] 가장 위 포즈가 바 밑변을 넘어서는 양(기록 · 양수 = 그 포즈에서만 스친다) — ' +
         gaps.map((g) => g.name + ' ' + g.cross.toFixed(1)).join(' · '));
    }
  }

  /* ═══ [3] 바가 안 흔들린다 ═══════════════════════════════════════════════════ */
  console.log('\n[3] 안정성 — 애니메이션이 돌아도 · 공격 모션으로 갈아타도 바 y 가 Δ0');
  {
    const r = await cur.ev(() => {
      const e = window.__t442.mk('boss');
      window.__t442.put(e, VW / 2, VH * 0.62);
      const y0 = eBarBox(e).y - e.y;
      let mx = 0;
      for (let i = 0; i < 40; i++) {                       /* 애니메이션 위상만 돌린다 */
        e.at += 0.05; draw();
        mx = Math.max(mx, Math.abs((eBarBox(e).y - e.y) - y0));
      }
      /* 공격 모션으로 갈아탄다 — 제품은 «쉬는 자세»(T.walk) 를 자로 쓰므로 안 움직여야 한다 */
      const T = e.T;
      setAnim(e, T.atlas, T.atk, T.fps, true);
      draw();
      const dAtk = Math.abs((eBarBox(e).y - e.y) - y0);
      return { mx: +mx.toFixed(3), dAtk: +dAtk.toFixed(3), anim: e.anim };
    });
    if (r.__err) no('[3] 평가 실패 — ' + r.__err);
    else {
      is(r.mx === 0, '[3-a] 40프레임 애니메이션 — 바 y 최대 변동 ' + r.mx + 'px');
      is(r.dAtk === 0, '[3-b] 공격 모션(' + r.anim + ')으로 갈아타도 Δ ' + r.dAtk + 'px');
    }
  }

  /* ═══ [4] 상단 HUD 클램프 ═══════════════════════════════════════════════════ */
  console.log('\n[4] 상단 HUD 띠 — 화면 위쪽에 선 적의 바가 띠 아래에 있는가');
  const clampSpec = ([f]) => {
    const T = window.__t442, hb = T.hudY2();
    if (hb === null) return { err: 'hudBox 가 null — 띠를 못 쟀다' };
    const e = enemies.find((x) => x.tk === 'dunboss') || enemies.find((x) => x.hp > 0) || T.mk('boss');
    const out = [];
    for (const q of f) {
      T.put(e, VW / 2, VH * q);
      const b = eBarBox(e);
      out.push({ q, sy: +(b.y + camOy).toFixed(1) });
    }
    return { hb: +hb.toFixed(1), out };
  };
  {
    /* ⓐ 던전 HUD (#dunHud) */
    const enter = await cur.ev(ENTER, ['gold']);
    if (enter.__err || enter.err) no('[4-a] 던전 입장 실패 — ' + (enter.__err || enter.err));
    else {
      const r = await cur.ev(clampSpec, [[0.10, 0.16, 0.24, 0.42]]);
      if (r.__err || r.err) no('[4-a] ' + (r.__err || r.err));
      else {
        ok('[4-a] 던전 HUD 하변(게임px) = ' + r.hb);
        for (const o of r.out) {
          is(o.sy >= r.hb, '[4-a] 적을 화면 ' + (o.q * 100).toFixed(0) + '% 에 — 바 화면y ' + o.sy +
             ' ≥ HUD 하변 ' + r.hb);
        }
      }
    }
    /* ⓑ 28 규격 보스 HUD (#stinfo.bfight · #bossTm · #bossHp) */
    const st = await cur.ev(() => {
      localStorage.clear(); Object.assign(S, DEF());
      S.stage = 20; S.best = 20; S.guide.idx = 99;
      if (dunRun) endDunRun(false, true);
      msgTxt = ''; msgT = 0;
      spawnStage(); step(1 / 60);
      window.__t442.mk('boss');
      /* 28 규격 HUD 를 실제로 켠다 — `bossMode()` 는 `inBossFight() = bossOn` 을 본다(162) */
      bossOn = true;
      step(1 / 60); draw(); drawHud();
      return { md: typeof bossMode === 'function' ? bossMode() : '?',
               on: document.getElementById('bossHp').classList.contains('on'),
               hb: window.__t442.hudY2() };
    });
    if (st.__err) no('[4-b] 보스전 진입 실패 — ' + st.__err);
    else {
      ok('[4-b] 모드 ' + st.md + ' · #bossHp 켜짐 ' + st.on + ' · HUD 하변 ' +
         (st.hb === null ? 'null' : st.hb.toFixed(1)));
      const r = await cur.ev(clampSpec, [[0.08, 0.14, 0.42]]);
      if (r.__err || r.err) no('[4-b] ' + (r.__err || r.err));
      else for (const o of r.out) {
        is(o.sy >= r.hb, '[4-b] 적을 화면 ' + (o.q * 100).toFixed(0) + '% 에 — 바 화면y ' + o.sy +
           ' ≥ HUD 하변 ' + r.hb);
      }
    }
  }

  /* ═══ [5] 폴백 — 아틀라스를 못 읽어도 바가 사라지지 않는다 ══════════════════ */
  console.log('\n[5] 폴백 — 잉크를 못 재는 적은 옛 근사로 떨어진다(바가 사라지지 않는다)');
  {
    const r = await cur.ev(() => {
      const e = window.__t442.mk('zombie');
      window.__t442.put(e, VW / 2, VH * 0.62);
      const real = eBarBox(e).y;
      const keep = e.akey;
      e.akey = '__nope__';                                  /* 아틀라스가 없는 적 */
      const fb = eBarBox(e).y;
      e.akey = keep;
      return { real: +real.toFixed(1), fb: +fb.toFixed(1), old: +(e.y - e.r * 3.1 - 6).toFixed(1),
               finite: isFinite(fb) };
    });
    if (r.__err) no('[5] 평가 실패 — ' + r.__err);
    else {
      is(r.finite, '[5-a] 아틀라스가 없어도 바 y 가 유한하다 (' + r.fb + ')');
      is(Math.abs(r.fb - r.old) < 0.001, '[5-b] 그 값이 옛 근사(e.y − e.r*3.1 − 6 = ' + r.old + ')와 같다');
    }
  }

  /* ═══ [6] 348 규약 회귀 ═════════════════════════════════════════════════════ */
  console.log('\n[6] 348 규약 — 같은 한 줄을 442 가 지난다');
  {
    const r = await cur.ev(() => {
      const e = window.__t442.mk('zombie');
      /* 화면 밖(좌 −200) 에서는 348 이 그리기 자체를 막는다 */
      window.__t442.put(e, -200, VH / 2);
      const off = eOnScreen(e);
      /* 사이드 열 위 — 클램프가 여전히 민다 */
      const sb = sideBox;
      if (!sb) return { err: 'sideBox null' };
      const top = Math.max(sb.y1 + 8, Math.min(sb.y2 - 8, VH / 2));
      window.__t442.put(e, 30, top);
      const dy = eBarBox(e).y - e.y;
      window.__t442.put(e, 30, top - dy);
      const b = eBarBox(e);
      return { off, x0: +(b.x + camOx).toFixed(1), x2: +sb.x2.toFixed(1), by: +(b.y + camOy).toFixed(1),
               y1: +sb.y1.toFixed(1), y2: +sb.y2.toFixed(1) };
    });
    if (r.__err || r.err) no('[6] ' + (r.__err || r.err));
    else {
      is(r.off === false, '[6-a] 화면 밖(좌 −200) 적은 348 판정이 여전히 false');
      is(r.by > r.y1 - 8 && r.by < r.y2 + 8,
         '[전제 6-b] 표본의 바 상변 ' + r.by + ' 이 사이드 열 띠 ' + r.y1 + '..' + r.y2 + ' 안이다');
      is(r.x0 >= r.x2, '[6-b] 사이드 열 위 적의 바 좌변 ' + r.x0 + ' ≥ 열 우변 ' + r.x2);
    }
  }

  /* ═══ [R] 되돌림 시험 ═══════════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 무르게 푼 수리가 아님을 사본이 못박는다');
  {
    if (!fs.existsSync(revPath)) no('[R①] 사본을 못 만들었다 — 앵커 한 줄이 바뀌었다(' + ANCHOR + ' 없음)');
    else {
      const nc = await open(ctx, 'file://' + revPath);
      if (nc.dim && nc.dim.__err) no('[R①] 사본 하네스 실패 — ' + nc.dim.__err);
      else {
        const r = await nc.ev(ENTER, ['gold']);
        if (r.__err || r.err) no('[R①] 사본 던전 실패 — ' + (r.__err || r.err));
        else is(r.gap > GAP_HI,
           '[R①] 옛 앵커 사본에서 gold 빈 배경 ' + r.gap.toFixed(1) + 'px > 규약 ' + GAP_HI +
           ' (0 이면 [2] 는 헛초록이다)');
      }
      await nc.page.close();
    }
    if (!fs.existsSync(nocPath)) no('[R②] 사본을 못 만들었다');
    else {
      const nc = await open(ctx, 'file://' + nocPath);
      if (nc.dim && nc.dim.__err) no('[R②] 사본 하네스 실패 — ' + nc.dim.__err);
      else {
        const e0 = await nc.ev(ENTER, ['gold']);
        if (e0.__err || e0.err) no('[R②] 사본 던전 실패 — ' + (e0.__err || e0.err));
        else {
          const r = await nc.ev(clampSpec, [[0.10, 0.16]]);
          if (r.__err || r.err) no('[R②] ' + (r.__err || r.err));
          else {
            const worst = Math.min.apply(null, r.out.map((o) => o.sy));
            is(worst < r.hb, '[R②] 클램프를 뺀 사본에서 바 화면y 최소 ' + worst.toFixed(1) +
               ' < HUD 하변 ' + r.hb + ' (파고든다 = [4] 가 헛초록이 아니다)');
          }
        }
      }
      await nc.page.close();
    }
  }

  console.log('\n[7] 콘솔/페이지 오류');
  is(cur.errs.length === 0, '[7] 콘솔·페이지 오류 0건 — 실제 ' + cur.errs.length +
     (cur.errs.length ? ' (' + cur.errs.slice(0, 2).join(' | ') + ')' : ''));

  await browser.close();
  console.log('\nVERIFY442 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
