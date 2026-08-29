#!/usr/bin/env node
/* 작업 386 재현기 — 잠금 던전/아레나 카드 썸네일이 «어느 위상에» 굳는가
 *
 *   node tools/probe386.js
 *
 * 왜 재현부터인가(338·341·350·363 규칙): 등재문은 356 5회차 두 비평가의 값을 확정으로 박아 뒀지만
 * 그 값은 **찍힌 픽셀 차분**에서 나온 것이라 «무엇이 그 값을 만드는가» 는 안 적혀 있었다.
 * 갈래가 셋(ⓐ 잠금 카드를 축 안으로 · ⓑ 의도된 연출로 명문화 · ⓒ TOL 을 내려 스캐너가 보게)인데
 * 그 선택은 **굳은 값이 설계인가 우연인가**에 달려 있다. 그래서 이 자는 픽셀이 아니라
 * 애니메이션 자신에게 직접 묻는다(임계값·마스크가 없으니 356 5회차가 겪은 «잘림을 늘어남으로 오독» 류가 구조적으로 불가능하다).
 *
 * ── 수리 전 실측(두 번의 독립 실행에서 재현 · 등재문 수치와 일치) ──────────────────
 *   고대 유적 0.995823(−0.418%) · 잊힌 신전 0.996878(−0.312%) · 용의 무덤 0.999907(−0.009%)
 *   유물석 0.995856 · 단련석 0.995421 · 룬강화석 0.999665 · 아레나 `.arn-op` 0.994331(−0.567%)
 *   ⚑ **그리고 등재문이 몰랐던 것 둘**:
 *     ① 굳는 자리는 «착지 웅크림 키프레임» 이 아니다. `currentTime` 은 0 인데 **효과 진행률**은
 *        0.1705 / 0.2434 / 0.5000 … 으로 카드마다 다르다 — `bgmVars` 가 카드별 **음수 delay**(`--thd`)로
 *        위상을 벌려 놓기 때문이고, 굳은 값은 두 키프레임 **사이의 보간**이다.
 *        ⇒ 용의 무덤이 거의 안 눌린 것은 설계가 아니라 **위상 운**이다. 값이 우연이면 갈래 ⓑ 는 성립하지 않는다.
 *     ② 같은 이유로 `translate` 도 굳는다 — 잠금 카드가 −1.18 / −2.52 / … px 만큼 **떠 있었다**
 *        (72 가 계산한 잉크 앵커에서 그만큼 벗어난 자리).
 *   그리고 «해금 카드는 평균이 1 로 수렴한다» 도 반만 맞다 — 한 바퀴 시간 평균은 **0.9953** 이다.
 *   해금 카드에서 그 눌림이 결함이 아닌 이유는 «평균이 1» 이라서가 아니라 **움직임으로 읽히기 때문**이고,
 *   정지한 카드에는 그 변명이 없다. 그것이 이 작업의 판정 근거다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

/* 카드별 상태 — 캔버스에 실제로 적용된 개별 변환 `scale`/`translate` 를 읽는다.
   (thBob 은 `scale:1 var(--thsqA)` 로 **세로만** 누르므로 sy 하나가 왜곡 전부다) */
const READ = function () {
  const out = [];
  for (const cv of document.querySelectorAll('#dunw .dnc>.th>canvas')) {
    const card = cv.closest('.dnc');
    const cs = getComputedStyle(cv);
    const an = cv.getAnimations()[0];
    const sc = (cs.scale || '').trim();          /* "1 0.9958" | "none" | "1" */
    const parts = sc === 'none' || !sc ? [1, 1] : sc.split(/\s+/).map(Number);
    const tr = (cs.translate || '').trim();
    const ty = tr === 'none' || !tr ? 0 : parseFloat((tr.split(/\s+/)[1] || '0'));
    out.push({
      id: (card.className.match(/bgm-[\w]+/) || ['?'])[0] + (cv.className ? ' ' + cv.className : ''),
      lkd: card.classList.contains('lkd'),
      play: cs.animationPlayState,
      name: cs.animationName,
      dly: cs.animationDelay,
      dur: an ? Math.round(an.effect.getComputedTiming().duration) : null,
      ct: an ? +Number(an.currentTime || 0).toFixed(1) : null,
      prog: an ? +Number(an.effect.getComputedTiming().progress || 0).toFixed(4) : null,
      sx: +parts[0].toFixed(6), sy: +(parts.length > 1 ? parts[1] : parts[0]).toFixed(6),
      ty: +ty.toFixed(2),
      sqA: cv.style.getPropertyValue('--thsqA').trim(),
      anims: cv.getAnimations().length,
    });
  }
  return out;
};

/* 해금 카드의 «한 바퀴» — 위상을 직접 밀어 스쿼시의 시간 평균을 낸다 */
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
  const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
  return { avg: +avg.toFixed(6), min: +Math.min(...ys).toFixed(6), max: +Math.max(...ys).toFixed(6), n: ys.length };
};

const row = c => `   ${c.lkd ? '🔒' : '  '} ${c.id.padEnd(22)} ${c.name.padEnd(8)} ${c.play.padEnd(7)} ` +
  `delay=${String(c.dly).padStart(7)} 진행률=${String(c.prog).padStart(6)}  scale=${c.sx} ${c.sy} ` +
  `(세로 ${((c.sy - 1) * 100).toFixed(3)}%)  ty=${c.ty}`;

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(1400);
  await p.click('.tab[data-t="adv"]').catch(() => {});
  await p.waitForTimeout(1000);

  let pass = 0, fail = 0;
  const ck = (n, got, want) => {
    const ok = String(got) === String(want);
    ok ? pass++ : fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : `  got ${got} / want ${want}`}`);
  };

  console.log('[probe386] 잠금 카드 썸네일 — 굳은 위상 · 굳은 포즈\n');

  const dun = await p.evaluate(READ);
  console.log('── 03 던전 리스트');
  dun.forEach(c => console.log(row(c)));

  await p.click('#dunSub [data-dsub="raid"]').catch(() => {});
  await p.waitForTimeout(900);
  const raid = await p.evaluate(READ);
  console.log('\n── 03 레이드/아레나');
  raid.forEach(c => console.log(row(c)));

  await p.click('#dunSub [data-dsub="dun"]').catch(() => {});
  await p.waitForTimeout(700);
  const sweep = await p.evaluate(SWEEP, 14);
  console.log(`\n── 해금 카드 한 바퀴(${sweep.n} 표본) : 평균 ${sweep.avg} · 최소 ${sweep.min} · 최대 ${sweep.max}`);

  const all = dun.concat(raid);
  const lk = all.filter(c => c.lkd), live = all.filter(c => !c.lkd);

  console.log('\n[A] 전제 — 잠금 카드가 실제로 «정지» 다 (121 지시 ④). 이 절이 빨가면 아래는 물어 볼 필요가 없다');
  ck('잠금 카드 ≥ 3장', lk.length >= 3, true);
  ck('잠금 카드는 전부 paused', lk.every(c => c.play === 'paused'), true);
  ck('해금 카드는 전부 running', live.every(c => c.play === 'running'), true);
  ck('잠금 카드도 애니는 1개 · 주기 3~5s (121 §2 불변)',
    lk.every(c => c.anims === 1 && c.dur >= 3000 && c.dur <= 5000), true);

  console.log('\n[B] 굳는 «자리» 는 키프레임이 아니라 위상 운이다 — 갈래 ⓑ(의도된 연출)를 기각한 근거');
  ck('잠금 카드의 currentTime 은 전부 0', lk.every(c => c.ct === 0), true);
  ck('그런데 효과 진행률은 0 이 아니다(음수 delay)', lk.every(c => c.prog > 0), true);
  ck('진행률이 카드마다 다르다', new Set(lk.map(c => c.prog)).size > 1, true);
  console.log(`     잠금 카드 진행률 = ${lk.map(c => c.prog).join(' / ')}`);

  console.log('\n[C] 수리 확인 — 정지 카드는 «기준 포즈» 에 선다 (scale 1 1 · translate 0)');
  ck('잠금 카드 scaleY = 1 (전부)', lk.every(c => Math.abs(c.sy - 1) < 1e-6), true);
  ck('잠금 카드 scaleX = 1 (전부)', lk.every(c => Math.abs(c.sx - 1) < 1e-6), true);
  ck('잠금 카드가 안 떠 있다 (translate y = 0)', lk.every(c => Math.abs(c.ty) < 0.01), true);
  ck('잠금 카드만 thStill 을 탄다', lk.every(c => c.name === 'thStill'), true);

  console.log('\n[D] 연출은 살아 있다 — 해금 카드는 여전히 눌리고 뛴다 (수리가 «연출을 껐다» 가 아님)');
  ck('해금 카드는 thBob 그대로', live.every(c => c.name === 'thBob'), true);
  ck('한 바퀴 안에 눌린 위상이 있다', sweep.min < 0.99, true);
  ck('한 바퀴 안에 scaleY=1 위상이 있다', Math.abs(sweep.max - 1) < 1e-6, true);
  console.log(`     ⚑ 한 바퀴 «시간 평균» 은 ${sweep.avg} — 등재문의 «해금은 평균이 1» 은 반만 맞다`);

  console.log('\n[E] 되돌림 시험 — 옛 이름을 도로 심으면 등재문의 수치가 그대로 돌아온다');
  await p.addStyleTag({ content: '#dunw .dnc.lkd>.th>canvas{animation-name:thBob !important}' });
  await p.waitForTimeout(200);
  const back = await p.evaluate(READ);
  const bl = back.filter(c => c.lkd);
  const worst = bl.reduce((a, c) => (Math.abs(c.sy - 1) > Math.abs(a.sy - 1) ? c : a), bl[0]);
  console.log(`     되돌린 잠금 카드 scaleY = ${bl.map(c => c.sy).join(' / ')}`);
  ck('되돌리면 눌린 잠금 카드가 생긴다', bl.some(c => c.sy < 0.9999), true);
  ck('되돌린 최악 자리가 −0.3% 보다 심하다', Math.abs(worst.sy - 1) > 0.003, true);
  ck('그래도 356 의 TOL(2%) 안이다 — 스캐너가 못 보던 이유', Math.abs(worst.sy - 1) < 0.02, true);
  ck('되돌리면 다시 떠 있다(translate ≠ 0)', bl.some(c => Math.abs(c.ty) > 0.5), true);

  console.log('\n[F] 콘솔');
  ck('pageerror 0건', errs.length, 0);

  console.log(`\n[probe386] ${pass}/${pass + fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
