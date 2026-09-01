#!/usr/bin/env node
/* 작업 619 — 「연속 강화 때 이펙트가 매 강화마다 터진다」 **연속 프레임 캡처** (지시서 [3]-(다))
 *
 *   node tools/cap619.js [회차]        기본 1
 *
 * 세 화면(훈련 카드 · 룬 [강화] · 단련 [단련])을 각각 **꾹 누른 채** 연속 8장 찍는다.
 * 첫 장은 «누르기 전»(대조) 이고 나머지 7장이 홀드 반복 구간이다 — 반복분에 이펙트가
 * «계속 터지는가» 는 정지 1장으로는 판단할 수 없다(그래서 (다) 가 연속 프레임을 요구한다).
 *
 * ⚠ 캡처는 **커밋하지 않는다**(ROUTINE 서두 2026-08-30 이력 정리 · `docs/review/*.png` 는 .gitignore).
 * ⚠ 클립은 호스트 bbox + 여유 140px — 버스트는 호스트 «테두리 바깥» 에서 태어난다(fxBurst 21회차).
 * ⚠ 전투 캔버스는 매 프레임 달라 판단을 오염시키므로 가린다(cap491 과 같은 규칙).
 * ⚠ 실제 촬영 간격은 스크린샷 비용 때문에 명목값보다 길다 — 장마다 «누른 뒤 경과 ms» 를 같이 찍어
 *   `docs/review/619-frames-r<n>.json` 에 남긴다(비평가에게 그 표를 준다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');
const GAP = Number(process.env.C619_GAP || 90);
const N = Number(process.env.C619_N || 7);

const SCENES = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',        n: '23 훈련 카드(64 홀드)' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',           n: '룬 [강화](297 홀드)' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0',       n: '단련 [단련](297 홀드)' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(500);

  const log = [];
  for (const sc of SCENES) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sc.tab);
    await page.waitForTimeout(450);
    const g = await page.evaluate(([sel, host]) => {
      const b = document.querySelector(sel), h = document.querySelector(host) || b;
      if (!b || !h) return null;
      const rb = b.getBoundingClientRect(), rh = h.getBoundingClientRect();
      return { bx: rb.x + rb.width / 2, by: rb.y + rb.height / 2,
               x: rh.x, y: rh.y, w: rh.width, h: rh.height };
    }, [sc.sel, sc.host]);
    if (!g) { console.log('  ✗ ' + sc.id + ' 대상 없음'); continue; }
    const M = 140, VW = 1080, VH = 2280;
    const x0 = Math.max(0, g.x - M), y0 = Math.max(0, g.y - M);
    const clip = { x: x0, y: y0,
                   width: Math.min(g.w + 2 * M, VW - x0),
                   height: Math.min(g.h + 2 * M, VH - y0) };

    const f0 = path.join(OUT, '619-' + sc.id + '-r' + R + '-f0.png');
    await page.screenshot({ path: f0, clip });
    log.push({ scene: sc.id, frame: 0, ms: -1, file: path.basename(f0), note: '누르기 전(대조)' });

    /* ⚑⚑ 17회차 — **`screenshot()` 폴링을 버리고 CDP 스크린캐스트로 바꿨다.**
       16회차 비평가 EM #12 가 «목표 90ms 인데 실측 237~328ms · 훈련 f6→f7 한 칸에 틱이 2회
       지나갔다» 를 잡았다. 뿌리는 `page.screenshot()` 이 **요청-응답 왕복**이라는 것이다 —
       CDP 캡처 + PNG 인코딩이 통째로 간격에 들어가 GAP 은 **하한으로만** 작동한다.
       디스크 쓰기를 홀드 밖으로 빼 봐도 220~343ms 로 거의 그대로였다(실측) — 병목은 왕복 자체다.
       ⇒ `Page.startScreencast` 는 브라우저가 **합성할 때마다** 프레임을 밀어 준다(요청 없음).
         홀드 내내 받아 두었다가 목표 시각에 **가장 가까운 프레임을 고른다** — 간격이
         촬영 비용과 무관해지고, 「틱마다 터지는가」 를 원리적으로 볼 수 있는 ≤60ms 가 된다.
       ⚠ 스크린캐스트는 **뷰포트 전체**를 준다. 잘라내기는 홀드가 끝난 뒤 페이지 안 캔버스로 한다
         (probe619e 가 쓰는 «캡처를 data URL 로 페이지에 되돌린다» 와 같은 처리) —
         자르는 비용이 홀드 «밖» 이라 간격에 안 들어간다. */
    const cdp = await page.context().newCDPSession(page);
    const raw = [];
    cdp.on('Page.screencastFrame', async ev => {
      raw.push({ t: Date.now(), data: ev.data });
      try { await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch (_) {}
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1,
                                             maxWidth: VW, maxHeight: VH });
    await page.mouse.move(g.bx, g.by);
    const t0 = Date.now();
    await page.mouse.down();
    await page.waitForTimeout(GAP * N + 260);
    await page.mouse.up();
    try { await cdp.send('Page.stopScreencast'); } catch (_) {}
    await page.waitForTimeout(200);

    /* 목표 시각(GAP 격자)에 가장 가까운 합성 프레임을 고른다.
       ⚠⚠ **«가장 가까운» 만으로는 같은 프레임을 여러 칸이 집는다** — 스크린캐스트는 합성이 있을
         때만 밀어 주므로 목표 격자보다 성길 수 있다. 1차 시도에서 훈련이 8칸 중 **4칸이 같은 장**
         이었고, 그것은 비평가에게 «이 틱에는 아무것도 안 터졌다» 로 **거짓으로** 읽힌다
         (이 회차가 재려는 것이 바로 「틱마다 터지는가」 라 정확히 반대 결론을 부른다).
       ⇒ **이미 쓴 프레임은 다시 안 집는다**(가장 가까운 «남은» 장). 그래도 모자라면 칸이 비고,
         그 사실이 아래 rate 로 드러난다 — 조용히 중복으로 채우지 않는다. */
    const used = new Set(), picks = [];
    for (let i = 1; i <= N; i++) {
      const want = t0 + i * GAP;
      let best = -1, bd = Infinity;
      for (let j = 0; j < raw.length; j++) {
        if (used.has(j)) continue;
        const d = Math.abs(raw[j].t - want); if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) { used.add(best); picks.push({ i, at: raw[best].t - t0, data: raw[best].data }); }
    }
    const span = raw.length > 1 ? (raw[raw.length - 1].t - raw[0].t) : 0;
    const rate = span ? Math.round(raw.length / (span / 1000)) : 0;
    console.log('    · 스크린캐스트 ' + raw.length + '장 / ' + span + 'ms ≈ ' + rate + 'fps'
              + ' · 고른 칸 ' + picks.length + '/' + N);
    /* 잘라내기 — 페이지 안 캔버스(홀드 밖이라 간격에 영향 없음) */
    const cropped = await page.evaluate(async ([items, clip]) => {
      const out = [];
      for (const it of items) {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.onerror = r; img.src = 'data:image/png;base64,' + it.data; });
        const c = document.createElement('canvas');
        c.width = Math.round(clip.width); c.height = Math.round(clip.height);
        const x = c.getContext('2d');
        /* 스크린캐스트 프레임이 뷰포트와 배율이 다를 수 있다 — 실제 폭으로 환산한다 */
        const k = img.naturalWidth ? img.naturalWidth / 1080 : 1;
        x.drawImage(img, clip.x * k, clip.y * k, clip.width * k, clip.height * k,
                    0, 0, c.width, c.height);
        out.push({ i: it.i, at: it.at, png: c.toDataURL('image/png').split(',')[1] });
      }
      return out;
    }, [picks, clip]);
    for (const s of cropped) {
      const f = path.join(OUT, '619-' + sc.id + '-r' + R + '-f' + s.i + '.png');
      fs.writeFileSync(f, Buffer.from(s.png, 'base64'));
      log.push({ scene: sc.id, frame: s.i, ms: s.at, file: path.basename(f), note: '홀드 중' });
    }
    await page.waitForTimeout(420);
    console.log('  ✓ ' + sc.id + ' — 8장 (clip ' + Math.round(clip.width) + '×' + Math.round(clip.height) + ')');
  }

  fs.writeFileSync(path.join(OUT, '619-frames-r' + R + '.json'), JSON.stringify(log, null, 1));
  console.log('\n캡처 완료 — docs/review/619-*-r' + R + '-f*.png (커밋 금지) · 표 619-frames-r' + R + '.json');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
