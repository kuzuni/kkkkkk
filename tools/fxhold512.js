/* 작업 836 — 「연출을 세워 놓고 찍는다」의 **한 벌**.
 *
 * `tools/verify512.js` [G]·[R] 과 재현기 `tools/probe808.js`·`tools/probe836.js` 가 **이 파일 하나**를 읽는다.
 * (808 은 같은 홀드를 자와 재현기에 **손으로 두 벌** 적어 뒀고, 836 이 그 사본을 지웠다 — 402 «사본을 지운다».)
 *
 * ⚑ 836 이 고친 것 — **어느 프레임에 세우는가**.
 *   808 은 «태어난 노드의 `remove` 와 CSS 애니를 멈춘다» 로 «언제 찍는가» 의 경주를 없앴지만,
 *   MutationObserver 의 손은 노드가 **처음 그려지기 전에** 닿기 때문에 애니가 **0% 에서** 굳었다.
 *   `@keyframes fxSpark` 의 0% 는 `scale(.26) opacity:.38` = **골짜기**다(봉우리는 18% 의 `scale(1) opacity:1`).
 *   그래서 세워 놓고 찍어도 잉크가 거의 없어 [R1] 의 «크림» 이 수십 개로 떨어졌고(실측 25~69),
 *   문턱 500 을 **아래에서** 스치며 다시 흔들렸다(836 등재문 «되돌림 102 ↔ 정상 43» · «57 ↔ 20»).
 *
 *   ⇒ 멈추는 자리를 **음수 `animation-delay`** 로 봉우리에 못박는다(`paused` + `delay:-18%×duration`
 *      = «시계를 봉우리에 맞춰 놓고 정지»). 애니 길이는 요소마다 다르므로 **각 요소 자신의**
 *      `animationDuration` 에서 비율로 잰다 — 러너·부하·상수에 안 붙는다.
 *      실측 지형(`node tools/probe836.js` [1]): 0% 69 · 5% 1,315 · 12% 3,032 · **18% 3,135** · 29% 1,958 · 46% 745.
 *
 * ⚠ 문턱은 한 칸도 안 내렸다(796·808 규약) — [R1] 은 여전히 «크림 > 500 **이고** 정상의 5배» 다.
 *   무르게 푼 것이 아님은 자의 [G0b]·[R0b](«세운 프레임이 정말 봉우리인가» — 스케일 실측)가 못박는다.
 */

/* fxSpark 의 봉우리(= `scale(1) opacity:1` 키프레임). 이 값이 바뀌면 index.html 의 키프레임도 같이 본다. */
const PEAK = 0.18;

/* 페이지 안에서 도는 코드 — `new Function('opts', SRC)` 로 심는다.
   심으면 `window.__fxhold = { peak, holdScene }` 가 생긴다. */
const HOLD_SRC = `
  const PEAK = opts && opts.peak != null ? opts.peak : ${PEAK};
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  /* '0.38s, 360ms' → [380, 360] */
  const durMs = s => String(s || '').split(',').map(v => v.trim())
    .map(v => /ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000)
    .map(v => (isFinite(v) ? v : 0));
  /* getComputedStyle 의 'matrix(a,b,c,d,e,f)' 에서 균등 스케일 = hypot(a,b) */
  const scaleOf = el => {
    const m = String(getComputedStyle(el).transform || '');
    const n = m.match(/matrix\\(([^)]+)\\)/);
    if (!n) return m === 'none' ? 1 : 0;
    const v = n[1].split(',').map(Number);
    return Math.hypot(v[0], v[1]);
  };
  const hold = el => {
    try {
      el.remove = () => {};                                  /* = fxBye 의 손 */
      const d = durMs(getComputedStyle(el).animationDuration);
      el.style.animationPlayState = 'paused';
      /* 시계를 봉우리에 맞춘 채 정지 — 요소마다 제 길이의 PEAK 만큼 */
      if (PEAK > 0 && d.some(ms => ms > 0)) el.style.animationDelay = d.map(ms => (-PEAK * ms).toFixed(2) + 'ms').join(',');
    } catch (e) {}
  };
  window.__fxhold = {
    peak: PEAK,
    async holdScene(fn) {
      const mo = new MutationObserver(rs => {
        for (const r of rs) for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          hold(n); n.querySelectorAll && n.querySelectorAll('*').forEach(hold);
        }
      });
      /* 관측자는 **끊지 않는다** — 캡처가 끝날 때까지(그 뒤에 태어나는 노드까지) 같이 세운다.
         측정마다 페이지를 다시 띄우므로 다음 측정에 새지 않는다. */
      for (const id of ['fxl', 'fxlc']) { const L = document.getElementById(id); if (L) mo.observe(L, { childList: true, subtree: true }); }
      fn();
      /* 789 «두 프레임 연속 정적» — 스폰이 끝난 때를 **제품에게 묻는다**(고정 대기 상수 0개) */
      const list = () => document.querySelectorAll('#fxl .fx-spark, #fxlc .fx-spark');
      let prev = -1, still = 0, f = 0;
      for (; f < 120 && still < 2; f++) { await raf(); const n = list().length; still = (n > 0 && n === prev) ? still + 1 : 0; prev = n; }
      const q = s => document.querySelectorAll(s).length;
      const sc = [...list()].map(scaleOf);
      /* 811 처방 — «차이를 요소 상자 안으로 가둔다». 세운 버스트의 자리를 원반으로 넘겨
         호출자가 «연출이 찍은 픽셀» 과 «화면 어딘가가 바뀐 픽셀» 을 가를 수 있게 한다.
         ⚑ 836 — 상자가 아니라 **고리(annulus)** 다. 알의 배경은
             radial-gradient(circle at 42% 38%, #FFF 0%, #FFF 26%, var(--c) 62%, transparent 88%)
           이라 **안쪽 26% 는 --c 와 무관하게 흰색**이고, 그 흰 심에서 색으로 넘어가는 띠가
           팔레트의 크림 옆에 떨어진다(정상 프레임에도 크림 648 — 색을 안 되돌려도 나온다).
           재화 색을 입는 자리는 그 바깥 띠뿐이므로 안쪽 40% 를 도려낸다. */
      const disks = [...list()].map(el => {
        const r = el.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2, Math.max(r.width, r.height) / 2];
      }).filter(d => d[2] > 0);
      return {
        spark: list().length, fly: q('.fx-fly'), plus: q('.fx-plus'), frames: f,
        peak: PEAK, scale: sc.length ? Math.max(...sc) : 0, disks, rIn: 0.40, rOut: 1.0
      };
    }
  };
`;

/* playwright 페이지에 심는다 */
const install = (page, opts) => page.evaluate(
  ([src, o]) => { new Function('opts', src)(o); },
  [HOLD_SRC, opts || null]
);

module.exports = { PEAK, HOLD_SRC, install };
