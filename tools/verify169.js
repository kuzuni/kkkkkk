/* 작업 169 게이트 — 04 던전 세부 팝업 ① 배너 몬스터 썸네일 ② 소탕 버튼 실동작.
 *
 * 두 가지를 함께 잰다.
 *   ① «행에서 본 몬스터가 세부에서도 같은 몬스터인가» — 03 행 카드 캔버스의 `data-thk`/프레임과
 *      배너 캔버스를 **직접 대조**한다. «스프라이트가 그려졌다» 만 재면 다른 몬스터를 그려도 통과한다.
 *      그리고 배너 기하는 1px 도 안 바뀌어야 한다(측정표 04 §2 — 750×351 @ local 6,24).
 *   ② «눌렀을 때 무엇이 바뀌는가» — 입장 횟수 −1 · 보상 실지급 · 31 클리어 화면 · 세이브 반영까지
 *      **실제 게임 데이터**로 확인한다(T2 기능 완성 규칙, 2026-08-25 주인 지시).
 *
 * ★ 음성항 [E] 가 이 게이트의 핵심이다 — 옛 트리(빈 핸들러 · 캔버스 없는 배너)로 갈아 끼운 사본을
 *   **새로 열어** 재면 반드시 빨개져야 한다. 안 그러면 «자를 안 댄 곳은 자동 무결점» 이 된다.
 *   사본을 저장소 루트에 두는 이유는 `assets/*` 가 상대 경로라서다(59·74·58·191 선례).
 *
 * 실행: node tools/verify169.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
/* 194 — 강화석 던전(`stone`)이 7번째로 붙었다. 개수 단언은 전부 이 배열 길이로 돈다
   (90 → 97 → 72 → 121 에 이어 «구성이 늘 때마다 개수를 박은 게이트가 빨개지는» 다섯 번째 자리다). */
/* 258(2026-08-27) — 203 이 룬강화석 던전(`rstone`)을 8번째로 붙였는데 이 배열이 7 에 멈춰 있어
   A0 이 4화면비 전부 «7장 기대 / 8장 실측» 으로 빨갰다(258 착수 전부터. 내 변경과 무관하다).
   위 주석이 예고한 «여섯 번째 자리» 다 — 목록을 늘려 게이트를 되살린다. */
const DUN_IDS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];

let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

/* 던전을 전부 열고 층·입장 횟수를 준다. 소탕 조건은 목록 행과 같은 `left > 0 && f > 1` 이다. */
const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

/* 배너 한 칸의 상태. 캔버스 잉크는 `--allow-file-access-from-files` 로 픽셀을 직접 읽는다(72/97 선례). */
const BANNER = () => {
  const cv = document.getElementById('dgdTh'), bn = document.getElementById('dgdBn');
  const sil = bn.querySelector('b');
  const br = bn.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  const sr = sil.getBoundingClientRect();
  const body = document.querySelector('#dgdw .dgd-body').getBoundingClientRect();
  const on = bn.classList.contains('th-on');
  let ink = null;
  if (on) {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, lum = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (d[i + 3] > 8) {
        n++; lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    ink = n ? { x0, y0, x1, y1, n, lum: +(lum / n).toFixed(1) } : { n: 0 };
  }
  return {
    on, sil: getComputedStyle(sil).display,
    /* 실루엣과 캔버스는 **같은 bbox** 여야 한다 — 실루엣이 display:none 이어도 규칙 값은 읽을 수 있다 */
    silCss: [getComputedStyle(sil).width, getComputedStyle(sil).height,
             getComputedStyle(sil).bottom, getComputedStyle(sil).marginLeft].join('/'),
    cvCss: [getComputedStyle(cv).width, getComputedStyle(cv).height,
            getComputedStyle(cv).bottom, getComputedStyle(cv).marginLeft].join('/'),
    cvPx: [cv.width, cv.height],
    /* 배너 기하(측정표 04 §2) — 본문 로컬 좌표 */
    bn: { x: +(br.left - body.left).toFixed(1), y: +(br.top - body.top).toFixed(1),
          w: +br.width.toFixed(1), h: +br.height.toFixed(1) },
    cvLocal: { x: +(cr.left - br.left).toFixed(1), y: +(cr.top - br.top).toFixed(1),
               w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) },
    silLocal: { x: +(sr.left - br.left).toFixed(1), y: +(sr.top - br.top).toFixed(1),
                w: +sr.width.toFixed(1), h: +sr.height.toFixed(1) },
    k: cv.dataset.thk, f: cv._fr, ink,
  };
};

const SWEEP = () => {
  const b = document.getElementById('dgdSweep');
  return { lk: b.classList.contains('lk'), dis: b.disabled, txt: b.innerText.trim(),
           fil: b.style.filter, lkVis: getComputedStyle(b.querySelector('.dgd-lk')).display,
           iVis: getComputedStyle(b.querySelector(':scope>i')).display };
};

async function boot(b, H, url) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url || URL);
  await p.waitForTimeout(1100);
  await p.evaluate(SEED);
  return { ctx, p, errs };
}

/* 03 목록을 열어 행 카드 캔버스가 그려질 때까지 기다린다 */
async function openList(p) {
  await p.evaluate(() => { openDungeon(); });
  await p.waitForFunction(() => {
    const cs = [...document.querySelectorAll('#dunList canvas.thcv')];
    return cs.length >= 6 && cs.every(c => c._fr);
  }, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(250);
}

(async () => {
  /* 72/97 선례 — file:// 이미지는 캔버스를 오염시켜 `getImageData` 가 막힌다 */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ================= [A] 배너 썸네일 — 화면비 4종 ================= */
  for (const H of HEIGHTS) {
    const { ctx, p, errs } = await boot(b, H);
    await openList(p);
    /* 행 카드가 무엇을 그렸는지 먼저 기록한다 — 세부와 대조할 «정답» 이다 */
    const rows = await p.evaluate(() => {
      const o = {};
      document.querySelectorAll('#dunList .dnc[data-dcard]').forEach(c => {
        const cv = c.querySelector('canvas.thcv');
        o[c.dataset.dcard] = { k: cv.dataset.thk, f: cv.dataset.thf, i: cv.dataset.thi };
      });
      return o;
    });
    chk(Object.keys(rows).length === DUN_IDS.length, `[${H}] A0 03 행 카드 ${DUN_IDS.length}장`, `${Object.keys(rows).length}장`);

    let sameK = 0, drawn = 0, contained = 0, bboxOk = 0, bboxNote = '';
    let bnGeo = null, cvGeo = null;
    for (const id of DUN_IDS) {
      await p.evaluate(i => openDunDetail(DUNGEONS.find(d => d.id === i)), id);
      await p.waitForTimeout(320);
      const m = await p.evaluate(BANNER);
      bnGeo = m.bn; cvGeo = m.cvLocal;
      if (m.on && m.ink && m.ink.n > 2000) drawn++;
      if (rows[id] && m.k === rows[id].k) sameK++;
      /* contain — 잉크가 캔버스 밖으로 안 나가고, 사방에 여백이 남는다 */
      if (m.ink && m.ink.n && m.ink.x0 >= 0 && m.ink.y0 >= 0
        && m.ink.x1 <= m.cvPx[0] - 1 && m.ink.y1 <= m.cvPx[1] - 1) contained++;
      /* 캔버스가 종전 실루엣과 «같은 자리·같은 크기» 인가.
         ⚠ rect 로 재면 안 된다 — 썸네일이 켜지면 실루엣은 `display:none` 이라 rect 가 0×0 이다.
            (처음에 그렇게 짜서 0/6 이 나왔다.) 규칙 값(계산 스타일)은 숨겨도 그대로 읽힌다. */
      if (m.cvCss === m.silCss) bboxOk++;
      else if (!bboxNote) bboxNote = `cv ${m.cvCss} vs sil ${m.silCss}`;
    }
    const N = DUN_IDS.length;
    chk(drawn === N, `[${H}] A1 던전 ${N}종 전부 배너에 스프라이트가 그려진다`, `${drawn}/${N}`);
    chk(sameK === N, `[${H}] A2 행↔세부 «같은 몬스터»(data-thk 일치)`, `${sameK}/${N}`);
    chk(contained === N, `[${H}] A3 잉크가 캔버스 밖으로 안 넘친다(contain)`, `${contained}/${N}`);
    chk(bboxOk === N, `[${H}] A4 캔버스 bbox = 종전 CSS 실루엣 bbox (300×214 · bottom 14 · 중앙)`,
      `${bboxOk}/${N}${bboxNote ? ' — ' + bboxNote : ''}`);
    /* 측정표 04 §2 — 배너 750×351, 본문 로컬 (6,24). 썸네일이 붙어도 안 바뀐다. */
    const geo = bnGeo && Math.abs(bnGeo.w - 750) < 1 && Math.abs(bnGeo.h - 351) < 1
      && Math.abs(bnGeo.x - 6) < 1 && Math.abs(bnGeo.y - 24) < 1;
    chk(geo, `[${H}] A5 배너 기하 불변 (측정표 04 §2 — 750×351 @ 6,24)`,
      bnGeo ? `${bnGeo.w}×${bnGeo.h} @${bnGeo.x},${bnGeo.y}` : '못 읽음');
    const cvg = cvGeo && Math.abs(cvGeo.w - 300) < 1 && Math.abs(cvGeo.h - 214) < 1;
    chk(cvg, `[${H}] A6 썸네일 자리 300×214`, cvGeo ? `${cvGeo.w}×${cvGeo.h}` : '못 읽음');
    chk(errs.length === 0, `[${H}] A7 콘솔·런타임 에러 0`, `${errs.length}건 ${errs.slice(0, 2).join(' / ')}`);
    await ctx.close();
  }

  /* ================= [B] 소탕 버튼 상태 ================= */
  {
    const { ctx, p } = await boot(b, 2280);
    await p.evaluate(() => openDunDetail(DUNGEONS[0]));
    await p.waitForTimeout(300);
    let s = await p.evaluate(SWEEP);
    chk(!s.lk && s.txt === '소탕', 'B1 던전 모드 — 자물쇠를 벗고 「소탕」 글자', `lk=${s.lk} txt=${s.txt}`);
    chk(s.lkVis === 'none' && s.iVis !== 'none', 'B1b 자물쇠는 숨고 글자만 보인다',
      `lk=${s.lkVis} i=${s.iVis}`);
    chk(!s.dis && !s.fil, 'B2 5층·입장 2회 남음 → 활성', `dis=${s.dis} filter=${s.fil}`);

    /* f == 1 — 소탕할 이전 층이 없다 */
    await p.evaluate(() => { S.dun.gold = 1; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(250);
    s = await p.evaluate(SWEEP);
    chk(s.dis && /grayscale/.test(s.fil), 'B3 1층뿐이면 비활성(회색)', `dis=${s.dis} filter=${s.fil}`);

    /* left == 0 — 오늘 입장 횟수 소진 */
    await p.evaluate(() => { S.dun.gold = 5; S.dunTk.gold = 0; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(250);
    s = await p.evaluate(SWEEP);
    chk(s.dis && /grayscale/.test(s.fil), 'B4 입장 횟수 0 이면 비활성(회색)', `dis=${s.dis} filter=${s.fil}`);

    /* 목록 행 [⚡ 소탕] 과 조건이 «글자 그대로» 같은가 — 두 자리가 갈리면 안 된다 */
    const agree = await p.evaluate(() => {
      const out = [];
      for (const f of [1, 2, 5]) for (const left of [0, 1]) {
        S.dun.gold = f; S.dunTk.gold = left;
        openDunDetail(DUNGEONS[0]);
        out.push({ f, left, det: !document.getElementById('dgdSweep').disabled, row: left > 0 && f > 1 });
      }
      closeDunDetail();
      return out;
    });
    chk(agree.every(a => a.det === a.row), 'B5 활성 조건이 목록 행과 완전히 같다 (f×left 6조합)',
      agree.map(a => `f${a.f}/l${a.left}:${a.det ? 'on' : 'off'}`).join(' '));
    await ctx.close();
  }

  /* ================= [C] 소탕 실동작 (T2 기능 완성 규칙) ================= */
  {
    const { ctx, p, errs } = await boot(b, 2280);
    await openList(p);
    await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(300);
    /* 643 — `gold` 는 여기서 뺐다(아래 `paid` 가 같은 tick 에서 직접 잰다). 이 자리에서 읽은 값은
       클릭 시점까지 배경 사냥에 밀릴 수 있어 기준선으로 못 쓴다. */
    const before = await p.evaluate(() => ({
      left: S.dunTk.gold, cnt: S.cnt.dungeon,
      want: DUNGEONS[0].rw(S.dun.gold - 1).gold,
    }));
    /* ⚑ 643(2026-09-01) — 지급액은 클릭과 **같은 tick** 에서 읽는다.
       종전에는 클릭 → 500ms 대기 → `after.gold - before.gold` 로 쟀는데, 그 500ms 동안
       팝업 뒤에서 방치 사냥이 계속 돌아 **몹이 하나만 죽어도 골드가 저 혼자 는다**
       (`probe643` 실측: 대조군 5회 중 1회 +4.08 · 그 판은 예외 없이 `S.totalKills` 도 +1).
       그래서 이 항이 «+36868 vs 기대 36864» 로 빨갰다 — **제품은 한 번도 틀리지 않았다**
       (같은 tick 측정 5회 전부 정확히 `rw(4).gold`).
       D5 가 258 에서 이미 «소탕이 도는지는 저절로 변할 수 없는 값으로만 재라» 고 적어 뒀는데
       C2·E1 두 자리만 그 규약을 못 받았다. `onclick → sweepDungeon → giveReward` 는 전부
       동기라 클릭과 읽기 사이에 프레임이 못 낀다 = 배경분이 섞일 창 자체가 없다.
       ⚠ 기대값을 36868 로 고쳐 적는 재기준은 반려다(334 규약) — 고칠 것은 **자의 측정 방식**이다. */
    /* ⚑ 649(2026-09-01) — HUD 시작값은 **지급 앞**에서 읽는다. 643 이 C2 에서 고친 것과 같은 결함이
       한 칸 아래에도 있었다: 종전에는 이 값을 클릭 **뒤**(정착 확인 직전, 클릭 + 500ms)에서 읽고
       `hud.txt !== hudStart` 로 «굴러가는 것을 봤는가» 를 물었는데, 58 재화 흡수 롤(`fxVal`)이
       그 샘플보다 **먼저** 끝나면 시작값이 이미 정착값이라 거짓 빨강이 된다
       (`probe649` 실측 — 5병렬 25판에서 **13판 FAIL(52%)**, 실패 로그는 예외 없이 «36.9A» → «36.9A»
        이고 `S` 도 36.9A = **값은 내내 옳고 축만 어긋났다**. 통과한 판은 12.3A·18.4A·24.6A·30.7A =
        롤 한복판을 우연히 집은 것이다. 단독 실행은 롤이 느려 거의 늘 통과라 한 번만 돌리면 안 보인다).
       ⚠ `hud.txt !== hudStart` 항을 빼는 길은 반려다(334·643 규약) — 그러면 «HUD 가 아예 안 움직여도
       초록» 이 된다. 고칠 것은 **읽는 시점**이고, 지급 전 값(0골드 → «0»)을 기준선으로 삼으면
       ⓐ 롤이 언제 끝나든 축이 살고 ⓑ «0 → 36.9A» 라 뜻이 오히려 또렷해진다.
       되돌림 시험은 `probe649` §2(이 줄을 도로 아래로 옮긴 사본은 같은 부하에서 빨개진다)와
       아래 E4(HUD 를 얼린 사본은 이 항이 빨개진다) 둘이 함께 못박는다.
       638(`verify102` 고정 대기 900ms)이 같은 «부하에서만 죽는 자» 계열의 선례다. */
    const hudStart = await p.evaluate(() => document.getElementById('goldN').textContent); /* 649-ANCHOR-PRE */
    const paid = await p.evaluate(() => {
      const g0 = S.gold;
      document.getElementById('dgdSweep').click();
      return S.gold - g0;
    });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({
      left: S.dunTk.gold, cnt: S.cnt.dungeon,
      dgdOpen: document.getElementById('dgdw').classList.contains('on'),
      dclOpen: document.getElementById('dclw').classList.contains('on'),
      dclAmt: document.getElementById('dclAmt').textContent,
      wantTxt: fmtCur('gold', DUNGEONS[0].rw(4).gold),
      saved: (() => { try { return JSON.parse(localStorage.getItem(KEY)).dunTk.gold; } catch (e) { return 'ERR'; } })(),
    }));
    chk(after.left === before.left - 1, 'C1 입장 횟수 −1', `${before.left} → ${after.left}`);
    chk(Math.abs(paid - before.want) < 1,
      'C2 이전 층 보상 실지급 (골드)', `+${paid.toFixed(0)} (기대 ${before.want.toFixed(0)})`);
    chk(after.cnt === before.cnt + 1, 'C3 던전 클리어 카운터 +1', `${before.cnt} → ${after.cnt}`);
    chk(!after.dgdOpen, 'C4 세부 팝업이 닫힌다', `열림=${after.dgdOpen}`);
    chk(after.dclOpen, 'C5 31 클리어 화면이 열린다', `열림=${after.dclOpen}`);
    chk(after.dclAmt === after.wantTxt, 'C6 클리어 화면 금액 = 실지급액', `${after.dclAmt} vs ${after.wantTxt}`);
    chk(after.saved === after.left, 'C7 세이브(S)에 반영된다', `저장 ${after.saved} / 메모리 ${after.left}`);
    /* HUD 골드는 `#goldN` 이고 58 «재화 흡수» 연출(`fxVal`)이 값을 굴려서 올린다 —
       클릭 직후가 아니라 **정착한 값**을 봐야 한다(93 교훈: 굴러가는 중간값을 재면 게이트가 흔들린다).
       ⚠ 시작값(0골드 → 표기 «0»)과 다른 값으로 «정착» 하는지를 함께 본다 —
       그 시작값 `hudStart` 는 **위(지급 앞)에서** 읽어 둔 것이다(649). 여기서 읽으면 롤이 이미
       끝난 판에서 «시작 = 정착» 이 되어 자가 부하에 따라 흔들린다. */
    /* 649-ANCHOR-POST */
    const settled = await p.waitForFunction(
      () => document.getElementById('goldN').textContent === fmtG(S.gold),
      null, { timeout: 8000 }).then(() => true).catch(() => false);
    const hud = await p.evaluate(() => ({
      txt: document.getElementById('goldN').textContent, want: fmtG(S.gold),
    }));
    chk(settled && hud.txt !== hudStart,
      'C8 HUD 골드(#goldN)가 지급 후 값으로 정착 — 다른 화면에 반영',
      `«${hudStart}» → «${hud.txt}» (S ${hud.want})`);
    chk(errs.length === 0, 'C9 콘솔·런타임 에러 0', `${errs.length}건 ${errs.slice(0, 2).join(' / ')}`);
    await ctx.close();
  }

  /* ================= [D] 123 분기 — 레이드·아레나 ================= */
  {
    const { ctx, p } = await boot(b, 2280);
    await p.evaluate(() => openRaidDetail(RAIDS[0]));
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => {
      const bn = document.getElementById('dgdBn'), cv = document.getElementById('dgdTh');
      const sw = document.getElementById('dgdSweep');
      return { on: bn.classList.contains('th-on'), k: cv.dataset.thk, want: RAIDS[0].ui.thk,
               sw: { lk: sw.classList.contains('lk'), dis: sw.disabled } };
    });
    chk(r.on && r.k === r.want, 'D1 레이드 — 그 측정장의 보스를 그린다', `${r.k} (기대 ${r.want})`);
    chk(r.sw.lk && r.sw.dis, 'D2 레이드 — 소탕 버튼은 자물쇠 + 비활성', `lk=${r.sw.lk} dis=${r.sw.dis}`);

    await p.evaluate(() => { closeDunDetail(); openArenaDetail(); });
    await p.waitForTimeout(450);
    const a = await p.evaluate(() => {
      const bn = document.getElementById('dgdBn'), sw = document.getElementById('dgdSweep');
      return { on: bn.classList.contains('th-on'), sil: getComputedStyle(bn.querySelector('b')).display,
               lk: sw.classList.contains('lk'), dis: sw.disabled };
    });
    chk(!a.on && a.sil === 'block', 'D3 아레나 — 썸네일 숨김, 종전 실루엣 유지', `th-on=${a.on} sil=${a.sil}`);
    chk(a.lk && a.dis, 'D4 아레나 — 소탕 버튼은 자물쇠 + 비활성', `lk=${a.lk} dis=${a.dis}`);
    /* 잠긴 버튼을 눌러도 아무 일도 없어야 한다.
       ⚠ 258(2026-08-27) — 이 단언은 원래 `S.gold` 도 같이 비교해서 **간헐 FAIL** 이었다.
       팝업 뒤에서 방치 사냥이 계속 도므로 300ms 안에 몹이 하나만 죽어도 골드가 저 혼자 늘어난다
       (3연속 실행에서 1회 FAIL — 258 착수 전 트리에서도 같다. 내 변경과 무관).
       소탕이 실제로 도는지는 «저절로 변할 수 없는 값» 으로만 재야 한다 —
       입장 횟수(`S.dunTk`) · 던전 클리어 카운터 · 31 클리어 화면(`#dclw`) 셋은 소탕 말고는 안 움직인다. */
    const inv = await p.evaluate(async () => {
      const b0 = JSON.stringify({ dun: S.dunTk, cnt: S.cnt.dungeon, d: S.dia });
      document.getElementById('dgdSweep').click();
      await new Promise(r => setTimeout(r, 300));
      return { same: b0 === JSON.stringify({ dun: S.dunTk, cnt: S.cnt.dungeon, d: S.dia }),
               dcl: document.getElementById('dclw').classList.contains('on') };
    });
    chk(inv.same && !inv.dcl, 'D5 아레나에서 소탕을 눌러도 입장 횟수·클리어 카운터·클리어 화면 불변',
      `불변=${inv.same} 클리어화면=${inv.dcl}`);
    await ctx.close();
  }

  /* ================= [E] 음성항 — 옛 트리로 갈아 끼운 사본 =================
     ★ CSS·JS 를 «올린 뒤 주입» 하지 않는다. 파일을 바꿔 **새로 연다**(191 교훈).
     ⚑ 646 — 사본 이름에 **`process.pid` 를 섞는다.** 고정 이름(`.v169-neg1.html` …)이면
       같은 자를 둘 이상 동시에 돌릴 때(저장소의 게이트 스윕 관행 — 638·639) 먼저 끝난 쪽의
       `unlinkSync` 가 **남의 사본을 지워** 다른 쪽이 통째로 죽는다
       (`Error: ENOENT ... unlink .v169-neg1.html` · 3병렬 3회 중 **2회 즉사**, C2 판정은 무관).
       사본을 저장소 루트에 두는 이유(`assets/*` 상대 경로 · 59·74·58·191 선례)는 그대로다. */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const negPath = n => path.join(ROOT, `.v169-neg${n}-${process.pid}.html`);
    /* 278 처방 — 정리 실패로 즉사시키지 않는다(그 항만 빨개지면 된다).
       `finally` 로 부르므로 [E] 블록이 도중에 던져도 사본은 남지 않는다. */
    const rmNeg = f => {
      try { fs.unlinkSync(f); }
      catch (e) { if (e.code !== 'ENOENT') console.log(`WARN 음성항 사본 정리 실패 — ${path.basename(f)} (${e.code})`); }
    };

    /* E1 — 옛 빈 핸들러: 눌러도 아무 일이 없어야 한다 */
    const NEG1 = negPath(1);
    const HANDLER = /\$\('dgdSweep'\)\.onclick = \(\) => \{[\s\S]*?\n\};/;
    const hit1 = src.match(HANDLER);
    chk(!!hit1, 'E0 음성항 사본 — `#dgdSweep` 핸들러를 찾았다', hit1 ? `${hit1[0].length}자` : '못 찾음');
    fs.writeFileSync(NEG1, src.replace(HANDLER, "$('dgdSweep').onclick = () => {};"));
    try {
      const { ctx, p } = await boot(b, 2280, 'file://' + NEG1);
      await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
      await p.waitForTimeout(300);
      /* ⚑ 643 — `S.gold` 를 축에서 뺐다. C2 와 **같은 결함**이 여기에도 있었다:
         400ms 동안 배경 방치 사냥이 몹을 하나 죽이면 빈 핸들러인데도 골드가 올라
         **음성항이 거짓 빨강**이 된다(258 이 D5 에서 이미 뺀 축인데 이 자리만 안 받았다).
         빠진 자리는 «소탕 말고는 안 움직이는» 값 둘로 메워 오히려 강해졌다 —
         클리어 카운터와 31 클리어 화면(D5 가 쓰는 그 셋). */
      const inv = await p.evaluate(async () => {
        const b0 = JSON.stringify({ l: S.dunTk.gold, c: S.cnt.dungeon });
        document.getElementById('dgdSweep').click();
        await new Promise(r => setTimeout(r, 400));
        return { same: b0 === JSON.stringify({ l: S.dunTk.gold, c: S.cnt.dungeon }),
                 dcl: document.getElementById('dclw').classList.contains('on') };
      });
      chk(inv.same && !inv.dcl,
        'E1 음성항 — 옛 빈 핸들러로 되돌리면 입장 횟수·클리어 카운터·클리어 화면 전부 불변',
        `불변=${inv.same} 클리어화면=${inv.dcl}`);
      await ctx.close();
    } finally { rmNeg(NEG1); }

    /* E2 — 옛 배너(캔버스 없음): 실루엣만 보이고 썸네일은 없다 */
    const NEG2 = negPath(2);
    const CV = /<canvas class="dgd-th" id="dgdTh" width="300" height="214"><\/canvas>/;
    const hit2 = src.match(CV);
    chk(!!hit2, 'E0b 음성항 사본 — 배너 캔버스를 찾았다', hit2 ? '찾음' : '못 찾음');
    fs.writeFileSync(NEG2, src.replace(CV, ''));
    try {
      const { ctx, p } = await boot(b, 2280, 'file://' + NEG2);
      await p.evaluate(() => openDunDetail(DUNGEONS[0]));
      await p.waitForTimeout(450);
      const m = await p.evaluate(() => {
        const bn = document.getElementById('dgdBn');
        return { on: bn.classList.contains('th-on'), cv: !!document.getElementById('dgdTh'),
                 sil: getComputedStyle(bn.querySelector('b')).display };
      });
      chk(!m.cv && !m.on && m.sil === 'block',
        'E2 음성항 — 캔버스를 빼면 썸네일이 사라지고 옛 실루엣이 남는다',
        `canvas=${m.cv} th-on=${m.on} sil=${m.sil}`);
      await ctx.close();
    } finally { rmNeg(NEG2); }

    /* ⚑ E3 — 643 되돌림 시험. C2 를 «같은 tick 측정» 으로 갈아 끼웠으니, 그 새 식이
       **여전히 진짜 결함을 잡는지**를 못박아야 한다(334 규약 — 무르게 푼 수리 금지).
       소탕이 «한 층 위» 보상을 주도록 갈아 끼운 사본에서 C2 의 식이 반드시 어긋나야 한다.
       ⚠ `giveReward(d.rw(f));` 는 파일에 두 자리다(26676 = [도전] 클리어 · 26772 = 소탕).
         앞줄 `S.dunTk[d.id]--; S.cnt.dungeon++;` 까지 묶어 **소탕 쪽만** 집는다. */
    const NEG3 = negPath(3);
    const PAY = 'S.dunTk[d.id]--; S.cnt.dungeon++;\n  giveReward(d.rw(f));';
    const hit3 = src.split(PAY).length - 1;
    chk(hit3 === 1, 'E0c 음성항 사본 — 소탕 지급 자리를 한 곳으로 집었다', `${hit3}곳`);
    fs.writeFileSync(NEG3, src.replace(PAY,
      'S.dunTk[d.id]--; S.cnt.dungeon++;\n  giveReward(d.rw(f + 1));'));
    try {
      const { ctx, p } = await boot(b, 2280, 'file://' + NEG3);
      await openList(p);
      await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
      await p.waitForTimeout(300);
      const n = await p.evaluate(() => {
        const want = DUNGEONS[0].rw(S.dun.gold - 1).gold, g0 = S.gold;
        document.getElementById('dgdSweep').click();
        return { paid: S.gold - g0, want };
      });
      /* 같은 자·같은 허용 오차(1)로 재서 **빨개져야** 통과다 */
      chk(Math.abs(n.paid - n.want) >= 1,
        'E3 음성항 — 지급을 한 층 위 보상으로 갈면 C2 의 새 식이 그대로 빨개진다',
        `지급 ${n.paid.toFixed(0)} vs 기대 ${n.want.toFixed(0)} (차 ${(n.paid - n.want).toFixed(0)})`);
      await ctx.close();
    } finally { rmNeg(NEG3); }

    /* ⚑ E4 — 649 되돌림 시험. C8 의 시작값을 «지급 앞» 으로 옮겼으니, 그 새 식이
       **여전히 진짜 결함을 잡는지**를 못박아야 한다(334·643 규약 — 무르게 푼 수리 금지).
       가장 무른 수리는 `hud.txt !== hudStart` 항을 빼는 것이고, 그러면 «HUD 가 아예 안 움직여도
       초록» 이 된다. 그래서 **HUD 골드를 얼린 사본**(58 롤 대입 한 줄을 no-op 으로)에서
       C8 과 **똑같은 식**이 반드시 빨개져야 한다.
       ⚠ 정착 대기는 3000ms 로 줄인다 — 실측 롤은 500ms 안에 끝나므로(`probe649` §3) 넉넉하고,
         C8 의 8000ms 를 그대로 쓰면 얼어붙은 사본에서 매 실행 8초를 버린다.
       ⚠ 이 사본은 `giveReward` 를 안 건드린다 — `S.gold` 는 정상으로 오르고 **표시만** 얼어야
         «다른 화면에 반영» 이라는 C8 의 뜻이 그대로 시험된다. */
    const NEG4 = negPath(4);
    const HUDLINE = "$('goldN').textContent = fmtG(fxVal('gold'));";
    const hit4 = src.split(HUDLINE).length - 1;
    chk(hit4 === 1, 'E0d 음성항 사본 — HUD 골드 대입 자리를 한 곳으로 집었다', `${hit4}곳`);
    fs.writeFileSync(NEG4, src.replace(HUDLINE, '/* E4: HUD 골드 표시를 얼린다 */'));
    try {
      const { ctx, p } = await boot(b, 2280, 'file://' + NEG4);
      await openList(p);
      await p.evaluate(() => { S.gold = 0; S.dun.gold = 5; S.dunTk.gold = 2; openDunDetail(DUNGEONS[0]); });
      await p.waitForTimeout(300);
      const nStart = await p.evaluate(() => document.getElementById('goldN').textContent);
      const nPaid = await p.evaluate(() => {
        const g0 = S.gold;
        document.getElementById('dgdSweep').click();
        return S.gold - g0;
      });
      await p.waitForTimeout(500);
      const nSettled = await p.waitForFunction(
        () => document.getElementById('goldN').textContent === fmtG(S.gold),
        null, { timeout: 3000 }).then(() => true).catch(() => false);
      const nHud = await p.evaluate(() => ({
        txt: document.getElementById('goldN').textContent, want: fmtG(S.gold),
      }));
      /* C8 과 같은 식으로 재서 **빨개져야** 통과다. 지급 자체는 살아 있어야 시험이 성립한다. */
      chk(nPaid > 0 && !(nSettled && nHud.txt !== nStart),
        'E4 음성항 — HUD 골드를 얼리면 C8 의 새 식이 그대로 빨개진다 (시작값을 앞으로 옮겨도 축은 살아 있다)',
        `지급 +${nPaid.toFixed(0)} · «${nStart}» → «${nHud.txt}» (S ${nHud.want}) · 정착=${nSettled}`);
      await ctx.close();
    } finally { rmNeg(NEG4); }
  }

  /* ================= [F] 회귀 — 도전 버튼·팝업 흐름 불변 ================= */
  {
    const { ctx, p, errs } = await boot(b, 2280);
    await p.evaluate(() => { S.dun.gold = 5; S.dunTk.gold = 0; openDunDetail(DUNGEONS[0]); });
    await p.waitForTimeout(280);
    const g0 = await p.evaluate(() => ({ dis: document.getElementById('dgdGo').disabled }));
    chk(g0.dis, 'F1 [도전] — 입장 횟수 0 이면 비활성(종전 규칙 불변)', `dis=${g0.dis}`);
    await p.evaluate(() => { S.dunTk.gold = 2; renderDunDetail(); });
    await p.waitForTimeout(200);
    const g1 = await p.evaluate(() => ({ dis: document.getElementById('dgdGo').disabled }));
    chk(!g1.dis, 'F2 [도전] — 횟수가 있으면 활성', `dis=${g1.dis}`);
    /* 세부 팝업의 다른 필드가 그대로인지 (썸네일이 렌더 순서를 깨지 않았는가) */
    const f = await p.evaluate(() => ({
      title: document.getElementById('dgdTitle').textContent,
      floor: document.getElementById('dgdFloor').textContent,
      tryTxt: document.getElementById('dgdTry').textContent,
      amt: document.getElementById('dgdAmt').textContent,
    }));
    /* 204 — 분모는 «하루 입장 횟수 3» 이 아니라 «표기 기준 DUN_TRY(=2)» 다. 상한이 없어 N 이
       분모를 넘을 수 있으므로 여기서도 상수에서 뽑아 쓴다(값을 다시 박으면 또 굳는다). */
    const den = await p.evaluate(() => DUN_TRY);
    chk(f.title === '황금 동굴' && f.floor === '5' && f.tryTxt === '2/' + den && f.amt.length > 0,
      'F3 세부 팝업 표시 필드 불변', JSON.stringify(f));
    chk(errs.length === 0, 'F4 콘솔·런타임 에러 0', `${errs.length}건`);
    await ctx.close();
  }

  await b.close();
  console.log(`\nVERIFY169 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
