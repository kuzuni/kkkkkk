/* 작업 87 — 코스튬 50종 확장 검증 게이트 (지시서 [3]-(가): 레퍼런스 대조가 아니라 «동작·수치» 검사)
 *
 *   node tools/verify87.js
 *
 * 검사 항목
 *   §1 데이터   — 50종 이상 · id 유일 · 구 6종(av0~av5) **이름** 보존 · 194 등급 폐지 확인
 *                 (194: 효과 값은 전 코스튬 동일 · `a.g` 폐기 · `a.pal` 은 색 파라미터일 뿐)
 *                 (182 — `cost`·`req` 는 구매 폐지와 함께 데이터째 사라졌다. 대신 «50종 전부가
 *                  계급 축 하나로 획득 조건을 갖는가» 를 본다)
 *   §2 틴트     — 50색 쌍별 CIE76 ΔE 최소값(색상환 배분이 실제로 구분되는지) · 밴드 안 최소값
 *   §3 밸런스   — 전부 보유 시 bonus() 배수 상한 검산(atk/hp/gold)
 *   §4 실동작   — 착용 전환 · 획득 조건(계급 축) 거부/허용 · [승급전] 버튼 · 저장·재로드 보존
 *                 (182 — 구매 3항목은 경로째 폐기. 지급 실동작은 `tools/verify182.js` 가 소유한다)
 *   §5 색 일치  — 격자 카드(lite 경로) 픽셀 == 전투/79/80 이 쓰는 tinted() 경로 픽셀
 *   §6 구 세이브 — 6종 시절 세이브가 그대로 로드되고 보유·착용·보너스가 유지됨
 *   §7 UI       — 50칸 격자가 전부 그려짐 · **등급 섹션 헤더 0개(194 폐지)** · 격자 내부 스크롤 · 잠금 표기
 */
const path = require('path');
/* 127 — 여기 복붙돼 있던 모듈 해석 블록은 «모듈» 만 찾고 «브라우저 바이너리» 는 안 찾아서,
   드라이버가 기대하는 빌드(chromium-1234)와 러너에 깔린 빌드(chromium-1194)가 다르면
   `Executable doesn't exist` 로 즉사했다. 해석 + 폴백 둘 다 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 구 6종의 «고정값» — 이 표와 어긋나면 구 세이브의 체감이 바뀐 것이다.
   182 — 가격 열은 뺐다(구매 폐지로 `cost` 필드 자체가 없다). 체감을 만드는 값 3개는 그대로다. */
/* 194 — 등급·등급별 효과가 폐기돼 «구 6종 보존» 은 **이름과 색 밴드**만 남았다.
   (효과 값은 이제 전 코스튬 동일 = COS_OWN. 그 «동일함» 자체를 아래에서 따로 잰다) */
const LEGACY = {
  av0: ['견습 기사',   0],
  av1: ['강철 기사',   1],
  av2: ['백은의 용사', 2],
  av3: ['흑염 기사',   3],
  av4: ['용살자',      4],
  av5: ['신성 기사',   5]
};

/* sRGB hex → CIE Lab → CIE76 ΔE */
function lab(hex) {
  let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  [r, g, b] = [r, g, b].map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722),
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

(async () => {
  /* file:// 에서 아틀라스를 그린 캔버스는 기본적으로 «오염» 되어 getImageData 가 막힌다(§5·§7 이 픽셀을 읽는다) */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ---------------- §1 데이터 ---------------- */
  console.log('\n§1 데이터');
  const data = await page.evaluate(() => AVATARS.map(a =>
    ({ id: a.id, n: a.n, g: a.g === undefined ? null : a.g, pal: a.pal, tint: a.tint,
       atk: a.atk, hp: a.hp, gold: a.gold,
       cost: a.cost === undefined ? null : a.cost, req: a.req || null, rank: cosRankOf(a.id),
       off: cosOff(a.id) })));                                        /* 275 — 미출시 갈림 */
  const OWN = await page.evaluate(() => ({ atk: COS_OWN.atk, hp: COS_OWN.hp, gold: COS_OWN.gold }));
  ok(data.length >= 50, '코스튬 ' + data.length + '종 (>= 50)');
  ok(new Set(data.map(a => a.id)).size === data.length, 'id 유일 ' + new Set(data.map(a => a.id)).size + '/' + data.length);
  let legOk = true;
  Object.keys(LEGACY).forEach(id => {
    const a = data.find(x => x.id === id), L = LEGACY[id];
    const same = a && a.n === L[0] && a.pal === L[1];
    if (!same) { legOk = false; console.log('    ' + id + ' 변경됨: ' + JSON.stringify(a)); }
  });
  ok(legOk, '구 6종(av0~av5) 이름·색 밴드 보존');
  /* 194 — 등급 폐지: 항목에 `g` 가 아예 없어야 하고, 효과 값은 50종이 전부 같아야 한다 */
  ok(data.every(a => a.g === null), '194 등급(`g`) 필드 폐기 — 남은 칸 '
    + data.filter(a => a.g !== null).length + '개');
  ok(data.every(a => a.atk === OWN.atk && a.hp === OWN.hp && a.gold === OWN.gold),
    '194 보유 효과가 전 코스튬 동일 (COS_OWN atk ' + OWN.atk + ' · hp ' + OWN.hp + ' · gold ' + OWN.gold + ')');
  const cnt = [0, 0, 0, 0, 0, 0]; data.forEach(a => cnt[a.pal]++);
  ok(cnt.every(c => c > 0) && cnt.length === 6, '색 밴드 배분 ' + cnt.join('·') + ' (6밴드 — 틴트 파라미터일 뿐)');
  /* 182 — 구매·조건 해금 데이터가 남아 있으면 «죽은 데이터» 다(LESSONS 68-③). 대신 50종 전부가
     계급 축 하나로 획득 조건을 갖는지 본다 — 어느 하나라도 rank 0 이면 «아무도 안 주는 코스튬» 이다. */
  ok(data.every(a => a.cost === null), '가격(cost) 데이터 폐기 확인 — 남은 칸 '
    + data.filter(a => a.cost !== null).length + '개');
  ok(data.every(a => a.req === null), '조건 해금(req) 데이터 폐기 확인 — 남은 칸 '
    + data.filter(a => a.req !== null).length + '개');
  /* 275(2026-08-28, 주인 지시 «승급전 한 번 깰 때마다 코스튬 1개») — rank 0 인 칸이 av0 하나뿐이던
     시절의 단언이다. 이제 rank 0 은 «기본 지급 av0» + «미출시 42종» 두 갈래이고, 그 갈림을
     `cosOff` 가 갖는다. 87 이 여기서 지키려던 것은 «분류가 없는 칸(= 조용히 못 얻는 칸)이 없다»
     이므로, rank 0 인 칸은 반드시 av0 이거나 미출시여야 한다로 잰다. */
  ok(data.filter(a => a.rank < 1).every(a => a.id === 'av0' || a.off),
    '조건 없는 칸이 없다 — rank 0 은 기본 지급 av0 또는 275 미출시뿐 (rank 0 '
    + data.filter(a => a.rank < 1).length + '칸 · 미출시 '
    + data.filter(a => a.off).length + '칸)');

  /* ---------------- §2 틴트 색차 ---------------- */
  console.log('\n§2 틴트 (CIE76 ΔE)');
  const tints = data.filter(a => a.tint);
  ok(tints.length === data.length - 1, '무틴트는 기본(av0) 하나뿐 — 틴트 ' + tints.length + '종');
  ok(new Set(tints.map(a => a.tint)).size === tints.length, '틴트 값 중복 없음');
  let minAll = 1e9, minPair = '', minSame = 1e9, minSamePair = '';
  for (let i = 0; i < tints.length; i++) for (let j = i + 1; j < tints.length; j++) {
    const d = dE(tints[i].tint, tints[j].tint);
    if (d < minAll) { minAll = d; minPair = tints[i].id + '↔' + tints[j].id; }
    if (tints[i].pal === tints[j].pal && d < minSame) { minSame = d; minSamePair = tints[i].id + '↔' + tints[j].id; }
  }
  console.log('    전체 최소 ΔE ' + minAll.toFixed(1) + ' (' + minPair + ') · 같은 밴드 최소 ΔE '
    + minSame.toFixed(1) + ' (' + minSamePair + ')');
  ok(minAll >= 8, '어떤 두 코스튬도 ΔE >= 8 (실제 최소 ' + minAll.toFixed(1) + ')');
  ok(minSame >= 10, '같은 밴드 안 최소 ΔE >= 10 (실제 ' + minSame.toFixed(1) + ')');

  /* ---------------- §3 밸런스 상한 ---------------- */
  console.log('\n§3 밸런스');
  /* ⚑ 724 — 방향을 뒤집었다(333 처방). 주인 확정 모델에서 코스튬 카테고리 «안» 은 합이므로
     50종 전부 보유의 배수는 `Π(1+a[k])` 가 아니라 **1 + Σ(계단)** 이다(`cosOwnSum`).
     항을 지우지 않은 이유 — 여기가 지키는 것은 «보유 축의 상한» 이고 그 뜻은 모델과 무관하다. */
  const bal = await page.evaluate(() => {
    const keep = Object.assign({}, S.avatars), keepLv = S.cosLv; S.cosLv = {};
    AVATARS.forEach(a => S.avatars[a.id] = 1); markDirty();
    const m = k => 1 + cosOwnSum(k);
    const r = { atk: m('atk'), hp: m('hp'), gold: m('gold') };
    S.avatars = keep; S.cosLv = keepLv; markDirty();
    return r;
  });
  console.log('    전부 보유 시 배수 — 공격 ×' + bal.atk.toFixed(1) + ' · 체력 ×' + bal.hp.toFixed(1)
    + ' · 골드 ×' + bal.gold.toFixed(1));
  ok(bal.atk < 1000, '공격 배수 상한 (×' + bal.atk.toFixed(1) + ' < ×1000)');
  ok(bal.hp < 300 && bal.gold < 100, '체력·골드 배수 상한');
  /* bonus() 가 실제로 그 배수를 내는지 — 전부 보유 전/후 공격력 비 */
  const bonusRatio = await page.evaluate(() => {
    /* bonus() 는 bonusDirty 로 캐시된다 — markDirty() 없이 재호출하면 옛 값이 그대로 나온다.
       194 — 기준선(av0 만 보유)에서도 av0 이 효과를 준다(전 코스튬 동일). 따라서 이 비는
       «전부 보유 ÷ av0 하나» = 나머지 49종의 곱이다. 아래 기댓값도 같은 식으로 만든다.
       레벨은 전부 0 으로 두어 «보유 축» 만 잰다(강화 축은 §8 이 따로 잰다). */
    const keep = Object.assign({}, S.avatars), keepLv = S.cosLv; S.cosLv = {};
    S.avatars = { av0: 1 }; markDirty();
    const before = bonus().atk, own1 = cosOwnSum('atk');
    AVATARS.forEach(a => S.avatars[a.id] = 1); markDirty();
    const after = bonus().atk, ownAll = cosOwnSum('atk');
    S.avatars = keep; S.cosLv = keepLv; markDirty();
    return { got: after / before, want: (1 + ownAll) / (1 + own1) };
  });
  /* ⚑ 724 — 기댓값도 «합» 모델로 뒤집었다: 배수 = (1+전부 보유 Σ)/(1+av0 하나 Σ) */
  ok(Math.abs(bonusRatio.got / bonusRatio.want - 1) < 1e-9,
    'bonus() 합산이 데이터 합과 일치 (av0 제외 ×' + bonusRatio.got.toFixed(4)
    + ' vs ×' + bonusRatio.want.toFixed(4) + ')');

  /* ---------------- §4 실동작 ---------------- */
  console.log('\n§4 실동작 (버튼을 눌렀을 때 무엇이 바뀌나)');
  await page.evaluate(() => { S.dia = 5e7; S.best = 1; S.rank = 0; S.coll.skill = 0; S.coll.equip = 0; save(); });
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
  await page.waitForTimeout(500);

  const cards = await page.$$eval('#bCos .sk-card', els => els.length);
  ok(cards === data.length, '격자 카드 ' + cards + '장 = 코스튬 ' + data.length + '종');
  /* 194 — 등급 폐지. 섹션 헤더가 «없어야» 정상이다(평평한 5열 격자) */
  const heads = await page.$$eval('#bCos .cos-hd', els => els.map(e => e.textContent));
  ok(heads.length === 0, '194 등급 섹션 헤더 폐기 — 실측 ' + heads.length + '개');

  /* 카드 한 번 누르면 «선택», 선택된 카드를 다시 누르면 08 상세 */
  const sel = await page.evaluate(() => {
    const id = AVATARS[7].id;
    document.querySelector('[data-cosit="' + id + '"]').click();
    const a = !!document.querySelector('[data-cosit="' + id + '"]').classList.contains('sel');
    document.querySelector('[data-cosit="' + id + '"]').click();
    const open = document.getElementById('modal').classList.contains('on');
    const title = document.getElementById('mtitle').textContent;
    document.getElementById('modal').classList.remove('on', 'sk8');
    return { id, a, open, title };
  });
  ok(sel.a, '[카드 클릭] ' + sel.id + ' 가 «선택(.sel)» 으로 바뀜');
  ok(sel.open && sel.title.length > 0, '[선택 카드 재클릭] 08 상세 열림 (제목 «' + sel.title + '»)');

  /* 182 — 레드닷: «살 수 있는 코스튬» 항이 통째로 사라졌다. 코스튬을 전부 미보유로 만들고
     다이아를 잔뜩 줘도 영웅 탭 레드닷이 켜지면 안 된다(도감 3종만 켤 수 있다). */
  const dot = await page.evaluate(() => {
    const keep = Object.assign({}, S.avatars), kd = S.dia, kc = Object.assign({}, S.coll);
    S.avatars = { av0: 1 }; S.dia = 1e9; S.coll = {}; markDirty(); renderUI();
    const on = document.querySelector('.tab[data-t="hero"]').classList.contains('alert');
    S.avatars = keep; S.dia = kd; S.coll = kc; markDirty(); renderUI();
    return { on };
  });
  ok(!dot.on, '[레드닷] 미보유 코스튬 50종 + 다이아 1e9 이어도 영웅 탭 레드닷 안 켜짐(구매 항 폐기)');

  /* 182 — 획득 조건은 계급 축 하나다. 계급이 모자라면 «잠김», 그 승급전을 통과한 계급이면 «열림».
     (실제 지급은 endPromo 가 한다 — 그 실동작은 verify182 가 소유한다) */
  const gate = await page.evaluate(() => {
    const a = AVATARS.find(x => cosRankOf(x.id) === 3);            /* 영웅 묶음 = 도전 계급 3 */
    const keep = Object.assign({}, S.avatars), kr = S.rank;
    delete S.avatars[a.id];
    S.rank = 0; const before = cosReqOk(a);
    S.rank = 2; const near   = cosReqOk(a);
    S.rank = 3; const after  = cosReqOk(a);
    const txt = cosReqText(a);
    S.avatars = keep; S.rank = kr; markDirty();
    return { id: a.id, before, near, after, txt };
  });
  ok(!gate.before && !gate.near, '[획득 조건] ' + gate.id + ' — 계급 0·2 에서는 잠김');
  ok(gate.after, '[획득 조건] ' + gate.id + ' — 계급 3 에서 열림');
  ok(/승급전 클리어$/.test(gate.txt), '[획득 조건] 표기가 계급 축 한 줄 («' + gate.txt + '»)');

  /* 착용 전환 — 다른 보유 코스튬으로 갈아입기 */
  await page.evaluate(() => { closeModal && closeModal(); document.querySelector('#modal').classList.remove('on'); });
  const wear = await page.evaluate(() => {
    /* 182 — 구매가 없어져 «보유 2종» 을 게이트가 직접 만든다(av0 + 아무 한 종) */
    const other = AVATARS.find(a => a.id !== S.avatar);
    S.avatars[other.id] = 1; markDirty(); renderCos();
    const b0 = S.avatar;
    document.querySelector('[data-cosit="' + other.id + '"]').click();
    document.querySelector('#bCos [data-coswear]').click();
    return { b0, b1: S.avatar, want: other.id };
  });
  await page.waitForTimeout(200);
  ok(wear.b1 === wear.want && wear.b1 !== wear.b0, '[착용] ' + wear.b0 + ' → ' + wear.b1);

  /* HUD·전투 반영 — 착용한 코스튬 색이 전투 렌더의 틴트와 같은지 */
  const battleTint = await page.evaluate(() => AV[cosCur()].tint);
  ok(battleTint === (data.find(a => a.id === wear.b1) || {}).tint, '착용 코스튬 틴트가 전투 경로(AV[cosCur()])와 동일');

  /* 182 — [구매] 자리를 물려받은 [승급전] 버튼이 실제로 승급전 팝업을 연다 */
  /* 194 — 시트의 2번 버튼은 [승급전] → **[강화]** 로 바뀌었다. 승급전 진입은 상세 팝업이 갖는다
     (미보유 카드를 열면 [승급전] 버튼이 있다). 두 자리를 각각 실제로 눌러 확인한다. */
  const pbtn = await page.evaluate(() => {
    const gone = !document.querySelector('#bCos [data-cosbuy]');
    const up = !!document.querySelector('#bCos [data-cosup]');
    /* 미보유 코스튬 하나를 열어 [승급전] 버튼을 누른다 */
    const id = AVATARS.map(a => a.id).find(x => !cosOwn(x));
    showCosDetail(id);
    const b = document.getElementById('mLv');
    const label = b ? b.textContent : '';
    if (b && !b.disabled) b.click();
    const open = document.querySelector('#modal').classList.contains('on');
    const promo = !!document.querySelector('#mbox .pr179');
    closeModal();
    return { gone, up, open, promo, label };
  });
  await page.waitForTimeout(200);
  ok(pbtn.gone, '[버튼] 시트에서 [구매](data-cosbuy) 가 사라짐');
  ok(pbtn.up, '194 [버튼] 시트 2번 칸이 [강화](data-cosup)');
  ok(pbtn.open && pbtn.promo, '[버튼] 상세의 [' + pbtn.label + '] 이 승급전 팝업(.pr179)을 연다');

  /* 저장·재로드 보존 */
  await page.evaluate(() => save());
  const before = await page.evaluate(() => ({ av: S.avatar, n: Object.keys(S.avatars).length }));
  await page.reload();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ av: S.avatar, n: Object.keys(S.avatars).length }));
  ok(before.av === after.av && before.n === after.n,
    '[저장] 재로드 후 착용·보유 유지 (' + after.av + ' · ' + after.n + '종)');

  /* ---------------- §5 lite 경로 색 일치 ---------------- */
  console.log('\n§5 격자 카드(lite) vs 전투(tinted) 색 일치');
  const same = await page.evaluate(() => {
    const id = AVATARS.find(a => a.tint && a.pal === 3).id;
    const mk = lite => { const c = document.createElement('canvas'); c.width = 96; c.height = 96;
      drawHeroTo(c, { avatar: id, scale: 1, lite: lite }); return c; };
    const a = mk(true).getContext('2d').getImageData(0, 0, 96, 96).data;
    const b = mk(false).getContext('2d').getImageData(0, 0, 96, 96).data;
    let diff = 0, ink = 0;
    for (let i = 0; i < a.length; i += 4) { if (a[i + 3] > 8 || b[i + 3] > 8) ink++;
      if (Math.abs(a[i] - b[i]) > 1 || Math.abs(a[i+1] - b[i+1]) > 1 || Math.abs(a[i+2] - b[i+2]) > 1
          || Math.abs(a[i+3] - b[i+3]) > 1) diff++; }
    return { id, ink, diff };
  });
  ok(same.ink > 200, '스프라이트가 실제로 그려짐 (잉크 ' + same.ink + 'px)');
  ok(same.diff === 0, 'lite 카드와 tinted() 경로 픽셀 완전 일치 (다른 픽셀 ' + same.diff + ')');

  /* ---------------- §6 구 세이브(6종 시절) ---------------- */
  console.log('\n§6 구 세이브 호환');
  /* 살아 있는 페이지에 localStorage 를 써 넣고 reload 하면 **그 페이지의 자동 저장이 먼저 덮어쓴다**
     (실제로 그렇게 한 첫 판이 §4 상태를 그대로 다시 읽어 «구 세이브 유실» 로 오진했다).
     세이브 주입은 LESSONS 44-① 대로 **새 컨텍스트 + addInitScript** 로 한다. */
  const old = { avatar: 'av3', avatars: { av0: 1, av1: 1, av3: 1 }, dia: 12345, stage: 30, best: 30 };
  const ctx2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx2.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(old)]);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('pageerror(구세이브): ' + e.message));
  await p2.goto(URL);
  await p2.waitForTimeout(900);
  const mig = await p2.evaluate(() => ({ av: S.avatar, own: Object.keys(S.avatars).filter(k => S.avatars[k]).sort(),
    atk: AVATARS.reduce((m, a) => S.avatars[a.id] ? m * (1 + a.atk) : m, 1), dia: S.dia }));
  ok(mig.av === 'av3', '구 세이브 착용(av3) 유지');
  ok(mig.own.join(',') === 'av0,av1,av3', '구 세이브 보유 3종 유지 (' + mig.own.join(',') + ')');
  /* 194 — 등급별 값이 폐기돼 «×1.10 × 1.55»(av1·av3 의 옛 등급값) 는 더 이상 기대값이 아니다.
     구 세이브에서 보존돼야 하는 것은 «어느 코스튬을 갖고 있는가» 이고, 효과는 그 보유 수 × 동일값이다. */
  ok(Math.abs(mig.atk - Math.pow(1 + OWN.atk, mig.own.length)) < 1e-9,
    '구 세이브 보유 ' + mig.own.length + '종 × 동일 효과 = ×' + mig.atk.toFixed(4));
  /* 구 세이브에도 신규 44종이 «미보유» 로 보이고 살 수 있어야 한다 */
  const shown = await p2.evaluate(() => {
    document.querySelector('.tab[data-t="hero"]').click();
    document.querySelector('#eqTabs [data-eqtab="cos"]').click();
    return { cards: document.querySelectorAll('#bCos .sk-card').length,
             lk: document.querySelectorAll('#bCos .sk-card.lk').length };
  });
  ok(shown.cards === data.length && shown.lk === data.length - 3,
    '구 세이브에서도 50칸이 보이고 미보유 ' + shown.lk + '칸이 잠금 표기');
  await ctx2.close();

  /* ---------------- §7 UI ---------------- */
  console.log('\n§7 UI (50칸 격자)');
  /* 127 — 여기는 §6 의 `page.reload()` 직후다. 고정 300/500ms 는 리로드 후 탭 핸들러가
     붙기 전에 클릭이 떨어져 패널이 아예 안 열리는 경합이 있었고, 그러면 `#bCos .sk-gp` 가
     null 이라 게이트가 «FAIL» 도 못 내고 TypeError 로 즉사했다(=127 이 잡아낸 «죽은 게이트»).
     시간이 아니라 «격자가 떴는가» 를 기준으로 최대 ~10초 재시도한다.
     탭 재클릭은 패널을 닫으므로(A1) 패널이 닫혀 있을 때만 누른다. */
  for (let i = 0; i < 20 && !(await page.$('#bCos .sk-gp')); i++) {
    await page.evaluate(() => {
      const pn = document.querySelector('#panel');
      if (!pn || getComputedStyle(pn).display === 'none') {
        const tb = document.querySelector('.tab[data-t="hero"]'); if (tb) tb.click();
      }
      const t = document.querySelector('#eqTabs [data-eqtab="cos"]'); if (t) t.click();
    });
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('#bCos .sk-gp', { state: 'attached', timeout: 5000 });
  const grid = await page.evaluate(() => {
    const gp = document.querySelector('#bCos .sk-gp'), inn = document.querySelector('#bCos .cos-in');
    const cv = document.querySelectorAll('#bCos .cos-cv');
    let painted = 0;
    cv.forEach(c => { try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) { painted++; break; } } catch (e) {} });
    const r = gp.getBoundingClientRect();
    return { scrollH: inn.scrollHeight || inn.offsetHeight, clientH: gp.clientHeight, painted, cv: cv.length,
      w: Math.round(r.width), locks: document.querySelectorAll('#bCos .sk-bar.rq').length };
  });
  ok(grid.scrollH > grid.clientH, '격자 내부 스크롤 있음 (' + grid.scrollH + 'px > 뷰포트 ' + grid.clientH + 'px)');
  ok(grid.painted === grid.cv && grid.cv >= 51, '카드·슬롯 캔버스 ' + grid.painted + '/' + grid.cv + ' 장 전부 그려짐');
  const scrolled = await page.evaluate(() => { const gp = document.querySelector('#bCos .sk-gp');
    gp.scrollTop = 1e5; gp.dispatchEvent(new Event('scroll')); return gp.scrollTop; });
  ok(scrolled > 0, '격자 스크롤 동작 (scrollTop ' + Math.round(scrolled) + ')');
  const keep = await page.evaluate(() => { renderCos(); return document.querySelector('#bCos .sk-gp').scrollTop; });
  ok(Math.abs(keep - scrolled) < 2, '재렌더 후 스크롤 위치 보존 (' + Math.round(keep) + ')');

  /* 격자 기하 — 카드가 서로 겹치거나 상자 밖으로 나가면 안 된다(50칸은 눈으로 다 못 본다) */
  const geo = await page.evaluate(() => {
    const inn = document.querySelector('#bCos .cos-in');
    const R = [...document.querySelectorAll('#bCos .sk-card')].map(c =>
      ({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }));
    const H = [...document.querySelectorAll('#bCos .cos-hd')].map(c =>
      ({ y: c.offsetTop, h: c.offsetHeight }));
    let ov = 0;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++)
      if (R[i].x < R[j].x + R[j].w && R[j].x < R[i].x + R[i].w
       && R[i].y < R[j].y + R[j].h && R[j].y < R[i].y + R[i].h) ov++;
    let hov = 0;
    H.forEach(h => R.forEach(r => { if (r.y < h.y + h.h && h.y < r.y + r.h) hov++; }));
    const out = R.filter(r => r.x < 0 || r.x + r.w > inn.clientWidth).length;
    return { ov, hov, out, w: inn.clientWidth, cols: new Set(R.map(r => r.x)).size };
  });
  ok(geo.ov === 0, '카드끼리 겹침 0쌍');
  ok(geo.hov === 0, '등급 헤더와 카드 행 겹침 0건');
  ok(geo.out === 0, '카드가 격자 폭(' + geo.w + 'px) 밖으로 나간 것 0장 · 열 ' + geo.cols + '개');

  /* ---------------- §8 화면 간 색 일치 (전투 · 79 장비 시트 · 80 랭킹) ---------------- */
  console.log('\n§8 전투 · 79 장비 시트 · 80 랭킹 색 일치');
  /* 팔레트 헬퍼를 페이지에 심어 둔다(틴트는 multiply 라 «찍힌 색 집합» 이 곧 지문이다) */
  await page.evaluate(() => {
    window.__pal = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, m = {};
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) m[d[i] + ',' + d[i+1] + ',' + d[i+2]] = 1;
      return Object.keys(m).sort(); };
    window.__ref = av => { const c = document.createElement('canvas'); c.width = 120; c.height = 120;
      drawHeroTo(c, { avatar: av, scale: 1 }); return __pal(c); };     /* = 전투가 쓰는 tinted() 경로 */
    S.avatars.av47 = 1; S.avatar = 'av47'; save(); uiDirty = true;      /* 신화 자수정 — 눈에 띄는 색 */
  });
  /* 79 — 06 장비 시트(서브탭 «장비» 는 data-eqtab 이 없는 첫 칸이다) */
  /* 서브탭 «장비» 칸은 data-eqtab 이 없어(현재 탭 표시용) 클릭으로는 안 돌아간다 — gmHero 로 간다 */
  await page.evaluate(() => gmHero('eq'));
  await page.waitForTimeout(600);
  const eqc = await page.evaluate(() => {
    const R = __ref('av47'), eq = document.querySelector('.eqil-cv');
    const E = eq ? __pal(eq) : null;
    return { R: R.length, E: E && E.length, sub: !!E && E.every(c => R.indexOf(c) >= 0) };
  });
  ok(eqc.R > 3, '기준(전투 tinted 경로) 팔레트 ' + eqc.R + '색');
  ok(eqc.E > 3 && eqc.sub, '79 장비 시트 일러스트 색 = 전투 팔레트 (' + eqc.E + '색, 부분집합)');
  /* 80 — 랭킹 단상. 칸마다 그 랭커의 look.avatar 로 그려지므로 «칸별로» 그 아바타와 비교한다.
     단상은 rAF 틱(rkTick)이 그리므로 열고 나서 기다렸다가 읽는다. */
  await page.evaluate(() => openRank());
  await page.waitForTimeout(700);
  const pods = await page.evaluate(() => [1, 2, 3].map((n, i) => {
    const cv = document.getElementById('rkCh' + n);
    if (!cv || typeof rkPodLooks === 'undefined' || !rkPodLooks[i]) return null;
    const P = __pal(cv), R = __ref(rkPodLooks[i].avatar);
    return { av: rkPodLooks[i].avatar, n: P.length, sub: P.length > 0 && P.every(c => R.indexOf(c) >= 0) };
  }));
  await page.evaluate(() => closeRank());
  const got = pods.filter(Boolean);
  ok(got.length === 3, '80 랭킹 단상 캔버스 3칸이 그려짐 (' + got.length + ')');
  ok(got.length === 3 && got.every(p => p.sub), '80 랭킹 단상 3칸 모두 그 랭커 코스튬 색과 일치 ('
    + got.map(p => p.av + ':' + p.n + '색').join(' · ') + ')');

  console.log('\n' + (errs.length ? '콘솔 에러 ' + errs.length + '건:\n  ' + errs.slice(0, 5).join('\n  ') : '콘솔 에러 0건'));
  ok(errs.length === 0, '콘솔·페이지 에러 0건');

  await browser.close();
  console.log('\nVERIFY87 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL' : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
