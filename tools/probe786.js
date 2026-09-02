/* 작업 786 — 재현(338 규칙: 처방 전에 «찍힌 글자» 부터 본다).
 *
 * 잡은 것: `tools/verify125.js` **39/41** — A1 1건(+ 그 결과인 §R5).
 *   · A1 : 739/199 22회차가 넣은 환영 우편 제목 `t:'💎 환영 ' + S.att.n + '일차 보너스'`(index.html 27317)가
 *          «소스에 남은 화폐 이모지» 로 잡힌다.
 *
 * 등재문이 남긴 갈래 둘:
 *   ⓐ 실재 규약 위반 — «우편 제목도 화면 문자열이다» → `curIc('dia')` 꼴로 옮긴다.
 *   ⓑ 게이트 스코프 — «우편 제목은 비재화» 라 A1 의 허용 목록에 넣는다.
 *
 * ⚠ **이 자는 그 둘을 «고르기 전에» 물어야 하는 것 셋을 묻는다.**
 *   ① 제목 머리글자가 **정말 화면에 오는가**(ⓐ 의 전제) — 두 렌더 자리가 `^[^가-힣\w]+` 로 머리 기호를 뗀다.
 *   ② ⓐ 의 처방(`t: curIc(…)`)이 **같은 파일의 다른 항과 부딪히지 않는가** — `verify125` **J1** 이
 *      «모달·우편 제목 자리에는 아이콘을 넣지 않는다» 를 이미 못박고 있다(`t:\s*curIc\(` 이면 빨강).
 *   ③ 집 관행이 무엇인가 — 우편 제목 머리 글리프를 쓰는 형제 통들이 **어떤 글리프**를 쓰는가.
 *      특히 **같은 «환영 선물» 통**(고정 우편 `m1`)과 **같은 다이아 지급 통**(`📅 월별 다이아`)이 답이다.
 *
 * 재는 것 — 출석을 실제로 수령해 환영 우편을 **만든 뒤**:
 *   [1] 만들기 전 우편함에 💎 0건 — 대조군
 *   [2] `claimAttend()` 가 실제로 그 통을 만든다(재현 가능) · 제목 리터럴 확인
 *   [3] 제목 자리 `.ml-t` 에 💎 가 오는가 — «안 온다» 가 예상(strip)
 *   [4] 수령 토스트(«우편 확인 — …»)에 💎 가 오는가 — 같은 strip
 *   [5] 음성항 — 같은 글리프를 **머리가 아닌 자리**에 두면 제목에 그대로 샌다(=[3] 은 strip 덕분)
 *   [6] 소스 — 우편 제목 리터럴 전수 표(글리프 · 화폐 글리프인가 · 무엇을 지급하는가)
 *   [7] ⓐ 반려 근거 — `verify125` J1 의 판정식에 ⓐ 의 처방을 먹이면 **빨갛다**
 *
 * 실행: node tools/probe786.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* verify125 의 `CUR_EMOJI` 와 **같은 목록**을 든다 — 자기만의 사본을 들면 «자는 빨간데
   재현기는 초록» 이 되어 다음 세션이 또 갈래를 못 가른다(334 교훈). */
const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
const DIA = '\u{1F48E}', GIFT = '\u{1F381}';

/* ── 수리 전 소스 — **이 재현기는 수리 뒤에도 그대로 돌아야 한다** ──────────────
   재현기가 «수리 전 트리에서만 초록» 이면 다음 세션은 그것을 돌릴 수 없고, 결국
   «무엇이 결함이었는지» 를 글로만 읽게 된다(756: 고정 SHA 로 사본을 꺼내는 자가
   얕은 클론에서 게이트 부패와 똑같은 얼굴로 빨개진 자리 — git 을 안 쓰는 것이 더 튼튼하다).
   ⇒ 수리가 **한 글자**(제목 머리 글리프)라 되돌림도 한 글자다. 메모리 위에서 되돌린 사본을
      «수리 전 소스» 로 삼고, 소스 층 항([2]·[6])은 그것을 잰다. 수리 **전**에 돌리면
      되돌릴 것이 없으므로 사본 = 현재 소스가 되어 같은 값을 낸다(그때도 그대로 재현기다). */
const PRE = SRC.indexOf("t:'" + DIA + " 환영 '") >= 0
  ? SRC                                                   /* 수리 전에 돌린 경우 */
  : SRC.replace("t:'" + GIFT + " 환영 '", "t:'" + DIA + " 환영 '");
const PRE_FIXED = PRE !== SRC;                            /* 되돌림이 실제로 일어났는가 */

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 우편 제목 리터럴 전수 — `sendMail({t:'…'` · `grantNow({t:'…'` · 고정 우편 표(`MAILS`)의 `t:'…'`.
   주석은 걷어낸 뒤 센다(A1 과 같은 규칙). */
function titleLiterals(src) {
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const out = [];
  const re = /t:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(bare))) {
    const t = m[1];
    if (!t || !/[가-힣]/.test(t)) continue;           /* 제목이 아닌 t: 는 뺀다(빈 값·기호 한 자) */
    const line = bare.slice(0, m.index).split('\n').length;
    const head = Array.from(t)[0];
    out.push({ line, t, head, cur: CUR_EMOJI.indexOf(head) >= 0 });
  }
  return out;
}

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(900);
  return { ctx, p };
}

(async () => {
  console.log('\n=== probe786 — 환영 우편 제목의 💎 가 화면에 오는가 ===');

  /* ── [6] 소스 층 — 우편 제목 리터럴 전수 (**수리 전 소스**를 잰다) ───────── */
  const lits = titleLiterals(PRE);
  const withGlyph = lits.filter((x) => !/[가-힣\w]/.test(x.head));
  const curHead = withGlyph.filter((x) => x.cur);

  /* ── [7] ⓐ 반려 근거 — J1 의 판정식 그대로 ────────────────────────── */
  const j1re = /\bt:\s*curIc\(/;
  const j1Now = j1re.test(SRC);
  const j1IfA = j1re.test("  sendMail({ t: curIc('dia') + ' 환영 보너스', c:w });");

  const b = await launch(chromium);
  const s = await boot(b);
  const P = await s.p.evaluate(async (DIA_) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const shut = () => ['closeShopPage', 'closeDungeon', 'closeDunDetail', 'closeRelw', 'closeMail', 'closeQuest',
      'closeAttend', 'closePass', 'closeBag', 'closeCurInfo', 'closeColl21', 'closeRank', 'closeBless',
      'closeProfile', 'closeTrain', 'closeMenu', 'closeModal'].forEach((f) => { try { window[f] && window[f](); } catch (e) {} });
    const txtOf = (el) => (el ? (el.textContent || '').trim() : null);
    const out = {};

    /* [1] 대조군 — 환영 우편을 만들기 «전» */
    shut(); openMail(); await sleep(140);
    out.beforeTitles = Array.from(document.querySelectorAll('.ml-t')).map(txtOf);
    out.beforeDia = out.beforeTitles.filter((t) => t && t.indexOf(DIA_) >= 0).length;
    shut();

    /* [2] 출석을 실제로 수령해 환영 우편을 만든다 — n:1 · date 비움 ⇒ n→2 ⇒ WELCOME_DIA[0] */
    S.att.n = 1; S.att.date = '';
    const n0 = (S.mailx || []).length;
    claimAttend(null);
    const made = (S.mailx || []).filter((m) => m.src === 'welcome');
    out.made = made.length;
    out.madeT = made.length ? made[made.length - 1].t : null;
    out.madeC = made.length ? made[made.length - 1].c : 0;
    out.grew = (S.mailx || []).length - n0;

    /* [3] 제목 자리 `.ml-t` */
    shut(); openMail(); await sleep(160);
    const mid = made.length ? made[made.length - 1].id : null;
    const rowOf = (id) => { const bt = document.querySelector('.ml-b[data-ml="' + id + '"]'); return bt ? bt.closest('.ml-r') : null; };
    const row = rowOf(mid);
    out.rowFound = !!row;
    if (row) {
      const t = row.querySelector('.ml-t');
      out.titleTxt = txtOf(t);
      const r = t ? t.getBoundingClientRect() : null;
      out.titleBox = r ? [+r.width.toFixed(2), +r.height.toFixed(2)] : null;
    }
    /* 화면 전체(우편함이 열린 채)에서 💎 를 담은 «보이는» 잎 노드 */
    const leaf = [];
    const walk = (n) => {
      if (n.nodeType === 3) {
        if (n.nodeValue.indexOf(DIA_) >= 0) {
          const el = n.parentElement, rr = el ? el.getBoundingClientRect() : null;
          if (rr && rr.width > 0 && rr.height > 0) {
            leaf.push({ desc: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
                        txt: n.nodeValue.trim().slice(0, 30), w: +rr.width.toFixed(2), h: +rr.height.toFixed(2) });
          }
        }
        return;
      }
      if (n.nodeType !== 1) return;
      const st = getComputedStyle(n);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      n.childNodes.forEach(walk);
    };
    walk(document.body);
    out.diaLeaf = leaf;

    /* [4] 수령 토스트 — 갈래가 둘이다(`claimMail` 27201):
       ⓐ 재화가 든 통 → «우편 수령 — (아이콘) 수량» (제목을 **안 쓴다**)
       ⓑ 재화 0 인 안내 통(589) → «우편 확인 — » + **제목**(같은 `^[^가-힣\w]+` strip)
       환영 우편은 ⓐ 라 제목이 토스트에 아예 안 온다. ⓑ 를 못 재고 넘어가면 «제목이 토스트로
       샐 수 있는 유일한 자리» 를 한 번도 안 본 채 닫는 꼴이라, 안내 통 대조본을 하나 만들어 같이 잰다. */
    if (mid) { claimMail(mid); await sleep(140); }
    out.toastA = (document.body.innerText || '').split('\n').filter((l) => /우편 수령|우편 확인/.test(l)).slice(0, 3);
    S.mailx.push({ id: 'probe786b', t: DIA_ + ' 안내 — 대조', b: '', g: 0, c: 0, r: 0, m: 0,
                   ic: '\u{1F4E9}', iq: '보유', ig: 0, src: 'shop', ts: Date.now() });
    claimMail('probe786b'); await sleep(140);
    out.toastB = (document.body.innerText || '').split('\n').filter((l) => /우편 확인/.test(l)).slice(0, 3);
    S.mailx = S.mailx.filter((m) => m.id !== 'probe786b');
    out.toastAll = out.toastA.concat(out.toastB);

    /* [5] 음성항 — 같은 글리프를 문장 «가운데» 로 옮기면 제목에 샌다 */
    const m2 = { id: 'probe786', t: '환영 ' + DIA_ + ' 보너스 — 대조', b: '', g: 0, c: 1, r: 0, m: 0, src: 'welcome', ts: Date.now() };
    S.mailx.push(m2);
    shut(); openMail(); await sleep(160);
    const row2 = rowOf('probe786');
    out.midTitleTxt = row2 ? txtOf(row2.querySelector('.ml-t')) : null;
    S.mailx = S.mailx.filter((m) => m.id !== 'probe786');
    shut();
    return out;
  }, DIA);

  await s.ctx.close();
  await b.close();

  console.log('\n--- 실측 ---');
  console.log('  [1] 만들기 전 우편 제목 💎     : ' + P.beforeDia + '건 · ' + JSON.stringify(P.beforeTitles));
  console.log('  [2] claimAttend 가 만든 통     : ' + P.made + '통(+' + P.grew + ') · t=«' + P.madeT + '» · 다이아 ' + P.madeC);
  console.log('  [3] 제목 자리 .ml-t            : «' + P.titleTxt + '» ' + JSON.stringify(P.titleBox));
  console.log('  [3] 화면의 💎 잎 노드          : ' + (P.diaLeaf.length ? P.diaLeaf.map((h) => h.desc + '[' + h.w + '×' + h.h + '] «' + h.txt + '»').join(' · ') : '0건'));
  console.log('  [4] 수령 토스트 ⓐ 재화 통      : ' + JSON.stringify(P.toastA));
  console.log('  [4] 수령 토스트 ⓑ 안내 통(대조) : ' + JSON.stringify(P.toastB));
  console.log('  [5] 글리프를 가운데로 옮기면    : «' + P.midTitleTxt + '»');
  console.log('  [6] 우편 제목 리터럴 전수      :');
  withGlyph.forEach((x) => console.log('        ' + String(x.line).padStart(5) + '  ' + (x.cur ? '⛔화폐' : '  비재화') + '  «' + x.t + '»'));
  console.log('  [7] J1 판정식(`t: curIc(`)     : 현재 소스 ' + j1Now + ' · ⓐ 처방을 먹이면 ' + j1IfA);

  console.log('\n--- 판정 ---');
  ok(P.made === 1 && P.madeC > 0,
     '[2] `claimAttend()` 가 환영 우편을 **실제로 만든다**(재현 가능) — «' + P.madeT + '» 다이아 ' + P.madeC);
  const preWelcome = lits.filter((x) => /환영 $/.test(x.t) || /환영 /.test(x.t));
  ok(preWelcome.some((x) => x.head === DIA),
     '[2] **수리 전 소스**에서 그 통의 제목 머리글자는 💎 였다 = A1 이 센 그 한 건 · 되돌림 적용 ' + PRE_FIXED
       + ' — ' + preWelcome.map((x) => x.line + ': «' + x.t + '»').join(' | '));
  ok(P.madeT !== null && !/[가-힣\w]/.test(Array.from(P.madeT)[0]),
     '[2] 지금 트리에서도 그 통의 제목은 **머리 글리프 한 자 + 한글** 관행 그대로다(관행을 지워서 푼 것이 아니다) — «' + P.madeT + '»');
  ok(P.titleTxt !== null && P.titleTxt.indexOf(DIA) < 0,
     '[3] 제목 자리 `.ml-t` 에는 💎 가 **안 온다** — 두 렌더 자리가 `^[^가-힣\\w]+` 로 머리 기호를 뗀다 · 실측 «' + P.titleTxt + '»');
  ok(P.diaLeaf.length === 0,
     '[3] 우편함이 열린 화면 전체에도 💎 잎 노드 **0건** — ⓐ 의 전제(«우편 제목도 화면 문자열이다»)는 **머리글자에는 거짓**이다');
  ok((P.toastAll || []).join(' ').indexOf(DIA) < 0 && (P.toastB || []).length > 0,
     '[4] 토스트 두 갈래 어디에도 💎 가 안 온다 — ⓐ 재화 통은 제목을 아예 안 쓰고, 제목을 쓰는 ⓑ 안내 통은 같은 strip 을 지난다 · ' + JSON.stringify(P.toastAll));
  ok(P.midTitleTxt !== null && P.midTitleTxt.indexOf(DIA) >= 0,
     '[5] 음성항 — 같은 글리프를 **머리가 아닌 자리**에 두면 제목에 그대로 샌다(=[3] 은 strip 덕분이지 우연이 아니다) · «' + P.midTitleTxt + '»');
  ok(curHead.length === 1 && curHead[0].t.indexOf('환영') >= 0,
     '[6] 우편 제목 머리 글리프 ' + withGlyph.length + '통 중 **화폐 글리프는 이 한 통뿐**이다 — 나머지는 📅·🛒·📦·🎁(집 관행은 «비재화 글리프 한 자»)');
  ok(withGlyph.some((x) => x.head === '\u{1F381}' && /환영/.test(x.t)) &&
     withGlyph.some((x) => x.head === '\u{1F4C5}' && /다이아/.test(x.t)),
     '[6] 답이 같은 파일 안에 둘 있다 — 같은 «환영 선물» 통은 **🎁**, 같은 «다이아 지급» 통은 **📅** 를 쓴다');
  ok(j1Now === false && j1IfA === true,
     '[7] 등재문 갈래 ⓐ(`t: curIc(…)`)는 **같은 자의 J1 이 반려**한다 — 지금 소스 ' + j1Now + ' · ⓐ 를 먹이면 ' + j1IfA + ' (= J1 빨강)');

  console.log('\nPROBE786 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
