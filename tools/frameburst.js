/* 899 — «홀드를 **프레임 단위**로 훑는» 자의 공용 부품 (785 `holdburst` 의 프레임 판)
 *
 *   const { frameHold } = require('./frameburst');
 *   const G = await frameHold(page, { sel:'#trCards [data-tr]', need:20, minMs:1100 });
 *   ok(G.n >= 20 && !G.stalled, 'M3s 표본이 있다 …', G.note);
 *   ok(G.blank === 0,           'M3 ★ 빈 프레임 0장 …', G.note);
 *
 * ── 왜 부품이 필요한가 ────────────────────────────────────────────────────
 * `verify619` [M3] 은 «홀드 내내 보이는 fx 가 한 프레임도 안 끊긴다» 를 묻는데, 누르는 방법이
 * **고정 1100ms** 였고 통과 조건에 **`n > 20`**(그 창에 잡힌 rAF 프레임 수)이 같이 묶여 있었다.
 * 그래서 그 항은 «연출이 끊기는가» 와 «이 기계가 1100ms 안에 20프레임을 주는가» **둘**을 한꺼번에
 * 물었고, 느린 러너에서는 뒤엣것이 먼저 무너져 **빈 프레임 0장인데도 FAIL** 이 됐다(PROGRESS 899 —
 * 실측 훈련 0/17 · 룬 0/15 · 단련 0/16). 실패 문구는 «빈 프레임 0/17» 이라 **빨강이 초록으로 읽힌다.**
 *
 * ⚑ **고치는 방향은 «문턱을 내린다» 가 아니라 «하네스가 기다린다»** 이다(785 와 같은 처방).
 *   문턱(20)을 12 로 내리면 «끊김을 볼 눈» 이 그만큼 성겨져 축 자체가 물러진다.
 *   ⇒ **표본(프레임) 수를 문턱으로 삼고 시간은 «바닥»(minMs)과 «상한»(capMs)으로만 쓴다.**
 *   빠른 기계는 종전과 같은 1100ms 에 떼고, 느린 기계는 **더 눌러 같은 20프레임을 실제로 얻는다.**
 *
 * ⚑ **기다림의 끝은 절대 초가 아니라 «비» 다**(857 ③ · 869): 마지막 프레임 뒤
 *   «지금까지 잰 평균 프레임 간격 × `stallK`(6)» 동안 프레임이 안 오면 «정체» 로 끊는다
 *   (아직 못 쟀으면 바닥값 `stallFloor` 3,000ms). 기계가 느려지면 분자·분모가 같이 커지므로
 *   느린 러너는 **그냥 더 기다릴 뿐**이고, rAF 가 실제로 멈춘 트리는 곧바로 끊겨 표본 항이 짖는다.
 *   `capMs`(30초)는 자가 영원히 안 끝나는 것만 막는 안전판이지 **판정 문턱이 아니다.**
 *
 * ⚠ 부르는 자는 **자기 문턱으로 판정한다**(이 부품은 «묻는 것» 을 안 바꾼다) — 그리고 그 판정을
 *   **두 항으로 갈라 적어라**: 「표본이 있다(n ≥ need · 정체 아님)」와 「축(blank === 0)」.
 *   한 항에 묶으면 899 가 등재한 그 병(«빨강인데 문구는 초록»)이 그대로 돌아온다.
 *
 * ⚠ `need:0` 을 주면 **옛 «고정 창» 그대로**다(minMs = capMs 로 두면 그 시간만 누른다) —
 *   재현기(`probe899`)가 수리 전 자를 재연할 때만 쓴다. 게이트에서는 쓰지 마라.
 */
'use strict';

const DEF = { layer: 'fxl', need: 20, minMs: 1100, capMs: 30000, stallK: 6, stallFloor: 3000, settleMs: 0, pad: 160 };

/**
 * 버튼을 누른 채 **rAF 프레임마다** «보이는 fx 노드 수 · 홀드 링 수» 를 세고,
 * 표본(프레임)이 찰 때까지 기다렸다 뗀다.
 * @returns {{n:number, blank:number, ms:number, stalled:boolean, reached:boolean,
 *            fps:number, mean:number, firstBlank:(number|null), visN:number, holdN:number,
 *            kinds:string, note:string}|null}
 */
async function frameHold(page, opt) {
  const o = Object.assign({}, DEF, opt || {});
  const r = await page.evaluate(a => new Promise(res => {
    const btn = document.querySelector(a.sel);
    const L = document.getElementById(a.layer);
    if (!btn || !L) return res(null);
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, buttons: 1 }));
    const t0 = performance.now();
    let n = 0, blank = 0, last = t0, done = false, stalled = false, firstBlank = null;
    let visN = 0, holdN = 0, nearN = 0, blankAny = 0; const kinds = {}, far = {};
    const finish = () => {
      if (done) return; done = true;
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const ms = performance.now() - t0;
      res({ n, blank, blankAny, ms: Math.round(ms), stalled, firstBlank, visN, holdN, nearN,
            farKinds: Object.entries(far).sort((a, b) => b[1] - a[1]).slice(0, 4)
                     .map(e => e[0].slice(0, 24) + '×' + e[1]).join(', '),
            kinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 4)
                     .map(e => e[0].slice(0, 24) + '×' + e[1]).join(', '),
            fps: ms > 0 ? Math.round(n / (ms / 1000) * 100) / 100 : 0,
            mean: n > 1 ? Math.round((last - t0) / (n - 1) * 10) / 10 : 0 });
    };
    const tick = () => {
      if (done) return;
      const t = performance.now() - t0;
      const shown = Array.from(L.children).filter(k => +(getComputedStyle(k).opacity || 0) > 0.02);
      const vis = shown.length;
      /* ⚑ 899 — «보이는 fx» 는 **이 홀드의 것**만 센다. `#fxl` 은 화면 전체가 같이 쓰는 층이라
         돌아가는 게임이 얹는 토스트·재화 알갱이가 늘 몇 장 떠 있고, 그것까지 세면 홀드 발화를
         통째로 죽여도 «안 빈 프레임» 이 된다(`probe899` [4] 실측 — 발화·링을 둘 다 죽였는데도
         `fx-toast`·HUD 알갱이로 blank 0). 660 이 «스폰 위치는 강화 버튼뿐» 이라고 못 박았으므로
         **호스트 상자 ± pad** 와 겹치는 노드만 이 홀드의 발화로 센다. */
      const B = btn.getBoundingClientRect();
      const near = shown.filter(k => { const r = k.getBoundingClientRect();
        return r.right >= B.left - a.pad && r.left <= B.right + a.pad
            && r.bottom >= B.top - a.pad && r.top <= B.bottom + a.pad; });
      const hold = document.querySelectorAll('.fx-holding').length;
      n++; last = performance.now();
      if (vis) visN++;
      if (near.length) nearN++;
      if (hold) holdN++;
      /* 무엇이 그 프레임을 «안 빈 것» 으로 만들었는지 — 실패한 자가 다음 세션에게 남기는 유일한 단서 */
      for (const k of near) { const c = (k.className || k.tagName || '?') + ''; kinds[c] = (kinds[c] || 0) + 1; }
      for (const k of shown) if (!near.includes(k)) { const c = (k.className || k.tagName || '?') + ''; far[c] = (far[c] || 0) + 1; }
      if (!vis && !hold) blankAny++;
      if (!near.length && !hold) { blank++; if (firstBlank === null) firstBlank = Math.round(t); }
      if ((n >= a.need && t >= a.minMs) || t >= a.capMs) return finish();
      requestAnimationFrame(tick);
    };
    /* 정체 감시 — 프레임이 아예 안 오면 이 약속(promise)이 영원히 안 풀린다.
       끊는 자는 **절대 초가 아니라 «지금까지 잰 평균 간격 × K»** 다(857 ③ · 869). */
    const watch = () => {
      if (done) return;
      const idle = performance.now() - last;
      const mean = n > 1 ? (last - t0) / (n - 1) : 0;
      if (idle > Math.max(a.stallFloor, mean * a.stallK)) { stalled = true; return finish(); }
      setTimeout(watch, 200);
    };
    setTimeout(watch, 200);
    requestAnimationFrame(tick);
  }), { sel: o.sel, layer: o.layer, need: o.need, minMs: o.minMs, capMs: o.capMs,
        stallK: o.stallK, stallFloor: o.stallFloor, pad: o.pad });
  if (!r) return null;
  if (o.settleMs) await page.waitForTimeout(o.settleMs);
  r.need = o.need;
  r.reached = r.n >= o.need && !r.stalled;
  r.note = '프레임 ' + r.n + '/' + o.need + ' · ' + r.ms + 'ms(상한 ' + o.capMs + ') · ' + r.fps + '프레임/초'
         + ' · 빈 프레임 ' + r.blank + ' (홀드 발화 ' + r.nearN + ' · 홀드 링 ' + r.holdN
         + ' · 층 전체 기준이면 ' + r.blankAny + ')'
         + (r.stalled ? ' · ⚠ 정체(평균 간격 ' + r.mean + 'ms)' : '')
         + (r.firstBlank !== null ? ' · 첫 빈 프레임 ' + r.firstBlank + 'ms' : '');
  return r;
}

module.exports = { frameHold, DEF };
