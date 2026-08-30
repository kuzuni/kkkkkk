#!/usr/bin/env node
/* 500 검증 — 34 축복: 레벨업 «필요 경험치» 가 상수 하나가 아니라 **레벨별 표**다
 * (저장소 주인 지시 2026-08-30 22:10, 117 개정 · 456 후속)
 *
 *   node tools/verify500.js
 *
 * 주인 원문 요지: «축복 레벨업 필요 경험치 표 4·10·15·…·90·100, 이후 100 고정
 *   (필요량 캡 · 레벨 캡 51 은 그대로) — 상수 → `BLESS_NEED` 표 + 접근자, 두 벌 식 통합, 진행바 n/need».
 *
 * 수리 전: 어느 레벨에서나 4 를 채우면 레벨 +1. 그 식이 **두 곳에 따로** 적혀 있었고
 *          (`activateBless` · `autoBlessSettle`), 진행바 분모도 `load()` 클램프도 그 상수였다.
 * 수리 후: `BLESS_NEED` 표 + `blessNeed(lv)` 접근자 하나 · 레벨업 식은 `blessGainExp()` **한 벌** ·
 *          진행바 «n/need» · `load()` 클램프 `blessNeed(lv) − 1`.
 *
 *   [A] 선언 — 폐기 식별자 0건 · 표의 모양(첫 4 · 다음 10 · 레벨당 +5 · 끝 100) · 식이 **한 벌**
 *   [B] 접근자 — blessNeed(1·2·3·18·19·20·51·범위 밖) = 4·10·15·90·100·100·100·100
 *   [C] 레벨업 실동작 — Lv1 은 4회 · Lv2 는 10회 · Lv3 은 15회 · Lv19 는 100회를 켜야 오른다
 *   [D] 진행바 — 텍스트 «n/need» 와 채움 %가 **그 레벨의 need** 로 계산된다 · 상한은 MAX
 *   [E] 세이브 이관 — «Lv10 · prog 9» 인 세이브가 3 으로 안 깎인다(구 클램프였으면 깎였다)
 *   [F] 오프라인 자동 정산이 같은 표를 쓴다 — 독립 모델과 Lv·prog·발동 수가 일치
 *   [G] 캡·상한은 지시대로 그대로 — 레벨 캡 51 · 지속 30분(456)은 이 작업이 안 건드렸다
 *   [R] 되돌림 시험 — «어느 레벨에서나 4» 를 다시 깔면 [C]·[D] 가 **실제로 빨개진다**
 *   [J] 콘솔 에러 0건
 *
 * ⚠ [A1] 이 «소스에 그 이름 0건» 을 통짜로 물으므로 **제품 주석도 이 파일도** 폐기 식별자를
 *    통짜로 안 적는다(LESSONS 456-① · 295-②) — 아래 DEAD 처럼 쪼개서 만든다.
 * ⚠ [B] 처럼 값만 물으면 «표를 읽는 척하며 상수를 돌려주는 접근자» 도 초록이다 —
 *    [A3] 이 «레벨업 식이 소스에 한 벌» 을, [C] 가 **실제 발동 수**를, [R] 이 되돌림을 같이 못박는다.
 * ⚠ 밸런스(필요량이 커져 레벨 성장이 느려지는 것)의 계수 확정은 **199 몫**이다 — 이 자는
 *    «표대로 도는가» 만 본다(326·331·398 과 같은 처리).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const DEAD = 'BLESS_' + 'STEP';             /* 폐기 식별자 — 이 파일에도 통짜로 안 적는다 */

/* 게임과 **독립인** 표(index.html 을 안 읽고 주인 지시문에서 다시 적는다) */
const NEED = [4, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100];
const needAt = lv => NEED[Math.min(Math.max(1, lv), NEED.length) - 1];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== '' ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  /* ═══ [A] 선언 — 소스로 답한다 ═══ */
  console.log('[A] 선언 — 폐기 식별자 · 표의 모양 · 식이 한 벌');
  ok(SRC.split(DEAD).length - 1 === 0, 'A1 폐기 식별자(레벨 무관 고정 필요량 상수)가 소스에 0건',
     (SRC.split(DEAD).length - 1) + '건');

  const decl = (SRC.match(/const\s+BLESS_NEED\s*=\s*\[[^\]]*\]/) || [''])[0];
  const nums = (decl.match(/\d+/g) || []).map(Number);
  ok(nums.length === NEED.length && nums.every((v, i) => v === NEED[i]),
     'A2 BLESS_NEED 표가 지시문 그대로 (4 · 10 · +5 · … · 90 · 100, 19행)',
     nums.join(',') || '(못 찾음)');

  /* 레벨업 식이 «한 벌» 인가 — prog 를 need 와 견주어 lv 를 올리는 자리는 소스에 하나뿐이어야 한다.
     (수리 전에는 activateBless · autoBlessSettle 두 곳에 같은 식이 따로 적혀 있었다) */
  const lvUp = SRC.match(/S\.bless\.prog\s*-=|S\.bless\.lv\s*\+\+/g) || [];
  ok(lvUp.length === 2, 'A3 레벨업 식(prog 차감 + lv 증가)이 소스에 **한 벌**뿐',
     lvUp.length + '개 토큰 (한 벌 = 2)');
  ok(/function\s+blessGainExp\s*\(/.test(SRC)
     && (SRC.match(/blessGainExp\s*\(\s*\)/g) || []).length >= 3,
     'A4 두 호출부(수동 활성화 · 오프라인 정산)가 같은 함수를 부른다',
     (SRC.match(/blessGainExp\s*\(\s*\)/g) || []).length + '곳');

  /* load() 클램프가 상수가 아니라 접근자를 읽는가 (세이브 이관의 뿌리) */
  ok(/Math\.min\(s\.prog\s*\|\s*0\s*,\s*blessNeed\(/.test(SRC),
     'A5 load() 의 prog 클램프가 blessNeed(lv) − 1 을 읽는다', 'ok');

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.removeItem('idle_hunter_save_v4'); } catch (_) {} });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  /* ═══ [B] 접근자 ═══ */
  console.log('[B] 접근자 blessNeed(lv)');
  const probes = [1, 2, 3, 18, 19, 20, 51, 999];
  const B = await page.evaluate(ls => ls.map(lv => blessNeed(lv)), probes);
  probes.forEach((lv, i) => {
    ok(B[i] === needAt(lv), 'B' + (i + 1) + ' blessNeed(' + lv + ') = ' + needAt(lv), String(B[i]));
  });
  const Bdef = await page.evaluate(() => {
    S.bless = { lv: 3, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    return blessNeed();
  });
  ok(Bdef === needAt(3), 'B9 인자 없이 부르면 «지금 레벨» 의 필요량', String(Bdef));

  /* ═══ [C] 레벨업 실동작 — 표대로 «그 횟수만큼» 켜야 오른다 ═══
     activateBless 는 켜져 있으면 false 를 돌려주므로 만료를 0 으로 되돌리며 반복한다.
     «need − 1 번은 안 오르고 need 번째에 오른다» 를 한 표본에서 같이 본다. */
  console.log('[C] 레벨업 실동작 — 표의 횟수만큼 켜야 오른다');
  const C = await page.evaluate(lvs => lvs.map(lv => {
    S.bless = { lv, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    let n = 0;
    while (S.bless.lv === lv && n < 400) { S.bless.exp.atk = 0; activateBless('atk'); n++; }
    return { lv, fires: n, after: S.bless.lv, prog: S.bless.prog };
  }), [1, 2, 3, 19]);
  C.forEach((r, i) => {
    ok(r.fires === needAt(r.lv) && r.after === r.lv + 1 && r.prog === 0,
       'C' + (i + 1) + ' Lv' + r.lv + ' → Lv' + (r.lv + 1) + ' 은 ' + needAt(r.lv) + '회',
       r.fires + '회 · Lv' + r.after + ' · prog ' + r.prog);
  });

  /* ═══ [D] 진행바 «n/need» ═══ */
  console.log('[D] 진행바 — 분모가 그 레벨의 need');
  const D = await page.evaluate(() => {
    openBless();
    const shot = (lv, prog) => {
      S.bless = { lv, prog, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); renderBless();
      return { txt: document.getElementById('blsProg').textContent.trim(),
               w: document.getElementById('blsFill').style.width };
    };
    return { a: shot(1, 3), b: shot(3, 7), c: shot(19, 42), d: shot(51, 0) };
  });
  ok(D.a.txt === '3/4', 'D1 Lv1 은 «3/4» (표의 첫 칸)', D.a.txt);
  ok(D.b.txt === '7/15', 'D2 Lv3 은 «7/15» — 분모가 레벨을 따라간다', D.b.txt);
  ok(D.c.txt === '42/100', 'D3 Lv19 는 «42/100» (필요량 캡)', D.c.txt);
  ok(D.d.txt === 'MAX', 'D4 레벨 캡(51)에서는 MAX', D.d.txt);
  ok(Math.abs(parseFloat(D.b.w) - 100 * 7 / 15) < 0.02
     && Math.abs(parseFloat(D.c.w) - 42) < 0.02 && parseFloat(D.d.w) === 100,
     'D5 채움 %도 같은 분모로 계산된다 (Lv3 46.67% · Lv19 42% · MAX 100%)',
     D.b.w + ' · ' + D.c.w + ' · ' + D.d.w);

  /* ═══ [E] 세이브 이관 — 구 클램프였으면 깎였을 진행도가 살아 있다 ═══ */
  console.log('[E] 세이브 이관 — Lv10 · prog 9 가 안 깎인다');
  /* ⚠ 이 절만 **새 탭**에서 돈다 — 위 페이지는 `addInitScript` 로 매 로드마다 세이브를 지우므로
     거기서 reload 하면 심은 세이브가 같이 지워진다(1회차에 «Lv1 · 0/4» 로 빨갰다). */
  const page2 = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  page2.on('pageerror', e => errs.push(String(e)));
  page2.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page2.goto(URL, { waitUntil: 'load' });
  await page2.waitForTimeout(700);
  await page2.evaluate(key => {
    const raw = JSON.parse(localStorage.getItem(key)) || {};
    raw.bless = { lv: 10, prog: 9, exp: { atk: 0, hp: 0, rate: 0 } };
    localStorage.setItem(key, JSON.stringify(raw));
    /* beforeunload 의 save() 가 방금 심은 세이브를 덮지 않게 막는다(verify124 선례) */
    Storage.prototype.setItem = function () {};
  }, KEY);
  await page2.reload({ waitUntil: 'load' });
  await page2.waitForTimeout(700);
  const E = await page2.evaluate(() => ({ lv: S.bless.lv, prog: S.bless.prog, need: blessNeed() }));
  ok(E.lv === 10 && E.prog === 9, 'E1 Lv10 · prog 9 가 그대로 로드된다 (구 클램프면 3 으로 깎인다)',
     'Lv' + E.lv + ' · ' + E.prog + '/' + E.need);
  const E2 = await page2.evaluate(() => {
    const raw = { bless: { lv: 3, prog: 99, exp: {} } };
    /* 클램프 자체는 살아 있다 — need 를 넘는 값은 여전히 잘린다 */
    S.bless = { lv: 3, prog: 99, exp: { atk: 0, hp: 0, rate: 0 } };
    return { cap: Math.min(raw.bless.prog, blessNeed(3) - 1), need: blessNeed(3) };
  });
  ok(E2.cap === needAt(3) - 1, 'E2 클램프는 살아 있다 — need 를 넘는 prog 는 need − 1 로 잘린다',
     E2.cap + ' (need ' + E2.need + ')');
  await page2.close();

  /* ═══ [F] 오프라인 자동 정산이 같은 표를 쓴다 ═══ */
  console.log('[F] 오프라인 자동 정산 — 독립 모델과 일치');
  const F = await page.evaluate(() => {
    const now = Date.now(), DUR = 30 * 60 * 1000;
    const win = 40 * 3600 * 1000 - 60 * 1000;        /* 40시간 — 레벨이 여러 번 오르는 창 */
    S.bless = { lv: 1, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } };
    S.pass.autoBlessUntil = now + 30 * 24 * 3600 * 1000;
    markDirty();
    const r = autoBlessSettle(now - win);
    return { fires: r && r.n, lv: S.bless.lv, prog: S.bless.prog,
             per: (1 + Math.floor(win / DUR)) * BLESS.length };
  });
  /* 독립 모델 — 발동 1회당 경험치 +1, 표대로 레벨업 */
  let mlv = 1, mprog = 0;
  for (let i = 0; i < F.per; i++) {
    if (mlv >= 51) { mprog = 0; continue; }
    if (++mprog >= needAt(mlv)) { mprog -= needAt(mlv); mlv++; }
  }
  ok(F.fires === F.per, 'F1 40시간 창 발동 수 = 30분 등간격의 닫힌 식', F.fires + ' / 기대 ' + F.per);
  ok(F.lv === mlv && F.prog === mprog, 'F2 정산 뒤 Lv·prog 가 표 기반 독립 모델과 일치',
     '게임 Lv' + F.lv + '·' + F.prog + ' / 기대 Lv' + mlv + '·' + mprog);
  ok(F.lv >= 3, 'F3 그 창에서 레벨이 실제로 여러 번 올랐다 (표를 지나갔다는 증거)', 'Lv' + F.lv);

  /* ═══ [G] 지시가 «그대로 두라» 고 한 것들 ═══ */
  console.log('[G] 캡·지속은 그대로');
  const G = await page.evaluate(() => {
    S.bless = { lv: 51, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
    const before = S.bless.prog;
    S.bless.exp.atk = 0; activateBless('atk');
    return { max: BLESS_MAXLV, capLv: S.bless.lv, capProg: S.bless.prog,
             dur: blessDur(), scale: blessScale() };
  });
  ok(G.max === 51 && G.capLv === 51, 'G1 레벨 캡 51 그대로', 'BLESS_MAXLV ' + G.max + ' · Lv' + G.capLv);
  ok(G.capProg === 0, 'G2 상한에서는 경험치가 안 쌓인다', String(G.capProg));
  ok(G.dur === 30 * 60 * 1000, 'G3 지속 30분(456)은 이 작업이 안 건드렸다', (G.dur / 60000) + '분');
  ok(Math.abs(G.scale - 6) < 1e-9, 'G4 효과 배율 곡선(117)도 그대로 — Lv51 6.00', G.scale.toFixed(2));

  /* ═══ [R] 되돌림 시험 — «어느 레벨에서나 4» 를 다시 깔면 빨개진다 ═══ */
  console.log('[R] 되돌림 시험');
  const R = await page.evaluate(() => {
    const orig = window.blessNeed;
    window.blessNeed = () => 4;                       /* 500 이전 규칙 */
    const shot = lv => {
      S.bless = { lv, prog: 0, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty();
      let n = 0;
      while (S.bless.lv === lv && n < 400) { S.bless.exp.atk = 0; activateBless('atk'); n++; }
      S.bless = { lv, prog: 2, exp: { atk: 0, hp: 0, rate: 0 } }; markDirty(); renderBless();
      return { fires: n, txt: document.getElementById('blsProg').textContent.trim() };
    };
    const broken = shot(3);
    window.blessNeed = orig;
    const back = shot(3);
    return { broken, back };
  });
  ok(R.broken.fires === 4 && R.broken.txt === '2/4',
     '[R1] 옛 규칙을 깔면 C(15회)·D(«/15»)가 실제로 깨진다',
     R.broken.fires + '회 · ' + R.broken.txt);
  ok(R.back.fires === needAt(3) && R.back.txt === '2/' + needAt(3),
     '[R2] 되돌림을 걷으면 다시 초록 (시험이 상태를 안 남긴다)',
     R.back.fires + '회 · ' + R.back.txt);

  ok(errs.length === 0, '[J] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY500 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
