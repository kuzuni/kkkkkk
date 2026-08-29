#!/usr/bin/env node
/* 게이트 — 작업 386 «정지한 썸네일은 기준 포즈에 선다»
 *
 *   node tools/verify386.js
 *
 * 묻는 것은 세 가지고, 셋이 같이 서 있어야 한다:
 *   [1] 정지 카드(.lkd)의 굳은 포즈가 **scale 1 1 · translate 0** 이다 — 356 축(원본 비율)과
 *       72 축(잉크 앵커)을 둘 다 지키는 유일한 포즈.
 *   [2] 그러느라 **연출을 끄지 않았다** — 해금 카드는 여전히 `thBob` 을 타고 한 바퀴 안에 눌림이 있다.
 *       (이 절이 없으면 «썸네일 애니를 통째로 지워도 초록인 게이트» 가 된다 — 328~330·356 교훈)
 *   [3] **121 §2 가 묻던 것이 한 항도 안 죽었다** — 잠금은 paused · 애니 1개 · 주기 3~5s ·
 *       아레나 두 칸의 delay 가 다르다. (386 의 처방이 `--thd:0s` 가 아니라 «다른 키프레임» 인 이유)
 *
 * §R 되돌림 시험 — 옛 이름(`thBob`)을 도로 심으면 [1] 이 빨개진다. 음성항(주입 «전» 0건)을 같이 센다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${m}`); };
const sec = t => console.log(`\n${t}`);

const READ = function () {
  const out = [];
  for (const cv of document.querySelectorAll('#dunw .dnc>.th>canvas')) {
    const card = cv.closest('.dnc');
    const cs = getComputedStyle(cv);
    const an = cv.getAnimations()[0];
    const sc = (cs.scale || '').trim();
    const parts = sc === 'none' || !sc ? [1, 1] : sc.split(/\s+/).map(Number);
    const tr = (cs.translate || '').trim();
    const ty = tr === 'none' || !tr ? 0 : parseFloat((tr.split(/\s+/)[1] || '0'));
    const r = cv.getBoundingClientRect();
    out.push({
      id: (card.className.match(/bgm-[\w]+/) || ['?'])[0] + (cv.className ? ' ' + cv.className : ''),
      lkd: card.classList.contains('lkd'), arena: !!card.dataset.arena,
      play: cs.animationPlayState, name: cs.animationName, dly: cs.animationDelay,
      dur: an ? Math.round(an.effect.getComputedTiming().duration) : null,
      anims: cv.getAnimations().length,
      sx: +parts[0].toFixed(6), sy: +(parts.length > 1 ? parts[1] : parts[0]).toFixed(6),
      ty: +ty.toFixed(2),
      /* 그려진 상자 ↔ 레이아웃 상자 — scale 이 실리면 여기서 갈린다(transform 무관한 offsetHeight 와 대조) */
      drawnH: +r.height.toFixed(2), boxH: cv.offsetHeight,
      drawnW: +r.width.toFixed(2), boxW: cv.offsetWidth,
    });
  }
  return out;
};

const SWEEP = function (n) {
  const cv = document.querySelector('#dunw .dnc:not(.lkd)>.th>canvas');
  if (!cv) return null;
  const an = cv.getAnimations()[0];
  if (!an) return null;
  const dur = an.effect.getComputedTiming().duration;
  const was = an.currentTime, wasP = an.playState;
  an.pause();
  const ys = [];
  for (let i = 0; i < n; i++) {
    an.currentTime = dur * i / n;
    const sc = (getComputedStyle(cv).scale || '').trim();
    const p = sc === 'none' || !sc ? [1, 1] : sc.split(/\s+/).map(Number);
    ys.push(p.length > 1 ? p[1] : p[0]);
  }
  an.currentTime = was;
  if (wasP === 'running') an.play();
  return { min: +Math.min(...ys).toFixed(6), max: +Math.max(...ys).toFixed(6) };
};

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.tab[data-t="adv"]').catch(() => {});
  await p.waitForTimeout(1000);

  const dun = await p.evaluate(READ);
  await p.click('#dunSub [data-dsub="raid"]').catch(() => {});
  await p.waitForTimeout(900);
  const raid = await p.evaluate(READ);
  await p.click('#dunSub [data-dsub="dun"]').catch(() => {});
  await p.waitForTimeout(700);
  const sweep = await p.evaluate(SWEEP, 14);

  const all = dun.concat(raid);
  const lk = all.filter(c => c.lkd), live = all.filter(c => !c.lkd);

  console.log('[verify386] 정지한 썸네일은 기준 포즈에 선다');

  sec('[전제] 표본 — 03 던전·레이드에 잠금 카드와 해금 카드가 둘 다 있다');
  ok(dun.length >= 6, `던전 썸네일 ${dun.length}장 (≥6)`);
  ok(raid.length >= 3, `레이드/아레나 썸네일 ${raid.length}칸 (≥3)`);
  ok(lk.length >= 3, `잠금 ${lk.length}칸 · 해금 ${live.length}칸 (양쪽 다 ≥1)`);
  ok(live.length >= 1, `해금 칸 ${live.length}개 — [2] 를 물을 표본이 있다`);

  sec('[1] 정지 포즈 — scale 1 1 · translate 0 (356 원본 비율 + 72 잉크 앵커)');
  lk.forEach(c => {
    ok(Math.abs(c.sy - 1) < 1e-6 && Math.abs(c.sx - 1) < 1e-6,
      `${c.id} 굳은 scale ${c.sx} ${c.sy} = 1 1 (세로 ${((c.sy - 1) * 100).toFixed(3)}%)`);
    ok(Math.abs(c.ty) < 0.01, `${c.id} 굳은 translate y ${c.ty} = 0 (안 떠 있다)`);
  });
  ok(lk.every(c => Math.abs(c.drawnH - c.boxH) < 0.02 && Math.abs(c.drawnW - c.boxW) < 0.02),
    `잠금 칸의 «그려진 상자» = «레이아웃 상자» (${lk.map(c => `${c.drawnW}×${c.drawnH}`).join(' ')})`);
  ok(lk.every(c => c.name === 'thStill'), `잠금 칸은 정지 포즈 키프레임을 탄다 (${[...new Set(lk.map(c => c.name))].join(',')})`);

  sec('[2] 연출은 안 껐다 — 해금 카드는 그대로 눌리고 뛴다 (이 절이 없으면 «지워도 초록» 이다)');
  ok(live.every(c => c.name === 'thBob'), `해금 칸은 thBob (${[...new Set(live.map(c => c.name))].join(',')})`);
  ok(!!sweep && sweep.min < 0.99, `해금 한 바퀴에 눌린 위상이 있다 (최소 ${sweep && sweep.min})`);
  ok(!!sweep && Math.abs(sweep.max - 1) < 1e-6, `해금 한 바퀴에 안 눌린 위상도 있다 (최대 ${sweep && sweep.max})`);

  sec('[3] 121 §2 가 묻던 것이 한 항도 안 죽었다 (처방이 --thd:0s 가 아닌 이유)');
  ok(lk.every(c => c.play === 'paused'), '잠금 칸 전부 paused (121 지시 ④)');
  ok(live.every(c => c.play === 'running'), '해금 칸 전부 running');
  ok(all.every(c => c.anims === 1), `모든 칸의 썸네일 애니 1개 (${[...new Set(all.map(c => c.anims))].join(',')})`);
  ok(all.every(c => c.dur >= 3000 && c.dur <= 5000), `주기 전부 3~5s (${[...new Set(all.map(c => c.dur))].join(',')}ms)`);
  const arn = raid.filter(c => c.arena);
  ok(arn.length === 2, `아레나 칸 ${arn.length}개`);
  ok(new Set(arn.map(c => c.dly)).size === 2, `아레나 두 칸의 들썩 위상(delay)이 다르다 (${arn.map(c => c.dly).join(' ')})`);

  sec('[R] 되돌림 시험 — 옛 이름을 도로 심으면 [1] 이 빨개진다');
  ok(lk.filter(c => Math.abs(c.sy - 1) > 1e-6).length === 0, '[R 음성항] 주입 «전» 눌린 잠금 칸 0개');
  await p.addStyleTag({ content: '#dunw .dnc.lkd>.th>canvas{animation-name:thBob !important}' });
  await p.waitForTimeout(200);
  const back = (await p.evaluate(READ)).filter(c => c.lkd);
  const bad = back.filter(c => Math.abs(c.sy - 1) > 1e-6);
  ok(bad.length >= 4, `[R-a] 되돌리면 눌린 잠금 칸 ${bad.length}개 (≥4) — ${back.map(c => c.sy).join(' / ')}`);
  ok(back.some(c => Math.abs(c.ty) > 0.5), `[R-b] 되돌리면 떠 있는 칸이 생긴다 (ty ${back.map(c => c.ty).join('/')})`);
  ok(bad.every(c => Math.abs(c.sy - 1) < 0.02), '[R-c] 그 어긋남은 356 TOL(2%) 안이다 — 스캐너가 못 보던 이유');

  sec('[콘솔]');
  ok(errs.length === 0, `pageerror ${errs.length}건`);

  console.log(`\n[verify386] ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
