/* 작업 179 게이트 — 승급전 팝업 «본문 2배» + «클리어 보상(코스튬·칭호)» 이 실제로 도는지 본다.
   실행: node tools/verify179.js      →  VERIFY179 n/n PASS
   ROUTINE [3]-(가): 레퍼런스 대조가 없는 기능·가독성 작업이라 비평가를 띄우지 않는다.
   대신 «기능 완성 규칙» 이 요구하는 «눌렀을 때 무엇이 바뀌는지» 를 전부 헤드리스로 확인한다.

   [1] 본문 배율   — `.mbody p` 기본 24px 대비 승급전 본문이 정확히 2.00배인가(행높이도 2.00배)
   [2] 넘침        — 도전 계급 7단 전부에서 모달이 한 화면에 드는가(본문 스크롤 0)
   [3] 보상 표시   — 계급마다 코스튬 캔버스가 «그려졌는가»(빈 캔버스 금지) + 칭호 표기가 맞는가
   [4] 보상 지급   — endPromo(true) 가 그 코스튬을 실제로 S.avatars 에 넣는가(= 표시와 지급 일치)
   [5] 중복·기보유 — 이미 보유면 재지급 없음 + 팝업이 «이미 보유» 로 바뀌는가
   [6] 매핑 무결   — PROMO_COS 7칸이 전부 실재 코스튬이고, COS_LIST 의 계급 조건 2건과 어긋나지 않는가 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });   /* 캔버스 픽셀을 읽어야 한다(file:// 오염 해제) */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForFunction(() => typeof openPromo === 'function' && typeof PROMO_COS === 'object');
  await p.waitForTimeout(900);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* 루프가 상태를 되돌리지 못하게 */

  /* ---- [6] 매핑 무결 ---- */
  console.log('[6] 매핑');
  const map = await p.evaluate(() => {
    /* 182 — 표 한 칸이 «1종» 에서 «묶음» 이 됐다. 미리보기 대표는 묶음에서 파생된다(promoCos). */
    const rows = Object.keys(PROMO_COS).map(k => {
      const a = promoCos(+k);
      /* 194 — 등급(`g`) 폐기. 대표가 «묶음의 마지막 칸» 이라는 파생 규칙만 남는다 */
      return { ri: +k, id: a ? a.id : null, ok: !!a, n: a ? a.n : null,
               size: PROMO_COS[k].length, last: PROMO_COS[k][PROMO_COS[k].length - 1],
               pal: a ? a.pal : -1 };
    });
    /* 182 이전 `COS_LIST` 가 못 박아 두었던 계급 조건 2건. 데이터는 폐기됐지만 **약속은 남는다** —
       매핑이 이 두 점에서 벗어나면 «같은 코스튬을 두 규칙이 다르게 준다» 가 된다(179 매핑 근거). */
    const pinned = [{ id: 'av41', v: 3 }, { id: 'av48', v: 6 }].map(q =>
      ({ id: q.id, v: q.v, at: cosRankOf(q.id), inBundle: (PROMO_COS[q.v] || []).indexOf(q.id) >= 0 }));
    const covered = Object.keys(PROMO_COS).reduce((n, k) => n + PROMO_COS[k].length, 0);
    const uniq = new Set([].concat.apply([], Object.keys(PROMO_COS).map(k => PROMO_COS[k]))).size;
    return { rows, pinned, ranks: RANKS.length, covered, uniq, total: AVATARS.length };
  });
  ok(map.rows.length === map.ranks - 1, `승급 ${map.ranks - 1}회 전부에 보상이 있다 (표 ${map.rows.length}칸)`);
  map.rows.forEach(r => ok(r.ok, `PROMO_COS[${r.ri}] 대표 = ${r.id} 는 실재 코스튬 (${r.n} · 묶음 ${r.size}종)`));
  /* 194 — 옛 «대표 등급 = min(ri,5)» 는 등급 폐지로 성립하지 않는다. 그 단언이 실제로 지키던 것은
     «대표가 묶음에서 파생된다(별도 표가 아니다)» 였고(179 «두 벌로 늘리지 말라»), 그건 그대로 잰다.
     색 밴드가 계급을 따라 단조 증가하는 것도 같이 본다 — 179 가 고른 «점점 화려해지는» 미리보기 곡선. */
  map.rows.forEach(r => ok(r.id === r.last,
    `PROMO_COS[${r.ri}] 대표 = 묶음의 마지막 칸 ${r.id} (별도 표 없음)`));
  map.rows.forEach(r => ok(r.pal === Math.min(r.ri, 5),
    `PROMO_COS[${r.ri}] 대표 색 밴드 ${r.pal} = min(${r.ri},5) — 179 미리보기 곡선 유지`));
  map.pinned.forEach(q => ok(q.at === q.v && q.inBundle,
    `구 계급 조건 ${q.id}→rank ${q.v} 를 매핑이 그대로 따른다 (실제 ${q.at})`));
  /* 182 — 구매 경로가 없으므로 «어느 묶음에도 안 든 코스튬» 은 영원히 못 얻는 코스튬이다 */
  ok(map.uniq === map.covered, `묶음에 중복 배정된 코스튬 없음 (${map.covered}칸 / 고유 ${map.uniq}종)`);
  /* av0 «견습 기사» 는 처음부터 입고 있는 기본 외형(DEF().avatars={av0:1})이라 묶음 밖이다 */
  ok(map.uniq === map.total - 1, `기본 외형 av0 을 뺀 49종 전부가 어느 승급전엔가 배정됨 (${map.uniq}/${map.total - 1})`);

  /* ---- [1][2][3] 계급 7단 팝업 ---- */
  console.log('[1][2][3] 팝업 — 본문 배율 · 넘침 · 보상 표시');
  const BASE_FS = 24, BASE_LH = 40.8;      /* 179 이전 실측 — fs 24 · 줄 상자 40.8 (docs/review/179-승급전글씨2배.md §1) */
  for (let ri = 1; ri <= map.ranks - 1; ri++) {
    const r = await p.evaluate(async (ri) => {
      closeModal();
      S.rank = ri - 1;
      const nx = nextRank();
      S.best = Math.max(S.best, nx.stage); S.stage = S.best;
      for (let i = 0; i < 2000 && cp() < nx.cp; i++) { S.lv.atk = (S.lv.atk | 0) + 50; S.lv.hp = (S.lv.hp | 0) + 50; }
      openPromo();
      const box = document.querySelector('#modal .mbox'), mb = document.querySelector('#modal .mbody');
      const ps = [...mb.querySelectorAll('.pr179>p, .pr179 .pr-cond p')];
      /* «잉크 높이» 는 Range 의 줄 상자로 잰다 — 접힌 줄이 섞이면 max 가 흔들리므로
         계산된 line-height(= 줄 상자 높이) 를 같이 본다. 24×1.7=40.8 → 48×1.7=81.6 이 정답이다. */
      const lh = el => +getComputedStyle(el).lineHeight.replace('px', '');
      const cv = mb.querySelector('canvas.cos-cv');
      let inkPx = -1;
      if (cv) {
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        inkPx = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) inkPx++;
      }
      return {
        rank: nx.n, canPromote: canPromote(),
        fs: ps.map(e => +getComputedStyle(e).fontSize.replace('px', '')),
        lh: ps.map(lh),
        scrollH: mb.scrollHeight, clientH: mb.clientHeight, boxH: box.getBoundingClientRect().height,
        cosId: cv ? cv.dataset.cosav : null, cosExp: (promoCos(ri) || {}).id || null, inkPx,
        rwTxt: (mb.querySelector('.pr-rw') || {}).textContent || ''
      };
    }, ri);
    await p.waitForTimeout(60);
    const tag = `계급 ${ri} ${r.rank}`;
    ok(r.fs.length > 0 && r.fs.every(f => Math.abs(f / BASE_FS - 2) < 0.001), `${tag} — 본문 fs 전부 ${BASE_FS}→48 (2.00배)`);
    ok(r.lh.every(h => Math.abs(h / BASE_LH - 2) < 0.02), `${tag} — 줄 상자 ${BASE_LH}→${r.lh[0].toFixed(1)} (2.00배)`);
    ok(r.scrollH <= r.clientH + 1, `${tag} — 본문이 한 화면에 든다 (${r.scrollH}/${r.clientH})`);
    ok(r.boxH <= 1497.5, `${tag} — 모달 ${r.boxH.toFixed(1)} ≤ 1497 (.mbox 상한)`);
    ok(r.cosId === r.cosExp, `${tag} — 미리보기가 매핑된 코스튬 (${r.cosId})`);
    ok(r.inkPx > 500, `${tag} — 스프라이트가 실제로 그려졌다 (불투명 ${r.inkPx}px)`);
    ok(r.rwTxt.includes('클리어 보상') && r.rwTxt.includes('칭호') && r.rwTxt.includes(r.rank),
      `${tag} — «클리어 보상» + 칭호 «${r.rank}» 표기`);
  }

  /* ---- [4] 실제 지급 ---- */
  console.log('[4] 지급 — endPromo(true) 가 보여 준 그 코스튬을 준다');
  for (let ri = 1; ri <= map.ranks - 1; ri++) {
    const r = await p.evaluate((ri) => {
      closeModal();
      S.rank = ri - 1;
      const bundle = PROMO_COS[ri].slice(), exp = (promoCos(ri) || {}).id;
      bundle.forEach(id => delete S.avatars[id]);  /* 묶음 전체를 미보유 상태에서 출발 */
      const before = !!S.avatars[exp];
      promo = { t: 60, max: 60, rank: nextRank() };
      endPromo(true);
      const allGot = bundle.every(id => !!S.avatars[id]);
      const txt = document.querySelector('#modal .mbody').textContent;
      const ttl = rankOf().n;                      /* 칭호 = 도달한 계급(renderProfile 의 own 규칙) */
      closeModal();
      return { exp, bundle: bundle.length, allGot, before, after: !!S.avatars[exp], rank: S.rank, ttl, txt };
    }, ri);
    ok(!r.before && r.after, `계급 ${ri} — 승급 성공으로 대표 ${r.exp} 가 S.avatars 에 들어갔다`);
    ok(r.allGot, `계급 ${ri} — 묶음 ${r.bundle}종이 **전부** 들어갔다(182 — 보여 준 등급을 통째로 준다)`);
    ok(r.rank === ri, `계급 ${ri} — S.rank 가 ${r.rank} 로 올라갔다(= 칭호 «${r.ttl}» 해금)`);
    ok(r.txt.includes('코스튬') && r.txt.includes('칭호'), `계급 ${ri} — 성공 팝업이 코스튬·칭호 획득을 알린다`);
  }

  /* ---- [5] 중복·기보유 ---- */
  console.log('[5] 중복 지급 없음 · 기보유 표기');
  const dup = await p.evaluate(() => {
    closeModal();
    S.rank = 0; const exp = (promoCos(1) || {}).id;
    PROMO_COS[1].forEach(id => { S.avatars[id] = 1; });    /* 묶음 전체를 이미 보유 */
    const g = grantPromoCos(1);
    openPromo();
    const txt = document.querySelector('#modal .mbody').textContent;
    const cnt = Object.keys(S.avatars).filter(k => k === exp).length;
    closeModal();
    return { grant: g.length, cnt, dup: txt.includes('이미 보유') };
  });
  ok(dup.grant === 0, '이미 보유한 코스튬은 재지급하지 않는다 (grantPromoCos → 빈 배열)');
  ok(dup.cnt === 1, 'S.avatars 에 중복 키가 생기지 않는다');
  ok(dup.dup, '팝업이 «(이미 보유)» 로 바뀐다');

  /* ---- [7] 다른 화면 반영 — «기능 완성 규칙»: 저장(S) 뿐 아니라 다른 화면에 보여야 완료다 ---- */
  console.log('[7] 반영 — 50 코스튬 시트 · 19 프로필 칭호 · 보유 효과');
  const refl = await p.evaluate(() => {
    closeModal();
    S.rank = 0; S.avatar = 'av0';
    const exp = (promoCos(1) || {}).id; PROMO_COS[1].forEach(id => delete S.avatars[id]);
    /* bonus() 는 `bonusDirty` 캐시다 — 상태를 바꾼 뒤 무효화하지 않고 읽으면
       앞 케이스(계급 7 · 코스튬 7종)의 값이 그대로 나와 비교가 뒤집힌다 */
    markDirty();
    const atk0 = bonus().atk;
    promo = { t: 60, max: 60, rank: nextRank() };
    endPromo(true); closeModal();

    renderCos();                                    /* 50 코스튬 시트 */
    const card = document.querySelector('#bCos [data-cosit="' + exp + '"]');
    /* 194 — 보유 카드의 진행바는 «보유» 가 아니라 **강화 진행도(Lv/500)** 를 적는다.
       «보유로 그린다» 의 뜻은 그대로다: 자물쇠(.lk) 가 없고 잠금 문구가 아니다. */
    const barTxt = card ? card.querySelector('.sk-bar b').textContent : '';
    const cosOwnUi = !!card && !card.classList.contains('lk')
      && /^\d+\/\d+$/.test(barTxt.trim());

    renderProfile();                                /* 19 프로필 — 칭호 잠금 해제 */
    const cards = [...document.querySelectorAll('#pfCards .pf-card')];
    const ttlOwn = cards[1] && cards[1].classList.contains('own') && !cards[1].querySelector('.pf-lk');
    const ttlEq = cards[1] && cards[1].classList.contains('eq');

    return { cosOwnUi, ttlOwn, ttlEq, atk0, atk1: bonus().atk, id: exp };
  });
  ok(refl.cosOwnUi, `50 코스튬 시트가 ${refl.id} 를 «보유» 로 그린다(자물쇠 없음)`);
  ok(refl.ttlOwn, '19 프로필의 «실버» 칭호 칸이 해금된다(pf-lk 자물쇠 제거)');
  ok(refl.ttlEq, '19 프로필의 «실버» 칭호가 «장착 중» 이 된다');
  ok(refl.atk1 > refl.atk0, `코스튬 보유 효과가 공격 보너스에 반영된다 (${refl.atk0.toFixed(4)} → ${refl.atk1.toFixed(4)})`);

  /* ---- [8] 겹침·잘림 0건 — ROUTINE [3]-(가) 가 기계·기능 작업에 요구하는 유일한 시각 검사 ---- */
  console.log('[8] 겹침 · 잘림');
  for (let ri = 1; ri <= map.ranks - 1; ri++) {
    const g = await p.evaluate((ri) => {
      closeModal(); S.rank = ri - 1; openPromo();
      const mb = document.querySelector('#modal .mbody');
      const mr = mb.getBoundingClientRect();
      const kids = [...mb.querySelectorAll('.pr179>p, .pr179>.pr-cond, .pr179>.pr-rw')];
      const rs = kids.map(e => e.getBoundingClientRect());
      let ov = 0, out = 0;
      for (let i = 0; i < rs.length; i++) {
        if (rs[i].top < mr.top - 0.5 || rs[i].bottom > mr.bottom + 0.5 ||
            rs[i].left < mr.left - 0.5 || rs[i].right > mr.right + 0.5) out++;
        for (let j = i + 1; j < rs.length; j++)
          if (rs[i].bottom > rs[j].top + 0.5 && rs[j].bottom > rs[i].top + 0.5) ov++;
      }
      /* 보상 줄 안쪽 — 스프라이트 상자와 글자 칸이 겹치면 안 된다(flex 라 폭이 모자라면 겹친다) */
      const c = mb.querySelector('.pr-rw-c'), t = mb.querySelector('.pr-rw-t');
      const inner = c && t ? c.getBoundingClientRect().right <= t.getBoundingClientRect().left + 0.5 : true;
      closeModal();
      return { n: rs.length, ov, out, inner };
    }, ri);
    ok(g.ov === 0, `계급 ${ri} — 본문 ${g.n}블록 세로 겹침 0건`);
    ok(g.out === 0, `계급 ${ri} — 본문 밖으로 잘려 나간 블록 0건`);
    ok(g.inner, `계급 ${ri} — 코스튬 그림과 보상 글자가 안 겹친다`);
  }

  /* ---- 다른 모달이 2배를 물려받지 않는지(스코프 누수) ---- */
  console.log('[누수] .pr179 는 승급전 팝업 밖으로 새지 않는다');
  const leak = await p.evaluate(() => {
    closeModal();
    popup('테스트', '<p>보통 본문</p>');
    const fs = +getComputedStyle(document.querySelector('#modal .mbody p')).fontSize.replace('px', '');
    const has = !!document.querySelector('#modal .pr179');
    closeModal();
    return { fs, has };
  });
  ok(leak.fs === 24, `승급전이 아닌 팝업 본문은 24px 그대로 (${leak.fs})`);
  ok(!leak.has, '닫은 뒤 .pr179 래퍼가 남지 않는다');

  ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.join(' | ') : ''));

  await browser.close();
  console.log(`\nVERIFY179 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
