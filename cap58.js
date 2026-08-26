#!/usr/bin/env node
/* 58 UI 연출 — 연속 프레임 캡처 (ROUTINE [3]-(다): 트리거 직후 80~100ms 간격 6~8장)
 *
 *   node cap58.js [라운드]      # 기본 r2 → docs/review/58-<라운드>-<씬>-<n>.jpg (14회차부터 jpeg)
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

const ROUND = process.argv[2] || 'r2';
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
/* 19회차 (2026-08-26) — **씬마다 창이 다르다.** 작업 93(주인 지시)이 «UI 발» 재화 흡수를
   0.3~0.8초 → **1.1~1.4초 3박자**(첫 도착 0.50s · 마지막 도착 1.22s)로 바꿨다. 0~850ms 창으로는
   흡수 구간의 뒤 2/3 가 통째로 안 잡혀 «연출이 끊겼다» 는 없는 결함이 보고된다(93 리뷰 §5 · 교훈).
   → 재화 흡수가 걸린 gain·quest 는 `cap93.js` 와 **같은 16프레임(95~1520ms)**,
     강화 피드백(upg)은 93 이 손대지 않은 구간이라 **기존 7프레임(100~850ms)** 을 그대로 쓴다.
   씬마다 창이 다르므로 비평가 전달문에 «이 씬의 프레임 시각» 을 반드시 같이 적을 것. */
const WANT_FX  = [95, 190, 285, 380, 475, 570, 665, 760, 855, 950, 1045, 1140, 1235, 1330, 1425, 1520];
/* 24회차 — 착수점 3(2인 공통 «씬 C 마지막 303ms 가 죽은 꼬리»: AN «f7(694)↔f8(850) 변경 0px» ·
   AP «f7→f8 156ms 변화 0px»). 0번(중복 페인트)을 먼저 배제하고 봤다 — upg 8장에는 md5 중복이
   없었으므로 진짜다. `probe58s` 로 «#fxl 요소 좌표·불투명도 + 카드 transform/filter + .cv 불투명도»
   서명을 rAF 마다 비교하니 **마지막으로 무엇이든 바뀐 시각이 677ms** 다. 즉 연출은 규격(0.3~0.8s)
   안에서 정상적으로 끝나는데 690·850 두 슬롯이 **끝난 뒤의 빈 화면**을 재고 있었다 — 결함은
   연출이 아니라 창이다(0번과 같은 계열). 창을 실제 연출 길이에 맞춰 다시 깐다. */
const WANT_UPG = [95, 175, 255, 335, 425, 530, 660];
const WANT_BY  = { gain: WANT_FX, quest: WANT_FX, upg: WANT_UPG };

/* ── 스크린캐스트 수집기 ── */
function recorder(cdp){
  const buf = [];
  cdp.on('Page.screencastFrame', async (e) => {
    buf.push({ t: e.metadata.timestamp * 1000, data: e.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch(_){}
  });
  return buf;
}
/* 14회차 — «가장 가까운 프레임» 을 목표 시각마다 독립적으로 고르면 **같은 원본 프레임이
   이웃한 두 목표에 중복 선택**된다(원본 간격 74ms vs 목표 간격 90~130ms). 13회차 비평 U·V 가
   «166ms 동결» 로 잡은 것이 바로 이 중복이다 — probe58f 실측에는 정지 구간이 없다.
   → 목표 시각 순서대로 **아직 안 쓴 프레임 중에서만** 고른다(단조 증가 보장). 그래도 목표에서
   ±55ms 넘게 벗어난 프레임은 로그에 «WARN» 으로 남겨 비평가 전달문에 적게 한다. */
/* 29회차 — ⚑ **프레임 «라벨» 도 낡아 있었다.** 28회차가 고친 것은 정답표 쪽뿐이다(밴드).
   프레임을 고르는 이 함수는 여전히 «타임스탬프 dt» 로 골라서, 비평가에게 «이 장은 t=95ms» 라고
   말하면서 실제로는 **t = 95 − lag** 의 DOM 을 보여 주고 있었다. lag 바닥이 56~68ms 라 95 슬롯은
   구조적으로 «스폰(트리거 +35ms) 직전» 을 찍는다 — 28차 2인 공통 1순위 «씬 A 스폰 91ms 무반응»
   (AX «금색 화소 518px = 기준과 Δ−4%» · AW «세 임계 전부 블롭 0개»)이 정확히 이것이다.
   `probe58ae` 실측(5런): 첫 DOM 생성 트리거 +32~39ms · **16개 전부 «지름 16px 이상 + opacity≥.5»
   가 트리거 +62.5~74ms**(지름 37.8~38.9px). 두 사람이 요구한 «t≈91ms 에 8개 이상» 은 게임에서
   이미 성립하고 있었다 — 그 프레임을 못 보고 있었을 뿐이다.
   → 목표 시각을 **프레임의 «진짜 DOM 시각»**(dt − lag) 으로 맞춘다. 로그·파일명·비평 브리프에
     적히는 t 도 전부 이 진짜 시각이다. 정답표 밴드는 **원본 dt** 로 계속 뽑는다(이중 차감 금지) —
     `__capT`(원본 dt) 와 `__capTrue`(진짜 시각)를 따로 들고 나가는 이유가 그것이다.
   lag 을 못 쟀으면(교정 실패) med=0 이라 종전 거동 그대로다. */
function pick(buf, t0, tag, pre, LAG){
  const lagMed = LAG ? LAG.med : 0;
  /* -60 까지 허용하면 트리거 «이전» 프레임이 0ms 슬롯을 먹는다(14회차 upg: 8슬롯 중 2장이 기준) */
  const rel = buf.map(f => ({ dt: f.t - t0, data: f.data })).filter(f => f.dt >= -8);
  if(rel.length < (WANT_BY[tag] || WANT_UPG).length) throw new Error(`${tag}: 렌더 프레임이 ${rel.length}장뿐이다 — 스크린캐스트 실패`);
  if(!pre) throw new Error(`${tag}: 트리거 직전 기준 프레임이 없다`);
  const gaps = rel.slice(1).map((f, i) => f.dt - rel[i].dt);
  const med = gaps.slice().sort((a,b) => a-b)[gaps.length >> 1] || 0;
  const WANT = WANT_BY[tag] || WANT_UPG;
  /* `true` = 이 프레임이 실제로 그린 DOM 의 시각. 목표도 이 축에서 맞춘다. */
  const out = [{ want:'기준', got:Math.round(pre.t - t0 - lagMed), raw:Math.round(pre.t - t0), data:pre.data }];
  let from = 0;
  for(const w of WANT){
    let bi = from;
    for(let i = from; i < rel.length; i++)
      if(Math.abs(rel[i].dt - lagMed - w) < Math.abs(rel[bi].dt - lagMed - w)) bi = i;
    out.push({ want:w, got:Math.round(rel[bi].dt - lagMed), raw:Math.round(rel[bi].dt), data:rel[bi].data });
    from = Math.min(bi + 1, rel.length - 1);            /* 다음 목표는 이 프레임 «뒤» 에서만 고른다 */
  }
  /* 마지막 슬롯이 버퍼 끝에 닿았으면 «창이 lag 만큼 모자랐다» 는 뜻이다 — 조용히 넘어가면
     뒤 슬롯 몇 장이 같은 마지막 프레임으로 채워진다(24회차의 «죽은 꼬리» 와 구별이 안 된다). */
  if(lagMed && out[out.length-1].raw >= Math.round(rel[rel.length-1].dt) - 1)
    console.log(`    ⚠ WARN ${tag}: 마지막 슬롯이 스크린캐스트 버퍼 끝(dt ${Math.round(rel[rel.length-1].dt)}ms)에 닿았다`
      + ` — lag ${Math.round(lagMed)}ms 만큼 창이 모자란다. 뒤쪽 슬롯의 «정지» 는 캡처 탓일 수 있다.`);
  global.__capT = global.__capT || {};                  /* 원본 dt — 정답표 밴드 계산용 */
  global.__capTrue = global.__capTrue || {};            /* 진짜 DOM 시각 — 비평가에게 보이는 라벨 */
  global.__capT[tag] = out.slice(1).map(f => f.raw);
  global.__capTrue[tag] = out.slice(1).map(f => f.got);
  out.forEach((f, i) => fs.writeFileSync(path.join(OUT, `58-${ROUND}-${tag}-${i+1}.jpg`), Buffer.from(f.data, 'base64')));
  /* 23회차 — 비평가 AN·AP 가 **독립적으로** «quest f2(79)와 f3(185)가 바이트 단위로 동일 =
     106ms 정지 · 퍼짐이 293ms 늦다» 를 ① 축 최대 감점으로 냈다. 셋 다 틀렸다 — `probe58p` 로
     10ms 간격으로 재 보면 게임은 **t=104ms 에 16개 전부 opacity 1** 이고 뭉치가 75×111 →
     113×167(t=210) 로 자란다. 스크린캐스트가 서로 다른 타임스탬프로 **같은 페인트**를 두 번
     내보냈고, `pick()` 이 그것을 두 슬롯에 그대로 써서 «정지 프레임» 을 만들어 냈다.
     (22회차의 pointerdown 결함과 같은 계열 — «비평가 둘이 같은 걸 적으면 대개 하네스다».)
     → 고쳐 쓸 수는 없다(없는 페인트를 만들 수 없다). 대신 **소리내어 알린다** — 중복이 있으면
        그 슬롯을 찍어서, 비평가 전달문에 «이 두 장은 같은 페인트다, 정지로 세지 말 것» 을
        넣게 한다. 조용히 넘어가면 매 회차 ① 에서 2~3점이 그냥 날아간다. */
  const dup = [];
  for(let i=1;i<out.length;i++) if(out[i].data === out[i-1].data)
    dup.push(`${i}↔${i+1}(t=${out[i-1].got}↔${out[i].got}, Δ${out[i].got - out[i-1].got}ms)`);
  if(dup.length) console.log(`    ⚠ 중복 페인트 ${tag}: ${dup.join(' · ')} — **같은 스크린캐스트 프레임**이다.`
    + ` 비평가에게 «이 슬롯 쌍은 캡처가 같은 페인트를 두 번 쓴 것이니 «정지 프레임» 으로 세지 말 것»`
    + ` 이라고 반드시 알려라(23회차: 이걸 안 알려서 AN·AP 둘 다 ① 을 3점으로 냈다).`);
  const worst = Math.max(...out.slice(1).map(f => Math.abs(f.got - f.want)));
  console.log(`  ✓ ${tag}: ${out.length}장 (1=기준) · 실제 t = ${out.map(f => f.got).join(', ')}ms`
    + (lagMed ? ` [**그려진 DOM 시각** — 원본 타임스탬프에서 lag ${Math.round(lagMed)}ms 를 뺀 값이다]` : '')
    + ` (목표 대비 최대 ±${worst}ms, 원본 ${rel.length}프레임 · 중앙 간격 ${Math.round(med)}ms)`);
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
/* 28회차 — 정답표 시계 교정. rAF 마다 R 채널이 STEP 씩 오르는 계단 막대를 좌상단에 얹고,
   (계단번호, DOM Date.now()) 를 기록한 뒤 그 구간의 스크린캐스트 프레임에서 막대 색을 되읽어
   «그 그림이 어느 시각의 DOM 인가» 를 낸다. 판독은 `probe58ad.py` 가 한다(같은 manifest 형식).
   ⚠ 교정 프레임은 **씬 캡처 전에** 찍고 곧바로 `buf` 를 비우므로 채점용 프레임에는 안 들어간다.
   ⚠ JPEG q55 로 오므로 계단 폭을 16(16계단)으로 넉넉히 잡고, 판독은 60×60 블록 평균을 쓴다. */
async function calibrate(page, cdp, buf){
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap58lag-'));
  fs.mkdirSync(path.join(dir, 'f'), { recursive:true });
  const mark = buf.length;
  const rows = await page.evaluate(async () => {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;z-index:99999;pointer-events:none;background:rgb(0,0,0)';
    document.body.appendChild(bar);
    const out = []; let i = 0; const t0 = Date.now();
    await new Promise(res => {
      const step = () => {
        bar.style.background = `rgb(${(i % 16) * 16},0,0)`;
        out.push([i, Date.now()]); i++;
        if(Date.now() - t0 < 900) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    bar.remove();
    return out;
  });
  await page.waitForTimeout(260);                    /* 마지막 막대 프레임이 도착할 시간 */
  const man = { rows, step:16, cycle:16, frames:[] };
  buf.slice(mark).forEach((f, n) => {
    const fp = path.join(dir, 'f', String(n).padStart(4,'0') + '.jpg');
    fs.writeFileSync(fp, Buffer.from(f.data, 'base64'));
    man.frames.push({ n, t:f.t, file:fp });
  });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man));
  const { execFileSync } = require('child_process');
  const out = execFileSync('python3', [path.resolve(__dirname, 'probe58ad.py'), path.join(dir, 'manifest.json')],
                           { encoding:'utf8' });
  fs.rmSync(dir, { recursive:true, force:true });
  const m = /P58AD_LAG_LO=([\d.]+) P58AD_LAG_MED=([\d.]+) P58AD_LAG_HI=([\d.]+) P58AD_N=(\d+)/.exec(out);
  if(!m) throw new Error('probe58ad.py 가 lag 을 못 냈다 — ' + out.trim().split('\n').pop());
  const lag = { lo:+m[1], med:+m[2], hi:+m[3], n:+m[4] };
  console.log(`  · 정답표 시계 교정(probe58ad, 프레임 ${lag.n}장): 프레임이 자기 타임스탬프보다 ` +
              `**${lag.lo.toFixed(0)}~${lag.hi.toFixed(0)}ms 낡았다**(중앙 ${lag.med.toFixed(0)}ms). ` +
              `정답표는 이 밴드로 적는다.`);
  return lag;
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
  /* 19회차 — quality 86 → **55**. 93 6회차가 실측한 것: q86 은 이 컨테이너에서 인코딩이 rAF 를
     따라가지 못해 **같은 합성 프레임이 두 번 실린다**. 13·14회차 비평가가 «166ms 동결» 로 잡은 것이
     이것이고, rAF 기준 게이트에는 정지 구간이 없다(probe58f). 핸드오프 ⓓ «캡처 절차 재검» 이 이 줄이다. */
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:55, maxWidth:1080, maxHeight:2280, everyNthFrame:1 });
  await page.waitForTimeout(300);

  /* ── 28회차 신설 — **정답표 시계 교정** (`probe58ad`) ──
     25·26차 비평이 2인 공통으로 «HUD 카운터가 정답표보다 한 계단 늦다» 를 냈다. 26회차의
     `probe58z` 가 «크레딧 − 실도착 = 0»(전 프레임)을 내서 «카운터↔도착» 축은 이미 맞은 것이
     확인됐으므로, 남은 축은 **«도착↔정답표»** — 즉 여기다.

     아래 정답표는 `#goldN`.textContent 를 rAF 마다 찍어 두고 프레임 시각 T 에 «T 이하의 마지막
     표본» 을 고른다(22회차). 그 규칙은 «타임스탬프 T 인 프레임의 그림 = 시각 T 의 DOM» 일 때만
     옳은데, 합성 프레임이 그리는 것은 **마지막 커밋 시점의 DOM** 이라 T 보다 낡았다.
     `probe58ad` 로 rAF 계단 막대를 심어 직접 재니 **4회 전부 · 프레임 117/117 이 rAF 한 칸보다
     낡았다**(바닥 56~68ms, 부하가 걸리면 488ms). 정답표가 그만큼 «앞선» 값을 적고 있었고,
     비평가는 그것을 정직하게 «카운터가 늦다» 로 읽었다.

     교정은 «한 값을 빼기» 로는 안 된다 — lag 이 부하에 따라 3~15 rAF 칸으로 흔들린다.
     이 실행의 lag 분포(p10~p90)를 재서 정답표를 **밴드**로 적는다. 밴드 안에서 값이 안 바뀌면
     종전처럼 한 값이고, 바뀌면 «a~b» 로 적어 «이 프레임은 둘 중 하나» 임을 알린다. */
  let LAG = null;
  try { LAG = await calibrate(page, cdp, buf); } catch(e){ console.log('  ⚠ 시계 교정 실패 — ' + e.message); }
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
    /* 19회차 — 93 5회차의 «프레임별 정답표» 를 58 에도 옮긴다. 93 에서 비평가 6명 중 3명이 프레임에서
       숫자를 잘못 읽어 **없는 결함을 1순위 감점**으로 올렸다. 화면을 다시 읽게 하지 말고 값을 준다.
       시계 원점은 반드시 `t0.t`(페이지 안에서 트리거 직전에 찍은 Date.now) — evaluate 왕복분(93 5회차
       버그: 200ms 어긋남)이 끼면 정답표가 프레임과 다른 시계를 쓰게 된다. */
    const log = await page.evaluate(async ([ms, t]) => {
      const out = []; let spawn = 0;
      const nf = () => new Promise(r => requestAnimationFrame(() => r()));
      while(Date.now() - t < ms + 260){
        if(!spawn){
          const f0 = (typeof fxFlies !== 'undefined') && fxFlies.find(f => f.ui);
          if(f0) spawn = Math.round(Date.now() - (performance.now() - f0.st) - t);
        }
        /* 30회차 — **알약 펀치 배율을 정답표에 넣는다.** 29차 2인 공통 ②-2 «골드 +23~24% vs
           다이아 +4~6% (임계 3종 부호 동일)» 는 게임이 아니라 **시간축 앨리어싱**이었다:
           `p58pz2` 로 rAF 마다 rect 를 재니 두 알약 다 정확히 **+22.0%** 까지 부푼다. 그런데
           비트 간격이 113~198ms · 봉우리 체류가 ≈95ms 라, 100ms 리듬 표본은 위상에 따라
           «관측 최대» 가 골드 2.4~22.0% · 다이아 0.5~22.0% 로 갈린다 — 두 알약의 비트 열이
           서로 엇물려 있어(16회차b 의 도착 깍지) **같은 리듬이 한쪽만 골짜기에서 표본**한다.
           임계를 흔들어도 이건 안 잡힌다(공간이 아니라 시간에서 생기는 오차다). 13회차가 이미
           같은 오진을 겪고 «자체 덤프로 기각» 했는데 회차가 바뀌자 그대로 되돌아왔다.
           → 값을 주면 다시는 이걸로 감점하지 않는다. `--` 는 그 알약이 안 부푼 프레임이다. */
        const pz = k => { try{ const p = fxPill(FXCUR[k]); if(!p) return '--';
            const el = (typeof fxLit !== 'undefined' && fxLit.get(p)) ? fxLit.get(p).p : p;
            const m = (el.style.transform||'').match(/scale\(([\d.]+)\)/);
            return m ? ('x' + (+m[1]).toFixed(2)) : '--'; }catch(_){ return '--'; } };
        out.push([Date.now() - t,
                  (document.getElementById('goldN')||{}).textContent || '',
                  (document.getElementById('diaN')||{}).textContent || '',
                  (typeof fxFlies !== 'undefined') ? fxFlies.filter(f => f.ui).length : 0,
                  document.querySelectorAll('#fxl .fx-fly').length,
                  pz('gold'), pz('dia')]);
        await nf();
      }
      return { rows:out, spawn };
      /* 29회차 — 창을 lag 만큼 늘린다. 마지막 슬롯(1520ms)이 «진짜 DOM 시각» 축이 되면 필요한
         원본 타임스탬프는 1520 + lag 이라, 종전 창(1800+260)으로는 부하가 걸린 실행에서 뒤 슬롯이
         버퍼 끝에 붙는다. 이 루프가 도는 동안 스크린캐스트도 계속 프레임을 내보낸다. */
    }, [(waitMs || 1800) + (LAG ? Math.ceil(LAG.hi) : 0), t0.t]);
    const worst = pick(buf, t0.t, tag, pre, LAG);
    global.__capLog[tag] = log;
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
    const t0 = await new Promise(res => {
      const iv = setInterval(() => { if(document.querySelector('#fxl .fx-fly')){ clearInterval(iv); res(Date.now()); } }, 8);
      setTimeout(() => { clearInterval(iv); res(0); }, 1500);
    });
    return t0 ? { t:t0 } : { err:'비행 아이콘이 생성되지 않았다 — 트리거 실패' };
  });

  /* ── 씬 2: 보상 수령 (퀘스트) ── */
  /* 15회차 — base 를 -1e9 로 두면 수령 «직후의 다음 티어» 도 즉시 60/60 완료라, 재렌더 뒤 행이
     «체크는 사라졌는데 버튼이 다시 활성 + 진행 그대로» 로 찍혀 상태 모순으로 오독된다(14회차 W ④).
     실플레이처럼 «정확히 이번 티어만 완료» 상태를 만든다 — 수령 후엔 0/<다음 목표> 비활성이 찍힌다. */
  await page.evaluate(() => {
    /* 24회차 — 착수점 6(2인 공통 «골드 표기가 f2~f17 내내 128A 로 고정인데 알약엔 흡수 팝 +23%
       와 «+400» 플로터가 붙는다», AN #13 · AP ④). **하네스였다** — 씬 1(gain)이 +128,000 을
       넣어 둔 골드를 씬 2 가 그대로 물려받아, 퀘스트 보상 +400 이 111 의 알파벳 단위 표기에서
       «128A» 안으로 삼켜진다(반올림 아래). 게임은 정상이다: 값도 롤링도 실제로 오른다.
       씬 2 를 «+400 이 표기에서 보이는» 자리에서 시작시킨다 — 씬 3(upg)이 `S.gold = 1e13` 앞에서
       하는 것과 같은 방식으로 fx 감시 상태(fxSeen/fxDisp/fxAcc/fxHold)를 같이 맞춰 준다.
       안 맞추면 이 «되돌리기» 자체가 획득으로 잡혀 재화 연출이 한 벌 더 딸려 온다. */
    S.gold = 820;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
  });
  await page.waitForTimeout(400);
  await run('quest', () => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 «보상 받기» 버튼을 찾지 못했다' };
    /* 22회차 — **하네스 결함이었다.** 21차 비평 AJ #6 · AK #4 가 «클릭 후 95ms 동안 화면 변화 0px
       (f1≡f2 md5 동일)» 을 2인 공통으로 잡았는데, 원인은 게임이 아니라 여기다: `el.click()` 은
       `click` 만 발화하고 **`pointerdown` 은 안 낸다.** 60 쥬시의 누름 피드백(`jz-dn`)은 pointerdown
       캡처 리스너에 걸려 있어(74 «탭 유실» 대책) 이 경로로는 **영원히 안 붙는다** — 실기기에서는
       손가락이 pointerdown 을 내므로 있는 반응이, 캡처에만 없었다(`jzchk58.js` 로 확인:
       `b.click()` → 클래스 그대로 · pointerdown 디스패치 → `jz-dn` 부착).
       upg 씬은 작업 64 이후 pointerdown 으로 누르고 있어 이미 옳았다 — quest 만 어긋나 있었다. */
    const rc = b.getBoundingClientRect();
    const pe = t => new PointerEvent(t, { bubbles:true, cancelable:true,
      clientX: rc.left + rc.width/2, clientY: rc.top + rc.height/2 });
    b.dispatchEvent(pe('pointerdown'));
    b.dispatchEvent(pe('pointerup'));
    b.click();                                         /* 페이지 안에서 resolve+click (25 교훈 5) */
    return { t: Date.now() };
  }, 1800);

  /* ── 씬 3: 강화 성공 (훈련 카드) ── */
  /* ⚠ `S.gold = 1e13` 자체가 «획득» 이라 재화 연출이 딸려 온다 — 그 «+10.0T» 플로터가 다음 씬의
     기준 프레임까지 넘어가 «유령 텍스트» 로 오독된다(10회차 지적). 감시 기준값을 같이 맞춰 둔다. */
  await page.evaluate(() => {
    closeModal(); S.gold = 1e13;
    fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    document.querySelectorAll('#fxl .fx-plus, #fxl .fx-fly').forEach(e => e.remove());
    openTrain();
  });
  await page.waitForTimeout(500);
  await run('upg', () => {
    const c = document.querySelector('#trw [data-tr]');
    if(!c) return { err:'훈련 카드를 찾지 못했다' };
    /* 작업 64 이후 훈련 카드는 `click` 이 아니라 `pointerdown`(꾹 누르기 연속 강화)로 동작한다 */
    c.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    return { t: Date.now() };
  });

  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,8).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  /* 프레임별 «정답» 표 — 비평 전달문에 그대로 붙인다 */
  for(const tag in global.__capLog){
    const L = global.__capLog[tag].rows, SP = global.__capLog[tag].spawn;
    /* 22회차 — 21차 비평 AJ·AK 가 **독립적으로 같은 어긋남**을 보고했다: 정답표가 실제 프레임보다
       한 페인트 앞선다(AK 실측 — 첫 비영 프레임은 f7(570ms), 명목 스케줄의 f6(475ms)이 아니다).
       원인은 «가장 가까운 표본» 이다 — 스크린캐스트 프레임이 보여 주는 것은 그 시각 «직전에 이미
       합성된» 화면인데, 뒤쪽(아직 안 그려진) 표본이 더 가까우면 그걸 골라 버린다.
       → **그 시각 이하의 마지막 표본**을 쓴다. 정답표는 오독을 막으려고 만든 장치라, 그게 틀리면
       없느니만 못하다. */
    const at = ms => { let b = L[0]; for(const r of L){ if(r[0] <= ms) b = r; else break; } return b; };
    const T = (global.__capT && global.__capT[tag]) || [];
    /* 28회차 — 프레임은 자기 타임스탬프보다 lo~hi ms 낡았다(위 `calibrate` 참조).
       그래서 «정답» 은 한 점이 아니라 [T−hi, T−lo] 구간의 값 집합이다. 구간 안에서 값이
       안 변하면 종전과 똑같이 한 값으로 적히고, 변할 때만 «a~b» 로 적힌다 —
       비평가가 «한 계단 어긋났다» 를 결함으로 올리는 것을 여기서 막는다. */
    const band = (ms, col) => {
      if(!LAG) return at(ms)[col];
      const a = at(ms - LAG.hi)[col], b = at(ms - LAG.lo)[col];
      return String(a) === String(b) ? a : a + '~' + b;
    };
    /* 29회차 — 라벨은 «그려진 DOM 시각»(`__capTrue`), 조회는 «원본 타임스탬프»(`__capT`) 로 한다.
       `band()` 가 이미 원본에서 lag 을 빼므로, 라벨 값으로 조회하면 lag 을 두 번 빼게 된다. */
    const TT = (global.__capTrue && global.__capTrue[tag]) || T;
    console.log(`  · ${tag} 정답표(t=트리거 기준 ms, **프레임이 그린 DOM 시각** · 스폰 지연 ${SP}ms · 골드/다이아/비행아이콘수` +
      (LAG ? ` · 프레임은 타임스탬프보다 ${LAG.lo.toFixed(0)}~${LAG.hi.toFixed(0)}ms 낡았고 슬롯이 그만큼 당겨져 있다` : '') + '): ' +
      T.map((ms, i) => (TT[i] != null ? TT[i] : ms) + ':' + band(ms,1) + '/' + band(ms,2) + '/' + band(ms,4)).join('  '));
    /* 30회차 — 알약 펀치 배율(위 `pz` 주석). 두 알약의 **사양 피크는 둘 다 x1.22** 이고,
       프레임에 x1.02 로 찍히는 것은 그 프레임이 비트 사이 골짜기라서다. */
    console.log(`  · ${tag} 알약 펀치 배율(골드/다이아 · **둘 다 사양 피크 x1.22**. 프레임에 작게 찍히면` +
      ` 그 슬롯이 비트 골짜기인 것이지 진폭이 작은 것이 아니다 — 이걸로 «씬·재화마다 진폭이 다르다» 를 쓰지 마라): ` +
      T.map((ms, i) => (TT[i] != null ? TT[i] : ms) + ':' + band(ms,5) + '/' + band(ms,6)).join('  '));
  }
  /* 24회차 — **부분 중복 페인트** 검사를 캡처의 일부로 붙인다.
     위 «⚠ 중복 페인트» 는 프레임 «전체» 가 바이트 동일할 때만 운다. 그런데 CDP 스크린캐스트는
     레이어별로 부분 재합성한 프레임도 내보낸다 — HUD 는 새로 그리고 `#fxl` 오버레이는 앞 프레임
     페인트를 재사용하는 식이다. 그런 쌍은 프레임 전체가 서로 달라 md5 로는 절대 안 잡히는데,
     비평가에게는 «연출이 70ms 멈췄다» 로 정직하게 보인다(24회차 AR ①-1 이 그것이었다 —
     `probe58t` 로 DOM 을 재면 그 구간에 아이콘이 프레임마다 45~63px 씩 움직이고 있었고,
     파일을 재면 연출 구역 변경이 이 씬 중앙값의 1.7% 였다).
     `pxdup58.py` 가 구역별 변경량을 씬 자신의 중앙값과 비교해 그런 쌍을 찾아낸다. */
  try{
    const { execFileSync } = require('child_process');
    const out = execFileSync('python3', [path.resolve(__dirname, 'pxdup58.py'), ROUND],
      { encoding:'utf8', timeout:180000 });
    console.log('\n── 부분 중복 페인트 검사(pxdup58) ──');
    console.log(out.trim());
  }catch(e){
    console.log('\n⚠ pxdup58 를 못 돌렸다(' + (e.message || e) + ') — 손으로 `python3 pxdup58.py '
      + ROUND + '` 를 돌려 결과를 비평가 브리프에 넣어라');
  }
  console.log('\ncap58 OK — docs/review/58-' + ROUND + '-*.jpg');
})().catch(e => { console.error('cap58 실패:', e.message); process.exit(1); });
