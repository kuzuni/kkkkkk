/* 작업 114 — 20회차 프로브: **데미지 배지 크기가 피해량과 같은 방향으로 가는가**
 *
 * 19회차 BC[9]·BD[17] 2인 공통(수치까지 일치):
 *   «727(boom) 배지가 34(impact) 배지보다 **작다**» — 크기가 «치명타 플래그» 만 반영하고
 *   피해량의 자릿수를 통째로 무시해서, «큰 배지 = 큰 피해» 라는 약속이 거꾸로 뒤집혀 있었다.
 *
 * 처방(두 사람 합집합): BD «잉크 높이를 log10(damage) 3단계(8/11/14 게임px) · 치명타 +2» +
 *                       BC «치명타 배율을 1.30 이내로 묶고 자릿수는 폭만».
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * ⚠ 수식을 베끼면 순환 논증이다(19회차 probe114l 이 세운 규칙). `fillText` 를 감싸
 * **실제로 그려진 폰트**를 가로채고, 그 폰트로 `measureText` 의 `actualBoundingBox` 를 재
 * **화면에 찍힌 잉크 높이**를 얻는다. 게임 `draw()` 를 그대로 한 프레임 돌린다.
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. 단조 — 34 < 727 < 12000 의 잉크 높이가 **엄격히 커진다** (BC[9]·BD[17] 회귀 방지)
 *   B. «치명타 34» 가 «비치명 727» 보다 크지 않다 — 두 사람이 잡은 그 역전이 사라졌는가
 *   C. 자릿수 3단계의 잉크 높이가 BD 처방 8/11/14 게임px 와 ±1.0 안에서 일치
 *   D. 치명타 배율이 전 자릿수에서 **1.30 이하** (BC 처방)
 *   E. 외곽선이 폰트에 비례한다 — 두께/폰트 편차 ≤ 0.02 (고정 5px 이 만들던 44%↔25% 격차)
 *
 * ⚠ BD 의 «치명타 +2 게임px» 는 잉크 상수로 넣지 않았다 — 치명타는 이미 `pop` 이 6회차 R④ 의
 *   결정대로 1.30배에 안착하므로, 상수를 또 더하면 실측 배율이 1.63 이 돼 BC 처방을 정면으로 깬다.
 *   8×1.30 = 10.4 라 BD 가 원한 «10» 도 pop 하나로 그대로 나온다(이 프로브의 B·D 가 그것을 잰다).
 *
 * 실행: node tools/probe114o.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

async function run(p) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async () => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));

    const out = { err: [], rows: [] };
    const C = CanvasRenderingContext2D.prototype;
    const rawFill = C.fillText, rawStroke = C.strokeText;
    let cap = [];
    /* 그려진 «글자 + 폰트 + 외곽선 두께» 를 그대로 받아 적는다 */
    C.fillText = function (t, x, y) {
      cap.push({ t: String(t), font: this.font, lw: this.lineWidth });
      return rawFill.apply(this, arguments);
    };

    /* 폰트 문자열 그대로로 잉크(캡) 높이를 잰다 — 실제 서체가 답을 준다 */
    const mc = document.createElement('canvas').getContext('2d');
    /* ⚠ ascent 만 쓴다 — 천 단위 쉼표(`,`)가 baseline 아래로 3px 내려가 descent 를 더하면
       «12,000» 만 잉크가 3px 부풀어 자릿수 규격을 못 잰다(숫자 글리프에는 descent 가 없다). */
    const ink = (font, txt) => { mc.font = font; return mc.measureText(txt).actualBoundingBoxAscent || 0; };

    function board() {
      sbufClear();
      skillCd = {}; shots.length = 0; rings.length = 0; parts.length = 0; nums.length = 0;
      enemies.length = 0; spawnQ.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
    }

    /* 한 장면에 배지 하나만 띄우고 한 프레임 그린다 — 여러 장을 한꺼번에 띄우면
       `dmgNum` 의 병합·겹침 회피가 값을 합쳐 «어느 배지가 어느 값인지» 가 흐려진다 */
    function shot(v, crit) {
      board();
      cap = [];
      dmgNum(player.x + 60, player.y - 30, v, !!crit);
      const n = nums[nums.length - 1];
      n.t = NUM_LIFE * 0.62;     /* 팝(pop)이 1.0 으로 안착한 뒤 = «정지 크기» 구간에서 잰다 */
      n.a = n.t;
      draw();
      const hit = cap.filter(c => c.t === n.v);
      if (!hit.length) return null;
      const c = hit[hit.length - 1];
      return { v: v, crit: crit ? 1 : 0, txt: c.t, font: c.font, lw: +c.lw.toFixed(2), ink: +ink(c.font, c.t).toFixed(2) };
    }

    try {
      const CASES = [[5, 0], [34, 0], [34, 1], [150, 0], [727, 0], [727, 1], [12000, 0], [12000, 1]];
      for (const [v, cr] of CASES) {
        const r = shot(v, cr);
        if (r) out.rows.push(r); else out.err.push('배지를 못 그렸다: ' + v + (cr ? ' crit' : ''));
      }
    } catch (e) { out.err.push('' + e); }

    C.fillText = rawFill; C.strokeText = rawStroke;
    return out;
  });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const o = await run(p);
  await b.close();
  o.err.forEach(e => errs.push(e));

  const R = o.rows || [];
  const get = (v, c) => R.find(r => r.v === v && r.crit === c);
  const inkOf = (v, c) => { const r = get(v, c); return r ? r.ink : NaN; };

  console.log('\n== 20회차 프로브 — 데미지 배지가 피해량과 같은 방향으로 가는가 ==');
  console.log('   피해   치명타   그려진 폰트                    잉크(게임px)  외곽선');
  for (const r of R) {
    console.log('  ' + String(r.v).padStart(6) + '   ' + (r.crit ? ' ✔ ' : ' – ') + '     ' +
      r.font.padEnd(28) + ' ' + r.ink.toFixed(2).padStart(6) + '      ' + r.lw.toFixed(2) + '   «' + r.txt + '»');
  }

  const i34 = inkOf(34, 0), i727 = inkOf(727, 0), i12k = inkOf(12000, 0);
  const c34 = inkOf(34, 1), c727 = inkOf(727, 1), c12k = inkOf(12000, 1);
  /* 배율은 **그려진 폰트 크기**로 재고(정확), 자릿수 규격은 잉크로 잰다(브라우저가 정수로 양자화한다) */
  const px = (v, c) => { const r = get(v, c); return r ? parseFloat(r.font.match(/([\d.]+)px/)[1]) : NaN; };
  const critK = [px(34, 1) / px(34, 0), px(727, 1) / px(727, 0), px(12000, 1) / px(12000, 0)];
  const tiers = [i34, i727, i12k], want = [8, 11, 14];
  const dev = tiers.map((t, i) => Math.abs(t - want[i]));
  /* 외곽선 / 잉크 비 — 자릿수가 갈려도 같은 비율이어야 «한 벌» 로 읽힌다 */
  /* 잰 프레임이 «안착» 구간이라 그려진 폰트 크기가 곧 szRest 다 — 그대로 나눈다 */
  const lwK = R.map(r => r.lw / parseFloat(r.font.match(/([\d.]+)px/)[1]));
  const lwSpread = lwK.length ? Math.max(...lwK) - Math.min(...lwK) : 999;

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(R.length === 8, '표본 8건이 다 잡혔는가 — ' + R.length + '건');
  ok(i34 < i727 && i727 < i12k,
    'A. 단조 증가 — 34 ' + i34.toFixed(2) + ' < 727 ' + i727.toFixed(2) + ' < 12000 ' + i12k.toFixed(2) + ' 게임px');
  ok(c34 <= i727,
    'B. «치명타 34»(' + c34.toFixed(2) + ') 가 «비치명 727»(' + i727.toFixed(2) +
    ') 을 안 넘는다 — BC[9]·BD[17] 이 잡은 역전');
  ok(Math.max(...dev) <= 1.0,
    'C. 자릿수 3단계가 BD 처방 8/11/14 와 일치 — 실측 ' + tiers.map(t => t.toFixed(2)).join(' · ') +
    ' (최대 편차 ' + Math.max(...dev).toFixed(2) + ' ≤ 1.0)');
  ok(Math.max(...critK) <= 1.30,
    'D. 치명타 배율 ≤ 1.30 (BC 처방) — 실측 ' + critK.map(k => k.toFixed(3)).join(' · '));
  ok(lwSpread <= 0.02,
    'E. 외곽선이 글자에 비례 — 두께/안착폰트 편차 ' + lwSpread.toFixed(4) + ' ≤ 0.02');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114O ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
