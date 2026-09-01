#!/usr/bin/env node
/* 채점 캡처 — 작업 471 비평 루프 (주인 지시: 비평가 2명 독립 · 둘 다 ≥9/10)
 *
 *   node tools/cap471.js [회차]
 *
 * 주인 보강대로 채점 축은 하나다 — «전 화면 레드닷이 기준 그림과 같은 코너 걸침인가 ·
 * 잘린 점 0 · 호스트별 일관성». 그러려면 **나란히 놓아야 한다**(411 이 남긴 교훈:
 * 따로 보면 셋 다 그럴듯하다). 그래서 자리마다 «호스트 + 닷» 만 잘라 한 장에 격자로 붙인다.
 *
 * 출력 — `docs/review/471-r<n>-대조.png` (한 장) · 좌표·라벨은 stdout 의 표.
 * ⚠ `docs/review/*.png` 는 .gitignore 로 막혀 있다(커밋하지 마라 — 증거는 review .md 의 수치다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review', '471-r' + R + '-대조.png');

/* 자리 = probe471 과 **같은 순서·같은 진입**(자매 자 드리프트 방지). 여기서는 «잘라 낼 상자» 만 더 준다. */
const STEPS = [
  ['HUD 탭바', async p => {}, '#tabbar .tab.alert .bdg', '.tab'],
  ['HUD 사이드', async p => {}, '.ibtn.on .bdg', '.ibtn'],
  ['▦ 메뉴 버튼', async p => {}, '#menub .bdg', '#menub'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 화면을 차례로 열며 «호스트 상자 + 여백 46» 을 잘라 모은다. 진입은 verify299/probe471 과 같은 목록. */
  const shots = [];

  /* ⚑⚑ 7회차 2차 수리 — 잉크 호스트의 «칠해진 화소» 우상단을 **클립 차분**으로 잰다.
     A(그대로) · B(닷 아닌 자식들을 숨김) · A2(되돌림) 세 장을 찍어 A↔B 로 달라진 화소 중
     **A↔A2 도 달라진 것(스스로 다시 그리는 화소)을 뺀다** — `probe471 --ink`·`probe471c` 와 같은 규칙이라
     시트와 자가 같은 것을 본다(385 «자매 자 드리프트» 방지). 문턱도 같은 core(>60):
     번짐(glow·shadow)까지 세면 사람이 «변» 으로 보는 모양이 아니게 된다. */
  /* ⚑⚑ 742 (2026-09-01) — **재는 동안 «형제 칸» 이 계속 뛰고 있었다.**
     아래 `grab()` 은 호스트 subtree 와 **조상**만 세운다(7회차). 그런데 잉크는 «호스트 상자 + 여백 30»
     을 잘라 재고, 02 사이드는 피치 134 · 칸 높이 114 라 **아래 여백 30 이 다음 칸을 10px 먹는다**.
     그 자리에 있는 것이 이웃 칸 닷의 바깥 링(box-shadow 7.5px)이고 그 닷은 `jzDotPulse ∞×2000` 으로
     **계속 부풀었다 줄었다** 한다 ⇒ A↔B 사이에 위상이 바뀌면 그 링 화소가 «달라진 화소» 로 잡히고,
     A↔A2 는 (주기가 2초라) 같은 위상으로 돌아와 배제 규칙(j≤10)도 통과한다.
     ⇒ 이웃의 링이 **내 글리프의 잉크**로 실려 우변이 136 → 146~151.5 로 튄다(실측 `probe742`:
     20회 중 2회 · 튄 값 151.5/151 · 튄 화소 (145.5~146, 301.5~303) = 이웃 #2 닷 링).
     `verify471` [T] 두 항(«상자 밖 0» · «자매 자 드리프트 ≤1px»)이 실행마다 갈리던 것이 이것이다 —
     146 − 136 = 10.00 이 등재문의 «드리프트 10.00px» 과 같은 수인 것이 한 사건임을 말한다.
     ⇒ **`probe471c` 와 같은 규칙으로 화면 전체를 세운다**(무한은 0프레임 · 유한은 끝). 자매 자를
     맞추는 것이 이 파일의 원칙이고(385), 문턱은 한 칸도 안 넓혔다. */
  const settleAll = () => page.evaluate(() => {
    for (let k = 0; k < 12; k++) {
      document.getAnimations().forEach(a => { try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
      } catch (_) {} });
    }
    return document.getAnimations().filter(a => a.playState === 'running').length;
  });

  const inkCorner = async (hostSel, idx, box) => {
    const clip = {
      x: Math.max(0, Math.floor(box.x - 30)), y: Math.max(0, Math.floor(box.y - 30)),
      width: Math.min(1080 - Math.max(0, Math.floor(box.x - 30)), Math.ceil(box.w + 60)),
      height: Math.min(2280 - Math.max(0, Math.floor(box.y - 30)), Math.ceil(box.h + 60)),
    };
    if (clip.width < 2 || clip.height < 2) return null;
    const kids = (on) => page.evaluate(([s, i, show]) => {
      const h = document.querySelectorAll(s)[i];
      if (!h) return 0;
      const ks = [...h.children].filter(e => !e.matches('.updot,.bdg,s.dot,.dot'));
      ks.forEach(e => { e.style.visibility = show ? '' : 'hidden'; });
      return ks.length;
    }, [hostSel, idx, on]);
    /* ⚠⚠ **닷을 세 장 모두에서 숨긴 채로 잰다.** 닷이 켜져 있으면 그것이 글리프의 **우상단을 덮어**
       A·B 양쪽에서 같은 화소가 되고, 그 자리는 차분에서 사라진다 ⇒ 잉크 상자가 «안쪽으로» 작게
       읽힌다(실측 우 −2.5 · 상 +2.5). 하필 우리가 재려는 것이 그 코너다.
       `probe471 --ink` 는 처음부터 닷을 숨기고 재므로, 안 맞추면 자매 자가 또 갈린다. */
    const dot = (show) => page.evaluate(([s, i, sh]) => {
      const h = document.querySelectorAll(s)[i];
      if (!h) return;
      h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.visibility = sh ? '' : 'hidden'; });
    }, [hostSel, idx, show]);
    /* ⚠⚠⚠ **잉크를 잴 때는 전투 캔버스를 도로 보이게 한다.** 숨긴 채로 재면 뒤가 새까매서
       «검정 위 검정» 이 통째로 «안 칠한 것» 으로 읽힌다 — `.ibtn .si` 는 일부러 근흑 외곽선
       (`drop-shadow` 4방향 · `--o` = 2.3px)을 두르는데(948행) 그 테가 차분에서 사라져
       잉크 상자가 **우 −2.5 · 상 −2.5px** 작게 나온다. `probe471` 이 `--ink` 에서 캔버스를
       도로 켜는 이유가 정확히 이것이고(281행 주석 «자가 만든 유령»), 여기서 안 맞추면
       시트의 십자선이 자보다 2.5px 안쪽에 그어져 **비평가가 «걸침이 짧다» 를 읽는다**
       (7회차 BY·BZ 2인 독립 지적이 그 값이었다). `step` 이 이미 빈 함수라 정지 화면이다. */
    const view = (show) => page.evaluate(sh => {
      const v = document.getElementById('view'); if (v) v.style.visibility = sh ? '' : 'hidden';
    }, show);
    /* 742 — 세 장을 찍기 **직전**에 세운다(장면마다 새 애니가 난다 — 한 번 세워 두는 것으로는 부족하다).
       `P471_NOSETTLE=1` 은 되돌림 시험용 손잡이다(`verify742` §R) — 평소에는 쓰지 않는다. */
    if (process.env.P471_NOSETTLE !== '1') await settleAll();
    await view(true);
    await dot(false);
    const A = await page.screenshot({ clip });
    if (!await kids(false)) return null;
    const B = await page.screenshot({ clip });
    await kids(true);
    const A2 = await page.screenshot({ clip });
    await dot(true);   /* 시트 타일은 닷이 **보이는** 그림이어야 한다 — 측정이 끝나면 되돌린다 */
    await view(false); /* 타일 배경은 캔버스 없이(회차마다 다르게 그려지면 대조가 안 된다) */
    return page.evaluate(async ([a64, b64, a264, cl, dsf]) => {
      const load = async (s) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height);
      };
      const A = await load(a64), B = await load(b64), A2 = await load(a264);
      if (A.width !== B.width || A.height !== B.height || A2.width !== A.width) return null;
      let t = 1e9, r = -1e9, cnt = 0;
      for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > 60 && j <= 10) { cnt++; if (x > r) r = x; if (y < t) t = y; }
      }
      return cnt ? { r: cl.x + (r + 1) / dsf, t: cl.y + t / dsf, n: cnt } : null;
    }, [A.toString('base64'), B.toString('base64'), A2.toString('base64'), clip, 2]);
  };
  const grab = async (label, hostSel, note, idx) => {
    const box = await page.evaluate(([s, i]) => {
      const all = document.querySelectorAll(s);
      const h = all[i || 0];
      if (!h) return null;
      /* ⚑⚑ 7회차 2차 — **무한 애니를 «끝 프레임» 으로 보내면 안 된다.** `duration` 은 무한 반복이라도
         유한한 한 바퀴 길이(맥박 2000ms)라 그 자리는 base 가 아니라 **부푼 프레임**이다.
         그 뒤에 `animation:'none'` 을 얹어도 `#menub .bdg` 는 base 로 안 돌아왔다(실측: 상자 27 → 30.75 ·
         그려진 지름 42 → 48 = **+14%**) — 5·7회차 네 비평가(BU·BV·BY·BZ)가 독립으로 45.6~47.4 를
         읽은 값이 정확히 이것이다. 제품은 결백하다(base 에서 재면 42, 다른 칸과 같다).
         ⇒ `probe471` 의 `settle()` 과 **같은 규칙**을 쓴다: 무한은 0프레임에 세우고 유한만 끝으로 보낸다. */
      h.getAnimations({ subtree: true }).forEach(a => { try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
      } catch (_) {} });
      /* ⚑ 3회차 비평(BR) — 04·15 가 «세로 인셋비 0.82(기준의 1.9배)» 로 읽혔다. 제품 실측은 11px 이다.
         뿌리는 **닷의 맥박 애니메이션을 «끝 프레임» 에 세운 것**이다(위 줄) — 무한 반복 키프레임의
         100% 는 base 가 아니라 커진·밀린 상태라 시트의 점이 자 값과 다른 자리에 찍힌다.
         `probe471` 은 같은 자리를 `animation:'none'`(= base)으로 잰다 ⇒ **두 자가 다른 것을 보고 있었다**
         (385 «자매 자 드리프트»). 시트 쪽을 자에 맞춘다. */
      h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.animation = 'none'; });
      /* ⚑⚑ 7회차 (550 «드레인» 의 재발) — **조상의 등장 애니가 호스트를 움직인다.**
         6회차 비평가 BW·BX 가 «15 장비 슬롯은 십자선이 빈 여백에 떠 있고 점은 22px 아래» 로
         일치했는데 `probe471` 은 같은 자리를 11/11 로 읽었다 — 두 자가 갈리면 자를 의심한다.
         뿌리: `.eqsl.s1{top:calc(134px + 0.09502 × (100% − 160px))}` 이라 **부모 높이가 애니 중이면
         상자가 세로로 움직이는데**, 위 줄은 호스트 «자신의 subtree» 만 멎게 하고 조상은 안 멎게 했다.
         측정과 촬영 사이에 자리가 바뀌면 십자선만 옛 자리에 남는다(3회차 십자선 결함의 재발형).
         ⇒ **조상 쪽 애니도 끝 프레임에 세운다**(`probe471` 은 이미 멎은 뒤에 읽는다 — 자매 자를 맞춘다). */
      for (let a = h.parentElement; a; a = a.parentElement) {
        a.getAnimations().forEach(an => { try {
          const t = an.effect && an.effect.getTiming ? an.effect.getTiming() : null;
          if (t && t.iterations === Infinity) { an.currentTime = 0; an.pause(); } else { an.finish(); }
        } catch (_) {} });
      }
      let r = h.getBoundingClientRect();
      /* ⚑ 3회차 — 스크롤 그릇 밖으로 밀려난 자리(35 패스 보상 칸)는 «상자 없음» 으로 조용히 빠져
         **빈 칸이 채점에 실렸다**(1회차 비평이 빈 칸 셋을 «가장 나쁜 자리» 로 꼽았던 그 사고).
         자리는 있는데 안 보이는 것뿐이니 **끌어와서 찍는다.** */
      if (r.width && (r.bottom < 0 || r.top > innerHeight)) {
        try { h.scrollIntoView({ block: 'center' }); } catch (_) {}
        r = h.getBoundingClientRect();
      }
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
      /* ⚑ 4회차 비평(BV) — «03 메뉴 버튼 닷만 바깥지름 45.6 = 선언 40 의 1.14배, 맥박 잔재 의심».
         눈으로만 재던 값을 **시트 자신이 텍스트로 같이 뱉게** 한다(자를 자로 검산 — 385 처방).
         맥박 봉우리면 여기 40 이 아니라 45.6 이 찍힌다. */
      /* ⚑⚑ 7회차 — **잉크 호스트는 십자선을 «상자» 코너에 그리면 안 된다.**
         `.ibtn{background:none}` 이라 상자를 아무도 안 칠하고 보이는 것은 이모지+라벨뿐이라,
         4회차가 `--dot-in-x/y` 를 **잉크 기준 11/11** 이 되게 20/7 로 옮겨 놓았다
         (`verify471` [F] · `probe471 --ink`). 그런데 이 시트는 십자선을 상자 코너에 그려
         **제품이 겨눈 자리가 아닌 곳**을 «코너» 라고 보여 줬고, 6회차 비평가 BW·BX 가
         독립으로 «19.4px 안쪽 = 걸침 소실» 을 읽었다 — 주어진 그림 안에서는 옳은 읽기다.
         ⇒ 잉크 호스트는 **칠해진 화소의 우상단**을 코너로 삼는다. 상자 코너도 회색 점선으로
         같이 그려 «둘이 왜 다른가» 를 그림이 말하게 한다(라벨에도 적는다). */
      /* ⚑⚑ 7회차 2차 수리 — **«자식 상자» 는 «칠해진 화소» 가 아니다.**
         위 주석대로 «칠해진 화소의 우상단» 을 코너로 삼겠다고 적어 놓고 실제로는 자식들의
         `getBoundingClientRect()` 합집합을 썼다. `.ibtn .si` 는 **폭이 `--ih×1.6`(131px)** 이라
         100px 짜리 버튼 밖으로 좌우 15.5px 씩 일부러 넘치는 상자다(1004·948행 주석) ⇒
         그 상자의 우변은 **167** 인데 글리프가 실제로 칠해지는 우변은 **133~138** 이다.
         십자선을 167 에 그으면 점(중심 125)이 «코너에서 42px 안쪽» 으로 보인다 — 6회차에
         고치려던 그 오독을 **더 크게** 되풀이하는 것이다.
         ⇒ 상자는 여기서 «잉크 호스트인가» 만 말하고, **코너는 클립 차분으로 페이지 밖에서 잰다**
            (`probe471 --ink`·`probe471c` 와 같은 방식 = 자매 자를 맞춘다). */
      const INK = ['ibtn'];
      const isInk = INK.some(c => h.classList.contains(c));
      const d0 = h.querySelector('.updot,.bdg,s.dot,.dot');
      /* ⚑ 6회차 — 호스트에 점등 클래스를 얹어도 **다시 그려지면서 벗겨지는** 자리가 있다
         (사이드 `promo`·`coll` 칸이 그랬다: `.on` 을 얹었는데 촬영 시점엔 `display:none`).
         1회차가 «빈 칸 셋» 으로 잃은 그 사고라, 클래스에 기대지 말고 **노드 자신을 켠다**
         (`probe471` 도 같은 방식으로 잰다 — 자매 자를 맞춘다). */
      if (d0 && getComputedStyle(d0).display === 'none') d0.style.display = 'block';
      const dr = d0 ? d0.getBoundingClientRect() : null;
      return { x: r.left, y: r.top, w: r.width, h: r.height, n: all.length, isInk,
        dw: dr && dr.width ? Math.round(dr.width * 100) / 100 : null };
    }, [hostSel, idx || 0]);
    if (!box) { console.log('  (건너뜀) ' + label + ' — 상자 없음'); return; }
    /* ⚑ 2회차 비평(BP) 이 드러낸 **이 자의 결함** — 1·2회차 시트는 칸마다 «호스트 전체 + 여백» 을 잘라
       `k = min((CELL-24)/w, CELL/h, 1.6)` 로 **칸마다 다른 배율**로 붙였다. 그래서 980px 짜리 카드는
       0.48배, 100px 짜리 아이콘은 1.6배로 실려 **같은 11px 이 시트에서 5px 과 35px 으로 보인다.**
       비평가가 «03 은 21px 안쪽» 이라고 적은 것이 그것이다(제품 실측은 11.0).
       «나란히 놓고 비교» 하려면 **모든 칸이 같은 배율·같은 크기의 창**이어야 한다.
       ⇒ 호스트 전체가 아니라 **우상단 코너를 중심으로 한 고정 창(제품 240×240px)** 을 잘라
          모든 칸을 같은 배율로 붙인다. 코너 걸침만 보는 채점이라 이 창이면 충분하고, 칸끼리
          «몇 px 안쪽인가» 를 눈으로 직접 견줄 수 있다. */
    const WIN = 240;
    /* 7회차 — 잉크 호스트는 «칠해진 화소» 의 우상단이 제품이 겨눈 코너다(위 주석).
       ⚠ 실패하면 **소리 내어** 상자 코너로 되돌린다 — 조용히 되돌리면 라벨만 «잉크 기준» 이라
       적힌 채 상자 코너를 보여 주게 되어 비평가를 두 번 속인다(1회차 «빈 칸» 사고와 같은 뿌리). */
    let cxr = box.x + box.w, cyr = box.y, isInk = false;
    if (box.isInk) {
      const ink = await inkCorner(hostSel, idx || 0, box);
      if (ink) { cxr = ink.r; cyr = ink.t; isInk = true; }
      else console.log('  ⚠ 잉크 측정 실패 — ' + label + ' → 상자 코너로 되돌림(라벨도 안 붙인다)');
    }
    const bxr = box.x + box.w, byr = box.y;   /* 상자 코너 — 회색 점선으로 같이 그린다 */
    const clip = { x: Math.max(0, Math.min(1080 - WIN, cxr - WIN * 0.62)),
                   y: Math.max(0, Math.min(2280 - WIN, cyr - WIN * 0.38)),
                   width: WIN, height: WIN };
    const buf = await page.screenshot({ clip });
    /* ⚑ 3회차 비평(BR)이 잡은 **이 자의 두 번째 결함** — 십자선을 «창의 0.62/0.38 자리» 에
       고정으로 그리고 있었다. 창이 **화면 변에서 잘리면**(`Math.min(1080-WIN, …)`) 코너는
       그 자리에 안 온다: `#menub`(우변 1036)·03 던전 카드(우변 1030)는 창이 x840 에 물려
       코너가 창 안 196·190 에 오는데 십자선은 148.8 에 그려졌다 ⇒ 사람 눈에는 점이 코너에서
       **67·57px 밖으로 떨어진 것**으로 보인다(BR 실측과 정확히 일치 — 제품은 둘 다 11px 이다).
       ⇒ 십자선 자리를 **창 안의 실제 코너 좌표**로 같이 실어 보낸다. */
    shots.push({ label: label + (isInk ? '  [잉크 코너 기준]' : ''),
      note: isInk ? (note ? note + ' · ' : '') + '실선 = 칠해진 그림의 코너(제품이 겨눈 곳) · 점선 = 빈 상자 코너' : note,
      b64: buf.toString('base64'), w: clip.width, h: clip.height,
      fx: (cxr - clip.x) / clip.width, fy: (cyr - clip.y) / clip.height,
      bx: isInk ? (bxr - clip.x) / clip.width : null,
      by: isInk ? (byr - clip.y) / clip.height : null });
    console.log('  ' + label.padEnd(28) + Math.round(box.w) + '×' + Math.round(box.h)
      + ' @ (' + Math.round(box.x) + ',' + Math.round(box.y) + ')'
      + '  닷Ø' + (box.dw === null ? '—' : box.dw)
      /* 잉크 칸은 «상자 코너 ↔ 그림 코너» 를 stdout 에도 싣는다 — 시트가 어디에 십자선을
         그었는지를 숫자로 되짚을 수 있어야 다음 세션이 자를 의심할 수 있다(385 처방). */
      + (isInk ? '  잉크코너 (' + Math.round(cxr * 10) / 10 + ',' + Math.round(cyr * 10) / 10
        + ') ↔ 상자코너 (' + Math.round(bxr) + ',' + Math.round(byr) + ')' : '')
      + (note ? '  ' + note : ''));
  };

  const ev = f => page.evaluate(f).catch(() => {});
  const wait = ms => page.waitForTimeout(ms);
  /* ⚑ 1회차 비평(BM·BN 2인 독립 일치) — **세 칸이 빈 채로 채점에 나갔다**(05 던전 카드 · 16 [일괄 강화] ·
     17 스킬 카드). 둘 다 그 셋을 «가장 나쁜 자리» 로 꼽았는데 결함은 제품이 아니라 **이 자였다** —
     그 닷들은 조건이 맞을 때만 노드가 찍히는데 캡처가 조건을 안 만들었다. 351lib 이 여러 회차에 걸쳐
     배운 것과 같은 사고(«조용한 실패가 채점에 그대로 실린다»)라 같은 처방을 쓴다:
     **호스트를 점등 상태로 만들고, 노드가 없으면 만들어 준다. 못 만들면 소리 내어 건너뛴다.** */
  const arm = (hostSel, cls) => page.evaluate(([s, c]) => {
    const hs = [...document.querySelectorAll(s)];
    hs.forEach(h => {
      h.classList.add('alert');
      if (!h.querySelector(':scope > .' + c)) {
        const e = document.createElement('s'); e.className = c; h.appendChild(e);
      }
    });
    return hs.length;
  }, [hostSel, cls || 'updot']).then(n => { if (!n) console.log('  ⚠ arm 실패 — ' + hostSel + ' 0개'); })
    .catch(() => console.log('  ⚠ arm 예외 — ' + hostSel));

  console.log('CAP471 — ' + R + '회차 대조 캡처\n');
  await ev(() => { document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('01 탭바 «상점» 칸', '#tabbar .tab:last-child', '예외 — 프레임 변(우변 1080 플러시 ⇒ 21)');
  /* ⚑ 6회차 — §10 ③. 5회차까지 이 자리는 **6칸 중 «출석» 한 칸만** 시트에 실렸다. 그런데 제품의
     `--dot-in-x/y` 는 6칸 **평균 잉크**로 잡은 상수이고 칸별 잉크 우변 편차가 6~11px 이라,
     비평가는 매번 «규약 11 에 2px 못 미친다» 를 보고 그것이 그 한 칸의 편차인지 상수의 결함인지
     **구별할 재료가 없었다**(BU·BV 5회차 일치 지적). 여섯 칸을 다 붙이면 «상수 하나로 5px 편차를
     못 덮는다» 가 그림에서 바로 읽힌다 — 자가 못 보여 줘서 지던 자리를 자로 갚는다. */
  /* ⚠ 점등은 `.ibtn.on .bdg{display:block}` 이라 **여섯 칸을 다 켜 놓고** 찍어야 한다 —
     안 켜면 4·5번 칸이 «닷 없는 빈 칸» 으로 채점에 실린다(1회차가 정확히 그 사고로 셋을 잃었다). */
  await ev(() => { document.querySelectorAll('.side .ibtn').forEach(b => b.classList.add('on')); });
  await wait(200);
  for (let i = 0; i < 6; i++) {
    await grab('02 사이드 아이콘 #' + (i + 1) + '/6', '.side .ibtn', i === 0 ? '6칸 전수 — 잉크 편차가 상수 하나로 안 덮인다' : '', i);
  }
  await ev(() => { document.getElementById('menub').classList.add('alert'); });
  await wait(150);
  await grab('03 ▦ 메뉴 버튼', '#menub', '');

  await ev(async () => { openDungeon(); });
  await wait(500);
  await ev(() => { document.querySelectorAll('#dunw .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('04 03 던전 서브탭', '#dunw .stab', '');
  await arm('#dunw .dns-list .dnc', 'dot');
  await wait(200);
  await grab('05 03 던전 카드', '#dunw .dnc', '');
  await ev(() => { if (typeof closeDungeon === 'function') closeDungeon(); });
  await wait(200);

  await ev(async () => { QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9; openQuest('rep'); });
  await wait(600);
  await grab('06 22 [모두 받기] ★기준', '#qAll', '주인이 «맞다» 고 지목한 모양');
  await grab('07 22 행 [보상 받기]', '.qs-b', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.att = { n: 3, date: '' }; openAttend(); });
  await wait(500);
  await grab('08 70 출석 «오늘 카드»', '#mbox [data-att]', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await wait(600);
  await grab('09 13 광고 [받기] 버튼', '#shopList .cn-cd .bt[data-cnad]', '479 — 카드에서 버튼으로');
  await ev(() => { document.querySelectorAll('#shopCats .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('10 10 상점 서브탭', '#shopCats .stab', '주인 스크린샷 ① «반달» 자리');
  await ev(async () => { openShopPage(null, 'summon'); });
  await wait(500);
  /* ⚑ 4회차 비평 — BS·BT **둘 다 이 칸을 «채점 불능»** 으로 돌려보냈다. 창을 **카드** 코너에
     맞춰 잘랐는데 328 규약상 이 닷이 붙는 곳은 **버튼(`.cbtn.b1`) 코너**라, 십자선은 닷에서
     70/158 제품px 떨어진 자리에 찍히고 닷 자신은 창 아래로 밀려났다(BS: «닷 중심이 창 밖 16.5
     시트px»). 3회차에 «창이 화면 변에 물리는» 결함을 고쳤는데 이 칸은 **호스트가 뒤바뀐 채**였다.
     ⇒ 크롭·십자선을 그 닷이 실제로 겨누는 **버튼** 코너에 맞춘다(노드가 카드 자식인 것은 그대로). */
  await grab('11 10 «10회 소환» 버튼', '#shopList .shp-card .cbtn.b1',
    '예외 — 노드는 카드 자식이되 좌표는 이 버튼 코너 기준(328)');
  await ev(() => closeShopPage());
  await wait(200);

  await ev(async () => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; openBless(); });
  await wait(500);
  await grab('12 34 축복 «받기» 알약', '.bls-c .tm', '');
  await ev(() => closeBless());
  await wait(200);

  await ev(async () => { S.daily.spins = 1; openRoulette(); });
  await wait(500);
  await grab('13 29 [룰렛 돌리기]', '#rouBtn', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.relic = 1e6; openRelw(); });
  await wait(500);
  await grab('14 89 유물 수반', '#rwBasin', '예외 — 상자 코너가 투명(림에 맞춤)');
  await ev(() => closeRelw());
  await wait(200);

  await ev(async () => { goTab('hero', true); heroSubGo('eq'); });
  await wait(600);
  await arm('#bEq .eqsl,.eqsl');
  await wait(250);
  await grab('15 06 장비 슬롯', '.eqsl', '');
  await ev(async () => { heroSubGo('sk'); });
  await wait(600);
  await arm('#bSk .sk-btn');
  await arm('#bSk .sk-card');
  await wait(250);
  await grab('16 07 [일괄 강화] 버튼', '#bSk .sk-btn', '');
  await grab('17 07 스킬 카드', '#bSk .sk-card', '4회차 — 점유물([+])을 좌상단으로 옮기고 코너를 닷에게 줬다');
  /* ⚑ 6회차 신설 — **주인이 지목한 «그 슬롯들»**(재지시 2026-08-31: «그 슬롯들에 빨간점 위치
     여전히 좆같음»). 5회차까지 시트는 07 스킬 시트 한 장만 실었고 **장착 슬롯 줄(`.sk-slot`)과
     26 펫·50 코스튬은 한 칸도 없었다** — 주인이 보고 있는 자리가 채점표에 아예 없었던 것이다.
     세 시트가 같은 부품을 공유한다는 것은 «한 장만 봐도 된다» 는 뜻이 아니다(411 교훈:
     «따로 보면 셋 다 그럴듯하다» — 나란히 놓아야 어긋남이 보인다). */
  /* ⚑⚑ 7회차 — **장착 슬롯 줄(`.sk-slot`)은 시트에서 뺐다.** 6회차에 «주인이 «슬롯» 이라 했으니
     슬롯을 싣자» 며 `arm()` 으로 닷 노드를 **만들어 붙였는데**, 제품은 `.sk-slot` 에 레드닷을
     **한 번도 안 만든다**(`updot` 을 뱉는 자리는 `canLevel(it)` 카드 31797·31900 과
     `.sk-btn` 31818·31919 뿐이다). ⇒ 비평가 둘이 **존재할 수 없는 그림**을 채점했고, 둘 다
     «링이 흰 배지를 4.0/8.1px 덮는다» 로 감점했다. 그 지적 자체는 **설계 사실로서 유효**하므로
     버리지 않고 review §11-5 ② 에 남겼다(훗날 슬롯에 닷을 다는 지시가 오면 그 자리부터 본다).
     ⚠ **«강제 점등»(좌표를 재려고 켜는 것)과 «이 화면에 원래 닷이 있는가» 는 다른 질문이다.**
        섞으면 이번 같은 일이 또 난다. 카드(22·24)는 실제로 닷이 뜨는 자리라 남긴다. */
  await ev(async () => { heroSubGo('pet'); });
  await wait(650);
  await arm('#bPet .sk-card');
  await wait(250);
  await grab('22 26 펫 카드', '#bPet .sk-card', '6회차 신설 — 주인 지목 시트');
  await ev(async () => { heroSubGo('cos'); });
  await wait(650);
  await arm('#bCos .sk-card');
  await wait(250);
  await grab('24 50 코스튬 카드', '#bCos .sk-card', '6회차 신설 — 주인 지목 시트');
  /* 21 도감 세트별 [강화] — 516 이 471 5회차 «뒤에» 만든 여섯 번째 예외(가로만 16). 시트에 없었다. */
  await ev(async () => { openColl21(); });
  await wait(650);
  await arm('#collw .clb-btn');
  await wait(250);
  await grab('25 21 도감 세트 [강화]', '#collw .clb-btn', '예외 — .cl-body 가로 클리핑 13px ⇒ 16(516)');
  await ev(() => { if (typeof closeColl21 === 'function') closeColl21(); });
  await wait(250);
  await ev(async () => { goTab('hero', true); heroSubGo('sk'); });
  await wait(650);

  await ev(async () => { openPass('stage'); });
  await wait(600);
  await arm('#psTk .ps-bx');
  await wait(250);
  await grab('18 35 패스 보상 칸', '#psTk .ps-bx', '');
  /* ⚑ 6회차 — §10 ① ⓒ. 5회차까지 이 자리는 **첫 칸(200..489)** 을 찍었다. 예외 사유(«프레임 변»)가
     보이는 칸은 **마지막 칸(884..1074)** 뿐이라, 비평가는 «십자선 오른쪽 91px 에 형제 탭이 그대로
     있는데 왜 물러나 있나» 로 두 회차 연속 돌려보냈다(BU·BV 독립 일치 — 그리고 그 지적은 옳았다).
     01(`.tab:last-child`)은 처음부터 마지막 칸을 찍어 이 문제가 없었다. 같은 규칙으로 맞춘다. */
  await grab('19 35 패스 하단 탭 (마지막 칸)', '#psBar .pt:last-child',
    '예외 — 프레임 변(우변 1074 ⇒ 1074+21−1080 = 15)');
  await ev(() => closePass());

  /* 한 장으로 붙인다 — 나란히 안 놓으면 어긋남이 안 보인다(411 교훈) */
  const sheet = await page.evaluate(async (items) => {
    const imgs = await Promise.all(items.map(async it => {
      const im = new Image();
      await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + it.b64; });
      /* ⚑ 7회차 — `bx`/`by` 를 여기서 **떨어뜨리고 있었다.** 6회차가 «점선 = 빈 상자 코너» 를
         라벨에 약속해 놓고 이 map 이 두 값을 안 실어 보내 아래 그리기 절이 통째로 건너뛰었다
         ⇒ 8회차 비평가 CA·CB·BZ 셋이 독립으로 «점선이 아예 없다» 고 적었다(BZ 는 3배 밝기까지 올려 봤다).
         **라벨이 약속한 것을 그림이 안 지키면 자가 거짓말을 하는 것**이다 — 값을 실어 보낸다. */
      return { im, label: it.label, note: it.note, fx: it.fx, fy: it.fy, bx: it.bx, by: it.by };
    }));
    /* 모든 칸이 같은 창(240×240 제품px, dsf2 라 480×480)이라 **배율도 하나**다 */
    const COL = 4, CELL = 470, PADT = 54;
    const rows = Math.ceil(imgs.length / COL);
    const c = document.createElement('canvas');
    c.width = COL * CELL; c.height = rows * (CELL + PADT);
    const g = c.getContext('2d');
    g.fillStyle = '#101014'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((o, i) => {
      const cx = (i % COL) * CELL, cy = Math.floor(i / COL) * (CELL + PADT);
      g.fillStyle = '#EDEAE3'; g.font = 'bold 22px sans-serif'; g.textBaseline = 'top';
      g.fillText(o.label, cx + 12, cy + 8);
      if (o.note) { g.fillStyle = '#9AA0AA'; g.font = '18px sans-serif'; g.fillText(o.note, cx + 12, cy + 32); }
      /* ⚠ 칸마다 다른 배율을 쓰면 «나란히» 가 거짓말이 된다(2회차 비평이 그것에 걸렸다).
         창이 전부 같은 크기이므로 배율은 **한 값**이다. */
      const k = (CELL - 24) / o.im.width;
      const w = o.im.width * k, h = o.im.height * k;
      g.drawImage(o.im, cx + (CELL - w) / 2, cy + PADT + (CELL - h) / 2, w, h);
      /* 창 한복판에 호스트 코너가 오도록 잘랐다 — 십자선을 그려 «코너» 를 눈에 보이게 한다 */
      g.strokeStyle = 'rgba(120,200,255,.55)'; g.lineWidth = 1;
      const ox = cx + (CELL - w) / 2, oy = cy + PADT + (CELL - h) / 2;
      /* ⚠ 0.62/0.38 고정이 아니라 **찍을 때 잰 실제 코너 자리**를 쓴다(창이 화면 변에 물리면
         코너가 그 자리에 안 온다 — 3회차 비평 BR 이 이것을 «점이 67px 밖으로 떨어졌다» 로 봤다). */
      /* ⚑ 4회차 비평 — BS «01 은 십자선 세로선이 240창 안에 없어 가로를 아예 못 잰다».
         호스트가 **프레임 우변에 플러시**면 코너 x = 1080 이고 창은 `1080 - WIN` 에 물려
         코너가 창 안 좌표 **240**(= 창 밖 첫 픽셀)에 떨어진다. 오른쪽에는 더 잘라 올 픽셀이
         아예 없으므로 창을 옮겨서는 못 고친다 — **선을 창의 마지막 열에 그린다**(오차 0.5px 미만,
         그 사실을 라벨에 적는다). 안 그리면 그 칸은 «채점 불능» 이 되어 점수를 두 번 깎는다. */
      const clampF = v => Math.max(0.002, Math.min(0.998, v));
      const fx = clampF(o.fx === undefined ? 0.62 : o.fx), fy = clampF(o.fy === undefined ? 0.38 : o.fy);
      g.beginPath();
      g.moveTo(ox + w * fx, oy); g.lineTo(ox + w * fx, oy + h);
      g.moveTo(ox, oy + h * fy); g.lineTo(ox + w, oy + h * fy);
      g.stroke();
      /* 7회차 — 잉크 호스트는 «빈 상자» 코너도 회색 점선으로 같이 그린다.
         둘이 왜 다른지를 그림이 스스로 말해야 비평가가 자를 의심하지 않는다. */
      if (o.bx !== null && o.bx !== undefined) {
        const bfx = clampF(o.bx), bfy = clampF(o.by);
        g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(170,175,185,.75)';
        g.beginPath();
        g.moveTo(ox + w * bfx, oy); g.lineTo(ox + w * bfx, oy + h);
        g.moveTo(ox, oy + h * bfy); g.lineTo(ox + w, oy + h * bfy);
        g.stroke(); g.restore();
      }
    });
    return c.toDataURL('image/png');
  }, shots);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('\n대조 시트 저장 — ' + OUT + ' (' + shots.length + '자리)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
