/* 작업 710 대조 캡처 — «중복이던 쌍을 나란히 놓고» 비평가 2인에게 준다 (등재문의 채점 조항)
 *
 *   node tools/cap710.js [출력경로]
 *
 * ⚠ 따로 보면 셋 다 그럴듯하다 — 411 이 못박은 대로 **나란히 안 놓으면 어긋남이 안 보인다.**
 *   그래서 한 장에 «수리 전에 같은 그림이던 무리» 를 한 줄씩 모아 놓는다.
 *
 * 실제 게임 캔버스에 실제 `shotBody()` 로 그린다(별도 미리보기 캔버스가 아니다) —
 * 배율(`SK_DRAW_SC`)·알파 층·바닥까지 화면과 같은 조건이라야 채점이 화면을 말한다.
 * ⚑⚑ **15회차(792) — «같은 조건» 에 «각» 이 빠져 있었다.** 이 자는 17종을 전부 `a = 0` 으로 눕혀
 *   세웠고, 그래서 `meteor`(운석 낙하)가 **수평으로 누운 채** 여섯 회차(4·8·10·12·14) 동안
 *   비평가 열두 명에게 «낙하로 안 읽힌다» 를 받았다 — 제품은 내내 수직으로 떨어지고 있었다.
 *   지금은 표적을 두 자리에 두고 두 번 시전해 **각이 안 변한 종(제품 상수각)만** 그 각을 싣는다.
 *   ⚠ 조준각(표적 자리가 정하는 각)은 계속 0 으로 눕힌다 — 그것까지 실으면 «표적을 어디 뒀나» 가
 *     시트를 돌리는 또 하나의 하네스 자유도가 된다. 자는 `tools/probe792r15.js`.
 * ⚠ **실루엣 자**(`verify792` [D1]·[E1] · `probe792r13`)는 반대로 a = 0 을 유지해야 한다 —
 *   종끼리 겹쳐 재는 자라 17종이 같은 각이어야 견줄 수 있다. 둘은 서로 반대가 맞다.
 * ⚠ 용사 근처는 «몸 겹침 감쇠»(near < 62)가 걸리므로 용사를 판 밖으로 치우고 그린다.
 *
 * 캡처는 커밋하지 않는다(2026-08-30 이력 정리 — `.gitignore` 가 `docs/shots/` 를 막는다).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const OUT = process.argv[2] || path.resolve(__dirname, '../docs/shots/710-contrast.png');

/* 수리 전에 «한 그림» 이던 무리 — 그 묶음 그대로 한 줄에 놓는다 */
const ROWS = [
  ['slash', 'multi', 'whirl', 'gale'],     /* 수리 전: 전부 k='slash' — IoU 1.000 */
  ['shuri', 'stone', 'boomer'],            /* 수리 전: 전부 4각 별 — IoU 0.994~1.000 */
  ['ice', 'curve', 'arrow', 'lance'],      /* 수리 전: 전부 k='ice' — IoU 1.000 */
  ['boom', 'meteor', 'flask'],             /* 수리 전: 크기만 다른 같은 화구 */
  ['rico', 'bounce', 'spiral']             /* 수리 전: 전부 공용 구슬 — IoU 1.000 */
];

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

  const info = await page.evaluate((ROWS) => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    /* 표적 한 기를 세워 시전이 성공하게 하고, 그 뒤 용사·적을 판 밖으로 치운다 */
    let guard = 0;
    while (enemies.length === 0 && guard++ < 600) step(1 / 60);
    const foe = enemies[0];
    const putFoe = (fx, fy) => {
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = fx - ox; foe.y = fy - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
    };
    putFoe(300, 300);

    /* 종별로 «그 스킬이 실제로 만든 첫 발» 의 규격을 뽑는다 */
    const clearFx = () => { for (const a of [shots, ghosts, bolts, zones, booms, drones, parts, rings]) a.length = 0; };
    const castAll = (fx, fy) => {
      const o = {};
      for (const s of SKILLS) {
        putFoe(fx, fy); clearFx();
        let done = false;
        try { done = castSkill(s); } catch (e) { done = false; }
        if (done && shots.length) {
          const b = shots[0];
          o[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                      a: b.a, tx: b.tx, ty: b.ty, fl0: b.fl0 };
        }
      }
      clearFx();
      return o;
    };

    /* ⚑⚑ 792 15회차 — **각(`a`)을 «조준» 과 «제품 상수» 로 가른다.**
       종전에는 17종을 전부 `a: 0` 으로 눕혔고, 그래서 `meteor`(운석 낙하)가 **수평으로 누운 채**
       채점됐다 — 꼬리 방위각 180.5° · 세로 성분 −0.008(`probe792r15` 실측). 비평가 열두 명이
       4·8·10·12·14회차에 걸쳐 «낙하로 안 읽힌다» 를 여섯 번 적었는데, 제품은 내내
       `a: 1.57` · `vy > 0` · `gy > 0` 로 **떨어지고 있었다**. 여섯 회차가 하네스를 채점한 것이다.
       ⚠ 그렇다고 «전부 진짜 각으로» 는 오답이다 — 조준각은 **표적을 어디 뒀는가**가 정하는 값이라
         그것도 똑같이 하네스의 자유도다(같은 종이 −1.387 ↔ +0.681 로 돈다).
       ⇒ 표적을 **두 자리**에 두고 두 번 시전해 **각이 안 변한 종만** 그 각을 싣는다.
         손 목록이 아니라 제품에게 물으므로 종이 늘어도 저절로 맞는다.
         실측(2026-09-06): 고정각 4종 — `whirl` 0 · `spiral` 0 · `gale` 0 · **`meteor` 1.57**.
         셋은 이미 0 이라 **그림이 바뀌는 것은 운석 하나뿐**이고 나머지 16종은 화소 동일하다. */
    const specA = castAll(300, 300), specB = castAll(760, 900);
    const spec = {};
    for (const id in specA) {
      const sp = specA[id];
      const fixed = specB[id] && specB[id].a === sp.a;
      spec[id] = Object.assign({}, sp, { a: fixed ? sp.a : 0, aFixed: !!fixed });
    }
    putFoe(300, 300); clearFx();

    /* 용사·적을 판 밖으로 — 몸 겹침 감쇠(near<62)와 실루엣 가림을 없앤다 */
    enemies.length = 0; spawnQ.length = 0;
    player.x = -4000; player.y = -4000; player.dead = 0;
    cam.x = 540 - ox; cam.y = 0;            /* 카메라는 그대로 두고 아래에서 화면 좌표로 찍는다 */
    step(1 / 60); draw();
    const ox2 = camOx, oy2 = camOy;

    /* 격자 — **화면 «게임» 좌표**다. ⚠ 1회차에 여기서 틀렸다: 캔버스는 1080 화소지만
       게임 폭은 `1080 / SC = 540` 이라 X0 150 · DX 190 으로 놓으면 4번째 칸(720)이
       화면 밖이고 3번째 칸도 잘린다 — 비평가 B 가 «8종이 안 보인다» 로 그것을 먼저 잡았다.
       가로 4칸이 540 안에 들어오게 다시 잡는다(90 · 208 · 326 · 444).
       ⚠ 2회차에 또 한 번 틀렸다: 5번째 줄(940)이 **하단 미션 상자·탭바 DOM 위젯 아래**로 들어가
         그 줄 3종이 통째로 안 보였다(비평가 D 가 «잘린 게 아니라 부재» 로 잡았다).
       ⇒ 3회차 처방: 줄을 «빈 띠» 로 피해 다니는 대신 **DOM 위젯을 통째로 숨긴다**(아래 hideUI).
         채점 대상은 이펙트 그림이지 HUD 가 아니고, 숨기면 캔버스 세로를 다 쓸 수 있다. */
    /* ⚠ 3·4회차에도 아래 줄이 잘렸다 — 세로를 **상수로 적은 것**이 뿌리다. 게임 세로는
         `#app` 높이 클램프에 따라 프레임마다 달라(실측 1140 이 아니라 998) 상수는 반드시 틀린다.
       ⇒ 캔버스에서 **재서** 나눈다. 이제 줄 수를 늘려도 저절로 맞는다. */
    const VHg = cvs.height / SC;
    const X0 = 90, DX = 118, Y0 = 110;
    const DY = Math.floor((VHg - Y0 - 92) / Math.max(1, ROWS.length - 1));
    const placed = [];
    ROWS.forEach((row, ri) => {
      row.forEach((id, ci) => {
        const sp = spec[id]; if (!sp) return;
        const sx = X0 + ci * DX, sy = Y0 + ri * DY;
        shots.push({ k: sp.k, sh: sp.sh, sa: sp.sa, x: sx - ox2, y: sy - oy2,
                     vx: 0, vy: 0, a: sp.a, dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                     spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                     tx: sp.tx === undefined ? undefined : sx - ox2,
                     ty: sp.ty === undefined ? undefined : sy - oy2, fl0: sp.fl0 });
        placed.push({ id, sx, sy, sh: sp.sh });
      });
    });
    draw();

    /* 이름표 — 캔버스에 직접 얹는다(채점자가 «어느 것이 무엇인가» 를 알아야 한다) */
    const g = cvs.getContext('2d');
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = '600 22px system-ui, sans-serif';
    g.textAlign = 'center';
    for (const p of placed) {
      const X = p.sx * SC, Y = (p.sy + 62) * SC;
      const t = p.id + ' (' + p.sh + ')';
      g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t, X, Y);
      g.fillStyle = '#ffffff'; g.fillText(t, X, Y);
    }
    g.textAlign = 'left';
    g.font = '600 20px system-ui, sans-serif';
    ROWS.forEach((row, ri) => {
      const Y = (Y0 + ri * DY - 78) * SC;
      const t = '수리 전 «한 그림» 이던 무리 ' + (ri + 1) + ' — ' + row.join(' / ');
      g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t, 40 * SC, Y);
      g.fillStyle = '#ffe9b8'; g.fillText(t, 40 * SC, Y);
    });
    g.restore();

    /* DOM 위젯을 전부 숨긴다 — 캔버스와 그 조상만 남긴다(2·3회차 «가려서 안 보인다» 의 뿌리 차단) */
    for (const el of document.querySelectorAll('body *')) {
      if (el !== cvs && !el.contains(cvs)) el.style.visibility = 'hidden';
    }

    const r = cvs.getBoundingClientRect();
    return { placed: placed.length,
             clip: { x: Math.round(r.left), y: Math.round(r.top),
                     w: Math.round(r.width), h: Math.round(r.height) },
             maxY: (Y0 + (ROWS.length - 1) * DY + 90) * SC / (cvs.height / r.height) };
  }, ROWS);

  /* ⚠ 3회차 — 아래를 «maxY 로 잘라 주는» 친절이 5번째 줄을 다시 삼켰다(비평가 F).
     캔버스 전체를 찍는다. 빈 아래쪽 여백은 채점을 방해하지 않지만 잘린 줄은 채점을 막는다. */
  const c = info.clip;
  await page.screenshot({ path: OUT, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  console.log('CAP710 — ' + info.placed + '종 배치 · ' + OUT);
  await browser.close();
})();
