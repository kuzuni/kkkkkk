/* 작업 683 — **11회차 재현자**: 10회차가 «다음 라운드의 첫 자리» 로 적어 둔 §10-5 의 **진단**을
 * 처방보다 먼저 잰다(338·341·350·363·372·429·654·683 규칙 — 이 행이 세 회차 연속 지켜 온 순서다).
 *
 *   node tools/probe683d.js
 *
 * ── 무엇을 묻는가 ─────────────────────────────────────────────────────────
 * §10-5 는 남은 ④(«4.5:1 미만» t0 31% ↔ 정착 14% · +17%p)의 뿌리를 이렇게 적었다:
 *
 *   「남은 것은 «패치가 없다» 가 아니라 **«패치가 덮는 범위가 모자란다»** 이고, 그 범위는
 *    **호스트 패딩 상자**가 잡는다 — 라벨은 카드 하변 **밖으로** 걸쳐 있어 그 그릇이
 *    아랫부분을 안 담는다.」
 *
 * 이 자는 그 문장을 **둘로 갈라** 각각 참·거짓을 묻는다:
 *   [2] «그릇이 아랫부분을 안 담는다» — 라벨 잉크를 **카드 하변으로 갈라**(안/밖) 각 구역에서
 *       «패치 있음 ↔ 패치 걷음»(NOKEEP) 되돌림 배수를 잰다. 진단이 참이면 **밖 구역에서만**
 *       배수가 1 근처(= 패치가 아무 일도 안 한다)여야 한다.
 *   [3] 그러면 남은 +17%p 는 어디서 오는가 — 10회차 [3] 표가 이미 **패치를 알 «위» 로 올린 사본**
 *       (RAISE)에서 31% → 21% 를 찍어 두었다. 그 손잡이를 구역별로 다시 재고, 알을 숨긴 사본
 *       (NOGAIN)과 견줘 «알이 먹는 몫 ↔ 플래시 판이 먹는 몫» 을 가른다.
 *
 * ⚑⚑ **11회차가 낸 답(이 자가 못박는다)** — §10-5 의 진단은 **거짓**이다. 카드 하변 «밖» 20px 은
 *   패치를 통째로 걷어도 정착과 같고(<4.5 3% ↔ 5%), 상한 것은 **전부 카드 «안»**(현행 57% ↔ 정착 23%)
 *   이다. 그릇은 사본을 자르지도 않는다([1-c] — `overflow:visible` · 사본 하변 = 원본 하변).
 *   결손은 «패치가 못 덮는다» 가 아니라 **«패치 위를 알이 다시 덮는다»** 였고, 손잡이는
 *   레이어의 **그리는 순서** 한 칸이다(`.fx-keep-top` · 제품 CSS 1줄 + JS 2줄).
 *
 * ⚠ 자는 10회차가 고친 **고정 마스크**를 그대로 쓴다(정착에서 한 번만 뜬다 — 프레임마다 뜨면
 *   «씻겨서 배경과 같아진 획» 이 표본에서 빠지는 생존자 편향이다. `probe683c` §10-3).
 *
 * 종료 코드: 0 통과 · 1 FAIL (환경 없음은 `pwlaunch`/`png913` 이 코드 2 로 낸다)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ID = 'rl0';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const hold = (m, d) => console.log('  ⏸  ' + m + (d !== undefined ? '  [' + d + ']' : ''));
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; } };
const r2 = v => (v == null ? '—' : Math.round(v * 100) / 100);
const pc = v => (v == null ? '—' : Math.round(v * 100) + '%');

/* 프레임 한 장 — `probe683c` 의 SHOT 과 **같은 규약**(같은 것을 재려면 같은 자리를 얼려야 한다). */
const SHOT = async ({ T, NOGAIN, RAISE, RID, BLANK, NOKEEP, NOTOP, NOFADE }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p4to) { window.__p4to = window.setTimeout; window.__p4ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  const st = document.getElementById('__p4nogain'); if (st) st.remove();
  if (NOGAIN) { const t = document.createElement('style'); t.id = '__p4nogain';
    t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  /* NOFADE — 12·13회차 제품을 **되돌린 사본**. 되돌림 손잡이는 하나다: `fxKeepTxtTop` 이 `null` 을
     주면 `fxFlashClampH` 가 통째로 안 열려 상자가 12회차 이전(네 변 다 띠만큼)으로 돌아간다.
     ⚠ 스폰 **전에** 걸어야 한다(상자 높이는 스폰 시각에 정해진다). */
  if (NOFADE) { if (!window.__p4ktt) window.__p4ktt = window.fxKeepTxtTop;
    window.fxKeepTxtTop = () => null; }
  else if (window.__p4ktt) { window.fxKeepTxtTop = window.__p4ktt; window.__p4ktt = null; }
  if (T >= 0) rwSummonFx(it, true, null);
  if (RAISE && L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep'))) L.appendChild(nd);
  /* NOTOP — 11회차 제품 한 줄을 **되돌린 사본**(`.fx-keep-top` 을 뗀다 = CSS 선언을 지운 것과 같다) */
  if (NOTOP && L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep-top'))) nd.classList.remove('fx-keep-top');
  if (NOKEEP && L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep'))) nd.remove();
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const u = el.querySelector('u'), b = u.getBoundingClientRect(), c = el.getBoundingClientRect();
  if (BLANK) { window.__p4lab = u.textContent; u.textContent = ''; }
  /* 패치 그릇(`.fx-keep` 중 라벨 사본을 담은 것) 의 실제 상자도 같이 신고한다 — [1] 이 그것을 본다 */
  let keep = null;
  if (L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep'))) {
    if (!nd.querySelector('u')) continue;
    const k = nd.getBoundingClientRect(), q = nd.querySelector('u').getBoundingClientRect();
    keep = { x: Math.round(k.x), y: Math.round(k.y), w: Math.round(k.width), h: Math.round(k.height),
             ux: Math.round(q.x), uy: Math.round(q.y), uw: Math.round(q.width), uh: Math.round(q.height),
             ov: getComputedStyle(nd).overflow, z: getComputedStyle(nd).zIndex };
  }
  return { lab: u.textContent, keep,
    box: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(b.y),
           w: Math.round(Math.min(b.x + b.width, c.x + c.width) - Math.max(b.x, c.x)), h: Math.round(b.height) },
    card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true);
    renderRelw(); return has(RID) ? oLv(RID) : null; }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0 }, o));
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (o.BLANK) await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]');
      const u = el && el.querySelector('u');
      if (u && window.__p4lab != null) { u.textContent = window.__p4lab; window.__p4lab = null; } }, ID);
    return { st, png };
  };

  /* ── 잉크 마스크(정착 프레임) — 10회차 규약대로 **한 번만** 뜬다 ── */
  const settled = await shot({ T: -1, NOGAIN: true });
  const blank = await shot({ T: -1, NOGAIN: true, BLANK: true });
  if (!settled || !blank) { console.log('\n캡처 실패 — 중단'); await browser.close(); process.exit(1); }
  const BOX = settled.st.box, CARD = settled.st.card;
  const CUT = CARD.y + CARD.h;                       /* 카드 하변(프레임 y) — 안/밖을 가르는 선 */

  /* 구역별 CL 축(획 ↔ 국소 배경 3~4px 중앙값). `probe683c` 의 CL 과 **같은 산수**이고
     다른 것은 «잉크를 카드 하변으로 갈라 두 벌로 돌려준다» 하나뿐이다. */
  const CL = async (aPng, zPng, box, cut, mask) => ev(p, async ({ a, z, bx, ct, mk }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), Z = await px(z);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = d => (i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z);
    let ink, fill;
    if (mk && mk.ink && mk.ink.length) { ink = mk.ink; fill = mk.fill; }
    else {
      ink = [];
      for (let i = 0; i < A.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
      if (ink.length < 120) return { ink: ink.length };
      const iv = ink.map(la).sort((x, y) => x - y);
      const hiT = iv[Math.floor(iv.length * 0.75)];
      fill = ink.filter(i => la(i) >= hiT);
    }
    const isInk = new Uint8Array(bx.w * bx.h);
    for (const i of ink) isInk[i / 4] = 1;
    /* 프레임 y 로 되돌려 카드 하변과 견준다(상자 y + 행) */
    const rowY = i => bx.y + (((i / 4) / bx.w) | 0);
    const bgOf = (d, keepPx) => {
      const rr = rl(d), out = [];
      for (const i of fill) { if (!keepPx(i)) continue;
        const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0; const cand = [];
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
          const j = (ny * bx.w + nx); if (isInk[j]) continue; cand.push(rr(j * 4));
        }
        if (!cand.length) continue;
        cand.sort((u, v) => u - v);
        const bg = cand[cand.length >> 1], fg = rr(i);
        const hi = Math.max(bg, fg), lo = Math.min(bg, fg);
        out.push((hi + 0.05) / (lo + 0.05));
      }
      out.sort((u, v) => u - v);
      return out.length ? { n: out.length, med: out[out.length >> 1],
                            under45: out.filter(v => v < 4.5).length / out.length } : null;
    };
    return { ink: ink.length, nf: fill.length,
             all: bgOf(A, () => true),
             inC: bgOf(A, i => rowY(i) < ct),          /* 카드 «안» */
             outC: bgOf(A, i => rowY(i) >= ct),        /* 카드 «밖»(하변 아래) */
             mask: mk ? null : { ink, fill } };
  }, { a: aPng, z: zPng, bx: box, ct: cut, mk: mask || null });

  /* ── [1] 기하 — 라벨은 정말 카드 밖으로 걸쳐 있는가 · 패치 그릇은 어디까지인가 ── */
  blk('1] 기하 — 라벨 ↔ 카드 하변 ↔ **패치 그릇**');
  info('카드 상자', JSON.stringify(CARD) + ' → 하변 y=' + CUT);
  info('라벨 상자(카드 폭으로 좁힘)', JSON.stringify(BOX) + ' → 하변 y=' + (BOX.y + BOX.h));
  const over = (BOX.y + BOX.h) - CUT;
  info('라벨이 카드 하변 밖으로 걸친 양', over + 'px');
  const live = await shot({ T: 0 });
  const K = live && live.st.keep;
  info('패치 그릇(`.fx-keep`)', K ? JSON.stringify({ x: K.x, y: K.y, w: K.w, h: K.h, overflow: K.ov, z: K.z }) : '없음');
  info('패치 안의 라벨 사본 상자', K ? JSON.stringify({ x: K.ux, y: K.uy, w: K.uw, h: K.uh }) + ' → 하변 y=' + (K.uy + K.uh) : '없음');
  ok(over > 0, '1-a 라벨은 카드 하변 **밖으로** 걸쳐 있다(§10-5 의 전제)', over + 'px');
  ok(!!K, '1-b 라벨 패치가 실제로 떠 있다(없으면 아래 [2] 는 무의미하다)', K ? '있음' : '없음');
  /* §10-5 의 진단은 «그릇이 아랫부분을 안 담는다» 였다 — 그릇이 자르는지부터 본다.
     `.fx-keep` 에 `overflow:hidden` 이 없으면 절대배치 사본은 그릇 밖으로 **그대로 그려진다**. */
  ok(!!K && K.ov !== 'hidden' && (K.uy + K.uh) >= (BOX.y + BOX.h) - 1,
     '1-c **그릇은 사본을 자르지 않는다** — 사본 하변이 원본 하변까지 온다(그릇이 짧아도 `overflow` 가 없다)',
     K ? ('사본 하변 ' + (K.uy + K.uh) + ' ↔ 원본 하변 ' + (BOX.y + BOX.h) + ' · overflow ' + K.ov) : '측정 실패');

  /* ── [2] §10-5 의 진단을 구역별 되돌림 배수로 가른다 ── */
  blk('2] §10-5 진단 시험 — «패치가 카드 **밖** 에서는 일을 안 하는가»');
  const base = await CL(settled.png, blank.png, BOX, CUT);
  const MK = base && base.mask;
  const show = (nm, r) => info(nm, r && r.all
    ? ('전체 ' + r2(r.all.med) + ':1 / <4.5 ' + pc(r.all.under45)
       + ' · 안 ' + (r.inC ? r2(r.inC.med) + ':1 / ' + pc(r.inC.under45) + ' (n' + r.inC.n + ')' : '—')
       + ' · 밖 ' + (r.outC ? r2(r.outC.med) + ':1 / ' + pc(r.outC.under45) + ' (n' + r.outC.n + ')' : '—'))
    : '측정 실패');
  show('정착(연출 0 · 알 숨김)', base);

  const grab = async o => { const s = await shot(o); return s ? await CL(s.png, blank.png, BOX, CUT, MK) : null; };
  const cur = await grab({ T: 0 });                 show('t0 현행(알 켬)', cur);
  const nok = await grab({ T: 0, NOKEEP: true });   show('t0 되돌림 — 795 패치 걷음', nok);

  const mul = (a, b) => (a && b && b > 0) ? a / b : null;
  const mIn = mul(cur && cur.inC && cur.inC.med, nok && nok.inC && nok.inC.med);
  const mOut = mul(cur && cur.outC && cur.outC.med, nok && nok.outC && nok.outC.med);
  info('되돌림 배수(패치 있음 ÷ 걷음)', '안 ×' + r2(mIn) + ' · 밖 ×' + r2(mOut));
  /* ⚑⚑ **§10-5 의 진단이 기각됐다 — 그리고 «밖 배수가 1» 은 그 근거가 아니다.**
     처음 이 자를 쓸 때 나는 [2-b] 를 «밖에서도 배수가 크면 진단이 거짓» 으로 적었다. 그 자는
     «패치가 일을 안 한다» 와 «고칠 것이 애초에 없다» 를 **못 가른다** — 실측은 뒤쪽이었다
     (밖 구역은 패치를 걷어도 정착과 같다). 자를 값에 맞춘 게 아니라, **묻는 문장을 실측이 답할 수
     있는 것으로 바꿨다**. 아래 세 항이 그 갈림을 각각 못박는다. */
  const dOut = (nok && nok.outC && base && base.outC)
    ? Math.abs(nok.outC.under45 - base.outC.under45) : null;
  ok(dOut != null && dOut <= 0.08,
     '2-a **§10-5 의 진단은 거짓이다** — 카드 하변 «밖» 구역은 패치를 걷어도 **정착과 같다**(<4.5 차 ≤8%p). '
     + '거기엔 그릇이 못 담을 «상한 것» 이 아예 없다',
     nok && base ? ('패치 걷음 ' + pc(nok.outC.under45) + ' ↔ 정착 ' + pc(base.outC.under45)) : '측정 실패');
  /* ⚠ 이 항은 **패치를 걷은 사본**으로 잰다 — 11회차 수리가 든 «현행» 으로 재면 수리량만큼 값이
     움직여 «상한 자리가 어디였나» 라는 물음 자체가 흐려진다(자는 수리와 무관한 축을 잡아야 한다). */
  ok(nok && nok.inC && nok.outC && nok.inC.under45 >= nok.outC.under45 + 0.2,
     '2-b **상한 것은 전부 카드 «안» 이다** — 패치를 걷으면 안은 무너지는데 밖은 그대로다. '
     + '남은 ④ 는 «걸친 아랫부분» 이 아니라 플래시 판이 덮는 윗부분이다',
     nok ? ('걷음: 안 ' + pc(nok.inC.under45) + ' ↔ 밖 ' + pc(nok.outC.under45)) : '측정 실패');
  ok(mIn != null && mIn >= 1.3,
     '2-c 그 «안» 에서 패치는 **이미 듣고 있다**(되돌림 배수 ≥ 1.3) — 결손은 «패치가 못 덮는다» 가 아니라 '
     + '**«패치 위를 알과 판이 다시 덮는다»** 다', '×' + r2(mIn));

  /* ── [3] 그러면 남은 +17%p 의 임자는 누구인가 ── */
  blk('3] 11회차 제품 한 줄(`.fx-keep-top`) — 회수량 · 되돌림 · 자기검산');
  const nog = await grab({ T: 0, NOGAIN: true });   show('t0 현행 — 알만 숨김', nog);
  const rev = await grab({ T: 0, NOTOP: true });    show('§R 되돌림 — `.fx-keep-top` 을 뗀 사본', rev);
  const rai = await grab({ T: 0, RAISE: true });    show('자기검산 — 패치를 DOM 맨 끝으로(RAISE)', rai);
  const u0 = cur && cur.all ? cur.all.under45 : null;
  const uS = base && base.all ? base.all.under45 : null;
  const uN = nog && nog.all ? nog.all.under45 : null;
  const uV = rev && rev.all ? rev.all.under45 : null;
  const uR = rai && rai.all ? rai.all.under45 : null;
  info('«4.5:1 미만» 요약', '정착 ' + pc(uS) + ' ↔ **현행** ' + pc(u0) + ' ↔ 되돌림 ' + pc(uV)
       + ' ↔ 알 숨김 ' + pc(uN) + ' ↔ RAISE ' + pc(uR));
  ok(u0 != null && uV != null && u0 <= uV - 0.05,
     '3-a **제품 한 줄이 ④ 를 실제로 회수한다** — 되돌린 사본보다 «4.5:1 미만» 이 5%p 이상 낮다',
     '되돌림 ' + pc(uV) + ' → 현행 ' + pc(u0));
  ok(u0 != null && uN != null && u0 <= uN + 0.01,
     '3-b 그 한 줄은 **알을 숨긴 것만큼** 회수한다 — 알을 지우지 않고 같은 값에 닿는다(753 «1회당 정확 1개» 보존)',
     '현행 ' + pc(u0) + ' ↔ 알 숨김 ' + pc(uN));
  /* 자기검산 — z 한 칸과 «DOM 맨 끝» 이 같은 그림이어야 한다. 어긋나면 z 가 엉뚱한 층에 섰다는 뜻이다. */
  ok(u0 != null && uR != null && Math.abs(u0 - uR) <= 0.02,
     '3-c 자기검산 — `z-index:1` 과 «DOM 맨 끝»(RAISE)이 **같은 그림**이다(차 ≤2%p)',
     '현행 ' + pc(u0) + ' ↔ RAISE ' + pc(uR));
  ok(cur && cur.outC && base && base.outC && Math.abs(cur.outC.under45 - base.outC.under45) <= 0.08,
     '3-d **대가 0** — 이미 멀쩡하던 카드 «밖» 구역은 이 한 줄로도 안 나빠진다',
     cur && base ? ('현행 밖 ' + pc(cur.outC.under45) + ' ↔ 정착 밖 ' + pc(base.outC.under45)) : '측정 실패');
  if (u0 != null && uS != null && u0 > uS + 0.01)
    hold('[683 남은 ④ · 실패 아님] 11회차 손잡이(알 몫)를 다 써도 남는 자리 — 12회차가 [5] 에서 닫는다(플래시 판 몫)',
         '현행 ' + pc(u0) + ' ↔ 정착 ' + pc(uS));

  /* ── [4] 12회차 — §11-7 «두 비평가가 정면으로 갈린 자리» 를 **시간 축**으로 가른다 ──
     11회차 채점에서 CP 는 «알이 아직 14.6% 를 깎는다»(A3 80ms ↔ A4 130ms), CQ 는 «알 몫은 100%
     회수됐다»(A4·A5 ↔ A8) 로 **정반대**를 냈고, 셋(둘의 자 + 내 자)이 정착 기준선을 0.0% ↔ 42.3%
     ↔ 23% 로 각자 다르게 잡았다. §11-10 이 «12회차가 `probe683d` [2] 의 구역 분할에 A3/A4/A5 를
     넣어 답하라» 고 남긴 자리다 — 여기서 **한 마스크·한 기준선**으로 다시 잰다.
     ⚠ 12·13회차 제품(상자를 글자 앞에서 끝내기)이 이 물음을 지워 버리므로 **되돌린 사본(NOFADE)** 으로 잰다:
       그래야 «11회차 판에서 알이 남긴 몫» 이라는 물음 그대로다. */
  blk('4] §11-7 갈림 — 시간 축(플래시 창 안 ↔ 밖) · **되돌린 사본**으로 잰다');
  const TT = [0, 40, 80, 130, 180, 240, 300, 360];
  const row = [];
  for (const T of TT) {
    const a = await grab({ T, NOFADE: true });
    const b = await grab({ T, NOGAIN: true, NOFADE: true });
    row.push({ T, cur: a && a.inC ? a.inC.under45 : null, nog: b && b.inC ? b.inC.under45 : null });
    info('T=' + String(T).padStart(3) + 'ms  카드 «안» <4.5',
         '현행 ' + pc(row[row.length - 1].cur) + ' · 알 숨김 ' + pc(row[row.length - 1].nog)
         + ' → **알 몫** ' + pc(row[row.length - 1].cur - row[row.length - 1].nog));
  }
  const inS = base && base.inC ? base.inC.under45 : null;
  const gain = row.filter(r => r.cur != null && r.nog != null).map(r => r.cur - r.nog);
  ok(gain.length === TT.length && Math.max.apply(null, gain) <= 0.02,
     '4-a **알 몫은 0 이다 — CQ 가 맞았다**(전 프레임에서 «알 켬 ↔ 알 숨김» 차 ≤2%p). '
     + 'CP 의 «알이 아직 14.6%p 를 깎는다» 는 한 프레임에서도 재현되지 않는다',
     '최대 ' + pc(Math.max.apply(null, gain)) + ' · 최소 ' + pc(Math.min.apply(null, gain)));
  const late = row.filter(r => r.T >= 130 && r.cur != null);
  ok(inS != null && late.length === 5 && late.every(r => Math.abs(r.cur - inS) <= 0.02),
     '4-b **플래시 창(0~120ms) 밖은 정착과 같다** — 130·180·240·300·360ms 전부 정착 ±2%p. '
     + '남은 결손은 시간으로도 «플래시가 켜져 있는 동안» 에 갇혀 있다',
     '정착 ' + pc(inS) + ' ↔ ' + late.map(r => r.T + 'ms ' + pc(r.cur)).join(' · '));
  const worst = row.reduce((a, b) => (b.cur > (a ? a.cur : -1) ? b : a), null);
  ok(inS != null && worst && worst.T <= 120 && worst.cur >= inS + 0.1,
     '4-c 최악 프레임은 **플래시 창 안**이고 정착보다 10%p 이상 나쁘다 — 12회차가 닫을 자리가 여기다',
     'T=' + (worst ? worst.T : '—') + 'ms ' + pc(worst && worst.cur) + ' ↔ 정착 ' + pc(inS));

  /* ── [5] 12회차 제품 — «되그려야 하는 글자» 띠에서 플래시가 α 를 뺀다 ── */
  blk('5] 12·13회차 제품(`fxFlashClampH`) — 회수 · 되돌림 · 대가 · 스코프 · 닫힌 액자');
  const IN = [];
  for (const T of [0, 40, 80]) {
    const a = await grab({ T }), b = await grab({ T, NOFADE: true });
    IN.push({ T, fix: a && a.inC ? a.inC.under45 : null, rev: b && b.inC ? b.inC.under45 : null,
              out: a && a.outC ? a.outC.under45 : null });
    info('T=' + String(T).padStart(3) + 'ms  카드 «안» <4.5',
         '**현행** ' + pc(IN[IN.length - 1].fix) + ' ↔ 되돌림 ' + pc(IN[IN.length - 1].rev)
         + ' ↔ 정착 ' + pc(inS));
  }
  ok(inS != null && IN.every(r => r.fix != null && r.fix <= inS + 0.03),
     '5-a **회수 — 플래시 창 안이 정착에 닿는다**(세 프레임 전부 정착 +3%p 안). '
     + '11회차가 «공용 판 몫» 으로 넘겼던 +13~20%p 가 이 행 안에서 닫혔다',
     IN.map(r => r.T + 'ms ' + pc(r.fix)).join(' · ') + ' ↔ 정착 ' + pc(inS));
  ok(IN.every(r => r.rev != null && r.fix != null) && Math.max.apply(null, IN.map(r => r.rev - r.fix)) >= 0.08,
     '5-b **되돌림 시험** — `fxKeepTxtTop` 이 `null` 을 주게 한 사본(NOFADE)은 다시 무너진다(최대 8%p 이상). '
     + '«언제나 초록인 자» 가 아니다',
     IN.map(r => r.T + 'ms +' + pc(r.rev - r.fix)).join(' · '));
  const outS = base && base.outC ? base.outC.under45 : null;
  ok(outS != null && IN.every(r => r.out != null && Math.abs(r.out - outS) <= 0.08),
     '5-c **대가 0** — 카드 «밖» 구역(하변 아래 20px)은 이 변경으로도 안 나빠진다',
     IN.map(r => r.T + 'ms ' + pc(r.out)).join(' · ') + ' ↔ 정착 밖 ' + pc(outS));
  /* 스코프 짝 — «신고 잉크를 가진 호스트만» 이 문을 지난다. 같은 화면의 형제(카드 «아이콘 상자»)는
     `.rw-c>u` 를 자식으로 안 가지므로 상자가 안 짧아져야 한다. 이 항이 없으면 09·12·17·코스튬·장비·
     훈련·단련·룬까지 조용히 같이 바뀌어도 아무 자도 안 짖는다(LESSONS 666-⑨ · `verify619` [K6] 축). */
  const sc = await ev(p, RID => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const card = document.querySelector('[data-rw="' + RID + '"]');
    const icon = card && card.querySelector('i');
    if (!card || !icon) return null;
    /* ⚠ 앞선 NOFADE 사본이 스텁을 걸어 둔 채로 올 수 있다 — 먼저 원복하고 잰다(안 하면 «클램프가
       아예 안 걸린 상자» 를 재고도 초록이 나온다. 이 자가 실제로 그 함정을 한 번 밟았다). */
    if (window.__p4ktt) { window.fxKeepTxtTop = window.__p4ktt; window.__p4ktt = null; }
    const rd = host => { fxFlash(host, 340, false, true);
      const f = L.querySelector('.fx-flash');
      const o = f ? { top: parseFloat(f.style.top), h: parseFloat(f.style.height),
                      mask: getComputedStyle(f).maskImage || getComputedStyle(f).webkitMaskImage || 'none',
                      r: (() => { const q = fxRect(host); const p2 = q ? { y: q.y, h: q.h } : null; return p2; })() } : null;
      while (L.firstChild) L.removeChild(L.firstChild); return o; };
    const A = rd(card), B = rd(icon);
    const kt = (typeof fxKeepTxtTop === 'function') ? fxKeepTxtTop(card) : null;
    const peak = (typeof FXFLASH_PEAK === 'number') ? FXFLASH_PEAK : 1;
    /* 같은 호스트를 «신고 없음» 으로 한 번 더 — 짧아진 양을 재려면 안 짧아진 상자가 있어야 한다 */
    const keep = window.fxKeepTxtTop; window.fxKeepTxtTop = () => null;
    const A0 = rd(card); window.fxKeepTxtTop = keep;
    return { A, A0, B, kt, peak };
  }, ID);
  info('신고 호스트(카드) 상자', sc && sc.A ? ('top ' + r2(sc.A.top) + ' · h ' + r2(sc.A.h)
       + ' ↔ 신고 없음 h ' + r2(sc.A0 && sc.A0.h) + ' · 호스트 rect h ' + r2(sc.A.r && sc.A.r.h)
       + ' · 마스크 ' + sc.A.mask) : '측정 실패');
  info('형제 호스트(아이콘 상자) 상자', sc && sc.B ? ('h ' + r2(sc.B.h)
       + ' · 호스트 rect h ' + r2(sc.B.r && sc.B.r.h) + ' · 마스크 ' + sc.B.mask) : '측정 실패');
  ok(!!sc && !!sc.A && !!sc.A0 && sc.A.h < sc.A0.h - 1,
     '5-d1 신고 잉크(`FXKEEP_TXT`)를 **가진** 호스트에서만 상자가 짧아진다 — 신고를 없앤 사본보다 짧다',
     sc && sc.A && sc.A0 ? (r2(sc.A.h) + ' < 신고 없음 ' + r2(sc.A0.h)) : '측정 실패');
  ok(!!sc && !!sc.B && sc.B.r && sc.B.h > 0 && Math.abs(sc.B.h - sc.B.r.h) <= 0.01,
     '5-d2 **스코프의 짝** — 같은 화면 형제(그 잉크가 없는 호스트)는 상자가 호스트 rect 그대로다. '
     + '09·12·17·코스튬·장비·훈련·단련·룬이 안 바뀌는 근거가 이 항이다',
     sc && sc.B ? (r2(sc.B.h) + ' ↔ 호스트 ' + r2(sc.B.r.h)) : '측정 실패');
  /* 아래변이 서는 자리는 «잉크 윗변» 이어야 한다 — 그 아래면 글자를 여전히 밝히고,
     너무 위면 플래시를 필요 이상으로 깎는다(둘 다 결함이다). 봉우리 배율에서 정확히 닿아야 한다. */
  const botPeak = sc && sc.A ? (sc.A.top + sc.A.h / 2 + (sc.A.h / 2) * sc.peak) : null;
  info('봉우리(scale 1.06)에서의 아래변 ↔ 신고 잉크 윗변',
       botPeak != null ? r2(botPeak) + ' ↔ ' + r2(sc.kt) : '측정 실패');
  ok(botPeak != null && sc.kt != null && Math.abs(botPeak - sc.kt) <= 1.0,
     '5-e 아래변이 **봉우리에서 신고 잉크 윗변에 정확히 닿는다**(±1px — `FXFLASH_PEAK` 보정)',
     botPeak != null ? ('Δ ' + r2(sc.kt - botPeak) + 'px') : '측정 실패');
  /* ⚑⚑ 13회차 — **액자가 닫혀 있다.** 12회차는 같은 회수를 «마스크로 α 를 빼서» 얻었고 채점 2인이
     각자 «아래 레일이 0장 · ㄷ 자» 로 잡았다. 이 항이 그 되돌아감을 막는다(마스크가 서면 빨강). */
  ok(!!sc && !!sc.A && !/gradient/.test(String(sc.A.mask)),
     '5-f ★ **액자가 닫혀 있다** — 마스크 0건이라 네 변이 다 그려진다(12회차 «ㄷ 자» 결손의 회귀 게이트)',
     sc && sc.A ? String(sc.A.mask) : '측정 실패');

  ok(errs.length === 0, 'Z1 콘솔 에러 0', errs.length ? errs.slice(0, 3).join(' | ') : '없음');

  await browser.close();
  console.log('\nPROBE683D ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
