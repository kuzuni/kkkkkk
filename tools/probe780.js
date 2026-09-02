#!/usr/bin/env node
/* 작업 780 재현 — `verify488` [I1] 「룬 — 두 봉투가 카드 자식을 한 개도 안 밟는다」 가 왜 빨간가
 *
 *   node tools/probe780.js
 *
 * 등재문(780)이 갈래 둘을 세워 뒀다:
 *   ⓐ **게이트 부패** — 619 16회차가 `--flash-to` 를 `.ri` → `.rd` 로 옮겼으니 «봉투가 `.rd` 를
 *      밟는 것» 이 설계다 → 333 처방으로 항의 방향을 뒤집는다.
 *   ⓑ **실재 침범** — 488 의 두 사다리(결과·비용 봉투)가 진짜로 효과 행을 밟는다 → 제품 몫.
 *
 * 이 자는 «찍힌 좌표» 로 그 갈래를 가른다. 세 가지를 같은 실행에서 잰다:
 *   [1] 카드 자식 전수 실측 — `.tr-rn` 안 상자 y 구간(빈 띠가 지금 어디까지인가)
 *   [2] 봉투 두 개(결과·비용)를 게이트와 **같은 식**으로 계산 — `--hb-y`/`--hb-y2` + UP/BOXH/DN
 *   [3] 겹침 px — 봉투 하단 ↔ `.rd` 상단
 * 그리고 [4] 로 «`--flash-to` 는 봉투와 다른 축» 임을 확인한다(ⓐ 를 기각하려면 이것이 있어야 한다):
 *   플래시는 `--flash-to` 가 가리키는 **노드에 클래스로** 걸리고, 봉투는 `--hb-*` 로 **좌표로** 뜬다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.P780_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(900);

  const R = await p.evaluate(() => {
    /* 게이트 [I] 와 **같은 상수·같은 식**(verify488.js §[I] 사본 — 어긋나면 이 자가 거짓말을 한다) */
    const INK = 69, BOXH = 32, UP = 24, DN = 24, SLOTS = 5;
    const slotW = (w, n, dec) => Number.isFinite(dec) ? dec : Math.max(34, Math.min(80, (w - 70) / Math.max(1, n - 1)));
    const envs = (host) => {
      const cs = getComputedStyle(host), r = host.getBoundingClientRect();
      const num = (k, d0) => { const v = parseFloat(cs.getPropertyValue(k)); return Number.isFinite(v) ? v : d0; };
      const n = Math.max(2, Math.round(num('--hb-slots', SLOTS)));
      const sw = slotW(r.width, n, num('--hb-sw', NaN)), half = (n - 1) / 2 * sw + INK / 2;
      const mk = pay => {
        const lane = num(pay ? '--hb-y2' : '--hb-y', r.height * (pay ? 0.66 : 0.30));
        const cx = num(pay ? '--hb-x2' : '--hb-x', 0.5);
        return { pay, x1: r.width * cx - half, x2: r.width * cx + half,
                 y1: lane - (pay ? 0 : UP), y2: lane + BOXH + (pay ? DN : 0) };
      };
      return { r, ok: mk(false), pay: mk(true) };
    };

    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    const host = document.querySelector('.tr-rn');
    const h = host.getBoundingClientRect();
    const kids = [...host.children].map(el => {
      const b = el.getBoundingClientRect();
      return { cls: (el.className || '').split(/\s+/)[0],
               y1: +(b.top - h.top).toFixed(1), y2: +(b.bottom - h.top).toFixed(1),
               x1: +(b.left - h.left).toFixed(1), x2: +(b.right - h.left).toFixed(1) };
    }).filter(k => k.x2 - k.x1 > 4 && k.y2 - k.y1 > 4).sort((a, b) => a.y1 - b.y1);

    const e = envs(host);
    const rd = kids.find(k => k.cls === 'rd');
    const rb = kids.find(k => k.cls === 'rb');
    const over = (env) => rd ? Math.max(0, Math.min(env.y2, rd.y2) - Math.max(env.y1, rd.y1)) : -1;

    /* [4] 플래시 축 — `--flash-to` 가 가리키는 노드에 클래스가 걸린다(좌표가 아니다) */
    const flashSel = getComputedStyle(host).getPropertyValue('--flash-to').trim();
    const flashNode = flashSel ? host.querySelector(flashSel) : null;

    /* 카드 안 «빈 띠» 전수 — 자식 상자 사이의 세로 틈 */
    const gaps = [];
    let cur = 0;
    for (const k of kids.slice().sort((a, b) => a.y1 - b.y1)) {
      if (k.y1 > cur) gaps.push({ y1: cur, y2: k.y1, h: +(k.y1 - cur).toFixed(1) });
      cur = Math.max(cur, k.y2);
    }
    if (cur < h.height) gaps.push({ y1: cur, y2: +h.height.toFixed(1), h: +(h.height - cur).toFixed(1) });

    const ri = kids.find(k => k.cls === 'ri');
    const inRi = (env) => !!ri && env.y1 >= ri.y1 - 2 && env.y2 <= ri.y2 + 2;
    const meet = Math.max(0, Math.min(e.ok.y2, e.pay.y2) - Math.max(e.ok.y1, e.pay.y1));
    /* 619 13회차 가드는 «봉투 모서리» 가 아니라 **스폰 좌표(`d.style.top` = 레인)** 끼리 잰다 */
    const csH = getComputedStyle(host);
    const laneOf = k => parseFloat(csH.getPropertyValue(k));
    const laneGap = Math.abs(laneOf('--hb-y2') - laneOf('--hb-y'));

    /* §R 되돌림 시험 — 687 «앞» 의 신고값을 그대로 되돌리면 [3] 이 다시 빨개지는가.
       (이것이 없으면 «봉투가 .rd 를 안 밟는다» 는 «어디에 둬도 참» 인 무른 항이 된다) */
    host.style.setProperty('--hb-y', '248'); host.style.setProperty('--hb-y2', '224');
    host.style.setProperty('--hb-x', '.432'); host.style.setProperty('--hb-x2', '.8026');
    const e0 = envs(host);
    const rev = { ok: +Math.max(0, Math.min(e0.ok.y2, rd.y2) - Math.max(e0.ok.y1, rd.y1)).toFixed(1),
                  pay: +Math.max(0, Math.min(e0.pay.y2, rd.y2) - Math.max(e0.pay.y1, rd.y1)).toFixed(1) };
    host.style.removeProperty('--hb-y'); host.style.removeProperty('--hb-y2');
    host.style.removeProperty('--hb-x'); host.style.removeProperty('--hb-x2');

    return { cardH: +h.height.toFixed(1), cardW: +h.width.toFixed(1), kids, gaps, ri, rev, meet: +meet.toFixed(1),
             inRiOk: inRi(e.ok), inRiPay: inRi(e.pay), laneGap: +laneGap.toFixed(1),
             env: { ok: { y1: +e.ok.y1.toFixed(1), y2: +e.ok.y2.toFixed(1), x1: +e.ok.x1.toFixed(1), x2: +e.ok.x2.toFixed(1) },
                    pay: { y1: +e.pay.y1.toFixed(1), y2: +e.pay.y2.toFixed(1), x1: +e.pay.x1.toFixed(1), x2: +e.pay.x2.toFixed(1) } },
             rd, rb, overOk: +over(e.ok).toFixed(1), overPay: +over(e.pay).toFixed(1),
             flashSel, flashIsCoord: false, flashFound: !!flashNode,
             flashBox: flashNode ? (() => { const b = flashNode.getBoundingClientRect();
               return { y1: +(b.top - h.top).toFixed(1), y2: +(b.bottom - h.top).toFixed(1) }; })() : null };
  });

  console.log('[1] `.tr-rn` 카드 자식 전수 (카드 ' + R.cardW + '×' + R.cardH + ')');
  for (const k of R.kids) console.log('    · ' + k.cls.padEnd(6) + ' y ' + String(k.y1).padStart(6) + '..' + String(k.y2).padEnd(6) + ' x ' + k.x1 + '..' + k.x2);
  console.log('    빈 띠: ' + R.gaps.map(g => g.y1 + '..' + g.y2 + '(' + g.h + ')').join(' · '));
  ok(!!R.rd && !!R.rb, '[1] 진행바 `.rb` 와 효과 행 `.rd` 를 둘 다 쟀다', R.rb ? ('rb ' + R.rb.y1 + '..' + R.rb.y2 + ' · rd ' + R.rd.y1 + '..' + R.rd.y2) : '못 쟀다');

  console.log('[2] 봉투(게이트 [I] 와 같은 식) — 결과 y ' + R.env.ok.y1 + '..' + R.env.ok.y2 + ' · 비용 y ' + R.env.pay.y1 + '..' + R.env.pay.y2);
  /* 780 — 두 줄기는 이제 좌우가 아니라 **위아래**로 갈렸다(단련 [I7] 과 같은 꼴). 재는 뜻은 같다:
     «두 사다리가 서로 안 만난다». 간격 문턱은 글리프 높이(`HB_INK_H` 34) — 619 13회차가 «룬만 두 띠가
     24px 라 줄기 넘는 가드가 한 쌍으로 읽는다» 고 적어 둔 그 값이다. */
  ok(R.meet === 0 && R.laneGap >= 34,
     '[2] ★ 두 줄기가 서로 안 만난다 — 봉투 겹침 0 · 스폰 레인 간격이 글리프 높이(34)보다 넓다',
     '봉투 겹침 ' + R.meet + 'px · 레인 간격 ' + R.laneGap + 'px');

  ok(R.overOk === 0 && R.overPay === 0,
     '[3] ★ 봉투가 효과 행 `.rd` 를 안 밟는다 — 이것이 [I1] 이 묻는 것',
     '결과 ' + R.overOk + 'px · 비용 ' + R.overPay + 'px');

  /* 780 — 카드 안에 56px 짜리 빈 띠가 남아 있지 않다는 것이 이 작업의 전제다(있으면 아이콘으로
     이사할 이유가 없다). 전제가 깨지면(카드가 다시 커지면) 이 항이 빨개져 자리를 다시 묻는다. */
  const band = R.rd && R.rb ? +(R.rd.y1 - R.rb.y2).toFixed(1) : -1;
  ok(band < 56, '[3-b] [전제] 카드 안 «바↔효과 행» 띠는 56px 를 못 담는다 — 687 이 24px 를 걷어갔다',
     '띠 ' + band + 'px < 56');
  ok(R.inRiOk && R.inRiPay,
     '[3-c] ★ 두 봉투가 아이콘 액자 `.ri` 안에 든다 — [I4] «아이콘은 아트» 예외 자리(훈련 `.ci` 선례)',
     R.ri ? ('액자 ' + R.ri.y1 + '..' + R.ri.y2 + ' · 결과 ' + (R.inRiOk ? '안' : '밖') + ' · 비용 ' + (R.inRiPay ? '안' : '밖')) : '액자 못 쟀다');
  ok(R.rev.ok > 0 && R.rev.pay > 0,
     '[3-R] ★ 되돌림 시험 — 687 앞 신고값(248/224)을 되돌리면 [3] 이 다시 빨개진다(무른 항이 아니다)',
     '되돌린 겹침: 결과 ' + R.rev.ok + 'px · 비용 ' + R.rev.pay + 'px');

  console.log('[4] 플래시 축 — `--flash-to` = "' + R.flashSel + '"' + (R.flashBox ? ' → y ' + R.flashBox.y1 + '..' + R.flashBox.y2 : ''));
  ok(R.flashFound, '[4] 619 16회차의 플래시 대상은 실재하는 노드다(클래스로 걸린다)', R.flashSel);
  ok(R.flashSel === '.rd',
     '[4-b] ★ 플래시 대상이 `.rd` 인 것은 맞다 — 그러나 그것은 «노드에 거는 워시» 이고 [I1] 이 묻는 봉투는 `--hb-y` 좌표다(다른 축)',
     R.flashSel);

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE780 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
