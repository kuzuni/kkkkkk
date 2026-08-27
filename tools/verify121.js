/* 작업 121 — 03 던전·컨텐츠 카드 «움직이는 배경 레이어(.bgm)» + «썸네일 들썩» 회귀 게이트.
   실행: node tools/verify121.js  → 마지막 줄이 `VERIFY121 n/n PASS` 여야 한다.

   지시서(PROGRESS 121)가 요구한 게이트 항목을 그대로 옮겼다:
     ① 카드마다 `.bgm` 존재 · `getAnimations().length > 0`
     ② 페이지가 닫히면 `animation-play-state:paused` (56 절전도 같음)
     ③ 두 프레임(0s / 3s) 캡처 픽셀 차이 > 0 = «실제로 움직인다»
     ④ 텍스트·썸네일 bbox 불변 · 클릭 히트 불변
     ⑤ 썸네일 0s / 0.4s 캡처 픽셀 차 > 0 · 슬롯 밖 잉크 0
     ⑥ 03 리스트 스크롤 중 fps 표(지시 원문 «≥ 55fps». 이 러너는 소프트웨어 합성이라 절대 fps 가 안 나온다 —
       239 가 «중앙 프레임 시간 비 · 떨군 프레임 비율» 로 옮겼고, **246 이 다시 «비싼 상태 · 합성 전용 속성 ·
       카드당 레이어 면적» 이라는 폭 0 의 축으로 옮겼다**. 시간 판정은 `V121_PERF=1` 옵트인. §7 주석 참고)
     ⑦ 잠금 카드는 배경·썸네일 정지

   주의(LESSONS 29-②·28-③): «움직였는가» 를 애니메이션 플래그가 아니라 **픽셀**로 판정한다.
   그리고 정지해야 하는 상태에서는 **픽셀이 같아야** 한다 — 한 방향만 재면 «항상 통과» 하는 게이트가 된다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const sec = t => console.log('\n[' + t + ']');

/* 72 실측 슬롯 기하 — 던전 카드(폭, 상단 인셋). 레이드 3장은 RAIDS.ui 값.
   194 — 강화석 던전이 7번째로 붙었다(기하는 relic 과 같은 330/11). 개수 단언은 이 표 길이로 돈다.
   203 — 룬강화석 던전이 8번째(같은 330/11). 같이 «카드마다 속도가 다르다» 가 포화(min)로 깨져
   `bgmVars()` 의 안전핀을 «자르기 → 되감기» 로 고쳤다 — 그 절은 이 게이트가 그대로 지킨다. */
const DUN_TH = [[311, 36], [296, 52], [330, 11], [330, 11], [330, 11], [330, 11], [330, 11], [330, 11]];
const RAID_TH = [[311, 36], [296, 52], [330, 11]];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);
  /* 잠금 카드가 «정지» 인지 보려면 잠긴 칸이 최소 1장 있어야 한다 — 기본 세이브가 그 상태다.
     레이드 3장 중 r30·r120 은 S.best 미달로 잠겨 있다. */
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(700);

  /* ---------- §1 구조 ---------- */
  sec('§1 구조 — .bgm 레이어 (던전 탭)');
  const st = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(c => {
    const kids = [...c.children].map(k => k.className.split(' ')[0]);
    const bgm = c.querySelector(':scope>.bgm'), bg = c.querySelector(':scope>.bg');
    const cs = bgm && getComputedStyle(bgm);
    const cr = c.getBoundingClientRect(), br = bgm && bgm.getBoundingClientRect();
    const bgr = bg && bg.getBoundingClientRect();
    return {
      id: c.dataset.dcard || c.dataset.rcard,
      theme: (c.className.match(/bgm-\w+/) || [''])[0],
      lkd: c.classList.contains('lkd'),
      hasBgm: !!bgm, iBg: kids.indexOf('bg'), iBgm: kids.indexOf('bgm'), iTh: kids.indexOf('th'),
      pe: cs && cs.pointerEvents, ov: cs && cs.overflow,
      same: !!(br && bgr) && Math.abs(br.left - bgr.left) < .6 && Math.abs(br.top - bgr.top) < .6
            && Math.abs(br.width - bgr.width) < .6 && Math.abs(br.height - bgr.height) < .6,
      anims: bgm ? bgm.getAnimations({ subtree: true }).length : 0,
      states: bgm ? bgm.getAnimations({ subtree: true }).map(a => a.playState).join(',') : '',
      thAnims: (() => { const t = c.querySelector(':scope>.th>em, :scope>.th>canvas');
        return t ? t.getAnimations().map(a => a.playState).join(',') : ''; })(),
      thRect: (() => { const t = c.querySelector(':scope>.th'); if (!t) return null;
        const r = t.getBoundingClientRect();
        return { dx: +(r.left - cr.left).toFixed(1), dy: +(r.top - cr.top).toFixed(1),
                 w: +r.width.toFixed(1), h: +r.height.toFixed(1), ov: getComputedStyle(t).overflow }; })(),
      dur: (() => { const t = c.querySelector(':scope>.th>em, :scope>.th>canvas');
        return t ? t.getAnimations().map(a => Math.round(a.effect.getTiming().duration)).join('/') : ''; })(),
      bgDur: bgm ? bgm.getAnimations({ subtree: true })
        .map(a => Math.round(a.effect.getTiming().duration / 1000)).join('/') : ''
    };
  }));
  ok(st.length === DUN_TH.length, `던전 카드 ${DUN_TH.length}장 (실제 ${st.length})`);
  st.forEach((c, i) => {
    ok(c.hasBgm, `던전${i + 1}(${c.id}) .bgm 레이어 존재`);
    ok(c.iBgm === c.iBg + 1, `던전${i + 1} .bgm 이 .bg 바로 다음 (bg ${c.iBg} → bgm ${c.iBgm})`);
    ok(c.iBgm < c.iTh, `던전${i + 1} 썸네일(.th ${c.iTh})보다 아래 z (지시 ④ 순서 불변)`);
    ok(c.pe === 'none', `던전${i + 1} .bgm pointer-events:none (클릭 히트 불변) — ${c.pe}`);
    ok(c.ov === 'hidden', `던전${i + 1} .bgm overflow:hidden (카드 밖 유출 0) — ${c.ov}`);
    ok(c.same, `던전${i + 1} .bgm 이 .bg 와 같은 면적(inset 8/7)`);
    /* 194 — 강화석 던전(`bgm-stone`)이 붙었다. 골드 블록의 기하를 그대로 물려받고 색만 다른 변종이다.
       203 — 룬강화석 던전(`bgm-rstone`)은 같은 방식으로 **유물석 블록**을 물려받고 색만 다르다. */
    ok(/^bgm-(gold|dia|rel|stone|rstone)$/.test(c.theme), `던전${i + 1} 테마 클래스 ${c.theme}`);
  });

  sec('§2 애니메이션 — 살아 있음 / 주기 / 위상');
  st.forEach((c, i) => {
    ok(c.anims >= 2, `던전${i + 1} .bgm 애니메이션 ${c.anims}개 (> 0)`);
    const want = c.lkd ? 'paused' : 'running';
    ok(c.states.split(',').every(s => s === want), `던전${i + 1}${c.lkd ? '(잠금)' : ''} 배경 ${c.states} = ${want}`);
    ok(c.thAnims.split(',').every(s => s === want), `던전${i + 1}${c.lkd ? '(잠금)' : ''} 썸네일 ${c.thAnims} = ${want}`);
  });
  const durs = st.map(c => c.bgDur.split('/').map(Number));
  ok(durs.every(d => d.every(v => v >= 40 && v <= 90)), `배경 주기 전부 40~90s (${st.map(c => c.bgDur).join(' | ')})`);
  ok(new Set(st.map(c => c.bgDur)).size === st.length, '카드마다 속도가 다르다 (지시 ① «카드마다 위상·속도 다르게»)');
  /* ⚠ 위상은 `Animation.currentTime` 이 아니라 **효과의 진행률**로 잰다 — currentTime 은 «시작 후 경과» 라
     음수 delay(=위상)를 반영하지 않아 카드 6장이 전부 같은 값으로 읽힌다(첫 회차가 여기서 오판했다). */
  const ph = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(c =>
    c.querySelector(':scope>.bgm').getAnimations({ subtree: true })
      .map(a => (a.effect.getComputedTiming().progress || 0).toFixed(4)).join('/')));
  ok(new Set(ph).size === ph.length, `카드마다 위상이 다르다 (${ph.join(' | ')})`);
  const tb = st.map(c => c.dur.split('/').map(Number));
  ok(tb.every(d => d.length === 1 && d[0] >= 3000 && d[0] <= 5000),
    `썸네일 애니 1개 · 큰 점프 주기 3~5s (${st.map(c => c.dur).join(',')}ms) — 들썩과 스쿼시는 같은 타임라인`);
  ok(tb.every(d => d[0] / 5 >= 700 && d[0] / 5 <= 1000),
    `짧은 들썩 0.7~1.0s (주기/5 = ${st.map(c => Math.round(+c.dur / 5)).join(',')}ms)`);
  /* ⚠ 2회차 게이트 ①: **무늬가 원위치하는 «체감 주기»** 가 40~90s 인가.
     1회차는 이동거리를 타일 폭의 2배로 잡아, 지속시간은 68~88s 인데 눈에 보이는 반복은 34~44s 였다
     (비평가 A 실측 34.0~36.0s). 이동거리 = 타일 폭이어야 지속시간이 곧 체감 주기다. */
  const loop = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(c => {
    const cs = getComputedStyle(c);
    const px = v => parseFloat(v);
    const tile = k => px(cs.getPropertyValue('--bgz' + k).trim().split(/\s+/)[0]);
    return [1, 2].map(k => +(px(cs.getPropertyValue('--bgw' + k)) / tile(k)).toFixed(3));
  }));
  ok(loop.every(r => r.every(v => Math.abs(v - 1) < 0.01)),
    `이동거리 = 타일 폭 ×1 (체감 주기 = 지속시간) — 실측 배수 ${[...new Set(loop.flat())].join(',')}`);
  /* ⚠ 2회차 게이트 ②: 썸네일이 **위로는 안 간다**. 72 가 잉크를 슬롯 천장에 붙여 놨기 때문에
     위로 1px 만 올라가도 머리가 잘린다(`node tools/probe121.js` [1] 이 1회차에 상단 여유 0px·5/7 위상 잘림).
     기준 자세를 «가장 높은 포즈» 로 두고 아래로만 웅크리므로 translate 는 항상 ≥ 0 이어야 한다. */
  /* 72(2026-08-26 주인 재지시) — 이모지 <em> 이 스프라이트 <canvas> 로 바뀌었다.
     들썩 애니는 같은 `thBob` 이고 선택자만 옮겨 온다(둘 다 받아 두면 다음 교체에도 안 죽는다). */
  const tr = await p.evaluate(() => {
    const em = document.querySelector('#dunList .dnc>.th>em, #dunList .dnc>.th>canvas');
    const a = em && em.getAnimations()[0];
    if (!a) return null;
    const d = a.effect.getComputedTiming().duration, was = a.playState;
    a.pause();
    const out = [];
    for (let i = 0; i <= 20; i++) {
      a.currentTime = d * i / 20;
      out.push(+parseFloat(getComputedStyle(em).translate.split(' ')[1] || '0').toFixed(2));
    }
    if (was === 'running') a.play();
    return out;
  });
  /* ⚠ 4회차(말미) — 72 가 이모지를 캔버스로 갈아 끼우면서 «썸네일이 위로 못 간다» 는 전제가 사라졌다.
     정지 자세 상단 여유가 0px → **29~126px** 로 열렸으므로(probe121 [0]) 지시 ⑥ 의 원문대로
     **위로** 뛴다: 착지 0 · 짧은 들썩 −8px · 큰 점프 −14px.
       · 그래서 «translate ≥ 0» 은 이제 틀린 불변식이다 → **위로 뛰는 최대치가 지시의 14px 인가**를 묻는다.
       · 진폭은 절대값이 아니라 **max − min**(3회차까지의 `max(translate)` 는 기준선이 0 일 때만 맞았다).
     실제 잘림 여부는 산술이 아니라 픽셀로 봐야 한다 — `node tools/probe121.js cut`
     (6카드 × 14위상 천장 접촉 폭, 72 교체 후 재측정 **전부 0**). */
  /* ⚠ **6회차 — 이 두 줄은 «CSS 선언값» 만 보고 있었고, 그래서 화면이 지시의 1.3~1.8배로
     움직이는 동안 계속 초록이었다.** 눈에 보이는 잉크 이동은 `translate + 잉크높이×(1−scaleY)` 의
     **합**이다. 6회차부터 스쿼시를 «px 고정»(1.5 / 3)으로 주고 translate 가 차액(6.5 / 11)을 맡아
     **합이 지시값 8 / 14** 가 된다. 그러므로 여기서 물어야 할 것은 «translate 가 14 인가» 가 아니라
     «translate + 스쿼시 = 14 인가» 다. 화면 실측은 `node tools/bobamp121.js` 가 잉크 bbox 로 직접 잰다
     (7칸 전부 7 / 13~14px · 카드 간 격차 1.08배). 여기서는 배분의 산술만 지킨다. */
  const SQA = 1.5, SQB = 3;
  const up = tr && -Math.min(...tr);
  ok(up + SQB >= 12 && up + SQB <= 16,
     `큰 점프 = translate ${up}px + 스쿼시 ${SQB}px = ${up + SQB}px (지시 14px · 화면 실측은 bobamp121)`);
  const amp = tr && +(Math.max(...tr) - Math.min(...tr)).toFixed(2);
  ok(amp + SQB >= 12 && amp + SQB <= 16,
     `큰 점프 진폭 ${amp} + ${SQB} = ${amp + SQB}px (max ${tr && Math.max(...tr)} − min ${tr && Math.min(...tr)})`);

  /* ---------- §3 «실제로 움직인다» — 픽셀 판정 ---------- */
  sec('§3 픽셀 — 배경 0s/3s · 썸네일 0s/0.4s');
  const clipOf = async (sel, idx) => p.evaluate(([s, i]) => {
    const e = document.querySelectorAll(s)[i], r = e.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  }, [sel, idx]);
  /* 카드1 의 «배경만» 을 본다: 썸네일·글자를 뺀 좌측 절반 (움직이는 건 .bgm 뿐이다) */
  const c1 = await clipOf('#dunList .dnc', 0);
  const bgClip = { x: c1.x + 340, y: c1.y + 250, width: 260, height: 90 };
  const a1 = await p.screenshot({ clip: bgClip });
  await p.waitForTimeout(3000);
  const a2 = await p.screenshot({ clip: bgClip });
  ok(!a1.equals(a2), '배경 0s ↔ 3s 픽셀 차 > 0 (배경이 실제로 흐른다)');

  const thClip = await clipOf('#dunList .dnc>.th', 0);
  const t1 = await p.screenshot({ clip: thClip });
  await p.waitForTimeout(430);
  const t2 = await p.screenshot({ clip: thClip });
  ok(!t1.equals(t2), '썸네일 0s ↔ 0.4s 픽셀 차 > 0 (들썩인다)');

  /* 슬롯 밖 잉크 0 — 슬롯 좌측 바로 바깥 10px 띠가 «썸네일 때문에» 변하면 안 된다.
     ⚠ 그 띠 위에는 움직이는 배경(.bgm)도 깔려 있으므로, 배경을 잠시 내리고 재야 «썸네일이 샜는가» 만 남는다
     (LESSONS 28-③ «캔버스가 흰 잉크 스캔을 오염시킨다» 의 배경 판). */
  await p.evaluate(() => document.querySelectorAll('#dunList .dnc>.bgm').forEach(e => e.style.display = 'none'));
  const outClip = { x: thClip.x - 12, y: thClip.y, width: 10, height: thClip.height };
  const o1 = await p.screenshot({ clip: outClip });
  await p.waitForTimeout(430);
  const o2 = await p.screenshot({ clip: outClip });
  ok(o1.equals(o2), '슬롯 좌측 바깥 10px 띠는 불변 = 슬롯 밖 잉크 0');
  await p.evaluate(() => document.querySelectorAll('#dunList .dnc>.bgm').forEach(e => e.style.display = ''));

  /* ---------- §4 기하·클릭 불변 ---------- */
  sec('§4 기하·클릭 불변 (72/97 회귀)');
  st.forEach((c, i) => {
    const e = DUN_TH[i];
    ok(c.thRect && Math.abs(c.thRect.w - e[0]) <= 1 && Math.abs(c.thRect.h - (341 - e[1])) <= 1,
      `던전${i + 1} 슬롯 ${c.thRect && c.thRect.w}×${c.thRect && c.thRect.h} = ${e[0]}×${341 - e[1]} (불변)`);
    ok(c.thRect && Math.abs(c.thRect.dy - e[1]) <= 1, `던전${i + 1} 슬롯 y ${c.thRect && c.thRect.dy} = ${e[1]}`);
    ok(c.thRect && c.thRect.ov === 'hidden', `던전${i + 1} 슬롯 overflow:hidden (움직임은 슬롯 안에서만)`);
  });
  const txt = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc'), cr = c.getBoundingClientRect();
    const rel = s => { const e = c.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return [+(r.left - cr.left).toFixed(1), +(r.top - cr.top).toFixed(1)]; };
    return { nm: rel('.nm'), pill: rel('.pill'), lb: rel('.lb.a'), sp: rel('.sp.lv'), dot: rel('.dot') };
  });
  ok(txt.nm && Math.abs(txt.nm[0] - 39) <= 1 && Math.abs(txt.nm[1] - 40) <= 1, `던전명 rel ${txt.nm} = 39,40`);
  ok(txt.pill && Math.abs(txt.pill[0] - 92) <= 1 && Math.abs(txt.pill[1] - 121) <= 1, `보상 알약 rel ${txt.pill} = 92,121`);
  ok(txt.lb && Math.abs(txt.lb[0] - 134) <= 1 && Math.abs(txt.lb[1] - 243) <= 1, `라벨 rel ${txt.lb} = 134,243`);
  ok(txt.sp && Math.abs(txt.sp[0] - 84) <= 1 && Math.abs(txt.sp[1] - 277) <= 1, `값 알약 rel ${txt.sp} = 84,277`);
  /* LESSONS 21-①·90-④ — `#dunw i,#dunw em,#dunw b` 리셋이 transform-origin 을 이기는 자리다.
     스쿼시 축이 «발밑»(50% 100%)이 아니면 잉크가 위로 뜬다. */
  /* 스쿼시 축은 «잉크 발밑» 이어야 한다.
     ⚠ 72(2026-08-26): em 상자(400×400) 시절에는 상자 바닥이 슬롯 바닥보다 42~55px 아래라
     기대값을 `541 − thcy − tht` 로 파생시켰다. 캔버스는 액자 안쪽을 꽉 채우므로 **바닥 = 자기 높이**다. */
  const org = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(c => {
    const e = c.querySelector(':scope>.th>em, :scope>.th>canvas'); if (!e) return null;
    const cs = getComputedStyle(c);
    /* ⚠ **6회차 — 기준이 «슬롯 바닥» 에서 «잉크 발밑» 으로 바뀌었다.**
       캔버스는 contain(TH_PAD) 이라 잉크 바닥이 캔버스 바닥보다 16~56px 위에 있고, 축이 발밑보다
       아래에 있으면 스쿼시가 «제자리 압축» 이 아니라 잉크를 통째로 내리는 이동이 된다
       (6회차 비평가 J ③-2: 골드 +10.7px · 컨텐츠 +21px). `thPlace` 가 그릴 때마다 실제 잉크 바닥을
       `--thpiv` 로 내보내므로 그 값과 맞는지 본다. */
    const want = parseFloat(getComputedStyle(e).getPropertyValue('--thpiv'));
    const got = parseFloat(getComputedStyle(e).transformOrigin.split(' ')[1]);
    return { want: +want.toFixed(1), got: +got.toFixed(1) };
  }).filter(Boolean));
  ok(org.length === DUN_TH.length && org.every(o => Number.isFinite(o.want) && Math.abs(o.want - o.got) <= 0.6),
    `썸네일 스쿼시 축 = «잉크 발밑»(--thpiv) (${org.map(o => o.got + '/' + o.want).join(' · ')})`);
  const hit = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc'), r = c.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + 250, r.top + 175);
    return { card: !!(e && e.closest('[data-dcard]')), tag: e ? e.className || e.tagName : null };
  });
  ok(hit.card, `카드 중앙 클릭이 카드에 닿는다 (맞은 요소: ${hit.tag})`);

  /* ---------- §5 정지 조건 ---------- */
  sec('§5 정지 — 페이지 닫힘 / 56 절전');
  /* ⚠ 첫 회차의 함정: `#dunw` 는 닫히면 **display:none** 이라 의사요소가 아예 상자를 못 만든다 →
     `getAnimations()` 가 «빈 배열» 을 돌려주고, `[].every(...)` 는 true 라 **무엇을 넣어도 통과하는 게이트**가 된다.
     (기저 규칙을 running 으로 되돌리는 회귀를 주입했더니 그대로 PASS 했다.)
     그래서 두 가지를 따로 잰다 — ⓐ 닫히면 렌더 자체가 없다(=합성 레이어 0) ⓑ 렌더가 살아 있는 채로
     `.on` 만 빠지면 CSS 게이트가 실제로 paused 로 만든다. ⓑ 가 «규칙» 을 지키는 쪽이다. */
  const closed = await p.evaluate(() => {
    const w = document.getElementById('dunw');
    w.classList.remove('on');
    const disp = getComputedStyle(w).display;
    const cs = [...document.querySelectorAll('#dunList .dnc')];
    const live = cs.reduce((n, c) => n + c.querySelector(':scope>.bgm').getAnimations({ subtree: true }).length, 0);
    /* ⓑ — 강제로 렌더만 되살리고 `.on` 은 계속 빠진 상태 */
    w.style.display = 'block';
    void w.offsetHeight;
    const bg = cs.flatMap(c => c.querySelector(':scope>.bgm').getAnimations({ subtree: true }).map(a => a.playState));
    const th = cs.flatMap(c => [...c.querySelectorAll(':scope>.th>em, :scope>.th>canvas')]
      .flatMap(t => t.getAnimations().map(a => a.playState)));
    const wc = getComputedStyle(cs[0].querySelector(':scope>.bgm'), '::before').willChange;
    w.style.display = '';
    return { disp, live, bg, th, wc };
  });
  ok(closed.disp === 'none', `페이지 닫힘 → #dunw display:${closed.disp} (카드가 렌더되지 않는다)`);
  ok(closed.live === 0, `페이지 닫힘 → 살아 있는 합성 애니메이션 ${closed.live}개`);
  ok(closed.bg.length >= 12 && closed.bg.every(s => s === 'paused'),
    `.on 없이 렌더만 살려도 배경 ${closed.bg.length}개 전부 paused (${[...new Set(closed.bg)].join(',')})`);
  ok(closed.th.length >= 6 && closed.th.every(s => s === 'paused'),
    `.on 없이 렌더만 살려도 썸네일 ${closed.th.length}개 전부 paused (${[...new Set(closed.th)].join(',')})`);
  ok(closed.wc === 'auto', `.on 없으면 will-change 해제 (${closed.wc}) — 안 보이는 카드에 합성 레이어를 남기지 않는다`);
  /* 정지 상태에서는 픽셀도 같아야 한다(한 방향만 재는 게이트 방지) */
  await p.evaluate(() => document.getElementById('dunw').classList.add('on'));
  await p.evaluate(() => document.getElementById('app').classList.add('sv'));
  await p.waitForTimeout(150);
  const s1 = await p.screenshot({ clip: bgClip });
  await p.waitForTimeout(1200);
  const s2 = await p.screenshot({ clip: bgClip });
  ok(s1.equals(s2), '56 절전(#app.sv) 중에는 픽셀 불변 = 정말 멈춘다');
  await p.evaluate(() => document.getElementById('app').classList.remove('sv'));

  /* ---------- §6 컨텐츠(레이드) 탭 ---------- */
  sec('§6 컨텐츠 탭 — 같은 레이어 · 아이들 프레임 순환');
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  /* ⚠ 카드 수를 박아 두지 마라 — 작업 123 이 «레이드 3장» 을 «측정장 1장 + 아레나 1장» 으로 갈아 끼웠고,
     3 을 박아 둔 1회차 게이트가 그 커밋 다음에 바로 FAIL 로 죽었다(LESSONS 97-④ 의 재발).
     기대치는 페이지에서 «파생» 시키고, 게이트가 보는 것은 «구성» 이 아니라 «성질» 이다. */
  const rd = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.rd')].map(c => {
    const bgm = c.querySelector(':scope>.bgm');
    const cvs = [...c.querySelectorAll(':scope>.th>canvas')];
    const cr = c.getBoundingClientRect(), tr = c.querySelector(':scope>.th').getBoundingClientRect();
    return { id: c.dataset.rcard || (c.dataset.arena ? 'arena' : '?'),
      lkd: c.classList.contains('lkd'), theme: (c.className.match(/bgm-\w+/) || [''])[0],
      anims: bgm ? bgm.getAnimations({ subtree: true }).length : 0,
      states: bgm ? bgm.getAnimations({ subtree: true }).map(a => a.playState).join(',') : '',
      cvn: cvs.length,
      thd: cvs.map(cv => getComputedStyle(cv).animationDelay).join(' '),
      th: { w: +tr.width.toFixed(1), h: +tr.height.toFixed(1), dy: +(tr.top - cr.top).toFixed(1) },
      slotOv: getComputedStyle(c.querySelector(':scope>.th')).overflow };
  }));
  ok(rd.length >= 2, `컨텐츠 카드 ${rd.length}장 (≥2 — 구성은 123 이 정한다)`);
  rd.forEach((c, i) => {
    ok(c.theme === 'bgm-raid', `${c.id} 테마 ${c.theme}`);
    ok(c.anims >= 2, `${c.id} .bgm 애니메이션 ${c.anims}개 (번개 잔광 포함)`);
    const want = c.lkd ? 'paused' : 'running';
    ok(c.states.split(',').every(s => s === want), `${c.id}${c.lkd ? '(잠금)' : ''} 배경 ${c.states} = ${want}`);
    ok(c.slotOv === 'hidden', `${c.id} 슬롯 overflow:hidden (움직임은 슬롯 안에서만)`);
    ok(Math.abs(c.th.h - (341 - c.th.dy)) <= 1,
      `${c.id} 슬롯 높이 ${c.th.h} = 341 − 상단인셋 ${c.th.dy} (97 규격 불변)`);
  });
  /* 아레나 카드는 칸이 2개다 — 지시 ⑥ «플레이어 2명이 서로 다른 위상으로» */
  const arn = rd.find(c => c.id === 'arena');
  if (arn) {
    ok(arn.cvn === 2, `아레나 썸네일 칸 ${arn.cvn}개 (플레이어 2명)`);
    const ds = arn.thd.split(' ');
    ok(new Set(ds).size === 2, `아레나 두 칸의 들썩 위상이 다르다 (${arn.thd})`);
  }
  /* 아이들 프레임이 «실제로» 바뀐다 — 잠금 카드는 안 바뀌어야 한다.
     ⚠ **239(2026-08-27) — «900ms 두 점» 표본은 위상에 따라 통째로 거짓 FAIL 이었다.**
     아이들 창(`TH_IDLE`)은 이름이 중복될 수 있다 — `elves/blue_idle` = [0,**1**,2,**1**] 이라
     8fps 에서 900ms(=7.2프레임) 뒤가 같은 **이름**에 떨어지는 위상이 존재한다(오프셋 7 은 서로 다르지만
     8 이면 한 바퀴 = 제자리, 오프셋 2 면 1↔1). `node tools/probe239.js A` 실측 **6시행 중 3시행 FAIL**,
     그런데 그 사이 «순환» 자체는 6/6 시행 모두 정상이었다 — 재고 있던 것이 «순환» 이 아니라 «표본 운» 이었다.
     → 표본을 **한 바퀴 이상 촘촘히**(50ms 간격) 훑어 «관측된 고유 프레임 수» 를 센다. 그러면 두 점 판정보다
     **더 강하다** — «달랐다» 가 아니라 «창의 모든 프레임이 실제로 나왔다» 를 묻기 때문이다.
     기대치는 상수로 적지 않고 페이지의 `TH_IDLE`/`ATLAS` 에서 파생시킨다(LESSONS 121-13 —
     주기·창을 바꾸는 순간 하네스의 상수는 거짓이 된다). */
  const IDLE_SEL = '#dunList canvas.thcv';
  const idleSpec = sel => p.evaluate(sel => [...document.querySelectorAll(sel)].map(c => {
    const arn = !!c.dataset.arnav;
    const akey = arn ? 'knight' : c.dataset.thk, anim = arn ? 'idle' : c.dataset.thi;
    const w = (typeof TH_IDLE !== 'undefined' && TH_IDLE[akey + '/' + anim]) || null;
    const full = (ATLAS[akey] && ATLAS[akey].a && ATLAS[akey].a[anim]) || null;
    const list = w || full || [];
    const afps = (c._an && c._an.afps) || 8;
    return { akey, anim, lkd: !!c.closest('.dnc.lkd'),
             uniq: new Set(list).size, cycle: Math.round(list.length / afps * 1000) };
  }), sel);
  /* 창 한 바퀴 ×2 + 여유. 프레임 체류가 125ms 라 50ms 간격이면 모든 프레임이 한 바퀴에 두 번 이상 잡힌다. */
  const idleSeen = (sel, span) => p.evaluate(async ([s, sp]) => {
    const cs = [...document.querySelectorAll(s)];
    const acc = cs.map(() => new Set());
    const t0 = performance.now();
    while (performance.now() - t0 < sp) {
      cs.forEach((c, i) => acc[i].add(c._fr));
      await new Promise(r => setTimeout(r, 50));
    }
    return acc.map(x => x.size);
  }, [sel, span]);

  const spec = await idleSpec(IDLE_SEL);
  const span = Math.max(300, ...spec.map(s => s.cycle)) * 2 + 300;
  const seen = await idleSeen(IDLE_SEL, span);
  const liveIdx = spec.map((s, i) => s.lkd ? -1 : i).filter(i => i >= 0);
  const lockIdx = spec.map((s, i) => s.lkd ? i : -1).filter(i => i >= 0);
  ok(liveIdx.length > 0 && liveIdx.every(i => spec[i].uniq >= 2 && seen[i] === spec[i].uniq),
    `해금 칸 ${liveIdx.length}개 전부 아이들 창을 한 바퀴 돈다 — ${span}ms 동안 관측된 고유 프레임 ` +
    liveIdx.map(i => `${spec[i].akey}/${spec[i].anim} ${seen[i]}/${spec[i].uniq}`).join(' · '));
  ok(lockIdx.length === 0 || lockIdx.every(i => seen[i] === 1),
    `잠금 칸 ${lockIdx.length}개 프레임 정지 (관측 고유 ${lockIdx.map(i => seen[i]).join(',') || '-'} = 전부 1)`);
  /* 아레나는 기본 세이브에서 잠겨 있다 — 해금해서 «두 기사가 서로 다른 위상으로 도는지» 까지 본다(지시 ⑥) */
  if (arn) {
    await p.evaluate(() => { S.best = 999; renderDunPage(); });
    await p.waitForTimeout(900);
    /* 239 — 여기도 «두 점» 이었다. 기사(knight/idle)는 고유 6프레임이라 900ms 오프셋에서 우연히
       살아남고 있었을 뿐이고, 창이 바뀌면 elves 와 같은 이유로 죽는다. 같은 다점 표본으로 통일한다. */
    const ARN_SEL = '#dunList .dnc.arn2 canvas.thcv';
    const aspec = await idleSpec(ARN_SEL);
    const aspan = Math.max(300, ...aspec.map(s => s.cycle)) * 2 + 300;
    const aseen = await idleSeen(ARN_SEL, aspan);
    ok(aspec.length === 2 && aspec.every((s, i) => s.uniq >= 2 && aseen[i] === s.uniq),
      `해금 아레나 두 기사 아이들 순환 — ${aspan}ms 관측 고유 ` +
      aspec.map((s, i) => `${aseen[i]}/${s.uniq}`).join(' · '));
    /* ⚠ «지금 이 순간 두 칸의 프레임이 다른가» 로 물으면 안 된다 — 위상차가 0.7프레임이라
       Math.floor 결과가 같아지는 구간이 30% 있어 **실행마다 튀는 게이트**가 된다(실제로 한 번 거짓 FAIL 났다).
       불변량은 «두 칸의 애니메이션 위상이 다르다» 이므로 엔티티의 at 차이를 잰다(항상 0.7). */
    const at = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.arn2 canvas.thcv')]
      .map(c => c._an && +c._an.at.toFixed(3)));
    ok(at.length === 2 && at.every(v => typeof v === 'number')
      && Math.abs((at[0] - at[1]) % 1) > 0.25 && Math.abs((at[0] - at[1]) % 1) < 0.75,
      `두 기사의 아이들 위상차 ${at.length === 2 ? Math.abs(at[0] - at[1]).toFixed(2) : '?'}프레임 (한 몸처럼 안 뛴다)`);
    await p.evaluate(() => { S.best = 1; renderDunPage(); });
    await p.waitForTimeout(400);
  }

  sec('§7 스크롤 성능 예산 — 배경 레이어가 스크롤을 잡아먹지 않는다');
  /* ⚠ **246(2026-08-27) — 판정을 시간 축에서 구조·작업량 축으로 옮겼다. 문턱을 늘린 것이 아니라 자를 바꿨다.**
     239 는 «중앙 프레임 시간 비 ≤ 1.15» 와 «떨군 프레임 비율 ≤ 기준 +30%p» 를 판정으로 골랐는데,
     이 클라우드 러너에서는 코드를 한 줄도 안 바꾼 채 그 두 줄이 상시 빨갛다(146/148).
     `node tools/probe246.js` 가 그 이유와 대안을 같은 표에서 보여 준다 —

       주입        중앙프레임 비(3쌍)        >40ms ON      카드당 레이어 면적   비싼 상태 / 애니 속성
       none        1.50 · 1.00 · 1.50        99~100%       3.76배               없음 / [transform]
       brightness  2.00 · 2.00 · 2.00        100%          3.76배               filter=brightness(1.02)
       blur(3px)   2.50 · 2.49 · 2.49        100%          3.76배               filter=blur(3px)
       layout주입  2.00 · 2.00 · 1.99        99~100%       3.76배               없음 / [transform, **width**]
       레이어 4배  1.50 · 1.00 · 1.00        98~100%       **15.05배**          없음 / [transform]

     ① 소프트웨어 합성(SwiftShader)이라 프레임 시간이 16.7ms 배수로 **양자화**된다. ON 이 한 칸
        (33.4 → 50.1) 밀리면 비가 곧바로 **1.50** 이고, 그 1.50 은 239 가 «회귀 주입 값» 으로 적어 둔 수다 —
        **무회귀대와 회귀대가 같은 칸에서 겹친다**(위 표 1행 vs 나머지). 자가 초록·빨강 어느 쪽도 뜻하지 않는다.
     ② 더 나쁜 것은 시간 축이 **진짜 회귀를 놓친다**는 것이다 — 레이어 면적을 4배로 부풀린 마지막 행에서
        중앙 프레임 비는 1.00(초록)이다. >40ms 비율도 무회귀에서 이미 99~100% 라 머리끝까지 포화돼 있다.
     ③ 반대로 구조·기하 축은 **폭이 0**이고(같은 값이 3쌍 내내) 주입 4종을 전부 잡는다.
     → 판정은 아래 세 축이 한다. 시간 표는 **그대로 출력하되 기록만** 하고, 절대·상대 시간 판정은
        `V121_PERF=1` 을 준 전용 러너에서만 켠다(237 이 verify114 [8] 에서 간 길과 같다.
        LESSONS 121-14 «임계값을 낮춰 초록을 만들지 마라» 를 어기지 않는 길은 «더 낮은 문턱» 이 아니라
        «흔들리지 않는 양» 이다).
     ⚠ 축을 갈았으면 **회귀를 주입해 빨간지** 확인하는 것까지가 한 벌이다(LESSONS 132) — 위 표가 그 확인이고,
        `node tools/probe246.js [brightness|blur|layout|big]` 로 언제든 다시 뽑는다. */

  /* .bgm 계열의 «비싼 상태 · 애니메이션이 건드리는 속성 · 카드당 레이어 면적» 을 한 번에 읽는다.
     셋 다 스크롤을 돌리지 않고 얻는 양이라 러너 부하와 무관하다(폭 0). */
  const bgmShape = () => p.evaluate(() => {
    const EXP = ['filter', 'backdropFilter', 'boxShadow'];
    const bad = [], props = new Set(), per = [];
    for (const el of document.querySelectorAll('#dunList .dnc>.bgm')) {
      const cr = el.parentElement.getBoundingClientRect();
      let a = 0;
      for (const pe of ['::before', '::after']) {
        const cs = getComputedStyle(el, pe);
        a += (parseFloat(cs.width) || 0) * (parseFloat(cs.height) || 0);
        EXP.forEach(k => { const v = cs[k]; if (v && v !== 'none') bad.push(pe + ' ' + k + '=' + v); });
      }
      const cs = getComputedStyle(el);
      EXP.forEach(k => { const v = cs[k]; if (v && v !== 'none') bad.push('.bgm ' + k + '=' + v); });
      if (cr.width * cr.height) per.push(+(a / (cr.width * cr.height)).toFixed(2));
      for (const an of (el.getAnimations ? el.getAnimations({ subtree: true }) : [])) {
        let kf = []; try { kf = an.effect.getKeyframes(); } catch (_) {}
        kf.forEach(f => Object.keys(f).forEach(k => {
          if (!['offset', 'computedOffset', 'easing', 'composite'].includes(k)) props.add(k);
        }));
      }
    }
    return { bad: [...new Set(bad)], props: [...props].sort(), per };
  });
  /* 두 서브탭을 다 본다 — 레이드 테마만 opacity(bgmFlash)를 쓰고 ::after 가 더 높다(--bgh2). */
  const shRaid = await bgmShape();
  await p.evaluate(() => setDunSub('dun'));
  await p.waitForTimeout(600);
  const shDun = await bgmShape();
  const shBad = [...new Set([...shRaid.bad, ...shDun.bad])];
  const shProps = [...new Set([...shRaid.props, ...shDun.props])].sort();
  const shPer = [...shRaid.per, ...shDun.per];
  const shMax = Math.max(...shPer);
  const COMPOSITED = ['opacity', 'transform'];
  ok(shBad.length === 0,
    `비싼 상태 0건 — .bgm·의사요소에 filter·backdrop-filter·box-shadow 없음 (${shBad.join(' · ') || '없음'})`);
  ok(shProps.length > 0 && shProps.every(k => COMPOSITED.includes(k)),
    `배경 애니메이션이 합성 전용 속성만 건드린다 [${shProps.join(', ')}] ⊆ [transform, opacity] ` +
    `(레이아웃·페인트 유발 속성이 끼면 매 프레임 메인 스레드가 돈다)`);
  ok(shPer.length > 0 && shMax <= 6,
    `카드당 애니메이션 레이어 면적 최대 ${shMax}배 ≤ 6배 (실측 던전 3.76 · 레이드 4.78 · 폭 0 · 레이어 4배 주입 시 19.11)`);

  /* ---- 아래는 기록용 시간 표. 판정은 V121_PERF=1 일 때만 켠다(위 주석 ③). ---- */
  const runFps = () => p.evaluate(() => new Promise(res => {
    const el = document.getElementById('dunList');
    const ts = []; let n = 0, dir = 1;
    const step = t => {
      ts.push(t); n++;
      el.scrollTop += dir * 34;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
      if (el.scrollTop <= 2) dir = 1;
      if (n < 120) requestAnimationFrame(step);
      else {
        const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
        const long = d.filter(v => v > 40).length / d.length * 100;   /* 239 — «떨군 프레임» 비율 */
        d.sort((a, b) => a - b);
        res({ avg: +(1000 / (d.reduce((s, v) => s + v, 0) / d.length)).toFixed(1),
              med: +d[Math.floor(d.length / 2)].toFixed(1),
              long: +long.toFixed(1),
              p95: +(1000 / d[Math.floor(d.length * 0.95)]).toFixed(1), n: d.length });
      }
    };
    requestAnimationFrame(step);
  }));
  /* ⚠ 이 측정은 **머신 부하에 민감**하다. ON 을 먼저 다 재고 OFF 를 나중에 재면, 그 사이에 다른
     게이트(smoke 등)가 돌기 시작한 것만으로 유지율이 108% → 83% 로 뒤집힌다 — 실제로 그렇게 한 번 죽었다.
     그래서 ON/OFF 를 **번갈아 3쌍** 재고 쌍마다 비율을 낸 뒤 **중앙값**을 쓴다. 부하가 변해도 쌍 안에서는
     같이 변하므로 비율이 살아남는다(LESSONS 28-③ «재현성 없는 회귀로 회차를 태우지 마라»). */
  const setBgm = v => p.evaluate(v => document.querySelectorAll('#dunList .dnc>.bgm')
    .forEach(e => e.style.display = v), v);
  await setBgm(''); await runFps();    /* 워밍업 — 첫 왕복은 큰 그라디언트 타일 래스터 비용이 섞인다 */
  const ons = [], offs = [], ratios = [];
  for (let k = 0; k < 3; k++) {
    await setBgm(''); await p.waitForTimeout(250);
    const a = await runFps();
    await setBgm('none'); await p.waitForTimeout(250);
    const b = await runFps();
    ons.push(a); offs.push(b); ratios.push(a.avg / b.avg);
  }
  await setBgm('');
  const mid = arr => [...arr].sort((x, y) => x - y)[1];
  const pick = (arr, k) => [...arr].sort((x, y) => x[k] - y[k])[1];
  const fpsOn = pick(ons, 'avg'), fpsOff = pick(offs, 'avg');
  await p.evaluate(() => document.querySelectorAll('#dunList .dnc>.bgm').forEach(e => e.style.display = ''));
  const keep = +(mid(ratios) * 100).toFixed(1);   /* 쌍별 비율의 중앙값 */
  const longOn = mid(ons.map(o => o.long)), longOff = mid(offs.map(o => o.long));
  console.log('  fps 표 (1080×2280 · 카드 ' + DUN_TH.length + '장 · 왕복 스크롤 120프레임)');
  console.log('  ┌────────────────┬────────┬────────────┬──────────┬────────────┐');
  console.log('  │ 상태           │ 평균   │ 중앙 프레임│ 하위 5%  │ >40ms 비율 │');
  console.log('  ├────────────────┼────────┼────────────┼──────────┼────────────┤');
  console.log(`  │ 배경 ON(121)   │ ${String(fpsOn.avg).padStart(6)} │ ${String(fpsOn.med + 'ms').padStart(10)} │ ${String(fpsOn.p95).padStart(8)} │ ${String(longOn + '%').padStart(10)} │`);
  console.log(`  │ 배경 OFF(기준) │ ${String(fpsOff.avg).padStart(6)} │ ${String(fpsOff.med + 'ms').padStart(10)} │ ${String(fpsOff.p95).padStart(8)} │ ${String(longOff + '%').padStart(10)} │`);
  console.log('  └────────────────┴────────┴────────────┴──────────┴────────────┘');
  console.log('  쌍별 평균 유지율(기록만): ' + ratios.map(r => (r * 100).toFixed(1) + '%').join(' · ') + ' → 중앙값 ' + keep + '%');
  /* ⚠ **239(2026-08-27) — «평균 유지율 ≥ 90%» 을 판정에서 뺐다. 문턱을 낮춘 것이 아니라 자를 바꿨다.**
     `node tools/probe239.js B/C` 로 같은 실행 안에서 6쌍을 재 보면, 코드를 한 줄도 안 바꾼 채
     평균 유지율이 **93.7 ~ 108.8%(폭 15.1%p)** 로 흔들린다. 그런데 .bgm 에 진짜 회귀를 주입했을 때의 값이
     **76.1%(brightness) · 56.9%(blur3)** 다 — 등재된 «77~82%» 는 그 잡음대와 회귀대가 **겹치는 구간**이라,
     이 자는 초록·빨강 어느 쪽도 뜻하지 않는다(같은 트리가 실행마다 양쪽에 다 떨어진다).
     같은 6쌍에서 **중앙 프레임 시간 비는 1.00 이 6/6**(폭 0.00)이고 회귀를 넣으면 **1.50** 으로 뛴다.
     «떨군 프레임(>40ms) 비율» 도 무회귀 4.2~13.4% vs 회귀 53.8~100% 로 갈린다.
     → **(246 로 폐기 — 아래 두 줄은 이제 `V121_PERF=1` 옵트인이다.** 이 러너에서는 «중앙 프레임 시간 비» 도
        양자화 때문에 무회귀에서 1.50 을 찍어 회귀대와 겹치고, 레이어 면적 4배 회귀는 1.00 으로 놓친다.
        §7 머리 주석의 표 참고.) 평균 유지율과 하위 5% 는 **표에 그대로 남기되 기록만** 한다
     (LESSONS 121-14 «임계값을 낮춰 초록을 만들지 마라» 를 어기지 않는 길은 «더 낮은 문턱» 이 아니라
     «흔들리지 않는 양» 이다 — 237 이 verify114 [8] 에서 가는 길과 같다).
     ⚠ 판정 축을 갈았으면 **회귀를 주입해 빨간지** 확인하는 것까지가 한 벌이다(LESSONS 132):
     `node tools/probe239.js C` 가 그 확인이고, 위 두 축은 주입 3케이스에서 전부 빨갛다. */
  /* 246 — 이 두 줄은 **GPU 합성이 있는 기기**에서만 뜻이 있다. 기본 실행에서는 값만 찍고(위 표),
     `V121_PERF=1 node tools/verify121.js` 로 켠다. 그 값은 러너 부하와 함께 움직인다는 것을 알고 볼 것. */
  if (process.env.V121_PERF) {
    ok(fpsOn.med <= fpsOff.med * 1.15,
      `[V121_PERF] 중앙 프레임 ${fpsOn.med}ms ≤ 기준 ${fpsOff.med}ms × 1.15 (스크롤 체감 유지 · 회귀 주입 시 1.50배)`);
    ok(longOn <= longOff + 30,
      `[V121_PERF] 떨군 프레임(>40ms) ON ${longOn}% ≤ 기준 ${longOff}% + 30%p (무회귀 실측 최대 13.4%p · 회귀 주입 53.8~100%)`);
  } else {
    console.log(`  (판정 아님) 중앙 프레임 ON ${fpsOn.med}ms / 기준 ${fpsOff.med}ms = ${(fpsOn.med / fpsOff.med).toFixed(2)}배` +
      ` · 떨군 프레임 ON ${longOn}% / 기준 ${longOff}%  — 시간 판정은 V121_PERF=1 에서만 (§7 주석 246)`);
  }

  sec('§8 콘솔');
  ok(errs.length === 0, `콘솔 에러 0건 (${errs.slice(0, 3).join(' | ')})`);

  await b.close();
  console.log(`\nVERIFY121 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
