/* 작업 208 게이트 — «승급전 보스 = 그 승급이 주는 코스튬 모습 · 보스급 크기» 가 실제로 도는지 본다.
 *
 *   node tools/verify208.js
 *
 * 주인 지시(2026-08-27): «승급전 보스의 모습은 해당 코스튬 모습이어야 하고, 크기는 보스 크기여야 함».
 * T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 화면에 반영됨» 이어야
 * 완료다. 그래서 «승급전을 실제로 시작해서» 스폰된 개체의 T·틴트·그려진 크기·시체·연출을 전부 잰다.
 *
 * 검사 항목
 *   §1 외형   — 스폰된 수호자가 knight 아틀라스 · 애니 3종(idle/attack_A/die)이 실재하는가
 *   §2 코스튬 — e.tint 가 «이번 승급이 줄 코스튬»(179 미리보기가 쓰는 promoCos(ri)) 의 틴트와 같은가
 *               · 계급 1~7 전 칸에서 미리보기 ↔ 실전 수호자가 어긋나지 않는가
 *   §3 크기   — 그려진 높이가 28 스테이지 보스와 같은가(±1px) · 판정 반경이 보스 비(bossRK)로 환산됐는가
 *               · 플레이어보다 확실히 크다(≥3배)
 *   §4 실화면 — 전투 캔버스에 실제로 «그 색» 픽셀이 그려지는가(폴백 원이 아니라 스프라이트인가)
 *   §5 시체   — 처치 시체가 틴트·발밑 보정을 이어받는가(«죽는 순간 색이 벗겨짐» 회귀 방지)
 *   §6 연출   — 등장이 #fxlc(팝업 아래, 184) 에 붙는가 · 처치가 흔들림/처치음 경로를 타는가
 *               · 277 이후 승급전도 28 규격 보스 HUD(#stinfo.bfight · ⏱#bossTm · 체력바#bossHp)를 쓴다
 *                 — 옛 단언 «bfight 를 안 켠다» 는 277(모든 보스전 보스 UI 통일)이 뒤집었다
 *   §7 불변   — 두 번 연속 승급전을 열어도 배율이 누적되지 않는가(PROMO_BASE) · 다른 적은 안 바뀌는가
 *
 * ⚠ file:// 에서 아틀라스를 그린 캔버스는 «오염» 되어 getImageData 가 막힌다 —
 *   §4 가 픽셀을 읽으므로 `--allow-file-access-from-files` 로 띄운다(verify87·182 와 같은 이유).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';

/* 승급 조건(최고 스테이지 · 전투력)을 넉넉히 넘기는 세이브. 계급은 인자로 받는다. */
const saveFor = rank => ({
  rank, best: 9999, stage: 50, gold: 1e30, dia: 1e12, trainStage: 6,
  lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
});

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const near = (a, b, t) => Math.abs(a - b) <= t;

/* LESSONS 44-① — 세이브는 addInitScript 로 «페이지 스크립트보다 먼저» 심는다. */
async function openWith(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(1400);
  return { ctx, p, errs };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const { ctx, p, errs } = await openWith(browser, saveFor(0));

    /* ---------------- §1 외형 ---------------- */
    console.log('\n§1 외형 — 수호자가 플레이어와 같은 knight 아틀라스로 스폰된다');
    const s1 = await p.evaluate(() => {
      startPromo();
      const e = enemies.find(x => x.tk === 'promo');
      if (!e) return { spawned: false };
      /* 죽여 버리면 뒤 절이 못 재므로 불사로 만든다(체력은 §3 이 안 본다) */
      e.hp = e.max = 1e30;
      const A = ATLAS[e.T.atlas];
      return {
        spawned: true,
        atlas: e.T.atlas, walk: e.T.walk, atk: e.T.atk, die: e.T.die,
        hasWalk: !!(A && A.a && A.a[e.T.walk] && A.a[e.T.walk].length),
        hasAtk: !!(A && A.a && A.a[e.T.atk] && A.a[e.T.atk].length),
        hasDie: !!(A && A.a && A.a[e.T.die] && A.a[e.T.die].length),
        frameOK: !!curFrame(e),
        playerAtlas: 'knight',
        solo: !!SOLO_CHASER[e.tk],
        promoOn: !!promo
      };
    });
    ok(s1.spawned, '승급전 시작 → tk:promo 개체가 스폰된다');
    ok(s1.atlas === 'knight', '아틀라스 = knight(플레이어와 같은 몸) — 실제 ' + s1.atlas);
    ok(s1.atlas === s1.playerAtlas, '플레이어와 같은 아틀라스를 쓴다');
    ok(s1.hasWalk && s1.hasAtk && s1.hasDie,
      '애니 3종이 실재한다 — ' + s1.walk + '/' + s1.atk + '/' + s1.die
      + ' (' + s1.hasWalk + '/' + s1.hasAtk + '/' + s1.hasDie + ')');
    ok(s1.frameOK, 'curFrame() 이 프레임을 돌려준다(폴백 도형이 아니다)');
    ok(s1.solo, '172 SOLO_CHASER 예외가 그대로 걸려 있다(직진 추격)');
    ok(s1.promoOn, 'promo 진행 상태가 살아 있다');

    /* ---------------- §2 코스튬 ---------------- */
    console.log('\n§2 코스튬 — 179 미리보기 ↔ 실전 수호자가 같은 코스튬이다');
    const s2 = await p.evaluate(() => {
      const e = enemies.find(x => x.tk === 'promo');
      const ri = S.rank + 1, cos = promoCos(ri);
      return { tint: e && e.tint, col: e && e.T.col, cosId: cos && cos.id, cosTint: cos && cos.tint };
    });
    ok(!!s2.cosTint, '계급 1 의 대표 코스튬이 있다 — ' + s2.cosId + ' ' + s2.cosTint);
    ok(s2.tint === s2.cosTint, 'e.tint = 미리보기 코스튬 틴트 — ' + s2.tint + ' vs ' + s2.cosTint);
    ok(s2.col === s2.cosTint, 'T.col(스폰 링·처치 파편)도 같은 색 — ' + s2.col);

    /* 계급 1~7 전 칸: promoType 이 그 칸의 대표 코스튬 색을 집는가 (스폰 없이 표만 확인) */
    const s2b = await p.evaluate(() => {
      const out = [];
      for (let ri = 1; ri <= 7; ri++) {
        const cos = promoCos(ri), t = promoType(ri);
        out.push({ ri, cos: cos && cos.id, cosTint: cos && cos.tint, col: t.col });
      }
      return out;
    });
    s2b.forEach(r => ok(!!r.cosTint && r.col === r.cosTint,
      '계급 ' + r.ri + ' — promoType().col = ' + r.col + ' = 대표 코스튬 ' + r.cos + ' ' + r.cosTint));

    /* ---------------- §3 크기 ---------------- */
    console.log('\n§3 크기 — 그려진 높이가 28 스테이지 보스와 같다');
    const s3 = await p.evaluate(() => {
      const e = enemies.find(x => x.tk === 'promo');
      const f = dunBossFrame({ thk: e.T.atlas }, e.T.walk);
      const bf = bossFrame();
      const pf = ATLAS.knight.f[ATLAS.knight.a.idle[0]];
      return {
        h: f[3] * e.T.scale, w: f[2] * e.T.scale,
        bossH: bossDrawnH(), bossW: bf[2] * ETYPE.boss.scale,
        r: e.r, tr: e.T.r, bossR: ETYPE.boss.r,
        rWant: Math.round(f[2] * e.T.scale * bossRK()),
        playerH: pf[3] * 1.0, playerR: player.r,
        yo: e.T.yo, scale: e.T.scale
      };
    });
    ok(near(s3.h, s3.bossH, 1),
      '그려진 높이 = 보스 — ' + s3.h.toFixed(1) + ' vs ' + s3.bossH.toFixed(1) + 'px');
    ok(s3.h / s3.playerH >= 3,
      '플레이어보다 ≥3배 크다 — ×' + (s3.h / s3.playerH).toFixed(2)
      + ' (수호자 ' + s3.h.toFixed(1) + ' / 플레이어 ' + s3.playerH.toFixed(1) + 'px)');
    ok(s3.r === s3.rWant && s3.r >= 24 && s3.r <= 90,
      '판정 반경이 보스 비(bossRK)로 환산됐다 — r ' + s3.r + ' (기대 ' + s3.rWant + ' · 24~90 클램프)');
    ok(s3.r > s3.playerR * 2,
      '반경도 플레이어의 2배 초과 — ' + s3.r + ' vs ' + s3.playerR);
    ok(typeof s3.yo === 'number' && Math.abs(s3.yo) <= 20,
      '발밑 보정 yo 가 28 보스와의 «차이» 범위에 있다 — ' + s3.yo + 'px');

    /* ---------------- §4 실화면 ---------------- */
    console.log('\n§4 실화면 — 전투 캔버스에 그 코스튬 색 픽셀이 실제로 그려진다');
    await p.waitForTimeout(500);
    const s4 = await p.evaluate(() => {
      const e = enemies.find(x => x.tk === 'promo');
      if (!e) return { err: 'gone' };
      const cv = document.querySelector('#stage') || document.querySelector('canvas');
      const g = cv.getContext('2d');
      /* 전투 캔버스는 setTransform(2,…) 이므로 월드 좌표 → 캔버스 px 는 ×2 (카메라 오프셋 포함) */
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      const hex = (e.tint || '#000').replace('#', '');
      const tr = parseInt(hex.slice(0, 2), 16), tg = parseInt(hex.slice(2, 4), 16), tb = parseInt(hex.slice(4, 6), 16);
      /* 틴트는 multiply 라 원본보다 어두워진다 — «색 방향»(채널 대소 관계)으로 센다 */
      let hit = 0, tot = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        tot++;
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        if (r + gg + b < 40) continue;
        const domT = [tr, tg, tb].indexOf(Math.max(tr, tg, tb));
        const domP = [r, gg, b].indexOf(Math.max(r, gg, b));
        if (domT === domP && Math.max(r, gg, b) - Math.min(r, gg, b) > 24) hit++;
      }
      return { hit, tot, cw: cv.width, ch: cv.height, tint: e.tint };
    });
    ok(!s4.err, '수호자가 캔버스에 살아 있다');
    ok(s4.hit > 400,
      '틴트 방향(' + s4.tint + ')과 같은 픽셀이 캔버스에 ' + s4.hit + '개 (>400)');

    /* ---------------- §5 시체 ---------------- */
    console.log('\n§5 시체 — 처치 시체가 틴트·발밑 보정을 이어받는다');
    const s5 = await p.evaluate(() => {
      const e = enemies.find(x => x.tk === 'promo');
      const before = corpses.length;
      const shake0 = cam.shake;
      e.hp = 0; killEnemy(e);
      const c = corpses[corpses.length - 1];
      return {
        added: corpses.length - before,
        akey: c && c.akey, anim: c && c.anim, tint: c && c.tint,
        scale: c && c.scale, yo: c && c.yo,
        shook: cam.shake > shake0,
        stillPromo: !!promo
      };
    });
    ok(s5.added === 1, '시체가 1개 쌓인다');
    ok(s5.akey === 'knight' && s5.anim === 'die', '시체 애니 = knight/die — ' + s5.akey + '/' + s5.anim);
    ok(s5.tint === s2.cosTint, '시체가 틴트를 이어받는다 — ' + s5.tint + ' (기대 ' + s2.cosTint + ')');
    ok(typeof s5.yo === 'number', '시체가 발밑 보정을 이어받는다 — yo ' + s5.yo);

    /* ---------------- §6 연출 ---------------- */
    console.log('\n§6 연출 — 등장은 #fxlc(팝업 아래) · 처치는 흔들림 · 277 이후 bfight 를 켠다');
    ok(s5.shook, '처치가 cam.shake 를 올린다(보스 대접)');
    /* ⚑ 727 — 이 절은 «§5 에서 수호자를 잡은 직후» 에 `promo = null; enemies.length = 0` 로
       상태를 손수 지우고 승급전을 다시 열어 «등장 순간» 을 쟀다. 그 손수 지우기는 332/475 의
       격파 시퀀스(`bossClear`)와 665 의 재진입 가드(`battleLocked()`)보다 **먼저 쓰인 코드**라,
       그 뒤로 `startPromo()` 는 첫 줄에서 되돌아갔고 세 항이 **제품이 멀쩡한 채로** 0 으로
       읽혔다(36/39). `probe727` 이 그것을 못박았다 — [A] 깨끗한 첫 진입 `#fxlc +2 · bfight true ·
       ⏱ 15.0` · [B] 옛 방식 재현 `+0 · false · off` · [C] 시퀀스만 닫고 재진입 `+2 · true · 15.0`.
       ⇒ 333 처방대로 **자리를 비우지 않고 살아 있는 표본으로 갈아 끼운다**: 막히는 창은
          «막히는 것이 정답» 이므로 [전제] 두 항으로 **단언**하고, 등장 측정은 시퀀스를 제품
          경로(`bossClearDone()` → `endPromo(true)`)로 닫은 **다음 도전**에서 한다.
       ⚠ 페이지 루프가 evaluate 사이에도 도는데 `bossClear` 는 die+1초(DUN_CLR_HOLD)면 스스로
         닫히므로, 전제 관측과 재진입은 **한 evaluate 안에서** 연달아 해야 한다. */
    const s6 = await p.evaluate(() => {
      /* [전제] 665 — 격파 시퀀스 창에서는 승급전 재진입이 «막히는 것이 정답» 이다.
         옛 §6 이 이 창 안에서 재고 있었다는 사실 자체를 여기서 단언으로 굳힌다. */
      const preClear = bossClear ? bossClear.md : '';
      const preLocked = battleLocked();
      startPromo();
      const preBlocked = !enemies.some(x => x.tk === 'promo');   /* 새 수호자가 서지 않아야 한다 */

      /* 시퀀스를 «제품이 스스로 닫는 그 경로» 로 닫는다 — 새 종료 경로를 만들지 않는다.
         승급전은 여기서 endPromo(true) 로 이어져 계급이 하나 오른다(= 다음 도전이 열린다). */
      bossClearDone();
      const cleared = !bossClear && !battleLocked();

      /* 여기서부터가 «등장 순간» 이다 — 다음 계급 도전을 실제로 연다 */
      const lc0 = (document.getElementById('fxlc') || {}).childElementCount || 0;
      const l0 = (document.getElementById('fxl') || {}).childElementCount || 0;
      startPromo();
      const e = enemies.find(x => x.tk === 'promo');
      if (e) e.hp = e.max = 1e30;
      /* 277 — HUD 판정은 «한 프레임 그린 뒤» 봐야 한다(drawBossHud 는 drawHud 안에서 돈다) */
      drawHud();
      const si = document.getElementById('stinfo');
      const out = {
        preClear, preLocked, preBlocked, cleared,
        lcAdd: ((document.getElementById('fxlc') || {}).childElementCount || 0) - lc0,
        lAdd: ((document.getElementById('fxl') || {}).childElementCount || 0) - l0,
        bfight: !!(si && si.classList.contains('bfight')),
        tmOn: !!document.getElementById('bossTm').classList.contains('on'),
        tmTx: document.getElementById('bossTmN').textContent,
        want: Math.max(0, promo ? promo.t : -1).toFixed(1),
        bossOn: !!bossOn,
        promoOn: !!promo
      };
      /* [§6-R 되돌림 시험] — 위 세 항이 «상시 참» 이 아님을 못박는다(무르게 푼 수리가 아니라는
         가장 짧은 증거). `#bossTmN` 의 문서 기본값이 하필 '15.0' 이라(index.html) 타이머 항은
         «값이 맞다» 만으로는 헛초록이 될 수 있다 — 켜짐 토글까지 같이 본다. */
      const keep = promo; promo = null; drawHud();
      out.offBfight = !!(si && si.classList.contains('bfight'));
      out.offTmOn = !!document.getElementById('bossTm').classList.contains('on');
      promo = keep; drawHud();
      return out;
    });
    ok(s6.preLocked && s6.preClear === 'promo',
      '[전제] 665 — 격파 시퀀스(bossClear ' + (s6.preClear || '없음') + ')가 돌면 battleLocked() 다');
    ok(s6.preBlocked, '[전제] 665 — 그 창에서는 승급전 재진입이 막힌다(새 수호자가 서지 않는다)');
    ok(s6.cleared, '[전제] 시퀀스를 제품 경로(bossClearDone)로 닫으면 잠금이 풀린다');
    ok(s6.promoOn, '다음 계급 도전이 실제로 열린다(등장 순간을 잴 표본이 살아 있다)');
    ok(s6.lcAdd >= 2, '등장 연출 2개가 #fxlc(전투 발 · 팝업 아래, 184)에 붙는다 — +' + s6.lcAdd);
    ok(s6.lAdd === 0, '#fxl(팝업 위)에는 한 개도 안 붙는다 — +' + s6.lAdd);
    ok(s6.bfight, '277 — 승급전도 28 규격 보스 HUD(#stinfo.bfight)를 켠다');
    ok(!s6.bossOn, '스테이지 보스 플래그(bossOn)는 안 건드린다');
    ok(s6.tmOn && s6.tmTx === s6.want,
      '277 — ⏱ 타이머가 승급전 남은 시간을 띄운다 — ' + s6.tmTx + ' (기대 ' + s6.want + ')');
    ok(!s6.offBfight && !s6.offTmOn,
      '§6-R 되돌림 — 승급전을 비우면 .bfight·⏱ 가 꺼진다(상시 참이 아니다) — '
      + s6.offBfight + '/' + s6.offTmOn);

    /* ---------------- §7 불변 ---------------- */
    console.log('\n§7 불변 — 배율 누적 없음 · 다른 적 불변');
    const s7 = await p.evaluate(() => {
      const first = ETYPE.promo.scale;
      /* 세 번 더 연다 — 갈아 끼운 값 위에 다시 계산하면 여기서 배율이 튄다 */
      /* ⚑ 727 — «몇 번이 실제로 열렸는가» 를 같이 센다. 옛 §6 이 격파 시퀀스 창에 갇혀 있던
         동안에는 이 세 번도 `battleLocked()` 에 막혀 **한 번도 안 열렸고**, 그러면
         `first === last` 는 «배율이 안 튄다» 가 아니라 «아무 일도 안 일어났다» 가 된다
         (헛초록). 배율 항이 그 사실을 못 보므로 여기서 따로 못박는다. */
      let opened = 0;
      for (let i = 0; i < 3; i++) {
        promo = null; enemies.length = 0;
        startPromo();
        const e = enemies.find(x => x.tk === 'promo');
        if (e) { opened++; e.hp = e.max = 1e30; }
      }
      return {
        opened,
        first, last: ETYPE.promo.scale,
        base: PROMO_BASE.atlas + '/' + PROMO_BASE.walk,
        zombie: ETYPE.zombie.scale, boss: ETYPE.boss.scale, arena: ETYPE.arena.scale,
        bossAtlas: ETYPE.boss.atlas, arenaAtlas: ETYPE.arena.atlas
      };
    });
    ok(s7.opened === 3, '세 번 다 실제로 열렸다(배율 항이 헛초록이 아니다) — ' + s7.opened + '/3');
    ok(near(s7.first, s7.last, 1e-9),
      '4회 연속 승급전에도 배율이 그대로 — ' + s7.first.toFixed(4) + ' → ' + s7.last.toFixed(4));
    ok(s7.base === 'knight/idle', 'PROMO_BASE 가 원본을 붙잡고 있다 — ' + s7.base);
    ok(s7.zombie === 0.15 && s7.boss === 1.65 && s7.arena === 1,
      '다른 적 배율 불변 — zombie ' + s7.zombie + ' · boss ' + s7.boss + ' · arena ' + s7.arena);
    ok(s7.bossAtlas === 'elves' && s7.arenaAtlas === 'knight',
      '다른 적 아틀라스 불변 — boss ' + s7.bossAtlas + ' · arena ' + s7.arenaAtlas);

    ok(errs.length === 0, '콘솔·페이지 에러 0건 — ' + (errs[0] || ''));
    await ctx.close();
  } catch (e) {
    fail++; console.log('  FAIL 예외 — ' + e.message);
  } finally {
    await browser.close();
  }
  const tot = pass + fail;
  console.log('\nVERIFY208 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' (' + pass + '/' + tot + ')');
  process.exit(fail === 0 ? 0 : 1);
})();
