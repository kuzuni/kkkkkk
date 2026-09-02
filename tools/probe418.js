#!/usr/bin/env node
/* 작업 418 — «그려진 잉크» 전 화면 스윕 (측정 전용 · 판정은 verify356.js [S3])
 *
 *   node tools/probe418.js                 # 전 화면 × DSF2 × 그려진 잉크
 *   node tools/probe418.js --dsf 3         # 배율을 올려 «수렴하는가» 를 본다(9회차 규칙)
 *   node tools/probe418.js --json
 *   node tools/probe418.js --revert        # 8·9회차가 놓은 정수 상자를 떼고 다시 잰다(되돌림)
 *   node tools/probe418.js --screen 70     # 화면 이름에 이 말이 든 것만
 *
 * ── 왜 «산수» 가 아니라 «찍힌 픽셀» 인가 ────────────────────────────────
 * 1회차에 스냅을 산수로 흉내 냈다(`round((x+w)·d) − round(x·d)`). 그 모형은 8회차의
 * 33 재화 정보는 잡았지만 **9회차의 70 출석은 못 잡았다** — 되돌림으로 소수 상자
 * 82.0781 @ x…​.4531 을 도로 심어도 산수는 164×164 로 «깨끗» 하다고 답했다.
 * 실제 크로미움은 상자 모서리를 반올림하는 게 아니라 LayoutUnit(1/64px) → 합성 레이어 →
 * SVG 래스터라이즈까지 여러 층을 지나며, 그 결과가 **잉크에서만** 1~2px 로 나타난다.
 * ⇒ 이 자는 등재문 그대로 **찍힌 픽셀**을 잰다. 산수(`scan418`)는 참고용 선별기로 남긴다.
 *
 * ── 어떻게 싸게 재는가 ──────────────────────────────────────────────────
 * 노드마다 두 장을 찍으면 900노드 × 2 = 1800장이라 못 돌린다. 그래서 화면마다 **두 장**만
 * 찍는다 — ① 그대로 ② 대상 노드 전부 `opacity:0`. 두 장의 차분을 **노드 상자별로 잘라** 읽으면
 * 노드마다 잉크 bbox 가 나온다(probe356r8·r9 의 «opacity 토글 차분» 을 전 화면으로 올린 것).
 * ⚠ 상자가 겹치는 노드는 이웃의 잉크가 차분에 끼어든다 — 그런 노드는 «겹침» 으로 표시하고
 *   **한 장씩 따로** 다시 잰다(그 수는 적다). 안 그러면 이웃 아이콘이 만든 유령을 쫓는다.
 * ⚠ 애니·타이머를 끄고 재는 것은 8회차 교훈이다(차분 두 장 사이에 다른 게 바뀌면 bbox 가 분다).
 *
 * ── 판정 ────────────────────────────────────────────────────────────────
 * 잉크 종횡 `w/h` 를 **원본 종횡비**와 견준다(`object-fit:contain` 이라 상자가 아니라 원본이 기준).
 * 편차 > 0.5%(= [S3] ④) 면 후보. **진짜 기하 ↔ 측정 바닥**은 DSF 를 올려 가른다 —
 * 편차가 0 으로 수렴하면 자의 바닥, 안 줄면 기하다(356 9회차).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, URL, STEP } = require('./scan356');
const { REVERT_CSS } = require('./scan418');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const REVERT = argv.includes('--revert');
const DSF = Number((argv[argv.indexOf('--dsf') + 1]) || 2) || 2;
const ONLY = argv.includes('--screen') ? argv[argv.indexOf('--screen') + 1] : null;
const TOL = Number(process.env.PROBE418_TOL || 0.005);
const PAD = 3;                    /* 잉크가 상자를 살짝 넘는 자리(그림자·획)를 위한 여유 */
/* 판정 스코프의 `object-fit` — «늘리지 않는» 값만(아래 판정 절 머리말). 750 의 가림 보정도 이 집합을 쓴다 */
const JUDGE_FIT = new Set(['contain', 'scale-down']);

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT = function (base) {
  const app = document.getElementById('app');
  if (!app) return [];
  function pathOf(el) {
    const out = []; let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s); e = e.parentElement;
    }
    return out.join('>');
  }
  function natural(el) {
    if (el.tagName === 'IMG') return el.naturalWidth && el.naturalHeight ? [el.naturalWidth, el.naturalHeight] : null;
    if (el.tagName === 'CANVAS') return el.width && el.height ? [el.width, el.height] : null;
    const vb = el.viewBox && el.viewBox.baseVal;
    if (vb && vb.width && vb.height) return [vb.width, vb.height];
    return null;
  }
  const out = [];
  let i = base || 0;
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    /* 772 — 앞 쪽(스크롤 위치)에서 이미 잰 노드는 두 번 세지 않는다. 이 한 줄이 «칸 수» 를
       지키는 자리다: 머리글·탭바처럼 모든 쪽에 걸치는 노드는 **첫 쪽에서 한 번만** 판정에 든다. */
    if (el.hasAttribute('data-p418')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const nat = natural(el);
    el.setAttribute('data-p418', String(i));
    out.push({ id: i++, sel: pathOf(el), cls: (el.getAttribute('class') || '').slice(0, 24),
      tag: el.tagName.toLowerCase(), fit: cs.objectFit, nat: nat ? nat[0] / nat[1] : null,
      src: el.tagName === 'IMG' ? (el.currentSrc || el.src || '') : '',
      x: r.left, y: r.top, w: r.width, h: r.height });
  }
  return out;
};

/* ⚑ 772 — «전부» 가 아니라 **이번 쪽에서 잰 노드만** 끈다.
   여러 쪽을 도는 순간 «전부 끄기» 는 앞 쪽에서 이미 잰 노드까지 두 장 사이에서 지워, 그 노드가
   이번 쪽 노드의 상자에 걸쳐 있으면 남의 잉크가 차분에 섞인다(겹침 검사는 **이번 쪽 목록**만 본다).
   이번 쪽 것만 끄면 앞 쪽 노드는 두 장에서 똑같아 차분에 **한 픽셀도** 안 남는다.
   ⚠ 첫 쪽에서는 «이번 쪽 = 전부» 라 값이 한 칸도 안 바뀐다(래칫 보존의 근거). */
const SETOPA = ([ids, v]) => {
  for (const id of ids) { const e = document.querySelector(`[data-p418="${id}"]`); if (e) e.style.opacity = v; }
};
const SETONE = ([id, v]) => { const e = document.querySelector(`[data-p418="${id}"]`); if (e) e.style.opacity = v; };

/* ---------- 772 — 스크롤 그릇을 쪽으로 나눈다 ----------
   ⚑ `COLLECT` 의 가시 조건(`r.top > innerHeight` …)은 «지금 뷰포트에 걸치는가» 다. 이 게임은
   화면마다 스크롤 그릇(`#shopList`·`#dunList`·`#eqList` …)을 두고 그 그릇의 **첫 쪽만** 뷰포트에
   걸치므로, 1~22회차의 스윕은 그 아래를 **한 번도 안 봤다**(750 이 `.cn-a2>.gm` 를 목록에서 빼며
   관측 · 772 등재). 실측은 `node tools/probe772.js` 가 화면마다 «안 / 밖» 으로 찍는다.
   ⇒ 처방은 등재문 후보 ② 다 — 그릇마다 한 쪽씩 굴리고 **그 자리에서 차분 두 장을 다시 찍는다**
     (차분은 두 장이 같은 스크롤 위치여야 성립하므로 «수집만 넓히는» 길은 없다).
   ⚠ 쪽 수는 손으로 안 적는다 — 그릇의 `scrollHeight / clientHeight` 에서 **실행 때 판다**.
     손으로 적으면 카드가 하나 늘어난 날 그 아래가 조용히 다시 감시 밖이 된다.
   ⚠ 되돌림 손잡이 `PROBE418_NOSCROLL=1` — 끄면 첫 쪽만 본다(= 772 이전의 스윕).
     `verify772` 가 그 대조로 «이 처방이 일을 하는가» 를 못박는다. 게이트 실행에서 세팅하지 마라. */
const POTS = function (maxPg) {
  const app = document.getElementById('app');
  if (!app) return [];
  const out = [];
  let i = 0;
  for (const el of app.querySelectorAll('*')) {
    const sh = el.scrollHeight, ch = el.clientHeight;
    if (ch < 40 || sh <= ch + 1) continue;
    const ov = getComputedStyle(el).overflowY;
    if (ov !== 'auto' && ov !== 'scroll') continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;      /* 안 보이는 그릇은 굴려도 소용없다 */
    el.setAttribute('data-p772', String(i++));
    const want = Math.ceil(sh / ch);
    out.push({ sel: el.id ? '#' + el.id : el.className.split(' ')[0], sh, ch,
      pages: Math.min(maxPg, want), want });
  }
  return out;
};
/* 한 쪽 = 그릇의 `clientHeight`. 끝에 닿은 그릇은 그 자리에 머문다(클램프). */
const SCROLL_PAGE = function (pg) {
  let n = 0;
  for (const el of document.querySelectorAll('[data-p772]')) {
    const max = el.scrollHeight - el.clientHeight;
    const want = Math.min(max, pg * el.clientHeight);
    el.scrollTop = want;
    if (want > 0) n++;
  }
  return n;
};

/* ---------- 750 ⓐ — «형제가 덮은 잉크» 를 문턱이 아니라 **되돌림**으로 가른다 ----------
   ⚑ 이 자의 잉크는 «대상 노드 opacity 0» 두 장의 **차분**이다. 그래서 아이콘 **앞**에서 무언가를
   칠하고 있으면 그 줄은 두 장이 똑같아 bbox 가 그만큼 짧아진다 — 아이콘 기하는 멀쩡한데
   **종횡만** 어긋난 값이 나온다(750 1회차 실측: 35 패스 알약 176×176 → 176×172 = +2.33%).
   기존 `occ`(예상 채움과 3% 넘게 어긋나면 판정 밖) 는 이걸 못 잡는다 — 손실이 **5 ÷ 176 = 2.84%**
   로 문턱 **바로 아래**라 통과한다. 문턱을 내리는 것은 답이 아니다(정상 자리가 스코프 밖으로
   나가 `judged` 가 줄고 [S3] ② 가 «스코프가 줄었다» 로 잡는다 — 750 review §5).
   ⇒ **가리는 것을 치우고 다시 재서** 가른다. 가림이면 값이 돌아오고, 기하면 그대로다.
   실측(750 3회차): 패스 알약 176×172 → **176×176** · 03 던전 `.pcb-d` −2.27% → **−2.27% 그대로**.

   ⚠ **«겹치는 것» 을 다 숨기면 안 된다.** 뒤에 깔린 형제를 숨기면 아이콘 테두리 AA 가 얹히는
     바탕색이 바뀌어 경계 칸의 diff 가 문턱(THR 12)을 들락거린다 — 실제로 `.pcb-d` 가 그 방식에서
     129 → 130 으로 움직였다(«고쳐진» 것이 아니라 **자가 다른 것을 잰** 것이다).
     ⇒ 숨기는 것은 **hit-test 로 «앞» 임이 확인된 것**뿐이다.
   ⚠ **맞은 노드만 숨기면 모자란다.** 패스 알업의 hit 은 수량 라벨 `em` 인데 실제로 아이콘 하변을
     덮는 것은 그 부모 `b` 의 배경이라, `em` 만 숨기면 176×172 그대로다(3회차 실측).
     ⇒ 맞은 노드에서 **형제 가지의 뿌리**(= 대상의 조상 바로 아래 칸)까지 올라가 통째로 숨긴다.
   ⚠ 표본은 상자 **끝줄을 반드시 포함**해야 한다 — 덮인 것이 마지막 2~3px 이라
     0.5/N 로 안쪽만 찍는 격자는 그 줄을 통째로 건너뛴다(3회차에 한 번 그렇게 헛measure 했다). */
const SCAN_COVER = function ([ids, N]) {
  /* `pointer-events:none` 인 노드도 화면에는 칠한다 — hit-test 로 «앞» 을 물으려면 잠시 켠다 */
  const st = document.createElement('style');
  st.textContent = '*{pointer-events:auto!important}';
  document.head.appendChild(st);
  const out = {};
  const IN = 0.3;                       /* 상자 모서리 안쪽 0.3px — 끝줄이 표본에 들게 */
  for (const id of ids) {
    const el = document.querySelector(`[data-p418="${id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const roots = new Set();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const px = r.left + IN + (r.width - IN * 2) * i / (N - 1);
      const py = r.top + IN + (r.height - IN * 2) * j / (N - 1);
      if (px < 0 || py < 0 || px > innerWidth - 1 || py > innerHeight - 1) continue;
      const h = document.elementFromPoint(px, py);
      if (!h || h === el || el.contains(h) || h.contains(el)) continue;
      let k = h;
      while (k.parentElement && !k.parentElement.contains(el)) k = k.parentElement;
      if (k !== el && !el.contains(k) && !k.contains(el)) roots.add(k);
    }
    if (!roots.size) continue;
    for (const o of roots) {
      const cur = o.getAttribute('data-p418c');
      o.setAttribute('data-p418c', cur ? cur + ' ' + id : String(id));
    }
    out[id] = roots.size;
  }
  st.remove();
  return out;
};
const HIDE_COVER = (id) => {
  for (const o of document.querySelectorAll(`[data-p418c~="${id}"]`)) {
    o.setAttribute('data-p418v', o.style.visibility || '');
    o.style.visibility = 'hidden';
  }
};
const SHOW_COVER = () => {
  for (const o of document.querySelectorAll('[data-p418v]')) {
    o.style.visibility = o.getAttribute('data-p418v'); o.removeAttribute('data-p418v');
  }
};

/* ---------- 530 — «연출 중» 을 걷어 «상시» 상태로 정규화한다 ----------
   ⚑ **왜 «빼는 것» 이 아니라 «걷는 것» 인가.** 이 자가 지키려는 성질은 356 [A] 가 적은 그대로
   «**상시** 크롬 아이콘의 종횡» 이지 «연출 중간 프레임» 이 아니다. 그런데 스윕은 화면에 남아 있던
   재화 비행(`#fxlc > .fx-fly`)·알약 펀치(`.cbox.fx-punch`) 같은 **찰나의 노드**를 같이 쟀고,
   그 노드가 어느 프레임에서 굳었느냐에 따라 잉크가 통째로 달라져 [S3] ③ 래칫이 실행마다 흔들렸다
   (530 등재문: 같은 트리에서 칸 50·51·52·53).
   판정에서만 빼면 «무엇을 뺐는지» 가 결과에 안 남아 스코프가 조용히 줄고(397 사고), 이웃 아이콘은
   여전히 그 연출에 가려진다. 그래서 **재기 전에 페이지를 상시 상태로 되돌리고**, 그 결과를
   `fx`(걷은 수)·`fxLeft`(잔여, 0 이어야 한다)로 **돌려준다** — 게이트가 그것을 단언한다.
   ⚠ 레이어 이름이 바뀌면 **조용히 넘어가지 않고 던진다**(443 «무음 실패를 다른 무음으로 갈지 마라»). */
const FX_LAYERS = ['fxlc', 'fxl'];

/* ---------- 530 ⓑ — 정지가 «무한 반복» 을 못 세우고 있었다 ----------
   ⚑ 8회차가 놓은 정지는 `a.finish()` 한 줄이었는데, **무한 반복 애니에서 `finish()` 는 던진다**
   (`InvalidStateError: Cannot finish Animation with an infinite target effect`).
   그 예외를 `try/catch` 가 삼켰고, `clearInterval`·rAF 무력화는 **CSS 애니를 안 멈춘다**(합성기에서 돈다)
   ⇒ 122 가 넣은 «가만히 있어도 살아 있는» 상시 쥬시(10 소환·13 재화 카드)가 **차분 두 장 사이에도
   계속 흔들리고** 있었다. 실측: `#shopList .gem` 의 top 이 실행마다 359.127~360.697(**1.57px**),
   같은 그룹이 한 실행은 +0.66%(2칸) 다른 실행은 −0.53%(1칸)으로 문턱 ±0.5% 를 임의로 넘나든다.
   ⇒ 유한 애니는 그대로 `finish()`(등장 연출은 «끝난 자리» 가 상시다) · 무한 애니만 **주기 0 에 세운다**.
   ⚠ `cancel()` 이 아니라 `pause()+currentTime 0` 인 이유: cancel 은 그 애니가 유일한 가시 조건인
     노드를 통째로 지워 스코프를 조용히 줄인다(397 사고). 0 프레임은 결정적이면서 노드를 안 지운다. */
const FREEZE = function () {
  /* ⚑ 530 — **문을 닫는 것이 먼저다.** `clearInterval(1..20000)` 은 «그 순간» 걸려 있던 것만
     지우므로, 게임 틱이 그 뒤에 잡는 타이머는 그대로 돈다 = 재렌더가 계속 돌고
     **새 CSSAnimation 이 계속 태어난다**(그래서 애니를 아무리 세워도 다시 움직였다).
     ⇒ 예약 창구 자체를 막고 나서 걸려 있던 것을 지운다. */
  window.setTimeout = () => 0;
  window.setInterval = () => 0;
  window.requestAnimationFrame = () => 0;
  for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
  let fin = 0, held = 0;
  for (const a of document.getAnimations()) {
    try { a.finish(); fin++; continue; } catch (e) {}
    /* 무한 반복은 `finish()` 가 던진다(`Cannot finish Animation with an infinite target effect`) —
       8회차의 `try{a.finish()}catch{}` 한 줄이 그 예외를 삼켜 122 상시 쥬시가 내내 돌고 있었다. */
    try { a.pause(); a.currentTime = 0; held++; } catch (e) {}
  }
  return { fin, held };
};

const SETTLE_FX = function (layers) {
  let nodes = 0, cls = 0;
  for (const id of layers) {
    const el = document.getElementById(id);
    if (!el) return { missing: id };
    nodes += el.childElementCount;
    el.textContent = '';
    /* ⚠ **비우기만 하면 모자란다** — 정지 뒤에도 늦게 태어나는 연출 노드가 있어서
       (게임 틱이 우리 `clearInterval` 뒤에 새 타이머를 잡는다) 비운 자리에 또 쌓인다.
       레이어를 통째로 `display:none` 으로 내리면 그 뒤에 무엇이 생겨도 rect 가 0 이라
       COLLECT 의 «8px 미만은 건너뛴다» 에 걸려 **판정에 절대 안 섞인다.** */
    el.style.setProperty('display', 'none', 'important');
  }
  const tok = (el) => [...el.classList].filter((c) => c.slice(0, 3) === 'fx-');
  for (const el of document.querySelectorAll('[class]')) {
    const fx = tok(el);
    if (fx.length) { el.classList.remove(...fx); cls += fx.length; }
  }
  return { nodes, cls };
};

/* 530 — 판정 대상과 «연출» 이 섞였는지 **잰 뒤에** 다시 묻는 자.
   `SETTLE_FX` 가 스스로 «잔여 0» 을 세면 동어반복이다(자기가 방금 지웠으니까) —
   그래서 잔여는 **정규화가 끝난 화면에서 실제로 잴 수 있는 노드**를 기준으로 센다. */
const COUNT_FXIN = function (layers) {
  const app = document.getElementById('app');
  if (!app) return 0;
  const inLayer = (el) => layers.some((id) => { const l = document.getElementById(id); return l && l.contains(el); });
  let n = 0;
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let fx = inLayer(el);
    for (let e = el; !fx && e && e !== document.body; e = e.parentElement) {
      if (e.classList && [...e.classList].some((c) => c.slice(0, 3) === 'fx-')) fx = true;
    }
    if (fx) n++;
  }
  return n;
};

/* COLLECT 과 **같은** 가시 조건으로 «잴 수 있는 노드» 수만 센다 — STILL_CSS 가 스코프를 줄이는지 본다 */
const COUNT_VIS = function () {
  const app = document.getElementById('app');
  if (!app) return 0;
  let n = 0;
  for (const el of app.querySelectorAll('img, canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    n++;
  }
  return n;
};

/* ---------- 530 ⓒ — 전이(transition)만 막는다 ----------
   ⚠ **`animation:none` 으로 밀면 안 된다(시도했다가 물렀다).** 그 선언은 무한 반복만이 아니라
     `fill:forwards` 로 **끝난 자리를 붙들고 있던 등장 연출까지** 지워, 요소를 «등장 전» 기본
     스타일로 되돌린다 — 실측에서 그 상태의 스윕은 결정적이긴 했지만 칸 **43~45 → 51** ·
     자리 **9~10 → 16** 으로 늘었다. 늘어난 자리는 결함이 아니라 **우리가 만든 자세**다.
   무한 반복은 `FREEZE` 가 주기 0 에 세우고, 그것이 다시 안 태어나게 하는 것은 «타이머 창구를
   닫는 것»(FREEZE 첫 세 줄)이다. 여기서 막는 것은 **전이**뿐이다 — `SETTLE_FX` 가 `fx-` 클래스를
   걷는 순간 그 자리에 transition 이 걸려 있으면 «걷는 중» 을 재게 된다. 전이의 중간값은
   어느 «상시» 도 아니다. */
const STILL_CSS = '*,*::before,*::after{transition:none!important}';

/* 차분 계산기 — 두 PNG 를 캔버스에 올리고 상자별 bbox 를 읽는다 */
const DIFF_MANY = async ([a, b, boxes, thr]) => {
  const load = async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
  };
  const A = await load(a), B = await load(b);
  const out = [];
  for (const bx of boxes) {
    const x0c = Math.max(0, Math.floor(bx[0])), y0c = Math.max(0, Math.floor(bx[1]));
    const x1c = Math.min(A.W - 1, Math.ceil(bx[2])), y1c = Math.min(A.H - 1, Math.ceil(bx[3]));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (let y = y0c; y <= y1c; y++) for (let x = x0c; x <= x1c; x++) {
      const i = (y * A.W + x) * 4;
      const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
      if (dd > thr) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    out.push(n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, n,
      edge: (x0 <= x0c) || (y0 <= y0c) || (x1 >= x1c) || (y1 >= y1c) } : null);
  }
  return out;
};

/* ⚑ 게이트가 이 스윕을 **그대로** 부를 수 있게 함수로 내놓는다 —
   `verify356` [S3] 이 화면별 상수 대신 이 한 벌을 쓴다(418 등재문 처방 ③). */
async function sweep(opt) {
  const DSF = opt.dsf || 2, REVERT = !!opt.revert, ONLY = opt.only || null;
  const TOL = opt.tol == null ? 0.005 : opt.tol;
  /* 356 17회차 — 차분 문턱. 기본 12 는 그대로다(래칫·게이트가 이 값 위에 서 있다).
     knob 은 **재현용**이다 — 어두운 배경 위 검은 외곽선은 경계 칸의 diff 가 문턱 근처라,
     같은 프레임을 문턱만 바꿔 읽으면 잉크 폭이 칸 단위로 들락거린다(16회차 −2.92% 의 정체).
     그 «걸침» 을 보이는 자가 필요해서 뚫었다. 게이트 실행에서 이 env 를 세팅하지 마라. */
  const THR = Number(process.env.PROBE418_THR || 12);
  const NOCOV = process.env.PROBE418_NOCOV === '1' || opt.nocov === true;   /* 750 — 가림 보정 끄기(되돌림) */
  /* 772 — 스크롤 쪽 넘김 끄기(되돌림) · 한 화면의 쪽 상한(폭주 방지 — 실측 최대 4쪽) */
  const NOSCROLL = process.env.PROBE418_NOSCROLL === '1' || opt.noscroll === true;
  /* ⚠ 상한 4 는 «싸게 굴리려고» 고른 값이 아니라 **실측이 고른 값**이다(probe772 전 화면 census):
     쪽이 둘 이상인 19화면 중 18화면이 2~4쪽에서 **끝난다**. 넘는 것은 35 패스 사다리 하나뿐인데
     그 그릇은 `psList 1389 → 137,910px` = **99쪽**이라 «끝까지» 가 게이트에서 성립하지 않는다.
     ⇒ 상한에 걸린 화면은 **조용히 자르지 않고** `capped` 로 세어 돌려준다(397 «스코프를 조용히
       줄이지 마라»). `verify772` 가 그 수를 단언하므로, 어느 화면이 새로 상한에 걸리면 빨개진다. */
  const MAXPG = Number(process.env.PROBE418_MAXPG || opt.maxpg || 4);
  const browser = await launch(chromium);
  const calc = await browser.newPage();
  await calc.setContent('<body></body>');

  const rows = [];
  const errs = [];
  const fx = { nodes: 0, cls: 0, left: 0, lost: 0, fin: 0, held: 0 };   /* 530 — 걷은 연출 노드·클래스 수·잔여·스코프 손실 + 정지한 애니 수 */
  const sc = { screens: 0, pages: 0, pots: [], capped: 0 };   /* 772 — 쪽을 넘긴 화면 수 · 추가로 돈 쪽 수 · 그릇 목록 */
  const wanted = (l) => !ONLY || (Array.isArray(ONLY) ? ONLY.some((o) => l.includes(o)) : l.includes(ONLY));
  for (const [label, steps] of SCREENS) {
    if (!wanted(label)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
    const page = await ctx.newPage();
    /* 356 17회차 — DSF4 는 한 장이 4320×9120(39MP)이라 기본 30초를 넘겨 «진입 실패» 로 읽혔다
       (16회차 «잰 노드 0개» 의 정체 — 진입이 아니라 **캡처**가 죽은 것). 배율에 비례해 늘린다. */
    page.setDefaultTimeout(30000 * DSF);
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        /* 356 12회차 — 단계 해석은 `scan356.STEP` 한 곳이다(`js:` 단계 포함).
           여기 직접 `querySelector` 를 적어 두면 04 던전 세부처럼 «누를 문이 없는» 화면에서
           `SyntaxError` 로 그 화면이 통째로 진입 실패한다. */
        await STEP(page, s);
        await page.waitForTimeout(420);
      }
      if (REVERT) await page.addStyleTag({ content: REVERT_CSS });
      /* 후보 처방을 그 자리에서 시험한다 — «정수 상자로 바꾸면 편차가 사라지는가».
         사라지면 그 자리는 소수 상자 결함이고, 안 사라지면 아트·AA 라 이 작업 밖이다. */
      if (process.env.PROBE418_CSS) await page.addStyleTag({ content: process.env.PROBE418_CSS });
      await page.waitForTimeout(350);
      /* 애니·타이머 정지 — 차분 두 장 사이에 다른 것이 바뀌면 bbox 가 분다(8회차 교훈)
         530 — 무한 반복은 `finish()` 가 던져 안 멈췄다. `FREEZE` 머리말 참고. */
      const frz = await page.evaluate(FREEZE);
      fx.fin += frz.fin; fx.held += frz.held;
      await page.waitForTimeout(200);
      /* 530 — 연출을 걷어 «상시» 상태로. 정지(위)만으로는 **이미 떠 있던** 연출 노드가 어느
         프레임에서 굳었을 뿐이라 남는다 — 그 프레임이 실행마다 달라 래칫이 흔들렸다. */
      const fxr = await page.evaluate(SETTLE_FX, FX_LAYERS);
      if (fxr && fxr.missing)
        throw new Error(`연출 레이어 #${fxr.missing} 가 없다 — 정규화 규칙이 마크업과 어긋났다(530)`);
      fx.nodes += fxr.nodes; fx.cls += fxr.cls;
      const n0 = await page.evaluate(COUNT_VIS);
      await page.addStyleTag({ content: STILL_CSS });
      /* 클래스를 걷는 동안 새로 뜬 애니(전이·재생)를 한 번 더 세운다 — 창구는 이미 닫혀 있다 */
      const frz2 = await page.evaluate(FREEZE);
      fx.fin += frz2.fin; fx.held += frz2.held;
      await page.waitForTimeout(160);
      const n1 = await page.evaluate(COUNT_VIS);
      fx.lost += Math.max(0, n0 - n1);
      fx.left += await page.evaluate(COUNT_FXIN, FX_LAYERS);

      /* 772 — 스크롤 그릇을 «쪽» 으로 나눠 돈다. 첫 쪽(pg 0)은 772 이전과 **한 글자도 같다**. */
      const pots = NOSCROLL ? [] : await page.evaluate(POTS, MAXPG);
      const pages = pots.length ? Math.max(1, ...pots.map((p) => p.pages)) : 1;
      if (pages > 1) sc.screens++;
      sc.pages += pages - 1;
      for (const p of pots) {
        if (p.pages > 1) sc.pots.push(`${label} ${p.sel} ${p.ch}→${p.sh} (${p.pages}쪽${p.want > p.pages ? ` · 상한에 걸림 — 원래 ${p.want}쪽` : ''})`);
        if (p.want > p.pages) sc.capped++;
      }
      let base = 0;
      for (let pg = 0; pg < pages; pg++) {
      const plabel = pg ? `${label} ↓${pg}` : label;
      if (pg) { await page.evaluate(SCROLL_PAGE, pg); await page.waitForTimeout(220); }

      const nodes = await page.evaluate(COLLECT, base);
      if (!nodes.length) continue;
      base += nodes.length;

      /* 겹치는 상자 표시 — 이웃 잉크가 차분에 끼어드는 자리 */
      const over = new Set();
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a.x < b.x + b.w + PAD * 2 && b.x < a.x + a.w + PAD * 2 &&
            a.y < b.y + b.h + PAD * 2 && b.y < a.y + a.h + PAD * 2) { over.add(a.id); over.add(b.id); }
      }

      const clipOf = (n) => [(n.x - PAD) * DSF, (n.y - PAD) * DSF, (n.x + n.w + PAD) * DSF, (n.y + n.h + PAD) * DSF];

      const pgIds = nodes.map((n) => n.id);
      const on = (await page.screenshot()).toString('base64');
      await page.evaluate(SETOPA, [pgIds, '0']);
      await page.waitForTimeout(150);
      const off = (await page.screenshot()).toString('base64');
      await page.evaluate(SETOPA, [pgIds, '']);
      await page.waitForTimeout(120);

      const solo = nodes.filter((n) => !over.has(n.id));
      const got = solo.length ? await calc.evaluate(DIFF_MANY, [on, off, solo.map(clipOf), THR]) : [];
      solo.forEach((n, k) => { n.ink = got[k]; });

      /* 겹친 노드는 한 장씩 따로 — 자기만 끄고 두 장을 찍는다 */
      for (const n of nodes.filter((z) => over.has(z.id))) {
        const clip = { x: Math.max(0, Math.floor((n.x - PAD))), y: Math.max(0, Math.floor((n.y - PAD))),
          width: Math.ceil(n.w + PAD * 2), height: Math.ceil(n.h + PAD * 2) };
        const a = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '0']);
        await page.waitForTimeout(90);
        const b = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '']);
        await page.waitForTimeout(60);
        const d = await calc.evaluate(DIFF_MANY, [a, b, [[0, 0, 1e9, 1e9]], THR]);
        n.ink = d[0]; n.solo = true;
      }

      /* 750 ⓐ — 가림 보정. 판정 스코프가 될 수 있는 노드(=`img` + 늘리지 않는 `object-fit`)만
         본다. 앞을 덮는 형제 가지가 하나도 없으면 **다시 재지 않는다**(재면 그 자체가 잡음이다). */
      /* `PROBE418_NOCOV=1` 은 **되돌림 시험용**이다 — 보정을 끄고 같은 트리를 재면 750 이 닫은 칸이
         그대로 되살아난다(게이트 [S3] ④ 가 그것으로 «이 보정이 일을 하는가» 를 못박는다).
         ⚠ 게이트 실행에서 이 env 를 세팅하지 마라(THR knob 과 같은 규율). */
      const cand = NOCOV ? [] : nodes.filter((n) => n.ink && n.tag === 'img' && JUDGE_FIT.has(n.fit));
      const covMap = cand.length ? await page.evaluate(SCAN_COVER, [cand.map((n) => n.id), 12]) : {};
      for (const n of cand) {
        if (!covMap[n.id]) continue;
        n.cov = covMap[n.id];
        const clip = { x: Math.max(0, Math.floor((n.x - PAD))), y: Math.max(0, Math.floor((n.y - PAD))),
          width: Math.ceil(n.w + PAD * 2), height: Math.ceil(n.h + PAD * 2) };
        await page.evaluate(HIDE_COVER, n.id);
        await page.waitForTimeout(80);
        const a = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '0']);
        await page.waitForTimeout(80);
        const b = (await page.screenshot({ clip })).toString('base64');
        await page.evaluate(SETONE, [n.id, '']);
        await page.evaluate(SHOW_COVER);
        await page.waitForTimeout(60);
        const d = await calc.evaluate(DIFF_MANY, [a, b, [[0, 0, 1e9, 1e9]], THR]);
        if (!d[0]) continue;                 /* 가리는 것을 치웠는데 잉크가 0 이면 못 믿는다 — 원값 유지 */
        n.inkRaw = n.ink;
        if (d[0].w !== n.ink.w || d[0].h !== n.ink.h) n.covFix = true;
        n.ink = d[0];
      }

      for (const n of nodes) rows.push(Object.assign({ screen: plabel, page: pg }, n));
      }   /* ← 772 쪽 루프 */
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  const refBrowser = browser, refCalc = calc;

  /* ---------- 원본 비율 기준표 ----------
     ⚠ **기준은 viewBox 가 아니라 «그 그림의 잉크» 다**(1회차 오측 정정). `.cic` 의 SVG 는 viewBox 가
     64×64 정사각이어도 **속 그림은 정사각이 아니다** — 입장권은 94×53, 튜토 보상은 112×127 이다.
     viewBox 를 기준으로 삼으면 그 자리들이 전부 «+77% 찌그러짐» 으로 읽힌다(1회차에 그렇게 읽혔다).
     ⇒ 그림마다 **큰 정수 상자·정수 좌표**에 한 번 그려 잉크 종횡비를 재고, 그것을 기준으로 쓴다.
     그러면 남는 편차는 «상자·좌표·래스터가 만든 것» 뿐이다 = 이 작업이 찾는 것. */
  const srcs = [...new Set(rows.filter((r) => r.tag === 'img' && r.src).map((r) => r.src))];
  const REFBOX = 256, REFPAD = 32, REFCOL = 4;
  const refAsp = new Map();
  if (srcs.length) {
    const rp = await refBrowser.newPage({ viewport: { width: REFCOL * (REFBOX + REFPAD) + REFPAD,
      height: Math.ceil(srcs.length / REFCOL) * (REFBOX + REFPAD) + REFPAD }, deviceScaleFactor: 2 });
    await rp.goto(URL, { waitUntil: 'load' });          /* 같은 출처라야 file:// 이미지가 뜬다 */
    await rp.evaluate((L) => {
      document.documentElement.innerHTML = '<body style="margin:0;background:#fff"></body>';
      const [list, BOX, PAD, COL] = L;
      list.forEach((s, i) => {
        const im = document.createElement('img');
        im.src = s; im.setAttribute('data-ref', String(i));
        im.style.cssText = `position:absolute;object-fit:contain;width:${BOX}px;height:${BOX}px;` +
          `left:${PAD + (i % COL) * (BOX + PAD)}px;top:${PAD + Math.floor(i / COL) * (BOX + PAD)}px`;
        document.body.appendChild(im);
      });
    }, [srcs, REFBOX, REFPAD, REFCOL]);
    await rp.waitForTimeout(900);
    const boxes = srcs.map((s, i) => {
      const x = REFPAD + (i % REFCOL) * (REFBOX + REFPAD), y = REFPAD + Math.floor(i / REFCOL) * (REFBOX + REFPAD);
      return [(x - 4) * 2, (y - 4) * 2, (x + REFBOX + 4) * 2, (y + REFBOX + 4) * 2];
    });
    const ra = (await rp.screenshot()).toString('base64');
    await rp.evaluate(() => { for (const e of document.querySelectorAll('[data-ref]')) e.style.opacity = '0'; });
    await rp.waitForTimeout(150);
    const rbb = (await rp.screenshot()).toString('base64');
    const got = await refCalc.evaluate(DIFF_MANY, [ra, rbb, boxes, THR]);
    /* 기준은 «비율» 과 «상자를 얼마나 채우는가» 둘 다 남긴다 — 후자가 «가려짐» 판별자다 */
    srcs.forEach((s, i) => {
      if (got[i] && got[i].w >= 20 && got[i].h >= 20 && !got[i].edge) {
        refAsp.set(s, { asp: got[i].w / got[i].h, fw: got[i].w / (REFBOX * 2), fh: got[i].h / (REFBOX * 2) });
      }
    });
    await rp.close();
  }
  await refBrowser.close();

  /* ---------- 판정 ----------
     ⚠ 판정 스코프는 **원본 잉크 비율을 잴 수 있는 노드**뿐이다 — `img` + `object-fit` 이 «늘리지 않는»
     값(contain/scale-down/none). 캔버스는 «무엇을 그렸는지» 가 JS 안에 있어 원본 비율이 없다
     (70 출석의 `#porCv` 가 그 자리다 — 상자 88×92 에 사람 그림이라 잉크 168×180 이 정상이다).
     캔버스의 비균등 «변환» 은 `scan356` 이 이미 본다. */
  const JUDGE = JUDGE_FIT;
  const OCC = Number(process.env.PROBE418_OCC || 0.03);
  const measured = rows.filter((r) => r.ink && r.ink.w >= 6 && r.ink.h >= 6);
  for (const r of measured) {
    r.ref = r.tag === 'img' && refAsp.has(r.src) ? refAsp.get(r.src) : null;
    r.inScope = !!r.ref && JUDGE.has(r.fit);
    if (!r.inScope) continue;
    /* ⚠ **가려진 아이콘은 판정 밖이다.** 차분은 «바뀐 픽셀» 이라, 아이콘 위를 형제가 덮거나
       조상이 `overflow:hidden` 으로 자르면 bbox 가 그만큼 작아진다 — 그 자리는 비율이 아니라
       **가림**이 만든 값이다(1회차에 10 상점 알약이 «+140%» 로 읽힌 자리 · 실측 잉크 89×37).
       기준표에 «상자를 얼마나 채우는가»(fw·fh)를 같이 재 뒀으므로 예상 크기와 3% 넘게 어긋나면 뺀다.
       래스터가 만드는 결함은 **1px** 이라 이 문턱을 절대 못 넘는다(가장 큰 것도 1.3%). */
    const pw2 = r.ref.fw * r.w * DSF, ph2 = r.ref.fh * r.h * DSF;
    r.occ = Math.abs(r.ink.w / pw2 - 1) > OCC || Math.abs(r.ink.h / ph2 - 1) > OCC;
    r.judged = !r.occ;
    r.dev = (r.ink.w / r.ink.h) / r.ref.asp - 1;
  }
  const bad = measured.filter((r) => r.judged && Math.abs(r.dev) > TOL && !r.ink.edge);
  const clipped = measured.filter((r) => r.inScope && (r.ink.edge || r.occ));
  const outside = measured.filter((r) => !r.inScope);

  const byKey = new Map();
  for (const r of bad) {
    if (!byKey.has(r.sel)) byKey.set(r.sel, { sel: r.sel, cls: r.cls, cells: 0, screens: new Set(), worst: 0, sample: r });
    const g = byKey.get(r.sel);
    g.cells++; g.screens.add(r.screen);
    if (Math.abs(r.dev) > Math.abs(g.worst)) { g.worst = r.dev; g.sample = r; }
  }
  const list = [...byKey.values()].map((g) => ({
    sel: g.sel, cls: g.cls, cells: g.cells, screens: [...g.screens],
    dev: +(g.worst * 100).toFixed(2),
    ink: `${g.sample.ink.w}×${g.sample.ink.h}`,
    box: `${g.sample.w.toFixed(4)}×${g.sample.h.toFixed(4)}`,
    at: `${g.sample.x.toFixed(4)},${g.sample.y.toFixed(4)}`,
  })).sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));

  return { dsf: DSF, tol: TOL, revert: REVERT, screens: SCREENS.filter(([l]) => wanted(l)).length,
    measured: measured.length, judged: measured.filter((r) => r.judged).length,
    outside: outside.length, clipped: clipped.length, cells: bad.length, groups: list, errs,
    /* 750 ⓐ — 가림 보정: 앞을 덮는 형제가 있어 다시 잰 노드 수 · 그중 값이 실제로 달라진 수 */
    cov: measured.filter((r) => r.cov).length, covFix: measured.filter((r) => r.covFix).length,
    /* 530 — 정규화가 실제로 무엇을 걷었나. `fxLeft` 는 0 이어야 한다(verify356 [S3] ② 가 단언). */
    fx: fx.nodes, fxCls: fx.cls, fxLeft: fx.left, stillLost: fx.lost, anFin: fx.fin, anHeld: fx.held,
    /* 772 — 스크롤 쪽 넘김: 쪽이 둘 이상인 화면 수 · 첫 쪽 말고 더 돈 쪽 수 · 그릇 목록 ·
       그 쪽들에서만 나온 «처음 보는» 노드 수(= 이 처방이 넓힌 스코프의 크기) */
    scrolled: sc.screens, extraPages: sc.pages, pots: sc.pots, capped: sc.capped, maxpg: MAXPG, noscroll: NOSCROLL,
    belowFold: measured.filter((r) => r.page > 0).length,
    belowJudged: measured.filter((r) => r.page > 0 && r.judged).length };
}

/* 530 — 재현자(`probe530`)가 **같은** 정지·정규화를 쓰게 내놓는다(두 벌로 적으면 한쪽만 늙는다) */
module.exports = { sweep, SETTLE_FX, FX_LAYERS, FREEZE, STILL_CSS, COUNT_FXIN };

if (require.main !== module) return;

(async () => {
  const R = await sweep({ dsf: DSF, revert: REVERT, only: ONLY, tol: TOL });
  if (JSON_OUT) {
    console.log(JSON.stringify(R, null, 1));
  } else {
    console.log(`[probe418]${R.revert ? ' «되돌림»' : ''} DSF${R.dsf} · 화면 ${R.screens}개 · 잉크를 잰 노드 ${R.measured}개 ` +
      `(판정 ${R.judged} · 원본비 없음 ${R.outside} · 가려짐·잘림 ${R.clipped}) · ` +
      `종횡 편차 >${(R.tol * 100).toFixed(1)}% 인 칸 ${R.cells}개 → ${R.groups.length}자리`);
    console.log(`  [772] 스크롤 쪽 — ${R.noscroll ? '**꺼짐(되돌림)**' : `화면 ${R.scrolled}개에서 쪽 ${R.extraPages}개를 더 돌아 «스크롤 아래» 노드 ${R.belowFold}개를 쟀다(판정 ${R.belowJudged})`}`);
    console.log(`  [750] 가림 보정 — 앞을 덮는 형제가 있어 다시 잰 노드 ${R.cov}개 · 값이 달라진 노드 ${R.covFix}개`);
    console.log(`  [530] 연출 정규화 — 레이어 노드 ${R.fx}개 · fx- 클래스 ${R.fxCls}개를 걷고 «상시» 상태에서 쟀다 (잔여 ${R.fxLeft})`);
    console.log(`  [530] 애니 정지 — 유한 ${R.anFin}개 finish · 무한 ${R.anHeld}개 주기 0 · 타이머 창구 닫음 · 전이 차단 (스코프 손실 ${R.stillLost})`);
    for (const g of R.groups) {
      console.log(`  ${g.dev > 0 ? '+' : ''}${g.dev}%  ${g.sel}  «${g.cls}»  ${g.cells}칸 · 잉크 ${g.ink}`);
      console.log(`      상자 ${g.box} @ ${g.at} · 화면: ${g.screens.join(', ')}`);
    }
    if (R.errs.length) { console.log('\n[!] 화면 진입 실패'); R.errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
