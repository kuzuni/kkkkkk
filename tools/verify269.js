#!/usr/bin/env node
/* 269 검증 — 50 코스튬 «코스튬 설명» 을 슬롯 상세 팝업에서 빼고 시트 헤더 [?] 도움말로 옮김
 * (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify269.js   →  마지막 줄이 `VERIFY269 n/n PASS` 여야 한다.
 *
 * 지시 원문: «코스튬 설명 코스튬 팝업에 슬롯 클릭해서 나오는 팝업에 넣지 말고 / 코스 팝업
 * 왼쪽 위에 도움말 버튼 만들어서 그거 클릭 시 그거 설명만 있는 팝업이 뜨게».
 * 주인 확정(«알아서 해. ? 가 나을 듯») → 버튼은 좌상단 원형 [?].
 *
 * 검사 항목:
 *   [A] 버튼 존재·자리 — `#bCos` 헤더 밴드(1066x114) **안쪽 좌상단**의 원형 76x76.
 *       제목 잉크와 안 겹치고, 스크롤 뷰포트(`.shsc`) 바깥이라 격자를 굴려도 안 사라진다.
 *   [B] 스코프 잠금 — 07 스킬 시트(`#bSk`)·26 펫 시트(`#bPet`) 헤더에는 이 버튼이 **없다**.
 *       («좌상단은 세 시트가 공유하는 헤더» — 등재문 경고. 여기가 새면 남의 화면이 바뀐다.)
 *   [C] 실동작 — 진짜 포인터로 [?] 를 누르면 팝업이 뜨고, 제목이 «코스튬» 이고,
 *       본문이 **일반 설명**(보유 효과·계단·등급 없음·강화석/만렙)을 말하고,
 *       [확인] 로도 딤 탭으로도 닫힌다.
 *   [D] 상세 팝업에서 제거 — 슬롯을 눌러 나오는 `showCosDetail` 본문에 «코스튬 설명» 라벨도,
 *       옮겨 간 일반 설명 문장도 **한 조각도 안 남는다**(보유·미보유 두 갈래 모두).
 *   [E] 남긴 것 — 그 자리에는 **그 칸 하나의 수치**만 남는다: 보유 칸 «보유 효과»(계단 + 강화
 *       **합산** 한 줄 — 레벨을 올리면 숫자가 따라간다) · 미보유 칸 «획득 방법»(cosReqText).
 *       ⚑ 346(주인 지시 2026-08-29)으로 «강화 효과 Lv.n …» · «Lv.500 까지 강화하면 …» 두 줄이
 *       폐기되고 한 줄로 합쳐졌다. E1·E2·G2 는 묻는 것을 그대로 두고 **자리만** 옮긴 것이다.
 *   [F] 껍데기 1px 불변 — 08 규격 부품 8개(`.sk-ic … .sk-ow`)의 bbox 가 **스킬 세부와 픽셀 동일**.
 *       (`.sk-sl`·`.sk-db` 는 글자만 바뀌고 자리·크기는 그대로여야 한다 — 268 §2 와 같은 잣대.)
 *   [G] 홀드 회귀(262) — [강화] 를 꾹 누르는 동안 «숫자만» 갱신된 설명이 손 뗀 뒤 통짜 재렌더와
 *       한 글자도 안 다르다. 269 로 문구가 바뀌었으니 여기가 갈라지면 mdLive 가 죽은 것이다.
 *   [H] 콘솔/페이지 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 08 껍데기 부품 8개의 본문 기준 bbox — 268 §2 와 같은 읽기 */
const PARTS = ['.sk-ic', '.sk-gr', '.sk-lv', '.sk-pb', '.sk-ct', '.sk-sl', '.sk-db', '.sk-ow'];
const READ_PARTS = (list) => {
  const box = document.getElementById('mbox'), b = box.getBoundingClientRect();
  return list.map(s => {
    const el = box.querySelector(s);
    if (!el) return { s, has: false };
    const r = el.getBoundingClientRect();
    return { s, has: true,
             x: Math.round((r.left - b.left) * 100) / 100, y: Math.round((r.top - b.top) * 100) / 100,
             w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 };
  });
};

/* 옮겨 간 «일반 설명» 의 지문 — 상세 팝업에 한 조각이라도 남으면 269 가 반쪽이다 */
const GENERAL = ['영구 적용', '한 계단', '등급이 없', '외형이 바뀝니다', '키울 수 있습니다'];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderCos === 'function');
  await page.waitForTimeout(700);

  /* ── [0] 설치 확인 — 부품이 없으면 FAIL 로 끝낸다(타임아웃 즉사 금지, LESSONS 254) ── */
  {
    const have = await page.evaluate(() => ({
      help: typeof cosHelp === 'function',
      det: typeof showCosDetail === 'function',
    }));
    ok(have.help, '0A `cosHelp()` 가 있다');
    ok(have.det, '0B `showCosDetail()` 가 있다');
    if (!have.help || !have.det) { console.log('\nVERIFY269 ' + pass + '/' + (pass + fail) + ' FAIL'); await browser.close(); process.exit(1); }
  }

  /* 50 코스튬 시트를 연다 — 87 게이트와 같은 경로(영웅 탭 → 서브탭 cos) */
  await page.evaluate(() => { S.dia = 5e7; S.stone = 5e7; S.rank = 3; save(); });
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(500);

  /* ── [A] 버튼 존재·자리 ─────────────────────────────────────────────── */
  console.log('\n[A] 헤더 좌상단 [?] 버튼');
  const A = await page.evaluate(() => {
    const sheet = document.getElementById('bCos');
    const btn = sheet.querySelector('.cos-help');
    if (!btn) return { has: false };
    const s = sheet.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const head = sheet.querySelector('.sk-head').getBoundingClientRect();
    const ttl = sheet.querySelector('.sk-head > i').getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return { has: true,
      x: Math.round((r.left - s.left) * 100) / 100, y: Math.round((r.top - s.top) * 100) / 100,
      w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
      pos: cs.position, radius: parseFloat(cs.borderTopLeftRadius),
      inHead: r.left >= head.left && r.right <= head.right && r.top >= head.top && r.bottom <= head.bottom,
      gapToTitle: Math.round((ttl.left - r.right) * 100) / 100,
      inScroller: !!btn.closest('.shsc'),
      txt: btn.textContent.trim(),
    };
  });
  ok(A.has, 'A1 `#bCos .cos-help` 가 렌더된다');
  /* LESSONS 254 — 버튼이 없으면 아래 «클릭» 절이 타임아웃 예외로 **즉사**한다.
     되돌린 트리에서도 게이트는 빨간 줄로 끝나야 하므로, 없으면 남은 절을 FAIL 로 세고 끝낸다. */
  if (!A.has) ok(false, 'C1~C13 [?] 클릭 → 설명 팝업 — 버튼이 없어 검사 불가');
  ok(A.pos === 'absolute', 'A2 절대배치(시트 `>*` 규칙을 그대로 받는다)', A.pos);
  ok(near(A.w, 76, 0.6) && near(A.h, 76, 0.6), 'A3 크기 76x76', A.w + 'x' + A.h);
  ok(near(A.radius, 38, 0.6), 'A4 원형(radius 38)', String(A.radius));
  ok(near(A.x, 24, 0.6) && near(A.y, 19, 0.6), 'A5 좌상단 (24,19) — 헤더 세로 가운데', A.x + ',' + A.y);
  ok(A.inHead, 'A6 헤더 밴드(1066x114) 안에 완전히 들어간다');
  ok(A.gapToTitle > 200, 'A7 제목 잉크와 안 겹친다(여백 ' + A.gapToTitle + 'px)');
  ok(!A.inScroller, 'A8 스크롤 뷰포트 `.shsc` 바깥이다(격자를 굴려도 안 사라진다)');
  ok(A.txt === '?', 'A9 라벨은 «?» 하나', A.txt);

  /* 격자를 끝까지 굴려도 버튼이 그 자리에 있다 */
  if (!A.has) ok(false, 'A10 격자 스크롤 후 제자리 — 버튼이 없어 검사 불가');
  else {
    const still = await page.evaluate(() => {
      const gp = document.querySelector('#bCos .sk-gp');
      gp.scrollTop = gp.scrollHeight;
      const sheet = document.getElementById('bCos'), btn = sheet.querySelector('.cos-help');
      const s = sheet.getBoundingClientRect(), r = btn.getBoundingClientRect();
      return { y: Math.round((r.top - s.top) * 100) / 100, vis: r.width > 0 && r.height > 0 };
    });
    ok(still.vis && near(still.y, 19, 0.6), 'A10 격자를 끝까지 굴려도 제자리', 'y=' + still.y);
    await page.evaluate(() => { document.querySelector('#bCos .sk-gp').scrollTop = 0; });
  }

  /* ── [B] 스코프 잠금 — 07·26 시트에는 없다 ──────────────────────────── */
  console.log('\n[B] 스코프 — 07 스킬 · 26 펫 시트 헤더는 안 바뀐다');
  {
    const other = await page.evaluate(() => {
      const r = {};
      for (const [tab, id] of [['sk', 'bSk'], ['pet', 'bPet']]) {
        const t = document.querySelector('#eqTabs [data-eqtab="' + tab + '"]');
        if (t) t.click();
        const sheet = document.getElementById(id);
        r[id] = { head: !!(sheet && sheet.querySelector('.sk-head')),
                  help: !!(sheet && sheet.querySelector('.cos-help')) };
      }
      document.querySelector('#eqTabs [data-eqtab="cos"]').click();
      return r;
    });
    await page.waitForTimeout(400);
    ok(other.bSk.head && !other.bSk.help, 'B1 07 스킬 시트 헤더에 [?] 없음');
    ok(other.bPet.head && !other.bPet.help, 'B2 26 펫 시트 헤더에 [?] 없음');
    const css = await page.evaluate(() => {
      /* CSS 선택자 자체가 `#bCos` 로 갇혀 있는지 — 렌더 결과뿐 아니라 규칙으로도 못 박는다 */
      let scoped = 0, loose = 0;
      for (const s of document.styleSheets) {
        let rules; try { rules = s.cssRules; } catch (_) { continue; }
        for (const r of rules) {
          if (!r.selectorText || !/\.cos-help/.test(r.selectorText)) continue;
          if (/#bCos\s/.test(r.selectorText)) scoped++; else loose++;
        }
      }
      return { scoped, loose };
    });
    ok(css.scoped >= 1 && css.loose === 0,
      'B3 `.cos-help` 규칙이 전부 `#bCos` 로 갇혀 있다', '갇힘 ' + css.scoped + ' · 전역 ' + css.loose);
  }

  /* ── [C] 실동작 — 진짜 포인터로 누르면 «설명만 있는 팝업» ────────────── */
  console.log('\n[C] [?] 클릭 → 설명 팝업');
  if (!A.has) { console.log('  (버튼이 없어 건너뜀 — 위에서 FAIL 로 셌다)'); }
  else {
  await page.click('#bCos .cos-help', { force: true });
  await page.waitForTimeout(350);
  const C = await page.evaluate(() => {
    const m = document.getElementById('modal'), box = document.getElementById('mbox');
    return { on: m.classList.contains('on'),
      title: document.getElementById('mtitle').textContent.trim(),
      wrap: !!box.querySelector('.cos269'),
      ps: [...box.querySelectorAll('.cos269 p')].map(p => p.textContent.trim()),
      fs: box.querySelector('.cos269 p') ? Math.round(parseFloat(getComputedStyle(box.querySelector('.cos269 p')).fontSize) * 10) / 10 : 0,
      okBtn: !!document.getElementById('okBtn'),
      /* «설명만» — 세부 팝업 껍데기(.skd)도, 행동 버튼도 없어야 한다 */
      skd: !!box.querySelector('.skd'), act: !!box.querySelector('.sk-act'),
      overflow: (() => { const b = box.getBoundingClientRect(), w = box.querySelector('.cos269');
        return w ? Math.round((w.getBoundingClientRect().bottom - b.bottom) * 10) / 10 : 0; })(),
    };
  });
  ok(C.on, 'C1 팝업이 떴다');
  ok(C.title === '코스튬', 'C2 제목 «코스튬»', C.title);
  ok(C.wrap, 'C3 전용 본문 래퍼 `.cos269`');
  ok(C.ps.length >= 4, 'C4 설명 문단 ' + C.ps.length + '개');
  ok(C.fs >= 33, 'C5 본문 글씨 ' + C.fs + 'px (A5 공용 24px 보다 크다 — 179·265 처방)');
  ok(!C.skd && !C.act, 'C6 «설명만» — 08 껍데기도 행동 버튼도 없다');
  ok(C.okBtn, 'C7 [확인] 이 있다(닫는 길)');
  {
    const all = C.ps.join(' ');
    const want = [['보유', /가지고만 있어도|보유 효과/], ['계단', /계단/], ['등급 없음', /등급이 없/],
                  ['강화석·만렙', /강화석/], ['승급전', /승급전/]];
    for (const [n, re] of want) ok(re.test(all), 'C8 본문이 «' + n + '» 을 말한다');
    ok(/10개/.test(all), 'C9 계단 간격이 상수(COS_STEP_EVERY=10)에서 나온다');
    ok(/Lv\. 500/.test(all), 'C10 만렙이 상수(COS_MAXLV=500)에서 나온다');
  }
  ok(C.overflow <= 0, 'C11 본문이 `.mbox` 를 안 넘친다', 'Δ' + C.overflow + 'px');
  /* [확인] 로 닫힌다 */
  await page.click('#okBtn', { force: true });
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('modal').classList.contains('on')),
    'C12 [확인] 으로 닫힌다');
  /* 딤 탭으로도 닫힌다 (A5 규격) */
  await page.click('#bCos .cos-help', { force: true });
  await page.waitForTimeout(400);
  await page.mouse.click(540, 120);
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('modal').classList.contains('on')),
    'C13 딤 탭으로도 닫힌다');
  }

  /* ── [D] 상세 팝업에서 제거 · [E] 남긴 것 ────────────────────────────── */
  console.log('\n[D][E] 슬롯 상세 — 일반 설명은 없고, 그 칸 수치만 남는다');
  const D = await page.evaluate((G) => {
    const out = {};
    const rd = () => {
      const box = document.getElementById('mbox');
      const t = s => { const el = box.querySelector(s); return el ? el.textContent.trim() : null; };
      return { sl: t('.sk-sl'), db: t('.sk-db'), ow: t('.sk-ow'), all: box.textContent };
    };
    /* 보유 칸 — 첫 칸을 보유·Lv 40 으로 만든다 */
    const own = AVATARS[0].id;
    S.avatars[own] = 1; S.cosLv = S.cosLv || {}; S.cosLv[own] = 40; S.stone = 5e7; save();
    closeModal(); showCosDetail(own);
    out.own = rd();
    /* 346 — 이 칸이 «지금 걸려 있는 값» 을 말하는지 보려면 기대값을 상수에서 따로 세워야 한다:
       보유 계단 + 강화(lv×COS_LV). 레벨을 내려 같은 자리가 **따라 움직이는지**도 같이 본다
       (문구만 맞고 값이 굳어 있으면 «그렸다» 로 통과해 버린다 — LESSONS 307-④). */
    const sum = (k, lv) => fmtEff(cosOwnStep(k, cosOwnIdx(own)) + lv * COS_LV[k]);   /* 725 이관 */
    out.want40 = ['atk', 'hp', 'gold'].map(k => sum(k, 40));
    S.cosLv[own] = 3; save(); closeModal(); showCosDetail(own);
    out.own3 = rd(); out.want3 = ['atk', 'hp', 'gold'].map(k => sum(k, 3));
    S.cosLv[own] = 40; save(); closeModal(); showCosDetail(own);
    /* 미보유 칸 — 계급을 0 으로 내려 확실히 못 받은 칸을 고른다 */
    const un = AVATARS.find(a => !cosOwn(a.id));
    closeModal(); showCosDetail(un.id);
    out.un = rd(); out.unReq = cosReqText(un);
    out.general = G;
    closeModal();
    return out;
  }, GENERAL);
  for (const g of GENERAL) {
    ok(!D.own.all.includes(g) && !D.un.all.includes(g),
      'D1 상세 팝업에 일반 설명 «' + g + '» 이 안 남았다');
  }
  ok(D.own.sl !== '코스튬 설명' && D.un.sl !== '코스튬 설명',
    'D2 «코스튬 설명» 라벨이 사라졌다', '보유 «' + D.own.sl + '» · 미보유 «' + D.un.sl + '»');
  /* 346 — 라벨·본문이 «강화 효과 두 줄» 에서 «보유 효과 합산 한 줄» 로 바뀌었다(주인 지시
     2026-08-29). 묻는 것은 그대로다 — «이 자리가 그 칸 하나의, 지금 걸려 있는 수치를
     말하는가». 자리만 옮겨 적는다(LESSONS 328). */
  ok(D.own.sl === '보유 효과', 'E1 보유 칸 라벨 «보유 효과»(346)', D.own.sl);
  ok(D.own.db && D.want40.every(v => D.own.db.includes(v)),
    'E2 보유 칸 본문 = 보유 계단 + 강화 합산(Lv. 40)', D.own.db + ' vs ' + D.want40.join('/'));
  ok(D.own3.db && D.want3.every(v => D.own3.db.includes(v)) && D.own3.db !== D.own.db,
    'E2b 레벨을 내리면 그 자리가 따라 내려간다(Lv. 3)', D.own3.db + ' vs ' + D.want3.join('/'));
  ok(!/강화 효과 Lv\./.test(D.own.all) && !/까지 강화하면/.test(D.own.all),
    'E2c 폐기된 두 줄(«강화 효과 Lv.» · «까지 강화하면»)이 한 조각도 안 남았다');
  ok(D.un.sl === '획득 방법', 'E3 미보유 칸 라벨 «획득 방법»', D.un.sl);
  ok(D.un.db.includes(D.unReq), 'E4 미보유 칸 본문 = 그 칸의 획득 조건', D.un.db + ' vs ' + D.unReq);
  /* 346 — 알약 행은 그대로 있되 «수치» 를 안 든다(같은 % 를 두 번 적지 않는다).
     행 자체가 사라지면 08 껍데기 §F 가 빨개진다. */
  ok(D.own.ow && D.un.ow, 'E5 «보유 순번» 알약 행은 그대로다');
  ok(!/%/.test(D.own.ow) && !/%/.test(D.un.ow),
    'E5b 알약 행은 수치를 안 든다(346 — 수치는 본문 한 자리뿐)',
    '보유 «' + D.own.ow + '» · 미보유 «' + D.un.ow + '»');

  /* ── [F] 08 껍데기 1px 불변 (268 §2 와 같은 잣대) ─────────────────────── */
  console.log('\n[F] 08 껍데기 — 코스튬 세부 부품 bbox == 스킬 세부');
  const F = await page.evaluate(({ PARTS, READ }) => {
    const read = new Function('list', 'return (' + READ + ')(list)');
    closeModal(); showSkillDetail(SKILLS[0].id);
    const sk = read(PARTS);
    closeModal(); showCosDetail(AVATARS[0].id);
    const cos = read(PARTS);
    closeModal();
    return { sk, cos };
  }, { PARTS, READ: READ_PARTS.toString() });
  for (let i = 0; i < PARTS.length; i++) {
    const a = F.sk[i], b = F.cos[i];
    ok(a.has && b.has && near(a.x, b.x, 0.6) && near(a.y, b.y, 0.6)
       && near(a.w, b.w, 0.6) && near(a.h, b.h, 0.6),
      'F' + (i + 1) + ' ' + PARTS[i] + ' 픽셀 동일',
      a.has && b.has ? [a.x, a.y, a.w, a.h].join(',') + ' vs ' + [b.x, b.y, b.w, b.h].join(',')
                     : '스킬 ' + a.has + ' · 코스튬 ' + b.has);
  }

  /* ── [G] 262 홀드 회귀 — mdLive 표기 == 통짜 재렌더 표기 ──────────────── */
  console.log('\n[G] 262 회귀 — [강화] 홀드 중 «숫자만» 갱신이 재렌더와 일치');
  await page.evaluate(() => {
    const id = AVATARS[0].id;
    S.avatars[id] = 1; S.cosLv[id] = 10; S.stone = 1e9; save();
    closeModal(); showCosDetail(id);
  });
  await page.waitForTimeout(400);
  {
    const face = () => page.evaluate(() => {
      const b = document.getElementById('mbox'), g = s => { const n = b.querySelector(s); return n ? n.innerHTML : null; };
      const bar = b.querySelector('.sk-pb i');
      return { gr: g('.sk-gr b'), pb: g('.sk-pb b'), w: bar ? bar.style.width : null,
               cell: g('.sk-ct .vl .nt b'), desc: g('.sk-db p'), own: g('.sk-ow .v b') };
    });
    const box = await page.evaluate(() => {
      const r = document.getElementById('mLv').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    /* ⚠ 여기서 그냥 «읽고 → 손 떼고 → 다시 읽기» 를 하면 두 읽기 **사이에 홀드가 한 번 더 tick**
       해서 Lv 가 1 오른 채 비교된다 — 뜨고 지는 FAIL 의 정체다(실측: 3회 중 2회).
       262 가 보려는 것은 «같은 레벨에서 mdLive 가 통짜 재렌더와 같은 글자를 쓰는가» 이므로,
       타이머만 얼려 놓고(clearTimeout — `end()` 를 안 부르니 통짜 재렌더도 안 난다)
       **같은 틱 안에서** 라이브 표기와 통짜 재렌더 표기를 나란히 읽는다. */
    const G = await page.evaluate(id => {
      const b = document.getElementById('mbox');
      const rd = () => { const g = s => { const n = b.querySelector(s); return n ? n.innerHTML : null; };
        const bar = b.querySelector('.sk-pb i');
        return { gr: g('.sk-gr b'), pb: g('.sk-pb b'), w: bar ? bar.style.width : null,
                 cell: g('.sk-ct .vl .nt b'), desc: g('.sk-db p'), own: g('.sk-ow .v b') }; };
      if (typeof upHold !== 'undefined' && upHold) clearTimeout(upHold.timer);
      const live = rd();
      showCosDetail(id);                      /* 같은 레벨로 통짜 재렌더 */
      return { live, full: rd(), lv: cosLvOf(id) };
    }, await page.evaluate(() => AVATARS[0].id));
    await page.mouse.up();
    await page.waitForTimeout(300);
    const live = G.live, full = G.full;
    ok(G.lv > 10, 'G0 홀드 800ms 로 레벨이 실제로 올랐다', 'Lv. 10 → ' + G.lv);
    const keys = ['gr', 'pb', 'w', 'cell', 'desc', 'own'];
    const diff = keys.filter(k => live[k] !== full[k]);
    ok(diff.length === 0, 'G1 홀드 중 표기 == 재렌더 표기',
      diff.length ? diff.map(k => k + ': «' + live[k] + '» vs «' + full[k] + '»').join(' / ') : keys.length + '자리 일치');
    /* innerHTML 이라 «Lv.» 는 `<em>` 안에 있다 — 태그를 걷어내고 본다 */
    const plain = String(full.desc).replace(/<[^>]*>/g, '');
    /* 346 — 그 자리는 이제 «보유 효과» 합산 한 줄이다. 홀드로 오른 레벨이 그 줄에 실제로
       반영됐는지까지 본다(문구만 보면 값이 굳어도 초록이다). */
    const wantG = await page.evaluate(lv => {
      const id = AVATARS[0].id;
      return ['atk', 'hp', 'gold'].map(k => fmtEff(cosOwnStep(k, cosOwnIdx(id)) + lv * COS_LV[k]));   /* 725 이관 */
    }, G.lv);
    /* 520 이관 — 부호를 뺐다(주인 지시). 머리말은 그대로 묻고 «부호 없음» 을 한 항 더 세운다(328·330). */
    ok(/^공격 /.test(plain) && /체력 /.test(plain) && /골드 /.test(plain),
      'G2 갱신 뒤에도 설명 자리는 «보유 효과» 합산 줄이다(346)', plain.slice(0, 60));
    ok(!/[+＋−﹣－]/.test(plain),
      'G2a 그 줄에 «+»·«−» 부호가 없다(520 — 주인 지시 · 홀드 갱신 경로에서도)', plain.slice(0, 60));
    ok(wantG.every(v => plain.includes(v)),
      'G2b 홀드로 오른 레벨(Lv. ' + G.lv + ')이 그 줄에 반영됐다', plain + ' vs ' + wantG.join('/'));
  }
  await page.evaluate(() => closeModal());

  /* ── [H] 에러 0 ─────────────────────────────────────────────────────── */
  console.log('\n[H] 콘솔/페이지 에러');
  ok(errs.length === 0, 'H1 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  const total = pass + fail;
  console.log('\nVERIFY269 ' + pass + '/' + total + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); console.log('\nVERIFY269 FAIL (예외)'); process.exit(1); });
