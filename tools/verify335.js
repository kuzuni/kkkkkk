/* 작업 335 — 03 던전 팝업 «서브탭 블록» 기하 게이트.
 *
 *   node tools/verify335.js
 *
 * 왜 이 자가 필요한가 ─────────────────────────────────────────────────────
 * 72 의 15~17회차에서 비평가 넷(AH·AI·AJ·AK)이 이 블록에 다섯 줄을 일치 지적했고,
 * 그것이 72 의 ①~④ 를 6 에 묶었다. 픽셀로 다시 재 보니 **다섯 중 셋이 유령**이었다:
 *
 *   ① «바 +34px 하향»      → 유령. 하단 앵커 요소에 상단 앵커 변환(−84)을 쓴 것.
 *   ② «바 높이 79 → 99»    → 유령. 실측 ref 97 · 우리 99 (Δ+2).
 *   ③ «활성 알약 −25.8%»   → 유령. 바 안쪽 기준 ref 85 · 우리 85 (Δ0).
 *   ④ «이음매 0 → 14px»    → **실재**. 96 2회차가 «상점과 같은 14px» 로 넣은 여백.
 *   ⑤ «축 −8.5px 좌»       → **실재**. 96 2회차가 «다른 바는 대칭» 으로 지운 ref 비대칭.
 *
 * 유령 셋의 뿌리는 하나다 — **이 화면에는 앵커가 둘 있다**:
 *   상단 앵커(카드 리스트)  cap_y = ref_y − 84
 *   하단 앵커(서브탭 바·탭바) cap_y = ref_y − 60      (ref 2340 ↔ cap 2280)
 * 비평가에게는 ROUTINE 이 «−84» 만 알려 주므로 하단 앵커 요소는 자동으로 +24 어긋나 보인다.
 * 그 24px 이 고이는 **유일한 실재 자리**가 «리스트 하단 ↔ 바 상변» 이음매이고, 그것이 ④ 다.
 *
 * 그래서 이 게이트는 **두 앵커를 각각의 자로 잰다.** 앞으로 누가 «바가 24px 낮다» 며
 * bottom 을 건드리면 여기서 빨개진다(탭바와의 40px 이 깨지므로).
 *
 * 되돌림 시험(§R) — LESSONS 334-③. «무르게 푼 수리» 가 아님을 못박는다:
 *   옛 값(bottom:153 · left:143)을 주입하면 ④⑤ 가 빨개지고, 원복하면 초록이어야 한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  PASS ' + name + ' — ' + got); }
  else { fail++; console.log('  FAIL ' + name + ' — ' + got); }
};
const near = (name, got, want, tol) =>
  ok(name + ' (ref ' + want + ', Δ≤' + tol + ')', Math.abs(got - want) <= tol,
    got + '  Δ' + (got - want >= 0 ? '+' : '') + (+(got - want).toFixed(1)));

/* 측정표 docs/measure/03-던전팝업.md §4 · 부록A */
const R = {
  /* 337 이관 — 바 높이는 «98 ± 2» 로 뭉개 두던 자리다. ref 검정 테두리 행이 2021~2026 / 2112~2117
     이므로 외곽은 2021..2117 = **97** 이고 하변도 2118 이 아니라 2117 이다(AA 1px). */
  barTop: 2021 - 60, barBottom: 2117 - 60, barH: 97,
  barLeft: 151, barRight: 944, barW: 794, axis: 8,
  pillH: 85,                       /* 바 검정 테두리 «안쪽» — ref 2027~2111 */
  tabbarTop: 2160 - 60,
  gapBarTabbar: 41,
  card1Top: 241 - 84, card5Bottom: 2030 - 84,
  gapListBar: 0,
};

const READ = () => {
  const F = document.getElementById('app').getBoundingClientRect();
  const rel = e => { const b = e.getBoundingClientRect();
    return { x: +(b.x - F.x).toFixed(1), y: +(b.y - F.y).toFixed(1),
             w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             r: +(b.right - F.x).toFixed(1), b: +(b.bottom - F.y).toFixed(1) }; };
  const bar = rel(document.getElementById('dunSub'));
  const list = rel(document.querySelector('#dunw .dns-list'));
  const tabbar = rel(document.getElementById('tabbar'));
  const on = document.querySelector('#dunSub .stab.on');
  const cards = [...document.querySelectorAll('#dunList .dnc')].map(rel);
  return { bar, list, tabbar, cards, pill: on ? rel(on) : null,
           tabs: [...document.querySelectorAll('#dunSub .stab')].map(rel),
           frameW: +F.width.toFixed(1) };
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1300);
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(900);

    const m = await page.evaluate(READ);

    /* ── §1 하단 앵커 — 바 자체 ───────────────────────────────────────── */
    console.log('\n[1] 하단 앵커 (cap_y = ref_y − 60) — 서브탭 바');
    near('바 상변 y', m.bar.y, R.barTop, 2);
    near('바 하변 y', m.bar.b, R.barBottom, 3);
    near('바 높이', m.bar.h, R.barH, 2);
    near('바 하변 ↔ 탭바 상변', +(m.tabbar.y - m.bar.b).toFixed(1), R.gapBarTabbar, 2);
    near('탭바 상변 y', m.tabbar.y, R.tabbarTop, 1);

    /* ── §2 축·폭 — 335 가 되돌린 자리 ────────────────────────────────── */
    console.log('\n[2] 축·폭 — ref 는 화면중심 +8 **비대칭** (335)');
    near('바 좌변 x', m.bar.x, R.barLeft, 1);
    near('바 우변 x', m.bar.r, R.barRight, 1);
    near('바 폭', m.bar.w, R.barW, 1);
    near('축(좌여백 − 우여백)/2', +((m.bar.x - (m.frameW - m.bar.r)) / 2).toFixed(1), R.axis, 1);
    ok('레퍼런스가 기운 것이 아니다 — 같은 화면 카드는 좌우 대칭',
      Math.abs(m.cards[0].x - (m.frameW - m.cards[0].r)) <= 1,
      '카드 좌 ' + m.cards[0].x + ' / 우 ' + (m.frameW - m.cards[0].r));

    /* ── §3 이음매 — **네 번째 유령**이었던 자리 ───────────────────────── */
    /* 레퍼런스는 카드5 하변(2030)이 바 상변(2021)을 8px 덮어 바탕 0px 이지만, 프레임이 레퍼런스
       콘텐츠(2256)보다 24px 길므로 이 자리의 기대치는 **−8 + 24 = 16px 안팎**이다.
       72 의 넷이 «0 이어야 한다» 고 넘긴 것은 하단 앵커에 −84 를 쓴 결과다(①②③ 과 같은 뿌리).
       그래서 여기서 지키는 것은 «거리 0» 이 아니라 **거리가 구조적 몫이고, 클립선이 카드 경계라
       유령 가로줄이 안 생기는 것** 두 가지다. */
    console.log('\n[3] 이음매 — 구조적 24px 몫 · 유령 가로줄 없음 (335 2회차)');
    const seam = +(m.bar.y - m.list.b).toFixed(1);
    ok('이음매 거리가 구조적 몫 12~18px (ref −8 + 24 = 16 안팎)',
      seam >= 12 && seam <= 18, seam + 'px');
    ok('리스트가 바를 침범하지 않는다 (하단선 ≤ 바 상변)', m.list.b <= m.bar.y + 1,
      '리스트 하변 ' + m.list.b + ' / 바 상변 ' + m.bar.y);
    /* ★ 유령 가로줄 — 클립선을 바 상변까지 늘리면(bottom:139) 6번째 카드의 검정 상변이 4px 새어
       나오는데, 카드 980 폭 vs 바 794 폭이라 **바 밖으로 좌우 124px 씩** 삐져나온다.
       335 1회차에 실제로 그렇게 만들었고 비평가 AL·AM 이 그 회차의 «유일한 구조적 결함» 으로 짚었다. */
    ok('클립선이 카드 경계에서 끊긴다 (카드5 하변과 일치, Δ≤1px)',
      Math.abs(m.list.b - m.cards[4].b) <= 1,
      '클립선 ' + m.list.b + ' / 카드5 하변 ' + m.cards[4].b);
    /* 클립선이 어떤 카드의 «몸통 안» 을 지나면 그 카드의 검정 상변이 잘린 채 새어 나온다.
       카드 경계에서 끊기면(위 단언) 자동으로 참이지만, 둘을 따로 두는 이유는 실패했을 때
       **어느 카드가 새는지**가 바로 나오게 하기 위해서다. */
    const cut = m.cards.filter(c => m.list.b > c.y + 0.5 && m.list.b < c.b - 0.5);
    ok('클립선이 어떤 카드의 몸통도 가르지 않는다 (유령 가로줄 0)', cut.length === 0,
      '클립선 ' + m.list.b + ' · 잘리는 카드 ' + (cut.length ? JSON.stringify(cut) : '없음'));

    /* ── §4 상단 앵커 — 카드 리스트는 안 움직였다 ─────────────────────── */
    console.log('\n[4] 상단 앵커 (cap_y = ref_y − 84) — 카드는 제자리 (335 는 카드를 안 건드렸다)');
    near('카드1 상변 y', m.cards[0].y, R.card1Top, 1);
    near('카드5 하변 y', m.cards[4].b, R.card5Bottom, 2);
    ok('카드 pitch 360 (gap 10) 유지', m.cards.slice(1).every((c, i) =>
      Math.abs(c.y - m.cards[i].y - 360) <= 1), m.cards.map(c => c.y).join(','));

    /* ── §5 활성 알약 — «유령» 이었음을 못박는다 ──────────────────────── */
    console.log('\n[5] 활성 알약 — ref 는 «바 안쪽» 을 꽉 채운다 (85px). 유령 지적 방지');
    near('활성 알약 높이', m.pill.h, R.pillH, 1);
    ok('알약이 바 테두리 안쪽에 앉는다 (상 6 / 하 6~8)',
      m.pill.y - m.bar.y >= 5 && m.bar.b - m.pill.b >= 5,
      '상 ' + (m.pill.y - m.bar.y) + ' / 하 ' + (m.bar.b - m.pill.b));
    ok('칸 3등분 (209 «탑» 신설 — 칸 수는 감점 대상이 아니다)', m.tabs.length === 3
      && Math.abs(m.tabs[0].w - m.tabs[2].w) <= 1, m.tabs.map(t => t.w).join(' / '));

    /* ── §R 되돌림 시험 ───────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 옛 값(bottom:139 · left:143)을 주입하면 빨개져야 한다');
    await page.addStyleTag({ content: '#dunw .dns-list{bottom:139px!important}'
      + '#dunSub{left:143px!important}' });
    await page.waitForTimeout(250);
    const bad = await page.evaluate(READ);
    ok('R-1 클립선을 바 상변까지 늘리면(139) 유령 가로줄 단언이 깨진다',
      bad.cards.some(c => bad.list.b > c.y + 0.5 && bad.list.b < c.b - 0.5)
      && Math.abs(bad.list.b - bad.cards[4].b) > 1,
      '클립선 ' + bad.list.b + ' / 카드6 상변 ' + bad.cards[5].y + ' → 카드6 상변 '
        + (bad.list.b - bad.cards[5].y) + 'px 노출');
    ok('R-2 옛 대칭(143/143)을 주입하면 축 단언이 깨진다',
      Math.abs((bad.bar.x - (bad.frameW - bad.bar.r)) / 2 - R.axis) > 1,
      '축 ' + ((bad.bar.x - (bad.frameW - bad.bar.r)) / 2).toFixed(1));

    const st = await page.evaluate(() => {
      const s = document.querySelectorAll('style');
      s[s.length - 1].remove(); s[s.length - 2] && 0;
      return true;
    });
    await page.waitForTimeout(200);
    const back = await page.evaluate(READ);
    ok('R-3 주입을 걷어내면 다시 초록 (술어를 무르게 푼 것이 아니다)',
      Math.abs(back.list.b - back.cards[4].b) <= 1
      && back.cards.every(c => !(back.list.b > c.y + 0.5 && back.list.b < c.b - 0.5))
      && Math.abs((back.bar.x - (back.frameW - back.bar.r)) / 2 - R.axis) <= 1,
      '클립선 ' + back.list.b + ' · 축 '
        + ((back.bar.x - (back.frameW - back.bar.r)) / 2).toFixed(1) + ' (' + st + ')');

    console.log('\n[6] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0] : ''));
  } finally { await browser.close(); }

  console.log('\nVERIFY335 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
