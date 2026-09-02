#!/usr/bin/env node
/* 701 재현 — «단련·룬에 배수를 놓을 자리가 어디이고, 배치가 정말 순차와 같은가» 를 **찍힌 값**으로 묻는다
 *
 *   node tools/probe701.js
 *
 * 주인 지시(2026-09-02 02:12): «단련이랑 룬도 x1 x10 x100 x1000 있게하기»
 * 주인 보강(02:15): «구간별로 필요재화량 바뀌는거도 알아서 잘 계산되게 하고»
 *
 * 338 규칙 — 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다. 이 자가 묻는 것은 다섯이다.
 *
 *   [1] 수리 전에 이 팝업에 배수 토글이 정말 **0개**인가
 *   [2] ⚑ **자리를 가른 값** — 두 탭의 «빈 띠» 가 얼마인가. 공용 셸은 98 이다.
 *       단련은 제 줄을 가질 수 있고(k2 하변 ↔ 상위 바) 룬은 **못 가진다**(본문 하변 ↔ 상위 바)는
 *       것이 여기서 숫자로 갈린다 — 그래서 룬만 «잔량 헤더와 한 줄을 나눠 쓰는» 처방이 됐다.
 *   [3] 룬 잔량 헤더(687)가 998 폭 안에서 실제로 쓰는 잉크가 얼마인가 —
 *       그 남는 폭이 바를 받을 수 있는지(바 632 + 사이 16 + 헤더 350 = 998)
 *   [4] ⚑ **등가성 재현** — 코어를 «1회» 로 가른 뒤에도 **×1 경로가 한 글자도 안 달라졌는가**.
 *       씨앗 고정 RNG 로 수리 전/후 트리에서 각각 룬 200회·단련 200회를 굴려 장부를 대조한다.
 *       (700 §2 의 그 축 — 없으면 «이미 참인 것을 게이트로 굳히는» 338 전례가 된다)
 *   [5] ⚑ **주인 보강의 재현** — 단련 비용이 구간(100·200·…) 경계에서 실제로 계단이 되는가.
 *       «단가 × N» 과 «걸음 합» 이 **다른 수**라는 것을 찍어 둔다. 다르지 않으면 보강 자체가 무의미하다.
 *
 * 756 — «수리 전 사본» 은 얕은 클론에서도 공용 사다리(`gitrev756`)가 알아서 판다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 `assets/**`·웹폰트가 404 라 글줄이 갈린다(probe700 §preTree).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const G = require('./gitrev756');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1920, 2280, 2600];
const SHELL_H = 98;              /* 공용 서브탭 셸 `.stabs` 높이(96·437 규약 — 줄이지 않는다) */
const RN_BAR_W = 632, RN_HD_W = 350, GAP = 16;

let pass = 0, fail = 0, hold = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const skip = (name, why) => { console.log('HOLD ' + name + ' — ' + why); hold++; };

/* ⚑ 1회차에 밟은 함정 — **`merge-base origin/main HEAD` 는 «수리 전» 이 아니다.**
   회차 커밋을 push 한 순간 그 커밋이 곧 갈림점이 되어 «수리 전 사본» 이 **수리 후 사본**이 된다
   ([1] 이 «토글 8개» 로, [4] 가 «같은 트리끼리» 로 읽혔다). 이 작업의 «수리 전» 은 고정점 하나다 —
   **선점 커밋(`claim(701)`)의 부모**. 선점은 제품을 한 줄도 안 건드리므로 그 부모가 착수 직전 트리다.
   못 찾으면 merge-base 로 물러난다(다른 저장소에서 이 자를 돌릴 때의 폴백). */
function preTree() {
  let base;
  try {
    const c = execFileSync('git', ['log', '--format=%H', '--grep', '^claim(701)', '-1', 'origin/main'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    base = c ? execFileSync('git', ['rev-parse', c + '^'], { cwd: ROOT, encoding: 'utf8' }).trim()
             : execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return { ok: false, env: true, why: '수리 전 커밋을 못 읽는다(원격 참조 없음)' }; }
  const r = G.ensure(base);
  if (!r.ok) return { ok: false, env: !!r.env, why: r.why || ('객체 없음: ' + base) };
  let src;
  try {
    src = execFileSync('git', ['show', base + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { return { ok: false, env: false, why: 'git show 실패: ' + e.message }; }
  const f = path.join(ROOT, '.p701-pre-' + process.pid + '.html');
  fs.writeFileSync(f, src);
  return { ok: true, sha: base, file: f, url: 'file://' + f.replace(/\\/g, '/') };
}
const cleanup = pre => { if (pre && pre.file) { try { fs.unlinkSync(pre.file); } catch (_) {} } };

async function open(browser, url, height) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(220);
  return { ctx, page };
}

/* 씨앗 고정 LCG — 두 트리에서 **같은 수열**을 준다(등가성 대조의 유일한 조건). */
const SEEDED = `(seed => { let s = seed >>> 0;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(20260902)`;

/* 수리 전·후 트리에서 **똑같이** 도는 장부 — «×1 을 N 번» 만 쓴다(수리 전에는 배치가 없다). */
const LEDGER = `(() => {
  S.rstone = 5e6; S.tstone = 5e6; S.rune = { r1:0, r2:0, r3:0 };
  S.temper = { alloc: { atk:0, hp:0, regen:0 } };
  const rune = [];
  for (let i = 0; i < 200; i++) { const r = runeTry('r1'); rune.push((r.ok ? 1 : 0) + ':' + (r.up ? 1 : 0) + ':' + r.lv + ':' + r.cost); }
  const temp = [];
  for (let i = 0; i < 200; i++) { temp.push((temperUp('atk') ? 1 : 0) + ':' + temperLv('atk')); }
  return { rune: rune.join('|'), temp: temp.join('|'), rstone: S.rstone, tstone: S.tstone,
           rlv: runeLvOf('r1'), tlv: temperLv('atk') };
})()`;

(async () => {
  const browser = await launch(chromium);
  const pre = preTree();

  /* ── [1]·[2]·[3] 자리 — 수리 전 트리에서 잰다 ─────────────────────────────── */
  if (!pre.ok) {
    if (pre.env) skip('[1]~[4] 수리 전 사본', pre.why);
    else ok(false, '[1]~[4] 수리 전 사본을 못 꺼냈다', pre.why);
  } else {
    const band = [];
    for (const H of FRAMES) {
      const { ctx, page } = await open(browser, pre.url, H);
      const r = await page.evaluate(() => {
        S.rstone = 1e6; S.tstone = 1e6; openTrain();
        const box = document.querySelector('#trw .tr-box'), bb = box.getBoundingClientRect();
        const R = s => { const e = document.querySelector(s); if (!e) return null;
          const q = e.getBoundingClientRect();
          return { t: +(q.top - bb.top).toFixed(1), b: +(q.bottom - bb.top).toFixed(1), w: +q.width.toFixed(1) }; };
        setTrSub('rune'); renderTrain();
        const runeBody = R('.tr-runes'), subs = R('.tr-subs'), hd = R('.rn-hd');
        const hdInk = document.querySelector('.rn-hd .pv').getBoundingClientRect().width;
        setTrSub('temper'); renderTrain();
        const k2 = R('.tr-tp.k2');
        return {
          toggles: document.querySelectorAll('#trw [data-mul]').length,
          runeFree: +(subs.t - runeBody.b).toFixed(1),     /* 룬 본문 하변 ↔ 상위 바 */
          tempFree: +(subs.t - k2.b).toFixed(1),           /* 단련 3행 하변 ↔ 상위 바 */
          hdW: hd.w, hdInk: +hdInk.toFixed(1)
        };
      });
      band.push({ H, ...r });
      await ctx.close();
    }
    ok(band.every(b => b.toggles === 0),
      '[1] 수리 전 — 23 훈련 팝업 안 배수 토글 노드 0개',
      band.map(b => b.H + ':' + b.toggles).join(' · '));

    ok(band.every(b => b.runeFree < SHELL_H),
      '[2-a] ⚑ 룬 탭은 **제 줄을 가질 수 없다** — 빈 띠가 네 프레임 전부 셸 ' + SHELL_H + ' 미만',
      band.map(b => b.H + ':' + b.runeFree).join(' · '));
    ok(band.every(b => b.tempFree >= SHELL_H + 20),
      '[2-b] 단련 탭은 **제 줄을 가질 수 있다** — 빈 띠 ' + (SHELL_H + 20) + ' 이상',
      band.map(b => b.H + ':' + b.tempFree).join(' · '));

    ok(band.every(b => b.hdInk + GAP + RN_BAR_W <= b.hdW),
      '[3] 룬 잔량 헤더 잉크 + 사이 ' + GAP + ' + 바 ' + RN_BAR_W + ' 가 한 줄(998)에 들어간다 = 나눠 쓸 수 있다',
      band.map(b => b.H + ':' + b.hdInk + '+' + GAP + '+' + RN_BAR_W + '=' + (b.hdInk + GAP + RN_BAR_W) + '/' + b.hdW).join(' · '));

    /* ── [4] 등가성 — 수리 전/후 «×1 을 N 번» 장부 대조 ───────────────────── */
    /* ⚑ 1회차에 밟은 두 번째 함정 — 씨앗을 **따로** 심으면 두 evaluate 사이의 rAF 루프(전투 자동
       플레이)가 `Math.random` 을 먹어 수열이 어긋난다(같은 트리끼리도 [4-a] 가 빨갛다).
       씨앗과 장부를 **한 evaluate 안**에서 잇는다 — 그 사이에는 아무것도 못 낀다. */
    const ledger = async url => {
      const { ctx, page } = await open(browser, url, 2280);
      const r = await page.evaluate('(() => { ' + SEEDED + '; return ' + LEDGER + '; })()');
      await ctx.close();
      return r;
    };
    const A = await ledger(pre.url), B = await ledger(URL);
    ok(A.rune === B.rune, '[4-a] ⚑ 룬 ×1 200회 — 수리 전/후 장부가 **한 글자도 안 달라졌다**',
      A.rune === B.rune ? 'Lv ' + A.rlv + ' · 잔액 ' + A.rstone : '어긋남');
    ok(A.temp === B.temp && A.tstone === B.tstone,
      '[4-b] ⚑ 단련 ×1 200회 — 수리 전/후 장부 동일',
      'Lv ' + A.tlv + '/' + B.tlv + ' · 잔액 ' + A.tstone + '/' + B.tstone);
  }
  cleanup(pre);

  /* ── [5] 주인 보강의 재현 — 단련 비용이 정말 계단인가 ──────────────────── */
  {
    const { ctx, page } = await open(browser, URL, 2280);
    const r = await page.evaluate(() => {
      S.tstone = 1e9; S.temper = { alloc: { atk: 95, hp: 0, regen: 0 } };
      const n = 10, l0 = temperLv('atk');
      const flat = temperCost('atk') * n;                    /* «단가 × N» — 금지된 셈 */
      let step = 0;
      for (let i = 0; i < n; i++) step += temperSegCost(Math.floor((l0 + i) / TEMPER_SEG));
      const plan = temperPlan('atk', n);
      const before = S.tstone;
      const b = temperUpBatch('atk', n);
      return { l0, flat, step, plan, done: b.done, spent: b.spent, paid: before - S.tstone };
    });
    await ctx.close();
    ok(r.flat !== r.step,
      '[5-a] ⚑ 구간 경계(Lv.95 에서 10회)는 «단가 × N» 과 «걸음 합» 이 **다른 수**다 — 보강이 실재를 가리킨다',
      '단가×N ' + r.flat + ' ↔ 걸음합 ' + r.step);
    ok(r.plan.cost === r.step && r.spent === r.step && r.paid === r.step && r.done === 10,
      '[5-b] 배치·계획·실제 차감이 셋 다 «걸음 합» 과 같다',
      'plan ' + r.plan.cost + ' · spent ' + r.spent + ' · paid ' + r.paid + ' · done ' + r.done);
  }

  await browser.close();
  console.log('\nPROBE701 ' + pass + '/' + (pass + fail) + (hold ? ' (HOLD ' + hold + ')' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
