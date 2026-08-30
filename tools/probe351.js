#!/usr/bin/env node
/* 351 프로브 — 9:19(1080×2280) 대비 9:13.3(1080×1600) «에서만 나빠진 것» 을 기계로 좁힌다.
 *
 * 실행: node tools/probe351.js [--only <라벨조각>] [--json <경로>] [--selftest] [--navtest]
 *
 * 왜 프로브를 먼저 두는가(338·341·350·363·368 규칙):
 *   351 은 «비평가 3명 × 전 화면» 루프라 회차가 비싸다. 등재문의 네 축 중 ⓐ 잘림 · ⓑ 겹침 ·
 *   ⓒ 글자 잘림 · ⓓ 조작성은 **사람 눈이 아니라 자로 재는 것이 더 정확**하고, 그렇게 좁힌
 *   자리만 비평가에게 캡처 짝으로 주면 «9:19 에도 있는 문제» 를 되짚느라 회차를 태우지 않는다.
 *
 * 판정의 핵심은 **차분**이다 — 같은 화면을 2280 과 1600 에서 각각 재고, 1600 에만 있는 결함을
 * 낸다. 9:19 에도 있는 것은 351 의 대상이 아니다(등재문: «별도 등재»).
 *
 * 재는 것 네 가지 (전부 «실제로 그려지는 상자» 기준 — 클리핑 조상을 전부 접어서 잰다):
 *   D1 프레임 밖   — 잘린 뒤에도 남는 잉크가 #app 밖에 있다(= 화면 밖으로 나갔다)
 *   D2 내용 잘림   — overflow:hidden 그릇의 scrollH/W 가 clientH/W 를 넘는다(스크롤도 못 한다)
 *   D3 글자 잘림   — 텍스트 노드를 가진 요소의 잉크가 그릇 밖으로 나간다
 *   D4 조작 불가   — 버튼/탭이 클리핑 뒤에 절반 이상 사라졌다
 *
 * ⚠ 오버레이를 후보로 적으면 안 된다(smoke.js 241 주석과 같은 함정) — `#pfw{inset:0}` 류는
 *   프레임에 앵커돼 «항상 프레임과 같은 크기» 라 원리적으로 안 걸린다. 그래서 D1 은 후보 목록이
 *   아니라 **#app 안의 모든 가시 요소**를 훑되, 클리핑을 접은 «실제 잉크 상자» 로만 판정한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
/* --selftest — **되돌림 시험**(334·348 처방). 10회차가 `settle()` 에 «무한 반복 연출 세우기» 를
   넣어 D2 유령을 지웠으므로, **그 대가로 실재하는 넘침까지 못 보게 된 것은 아닌지**를 못박는다:
   1600 판에서만 `overflow:hidden` 그릇 하나에 그릇보다 확실히 큰 자식을 심고 D2 가 그것을 내는지 본다.
   0 건이면 축이 죽은 것이다(«영원히 초록인 자»). */
const SELFTEST = process.argv.includes('--selftest');
/* --navtest — **424 이름표의 되돌림 시험**. D7 에 붙인 `조작+그림 / 그림만` 이 «한 번도 안 켜지는
   이름표» 가 아님을 못박는다: 1600 판에서만 탭바 위에 «불투명하고 포인터를 막는» 상자를 심고,
   그 자리가 `조작+그림` 으로 나오는지 본다(2280 은 안 심으므로 탭바가 닿는다 ⇒ 100 → 0).
   ⚠ 심는 자리는 SCAN **안**이다(435 교훈 — 주입과 판정이 다른 `evaluate` 라운드트립으로 갈리면
      게임 루프가 그 사이에 노드를 다시 써서 «영원히 초록인 시험» 이 된다).
   권장 실행: `node tools/probe351.js --only tab:hero --navtest` (오버레이가 없어 탭바가 닿는 화면). */
const NAVTEST = process.argv.includes('--navtest');

const TALL = [1080, 2280];   /* 9:19 기준 */
const SHORT = [1080, 1600];  /* 9:13.3 — 지원 최저 세로 */
/* D7 이름표(424)의 «닿는다» 문턱 — `tools/probe351c.js` 의 `REACH` 와 **같은 값**이다.
   같은 질문(«눌리나»)에 두 자가 다른 문턱을 두면 424 가 잡은 자기모순이 그대로 되살아난다. */
const NAVREACH = 50;

/* 화면 목록·진입·정착은 **공용 하네스** 한 벌에서 온다(6회차, 385 «자매 자 드리프트» 예방).
   여기 있던 fresh/settle/collectOpeners/drive 를 `tools/probe351lib.js` 로 그대로 옮겼고,
   옮긴 뒤 전수 재실행이 옮기기 전과 같은 결과(21건 · 화면 11/45)임을 대조로 확인했다. */
const { fresh, settle, collectOpeners, drive } = require('./probe351lib');

/* ---------------- 페이지 안에서 재는 자 ---------------- */
const SCAN = function (opts) {
  const app = document.getElementById('app');
  if (!app) return { defects: [] };
  /* ⚑ 424 `--navtest` — 이름표 되돌림 시험용 상자. **재는 것과 같은 `evaluate` 안**에서 심는다. */
  if (opts && opts.navtest) {
    const nv = document.getElementById('tabbar');
    if (nv) {
      const nr = nv.getBoundingClientRect();
      const box = document.createElement('div');
      box.id = 'navtestBox';
      box.style.cssText = 'position:fixed;left:0;width:1080px;top:' + (nr.top - 60) +
        'px;height:' + (nr.height + 60) + 'px;background:#123456;z-index:99999';
      app.appendChild(box);
    }
  }
  const A = app.getBoundingClientRect();
  const out = [];
  const seen = new Set();

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  /* 조상의 클리핑을 접은 상자 두 벌.
       drawn    — 모든 overflow≠visible 조상으로 자른 «지금 실제로 그려지는» 상자
       reach    — **스크롤로 닿을 수 있는 조상은 빼고** 자른 상자
     둘을 가르는 이유가 이 프로브의 핵심이다: 긴 리스트에서 접힌 카드는 «잘린 것» 이 아니라
     **스크롤하면 나오는 것**이고, 2280 과 1600 은 접히는 카드 수가 다르므로 그대로 세면
     화면마다 수십 건이 «1600 에서만 생긴 결함» 으로 둔갑한다(1회차 실측: 그런 유령이 다수).
     ⓐⓒⓓ 는 **스크롤로 회수 못 하는 손실**만 결함이다. */
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    const k = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    /* ⚠ 축마다 «스크롤로 닿는 순간 그 위 클리핑은 더 볼 것이 없다».
       1회차에 이걸 빼먹어 유령이 나왔다 — 스크롤 그릇을 «건너뛰기만» 하면 요소는 «스크롤 전»
       자리에 남고, 그 바깥의 hidden 조상(#bCos 등)이 그 자리를 잘라 «글자 21px 잘림» 이 찍힌다.
       실제로는 그 그릇을 스크롤하면 카드가 뷰포트 안으로 올라오고, 뷰포트는 바깥 조상 «안» 이다.
       ⇒ 그 축에서 스크롤 가능한 조상을 만나면 reachable 로 표시하고 **그 축은 거기서 끝낸다.** */
    let doneX = false, doneY = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (doneX && doneY) break;
      const cs = getComputedStyle(p);
      const ox = cs.overflowX, oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const pr = p.getBoundingClientRect();
      const scX = /auto|scroll/.test(ox) && p.scrollWidth > p.clientWidth + 2;
      const scY = /auto|scroll/.test(oy) && p.scrollHeight > p.clientHeight + 2;
      if (ox !== 'visible') {
        d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right);
        if (!doneX) { if (scX) doneX = true; else { k.x1 = Math.max(k.x1, pr.left); k.x2 = Math.min(k.x2, pr.right); } }
      }
      if (oy !== 'visible') {
        d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom);
        if (!doneY) { if (scY) doneY = true; else { k.y1 = Math.max(k.y1, pr.top); k.y2 = Math.min(k.y2, pr.bottom); } }
      }
    }
    d.w = d.x2 - d.x1; d.h = d.y2 - d.y1;
    k.w = k.x2 - k.x1; k.h = k.y2 - k.y1;
    return { drawn: d, reach: k };
  };
  const pathOf = (el) => {
    const bits = [];
    for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { bits.unshift('#' + e.id); break; }
      const c = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      bits.unshift(c ? s + '.' + c : s);
    }
    return bits.join('>');
  };
  const push = (kind, el, detail) => {
    const key = kind + '|' + pathOf(el) + '|' + detail.k;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, path: pathOf(el), key, ...detail });
  };

  const all = app.querySelectorAll('*');
  for (const el of all) {
    if (!vis(el)) continue;
    const raw = el.getBoundingClientRect();
    if (raw.width < 1 || raw.height < 1) continue;
    const { drawn: c, reach: k } = clipped(el);
    const drawn = c.w > 0.5 && c.h > 0.5;
    const onScreen = k.w > 0.5 && k.h > 0.5;   /* 스크롤하면 닿는 자리인가 */

    /* D1 — 잘린 뒤에도 남는 잉크가 프레임 밖 */
    if (drawn) {
      const over = Math.max(A.top - c.y1, c.y2 - A.bottom, A.left - c.x1, c.x2 - A.right);
      if (over > 1.5) {
        /* 자식이 부모와 같은 이유로 나갔으면 부모 하나만 센다 */
        push('D1', el, { k: 'out', over: Math.round(over) });
      }
    }

    /* D2 — overflow:hidden 그릇에서 내용이 넘쳐 스크롤도 못 한다 */
    const cs = getComputedStyle(el);
    const hidY = cs.overflowY === 'hidden', hidX = cs.overflowX === 'hidden';
    if (hidY && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 8) {
      push('D2', el, { k: 'ovfY', by: el.scrollHeight - el.clientHeight });
    }
    if (hidX && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 8) {
      push('D2', el, { k: 'ovfX', by: el.scrollWidth - el.clientWidth });
    }

    /* D3 — 글자 잉크가 그릇 밖으로 (텍스트를 직접 가진 요소만) */
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { hasText = true; break; }
    if (hasText && onScreen) {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      const ir = rg.getBoundingClientRect();
      if (ir.width > 0 && ir.height > 0) {
        const cut = Math.max(k.x1 - ir.left, ir.right - k.x2, k.y1 - ir.top, ir.bottom - k.y2);
        if (cut > 2) push('D3', el, { k: 'textcut', cut: Math.round(cut), t: (el.textContent || '').trim().slice(0, 18) });
      }
    }

    /* D5 — «1600 안에 다 안 들어온다»(등재문 ⓐ 의 본체).
       스크롤 그릇 자체가 2280 에서는 안 넘치는데 1600 에서만 넘치면, 그 화면은 짧은 프레임에서
       **스크롤해야 전부 보이는 화면**이 된 것이다. D2 와 달리 내용을 «못 보는» 것은 아니지만
       팝업의 닫기 ✕ 나 확인 버튼이 첫 화면 밖으로 나가면 ⓓ 조작성까지 같이 깎인다.
       (그래서 스크롤로 닿는다는 이유로 D3·D4 에서 뺀 손실이 여기서 한 번 잡힌다.) */
    if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 200) {
      push('D5', el, { k: 'needscroll', by: el.scrollHeight - el.clientHeight });
    }

    /* D4 — 누를 것이 클리핑 뒤로 절반 넘게 사라졌다 */
    /* `[data-eqslot]`(08 장비 칸)은 3회차에 **빠져 있던 것을 비평가 3인이 먼저 찾아** 넣었다 —
       자의 후보 목록이 곧 사각지대다. 새 «누를 것» 을 만들면 여기에도 같이 적어라. */
    const isBtn = el.matches('button, .tab, .ibtn, .ubtn, .cbtn, .ifbtn, .mbtn, [data-pop], [data-mn], [data-cur], [data-eqtab], [data-eqslot], [data-costab], [data-dsub], [data-trsub], [data-ptab], [data-ct], .stab, .shp-ct, .clk');
    if (isBtn) {
      const visArea = Math.max(0, k.w) * Math.max(0, k.h);
      const rawArea = raw.width * raw.height;
      if (rawArea > 100 && visArea < rawArea * 0.5) {
        push('D4', el, { k: 'hidbtn', pct: Math.round(100 * visArea / rawArea) });
      }

      /* D6 — «가려짐»(ⓑ·ⓓ). 클리핑이 아니라 **z 순서로 남이 위를 덮는** 경우는 위 자들이 원리적으로
         못 본다(상자는 멀쩡히 프레임 안에 있다). 그래서 실제 포인터가 닿는 것을 묻는다 —
         버튼 상자 안 9점을 `elementFromPoint` 로 찍어 자기(또는 자기 자손·조상)가 아닌 것이
         잡히는 비율을 센다. 이것이 ⓓ 조작성의 정의 그 자체다.
         ⚠ `pointer-events:none` 인 장식(HUD `#stinfo` 류, LESSONS 350)은 포인터를 통과시키므로
            «시각적 겹침» 은 여기 안 걸린다 — 그건 ⓑ 로 사람이 볼 몫이다. */
      if (drawn && k.w > 4 && k.h > 4) {
        let blocked = 0, tested = 0, by = '';
        for (const fx of [0.5, 0.2, 0.8]) for (const fy of [0.5, 0.2, 0.8]) {
          const x = k.x1 + k.w * fx, y = k.y1 + k.h * fy;
          if (x < A.left || x > A.right || y < A.top || y > A.bottom) continue;
          tested++;
          const hit = document.elementFromPoint(x, y);
          if (!hit) { blocked++; continue; }
          if (hit === el || el.contains(hit) || hit.contains(el)) continue;
          blocked++;
          if (!by) by = hit.id ? '#' + hit.id : hit.tagName.toLowerCase() + '.' + String(hit.className).trim().split(/\s+/).slice(0, 2).join('.');
        }
        if (tested >= 5 && blocked > tested * 0.5) {
          push('D6', el, { k: 'covered', pct: Math.round(100 * blocked / tested), by });
        }
      }
    }
  }

  /* ── D7 — «불투명 상자가 고정 내비(탭바)·HUD 판때기를 덮는다» (5회차 신설) ─────────────
     왜 새 축이 필요한가: 5회차에 비평가 3인이 **각자 1순위로** 22 퀘스트 모달이 하단 탭바를
     11~26px 물고 들어간 것을 짚었는데 **자는 한 건도 못 봤다.** 원리적으로 못 본다 —
       · D1~D5 는 «클리핑·넘침» 을 재는데 모달은 아무것도 자르지 않는다(그냥 위에 얹힌다).
       · D6 은 포인터를 쓰지만, 모달이 열리면 탭바는 **2280 에서도 딤에 막힌다** ⇒ 같은 key 가
         두 해상도에 다 있어 차분에서 **소거된다**.
     그래서 «딤이 덮은 것» 과 «상자가 덮은 것» 을 갈라야 한다. 채점 규칙이 이미 그렇게 갈라 뒀다 —
     «가운데 다이얼로그가 딤 뒤 배경을 가리는 것은 감점 아님 / 상자가 고정 내비를 덮으면 감점».
     ⇒ 딤(`.dim`, 반투명 판)을 빼고 **불투명 상자**(배경 alpha ≥ .9)만 골라 탭바·HUD 판때기와의
        세로 겹침 px 를 잰다. 2280 에는 없고 1600 에만 있으면 그것이 이 루프가 묻는 결함이다.
     ⚠ 기준선을 못 찾으면 «침범 없음» 이 아니라 아무것도 세지 않는다(LESSONS 351-④ 의 짝 —
        `A > null` 이 true 로 굴러 헛초록이 됐던 자리라, 여기서는 목표가 없으면 축을 끈다). */
  const navs = [];
  const tabbar = document.getElementById('tabbar');
  if (tabbar && vis(tabbar)) navs.push({ name: 'tabbar', r: tabbar.getBoundingClientRect(), el: tabbar });
  /* HUD 판때기 = 사람이 보는 «판» 의 가장 아래(LESSONS 351-① — 글자줄 `.pcp` 가 아니라 `.pedge`) */
  const pedge = document.querySelector('.pedge');
  if (pedge && vis(pedge)) navs.push({ name: 'hud', r: pedge.getBoundingClientRect(), el: pedge });
  /* ⚑ 407 — 미션 배너 `#tuto` 를 목록에 넣는다. 여기 없어서 자가 **원리적으로 못 보던** 자리가 있었다:
     33 재화 정보 팝업이 1600 에서 배너를 70.5px 파고들고 [진행중] 버튼 잉크가 87.5% 덮이는데
     (`probe407`), 5~7회차 내내 D7 은 조용했고 비평가 3인(BY·BZ·CA)이 눈으로 먼저 짚었다.
     ⚠ **`probe351c` 의 E1(닿음)로는 이 자리를 못 낸다** — 배너는 딤 뒤라 **2280 에서도 안 닿아**
     차분에서 소거된다. 위 D7 주석이 탭바에 대해 적어 둔 함정과 같은 자리다 ⇒ D7 의 몫이 맞다.
     배너는 하단 앵커(`bottom:171` + 탭바 180 ⇒ 상변 = 프레임 하변 − 501)라 탭바·HUD 와 같은
     «고정 요소» 다 — 던전 런 중에는 `display:none` 이므로 vis() 가 알아서 뺀다. */
  const tuto = document.getElementById('tuto');
  if (tuto && vis(tuto)) navs.push({ name: 'tuto', r: tuto.getBoundingClientRect(), el: tuto });

  /* ⚑ 424 — 406 규약(«2280 에서 이미 안 닿는 것은 판정 불가»)을 D7 에 **분류로** 가져온다.
     무엇이 어긋나 있었나: 406 은 `probe351c` E1 을 «덮임» → «닿음» 으로 갈면서 그 규약을
     확정했는데(LESSONS 406-①), D7 은 여전히 «세로 겹침 px» 하나만 재서 **딤이 두 해상도
     다 포인터를 막아 둔 자리도 «1600 전용 결함» 으로** 낸다 ⇒ 같은 자리를 두 자가 반대로
     말한다(424 등재문 «게이트 자기모순»).
     ⚠ **그렇다고 D7 을 E1 로 바꾸면 안 된다**(406-④ · 424 등재문). D7 이 묻는 것은 포인터가
        아니라 **그림**이고, 390·391·400·407 이 실제로 고친 자리는 전부 «딤 뒤라 두 해상도
        다 안 닿는» 곳이었다(407 의 `#tuto` 배너가 그 표본 — 위 407 주석이 그것을 적어 뒀다).
        배제로 처리하면 그 넷이 자에서 통째로 사라진다.
     ⇒ **버리지 말고 갈라 적는다.** 고정 내비가 각 해상도에서 «닿나»(`elementFromPoint`,
        351c 와 같은 5×5 격자·같은 문턱 50%)를 같이 재서 러너가 이름표를 붙인다:
          · 2280 닿음 ≥50 → 1600 <50  = `조작+그림` (E1 과 같은 말을 한다)
          · 그 밖(둘 다 안 닿음 / 1600 에서도 닿음) = `그림만` (406 규약대로 조작 상실이 아니다)
     판정 key·문턱(`ov > 2 && ox > 40`)은 한 칸도 안 건드렸으므로 **차분 건수는 그대로**다 —
     이 변경이 더하는 것은 «건수» 가 아니라 «무슨 결함인가» 다. */
  const navReach = {};
  for (const nav of navs) {
    const r = nav.r;
    let reach = 0, tested = 0;
    for (const fx of [0.12, 0.3, 0.5, 0.7, 0.88]) for (const fy of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < A.left + 0.5 || x > A.right - 0.5 || y < A.top + 0.5 || y > A.bottom - 0.5) continue;
      tested++;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === nav.el || nav.el.contains(hit))) reach++;
    }
    /* 표본이 8 미만이면 «안 닿는다» 가 아니라 **모른다** 다(351c reachPct 와 같은 규칙) —
       null 을 내면 러너가 그 자리를 `조작+그림` 으로 승격하지 않는다. */
    navReach[nav.name] = tested < 8 ? null : Math.round(100 * reach / tested);
  }

  if (navs.length) {
    for (const el of all) {
      if (!vis(el)) continue;
      if (el.classList.contains('dim')) continue;                 /* 딤은 규칙상 감점 아님 */
      const cs2 = getComputedStyle(el);
      const bg = cs2.backgroundColor || '';
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
      const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
      /* ⚑ 7회차 — «불투명 상자» 를 `backgroundColor` 하나로 물으면 **이 게임의 띠는 태반이 안 걸린다.**
         `background:linear-gradient(...)` 는 `backgroundColor` 가 `rgba(0,0,0,0)` 으로 계산되기 때문이다.
         실제로 34 축복의 `.bls-promo`(952×249 · 초록 그라데이션)가 1600 에서 탭바를 **164px** 덮고
         있는데 D7 은 5·6회차 내내 조용했다. 못박은 것은 자가 아니라 **찍힌 픽셀**이다
         (`tools/probe351d.js` — 그 띠에서 탭바를 숨겨도 바뀌는 픽셀 0/13860). 406 이 E1 을
         «덮임 → 닿음» 으로 고친 것과 같은 종류의 정정이고, 이쪽은 **자가 덜 세고 있었다.**
         ⇒ 배경 이미지(그라데이션·url)도 «칠» 로 센다. */
      if (!(alpha >= 0.9 || cs2.backgroundImage !== 'none')) continue;   /* 불투명 상자만 */
      /* ⚠ **raw 상자로 재면 유령이 쏟아진다** — 첫 판에 08 시트 카드 배경(`.eqc>.gnd`)이
         «탭바를 140px 덮는다» 로 찍혔다. 그 노드는 `.shsc` 안이라 **탭바 근처에는 한 픽셀도
         안 그려진다.** 1회차가 D1~D4 에서 이미 배운 것과 같다 ⇒ D7 도 **클리핑을 접은
         «지금 실제로 그려지는» 상자**(drawn)로 잰다. */
      const { drawn: r } = clipped(el);
      r.width = r.x2 - r.x1; r.height = r.y2 - r.y1;
      r.left = r.x1; r.right = r.x2; r.top = r.y1; r.bottom = r.y2;
      if (r.width < 300 || r.height < 200) continue;              /* 다이얼로그·시트 급만 */
      if (r.width * r.height < 120000) continue;
      for (const nav of navs) {
        if (el === nav.el || el.contains(nav.el) || nav.el.contains(el)) continue;
        const ov = Math.min(r.bottom, nav.r.bottom) - Math.max(r.top, nav.r.top);
        const ox = Math.min(r.right, nav.r.right) - Math.max(r.left, nav.r.left);
        if (ov > 2 && ox > 40) push('D7', el, { k: 'covers:' + nav.name, by: Math.round(ov), wide: Math.round(ox) });
      }
    }
  }
  return { defects: out, navReach, frame: { top: A.top, bottom: A.bottom, h: A.height } };
};

(async () => {
  const browser = await launch(chromium);
  const results = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[351] 화면 ${openers.length}개 × 2해상도 스캔`);

    for (const o of openers) {
      const scan = async ([w, h], inject, navtest) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        if (inject) {
          const hit = await page.evaluate(() => {
            const app = document.getElementById('app'); if (!app) return 0;
            let n = 0;
            for (const el of app.querySelectorAll('*')) {
              const cs = getComputedStyle(el);
              if (cs.overflowX !== 'hidden' || cs.display === 'none') continue;
              if (el.clientWidth < 40 || el.clientHeight < 40) continue;
              const s = document.createElement('s');
              s.style.cssText = 'display:block;width:' + (el.clientWidth + 400) + 'px;height:4px';
              el.appendChild(s);
              n++;
              if (n >= 2) break;
            }
            return n;
          });
          console.log(`        [selftest] overflow:hidden 그릇 ${hit}개에 «그릇 폭 +400px» 자식을 심었다`);
          if (!hit) console.log('        [selftest] ⚠ 주입 0개 — 시험이 성립하지 않는다');
        }
        const r = await page.evaluate(SCAN, { navtest: !!navtest })
          .catch((e) => ({ defects: [], err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL);
      const short = await scan(SHORT, SELFTEST, NAVTEST);
      const tallKeys = new Set(tall.defects.map((d) => d.key));
      const regress = short.defects.filter((d) => !tallKeys.has(d.key));
      /* ⚑ 424 — D7 에 406 규약 이름표를 붙인다(SCAN 의 navReach 주석 참조).
         **거르지 않는다** — 건수는 그대로 두고 `axis` 한 칸만 더 적는다. */
      for (const d of regress) {
        if (d.kind !== 'D7') continue;
        const nav = String(d.k || '').replace(/^covers:/, '');
        const t = tall.navReach ? tall.navReach[nav] : undefined;
        const s = short.navReach ? short.navReach[nav] : undefined;
        const show = (v) => (v === null || v === undefined ? '?' : v + '%');
        d.navHit = show(t) + '→' + show(s);
        d.axis = (typeof t === 'number' && typeof s === 'number' && t >= NAVREACH && s < NAVREACH)
          ? '조작+그림' : '그림만';
      }
      results.push({ label: o.label, tall: tall.defects.length, short: short.defects.length, regress });
      const mark = regress.length ? `⚠ ${regress.length}` : '·';
      console.log(`  ${mark.padEnd(5)} ${o.label.padEnd(22)} 2280:${String(tall.defects.length).padStart(3)}  1600:${String(short.defects.length).padStart(3)}`);
      for (const d of regress.slice(0, 6)) {
        console.log(`        ${d.kind} ${d.path} ${JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !['kind', 'path', 'key'].includes(k))))}`);
      }
    }
  } finally { await browser.close(); }

  const tot = results.reduce((a, r) => a + r.regress.length, 0);
  const bad = results.filter((r) => r.regress.length);
  console.log(`\n[351] 1600 에서만 생긴 결함 ${tot}건 · 화면 ${bad.length}/${results.length}`);
  /* 종류별 집계 — 어떤 축(ⓐⓑⓒⓓ)이 실재하는지 한눈에 */
  const byKind = {};
  for (const r of results) for (const d of r.regress) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  console.log('  종류별: ' + (Object.keys(byKind).length ? Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join(' · ') : '없음'));
  /* ⚑ 424 — D7 을 축별로 갈라 적는다. `그림만` 은 «딤이 두 해상도 다 막아 둔 자리» 라
     조작 상실이 아니고(406 규약), `조작+그림` 은 351c E1 이 내는 것과 같은 말이다.
     ⚠ **이 줄은 «면죄부» 가 아니다** — 두 축 합계는 위 `D7=` 과 항상 같다(거른 것이 0건). */
  const d7 = [];
  for (const r of results) for (const d of r.regress) if (d.kind === 'D7') d7.push(d);
  if (d7.length) {
    const op = d7.filter((d) => d.axis === '조작+그림').length;
    console.log(`  D7 축(424): 조작+그림 ${op} · 그림만 ${d7.length - op}  (합계 ${d7.length} = 위 D7 값 — 거른 것 0건)`);
    if (!op) console.log('    ⚠ `조작+그림` 0건 — 이름표가 한 번도 안 켜졌다. 죽은 축인지 `--navtest` 로 확인하라.');
  }
  if (NAVTEST) {
    /* 심은 상자가 **나오고** 그 자리가 `조작+그림` 이어야 시험이 성립한다.
       나오기만 하고 `그림만` 이면 이름표가 죽은 것이고, 아예 안 나오면 D7 자체가 죽은 것이다. */
    const hit = d7.filter((d) => String(d.path).includes('#navtestBox'));
    const okA = hit.length > 0;
    const okB = hit.some((d) => d.axis === '조작+그림');
    console.log(`  [navtest] 심은 상자 D7 검출 ${okA ? 'OK' : 'FAIL'} (${hit.length}건) · ` +
      `이름표 «조작+그림» ${okB ? 'OK' : 'FAIL'}` + (hit.length ? ` (${hit.map((d) => d.axis + ' ' + d.navHit).join(', ')})` : ''));
    if (!(okA && okB)) { console.log('  [navtest] ⚠ 되돌림 시험 실패 — 축 또는 이름표가 죽었다'); process.exit(1); }
    console.log('  [navtest] PASS');
  }
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(results, null, 1)); console.log('  JSON → ' + JSONOUT); }
  process.exit(0);
})().catch((e) => { console.error('PROBE351 CRASH', e); process.exit(2); });
