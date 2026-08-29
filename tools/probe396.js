/* 작업 396 재현기 — `verify216` 이 «폭 클램프(`fitNum`)가 통째로 사라지는 것» 을 잡는가.
   실행: node tools/probe396.js  → 마지막 줄이 `PROBE396 n/n PASS`.

   338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 세우거나 기각한다.
   등재문(2026-08-29, 393 곁다리) 가설: «`raidFitNums` 를 통째로 지워도 216 은 35/35 다».

   여기서 묻는 것:
     ⓐ 클램프를 떼면 §4 의 두 항 중 무엇이 어떻게 움직이나 (등재문 가설의 검정)
     ⓑ §4-c 는 클램프가 없어도 초록인가 (공허한 항인가)
     ⓒ §5 아레나는 클램프 제거에 정말 둔감한가 (`probe393` [ⓕ] 재확인 — 우리 자로 다시)
     ⓓ 지금 트리에서 클램프가 **실제로 개입하는 살아 있는 자리**가 하나라도 있나
        (§5 를 갈아 끼울 자리가 있는지 — 333 처방의 예외 조건 판정) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.best = 999; document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(600);

  /* verify216 의 geo 와 같은 정의(같은 것을 재야 «자가 무엇을 볼지» 를 말할 수 있다) */
  const geo = (sel) => p.evaluate((s) => {
    const c = document.querySelector(s);
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cr = c.getBoundingClientRect(), sc = cr.width / 980;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const ink = rg.getBoundingClientRect();
    const padR = parseFloat(getComputedStyle(sp).paddingRight) || 0;
    const fsNow = parseFloat(getComputedStyle(i).fontSize) || 0;
    const inline = i.style.fontSize || '';
    i.style.fontSize = '';
    const base = parseFloat(getComputedStyle(i).fontSize) || 0;
    i.style.fontSize = inline;
    return {
      txt: i.textContent, len: i.textContent.length,
      fs: +fsNow.toFixed(2), base: +base.toFixed(2), inline,
      gap: +((th.getBoundingClientRect().left - ink.right) / sc - padR).toFixed(1),
      floor: +(fsNow <= base * FITMIN + 0.01),
    };
  }, sel);
  const setDps = async (v) => { await p.evaluate((x) => {
    S.raidBest = { r60: { dmg: x * 60, dps: x } }; setDunSub('raid');
  }, v); await p.waitForTimeout(120); };
  const revert = () => p.evaluate(() => {
    window.__rrp396 = window.__rrp396 || renderRaidPage;
    const src = window.__rrp396.toString().replace('fmtB(b.dps)', 'fmt(b.dps)');
    window.renderRaidPage = new Function('return (' + src + ')')();
    return /fmt\(b\.dps\)/.test(String(window.renderRaidPage));
  });
  const unrevert = () => p.evaluate(() => { window.renderRaidPage = window.__rrp396; });
  /* 클램프를 «떼는» 손잡이 — 제품 파일을 안 건드리고 같은 결과를 만든다(probe393 [ⓕ] 방식).
     ⚠ 캐시(dataset.fitT/fitB)와 이미 눌러 둔 인라인을 같이 비워야 «없는 판» 이 된다. */
  const clampOff = () => p.evaluate(() => {
    if (!window.__fit396) window.__fit396 = window.fitNum;
    window.fitNum = function () {};
    document.querySelectorAll('#dunList .dnc .sp>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;
    });
  });
  const clampOn = () => p.evaluate(() => {
    if (window.__fit396) window.fitNum = window.__fit396;
    document.querySelectorAll('#dunList .dnc .sp>i').forEach((i) => {
      i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;
    });
  });

  console.log('[ⓐ] 등재문 검정 — 클램프를 떼면 §4 의 두 항이 어떻게 움직이나');
  await revert();
  await setDps(9.9e16);                       /* 393 이 찾아 둔 «살아 있는 침범 표본» 22자 */
  const on22 = await geo('#dunList .dnc.rd');
  console.log(`      클램프 있는 판: «${on22.txt.slice(0, 14)}…» ${on22.len}자 fs ${on22.fs}`
            + ` (base ${on22.base}) 인라인 ${on22.inline || '없음'} 여백 ${on22.gap}`);
  ok(on22.gap < 0 && on22.floor === 1,
     `클램프 있는 판 — 여백 ${on22.gap}px < 0 이고 바닥(${on22.fs}px)에 서 있다 = §4 두 항 모두 초록`);
  await clampOff();
  await setDps(9.9e16);
  const off22 = await geo('#dunList .dnc.rd');
  console.log(`      클램프 없는 판: fs ${off22.fs} (base ${off22.base}) 인라인 ${off22.inline || '없음'} 여백 ${off22.gap}`);
  ok(off22.gap < 0,
     `클램프 없는 판 — «침범이 난다» 는 여전히 참이다(여백 ${off22.gap}px) ⇒ §4 첫 항은 제거를 **못 잡는다**`);
  ok(off22.floor === 0 && !off22.inline && Math.abs(off22.fs - off22.base) < 0.01,
     `그런데 바닥에는 **안 서 있다**(fs ${off22.fs} = base ${off22.base} · 인라인 없음)`
     + ` ⇒ §4 둘째 항(«바닥에 서 있다»)은 빨개진다 = 등재문의 «35/35» 는 사실이 아니다(실측 34/35)`);

  console.log('[ⓑ] §4-c 는 공허한가 — 클램프가 없어도 base 41 판이 초록인가');
  const base41 = async () => {
    await p.evaluate(() => {
      if (!document.getElementById('p396')) {
        const st = document.createElement('style'); st.id = 'p396';
        st.textContent = '.dnc .sp>i{font-size:41px}';       /* ⚠ !important 금지(probe393 주석) */
        document.head.appendChild(st);
      }
      document.querySelectorAll('#dunList .dnc.rd .sp.tk>i').forEach((i) => {
        i.style.fontSize = ''; delete i.dataset.fitT; delete i.dataset.fitB;
      });
      raidFitNums();
    });
    await p.waitForTimeout(120);
    return geo('#dunList .dnc.rd');
  };
  await setDps(9.9e15);                       /* 등재문의 21자 */
  const off41 = await base41();
  console.log(`      클램프 없는 판 · base 41: fs ${off41.fs} 인라인 ${off41.inline || '없음'} 여백 ${off41.gap}`);
  ok(off41.gap < 0 && off41.len === 21,
     `§4-c 의 기대(«21자가 다시 침범한다» = 여백 ${off41.gap}px < 0)가 **클램프가 없어도 그대로 참**이다`
     + ` ⇒ [4-c] 는 클램프 제거를 못 잡는 공허한 항이다`);
  ok(off41.floor === 0 && !off41.inline,
     `단 그 판은 바닥(base × FITMIN = ${(off41.base * 0.55).toFixed(2)})이 아니라 base 그대로다(fs ${off41.fs})`
     + ` ⇒ [4-c] 에 «바닥에 서 있다» 를 한 항 더 얹으면 제거가 잡힌다`);
  await p.evaluate(() => { const e = document.getElementById('p396'); if (e) e.remove(); });
  await clampOn();
  await setDps(9.9e15);
  const on41 = await base41();
  ok(on41.gap < 0 && on41.floor === 1 && !!on41.inline,
     `대조 — 클램프가 있으면 같은 판이 인라인 ${on41.inline} 로 바닥(${on41.fs}px)에 서고 여백 ${on41.gap}px`);
  await p.evaluate(() => { const e = document.getElementById('p396'); if (e) e.remove(); });
  await unrevert();

  console.log('[ⓒ] §5 아레나 — 클램프 제거에 둔감하다(probe393 [ⓕ] 재확인)');
  const arn = () => p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd.arn2');
    const sp = c.querySelector('.sp.tk'), i = sp.querySelector('i'), th = c.querySelector('.th');
    const cr = c.getBoundingClientRect(), sc = cr.width / 980;
    const rg = document.createRange(); rg.selectNodeContents(i);
    return { txt: i.textContent, inline: i.style.fontSize || '',
      gap: +((th.getBoundingClientRect().left - rg.getBoundingClientRect().right) / sc
        - (parseFloat(getComputedStyle(sp).paddingRight) || 0)).toFixed(1) };
  });
  await p.evaluate(() => { S.arena = { w: 99999, l: 99999 }; setDunSub('raid'); });
  await p.waitForTimeout(200);
  const arnOn = await arn();
  await clampOff();
  await p.evaluate(() => { S.arena = { w: 99999, l: 99999 }; setDunSub('raid'); });
  await p.waitForTimeout(200);
  const arnOff = await arn();
  ok(arnOn.gap === arnOff.gap && !arnOn.inline,
     `아레나 전적 «${arnOn.txt}» 여백 ${arnOn.gap} → ${arnOff.gap} (Δ0 · 인라인 없음)`
     + ` ⇒ §5 는 클램프 제거를 못 잡는다`);
  await clampOn();

  console.log('[ⓓ] 살아 있는 클램프 자리 — 인라인 font-size 가 붙는 노드를 03 화면 전수로 센다');
  /* 제품 표기(fmtB)로 정상 렌더한 상태에서, 클램프가 실제로 개입한 노드 = 인라인 fs 가 붙은 노드 */
  const live = await p.evaluate(() => {
    S.raidBest = { r60: { dmg: 9.9e39 * 60, dps: 9.9e39 } };
    S.arena = { w: 99999, l: 99999 };
    setDunSub('raid');
    const dun = [...document.querySelectorAll('#dunList .dnc .sp>i')];
    setDunSub('dun');
    const dun2 = [...document.querySelectorAll('#dunList .dnc .sp>i')];
    const n = (a) => a.filter((i) => i.style.fontSize).length;
    return { raidAll: dun.length, raidFit: n(dun), dunAll: dun2.length, dunFit: n(dun2) };
  });
  await p.waitForTimeout(200);
  console.log(`      컨텐츠 탭 알약 ${live.raidAll}개 중 클램프 개입 ${live.raidFit}개`
            + ` · 던전 탭 알약 ${live.dunAll}개 중 ${live.dunFit}개`);
  ok(live.raidFit === 0 && live.dunFit === 0,
     `03 화면 알약 ${live.raidAll + live.dunAll}개 어디에도 클램프가 개입하지 않는다`
     + ` ⇒ §5 를 «살아 있는 표본» 으로 갈아 끼울 자리가 이 화면에는 없다(333 처방의 예외 조건)`);

  console.log(`\nPROBE396 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
