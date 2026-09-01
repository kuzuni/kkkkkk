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
        690 — 판정은 5쌍 중 **가장 나은 쌍**의 ON/OFF 비(문턱 0.9 불변). §8-R 이 «합성 부하 세상»
        에서 그 축이 빨개지는 것까지 같은 실행에서 확인한다(되돌림 시험).
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

  /* ── §23 재화 아이콘 «둥실» 위상 격자 (17회차 신설) ────────────────
     ⚑ 왜 이제야 만드는가 — 16회차의 **1순위 결함**이 이 자리였는데 게이트가 통째로 비어 있었다.
       3회차가 남긴 `.cn-cd:nth-child(6n+k)>.pn>em`(특이도 0,3,1) 5줄이 15회차의
       `.cn-cd>.pn>em{delay:calc(2.6s*var(--jz-k))}`(0,2,1)을 **이겨서**, 15회차가
       «둥실이 광택의 (1/3, 1/2) 격자를 공짜로 물려받는다» 고 적은 것이 **한 칸에도 안 닿았다.**
       비평가 AK·AL 이 화소로 먼저 찾았다(가로 3쌍 전부 15.5~16.5% · r1c0↔r1c1 **3ms = 0.1%**).
     §14 는 **띠**(`.cn-cd>.fr::after`)의 위상만 잰다 — 둥실(`.pn>em`)은 **다른 애니메이션**이라
       §14 가 초록불인 채로 이 결함이 살았다. 15회차 교훈 1 «자를 안 댄 곳은 자동으로 무결점» 그대로다.

     재는 것은 코드가 아니라 **결과**다 — 칸의 실제 좌표로 이웃을 찾고 computed delay 로 위상을 푼다.
     기대값은 `--jz-k = −((col·2 + row·3) mod 6)/6` 에서 나온다:
       가로(col+1) **1/3** · 세로(row+1) **1/2** · 대각(col+1,row+1) 5/6 ≡ **1/6**.
     문턱은 §0-1 위상 규약대로 맞닿은 쌍(가로·세로) **≥30%**, 대각·2열 **≥16%**(격자 상한 1/6 바로 아래).
     가로 기대 33.3% 에 30% 를 두는 것은 반올림·`toFixed(4)` 절단분만 허용하는 폭이다. */
  console.log('§23 재화 아이콘 둥실 위상 격자 — 가로 1/3 · 세로 1/2 · 대각 1/6 이 실제로 걸렸는가');
  const floatPh = () => p.evaluate(() => {
    const cells = [...document.querySelectorAll('#shopList .cn-cd>.pn>em')].map(e => {
      const s = getComputedStyle(e);
      const ms = v => parseFloat(v) * (/ms$/.test(String(v).trim()) ? 1 : 1000);
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y + (window.__sc || 0)),
               dur: ms(s.animationDuration), del: ms(s.animationDelay), nm: s.animationName };
    }).filter(c => /jz122Float/.test(c.nm) && isFinite(c.dur) && c.dur > 0 && isFinite(c.del));
    const ph = c => { let v = (-c.del % c.dur) / c.dur; if (v < 0) v += 1; return v; };
    const dist = (a, b) => { const d = Math.abs(ph(a) - ph(b)) % 1; return Math.min(d, 1 - d); };
    const out = [];
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      if (a.dur !== b.dur) continue;
      const band = (v, pitch) => { for (let n = 0; n <= 2; n++) if (Math.abs(v - n * pitch) < 40) return n; return -1; };
      const dc = band(Math.abs(a.x - b.x), 290), dr = band(Math.abs(a.y - b.y), 319);
      if (dc < 0 || dr < 0 || (dc === 0 && dr === 0) || dr > 1) continue;
      const near = (dc + dr === 1);
      out.push({ kind: dr === 0 ? (dc === 1 ? '가로' : '2열') : (dc === 0 ? '세로' : (dc === 1 ? '대각' : '2열대각')),
                 near, lim: near ? .30 : .16, d: dist(a, b), ms: Math.round(dist(a, b) * a.dur) });
    }
    return { n: cells.length, out };
  });
  {
    const { n, out } = await floatPh();
    const bad = out.filter(v => v.d < v.lim);
    const least = a => a.length ? a.reduce((m, v) => v.d < m.d ? v : m) : null;
    const wn = least(out.filter(v => v.near)), wf = least(out.filter(v => !v.near));
    ok(n >= 10, '둥실 아이콘 ' + n + '칸을 찾았다 (>=10)');
    ok(out.length >= 6, '둥실 이웃 쌍 ' + out.length + '개 (>=6)');
    ok(bad.length === 0, '둥실 이웃 위상차가 전부 문턱 이상(맞닿음 30% · 2열/대각 16%)'
      + (wn ? ' — 맞닿음 최소 ' + Math.round(wn.d * 100) + '%(' + wn.ms + 'ms, ' + wn.kind + ')' : '')
      + (wf ? ' · 2열/대각 최소 ' + Math.round(wf.d * 100) + '%(' + wf.ms + 'ms, ' + wf.kind + ')' : '')
      + (bad.length ? ' — 미달 ' + bad.length + '쌍: '
         + bad.slice(0, 4).map(v => v.kind + ' ' + Math.round(v.d * 100) + '%').join(' , ') : ''));

    /* ⚑ 음성항 — 15회차 교훈 2 «신설 게이트 항목은 «음성항» 없이 믿지 마라».
       16회차가 지운 그 5줄을 **되살려** 놓고 같은 자를 대 본다. 여기서 FAIL 이 안 나면
       이 자는 «무엇을 재도 통과하는» 자이고 위 PASS 는 아무 뜻이 없다.
       (3회차 규칙의 형태 그대로: 0.43s 배수를 `nth-child(6n+k)` 로 박는다 — 특이도 0,3,1 로 이긴다) */
    await p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v122neg';
      s.textContent = [1, 2, 3, 4, 5].map(k =>
        '#shopList .cn-cd:nth-child(6n+' + k + ')>.pn>em{animation-delay:-' + (0.43 * k).toFixed(2) + 's}').join('');
      document.head.appendChild(s);
    });
    const neg = await floatPh();
    const negBad = neg.out.filter(v => v.d < v.lim);
    await p.evaluate(() => { const s = document.getElementById('v122neg'); if (s) s.remove(); });
    ok(negBad.length > 0, '음성항 — 16회차가 지운 `nth-child(6n+k)` 5줄을 되살리면 이 자가 '
      + negBad.length + '쌍을 FAIL 로 잡는다 (>0 이어야 자가 살아 있다)');
    /* 되돌린 뒤 원래대로 통과하는지도 확인 — 음성항이 상태를 흘리면 뒤 절이 오염된다 */
    ok((await floatPh()).out.filter(v => v.d < v.lim).length === 0, '음성항 제거 후 원상 복귀');
  }

  /* ── §24 광택이 «글자 잉크» 를 깎지 않는가 (18회차 신설) ────────────────
     ⚑ 18회차 비평가 **둘이 독립으로** 같은 결함을 화소로 잡았고, 15회차 이후 처음으로
     «bbox 불변식은 통과인데 글자가 상한다» 는 자리를 짚었다:
       AM[2] 「«보석» 제목의 잉크(luma<30, n=1082)를 **f1 에 고정한 마스크**로 9프레임 추적 →
             평균 0.94 → **19.29**, 최대 **+107.0**. 같은 영역 흰 속살(luma>235)은 254.77 → 254.76
             **무변화**」 = 광택이 밝은 데는 안 건드리고 **글자를 세우는 어두운 획만** 들어올린다.
       AN[11] 「같은 자리 잉크 화소수 1138 → **918 (−19.3%)** · 소환 «무기 상자» 3539 → **2604 (−26.4%)**」
     원인은 알파도 블렌드도 아니라 **쌓임 순서**였다 — 소환은 흰 심(`.chd::before`)이 z:2 인데
     제목이 z:1, 재화는 글자가 z:2 인데 광택을 얹은 `.fr` 이 z:4. 둘 다 광택이 글자 «위» 다.
     기존 게이트가 이걸 못 본 이유도 분명하다: §12 계열은 **bbox 만** 본다(위치는 안 변한다).
     15회차 교훈 1 «자를 안 댄 곳은 자동으로 무결점» 이 **네 번째로** 재발한 자리다.

     재는 법: AM 의 자를 그대로 쓴다 — 한 위상에서 잉크 마스크(luma<40)를 **고정**하고,
     같은 마스크로 한 주기를 훑어 잉크 평균의 **상승분**을 본다. 획이 광택에 씻기면 오른다.
     문턱은 3.0 루마 — 18회차 이전 값이 소환 +23.5 · 재화 +18.4 였으니 한참 아래다. */
  console.log('§24 광택이 제목 글자 잉크를 깎지 않는가 (18회차 신설 — 2인 화소 일치)');
  const INK_RISE_HI = 3.0;
  /* ⚑ 375 — **상자를 «잘리는 조상» 과 교집합** 낸다(2026-08-29).
     `.cn-cd>.hd>i` 는 `left:-30px;right:-30px`(글리프 advance 보다 넓은 박스, A1 교훈) 이라
     bbox 가 카드 밖으로 **좌 31px · 우 30px** 삐져나온다. 그런데 실제로 칠해지는 잉크는
     `.hd{overflow:hidden}` 이 카드 안으로 잘라 낸 것뿐이다 — 밖의 화소는 «제목» 이 아니라
     **페이지 바탕 레이어(`#shopw>.jzb`, 13회차 ①-0)** 이고, 그것은 설계대로 움직인다.
     `luma<40` 마스크는 그 바탕(실측 기준 39.72)까지 «잉크» 로 세고 있었고, 3040화소 중 **1178개**가
     그것이었다. 카드 안 화소(진짜 잉크 기준 1.27)의 상승은 **0.06** 인데 전체 평균이 5.39 로 읽힌
     이유가 그것이다(`tools/probe375.js` §B 가 구역별로 갈라 실측 · §C 대조: 365 이전 3열 기하로
     되돌려도 **5.80** 이라 열 수와 무관하다).
     ⚠ 문턱(3.0)은 한 칸도 안 넓혔다 — 무르게 푸는 대신 **자가 다른 것을 재던 것**을 고쳤다(334 처방 ①).
     자가 여전히 살아 있음은 아래 «음성항»(제목을 광택 아래 z:1 로 내리면 빨개진다)이 못박는다. */
  async function inkRise(p, sel, stops, clipSel) {
    const box = await p.evaluate(([s, cs]) => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
      if (cs) {
        const c = e.closest(cs); if (!c) return null;
        const q = c.getBoundingClientRect();
        x1 = Math.max(x1, q.left); y1 = Math.max(y1, q.top);
        x2 = Math.min(x2, q.right); y2 = Math.min(y2, q.bottom);
      }
      const w = x2 - x1, h = y2 - y1;
      if (w < 4 || h < 4 || y1 < 0 || y2 > innerHeight) return null;
      return { x: Math.round(x1), y: Math.round(y1), width: Math.round(w), height: Math.round(h) };
    }, [sel, clipSel || null]);
    if (!box) return null;
    let mask = null, base = 0, peak = -1e9, peakAt = 0;
    for (const t of stops) {
      const b64 = (await shotAt(p, t, box)).toString('base64');
      const m = await p.evaluate(async ([src, mk]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data, n = c.width * c.height;
        const L = new Float32Array(n);
        for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
        if (!mk) { const idx = []; for (let i = 0; i < n; i++) if (L[i] < 40) idx.push(i); return { idx }; }
        let s = 0; for (const i of mk) s += L[i];
        return { mean: mk.length ? s / mk.length : 0 };
      }, [b64, mask]);
      if (!mask) { mask = m.idx; if (mask.length < 120) return { few: mask.length }; continue; }
      if (base === 0) base = m.mean;
      if (m.mean > peak) { peak = m.mean; peakAt = t; }
    }
    /* 첫 표본이 기준면이다 — 마스크를 뜬 그 위상의 잉크 평균 */
    return { n: mask.length, rise: peak - base, peakAt };
  }
  {
    const SW2 = 4800, S2 = [0, 480, 960, 1440, 1920, 2400, 2880, 3360, 3840, 4320];
    const COIN_TI = '#shopList .cn-cd>.hd>i', COIN_CLIP = '.hd';
    const coinInk = await inkRise(p, COIN_TI, S2.map(v => v + 40), COIN_CLIP);
    if (coinInk && coinInk.n) {
      console.log('   재화 카드 제목  잉크 화소 ' + coinInk.n + '개 · 한 주기 최대 상승 '
        + coinInk.rise.toFixed(2) + ' 루마 (t=' + coinInk.peakAt + 'ms)');
      ok(coinInk.rise < INK_RISE_HI, '재화 카드 제목 잉크 상승 ' + coinInk.rise.toFixed(2)
        + ' < ' + INK_RISE_HI + ' (18회차 이전 AM 실측 +18.4)');
    } else ok(false, '재화 카드 제목 잉크 마스크를 못 떴다' + (coinInk ? ' (화소 ' + coinInk.few + '개)' : ''));

    /* ⚑ 375 음성항(재화 쪽) — 자를 좁혔으니 «좁힌 자가 여전히 결함을 잡는가» 를 여기서 못박는다.
       18회차가 만든 음성항은 **소환 헤더에만** 있었다(재화 칸은 자가 없는 채로 초록이었다).
       제목을 광택 «아래»(z:1)로 되돌리면 이 자가 3.0 이상으로 빨개져야 한다. */
    await p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v122neg24c';
      s.textContent = '#shopList .cn-cd>.hd>i{z-index:1 !important}';
      document.head.appendChild(s);
    });
    const negCoin = await inkRise(p, COIN_TI, S2.map(v => v + 40), COIN_CLIP);
    await p.evaluate(() => { const s = document.getElementById('v122neg24c'); if (s) s.remove(); });
    ok(!!(negCoin && negCoin.n && negCoin.rise >= INK_RISE_HI),
      '음성항 — 재화 카드 제목을 광택 아래(z:1)로 내리면 좁힌 자가 잡는다 (상승 '
      + (negCoin && negCoin.n ? negCoin.rise.toFixed(2) : '?') + ' >= ' + INK_RISE_HI + ')');
    const backCoin = await inkRise(p, COIN_TI, S2.map(v => v + 40), COIN_CLIP);
    ok(!!(backCoin && backCoin.n && backCoin.rise < INK_RISE_HI), '음성항 제거 후 원상 복귀(재화)');

    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(200);
    const sumInk = await inkRise(p, '#shopList>.shp-card>.chd>i', [0, 320, 640, 960, 1280, 1600, 1920, 2240, 2560, 2880].map(v => v + 40), '.chd');
    if (sumInk && sumInk.n) {
      console.log('   소환 헤더 제목  잉크 화소 ' + sumInk.n + '개 · 한 주기 최대 상승 '
        + sumInk.rise.toFixed(2) + ' 루마 (t=' + sumInk.peakAt + 'ms)');
      ok(sumInk.rise < INK_RISE_HI, '소환 헤더 제목 잉크 상승 ' + sumInk.rise.toFixed(2)
        + ' < ' + INK_RISE_HI + ' (18회차 이전 AM 실측 +23.5 · 최대 +72.3)');
    } else ok(false, '소환 헤더 제목 잉크 마스크를 못 떴다' + (sumInk ? ' (화소 ' + sumInk.few + '개)' : ''));

    /* 음성항 — 글자를 다시 광택 «아래» 로 내리면 이 자가 잡아야 한다(15회차 교훈 2) */
    await p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'v122neg24';
      s.textContent = '#shopList>.shp-card>.chd>i{z-index:1 !important}';
      document.head.appendChild(s);
    });
    const negInk = await inkRise(p, '#shopList>.shp-card>.chd>i', [0, 320, 640, 960, 1280, 1600, 1920, 2240, 2560, 2880].map(v => v + 40), '.chd');
    await p.evaluate(() => { const s = document.getElementById('v122neg24'); if (s) s.remove(); });
    ok(!!(negInk && negInk.n && negInk.rise >= INK_RISE_HI),
      '음성항 — 제목을 광택 아래(z:1)로 되돌리면 이 자가 잡는다 (상승 '
      + (negInk && negInk.n ? negInk.rise.toFixed(2) : '?') + ' >= ' + INK_RISE_HI + ')');
    const back = await inkRise(p, '#shopList>.shp-card>.chd>i', [0, 320, 640, 960, 1280, 1600, 1920, 2240, 2560, 2880].map(v => v + 40), '.chd');
    ok(!!(back && back.n && back.rise < INK_RISE_HI), '음성항 제거 후 원상 복귀');
    /* ── §25 가격 버튼 [10회]·[30회] 보조 링 (19회차 신설) ────────────────
       18회차 자체 실측(§23-7)이 잡은 «죽은 버튼» 의 실체다 — 소환 카드 버튼 3개 중
       `b2`·`b3` 만 **자기 애니메이션이 0** 이라, 지나가는 본문 광택(4.8s)의 위상에 따라
       한 카드 안에서 «어떤 버튼은 살아 있고 어떤 버튼은 죽어 보이는» ④ 일관성 감점이 났다.
       17회차 두 비평가가 «죽은 섬» 으로 서로 다른 칸을 지목해(AM 은 게이지, AN 은 C3 버튼)
       그때는 채택하지 않았는데, 둘이 본 것의 공통 원인이 여기였다.

       ⚠ 이 절이 재는 것은 «있는가» 가 아니라 **«세기가 [무료]의 절반인가»** 다.
       가격 버튼이 주 CTA([무료])만큼 세면 시선이 갈라진다 — 그래서 §17 의 한 벌 밴드(Δ22±3)를
       그대로 쓰면 **안 된다**. 보조 링은 자기 밴드(Δ7~16)와 «[무료] 대비 30~65%» 로 잰다.
       15회차 교훈 2 대로 음성항(애니메이션을 다시 끄면 Δ 가 무너진다)을 같이 둔다. */
    console.log('§25 가격 버튼 보조 링 — 있는가 · 세기가 [무료]의 절반인가 · bbox Δ0 (19회차 신설)');
    {
      const RP_LO = 7, RP_HI = 15, RATIO_LO = .30, RATIO_HI = .65;
      /* ⚠ 19회차에 이 절이 **두 번 틀렸다**. 자를 대기 전에 둘 다 되돌린다.
         ⓐ §17 이 «뱃지 있는 상태» 를 만들려고 무료 횟수를 **소진**시켜 놓는다 → `.b1` 이 `.lack` 이 되어
            링 규칙(`.b1:not(.lack)`)이 통째로 안 붙고, «카드 안 위상» 도 [무료] Δ 도 못 잰다.
            §25 는 무료가 **켜진** 상태를 재야 하므로 여기서 되돌린다(`freeLeft()` 는 «없는 키 → SHOP_FREE» 폴백).
         ⓑ 버튼 밖 2~14px 띠에는 **본문 광택(4.8s)·숨쉬기(2.8s)가 같이 지나간다.** 그것들을 켜 둔 채
            재면 max−min 이 그 신호로 채워져, 링을 꺼도 Δ 가 **한 소수점까지 똑같이** 나온다
            (첫 실행 실측: ON 17.47 / 링 끔 17.47 — 음성항이 이 오염을 그대로 잡아냈다).
            15회차 교훈 1 «자를 댔는데 끝을 못 밟는다» 의 변주이자, «자를 안 댄 곳은 무결점» 의 반대 짝이다.
            → **링만 남기고 나머지 jz122 를 끈 채** 잰다(격리). 격리 자체가 부작용을 낳지 않는다는 것은
            음성항(링까지 끄면 Δ 가 무너진다)이 보증한다. */
      await p.evaluate(() => { S.daily.freeSum = {}; renderShopPage(); });
      await p.waitForTimeout(200);
      /* ⚠ 격리에는 순서가 있다 — 19회차에 이것도 틀렸다(LESSONS 60-⑤ 첫 함정의 재발).
         `seek()` 가 한 번이라도 `pause()` 한 CSS 애니메이션은 **API 소유**가 되어, 규칙을 지워도
         취소되지 않는다. 그래서 «animation-name:none 만» 으로 만든 음성항은 링이 그대로 살아 있어
         ON 과 **소수점까지 같은 값**을 냈다(둘 다 15.86). 반대로 cancel 만 하면, 규칙이 그대로일 때
         UA 는 애니메이션을 다시 만들지 않아 대상까지 죽는다(둘 다 0).
         → ① 전부 끄고 ② cancel 로 API 소유분을 걷어낸 뒤 ③ **그 다음에** 대상만 다시 켠다
           (computed animation-name 이 «바뀌어야» 새 애니메이션이 생긴다). 이 순서로 음성항이 0 이 된다. */
      const isoOn = async sel => {
        await p.evaluate(() => {
          const st = document.getElementById('v122iso25') || document.createElement('style');
          st.id = 'v122iso25';
          st.textContent = '*,*::before,*::after{animation-name:none !important}';
          document.head.appendChild(st);
          document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
        });
        if (sel) await p.evaluate(s => {
          const st = document.getElementById('v122iso25');
          st.textContent += s + '{animation-name:' + (/b1/.test(s) ? 'jz122Ring' : 'jz122RingP') + ' !important}';
        }, sel);
      };
      /* 격리를 풀 때도 순서가 있다. 대상 링은 seek 가 pause 해서 **API 소유**가 된 상태인데,
         스타일만 지우면 그 링의 computed animation-name 은 그대로(jz122RingP)라 소유가 안 풀린다
         — 뒤 절이 «멈춘 링» 을 보게 된다. 이름을 한 번 none 으로 **바꿨다가** 되돌려 새 애니메이션을
         만들게 한다(다른 요소들은 격리 규칙이 지워지는 것만으로 이름이 바뀌어 저절로 새로 산다). */
      const isoOff = async () => {
        await p.evaluate(() => {
          const s = document.getElementById('v122iso25');
          if (s) s.textContent = '*,*::before,*::after{animation-name:none !important}';
          document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
        });
        await p.evaluate(() => { const s = document.getElementById('v122iso25'); if (s) s.remove(); });
        await p.waitForTimeout(60);
      };
      /* ① 10칸(5카드 × b2·b3) 전부에 `jz122RingP` 가 걸렸는가 — 선언이 아니라 computed 로 본다 */
      const anim = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card')]
        .flatMap(c => ['b2', 'b3'].map(k => {
          const e = c.querySelector('.cbtn.' + k);
          return e ? getComputedStyle(e).animationName : 'none';
        })));
      ok(anim.length >= 8 && anim.every(v => v === 'jz122RingP'),
        '가격 버튼 ' + anim.length + '칸 전부 jz122RingP (' + anim.filter(v => v === 'jz122RingP').length + '/' + anim.length + ')');
      /* ② 카드 안 위상 격자 — b1↔b2↔b3 가 각각 주기의 1/3(33.3%) 만큼 벌어졌는가.
         `--jz-per` 배율이 걸리므로 «초» 가 아니라 **주기 대비 비율**로 잰다. */
      const ph = await p.evaluate(() => {
        const c = document.querySelector('#shopList .shp-card'); if (!c) return null;
        const g = k => {
          const e = c.querySelector('.cbtn.' + k); if (!e) return null;
          const s = getComputedStyle(e);
          const T = parseFloat(s.animationDuration) * (/ms$/.test(s.animationDuration) ? .001 : 1);
          const d = parseFloat(s.animationDelay) * (/ms$/.test(s.animationDelay) ? .001 : 1);
          return T > 0 ? { T, d } : null;
        };
        const b1 = g('b1'), b2 = g('b2'), b3 = g('b3');
        if (!b1 || !b2 || !b3) return null;
        const frac = (a, b) => { const v = Math.abs((a.d - b.d) / a.T % 1); return +(Math.min(v, 1 - v) * 100).toFixed(1); };
        return { p12: frac(b1, b2), p23: frac(b2, b3), p13: frac(b1, b3) };
      });
      if (ph) {
        console.log('    · 카드 안 위상차 b1↔b2 ' + ph.p12 + '% | b2↔b3 ' + ph.p23 + '% | b1↔b3 ' + ph.p13 + '%');
        ok([ph.p12, ph.p23, ph.p13].every(v => v >= 30),
          '카드 안 맞닿은 3칸이 전부 위상 규약(≥33%, 오차 3%p) 안 — 최소 '
          + Math.min(ph.p12, ph.p23, ph.p13) + '%');
      } else ok(false, '카드 안 위상을 못 읽었다(b1·b2·b3 중 하나가 없다)');
      /* ②-2 본문 전면 광택의 **카드 사이** stride — 19회차에 0.2T → 0.4T 로 옮긴 자리(2인 일치).
         자를 안 두면 다음 세션이 딜레이 다섯 줄 중 하나만 고쳐도 아무도 모른다. */
      const swPh = await p.evaluate(() => {
        const cs = [...document.querySelectorAll('#shopList .shp-card')].slice(0, 5).map(c => {
          const s = getComputedStyle(c.querySelector('.cfr'), '::after');
          const num = v => parseFloat(v) * (/ms$/.test(v) ? .001 : 1);
          return { T: num(s.animationDuration), d: num(s.animationDelay) };
        });
        if (cs.length < 2 || !cs[0].T) return null;
        const T = cs[0].T;
        const frac = (a, b) => { const v = Math.abs((a - b) / T % 1); return +(Math.min(v, 1 - v) * 100).toFixed(1); };
        return { T, nb: cs.slice(1).map((c, i) => frac(c.d, cs[i].d)) };
      });
      if (swPh) {
        console.log('    · 본문 전면 광택(T=' + swPh.T + 's) 맞닿은 카드 위상차 ' + swPh.nb.join('% / ') + '%');
        ok(swPh.nb.every(v => v >= 33), '본문 전면 광택도 맞닿은 쌍 ≥33% — 최소 ' + Math.min(...swPh.nb)
          + '% (19회차 이전 20.0% · AO[1]·AP[7] 2인 일치)');
      } else ok(false, '본문 전면 광택 위상을 못 읽었다');
      /* ③ 버튼 밖 2~14px 띠의 Δ루마 — §17 과 같은 자, 밴드만 다르다 */
      const bandAmp = async (sel, per, phases) => {
        const clip = await p.evaluate(s => {
          const e = document.querySelector(s); if (!e) return null;
          e.scrollIntoView({ block: 'center' });
          const r = e.getBoundingClientRect();
          const x = Math.round(r.x) - 14, y = Math.round(r.y) - 14;
          const w = Math.round(r.width) + 28, h = Math.round(r.height) + 28;
          if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
          return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
        }, sel);
        if (!clip) return null;
        const { iw, ih, ...box } = clip, vals = [];
        for (let i = 0; i < phases; i++) {
          const b64 = (await shotAt(p, Math.round(per * i / phases), box)).toString('base64');
          vals.push(await p.evaluate(async ([src, w, h]) => {
            const img = new Image();
            await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data;
            let s = 0, n = 0;
            for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
              if (x >= 14 && x < 14 + w && y >= 14 && y < 14 + h) continue;
              if (x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2) continue;
              const j = (y * c.width + x) * 4;
              s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n++;
            }
            return n ? +(s / n).toFixed(2) : null;
          }, [b64, iw, ih]));
        }
        const v = vals.filter(x => x != null);
        return v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(2) : null;
      };
      await isoOn('#shopList .shp-card .cbtn.b2');
      const dP = await bandAmp('#shopList .shp-card .cbtn.b2', 900, 12);
      await isoOn('#shopList .shp-card .cbtn.b1');
      const dF = await bandAmp('#shopList .shp-card .cbtn.b1', 900, 12);
      await isoOff();
      console.log('    · [10회] 보조 링 Δ' + dP + ' | 같은 카드 [무료] 링 Δ' + dF
        + ' → 비 ' + (dP != null && dF ? (dP / dF).toFixed(2) : '?') + '  (둘 다 링만 남긴 격리 측정)');
      ok(dP != null && dP >= RP_LO && dP <= RP_HI,
        '보조 링 Δ루마 ' + dP + ' 가 보조 밴드(' + RP_LO + '~' + RP_HI + ') 안');
      ok(dP != null && dF > 0 && dP / dF >= RATIO_LO && dP / dF <= RATIO_HI,
        '보조 링이 [무료]의 ' + (dP != null && dF ? Math.round(dP / dF * 100) : '?') + '% — 주 CTA 우위 유지('
        + (RATIO_LO * 100) + '~' + (RATIO_HI * 100) + '%)');
      /* ④ bbox Δ0 — box-shadow 만 움직이므로 버튼 기하·히트영역은 한 픽셀도 안 변해야 한다
         (⚠ 이 자리에서 transform 을 쓰면 VERIFY102 가 깨진다 — 작업 136 이 데인 자리) */
      const brects = () => p.evaluate(() => [...document.querySelectorAll('#shopList .cbtn')]
        .map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(','); }));
      await seek(p, 0); const r0 = await brects();
      await seek(p, 300); const r1 = await brects();
      await seek(p, 765); const r2 = await brects();
      const rdiff = r0.map((v, i) => (v === r1[i] && v === r2[i]) ? null : v + ' → ' + r1[i] + ' / ' + r2[i]).filter(Boolean);
      ok(r0.length >= 8 && rdiff.length === 0, '소환 버튼 bbox 3위상 동일 (' + r0.length + '칸)'
        + (rdiff.length ? ' — ' + rdiff.slice(0, 2).join(' ;; ') : ''));
      /* ⑤ 음성항 — 같은 격리 상태에서 링까지 끄면 Δ 가 무너져야 한다.
         (이 음성항이 19회차 첫 실행에서 «자가 링을 안 보고 있다» 를 잡아낸 자다 — 없었으면
          Δ17.47 을 «보조 링이 세다» 로 읽고 진짜 세기를 못 본 채 상수만 만졌을 것이다.) */
      await isoOn(null);
      const dNeg = await bandAmp('#shopList .shp-card .cbtn.b2', 900, 12);
      ok(dNeg != null && dNeg < RP_LO,
        'ⓝ 음성항 — 격리 상태에서 링까지 끄면 Δ 가 ' + dNeg + ' 로 무너진다 (< ' + RP_LO + ')');
      await isoOn('#shopList .shp-card .cbtn.b2');
      const dBack = await bandAmp('#shopList .shp-card .cbtn.b2', 900, 12);
      await isoOff();
      ok(dBack != null && dBack >= RP_LO && dBack <= RP_HI, 'ⓝ 원상 복귀 — Δ' + dBack);

      /* ⑥ 버튼 글자 잉크 — §24 는 **헤더 제목**만 봤다. 19회차 AP[2] 가 그 밖(가격 버튼)에서
         잉크 상승 +9~11 을 쟀고, «자를 안 댄 곳은 자동으로 무결점» 이 다섯 번째로 재발했다.
         ⚠ 다만 AP 의 자는 **`.cost` 상자 전체의 luma<40** 이라 글자 획 말고 가격 알약(`.pan`)·젬
         아이콘의 어두운 화소까지 같이 센다. 내 실측: 글자 z-index 를 2 → 9 로 올려도 상승은
         9.04 → 8.80 으로 **안 움직였고**(광택 위였다면 0 이 됐어야 한다), `.pan` 을 빼면 3.78 로 떨어졌다.
         → 여기서는 **획만 있는 라벨 행**(`.lab`)에 자를 대 회귀를 막고, 가격 행의 잔여분은
         review 19회차에 수치로 남겨 20회차가 «알약을 뺀 마스크» 로 다시 판정한다. */
      const LAB_HI = 3.0;
      const labStops = [40, 280, 520, 760, 1000, 1240, 1480, 1720, 1960, 2200, 2440, 2680, 2920, 3160, 3400, 3640, 3880, 4120, 4360, 4600];
      for (const [nth, key] of [[1, 'b1'], [1, 'b3'], [4, 'b3']]) {
        const sel = '#shopList .shp-card:nth-child(' + nth + ') .cbtn.' + key + '>.lab';
        const r = await inkRise(p, sel, labStops);
        if (r && r.n) {
          console.log('    · 칸' + nth + ' ' + key + ' 라벨 잉크 ' + r.n + 'px · 한 주기 최대 상승 ' + r.rise.toFixed(2));
          ok(r.rise < LAB_HI, '칸' + nth + ' ' + key + ' 라벨 잉크 상승 ' + r.rise.toFixed(2) + ' < ' + LAB_HI
            + ' (본문 전면 광택이 버튼 글자를 못 깎는다)');
        } else ok(false, '칸' + nth + ' ' + key + ' 라벨 잉크 마스크를 못 떴다');
      }
    }

    /* ── §26 칸별 [무료] 링 세기 — **두 자로** 잰다 (20회차 신설) ──────────
       19회차 비평가 2인이 독립으로 «칸마다 1.7~2.6배» 를 짚었고(AP[1]·AO[13]), 격리 실측도
       Δ루마 2.05배로 재현했다. 그런데 **자를 하나 더 대니 부호가 갈렸다.**

       Δ루마 자는 칸3(금색 면)을 «가장 약함(13.3)» 으로 읽는데, 같은 표본을 **ΔE(CIELAB)** 로 재면
       칸3 이 **가장 셈(22.0)** 이다. 청록 링(luma 200)과 금색 면(luma 195)은 **밝기가 거의 같고
       색상만 반대**라, 글로우가 얹혀도 루마가 안 움직인다 — 루마 자가 구조적으로 못 보는 자리다.
       Δ루마 처방(칸3 ×1.66)을 따랐으면 «가장 튀는 링을 두 배로 더 키울» 뻔했다(12회차 «계측 정의가
       다르면 일치해도 틀린다» 의 재발).

       그래서 이 절은 **두 산포를 같이 잰다.** 한쪽만 조이면 다른 쪽이 무너지기 때문이다 —
       ΔE 만 맞추면 칸3 이 rk .42 까지 눌려 Δ루마가 7.4 가 되고(14회차가 «너무 약하다» 며 올린 자리),
       Δ루마만 맞추면 ΔE 가 무너진다. 20회차 배정은 «ΔE 산포를 기준보다 나쁘게 않으면서 Δ루마
       산포를 최소화» 한 값이다(2.05 → 1.65배 · ΔE 1.43배 유지).
       ⚠ 칸1 은 §17 이 [무료] 링을 재는 칸이라 rk 1.0 고정이다 — 내리면 §17 밴드 하한에 붙는다. */
    console.log('§26 칸별 [무료] 링 세기 — Δ루마 · ΔE(Lab) 두 자 (20회차 신설)');
    {
      const SPREAD_L = 1.85, SPREAD_E = 1.55;
      await p.evaluate(() => { S.daily.freeSum = {}; renderShopPage(); });
      await p.waitForTimeout(200);
      const on26 = async sel => {
        await p.evaluate(() => {
          const st = document.getElementById('v122iso26') || document.createElement('style');
          st.id = 'v122iso26';
          st.textContent = '*,*::before,*::after{animation-name:none !important}';
          document.head.appendChild(st);
          document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
        });
        if (sel) await p.evaluate(s2 => {
          document.getElementById('v122iso26').textContent += s2 + '{animation-name:jz122Ring !important}';
        }, sel);
      };
      const off26 = async () => {
        await p.evaluate(() => {
          const s2 = document.getElementById('v122iso26');
          if (s2) s2.textContent = '*,*::before,*::after{animation-name:none !important}';
          document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
          const s3 = document.getElementById('v122iso26'); if (s3) s3.remove();
        });
        await p.waitForTimeout(60);
      };
      /* 한 요소를 한 주기 훑어 (Δ루마, ΔE) 를 같이 낸다 — 버튼 밖 2~14px 띠(§17 과 같은 마스크) */
      const both = async sel => {
        const clip = await p.evaluate(s2 => {
          const e = document.querySelector(s2); if (!e) return null;
          e.scrollIntoView({ block: 'center' });
          const r = e.getBoundingClientRect();
          const x = Math.round(r.x) - 14, y = Math.round(r.y) - 14;
          const w = Math.round(r.width) + 28, h = Math.round(r.height) + 28;
          if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
          return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
        }, sel);
        if (!clip) return null;
        const { iw, ih, ...box } = clip, cols = [], lum = [];
        for (let i = 0; i < 10; i++) {
          const b64 = (await shotAt(p, Math.round(900 * i / 10), box)).toString('base64');
          const v = await p.evaluate(async ([src, w, h]) => {
            const img = new Image();
            await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data;
            let R = 0, G = 0, B = 0, L = 0, n = 0;
            for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
              if (x >= 14 && x < 14 + w && y >= 14 && y < 14 + h) continue;
              if (x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2) continue;
              const j = (y * c.width + x) * 4;
              R += d[j]; G += d[j + 1]; B += d[j + 2];
              L += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n++;
            }
            return n ? [[R / n, G / n, B / n], L / n] : null;
          }, [b64, iw, ih]);
          if (v) { cols.push(v[0]); lum.push(v[1]); }
        }
        if (!lum.length) return null;
        const lab = ([R, G, B]) => {
          const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
          const r = f(R), g = f(G), b = f(B);
          const X = (.4124 * r + .3576 * g + .1805 * b) / .95047;
          const Y = (.2126 * r + .7152 * g + .0722 * b);
          const Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
          const k = t => t > .008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
          return [116 * k(Y) - 16, 500 * (k(X) - k(Y)), 200 * (k(Y) - k(Z))];
        };
        const L2 = cols.map(lab);
        let dE = 0;
        for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++)
          dE = Math.max(dE, Math.hypot(L2[i][0] - L2[j][0], L2[i][1] - L2[j][1], L2[i][2] - L2[j][2]));
        return { dL: +(Math.max(...lum) - Math.min(...lum)).toFixed(2), dE: +dE.toFixed(2) };
      };
      const got = [];
      for (let i = 1; i <= 5; i++) {
        const sel = '#shopList .shp-card:nth-child(' + i + ') .cbtn.b1';
        const live = await p.evaluate(s2 => {
          const e = document.querySelector(s2);
          return !!e && !e.classList.contains('lack');
        }, sel);
        if (!live) continue;
        await on26(sel);
        const m = await both(sel);
        await off26();
        if (m) got.push({ i, ...m });
      }
      if (got.length >= 4) {
        console.log('    · ' + got.map(g => '칸' + g.i + ' L' + g.dL + '/E' + g.dE).join(' | '));
        const Ls = got.map(g => g.dL), Es = got.map(g => g.dE);
        const sL = Math.max(...Ls) / Math.min(...Ls), sE = Math.max(...Es) / Math.min(...Es);
        console.log('    · 산포 — Δ루마 ' + sL.toFixed(2) + '배 (20회차 이전 2.05배) · ΔE '
          + sE.toFixed(2) + '배');
        ok(sL <= SPREAD_L, '칸별 Δ루마 산포 ' + sL.toFixed(2) + '배 ≤ ' + SPREAD_L
          + ' (19회차 AP[1]·AO[13] 2인 일치 지적 — 그때 2.05배)');
        ok(sE <= SPREAD_E, '칸별 ΔE(Lab) 산포 ' + sE.toFixed(2) + '배 ≤ ' + SPREAD_E
          + ' — 루마만 맞추다 색차가 무너지는 것을 막는 자');
      } else ok(false, '칸별 링을 4칸 이상 못 쟀다 (' + got.length + '칸)');
      /* ⓝ 음성항 — 링을 끄면 ΔE 가 무너져야 한다. 15회차 교훈 2: 새 자에는 음성항을 같은 회차에.
         (이 자가 «링이 아니라 딴것» 을 보고 있으면 여기서 0 이 안 나온다) */
      await on26('#shopList .shp-card:nth-child(3) .cbtn.b1');
      await p.evaluate(() => {
        document.getElementById('v122iso26').textContent +=
          '#shopList .shp-card:nth-child(3) .cbtn.b1{box-shadow:none !important}';
      });
      const neg26 = await both('#shopList .shp-card:nth-child(3) .cbtn.b1');
      await off26();
      ok(neg26 && neg26.dE < 2, 'ⓝ 음성항 — 링 box-shadow 를 끄면 ΔE 가 '
        + (neg26 ? neg26.dE : '?') + ' 로 무너진다 (< 2)');
    }

    /* ── §27 광택이 «버튼 검은 획» 을 씻지 않는가 (22회차 신설) ────────────
       21회차 AS 5: 칸1 [무료] 버튼 아래 테두리가 (0,0,0) → (63,63,63). AT 는 이 자리를 안 쟀다.
       §24·§25 는 **글자 잉크**만 봤고 카드 바깥 테두리는 `.cfr{overflow:hidden}` 이 구조적으로
       지켜 줬다 — 그 사이에 낀 **버튼 테두리**에만 자가 없었다(«자를 안 댄 곳은 자동으로
       무결점» 의 여섯 번째 재발). 22회차 실측(고치기 전): 소환 버튼 평균 **+12.5~15.9** ·
       화소 최대 **+63.9**(AS 의 63 과 같은 값) · 재화 [받기] 버튼 **+5.27**.

       ⚠ 마스크는 §24-8 의 교훈대로 **«상자» 가 아니라 «획»** 이다 — 버튼 상자 전체의 luma<40 을
       세면 가격 알약·젬의 어두운 화소가 섞여 «획이 씻긴다» 가 아닌 것을 그렇게 읽는다.
         마스크 = border-box 변에서 bw px 이내(테두리 링) ∩ 광택을 끈 기준 프레임에서 luma < 40
       대조군을 같이 둔다: 카드 바깥 테두리(구조적 보호)와 라벨 잉크(z-index 로 보호)는 ≈0 이어야 한다. */
    console.log('§27 광택이 버튼 «검은 획» 을 씻지 않는가 (22회차 신설 — 21회차 AS 5)');
    {
      const STK_HI = 3.0, STK_NEG_LO = 8.0;
      const spat = txt => p.evaluate(x => {
        let e = document.getElementById('v122stk');
        if (!x) { if (e) e.remove(); return; }
        if (!e) { e = document.createElement('style'); e.id = 'v122stk'; document.head.appendChild(e); }
        e.textContent = x;
      }, txt);
      /* 링 밴드(테두리 안쪽 bw px)의 픽셀 열 — 마스크는 호출자가 고른다 */
      const ring = async (box, iw, ih, pad, bw) => {
        const b64 = (await p.screenshot({ clip: box })).toString('base64');
        return await p.evaluate(async ([src, w, h, pd, b]) => {
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          const out = [];
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            const ix = x - pd, iy = y - pd;
            if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
            if (Math.min(ix, iy, w - 1 - ix, h - 1 - iy) >= b) continue;
            const j = (y * c.width + x) * 4;
            out.push(.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]);
          }
          return out;
        }, [b64, iw, ih, pad, bw]);
      };
      const strokeRise = async (sel, bw, per, offCss) => {
        const PAD = 2;
        await seek(p, 0);                        /* ⚑ clip 전에 등장 애니메이션을 걷는다(§17 과 같은 함정) */
        const clip = await p.evaluate(([s, pd]) => {
          const e = document.querySelector(s); if (!e) return null;
          e.scrollIntoView({ block: 'center' });
          const r = e.getBoundingClientRect();
          const x = Math.round(r.x) - pd, y = Math.round(r.y) - pd;
          const w = Math.round(r.width) + pd * 2, h = Math.round(r.height) + pd * 2;
          if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
          return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
        }, [sel, PAD]);
        if (!clip) return null;
        const { iw, ih, ...box } = clip;
        const keep = await p.evaluate(() => {
          const e = document.getElementById('v122stk'); return e ? e.textContent : '';
        });
        await spat(keep + offCss);               /* 광택만 끈 기준 프레임에서 «획» 을 고른다 */
        await seek(p, 0);
        const base = await ring(box, iw, ih, PAD, bw);
        await spat(keep);
        const mask = base.map((v, i) => (v < 40 ? i : -1)).filter(i => i >= 0);
        if (mask.length < 120) return { few: mask.length };
        const b0 = mask.reduce((s, i) => s + base[i], 0) / mask.length;
        let hi = -1e9;
        for (let i = 0; i < 16; i++) {
          await seek(p, Math.round(per * i / 16));
          const v = await ring(box, iw, ih, PAD, bw);
          const m = mask.reduce((s, k) => s + v[k], 0) / mask.length;
          if (m > hi) hi = m;
        }
        return { n: mask.length, rise: +(hi - b0).toFixed(2) };
      };
      const OFF_SUM = '.shp-card>.cfr::after{display:none!important}';
      const OFF_CN = '.cn-cd>.fr::after,.cn-cd>.fr::before{display:none!important}';
      const check = async (label, sel, bw, per, off) => {
        const r = await strokeRise(sel, bw, per, off);
        if (!r || !r.n) { ok(false, label + ' 획 마스크를 못 떴다' + (r ? ' (' + r.few + 'px)' : '')); return null; }
        console.log('    · ' + label + ' 획 ' + r.n + 'px · 한 주기 평균 상승 +' + r.rise.toFixed(2));
        ok(r.rise < STK_HI, label + ' 획 상승 +' + r.rise.toFixed(2) + ' < ' + STK_HI
          + ' (광택이 검은 획을 못 씻는다)');
        return r;
      };
      /* ⓐ 대조군 — 구조적/z-index 로 이미 보호된 두 자리 */
      await check('대조 카드 바깥 테두리', '#shopList .shp-card:nth-child(1)>.cfr', 7, 5400, OFF_SUM);
      await check('대조 칸1 b3 라벨 잉크', '#shopList .shp-card:nth-child(1) .cbtn.b3>.lab', 99, 5400, OFF_SUM);
      /* ⓑ 소환 버튼 3종 + 다른 칸 하나 */
      for (const [lab, sel] of [['칸1 b1', '#shopList .shp-card:nth-child(1) .cbtn.b1'],
                                ['칸1 b2', '#shopList .shp-card:nth-child(1) .cbtn.b2'],
                                ['칸1 b3', '#shopList .shp-card:nth-child(1) .cbtn.b3'],
                                ['칸4 b3', '#shopList .shp-card:nth-child(4) .cbtn.b3']]) {
        await check(lab + ' 버튼', sel, 6, 5400, OFF_SUM);
      }
      /* ⓒ 사본이 «좌표를 새로 안 적는다» 는 것을 자로 못 박는다 — 링과 버튼의 rect 가 같아야 한다 */
      const same = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('#shopList .shp-card').forEach(c => {
          ['b1', 'b2', 'b3'].forEach(k => {
            const a = c.querySelector('.cbtn.' + k), b = c.querySelector('.stk' + k.slice(1));
            if (!a || !b) { bad.push(k + ' 짝 없음'); return; }
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            ['x', 'y', 'width', 'height'].forEach(p2 => {
              if (Math.abs(ra[p2] - rb[p2]) > 0.01) bad.push(k + '.' + p2 + ' Δ' + (rb[p2] - ra[p2]).toFixed(2));
            });
          });
        });
        return bad;
      });
      ok(same.length === 0, '획 사본 rect = 버튼 rect (기하 단일 출처)' + (same.length ? ' — ' + same.slice(0, 3).join(' ;; ') : ''));
      /* ⓓ 사본은 히트영역을 안 건드린다 */
      const pe = await p.evaluate(() => [...document.querySelectorAll('#shopList .stk')]
        .filter(e => getComputedStyle(e).pointerEvents !== 'none').length);
      ok(pe === 0, '획 사본 전부 pointer-events:none (' + pe + '개 위반)');
      const ds = await p.evaluate(() => [...document.querySelectorAll('#shopList .stk[data-shsum],#shopList .stk[data-cnad],#shopList .stk[data-diabuy],#shopList .stk[data-ex],#shopList .stk[data-dunex]')].length);
      ok(ds === 0, '획 사본에 동작 data-* 없음 (' + ds + '개 위반)');
      /* ⓝ 음성항 — 사본을 걷으면 자가 다시 빨개져야 한다(자가 «딴것» 을 보고 있으면 여기서 안 오른다) */
      await spat('.shp-card .stk{display:none!important}');
      const neg = await strokeRise('#shopList .shp-card:nth-child(1) .cbtn.b3', 6, 5400, OFF_SUM);
      await spat('');
      ok(neg && neg.rise > STK_NEG_LO, 'ⓝ 음성항 — 획 사본을 걷으면 상승 +'
        + (neg ? neg.rise.toFixed(2) : '?') + ' > ' + STK_NEG_LO + ' (22회차 이전 실측 +15.87)');

      /* ⓕ 22회차 채점(AU❷·AV[1] 2인 일치)이 찾은 **네 번째 자리** — Lv 게이지 검은 프레임.
         `.clv`(Lv 알약)는 5회차부터 `z-index:2` 라 이미 광택 위였는데 바로 옆 `.cbar` 만 빠져 있었다
         (실측 칸2 +7.43 · 칸3 +10.52 · 화소 최대 +83). 트랙은 광택 아래로 남겨 ①-7 을 안 깬다. */
      for (const [lab, nth] of [['칸2 Lv 게이지', 2], ['칸3 Lv 게이지', 3]]) {
        await check(lab, '#shopList .shp-card:nth-child(' + nth + ') .cbar', 3, 5400, OFF_SUM);
      }
      const barSame = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('#shopList .shp-card').forEach((c, i) => {
          const a = c.querySelector('.cbar'), b = c.querySelector('.stkbar');
          if (!a || !b) { bad.push('칸' + i + ' 짝 없음'); return; }
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          ['x', 'y', 'width', 'height'].forEach(k => {
            if (Math.abs(ra[k] - rb[k]) > 0.01) bad.push('칸' + i + '.' + k + ' Δ' + (rb[k] - ra[k]).toFixed(2));
          });
        });
        return bad;
      });
      ok(barSame.length === 0, 'Lv 게이지 획 사본 rect = 게이지 rect' + (barSame.length ? ' — ' + barSame.slice(0, 3).join(' ;; ') : ''));

      /* ⓔ 재화 탭 — 같은 결함의 다른 판(20회차가 글자만 z5 로 올리고 `.bt` 자신은 두고 갔다) */
      await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
      await p.waitForTimeout(200);
      await check('재화 [받기] 버튼', '#shopList .cn-cd>.bt', 5, 4800, OFF_CN);
      const csame = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('#shopList .cn-cd').forEach((c, i) => {
          const a = c.querySelector(':scope>.bt'), b = c.querySelector(':scope>.btstk');
          if (!a && !b) return;                          /* 구매 완료 칸은 버튼이 아예 없다 */
          if (!a || !b) { bad.push('칸' + i + ' 짝 없음'); return; }
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          ['x', 'y', 'width', 'height'].forEach(p2 => {
            if (Math.abs(ra[p2] - rb[p2]) > 0.01) bad.push('칸' + i + '.' + p2 + ' Δ' + (rb[p2] - ra[p2]).toFixed(2));
          });
        });
        return bad;
      });
      ok(csame.length === 0, '재화 획 사본 rect = 버튼 rect' + (csame.length ? ' — ' + csame.slice(0, 3).join(' ;; ') : ''));
      /* ⓖ 22회차 채점이 찾은 나머지 두 자리 — [받기] «안» ▶AD 아이콘(AU❸·AV[2] 2인 일치, 실측 +23.62) ·
         재화 상품 아이콘 잉크(AU❶, 얼려서 +17.15) · 평생 배너 아트 잉크(AV[4], 얼려서 +6.94).
         ⚠ 이 셋은 **움직이는 요소**라 얼리지 않고 재면 «둥실» 이 통째로 섞인다 —
         AV[4] 의 +20.24 중 2/3, AU❶ 의 +34.33 중 절반이 그것이었다(§24-8 함정의 사촌).
         그래서 이 절만 `--jz-amp:0` 으로 **얼려서** 잰다. 자 바닥은 대조군(재화 카드 제목)이 준다. */
      await p.evaluate(() => document.getElementById('shopw').style.setProperty('--jz-amp', '0'));
      /* 자 «바닥» 을 대조군이 준다 — 요소 전체 마스크(luma<40)는 글리프 가장자리의 반투명 화소를
         같이 세므로 **아래 층의 배경 스윕**이 통과해 0 이 안 된다. 절대 0 을 요구하면 자가 거짓말을
         하게 되므로, 이 절은 «대조군보다 더 들리지 않는가» 로 판정한다. */
      const floor = await strokeRise('#shopList .cn-cd>.hd>i', 99, 4800, OFF_CN);
      const fv = (floor && floor.n) ? floor.rise : null;
      console.log('    · 자 바닥 = 대조 재화 카드 제목 +' + (fv == null ? '?' : fv.toFixed(2))
        + ' (아래 층 배경 스윕이 글리프 반투명 가장자리로 비친 몫)');
      ok(fv != null, '자 바닥(대조 재화 카드 제목)을 쟀다');
      for (const [lab, sel, per] of [['[받기] 안 ▶AD 아이콘', '#shopList .cn-cd>.bt>.ad', 4800],
                                     ['재화 상품 아이콘 잉크', '#shopList .cn-cd>.pn', 4800],
                                     ['평생 배너 아트 잉크', '#shopList .cn-a2>em', 6400]]) {
        const r = await strokeRise(sel, 99, per, OFF_CN);
        if (!r || !r.n) { ok(false, lab + ' 잉크 마스크를 못 떴다'); continue; }
        console.log('    · ' + lab + '(얼림) 잉크 ' + r.n + 'px · 상승 +' + r.rise.toFixed(2));
        ok(fv != null && r.rise <= fv + STK_HI, lab + '(얼림) 상승 +' + r.rise.toFixed(2)
          + ' ≤ 바닥+' + STK_HI + ' (= ' + (fv == null ? '?' : (fv + STK_HI).toFixed(2)) + ')');
      }
      await p.evaluate(() => document.getElementById('shopw').style.removeProperty('--jz-amp'));
      await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
      await p.waitForTimeout(200);
    }

    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(200);
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

  /* ── §20 숨쉬기 진폭이 «캡처 격자에 걸리는가» (15회차 신설) ──────
     §18 과 같은 자를 숨쉬기(scale)에도 댄다. 14회차 채점에서 **둘이 독립으로** 진폭 미달을 쟀는데
     (AI 3.4~3.7% · AJ 3.50~4.42%, 사양 4.0%) 코드는 1 → 1.04 로 사양대로였다 —
     정점이 «순간» 이라 320ms 격자가 못 밟는 §18 과 **완전히 같은 사고**다.
     주기 2.4~3.2s 에서 표본은 정점에서 최대 ±160ms 떨어지고, 그때 읽히는 값이 0.91×사양이다.
     15회차 처방(44~56% 정점 유지)이 실제로 격자에 걸리는지를 여기서 판정한다. */
  console.log('§20 숨쉬기 정점 — 320ms 캡처 격자에서 읽히는 scale');
  {
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
    const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640];
    const seen = new Map();
    for (const t of STOPS) {
      await seek(p, t);
      const rows = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card .cart')]
        .map((e, i) => [i + 1, parseFloat((getComputedStyle(e).scale || '1').split(' ')[0]) || 1]));
      for (const [i, sc] of rows) {
        const cur = seen.get(i) || { lo: 9, hi: 0 };
        seen.set(i, { lo: Math.min(cur.lo, sc), hi: Math.max(cur.hi, sc) });
      }
    }
    const got = [...seen.entries()].sort((a, b) => a[0] - b[0]);
    const amp = ([, v]) => (v.hi - v.lo) * 100;
    console.log('    · ' + got.map(g => '칸' + g[0] + ' ' + amp(g).toFixed(2) + '%').join(' | '));
    /* 사양 4.0% 의 90% 이상이 격자에서 읽혀야 한다(정점 유지 구간이 표본 간격과 맞먹는지). */
    const bad = got.filter(g => amp(g) < 3.6).map(g => '칸' + g[0] + ' ' + amp(g).toFixed(2) + '%');
    ok(got.length >= 5, '숨쉬기 측정 대상 ' + got.length + '칸 (>=5)');
    ok(bad.length === 0, '캡처 격자에서 읽히는 숨쉬기 진폭이 전부 3.6% 이상(사양 4.0%)'
      + (bad.length ? ' — 미달 ' + bad.join(' , ') : ''));
    /* 칸끼리의 편차도 본다 — AJ 가 «칸별 진폭 불균일» 을 ② 감점 사유로 들었다 */
    const as = got.map(amp);
    const dev = Math.max(...as) - Math.min(...as);
    ok(dev <= 0.4, '칸별 숨쉬기 진폭 편차 = ' + dev.toFixed(2) + 'pp (<=0.4pp · 14회차 AJ 실측 0.92pp)');
  }

  /* ── §22 소환 1열 리스트의 이웃 위상 (15회차 신설) ────────────────
     §14 는 재화 탭 3열 격자만 본다. 14회차 채점에서 **두 비평가가 독립으로** 소환 탭을 짚었다:
     AI «카드당 정확히 640ms = 0.200T» · AJ «연속 −640ms = P/5 … 같은 3.2s 층인데 재화 탭은 P/2».
     즉 게이트가 안 보는 자리에서 규칙이 갈려 있었다(§14 의 대각 구멍과 같은 계열).
     1열이라 «행 +1/2» 를 그대로 쓰면 1·3·5 칸이 동위상이 되므로, ±1·±2 칸을 이웃으로 놓고
     min 원형거리를 최대화한 **stride 1/3** 이 정답이다(그때 ±1·±2 가 모두 1/3).

     ⚑ 16회차 — **±3 을 빠뜨린 것이 구멍이었다.** stride 1/3 은 3칸 떨어진 쌍을 정확히 한 주기
     차이로 만든다 → 칸1↔칸4 가 **완전 동위상**이다. 16회차 비평가 AK 가 화소로 짚었다:
     «카드1 헤더(y176‑186)와 카드4 헤더(y1613‑1623)의 흰 심 중심이 9위상 전부 0.0~0.5px 차 ·
     t=8300 도 731.8 vs 731.4» — 그리고 **둘은 한 화면에 같이 보인다**(리스트에 4장이 동시에 뜬다).
     ±1·±2 만 보는 게이트는 이걸 볼 수 없었다(§14 의 대각 구멍·§22 자신의 신설 이유와 같은 계열).
     → 이웃 집합을 **±3 까지** 넓힌다. 그러면 stride 1/3 은 여기서 FAIL 하고(0%),
       stride **1/4** 가 ±1 25% · ±2 50% · ±3 25% 로 셋을 동시에 넘긴다.
       1/4 는 칸1↔칸5(±4)가 동위상이 되지만 **4칸 떨어진 쌍은 한 화면에 같이 안 보인다** —
       5칸을 원 위에 고르게 놓는 1/5 은 ±1 이 20% 로 문턱 아래라 못 쓴다. 이 격자의 최선이다.

     ⚑ 18회차 — 위 문단의 «4칸 떨어진 쌍은 한 화면에 같이 안 보인다» 가 **틀렸다.**
     73 강제 상자(`gmBan()`)가 끼면 리스트는 실제로 **5장**이고, 17회차 캡처가 그 다섯 번째를
     찍어 왔다. 18회차 비평가 둘이 독립으로 같은 것을 짚었다:
       AM[7] «0 / 0.248T / 0.500T / 0.760T … stride 1/4 이므로 5번 칸이 화면에 들어오는 순간
              1번 칸과 위상차 **0%**»
       AN[14] «stride T/4 는 칸 5개가 되는 순간 1번–5번이 위상차 0% 가 된다»
     그리고 «±3 까지만 본다» 는 이 게이트의 이웃 집합이 **정확히 그 쌍을 또 비껴갔다** —
     §14 의 대각 구멍 · §22 자신의 신설 이유와 **세 번째로 같은 계열**의 사고다.

     ⚠ 산술: 5점을 원 위에 놓고 **모든 쌍**을 ≥25% 로 만드는 배치는 **존재하지 않는다**
       (균등 배치의 최소 쌍거리가 1/5 = 20% 이고, 그것이 가능한 최댓값이다).
       그러므로 «전 쌍 ≥25%» 라는 옛 문턱 자체가 5칸에서는 만족 불가능한 요구였다.
       → 규약을 둘로 가른다(§0-1 도 같이 고쳤다):
           ⓐ **맞닿은 쌍(±1) ≥ 33%** — 한 화면에서 실제로 나란히 보이는 것은 이웃이다.
           ⓑ **모든 쌍(±1~±4) ≥ 12%** — «둘이 같이 뛴다» 로 읽히는 동위상만 막는다.
         stride **2/5** 가 답이다: 위상 0/.4/.8/.2/.6 → ±1 전부 **40%**, 먼 쌍이 20%.
         옛 stride 1/4 은 ⓑ 에서 **0% 로 FAIL** 한다(아래 음성항이 그것을 확인한다). */
  console.log('§22 소환 1열 리스트 — 맞닿은 쌍 ≥33% · 모든 쌍(±1~±4) ≥12%');
  {
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
    const ph = await p.evaluate(() => [...document.querySelectorAll('#shopList .shp-card>.chd')]
      .map(e => {
        const s = getComputedStyle(e, '::before');
        const dur = parseFloat(s.animationDuration) * (/ms$/.test(s.animationDuration.trim()) ? 1 : 1000);
        const del = parseFloat(s.animationDelay) * (/ms$/.test(s.animationDelay.trim()) ? 1 : 1000);
        if (!isFinite(dur) || dur <= 0 || !isFinite(del)) return null;
        let v = (-del % dur) / dur; if (v < 0) v += 1;
        return { v, dur };
      }).filter(Boolean));
    /* 이웃 집합을 **±4 까지** — 16회차가 ±3 에서 끊어 칸1↔칸5 를 못 봤다 */
    const mk = arr => {
      const out = [];
      for (let i = 0; i < arr.length; i++) for (const d of [1, 2, 3, 4]) {
        const j = i + d; if (j >= arr.length) continue;
        let x = Math.abs(arr[i].v - arr[j].v) % 1; x = Math.min(x, 1 - x);
        out.push({ lab: '칸' + (i + 1) + '↔' + (j + 1), d: x, gap: d, ms: Math.round(x * arr[i].dur) });
      }
      return out;
    };
    const pairs = mk(ph);
    console.log('    · ' + pairs.map(v => v.lab + ' ' + Math.round(v.d * 100) + '%(' + v.ms + 'ms)').join(' | '));
    const adj = pairs.filter(v => v.gap === 1), badA = adj.filter(v => v.d < .33);
    const badB = pairs.filter(v => v.d < .12);
    ok(ph.length >= 4, '소환 카드 ' + ph.length + '장의 헤더 띠 위상을 읽었다 (>=4)');
    ok(badA.length === 0, 'ⓐ 맞닿은 쌍(±1) 위상차가 전부 주기의 33% 이상 — ' +
      adj.map(v => Math.round(v.d * 100) + '%').join('/') +
      (badA.length ? ' — 미달 ' + badA.map(v => v.lab).join(',') : ''));
    ok(badB.length === 0, 'ⓑ 모든 쌍(±1~±4)이 12% 이상 — 동위상으로 붙은 쌍이 없다 (옛 stride 1/4 은 칸1↔5 가 0%)'
      + (badB.length ? ' — 미달 ' + badB.map(v => v.lab + ' ' + Math.round(v.d * 100) + '%').join(' , ') : ''));

    /* ⚑ 음성항 — 15회차 교훈 2 «신설·개정 항목은 음성항 없이 믿지 마라».
       옛 stride 1/4 을 이 자리에서 되살려 놓고 같은 자를 대면 칸1↔5 가 0% 로 잡혀야 한다.
       안 잡히면 위의 PASS 는 아무 뜻이 없다. 확인 뒤 바로 걷어내고 원상 복귀까지 본다. */
    if (ph.length >= 5) {
      const old = ph.map((o, i) => ({ v: (i * 0.25) % 1, dur: o.dur }));
      const oldBad = mk(old).filter(v => v.d < .12);
      ok(oldBad.length > 0, 'ⓝ 음성항 — 옛 stride 1/4 을 같은 자로 재면 동위상 쌍이 잡힌다 (' +
        oldBad.map(v => v.lab + ' ' + Math.round(v.d * 100) + '%').join(' , ') + ')');
      const nowBad = mk(ph).filter(v => v.d < .12);
      ok(nowBad.length === 0, 'ⓝ 원상 복귀 — 음성항이 현재 값을 오염시키지 않았다');
    }
  }

  /* ── §21 골드 광선이 «보이는가» (15회차 신설 · 26회차 = 작업 676 전면 개정) ────────
     15회차가 세운 뜻은 옳다 — «연출 없음은 0점» 이라 «판 위에서 실제로 보이는가» 를 게이트로 내린다.
     바뀐 것은 **재는 법**이다. 15회차의 자는 세 항이 전부 «판의 절대값» 을 봤고,
     판에는 광선 말고 **아이콘(`.pn>em`, `jz122Float` 로 떠 있다)** 이 있다.

     ⚑ 작업 676 재현(`tools/probe676.js`)이 셋을 한꺼번에 못박았다:
       ① 빨갛던 «기여» 항은 **제품이 아니라 창이 낡아서** 빨갛다. 15회차가 «아이콘이 덮는 안쪽은
          빼고 판이 보이는 고리» 로 적어 둔 **r 34..76** 이 지금은 아이콘 자리다 — 아이콘 상자가
          120×157 이라 **r ≤ 60 은 통째로 아이콘**이고(대역별 실측 ON↔OFF 기여가 r 0..72 에서 전부 **0.00**),
          광선의 잉크는 **r 72..96**(대역 기여 31.30 · 67.73)에 있다. 고리는 그 대역의 4px 만 스친다 ⇒ 1.59.
       ② 초록이던 두 항(산포 ≥1.5 · 반주기 ≥1.5)은 **헛초록**이었다. 광선을 끈 판에서 같은 자를 대면
          산포 39.88(ON 39.39) · 반주기 **13.40(ON 13.40 — 소수점까지 같다)** 이다.
          즉 그 둘은 광선이 통째로 사라져도 초록이고, 재고 있던 것은 **아이콘의 둥실**이었다.
       ③ 광선 자체는 멀쩡하다 — `display:none` 이 판의 화소를 실제로 바꾸고(최대 Δ루마 50),
          기여가 가장 큰 대역은 r 84..96 의 **67.73** 이다.

     ⇒ 처방은 **문턱이 아니라 창과 값**이다(672 규약). 문턱 셋(4 · 1.5 · 1.5)은 한 칸도 안 건드렸다.
       · 창 = **판 전체**. 반지름 상수를 새로 적지 않는다 — 낡은 것은 «34..76» 이라는 숫자였고,
         그 자리에 다른 숫자를 적으면 아이콘이 또 자라는 날 같은 부패가 되풀이된다.
       · 값 = **광선을 껐다 켠 차분**(`on − off`). 아이콘·판 배경처럼 광선과 무관한 것은 차분에서 상쇄되므로
         «판의 절대값» 이 섞일 자리가 없다 ⇒ 세 항이 전부 광선만 잰다.
       · 위상은 둘 다 본다(t=0 · t=1250) — 원뿔이 45° 주기라 한 위상만 보면 «그 위상에서 보이는 섹터가
         없다» 는 이유로 헛빨강이 날 수 있다. 기여는 두 위상의 최대, 회전은 두 위상의 차.
       ⚠ 회전 검출의 표본 앨리어싱 주의는 15회차 그대로다: 원뿔이 45° 주기라 패턴은 20s/8 = 2.5s 마다
         되돌아온다. 그래서 Δt=1250ms(반주기)로 본다.
       ⚠ 무르게 푼 수리가 아님은 **§R 되돌림 시험**이 못박는다 — 노드·마스크·회전은 그대로 두고
         **칠(background)만** 걷으면 세 항이 전부 문턱 아래로 내려가야 한다(실측 0.06 / 0.02 / 0.05).
       실측(3회 연속 같은 값): 기여 **8.66**(t=0) · 8.66/5.38(위상별) · 산포 **2.39** · 반주기 변화 **5.38**. */
  console.log('§21 골드 광선 — 판 위에서 실제로 보이는가 (676 개정: 창=판 전체 · 값=ON−OFF 차분)');
  {
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    const box = await p.evaluate(() => {
      const r = document.querySelector('#shopList .cn-cd.dia.top>.pn>.ray');
      if (!r) return null;
      r.scrollIntoView({ block: 'center' });
      const b = r.parentElement.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
    });
    /* 판을 각도 12섹터로 쪼개 R−B(황색도)를 낸다 — 지표 축은 비평가 AJ 와 같다.
       ⚠ «판 평균» 은 이 연출을 재는 자로 못 쓴다(원뿔이 45° 중 17° 만 불투명이라 평균은 0.5 계조도
       안 움직인다 — 15회차 실측 0.46). 그리고 15회차가 쓰던 **고리**도 못 쓴다(위 ①).
       진단용으로 옛 고리(34..76) 값을 같이 찍어 둔다 — 낡았다는 사실이 로그에 남게. */
    const shot = async () => {
      const b64 = (await p.screenshot({ clip: box })).toString('base64');
      return p.evaluate(async src => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const cx = c.width / 2, cy = c.height / 2;
        const sa = new Array(12).fill(0), ca = new Array(12).fill(0);
        const sr = new Array(12).fill(0), cr = new Array(12).fill(0);
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const j = (y * c.width + x) * 4;
          const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy);
          let a = Math.atan2(dy, dx) * 180 / Math.PI; if (a < 0) a += 360;
          const k = Math.min(11, Math.floor(a / 30));
          const yl = d[j] - d[j + 2];                    /* R−B = 황색도 */
          sa[k] += yl; ca[k]++;                          /* 창 = 판 전체 */
          if (rr >= 34 && rr <= 76) { sr[k] += yl; cr[k]++; }   /* 진단 — 15회차의 옛 고리 */
        }
        return {
          all: sa.map((v, i) => ca[i] ? v / ca[i] : 0),
          ring: sr.map((v, i) => cr[i] ? v / cr[i] : 0)
        };
      }, b64);
    };
    const pray = txt => p.evaluate(x => {
      let e = document.getElementById('jz122ray');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'jz122ray'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    const RAY = '.cn-cd.dia.top>.pn>.ray';
    const OFF = RAY + '{display:none!important}';
    const NOPAINT = RAY + '{background:none!important}';
    /* 광선만의 기여를 두 위상에서 뽑는다 — 같은 위상끼리 빼야 아이콘 둥실이 상쇄된다 */
    const rayOnly = async extra => {
      await pray(extra); await seek(p, 0); const o0 = await shot();
      await seek(p, 1250); const o1 = await shot();
      await pray(extra + OFF); await seek(p, 0); const f0 = await shot();
      await seek(p, 1250); const f1 = await shot();
      await pray('');
      const d0 = o0.all.map((v, i) => v - f0.all[i]);
      const d1 = o1.all.map((v, i) => v - f1.all[i]);
      const m = d0.reduce((x, y) => x + y, 0) / d0.length;
      return {
        contrib: Math.max(Math.max(...d0.map(Math.abs)), Math.max(...d1.map(Math.abs))),
        spread: Math.sqrt(d0.reduce((x, y) => x + (y - m) * (y - m), 0) / d0.length),
        spin: Math.max(...d0.map((v, i) => Math.abs(v - d1[i]))),
        ringC: Math.max(...o0.ring.map((v, i) => Math.abs(v - f0.ring[i])))
      };
    };
    if (!box) ok(false, '골드 광선 판(.cn-cd.dia.top>.pn>.ray) 을 찾지 못함');
    else {
      const r = await rayOnly('');
      console.log('    · 기여(두 위상 최대) ' + r.contrib.toFixed(2) + ' · 섹터 산포 ' + r.spread.toFixed(2)
        + ' · 반주기(1250ms) 변화 ' + r.spin.toFixed(2)
        + '   (진단: 15회차의 옛 고리 34..76 으로 재면 ' + r.ringC.toFixed(2) + ' — 지금은 아이콘 자리다)');
      ok(r.contrib >= 4, '골드 광선이 판에 실제로 보인다 — 광선 ON−OFF 섹터 최대 편차 '
        + r.contrib.toFixed(2) + ' (>=4 · 14회차 결과물은 섹터 산포 0.14 로 «없는 것»과 구별이 안 됐다)');
      ok(r.spread >= 1.5, '광선 기여의 각도 산포 = ' + r.spread.toFixed(2)
        + ' (>=1.5 · 원뿔이라 섹터마다 달라야 한다)');
      ok(r.spin >= 1.5, '반주기 뒤 광선 기여가 실제로 돌았다 — 최대 변화 ' + r.spin.toFixed(2) + ' (>=1.5)');

      /* ── §R 되돌림 시험 — 노드·마스크·회전은 그대로, 칠만 걷는다.
         세 항이 «광선이 사라져도 초록» 이 아님을 여기서 못박는다(15회차의 헛초록 재발 방지). */
      const dead = await rayOnly(NOPAINT);
      console.log('    · §R 되돌림(칠만 제거) — 기여 ' + dead.contrib.toFixed(2) + ' · 산포 '
        + dead.spread.toFixed(2) + ' · 반주기 변화 ' + dead.spin.toFixed(2));
      ok(dead.contrib < 4, '§R 칠을 걷으면 기여 항이 빨개진다 (' + dead.contrib.toFixed(2) + ' < 4)');
      ok(dead.spread < 1.5, '§R 칠을 걷으면 산포 항이 빨개진다 (' + dead.spread.toFixed(2) + ' < 1.5)');
      ok(dead.spin < 1.5, '§R 칠을 걷으면 회전 항이 빨개진다 (' + dead.spin.toFixed(2) + ' < 1.5)');
    }
    /* ⚠ 다음 절(§17)은 **소환 탭**에서 시작한다(강제 상자·[무료] 링이 거기에만 있다).
       여기서 재화 탭을 열어 둔 채 끝내면 그 두 측정점이 통째로 사라져 «측정점 3개» 로 FAIL 이 난다. */
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
  }

  /* ── §17 호흡 글로우·링 후광 진폭 (14회차 신설) ─────────────────
     체크리스트가 13회차부터 열어 둔 항목이다 — «호흡 글로우 진폭 단일 기준 Δ22±3 ·
     마일리지 Δ13.7 ↔ 재화 받기 버튼 Δ65 (4.7배 산포)». §13 은 «면 위를 지나는 띠» 를 재므로
     **상자 밖으로 번지는 box-shadow** 는 한 번도 잰 적이 없다.
     재는 법: 요소 테두리 **바깥 1~12px 띠**의 평균 루마를 한 주기 16위상에서 재고 최대−최소.
     (안쪽을 넣으면 면·글자가 섞이고, 너무 멀리 나가면 이웃 요소가 섞인다.)

     ⚑ 25회차 — **이 주석은 14회차부터 «바깥 2~14px» 이라고 적혀 있었지만 코드는 그렇게 세지 않는다.**
     아래 루프는 pad 14 로 클립을 잡고 «요소 면» 과 «가장 바깥 2px» 을 빼므로, 실제로 남는 것은
     테두리로부터 거리 **1~12px** 이다. 사양 Δ22±3 을 세운 것은 이 코드지 저 주석이 아니다.
     실측으로 못 박았다(`tools/probe122r25b.js`, 같은 상태·같은 16위상):
       밴드 1~12 → gm 23.87 · 마일리지 **24.34** · [교환] **24.8** · [이동] **19.7**
         = 이 절이 회차마다 찍어 온 24.3 / 24.3 / 24.8 / 19.7 과 **소수점까지 재현**
       밴드 2~14 → 21.26 / 23.01 / 22.22 / 21.3 (최대 −12%)
       밴드 1~3  → 32.03 / 27.13 / 37.14 / 22.9 (밴드 1~12 의 **1.11~1.50배**)
     ⚠ 그래서 **밴드는 서로 바꿔 쓸 수 없다.** 24회차 AY 가 «바깥 1~3px» 로 잰 값을 Δ22±3 에
       대고 ②③⑤ 를 깎았는데, 그 밴드에서는 다섯 자리 전부가 위로 뜬다 — 밴드를 안 맞추고 값을
       고쳤으면 §27-9·§28-10·§29-10 과 같은 «자 갈림» 을 하나 더 만들었을 것이다.
       비평 브리핑에 **«사양이 정의된 밴드는 요소 테두리 바깥 1~12px»** 를 반드시 넣어라. */
  console.log('§17 호흡 글로우·링 후광 진폭 — 상자 밖 1~12px 띠의 Δ루마 (사양이 정의된 밴드)');
  {
    /* 190 — ▶AD 뱃지는 «오늘 무광고 1회» 가 남아 있는 동안 감춰진다(`.shp-card.nofad`). 그 뱃지는
       [무료] 버튼 좌하단을 물고 있어 **링 후광 띠(바깥 2~14px) 안**에 들어오므로, 있고 없고에 따라
       이 절의 Δ 가 흔들린다(190 도입 직후 Δ22.x → 25.5 로 밴드를 벗어났다). 122 가 재는 것은
       «연출의 세기» 지 «오늘 광고를 봤나» 가 아니다 — 제품의 문으로 무광고분을 소진시켜
       **뱃지가 있는** 상태(13~18회차가 잰 그 상태)로 고정하고 잰다. */
    await p.evaluate(() => {
      SHOP_BOXES.forEach(x => { if (freeLeft(x.b) > 0) useFreeSum(x.b); else S.daily.noAdSum[x.b] = 0; });
      renderShopPage();
    });
    await p.waitForTimeout(150);
    const glowAmp = async (sel, per) => {
      /* ⚑ 22회차 — **자를 대기 전에 «등장 애니메이션»부터 걷는다.**
         21회차의 «gm 진폭 판정 불가»(자 넷이 24.3 / 14.4 / 27.9~34.7 / 3.8~6.2 로 갈림)의 원인이
         여기였다. `renderShopPage()` 직후의 카드는 아직 `jz` 등장 애니메이션 **한복판**이라
         실측 **915.5×420.4 @ x82.2**(정상 980×450 @ x50 — 6.6% 작고 32px 밀림)이다.
         이 rect 로 clip 을 잡으면 «바깥 2~14px 띠» 가 후광이 아니라 **카드 자기 면 위**에 얹혀
         글로우가 희석된다(Δ22.46 → 3.8~6.2). 그리고 이 절이 게이트 뒤쪽에 있어 앞 절들이
         이미 애니메이션을 걷어 준 실행에서는 정상값이 나오므로 — **값이 «절의 순서» 에 좌우됐다.**
         `seek()` 한 번이 비-jz122 애니메이션을 전부 cancel 하므로, **clip 을 재기 전에** 부른다.
         (재현·판정 근거: `node tools/probe122gm2.js`) */
      await seek(p, 0);
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
            /* 테두리 **바깥 1~12px** 띠만 — 안쪽(요소 면)과 가장 바깥 2px(이웃 경계)은 뺀다.
               (pad 14 에서 바깥 2px 을 빼면 남는 거리는 1~12 이다 — 25회차에 실측으로 못 박았다) */
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
      if (!v.length) return null;
      /* ⚑ 15회차 — 진폭만으로는 «꺼지는 링» 을 못 잡는다. 14회차 채점(비평가 AI ①)이
         AD 버튼 후광을 «하한/피크 17.8% · 4번 카드는 0 이하 = 완전 소등» 으로 짚었는데,
         §17 은 max−min 만 보므로 **진폭이 목표에 맞아도 바닥이 0 인 링을 통과시킨다**.
         그래서 «글로우를 통째로 끈» 기준선을 따로 잡고 **초과분의 하한/피크**를 같이 낸다
         (73 강제 상자가 4회차부터 지키는 «하한 = 피크의 55%» 규약을 링에도 적용). */
      await pat(sel + '{box-shadow:none!important}');
      await seek(p, 0);
      const b64 = (await p.screenshot({ clip: box })).toString('base64');
      const base = await p.evaluate(async ([src, w, h]) => {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let s = 0, n = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const inx = x >= 14 && x < 14 + w, iny = y >= 14 && y < 14 + h;
          if (inx && iny) continue;
          if (x < 2 || y < 2 || x >= c.width - 2 || y >= c.height - 2) continue;
          const j = (y * c.width + x) * 4;
          s += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; n++;
        }
        return n ? +(s / n).toFixed(2) : null;
      }, [b64, iw, ih]);
      await pat('');
      const ex = base == null ? null : v.map(x => x - base);
      const hi = ex ? Math.max(...ex) : null;
      return { amp: +(Math.max(...v) - Math.min(...v)).toFixed(1),
               floor: (ex && hi > .5) ? +(Math.min(...ex) / hi).toFixed(3) : null };
    };
    const pat = txt => p.evaluate(x => {
      let e = document.getElementById('jz122glow');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'jz122glow'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    const GLOWS = [['강제 상자 테두리(2.8s)', '#shopList .shp-card.gm>.cfr', 2800],
                   ['[무료] 링(0.9s)', '#shopList .shp-card .cbtn.b1:not(.lack)', 900]];
    const amps = [];
    for (const [label, sel, per] of GLOWS) {
      const a = await glowAmp(sel, per);
      amps.push([label, a, false]);
    }
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    for (const [label, sel, per, clip] of [['마일리지 패널(2.6s)', '#shopList .cn-ml', 2600],
                                     ['[교환] 링(1.2s)', '#shopList .cn-ml>.ex', 1200],
                                     ['[이동] 링(1.35s)', '#shopList .cn-mv', 1350],
                                     /* ⚑ 15회차 — 이 링만 «구조적으로 잘린다»: 카드가 overflow:hidden 인데
                                        버튼 아래 여유가 0px(좌우 9~10px)라 후광이 띠에 거의 안 잡힌다
                                        (비평가 AI 가 독립으로 같은 것을 짚었다). 진폭 밴드·산포에서는 빼고
                                        **바닥 규약만** 건다 — 버튼 기하는 레퍼런스 실측값이라 122 가 못 건드린다. */
                                     ['[받기 AD] 링(1.15s·잘림)', '#shopList .cn-cd>.bt[data-cnad]', 1150, true]]) {
      const a = await glowAmp(sel, per);
      amps.push([label, a, !!clip]);
    }
    console.log('    · ' + amps.map(([l, a]) => l + ' Δ' + (a == null ? '측정 불가' : a.amp)
      + (a && a.floor != null ? ' 바닥' + Math.round(a.floor * 100) + '%' : '')).join(' | '));
    const got = amps.filter(([, a, c]) => a != null && !c).map(([, a]) => a.amp);
    ok(got.length >= 5, '글로우 측정점(잘린 자리 제외) ' + got.length + '개 (>=5)');
    const spread = got.length ? Math.max(...got) / Math.max(.5, Math.min(...got)) : 99;
    ok(spread <= 2.2, "글로우 진폭 산포 = " + spread.toFixed(1) + "배 (<=2.2배 · 13회차 4.7배 → 14회차 1.8배)");
    /* 15회차 — 체크리스트가 13회차부터 열어 둔 «Δ22±3 한 점 통일» */
    const outb = amps.filter(([, a, c]) => a != null && !c && (a.amp < 19 || a.amp > 25));
    ok(outb.length === 0, '글로우 진폭이 전부 밴드 19~25 안(Δ22±3)'
      + (outb.length ? ' — 밖 ' + outb.length + '자리: ' + outb.map(([l, a]) => l + ' Δ' + a.amp).join(' , ') : ''));
    /* 15회차 — 비평가 AI ① «AD 후광 하한/피크 17.8% · 4번 카드 소등» */
    const fl = amps.filter(([, a]) => a != null && a.floor != null);
    const lowf = fl.filter(([, a]) => a.floor < .55);
    ok(fl.length >= 5, '바닥 비 측정점 ' + fl.length + '개 (>=5)');
    ok(lowf.length === 0, '글로우 바닥이 전부 피크의 55% 이상 — 꺼지는 링이 없다'
      + (lowf.length ? ' — 미달 ' + lowf.map(([l, a]) => l + ' ' + Math.round(a.floor * 100) + '%').join(' , ') : ''));
  }

  /* ── §28 마일리지 판 — 광택의 «부호» (23회차 신설) ──────────────────
     22회차 채점 AU❹ 가 짚고 «자를 하나 더 대야 판정할 수 있어» 넘긴 항목(§27-9 미판정).
     §15 는 심/측엽의 **비**(r ≤ 2.4)만 보고 **부호**를 안 본다 — 그래서 이 판은
     «측엽이 흰 글자를 깎는다» 를 20회 넘게 초록불로 통과시켰다. 실측(`tools/probe122ml.js`):
       제목 Δ평균 −19.26 · 수량 −13.81 · 보상줄 −12.72 · 화소 최저 −37.0 (AU 의 «−39»)
     §19 가 재화 카드에 댄 자를 **그대로** 이 판에 댄다. 두 축을 같이 본다:
       ⓐ 흰 잉크(L≥240 마스크)가 **깎이지 않는가** — Δ평균 ≥ −1
       ⓑ 검은 획(L≤30 마스크)이 **들리지 않는가** — Δ평균 ≤ +1 («획은 광택 위» 불변식)
     ★ 두 축 모두 음성항을 같이 돌린다 — z 를 걷으면 값이 실제로 되돌아와야 한다.
       (18·22회차가 «고쳤는데 자가 안 움직인다» 로 두 번 속았다.)
     ⚠ 마스크는 **기준선에서 한 번만** 잡는다. 위상마다 다시 잡으면 «어두워져 마스크에서 빠진
       화소» 가 평균에서도 빠져 Δ 가 0 으로 읽힌다(§24-8 함정의 사촌).
     ⚠ `--jz-amp:0` 으로 얼리고 잰다 — 22회차가 «둥실이 섞이면 절반이 허깨비» 를 두 번 겪었다. */
  console.log('§28 마일리지 판 광택의 부호 — 흰 글자를 깎지 않고 · 검은 획을 들지 않는가 (23회차 신설)');
  {
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    await p.evaluate(() => {
      const ml = document.querySelector('#shopList .cn-ml');
      if (ml) ml.scrollIntoView({ block: 'center' });
      document.getElementById('shopw').style.setProperty('--jz-amp', '0');
    });
    await p.waitForTimeout(120);
    const SPOT = [
      ['제목', '#shopList .cn-ml>.tt', 'w'], ['수량', '#shopList .cn-ml>.ct', 'w'],
      ['보상줄', '#shopList .cn-ml>.rw', 'w'],
      ['아이콘 잉크', '#shopList .cn-ml>em', 'k'], ['게이지 검은 테', '#shopList .cn-ml>.bar', 'k'],
    ];
    const clips = await p.evaluate(sels => sels.map(([, sel]) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.y < 0 || r.y + r.height > 2280) return null;
      return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
               width: Math.round(r.width), height: Math.round(r.height) };
    }), SPOT);
    /* 한 장을 페이지 안에서 디코딩해 «고정 마스크의 평균 루마» 를 돌려준다 */
    const meanOf = async (clip, key, kind, keep) => {
      const b64 = (await p.screenshot({ clip })).toString('base64');
      return await p.evaluate(async ([src, k, kd, kp]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const n = c.width * c.height, L = new Float32Array(n);
        for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
        window.__v28 = window.__v28 || {};
        if (kp) {
          const m = [];
          for (let i = 0; i < n; i++) if (kd === 'w' ? L[i] >= 240 : L[i] <= 30) m.push(i);
          window.__v28[k] = m;
        }
        const m = window.__v28[k] || [];
        let s = 0; for (const i of m) s += L[i];
        return { mean: m.length ? s / m.length : 0, mask: m.length };
      }, [b64, key, kind, !!keep]);
    };
    const patch = txt => p.evaluate(x => {
      let e = document.getElementById('v122ml');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'v122ml'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    const BANDS = '#shopList .cn-ml::after,#shopList .cn-ml::before,#shopList .cn-ml>.ex::after';
    /* 위상 16개를 훑어 자리별 Δ평균의 최소·최대를 돌려준다 */
    const sweep = async (base) => {
      const lo = SPOT.map(() => 99), hi = SPOT.map(() => -99);
      for (let t = 0; t < 16; t++) {
        await seek(p, Math.round(4800 * t / 16));
        for (let i = 0; i < SPOT.length; i++) {
          if (!clips[i] || !base[i]) continue;
          const v = await meanOf(clips[i], 'm' + i, SPOT[i][2], false);
          const d = v.mean - base[i].mean;
          if (d < lo[i]) lo[i] = d;
          if (d > hi[i]) hi[i] = d;
        }
      }
      return { lo, hi };
    };
    const miss = clips.filter(c => !c).length;
    ok(miss === 0, '마일리지 판 측정점 ' + (SPOT.length - miss) + '/' + SPOT.length + '자리를 잡았다');
    if (miss === 0) {
      await patch(BANDS + '{opacity:0!important}');
      await seek(p, 0);
      const base = [];
      for (let i = 0; i < SPOT.length; i++) base.push(await meanOf(clips[i], 'm' + i, SPOT[i][2], true));
      await patch('');
      const cur = await sweep(base);
      console.log('    · ' + SPOT.map(([l], i) => l + ' Δ' + cur.lo[i].toFixed(2) + '~' + cur.hi[i].toFixed(2)
        + '(마스크 ' + base[i].mask + ')').join(' | '));
      const cut = SPOT.map(([l], i) => [l, cur.lo[i]]).filter(([, v], i) => SPOT[i][2] === 'w' && v < -1);
      ok(cut.length === 0, '흰 글자 3자리가 안 깎인다 (Δ평균 ≥ −1)'
        + (cut.length ? ' — 깎인 ' + cut.map(([l, v]) => l + ' ' + v.toFixed(2)).join(' , ') : ''));
      const lift = SPOT.map(([l], i) => [l, cur.hi[i], SPOT[i][2]]).filter(([, v, k]) => k === 'k' && v > 1);
      ok(lift.length === 0, '검은 획 2자리가 안 들린다 (Δ평균 ≤ +1)'
        + (lift.length ? ' — 들린 ' + lift.map(([l, v]) => l + ' +' + v.toFixed(2)).join(' , ') : ''));
      /* 음성항 ⓐ — 흰 글자의 z 를 걷으면 측엽(z1)이 다시 글자 위로 온다 */
      await patch('#shopList .cn-ml>.tt,#shopList .cn-ml>.ct,#shopList .cn-ml>.rw{z-index:auto!important}');
      const negW = await sweep(base);
      await patch('');
      const wIdx = SPOT.map((s, i) => [s, i]).filter(([s]) => s[2] === 'w').map(([, i]) => i);
      const worstW = Math.min(...wIdx.map(i => negW.lo[i]));
      ok(worstW < -3, '음성항ⓐ — 흰 글자 z 를 걷으면 Δ평균 ' + worstW.toFixed(2)
        + ' 로 다시 깎인다 (<−3 이어야 자가 살아 있다)');
      /* 음성항 ⓑ — 아이콘·게이지 사본의 z 를 걷으면 심(z5)이 다시 획 위로 온다 */
      await patch('#shopList .cn-ml>em,#shopList .cn-ml>.mlstk{z-index:auto!important}');
      const negK = await sweep(base);
      await patch('');
      const kIdx = SPOT.map((s, i) => [s, i]).filter(([s]) => s[2] === 'k').map(([, i]) => i);
      const bestK = Math.max(...kIdx.map(i => negK.hi[i]));
      ok(bestK > 3, '음성항ⓑ — 아이콘·게이지 z 를 걷으면 Δ평균 +' + bestK.toFixed(2)
        + ' 로 다시 들린다 (>+3 이어야 자가 살아 있다)');
    }
    await p.evaluate(() => {
      document.getElementById('shopw').style.removeProperty('--jz-amp');
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    });
    await p.waitForTimeout(150);
  }

  /* ── §29 「마일리지 +N」 뱃지가 아이콘에 안 가린다 (23회차 신설) ──────────
     23회차 채점에서 **두 비평가가 독립으로 같은 자리를 ④ 최저의 근거로 들었다**:
       AW ①「보이는 알약 폭 r20·r21·r22 **111/112px** → r23 **86/88px**(−22.5%/−21.4%) ·
             가려진 왼쪽 25px 가 「마일」 두 글자라 라벨이 「리지 +1」 로 읽힌다」
       AX ②「보이는 폭이 프레임마다 **81~90px 로 7~8px 출렁인다** · 8프레임 어느 것도 라벨 전체가 안 읽힌다」
     원인은 22회차가 `.cn-cd>.pn>em`(아이콘 잉크)만 z5 로 올리고 **알약 «판»(`.cp`, z auto)을 안 올린 것**이다.
     §14 의 대각 구멍 · §19 의 «자를 안 댄 곳» 과 같은 계열 — **불변식이 «잉크» 만 말하고 «판» 을
     안 말해서** 20회차 넘게 초록불이던 자리에 22회차가 새 구멍을 냈다.
     재는 것: 알약 rect 를 클립으로 찍어 **마젠타 면**(R−G ≥ 60 이고 B−G ≥ 40)이 있는 열의 좌·우 끝
     = «보이는 폭». CSS 규격 폭의 **90% 이상**이어야 한다(가려짐 ≤ 10%).
     ⚠ `--jz-amp:0` 으로 얼린다 — 둥실 ±3px·뱃지 흔들림 ±4° 가 절단선을 7~8px 움직인다(AX 실측). */
  console.log('§29 「마일리지 +N」 뱃지가 아이콘에 가리지 않는가 (23회차 신설 — 2인 일치 ④)');
  {
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    /* §27-1 절차 — clip 을 잡기 «전에» 애니메이션을 걷는다 */
    await seek(p, 0);
    await p.evaluate(() => {
      const cp = document.querySelector('#shopList .cn-cd .cp');
      if (cp) cp.scrollIntoView({ block: 'center' });
      document.getElementById('shopw').style.setProperty('--jz-amp', '0');
    });
    await p.waitForTimeout(150);
    await seek(p, 0);
    const spots = await p.evaluate(() => [...document.querySelectorAll('#shopList .cn-cd>.cp')].map(e => {
      const r = e.getBoundingClientRect();
      return { css: Math.round(r.width),
               x: Math.round(r.x) - 6, y: Math.round(r.y) - 6,
               width: Math.round(r.width) + 12, height: Math.round(r.height) + 12,
               ok: r.y > 0 && r.y + r.height < 2280 };
    }).filter(c => c.ok));
    const seen = async () => {
      const out = [];
      for (const c of spots) {
        const b64 = (await p.screenshot({ clip: { x: c.x, y: c.y, width: c.width, height: c.height } })).toString('base64');
        out.push(await p.evaluate(async src => {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, cv.width, cv.height).data;
          let x0 = 1e9, x1 = -1;
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
            const j = (y * cv.width + x) * 4;
            if (d[j] - d[j + 1] >= 60 && d[j + 2] - d[j + 1] >= 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
          }
          return x1 >= 0 ? x1 - x0 + 1 : 0;
        }, b64));
      }
      return out;
    };
    const patch = txt => p.evaluate(x => {
      let e = document.getElementById('v122cp');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'v122cp'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    ok(spots.length >= 2, '뱃지 알약 ' + spots.length + '개를 프레임 안에서 잡았다 (>=2)');
    if (spots.length >= 2) {
      const now = await seen();
      const rate = now.map((w, i) => w / Math.max(1, spots[i].css));
      console.log('    · ' + now.map((w, i) => '뱃지' + (i + 1) + ' ' + w + '/' + spots[i].css
        + 'px(' + Math.round(rate[i] * 100) + '%)').join(' | '));
      const bad = rate.filter(r => r < .9).length;
      ok(bad === 0, '뱃지 알약이 CSS 폭의 90% 이상 보인다 (가려짐 ≤10%)'
        + (bad ? ' — 미달 ' + bad + '개 (최저 ' + Math.round(Math.min(...rate) * 100) + '%)' : ''));
      /* 음성항 — `.cp` 의 z 를 걷으면 22회차 상태로 돌아가 아이콘이 알약을 덮어야 한다 */
      await patch('#shopList .cn-cd>.cp{z-index:auto!important}');
      const neg = await seen();
      await patch('');
      const nrate = Math.min(...neg.map((w, i) => w / Math.max(1, spots[i].css)));
      ok(nrate < .85, '음성항 — `.cp` 의 z 를 걷으면 ' + Math.round(nrate * 100)
        + '% 로 다시 가려진다 (<85% 여야 자가 살아 있다)');
    }
    await p.evaluate(() => {
      document.getElementById('shopw').style.removeProperty('--jz-amp');
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    });
    await p.waitForTimeout(150);
  }

  /* ── §30 «상품» 구획 헤더 글자를 광택이 깎지 않는가 (24회차 신설) ─────────
     §28 이 마일리지 판에서 닫은 그 결함의 **다섯 번째 «끼어 있는 자리»**. 24회차 비평가 AY 가
     화소로 잡았다: 「헤더 글자 잉크 1827화소를 좌표로 고정해 프레임마다 재면 **Δ평균 −8.75 루마 ·
     908개(49.7%)가 3루마 이상 어두워짐 · 최악 243.9 → 201.7(−17.3%)**」. 대조군은 전부 Δ0.00 이었다
     (소환 탭 7블록 · 재화 탭 나머지 구획 헤더 3개 · 마일리지 판 3종 = 23회차 수정분).
     원인은 §28 과 같다 — `.cn-hd>i` 가 z auto 인데 `::after` 가 **트리 순서상 뒤**라 글자 위를 지난다.
     ⚠ 이 자리는 §16·§19·§24·§28 어느 절도 안 보고 있었다. «자를 안 댄 곳은 자동 무결점» 여섯 번째. */
  console.log('§30 «상품» 구획 헤더 글자 — 광택이 획을 깎지 않는가 (24회차 신설 — AY 화소 실측)');
  {
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    await seek(p, 0);
    await p.evaluate(() => {
      const hd = document.querySelector('#shopList .cn-hd');
      if (hd) hd.scrollIntoView({ block: 'center' });
      document.getElementById('shopw').style.setProperty('--jz-amp', '0');
    });
    await p.waitForTimeout(150);
    await seek(p, 0);
    const clip = await p.evaluate(() => {
      const e = document.querySelector('#shopList .cn-hd>i');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.y < 0 || r.y + r.height > 2280) return null;
      return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
               width: Math.round(r.width), height: Math.round(r.height) };
    });
    const meanOf = async keep => {
      const b64 = (await p.screenshot({ clip })).toString('base64');
      return await p.evaluate(async ([src, kp]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const n = c.width * c.height, L = new Float32Array(n);
        for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2];
        /* AY 와 같은 자 — 기준선에서 «밝은 잉크»(L ≥ 238) 화소를 좌표로 고정하고 그 화소만 추적한다 */
        if (kp) { const m = []; for (let i = 0; i < n; i++) if (L[i] >= 238) m.push(i); window.__v30 = m; }
        const m = window.__v30 || [];
        let s = 0, lo = 999, cut = 0;
        for (const i of m) { s += L[i]; if (L[i] < lo) lo = L[i]; }
        return { mean: m.length ? s / m.length : 0, min: m.length ? lo : 0, mask: m.length };
      }, [b64, !!keep]);
    };
    const patch = txt => p.evaluate(x => {
      let e = document.getElementById('v122hd');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'v122hd'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    const sweep = async base => {
      let lo = 99;
      for (let t = 0; t < 16; t++) {
        await seek(p, Math.round(4800 * t / 16));
        const v = await meanOf(false);
        if (v.mean - base.mean < lo) lo = v.mean - base.mean;
      }
      return lo;
    };
    ok(!!clip, '«상품» 구획 헤더 글자를 프레임 안에서 잡았다');
    if (clip) {
      await patch('#shopList .cn-hd::after,#shopList .cn-hd::before{opacity:0!important}');
      await seek(p, 0);
      const base = await meanOf(true);
      await patch('');
      const cur = await sweep(base);
      console.log('    · 마스크 ' + base.mask + 'px · 기준 평균 ' + base.mean.toFixed(2)
        + ' · Δ평균 최저 ' + cur.toFixed(2));
      ok(base.mask > 500, '헤더 글자 잉크 마스크 = ' + base.mask + 'px (>500 이어야 잴 수 있다)');
      ok(cur >= -1, '헤더 글자가 안 깎인다 (Δ평균 ' + cur.toFixed(2) + ' ≥ −1)');
      /* 음성항 — 글자의 z 를 걷으면 24회차 이전으로 돌아가 측엽이 다시 글자 위로 온다 */
      await patch('#shopList .cn-hd>i{z-index:auto!important}');
      const neg = await sweep(base);
      await patch('');
      ok(neg < -3, '음성항 — 글자 z 를 걷으면 Δ평균 ' + neg.toFixed(2)
        + ' 로 다시 깎인다 (<−3 이어야 자가 살아 있다)');
    }
    await p.evaluate(() => {
      document.getElementById('shopw').style.removeProperty('--jz-amp');
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    });
    await p.waitForTimeout(150);
  }

  /* ── §31 «설계된 누출» 세 자리의 실제 거리 (25회차 신설) ──────────────────
     §0-1 불변식은 «카드 밖 누출 0 — 단 gm 20~23px · 마일리지 ~22px · 평생배너 ~40px 은 설계된
     예외» 라고 적어 두었는데, 그 세 값 중 **어느 것도 게이트가 재고 있지 않았다.**
     («자를 안 댄 곳은 자동 무결점» 일곱 번째 — §30 머리말과 같은 계열이다.)
     24회차 AY 가 그 구멍으로 들어왔다: ⑤ 「마일리지 봉우리 위상 누출 **28px**(표 ~22px, +27%)」.
     25회차에 자를 만들어 재 보니 **AY 의 28px 이 맞고 표가 낡은 것**이었다(`tools/probe122r25b.js`):

       자: 진폭이 최대인 위상에서, **글로우를 통째로 끈 기준선**보다 링 d 의 평균 루마가
           1루마 이상 밝은 마지막 d. (진폭 프로파일로는 «새는 거리» 를 못 잰다 —
           그건 «얼마나 흔들리나» 지 «얼마나 멀리 가나» 가 아니다.)
       실측: **gm 22px**(표 20~23 ✓ — 이 일치가 자의 검증이다) · **마일리지 28px**.
       CSS 도 28 쪽이다 — `jz122Mile` 50% 키프레임이 `blur 22px + spread 5px` = 27px 다.
       표의 «~22px» 은 **4회차**가 «번짐 16~18 + 확산 2~3» 으로 남긴 값이고, 그 뒤
       **15회차가 마일리지 진폭을 17.8 → 24.3 으로 올릴 때 쓴 손잡이가 바로 그 spread** 였다
       (§20-5: 「알파가 포화된 자리는 --jz-ring 으로 못 올린다. 답은 spread 였다」).
       즉 28px 은 사양을 어긴 것이 아니라 **사양(Δ22±3)을 맞춘 대가로 표에 반영이 안 된 값**이다.
       → 값이 아니라 **표**를 고쳤고(§0-1 «마일리지 ~28px»), 다시 낡지 않게 여기서 잰다. */
  console.log('§31 «설계된 누출» 거리 — gm 20~23px · 마일리지 26~30px (25회차 신설 — AY⑤ 실측 확인)');
  {
    const PAD31 = 36;
    const ringsOf = async (box, iw, ih) => {
      const b64 = (await p.screenshot({ clip: box })).toString('base64');
      return p.evaluate(async ([src, w, h, pad]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + src; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const sum = new Float64Array(pad + 1), cnt = new Float64Array(pad + 1);
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          if (x >= pad && x < pad + w && y >= pad && y < pad + h) continue;   /* 요소 면 */
          const dx = x < pad ? pad - x : (x >= pad + w ? x - (pad + w) + 1 : 0);
          const dy = y < pad ? pad - y : (y >= pad + h ? y - (pad + h) + 1 : 0);
          const k = Math.max(dx, dy);
          if (k < 1 || k > pad) continue;
          const j = (y * c.width + x) * 4;
          sum[k] += .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; cnt[k]++;
        }
        return { sum: [...sum], cnt: [...cnt] };
      }, [b64, iw, ih, PAD31]);
    };
    const pat31 = txt => p.evaluate(x => {
      let e = document.getElementById('v122lk');
      if (!x) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('style'); e.id = 'v122lk'; document.head.appendChild(e); }
      e.textContent = x;
    }, txt);
    /* `force` — 재는 내내 걸어 두는 패치(음성항용). 기준선 패치를 걷을 때 **빈 문자열이 아니라
       이 값으로** 되돌려야 한다. 안 그러면 음성항이 자기 패치를 스스로 지우고 정상 상태를 다시 잰다
       (25회차 첫 실행이 그래서 «음성항 28px» 로 FAIL 했다 — 자가 아니라 자를 부르는 쪽의 버그였다). */
    const leakOf = async (sel, per, off, force) => {
      await pat31(force || '');
      await seek(p, 0);                       /* §17 과 같은 함정 — clip 전에 등장 연출을 걷는다 */
      const clip = await p.evaluate(([s, pad]) => {
        const e = document.querySelector(s); if (!e) return null;
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        const x = Math.round(r.x) - pad, y = Math.round(r.y) - pad;
        const w = Math.round(r.width) + pad * 2, h = Math.round(r.height) + pad * 2;
        if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
        return { x, y, width: w, height: h, iw: Math.round(r.width), ih: Math.round(r.height) };
      }, [sel, PAD31]);
      if (!clip) return null;
      const { iw, ih, ...box } = clip;
      /* 진폭이 최대인 위상을 §17 과 같은 밴드(바깥 1~12px)로 찾는다 */
      let best = 0, bv = -1;
      for (let i = 0; i < 16; i++) {
        const t = Math.round(per * i / 16);
        await seek(p, t);
        const r = await ringsOf(box, iw, ih);
        let s = 0, n = 0;
        for (let d = 1; d <= 12; d++) { s += r.sum[d]; n += r.cnt[d]; }
        const m = n ? s / n : 0;
        if (m > bv) { bv = m; best = t; }
      }
      await pat31(off);                        /* 기준선 — 이 글로우만 끈다 */
      await seek(p, best);
      const base = await ringsOf(box, iw, ih);
      await pat31(force || '');
      await seek(p, best);
      const pk = await ringsOf(box, iw, ih);
      let leak = 0;
      for (let d = 1; d <= PAD31; d++) {
        if (!pk.cnt[d] || !base.cnt[d]) continue;
        if (pk.sum[d] / pk.cnt[d] - base.sum[d] / base.cnt[d] >= 1) leak = d;
      }
      return leak;
    };
    await p.evaluate(() => { shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
    await p.waitForTimeout(150);
    const gmSel = '#shopList .shp-card.gm>.cfr';
    const gmLeak = await leakOf(gmSel, 2800, gmSel + '{box-shadow:none!important}');
    await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });
    await p.waitForTimeout(150);
    const mlSel = '#shopList .cn-ml';
    /* ⚠ 마일리지 판은 `inset` 립과 바깥 글로우가 **한 box-shadow 선언**이다.
       통째로 끄면 립까지 사라져 «기준선» 이 요소 자체를 바꿔 버린다 — 바깥 몫만 지운다. */
    const mlOff = mlSel + '{box-shadow:inset 0 0 0 7px #E2A6FF!important}';
    const mlLeak = await leakOf(mlSel, 2600, mlOff);
    console.log('    · gm ' + (gmLeak == null ? '측정 불가' : gmLeak + 'px')
      + ' | 마일리지 ' + (mlLeak == null ? '측정 불가' : mlLeak + 'px'));
    ok(gmLeak != null && mlLeak != null, '두 자리를 프레임 안에서 잡았다');
    if (gmLeak != null) ok(gmLeak >= 20 && gmLeak <= 23,
      'gm 외곽 글로우 누출 ' + gmLeak + 'px 이 §0-1 «20~23px» 안');
    if (mlLeak != null) ok(mlLeak >= 26 && mlLeak <= 30,
      '마일리지 판 글로우 누출 ' + mlLeak + 'px 이 §0-1 «~28px»(26~30) 안'
      + ' — 24회차 AY⑤ 의 28px 이 맞았고 표가 낡았던 자리다');
    /* 음성항 — 바깥 글로우를 지우면 누출이 사라져야 한다. 안 사라지면 이 자가 이웃을 재고 있는 것이다. */
    if (mlLeak != null) {
      const neg = await leakOf(mlSel, 2600, mlOff, mlOff);
      await pat31('');
      ok(neg === 0, '음성항 — 바깥 글로우를 지우면 누출 ' + neg + 'px (0 이어야 이웃을 안 재고 있다)');
    }
    await p.evaluate(() => { const l = document.getElementById('shopList'); if (l) l.scrollTop = 0; });
    await p.waitForTimeout(150);
  }

  /* ── §8 스크롤 fps ────────────────────────────────────────────
     지시 ③ 은 «≥55fps» 지만 **이 러너에서는 절대값이 게이트가 될 수 없다** — 1회차 실측:
     애니메이션을 전부 끈 같은 페이지가 소환 12.6 / 재화 25.4fps 이고, 카드가 하나도 없는
     빈 화면의 rAF 조차 ~31fps 다(컨테이너 CPU 상한). 절대값으로 재면 122 와 무관하게 항상 FAIL 이다.
     그래서 **같은 실행 안에서 ON/OFF 를 번갈아 재고 비교**한다 —
     122 의 연출이 스크롤 비용을 늘리지 않았는가가 실제로 물어야 할 것이다. 절대값은 기록만 남긴다.

     ⚑ 16회차 — 이 항목이 «간헐 FAIL» 이었다(15회차 6회 중 1회, 0.14fps 차로 뒤집힘).
     **먼저 «쌍별 비율의 중앙값» 으로 바꿨다가 되돌렸다.** 그 처방은 잡음이 «느린 드리프트» 일
     때만 옳은데, 실측은 그렇지 않았다 — 한 실행 안에서
       ON 10.5/8.6/8.8/11.2/9.7 (산포 30%) · OFF 9.7/11/9.9/9.9/10.8 (산포 13%)
     처럼 **표본마다 독립으로 튄다.** 독립 잡음에서는 두 잡음값을 나눈 «비율» 이 오히려 분산을
     키우고(그 실행에서 쌍별 비율은 0.782~1.131 로 벌어졌다), 중앙값끼리의 비는 양쪽 잡음이
     각자 평균화돼 0.980 으로 안정적이었다. 즉 **15회차의 추정량이 옳았다** — 문제는 추정량이
     아니라 **표본 수**였다.
     → 추정량은 `median(ON)/median(OFF)` 로 되돌리고, 쌍마다 ON·OFF 순서를 번갈아 단조 드리프트의
       부호도 함께 상쇄하고, 쌍별 비율은 **판정이 아니라 진단**으로만 찍는다.

     ⚑ 그런데 표본을 4 → 7쌍으로 늘린 것만으로는 **안 고쳐졌다**(7회 돌려 1회 FAIL — 15회차의
       6회 중 1회와 같은 수준). 표본 수가 아니라 **표본 하나의 분해능**이 문제였다:
       이 러너의 소환 탭은 9~11fps 라 1500ms 창에 프레임이 **15개**밖에 안 들어간다.
       프레임 «수» 를 세는 측정이므로 ±1프레임 = **±7%** 이고, 판정 문턱이 10% 라
       잡음과 신호가 같은 크기다. 표본을 더 모아도 각 표본이 이만큼 양자화돼 있으면
       중앙값이 문턱 근처에서 계속 뒤집힌다.
       → 창을 1500 → **3500ms** 로 늘린다(35프레임 → ±1프레임 = ±2.9%). 대신 쌍은 7 → **5**로
         줄여 총 소요는 그대로 둔다. 잡음을 문턱의 1/3 아래로 내리는 것이 요점이다.
     ⚠ 이 러너의 절대 fps 는 동시에 도는 다른 프로세스에 크게 눌린다(같은 세션에서
        서브에이전트 2명이 돌 때 소환 탭이 28fps → 9fps 로 떨어졌다). 절대값은 여전히 기록용이다.

     ⚑⚑ 작업 690 — **16회차의 진단은 옳았고 처방이 반만 들었다.** 676 회차가 같은 트리에서
       1회차 빨강(재화 비 0.870) ↔ 2회차 초록을 냈고, `tools/probe690.js` 로 6런을 돌려 재현했다
       (첫 런 재화 **R_med 0.887 = 빨강**, 나머지 5런 0.961~1.024 — 코드가 아니라 부하가 가른다).
       3.5s 창(16회차)이 «프레임 양자화» 는 실제로 닫았지만 남은 잡음은 그게 아니라 **부하 스파이크**다:
       그 나쁜 런의 OFF 표본이 17.9 / 16 / «21.6» / 20.5 / 18.6 로 한 표본만 21.6 까지 튀었고, 그 한 알이
       중앙값을 끌어올려 비를 문턱 아래로 밀었다. 중앙값은 **양쪽 잡음을 평균화하는** 추정량이라
       한쪽에만 스파이크가 몰리면 그대로 실려 간다.
       ⇒ **추정량이 아니라 «쌍을 모으는 방법» 을 바꾼다** — 5쌍 중 **가장 나은 쌍**의 비로 판정한다
         (= «모든 쌍에서 ON < OFF×0.9 여야 빨강». 부하는 표본을 **아래로만** 밀므로, 다섯 번 중
         한 번이라도 «비용 증가 없음» 이 잡히면 그것이 이 트리의 실력이다).
       ⚠ **문턱 0.9 는 한 칸도 안 넓혔다**(334 규약 — 재기준 금지). 바뀐 것은 집계뿐이고,
         중앙값 비·쌍별 비율은 **진단으로 계속 찍는다**.
       ⚑ 후보를 전부 같은 컨테이너에서 재고 골랐다(632 처방 · probe690 [B] · 실제 6런 / 되돌림 6런):
           R_med (현행)  실제 5/6 통과 — **흔들린다**
           R_max         실제 5/6 통과 — 흔들린다(나쁜 런에서 OFF 의 21.6 스파이크가 그대로 분모다)
           R_pmed        실제 5/6 통과 — 흔들린다(16회차가 한 번 썼다 되돌린 축)
           N_sgn(부호)   실제 4/6 통과 — 더 예민하다
           **R_maxp(채택) 실제 6/6 통과 · 되돌림 6/6 빨강**
       ⚑ **«언제나 초록» 이 아님을 아래 §8-R 되돌림 시험이 게이트 안에서 못박는다.** */
  console.log('§8 스크롤 fps — ON/OFF 교차 5쌍 × 3.5s · **가장 나은 쌍**으로 판정 (절대값·중앙값은 기록/진단)');
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
      if (performance.now() - t0 < 3500) requestAnimationFrame(tick);
      else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
    };
    requestAnimationFrame(tick);
  }));
  const med = a => a.slice().sort((x, y) => x - y)[(a.length - 1) >> 1];
  const PAIRS = 5;
  const FPS_TH = 0.9;                                /* 690 — 문턱은 16회차 값 그대로다(334 규약) */
  /* 690 — 한 탭의 5쌍 교차. `onCss` 를 주면 ON 자리에 그 CSS 를 얹는다(§8-R 되돌림 시험이 쓴다). */
  const crossRun = async (tab, onCss, pairs) => {
    await p.evaluate(t => { shopCat = t; setShopCatTabs(t); renderShopPage(); }, tab);
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} }); });
    const on = [], off = [];
    const measOn = async () => { await setCss(onCss); await p.waitForTimeout(180); on.push(await scrollFps()); };
    const measOff = async () => { await setCss(OFFCSS); await p.waitForTimeout(180); off.push(await scrollFps()); };
    for (let i = 0; i < pairs; i++) {
      /* 쌍마다 순서를 뒤집는다 — «ON 이 항상 먼저» 면 단조 드리프트가 한쪽에만 쌓인다 */
      if (i % 2 === 0) { await measOn(); await measOff(); }
      else { await measOff(); await measOn(); }
    }
    await setCss('');
    const ratios = on.map((v, i) => +(v / off[i]).toFixed(3));
    return { on, off, ratios, best: Math.max.apply(null, ratios), mOn: med(on), mOff: med(off) };
  };
  for (const tab of ['coin', 'summon']) {
    const nm = tab === 'coin' ? '재화' : '소환';
    const q = await crossRun(tab, '', PAIRS);
    const r = q.mOn / q.mOff, nLo = q.ratios.filter(x => x < FPS_TH).length;
    console.log('   ' + nm + ' 탭 — ON ' + q.on.join('/') + ' · OFF ' + q.off.join('/'));
    /* 진단용 — 쌍별 비율이 넓게 벌어져 있으면 잡음이 «드리프트» 가 아니라 «표본 독립» 이라는 뜻이다.
       690 — 중앙값 비(옛 판정식)는 여기서 계속 찍는다. 판정만 아래 «가장 나은 쌍» 으로 옮겼다. */
    console.log('     중앙 ON ' + q.mOn + ' / OFF ' + q.mOff + ' → 비 ' + r.toFixed(3)
      + '   (진단: 쌍별 비율 ' + q.ratios.join('/') + ' · 그 중앙 ' + med(q.ratios)
      + ' · 문턱 아래 ' + nLo + '/' + PAIRS + '쌍)');
    ok(q.best >= FPS_TH, nm + ' 탭 스크롤 비용 증가 없음 — 5쌍 중 가장 나은 쌍의 비 '
      + q.best.toFixed(3) + ' ≥ ' + FPS_TH + ' (= 모든 쌍이 문턱 아래여야 빨강 · 지금 ' + nLo + '/' + PAIRS + '쌍)');
  }

  /* ── §8-R 되돌림 시험 (690 신설) ─────────────────────────────
     위 항이 «무르게 풀린» 것이 아님을 **게이트 안에서** 못박는다 — 122 의 연출이 실제로 스크롤을
     무겁게 만든 세상을 합성해(블러·그림자를 매 프레임 갱신) 같은 자에 물린다. 새 축이 거기서
     빨갛지 않으면 그 축은 «언제나 초록» 이고, 그러면 이 항이 빨개져서 그것을 말한다.
     ⚠ 제품은 한 줄도 안 건드린다 — 이 CSS 는 이 프로세스의 페이지 위에만 얹혔다가 걷힌다.
     ⚠ 부하를 세게 거는 이유: probe690 1회차에서 약한 판(블러 1.4~2.8px)은 재화 탭을 0.871 까지밖에
        못 내려 **되돌림 항 자신이 문턱 근처에서 흔들렸다**. 분리가 남도록 세게 건다
        (실측 — 이 판의 재화 탭 되돌림은 쌍별 비가 전부 0.9 아래로 떨어진다).
     ⚠ 3쌍만 쓴다(시간). 판정은 «가장 나은 쌍» 이라 쌍이 줄면 **되돌림 쪽이 더 어려워지는** 방향이라
        안전하다(쌍이 많을수록 우연히 한 쌍이 0.9 를 넘을 여지가 커진다). */
  const HEAVYCSS = '@keyframes v122hv{0%,100%{filter:blur(5px) drop-shadow(0 0 26px rgba(0,0,0,.85)) saturate(1.6)}'
    + '50%{filter:blur(9px) drop-shadow(0 0 48px rgba(0,0,0,.95)) saturate(2.4)}}'
    + '#shopList .shp-card,#shopList .cn-cd,#shopList .shp-row{animation:v122hv .7s linear infinite!important;will-change:filter}';
  const rv = await crossRun('coin', HEAVYCSS, 3);
  console.log('   §8-R 되돌림 — ON* ' + rv.on.join('/') + ' · OFF ' + rv.off.join('/')
    + '  (쌍별 ' + rv.ratios.join('/') + ')');
  ok(rv.best < FPS_TH, '§8-R 되돌림 — 스크롤이 «정말로» 무거운 세상에서는 가장 나은 쌍도 '
    + rv.best.toFixed(3) + ' < ' + FPS_TH + ' = 위 항은 «언제나 초록» 이 아니다');
  await p.evaluate(() => { shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); });

  /* ── §9 콘솔 ────────────────────────────────────────────────── */
  ok(errs.length === 0, '콘솔 에러 0 (' + errs.slice(0, 2).join(' | ') + ')');

  await b.close();
  console.log('\nVERIFY122 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
