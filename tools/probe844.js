/* 작업 844 재현 — `verify58` [8-b] 씬 D(50 코스튬 델타) 표본이 `null` 인 이유를 갈래로 가른다.

   등재문의 갈래 셋:
     ⓐ 코스튬 델타 플로터가 실제로 안 뜬다(제품 결손)
     ⓑ 뜨긴 하는데 캡처 격자(25ms)가 그 수명을 건너뛴다(표본 문턱 — 825·836 과 같은 얼굴)
     ⓒ 선택자(`.fx-plus.fx-delta`)를 세우는 자리가 부패했다(클래스 이름 변경 등)

   이 자가 찍는 것:
     [1] 씬 D 를 **8ms** 로 훑어도(종전 25ms 의 3배 촘촘) 델타 0장 · `.fx-plus` 자체가 0장 ⇒ **ⓑ 기각**
     [2] 정적 — 제품에서 `fxUpOk(...)` 에 **셋째 인자(텍스트)를 주는 호출부가 0곳**이고
         `fxDelta(` 를 부르는 자리는 `fxUpOk` 안 그 한 줄뿐이다 ⇒ 부품은 **제품에서 도달 불가**.
         클래스 이름은 그대로다(`d.className = 'fx-plus fx-delta'`) ⇒ **ⓒ 도 기각** · 남는 것은 ⓐ 인데,
         그 «결손» 은 사고가 아니라 **주인 지시의 결과**다(659·660 훈련·단련·룬 · 520·814 코스튬).
     [3] 그러면 [8] 의 셋째 표본은 어디로 가야 하는가 — **살아 있는 회당 플로터**(`.fx-plus.hb`)가
         08 세부 팝업 [강화] 에서 실제로 뜨고, 그 결과 줄기는 공용 토큰 34px 을 **인라인 없이** 쓴다.
     [4] 그런데 **비용 줄기(`.dn`)는 표본이 될 수 없다** — 150 규약(«긴 문자열은 칸에 눌러 넣는다»)이
         `d.style.fontSize` 를 인라인으로 적어 17~20px 로 눌러 놓는다. 표본 규칙을 «결과 줄기» 로
         못박는 근거가 이 절이다(A1 10~12회차 «계측 정의가 다르면 일치해도 틀린다»).

   §R 되돌림 시험 — 새 표본 자리가 «무르지 않은가»(주입 사본으로 묻는다):
     [R1] `.fx-plus.hb` 에 크기를 손으로 적으면(491 2회차가 되돌린 488 의 그 사고) 결과 줄기가 30px 로 내려간다
     [R2] 결과 줄기를 통째로 끄면 표본이 0장이 된다 — «연출 없음» 도 이 자리에서 잡힌다

   실행: node tools/probe844.js   ·  §R 생략: node tools/probe844.js --no-neg */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const TMP = 'index.844probe.html';
const neg = !process.argv.includes('--no-neg');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 씬 하나를 열고 촘촘히 훑어 «무엇이 떴는가» 를 돌려준다(verify58 의 run 과 같은 규칙 — 씨앗 고정). */
async function shoot(file, scene, span, step) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, 20260828);
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1100);

  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'cos') {
      S.stone = 1e12;
      const a = AVATARS[0].id;
      S.avatars = S.avatars || {}; S.avatars[a] = 1; S.avatar = a;
      goTab('hero'); heroSubGo('cos');
    }
    if (sc === 'beat') {
      const it = SKILLS[0];
      S.own[it.id] = { n: 999999, l: 1 };
      markDirty(); uiDirty = true;
      showSkillDetail(it.id);
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  await p.waitForTimeout(450);
  if (scene === 'cos') {
    /* 재렌더가 핸들을 떼므로 query+click 은 한 evaluate 안에서(LESSONS 25-⑤ · verify58 씬 D 와 같은 세팅) */
    await p.evaluate(() => { const c = document.querySelector('#bCos [data-cosit]'); if (c) c.click(); });
    await p.waitForTimeout(300);
  }
  /* ⚠ 정착을 기다린다 — 세팅이 만진 재화(`S.stone`·`S.gold`)가 **HUD 획득 플로터**(`.fx-plus.ui`, 수명 1.08s)를
     띄운다. 안 기다리면 그 하네스 부산물이 «이 화면의 플로터» 로 세어져 [1-c] 가 헛빨강이 난다
     (verify58 의 run 이 같은 이유로 같은 루프를 돈다 — 자를 흉내 낼 때는 정착 규칙까지 흉내 내야 한다). */
  for (let i = 0, prev = null; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length
      + '|' + (document.getElementById('goldN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const h = await p.evaluate(async ({ sc, span, step }) => {
    const lv0 = S.cnt.levelUps, st0 = S.stone;
    if (sc === 'cos') { const b = document.querySelector('#bCos [data-cosup]'); if (b) b.click(); }
    if (sc === 'beat') {
      const b = document.getElementById('mLv');
      if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }
    const seen = [];
    let plusMax = 0, deltaMax = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < span) {
      await new Promise((r) => setTimeout(r, step));
      const all = [...document.querySelectorAll('.fx-plus')];
      plusMax = Math.max(plusMax, all.length);
      deltaMax = Math.max(deltaMax, document.querySelectorAll('.fx-plus.fx-delta').length);
      for (const el of all) {
        const rec = { cls: el.className, txt: (el.textContent || '').trim(),
          fs: parseFloat(getComputedStyle(el).fontSize), inline: el.style.fontSize || '' };
        if (!seen.some((s) => s.cls === rec.cls && s.txt === rec.txt)) seen.push(rec);
      }
    }
    if (sc === 'beat') dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { seen, plusMax, deltaMax, ups: S.cnt.levelUps - lv0, stone: st0 - S.stone,
      hasDeltaFn: typeof fxDelta === 'function' };
  }, { sc: scene, span, step });

  await b.close();
  return { ...h, errs };
}

/* 제품 소스에서 «주석이 아닌 줄» 만 본다(277 «폐기 식별자» 방식 — 주석 속 예시를 세면 헛빨강이 난다).
   ⚠ 줄머리 `*`·`//` 만 거르면 안 된다 — 이 저장소의 블록 주석은 **여러 줄에 걸쳐 산문**이라
     둘째 줄부터 아무 글자로나 시작한다(실측: 33624·36937·36938·38273 네 줄이 그 꼴로 잡혔다).
     여닫이를 세는 상태 기계로 «주석 안» 을 지운다. */
function codeLines(src) {
  const out = [];
  let inBlock = false;
  src.split('\n').forEach((raw, i) => {
    let s = '', j = 0;
    while (j < raw.length) {
      if (inBlock) {
        const e = raw.indexOf('*/', j);
        if (e < 0) { j = raw.length; } else { inBlock = false; j = e + 2; }
      } else {
        const b = raw.indexOf('/*', j), l = raw.indexOf('//', j);
        if (b >= 0 && (l < 0 || b < l)) { s += raw.slice(j, b); inBlock = true; j = b + 2; }
        else if (l >= 0) { s += raw.slice(j, l); j = raw.length; }
        else { s += raw.slice(j); j = raw.length; }
      }
    }
    s = s.trim();
    if (s) out.push({ n: i + 1, s });
  });
  return out;
}

(async () => {
  console.log('PROBE844 — verify58 [8-b] 씬 D 표본 결손의 갈래 가르기\n');
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[1] ⓑ(표본 문턱) 기각 — 씬 D(50 코스튬 [강화])를 8ms 로 훑는다');
  const cos = await shoot('index.html', 'cos', 1400, 8);
  ok(cos.stone > 0, `[1-a] 전제 — 코스튬 강화가 실제로 났다 (강화석 ${cos.stone} 지출)`);
  ok(cos.deltaMax === 0, `[1-b] 델타 «.fx-plus.fx-delta» 최대 ${cos.deltaMax}장 — 0 이면 «격자가 놓친 것» 이 아니다`);
  ok(cos.plusMax === 0, `[1-c] «.fx-plus» 자체가 최대 ${cos.plusMax}장 — 이 화면엔 어떤 플로터도 없다`);
  ok(cos.errs.length === 0, `[1-d] 콘솔 에러 ${cos.errs.length}건`);

  console.log('\n[2] ⓒ 기각 · ⓐ 확정 — 부품은 살아 있고 «부르는 자» 가 없다(정적)');
  ok(cos.hasDeltaFn, '[2-a] `fxDelta` 함수는 페이지에 살아 있다 (부품이 지워진 게 아니다)');
  ok(/d\.className = 'fx-plus fx-delta';/.test(src),
    "[2-b] 클래스 이름도 그대로다 — `d.className = 'fx-plus fx-delta'` (ⓒ «선택자 부패» 기각)");
  const code = codeLines(src);
  /* `fxUpOk(target, at, txt, …)` — 셋째 인자가 있어야 `fxDelta` 가 돈다. 살아 있는 호출부를 센다. */
  const txtCalls = code.filter((x) => /(?<!function )fxUpOk\(/.test(x.s) && !/^function fxUpOk/.test(x.s))
    .map((x) => ({ n: x.n, s: x.s, args: (x.s.match(/fxUpOk\(([^;]*)\)/) || [, ''])[1] }))
    .filter((x) => {
      const a = x.args.split(',').map((t) => t.trim());
      return a.length >= 3 && a[2] !== 'null' && a[2] !== '' && a[2] !== "''";
    });
  ok(txtCalls.length === 0,
    `[2-c] ★ 텍스트를 넘기는 \`fxUpOk\` 호출부 ${txtCalls.length}곳 — 0 이면 델타는 제품에서 **도달 불가**`
    + (txtCalls.length ? ' — ' + txtCalls.map((x) => x.n).join(',') : ''));
  const dCalls = code.filter((x) => /fxDelta\(/.test(x.s) && !/^function fxDelta/.test(x.s));
  ok(dCalls.length === 1 && /if\(txt\)/.test(dCalls[0].s),
    `[2-d] \`fxDelta(\` 호출부 ${dCalls.length}곳 — \`fxUpOk\` 안의 \`if(txt)\` 한 줄뿐이다`
    + (dCalls.length ? ` (${dCalls.map((x) => x.n).join(',')})` : ''));

  console.log('\n[3] 새 표본 자리 — 08 세부 팝업 [강화] 의 회당 플로터(`.fx-plus.hb`)');
  const beat = await shoot('index.html', 'beat', 1000, 8);
  ok(beat.ups > 0, `[3-a] 전제 — 강화가 실제로 났다 (${beat.ups}회)`);
  const res = beat.seen.filter((s) => /\bhb\b/.test(s.cls) && !/\bdn\b/.test(s.cls));
  const pay = beat.seen.filter((s) => /\bhb\b/.test(s.cls) && /\bdn\b/.test(s.cls));
  ok(res.length >= 1, `[3-b] 결과 줄기 «+1» 이 뜬다 — ${res.length}종 [${res.map((s) => s.txt).join(' ')}]`);
  ok(res.length >= 1 && res.every((s) => Math.abs(s.fs - 34) < 0.6),
    `[3-c] ★ 그 줄기는 공용 토큰 34px 이다 — ${res.map((s) => s.fs).join(' / ')}px`);
  ok(res.length >= 1 && res.every((s) => !s.inline),
    `[3-d] ★ 크기를 자기 자리에 손으로 적지 않았다 — 인라인 font-size ${res.filter((s) => s.inline).length}장`);
  ok(beat.errs.length === 0, `[3-e] 콘솔 에러 ${beat.errs.length}건`);

  console.log('\n[4] 비용 줄기(`.dn`)는 표본이 아니다 — 150 규약이 폭에 맞춰 눌러 놓는다');
  ok(pay.length >= 1, `[4-a] 비용 줄기가 뜬다 — ${pay.length}종 [${pay.slice(0, 3).map((s) => s.txt).join(' ')}]`);
  ok(pay.length >= 1 && pay.every((s) => s.inline && s.fs < 34),
    `[4-b] ★ 그 줄기는 인라인으로 눌려 있다 — ${pay.map((s) => s.fs).slice(0, 4).join(' / ')}px`
    + ` (인라인 ${pay.filter((s) => s.inline).length}/${pay.length}장)`);

  if (neg) {
    const INJ = {
      R1: ["  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : '');",
        "  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : ''); d.style.fontSize = '30px';",
        '크기를 손으로 적으면(488 의 그 사고) 결과 줄기가 34 를 벗어난다'],
      R2: ["  if(txt)  hbFloat(host, txt, ok ? 'ok' : 'no', lone);",
        "  if(false) hbFloat(host, txt, ok ? 'ok' : 'no', lone);",
        '결과 줄기를 끄면 표본이 0장이 된다 — «연출 없음» 도 이 자리에서 잡힌다'],
    };
    for (const k of Object.keys(INJ)) {
      const [from, to, why] = INJ[k];
      console.log(`\n[§${k}] 되돌림 시험 — ${why}`);
      if (src.split(from).length - 1 !== 1) {
        ok(false, `[§${k}] 앵커가 ${src.split(from).length - 1}곳 — 한 곳이어야 한다(조용한 통과 금지)`);
        continue;
      }
      fs.writeFileSync(path.join(ROOT, TMP), src.replace(from, to));
      try {
        const n = await shoot(TMP, 'beat', 1000, 8);
        const r = n.seen.filter((s) => /\bhb\b/.test(s.cls) && !/\bdn\b/.test(s.cls));
        if (k === 'R1') {
          ok(r.length >= 1 && r.every((s) => Math.abs(s.fs - 30) < 0.6),
            `[§R1] 결과 줄기 ${r.map((s) => s.fs).join(' / ')}px — 34 가 아니어야 한다`);
        } else {
          ok(r.length === 0 && n.ups > 0,
            `[§R2] 결과 줄기 ${r.length}장 (강화는 ${n.ups}회 났다) — 0장이어야 한다`);
        }
      } finally { try { fs.unlinkSync(path.join(ROOT, TMP)); } catch (e) {} }
    }
  }

  console.log(`\nPROBE844 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
