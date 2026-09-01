/* 작업 97 기능 체크 — «버튼을 눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 확인한다.
   (ROUTINE «기능 완성 규칙» — T2 완료 조건은 «만들어 놓음» 이 아니라 «실제로 동작함»)
   실행: node tools/fnchk97.js  → 마지막 줄이 `FNCHK97 n/n PASS` 여야 한다.

   97 은 «카드에 그림 한 장» 이라 새 동작을 만들지 않는다. 그래서 여기서 보는 것은
   **썸네일이 기존 동작을 하나도 갉아먹지 않았는가** 다 — 슬롯이 클릭을 삼키면 카드 진입이 죽고,
   캔버스가 렌더마다 새로 생기면 스크롤·재렌더가 흔들린다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* 123 — «컨텐츠» 탭 카드는 2장(DPS 측정장 + 아레나)이고, 썸네일 캔버스는 3장이다
     (측정장 1 + 아레나의 «마주 본 플레이어 2명» 2). */
  console.log('[1] 하단 탭 «던전» → 던전 페이지 · 서브탭 «컨텐츠» → 카드 2장');
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => $('dunw').classList.contains('on')), '던전 페이지가 열린다');
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(700);
  const n = await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd').length);
  ok(n === 2, `컨텐츠 카드 ${n}장`);
  ok(await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd canvas.thcv').length === 3),
     '카드 2장 전부 썸네일 캔버스가 붙었다 (측정장 1 + 아레나 2 = 3장)');

  console.log('[2] 썸네일이 그려졌다 (빈 캔버스가 아니다) · 틴트가 스프라이트를 배경에 묻지 않게 한다');
  const drawn = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let on = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8) {
      on++; lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    /* 카드 배경(--i)의 휘도 — 틴트는 multiply 라 어두운 색을 곱하면 배경보다 어두워진다 */
    const bg = getComputedStyle(cv.closest('.dnc')).getPropertyValue('--i').trim();
    const m = bg.match(/^#(\w{2})(\w{2})(\w{2})$/);
    const bl = m ? 0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16) : 0;
    return { cover: +(on / (cv.width * cv.height)).toFixed(3), lum: +(lum / on).toFixed(1), bg, bl: +bl.toFixed(1) };
  }));
  drawn.forEach((c, i) => {
    ok(c.cover > 0.2, `카드${i + 1} 잉크 채움률 ${c.cover} (> 0.2)`);
    ok(c.lum > c.bl - 20, `카드${i + 1} 잉크 평균 휘도 ${c.lum} vs 배경 ${c.bg} ${c.bl} (묻히지 않는다)`);
  });

  console.log('[3] 썸네일 위를 눌러도 카드가 눌린다 (슬롯이 클릭을 삼키지 않는다)');
  const opened = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd');
    const r = c.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + 820, r.top + 180);
    const card = t && t.closest('.dnc');
    if (card) card.click();
    /* 617 — 눌린 카드의 id 를 같이 들고 나온다. [4] 의 기대값이 여기서 온다
       («무엇을 눌렀는지» 를 클릭 **전에** 확정해 두어야 «엉뚱한 카드가 열렸다» 를 잡는다). */
    return { tag: t ? t.className : null, hitCard: !!card, rcard: c.dataset.rcard || null };
  });
  await p.waitForTimeout(500);
  ok(opened.hitCard, `썸네일 위 히트 타깃이 카드다 (맞은 요소: ${opened.tag})`);
  ok(await p.evaluate(() => $('dgdw').classList.contains('on')), '04 세부 팝업이 실제로 열렸다');

  /* 617 (2026-09-01) — 여기 「60초」가 리터럴로 박혀 있어 빨간 채 굳어 있었다.
     제품이 옳고 자가 낡은 것이다: 264 에서 주인이 «dps 적은 안 죽고 데미지만 30초 만에 얼마나
     넣는지 측정하는 용» 이라고 초를 직접 못박았고, `RAIDS` 선언 옆 주석도 그 지시를 인용해 둔다.
     이 절이 묻는 것은 «초가 몇인가» 가 아니라 «**눌린 카드의** 세부가 열렸는가» 이므로
     기대값을 **눌린 카드 id 로 제품 표(`RAIDS`)에서 파생**시킨다(316·443 선례 —
     하네스가 제품 상수를 읽으면 초가 또 바뀌어도 게이트가 안 부패한다).
     ⚠ 파생이 «그린 것 = 선언» 이 되지 않게 두 겹으로 막았다:
       ⓐ id 는 **클릭 전에** 읽은 것이라 다른 카드가 열리면 제목이 그 자리에서 어긋난다.
       ⓑ 표에서 못 찾거나 모양이 깨지면 그 자체가 실패다 — 표본이 사라져도 조용히 초록이 되는
          공허한 항이 되지 않게(422 «음성항이 공허하다» 계열). */
  console.log('[4] 세부 팝업 내용이 그 레이드다 (엉뚱한 카드가 열리지 않는다)');
  const dg = await p.evaluate((id) => {
    const r = (typeof RAIDS !== 'undefined' && RAIDS.find((x) => x.id === id)) || null;
    return { t: $('dgdTitle').textContent, f: $('dgdFloor').textContent,
             en: r ? r.n : null, ef: r ? r.sec + '초' : null };
  }, opened.rcard);
  ok(!!dg.en && /^[0-9]+초$/.test(dg.ef || ''),
     `기대값을 제품 표에서 읽었다 — 카드 «${opened.rcard}» → «${dg.en}» · «${dg.ef}»`);
  ok(dg.t === dg.en && dg.f === dg.ef,
     `제목 «${dg.t}» · 제한 시간 «${dg.f}» (제품 기대 «${dg.en}» · «${dg.ef}»)`);
  await p.evaluate(() => { const x = document.querySelector('#dgdw .x, #dgdw [data-close]');
    if (x) x.click(); else $('dgdw').classList.remove('on'); });
  await p.waitForTimeout(400);

  /* 213 (2026-08-27) — 이 절은 «모달이 뜨나» 를 묻고 있었다. 149(주인 지시)가 «부족·잠김 같은
     한 줄 안내는 팝업이 아니라 토스트» 로 뒤집었으므로 그 물음은 원리적으로 항상 false 다
     (게이트 부패 — LESSONS 185-④ «설계가 뒤집힌 단언은 지우지 말고 이사시켜라»).
     묻는 것은 그대로 «해금 조건을 화면이 말하는가» 이고, 재는 자리만 `.modal` → `.fx-toast` 로 옮긴다.
     · 기대 문구는 리터럴로 박지 않고 **게임 데이터에서 계산**한다(185-① — `ARENA.open`/`r.open`).
     · 대기는 토스트 수명에 걸려 있다(760ms 퇴장 시작 · 1060ms 제거) → 300ms(185-⑥).
     · 덤으로 «모달은 안 뜬다» 를 같이 박는다 — 팝업으로 되돌아가면 그 자리에서 잡힌다. */
  console.log('[5] 잠금 카드 — 썸네일 위를 눌러도 «해금 조건» 안내가 뜬다 (149 토스트)');
  const lk = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('#dunList .dnc.rd')];
    const c = cs.find((x) => x.querySelector('.lk'));
    if (!c) return { none: true };
    const id = c.dataset.rcard || (c.dataset.arena ? 'arena' : '?');
    /* 해금 조건은 그 카드의 게임 데이터에서 읽는다 — 게이트가 «그때의 값» 을 굳히지 않게 */
    const need = id === 'arena' ? ARENA.open : (RAIDS.find((r) => r.id === id) || {}).open;
    const r = c.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + 820, r.top + 180);
    (t.closest('.dnc') || c).click();
    return { id, need };
  });
  await p.waitForTimeout(300);
  ok(!lk.none, `잠긴 «컨텐츠» 카드가 있다 (${lk.id} — 스테이지 ${lk.need} 필요)`);
  const mo = await p.evaluate(() => ({
    toast: [...document.querySelectorAll('#fxl .fx-toast')].map((e) => e.textContent).join(' | '),
    modal: !!document.querySelector('.modal.on, #modal.on') }));
  /* 「스테이지 <필요값>」이 문구에 들어 있어야 «해금 조건» 을 말한 것이다 (숫자만 세면 «현재 n» 에 걸린다) */
  ok(mo.toast.includes('스테이지 ' + lk.need),
     `잠금 안내 토스트가 해금 조건을 말한다 («${mo.toast}»)`);
  ok(!mo.modal, `잠금 안내는 팝업이 아니다 (149 — 모달 ${mo.modal ? '떴다' : '안 뜬다'})`);
  await p.evaluate(() => { document.querySelectorAll('#fxl .fx-toast').forEach((e) => e.remove());
    document.querySelectorAll('.modal.on').forEach((m) => m.classList.remove('on')); });
  await p.waitForTimeout(300);

  console.log('[6] 해금되면 같은 카드가 세부 팝업으로 들어간다 (S 반영)');
  await p.evaluate(() => { S.best = 999; setDunSub('raid'); });
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd .lk').length === 0),
     '스테이지 999 에서 잠금 카드 0장');
  ok(await p.evaluate(() => document.querySelectorAll('#dunList canvas.thcv').length === 3),
     '해금 후에도 썸네일 3장 유지 (재렌더에서 사라지지 않는다)');

  console.log('[7] 최고 DPS 기록이 카드에 반영되고 썸네일과 겹치지 않는다');
  await p.evaluate(() => { S.raidBest = { r60: { dmg: 9.9e14, dps: 9.9e12 } }; setDunSub('raid'); });
  await p.waitForTimeout(600);
  const rec = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd');
    const cr = c.getBoundingClientRect();
    const sp = c.querySelector('.sp.tk'), th = c.querySelector('.th');
    return { txt: sp.querySelector('i').textContent,
             gap: +(th.getBoundingClientRect().left - sp.getBoundingClientRect().right).toFixed(1) };
  });
  ok(rec.txt !== '-' && rec.txt.length > 1, `최고 DPS 칸에 기록이 찍힌다 (${rec.txt})`);
  ok(rec.gap > 0, `기록 알약 우단 ~ 썸네일 좌단 간격 ${rec.gap}px (겹침 0)`);

  console.log('[8] 서브탭 «던전» 복귀 — 던전 카드가 그대로 돌아온다');
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="dun"]').click());
  await p.waitForTimeout(600);
  /* 140 — 72 가 `6efe9e8` 에서 `.dnc>.th>em`(이모지) → `.dnc>.th>canvas.thcv`(스프라이트)로 갈았고,
     이 항목은 «이모지 6 · 캔버스 0» 을 계속 단언해 판정이 정확히 뒤집혀 있었다(19/20 FAIL).
     72 워커도 같은 시각 곁가지로 «이모지 0 · 캔버스 6» 으로 옮겼다(`343ff0c`) — 그 단언은 그대로 살리고,
     여기에 «칸이 실제로 채워졌나» 를 더한다. 캔버스가 «있다» 와 «그려졌다» 는 다르고,
     이 항목이 원래 보려던 것은 재렌더 뒤에도 썸네일이 죽지 않았나 이기 때문이다.
     기준은 139 가 verify90 에, 72 가 verify72 §1-2 에 쓴 것과 같다 — 캔버스가 있고 알파>8 픽셀 ≥ 1.
     «레이드 캔버스 0» 은 `.dnc.rd` 0장(rd)이 직접 담보한다(전역 `canvas.thcv` 개수는
     72 이후 던전 카드 자신의 썸네일까지 세어 원리적으로 통과 불가인 대리 지표였다). */
  const dn = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#dunList .dnc')];
    const drawn = cards.filter((c) => {
      const cv = c.querySelector('.th canvas.thcv');
      if (!cv || !cv.width || !cv.height) return false;
      let im;
      try { im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; }
      catch (e) { return false; }            /* 캔버스 오염 = 못 읽음 = 통과시키지 않는다 */
      for (let i = 3; i < im.length; i += 4) if (im[i] > 8) return true;
      return false;
    }).length;
    return { n: cards.length,
             rd: document.querySelectorAll('#dunList .dnc.rd').length,
             em: document.querySelectorAll('#dunList .dnc>.th>em').length,
             drawn };
  });
  /* 194 — 강화석 던전이 붙어 6 → 7장. «몇 장인가» 가 아니라 «전부 스프라이트로 그려졌는가» 가 이 절의 뜻이므로
     개수를 박지 않고 «카드 수 == 그려진 수» 로 잰다(다음 던전에서 또 빨개지지 않게). */
  ok(dn.n >= 6 && dn.rd === 0 && dn.em === 0 && dn.drawn === dn.n,
     `던전 카드 ${dn.n}장 · 레이드 카드 ${dn.rd}장 · 이모지 ${dn.em} · 썸네일(.th>canvas.thcv) ${dn.drawn}장 실제로 그려짐`);

  console.log('[9] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nFNCHK97 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
