#!/usr/bin/env node
/* 119 검증 — 89 유물 소환 비용이 «1 에서 시작, 소환 1회마다 +1» 인가 (198 로 시작가 100 → 1)
 *
 *   node tools/verify119.js
 *
 * 저장소 주인 지시(2026-08-26): «유물 소환 가격은 822 가 아니라 100 으로, 한 번 소환할 때마다 1 씩 추가».
 * 저장소 주인 지시(2026-08-27, 작업 198): «유물 소환 처음 가격 걍 1원부터 시작» — 절편만 100 → 1,
 * 증분 PER 1 과 «축 = 누적 소환 횟수» 는 119 그대로다. 아래 기대값은 전부 그 절편 하나로 다시 계산했다.
 * 지시서 [3]-(가) 기계적 작업이므로 **비평가는 띄우지 않는다**.
 *
 * 항목 (PROGRESS 119 «검증 [3]-(가)» 가 요구한 것 + 111 교훈 1 의 «두 층» 분리):
 *   [A] ⓐ 옛것이 사라졌는가 = **소스 스캔** — `RELIC_COST_BASE = 800`·`RELIC_COST_PER = 22`·
 *       `relicCost` 의 `relicLvSum` 의존·정적 HTML 의 «822» 가 전부 부재. 런타임으로는 영영 못 본다.
 *       (138, 2026-08-26) A5 는 `#rwCost` 의 **`b` 기본 숫자만** 본다 — 아이콘 마크업은 125 소관이라 A7 로 분리.
 *   [B] ⓑ 새것이 맞는가 = 새 세이브 `relicCost() === 1` · `#rwCost` 표시도 «1»
 *   [C] 1회 소환 후 **2** · 유물석이 정확히 1 만 차감
 *   [D] 50회 소환 후 **51** · 누적 차감 = Σ(1…50) = 1,275 (누적식이 아니라 «1씩» 인지)
 *   [E] **축 전환** — 유물 Lv 를 만들어도 비용 불변(구 «800+22×ΣLv» 라면 여기서 값이 튄다)
 *   [F] 홀드 연속 소환 — 매회 재계산 + `#rwCost` 숫자·`lack` 즉시 갱신 ·
 *       다음 1회분에 못 미치면 **홀드 중단**(남은 유물석은 다음 비용보다 작다).
 *       (138, 2026-08-26) 벽시계 1600ms 대기 → «홀드가 스스로 멈출 때까지» 대기로 교체(느린 기기 거짓 FAIL).
 *   [G] 부족 — 비용−1 이면 소환 실패(차감 0) · `lack` 클래스 · 첫 누름만 안내
 *       (175, 2026-08-27) G3 의 기대값이 **작업 149 이전 것**이라 항상 FAIL 이었다.
 *       149 가 «클릭 없이 사라지는 단순 안내» 를 전부 토스트로 옮겼고(`notify()` → `fxToast`),
 *       125 가 이모지 «🔮» 를 화폐 아이콘 `<img data-cur-ic="relic">` 로 바꿨다. 그래서
 *       옛 기대 «본문 텍스트에 «유물조각 부족» 이 보인다» 는 **두 겹으로** 깨져 있었다 —
 *       ⓐ 팝업이 아니라 토스트라 `#modal` 이 안 열리고 ⓑ 문구도 «🔮 N 더 필요합니다» 로 바뀌었으며
 *       그 «🔮» 는 `<img alt="">` 라 innerText 에 한 글자도 안 남는다.
 *       **게임 동작이 아니라 게이트가 낡은 것이다**(149 가 의도한 거동 그대로다) — 기대값만 옮겼다:
 *       G3 = 첫 누름 부족이면 `.fx-toast` 가 뜨고(문구 = 화폐 아이콘 + 부족분 + «더 필요합니다»)
 *       **`#modal` 은 안 열린다**, G4 = 홀드 반복분(quiet)은 **조용하다**(토스트 0 — index.html 의
 *       «반복 중 부족은 조용히(shake만), 첫 누름 부족만 안내» 를 양쪽에서 못 박는다).
 *   [H] 구 세이브 — `S.cnt.sumRelic` 이 쌓여 있으면 **그대로 이어진다**(ΣLv 로 역산하지 않는다) ·
 *       옛 세이브의 문자열·null 카운터가 NaN 으로 새지 않는다
 *   [I] 콘솔 에러 0건 · 유물 페이지 텍스트에 NaN/undefined 0건
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 유물 페이지를 열고 상태를 초기화한다(자동 플레이가 유물석을 건드리지 않으므로 결정적이다) */
const setup = (page, relic, sum) => page.evaluate(([relic, sum]) => {
  S.relic = relic; S.cnt.sumRelic = sum; S.own = {};
  openRelw();
  return { cost: relicCost(), txt: document.querySelector('#rwCost b').textContent };
}, [relic, sum]);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof relicCost === 'function');
  await page.waitForTimeout(400);

  /* ---- [A] 소스 스캔 — 옛 곡선의 부재 (111 교훈 1 ⓐ) ---- */
  ok(!/RELIC_COST_BASE\s*=\s*800/.test(SRC), 'A1 옛 상수 `RELIC_COST_BASE = 800` 부재');
  ok(!/RELIC_COST_PER\s*=\s*22/.test(SRC), 'A2 옛 상수 `RELIC_COST_PER = 22` 부재');
  ok(/const\s+RELIC_COST_BASE\s*=\s*1\s*,\s*RELIC_COST_PER\s*=\s*1\s*;/.test(SRC),
    'A3 새 상수 `RELIC_COST_BASE = 1, RELIC_COST_PER = 1` (198 — 100 → 1)');
  {
    const m = SRC.match(/const\s+relicCost\s*=\s*\(\)\s*=>[^\n]*/);
    ok(!!m && !/relicLvSum/.test(m[0]) && /sumRelic/.test(m[0]),
      'A4 relicCost() 가 ΣLv(relicLvSum) 가 아니라 S.cnt.sumRelic 기반', m ? m[0].trim() : '정의 못 찾음');
  }
  {
    /* 138 — 옛 A5 는 아이콘 마크업(`<i>🔮</i>`)까지 통째로 정규식에 물고 있어서 125(화폐 아이콘 통일)가
     * `<i data-cur-slot="relic"></i>` 로 바꾸자 «비용 표기» 와 무관하게 깨졌다.
     * 게이트는 자기가 지키려는 성질만 묻는다 → 119 의 성질은 «기본 표기 숫자» 뿐이므로 `b` 만 본다.
     * 아이콘은 125 의 성질이라 A7 로 분리해서 «슬롯이 있는가» 만 따로 확인한다. */
    const rw = SRC.match(/id="rwCost"[^>]*>([\s\S]*?)<\/div>/);
    ok(!!rw && /<b>\s*1\s*<\/b>/.test(rw[1]) && !/822|100/.test(rw[1]),
      'A5 정적 HTML `#rwCost` 기본 표기 «822»·«100» → «1» (198)', rw ? rw[1].trim() : '#rwCost 못 찾음');
    ok(!!rw && /data-cur-slot="relic"/.test(rw[1]),
      'A7 `#rwCost` 아이콘은 125 의 화폐 슬롯(`data-cur-slot="relic"`) — 모양은 125 소관, 여기선 자리만 본다');
  }
  ok(/relicLvSum/.test(SRC), 'A6 relicLvSum 자체는 살아 있음(61 미션·33 정보 팝업 공용 — 같이 지우면 안 된다)');

  /* ---- [B] 새 세이브 = 1 (198) ---- */
  const B = await setup(page, 1e9, 0);
  ok(B.cost === 1, 'B1 새 세이브 relicCost() = 1', String(B.cost));
  ok(B.txt === '1', 'B2 #rwCost 표시도 «1»', B.txt);

  /* ---- [C] 1회 소환 → 2, 정확히 1 차감 ---- */
  const C = await page.evaluate(() => {
    const r0 = S.relic, got = summonRelic(true);
    return { spent: r0 - S.relic, cost: relicCost(), sum: S.cnt.sumRelic,
             txt: document.querySelector('#rwCost b').textContent, got: !!got };
  });
  ok(C.got && C.spent === 1, 'C1 1회 소환 = 유물석 정확히 1 차감', 'Δ' + C.spent);
  ok(C.cost === 2, 'C2 소환 1회 뒤 relicCost() = 2', String(C.cost));
  ok(C.txt === '2', 'C3 소환 직후 #rwCost 표시도 «2»(renderRelw 갱신)', C.txt);
  ok(C.sum === 1, 'C4 S.cnt.sumRelic = 1', String(C.sum));

  /* ---- [D] 50회 → 51 · 누적 Σ(1…50) = 1,275 ---- */
  const D = await page.evaluate(() => {
    S.relic = 1e9; S.cnt.sumRelic = 0;
    const r0 = S.relic;
    for (let i = 0; i < 50; i++) summonRelic(true);
    return { spent: r0 - S.relic, cost: relicCost(), sum: S.cnt.sumRelic };
  });
  ok(D.cost === 51, 'D1 50회 소환 뒤 relicCost() = 51', String(D.cost));
  ok(D.spent === 1275, 'D2 50회 누적 차감 = Σ(1…50) = 1,275 (매회 +1)', String(D.spent));
  ok(D.sum === 50, 'D3 S.cnt.sumRelic = 50', String(D.sum));

  /* ---- [E] 축 전환 — 유물 Lv 는 비용에 영향 없음 ---- */
  const E = await page.evaluate(() => {
    S.relic = 1e9; S.cnt.sumRelic = 7; S.own = {};
    const before = relicCost();
    RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 30 }; });   /* ΣLv = 300 */
    renderRelw();
    return { before, after: relicCost(), lvSum: relicLvSum(),
             txt: document.querySelector('#rwCost b').textContent };
  });
  ok(E.before === 8 && E.after === 8, 'E1 ΣLv 300 을 만들어도 비용 불변 8 (구 곡선이면 7,400)',
    E.before + ' → ' + E.after + ' (ΣLv ' + E.lvSum + ')');
  ok(E.txt === '8', 'E2 표시도 8 그대로', E.txt);

  /* ---- [F] 홀드 연속 소환 — 매회 재계산 · 부족하면 중단 ---- */
  const F0 = await setup(page, 1 + 2 + 3 + 2, 0);            /* 3회분 + 2 (4회차 4 는 못 산다) */
  await page.dispatchEvent('#rwBasin', 'pointerdown');
  /* 138 — 옛 코드는 «1600ms 기다리면 3회 다 돈다» 는 벽시계 가정이었다(delay 350 + iv 160×2 = 670ms).
   * 이 게이트가 지키려는 성질은 «몇 ms 안에» 가 아니라 «잔액이 다음 1회분에 못 미치면 홀드가 스스로 멈춘다» 다.
   * 메인 스레드가 붐비는 기기에서는 setTimeout 이 실측 770ms 까지 밀려 3회차가 창 밖으로 나가고
   * F1~F5 가 통째로 거짓 FAIL 났다 → 시간이 아니라 **홀드 종료 자체**를 기다린다. 안 멈추면 F6 이 잡는다. */
  let fStopped = true;
  try {
    await page.waitForFunction(() => S.cnt.sumRelic >= 1, null, { timeout: 20000 });
    await page.waitForFunction(() => typeof rwHold === 'undefined' || !rwHold, null, { timeout: 20000 });
  } catch (e) { fStopped = false; }
  await page.waitForTimeout(60);
  await page.dispatchEvent('#rwBasin', 'pointerup');
  const F = await page.evaluate(() => ({
    sum: S.cnt.sumRelic, relic: S.relic, cost: relicCost(),
    txt: document.querySelector('#rwCost b').textContent,
    lack: document.getElementById('rwCost').classList.contains('lack'),
    holding: typeof rwHold !== 'undefined' && !!rwHold,
  }));
  ok(F0.cost === 1, 'F0 홀드 전 비용 1 · 예산 8(=1+2+3+2)', String(F0.cost));
  ok(F.sum === 3, 'F1 홀드로 3회만 소환(4회차 4 는 잔액 2 로 못 산다)', String(F.sum));
  ok(F.relic === 2, 'F2 잔액 = 8 − 6 = 2', String(F.relic));
  ok(F.cost === 4, 'F3 홀드 뒤 비용 = 4 (매회 재계산)', String(F.cost));
  ok(F.txt === '4', 'F4 홀드 중에도 #rwCost 숫자 갱신 — 최종 표시 «4»', F.txt);
  ok(F.lack === true, 'F5 잔액 < 다음 1회분 → `lack` 즉시 갱신');
  ok(F.holding === false && fStopped, 'F6 유물석 부족으로 홀드 중단(rwHold = null)',
    fStopped ? '' : '20초 안에 스스로 멈추지 않았다');

  /* ---- [G] 부족 판정 ---- */
  const G = await page.evaluate(() => {
    S.relic = 0; S.cnt.sumRelic = 0; S.own = {}; renderRelw();
    const r0 = S.relic, sum0 = S.cnt.sumRelic, got = summonRelic(true);
    return { got, spent: r0 - S.relic, dSum: S.cnt.sumRelic - sum0,
             lack: document.getElementById('rwCost').classList.contains('lack') };
  });
  ok(G.got === null && G.spent === 0 && G.dSum === 0, 'G1 비용−1(0)이면 소환 실패 · 차감 0 · 카운터 0');
  ok(G.lack === true, 'G2 부족 상태에서 `lack` 클래스 on');
  /* 149 이후 «단순 안내» 는 팝업이 아니라 토스트(`#fxl .fx-toast`)다 — 175 에서 기대값을 옮겼다.
     쌓여 있던 토스트를 먼저 비워야 «이 누름이 띄운 것» 만 센다(verify149 §2 의 clear/seen 규약). */
  const G2 = await page.evaluate(() => {
    /* 토스트만 지우면 안 된다 — G3 이 폴백 팝업을 띄운 채면 그게 G4 로 새어 «조용하지 않다» 는
       거짓 FAIL 이 된다(N1 음성 시험에서 실제로 걸렸다). 모달도 같이 닫아 두 항목을 독립시킨다. */
    const clear = () => {
      document.querySelectorAll('#fxl .fx-toast').forEach(e => e.remove());
      try { closeModal(); } catch (e) {}
    };
    const seen  = () => {
      const t = [...document.querySelectorAll('#fxl .fx-toast')];
      const md = document.getElementById('modal');
      return { n: t.length, txt: t.map(e => e.textContent).join(' | '),
               ic: t.some(e => e.querySelector('img[data-cur-ic="relic"]')),
               modal: !!(md && md.classList.contains('on')) };
    };
    clear(); S.relic = 0; summonRelic();           /* quiet 아님 = 첫 누름 → 안내 1건 */
    const loud = seen();
    clear(); S.relic = 0; summonRelic(true);       /* quiet = 홀드 반복분 → 조용해야 한다 */
    const quiet = seen();
    return { loud, quiet };
  });
  ok(G2.loud.n === 1 && !G2.loud.modal && /더 필요합니다/.test(G2.loud.txt)
     && /\b1\b/.test(G2.loud.txt) && G2.loud.ic,
    'G3 첫 누름 부족은 안내 토스트 1건(화폐 아이콘 + 부족분 «1» + «더 필요합니다») · 팝업 아님',
    '토스트 ' + G2.loud.n + '건 «' + G2.loud.txt.trim() + '» · 아이콘 ' + (G2.loud.ic ? 'O' : 'X')
    + ' · #modal ' + (G2.loud.modal ? 'on' : 'off'));
  ok(G2.quiet.n === 0 && !G2.quiet.modal,
    'G4 홀드 반복분(quiet) 부족은 조용하다 — 토스트·팝업 0건',
    '토스트 ' + G2.quiet.n + '건 · #modal ' + (G2.quiet.modal ? 'on' : 'off'));

  /* ---- [H] 구 세이브 — 쌓인 sumRelic 을 그대로 이어받는다 ---- */
  const mk = async save => {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    /* 44 교훈 1 — 살아 있는 페이지에서 localStorage 를 고치면 5초 자동 저장이 옛 값을 되쓴다 */
    await c.addInitScript(s => localStorage.setItem('idle_hunter_save_v4', s), JSON.stringify(save));
    const p = await c.newPage();
    const e = [];
    p.on('pageerror', x => e.push(String(x)));
    await p.goto(URL);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof relicCost === 'function');
    await p.waitForTimeout(400);
    return { p, e };
  };
  /* 유물 Lv 를 12+9 로 쌓아 둔 구 세이브 — 구 곡선이면 800+22×21 = 1,262 가 나온다 */
  const H1 = await mk({ relic: 5e5, cnt: { sumRelic: 37 },
                        own: { rl0: { n: 0, l: 12 }, rl4: { n: 0, l: 9 } } });
  const h1 = await H1.p.evaluate(() => {
    openRelw();
    return { cost: relicCost(), sum: S.cnt.sumRelic, lvSum: relicLvSum(),
             txt: document.querySelector('#rwCost b').textContent };
  });
  ok(h1.cost === 38 && h1.lvSum === 21, 'H1 구 세이브 sumRelic 37 → 비용 38 (ΣLv 21 로 역산하지 않는다 — 구 곡선이면 1,262)',
    h1.cost + ' (ΣLv ' + h1.lvSum + ')');
  ok(h1.txt === '38', 'H2 구 세이브 로드 뒤 표시도 38', h1.txt);
  ok(H1.e.length === 0, 'H3 구 세이브 로드 시 런타임 에러 0건', H1.e.join(' | '));

  const H2 = await mk({ relic: 5e5, cnt: { sumRelic: null, spins: 'x' } });
  const h2 = await H2.p.evaluate(() => {
    openRelw();
    return { cost: relicCost(), sum: S.cnt.sumRelic, spins: S.cnt.spins,
             txt: document.querySelector('#rwCost b').textContent };
  });
  ok(h2.cost === 1 && h2.sum === 0, 'H4 손상 세이브(sumRelic null)도 NaN 없이 1 로 복구',
    h2.cost + ' / sumRelic ' + h2.sum);
  ok(h2.spins === 0 && h2.txt === '1', 'H5 다른 카운터(문자열 spins)도 0 으로 못박음 · 표시 «1»',
    'spins ' + h2.spins + ' / ' + h2.txt);

  /* ---- [I] NaN · 콘솔 ---- */
  const I = await page.evaluate(() => {
    S.relic = 4e6; S.cnt.sumRelic = 12345; renderRelw();
    const t = document.getElementById('relw').innerText;
    return { nan: (t.match(/NaN|undefined/g) || []).length, cost: relicCost(),
             txt: document.querySelector('#rwCost b').textContent, len: t.length };
  });
  ok(I.nan === 0, 'I1 유물 페이지 텍스트에 NaN/undefined 0건', I.nan + '건 / ' + I.len + '자');
  ok(I.cost === 12346 && /12,346|12\.3/.test(I.txt), 'I2 큰 횟수도 111 표기 규약대로', I.cost + ' → «' + I.txt + '»');
  ok(errs.length === 0, 'I3 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY119 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
