#!/usr/bin/env node
/* 80 검증 — 54 랭킹 시상대 1·2·3위 = 랭커 look(외형 데이터)으로 그리는 플레이어 스프라이트
 *
 *   node tools/verify80.js
 *
 * 검사 항목:
 *   [A] 폐기·기하 — 단상 위 이모지(em#rkCh*) 가 없고 캔버스 3장이 규격(395×315 / 316×252 ×2)대로
 *       상자를 1:1 로 차지한다(+ image-rendering:pixelated)
 *   [B] 잉크·발 위치 — 세 캔버스 모두 실제로 그려졌고(불투명 픽셀), 발밑(최하단 잉크 행)의 프레임 y 가
 *       단상 윗면 448/482/492 (측정표 54 §3 의 ref 532/566/576 − 84) ±4px
 *   [C] 데이터 경로 — 상위 3 엔트리의 look.avatar 가 서로 다르고(av0/av1/av2 순환) 캔버스 픽셀도
 *       세 장이 서로 다르다(«외형이 다르게 그려지는» 검증)
 *   [D] 내 look — S.best 를 1위로 올리면 1위 단상이 내 look({avatar: cosCur()})으로 그려지고,
 *       코스튬을 av0→av3 으로 바꾼 뒤 재진입하면 내 자리 색이 바뀐다(주인 지시 검증 항목)
 *   [E] 재생 — 페이지가 열려 있는 동안 idle 8fps 로 캔버스가 바뀌고, 닫으면 rAF 가 멈춘다(rkRaf 0)
 *   [F] flip — 2위(좌)만 flip(1위를 향해 마주 봄): 2위와 3위의 같은 프레임 잉크가 좌우 대칭이다
 *
 * getImageData 를 쓰므로 --allow-file-access-from-files 로 띄운다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 925 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(같은 말을 손으로 적고 있었다).
   사슬을 안 지나면 뒤에 걸린 장치를 하나도 못 받는다 — 291 정착 · 731 소실 차단기 ·
   907 판 결정성 깃발 · 918/922 껍데기 걷개. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const args = ['--allow-file-access-from-files'];
  const browser = await launch(chromium, { args });   /* 925 — 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRank === 'function' && ATLAS.knight && ATLAS.knight.image);
  await page.waitForTimeout(800);

  /* 랭킹 페이지 열기 (fresh save → 내 best 0 = 리스트 최하위, 단상 3자리는 전부 더미 랭커) */
  await page.evaluate(() => openRank());
  await page.waitForTimeout(400);

  /* [A] 폐기·기하 */
  const A = await page.evaluate(() => {
    const out = { em: document.querySelectorAll('#rkw .rk-ch em#rkCh1, #rkw .rk-ch em#rkCh2, #rkw .rk-ch em#rkCh3').length,
                  /* 작업 101(주인 지시 2026-08-26) — 탈것(c3a)·부유 장식(.rk-fl) 은 폐기됐다.
                     «유지» 가 아니라 «존재하지 않음» 이 기대값이다. */
                  gone: document.querySelectorAll('#rkw .rk-ch.c3a, #rkw .rk-fl').length, cv: [] };
    for (let k = 1; k <= 3; k++) {
      const cv = document.getElementById('rkCh' + k);
      if (!cv || cv.tagName !== 'CANVAS') { out.cv.push(null); continue; }
      const b = cv.parentNode.getBoundingClientRect();
      out.cv.push({ w: cv.width, h: cv.height, bw: Math.round(b.width), bh: Math.round(b.height),
                    top: Math.round(b.top), left: Math.round(b.left),
                    pix: getComputedStyle(cv).imageRendering });
    }
    return out;
  });
  ok(A.em === 0, 'A1 단상 이모지 폐기', 'em#rkCh* ' + A.em + '개');
  ok(A.gone === 0, 'A2 탈것(c3a)·부유 장식(.rk-fl) 폐기 — 존재하지 않음', A.gone + '개 남음');
  /* c3b left 785 → 708 (작업 54 10회차): ⛵(c3a) 폐기 뒤 3위 캐릭터만 자기 단상 중심에서
     +76.5px 우측으로 밀려 있었다 — 단상 p3(702..1031, 중심 866.5) 중심에 맞춘 값이다. */
  /* 작업 147(2026-08-26): 2·3위 draw 배율 sc5 → sc7. 상자는 «79×63 정수배» 가 아니라 잉크가 잘리지 않는
     최소 규격(세로 46×7=322 · 가로 24×2×7=336)이고, 바닥은 단상 윗면(482/492)·중심은 단상 중심(215/866).
     1위는 sc6 유지(명판 여유가 한 단계 적다 — 11회차). 배율 상한 근거는 index.html `.rk-ch.c2` 주석. */
  const spec = [{ w: 395, h: 315, top: 133, left: 343 }, { w: 336, h: 322, top: 160, left: 47 }, { w: 336, h: 322, top: 170, left: 698 }];
  for (let i = 0; i < 3; i++) {
    const c = A.cv[i], s = spec[i];
    ok(!!c && c.w === s.w && c.h === s.h && c.bw === s.w && c.bh === s.h,
       'A3 캔버스 ' + (i + 1) + '위 규격 1:1', c ? c.w + 'x' + c.h + ' 상자 ' + c.bw + 'x' + c.bh : '없음');
    ok(!!c && c.top === s.top && c.left === s.left, 'A4 상자 위치 ' + (i + 1) + '위', c ? c.left + ',' + c.top : '');
    ok(!!c && c.pix === 'pixelated', 'A5 pixelated ' + (i + 1) + '위', c && c.pix);
  }

  /* 캔버스 잉크 스캔 헬퍼 — {n:불투명 픽셀 수, feet:최하단 잉크 행(캔버스 로컬), sig:픽셀 해시} */
  const scan = k => page.evaluate(k => {
    const cv = document.getElementById('rkCh' + k), g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, feet = -1, sig = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (d[i + 3] > 128) { n++; feet = Math.max(feet, y); sig = (sig * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13 + x) >>> 0; }
    }
    return { n, feet, sig };
  }, k);

  /* [B] 잉크·발 위치 */
  const feetY = [448, 482, 492];
  const sigs = [];
  for (let k = 1; k <= 3; k++) {
    const r = await scan(k);
    sigs.push(r.sig);
    ok(r.n > 800, 'B1 캔버스 ' + k + '위 잉크', r.n + 'px');
    const fy = spec[k - 1].top + r.feet + 1;   /* 프레임 y (viewport 1080×2280 = 프레임 1:1) */
    ok(Math.abs(fy - feetY[k - 1]) <= 4, 'B2 발 위치 ' + k + '위 = 단상 윗면 ' + feetY[k - 1] + '±4', '실측 ' + fy);
  }

  /* [C] 데이터 경로 — look 이 다르면 그림도 다르다 */
  const C = await page.evaluate(() => {
    const rows = rankRows();
    return { looks: rows.slice(0, 3).map(r => r.look && r.look.avatar), me: rows.find(r => r.me).look.avatar };
  });
  ok(new Set(C.looks).size === 3, 'C1 상위 3 look.avatar 서로 다름', C.looks.join(','));
  ok(sigs[0] !== sigs[1] && sigs[1] !== sigs[2] && sigs[0] !== sigs[2], 'C2 캔버스 3장 픽셀 서로 다름(틴트)', sigs.join('/'));
  ok(C.me === 'av0', 'C3 내 look = cosCur()', C.me);

  /* [D] 내 look → 1위 단상 + 코스튬 변경 반영 */
  await page.evaluate(() => { S.best = 99999; closeRank(); openRank(); });
  await page.waitForTimeout(250);
  const D0 = await page.evaluate(() => rankRows()[0].me);
  ok(D0 === true, 'D1 best 갱신 시 내가 1위 엔트리');
  const dA = await scan(1);
  await page.evaluate(() => { S.avatars.av3 = true; S.avatar = 'av3'; closeRank(); openRank(); });
  await page.waitForTimeout(250);
  const dB = await scan(1);
  ok(dA.n > 800 && dB.n > 800 && dA.sig !== dB.sig, 'D2 코스튬 av0→av3 재진입 시 내 자리 색 변경', dA.sig + ' → ' + dB.sig);
  await page.evaluate(() => { S.avatar = 'av0'; });

  /* [E] 재생 — idle 로 프레임이 바뀌고, 닫으면 rAF 정지.
     고정 대기 1회 비교는 idle 주기와 겹치면 같은 프레임을 두 번 볼 수 있어(플레이크) 변화를 폴링한다 */
  const e1 = await scan(1);
  let e2 = e1;
  for (let t = 0; t < 10 && e2.sig === e1.sig; t++) { await page.waitForTimeout(250); e2 = await scan(1); }
  ok(e1.sig !== e2.sig, 'E1 열려 있는 동안 idle 재생', e1.sig + ' → ' + e2.sig);
  await page.evaluate(() => closeRank());
  await page.waitForTimeout(300);
  const eRaf = await page.evaluate(() => rkRaf);
  ok(eRaf === 0, 'E2 닫으면 rAF 정지', 'rkRaf=' + eRaf);

  /* [F] flip — 2위만 좌우 반전. 같은 아바타·같은 프레임으로 고정해 2위 vs 3위 잉크 열 분포가 대칭 */
  const F = await page.evaluate(() => {
    openRank();
    rkPodLooks[1] = { avatar: 'av0' }; rkPodLooks[2] = { avatar: 'av0' };
    const f = ATLAS.knight.a.idle[0];
    /* 147 — 실제로 출하되는 배율(sc7)로 대칭을 본다(옛 sc4 는 상자가 작던 시절 값) */
    drawHeroTo(document.getElementById('rkCh2'), { avatar: 'av0', frame: f, scale: 7, flip: true });
    drawHeroTo(document.getElementById('rkCh3'), { avatar: 'av0', frame: f, scale: 7, flip: false });
    const col = k => {
      const cv = document.getElementById('rkCh' + k), g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data, a = [];
      for (let x = 0; x < cv.width; x++) { let n = 0; for (let y = 0; y < cv.height; y++) if (d[(y * cv.width + x) * 4 + 3] > 128) n++; a.push(n); }
      return a;
    };
    const c2 = col(2), c3 = col(3);
    let diff = 0, tot = 0;
    for (let x = 0; x < c2.length; x++) { diff += Math.abs(c2[x] - c3[c3.length - 1 - x]); tot += c2[x]; }
    closeRank();
    return { diff, tot };
  });
  ok(F.tot > 0 && F.diff / F.tot < 0.02, 'F1 2위 flip = 3위 미러', 'diff ' + F.diff + '/' + F.tot);

  ok(errs.length === 0, 'G1 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('----');
  console.log('VERIFY80 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
