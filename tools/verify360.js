/* 작업 360 회귀 게이트 — 좌측 사이드 6행 «크기·간격 통일» (저장소 주인 지시 2026-08-29)
 *
 *   node tools/verify360.js
 *
 * 주인 원문: «왼쪽에 출석보상만 왼쪽 버튼들이랑 간격이랑 크기가 달라보이더라. 다른거랑 같게 해줘.
 *             축복버튼도 그렇네»
 *
 * 이 게이트가 지키는 것은 **«6행이 같은 급이다»** 하나다. 좌표·pitch 는 `verify71`·`verifyA2` 가
 * 이미 잡고 있으므로 여기서는 그 둘이 못 보는 축 — **찍힌 잉크의 크기**와 **규격의 한 벌** — 을 본다.
 *
 * ⚑ 왜 «잉크» 인가: 340 이 같은 병을 이미 앓았다. 게이트가 **레이아웃 박스**(57×57)를 재고 초록이던
 *   동안 사람이 보는 **아트의 색 잉크**는 −14~20% 였다. `.si` 의 박스는 6행이 원래부터 같으므로
 *   (`--ih`×1.6 × `--ih`) 박스를 재면 이 게이트는 **태어날 때부터 헛초록**이다. 그래서 차분법으로
 *   실제 찍힌 실루엣을 잰다(capA2 3회차 교훈: 임계값 마스크는 드롭섀도를 물어 수 px 틀린다).
 *
 * ⚑ 기준값을 상수로 안 박는 이유(LESSONS 336-②): «108×97» 은 지금 이모지들의 우연한 값이다.
 *   상수로 박으면 아트가 바뀔 때마다 이 게이트가 «지시를 되돌려라» 고 요구한다(326 교훈).
 *   물어야 할 것은 절대 크기가 아니라 **서로 같은가** 이므로 **형제 평균 대비 편차**로 잰다.
 *   ⇒ 되돌림 시험 §R 이 «그래서 헐거운 것 아니냐» 를 못 박는다.
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { plate } = require('./plate360');   /* 385 — 차분법의 공용 판(마젠타). 규약·근거는 그 파일 머리말 */
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
/* 229 선례 — 되돌림 시험(§R)이 «한 곳만 갈아 끼운 사본» 을 **새로 열어** 이 게이트를 통째로 돌린다.
   살아 있는 페이지에 주입하면 거짓 초록이다(LESSONS 191). */
const TARGET = path.resolve(process.env.V360_SRC || path.join(ROOT, 'index.html'));

const CLIP = { x: 0, y: 0, width: 260, height: 1200 };
const BAND = 5;        /* «같은 급» 의 폭 — 형제 평균 대비 ±5% (등재문 처방 ②·④) */
const PITCH = 134;     /* 셀 114(아트 82 + 라벨 32) + gap 20 */
const TOP0 = 176;      /* 1행 셀 top(프레임) — 360 이 안 건드린 값 */
const ROSTER = ['attend', 'roul', 'quest', 'promo', 'coll', 'bless'];

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (got === undefined ? '' : '  [' + got + ']')); };
const near = (a, b, t) => Math.abs(a - b) <= t;

async function boot(ctx, url) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });   /* 58 파티클이 차분을 오염시킨다 */
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.stage = 37; S.best = 37; S.gold = 1234567; S.dia = 8900;
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0; S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  /* 차분을 쓰려면 «사이드 스택 말고는 동일» 해야 한다 — rAF·interval·CSS 애니를 얼린다 */
  await p.evaluate(() => { window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i); });
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  /* ★ 382(2026-08-29) — **자를 정착시킨다.** [3] 이 «6회 중 1회» 빨갛던 뿌리는 제품도 attend 도
     아니었다: 차분법은 임계값 8 로 «바뀐 픽셀» 을 세는데, 글리프 가장자리의 안티에일리어싱은
     **뒤에 깔린 색과 섞인 값**이다. 아이콘 뒤는 전투 캔버스라 **로드마다 그림이 달라서** 테두리
     한 줄이 임계를 넘었다 말았다 했다 = 6칸 전부 ±1~2px, 분모(형제 4칸 평균)가 98.25~99.75 로
     움직인다. attend 가 흔들린 것이 아니라 **분모가 올라간 실행에서만** 밴드를 넘었다
     (`probe382` ⓐ~ⓓ — 등재문의 «attend 가 93 으로 읽힌다» 는 관측 0건으로 기각).
     ⇒ 캔버스를 끄고 **단색 판**을 깐다. 판 색이 곧 «무엇을 재는가» 다:
        · 근흑 판(#0a0c16) — 외곽선 `--o`(#080a0a)가 임계 8 을 못 넘어 **실루엣에서 통째로 빠진다**
        · 흰 판          — 📅 처럼 흰 잉크를 가진 글리프가 판에 먹힌다
        · **마젠타**      — 근흑 외곽선과도 흰 잉크와도 멀어 실루엣을 통째로 센다 ⇒ 이것을 쓴다
     아이콘은 z 3, 캔버스는 그 아래라 **측정 대상은 안 바뀐다**(probe382 [4]: 14/14 전부 같은 값,
     산포 16px → 0px). ⚠ 이 판을 걷으면 [3] 이 다시 플레이키가 된다. */
  await plate(p);   /* ★ 385 — 이 두 줄은 `tools/plate360.js` 한 곳에 있다(자매 자 셋도 그것을 부른다) */
  return { p, errs };
}

async function survey(p) {
  const s = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const g = e => { const b = e.getBoundingClientRect();
      return { x: +(b.x - app.x).toFixed(2), y: +(b.y - app.y).toFixed(2),
               w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
    const cs = getComputedStyle(document.getElementById('app'));
    return { ih: cs.getPropertyValue('--ih').trim(),
             soloNodes: document.querySelectorAll('.side .solo').length,
             N: (typeof SIDE === 'object' && SIDE) ? SIDE.N : null,
             hasSoloConst: typeof SIDE === 'object' && SIDE
               ? ('SOLO' in SIDE || 'SGAP' in SIDE) : null,
             list: [...document.querySelectorAll('#sideL .ibtn')].map(e => {
               const si = e.querySelector('.si'), sl = e.querySelector('.sl'), bd = e.querySelector('.bdg');
               return { pop: e.dataset.pop, solo: e.classList.contains('solo'),
                        label: sl ? sl.textContent.trim() : null, glyph: si ? si.textContent : null,
                        cell: g(e), si: g(si), bdgShown: bd ? getComputedStyle(bd).display !== 'none' : null,
                        sx: parseFloat(e.style.getPropertyValue('--sx')) || null };
             }) };
  });
  const base = (await p.screenshot({ clip: CLIP })).toString('base64');
  const shots = [];
  for (const r of s.list) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${r.pop}"] .si{visibility:hidden!important}` });
    await p.waitForTimeout(70);
    shots.push((await p.screenshot({ clip: CLIP })).toString('base64'));
    await p.evaluate(el => el.remove(), st);
    await p.waitForTimeout(50);
  }
  const ink = await p.evaluate(async ({ base, shots, CLIP }) => {
    const load = b64 => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => {
      const im = await load(b64);
      const c = document.createElement('canvas');
      c.width = CLIP.width; c.height = CLIP.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, CLIP.width, CLIP.height).data;
    };
    const A = await px(base), out = [];
    for (const sh of shots) {
      const B = await px(sh);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < CLIP.height; y++) for (let x = 0; x < CLIP.width; x++) {
        const i = (y * CLIP.width + x) * 4;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      out.push(x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return out;
  }, { base, shots, CLIP });
  s.list.forEach((r, i) => { r.ink = ink[i]; });
  return s;
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  /* ── 0. 소스 — 걷어낸 것이 정말 걷혔나(죽은 규칙·죽은 상수 금지) ───────────── */
  const src = fs.readFileSync(TARGET, 'utf8');
  const code = src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  console.log('[0] 소스 — 단독 규격이 «규칙째» 걷혔는가');
  ok(!/\.ibtn\.solo/.test(code), 'CSS `.ibtn.solo` 규칙 0건 (죽은 규칙 금지)');
  ok(!/class="ibtn solo"/.test(code), '마크업 `class="ibtn solo"` 0건');
  ok(!/--isolo|--isgap/.test(code), 'CSS 변수 --isolo / --isgap 0건 (선언·사용 모두)');
  ok(!/SIDE\.SOLO|SIDE\.SGAP|SOLO\s*:\s*101|SGAP\s*:\s*60/.test(code),
     'JS 상수 SIDE.SOLO / SIDE.SGAP 0건 (죽은 상수 금지)');
  /* 340 교훈 — «지웠다» 만 묻고 «남아야 할 것» 을 안 물으면, 통째로 사라져도 초록이다(346-①) */
  ok(/#sideL/.test(code) && ROSTER.every(k => code.includes(`data-pop="${k}"`)),
     `#sideL 6행이 그대로 있다 (${ROSTER.join(',')})`);

  /* ── 1. 구조 — 여섯 행이 한 규격인가 ──────────────────────────────────────── */
  const { p, errs } = await boot(ctx, 'file://' + TARGET);
  const s = await survey(p);
  console.log('\n[1] 구조 — 6행이 한 규격인가');
  ok(s.ih === '82.00px', '--ih = 82.00px (1080×2280 에서는 축소가 안 걸린다 — 잰 값이 규격과 같은 자다)', s.ih);
  ok(s.list.length === 6, '#sideL 6행', s.list.length);
  ok(s.list.map(r => r.pop).join(',') === ROSTER.join(','), `순서 = ${ROSTER.join(',')}`,
     s.list.map(r => r.pop).join(','));
  ok(s.soloNodes === 0 && s.list.every(r => !r.solo), '`.solo` 노드 0개 — 단독 규격이 안 남았다', s.soloNodes);
  ok(s.hasSoloConst === false, 'SIDE 에 SOLO·SGAP 키가 없다', JSON.stringify(s.hasSoloConst));
  ok(s.N === s.list.length, `SIDE.N(${s.N}) = 행 수(${s.list.length}) — 짧은 화면비 축소식의 전제`);
  /* 주인 지시의 «출석 라벨 신설» — 있기만 하면 되는 게 아니라 **글자가 «출석»** 이어야 한다.
     (빈 `<span class="sl">` 로도 셀 높이는 맞는다 — 그 자리가 헛초록이 되는 곳이다) */
  ok(s.list.every(r => r.label && r.label.length > 0),
     '6행 전부 라벨 노드가 있고 비어 있지 않다', s.list.map(r => r.label).join('/'));
  ok(s.list[0].pop === 'attend' && s.list[0].label === '출석',
     '1행 «출석» 라벨 신설 (360 — 다른 행과 같은 구조)', s.list[0].label);
  ok(s.list.every(r => near(r.cell.h, 114, 0.5)), '6행 셀 높이 전부 114 (아트 82 + 라벨 32)',
     s.list.map(r => r.cell.h).join('/'));
  ok(s.list.every(r => near(r.si.h, 82, 0.5)), '6행 아트 박스 높이 전부 82',
     s.list.map(r => r.si.h).join('/'));

  /* ── 2. 간격 — 전 행 등간격 ───────────────────────────────────────────────── */
  console.log('\n[2] 간격 — 전 행 등간격 (주인 «간격이 달라보이더라»)');
  const pitch = s.list.slice(1).map((r, i) => +(r.cell.y - s.list[i].cell.y).toFixed(2));
  s.list.forEach((r, i) => ok(near(r.cell.y, TOP0 + PITCH * i, 1.5),
    `행 ${r.pop} y=${TOP0 + PITCH * i}(=${TOP0} + ${PITCH}×${i})`, r.cell.y));
  ok(pitch.every(v => near(v, PITCH, 0.5)), `pitch 5칸 전부 ${PITCH}`, pitch.join('/'));
  ok(Math.max(...pitch) - Math.min(...pitch) <= 0.5,
     'pitch 편차 ≤ 0.5px — ref 의 비균등(161/135/131/133/138)이 부활하지 않았다',
     (Math.max(...pitch) - Math.min(...pitch)).toFixed(2));

  /* ── 3. 크기 — 찍힌 잉크가 형제 평균 ±5% ──────────────────────────────────── */
  console.log('\n[3] 크기 — 찍힌 잉크(차분법) 가 형제 평균 ±' + BAND + '%');
  ok(s.list.every(r => r.ink), '6행 전부 잉크 측정 성공(차분 > 0)',
     s.list.map(r => r.ink ? `${r.ink.w}×${r.ink.h}` : 'X').join(' '));
  const got = s.list.filter(r => r.ink);
  /* 기준은 «주인이 이름을 안 댄 행들» — 원문의 «다른거» 다. 출석·축복을 기준에서 빼야
     그 둘이 기준을 끌고 가 «평균에 가까워 보이는» 착시가 안 생긴다(자기 자신을 재는 항등식 방지). */
  const ref = got.filter(r => r.pop !== 'attend' && r.pop !== 'bless');
  const aw = ref.reduce((a, r) => a + r.ink.w, 0) / ref.length;
  const ah = ref.reduce((a, r) => a + r.ink.h, 0) / ref.length;
  console.log(`    기준(출석·축복 뺀 ${ref.length}칸) 평균 잉크 = ${aw.toFixed(1)} × ${ah.toFixed(1)}`);
  got.forEach(r => {
    const dw = (r.ink.w / aw - 1) * 100, dh = (r.ink.h / ah - 1) * 100;
    /* 371 이관 — 356 이 축복의 폭만 «−11.5% 로 못 박아» 루프에서 빼 뒀던 예외가 **없어졌다.**
       글리프를 형제 급 폭으로 갈아 끼웠으므로(🙏 → 😇) 6행이 다시 한 자로 재진다.
       ⚠ 아래 ★ 축복 항은 기대값이 이 루프와 **같아졌다** — 서로 반대를 묻지 않으므로 공존한다
       (그 항이 남는 이유는 주인이 이름을 댄 자리를 게이트에서 안 지우기 위해서다). */
    ok(Math.abs(dw) <= BAND && Math.abs(dh) <= BAND,
       `${r.pop} ${r.glyph} 잉크 ${r.ink.w}×${r.ink.h} — 형제 평균 대비 폭 ${dw.toFixed(1)}% · 높이 ${dh.toFixed(1)}%`);
  });
  /* 주인이 이름을 댄 두 자리를 **따로** 한 번 더 못 박는다 — 위 루프에 섞여 있으면
     «어느 행이 왜 잡혔는지» 가 안 보이고, 지시가 그 둘을 지목했다는 사실이 게이트에서 사라진다. */
  const at = got.find(r => r.pop === 'attend'), bl = got.find(r => r.pop === 'bless');
  ok(at && Math.abs((at.ink.h / ah - 1) * 100) <= BAND,
     '★ 출석 — 잉크 «높이» 가 형제와 같은 급 (수리 전 +20~23%: 아트 101 단독 규격)',
     at ? ((at.ink.h / ah - 1) * 100).toFixed(1) + '%' : 'X');
  /* ★ 382(2026-08-29) — «밴드 안» 만으로는 모자란 자리다.
     360 뒤 attend 는 폭 −4.0% 로 밴드(±5%) **안**이었지만 여유가 1.0pp 뿐이라, 자가 1px 만
     흔들려도(=1.06pp) 넘었다. 자는 위 boot 의 단색 판이 정착시켰고, 여기서는 **여유 자체**를
     묻는다 — 자를 고쳐도 여유가 얇으면 다음 아트 교체·브라우저 갱신에 그대로 재발한다.
     ⚠ 이 항은 «밴드 안인가» 와 **다른 것을 묻는다**: 위 루프의 attend 항이 초록인 채로
        이 항만 빨개지는 것이 정상이고, §R-c 가 바로 그 상태를 실증한다.
     1.5pp 인 이유: 관측된 1px 노이즈가 1.06pp 다(probe382 [2]). 그보다 커야 «자가 흔들려도
     안 넘는다» 가 성립한다. 지금 값은 3.0pp 라 두 배 여유가 있다. */
  const MARGIN = 1.5;
  const atMg = at ? BAND - Math.abs((at.ink.w / aw - 1) * 100) : -1;
  ok(atMg >= MARGIN,
     `★ 출석 — 폭이 밴드 끝에서 ${MARGIN}pp 넘게 떨어져 있다 (382 — 1px 노이즈 1.06pp 보다 넓은 여유)`,
     at ? `여유 ${atMg.toFixed(2)}pp (Δ폭 ${((at.ink.w / aw - 1) * 100).toFixed(2)}%)` : 'X');
  /* ★ 371(2026-08-29) — 이 항이 **제자리로 돌아왔다.**
     내력: 360 은 🙏 의 좁은 자연 폭을 `--sx 1.235` 로 늘려 형제 급에 맞췄고, 356(«아이콘은 원본 비율»)이
     그 배율을 폐기하자 축복만 **폭 −11.5~12.9%** 로 내려앉았다. 356 은 그 값을 기대값으로 **못 박아**
     («−11.5%±2.5») 자리를 감시 밖으로 내보내지 않고 후속을 371 로 등재했다.
     371 이 그 후속이다 — 답은 배율이 아니라 **선례**였다(🏅 → 🏆 와 같은 처방으로 🙏 → **😇**).
     ⇒ 기대값은 356 의 메모 그대로 **0%±BAND** 로 되돌린다. 이제 이 항이 잡는 것은:
        · 누가 글리프를 좁은 것(🙏 등)으로 되돌리면 **빨개진다** (§R-a 가 실증한다)
        · 누가 `--sx` 를 되살려 늘리면 **빨개진다** (§R-b — 356 회귀 감지)
        · 누가 --sf 를 흔들면 높이 항과 함께 **빨개진다**
     높이는 그대로 형제 급이어야 한다 — 아래 두 항이 짝이다(폭만 맞고 높이가 틀리면 글리프가 눌린 것). */
  const BLW = 0, BLTOL = BAND;
  ok(bl && Math.abs((bl.ink.w / aw - 1) * 100 - BLW) <= BLTOL,
     `★ 축복 폭 = 형제 평균 ±${BLTOL}% (371 — 글리프를 갈아 끼워 회수했다)`,
     bl ? ((bl.ink.w / aw - 1) * 100).toFixed(1) + '%' : 'X');
  ok(bl && Math.abs((bl.ink.h / ah - 1) * 100) <= BAND,
     '★ 축복 «높이» 는 형제와 같은 급 (371 --sf 는 높이 역산치다)',
     bl ? ((bl.ink.h / ah - 1) * 100).toFixed(1) + '%' : 'X');
  /* ★ 356 이관 — «--sx 퍼짐 ≤ 0.25» 는 «1 로 몰 때까지의 거리» 를 재던 항이다. 다 몰았으므로
     이제 물을 것은 퍼짐이 아니라 **선언이 하나도 없는가** 다(--sx:1 로 적어 두는 것도 막는다). */
  const sxs = s.list.map(r => r.sx).filter(v => v);
  ok(sxs.length === 0, '아이콘 --sx 선언 0건 (356 — 아이콘은 원본 비율)',
     sxs.length ? sxs.join(',') : '없음');

  /* ── 4. 승계 — 318 레드닷 경로가 살아 있는가 ──────────────────────────────── */
  console.log('\n[4] 승계 — 318 출석 레드닷(`sideAlert`)이 새 규격에서도 켜진다');
  const dot = await p.evaluate(() => {
    const out = { err: null };
    try {
      const cell = document.querySelector('#sideL .ibtn[data-pop="attend"]');
      const bd = cell.querySelector('.bdg');
      sideAlert('attend', false);
      out.off = getComputedStyle(bd).display;
      sideAlert('attend', true);
      out.on = getComputedStyle(bd).display;
      out.onCls = cell.classList.contains('on');
      /* ⚠ `getBoundingClientRect` 는 **transform 을 먹은** 값이다. 이 게이트는 차분 측정을 위해
         CSS 애니메이션을 `animation-play-state:paused` 로 얼려 두는데, 방금 `display:block` 이 된
         배지는 등장 애니메이션의 **0% 프레임(scale(0))에 멈춘다** → rect 가 0×0 이 된다.
         (1회차에 여기서 «배지 크기 0» 이 나와 제품 결함으로 읽을 뻔했다 — 350 의 «표시 전용 노드는
         재는 방법부터 고른다» 와 같은 자리다.) ⇒ 레이아웃 값인 `offset*` 로 잰다. */
      out.cx = +(bd.offsetLeft + bd.offsetWidth / 2).toFixed(2);
      out.cy = +(bd.offsetTop + bd.offsetHeight / 2).toFixed(2);
      out.cw = +cell.offsetWidth.toFixed(2); out.chArt = 82;
      out.size = +bd.offsetWidth.toFixed(2);
    } catch (e) { out.err = e.message; }
    return out;
  });
  if (dot.err) { fail++; console.log('  FAIL [4] 레드닷 블록 예외 — ' + dot.err); }
  else {
    ok(dot.off === 'none', '출석 레드닷 — sideAlert(false) 로 꺼진다', dot.off);
    ok(dot.on === 'block' && dot.onCls, '출석 레드닷 — sideAlert(true) 로 켜진다 (318 경로 승계)',
       `${dot.on} / .on=${dot.onCls}`);
    ok(dot.cx > dot.cw / 2 && dot.cy < dot.chArt / 2,
       '출석 레드닷이 아트의 우상단 사분면 (299 규약)', `중심 ${dot.cx}/${dot.cw} · ${dot.cy}/${dot.chArt}`);
    /* 등재문 ⓒ — 배지는 `--ih` 파생이라 아트가 101 → 82 로 줄면 크기도 따라와야 한다.
       따라오지 않으면 «출석만 배지가 큰» 새 결함이 생긴다(주인이 본 병의 재발). */
    ok(near(dot.size, 82 * 0.512, 1.5),
       '출석 레드닷 크기가 --ih 파생값(82×.512 = 41.98) — 아트 축소를 따라왔다', dot.size);
  }

  ok(errs.length === 0, '[5] 콘솔·런타임 에러 0건', errs.length ? errs.join(' | ') : '없음');

  /* ── R. 되돌림 시험 — 이 게이트가 정말 무언가를 지키는가 ──────────────────── */
  /* «형제 평균 대비» 는 절대 상수를 안 쓰는 대신 «전부 같이 커지면 초록» 이라는 구멍이 있다.
     그 구멍이 **실제로 뚫려 있는지** 를 직접 판다: 한 행만 옛 배율로 되돌린 사본을 새로 열어
     이 게이트를 통째로 다시 돌린다(V360_SRC). 빨개져야 정상이다. */
  if (!process.env.V360_SRC) {
    /* 371 이관 — 되돌림이 **둘**이 됐다. 371 은 «배율» 이 아니라 «글리프» 를 고친 작업이라,
       옛 배율만 되돌려 보면 «글리프를 되돌리면 어떻게 되는가» 가 통째로 안 물어진다.
         [R-a] 글리프를 옛 🙏 로 되돌린다   → 371 이 실제로 회수한 것이 무엇인지
         [R-b] 옛 --sx 1.414 를 도로 심는다 → 356 회귀(비균등 scaleX 부활) 감지
       둘 다 «★ 축복 폭 = 형제 평균 ±BAND» 에서 벗어나야(=빨개져야) 이 항이 헐겁지 않다. */
    const BLESS_STYLE = '--sf:.872;--dx:3.4px;--dy:4.1px';
    const BLESS_GLYPH = '<span class="si">😇</span>';
    const anchor = BLESS_STYLE + '"><span class="si">😇</span>';
    const hits = src.split(anchor).length - 1;
    ok(hits === 1, '[R] 갈아 끼울 자리(축복 행 style + 글리프)가 정확히 1곳', hits);

    /* 사본 한 벌을 만들어 이 게이트의 측정 절차를 통째로 다시 돌린다.
       ⚠ 사본은 **저장소 루트**에 둔다(229 선례 `.v229-neg.html`). index.html 이 btn.png·hdr.png 를
       상대 경로로 물고 있어 /tmp 에 두면 리소스가 통째로 404 가 되고, 배경이 달라지면
       차분으로 뜬 «찍힌 픽셀» 도 같이 달라진다. */
    const neg = async (tag, label, mutate) => {
      const f = path.join(ROOT, `.v360-neg-${tag}.html`);
      fs.writeFileSync(f, mutate(src));
      const { p: p2, errs: e2 } = await boot(ctx, 'file://' + f);
      const s2 = await survey(p2);
      const g2 = s2.list.filter(r => r.ink);
      const r2 = g2.filter(r => r.pop !== 'attend' && r.pop !== 'bless');
      const aw2 = r2.reduce((a, r) => a + r.ink.w, 0) / r2.length;
      const bl2 = g2.find(r => r.pop === 'bless');
      const d2 = bl2 ? (bl2.ink.w / aw2 - 1) * 100 : 0;
      ok(bl2 && Math.abs(d2 - BLW) > BLTOL, label, d2.toFixed(1) + '%');
      /* 되돌린 것 «말고» 는 그대로 초록이어야 한다 — 아니면 «아무거나 흔들면 다 빨개지는» 항등식이다 */
      ok(g2.filter(r => r.pop !== 'bless').every(r => Math.abs((r.ink.w / aw2 - 1) * 100) <= BAND),
         `[R-${tag}] 나머지 5행은 그대로 초록 — «아무거나 흔들면 빨개지는» 항등식이 아니다`);
      ok(e2.length === 0, `[R-${tag}] 사본 콘솔 에러 0건`, e2.length ? e2.join(' | ') : '없음');
      await p2.close();
      try { fs.unlinkSync(f); } catch (_) {}
    };

    if (hits === 1) {
      console.log('\n[R-a] 되돌림 시험 — 축복 글리프를 옛 🙏 로 되돌린 사본이 빨개지는가 (371 본체)');
      await neg('a', '[R-a] 옛 글리프 🙏 로 되돌리면 축복 폭이 형제 평균에서 벗어난다 — 371 이 회수한 것이 실재한다',
        s => s.replace(anchor, BLESS_STYLE + '"><span class="si">🙏</span>'));

      console.log('\n[R-b] 되돌림 시험 — 옛 --sx 1.414 를 도로 심은 사본이 빨개지는가 (356 회귀)');
      await neg('b', '[R-b] 옛 배율(--sx 1.414)을 도로 심으면 축복 폭이 형제 평균에서 벗어난다 — 단언이 헐겁지 않다',
        /* `.ibtn .si` 의 scaleX 자체를 356 이 뗐으므로 사본에는 그 손잡이도 도로 심어야
           «옛 배율» 이 실제로 걸린다 — 안 심으면 사본이 그대로 초록이 나와 시험이 헛돈다.
           ⚠ 손잡이를 도로 심어도 **--sx 가 없는 5행은 기본값 1** 이라 폭이 안 바뀐다
              = 위 «나머지 5행» 항이 여전히 «나머지는 그대로» 를 묻는다. */
        s => s.replace(BLESS_STYLE, '--sf:.872;--sx:1.414;--dx:3.4px;--dy:4.1px')
              .replace('transform:translate(var(--dx,0),var(--dy,0));',
                       'transform:translate(var(--dx,0),var(--dy,0)) scaleX(var(--sx,1));'));
    }
    /* 죽은 참조 방지 — 위 두 사본이 쓰는 글리프 상수가 실제 소스와 같은지 한 번 더 못 박는다 */
    ok(src.split(BLESS_GLYPH).length - 1 === 1, '[R] 축복 글리프 😇 가 소스에 정확히 1곳',
       src.split(BLESS_GLYPH).length - 1);

    /* ── [R-c] 382 되돌림 시험 ────────────────────────────────────────────────
       위 ★ 출석 여유 항이 **무르지 않다**는 것을, 그리고 «밴드 안» 과 «여유» 가 정말 다른 것을
       묻는다는 것을 한 사본으로 같이 못박는다. 360 당시 값(.896)으로 되돌린 사본에서
         · 밴드 항(|Δ폭| ≤ 5%)  → **그대로 초록**  ← 이것이 382 가 잡은 병의 정확한 모양이다
         · 여유 항(≥ 1.5pp)     → **빨강**
       둘 중 하나라도 어긋나면 이 항은 «아무거나 흔들면 빨개지는» 것이거나 헛초록이다. */
    const ATT_SF = '<div class="ibtn" data-pop="attend" title="출석" style="--sf:.920;';
    const attHits = src.split(ATT_SF).length - 1;
    ok(attHits === 1, '[R-c] 갈아 끼울 자리(출석 행 --sf)가 정확히 1곳', attHits);
    if (attHits === 1) {
      console.log('\n[R-c] 되돌림 시험 — 출석 --sf 를 360 당시 값(.896)으로 되돌린 사본 (382 본체)');
      const f = path.join(ROOT, '.v360-neg-c.html');
      fs.writeFileSync(f, src.replace(ATT_SF, ATT_SF.replace('--sf:.920;', '--sf:.896;')));
      const { p: p3, errs: e3 } = await boot(ctx, 'file://' + f);
      const s3 = await survey(p3);
      const g3 = s3.list.filter(r => r.ink);
      const r3 = g3.filter(r => r.pop !== 'attend' && r.pop !== 'bless');
      const aw3 = r3.reduce((a, r) => a + r.ink.w, 0) / r3.length;
      const at3 = g3.find(r => r.pop === 'attend');
      const d3 = at3 ? (at3.ink.w / aw3 - 1) * 100 : 0;
      const mg3 = BAND - Math.abs(d3);
      ok(at3 && Math.abs(d3) <= BAND,
         '[R-c] 되돌린 사본은 **밴드 안이다** — 382 가 잡은 것은 «밴드를 넘었다» 가 아니라 «여유가 없다» 였다',
         `Δ폭 ${d3.toFixed(2)}%`);
      ok(mg3 < MARGIN,
         '[R-c] 그런데 여유 항은 빨개진다 — ★ 출석 여유 항이 실제로 무언가를 지킨다',
         `여유 ${mg3.toFixed(2)}pp < ${MARGIN}pp`);
      ok(g3.filter(r => r.pop !== 'attend').every(r => BAND - Math.abs((r.ink.w / aw3 - 1) * 100) >= MARGIN),
         '[R-c] 나머지 5행의 여유는 그대로 넉넉하다 — «아무거나 흔들면 빨개지는» 항등식이 아니다',
         g3.filter(r => r.pop !== 'attend')
           .map(r => `${r.pop} ${(BAND - Math.abs((r.ink.w / aw3 - 1) * 100)).toFixed(1)}`).join('/'));
      ok(e3.length === 0, '[R-c] 사본 콘솔 에러 0건', e3.length ? e3.join(' | ') : '없음');
      await p3.close();
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }

  await b.close();
  console.log(`\nVERIFY360 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail + '건' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('verify360 즉사:', e); process.exit(2); });
