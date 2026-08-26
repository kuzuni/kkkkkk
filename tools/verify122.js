/* 작업 122 회귀 게이트 — 10 소환 탭 · 13 재화 탭 카드의 «상시 연출(쥬시)».
   실행: node tools/verify122.js   → 마지막 줄이 `VERIFY122 n/n PASS` 여야 한다.

   본다:
     §1 살아 있는가 — 소환 카드 5장·재화 카드 전부에 CSS 애니메이션 ≥2개, 이름이 전부 `jz122*`.
     §2 실제로 그림이 바뀌는가 — 카드 영역을 t=0 / t=1500ms 두 시각에 찍어 **픽셀이 다른가**.
        (애니메이션은 선언만으로도 `getAnimations()` 에 잡힌다 — «움직인다» 는 캡처로만 증명된다)
     §3 **텍스트·버튼 bbox Δ0** — 지시 ③. t=0/1500/6900ms 세 시각에 라벨·버튼·수량의
        getBoundingClientRect() 가 소수점까지 같아야 한다(히트영역·가독성 불변).
        장식 뱃지 `.cp`(±4° 흔들림, 지시 ② 명시)만 예외로 뺀다.
     §4 페이지가 닫히면 정지 — `#shopw` 가 `display:none` 이면 애니메이션이 0개여야 한다.
     §5 56 절전 — `#app.sv` 에서 animation-play-state 가 전부 paused.
     §6 강도 변수 3개(`--jz-amp/--jz-per/--jz-glow`) — 0 을 주면 움직임이 사라진다(끄기 스위치).
     §7 상태 연동 — 무료 링은 `.b1:not(.lack)` 에만, 73 강제 상자 글로우는 `gmBan()` 칸에만.
     §8 스크롤 fps — 카드가 다 도는 동안 리스트를 굴려 프레임 수를 잰다(목표 ≥55fps).
     §9 콘솔 에러 0.

   ⚠ 캡처 비교는 **모든 애니메이션을 pause 하고 `currentTime` 을 세운 뒤** 찍는다.
      헤드리스 스크린샷 1장이 수백 ms 라 «기다렸다 찍기» 로는 같은 t 를 두 번 재현할 수 없다
      (LESSONS 60-⑤). 그래서 이 게이트는 시계가 아니라 타임라인을 본다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* jz122* 상시 연출만 t 로 세운다 — seek 와 읽기 사이에 무엇도 끼어들지 않게 한 태스크로.
   ⚠ **122 가 아닌 애니메이션은 seek 대상에서 뺀다**(LESSONS 60-⑤ 3번째 함정). 1회차에 이걸
   빼먹었더니 60 의 페이지 등장 팝(`jzPgIn{0%{scale:.985}}`)이 t=0 으로 되감겨 **페이지 전체가
   98.5% 로 줄어든 프레임**이 나왔고, 게이트는 그걸 «헤더 라벨 bbox 가 움직였다» 고 읽었다.
   무한 반복이면 finish() 가 던지므로 cancel(), 유한이면 finish() 로 «끝난 상태» 에 못 박는다. */
const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

async function shotAt(p, ms, clip) { await seek(p, ms); return await p.screenshot({ clip }); }

/* ── §13 (6회차 신설) «진폭 단일 기준» 측정기 ───────────────────
   5회차 채점의 U·V 공통 1순위는 «광택마다 세기가 제각각 — 소환 탭만 쥬시하고 재화 탭은 정지 화면»
   이었다(U 실측 Δ루마: 소환 헤더 +35~66 vs 재화 카드 +9~19 vs 마일리지 글로우 +10).
   그래서 «연출이 있는가» 가 아니라 **«얼마나 센가» 를 재는 게이트**를 만든다.

   재는 법: 호스트 상자를 여러 위상에서 찍어 **열(column)별 평균 루마**를 구하고,
   같은 열의 위상 간 최대−최소 중 **가장 큰 값**을 그 호스트의 «광택 피크 Δ» 로 삼는다.
   가로로 지나가는 띠는 신호가 x 축에 실리므로 열 평균이 그대로 띠의 세기가 된다.
   ⚠ 잴 때는 `--jz-amp:0` 으로 **숨쉬기·들썩·둥실을 멈춘다** — 185px 짜리 상자 아트가 4% 커지는
      것만으로도 열 평균이 광택보다 크게 흔들려 측정이 무의미해진다(광택은 `--jz-amp` 를 안 탄다). */
async function lumaOf(p, ms, clip, store) {
  await seek(p, ms);
  /* ⚠ Playwright 의 screenshot 은 Buffer 를 돌려준다(Puppeteer 의 `encoding:'base64'` 옵션이 없다).
     Node 쪽에서 base64 로 바꿔 넣어야 페이지의 <img> 가 디코딩한다. */
  const b64 = (await p.screenshot({ clip })).toString('base64');
  return await p.evaluate(async ([src, keep]) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error('PNG 디코딩 실패'));
      img.src = 'data:image/png;base64,' + src;
    });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const n = c.width * c.height, L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
    if (keep) {
      window.__jzBase = L;
      /* 그 호스트에서 **가장 넓은 평탄면**(최빈 휘도 ±12)을 기준면으로 잡아 둔다 */
      const hh = new Int32Array(256);
      for (let i = 0; i < n; i++) hh[Math.min(255, Math.round(L[i]))]++;
      /* ⚑ 11회차 — **먹선(L≤12)은 최빈값 선거에서 뺀다.**
         10회차까지는 히스토그램 전체에서 최빈값을 뽑았는데, 평생배너(.cn-a2)에서 이것이 뒤집혔다:
           0(28599) · 151(27170) · 152(26926) · 166(19743) · 207(15796)
         배너 면은 45° 반복 그라디언트 + 160° 오버레이 + inset 림이라 **한 면이 4개 bin 으로 쪼개지고**,
         5px 검정 테두리 + 🎬🚫 아트의 먹이 한 덩어리로 뭉쳐 **5% 차이로 검정이 선거에서 이긴다.**
         그러면 «평탄면» 이 면(cyan)이 아니라 **먹**이 되어, 흰 심을 검정 위에서 재게 된다:
           ΔL = .31 × (255 − 0) = **79** (밴드 26~39 를 훌쩍 넘는다) · duty 22%
         아트를 숨기고 같은 자리를 재면 mode=152 · **ΔL 32 · duty 78%** 로 다른 호스트와 똑같다
         (`node tools/probe122a.js` 대조군). 즉 **띠는 멀쩡하고 측정점이 깨진 것**이었다.
         ⚠ 이 선거는 5% 차이라 **환경에 따라 뒤집힌다** — 10회차 기록(§15-4)이 같은 커밋에서
         «평생배너 83%» 로 남아 있는데 지금 러너에서는 22% 가 나오는 이유가 이것이다(이모지 글리프가
         렌더러마다 먹 면적이 달라 28599 쪽이 오르내린다). 게이트가 러너를 타면 회차 기록을 믿을 수 없다.
         §13 은 원래 «평탄면 밖(잉크·테두리)은 뺀다» 가 설계 의도이므로, 그 의도를 선거 단계로 올린다.
         19개 측정점 중 면이 먹인 곳은 없다(전부 |ΔL|≈32 = 중간 톤 면). 먹밖에 없는 퇴화 상자만
         예전처럼 전체에서 뽑는다. */
      let mode = -1;
      for (let v = 13; v < 256; v++) if (mode < 0 || hh[v] > hh[mode]) mode = v;
      if (mode < 0 || hh[mode] === 0) { mode = 0; for (let v = 0; v < 256; v++) if (hh[v] > hh[mode]) mode = v; }
      window.__jzMode = mode;
      return mode;
    }
    const B = window.__jzBase, M = window.__jzMode;
    if (!B || B.length !== n) return null;
    const sig = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(B[i] - M) > 12) continue;          /* 평탄면 밖(잉크·테두리)은 뺀다 */
      sig.push(L[i] - B[i]);
    }
    if (!sig.length) return null;
    sig.sort((x, y) => Math.abs(y) - Math.abs(x));
    /* 상위 **2%** 의 중앙값 = 띠 «고원». 5% 로 잡았더니 창이 띠의 심(호스트 면적의 3.2%)보다
       넓어져, 좁은 띠에서는 심 대신 **양옆(어두운 쪽)** 이 잡혔다(소환 전면 −24.1). */
    const k = Math.max(1, Math.round(sig.length * 0.02));
    /* ⚑ 14회차 — 위 한 값은 «그 위상에서 **이긴** 쪽» 이다(부호 포함 절댓값 최대 2% 의 중앙값).
       유리 광택은 심(밝음)과 측엽(어둠)이 **한 프레임에 같이** 있으므로, 이 값 하나로는
       «심이 얼마나 밝은가» 를 영영 못 잰다 — 측엽이 더 세면 심이 아무리 밝아도 음수만 나온다.
       실제로 14회차에 크림 판·라임 버튼의 심 α 를 .145→.42/.78 로 올렸는데 이 값은 **0.0 그대로**였다.
       → 양수 쪽·음수 쪽을 **따로** 같은 창(2%)으로 잰다. §15 가 이 둘의 비를 본다. */
    const pos = sig.filter(v => v > 0), neg = sig.filter(v => v < 0);
    const pick = (arr, dir) => {
      if (!arr.length) return 0;
      arr.sort((x, y) => dir * (y - x));
      return +arr[Math.min(arr.length - 1, Math.floor(k / 2))].toFixed(1);
    };
    return { v: +sig[Math.floor(k / 2)].toFixed(1), pos: pick(pos, 1), neg: pick(neg, -1) };
  }, [b64, !!store]);
}
/* 위상 표본 — «심을 반드시 한 번은 밟는다» 를 계산으로 보장한다(9회차).
   8회차까지는 700ms × 8장이었는데, 9회차에 주기가 3.0~3.4s 한 벌로 좁아지고 통과 구간이
   55%→80% 로 늘면서 **띠 심이 화면 위에 있는 시간이 주기의 약 10.5%(≈0.32s)** 가 됐다.
   700ms 격자는 그 창보다 성기므로 표본이 통째로 «주차 구간·양옆» 에만 걸리는 자리가 생겼다
   (실측: 소환 전면(본문4) −14 · 재화 카드 −23.3 — 둘 다 심이 아니라 어두운 옆구리를 잡은 값이다).
   조건 두 개로 고정한다:
     ① 격자 간격 200ms < 심 노출창 320ms   → 어느 위상에서도 최소 1장은 심을 밟는다
     ② 전체 폭 3.6s ≥ 가장 긴 주기 3.4s     → 한 주기를 다 덮는다
   ⚠ 주기를 다시 손대면 이 두 부등식을 다시 풀 것. 성기면 부호가 뒤집힌 값이 나오고,
     그것을 «세기 미달» 로 읽으면 멀쩡한 띠의 α 를 올리는 헛수고를 한다. */
/* 12회차 — 주기가 **3.2s 한 벌**로 통일됐으므로 표본도 정확히 한 주기(16 × 200ms = 3.2s)로 맞춘다.
   18장(3.6s)이면 끝 2장이 앞 2장과 같은 위상이라 그 위상만 두 번 세어져 duty 가 편향된다. */
/* ⚑ 13회차 — 주기가 다시 **3층**이 됐다(3.2 / 4.8 / 6.4s — 체크리스트의 «본문 4.6s»·«리본 6s» 복원).
   고정 격자를 그대로 두면 4.8s 짜리 띠를 3.2s 창으로만 봐서 **심을 한 번도 못 밟는 점**이 생긴다
   (실제로 «소환 전면(본문4) = −13.7» 로 부호가 뒤집힌 어두운 옆구리가 잡혔다).
   → 표본을 «고정 3.2s» 가 아니라 **재는 그 띠의 한 주기**로 잡는다. 위 부등식 ①②는 그대로다:
     한 주기를 16등분하면 격자는 200~400ms 이고, 심 노출창(주기의 ~10%)보다 촘촘하다.
   duty 도 정확히 한 주기라 여전히 편향이 없다. */
const PHASES = Array.from({ length: 16 }, (_, i) => i * 200);
const phasesFor = durMs => (!durMs || !isFinite(durMs) ? PHASES
  : Array.from({ length: 16 }, (_, i) => Math.round(durMs * i / 16)));
/* 의사요소까지 포함해 그 띠의 실제 주기(ms)를 읽는다. `sel::after` → (sel, '::after') */
const durOf = (p, sel) => p.evaluate(s => {
  /* 14회차 — testSel 이 **셀렉터 목록**일 수 있다(헤더 띠가 심 `::before` + 측엽 `::after`
     두 겹이라 둘을 함께 꺼야 기준선이 잡힌다). 주기는 한 벌이므로 첫 셀렉터에서 읽는다. */
  const m = String(s).split(',')[0].split('::');
  const e = document.querySelector(m[0]);
  if (!e) return null;
  const d = getComputedStyle(e, m[1] ? '::' + m[1] : null).animationDuration || '';
  const v = parseFloat(d);
  if (!isFinite(v) || v <= 0) return null;
  return /ms$/.test(d.trim()) ? v : v * 1000;
}, sel);
/* 광택 세기 = «띠가 있을 때» 와 «띠가 없을 때» 의 루마 차를, **그 호스트에서 가장 넓은 평탄면**
   에서만 재어 상위 5% 의 중앙값을 취한 값(부호 포함). 비평가가 «평탄면 실측» 이라고 부르는 것이다.

   ⚠ 여기 오기까지 세 번 갈아엎었다. 다음 세션이 같은 함정에 빠지지 않게 남긴다:
     ① 위상끼리 비교(기준선 없음) → **표본 앨리어싱.** 재화 카드는 띠가 한 열을 스치는 시간이
        0.34s 인데 표본 간격이 0.7s 라 «띠가 없는 두 프레임» 만 비교하는 열이 생긴다(실측 10.5).
        4·5회차 비평가가 «연출이 아예 없다» 고 세 번 오독한 것과 **같은 원인**이다.
        → 기준선을 «그 띠만 `opacity:0` 으로 끈 프레임» 으로 잡아 해결.
     ② 열(column) 평균 → 띠가 `skewX(-16deg)` 라 호스트가 높을수록 한 열에서 띠가 차지하는 세로
        비율이 준다(카드 450px → x 가 146px 흐른다 = 띠 폭과 맞먹음). 헤더 26.6 / 카드 전면 7.8 로 갈렸다.
     ③ 전체 픽셀의 분위수 → **잉크 오염.** 검은 글자 외곽선·테두리 위를 흰 심이 지날 때만 잡혀
        재화 카드가 94(99.5분위는 70)로 부풀었다. 잉크 비율이 호스트마다 다르니 비교가 안 된다.
     ④ **평탄면 한정 + 상위 5% 중앙값** ← 채택. 소환 헤더 α .21 · 바탕 144 에서 23.3 이 나오고
        이는 α×(255−144)=23.3 과 **소수점까지 일치**한다 — 즉 이 값은 물리량이다.

   ⚠ 잴 때는 `--jz-amp:0` 으로 숨쉬기·들썩·둥실을 멈춘다(광택은 `--jz-amp` 를 안 탄다). */
async function bandPeak(p, hostSel, testSel, muteSel) {
  /* `sel|N|inset` — N 번째 요소를 쓰고, 상자를 inset px 만큼 좁힌다.
     ⚠ inset 이 필요한 이유: 기준면을 «최빈 휘도» 로 잡는데, 버튼처럼 **면이 다단 그라디언트**
     이고 **테두리가 균일한 검정**이면 최빈값이 테두리로 잡힌다. 띠는 테두리 안쪽에서만 도니까
     «평탄면에서 아무 변화 없음» = 0 이 나온다([이동] 버튼에서 실제로 겪었다). */
  /* ⚑ 13회차 — 네 번째 필드 `x,y,w,h` 로 **요소 안의 부분 사각형**을 직접 지정할 수 있다.
     inset 은 «사방을 똑같이» 물리는 것뿐이라, 덮개가 한쪽에 몰려 있는 자리를 못 판다.
     `소환 본문` 3점이 그 경우다(§17-6) — `.cbg` 는 노출률이 23.7~30.3% 뿐이고
     덮개(.chd/.cart/.clv/.cbar/.cbtn×3/.adbadge/.cmag)가 좌·상·하에 몰려 있다.
     좌표는 **요소 상자 기준**이며 `tools/probe122b.js` 가 다섯 칸 공통 노출 구역으로 풀어 준다. */
  const clip = await p.evaluate(s => {
    const [sel, idxS, insS, rectS] = s.split('|');
    const e = document.querySelectorAll(sel)[+(idxS || 0)];
    if (!e) return null;
    const ins = +(insS || 0);
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    if (rectS) {
      const [rx, ry, rw, rh] = rectS.split(',').map(Number);
      const x = Math.max(0, Math.round(r.x + rx)), y = Math.max(0, Math.round(r.y + ry));
      const w = Math.min(Math.round(rw), innerWidth - x), h = Math.min(Math.round(rh), innerHeight - y);
      return (w > 4 && h > 4) ? { x, y, width: w, height: h } : null;
    }
    const x = Math.max(0, Math.round(r.x + ins)), y = Math.max(0, Math.round(r.y + ins));
    const w = Math.min(Math.round(r.width - 2 * ins), innerWidth - x);
    const h = Math.min(Math.round(r.height - 2 * ins), innerHeight - y);
    return (w > 4 && h > 4) ? { x, y, width: w, height: h } : null;
  }, hostSel);
  if (!clip) return null;
  await p.waitForTimeout(120);
  const css = (id, sel) => p.evaluate(([i, x]) => {
    let e = document.getElementById(i);
    if (!x) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = i; document.head.appendChild(e); }
    e.textContent = x + '{opacity:0!important}';
  }, [id, sel]);
  await css('jz122mute', muteSel || '');
  await css('jz122ref', testSel);          /* 기준선 — 이 띠만 끈다 */
  await lumaOf(p, 0, clip, true);
  await css('jz122ref', '');
  /* ⚑ 12회차 — duty 를 «|ΔL| ≥ 12» 가 아니라 **«피크와 같은 부호» + |ΔL| ≥ 12** 로 센다.
     10회차의 duty 는 유리 광택의 **어두운 양옆 로브**까지 «띠가 있다» 로 세고 있었다.
     그래서 게이트는 78~83% 를 찍는데 비평가 둘은 독립으로 58~69.5% 를 쟀다 —
     둘 다 맞았고 **서로 다른 것을 재고 있었다**(내 probe122a 재집계: 같은 자리가 |ΔL| 기준 78%,
     흰 심만 기준 61%). 사람이 «빛난다» 고 읽는 것은 심이지 옆구리가 아니므로 심으로 센다.
     부호는 호스트마다 다르다(크림판은 심이 음수로 잡힌다) — 그래서 절대 부호가 아니라 **피크의 부호**다. */
  const vs = [], ps = [], ns = [];
  const ph = phasesFor(await durOf(p, testSel));   /* 13회차 — 그 띠의 한 주기를 16등분 */
  for (const t of ph) {
    const r = await lumaOf(p, t, clip);
    if (r != null) { vs.push(r.v); ps.push(r.pos); ns.push(r.neg); }
  }
  await css('jz122mute', '');
  if (!vs.length) return null;
  let peak = 0;
  for (const v of vs) if (Math.abs(v) > Math.abs(peak)) peak = v;
  const sgn = peak >= 0 ? 1 : -1;
  const lit = vs.filter(v => v * sgn >= 12).length;
  /* ⚑ 14회차 §15 — «심(밝음)» 과 «측엽(어두움)» 을 따로 들고 나온다.
     각 위상에서 양수 쪽·음수 쪽을 따로 잰 값(`lumaOf`)의 **위상 최대**가 각각 심·측엽의 세기다.
     §13 은 `peak`(이긴 쪽 하나)만 봐서 이 둘의 «비» 를 못 잡았다(13회차 채점 AE ③). */
  return { peak, duty: lit / vs.length, pos: Math.max(...ps), neg: Math.min(...ns) };
}
/* 6회차 목표 = 광택 전부가 «평탄면 ΔL 32» 한 벌. 마스크·skew 로 뭉개지는 폭을 감안해 ±20%. */
const AMP_LO = 26, AMP_HI = 39;
/* ⚑ 10회차 신설 — «띠가 호스트 위에 있는 시간 비율»(duty).
   9회차에 게이트가 19개 측정점을 전부 통과시켰는데도 비평가 둘이 독립으로 «무광 1.9~2.06s
   (주기의 58~63%)» 를 1순위로 짚었다. 원인은 게이트가 **세기만 재고 «얼마나 자주» 를 안 쟀다**는
   것이다 — 8회차에 §13 이 «얼마나 센가» 를 처음 쟀듯이, 이번에는 «얼마나 오래» 를 잰다.
   지금 기하(띠 폭 .22H · 총 이동 1.22H · 주차 없음)의 **이론값은 심 중심 기준 82%** 다.
   ⚠ 다만 이 지표는 이론값에 그대로 못 올라간다. §13 은 «평탄면 상위 2% 중앙값» 이라
   띠가 클립 가장자리에 걸쳐 반쯤 잘린 위상에서는 상위 2% 가 희석돼 문턱(|ΔL|≥12) 아래로 떨어진다.
   skewX(-16°) 로 띠가 세로로 ±67px 번지는 것도 같은 방향으로 작용한다.
   그래서 하한을 이론값이 아니라 **실측 분포**에 맞춰 잡는다(10회차 16개 전면 측정점: 56~100%, 평균 76%):
     · 점별 하한 **0.55** — 한 점이 통째로 죽는 것만 잡는다
     · 전체 **평균 0.70** — 기하가 무너지면 평균이 먼저 내려앉는다(9회차 기하는 ≈0.37 이었다)
   ★ 세 점(`소환 전면(본문1)`·`(본문4)`·`[교환] 버튼면`)은 **띠의 호스트가 아니라 그 안의 부분 영역**을
     클립으로 쓴다(전면 띠의 호스트는 카드 전체 980px 인데 클립은 본문, [교환] 띠의 호스트는
     마일리지 패널 938px 인데 클립은 버튼 226px). 부분 영역은 띠가 «그 위» 에 있는 시간이 기하학적으로
     짧을 수밖에 없으므로 duty 판정에서 뺀다 — 기록만 남긴다. 세기(ΔL)는 그대로 판정한다. */
const DUTY_LO = .55, DUTY_MEAN_LO = .70;
/* ⚑ 14회차 §15 «심/측엽 극성 비» 수집기 — §13 이 도는 김에 같은 위상 표본에서 같이 걷는다
   (측정이 비싸다: 점 하나에 16위상 × 스크린샷). 판정은 §15 절에서 한 번에 한다. */
const POLAR = [];
async function ampCheck(p, hosts) {
  await p.evaluate(() => document.getElementById('shopw').style.setProperty('--jz-amp', '0'));
  const out = [];
  const duties = [];
  for (const [label, hostSel, testSel, muteSel, noDuty] of hosts) {
    const r = await bandPeak(p, hostSel, testSel, muteSel);
    const v = r == null ? null : r.peak;
    const a = v == null ? null : Math.abs(v);
    if (r != null) POLAR.push({ label, pos: r.pos, neg: r.neg });
    out.push(label + ' ' + (v == null ? '없음' : v)
      + (r && r.duty != null ? '/' + Math.round(r.duty * 100) + '%' : ''));
    /* ⚑ 12회차 — `noDuty === 'rec'` 은 **ΔL 도 판정하지 않고 기록만** 한다.
       «소환 본문» 3점이 여기 해당한다. 이 점들의 «가장 넓은 평탄면» 은 본문 그라디언트가 아니라
       그 위에 덮인 **불투명 판**이다(카드3 실측: mode 124 가 80,086px = 클립의 22.5% 인데
       본문 그라디언트의 휘도 범위는 143.8~194.8 이라 124 는 그 어느 지점도 아니다).
       띠는 그 판 **아래**로 지나가므로 ΔL 이 18위상 전부 0~−6 으로 나온다 — 띠가 죽은 게 아니라
       **재는 자리가 띠 위를 덮고 있다.** 카드1·4 는 우연히 노출된 그라디언트가 최빈면이라 29.5·33.9 가 나온다.
       즉 이 3점은 «카드마다 다른 것을 재는» 점이라 지금 형태로는 판정에 못 쓴다.
       ⚠ 12회차 이전에는 이 점들이 **본문 띠가 아니라 헤더 띠의 `top:-24px` 오버행**을 재고 있었다
         (`--jz-gb` 를 바꿔도 값이 안 움직이는 것으로 확정). 그래서 «통과» 하고 있었을 뿐이다.
       13회차 과제: 측정 자리를 «노출된 본문 바탕» 으로 다시 정의한다(덮개를 muteSel 로 걷거나
       카드마다 노출 구간을 inset 으로 지정). 그 전까지 **가짜 초록불을 만들지 않는다.** */
    if (noDuty === 'rec') {
      console.log('    · [기록만] ' + label + ' ΔL = ' + (v == null ? '측정 불가' : v)
        + ' · duty = ' + (r && r.duty != null ? Math.round(r.duty * 100) + '%' : '측정 불가')
        + '  (평탄면이 띠 위 불투명 판 — 13회차에 측정점 재정의)');
      continue;
    }
    ok(a != null && a >= AMP_LO && a <= AMP_HI,
      '광택 평탄면 ΔL ' + label + ' = ' + (v == null ? '측정 불가' : v)
      + ' (|' + AMP_LO + '~' + AMP_HI + '|)');
    if (noDuty) {
      console.log('    · 띠 체류 duty ' + label + ' = '
        + (r && r.duty != null ? Math.round(r.duty * 100) + '%' : '측정 불가')
        + ' (부분 영역 클립 — 기록만)');
    } else {
      duties.push(r && r.duty != null ? r.duty : 0);
      ok(r != null && r.duty != null && r.duty >= DUTY_LO,
        '띠 체류 duty ' + label + ' = '
        + (r && r.duty != null ? Math.round(r.duty * 100) + '%' : '측정 불가')
        + ' (>=' + Math.round(DUTY_LO * 100) + '%)');
    }
  }
  await p.evaluate(() => {
    document.getElementById('shopw').style.removeProperty('--jz-amp');
    /* ⚠ §13 은 호스트마다 `scrollIntoView` 를 한다 — 리스트를 원위치로 돌려놓지 않으면
       뒤따르는 §2 가 화면 밖으로 나간 카드를 찍어 «448B vs 448B» 로 오판한다. */
    const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
  });
  await p.waitForTimeout(200);
  console.log('    · ' + out.join(' | '));
  if (duties.length) {
    const m = duties.reduce((a, b) => a + b, 0) / duties.length;
    ok(m >= DUTY_MEAN_LO, '띠 체류 duty 평균 = ' + Math.round(m * 100) + '% '
      + '(' + duties.length + '점, >=' + Math.round(DUTY_MEAN_LO * 100) + '%)');
  }
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* 재화·마일리지를 넉넉히 — «부족(lack)» 상태에서는 무료 링·교환 글로우가 원래 없다 */
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });

  /* ── §1 소환 카드가 살아 있는가 ──────────────────────────────── */
  console.log('§1 소환 탭 — 카드마다 상시 애니메이션');
  const a1 = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card')].map(c => {
    const names = c.getAnimations({ subtree: true }).map(a => a.animationName || '');
    return { n: names.length, jz: names.filter(x => /^jz122/.test(x)).length, names };
  }));
  ok(a1.length === 5, '소환 카드 5장 (' + a1.length + ')');
  a1.forEach((c, i) => ok(c.jz >= 2, '카드' + (i + 1) + ' jz122 애니메이션 ' + c.jz + '개 ≥2'));
  const kinds = await p.evaluate(() => new Set([...document.querySelectorAll('#shopList .shp-card')]
    .flatMap(c => c.getAnimations({ subtree: true }).map(a => a.animationName))).size);
  ok(kinds >= 4, '소환 카드 연출 종류 ' + kinds + '가지 ≥4 (숨쉬기·들썩·광택·입자…)');

  /* ── §7 상태 연동 — 무료 링 · 73 강제 상자 ─────────────────────
     ⚠ **이 절은 타임라인을 건드리기 전에 돈다.** Chrome 에서 CSS 애니메이션을 한 번이라도
     Web Animations API 로 만지면(pause/seek/play) 그 애니메이션은 «API 소유» 가 되어,
     규칙이 사라져도(computed animation-name:none) **취소되지 않고 계속 산다**.
     1회차에 §2·§3 의 seek 뒤에 이 검사를 뒀다가 «무료를 다 썼는데 링이 돈다» 고 오진했다. */
  console.log('§7 상태 연동 — 무료 링 · 73 강제 상자');
  const ring = await p.evaluate(() => {
    const has = e => e.getAnimations().some(a => a.animationName === 'jz122Ring');
    return [...document.querySelectorAll('#shopList .cbtn.b1')]
      .map(e => ({ lack: e.classList.contains('lack'), ring: has(e) }));
  });
  ok(ring.length === 5 && ring.every(x => x.ring === !x.lack),
    '무료 링 = `.b1:not(.lack)` 5칸 일치 (' + ring.map(x => (x.lack ? '-' : '●')).join('') + ')');
  /* 무료를 다 쓰면 링이 사라진다 — 상태를 직접 0 으로 만들고 재동기화.
     ⚠ 읽기는 **프레임을 하나 넘긴 뒤** 한다. CSS 애니메이션의 취소는 스타일 flush 가 아니라
     «애니메이션 갱신» 단계에서 처리돼서, 같은 태스크 안에서 `getAnimations()` 를 부르면
     이미 사라진 규칙의 애니메이션이 한 프레임 더 잡힌다(1회차 오진의 정체). */
  await p.evaluate(() => {
    const b = SHOP_BOXES[0].b;
    S.daily.freeSum = S.daily.freeSum || {}; S.daily.freeSum[b] = 0; syncShopSumBtns();
  });
  await p.waitForTimeout(150);
  const ringOff = await p.evaluate(() => {
    const e = document.querySelector('#shopList .shp-card:nth-child(1) .cbtn.b1');
    return { lack: e.classList.contains('lack'), ring: e.getAnimations().some(a => a.animationName === 'jz122Ring') };
  });
  ok(ringOff.lack && !ringOff.ring, '무료 소진 → 링 정지');

  /* 73 강제 상자 — 가이드가 지목한 칸에만 `.gm` 글로우 */
  const gm = await p.evaluate(() => {
    const need = gmBan();
    renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const gmi = cards.findIndex(c => c.classList.contains('gm'));
    const glow = gmi >= 0 && cards[gmi].querySelector('.cfr')
      .getAnimations().some(a => a.animationName === 'jz122Gm');
    return { need, want: need ? SHOP_BOXES.findIndex(x => x.b === need) : -1, gmi, glow, n: cards.filter(c => c.classList.contains('gm')).length };
  });
  ok(gm.gmi === gm.want, '`.gm` 칸 = gmBan() 칸 (' + gm.need + ' → idx ' + gm.gmi + ')');
  ok(gm.n <= 1, '`.gm` 은 최대 1칸 (' + gm.n + ')');
  if (gm.gmi >= 0) ok(gm.glow, '강제 상자 테두리 글로우 동작');
  else { pass++; console.log('  ✓ 지금은 강제 상자 없음 — 글로우도 없음(정상)'); }

  /* ── §10 «들썩» 은 이따금 한 번이어야 한다 (3회차 신설) ─────────
     `rotate:0` 은 무효 선언이라(<angle> 에 단위 없는 0 은 못 쓴다) 0%·100% 키프레임에서 rotate 가
     사라지고, Chrome 이 «94% 3deg ↔ 바탕값 0deg» 를 주기 내내 보간한다 — «이따금 툭» 이
     «늘 조금 기울어 서서히 도는» 것이 된다. 들썩 구간 **밖**에서 회전이 0 인지로 못 박는다. */
  console.log('§10 들썩 — 구간 밖에서는 회전 0 · 구간 안에서만 ±3°');
  const bobs = await p.evaluate(() => {
    const out = [];
    const cards = [...document.querySelectorAll('#shopList .shp-card .cart')];
    const read = t => {
      document.getAnimations().forEach(a => {
        if (!/^jz122/.test(a.animationName || '')) return;
        try { a.pause(); a.currentTime = t; } catch (_) {}
      });
      return cards.map(e => {
        const cs = getComputedStyle(e);
        /* `rotate` 는 «0deg» / «2.59deg» / «none», 그리고 **«4.9e-29deg» 같은 지수 표기**로도 온다 —
           정규식으로 자르다가 지수부 «29» 를 각도로 읽어 «29°» 라는 헛값을 봤다. parseFloat 하나면 충분하다. */
        return { rot: Math.abs(parseFloat(cs.rotate) || 0),
          ty: Math.abs(parseFloat((cs.translate || '0').split(' ')[1] || '0') || 0) };
      });
    };
    /* 카드 주기·딜레이를 «안다» 고 가정하지 않는다 — 한 바퀴(최장 7s)를 100ms 로 훑어
       «세로 이동이 0.5px 미만인 시각(=쉬는 중)» 과 «−3px 넘게 뜬 시각(=들썩 중)» 을 직접 찾는다.
       주기를 바꿀 때마다 게이트의 표본 시각을 손보지 않아도 된다. */
    for (let t = 0; t <= 7000; t += 100) out.push({ t, v: read(t) });
    return out;
  });
  /* «쉬는 중» 의 문턱은 넉넉하면 안 된다 — 들썩 주기를 줄이면 0.5px 문턱이 «들썩의 꼬리» 를
     쉬는 것으로 잘못 세어 회전 0.15° 를 물고 온다. 정지 프레임만 세도록 0.05px 로 조인다. */
  const quiet = bobs.filter(f => f.v.every(c => c.ty < 0.05));
  const loud = bobs.filter(f => f.v.some(c => c.ty > 3));
  ok(quiet.length > 0, '들썩이 쉬는 시각이 있다 (' + quiet.length + '/' + bobs.length + ' 표본)');
  ok(quiet.every(f => f.v.every(c => c.rot < 0.05)),
    '쉬는 시각의 회전 = 0° (최대 ' + Math.max(0, ...quiet.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');
  ok(loud.length > 0 && loud.some(f => f.v.some(c => c.rot > 2.5)),
    '들썩 구간에서는 ±3° 가 실제로 걸린다 (최대 ' + Math.max(0, ...loud.flatMap(f => f.v.map(c => c.rot))).toFixed(2) + '°)');

  /* ── §12 스윕이 «끝까지 지나가는가» (5회차 신설) ─────────────────
     `translate` 의 %는 자기 자신(띠) 폭 기준이라, 띠 폭을 줄이면 이동거리가 같이 줄어
     **호스트를 못 빠져나가고 중간에 얼어붙는다**(5회차 실측: 헤더 우측에 밝기 +27 고정).
     띠가 지나간 뒤 «정지 구간의 그림» 이 «띠가 오기 전의 그림» 과 같아야 통과다. */
  console.log('§12 스윕이 호스트를 완전히 빠져나가는가');
  const runs = await p.evaluate(() => {
    const out = [];
    const chk = (sel, pseudo, hostW) => {
      const e = document.querySelector(sel);
      if (!e) { out.push(sel + ' 없음'); return; }
      const cs = getComputedStyle(e, pseudo);
      const bandW = parseFloat(cs.width) || 0;
      const run = (cs.getPropertyValue('--jz-run') || '').trim();
      /* `--jz-run` 이 없으면 키프레임의 기본값 440%(띠 폭 기준)가 쓰인다 — 그 값으로 계산해야
         «이동거리가 모자라다» 는 진짜 이유가 메시지에 찍힌다. */
      const runPx = run.endsWith('px') ? parseFloat(run)
        : bandW * (run.endsWith('%') ? parseFloat(run) : 440) / 100;
      const start = -1.4 * bandW;
      /* 끝 위치(띠 좌변) + 띠 폭 이 호스트 폭을 넘어야 완전히 빠져나간 것이다 */
      if (!(runPx + bandW >= hostW)) {
        out.push(sel + pseudo + ' 이동 ' + Math.round(runPx) + '+띠' + Math.round(bandW)
          + ' < 호스트 ' + Math.round(hostW) + ' (시작 ' + Math.round(start) + ')');
      }
    };
    const w = sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect().width : 0; };
    chk('#shopList .shp-card>.chd', '::after', w('#shopList .shp-card>.chd'));
    chk('#shopList .shp-card>.cbg>.jzs', '::after', w('#shopList .shp-card>.cbg'));
    chk('#shopList .shp-card>.cfr', '::after', w('#shopList .shp-card>.cbg'));
    return out;
  });
  ok(runs.length === 0, '소환 탭 스윕이 카드를 완전히 통과' + (runs.length ? ' — ' + runs.join(' , ') : ''));

  /* ── §13 진폭 단일 기준 — 소환 탭 (6회차 신설) ─────────────── */
  console.log('§13 광택 피크 Δ루마 한 벌 — 소환 탭');
  /* 14회차 — 헤더 띠는 **두 겹**이다(심 `::before` 는 글자 위 · 측엽 `::after` 는 글자 아래).
     기준선을 잡으려면 둘을 함께 꺼야 한다 — 한쪽만 끄면 남은 겹이 기준선에 섞여
     ΔL 이 «측엽만» 이나 «심만» 으로 잡힌다. */
  const SUM_HD = '#shopList .shp-card>.chd::after,#shopList .shp-card>.chd::before',
        SUM_BD = '#shopList .shp-card>.cbg>.jzs::after',
        SUM_FR = '#shopList .shp-card>.cfr::after';
  /* 13회차 — `.cbg` 안에서 **다섯 칸 전부 노출된** 최대 직사각형(`tools/probe122b.js` 실측).
     카드별 최대 빈칸은 220~260×148~152 로 갈리는데, 그중 **모든 칸에서 동시에 비어 있는** 구역이
     이 값이다. 헤더(104px) 아래·상자 아이콘 판 오른쪽의 본문 바탕이다. */
  const SUM_BODY = '476,104,220,148';
  /* 헤더는 칸마다 배경색(`--hd`)이 달라 **가장 밝은 칸과 가장 어두운 칸**을 같이 본다 —
     `jzShineA()` 가 칸별 α 를 제대로 박고 있는지는 이 두 칸이 같은 값이어야 증명된다. */
  await ampCheck(p, [['소환 헤더1', '#shopList .shp-card>.chd|0', SUM_HD, SUM_FR],
                     ['소환 헤더4', '#shopList .shp-card>.chd|3', SUM_HD, SUM_FR],
                     /* ⚑ 13회차 — 세 «본문» 점의 클립을 `.cbg` 전체에서 **다섯 칸 공통 노출 구역
                        220×148 @(476,104)** 로 좁혔다(§18-1). `.cbg` 전체를 쓰면 최빈면이 본문
                        그라디언트가 아니라 그 위에 덮인 **불투명 판**(상자 아이콘 판·버튼·게이지)으로
                        잡혀서 «카드마다 다른 것을 재는» 점이 된다 — 12회차가 그래서 `'rec'` 으로 내렸다.
                        덮개를 `muteSel` 로 걷어서 재는 방법은 **쓰지 않는다**: 플레이어에게 안 보이는
                        띠를 통과시키는 가짜 초록불이 된다. 실제로 보이는 자리에서만 잰다.
                        duty 는 부분 영역 클립이므로 판정에서 빼고 기록만 한다(`true`). */
                     ['소환 본문', '#shopList .shp-card>.cbg|0|0|' + SUM_BODY, SUM_BD, SUM_FR + ',' + SUM_HD, true],
                     /* ⚠ 전면 광택은 **헤더 위에서 재야 한다.** 6회차에 카드 전체(`.cfr`)로 쟀더니
                        평탄면이 본문 바탕(휘도 144)으로 잡혀 34.1 «정상» 이 나왔지만, 비평가 둘은
                        헤더 바탕(휘도 98~119) 위에서 +57~82 를 읽었다 — 같은 띠가 지나는 **가장 어두운
                        면**이 그 띠의 최대 세기다. 칸별 α 가 제대로 박혔는지도 두 칸을 비교해야 보인다. */
                     /* 7회차(Y 7) — 본문도 칸마다 휘도가 다르다(99.6~165.4). 가장 밝은 칸(3)과
                        가장 어두운 칸(4)을 둘 다 봐야 `--jz-gb` 가 제대로 박혔는지 보인다. */
                     ['소환 본문3', '#shopList .shp-card>.cbg|2|0|' + SUM_BODY, SUM_BD, SUM_FR + ',' + SUM_HD, true],
                     ['소환 본문4', '#shopList .shp-card>.cbg|3|0|' + SUM_BODY, SUM_BD, SUM_FR + ',' + SUM_HD, true],
                     /* 전면 광택은 이제 헤더를 안 지난다(Y 2) → 본문에서 잰다 */
                     ['소환 전면(본문1)', '#shopList .shp-card>.cbg|0', SUM_FR, SUM_HD + ',' + SUM_BD, true],
                     ['소환 전면(본문4)', '#shopList .shp-card>.cbg|3', SUM_FR, SUM_HD + ',' + SUM_BD, true]]);

  /* ── §11 광택 스윕이 카드 밖으로 새지 않는가 (3회차 신설) ────────
     의사요소의 `clip-path` 는 «자기 상자» 기준이라 띠와 함께 움직인다 — 가두는 일은 부모의 몫이다.
     카드 왼쪽 바깥 띠를 두 위상에서 찍어 **픽셀이 같아야** 한다. */
  console.log('§11 스윕 누출 — 카드 바깥 배경은 불변');

  /* ── §2 실제로 그림이 바뀌는가 ───────────────────────────────── */
  console.log('§2 캡처 — t=0 vs t=1500ms 픽셀 차');
  const box = await p.evaluate(() => {
    const r = document.querySelector('#shopList .shp-card').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const s0 = await shotAt(p, 0, box), s1 = await shotAt(p, 1500, box);
  ok(!s0.equals(s1), '카드1 그림이 t=0 과 t=1500ms 에서 다르다 (' + s0.length + 'B vs ' + s1.length + 'B)');
  const s2 = await shotAt(p, 6900, box);
  ok(!s1.equals(s2) && !s0.equals(s2), '카드1 t=6900ms(들썩 구간)도 다르다');

  /* ── §3 텍스트·버튼 bbox Δ0 ─────────────────────────────────── */
  console.log('§3 텍스트·버튼 bbox 불변 (지시 ③)');
  const SEL = ['.shp-card>.chd>i', '.shp-card .cbtn', '.shp-card .cbtn>u', '.shp-card .clv', '.shp-card .cbar'];
  const rects = t => p.evaluate(sel => sel.flatMap(s => [...document.querySelectorAll('#shopList ' + s)]
    .map(e => { const r = e.getBoundingClientRect(); return [s, r.x, r.y, r.width, r.height].join(','); })), SEL);
  await seek(p, 0); const r0 = await rects();
  await seek(p, 1500); const r1 = await rects();
  await seek(p, 6900); const r2 = await rects();
  ok(r0.length > 20, '소환 탭 측정 대상 ' + r0.length + '개');
  ok(JSON.stringify(r0) === JSON.stringify(r1), 't=0 vs 1500ms bbox 동일');
  ok(JSON.stringify(r0) === JSON.stringify(r2), 't=0 vs 6900ms bbox 동일 (들썩이 카드를 안 민다)');

  /* ── §6 강도 변수 3개 ───────────────────────────────────────── */
  console.log('§6 강도 변수 --jz-amp / --jz-per / --jz-glow');
  const vars = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('shopw'));
    return ['--jz-amp', '--jz-per', '--jz-glow'].map(k => cs.getPropertyValue(k).trim());
  });
  ok(vars.every(v => v !== ''), '세 변수 모두 #shopw 에 선언 (' + vars.join(' / ') + ')');
  await p.evaluate(() => { document.getElementById('shopw').style.setProperty('--jz-amp', '0'); });
  const z0 = await shotAt(p, 0, box), z1 = await shotAt(p, 1500, box);
  /* 진폭 0 이면 «움직임» 은 죽고 색 연출(광택·스파클)만 남는다 — 상자 아트의 위치·크기가 고정인지로 본다 */
  const artSame = await p.evaluate(async () => {
    const e = document.querySelector('#shopList .shp-card .cart');
    const at = t => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
      const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(','); };
    return at(0) === at(1500) && at(0) === at(6900);
  });
  ok(artSame, '--jz-amp:0 → 상자 아트가 1px 도 안 움직인다 (연출 끄기 스위치)');
  await p.evaluate(() => { document.getElementById('shopw').style.removeProperty('--jz-amp'); });
  /* 두 시각만 비교하면 «하필 같은 위상» 에 걸려 헛 FAIL 이 난다(주기를 조정할 때마다 재발).
     한 바퀴를 훑어 «서로 다른 상자» 가 하나라도 있으면 움직이는 것이다. */
  const back = await p.evaluate(async () => {
    const e = document.querySelector('#shopList .shp-card .cart');
    const at = t => { document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
      const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); };
    const seen = new Set();
    for (let t = 0; t <= 7000; t += 250) seen.add(at(t));
    return seen.size > 1;
  });
  ok(back, '변수를 되돌리면 다시 움직인다');

  /* ── §5 56 절전 ─────────────────────────────────────────────── */
  console.log('§5 56 절전 — 상시 연출 정지');
  const sv = await p.evaluate(() => {
    document.getElementById('app').classList.add('sv');
    const e = document.querySelector('#shopList .shp-card .cart');
    const st = getComputedStyle(e).animationPlayState;
    document.getElementById('app').classList.remove('sv');
    return st;
  });
  ok(/paused/.test(sv), '절전 중 animation-play-state = ' + sv);

  /* ── §4 페이지 닫힘 ─────────────────────────────────────────── */
  console.log('§4 페이지가 닫히면 정지');
  const closed = await p.evaluate(() => {
    closeShopPage();
    return { on: document.getElementById('shopw').classList.contains('on'),
      n: document.querySelectorAll('#shopList .shp-card').length,
      anims: document.getAnimations().filter(a => /^jz122/.test(a.animationName || '')).length };
  });
  ok(!closed.on && closed.anims === 0, '닫힌 뒤 jz122 애니메이션 ' + closed.anims + '개 (display:none = 정지)');

  /* ── §1·§2·§3 재화 탭 ───────────────────────────────────────── */
  console.log('§1~3 재화 탭 — 카드 연출 · 픽셀 차 · bbox');
  await p.evaluate(() => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  const c1 = await p.evaluate(() => {
    const cds = [...document.querySelectorAll('#shopList .cn-cd')];
    return { n: cds.length,
      alive: cds.filter(c => c.getAnimations({ subtree: true }).some(a => /^jz122/.test(a.animationName || ''))).length,
      top: document.querySelectorAll('#shopList .cn-cd.dia.top').length,
      /* 2회차 — 광선은 «몸통(.bg)» 이 아니라 «아이템 판(.pn)» 안에 있어야 보인다(1회차 실측: .bg 는 완전히 가려짐) */
      ray: !!document.querySelector('#shopList .cn-cd.dia.top>.pn>.ray'),
      mile: !!document.querySelector('#shopList .cn-ml:not(.off)') };
  });
  ok(c1.n >= 10, '재화 카드 ' + c1.n + '장');
  ok(c1.alive === c1.n, '전 카드에 상시 연출 (' + c1.alive + '/' + c1.n + ')');
  ok(c1.top === 1 && c1.ray, '가장 큰 다이아 상품 1칸에만 골드 광선 판');
  const cbox = await p.evaluate(() => {
    const r = document.querySelector('#shopList .cn-cd').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const q0 = await shotAt(p, 0, cbox), q1 = await shotAt(p, 1500, cbox);
  ok(!q0.equals(q1), '재화 카드1 그림이 t=0 과 t=1500ms 에서 다르다');
  /* 2회차 신설 — «있다» 가 아니라 «보인다» 를 잰다.
     1회차 게이트는 광선 판이 DOM 에 있는 것만 보고 통과시켰는데, 실제로는 카드 몸통이
     헤더·아이템 판·버튼에 완전히 가려 **한 픽셀도 안 보였다**(비평가 N 실측 Δ=0).
     이제 광선이 사는 영역을 20s 주기의 1/4 만큼 떨어진 두 시각에 찍어 픽셀 차를 요구한다. */
  await p.evaluate(() => {
    const c = document.querySelector('#shopList .cn-cd.dia.top');
    if (c) c.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(300);
  const rbox = await p.evaluate(() => {
    const e = document.querySelector('#shopList .cn-cd.dia.top>.pn');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
  });
  if (rbox) {
    const y0 = await shotAt(p, 0, rbox), y1 = await shotAt(p, 5200, rbox);
    ok(!y0.equals(y1), '골드 광선이 실제로 보인다 — 아이템 판 픽셀이 t=0 과 t=5200 에서 다르다');
  } else ok(false, '골드 광선 판(.cn-cd.dia.top>.pn>.ray) 을 찾지 못함');
  /* 2회차 신설 — 탭 간 규칙 일치(N ④): 재화 카드에도 헤더 스윕·버튼 링이 붙는가 */
  const cons = await p.evaluate(() => ({
    /* ⚠ 의사요소(::after)의 애니메이션은 `el.getAnimations()` 에 안 잡힌다(subtree 옵션이 필요하다).
       여기서는 computed style 로 직접 묻는 쪽이 정확하다. */
    /* 6회차 — 띠의 호스트를 카드 상자에서 **테두리 레이어 `.fr` 의 안쪽(padding box)** 으로 옮겼다
       (7-3-6 «광택이 검은 외곽선을 덮는다»). 검사 대상 선택자도 같이 옮긴다. */
    sweep: [...document.querySelectorAll('#shopList .cn-cd:not(.done)>.fr')]
      .filter(c => getComputedStyle(c, '::after').animationName === 'jz122Sweep').length,
    all: document.querySelectorAll('#shopList .cn-cd:not(.done)').length,
    ring: [...document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]')]
      .filter(e => e.getAnimations().some(a => a.animationName === 'jz122RingC')).length,
    ads: document.querySelectorAll('#shopList .cn-cd>.bt[data-cnad]').length,
  }));
  ok(cons.all > 0 && cons.sweep === cons.all, '재화 카드 광택 스윕 ' + cons.sweep + '/' + cons.all);
  const runs2 = await p.evaluate(() => {
    const out = [];
    const chk = (sel, pseudo, hostSel) => {
      const e = document.querySelector(sel), h = document.querySelector(hostSel || sel);
      if (!e || !h) { out.push(sel + ' 없음'); return; }
      const cs = getComputedStyle(e, pseudo);
      const bandW = parseFloat(cs.width) || 0;
      const run = (cs.getPropertyValue('--jz-run') || '').trim();
      const runPx = run.endsWith('px') ? parseFloat(run) : bandW * (parseFloat(run) || 440) / 100;
      const hostW = h.getBoundingClientRect().width;
      if (!(runPx + bandW >= hostW)) out.push(sel + pseudo + ' ' + Math.round(runPx + bandW) + ' < ' + Math.round(hostW));
    };
    chk('#shopList .cn-cd>.fr', '::after');
    chk('#shopList .cn-rb>b', '::after');
    chk('#shopList .cn-rb>.tl.l>s', '::after', '#shopList .cn-rb>b');
    chk('#shopList .cn-rb>.tl.r>s', '::after', '#shopList .cn-rb>b');
    chk('#shopList .cn-a2', '::after');
    chk('#shopList .cn-ml', '::after');
    chk('#shopList .cn-hd', '::after');
    return out;
  });
  ok(runs2.length === 0, '재화 탭 스윕(카드·리본·평생배너)이 전부 완전히 통과'
    + (runs2.length ? ' — ' + runs2.join(' , ') : ''));
  ok(cons.ads > 0 && cons.ring === cons.ads, '[받기] 버튼 펄스 링 ' + cons.ring + '/' + cons.ads);
  /* 4회차 신설 — 비평가 둘이 «화면의 이 직사각형이 13.4초 내내 range 0» 이라고 좌표까지 짚었다.
     그런 «완전 정지 구역» 이 다시 생기지 않도록, 카드가 아닌 구역도 각각 연출을 갖는지 못 박는다. */
  const zones = await p.evaluate(() => {
    const has = (sel, name, pseudo) => {
      const e = document.querySelector(sel);
      if (!e) return sel + ' 없음';
      const v = pseudo ? getComputedStyle(e, pseudo).animationName : getComputedStyle(e).animationName;
      return v && v.indexOf(name) >= 0 ? null : sel + (pseudo || '') + '=' + v;
    };
    return [
      has('#shopList .cn-bn', 'jz122Sweep', '::after'),
      has('#shopList .cn-bn>.art', 'jz122Float'),
      has('#shopList .cn-bn>.gem', 'jz122Float'),
      has('#shopList .cn-rb>b', 'jz122Sweep', '::after'),
      has('#shopList .cn-a2>em', 'jz122Float'),
      has('#shopList .cn-a2', 'jz122Sweep', '::after'),
      has('#shopList .cn-ml>em', 'jz122Float'),
      has('#shopList #cnMove', 'jz122Ring2'),
      has('#shopList .cn-ml:not(.off)>.ex', 'jz122Ring2'),
      /* 6회차(7-3-2·7-3-5) — 새로 채운 «정지 섬» 과 리본 꼬리도 같이 못 박는다 */
      has('#shopList .cn-ml', 'jz122Sweep', '::after'),
      has('#shopList .cn-hd', 'jz122Sweep', '::after'),
      has('#shopList .cn-rb>.tl.l>s', 'jz122Sweep', '::after'),
      has('#shopList .cn-rb>.tl.r>s', 'jz122Sweep', '::after'),
    ].filter(Boolean);
  });
  ok(zones.length === 0, '카드 밖 구역(배너·리본·평생배너·마일리지·이동/교환 버튼)도 전부 연출 보유'
    + (zones.length ? ' — 빠짐: ' + zones.join(' , ') : ''));

  /* ── §13 진폭 단일 기준 — 재화 탭 (6회차 신설) ─────────────── */
  console.log('§13 광택 피크 Δ루마 한 벌 — 재화 탭');
  const RB = '#shopList .cn-rb>b';
  /* ⚑ 15회차 — 재화 카드 띠가 **두 겹**이 됐다(측엽은 `.cn-cd::before`, 심은 `.fr::after`).
     §13 은 «이 띠만 끈» 기준선과 비교하므로 testSel 이 **두 의사요소를 함께** 꺼야 한다 —
     한쪽만 끄면 남은 겹이 기준선에 섞여 진폭이 실제보다 작게 나온다(소환 헤더 SUM_HD 와 같은 처리). */
  const CD_BAND = '#shopList .cn-cd>.fr::after,#shopList .cn-cd::before';
  await ampCheck(p, [['재화 카드', '#shopList .cn-cd:not(.done)', CD_BAND],
                     /* 7회차(Y 1) — 광고 카드와 다이아 카드의 헤더색이 달라 같은 α 가 1.62배로 갈렸다.
                        두 계열의 **헤더면**을 각각 잰다(카드 전체로 재면 크림판이 평탄면으로 잡힌다). */
                     ['광고카드 헤더', '#shopList .cn-cd:not(.done)>.hd', CD_BAND],
                     ['다이아카드 헤더', '#shopList .cn-cd.dia>.hd', CD_BAND],
                     ['리본1 청록', RB + '|0', RB + '::after'],
                     ['리본2 남보라', RB + '|1', RB + '::after'],
                     ['리본3 자주', RB + '|2', RB + '::after'],
                     ['평생배너', '#shopList .cn-a2', '#shopList .cn-a2::after'],
                     ['마일리지', '#shopList .cn-ml', '#shopList .cn-ml::after'],
                     ['상품 밴드', '#shopList .cn-hd', '#shopList .cn-hd::after'],
                     /* 8회차 신설 — 탭 첫 화면의 15.4% 를 차지하던 정지 배너 */
                     ['히어로 배너', '#shopList .cn-bn', '#shopList .cn-bn::after'],
                     /* 6회차 채점 — 두 버튼면이 10/10 · 6/6 프레임 픽셀 동일이었다. 띠가 버튼 위를
                        지나는지 **버튼 상자에서 직접** 잰다(패널 전체로 재면 버튼이 죽어도 통과한다). */
                     /* 14회차 — [교환] 은 이제 **자기 띠**를 쓴다(§15: 패널 띠의 심 α 는 어두운 패널
                        기준이라 라임 버튼에서 그림자로 뒤집혔다). 호스트 = 띠의 주인이므로
                        13회차까지 «부분 영역 클립» 이라 기록만 하던 duty 를 판정으로 되돌린다. */
                     ['[교환] 버튼면', '#shopList .cn-ml>.ex|0|12', '#shopList .cn-ml>.ex::after'],
                     ['[이동] 버튼면', '#shopList .cn-mv|0|12', '#shopList .cn-mv::after']]);

  const leak = await p.evaluate(() => {
    /* 앞선 절에서 d5 칸으로 스크롤해 뒀으므로 «지금 화면 안에 온전히 있는» 칸을 골라야 한다
       (뷰포트 밖 칸의 rect 로 clip 을 만들면 screenshot 이 즉사한다). */
    const c = [...document.querySelectorAll('#shopList .cn-cd')].find(e => {
      const r = e.getBoundingClientRect();
      return r.x > 70 && r.top > 60 && r.bottom < innerHeight - 20;
    });
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x) - 58, y: Math.round(r.y) + 40, width: 52, height: Math.round(r.height) - 80 };
  });
  if (!leak) { ok(false, '스윕 누출을 잴 «화면 안 카드» 를 못 찾음'); }
  else {
  /* ⚑ 13회차 — 이 절이 재는 것은 «**카드의** 띠가 카드 밖으로 새는가» 다.
     13회차에 페이지 바탕 레이어(`#shopw>.jzb`, ①-0)가 생기면서 카드 밖 배경이 **설계대로**
     움직이게 됐고, 그 움직임이 이 절을 빨간불로 만들었다(75/76).
     판정을 느슨하게 하면(«거의 같으면 통과») 진짜 누출까지 같이 통과하므로 그렇게 풀지 않는다.
     대신 **바탕 레이어만 끄고** 잰다 — 그러면 이 절은 3회차에 만든 그대로 «카드 띠만» 본다.
     (바탕 레이어 자체가 카드 위로 새지 않는다는 것은 z-index 로 보장된다: `.shp-list` 보다 뒤다.) */
  const bgOff = on => p.evaluate(v => {
    let e = document.getElementById('jz122bgoff');
    if (!v) { if (e) e.remove(); return; }
    if (!e) { e = document.createElement('style'); e.id = 'jz122bgoff'; document.head.appendChild(e); }
    e.textContent = '#shopw>.jzb{opacity:0!important}';
  }, on);
  await bgOff(true);
  const l0 = await shotAt(p, 0, leak), l1 = await shotAt(p, 1150, leak), l2 = await shotAt(p, 2300, leak);
  await bgOff(false);

  ok(l0.equals(l1) && l0.equals(l2), '카드 왼쪽 바깥 52px 띠가 세 위상에서 픽셀 동일 (스윕이 안 샌다 · 바탕 레이어 끄고)');
  }

  /* ── §14 이웃 칸 위상 분리 (13회차 신설) ────────────────────────
     회차마다 되살아난 결함이라 게이트로 내린다. 5·9·12회차가 «위상을 흩었다» 고 적었는데
     13회차 채점에서 비평가 AE·AF 가 **독립으로 같은 5쌍**을 «사실상 동위상» 으로 짚었다
     (실측 182~245ms = 주기의 5.7~7.7%). 원인은 12회차의 stride 5 가 **1차원**이라
     3열 격자의 세로 이웃(칸 번호 +3)을 15/14 ≡ 1/14 주기로 붙여 놓은 것이었다.
     여기서 재는 것은 코드가 아니라 **결과**다 — 칸의 실제 좌표로 이웃을 찾고,
     계산된 animation-delay/duration 으로 위상차를 원형 거리로 잰다. */
  /* ⚑ 15회차 — 이웃 집합을 **(±2, ±1) 까지** 넓혔다. 14회차 채점에서 비평가 AH 가
     «2열 + 1행» 떨어진 쌍이 51ms(주기의 1.1%) 로 사실상 동위상인 것을 실측으로 짚었는데,
     13회차판 §14 는 가로·세로만 봐서 **그 쌍을 아예 안 세고 있었다** — 게이트가 PASS 인 채로
     결함이 살아남는 종류의 구멍이다(12·13회차 §17-4·§18-3 과 같은 계열).
     문턱은 «시각 거리» 를 따라 두 단으로 준다 — 가까운 쌍(가로 290px · 세로 319px)은 25%,
     더 먼 쌍(2열 580px · 대각 430~660px)은 **16%**. 16% 는 임의값이 아니라
     이 격자의 **수학적 상한 1/6 = 16.7%** 바로 아래다(`tools/phase122.js` 가 증명·브루트포스). */
  console.log('§14 이웃 칸 위상 분리 — 가로·세로 25% · 2열·대각 16% 이상 벌어지는가');
  const nb = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopList .cn-cd')].map(e => {
      const cs = getComputedStyle(e, '::after');   /* 칸 띠는 `.cn-cd>.fr::after` 지만 위상은 칸이 준다 */
      const fr = e.querySelector(':scope>.fr');
      const s = fr ? getComputedStyle(fr, '::after') : cs;
      const dur = parseFloat(s.animationDuration) * (/ms$/.test(s.animationDuration.trim()) ? 1 : 1000);
      const del = parseFloat(s.animationDelay) * (/ms$/.test(s.animationDelay.trim()) ? 1 : 1000);
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y + (window.__sc || 0)), dur, del };
    }).filter(c => isFinite(c.dur) && c.dur > 0 && isFinite(c.del));
    /* 위상 = (−delay mod dur) / dur.  원형 거리로 비교한다. */
    const ph = c => { let v = (-c.del % c.dur) / c.dur; if (v < 0) v += 1; return v; };
    const dist = (a, b) => { const d = Math.abs(ph(a) - ph(b)) % 1; return Math.min(d, 1 - d); };
    const out = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      if (a.dur !== b.dur) continue;               /* 주기가 다르면 «이웃» 비교가 성립하지 않는다 */
      const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
      /* dx/dy 를 열·행 «칸 수» 로 되돌린다(열 피치 290 · 행 피치 319, ±40px 창). */
      const band = (v, pitch) => { for (let n = 0; n <= 2; n++) if (Math.abs(v - n * pitch) < 40) return n; return -1; };
      const dc = band(dx, 290), dr = band(dy, 319);
      if (dc < 0 || dr < 0 || (dc === 0 && dr === 0)) continue;
      if (dr > 1) continue;                        /* 2행 넘게 떨어지면 한눈에 같이 안 들어온다 */
      const near = (dc + dr === 1);                /* 맞닿은 쌍 — 가로 290px · 세로 319px */
      out.push({ kind: dr === 0 ? (dc === 1 ? '가로' : '2열') : (dc === 0 ? '세로' : (dc === 1 ? '대각' : '2열대각')),
                 near, lim: near ? .25 : .16,
                 d: dist(a, b), ms: Math.round(dist(a, b) * a.dur),
                 at: '(' + a.x + ',' + a.y + ')-(' + b.x + ',' + b.y + ')' });
    }
    return out;
  });
  {
    const bad = nb.filter(v => v.d < v.lim);
    const near = nb.filter(v => v.near), far = nb.filter(v => !v.near);
    const least = a => a.length ? a.reduce((m, v) => v.d < m.d ? v : m) : null;
    const wn = least(near), wf = least(far);
    ok(nb.length >= 6, '이웃 쌍 ' + nb.length + '개를 찾았다 (>=6) — 맞닿음 ' + near.length + ' · 2열/대각 ' + far.length);
    ok(far.length >= 4, '넓힌 이웃(2열·대각) 쌍 ' + far.length + '개 (>=4) — 13회차판은 이 쌍을 세지 않았다');
    ok(bad.length === 0, '이웃 위상차가 전부 문턱 이상(맞닿음 25% · 2열/대각 16%)'
      + (wn ? ' — 맞닿음 최소 ' + Math.round(wn.d * 100) + '%(' + wn.ms + 'ms, ' + wn.kind + ' ' + wn.at + ')' : '')
      + (wf ? ' · 2열/대각 최소 ' + Math.round(wf.d * 100) + '%(' + wf.ms + 'ms, ' + wf.kind + ' ' + wf.at + ')' : '')
      + (bad.length ? ' — 미달 ' + bad.length + '쌍: ' + bad.slice(0, 4).map(v => v.kind + ' ' + Math.round(v.d * 100) + '%').join(' , ') : ''));
  }

  const CSEL = ['.cn-cd>.hd>i', '.cn-cd>.bt', '.cn-cd>.bt>u', '.cn-cd>.qt', '.cn-ml>.ex', '.cn-ml>.ex>i'];
  const crects = () => p.evaluate(sel => sel.flatMap(s => [...document.querySelectorAll('#shopList ' + s)]
    .map(e => { const r = e.getBoundingClientRect(); return [s, r.x, r.y, r.width, r.height].join(','); })), CSEL);
  await seek(p, 0); const k0 = await crects();
  await seek(p, 1500); const k1 = await crects();
  await seek(p, 6900); const k2 = await crects();
  ok(k0.length > 20, '재화 탭 측정 대상 ' + k0.length + '개');
  const kdiff = k0.map((v, i) => (v === k1[i] && v === k2[i]) ? null
    : v + '  →  ' + k1[i] + '  /  ' + k2[i]).filter(Boolean);
  ok(kdiff.length === 0, '재화 탭 텍스트·버튼 bbox 3시각 동일' + (kdiff.length ? ' — ' + kdiff.slice(0, 3).join(' ;; ') : ''));
  ok(c1.mile, '마일리지 교환 가능 상태(글로우 대상) 존재');

  /* ── §15 심/측엽 극성 비 (14회차 신설) ─────────────────────────
     13회차 채점(AE ③)이 짚은 것: «광택» 이 밝은 호스트에서 **그림자로 뒤집힌다**.
     재화 소형카드 본문(베이지)에서 심 +6.2 · 측엽 −35.4 로 어둠이 밝음의 5.7배였고,
     극성 비가 호스트마다 0.22~5.7 로 **26배** 흩어져 있었다. §13 은 |ΔL| 최댓값 하나만
     보므로(심이든 측엽이든 큰 쪽) 이 뒤집힘을 통째로 못 잡는다 — 13회차 게이트가
     78/78 초록불이었는데 비평가가 같은 자리를 3점으로 매긴 이유가 이것이다.

     재는 것: §13 이 이미 돈 같은 위상 표본에서 **가장 밝은 값(pos)** 과 **가장 어두운 값(neg)**.
       r = |neg| / pos  — 1 이면 심과 측엽이 대칭, 크면 그림자, 작으면 순광택.
     판정: 물리적 상한 때문에 «전 호스트 r 통일» 은 불가능하다(크림 L236.5 에서 흰 심의
     상한은 +18.5 인데 검정 측엽은 −35 까지 간다). 그래서 **한 벌로 묶되 상한을 둔다** —
       · 점별 r ≤ 2.4  (측엽이 심의 2.4배를 넘으면 사람이 «그림자» 로 읽는다)
       · 점별 pos ≥ 9  (심이 아예 안 보이면 그건 광택이 아니다)
       · 전체 산포 max(r)/min(r) ≤ 6  (13회차 26배) */
  console.log('§15 심/측엽 극성 비 — 광택이 그림자로 뒤집히지 않는가');
  const POL_R_HI = 2.4, POL_POS_LO = 9, POL_SPREAD_HI = 6;
  {
    const rows = POLAR.map(v => ({
      label: v.label, pos: v.pos, neg: v.neg,
      r: v.pos > .5 ? Math.abs(v.neg) / v.pos : 99,
    }));
    console.log('    · ' + rows.map(v => v.label + ' +' + v.pos.toFixed(1) + '/' + v.neg.toFixed(1)
      + ' r=' + (v.r === 99 ? '∞' : v.r.toFixed(2))).join(' | '));
    const flip = rows.filter(v => v.r > POL_R_HI);
    ok(flip.length === 0, '측엽/심 비가 전부 ' + POL_R_HI + ' 이하'
      + (flip.length ? ' — 초과 ' + flip.length + '점: '
        + flip.slice(0, 5).map(v => v.label + ' ' + (v.r === 99 ? '∞' : v.r.toFixed(2))).join(' , ') : ''));
    const dim = rows.filter(v => v.pos < POL_POS_LO);
    ok(dim.length === 0, '심(밝은 쪽) ΔL 이 전부 ' + POL_POS_LO + ' 이상'
      + (dim.length ? ' — 미달 ' + dim.length + '점: '
        + dim.slice(0, 5).map(v => v.label + ' +' + v.pos.toFixed(1)).join(' , ') : ''));
    const rs = rows.map(v => v.r).filter(v => v < 99);
    const spread = rs.length ? Math.max(...rs) / Math.max(.05, Math.min(...rs)) : 99;
    ok(spread <= POL_SPREAD_HI, '극성 비 산포 = ' + spread.toFixed(1) + '배 (<=' + POL_SPREAD_HI + '배)');
  }

  /* ── §16 글자 잉크 어두워짐 (14회차 신설) ───────────────────────
     13회차 채점 AE ④: 소환 카드 헤더의 「무기 상자」 흰 글자가 주기마다 255 → **227**(−11%) 로
     떨어지고 흰 임계 픽셀이 2626 → 1236(**−53%**) 로 줄었다 — 유리 광택의 어두운 측엽이
     글자 **위**에 합성되는 것이다. §13 은 «평탄면»(글자·테두리를 뺀 면)만 보므로 구조적으로 못 잡는다.
     14회차 처방: 띠를 두 겹으로 쪼개 측엽은 글자 아래(`::after`) · 심은 글자 위(`::before`).
     재는 법: 띠를 전부 끈 기준선의 «흰 잉크 픽셀 수»(L ≥ 240)와, 한 주기 16위상의 최솟값을 비교한다.
     심이 글자를 **밝히는** 것은 늘어남이라 통과다(하한만 본다). */
  console.log('§16 글자 잉크 어두워짐 — 측엽이 흰 글자를 깎지 않는가');
  {
    /* §13·§14 가 재화 탭에서 끝나므로 소환 탭으로 되돌린다(헤더 제목은 소환 카드에만 있다). */
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
    const white = async (ms, clip) => {
      await seek(p, ms);
      const b64 = (await p.screenshot({ clip })).toString('base64');
      return await p.evaluate(async src => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let j = 0; j < d.length; j += 4) {
          if (.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2] >= 240) n++;
        }
        return n;
      }, b64);
    };
    const clip = await p.evaluate(() => {
      const e = document.querySelector('#shopList .shp-card>.chd>i');
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
               width: Math.round(r.width), height: Math.round(r.height) };
    });
    if (!clip) ok(false, '헤더 제목 글자를 못 찾음');
    else {
      const off = sel => p.evaluate(x => {
        let e = document.getElementById('jz122ink');
        if (!x) { if (e) e.remove(); return; }
        if (!e) { e = document.createElement('style'); e.id = 'jz122ink'; document.head.appendChild(e); }
        e.textContent = x + '{opacity:0!important}';
      }, sel);
      await off('#shopList .shp-card>.chd::after,#shopList .shp-card>.chd::before');
      const base = await white(0, clip);
      await off('');
      const vals = [];
      for (let i = 0; i < 16; i++) vals.push(await white(Math.round(3200 * i / 16), clip));
      const lo = Math.min(...vals), hi = Math.max(...vals);
      ok(base > 200, '헤더 제목 흰 잉크 기준선 = ' + base + 'px (>200 이어야 잴 수 있다)');
      ok(lo >= base * 0.9, '헤더 제목 흰 잉크 최솟값 = ' + lo + 'px / 기준선 ' + base
        + 'px (' + Math.round(lo / Math.max(1, base) * 100) + '% ≥ 90%) · 최댓값 ' + hi + 'px');
    }
  }

  /* ── §19 재화 카드 글자 잉크 (15회차 신설) ─────────────────────
     §16 은 **소환 헤더**만 잰다. 14회차 채점에서 AG·AH 가 독립으로 짚은 자리는 그게 아니라
     **재화 카드**였다(AG «coin [받기] 대비 3.24 → 2.42:1» · AH «'보석' 타이틀 255 → 217»).
     14회차 게이트는 그 자리를 재는 항목이 아예 없어서 «2인 일치» 지적이 게이트 PASS 를
     그대로 통과했다 — §14 의 대각 구멍과 같은 계열이다. 그래서 같은 자를 여기에도 댄다.
     ★ 음성항을 반드시 같이 돌린다: 글자의 z-index 를 걷어내면(= 15회차 이전 상태) 값이
       실제로 떨어져야 한다. 안 떨어지면 «고쳤는데 안 움직인다» = 자를 의심할 자리다
       (14회차 §19-4 에서 실제로 한 번 속았다). */
  console.log('§19 재화 카드 글자 잉크 — 측엽이 카드 흰 글자를 깎지 않는가');
  {
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    const clips = await p.evaluate(() => {
      const cd = document.querySelector('#shopList .cn-cd:not(.done)');
      if (!cd) return null;
      cd.scrollIntoView({ block: 'center' });
      const out = [];
      for (const sel of [':scope>.hd>i', ':scope>.bt>u.lab']) {
        const e = cd.querySelector(sel);
        if (!e) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        out.push({ x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
                   width: Math.round(r.width), height: Math.round(r.height) });
      }
      return out;
    });
    const ink = async (ms) => {
      await seek(p, ms);
      let n = 0;
      for (const clip of clips) {
        const b64 = (await p.screenshot({ clip })).toString('base64');
        n += await p.evaluate(async src => {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let k = 0;
          for (let j = 0; j < d.length; j += 4) {
            if (.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2] >= 240) k++;
          }
          return k;
        }, b64);
      }
      return n;
    };
    const patch = txt => p.evaluate(x => {
      let e = document.getElementById('jz122ink2');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'jz122ink2'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    if (!clips || clips.length < 2) ok(false, '재화 카드 글자를 못 찾음 (' + (clips ? clips.length : 0) + '자리)');
    else {
      const CD_ALL = '#shopList .cn-cd>.fr::after,#shopList .cn-cd>.fr::before,#shopList .cn-cd::before';
      await patch(CD_ALL + '{opacity:0!important}');       /* 띠 3겹 전부 끈 기준선 */
      const base = await ink(0);
      await patch('');
      const vals = [];
      for (let i = 0; i < 16; i++) vals.push(await ink(Math.round(4800 * i / 16)));
      const lo = Math.min(...vals), hi = Math.max(...vals);
      /* 음성항 — 글자를 층에서 내리면(15회차 이전) 측엽이 다시 글자를 깎아야 한다 */
      await patch('#shopList .cn-cd>.hd>i,#shopList .cn-cd>.qt,#shopList .cn-cd>.bt>u{z-index:auto!important}');
      const neg = [];
      for (let i = 0; i < 16; i++) neg.push(await ink(Math.round(4800 * i / 16)));
      const nlo = Math.min(...neg);
      await patch('');
      ok(base > 200, '재화 카드 글자 흰 잉크 기준선 = ' + base + 'px (>200 이어야 잴 수 있다)');
      ok(lo >= base * 0.9, '재화 카드 글자 흰 잉크 최솟값 = ' + lo + 'px / 기준선 ' + base
        + 'px (' + Math.round(lo / Math.max(1, base) * 100) + '% ≥ 90%) · 최댓값 ' + hi + 'px');
      ok(nlo < base * 0.9, '음성항 — 글자 z 를 걷으면 ' + nlo + 'px('
        + Math.round(nlo / Math.max(1, base) * 100) + '%) 로 떨어진다 (자가 살아 있다는 증거)');
    }
  }

  /* ── §18 들썩 정점이 «캡처 격자에 걸리는가» (14회차 신설) ────────
     13회차 채점에서 **두 비평가가 독립으로 같은 것**을 짚었다 — 목걸이 회전 0.0~0.24°(사양 ±3°) ·
     이동 −4~−5px(사양 −6px). 코드는 사양대로였다. 즉 «있는데 안 보이는» 것이고,
     지금까지의 게이트는 **키프레임에 값이 있는지**만 볼 수 있어 이걸 구조적으로 못 잡았다.
     여기서는 **캡처 격자(t=80,400,…,2640 · 320ms)에서 실제로 읽히는 값**을 잰다 —
     비평가가 재는 바로 그 표본이다. 정점을 순간으로 두면 이 격자에 안 걸려 FAIL 이 난다. */
  console.log('§18 들썩 정점 — 320ms 캡처 격자에서 읽히는 회전·이동');
  {
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
    const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640];
    const seen = new Map();
    for (const t of STOPS) {
      await seek(p, t);
      const rows = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card .cart')]
        .map((e, i) => {
          const s = getComputedStyle(e);
          return [i + 1, Math.abs(parseFloat(s.rotate) || 0), Math.abs(parseFloat((s.translate || '').split(' ')[1] || '0') || 0)];
        }));
      for (const [i, r, y] of rows) {
        const cur = seen.get(i) || { r: 0, y: 0 };
        seen.set(i, { r: Math.max(cur.r, r), y: Math.max(cur.y, y) });
      }
    }
    const got = [...seen.entries()].sort((a, b) => a[0] - b[0]);
    console.log('    · ' + got.map(([i, v]) => '칸' + i + ' ' + v.r.toFixed(1) + '° / ' + v.y.toFixed(1) + 'px').join(' | '));
    /* 사양 ±3° · −6px 의 **80%** 를 격자에서 읽을 수 있어야 한다(정점 유지 구간이 표본 간격과 맞먹는지). */
    const badR = got.filter(([, v]) => v.r < 2.4).map(([i, v]) => '칸' + i + ' ' + v.r.toFixed(1) + '°');
    const badY = got.filter(([, v]) => v.y < 4.8).map(([i, v]) => '칸' + i + ' ' + v.y.toFixed(1) + 'px');
    ok(got.length >= 5, '들썩 측정 대상 ' + got.length + '칸 (>=5)');
    ok(badR.length === 0, '캡처 격자에서 읽히는 회전이 전부 2.4° 이상'
      + (badR.length ? ' — 미달 ' + badR.join(' , ') : ''));
    ok(badY.length === 0, '캡처 격자에서 읽히는 이동이 전부 4.8px 이상'
      + (badY.length ? ' — 미달 ' + badY.join(' , ') : ''));
  }

  /* ── §17 호흡 글로우·링 후광 진폭 (14회차 신설) ─────────────────
     체크리스트가 13회차부터 열어 둔 항목이다 — «호흡 글로우 진폭 단일 기준 Δ22±3 ·
     마일리지 Δ13.7 ↔ 재화 받기 버튼 Δ65 (4.7배 산포)». §13 은 «면 위를 지나는 띠» 를 재므로
     **상자 밖으로 번지는 box-shadow** 는 한 번도 잰 적이 없다.
     재는 법: 요소 테두리 **바깥 2~14px 띠**의 평균 루마를 한 주기 16위상에서 재고 최대−최소.
     (안쪽을 넣으면 면·글자가 섞이고, 너무 멀리 나가면 이웃 요소가 섞인다.) */
  console.log('§17 호흡 글로우·링 후광 진폭 — 상자 밖 2~14px 띠의 Δ루마');
  {
    const glowAmp = async (sel, per) => {
      const clip = await p.evaluate(s => {
        const e = document.querySelector(s);
        if (!e) return null;
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        const x = Math.round(r.x) - 14, y = Math.round(r.y) - 14;
        const w = Math.round(r.width) + 28, h = Math.round(r.height) + 28;
        if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
        return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
      }, sel);
      if (!clip) return null;
      const { iw, ih, ...box } = clip;
      const vals = [];
      for (let i = 0; i < 16; i++) {
        await seek(p, Math.round(per * i / 16));
        const b64 = (await p.screenshot({ clip: box })).toString('base64');
        vals.push(await p.evaluate(async ([src, w, h]) => {
          const img = new Image();
          await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let s = 0, n = 0;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            /* 테두리 바깥 2~14px 띠만 — 안쪽(요소 면)과 가장 바깥 2px(이웃 경계)은 뺀다 */
            const inx = x >= 14 && x < 14 + w, iny = y >= 14 && y < 14 + h;
            if (inx && iny) continue;
            if (x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2) continue;
            const j = (y * c.width + x) * 4;
            s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n++;
          }
          return n ? +(s / n).toFixed(2) : null;
        }, [b64, iw, ih]));
      }
      const v = vals.filter(x => x != null);
      return v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(1) : null;
    };
    const GLOWS = [['강제 상자 테두리(2.8s)', '#shopList .shp-card.gm>.cfr', 2800],
                   ['[무료] 링(0.9s)', '#shopList .shp-card .cbtn.b1:not(.lack)', 900]];
    const amps = [];
    for (const [label, sel, per] of GLOWS) {
      const a = await glowAmp(sel, per);
      amps.push([label, a]);
    }
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    for (const [label, sel, per] of [['마일리지 패널(2.6s)', '#shopList .cn-ml', 2600],
                                     ['[교환] 링(1.2s)', '#shopList .cn-ml>.ex', 1200],
                                     ['[이동] 링(1.35s)', '#shopList .cn-mv', 1350],
                                     ['[받기 AD] 링(1.15s)', '#shopList .cn-cd>.bt[data-cnad]', 1150]]) {
      const a = await glowAmp(sel, per);
      amps.push([label, a]);
    }
    console.log('    · ' + amps.map(([l, a]) => l + ' Δ' + (a == null ? '측정 불가' : a)).join(' | '));
    const got = amps.filter(([, a]) => a != null).map(([, a]) => a);
    ok(got.length >= 5, '글로우 측정점 ' + got.length + '개 (>=5)');
    const spread = got.length ? Math.max(...got) / Math.max(.5, Math.min(...got)) : 99;
    ok(spread <= 2.2, "글로우 진폭 산포 = " + spread.toFixed(1) + "배 (<=2.2배 · 13회차 4.7배 → 14회차 1.8배)");
  }

  /* ── §8 스크롤 fps ────────────────────────────────────────────
     지시 ③ 은 «≥55fps» 지만 **이 러너에서는 절대값이 게이트가 될 수 없다** — 1회차 실측:
     애니메이션을 전부 끈 같은 페이지가 소환 12.6 / 재화 25.4fps 이고, 카드가 하나도 없는
     빈 화면의 rAF 조차 ~31fps 다(컨테이너 CPU 상한). 절대값으로 재면 122 와 무관하게 항상 FAIL 이다.
     그래서 **같은 실행 안에서 ON/OFF 를 번갈아 4회씩 재고 중앙값을 비교**한다 —
     122 의 연출이 스크롤 비용을 늘리지 않았는가가 실제로 물어야 할 것이다. 절대값은 기록만 남긴다. */
  console.log('§8 스크롤 fps — ON/OFF 교차 4회 중앙값 (절대값은 러너 상한에 걸려 기록만)');
  const OFFCSS = '#shopList *,#shopList *::after,#shopList *::before{animation-name:none!important}';
  const setCss = c => p.evaluate(x => {
    let s = document.getElementById('v122fps');
    if (!s) { s = document.createElement('style'); s.id = 'v122fps'; document.head.appendChild(s); }
    s.textContent = x;
  }, c);
  const scrollFps = () => p.evaluate(() => new Promise(res => {
    const lw = document.getElementById('shopList');
    let n = 0, t0 = performance.now(), dir = 1;
    const tick = () => {
      n++; lw.scrollTop += 24 * dir;
      if (lw.scrollTop <= 0 || lw.scrollTop + lw.clientHeight >= lw.scrollHeight - 1) dir = -dir;
      if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
      else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
    };
    requestAnimationFrame(tick);
  }));
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  for (const tab of ['coin', 'summon']) {
    await p.evaluate(t => { shopCat = t; setShopCatTabs(t); renderShopPage(); }, tab);
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} }); });
    const on = [], off = [];
    for (let i = 0; i < 4; i++) {
      await setCss(''); await p.waitForTimeout(180); on.push(await scrollFps());
      await setCss(OFFCSS); await p.waitForTimeout(180); off.push(await scrollFps());
    }
    await setCss('');
    const mOn = med(on), mOff = med(off);
    console.log('   ' + (tab === 'coin' ? '재화' : '소환') + ' 탭 — ON ' + on.join('/') + ' (중앙 ' + mOn
      + ') · OFF ' + off.join('/') + ' (중앙 ' + mOff + ')');
    ok(mOn >= mOff * 0.9, (tab === 'coin' ? '재화' : '소환') + ' 탭 스크롤 비용 증가 없음 — ON '
      + mOn + 'fps ≥ OFF ' + mOff + 'fps × 0.9');
  }

  /* ── §9 콘솔 ────────────────────────────────────────────────── */
  ok(errs.length === 0, '콘솔 에러 0 (' + errs.slice(0, 2).join(' | ') + ')');

  await b.close();
  console.log('\nVERIFY122 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
