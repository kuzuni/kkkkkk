#!/usr/bin/env node
/* 93 UI 발 재화 흡수 3박자 — 연속 프레임 캡처
 *   cap58.js 의 하네스를 그대로 쓰되, 93 지시대로 **8프레임(0~700ms) 이 아니라 16프레임(0~1520ms)** 이다.
 *   연출이 «퍼짐 0.22 → 머묾 → 흡수(마지막 도착 1.22s)» 로 길어져 0.7초 창으로는 뒤 2/3 가 안 잡힌다.
 *
 *   node cap93.js [라운드]      # 기본 r1 → docs/review/93-<라운드>-<씬>-<n>.jpg
 *
 * ⚠ **`page.screenshot()` 로는 연출을 채점할 수 없다** (2026-08-25, 1회차가 이걸로 통째로 날아갔다).
 *   이 컨테이너에서 1080×2280 한 장에 **337~629ms** 가 걸린다. «90ms 간격» 이라고 적어 놓아도
 *   실제 간격은 430~720ms 라, 0.3~0.8초짜리 연출이 8프레임 중 1~2장에만 걸린다.
 *   비평가 2명이 독립적으로 «연출 없음 · 0점» 을 냈는데 틀린 것은 구현이 아니라 **캡처 절차**였다
 *   (04 교훈 1 «캡처 상태가 다르면 그 회차 비평은 통째로 무효»).
 *   → **CDP Page.startScreencast** 로 렌더된 프레임을 «타임스탬프째로» 받아 두고,
 *      트리거 기준 0·90·…·630ms 에 가장 가까운 8장을 골라 저장한다. 실제 오차도 같이 찍는다.
 *
 * 결정성(41 교훈 4 · 42 교훈 1·2 · 28 교훈 3):
 *   - rAF 가 도는 것을 먼저 확인하고 주입한다. 주입이 안 붙으면 스스로 throw.
 *   - 적은 «비우지» 말고 멀리 주차(비우면 파도 클리어로 상태가 리셋된다) + player.inv 로 넉백 제거.
 *   - `step()` 을 무력화해 게임 로직을 정지시킨다 — 캔버스의 스킬 이펙트·경험치·자동 레벨업이
 *     프레임마다 달라지면 «연출 때문에 바뀐 것» 과 구분이 안 된다. draw()/fxTick() 은 그대로 돈다.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const ROUND = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, 'docs', 'review');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
/* 1번은 **트리거 «직전»** 프레임(기준), 2~8번이 연출 구간이다.
   기준 프레임이 없으면 비평가가 «무엇이 바뀌었는지» 를 판정할 수 없고, 실제로 9회차에
   «클릭 후 187ms 무반응» 이라는 오독이 나왔다 — 사실은 1번 프레임에 이미 토스트가 들어 있었다.
   간격은 ROUTINE [3]-(다) 의 «80~100ms» 상한인 100ms 로 잡는다 — 0~700ms 를 덮어야
   스펙 예산(0.8초) 안에 끝나는 연출의 «끝» 까지 담긴다. */
/* 15회차 — 420 슬롯을 380 으로 내리고 320 을 넣어 «도착 순간»(실측 320~400ms)을 덮는다.
   14회차 비평 W: 최근접 관측 100px 에서 다음 슬롯(421)엔 코인이 이미 소멸 — 310↔420 공백에 빠졌다.
   16회차 — 0 슬롯 제거(«무반응 프레임» 으로만 찍힌다, Y·Z 공통) · **850 정산 슬롯 신설**:
   620ms 재렌더는 이 컨테이너에서 페인트가 ~150ms 뒤에 얹혀 690 프레임엔 안 잡혔다(15회차 ①④
   최대 감점이 전부 여기서 났다). 850 이면 목록 갱신·딤 100% 복귀·플로터 페이드가 다 보인다. */
const WANT = [95, 190, 285, 380, 475, 570, 665, 760, 855, 950, 1045, 1140, 1235, 1330, 1425, 1520];

/* ── 스크린캐스트 수집기 ── */
function recorder(cdp){
  const buf = [];
  cdp.on('Page.screencastFrame', async (e) => {
    buf.push({ t: e.metadata.timestamp * 1000, data: e.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch(_){}
  });
  return buf;
}
/* ── 15회차 — **라벨 바이어스 실측(프리롤 색시계)** ───────────────────────────────────────
 * `Page.screencastFrame.metadata.timestamp` 는 그 프레임이 «그려진» 시각이 **아니다** — 전달
 * 지연이 섞인다. 14회차가 `probe93j`(색시계)로 못 박았다: 라벨 − 실제 = 중앙 **+59ms**(22~119).
 * 프레임 간격이 95ms 인데 편차가 반 프레임 이상이라, 저장된 프레임은 **라벨보다 이전의 그림**이고
 * 비평가는 회차마다 «트리거 +180~230ms 까지 아무것도 없다» 로 ① 을 3~4점에 묶는다.
 * 11회차는 그 오독을 믿고 **게임 코드**(`fxWatch` 디바운스)를 고쳤다 — 하네스가 원인인데.
 *
 * 고치는 법(14회차 §4-14-4 권장안): **트리거 «전» 프리롤 동안만** 색시계를 띄워 이 실행의
 * 바이어스를 실측하고, 시계를 지운 뒤 트리거한다. 저장되는 연출 프레임에는 시계가 없다.
 * 상수 59ms 를 박지 않는다 — 컨테이너·인코딩 설정이 바뀌면 틀린다(차선책이었던 이유).
 *   시계: `rgb(v,255−v,40)`, `v = round(경과ms / CLK_STEP)` (6ms 해상도 · 1530ms 까지)
 *   프리롤은 1500ms — 이 컨테이너의 프레임 간격이 100~110ms 라 640ms 로는 시계 프레임이 1장뿐이었다.
 *   디코드: `python3 dec93.py`(PIL) — 저장소 선례 `scan147.py`
 * ⚠ `position:fixed` 시계는 **`document.documentElement`** 에 붙인다. body 아래에 붙이면
 *   `#wrap` 의 transform 이 포함 블록을 가로채 화면 밖으로 나간다(14회차가 데인 자리).           */
const CLK_STEP = 6, CLK_MS = 1500, CLK_WARM = 500;
async function measureBias(page, cdp, buf){
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap93clk-'));
  buf.length = 0;
  const clk = await page.evaluate((step) => {
    const c = document.createElement('div');
    c.id = 'cap93clk';
    c.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;z-index:2147483647;background:rgb(0,255,40);pointer-events:none';
    document.documentElement.appendChild(c);
    const p0 = performance.now(), t0 = Date.now();
    (function tick(){
      const v = Math.max(0, Math.min(255, Math.round((performance.now() - p0) / step)));
      c.style.background = `rgb(${v},${255-v},40)`;
      c.dataset.v = v;                               /* 17회차 — DOM 에도 같은 값을 쓴다(표 샘플러가 읽는다) */
      if(document.getElementById('cap93clk')) requestAnimationFrame(tick);
    })();
    /* 17회차 — **정답표 샘플러의 «읽기 시점»을 같은 프리롤에서 실측한다.**
       이 루프는 아래 `log` 의 정답표 루프와 **구조가 같다**: rAF 콜백 «머리» 에서 DOM 을 읽고
       다음 rAF 를 기다린다. 게임의 fxTick 은 페이지 로드 때 등록돼 이 루프보다 «먼저» 돌고,
       시계 tick 도 이 루프보다 먼저 등록됐다 — 등록 순서까지 같아야 스큐가 같은 크기로 잡힌다.
       읽은 값(dataset.v)이 «화면에 언제 뜨는지» 는 프레임 쪽 디코드값과 맞대 보면 나온다. */
    window.__cap93s = [];
    (function samp(){
      window.__cap93s.push([Date.now(), c.dataset.v === undefined ? -1 : +c.dataset.v]);
      if(document.getElementById('cap93clk')) requestAnimationFrame(samp);
    })();
    return { t0 };                                   /* 시계 원점의 절대시각(ms) */
  }, CLK_STEP);
  await page.waitForTimeout(CLK_MS);
  const frames = buf.slice();
  const samp = await page.evaluate(() => window.__cap93s || []);
  await page.evaluate(() => { const c = document.getElementById('cap93clk'); if(c) c.remove(); });
  frames.forEach((f, i) => fs.writeFileSync(path.join(dir, `f${String(i).padStart(3,'0')}.jpg`), Buffer.from(f.data, 'base64')));
  let out = '';
  try { out = require('child_process').execFileSync('python3', [path.resolve(__dirname, 'dec93.py'), dir], { encoding:'utf8' }); }
  catch(e){ fs.rmSync(dir, { recursive:true, force:true }); throw new Error('색시계 디코드 실패(python3+PIL) — ' + e.message); }
  fs.rmSync(dir, { recursive:true, force:true });
  const errs = [], skews = [];
  for(const line of out.trim().split('\n')){
    const [name, r, g, b] = line.trim().split(/\s+/);
    const R = +r, G = +g, B = +b, i = +name.slice(1, 4);
    /* 시계 블록이 맞는지 두 번 확인한다 — 파랑 40 고정 + 초록이 255−R. 아니면 시계가 안 찍힌
       프레임(시계 생성 전/제거 후)이라 표본에서 뺀다. 하나라도 통과 못 하면 그냥 버린다. */
    if(process.env.CAP93_DEBUG) console.log(`    [clk] ${name} R${R} G${G} B${B} label${frames[i] ? Math.round(frames[i].t - clk.t0) : '?'}`);
    if(Math.abs(B - 40) > 22 || Math.abs((255 - R) - G) > 20) continue;
    const drawn = Math.round(R) * CLK_STEP;            /* 시계 원점 기준 «실제로 그려진» 시각 */
    /* 시계를 **막 붙인 직후** 는 새 레이어의 합성·인코딩 백로그가 겹쳐 바이어스가 3~7배로 튄다
       (실측 f004~f008: 100·224·327·348·349ms → 안정 구간은 46~91ms). 워밍업을 버리지 않으면
       중앙값이 그 전이(轉移)에 끌려간다. 시계 원점 +CLK_WARM 이후에 «그려진» 프레임만 쓴다. */
    if(drawn < CLK_WARM) continue;
    errs.push(frames[i].t - (clk.t0 + drawn));         /* 라벨 − 실제 = 바이어스 */
    skews.push({ label: frames[i].t, drawnAbs: clk.t0 + drawn });
  }
  if(errs.length < 4) throw new Error(`색시계 표본이 ${errs.length}장뿐이다 — 바이어스를 못 잰다`);
  const sorted = errs.slice().sort((a, b) => a - b);
  const med = Math.round(sorted[sorted.length >> 1]);
  const q = p => Math.round(sorted[Math.min(sorted.length-1, Math.floor(sorted.length*p))]);
  console.log(`  · 라벨 바이어스 실측: 표본 ${errs.length}장(워밍업 ${CLK_WARM}ms 제외) · 중앙 ${med}ms · 사분위 ${q(.25)}~${q(.75)}ms · 폭 ${Math.round(sorted[0])}~${Math.round(sorted[sorted.length-1])}ms — pick() 이 라벨에서 뺀다`);

  /* ── 17회차 — **정답표↔프레임 스큐**(15회차 핸드오프 8번 · 16회차가 «다음 회차에» 로 미룬 것) ──
     비평가 AN 이 «씬B 정답표 9칸 중 7칸이 정확히 한 롤링 스텝 뒤처진다» 를 HUD 직접 판독으로
     잡았고, 16회차는 브리핑에 «감점 사유로 쓰지 마라» 를 넣는 임시 처방만 했다. 임시 처방은
     비평가가 지켜 줘야만 듣는다 — 여기서 **이번 실행의** 스큐를 재서 표를 옮긴다.

     원리: 샘플러가 시각 τ 에 읽은 DOM 값은 **그 프레임이 스왑된 뒤에야** 화면에 뜬다. 프리롤
     프레임은 «화면에 뜬 시각(drawnAbs)» 과 «그때 화면이 들고 있던 값» 을 둘 다 알고 있으므로,
     보정된 라벨(label − bias)에 가장 가까운 샘플러 행의 DOM 값과 대 보면 그 격차가 바로 스큐다.
     스큐 = DOM읽기가 화면보다 앞선 ms. 따라서 «화면이 시각 t 에 보여 준 값» 은 샘플러 t − 스큐 행. */
  let SK = 0;
  if(samp && samp.length > 4){
    const sk = [];
    for(const p of skews){
      const L = p.label - med;                         /* 이 프레임이 «실제로 그려진» 절대시각 */
      let b = null;
      for(const r of samp) if(!b || Math.abs(r[0] - L) < Math.abs(b[0] - L)) b = r;
      if(!b || b[1] < 0) continue;
      if(Math.abs(b[0] - L) > 60) continue;            /* 샘플러 간격 밖이면 대조가 무의미하다 */
      sk.push((clk.t0 + b[1] * CLK_STEP) - p.drawnAbs);/* DOM 이 든 시각 − 화면이 든 시각 */
    }
    if(sk.length >= 4){
      sk.sort((a, b) => a - b);
      SK = Math.round(sk[sk.length >> 1]);
      const sq = p => Math.round(sk[Math.min(sk.length-1, Math.floor(sk.length*p))]);
      console.log(`  · 정답표 스큐 실측: 표본 ${sk.length}장 · 중앙 ${SK}ms · 사분위 ${sq(.25)}~${sq(.75)}ms — 정답표가 화면보다 ${SK >= 0 ? '앞선다' : '뒤진다'}. at() 이 이만큼 되돌린다`);
    } else console.log('  ⚠ 정답표 스큐 표본 부족 — 보정 없이 간다(비평가에게 «표–그림 한 스텝 차는 감점 금지» 를 알릴 것)');
  }
  return { bias: med, skew: SK };
}

/* 14회차 — «가장 가까운 프레임» 을 목표 시각마다 독립적으로 고르면 **같은 원본 프레임이
   이웃한 두 목표에 중복 선택**된다(원본 간격 74ms vs 목표 간격 90~130ms). 13회차 비평 U·V 가
   «166ms 동결» 로 잡은 것이 바로 이 중복이다 — probe58f 실측에는 정지 구간이 없다.
   → 목표 시각 순서대로 **아직 안 쓴 프레임 중에서만** 고른다(단조 증가 보장). 그래도 목표에서
   ±55ms 넘게 벗어난 프레임은 로그에 «WARN» 으로 남겨 비평가 전달문에 적게 한다. */
let BIAS = 0;                                          /* measureBias() 가 이 실행에서 실측한 라벨 오차 */
let SKEW = 0;                                          /* 17회차 — 정답표 DOM 읽기가 화면보다 앞선 ms */
function pick(buf, t0, tag, pre){
  /* -60 까지 허용하면 트리거 «이전» 프레임이 0ms 슬롯을 먹는다(14회차 upg: 8슬롯 중 2장이 기준) */
  /* 15회차 — 라벨에서 실측 바이어스를 뺀 것이 «그려진 시각» 이다(§ measureBias). */
  const rel = buf.map(f => ({ dt: f.t - BIAS - t0, data: f.data })).filter(f => f.dt >= -8);
  if(rel.length < WANT.length) throw new Error(`${tag}: 렌더 프레임이 ${rel.length}장뿐이다 — 스크린캐스트 실패`);
  if(!pre) throw new Error(`${tag}: 트리거 직전 기준 프레임이 없다`);
  const gaps = rel.slice(1).map((f, i) => f.dt - rel[i].dt);
  const med = gaps.slice().sort((a,b) => a-b)[gaps.length >> 1] || 0;
  const out = [{ want:'기준', got:Math.round(pre.t - BIAS - t0), data:pre.data }];
  let from = 0;
  for(const w of WANT){
    let bi = from;
    for(let i = from; i < rel.length; i++)
      if(Math.abs(rel[i].dt - w) < Math.abs(rel[bi].dt - w)) bi = i;
    out.push({ want:w, got:Math.round(rel[bi].dt), data:rel[bi].data });
    from = Math.min(bi + 1, rel.length - 1);            /* 다음 목표는 이 프레임 «뒤» 에서만 고른다 */
  }
  out.forEach((f, i) => fs.writeFileSync(path.join(OUT, `93-${ROUND}-${tag}-${i+1}.jpg`), Buffer.from(f.data, 'base64')));
  global.__capT = global.__capT || {};
  global.__capT[tag] = out.slice(1).map(f => f.got);
  const worst = Math.max(...out.slice(1).map(f => Math.abs(f.got - f.want)));
  console.log(`  ✓ ${tag}: ${out.length}장 (1=기준) · 실제 t = ${out.map(f => f.got).join(', ')}ms (목표 대비 최대 ±${worst}ms, 원본 ${rel.length}프레임 · 중앙 간격 ${Math.round(med)}ms)`);
  if(worst > 55) console.log(`    ⚠ WARN ${tag}: 목표 대비 ±${worst}ms — 비평가에게 «프레임 시각은 파일명이 아니라 이 로그 기준» 이라고 알릴 것`);
  return worst;
}

async function ensureLoop(page){
  const ok = await page.evaluate(() => new Promise(res => {
    let n = 0;
    const t = setInterval(() => { if(++n > 40){ clearInterval(t); res(false); } }, 25);
    const s = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => { clearInterval(t); res(performance.now() - s < 500); }));
  }));
  if(!ok) throw new Error('rAF 루프가 돌지 않는다 — 캡처가 결정적이지 않다');
}

/* 번들 브라우저(버전 태그)가 컨테이너 이미지와 어긋나면 미리 깔린 실행 파일로 떨어진다 (tools/smoke.js 와 동일) */
function pwLaunch(){
  const fs2 = require('fs');
  return chromium.launch().catch(e => {
    for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){
      try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){}
    }
    throw e;
  });
}
global.__capLog = {};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });

  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await ensureLoop(page);

  /* 게임을 «정지» 시킨다 — 연출만 움직이게 */
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }        /* 배열을 비우면 파도 클리어 (42 교훈 1) */
    parts.length = 0; nums.length = 0; shots.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    window.step = () => {};                            /* 로직 정지 — 렌더·fx 는 계속 돈다 */
  });
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const buf = recorder(cdp);
  /* 14회차 — png → jpeg. 1080×2280 PNG 인코딩이 프레임 전달을 74ms 로 묶고 있었다
     (probe58g 실측 rAF 는 32~43ms). jpeg q86 이면 인코딩이 절반 이하라 원본 밀도가 오른다. */
  /* 6회차 — quality 86 은 이 컨테이너에서 인코딩이 rAF 를 따라가지 못해, 비평가 U 가 «렌더 프레임이
     정답표보다 f7 68ms → f9 219ms 로 갈수록 뒤진다» 를 실측했다. 비평가 5명이 독립적으로 잡은
     «50~82ms 정지 프레임» 은 게임이 멈춘 것이 아니라 **그 드리프트로 같은 합성 프레임이 두 번 실린
     것**이다(rAF 기준 게이트는 정지 0/395). 인코딩 비용을 낮춰 드리프트를 줄인다. */
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:55, maxWidth:1080, maxHeight:2280, everyNthFrame:1 });
  await page.waitForTimeout(300);

  /* 15회차 — 연출을 찍기 «전» 에 이 실행의 라벨 바이어스를 잰다. 시계는 여기서만 뜨고 곧 지워지므로
     저장되는 프레임에는 남지 않는다. 잰 뒤 버퍼를 비우고 한 박자 쉬어 시계 프레임이 기준 프레임으로
     새어 들어가지 않게 한다. */
  ({ bias: BIAS, skew: SKEW } = await measureBias(page, cdp, buf));
  /* 시계를 지운 «뒤» 에도 바이어스만큼은 시계가 든 프레임이 계속 도착한다(그게 바로 재고 있는 값이다).
     넉넉히 흘려보내고 버퍼를 비워야 시계가 기준 프레임으로 새지 않는다. */
  await page.waitForTimeout(Math.max(500, BIAS + 400));
  buf.length = 0;

  const run = async (tag, trigger, waitMs) => {
    /* 트리거 «직전» 프레임을 기준으로 남긴다. 화면이 정지해 있으면 스크린캐스트가 프레임을 안 내보내므로
       살짝 흔들어(딤 1px 오프셋 없이) 마지막 프레임을 확보한다 — 없으면 스스로 오류를 낸다. */
    await page.evaluate(() => { const l = document.getElementById('fxl');
      const d = document.createElement('s'); d.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;background:rgba(0,0,0,.01)';
      l.appendChild(d); setTimeout(() => d.remove(), 30); });
    await page.waitForTimeout(260);
    const pre = buf.length ? buf[buf.length - 1] : null;
    buf.length = 0;
    const t0 = await page.evaluate(trigger);
    if(t0 && t0.err) throw new Error(`${tag}: ${t0.err}`);
    /* 93 5회차 — **HUD 숫자·비행 개수의 «정답» 을 프레임과 같이 남긴다.**
       4회차까지 비평가 6명 중 3명이 프레임에서 숫자를 잘못 읽어(«0 인 채로 있다가 한 프레임에 77% 점프»
       같은 오독) 존재하지 않는 결함을 1순위 감점으로 올렸다. 화면을 다시 읽게 하지 말고 값을 준다. */
    /* 5회차 버그 — 정답표의 시계가 프레임 시계와 **200ms 어긋나 있었다**(비평가 T ③).
       `t0.t` 는 페이지 안에서 트리거 «직전» 에 찍은 Date.now() 인데, 이 로그는 그 evaluate 가
       왕복해 돌아온 «뒤» 에 자기 시계를 0 으로 잡았다. 트리거 시각을 넘겨 같은 원점을 쓴다. */
    const log = await page.evaluate(async ([ms, t]) => {
      const out = []; let spawn = 0; let cloneSeen = 0, cloneDiff = 0;
      const nf = () => new Promise(r => requestAnimationFrame(() => r()));
      /* ⚑ 17회차 — **정답표가 «화면에 없는» 요소를 읽고 있었다.** 모달(씬B)에서 딤 «위» 에 보이는
         알약은 `#goldN`/`#diaN` 을 품은 원본이 아니라 `fxLit` 복제판이고, 원본은 딤 아래라
         비평가에게 안 보인다. 15회차 AN 의 «정답표 9칸 중 7칸이 한 롤링 스텝 뒤처진다» 는
         시계 스큐가 아니라 **이것**이었다(16회차b 가 같은 결함을 probe93l 에서 고쳤는데,
         정답표는 그대로 원본을 읽고 있었다 — 43 교훈 1 «내 assert 가 어디를 재는지부터 확인»).
         → 복제판이 살아 있으면 복제판을, 없으면 원본을 읽는다. «보이는 것» 이 정답이다. */
      const vis = (cur) => {
        const el = document.querySelector('.cbox[data-cur="' + cur + '"]');
        const orig = ((el && el.querySelector('b')) || {}).textContent || '';
        const lit = (typeof fxLit !== 'undefined' && el) ? fxLit.get(el) : null;
        if(!lit || !lit.c) return orig;
        const b = lit.c.querySelector('b');
        if(!b) return orig;
        cloneSeen++; if(b.textContent !== orig) cloneDiff++;
        return b.textContent;
      };
      while(Date.now() - t < ms + 260){
        /* 스폰 시각은 «rAF 로 관측한 프레임» 이 아니라 아이콘 자신이 들고 있는 시작 시각(f.st)에서
           역산한다 — 관측으로 잡으면 한 프레임(35~50ms) 늦게 찍혀 «도착이 그만큼 이르다» 로 읽힌다. */
        if(!spawn){
          const f0 = fxFlies.find(f => f.ui);
          if(f0) spawn = Math.round(Date.now() - (performance.now() - f0.st) - t);
        }
        out.push([Date.now() - t,
                  vis('gold'),
                  vis('dia'),
                  fxFlies.filter(f => f.ui).length,
                  'D' + (fxDisp.gold==null?'null':Math.round(fxDisp.gold))
                  + ' H' + (fxHold.gold ? Math.round(fxHold.gold - performance.now()) : 0)
                  + ' S' + (fxStepTo.gold==null?'-':Math.round(fxStepTo.gold))
                  + ' G' + Math.round(S.gold)]);
        await nf();
      }
      out.spawn = spawn;
      return { rows:out, spawn, cloneSeen, cloneDiff };
    }, [waitMs || 1900, t0.t]);
    const worst = pick(buf, t0.t, tag, pre);
    if(global.__capLog) global.__capLog[tag] = log;
    return worst;
  };

  /* ── 씬 1: 재화 획득 (전투 드랍 지점 → HUD 골드 알약) ── */
  /* 실제 획득 경로와 같은 «S 증가» 로 트리거하되, t0 는 «비행이 시작된 순간» 으로 잡는다 —
     fxWatch 의 묶음 디바운스(180ms) 만큼 앞이 비면 8프레임의 앞 두 장이 정지 화면으로 낭비된다. */
  await run('gain', async () => {
    /* 12회차 — 출발점을 용사 «바로 옆»(적이 죽은 자리에 해당)으로. +120 world px 는 프레임에서
       224~278px 우측 빈 바닥이라 비평가 2인이 «획득 지점에 앵커되지 않았다» 로 감점했다 —
       실제 게임은 킬마다 `fxAt(fxWorld(e.x, e.y-e.r))` 로 죽은 자리를 준다. 하네스가 틀렸다. */
    /* 15회차 — (+26,−54) world = 프레임 (+52,−108)px 라 «용사에서 우상 +123/−158 이탈»(W·X 공통,
       스폰 지터 포함 실측)로 잡혔다. 죽은 자리는 용사 «바로 옆» — 반경을 절반 이하로 줄인다. */
    const p = fxWorld(player.x + 12, player.y - 20);
    fxAt(p);
    S.gold += 128000;
    /* 7회차 — 원점을 **트리거 시각**으로 통일한다(quest 씬과 같게). 예전에는 여기서 «첫 아이콘이
       생긴 뒤» 를 찍어서 정답표의 t 원점이 씬마다 달랐고, 비평가 2명이 gain 에서도 스폰 지연을
       한 번 더 빼는 바람에 «도착이 49~140ms 이르다» 는 없는 결함을 두 회차 연속 보고했다. */
    const tTrig = Date.now();
    const ok = await new Promise(res => {
      const iv = setInterval(() => { if(document.querySelector('#fxl .fx-fly')){ clearInterval(iv); res(1); } }, 8);
      setTimeout(() => { clearInterval(iv); res(0); }, 1500);
    });
    return ok ? { t:tTrig } : { err:'비행 아이콘이 생성되지 않았다 — 트리거 실패' };
  });

  /* ── 씬 2: 보상 수령 (퀘스트) ── */
  /* 15회차 — base 를 -1e9 로 두면 수령 «직후의 다음 티어» 도 즉시 60/60 완료라, 재렌더 뒤 행이
     «체크는 사라졌는데 버튼이 다시 활성 + 진행 그대로» 로 찍혀 상태 모순으로 오독된다(14회차 W ④).
     실플레이처럼 «정확히 이번 티어만 완료» 상태를 만든다 — 수령 후엔 0/<다음 목표> 비활성이 찍힌다. */
  await page.evaluate(() => {
    /* 3회차 — 씬A 가 골드를 128K 로 올려 놓아서, 보상 +400 이 `fmt` 축약(«128K»)에 삼켜져
       **17프레임 내내 숫자가 한 번도 안 바뀐다**(비평가 K ① 감점 1위 — «도착 개수 == 숫자 진행» 을
       한 프레임도 입증 못 함). 잔고를 세 자리로 낮춰 보상이 자릿수로 드러나게 한다.
       fxSeen/fxDisp 를 같이 맞춰 «감소» 가 다음 씬의 기준 프레임에 유령으로 남지 않게 한다. */
    S.gold = 900; S.dia = 300;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    fxSeen.dia = S.dia;  fxDisp.dia = S.dia;  fxAcc.dia = 0;  fxHold.dia = 0;
    document.querySelectorAll('#fxl .fx-plus, #fxl .fx-fly').forEach(e => e.remove());
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
  });
  await page.waitForTimeout(400);
  await run('quest', () => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 «보상 받기» 버튼을 찾지 못했다' };
    b.click();                                         /* 페이지 안에서 resolve+click (25 교훈 5) */
    return { t: Date.now() };
  }, 2100);

  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,8).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  /* 프레임별 «정답» 표 — 비평 전달문에 그대로 붙인다 */
  for(const tag in global.__capLog){
    const L = global.__capLog[tag].rows, SP = global.__capLog[tag].spawn;
    /* 17회차 — 화면이 시각 ms 에 보여 준 값은 샘플러가 **ms − SKEW** 에 읽은 행이다(§measureBias). */
    const at = ms => { const w = ms - SKEW; let b = L[0]; for(const r of L) if(Math.abs(r[0]-w) < Math.abs(b[0]-w)) b = r; return b; };
    const T = (global.__capT && global.__capT[tag]) || [];
    const CS = global.__capLog[tag].cloneSeen | 0, CD = global.__capLog[tag].cloneDiff | 0;
    console.log(`  · ${tag} 정답표(t = 트리거 기준 ms · 스폰 지연 ${SP}ms · 스큐 보정 −${SKEW}ms · 골드/다이아/비행수): ` +
      T.map(ms => ms + ':' + at(ms)[1] + '/' + at(ms)[2] + '/' + at(ms)[3]).join('  '));
    /* 17회차 — 이 표가 «딤 위 복제판» 을 읽은 표본과, 그중 원본과 값이 달랐던 표본 수.
       CD > 0 이면 종전 정답표(원본 읽기)는 그만큼 화면과 다른 값을 비평가에게 준 것이다. */
    if(CS) console.log(`    · ${tag} 복제판 판독: 표본 ${CS}회 중 원본과 값이 달랐던 표본 ${CD}회 (종전 표는 이 ${CD}회를 틀리게 적었다)`);
  }
  console.log('\ncap93 OK — docs/review/93-' + ROUND + '-*.jpg');
})().catch(e => { console.error('cap93 실패:', e.message); process.exit(1); });
