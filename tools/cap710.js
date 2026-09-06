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

/* ⚑ 996 위상 손잡이 — 기본값 0 이 «시트가 쓰는 위상» 이다(눈금 불변 · 695 `freeze`·rul504 `immortal` 선례).
   `CAP710_ORBIT=<rad>` 로만 움직이고, 움직이는 자는 `tools/probe996.js`(위상 스윕) 하나뿐이다. */
const ORB = process.env.CAP710_ORBIT === undefined ? 0 : Number(process.env.CAP710_ORBIT);

/* ⚑ 999 용사 자리 손잡이 — **기본은 «안 건드린다»(null)** 라 시트의 기본 동작이 한 화소도 안 바뀐다.
   `CAP710_HERO="<x>,<y>"` 로 규격 시전 «앞» 에 용사를 그 자리에 세운다. 왜 필요한가:
   부팅 1.2초 동안 rAF 가 몇 프레임 도는지가 판마다 달라 **용사 자리가 판마다 다르고**(실측 x 857/1032/1077/961),
   그 자리에서 시전한 피해값이 갈린다. 999 는 그 피해 숫자를 **치우는 것**으로 닫았지만
   (`clearFx` 에 `nums` 편입 — 아래 주석), 자가 그 인과를 **운에 기대지 않고** 보이려면
   두 자리를 손으로 세워 견줄 수 있어야 한다. `tools/verify999.js` [3]·[R] 이 이 손잡이로 돈다.
   ⚠ 이 손잡이는 규격(`spec`)이 읽는 열 필드에 안 들어간다 — 시트 그림은 자리와 무관하다(자 [3] 이 그것을 단언한다). */
const HERO = (() => {
  const v = process.env.CAP710_HERO;
  if (v === undefined || v === '') return null;
  const [x, y] = String(v).split(',').map(Number);
  if (!isFinite(x) || !isFinite(y)) { console.error('CAP710_HERO 는 "<x>,<y>" 꼴이어야 한다 — 받은 값: ' + v); process.exit(3); }
  return { x, y };
})();

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

  const info = await page.evaluate(({ ROWS, ORB, HERO }) => {
    /* ⚑⚑ 996 — **이 시트는 같은 트리에서 판마다 다른 그림을 찍고 있었다.** 네 번 찍으면 여섯 칸이
       판마다 수천 화소 흔들렸다(실측: `spiral` 12,626 · `gale` 11,440 · `whirl` 6,363 ·
       `arrow` 3,780 · `curve` 3,452 · `rico` 1,552 · 나머지 11칸은 0).
       792 는 «회차마다 다시 찍어 2인이 채점» 하는 행이라, 점수가 움직였을 때
       «처방이 먹혔나» 와 «위상이 달랐나» 를 그 여섯 칸에서는 가를 수가 없었다.
       ⚠ **등재문(996)의 뿌리 지목은 절반만 맞았다** — `performance.now` **하나만** 얼리면
         여섯 칸이 여섯 칸 그대로다(실측 3판: `gale` 8,521 · `spiral` 9,316 …).
         손잡이는 셋이고 **셋이 서로 다른 것을 잡는다**(각각 빼 보고 확인했다):
         ① `Math.random` 씨앗 — 배경 소품이 판마다 다른 자리에 선다(`arrow`·`curve`·`rico`
            칸의 위·왼 띠가 그것이다. 씨앗을 빼면 그 세 칸이 되살아난다).
         ② `orbitAng` 핀 — **이것이 세 큰 칸의 뿌리다.** `whirl`·`gale`(`orbitAng*0.3`)과
            `spiral`(`orbitAng*0.7`)은 **시전각을 이 누산기에서 읽는다**(index.html 26314·26341·26592).
            `orbitAng` 는 `step()` 이 `dt*2.4` 씩 밀어 올리는데(26941·26964), 위 `waitForTimeout(1200)`
            동안 제품의 rAF 가 **몇 프레임 돌지가 판마다 다르다** ⇒ 각이 판마다 다른 값으로 굳는다
            (실측 3판: `whirl` a = 0.876 / 0.912 / 0.972). 15회차의 «두 자리에 시전해 각이 안 변한
            종만 그 각을 싣는다» 는 **한 판 안에서만** 참이라 이 드리프트를 못 본다.
         ③ `performance.now` 얼림 — **이 시트의 17종에서는 재 본 만큼 효과가 없었다**(빼도 3판
            0 흔들림). 등재문이 뿌리로 지목한 것이 이것인데 실측은 ①② 가 본체라고 말한다.
            그래도 세워 두는 이유는 **형제 자와 같은 위상**이기 때문이다 — `verify792`·
            `probe792r13`·`probe792r15` 가 전부 `1e6` 에 세우므로, 안 세우면 «채점한 그림» 과
            «자가 잰 그림» 이 다른 위상이 된다. 접촉형(`aura` 반경은 `sin(performance.now()/220)`,
            index.html 28624)이 시트에 들어오는 날 ③ 이 없으면 그 칸이 곧바로 흔들린다.
       ⚠ `auraTick` 은 안 건드렸다 — 핀에 넣어 봤지만 아무것도 바꾸지 않았다.
       ⚠⚠ **남은 잔여 하나는 이 수리가 아니다 — `999` 로 따로 등재했다.** 좌하단 한 블록
         (화소 x ≤ 88 · y ≥ 1838 · 86×85)이 **다섯 판에 한 판꼴로** 갈린다. 위 셋과 무관함은
         셋을 다 세운 자에서도 10판 중 2판이 갈린 것으로 확인했고, 갈린 판에서도
         `floorCv` 조밀 해시·전 배열 길이·`cam` 이 전부 같았다. 캔버스에서 직접 읽어도(스크린샷을
         거치지 않아도) 같은 자리가 갈리므로 **합성기가 아니라 그려진 내용**이다. 뿌리는 999 몫이다.
         `probe996`·`verify996` 은 그 블록을 «지우지 않고» 안팎을 갈라 둘 다 찍는다.
       ⚠ **위상을 고르는 것이 이 수리의 값이다**(등재문 경고). 고른 자리가 최악이 아님은
         `probe996` 의 위상 스윕이 재고 `verify996` [3] 이 그 바닥·천장으로 못박는다. */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    performance.now = () => 1e6;
    orbitAng = ORB;
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
    /* ⚑⚑ 999 — **이 목록에 `nums` 가 빠져 있던 것이 좌하단 블록이 다섯 판에 한 판꼴로 갈리던 뿌리다.**
       위 `castAll` 은 규격을 뽑으려고 17종을 **두 번씩 실제로 시전**하는데, 그 타격이 남긴
       «떠오르는 피해 숫자»(`nums`)는 여덟 배열과 달리 한 번도 안 치워졌다. 그 한 장이 마지막 줄
       `rico` 칸 상자 안(월드 988.28, 958 = 화면 게임 28.3, 958)에 `fillText` 로 찍힌다 —
       `probe996` 이 «rico 86 (999 블록 밖 0)» 으로 세던 그 화소가 정확히 이 글자다.
       ⚑ **글자가 판마다 달라지는 이유는 하네스의 마지막 안 잡힌 자유도 하나다** — 996 이 씨앗·`orbitAng`·
         시계를 핀으로 박았지만 **용사 자리**는 부팅 1.2초 동안 rAF 가 몇 프레임 돌았는지에 따라 그대로 흔들린다
         (실측 boot x 857 / 1032 / 1077 / 961 …). 그 자리에서 시전한 피해값이 갈리므로 글자가
         «44.2A» ↔ «34.7A» 로 갈리고(`raw` 44,234 ↔ 34,691 · `mg` 16 ↔ 15), 자릿수가 바뀌면 잉크가 바뀐다.
         **판 안에서는 늘 같은 글자**이고(같은 판에서 draw() 를 여섯 번 불러도 해시 동일) 판을 가로질러서만
         갈리는 것이 그 증거다. 같은 뿌리의 다른 얼굴이 `1000`(«용사 자리» 라고 등재돼 있다)이다.
       ⇒ **문턱을 넓히지 않고(334·796) 원인을 치운다** — 이 시트의 채점 대상은 «투사체 실루엣 17종» 이고
         피해 숫자는 하네스가 규격을 뽑다가 흘린 부스러기다. 애초에 `clearFx` 가 치웠어야 할 것이라
         목록에 넣는 것이 수리고, 값을 얼리는 것(용사 핀)은 **부스러기를 남긴 채 예쁘게 만드는 길**이다.
       ⚠ `corpses` 도 같은 부류라 같이 넣는다 — 지금 표본에서는 늘 비어 있어(적 hp 1e12 라 안 죽는다)
         **그림이 한 화소도 안 바뀌지만**, 다음에 표적이 죽는 날 똑같은 얼굴로 재발할 자리다.
       ⚠ 자는 `tools/verify999.js`(되돌림 시험 포함) · 재현은 `tools/probe999.js`. */
    const clearFx = () => { for (const a of [shots, ghosts, bolts, zones, booms, drones, parts, rings,
                                             nums, corpses]) a.length = 0; };
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
    /* ⚑ 999 — 손잡이가 켜져 있을 때만 용사를 세운다(기본 null = 손 안 댐 = 옛 동작 그대로) */
    if (HERO) { player.x = HERO.x; player.y = HERO.y; }
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
  }, { ROWS, ORB, HERO });

  /* ⚠ 3회차 — 아래를 «maxY 로 잘라 주는» 친절이 5번째 줄을 다시 삼켰다(비평가 F).
     캔버스 전체를 찍는다. 빈 아래쪽 여백은 채점을 방해하지 않지만 잘린 줄은 채점을 막는다. */
  const c = info.clip;
  await page.screenshot({ path: OUT, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  console.log('CAP710 — ' + info.placed + '종 배치 · ' + OUT);
  await browser.close();
})();
