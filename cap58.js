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
const WANT_UPG = [100, 210, 320, 380, 550, 690, 850];
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
function pick(buf, t0, tag, pre){
  /* -60 까지 허용하면 트리거 «이전» 프레임이 0ms 슬롯을 먹는다(14회차 upg: 8슬롯 중 2장이 기준) */
  const rel = buf.map(f => ({ dt: f.t - t0, data: f.data })).filter(f => f.dt >= -8);
  if(rel.length < (WANT_BY[tag] || WANT_UPG).length) throw new Error(`${tag}: 렌더 프레임이 ${rel.length}장뿐이다 — 스크린캐스트 실패`);
  if(!pre) throw new Error(`${tag}: 트리거 직전 기준 프레임이 없다`);
  const gaps = rel.slice(1).map((f, i) => f.dt - rel[i].dt);
  const med = gaps.slice().sort((a,b) => a-b)[gaps.length >> 1] || 0;
  const WANT = WANT_BY[tag] || WANT_UPG;
  const out = [{ want:'기준', got:Math.round(pre.t - t0), data:pre.data }];
  let from = 0;
  for(const w of WANT){
    let bi = from;
    for(let i = from; i < rel.length; i++)
      if(Math.abs(rel[i].dt - w) < Math.abs(rel[bi].dt - w)) bi = i;
    out.push({ want:w, got:Math.round(rel[bi].dt), data:rel[bi].data });
    from = Math.min(bi + 1, rel.length - 1);            /* 다음 목표는 이 프레임 «뒤» 에서만 고른다 */
  }
  out.forEach((f, i) => fs.writeFileSync(path.join(OUT, `58-${ROUND}-${tag}-${i+1}.jpg`), Buffer.from(f.data, 'base64')));
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
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:86, maxWidth:1080, maxHeight:2280, everyNthFrame:1 });
  await page.waitForTimeout(300);

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
    await page.waitForTimeout(waitMs || 1800);
    return pick(buf, t0.t, tag, pre);
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
  console.log('\ncap58 OK — docs/review/58-' + ROUND + '-*.jpg');
})().catch(e => { console.error('cap58 실패:', e.message); process.exit(1); });
