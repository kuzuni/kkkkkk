/* 작업 268 회귀 게이트 — «08 세부 팝업이 계열마다 디자인이 다르다» (2026-08-27 주인 지적, T1 «버그/통일»).
   실행: node tools/verify268.js  → 마지막 줄이 `VERIFY268 n/n PASS` 여야 한다.

   구: `.skd` 08 껍데기를 쓰는 것은 스킬(`showSkillDetail`)·코스튬(`showCosDetail`) 둘뿐이었고,
       펫·장비·유물은 `showItem` 이 A5 공용 팝업에 `<h2>`+`<p>`+**인라인 style 하드코딩 색**으로 그렸다.
   신: 네 계열 전부 `.skd` 를 쓴다. 껍데기 기하는 08 측정표 그대로(1px 불변).

   본다:
     §1 구조   스킬·펫·장비·유물 4계열이 전부 `#modal.sk8` + `.skd` 이고, 08 부품
               (`.sk-ic .sk-gr .sk-lv .sk-pb .sk-ct .sk-sl .sk-db .sk-ow`) 8개가 빠짐없이 있다.
     §2 기하   4계열의 `.skd` 와 부품 8개 bbox 가 **스킬(레퍼런스가 찍힌 계열)과 픽셀 동일**하다
               — «껍데기를 안 건드렸다» 의 증거이자, 누가 계열별로 갈라 놓으면 여기서 걸린다.
     §3 잔재   구 경로의 흔적이 하나도 안 남았다: `.mwell`(A5 본문 패널) · `.gbtn` · `#mClose` ·
               인라인 `style="...background:#0e1428"` · `<h2>` 가 본문 안에 0개.
     §4 내용   계열마다 다른 것은 표 2열뿐이다(펫 공격주기/피해량 · 장비 부위/효과 · 유물 효과/소환Lv)
               + 등급 알약·Lv·진행바·설명 헤더가 그 계열 값으로 채워진다.
     §5 버튼   08 규격 250x120. 펫·장비는 [장착]/[강화](+[최대 강화]) · 유물은 행 없음.
               3개일 때만 `.n3` 이고 행 폭이 본문 폭(868)을 안 넘는다.
               ⚠ 763(2026-09-01)로 «미보유 칸» 의 축이 **뒤집혔다**: 664 가 미개방 은닉을 걷어내
               제목이 실이름으로 열린다. 옛 «제목 = ???» 항을 «제목 = 데이터 실이름 + 그래도
               [장착]은 비활성» 짝 항으로 갈아 끼웠다(333 처방 — 자리를 비우지 않는다).
     §6 기능   실제로 동작한다 — [장착] 토글이 S 에 반영 · [강화] 가 Lv 를 올림 ·
               [최대 강화] 가 재료를 다 씀 · **719 이관**: [합성](`mCraft`) 폐지 →
               05 [일괄합성](`wpnBtnCf`)이 **다음 티어**를 준다.
     §7 펫 그림 174 규칙 — 펫 아이콘은 이모지가 아니라 스프라이트 캔버스이고 잉크가 칸 중앙에 있다.
     §8 회귀   스킬 세부(`showSkillDetail`)는 한 픽셀도 안 바뀐다 · 콘솔/페이지 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { settleAnimOn } = require('./settle291');   /* 957 — 상자·페이지 정착은 공용 §box 한 곳 */
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');
/* 315 — 313 과 같은 병. CRLF 체크아웃(Windows autocrlf)에서는 §3 의 `fn.indexOf('\n}\n')` 가 -1 이 돼
   showItem 본문이 2글자로 잘리고(«본문을 찾았다» · «.skd 를 쓴다» 2건 FAIL) 나머지 부정 단언은 헛통과한다.
   앵커 리터럴이 전부 LF 기준이므로 읽을 때 줄끝을 정규화한다(브라우저는 원본 파일을 그대로 연다). */
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8').replace(/\r\n/g, '\n');

/* 763 — `showItem` 본문 잘라내기. §3 이 인라인으로 하던 것과 **같은 앵커**이고, §5 의
   «제목이 데이터 파생이다» 항이 같은 구간을 다시 봐야 해서 부품으로 뽑았다.
   ⚠ 앵커가 빗나가면 빈 문자열이 아니라 `null` 을 돌린다 — 빈 문자열을 돌리면 그것을 읽는
   부정 단언이 전부 헛통과한다(315·212-① 교훈). 그래서 쓰는 쪽이 `!!ITEM_FN` 을 같이 묻는다. */
const ITEM_FN = (() => {
  const a = SRC.indexOf('function showItem(id){');
  if (a < 0) return null;
  const f = SRC.slice(a), e = f.indexOf('\n}\n');
  return e > 0 ? f.slice(0, e + 3) : null;
})();

const PARTS = ['.sk-ic', '.sk-gr', '.sk-lv', '.sk-pb', '.sk-ct', '.sk-sl', '.sk-db', '.sk-ow'];

/* 한 계열의 팝업을 열고 «껍데기 · 부품 · 내용 · 버튼» 을 한 번에 읽는다. */
const READ = (partList) => {
  const box = document.getElementById('mbox');
  const rr = (sel) => { const el = box.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    return { x: Math.round((r.left - b.left) * 100) / 100, y: Math.round((r.top - b.top) * 100) / 100,
             w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 }; };
  const txt = (sel) => { const el = box.querySelector(sel); return el ? el.textContent.trim() : null; };
  const skd = box.querySelector('.skd');
  const act = box.querySelector('.sk-act');
  return {
    sk8: document.getElementById('modal').classList.contains('sk8'),
    on: document.getElementById('modal').classList.contains('on'),
    skd: !!skd, skdRect: rr('.skd'),
    parts: partList.map(s => ({ s, has: !!box.querySelector(s), rect: rr(s) })),
    title: document.getElementById('mtitle').textContent,
    grade: txt('.sk-gr'), lv: txt('.sk-lv'), pb: txt('.sk-pb b'),
    pbFill: (() => { const i = box.querySelector('.sk-pb i'); return i ? i.style.width : null; })(),
    ctHd: [...box.querySelectorAll('.sk-ct .hd b')].map(x => x.textContent.trim()),
    ctVl: [...box.querySelectorAll('.sk-ct .vl b')].map(x => x.textContent.trim()),
    sl: txt('.sk-sl'), desc: txt('.sk-db'), ow: txt('.sk-ow'),
    /* 구 경로 잔재 */
    legacy: { mwell: box.querySelectorAll('.mwell').length, gbtn: box.querySelectorAll('.gbtn').length,
              mClose: box.querySelectorAll('#mClose').length, h2: box.querySelectorAll('h2').length,
              inlineBg: [...box.querySelectorAll('[style]')]
                .filter(el => /background\s*:\s*#/i.test(el.getAttribute('style'))).length },
    act: act ? {
      n3: act.classList.contains('n3'),
      rect: rr('.sk-act'),
      /* ⚠ `.sk-act` 는 블록이라 rect.w 가 언제나 본문 폭이다(버튼 수와 무관) —
         «행이 넘치는가» 는 첫 버튼 좌변 ~ 마지막 버튼 우변의 **스팬**으로 재야 한다. */
      span: (() => { const bs = [...act.querySelectorAll('button')];
        if (!bs.length) return 0;
        const l = Math.min(...bs.map(b => b.getBoundingClientRect().left));
        const r = Math.max(...bs.map(b => b.getBoundingClientRect().right));
        return Math.round((r - l) * 100) / 100; })(),
      btns: [...act.querySelectorAll('button')].map(b => ({
        id: b.id, cls: b.className, label: b.textContent.trim(), dis: b.disabled,
        w: Math.round(b.getBoundingClientRect().width * 100) / 100,
        h: Math.round(b.getBoundingClientRect().height * 100) / 100 }))
    } : null,
    icon: (() => { const el = box.querySelector('.sk-ic'); if (!el) return null;
      const cv = el.querySelector('canvas');
      return { canvas: !!cv, sp: cv ? cv.dataset.usp : null,
               cw: cv ? cv.width : 0, ch: cv ? cv.height : 0,
               txt: cv ? '' : el.textContent.trim() }; })()
  };
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof EQUIPS !== 'undefined' && EQUIPS.length > 0);
  await p.waitForTimeout(1400);

  /* 4계열의 대표 항목을 보유시킨다 — 재료는 «강화 1번은 되고 만렙은 아닌» 정도로 둔다. */
  const seed = await p.evaluate(() => {
    const sk = SKILLS[0];
    const pet = PETS.find(x => x.sp === 'dragon') || PETS[0];
    const eqp = EQUIPS.find(x => x.slot === 'weapon' && !isTopGrade(x));
    const rl = RELICS[0];
    [sk, pet, eqp].forEach(x => { S.own[x.id] = { n: 40, l: 3 }; });
    S.own[rl.id] = { n: 0, l: 4 };
    S.eqSkill = []; S.eqPet = []; S.eqSlot = { weapon: null, shield: null, amulet: null };
    save(); uiDirty = true;
    return { sk: sk.id, pet: pet.id, eqp: eqp.id, rl: rl.id, petSp: pet.sp,
             eqSlotN: SLOTS.find(s => s.k === eqp.slot).n,
             eqStat: SLOTS.find(s => s.k === eqp.slot).stat,
             rlEff: RELIC_EFF[rl.eff], petCd: pet.cd.toFixed(2) + '초' };
  });

  /* 135 의 교훈 — 60 쥬시(`jzBoxIn`)는 62% 에서 scale 1.02 를 지난다. 고정 대기로 재면
     «연출 한복판» 을 재게 되어 같은 껍데기가 계열마다 다른 수로 나온다(첫 실행에서 실제로
     스킬만 801.03x701.91 로 읽혔다). smoke [3] 과 같은 기준으로 유한 애니메이션이 끝나기를 기다린다. */
  /* ⚑ 작업 957 — 그 규칙을 여기 다시 안 적는다. 950 의 공용 §box(`settle291.js` QUIET_SRC)가
     같은 일을 하고, 957 이 «무한 반복은 안 기다린다»(위 문단의 `iterations !== Infinity`)를
     그 부품에 심어 이 자리가 그대로 옮겨갈 수 있게 했다. 상한 3000ms 는 종전 값 그대로. */
  const settle = async () => {
    await settleAnimOn(p, '^jz', 3000);
    await p.waitForTimeout(120);
  };
  const open = async (id) => {
    await p.evaluate(i => { closeModal(); showItem(i); }, id);
    await settle();
    return p.evaluate(READ, PARTS);
  };

  const D = { skill: await open(seed.sk), pet: await open(seed.pet),
              equip: await open(seed.eqp), relic: await open(seed.rl) };

  /* ── §1 구조 ── */
  console.log('§1 구조 — 4계열이 전부 08 껍데기(.skd)를 쓴다');
  Object.entries(D).forEach(([k, d]) => {
    ok(d.on && d.sk8, `[${k}] #modal 이 .on + .sk8`);
    ok(d.skd, `[${k}] 본문에 .skd 카드가 있다`);
    const miss = d.parts.filter(x => !x.has).map(x => x.s);
    eq(`[${k}] 08 부품 누락`, miss.length, 0);
  });

  /* ── §2 기하 — 스킬(레퍼런스 계열)과 픽셀 동일 ── */
  console.log('\n§2 기하 — 껍데기·부품 bbox 가 스킬과 픽셀 동일 (08 측정표 불변)');
  const same = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  const S0 = D.skill;
  ['pet', 'equip', 'relic'].forEach(k => {
    ok(same(S0.skdRect, D[k].skdRect),
       `[${k}] .skd bbox = 스킬`, JSON.stringify(D[k].skdRect) + ' vs ' + JSON.stringify(S0.skdRect));
    PARTS.forEach((sel, i) => {
      ok(same(S0.parts[i].rect, D[k].parts[i].rect),
         `[${k}] ${sel} bbox = 스킬`,
         JSON.stringify(D[k].parts[i].rect) + ' vs ' + JSON.stringify(S0.parts[i].rect));
    });
  });
  eq('.skd 폭', S0.skdRect.w, 800);
  eq('.skd 높이', S0.skdRect.h, 701);

  /* ── §3 구 경로 잔재 0 ── */
  console.log('\n§3 잔재 — 구 A5 경로(.mwell/.gbtn/#mClose/<h2>/인라인 배경색) 0');
  Object.entries(D).forEach(([k, d]) => {
    const L = d.legacy;
    ok(!L.mwell && !L.gbtn && !L.mClose && !L.h2 && !L.inlineBg,
       `[${k}] 잔재 0`, JSON.stringify(L));
  });
  /* 소스에서도 «구 팝업 문자열» 이 showItem 에서 사라졌는지 본다(다시 기어들면 여기서 걸린다) */
  /* 315 — 앵커가 빗나가면 body 가 빈 문자열이 돼 아래 «없음» 4건이 헛통과한다(212-①).
     시작·끝 앵커를 각각 소리 나게 잡는다. */
  const fnAt = SRC.indexOf('function showItem(id){');
  ok(fnAt >= 0, 'showItem 시작 앵커를 소스에서 찾았다', fnAt);
  const fn = SRC.slice(fnAt);
  const endAt = fn.indexOf('\n}\n');
  ok(endAt > 0, 'showItem 끝 앵커(`\\n}\\n`)를 찾았다 — 줄끝 정규화 확인', endAt);
  const body = fn.slice(0, endAt + 3);
  ok(body.length > 200, 'showItem 본문을 소스에서 찾았다', body.length);
  ok(!/#0e1428/.test(body), 'showItem 에 하드코딩 색 #0e1428 없음');
  ok(!/gbtn/.test(body), 'showItem 에 .gbtn 없음');
  ok(!/mClose/.test(body), 'showItem 에 #mClose 없음');
  ok(/showModal\(/.test(body) === false, 'showItem 이 A5 showModal() 을 안 쓴다');
  ok(/class="skd"/.test(body), 'showItem 이 .skd 를 쓴다');

  /* ── §4 내용 ── */
  console.log('\n§4 내용 — 계열이 갈리는 자리는 표 2열뿐');
  eq('[펫] 표 헤더 좌', D.pet.ctHd[0], '공격 주기');
  eq('[펫] 표 헤더 우', D.pet.ctHd[1], '피해량');
  eq('[펫] 표 값 좌 = cd', D.pet.ctVl[0], seed.petCd);
  ok(D.pet.ctVl[1] && D.pet.ctVl[1] !== '—' && D.pet.ctVl[1] !== '0', '[펫] 표 값 우 = 피해량', D.pet.ctVl[1]);
  eq('[장비] 표 헤더', D.equip.ctHd.join('/'), '부위/효과');
  eq('[장비] 표 값 좌 = 부위', D.equip.ctVl[0], seed.eqSlotN);
  eq('[장비] 표 값 우 = 스탯', D.equip.ctVl[1], seed.eqStat);
  eq('[유물] 표 헤더', D.relic.ctHd.join('/'), '효과/소환 Lv');
  eq('[유물] 표 값 좌 = 효과', D.relic.ctVl[0], seed.rlEff);
  eq('[유물] 표 값 우 = Lv', D.relic.ctVl[1], '4');
  eq('[펫] 설명 헤더', D.pet.sl, '펫 설명');   /* 369 이관 — 173 «펫 전수 통일» 이 놓쳤던 파생 문자열(`kindN`). 자리·뜻은 그대로: 알약은 계열 이름을 그대로 적는다 */
  eq('[장비] 설명 헤더', D.equip.sl, '장비 설명');
  eq('[유물] 설명 헤더', D.relic.sl, '유물 설명');
  eq('[펫] Lv 칸', D.pet.lv, 'Lv. 3');
  eq('[유물] Lv 칸', D.relic.lv, 'Lv. 4');
  ['pet', 'equip', 'relic'].forEach(k => {
    ok(!!D[k].grade && D[k].grade.length > 0, `[${k}] 등급 알약이 채워졌다`, D[k].grade);
    ok(!!D[k].desc && D[k].desc.length > 10, `[${k}] 설명 박스가 채워졌다`);
    ok(/보유 효과/.test(D[k].ow), `[${k}] 보유 효과 행`, D[k].ow);
  });
  eq('[펫] 진행바 라벨(재료 40/7)', D.pet.pb, '40/7');
  eq('[유물] 진행바 라벨', D.relic.pb, '소환할 때마다 Lv +1');

  /* 설명 박스가 넘치지 않는다(overflow:hidden 이라 잘리면 안 보인다) */
  const fits = await p.evaluate(() => {
    const el = document.querySelector('#mbox .sk-db');
    return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
  });
  ok(fits && fits.sh <= fits.ch + 2, '[유물] 설명이 박스 안에 담긴다', JSON.stringify(fits));

  /* ── §5 버튼 ── */
  console.log('\n§5 버튼 — 08 규격 250x120 · 유물은 행 없음');
  eq('[유물] 버튼 행', D.relic.act === null, true);
  ['pet', 'equip'].forEach(k => {
    const a = D[k].act;
    ok(!!a, `[${k}] 버튼 행이 있다`);
    if (!a) return;
    eq(`[${k}] 버튼 수`, a.btns.length, 3);
    eq(`[${k}] 버튼 id`, a.btns.map(b => b.id).join(','), 'mEq,mLv,mLvAll');
    ok(a.btns.every(b => b.w === 250 && b.h === 120), `[${k}] 버튼 250x120`,
       JSON.stringify(a.btns.map(b => b.w + 'x' + b.h)));
    ok(a.n3, `[${k}] 3개 → .n3`);
    ok(a.span <= 868, `[${k}] 버튼 3개 스팬 ${a.span} ≤ 본문 868`);
    ok(Math.abs(a.span - 830) <= 1, `[${k}] 스팬 ${a.span} = 250*3 + gap 40*2 = 830`);
    eq(`[${k}] 장착 라벨`, a.btns[0].label, '장착');
    eq(`[${k}] 강화 라벨`, a.btns[1].label, '강화');
    eq(`[${k}] 최대 강화 라벨`, a.btns[2].label, '최대 강화');
    ok(a.btns[0].cls.includes('sk-e'), `[${k}] 장착은 .sk-e`);
    ok(a.btns.slice(1).every(b => b.cls.includes('sk-u')), `[${k}] 강화 계열은 .sk-u`);
    ok(!a.btns[0].dis && !a.btns[1].dis, `[${k}] 보유 + 재료 충분 → 활성`);
  });
  /* 미보유 칸 — 두 버튼 다 비활성이고 3번째는 안 난다(08 스킬과 같은 형태) */
  const notOwn = await p.evaluate(() => {
    const x = EQUIPS.find(e => !S.own[e.id]); closeModal(); showItem(x.id);
    const bs = [...document.querySelectorAll('#mbox .sk-act button')];
    return { n: bs.length, dis: bs.map(b => b.disabled), title: document.getElementById('mtitle').textContent,
             name: x.n, ids: bs.map(b => b.id), labels: bs.map(b => b.textContent.trim()),
             n3: document.querySelector('#mbox .sk-act').classList.contains('n3') };
  });
  eq('[미보유 장비] 버튼 수', notOwn.n, 2);
  ok(notOwn.dis.every(Boolean), '[미보유 장비] 두 버튼 다 비활성', JSON.stringify(notOwn.dis));
  /* 763 — **방향을 뒤집은 자리**(333 처방). 옛 항은 «미보유면 제목을 «???» 로 가린다» 를 물었고,
     664(주인 지시 2026-09-02 «미개방장비들이 스펙이랑 아이콘이 뭔지 정보 볼수있게 해줘야함»)가
     그 은닉을 걷어낸 뒤로 빨간 채 굳어 있었다(148/149 · 제품은 옳고 자가 옛 방향을 물었다).
     ⚠ 자리를 비우면 664 가 통째로 되돌아와도 초록인 게이트가 되므로 **짝 항으로** 갈아 끼운다:
       ① 제목은 데이터(`it.n`)의 실이름이다 — 664 가 되돌아오면 «???» 라서 빨개진다
       ② 그래도 [장착] 자리는 비활성이고 라벨이 이유를 말한다 — «정보는 열되 상태는 안 감춘다»
       ③ 소스에서도 제목이 데이터 파생이다 — 가림 삼항이 다시 기어들면 여기서 걸린다.
     (①②는 664 §2·§3 과 같은 규약을 08 세부 팝업 쪽에서 다시 못박는 것이다.) */
  eq('[미보유 장비] 제목 = 데이터의 실이름(664 «미개방 정보 공개»)', notOwn.title, notOwn.name);
  eq('[미보유 장비] [장착] 자리 id', notOwn.ids[0], 'mEq');
  eq('[미보유 장비] [장착] 라벨이 막힌 이유를 말한다', notOwn.labels[0], '미보유');
  ok(!!ITEM_FN && /\$\('mtitle'\)\.textContent = it\.n;/.test(ITEM_FN),
     '[미보유 장비] showItem 이 제목을 데이터에서 그대로 쓴다(가림 삼항 부활 0)',
     ITEM_FN ? 'anchor ok' : 'showItem 앵커를 못 찾았다');
  ok(!notOwn.n3, '[미보유 장비] 버튼 2개라 .n3 아님');

  /* ⚑ 719 이관(2026-09-02, 주인 «일괄합성 버튼만 … 합성버튼 말고») — 여기 있던 개별 [합성]
     버튼(`mCraft`)이 폐지됐다. 자리를 비우지 않고 **방향을 뒤집는다**(333 처방): 만렙 장비의
     버튼 행은 이제 만렙 펫과 **같은 [장착]·[MAX](비활성)** 이고, 합성 진입점은 05 [일괄합성]
     하나뿐이다(그 동작은 아래 §6 과 `verify719` 가 센다). */
  const maxedEq = await p.evaluate(() => {
    const x = EQUIPS.find(e => !isTopGrade(e) && nextTierItem(e));
    S.own[x.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    closeModal(); showItem(x.id);
    const bs = [...document.querySelectorAll('#mbox .sk-act button')];
    return { id: x.id, ids: bs.map(b => b.id), labels: bs.map(b => b.textContent.trim()),
             dis: bs.map(b => b.disabled), pb: document.querySelector('#mbox .sk-pb b').textContent.trim() };
  });
  eq('[만렙 장비] 버튼 id (719 — 개별 합성 버튼 폐지)', maxedEq.ids.join(','), 'mEq,mLv');
  eq('[만렙 장비] 라벨 = MAX', maxedEq.labels[1], 'MAX');
  ok(maxedEq.dis[1], '[만렙 장비] MAX 는 비활성(719 — 합성은 05 [일괄합성] 몫)');
  eq('[만렙 장비] 진행바 MAX', maxedEq.pb, 'MAX');
  /* 만렙 펫 — 합성이 없으므로 «MAX» 비활성 */
  const maxedPet = await p.evaluate(() => {
    const x = PETS[0]; S.own[x.id] = { n: 0, l: MAX_LEVEL };
    closeModal(); showItem(x.id);
    const bs = [...document.querySelectorAll('#mbox .sk-act button')];
    return { ids: bs.map(b => b.id), labels: bs.map(b => b.textContent.trim()), dis: bs.map(b => b.disabled) };
  });
  eq('[만렙 펫] 버튼 id', maxedPet.ids.join(','), 'mEq,mLv');
  eq('[만렙 펫] 라벨', maxedPet.labels[1], 'MAX');
  ok(maxedPet.dis[1], '[만렙 펫] MAX 는 비활성');

  /* ── §6 기능 — «만들어 놓음» 이 아니라 실제로 동작하는가 ── */
  console.log('\n§6 기능 — 버튼이 실제로 상태를 바꾼다');
  const fEq = await p.evaluate(i => {
    closeModal(); showItem(i);
    const before = S.eqSlot.weapon;
    document.getElementById('mEq').onclick();
    const mid = S.eqSlot.weapon, lab1 = document.querySelector('#mbox .sk-e b').textContent.trim();
    document.getElementById('mEq').onclick();
    return { before, mid, after: S.eqSlot.weapon, lab1,
             lab2: document.querySelector('#mbox .sk-e b').textContent.trim() };
  }, seed.eqp);
  ok(fEq.before === null && fEq.mid === seed.eqp, '[장착] 눌러서 S.eqSlot 에 들어간다', JSON.stringify(fEq));
  eq('[장착] 후 라벨', fEq.lab1, '해제');
  ok(fEq.after === null, '[해제] 다시 눌러서 빠진다');
  eq('[해제] 후 라벨', fEq.lab2, '장착');

  const fPet = await p.evaluate(i => {
    closeModal(); showItem(i);
    document.getElementById('mEq').onclick();
    return { on: S.eqPet.includes(i), lab: document.querySelector('#mbox .sk-e b').textContent.trim() };
  }, seed.pet);
  ok(fPet.on, '[펫 장착] S.eqPet 에 들어간다');
  eq('[펫 장착] 후 라벨', fPet.lab, '해제');

  /* 262(2026-08-27) — [강화]는 click 이 아니라 **pointerdown** 으로 옮겨졌다(«꾹 누르면 연속 강화»).
     `b.onclick()` 직접 호출은 그 뒤로 «is not a function» 으로 즉사한다 — 진짜 포인터 탭으로 바꾼다.
     (탭 1회 = Lv +1 은 262 게이트 §2 가 따로 못 박는다) */
  await p.evaluate(i => { S.own[i] = { n: 40, l: 3 }; closeModal(); showItem(i); }, seed.eqp);
  await p.click('#mLv');
  await p.waitForTimeout(200);
  const fLv = await p.evaluate(i =>
    ({ lv: S.own[i].l, n: S.own[i].n, shown: document.querySelector('#mbox .sk-lv').textContent.trim() }),
    seed.eqp);
  eq('[강화] Lv 가 올랐다', fLv.lv, 4);
  ok(fLv.n < 40, '[강화] 재료가 줄었다', fLv.n);
  eq('[강화] 팝업 Lv 표기 갱신', fLv.shown, 'Lv. 4');

  const fAll = await p.evaluate(i => {
    S.own[i] = { n: 40, l: 3 }; closeModal(); showItem(i);
    document.getElementById('mLvAll').onclick();
    return { lv: S.own[i].l, n: S.own[i].n,
             shown: document.querySelector('#mbox .sk-lv').textContent.trim() };
  }, seed.eqp);
  ok(fAll.lv > 4, '[최대 강화] 여러 레벨이 한 번에 올랐다', 'Lv ' + fAll.lv);
  ok(fAll.n < 7, '[최대 강화] 남은 재료가 다음 필요분 미만', fAll.n);
  eq('[최대 강화] 팝업 Lv 표기 갱신', fAll.shown, 'Lv. ' + fAll.lv);

  /* ⚑ 719 이관 — 합성을 «누르는 자리» 가 08 세부 팝업에서 **05 [일괄합성]** 으로 옮겨졌고
     산식도 «다음 등급 랜덤» → «다음 티어» 로 바뀌었다. 랜덤이 없어졌으므로 지급물을 **id 로**
     집을 수 있다(옛 주석의 «풀 전체 보유 수» 우회가 더는 필요 없다). */
  const fCraft = await p.evaluate(() => {
    const x = EQUIPS.find(e => nextTierItem(e) && e.slot === 'weapon');
    const nx = nextTierItem(x);
    S.own = {}; S.own[x.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    closeModal(); openWeapon(null, x.slot);
    const btn = document.getElementById('wpnBtnCf');
    const shown = getComputedStyle(btn).display !== 'none';
    btn.click();
    return { id: x.id, nx: nx.id, shown,
             gone: !S.own[x.id] || S.own[x.id].n < CRAFT_NEED,
             got: !!S.own[nx.id],
             noOld: !document.getElementById('mCraft') };
  });
  ok(fCraft.shown, '[일괄합성] 가능할 때 버튼이 떠 있다', fCraft.id);
  ok(fCraft.gone, '[일괄합성] 재료가 소모됐다');
  ok(fCraft.got, '[일괄합성] **다음 티어** 장비를 얻었다', fCraft.id + ' → ' + fCraft.nx);
  ok(fCraft.noOld, '[일괄합성] 개별 [합성] 버튼(mCraft)은 화면에 0건');
  await p.evaluate(() => { closeUpAll(); closeWeapon(); });

  /* ── §7 펫 그림 (174 규칙) ── */
  console.log('\n§7 펫 그림 — 이모지가 아니라 스프라이트 캔버스');
  const petIco = await p.evaluate(i => {
    closeModal(); showItem(i);
    const cv = document.querySelector('#mbox .sk-ic canvas');
    if (!cv) return { canvas: false };
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y; n++;
    }
    return { canvas: true, sp: cv.dataset.usp, cw: cv.width, ch: cv.height, px: n,
             ink: n ? { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null };
  }, seed.pet);
  ok(petIco.canvas, '[펫] .sk-ic 안이 캔버스다');
  eq('[펫] 캔버스 크기', petIco.cw + 'x' + petIco.ch, '149x149');
  ok(petIco.px > 0, '[펫] 캔버스에 잉크가 그려졌다', petIco.px + 'px');
  if (petIco.ink) {
    const cx = petIco.ink.x0 + petIco.ink.w / 2, cy = petIco.ink.y0 + petIco.ink.h / 2;
    ok(Math.abs(cx - 74.5) <= 2, `[펫] 잉크 가로 중심 ${cx} ≈ 74.5`);
    ok(Math.abs(cy - 74.5) <= 2, `[펫] 잉크 세로 중심 ${cy} ≈ 74.5`);
    ok(Math.max(petIco.ink.w, petIco.ink.h) <= 97, `[펫] 잉크 최대변 ${Math.max(petIco.ink.w, petIco.ink.h)} ≤ 97 (이모지 잉크 96 대역)`);
  }
  /* 과교정 잠금 — 장비·유물은 이모지 그대로다(펫만 캔버스) */
  ok(!D.equip.icon.canvas && D.equip.icon.txt.length > 0, '[장비] 아이콘은 이모지 그대로', D.equip.icon.txt);
  ok(!D.relic.icon.canvas && D.relic.icon.txt.length > 0, '[유물] 아이콘은 이모지 그대로', D.relic.icon.txt);
  ok(!D.skill.icon.canvas, '[스킬] 아이콘은 이모지 그대로');

  /* ── §8 회귀 ── */
  console.log('\n§8 회귀 — 08 스킬 세부 불변 · 에러 0');
  eq('[스킬] 표 헤더', D.skill.ctHd.join('/'), '쿨타임/피해량');
  eq('[스킬] 설명 헤더', D.skill.sl, '스킬 설명');
  eq('[스킬] 버튼 수', D.skill.act.btns.length, 2);
  eq('[스킬] 버튼 id', D.skill.act.btns.map(b => b.id).join(','), 'mEq,mLv');
  ok(!D.skill.act.n3, '[스킬] 버튼 2개 → .n3 아님 (레퍼런스 gap 90 유지)');
  ok(Math.abs(D.skill.act.span - 590) <= 1, `[스킬] 버튼 스팬 ${D.skill.act.span} = 250*2 + gap 90 = 590`);
  /* 코스튬 세부도 같은 껍데기를 계속 쓴다 */
  const cos = await p.evaluate(() => {
    closeModal(); showCosDetail(AVATARS[0].id);
    return { skd: !!document.querySelector('#mbox .skd'),
             sk8: document.getElementById('modal').classList.contains('sk8') };
  });
  ok(cos.skd && cos.sk8, '[코스튬] 08 껍데기 유지');

  eq('콘솔·페이지 에러', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('    ', e));

  await browser.close();
  const total = pass + fail;
  console.log(`\nVERIFY268 ${pass}/${total} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
