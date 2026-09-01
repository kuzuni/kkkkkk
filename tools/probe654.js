/* 작업 654 — 재현(338 규칙: 등재문의 처방을 따르기 **전에** 실제로 찍힌 것부터 본다).
 *
 * 주인 보고(2026-09-01 23:05): «골드 획득 이펙트 하지말라했는데 보스 끝났더니 뜨더라».
 *
 * 등재문의 가설 둘 — 이 자가 가른다:
 *   ⓐ 보스 격파/클리어의 «보너스 골드» 가 592 의 표에서 **켜진 채**다
 *      (`FX_COMBAT_FX.stageClear` / `.waveBonus` = true) ⇒ 전투 발 코인이 그대로 난다.
 *   ⓑ 던전·탑 «클리어 보상» 이 512 의 `fxReward` 경로를 타서 골드를 그린다
 *      (`giveReward` → `fxReward(null, ['gold'])`).
 *
 * 씬 넷 — 전부 «골드 연출 노드가 몇 개 태어나는가» 하나로 잰다:
 *   [A] 스테이지 보스 격파 → 클리어 보너스        (가설 ⓐ ⑵)
 *   [B] 파도 전멸 보너스(S.bossFarm 대기 중)      (가설 ⓐ ⑶)
 *   [C] 던전 «황금 동굴» 클리어 보상               (가설 ⓑ)
 *   [D] 잡몹 킬 드랍                               (592 가 이미 끈 자리 = 음성 대조)
 *   [E] 비전투 수령(우편 골드) — 512 연출이 **살아 있어야** 한다(경계 표본)
 *
 * 실행: node tools/probe654.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 씬 공용 하네스 — «관찰을 켜고 → 사건을 일으키고 → 창이 닫힐 때까지 본다».
   골드 연출 노드는 `#fxl`(UI 발 · 팝업 위) 또는 `#fxlc`(전투 발 · 팝업 아래)에 태어난다.
   ⚠ `fx-fly` 는 재화별 클래스가 아니라 인라인 배경으로 갈리므로 «어느 재화인가» 는
     `fxAcc`/`fxAccSrc` 가 아니라 **노드에 남는 데이터**로 봐야 한다 —
     여기서는 골드만 움직이는 씬을 만들어 «태어난 비행 수» 자체를 그 답으로 쓴다. */
const SCENE = `async ({ scene, ms }) => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const sleep = t => new Promise(r => setTimeout(r, t));
  const clear = () => document.querySelectorAll('#fxl > *, #fxlc > *').forEach(n => n.remove());

  /* 앞선 묶음이 완전히 가라앉기를 기다린다(fxAcc·fxHold 창이 최대 2000ms) */
  S.bossFarm = true;                    /* 273 — 대기 상태: 새 보스전이 저절로 서지 않는다 */
  clear(); await sleep(1200); clear();

  const born = [];
  const layerOf = el => el.closest('#fxl') ? 'fxl' : (el.closest('#fxlc') ? 'fxlc' : '?');
  const mo = new MutationObserver(recs => {
    for (const rec of recs) for (const n of rec.addedNodes) {
      if (n.nodeType !== 1 || !n.classList) continue;
      if (n.classList.contains('fx-fly') || n.classList.contains('fx-plus') || n.classList.contains('fx-lit'))
        born.push({ cls: n.className, layer: layerOf(n), html: (n.innerHTML || '').slice(0, 120) });
    }
  });

  const g0 = S.gold;
  let note = '';

  if (scene === 'A') {
    /* 스테이지 보스 격파 — 보스를 세우고, 선 것을 확인한 뒤 죽인다.
       ⚠ 관찰은 «죽이기 직전» 에 켠다(보스 스폰 자체는 재화를 안 움직이지만 창을 좁게 잡는다). */
    startBoss();
    for (let i = 0; i < 240 && !enemies.some(e => e.tk === 'boss'); i++) await raf();
    const b = enemies.find(e => e.tk === 'boss');
    if (!b) return { err: '보스가 서지 않았다' };
    clear(); mo.observe(document.body, { childList: true, subtree: true });
    killEnemy(b);
    note = '보스 격파 → 475 시퀀스(die+홀드) → 클리어 보너스';
  } else if (scene === 'B') {
    /* 파도 전멸 보너스 — 대기(S.bossFarm) 중에 killed 를 채우면 다음 틱에 보너스가 떨어진다 */
    S.bossFarm = true; bossOn = false; stageWin = false;
    clear(); mo.observe(document.body, { childList: true, subtree: true });
    killed = ENEMY_COUNT;
    note = '파도 전멸 보너스(S.bossFarm 대기 중)';
  } else if (scene === 'C') {
    /* 던전 «황금 동굴» 클리어 보상 — rw(f) 가 골드인 유일한 던전이다 */
    const d = DUNGEONS.find(x => x.id === 'gold');
    if (!d) return { err: '황금 동굴 없음' };
    clear(); mo.observe(document.body, { childList: true, subtree: true });
    finishDunRun({ d, f: 1, auto: false }, true);
    note = '던전 클리어 보상 giveReward(' + JSON.stringify(d.rw(1)) + ')';
  } else if (scene === 'D') {
    /* 잡몹 킬 드랍 — 592 가 이미 끈 자리(음성 대조) */
    const m = enemies.find(e => e.tk !== 'boss' && e.tk !== 'dunboss');
    if (!m) return { err: '잡몹 없음' };
    clear(); mo.observe(document.body, { childList: true, subtree: true });
    killEnemy(m);
    note = '잡몹 킬 드랍(592 가 끈 자리)';
  } else if (scene === 'E') {
    /* 비전투 수령 — 512 연출이 살아 있어야 하는 경계 표본 */
    clear(); mo.observe(document.body, { childList: true, subtree: true });
    giveReward({ gold: 123456 });
    note = '비전투 수령 giveReward({gold})';
  }

  const t0 = performance.now();
  while (performance.now() - t0 < ms) await raf();
  mo.disconnect();

  const fly = born.filter(b => /fx-fly/.test(b.cls));
  return {
    note,
    gold: Math.round(S.gold - g0),
    fly: fly.length, flyL: [...new Set(fly.map(b => b.layer))],
    plus: born.filter(b => /fx-plus/.test(b.cls)).length,
    lit:  born.filter(b => /fx-lit/.test(b.cls)).length
  };
}`;

(async () => {
  console.log('\n=== probe654 — 보스 격파·클리어 골드 연출 재현 ===');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const out = {};
  /* 씬마다 **새 페이지**를 쓴다 — 앞 씬의 시퀀스(475 격파 홀드·332)가 다음 씬에 걸쳐 있으면
     «누가 쏜 코인인가» 가 섞인다(probe518 이 같은 이유로 씬을 갈랐다). */
  for (const s of ['A', 'B', 'C', 'D', 'E']) {
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(s + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(s + ': ' + String(e)));
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);
    /* ⚠ 문자열 씬은 `eval('(' + … + ')')` 로 **함수로 만들어** 넘긴다(probe592 머리말과 같은 함정) */
    out[s] = await p.evaluate(eval('(' + SCENE + ')'), { scene: s, ms: 6000 });
    console.log('  [' + s + '] ' + JSON.stringify(out[s]));
    await p.close();
  }

  const A = out.A, B = out.B, C = out.C, D = out.D, E = out.E;
  console.log('');
  ok(!A.err && A.gold > 0, '[1] 스테이지 보스 격파로 골드가 들어왔다 — +' + A.gold);
  console.log('  [i] [A] 코인 ' + A.fly + '개 ' + JSON.stringify(A.flyL) + ' · +n ' + A.plus + ' · 알약복제 ' + A.lit);
  console.log('  [i] [B] 코인 ' + B.fly + '개 ' + JSON.stringify(B.flyL) + ' · +n ' + B.plus + ' · 알약복제 ' + B.lit + ' (골드 +' + B.gold + ')');
  console.log('  [i] [C] 코인 ' + C.fly + '개 ' + JSON.stringify(C.flyL) + ' · +n ' + C.plus + ' · 알약복제 ' + C.lit + ' (골드 +' + C.gold + ')');
  ok(!D.err && D.fly === 0, '[2] 잡몹 킬 드랍은 이미 무음이다(592) — 코인 ' + D.fly + '개');
  ok(!E.err && E.fly > 0, '[3] 비전투 수령은 연출이 살아 있다(512 경계) — 코인 ' + E.fly + '개 ' + JSON.stringify(E.flyL));
  ok(errs.length === 0, '[4] 콘솔 에러 0건 — ' + JSON.stringify(errs.slice(0, 3)));

  console.log('\n  가설 판정: ⓐ(592 표가 켜진 채) = ' + ((A.fly > 0 || B.fly > 0) ? '**확인**' : '기각')
            + ' · ⓑ(클리어 보상이 512 경로) = ' + (C.fly > 0 ? '**확인**' : '기각'));

  await b.close();
  console.log('\n  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
