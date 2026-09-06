/* 작업 967 — 서브탭 바(`.stabs > .stab`)의 «활성 주입» 공용 부품 (963 의 전수 이관)
 *
 *   const { install } = require('./stab967');
 *   await install(page);                     // 페이지를 만든 **직후**(goto 전) 한 번
 *   … page.evaluate(([sel, i]) => { __stab967.set(sel, i); …여기서 바로 읽는다… }, [sel, i])
 *
 * ── 왜 이 파일이 있는가 ───────────────────────────────────────────────────
 * 963 이 `probe379`·`verify379` 에서 고친 것은 «켜기와 읽기가 두 evaluate» 였다.
 * 그 사이는 **틱 경계**이고, 제품이 그 바를 소유하면 심은 활성이 그 틈에 되돌려진다 —
 * 그런데 자는 **되읽은 칸**을 그대로 채점하므로 «칸1 이 두 번 채점되고 칸3 은 한 번도 안 재진다».
 * 점수 줄 수는 그대로라 **초록인 채로** 한 칸이 통째로 안 재진다(963 §4).
 *
 * 같은 꼴이 자 여덟에 더 있었다(등재 967) — `probe378`·`probe462`·`probe468`·
 * `verify378`·`verify389`·`verify449`·`verify462`·`verify468`. 여덟이 **똑같은 `SETON` 사본**을
 * 하나씩 들고 있었고, 사본을 남겨 두는 한 다음 자도 그것을 복사한다(402 «사본을 지운다» ·
 * 963 «남기면 다음 세션이 다시 두 evaluate 로 쓴다»).
 *
 * ⇒ 그래서 **심는 손잡이를 페이지 쪽에 한 벌만** 둔다. 자는 자기 evaluate **안에서** 그것을 부르므로
 *   «켜기 → 읽기» 가 **구조적으로** 한 틱이다 — 두 evaluate 로 쓰고 싶어도 쓸 `SETON` 이 없다.
 *
 * ── 이 부품이 «시간» 을 손대지 않는 이유 (967 재현 · `node tools/probe967.js`) ──
 * 되돌림은 **시간의 함수가 아니라 «제품 렌더가 도는지» 의 함수**다(963 §5-1). 967 재현이
 * 그것을 결정적 축으로 다시 쟀다 — 활성을 심고 그 화면의 제품 렌더를 **직접 한 번** 부른다:
 *
 *   | 바 | 제품 렌더 1회 | 벽시계 200ms ×10 | 같은 틱 ×10 |
 *   |---|---|---|---|
 *   | `#bSk .stabs` · `#eqTabs` · `#dunSub` · `#shopCats` | 살아남음 | 0/10 | 0/10 |
 *   | **`#trSubs`** | **되돌려짐(언제나 칸1)** | 5~7/10 | **0/10** |
 *   | **`#rnSubs`** | **되돌려짐(언제나 칸1)** | **0/10** | **0/10** |
 *
 * ⚠ **`#rnSubs` 는 963 의 호스트 표(0/10)가 «제품 소유 아님» 으로 적어 둔 자리다** — 벽시계로만
 *   물었기 때문이다. 963 자신이 §5-1 에서 «벽시계는 판마다 갈린다» 고 적어 놓고 그 표만 벽시계로
 *   재고 있었다. `renderRunes()` 를 직접 부르면 `#rnSubs` 도 `#trSubs` 와 **똑같이** 되돌아간다
 *   (둘 다 같은 함수가 `el.dataset.trsub/rnsub` 에서 `.on` 을 다시 그린다). 실화(實禍)는 하나가
 *   아니라 **둘**이었고, 그래서 이 부품은 «어느 바가 안전한가» 를 목록으로 갖지 않는다 —
 *   **어느 바에서도 한 틱**이면 0/10 이라는 것만 쓴다.
 */

/* 페이지 쪽에 심는 본체 — 클로저가 없어야 `page.evaluate` 로 그대로 옮겨진다. */
const INSTALL = () => {
  const cellsOf = sel => {
    const bar = document.querySelector(sel);
    if (!bar) return null;
    return [...bar.querySelectorAll(':scope > .stab')];
  };
  window.__stab967 = {
    /* 활성을 i 번 칸으로 옮긴다 — 라벨 외곽선(ol3/ol4)까지 같이 갈아 실제 클릭과 같은 그림을 만든다.
       i 가 null/undefined 면 «자연 활성»(제품이 켠 그대로)이라 아무것도 안 건드린다.
       i < 0 이면 전 칸을 끈다(칸 격자를 잴 때 — 활성 칸은 알약이라 상자가 다르다).
       돌려주는 값은 **지금 실제로 켜져 있는 칸**이다: 부른 쪽은 이것이 i 와 같은지 봐야 한다. */
    set(sel, i) {
      const cells = cellsOf(sel);
      if (!cells || !cells.length) return -2;
      if (i != null && i >= 0 && !cells[i]) return -2;
      if (i != null) {
        cells.forEach((c, j) => {
          const on = i >= 0 && j === i;
          c.classList.toggle('on', on);
          const ink = c.querySelector('i');
          if (ink) { ink.classList.toggle('ol4', on); ink.classList.toggle('ol3', !on); }
        });
      }
      return cells.findIndex(c => c.classList.contains('on'));
    },
    /* 지금 켜져 있는 칸 — 되읽기(전제 검사)용. 바가 없으면 -2, 활성이 없으면 -1. */
    on(sel) {
      const cells = cellsOf(sel);
      if (!cells) return -2;
      return cells.findIndex(c => c.classList.contains('on'));
    },
    /* 캡처처럼 **틱을 넘길 수밖에 없는** 구간용 핀 — 16ms 마다 다시 심는다.
       ⚠ 핀은 되돌림을 «덮는» 장치이지 없애는 장치가 아니다(핀 틱 사이 <16ms 창이 남는다).
          그래서 핀을 쓴 자리는 **캡처 직후 `on()` 으로 되읽어 점수 줄로 물어야** 한다. */
    /* 돌려주는 값은 **붙든 칸**이다(못 붙들었으면 -1/-2). `i` 가 null 이면 «자연 활성» 이라
       심지도 붙들지도 않고 지금 켜져 있는 칸만 알려 준다 — 제품이 소유한 자리는 제품이 지킨다. */
    pin(sel, i) {
      this.unpin();
      const first = this.set(sel, i);
      if (i == null || first !== i) return first;
      window.__stab967pin = setInterval(() => { try { window.__stab967.set(sel, i); } catch (_) {} }, 16);
      return first;
    },
    unpin() { clearInterval(window.__stab967pin); window.__stab967pin = null; },
  };
};

/* 페이지에 심는다 — `addInitScript` 로 이후 모든 탐색에, `evaluate` 로 지금 열려 있는 문서에.
   goto 전에 불러도 되고 후에 불러도 된다(둘 다 한다). */
async function install(page) {
  try { await page.addInitScript(INSTALL); } catch (_) {}
  try { await page.evaluate(INSTALL); } catch (_) {}
}

module.exports = { install, INSTALL };
