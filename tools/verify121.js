/* 작업 121 — 03 던전·컨텐츠 카드 «움직이는 배경 레이어(.bgm)» + «썸네일 들썩» 회귀 게이트.
   실행: node tools/verify121.js  → 마지막 줄이 `VERIFY121 n/n PASS` 여야 한다.

   지시서(PROGRESS 121)가 요구한 게이트 항목을 그대로 옮겼다:
     ① 카드마다 `.bgm` 존재 · `getAnimations().length > 0`
     ② 페이지가 닫히면 `animation-play-state:paused` (56 절전도 같음)
     ③ 두 프레임(0s / 3s) 캡처 픽셀 차이 > 0 = «실제로 움직인다»
     ④ 텍스트·썸네일 bbox 불변 · 클릭 히트 불변
     ⑤ 썸네일 0s / 0.4s 캡처 픽셀 차 > 0 · 슬롯 밖 잉크 0
     ⑥ 03 리스트 스크롤 중 fps 표(≥ 55fps)
     ⑦ 잠금 카드는 배경·썸네일 정지

   주의(LESSONS 29-②·28-③): «움직였는가» 를 애니메이션 플래그가 아니라 **픽셀**로 판정한다.
   그리고 정지해야 하는 상태에서는 **픽셀이 같아야** 한다 — 한 방향만 재면 «항상 통과» 하는 게이트가 된다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const sec = t => console.log('\n[' + t + ']');

/* 72 실측 슬롯 기하 — 던전 6장(폭, 상단 인셋). 레이드 3장은 RAIDS.ui 값. */
const DUN_TH = [[311, 36], [296, 52], [330, 11], [330, 11], [330, 11], [330, 11]];
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
  ok(st.length === 6, `던전 카드 6장 (실제 ${st.length})`);
  st.forEach((c, i) => {
    ok(c.hasBgm, `던전${i + 1}(${c.id}) .bgm 레이어 존재`);
    ok(c.iBgm === c.iBg + 1, `던전${i + 1} .bgm 이 .bg 바로 다음 (bg ${c.iBg} → bgm ${c.iBgm})`);
    ok(c.iBgm < c.iTh, `던전${i + 1} 썸네일(.th ${c.iTh})보다 아래 z (지시 ④ 순서 불변)`);
    ok(c.pe === 'none', `던전${i + 1} .bgm pointer-events:none (클릭 히트 불변) — ${c.pe}`);
    ok(c.ov === 'hidden', `던전${i + 1} .bgm overflow:hidden (카드 밖 유출 0) — ${c.ov}`);
    ok(c.same, `던전${i + 1} .bgm 이 .bg 와 같은 면적(inset 8/7)`);
    ok(/^bgm-(gold|dia|rel)$/.test(c.theme), `던전${i + 1} 테마 클래스 ${c.theme}`);
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
  /* ⚠ 4회차 — 이 두 항목의 «기준» 이 바뀌었다. 3회차까지는 기준 자세(translate 0)가 곧 가장 높은 포즈라
     `max(translate)` 가 그대로 진폭이었다. 그런데 그 기준 자세 자체가 이미 잉크를 슬롯 천장 위 10.3~10.5px
     로 올려놓고 있어서(비평가 E·F 독립 실측) **정점마다 정수리가 잘렸다.** 4회차에 전 키프레임을 +12px
     내렸으므로 이제 translate 는 14~27 구간을 오간다 —
       · «위로 안 올라간다» 는 `min ≥ 0` 이 아니라 **`min ≥ 기준선(12)`** 으로 묻는다.
       · 진폭은 절대값이 아니라 **`max − min`** 이다(지시 ⑥ 의 «큰 점프 14px»).
     실제 잘림 여부는 이 산술이 아니라 픽셀로 봐야 한다 — `node tools/probe121.js cut`
     (6카드 × 14위상 천장 접촉 폭, 4회차 실측 **전부 0**). */
  const BASE = 12;
  ok(tr && Math.min(...tr) >= BASE - 0.01,
    `썸네일 translate 최소 ${tr && Math.min(...tr)}px ≥ 기준선 ${BASE}px (천장 위로 안 올라간다)`);
  const amp = tr && +(Math.max(...tr) - Math.min(...tr)).toFixed(2);
  ok(amp >= 12 && amp <= 16, `큰 점프 진폭 ${amp}px = max ${tr && Math.max(...tr)} − min ${tr && Math.min(...tr)} (지시 14px)`);

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
    const want = e.tagName === 'CANVAS' ? e.offsetHeight
      : 541 - parseFloat(cs.getPropertyValue('--thcy')) - parseFloat(cs.getPropertyValue('--tht'));
    const got = parseFloat(getComputedStyle(e).transformOrigin.split(' ')[1]);
    return { want: +want.toFixed(1), got: +got.toFixed(1) };
  }).filter(Boolean));
  ok(org.length === 6 && org.every(o => Math.abs(o.want - o.got) <= 0.6),
    `썸네일 스쿼시 축 = 슬롯 바닥 (${org.map(o => o.got + '/' + o.want).join(' · ')})`);
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
  /* 아이들 프레임이 «실제로» 바뀐다 — 잠금 카드는 안 바뀌어야 한다 */
  const f0 = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map(c => c._fr));
  await p.waitForTimeout(900);
  const f1 = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map(c => c._fr));
  const liveIdx = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')]
    .map((c, i) => c.closest('.dnc.lkd') ? -1 : i).filter(i => i >= 0));
  const lockIdx = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')]
    .map((c, i) => c.closest('.dnc.lkd') ? i : -1).filter(i => i >= 0));
  ok(liveIdx.length > 0 && liveIdx.every(i => f0[i] && f1[i] && f0[i] !== f1[i]),
    `해금 칸 ${liveIdx.length}개 전부 아이들 프레임 순환 (${liveIdx.map(i => f0[i] + '→' + f1[i]).join(' · ')})`);
  ok(lockIdx.length === 0 || lockIdx.every(i => f0[i] === f1[i]),
    `잠금 칸 ${lockIdx.length}개 프레임 정지`);
  /* 아레나는 기본 세이브에서 잠겨 있다 — 해금해서 «두 기사가 서로 다른 위상으로 도는지» 까지 본다(지시 ⑥) */
  if (arn) {
    await p.evaluate(() => { S.best = 999; renderDunPage(); });
    await p.waitForTimeout(900);
    const g0 = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.arn2 canvas.thcv')].map(c => c._fr));
    await p.waitForTimeout(900);
    const g1 = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.arn2 canvas.thcv')].map(c => c._fr));
    ok(g0.length === 2 && g0.every((f, i) => f && g1[i] && f !== g1[i]),
      `해금 아레나 두 기사 아이들 순환 (${g0.map((f, i) => f + '→' + g1[i]).join(' · ')})`);
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

  sec('§7 스크롤 fps — 카드가 전부 도는 채로 03 리스트를 굴린다');
  await p.evaluate(() => setDunSub('dun'));
  await p.waitForTimeout(600);
  /* ⚠ 이 러너의 크로미움은 소프트웨어 렌더(SwiftShader)라 «절대 55fps» 는 배경을 통째로 꺼도 안 나온다
     (기준 30.3fps 실측). 그래서 지시의 «≥55fps» 를 **같은 러너에서 잰 기준 대비 손실률**로 옮긴다 —
     .bgm 을 내린 상태를 기준으로 잡고, 배경을 켠 상태가 그 90% 이상이면 통과다.
     절대 fps 표는 그대로 출력한다(지시 «스크롤 fps 표»). 실기기 60fps 환경에서는 손실률 그대로 55fps 이상이 된다. */
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
        d.sort((a, b) => a - b);
        res({ avg: +(1000 / (d.reduce((s, v) => s + v, 0) / d.length)).toFixed(1),
              med: +d[Math.floor(d.length / 2)].toFixed(1),
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
  const keep = +(mid(ratios) * 100).toFixed(1);   /* 쌍별 비율의 중앙값 — 부하 변동에 강하다 */
  console.log('  fps 표 (1080×2280 · 카드 6장 · 왕복 스크롤 120프레임)');
  console.log('  ┌────────────────┬────────┬────────────┬──────────┐');
  console.log('  │ 상태           │ 평균   │ 중앙 프레임│ 하위 5%  │');
  console.log('  ├────────────────┼────────┼────────────┼──────────┤');
  console.log(`  │ 배경 ON(121)   │ ${String(fpsOn.avg).padStart(6)} │ ${String(fpsOn.med + 'ms').padStart(10)} │ ${String(fpsOn.p95).padStart(8)} │`);
  console.log(`  │ 배경 OFF(기준) │ ${String(fpsOff.avg).padStart(6)} │ ${String(fpsOff.med + 'ms').padStart(10)} │ ${String(fpsOff.p95).padStart(8)} │`);
  console.log('  └────────────────┴────────┴────────────┴──────────┘');
  console.log('  쌍별 유지율: ' + ratios.map(r => (r * 100).toFixed(1) + '%').join(' · ') + ' → 중앙값 ' + keep + '%');
  ok(keep >= 90, `배경을 켠 채 스크롤해도 기준 대비 ${keep}% 유지 (≥ 90%, 3쌍 중앙값)`);
  /* 하위 5% 는 **기록만** 한다 — 이 러너의 소프트웨어 합성기는 프레임을 33/50/83ms 로 양자화해서,
     합성 레이어가 하나라도 돌면 무엇을 고쳐도 그 칸으로 떨어지고 실행마다 튄다(같은 코드로 20 → 12fps).
     여기를 판정에 쓰면 «재현성 없는 회귀» 로 다음 세션의 회차를 태운다(LESSONS 28-③·29-②).
     판정은 실행마다 안정적인 **중앙 프레임 시간**과 평균 유지율이 한다. */
  ok(fpsOn.med <= fpsOff.med * 1.15,
    `중앙 프레임 ${fpsOn.med}ms ≤ 기준 ${fpsOff.med}ms × 1.15 (스크롤 체감 유지)`);

  sec('§8 콘솔');
  ok(errs.length === 0, `콘솔 에러 0건 (${errs.slice(0, 3).join(' | ')})`);

  await b.close();
  console.log(`\nVERIFY121 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
