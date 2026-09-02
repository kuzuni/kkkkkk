#!/usr/bin/env node
/* 786 검증 — 우편 «제목» 자리에 화폐 이모지가 오지 않는다
 *
 *   node tools/verify786.js
 *
 * 무엇을 지키는 자인가 — `verify125` A1 과 **겹치지 않는 축**을 든다.
 *   A1 은 «소스 전체에 화폐 이모지 0건» 을 **허용 목록과 아트 자리 규칙으로 면제해 가며** 센다.
 *   그래서 누군가 우편 제목에 💎 를 넣고 **그 줄을 허용 목록에 같이 넣으면** A1 은 초록이 되고
 *   규약은 깨진 채 남는다(289 가 «목록이 소스를 못 따라간다» 로 세 번 겪은 병의 거울상이다).
 *   ⇒ 이 자의 [A] 는 **면제가 하나도 없는** 축이다 — 우편 제목 리터럴에는 예외 없이 화폐 이모지가 0건.
 *
 *   [A] 소스 — 우편 제목 리터럴(`t:'…'` 중 한글이 든 것) 전수:
 *       A1 머리글자가 화폐 이모지인 통 **0건**(면제 없음) · A2 제목 «안» 어디에도 화폐 이모지 0건 ·
 *       A3 집 관행이 살아 있다(제목 머리 글리프를 쓰는 통이 여럿이고, 환영 통은 🎁 · 월별 다이아 통은 📅).
 *           — 수리를 «글리프를 통째로 지우기» 로 무르게 푸는 길을 A3 이 막는다.
 *   [B] 런타임 — 786 이 바꾼 것은 **소스 한 글자뿐이고 화면 문자열은 Δ0** 임을 찍은 글자로 못박는다.
 *       B1 `claimAttend()` 가 만든 통의 `.ml-t` = «환영 n일차 보너스» ·
 *       B2 **구 세이브 이관 불요** — 옛 제목(💎 머리)을 그대로 그려도 B1 과 **같은 글자**다
 *          (두 렌더 자리가 `^[^가-힣\w]+` 로 머리 기호를 뗀다 · `probe786` [3][5]).
 *       B3 수령 토스트 두 갈래(«우편 수령»/«우편 확인») 어디에도 화폐 이모지 0건.
 *   [§R] 되돌림 시험 — 자가 «항상 초록» 이 아님을 못박는다. 소스를 고치지 않고 **메모리 위 변조본**을
 *       [A] 와 **같은 스캐너**에 먹인다(verify125 §R1~§R5 와 같은 방식).
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* `verify125` 의 `CUR_EMOJI` 와 **같은 목록**이다 — 사본이 갈리면 한쪽만 초록인 자가 된다(334). */
const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
const DIA = '\u{1F48E}', GIFT = '\u{1F381}', CAL = '\u{1F4C5}';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (d ? ' — ' + d : '')); };

/* ── 스캐너 본체 — [A] 와 §R 이 **이것 하나**를 부른다 ─────────────────────
   우편 제목 리터럴 = 주석을 걷어낸 소스의 `t:'…'` 중 한글이 든 것.
   (`sendMail`·`grantNow`·고정 우편 표 `MAILS` 가 전부 이 꼴이다 — 호출부 이름을 목록으로 들면
    호출부가 늘 때마다 뒤처진다. 289 가 «상수 목록 금지» 로 세 번 겪은 그 자리다.) */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
function mailTitles(src) {
  const bare = stripComments(src);
  const out = [];
  const re = /t:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(bare))) {
    const t = m[1];
    if (!t || !/[가-힣]/.test(t)) continue;
    out.push({ line: bare.slice(0, m.index).split('\n').length, t, head: Array.from(t)[0] });
  }
  return out;
}
const curHead = (list) => list.filter((x) => CUR_EMOJI.indexOf(x.head) >= 0);
const curAny = (list) => list.filter((x) => CUR_EMOJI.some((e) => x.t.indexOf(e) >= 0));
const glyphHead = (list) => list.filter((x) => !/[가-힣\w]/.test(x.head));

(async () => {
  const T = mailTitles(SRC);

  ok(T.length >= 8, '[전제] 우편 제목 리터럴을 실제로 찾았다(스캐너가 헛돌지 않는다)', T.length + '통');
  ok(curHead(T).length === 0,
     'A1 우편 제목 머리글자에 화폐 이모지 0건(면제 없음)',
     curHead(T).map((x) => x.line + ': «' + x.t + '»').join(' | ') || T.length + '통 전부 비재화');
  ok(curAny(T).length === 0,
     'A2 우편 제목 «안» 어디에도 화폐 이모지 0건(머리만이 아니다)',
     curAny(T).map((x) => x.line + ': «' + x.t + '»').join(' | ') || '0건');
  const gh = glyphHead(T);
  const welcome = T.filter((x) => /환영/.test(x.t));
  const monthly = T.filter((x) => /월별 다이아/.test(x.t));
  ok(gh.length >= 5 && welcome.length >= 2 && welcome.every((x) => x.head === GIFT)
       && monthly.length === 1 && monthly[0].head === CAL,
     'A3 집 관행이 살아 있다(글리프를 통째로 지워서 푼 것이 아니다) — 머리 글리프 ' + gh.length + '통 · 환영 통 전부 🎁 · 월별 다이아 📅',
     welcome.map((x) => '«' + x.t + '»').join(' · ') + ' | ' + monthly.map((x) => '«' + x.t + '»').join(' · '));

  /* ── [§R] 되돌림 시험 — 소스는 안 고치고 메모리 위 변조본을 같은 스캐너에 먹인다 ── */
  const seedBack = SRC.replace("t:'\u{1F381} 환영 '", "t:'\u{1F48E} 환영 '");
  ok(seedBack !== SRC, '§R0 되돌림 씨앗이 실제로 심겼다(시험이 빈 채로 초록이 아니다)', '💎 로 되돌린 사본 1자리');
  const R1 = curHead(mailTitles(seedBack));
  ok(R1.length === 1 && /환영/.test(R1[0].t),
     '§R1 786 을 되돌리면(🎁 → 💎) A1 이 빨개진다', R1.map((x) => '«' + x.t + '»').join(' | ') || '0건 = 시험 실패');
  ok(curHead(mailTitles(SRC)).length === 0, '§R2 원복하면 초록(시험이 «항상 빨강» 이 아니다)', '0건');
  const seedMid = SRC.replace("t:'\u{1F381} 환영 '", "t:'\u{1F381} 환영 \u{1F48E} '");
  const R3h = curHead(mailTitles(seedMid)), R3a = curAny(mailTitles(seedMid));
  ok(R3h.length === 0 && R3a.length === 1,
     '§R3 머리가 «아닌» 자리에 심으면 A1 은 못 보고 A2 가 잡는다(두 항이 서로를 대신하지 않는다)',
     'A1 ' + R3h.length + '건 · A2 ' + R3a.length + '건');

  /* ── [B] 런타임 — 화면 문자열 Δ0 · 구 세이브 이관 불요 ── */
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(900);

  const B = await page.evaluate(async (K) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const shut = () => ['closeShopPage', 'closeDungeon', 'closeDunDetail', 'closeRelw', 'closeMail', 'closeQuest',
      'closeAttend', 'closePass', 'closeBag', 'closeCurInfo', 'closeColl21', 'closeRank', 'closeBless',
      'closeProfile', 'closeTrain', 'closeMenu', 'closeModal'].forEach((f) => { try { window[f] && window[f](); } catch (e) {} });
    const rowTitle = (id) => {
      const bt = document.querySelector('.ml-b[data-ml="' + id + '"]');
      const row = bt ? bt.closest('.ml-r') : null;
      const t = row ? row.querySelector('.ml-t') : null;
      return t ? (t.textContent || '').trim() : null;
    };
    const out = {};
    S.att.n = 1; S.att.date = '';
    claimAttend(null);
    const made = (S.mailx || []).filter((m) => m.src === 'welcome');
    out.made = made.length;
    out.srcTitle = made.length ? made[made.length - 1].t : null;
    const id = made.length ? made[made.length - 1].id : null;
    shut(); openMail(); await sleep(160);
    out.drawn = id ? rowTitle(id) : null;

    /* B2 — 옛 세이브가 들고 있는 제목(💎 머리)을 **그대로** 그린다 */
    const m0 = (S.mailx || []).find((m) => m.id === id);
    if (m0) m0.t = K.DIA + ' 환영 ' + 2 + '일차 보너스';
    shut(); openMail(); await sleep(160);
    out.drawnOld = id ? rowTitle(id) : null;
    if (m0) m0.t = out.srcTitle;

    /* B3 — 토스트 두 갈래 */
    shut(); openMail(); await sleep(120);
    if (id) { claimMail(id); await sleep(140); }
    const toastA = (document.body.innerText || '').split('\n').filter((l) => /우편 수령|우편 확인/.test(l)).slice(0, 3);
    S.mailx.push({ id: 'v786', t: K.DIA + ' 안내 — 대조', b: '', g: 0, c: 0, r: 0, m: 0,
                   ic: '\u{1F4E9}', iq: '보유', ig: 0, src: 'shop', ts: Date.now() });
    claimMail('v786'); await sleep(140);
    const toastB = (document.body.innerText || '').split('\n').filter((l) => /우편 확인/.test(l)).slice(0, 3);
    S.mailx = S.mailx.filter((m) => m.id !== 'v786');
    out.toast = toastA.concat(toastB);
    shut();
    return out;
  }, { DIA });

  ok(B.made === 1 && B.srcTitle === '\u{1F381} 환영 2일차 보너스',
     'B0 `claimAttend()` 가 환영 우편을 만들고 그 제목이 786 의 값이다', '«' + B.srcTitle + '»');
  ok(B.drawn === '환영 2일차 보너스',
     'B1 우편 행 `.ml-t` 에 그려진 글자', '«' + B.drawn + '»');
  ok(B.drawnOld === B.drawn,
     'B2 **구 세이브 이관 불요** — 옛 제목(💎 머리)을 그대로 그려도 같은 글자다',
     '옛 «' + B.drawnOld + '» = 새 «' + B.drawn + '»');
  ok(B.toast.length >= 2 && !CUR_EMOJI.some((e) => B.toast.join(' ').indexOf(e) >= 0),
     'B3 수령 토스트 두 갈래에 화폐 이모지 0건', JSON.stringify(B.toast));
  ok(errs.length === 0, 'I1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY786 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
