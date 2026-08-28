/* 작업 346 재현 프로브 — 코스튬 세부 팝업 «강화 효과» 두 줄을 지우고 «보유 효과» 하나로
 *
 *   node tools/probe346.js
 *
 * 주인 원문: «강화 효과 내에 500레벨까지 되면이랑 강화 효과 Lv.38 어쩌구 삭제하고,
 *            강화 효과라는 설명도 삭제하고, 걍 보유 효과만 보여줘.
 *            보유 효과에 강화효과 더해서 보여주면 되잖아. 괜히 복잡하기만함»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify346.js`) **무엇이 어디에
 * 적혀 있었나** 를 보는 자리다 — 338·341·350 규칙대로 처방을 따르기 **전에** 잰다.
 *
 * ⚑ **착수 전 실측(수리 전 트리, Lv.38 · 순번 1)** — 등재문의 «두 줄» 이 그대로 확인됐다:
 *     라벨(`.sk-sl`)  «강화 효과»
 *     상자(`.sk-db`)  «강화 효과 Lv. 38 — 공격 +15% · 체력 +11% · 골드 +7.6%»
 *                     «Lv. 500 까지 강화하면 — 공격 +200% · 체력 +150% · 골드 +100%»
 *     알약(`.sk-ow`)  «보유 1번째» | «공격 +4.0% 체력 +3.2% 골드 +2.0%»
 *   ⇒ 같은 세 축(공격·체력·골드)이 **한 화면에 세 벌**(지금 강화분 · 만렙 예고 · 보유 계단)
 *     적혀 있었고, 정작 **플레이어에게 실제로 걸려 있는 값(계단 + 강화)은 어디에도 없었다.**
 *     주인이 말한 «괜히 복잡하기만함» 의 정체가 이것이다 — 합이 아니라 조각만 늘어놓은 화면.
 *   부품 bbox(mbox 기준): `.sk-ct` 59,232,750,132 · `.sk-sl` 284,391,300,58 ·
 *     `.sk-db` 59,420,750,290 · `.sk-ow` 94,628,680,63 — 넷 다 08 스킬 세부와 **픽셀 동일**.
 *     `.sk-db` 안에서 알약은 위 여백 208px · 아래 여백 19px 자리다(등재문 ⓐ «264px 구멍» 의 실체).
 *
 * 수리 후의 이 파일이 재는 것:
 *   ① 지운 두 줄의 지문(«강화 효과 Lv.» · «까지 강화하면»)이 팝업에 **한 조각도** 안 남았다
 *   ② 화면에 적힌 수치가 **합산 한 벌뿐**이다(같은 % 가 두 번 안 적힌다)
 *   ③ 합산값이 `cosOwnStep(k,n) + lv×COS_LV[k]` 와 자릿수까지 같다(표기·실효 일치, 156 규약)
 *   ④ 08 껍데기 네 부품의 bbox 가 스킬 세부와 여전히 픽셀 동일(레이아웃 Δ0px)
 *   ⑤ 미보유 칸의 «획득 방법» 분기는 그대로다(등재문 ⓑ)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok   ' : '  FAIL ') + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const PARTS = ['.sk-ct', '.sk-sl', '.sk-db', '.sk-ow'];
/* 지운 두 줄의 지문 — 한 조각이라도 남으면 346 이 반쪽이다 */
const GONE = ['강화 효과 Lv.', '까지 강화하면'];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showCosDetail === 'function');
  await page.waitForTimeout(700);

  /* ── [1] 보유 칸(Lv.38 — 주인 스크린샷과 같은 자리) ───────────────────── */
  console.log('\n[1] 보유 칸 — 지금 화면에 적힌 것');
  const own = await page.evaluate(() => {
    try {
      const id = AVATARS[0].id;
      S.avatars[id] = 1; S.cosLv = S.cosLv || {}; S.cosLv[id] = 38; S.stone = 5e7; S.rank = 3; save();
      closeModal(); showCosDetail(id);
      const box = document.getElementById('mbox'), bb = box.getBoundingClientRect();
      const rect = s => { const el = box.querySelector(s); if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: +(r.left - bb.left).toFixed(2), y: +(r.top - bb.top).toFixed(2),
                 w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
      const txt = s => { const el = box.querySelector(s); return el ? el.textContent.trim() : null; };
      const lv = cosLvOf(id), n = cosOwnIdx(id);
      return {
        id, lv, n,
        parts: { ct: rect('.sk-ct'), sl: rect('.sk-sl'), db: rect('.sk-db'), ow: rect('.sk-ow') },
        sl: txt('.sk-sl'), db: txt('.sk-db p'), owK: txt('.sk-ow .k'), owV: txt('.sk-ow .v'),
        all: box.textContent,
        want: ['atk', 'hp', 'gold'].map(k => pct(cosOwnStep(k, n) + lv * COS_LV[k])),
        step: ['atk', 'hp', 'gold'].map(k => pct(cosOwnStep(k, n))),
        lvx:  ['atk', 'hp', 'gold'].map(k => pct(lv * COS_LV[k])),
      };
    } catch (e) { return { err: String(e) }; }
  });
  if (own.err) ok(false, '보유 칸 읽기', own.err);
  else {
    console.log('    라벨(.sk-sl) = «' + own.sl + '»');
    console.log('    상자(.sk-db) = «' + own.db + '»');
    console.log('    알약(.sk-ow) = «' + own.owK + '» | «' + own.owV + '»');
    console.log('    Lv=' + own.lv + ' · 순번 n=' + own.n
      + '  ⇒ 계단 ' + own.step.join('/') + ' + 강화 ' + own.lvx.join('/')
      + ' = 합 ' + own.want.join('/'));

    for (const g of GONE)
      ok(own.all.indexOf(g) < 0, '① 지운 지문 «' + g + '» 이 팝업에 없다');
    ok(own.sl === '보유 효과', '② 라벨이 «보유 효과»', own.sl);
    /* ③ 상자가 합산 한 줄을 든다 — 세 축이 전부 합산값이어야 한다 */
    ok(own.want.every(v => (own.db || '').includes(v)),
      '③ 상자 본문 = 합산 세 축', own.db + ' vs ' + own.want.join('/'));
    /* ④ 같은 % 가 두 번 안 적힌다 — 팝업 전체에서 각 합산값이 정확히 1회 */
    const cnt = v => (own.all.match(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    for (let i = 0; i < 3; i++)
      ok(cnt(own.want[i]) === 1, '④ 합산값 «' + own.want[i] + '» 이 화면에 한 번만 적힌다',
        cnt(own.want[i]) + '회');
    /* ⑤ 알약은 수치를 안 든다(197 의 순번만) */
    ok(!/%/.test(own.owV), '⑤ 알약은 % 를 안 든다(순번만)', own.owK + ' | ' + own.owV);
    ok(own.owK === '보유 순번', '⑥ 알약 왼쪽이 «보유 순번»', own.owK);
    ok(own.owV.indexOf(String(own.n) + '번째') >= 0, '⑦ 알약 오른쪽이 «n번째 코스튬»', own.owV);
  }

  /* ── [2] 미보유 칸 — 지시 대상 아님(획득 방법 분기 유지) ─────────────── */
  console.log('\n[2] 미보유 칸 — «획득 방법» 분기는 그대로');
  const un = await page.evaluate(() => {
    try {
      const a = AVATARS.find(x => !cosOwn(x.id));
      closeModal(); showCosDetail(a.id);
      const box = document.getElementById('mbox');
      const t = s => { const el = box.querySelector(s); return el ? el.textContent.trim() : null; };
      return { id: a.id, sl: t('.sk-sl'), db: t('.sk-db p'),
               owK: t('.sk-ow .k'), owV: t('.sk-ow .v'), off: cosOff(a.id), req: cosReqText(a) };
    } catch (e) { return { err: String(e) }; }
  });
  if (un.err) ok(false, '미보유 칸 읽기', un.err);
  else {
    console.log('    라벨 «' + un.sl + '» · 본문 «' + un.db + '» · 알약 «' + un.owK + '»|«' + un.owV + '»');
    ok(un.sl === '획득 방법', '⑧ 미보유 라벨은 «획득 방법»(275/182 — 이대로 둔다)', un.sl);
    ok(un.off ? /추후 공개/.test(un.db) : (un.db || '').includes(un.req),
      '⑨ 미보유 본문 = 그 칸의 획득 방법', un.db);
    ok(un.owK === '다음 획득', '⑩ 미보유 알약 왼쪽은 «다음 획득»(197 주석대로)', un.owK);
  }

  /* ── [3] 08 껍데기 — 스킬 세부와 픽셀 동일(레이아웃 Δ0px) ─────────────── */
  console.log('\n[3] 08 껍데기 — 스킬 세부와 같은 자리인가');
  const F = await page.evaluate((list) => {
    try {
      const read = () => { const box = document.getElementById('mbox'), bb = box.getBoundingClientRect();
        return list.map(s => { const el = box.querySelector(s); if (!el) return null;
          const r = el.getBoundingClientRect();
          return [+(r.left - bb.left).toFixed(2), +(r.top - bb.top).toFixed(2),
                  +r.width.toFixed(2), +r.height.toFixed(2)]; }); };
      closeModal(); showSkillDetail(SKILLS[0].id); const sk = read();
      closeModal(); showCosDetail(AVATARS[0].id); const cos = read();
      closeModal();
      return { sk, cos };
    } catch (e) { return { err: String(e) }; }
  }, PARTS);
  if (F.err) ok(false, '껍데기 대조', F.err);
  else for (let i = 0; i < PARTS.length; i++) {
    const a = F.sk[i], b = F.cos[i];
    ok(a && b && a.every((v, j) => Math.abs(v - b[j]) <= 0.6),
      '⑪ ' + PARTS[i] + ' 스킬 세부 == 코스튬 세부',
      (a ? a.join(',') : '없음') + ' vs ' + (b ? b.join(',') : '없음'));
  }

  ok(errs.length === 0, '⑫ 콘솔·페이지 에러 0', errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\nPROBE346 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
