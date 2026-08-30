#!/usr/bin/env node
/* 게이트 — 작업 471 「레드닷 위치 전면 통일 «호스트 우상단 코너»」 (저장소 주인 보고 2026-08-30)
 *
 *   node tools/verify471.js
 *
 * 규약(제품 `index.html` 의 471 블록):
 *   닷 코어 중심이 **호스트 테두리 바깥 상자(border box) 우상단 코너에서 안쪽 `--dot-in`** 에 앉는다.
 *   식은 한 곳에만 있다 — `right/top: calc(var(--dot-in) - var(--dot-r) - var(--dot-bw,0px))`.
 *
 * 자를 새로 만들지 않는다 — **재현 자 `tools/probe471.js` 에게 물어서** 그 숫자로 단언한다
 * (385 «자매 자 드리프트» 방지: 두 자가 서로 다른 화면·다른 상자를 재는 날이 반드시 온다).
 *
 * 절:
 *   [A] 전수 — 예외 목록 밖 자리는 코너 거리 dxR·dyT 가 `--dot-in` ±2px
 *   [B] 잘림 0 — 조상 클리핑이 닷 바깥 링을 한 자리도 안 자른다 (주인 스크린샷 ①의 «반달»)
 *   [C] 찍힌 픽셀 — 10 상점 서브탭 배지 원 둘레 8방향이 실제로 찍힌다(`probe471b`)
 *   [D] 선언 위생 — `.ifbtn.pbtn>.updot` 이중 선언 0 · 규약식은 한 곳 · 예외는 목록에 적힌 것뿐
 *   [E] 되돌림 — 규약값을 어긴 사본에서 [A] 가 **실제로 빨개진다**
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.v471-neg.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* ── 예외 목록 ─────────────────────────────────────────────────────────────
   여기 적힌 자리만 규약 밖에 설 수 있다. **목록 밖의 «안쪽형» 은 [A] 가 빨갛게 한다.**
   목록을 늘리려면 «왜 코너를 못 쓰는가» 를 제품 주석과 review 에 같이 남길 것. */
const EXC = {
  'HUD 탭바 .tab .bdg':
    '프레임 좌우 변에 맞닿은 탭 칸 — 끝 칸이 코너를 쓰면 #app 밖으로 나가 잘린다(수리 전에도 7px)',
  '35 패스 탭 #psBar .pt>.bdg':
    '같은 이유(패스 하단 탭바도 프레임 변에 플러시)',
  '05 카드 .wgc>.updot':
    '코너가 `Lv.n` 잉크 자리다 — 코너에 두면 글자 오른쪽 19px 을 검정 링이 덮는다(verify283)',
  '10 «10회 소환» 버튼 .cbtn.b1 (328 — 노드는 카드 자식)':
    '`.cbtn{overflow:hidden}` 이라 노드를 버튼 안에 못 넣는다 — 좌표는 카드 기준이되 `--dot-in` 에 묶여 있다',
  '89 유물 수반 #rwBasin>.updot':
    '호스트 상자의 코너가 **투명**하다(그릇 림은 x32..368 · y4..64 — 330 실측). ' +
    '보이는 호스트 = 림이라 규약을 «림 코너» 에 적용했다(제품 좌표도 `--dot-in` 에 묶여 있다)',
};

/* ── 잉크 호스트 ────────────────────────────────────────────────────────────
   «예외» 가 아니다 — **같은 규약을 상자가 아니라 «그려진 그림» 에 적용한** 자리다.
   그래서 [A](상자 축)에서는 빠지고 [F](잉크 축)가 대신 ±3px 로 조인다.
   여기 들어오려면 `probe471 --ink` 가 «상자와 그림이 실제로 어긋난다» 를 찍어야 한다. */
const INKHOST = {
  'HUD 사이드 .ibtn .bdg':
    '`.ibtn{background:none}` — 상자를 아무도 안 칠한다. 보이는 것은 이모지+라벨뿐이고 ' +
    '6칸 실측 잉크 우변 91~96(평균 93.5) · 상변 −5~−2(평균 −3.2) 라 상자보다 우 6.5 안쪽 · 상 3.2 위에서 끝난다. ' +
    '4회차에 값을 17.5/8 → 20/7 로 옮겨 잉크 기준이 정확히 11/11 이 됐다(BR 3회차 «오버행이 헐겁다»)',
};

const probe = (file, ink, extraEnv) => {
  const env = { ...process.env, ...(extraEnv || {}) };
  if (file) env.P471_FILE = file;
  const args = [path.join(__dirname, 'probe471.js'), '--json'];
  if (ink) args.push('--ink');
  const out = execFileSync('node', args,
    { env, cwd: ROOT, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' });
  /* ⚠ `pwlaunch` 가 «번들 브라우저 없음» 안내를 stdout 으로 먼저 찍는다 — 그 줄의 `[i]` 를
     JSON 시작으로 읽으면 즉사한다. 배열 리터럴의 시작(`[` + 줄바꿈)으로 자른다. */
  return JSON.parse(out.slice(out.indexOf('[\n')));
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const inset = parseFloat((src.match(/:root\{--dot-in:([\d.]+)px\}/) || [])[1]);
  ok(inset > 0, '[전제] 제품이 규약 상수 `--dot-in` 을 한 곳에 선언한다', inset + 'px');

  const rows = probe(null);
  const seen = rows.filter(r => !r.missing);
  ok(seen.length >= 25, '[전제] 자리를 실제로 열어서 쟀다 (오프너가 죽으면 «결함 없음» 으로 읽힌다)',
    seen.length + '자리 · 못 연 자리 ' + rows.filter(r => r.missing).length);
  ok(rows.every(r => !r.missing), '[전제] 목록의 모든 자리에서 닷 노드를 찾았다',
    rows.filter(r => r.missing).map(r => r.label).join(' · ') || '없음');

  /* ⚑ 550 신설 — **자가 흔들리면 아래 모든 절이 뜻을 잃는다.**
     [F] 는 «상자» 와 «그림» 을 견주는데 그 둘은 서로 다른 시점에 찍힌다. 등장 애니가 남아 있으면
     같은 호스트가 두 프레임에서 다른 상자를 내고, 그 차가 통째로 «어긋남» 으로 읽힌다 —
     35 패스 탭이 그래서 «0.8/14.5» 로 빨갰다(`probe550`: `jzPgIn` scale .985 · 축은 패널 중심 ⇒
     하단 탭이 14.5px 위로. 493 이 리스트를 600행으로 늘려 애니가 장면 대기 끝에야 붙는다 — 526).
     ⇒ 자는 이제 «멎을 때까지 세우고» 읽고, 그것이 실제로 멎었는지를 **다시 재서** 증언한다.
     ⚠ «도는 애니 수 = 0» 으로 묻지 않는다 — 관계 없는 자리에서 유한 애니가 계속 나고 지므로
        그 수는 늘 0이 아니고, 그것으로 단언하면 자기가 플레이키해진다(344 규칙). */
  const shaky = seen.filter(r => r.mv === null || r.mv === undefined || r.mv > 0.5);
  ok(shaky.length === 0, '[전제] 자가 안 흔들린다 — 같은 호스트를 다시 재면 같은 상자다 (550)',
    shaky.length ? shaky.map(r => r.label + ' ' + r.mv + 'px').join(' · ')
                 : seen.length + '자리 전부 Δ≤0.5px (최대 ' + Math.max(...seen.map(r => r.mv || 0)) + ')');

  /* ── [A] 전수 — 코너 거리 ── */
  const off = seen.filter(r => !(r.label in EXC) && !(r.label in INKHOST))
    .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2);
  ok(off.length === 0, '[A] 예외 밖 전 자리 — 중심이 호스트 코너에서 안쪽 --dot-in (±2px)',
    off.length ? off.map(r => r.label + ' ' + r.dxR + '/' + r.dyT).join(' · ')
               : (seen.length - Object.keys(EXC).length) + '자리 전부');
  /* 예외도 «아무 값이나» 는 아니다 — 목록에 적혀 있어야 하고 수치는 기록으로 남긴다 */
  Object.keys(EXC).forEach(k => {
    const r = seen.find(x => x.label === k);
    ok(!!r, '[A] 예외 목록의 자리가 실제로 존재한다 — ' + k, r ? r.dxR + '/' + r.dyT : '없음');
  });
  ok(seen.length - Object.keys(EXC).length - Object.keys(INKHOST).length > 15,
    '[A] 규약이 실제로 «대부분» 을 덮는다 (예외·잉크호스트를 늘려서 통과하는 길 ②)',
    (seen.length - Object.keys(EXC).length - Object.keys(INKHOST).length) + '자리가 상자 축 규약 아래 있다');
  /* ⚑ 음성항 — «예외 목록을 늘려서 통과» 하는 길을 막는다 */
  /* 자리 수를 **정확히** 못박는다 — 한 자리를 늘리려면 이 숫자와 위 사유를 같이 고쳐야 하고,
     그러면 «예외를 늘려서 통과» 가 조용히 일어날 수 없다(리뷰에 반드시 걸린다). */
  ok(Object.keys(EXC).length === 5, '[A] 음성 — 예외는 정확히 5자리다 (목록을 늘려 통과하는 길을 막는다)',
    Object.keys(EXC).length + '자리 · ' + Object.keys(EXC).join(' / '));
  ok(Object.values(EXC).every(v => v && v.length > 20),
    '[A] 음성 — 예외마다 «왜 코너를 못 쓰는가» 가 적혀 있다', Object.values(EXC).length + '건');

  /* ── [B] 잘림 0 ── */
  const cut = seen.filter(r => r.cutMax.some(v => v > 0.05));
  ok(cut.length === 0, '[B] 조상 클리핑이 닷 바깥 링을 한 자리도 안 자른다',
    cut.length ? cut.map(r => r.label + ' [' + r.cutMax.join('/') + '] ← ' + r.clipper).join(' · ') : '0자리');

  /* ── [C] 찍힌 픽셀 (주인 스크린샷 ① 자리) ── */
  const px = execFileSync('node', [path.join(__dirname, 'probe471b.js')],
    { cwd: ROOT, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
  const m = px.match(/잘린 배지 (\d+)\/(\d+)/);
  ok(m && Number(m[1]) === 0 && Number(m[2]) > 0,
    '[C] 찍힌 픽셀 — 10 상점 서브탭 배지가 원 둘레 8방향 전부 찍힌다(«반달» 회귀 감시)',
    m ? m[0] : '못 읽음');
  /* ⚑ 4회차 신설 — **«덮임» 은 «잘림» 과 다른 사건이다.** [B] 는 조상 `overflow` 만 보는데,
     07·26·50 카드는 이 회차에 코너를 닷에게 주면서 [+] 뱃지·`Lv.n`·«장착 중» 띠와 한 카드를
     나눠 쓰게 됐다. 그 자리만 찍힌 픽셀로 «형제가 덮지 않는가» 를 센다(probe471b §2). */
  const m2 = px.match(/덮인 카드 닷 (\d+)\/(\d+)/);
  ok(m2 && Number(m2[1]) === 0 && Number(m2[2]) >= 5,
    '[C] 찍힌 픽셀 — 07 카드 닷을 형제(뱃지·Lv.n·«장착 중»)가 한 장도 안 덮는다',
    m2 ? m2[0] : '못 읽음');

  /* ── [D] 선언 위생 ── */
  const dup = (src.match(/\.ifbtn\.pbtn>\.updot\{/g) || []).length;
  ok(dup === 0, '[D] `.ifbtn.pbtn>.updot` 좌표 선언 0건 (471 ③ — 이중 선언을 지웠다)', dup + '건');
  /* 1회차 비평 이후 축이 갈렸다 — 가로만 예외로 미는 자리가 있어 `--dot-in-x`/`--dot-in-y` 가
     `--dot-in` 을 폴백으로 받는다. 식 자체는 여전히 한 규칙에만 있다. */
  const formula = (src.match(/var\(--dot-in-[xy],var\(--dot-in\)\) - var\(--dot-r\) - var\(--dot-bw,0px\)/g) || []).length;
  ok(formula === 2, '[D] 규약식(right/top)이 한 규칙에만 있다', formula + '회(= 한 규칙의 right·top)');
  ok(/\.ifbtn\{--dot-bw:var\(--gb-bw\)\}/.test(src),
    '[D] `.ifbtn` 은 자기 테두리(`--gb-bw`)를 읽는다 — 버튼마다 6/7 이 저절로 따라온다');

  /* ── [F] 잉크 축 — «상자 ≠ 그려진 그림» (5회차 신설) ────────────────────────────
     비평가 BM·BP·BO 3인 독립 일치의 지적을 **자로 받은** 절이다. `probe471 --ink` 는
     호스트를 `visibility:hidden` 한 클립과의 차분으로 «그 호스트가 실제로 칠한 화소» 를 잡는다. */
  const ink = probe(null, true).filter(r => !r.missing);
  const has = ink.filter(r => r.inkR !== undefined);
  ok(has.length >= 24, '[F] 잉크 축을 실제로 쟀다 (차분이 비면 «어긋남 0» 으로 읽힌다)',
    has.length + '/' + ink.length + '자리');

  /* ⚑ 기준점이 흔들리면 이 절 전체가 뜻을 잃는다 — 주인이 «맞다» 고 지목한 자리에서
     상자와 그림이 같다는 것이 이 축의 전제다. */
  const base = has.find(r => /★기준/.test(r.label));
  ok(base && Math.abs(base.inkR) <= 3 && Math.abs(base.inkT) <= 9,
    '[F] 전제 — 기준 [모두 받기] 는 상자 = 그림이다 (두 축의 읽기가 같은 자리)',
    base ? '상자↔잉크 ' + base.inkR + '/' + base.inkT : '못 찾음');

  Object.keys(INKHOST).forEach(k => {
    const r = has.find(x => x.label === k);
    /* 4회차 — 허용을 ±3 → **±2 로 조였다**(넓힌 것이 아니다). 5회차가 «잉크 기준 8.5/12» 로
       ±3 안에 겨우 서 있던 것을 20/7 로 옮겨 **정확히 11/11** 이 됐고, 다시 느슨해지면 빨개진다. */
    ok(r && Math.abs(r.dxRi - inset) <= 2 && Math.abs(r.dyTi - inset) <= 2,
      '[F] 잉크 호스트 — 중심이 **그림** 코너에서 안쪽 --dot-in (±2px) — ' + k,
      r ? '잉크 기준 ' + r.dxRi + '/' + r.dyTi + ' · 상자 기준 ' + r.dxR + '/' + r.dyT : '없음');
    ok(r && (Math.abs(r.inkR) > 3 || Math.abs(r.inkT) > 3),
      '[F] 음성 — 잉크 호스트는 «상자와 그림이 실제로 어긋난» 자리여야 한다 (목록을 늘려 통과하는 길)',
      r ? '어긋남 ' + r.inkR + '/' + r.inkT : '없음');
  });

  /* ⚑ 3인 비평의 나머지 절반을 **기각한 것**을 못박는다 — 이 셋이 흔들리면 판단을 다시 해야 한다.
     («탭바·상점 서브탭도 상자가 그림보다 넓다» 는 2회차 시트의 배율 결함이 만든 값이었다.) */
  [['HUD 탭바 .tab .bdg', 3], ['35 패스 탭 #psBar .pt>.bdg', 3]]
    .forEach(([k, tol]) => {
      const r = has.find(x => x.label === k);
      ok(r && Math.abs(r.inkR) <= tol && Math.abs(r.inkT) <= tol,
        '[F] 기각 유지 — 상자 = 그림이라 잉크 호스트가 아니다 — ' + k,
        r ? '어긋남 ' + r.inkR + '/' + r.inkT + ' (허용 ' + tol + ')' : '없음');
    });

  /* ⚑ 서브탭 칸은 **셋째 갈래**다 — 상자도 아니고 «칸이 칠한 것» 도 기준이 아니다.
     칸(`.stab`)은 자기 배경을 안 칠하고(활성일 때만 알약) 모양의 주인은 셸 `.stabs` 이므로,
     칸의 잉크(= 라벨)에 닷을 맞추면 «글자에 붙은 점» 이 된다. 그래서 잉크 호스트로 올리지 않는다.
     ⚠ 이 사실 자체는 자로 못박는다 — 칸의 잉크가 상자보다 **한참** 좁다는 것이 근거이고,
        누가 칸에 배경을 주면(= 상자가 보이게 되면) 이 항이 빨개져 판단을 다시 하게 만든다.
     ⚠ `#shopCats` 칸은 활성 알약이 대표로 잡히는 회차가 있어 값이 흔들린다(어긋남 상 1.7~13) —
        그래서 **흔들리지 않는 03·07 두 자리**로 단언한다(플레이키 항을 만들지 않는다 — 344 규칙). */
  ['03 서브탭 .stab>.bdg', '07 시트 서브탭 .stab>.bdg'].forEach(k => {
    const r = has.find(x => x.label === k);
    ok(r && r.inkR > 30,
      '[F] 서브탭 칸은 «자기 상자를 안 칠한다» — 모양의 주인은 셸이라 잉크 호스트가 아니다 — ' + k,
      r ? '칸 잉크가 상자보다 우 ' + r.inkR + 'px 좁다 (' + r.ink.w + '×' + r.ink.h + ')' : '없음');
  });

  /* ── [G] 기준 그림의 자 (4회차 신설) ────────────────────────────────────────────
     ⚑ **1~3회차의 «기준» 이 틀려 있었다.** `cap471ref.js` 가 맥박을 «끝 프레임» 으로 세우려고
     `currentTime = duration` 을 썼는데, `jzDotPulse` 는 **delay .3s** 라 그 시점이 로컬 85% =
     키프레임 84% 의 `scale:1.14` 봉우리다. 기준 그림의 닷만 **+12.5%** 부풀어 있었고,
     대조 시트·`probe471` 은 `animation:'none'`(base)이라 **기준과 채점 대상의 자가 달랐다**.
     비평가 BO(2회차)·BT(4회차)가 «기준 비율 0.44 vs 우리 0.50» 으로 독립 관측한 것이 이 12.5% 다.
     ⇒ 기준 그림의 닷 코어(+분홍 링) 지름이 **base 값(64 device px @ dsf2 = 32 제품px)** 인지 잰다.
        누가 다시 부풀린 프레임으로 기준을 뜨면 여기가 곧바로 빨개진다. */
  const REF = path.join(ROOT, 'docs', 'ref', '471-레드닷-코너.png');
  if (!fs.existsSync(REF)) {
    ok(false, '[G] 기준 그림이 있다', REF);
  } else {
    const dia = execFileSync('node', ['-e', `
      const { pw, launch } = require(${JSON.stringify(path.join(__dirname, 'pwlaunch'))});
      const fs = require('fs');
      (async () => {
        const b = await launch(pw().chromium);
        const p = await (await b.newContext()).newPage();
        await p.goto('about:blank');
        const s = fs.readFileSync(${JSON.stringify(REF)}).toString('base64');
        const r = await p.evaluate(async (s) => {
          const im = new Image();
          await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + s; });
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const g = c.getContext('2d'); g.drawImage(im, 0, 0);
          const d = g.getImageData(0, 0, im.width, im.height).data;
          let l = 1e9, t = 1e9, rr = -1, bo = -1;
          for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
            const i = (y * im.width + x) * 4;
            if (d[i] > 170 && d[i] - d[i+1] > 70 && d[i] - d[i+2] > 40) {
              if (x < l) l = x; if (x > rr) rr = x; if (y < t) t = y; if (y > bo) bo = y; }
          }
          return (rr + 1 - l) + ',' + (bo + 1 - t);
        }, s);
        console.log('DIA ' + r);
        await b.close();
      })();
    `], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    const mm = dia.match(/DIA (\d+),(\d+)/);
    const dx = mm ? Number(mm[1]) : -1, dy = mm ? Number(mm[2]) : -1;
    /* base = 코어 27 + 분홍 링 2.5×2 = 32 제품px → dsf2 에서 64. 맥박 봉우리면 72 로 읽힌다. */
    ok(dx === 64 && dy === 64,
      '[G] 기준 그림의 닷이 **맥박 정지(base)** 상태다 — 부풀면 채점 대상과 다른 자가 된다',
      mm ? '코어+분홍 링 ' + dx + '×' + dy + ' device px (base 64 · 봉우리 72)' : '못 읽음');
    /* 자를 다시 부풀리지 못하게 **처방 자체**도 못박는다(주석만으로는 되돌아온다). */
    const refSrc = fs.readFileSync(path.join(__dirname, 'cap471ref.js'), 'utf8');
    ok(/\.updot'\)\.forEach\(d => \{ d\.style\.animation = 'none'; \}\)/.test(refSrc),
      '[G] `cap471ref.js` 가 닷 애니를 `none` 으로 끈다 (대조 시트·probe471 과 같은 자)');
  }

  /* ── [E] 되돌림 시험 ── */
  fs.writeFileSync(NEG, src.replace(':root{--dot-in:' + inset + 'px}', ':root{--dot-in:34px}'));
  let negOff = -1;
  try {
    const nrows = probe(NEG).filter(r => !r.missing);
    negOff = nrows.filter(r => !(r.label in EXC))
      .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2).length;
  } finally { try { fs.unlinkSync(NEG); } catch (_) {} }
  ok(negOff > 10, '[E] 되돌림 — `--dot-in` 을 34 로 어긴 사본에서 [A] 가 실제로 무더기로 빨개진다',
    negOff + '자리 위반(허용 오차 ±2 는 한 칸도 안 넓혔다)');
  const back = probe(null).filter(r => !r.missing)
    .filter(r => !(r.label in EXC) && !(r.label in INKHOST))
    .filter(r => Math.abs(r.dxR - inset) > 2 || Math.abs(r.dyT - inset) > 2).length;
  ok(back === 0, '[E] 되돌림을 걷으면 도로 초록 (시험이 상태를 안 남긴다)', back + '자리');

  /* ── [R] 되돌림 시험 — 550 의 수리가 «무르게 푼 것» 이 아님 ────────────────────────────
     [F] 를 초록으로 만든 것이 **허용치가 아니라 드레인**임을 못박는다(허용 3 은 한 칸도 안 넓혔다).
     자에 손잡이 둘을 두고(`P471_NODRAIN` = 수리 전 자로 되돌린다 · `P471_FORCEANIM` = 등장 애니를
     0프레임에 얼려 «애니 중에 읽는» 최악을 **결정적으로** 만든다), 그 사본에서 같은 호스트의
     상자가 실제로 줄어드는지를 본다. 자연 경합(2~3/5회)에 기대면 시험 자체가 플레이키해진다. */
  const PT = '35 패스 탭 #psBar .pt>.bdg';
  const good = probe(null, false).find(r => r.label === PT);
  const negp = probe(null, false, { P471_NODRAIN: '1', P471_FORCEANIM: '1' }).find(r => r.label === PT);
  ok(good && negp && good.hh - negp.hh > 1.5 && good.hw - negp.hw > 1.5,
    '[R] 되돌림 — 드레인을 빼면 그 호스트가 실제로 `jzPgIn` 한복판(scale .985)에서 읽힌다',
    (good ? '수리 후 ' + good.hw + '×' + good.hh : '?') + ' ↔ ' +
    (negp ? '드레인 없음 ' + negp.hw + '×' + negp.hh : '?'));
  ok(good && Math.abs(good.hh - 166) < 0.5,
    '[R] 되돌림 — 수리 후에는 그 호스트가 «멎은 상자»(CSS height 166) 로 읽힌다',
    good ? good.hh + 'px' : '?');

  console.log('\nVERIFY471 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
