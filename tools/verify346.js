#!/usr/bin/env node
/* 346 검증 — 코스튬 세부 팝업 간소화: «강화 효과» 두 줄 폐지 · «보유 효과» 한 줄에 합산
 * (저장소 주인 지시 2026-08-29, 스크린샷)
 *
 *   node tools/verify346.js   →  마지막 줄이 `VERIFY346 n/n PASS` 여야 한다.
 *
 * 지시 원문: «강화 효과 내에 500레벨까지 되면이랑 강화 효과 Lv.38 어쩌구 삭제하고,
 * 강화 효과라는 설명도 삭제하고, 걍 보유 효과만 보여줘. 보유 효과에 강화효과 더해서
 * 보여주면 되잖아. 괜히 복잡하기만함»
 *
 * 착수 전 실측(`tools/probe346.js` 헤더)에서 확인된 결손: 같은 세 축(공격·체력·골드)이
 * 한 화면에 **세 벌**(지금 강화분 · 만렙 예고 · 보유 계단) 적혀 있었고, 정작 플레이어에게
 * 실제로 걸려 있는 값(계단 + 강화)은 **어디에도 없었다**.
 *
 * 검사 항목:
 *   [1] 폐기 — 지운 두 줄의 지문(«강화 효과 Lv.» · «까지 강화하면»)이 상세 팝업에 한 조각도
 *       안 남는다. 보유·미보유 두 갈래 모두.
 *   [2] 라벨 — 보유 칸 `.sk-sl` = «보유 효과»(미보유 칸은 «획득 방법» 그대로 — 등재문 ⓑ).
 *   [3] 합산 — `.sk-db` 본문 세 축이 `cosOwnStep(k, n) + lv × COS_LV[k]` 와 **자릿수까지** 같다.
 *       레벨 4점(0·1·38·500 = 만렙)에서 전부 잰다. 표기·실효 불일치 금지(156 규약 · 등재문 ⓒ).
 *   [4] 한 번만 — 같은 % 가 팝업 안에 두 번 안 적힌다(알약 `.sk-ow` 는 순번만 든다).
 *       주인이 지적한 «복잡함» 이 여기로 돌아오는 것을 막는 항이다.
 *   [5] 라이브 — [강화] 를 실제로 눌러 레벨이 오르면 그 줄의 숫자가 **즉시** 따라 오른다
 *       (통짜 재렌더 · 홀드 중 mdLive 두 경로 모두 — 262 규약).
 *   [6] 미보유 분기 — «획득 방법» 라벨 · 본문(cosReqText / 275 «추후 공개»)이 그대로다.
 *       알약 왼쪽만 «다음 획득»(197 주석이 원래 적어 둔 이름 — 아직 보유가 아니다).
 *   [7] 껍데기 Δ0px — 08 부품 8개 bbox 가 스킬 세부와 픽셀 동일(등재문 ⓓ · verify269 §F 잣대).
 *   [8] 되돌림 시험 §R — **소스 사본**에서 이 작업을 되돌리면(합산 줄 → 옛 두 줄) [1]·[3]·[4]
 *       가 실제로 빨개진다. 파일은 한 글자도 안 건드린다(343 §R 처방).
 *       이게 없으면 «이미 참인 것을 게이트로 굳혔다» 를 구별할 수 없다(338 교훈).
 *   [9] 콘솔·페이지 에러 0.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const PARTS = ['.sk-ic', '.sk-gr', '.sk-lv', '.sk-pb', '.sk-ct', '.sk-sl', '.sk-db', '.sk-ow'];
const GONE = ['강화 효과 Lv.', '까지 강화하면'];
const LVS = [0, 1, 38, 500];

/* 페이지 안에서 «보유 칸을 이 레벨로 만들고 상세를 연 뒤 읽는다» — 세 절이 같이 쓴다 */
const READ = (lv) => {
  const id = AVATARS[0].id;
  S.avatars[id] = 1; S.cosLv = S.cosLv || {}; S.cosLv[id] = lv; S.stone = 5e7; S.dia = 5e7; S.rank = 3; save();
  closeModal(); showCosDetail(id);
  const box = document.getElementById('mbox');
  const t = s => { const el = box.querySelector(s); return el ? el.textContent.trim() : null; };
  const n = cosOwnIdx(id);
  return { lv, id, n,
    sl: t('.sk-sl'), db: t('.sk-db p'), owK: t('.sk-ow .k'), owV: t('.sk-ow .v'),
    all: box.textContent,
    want: ['atk', 'hp', 'gold'].map(k => fmtEff(cosOwnStep(k, n) + lv * COS_LV[k])) };
};

async function boot(url) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showCosDetail === 'function');
  await page.waitForTimeout(700);
  return { browser, page, errs };
}

/* 팝업 전체 글자에서 그 배율 표기가 몇 번 적혔는가 (725 이관 — 이전에는 «%» 였다.
   기대값은 여전히 **제품의 포매터**로 만든다: 모델 값이 틀리면 그대로 빨개진다) */
const count = (hay, v) => (hay.match(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

(async () => {
  const { browser, page, errs } = await boot(URL);

  /* ── [0] 설치 확인 (없으면 남은 절을 FAIL 로 세고 끝낸다 — LESSONS 254) ── */
  {
    const have = await page.evaluate(() => ({
      det: typeof showCosDetail === 'function',
      step: typeof cosOwnStep === 'function',
      idx: typeof cosOwnIdx === 'function',
      lvc: typeof COS_LV === 'object' && COS_LV && typeof COS_LV.atk === 'number',
    }));
    ok(have.det, '0A `showCosDetail()` 가 있다');
    ok(have.step && have.idx, '0B `cosOwnStep()`·`cosOwnIdx()` 가 있다');
    ok(have.lvc, '0C `COS_LV` 상수가 있다');
    if (!have.det || !have.step || !have.idx || !have.lvc) {
      console.log('\nVERIFY346 ' + pass + '/' + (pass + fail) + ' FAIL');
      await browser.close(); process.exit(1);
    }
  }

  /* ── [1][2][3][4] 보유 칸 — 레벨 4점 ─────────────────────────────────── */
  console.log('\n[1][2][3][4] 보유 칸 — 폐기 · 라벨 · 합산 · 한 번만');
  const rows = [];
  for (const lv of LVS) {
    const r = await page.evaluate(new Function('lv', 'return (' + READ.toString() + ')(lv)'), lv);
    rows.push(r);
    console.log('  Lv. ' + String(lv).padStart(3) + ' → «' + r.db + '»  (기대 ' + r.want.join('/') + ')');
  }
  for (const r of rows) {
    for (const g of GONE)
      ok(r.all.indexOf(g) < 0, '1 Lv.' + r.lv + ' 폐기 지문 «' + g + '» 이 없다');
    ok(r.sl === '보유 효과', '2 Lv.' + r.lv + ' 라벨 «보유 효과»', r.sl);
    ok(r.db && r.want.every(v => r.db.includes(v)),
      '3 Lv.' + r.lv + ' 본문 = 계단 + 강화 합산', r.db + ' vs ' + r.want.join('/'));
    /* 520 이관 — 주인 지시로 «+» 를 뺐다. 항을 **무르게 풀지 않는다**(328·330 교훈):
       ⓐ 세 축의 «머리말» 은 그대로 묻고 ⓑ 「부호가 없다」를 묻는 항을 한 줄 더 세운다.
       ⓐ 만 남기면 «공격/체력/골드» 세 낱말만 있으면 초록이라 부호가 되살아나도 안 잡힌다. */
    ok(r.db && /^공격 /.test(r.db) && /체력 /.test(r.db) && /골드 /.test(r.db),
      '3b Lv.' + r.lv + ' 본문이 세 축을 다 든다', r.db);
    ok(r.db && !/[+＋−﹣－]/.test(r.db),
      '3c Lv.' + r.lv + ' 본문에 «+»·«−» 부호가 없다 (520 — 주인 지시)', r.db);
    for (const v of r.want)
      ok(count(r.all, v) === 1, '4 Lv.' + r.lv + ' «' + v + '» 이 팝업에 한 번만 적힌다',
        count(r.all, v) + '회');
    ok(!/%|배/.test(r.owV || ''), '4b Lv.' + r.lv + ' 알약은 수치 표기(% · ×N배)를 안 든다', r.owK + ' | ' + r.owV);
    ok(r.owK === '보유 순번' && (r.owV || '').indexOf(String(r.n) + '번째') >= 0,
      '4c Lv.' + r.lv + ' 알약 = 순번(«보유 순번» | «n번째 코스튬»)', r.owK + ' | ' + r.owV);
  }
  /* 레벨이 다르면 줄도 달라야 한다 — 값이 굳어 있으면 문구만 맞고 초록이 된다(LESSONS 307-④) */
  ok(new Set(rows.map(r => r.db)).size === rows.length,
    '3c 레벨 4점의 본문이 서로 전부 다르다(값이 굳어 있지 않다)',
    rows.map(r => r.lv + ':' + r.db).join(' | ').slice(0, 160));

  /* ── [5] 라이브 — 실제 [강화] 클릭·홀드로 그 줄이 따라 오른다 ─────────── */
  console.log('\n[5] 라이브 — 실제 [강화] 로 숫자가 따라 오른다');
  {
    await page.evaluate(new Function('lv', 'return (' + READ.toString() + ')(lv)'), 10);
    await page.waitForTimeout(300);
    const before = await page.evaluate(() =>
      (document.querySelector('#mbox .sk-db p') || {}).textContent);
    /* 진짜 포인터로 누른다 — 핸들러가 안 붙어 있으면 여기서 갈린다 */
    const b = await page.evaluate(() => { const r = document.getElementById('mLv').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(b.x, b.y);
    await page.waitForTimeout(400);
    const one = await page.evaluate(() => ({
      lv: cosLvOf(AVATARS[0].id),
      db: (document.querySelector('#mbox .sk-db p') || {}).textContent,
      want: (() => { const id = AVATARS[0].id, lv = cosLvOf(id), n = cosOwnIdx(id);
        return ['atk', 'hp', 'gold'].map(k => fmtEff(cosOwnStep(k, n) + lv * COS_LV[k])); })(),
    }));
    ok(one.lv === 11, '5A [강화] 1회로 레벨이 10 → 11', 'Lv. ' + one.lv);
    ok(one.db !== before, '5B 그 줄이 바뀌었다', '«' + before + '» → «' + one.db + '»');
    ok(one.want.every(v => one.db.includes(v)), '5C 바뀐 값 = 새 레벨의 합산',
      one.db + ' vs ' + one.want.join('/'));

    /* 홀드(262 mdLive 경로) — 손을 대고 있는 동안에도 같은 식을 본다 */
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    const held = await page.evaluate(() => {
      if (typeof upHold !== 'undefined' && upHold) clearTimeout(upHold.timer);
      const id = AVATARS[0].id, lv = cosLvOf(id), n = cosOwnIdx(id);
      return { lv, db: (document.querySelector('#mbox .sk-db p') || {}).textContent,
               want: ['atk', 'hp', 'gold'].map(k => fmtEff(cosOwnStep(k, n) + lv * COS_LV[k])) };
    });
    await page.mouse.up();
    await page.waitForTimeout(300);
    ok(held.lv > 11, '5D 꾹 누르기 800ms 로 레벨이 더 올랐다', 'Lv. ' + held.lv);
    ok(held.want.every(v => held.db.includes(v)),
      '5E 홀드 중 갱신(mdLive)도 같은 합산식이다', held.db + ' vs ' + held.want.join('/'));
    await page.evaluate(() => closeModal());
  }

  /* ── [6] 미보유 분기 — 등재문 ⓑ ──────────────────────────────────────── */
  console.log('\n[6] 미보유 칸 — «획득 방법» 분기 유지');
  {
    const un = await page.evaluate(() => {
      const a = AVATARS.find(x => !cosOwn(x.id));
      closeModal(); showCosDetail(a.id);
      const box = document.getElementById('mbox');
      const t = s => { const el = box.querySelector(s); return el ? el.textContent.trim() : null; };
      return { id: a.id, sl: t('.sk-sl'), db: t('.sk-db p'), owK: t('.sk-ow .k'), owV: t('.sk-ow .v'),
               all: box.textContent, off: cosOff(a.id), req: cosReqText(a) };
    });
    ok(un.sl === '획득 방법', '6A 미보유 라벨 «획득 방법»', un.sl);
    ok(un.off ? /추후 공개/.test(un.db) : (un.db || '').includes(un.req),
      '6B 미보유 본문 = 그 칸의 획득 방법', un.db);
    for (const g of GONE) ok(un.all.indexOf(g) < 0, '6C 미보유 칸에도 «' + g + '» 이 없다');
    ok(un.owK === '다음 획득', '6D 미보유 알약 왼쪽 «다음 획득»(아직 보유가 아니다)', un.owK);
    ok(!/%/.test(un.owV || ''), '6E 미보유 알약도 % 를 안 든다', un.owV);
    await page.evaluate(() => closeModal());
  }

  /* ── [7] 08 껍데기 Δ0px ──────────────────────────────────────────────── */
  console.log('\n[7] 08 껍데기 — 스킬 세부와 픽셀 동일');
  {
    const F = await page.evaluate((list) => {
      const read = () => { const box = document.getElementById('mbox'), bb = box.getBoundingClientRect();
        return list.map(s => { const el = box.querySelector(s); if (!el) return null;
          const r = el.getBoundingClientRect();
          return [+(r.left - bb.left).toFixed(2), +(r.top - bb.top).toFixed(2),
                  +r.width.toFixed(2), +r.height.toFixed(2)]; }); };
      closeModal(); showSkillDetail(SKILLS[0].id); const sk = read();
      closeModal(); showCosDetail(AVATARS[0].id); const cos = read();
      closeModal(); return { sk, cos };
    }, PARTS);
    for (let i = 0; i < PARTS.length; i++) {
      const a = F.sk[i], b = F.cos[i];
      ok(a && b && a.every((v, j) => near(v, b[j], 0.6)), '7 ' + PARTS[i] + ' 스킬 == 코스튬',
        (a ? a.join(',') : '없음') + ' vs ' + (b ? b.join(',') : '없음'));
    }
  }

  ok(errs.length === 0, '9 콘솔·페이지 에러 0', errs.slice(0, 3).join(' | '));
  await browser.close();

  /* ── [8] §R 되돌림 시험 — 소스 사본에서 346 을 되돌리면 빨개진다 ───────── */
  console.log('\n[R] 되돌림 시험 — 346 을 되돌린 **사본**에서는 위 항이 빨개져야 한다');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    /* 합산 한 줄(`cosEffTxt()`)을 옛 «강화 효과 두 줄» 로 되돌린 사본. 원본은 안 건드린다. */
    const NEW = "  const cosDescNow = () => own\n      ? cosEffTxt()";
    const OLD = "  const cosDescNow = () => { const l2 = cosLvOf(id); return own\n"
      + "      ? '강화 효과 <em>Lv. ' + l2 + '</em> — 공격 <em>+' + pct(l2*COS_LV.atk) + '</em> · 체력 <em>+'\n"
      + "        + pct(l2*COS_LV.hp) + '</em> · 골드 <em>+' + pct(l2*COS_LV.gold) + '</em><br>'\n"
      + "        + '<em>Lv. ' + COS_MAXLV + '</em> 까지 강화하면 — 공격 <em>+' + pct(COS_MAXLV*COS_LV.atk)\n"
      + "        + '</em> · 체력 <em>+' + pct(COS_MAXLV*COS_LV.hp) + '</em> · 골드 <em>+'\n"
      + "        + pct(COS_MAXLV*COS_LV.gold) + '</em>'";
    ok(src.indexOf(NEW) >= 0, 'R0 되돌릴 자리(`cosDescNow` 합산 줄)를 찾았다');
    if (src.indexOf(NEW) < 0) {
      console.log('\nVERIFY346 ' + pass + '/' + (pass + fail) + ' FAIL');
      process.exit(1);
    }
    /* 되돌린 본문은 `;` 로 닫히는 형태가 달라 뒤쪽 `: cosOff(id) ? …;` 를 그대로 쓰려면
       화살표 본문을 블록으로 되돌려야 한다 — 위 OLD 가 그 블록의 여는 부분이다.
       닫는 `};` 는 미보유 분기 끝에 붙는다. */
    let rev = src.replace(NEW, OLD)
                 .replace("      : '<em>' + cosReqText(a) + '</em> 시 지급됩니다.';",
                          "      : '<em>' + cosReqText(a) + '</em> 시 지급됩니다.'; };");
    const tmp = path.join(os.tmpdir(), 'kkkkkk-346-revert-' + process.pid + '.html');
    /* 같은 폴더에 둬야 상대 경로 리소스가 풀린다(이 저장소는 index.html 단일 파일이지만
       `docs/ref` 등 상대 자원을 쓰는 절이 있어 저장소 안 임시 파일로 만든다) */
    const inRepo = path.resolve(__dirname, '..', `.tmp-346-revert-${process.pid}.html`);
    fs.writeFileSync(inRepo, rev);
    try {
      const R = await boot('file://' + inRepo.replace(/\\/g, '/'));
      const r = await R.page.evaluate(new Function('lv', 'return (' + READ.toString() + ')(lv)'), 38);
      await R.browser.close();
      console.log('  되돌린 사본 본문 → «' + (r.db || '').slice(0, 80) + '»');
      ok(GONE.some(g => r.all.indexOf(g) >= 0),
        'R1 되돌리면 폐기 지문이 되살아난다([1] 이 빨개진다)');
      ok(!(r.db && r.want.every(v => r.db.includes(v))),
        'R2 되돌리면 본문이 합산이 아니다([3] 이 빨개진다)', r.db + ' vs ' + r.want.join('/'));
      ok(r.want.some(v => count(r.all, v) !== 1) || /%/.test(r.owV || ''),
        'R3 되돌리면 같은 수치가 한 번만 적히지 않는다([4] 가 빨개진다)');
    } finally { try { fs.unlinkSync(inRepo); } catch (_) {} }
  }

  const total = pass + fail;
  console.log('\nVERIFY346 ' + pass + '/' + total + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); console.log('\nVERIFY346 FAIL (예외)'); process.exit(1); });
