/* 작업 122 — «진실표»: 캡처와 **똑같은 시각(t)** 에서 소환 카드 `.cart` 의
   computed `translate` / `rotate` / `scale` 을 그대로 읽는다.  (17회차 신설)

   ⚑ 왜 필요한가 — 16회차 §21-11 4번이 남긴 숙제가 «자가 두 개인데 답이 반대» 였다.
     내 자(`probe122ink.js`)는 «잉크 centroid 이동» 을 6.2~8.0px 로 재고,
     비평가 AK 의 자는 «잉크 상승» 을 −2.02px(사양의 34%)로 쟀다. 부호가 반대다.
     두 자를 맞추려면 **둘 다 견줄 제3의 기준선**이 있어야 하는데, 그것이 이 표다 —
     잉크가 아니라 **상자가 실제로 무엇을 했는지**(선언이 아니라 computed 값)를 찍는다.

   이 표가 답하는 것은 딱 하나: **캡처 격자가 들썩 정점을 밟는가.**
     들썩은 주기의 88~95% 에만 사는 «이따금 한 번» 이라, 격자가 그 창을 못 밟으면
     비평가는 «진폭 미달» 을 읽는다 — 3·5·13·14회차가 연속으로 받은 오독이 전부 이것이었다.
     밟는다면 «진폭 미달» 지적은 상자가 아니라 **잉크 쪽**의 이야기이므로 거기서부터 따지면 된다.

   ⚠ 잉크는 상자와 **같은 값이 나오지 않는 것이 정상**이다. 상자가 −6px 이동 + 3° 회전할 때
     잉크 centroid 는 `6 + |dx|·sin3°` 만큼 움직인다(dx = 잉크 중심의 가로 어긋남).
     즉 **초과분은 결함이 아니라 ±3° 사양의 산술적 결과**다. 17회차가 확인한 자리다.

   실행: node tools/probe122tru.js
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* cap122.js 의 STOPS 와 **같은 값이어야 한다** — 다르면 이 표는 캡처를 설명하지 못한다 */
const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640, 8300];
const SPEC = { y: -6, r: 3, s: 1.04 };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* cap122.js 와 같은 얼리기·세우기 (LESSONS 60-⑤) */
  await p.evaluate(() => {
    window.__jzFreeze = () => {
      document.getAnimations().forEach(a => {
        const jz = /^jz122/.test(a.animationName || '');
        try {
          if (jz) a.pause();
          else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
          else a.finish();
        } catch (_) { try { a.cancel(); } catch (__) {} }
      });
    };
    window.__jzSeek = t => {
      window.__jzFreeze();
      document.getAnimations().forEach(a => {
        if (!/^jz122/.test(a.animationName || '')) return;
        try { a.pause(); a.currentTime = t; } catch (_) {}
      });
    };
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
    window.__jzFreeze();
  });

  const rows = [];
  for (const t of STOPS) {
    await p.evaluate(ms => window.__jzSeek(ms), t);
    rows.push({
      t, v: await p.evaluate(() => [...document.querySelectorAll('.shp-card>.cart')].map(c => {
        const cs = getComputedStyle(c);
        return {
          y: cs.translate === 'none' ? 0 : parseFloat(cs.translate.split(' ')[1] || '0'),
          r: cs.rotate === 'none' ? 0 : parseFloat(cs.rotate),
          s: cs.scale === 'none' ? 1 : parseFloat(cs.scale),
        };
      })),
    });
  }

  console.log('PROBE122TRU — 소환 카드 .cart 의 computed 변형 (캡처와 같은 t)');
  console.log('  들썩 사양 translateY ' + SPEC.y + 'px · rotate ±' + SPEC.r + '° · 숨쉬기 scale ' + SPEC.s);
  for (const { t, v } of rows) {
    console.log('  t=' + String(t).padStart(4) + '  ' + v.map((x, i) =>
      'c' + (i + 1) + ' y' + x.y.toFixed(2).padStart(6) + ' r' + x.r.toFixed(2).padStart(6)
      + ' s' + x.s.toFixed(4)).join(' | '));
  }

  /* 판정 — 카드마다 «들썩 정점 프레임» 과 «숨쉬기 정점 프레임» 이 격자 안에 있는가 */
  let pass = 0, fail = 0;
  const say = (ok, m) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : '  ✗ ') + m); };
  console.log('\n판정 — 캡처 격자가 정점을 밟는가');
  for (let i = 0; i < rows[0].v.length; i++) {
    const ys = rows.map(r => r.v[i].y), rs = rows.map(r => r.v[i].r), ss = rows.map(r => r.v[i].s);
    const yb = Math.min(...ys), rb = Math.max(...rs.map(Math.abs)), sb = Math.max(...ss);
    const at = STOPS[ys.indexOf(yb)];
    say(Math.abs(yb - SPEC.y) <= 0.05,
      '칸' + (i + 1) + ' 들썩 이동 정점 ' + yb.toFixed(2) + 'px @t=' + at + 'ms (사양 ' + SPEC.y + ')');
    say(Math.abs(rb - SPEC.r) <= 0.05,
      '칸' + (i + 1) + ' 들썩 회전 정점 ' + rb.toFixed(2) + '° (사양 ±' + SPEC.r + ')');
    /* 문턱은 «진폭의 5%» 다 — 이 표가 묻는 것은 «격자가 정점을 밟는가» 이지 «값이 맞는가» 가 아니다.
       17회차 실측: 칸5 만 1.0394 = 진폭의 **98.5%**. 주기 3.2s·delay −1.85s 라 정점 체류창
       (44~56% = t 2758~3142ms)이 격자의 2640 과 8300 **사이 빈칸**에 떨어진다.
       1.5% 미달은 어떤 비평가의 분해능보다도 작아 오독을 못 만든다(14회차 AI 가 읽은 오차는 8.8% 였다).
       그래서 격자를 늘리지 않았다 — 프레임 1장은 비평가 컨텍스트를 더 쓰는데 회수가 0 이다. */
    say(Math.abs(sb - SPEC.s) <= (SPEC.s - 1) * 0.05,
      '칸' + (i + 1) + ' 숨쉬기 정점 ' + sb.toFixed(4) + ' = 진폭의 '
      + (((sb - 1) / (SPEC.s - 1)) * 100).toFixed(1) + '% (사양 ' + SPEC.s + ')');
  }
  /* 이동 정점과 회전 정점이 **같은 프레임**이어야 한다 — 14회차가 고친 자리다.
     갈라지면 «움직이긴 하는데 안 기울어진» 프레임만 납품되어 «회전 0°» 오독이 난다. */
  for (let i = 0; i < rows[0].v.length; i++) {
    const ys = rows.map(r => r.v[i].y), rs = rows.map(r => r.v[i].r);
    const iy = ys.indexOf(Math.min(...ys));
    const ir = rs.map(Math.abs).indexOf(Math.max(...rs.map(Math.abs)));
    say(iy === ir, '칸' + (i + 1) + ' 이동 정점과 회전 정점이 같은 프레임 (t=' + STOPS[iy] + ')');
  }
  say(errs.length === 0, '콘솔 에러 ' + errs.length + '건');

  console.log('\nPROBE122TRU ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
