/* 814 채점용 연속 프레임 캡처 — 지시서 [3]-(다)(«연속 프레임 6~8장 · 비평 2인»)

   ⚠⚠ **1회차 캡처는 무효였다**(비평가 CR1·CR2 가 독립으로 잡아냈다):
     ⓐ `all[1].click()` 이 카드를 «선택» 한 게 아니라 **상세 팝업을 열었다** — `cosSel` 기본값이
        `cosBest()` 라 그 카드가 이미 선택돼 있었고, 같은 카드를 다시 누르면 `showCosDetail()` 이다.
        ⇒ 8장 전부 «팝업이 격자를 덮은 화면» 이었고 채점 대상 카드가 **한 픽셀도 없었다**.
     ⓑ 실시간 스크린샷은 한 장에 200~480ms 라, 수명 620ms 짜리 연출이 **1~2프레임**밖에 안 잡혔다
        (2·3·4…장이 바이트 단위로 같았다 — 비평가가 md5 로 그것을 찍었다).
   ⇒ 둘 다 고친다: **선택만 하고**(팝업이 열리면 예외로 멈춘다) · **두 벌**로 찍는다.
     · `-step-1..8` — CSS 애니를 정지시키고 진행도를 직접 준다(0/80/…/560ms). 플래시·팝·델타의
       **시간축이 정확**하다. ⚠ 파티클은 CSS 가 아니라 JS 틱이 움직이므로 이 벌에서는 **정지**다.
     · `-live-1..6` — 실시간(실측 시각을 같이 적는다). 입자가 실제로 어디로 흩어지는지는 이쪽이 답한다.

   ⚠⚠ **3회차 캡처도 절반이 무효였다 — 4회차에 `probe814b` 가 자로 갈랐다.**
     연출 노드의 **수거는 `fxBye()` 의 `setTimeout`**(index.html ~40821)이라 `getAnimations()` 를
     정지시켜도 **실시간 시계는 계속 간다.** 스크린샷 한 장이 300~500ms 라 2번째 프레임을 찍을
     즈음이면 플래시·스파크가 이미 걷힌 뒤고, `step` 8장 중 **살아 있는 프레임이 0~1장**이었다
     (`probe814b` [3-c] — 첫 장이 사는지조차 실행마다 다른 «운» 이다).
     그래서 3회차 비평 2인이 «0% 의 `.84` 트로프가 어디에도 없다»·«카드 본체가 0px 반응한다» 를
     냈다 — **둘 다 죽은 프레임을 잰 것**이고 제품은 그 시각에 실제로 테두리 띠 **+182/255** ·
     속 **+46.6/255** 로 반응하고 있었다. `live` 벌도 판정에는 못 쓴다(수명 620ms 안에 드는
     프레임이 0~1장 · 3회 실행에서 속 봉우리가 12.64 · 6.26 · 0.01 로 널뛴다 — CR4 의 «+49.7%» 와
     CR6 의 «0px» 는 같은 제품의 **두 운**이다).
   ⇒ **`step` 벌에서는 «걷지 않는다»**(`fxl` 레이어 안 노드에 한해 `remove` 무력화). 그러면 8장이
     한 곡선을 그린다 — `probe814b` [3-f] 실측 테 Δ휘도 **182 → 159 → 149 → 127 → 3 → 0 → 0 → 0**.
     ⚠ 이 무력화는 **채점 캡처 전용**이다(제품 0줄). 회귀는 `node tools/probe814b.js`.

   ⚠ 캡처는 커밋하지 않는다(ROUTINE 서두 — `docs/review/*.png` 는 .gitignore).

   실행: node tools/cap814.js [--tag r2] */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'review');
const tagIx = process.argv.indexOf('--tag');
const TAG = tagIx > 0 ? process.argv[tagIx + 1] : 'r2';
const STEPS = [0, 80, 160, 240, 320, 400, 480, 560];   /* 수명 620ms 를 8칸으로 */

async function boot(file) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + path.join(ROOT, file));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;
    S.avatar = AVATARS[0].id;
    S.cosLv = S.cosLv || {};
    for (let i = 0; i < 12; i++) S.cosLv[AVATARS[i].id] = 12;   /* 두 자리 레벨 */
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    try { for (const k in fxSeen) fxSeen[k] = (typeof S[k] === 'number' ? S[k] : fxSeen[k]); } catch (e) {}
  });
  await p.waitForTimeout(400);
  return { b, p };
}

/* 선택만 한다 — **이미 선택된 카드를 누르면 상세 팝업이 열린다**(1회차 사고). */
async function select(p) {
  const r = await p.evaluate(() => {
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all.find((e) => e.dataset.cosit !== cosSel) || all[0];
    el.scrollIntoView({ block: 'center' });
    el.click();
    const sel = document.querySelector('#bCos .sk-card.sel');
    const md = document.querySelector('#modal') || document.querySelector('#mbox');
    const open = !!(md && md.offsetParent !== null);
    const q = sel ? sel.getBoundingClientRect() : null;
    return { open, sel: q ? { x: q.left, y: q.top, w: q.width, h: q.height } : null };
  });
  if (r.open) throw new Error('상세 팝업이 열렸다 — 캡처 무효(1회차 사고 재발)');
  if (!r.sel) throw new Error('선택 카드가 없다');
  return r.sel;
}

const clipOf = (sel) => ({ x: Math.max(0, Math.round(sel.x - 226)), y: Math.max(0, Math.round(sel.y - 150)), width: 620, height: 480 });

/* 4회차 — `step` 벌 전용 «수거 정지»(위 머리말 ⚠⚠). `fxl` 레이어 **안** 노드의 `remove` 만 무력화한다 —
   격자 재렌더·팝업 등 나머지 DOM 은 한 줄도 안 건드린다. */
const FREEZE = () => {
  const inFx = (n) => { try { return !!(n && n.parentNode && n.parentNode.id === 'fxl'); } catch (_) { return false; } };
  const R = Element.prototype.remove, RC = Node.prototype.removeChild;
  Element.prototype.remove = function () { if (inFx(this)) return; return R.call(this); };
  Node.prototype.removeChild = function (c) { if (this && this.id === 'fxl') return c; return RC.call(this, c); };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];

  /* ⚑ 6회차 — 판이 **셋**이다. 5회차 채점은 «판 P(4회차) ↔ 판 A(5회차)» 를 나란히 놓아
     회수량을 두 비평가가 각자 잴 수 있었다(그 표가 5회차 절의 회수 표다). 이번 회차가 바꾼 것도
     한 줄(`--burst-rx`)이므로 **직전 판(p5)** 을 같이 찍는다 — 안 찍으면 «가로가 열렸다» 를
     비평가가 눈으로만 말하게 된다. `pre` 는 814 이전(원 결함)이라 계속 바닥 대조로 둔다. */
  for (const kind of ['now', 'p5', 'pre']) {
    let src = 'index.html';
    if (kind === 'p5') {
      const s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      const A = '#bCos .sk-card{--burst-ry:.315;--burst-sz:.5;--burst-rx:.60}';
      const B = '#bCos .sk-card{--burst-ry:.344;--burst-sz:.7}';
      if (s.indexOf(A) < 0) throw new Error('5회차 판 주입 앵커를 못 찾았다 — ' + A.slice(0, 40));
      src = '.cap814-p5.html';
      fs.writeFileSync(path.join(ROOT, src), s.split(A).join(B));
    }
    if (kind === 'pre') {
      const s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      /* ⚠⚠ 3회차 사고 — «수리 전» 사본이 **호출 한 줄만** 되돌리고 있었다. 그래서 판 B 에도
         2·3회차가 더한 값 줄 팝·앰버가 그대로 살아 있었고, 비평가 둘이 «A 와 B 의 step 2~8 이
         md5 까지 같다 ⇒ 이번 회차가 팝을 1px 도 안 바꿨다» 로 읽었다(CR5 잔존 ⑥ · CR6 «미회수»).
         **대조군이 오염되면 회차의 성과가 통째로 안 보인다.** ⇒ 되돌릴 것을 **넷** 다 되돌린다:
         호출 · 팝 호출 · 팝/앰버 선언 · 그리고 «색을 변수 뒤로 옮긴 것» 까지. */
      const REV = [
        ['fxUpOk(card, card);                            /* 17 «성공» 과 같은 한 세트(58 톤) — 814: 문구는 뺀다 */',
         "fxUpOk(card, card, 'Lv. ' + cosLvOf(cosSel));"],
        ['      cosLvPop();                                    /* 814 — 값이 바뀐 줄이 «방금 갱신됐다» 를 말한다 */\n', ''],
        ['  .sk-clv.fx-cvswap{animation:fxCvSwapS .34s cubic-bezier(.34,1.56,.64,1) both, fxCvLit .34s linear}', ''],
        ['#bCos .sk-card{--burst-ry:.315;--burst-sz:.5;--burst-rx:.60}', '']
      ];
      let rev = s;
      for (const [a, b2] of REV) {
        if (rev.indexOf(a) < 0) throw new Error('수리 전 주입 앵커를 못 찾았다 — ' + a.slice(0, 40));
        rev = rev.split(a).join(b2);
      }
      src = '.cap814-pre.html';
      fs.writeFileSync(path.join(ROOT, src), rev);
    }

    /* ── 벌 1: CSS 진행도 정지 스텝 ─────────────────────────── */
    {
      const { b, p } = await boot(src);
      const sel = await select(p);
      const clip = clipOf(sel);
      await p.evaluate(FREEZE);                    /* 4회차 — 안 하면 2~8번이 «연출이 끝난 카드» 다 */
      await p.evaluate(() => document.querySelector('#bCos [data-cosup]').click());
      for (let i = 0; i < STEPS.length; i++) {
        await p.evaluate((t) => {
          document.getAnimations().forEach((a) => { a.pause(); try { a.currentTime = t; } catch (_) {} });
        }, STEPS[i]);
        await p.screenshot({ path: path.join(OUT, `814-${TAG}-${kind}-step-${i + 1}.png`), clip });
      }
      await p.screenshot({ path: path.join(OUT, `814-${TAG}-${kind}-full.png`) });
      log.push(`${kind}-step-1..8 @ ${STEPS.join('/')}ms (CSS 정지 스텝 · 파티클 정지)`);
      await b.close();
    }

    /* ── 벌 2: 실시간 ──────────────────────────────────────── */
    {
      const { b, p } = await boot(src);
      const sel = await select(p);
      const clip = clipOf(sel);
      const t0 = Date.now();
      await p.evaluate(() => document.querySelector('#bCos [data-cosup]').click());
      const at = [];
      for (let i = 1; i <= 6; i++) {
        at.push(Date.now() - t0);
        await p.screenshot({ path: path.join(OUT, `814-${TAG}-${kind}-live-${i}.png`), clip });
      }
      log.push(`${kind}-live-1..6 @ ${at.join('/')}ms (실시간 · 입자 실제)`);
      await b.close();
    }

    if (kind !== 'now') { try { fs.unlinkSync(path.join(ROOT, src)); } catch (_) {} }
  }

  console.log('CAP814 (' + TAG + ')');
  for (const l of log) console.log('  · ' + l);
  console.log('  · 크롭 620×480 · 배율 1 · 카드 좌상단은 크롭 안 (226,150) · 수명 620ms');
})().catch((e) => { console.error('CAP814 실패 — ' + e.message); process.exit(1); });
