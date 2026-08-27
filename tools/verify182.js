/* 작업 182 게이트 — «코스튬 획득 = 승급전 클리어» 전면 전환이 실제로 도는지 본다.
 *
 *   node tools/verify182.js
 *
 * 주인 지시(2026-08-27): «스킨은 직접 구매 말고 승급전 깰 때마다 주는 거로».
 * T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
 * 저장(S)·HUD·다른 화면에 반영됨» 이어야 완료다. 그래서 버튼별·경로별로 «눌렀을 때 무엇이
 * 바뀌는지» 를 DOM · S · localStorage 세 곳에서 확인한다.
 *
 * 검사 항목
 *   §1 배분   — PROMO_COS 7칸이 50종을 «빠짐없이 · 겹침없이» 나눠 갖는가 · 구 계급 조건 2점 보존
 *   §2 폐기   — buyAvatar()·cost·req·[구매] 버튼·«살 수 있는 코스튬» 레드닷이 **전부** 사라졌는가
 *   §3 지급   — 계급 1~7 승급전 클리어가 그 묶음을 통째로 주고 S·localStorage·시트·보유 효과에 반영
 *   §4 소급   — 이미 지난 승급의 몫이 로드 시 채워지는가(최고 계급 구세이브가 50종을 받는가) · 멱등
 *   §5 회수금지 — 구세이브가 이미 가진 코스튬은 그대로 남는가(182 ④)
 *   §6 연출   — 승급 성공 팝업의 «획득한 코스튬» 격자가 뜨고 그림이 칠해지고 fx 가 실제로 붙는가(182 ③)
 *   §7 일치   — 승급전 팝업이 «보여 준 종 수» 와 endPromo 가 «준 종 수» 가 같은가(179 규약)
 *
 * ⚠ file:// 에서 아틀라스를 그린 캔버스는 «오염» 되어 getImageData 가 막힌다 —
 *   §6 이 픽셀을 읽으므로 `--allow-file-access-from-files` 로 띄운다(verify87·func50 과 같은 이유).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* LESSONS 44-① — 세이브는 반드시 addInitScript 로 «페이지 스크립트보다 먼저» 심는다.
   로드 후에 localStorage 를 고치면 5초 자동 저장이 옛 값으로 덮어쓴다. */
async function openWith(browser, save){
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(900);
  return { ctx, p, errs };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const errs = [];
  try {
    const { ctx, p } = await openWith(browser, null);
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* 루프가 상태를 되돌리지 못하게 */

    /* ---------------- §1 배분 ---------------- */
    console.log('\n§1 배분 — PROMO_COS 7칸이 50종을 빠짐없이·겹침없이 나눠 갖는다');
    const map = await p.evaluate(() => {
      const keys = Object.keys(PROMO_COS).map(Number).sort((a, b) => a - b);
      const flat = [].concat.apply([], keys.map(k => PROMO_COS[k]));
      return {
        keys, sizes: keys.map(k => PROMO_COS[k].length),
        flat: flat.length, uniq: new Set(flat).size, total: AVATARS.length,
        real: flat.every(id => !!AV[id]),
        ranks: RANKS.length,
        /* 대표는 «묶음의 마지막 칸» 에서 파생된다 — 표가 두 벌이 아니라는 증거 */
        reps: keys.map(k => ({ k, rep: (promoCos(k) || {}).id, last: PROMO_COS[k][PROMO_COS[k].length - 1] })),
        /* 179 가 근거로 삼은 두 점(폐기 전 COS_LIST 의 계급 조건) */
        pin41: cosRankOf('av41'), pin48: cosRankOf('av48'),
        /* 묶음에 없는 칸은 기본 지급(av0) 하나뿐이어야 한다 */
        orphan: AVATARS.filter(a => cosRankOf(a.id) < 1).map(a => a.id),
        baseTxt: cosReqText(AV.av0), baseOwn: !!DEF().avatars.av0
      };
    });
    ok(map.keys.join(',') === '1,2,3,4,5,6,7',
      '승급 ' + (map.ranks - 1) + '회 전부에 묶음이 있다 (' + map.keys.join(',') + ')');
    ok(map.real, '묶음의 모든 id 가 실재 코스튬');
    ok(map.flat === map.uniq, '한 코스튬이 두 묶음에 들어가지 않음 (' + map.flat + '칸 / 고유 ' + map.uniq + '종)');
    ok(map.uniq === map.total - 1, '기본 지급 av0 을 뺀 49종 전부가 배정됨 (' + map.uniq + '/'
      + (map.total - 1) + ') — 배분 ' + map.sizes.join('·'));
    ok(map.orphan.join(',') === 'av0', '묶음 밖은 기본 외형 av0 하나뿐 («' + map.orphan.join(',') + '»)');
    ok(map.baseOwn && map.baseTxt === '기본 지급',
      'av0 은 처음부터 보유 = «' + map.baseTxt + '» (보상으로 세지 않는다)');
    ok(map.reps.every(r => r.rep === r.last), '미리보기 대표가 묶음에서 파생됨(표 한 벌 — 179 규약)');
    ok(map.pin41 === 3, '구 계급 조건 av41 → rank 3 보존 (실측 ' + map.pin41 + ')');
    ok(map.pin48 === 6, '구 계급 조건 av48 → rank 6 보존 (실측 ' + map.pin48 + ')');

    /* ---------------- §2 폐기 ---------------- */
    console.log('\n§2 폐기 — 구매 경로가 진입점까지 사라졌다(LESSONS 68-①·③)');
    await p.evaluate(() => {
      S.dia = 1e9; S.avatars = { av0: 1 }; S.rank = 0; markDirty();
      goTab('hero'); document.querySelector('#eqTabs [data-eqtab="cos"]').click();
    });
    await p.waitForTimeout(500);
    const gone = await p.evaluate(() => ({
      fn: typeof buyAvatar,
      cost: AVATARS.every(a => a.cost === undefined),
      req: AVATARS.every(a => a.req === undefined),
      buyBtn: document.querySelectorAll('#bCos [data-cosbuy]').length,
      /* 194 — 시트 2번 칸은 [승급전] → **[강화]**(승급전 진입은 상세 팝업이 갖는다) */
      upBtn: document.querySelectorAll('#bCos [data-cosup]').length,
      promoBtn: document.querySelectorAll('#bCos [data-cospromo]').length,
      /* 카드 바닥에 «가격» 이 한 칸도 없어야 한다 — 194 이후 보유 칸은 강화 진행도(Lv/500),
         미보유 칸은 «🔒 …승급전 클리어» 다. 182 가 지키려던 것은 «가격 표기가 없다» 이고 그건 그대로다. */
      bars: [].slice.call(document.querySelectorAll('#bCos .sk-card .sk-bar>b'))
        .map(b => b.textContent),
      dot: (renderUI(), document.querySelector('.tab[data-t="hero"]').classList.contains('alert'))
    }));
    ok(gone.fn === 'undefined', 'buyAvatar() 함수 폐기 (typeof = ' + gone.fn + ')');
    ok(gone.cost, 'AVATARS 에 cost 필드 없음');
    ok(gone.req, 'AVATARS 에 req 필드 없음');
    ok(gone.buyBtn === 0 && gone.upBtn === 1 && gone.promoBtn === 0,
      '194 시트 두 번째 버튼 = [강화] · 구매 ' + gone.buyBtn + '개 · 승급전 ' + gone.promoBtn + '개(상세로 이동)');
    ok(gone.bars.length >= 50 && gone.bars.every(t => /^\d+\/\d+$/.test(t) || /^🔒.*승급전 클리어$/.test(t)),
      '카드 바닥 ' + gone.bars.length + '칸이 전부 «Lv/맥스» 또는 «🔒 …승급전 클리어»(가격 0칸)');
    ok(!gone.dot, '미보유 49종 + 다이아 1e9 이어도 영웅 탭 레드닷이 안 켜짐');

    /* ---------------- §3 지급 ---------------- */
    console.log('\n§3 지급 — 계급 1~7 승급전 클리어가 그 묶음을 통째로 준다');
    for (let ri = 1; ri <= map.ranks - 1; ri++) {
      const r = await p.evaluate((ri) => {
        closeModal();
        S.avatars = { av0: 1 }; S.rank = ri - 1; markDirty();
        const bundle = PROMO_COS[ri].slice();
        const atk0 = bonus().atk, n0 = Object.keys(S.avatars).length;
        promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true);
        markDirty();
        const got = bundle.filter(id => !!S.avatars[id]);
        const raw = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
        renderCos();
        /* 194 — «보유로 그린다» = 자물쇠(.lk) 없음 + 진행바가 잠금 문구가 아니라 강화 진행도 */
        const cardOwn = bundle.every(id => {
          const c = document.querySelector('#bCos [data-cosit="' + id + '"]');
          return c && !c.classList.contains('lk')
            && /^\d+\/\d+$/.test(c.querySelector('.sk-bar b').textContent.trim());
        });
        const totTxt = (document.querySelector('#bCos .sk-tot i') || {}).textContent || '';
        closeModal();
        return { size: bundle.length, got: got.length, n0, n1: Object.keys(S.avatars).length,
                 atk0, atk1: bonus().atk, rank: S.rank,
                 saved: bundle.every(id => !!(raw.avatars || {})[id]), savedRank: raw.rank,
                 cardOwn, totTxt: totTxt.replace(/\s+/g, ' ').trim() };
      }, ri);
      const tag = '계급 ' + ri;
      ok(r.got === r.size, tag + ' — 묶음 ' + r.size + '종이 전부 S.avatars 에 들어갔다 (' + r.got + ')');
      ok(r.n1 - r.n0 === r.size, tag + ' — 늘어난 보유 수 = 묶음 크기 (' + (r.n1 - r.n0) + ')');
      ok(r.rank === ri && r.savedRank === ri, tag + ' — S.rank·저장 계급이 ' + ri + ' 로 올라감');
      ok(r.saved, tag + ' — localStorage 에도 그 ' + r.size + '종이 들어갔다(저장 반영)');
      ok(r.atk1 > r.atk0, tag + ' — 보유 효과가 공격 보너스에 반영 ('
        + r.atk0.toFixed(3) + ' → ' + r.atk1.toFixed(3) + ')');
      ok(r.cardOwn, tag + ' — 50 시트가 그 ' + r.size + '칸을 «보유»(자물쇠 없음 · 강화 진행도) 로 그린다');
      ok(/보유 \d+\/50/.test(r.totTxt), tag + ' — 시트 «보유 n/50» 갱신 («' + r.totTxt + '»)');
    }

    /* ---------------- §7 표시 = 지급 ---------------- */
    console.log('\n§7 일치 — 승급전 팝업이 «보여 준 종 수» = endPromo 가 «준 종 수»');
    for (let ri = 1; ri <= map.ranks - 1; ri++) {
      const r = await p.evaluate((ri) => {
        closeModal();
        S.avatars = { av0: 1 }; S.rank = ri - 1; markDirty();
        openPromo();
        const txt = (document.querySelector('#modal .pr-rw') || {}).textContent || '';
        const t1 = txt.replace(/\s+/g, ' ');
        /* «(n종 남음)» 이 있으면 그것이 «이번에 실제로 받을 수» 다(일부 보유 상태) */
        const m = /\((\d+)종 남음\)/.exec(t1) || /코스튬 (\d+)종/.exec(t1);
        closeModal();
        const before = Object.keys(S.avatars).length;
        promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true); closeModal();
        return { shown: m ? +m[1] : -1, given: Object.keys(S.avatars).length - before,
                 txt: txt.replace(/\s+/g, ' ').trim().slice(0, 60) };
      }, ri);
      ok(r.shown === r.given, '계급 ' + ri + ' — 보여 준 ' + r.shown + '종 = 준 ' + r.given + '종');
    }

    /* ---------------- §6 연출 ---------------- */
    console.log('\n§6 연출 — 승급 성공 팝업의 «획득한 코스튬»(182 ③)');
    const fx = await p.evaluate(async () => {
      closeModal();
      S.avatars = { av0: 1 }; S.rank = 2; markDirty();           /* 계급 3 = 영웅 8종 */
      promo = { t: 60, max: 60, rank: nextRank() };
      endPromo(true);
      const cards = [].slice.call(document.querySelectorAll('#mbox .pr182 .pg-c'));
      const painted = cards.filter(c => {
        const cv = c.querySelector('canvas'); if (!cv) return false;
        try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 8) return true; } catch (e) {}
        return false;
      }).length;
      /* 스태거 70ms × 8칸 — 다 돌 때까지 기다렸다가 «실제로 붙었나» 를 본다 */
      await new Promise(r => setTimeout(r, 700));
      const hit = cards.filter(c => c.classList.contains('fx-hit') || c.classList.contains('fx-flash')).length;
      const parts = document.querySelectorAll('#fxl > *').length;
      /* 격자가 팝업 밖으로 넘치지 않는가.
         ⚠ 격자 자체가 없으면 `getBoundingClientRect` 로 즉사한다 — 게이트는 죽지 말고 **FAIL** 해야
         한다(LESSONS 127 «죽은 게이트»). 되돌림 시험 N3(격자 제거)이 실제로 이 자리를 때린다. */
      const boxEl = document.querySelector('#modal .mbox'), gridEl = document.querySelector('#mbox .pr182');
      let inside = false;
      if (boxEl && gridEl) {
        const box = boxEl.getBoundingClientRect(), grid = gridEl.getBoundingClientRect();
        inside = grid.left >= box.left - 1 && grid.right <= box.right + 1 && grid.bottom <= box.bottom + 1;
      }
      const txt = document.querySelector('#modal .mbody').textContent.replace(/\s+/g, ' ');
      closeModal();
      return { n: cards.length, painted, hit, parts, inside, cnt: /코스튬 (\d+)종 획득/.exec(txt) };
    });
    ok(fx.n === 8, '계급 3 승급 → 격자 8칸 (실측 ' + fx.n + ')');
    ok(fx.painted === fx.n, '격자 스프라이트가 전부 칠해짐 (' + fx.painted + '/' + fx.n + ')');
    ok(fx.hit > 0, '연출이 실제로 카드에 붙는다 (fx 클래스가 걸린 칸 ' + fx.hit + ')');
    ok(fx.parts > 0, '파티클 레이어(#fxl)에 연출 노드가 생김 (' + fx.parts + ')');
    ok(fx.inside, '격자가 팝업 상자 안에 든다(넘침 없음)');
    ok(fx.cnt && +fx.cnt[1] === 8, '팝업 문구가 «코스튬 8종 획득!» (' + (fx.cnt ? fx.cnt[1] : '없음') + ')');
    await ctx.close();

    /* ---------------- §4 소급 · §5 회수 금지 ---------------- */
    console.log('\n§4 소급 지급 — 이미 지난 승급의 몫이 로드 때 채워진다');
    /* ① 최고 계급인데 코스튬이 없는 세이브 — 소급이 없으면 50종을 영원히 못 받는다 */
    const top = await openWith(browser, { rank: 7, avatar: 'av0', avatars: { av0: 1 }, best: 300, stage: 300 });
    const topR = await top.p.evaluate(() => ({
      n: Object.keys(S.avatars).filter(k => S.avatars[k]).length,
      all: AVATARS.every(a => !!S.avatars[a.id]), rank: S.rank
    }));
    ok(topR.rank === 7 && topR.all && topR.n === map.total,
      '최고 계급 구세이브 → 50종 전부 소급 지급 (' + topR.n + '/' + map.total + ')');
    /* 멱등 — 한 번 더 로드해도 늘지도 줄지도 않는다 */
    await top.p.reload(); await top.p.waitForTimeout(900);
    const topR2 = await top.p.evaluate(() => Object.keys(S.avatars).filter(k => S.avatars[k]).length);
    ok(topR2 === topR.n, '재로드해도 그대로 (멱등 — ' + topR2 + ')');
    ok(top.errs.length === 0, '소급 지급 경로 콘솔 에러 0건'
      + (top.errs.length ? ' — ' + top.errs.slice(0, 2).join(' | ') : ''));
    await top.ctx.close();

    /* ② 중간 계급 — 지난 몫만 채우고 «다음 승급의 보상» 은 남는다 */
    const mid = await openWith(browser, { rank: 3, avatar: 'av0', avatars: { av0: 1 }, best: 80, stage: 80 });
    const midR = await mid.p.evaluate(() => {
      const upto = [1, 2, 3].reduce((n, r) => n + PROMO_COS[r].length, 0);
      /* av0 은 기본 보유라 묶음 밖이다 — 소급분만 센다 */
      const have = [1, 2, 3].reduce((n, r) => n + PROMO_COS[r].filter(id => !!S.avatars[id]).length, 0);
      const future = [4, 5, 6, 7].some(r => PROMO_COS[r].some(id => !!S.avatars[id]));
      return { upto, have, future };
    });
    ok(midR.have === midR.upto, '계급 3 세이브 → 계급 1~3 몫 ' + midR.upto + '종만 소급 (' + midR.have + ')');
    ok(!midR.future, '아직 안 깬 승급(4~7)의 코스튬은 안 준다 — 다음 보상이 남는다');
    await mid.ctx.close();

    console.log('\n§5 회수 금지(182 ④) — 구세이브가 이미 가진 코스튬은 그대로');
    /* 계급 0 인데 옛 구매로 av5(신화)를 가진 세이브 — 계급 축으로는 아직 못 받는 칸이다 */
    const keep = await openWith(browser, { rank: 0, avatar: 'av5', avatars: { av0: 1, av5: 1 }, best: 1, stage: 1 });
    const keepR = await keep.p.evaluate(() => ({
      own: !!S.avatars.av5, worn: S.avatar, rank: S.rank, n: Object.keys(S.avatars).length,
      reqOk: cosReqOk(AV.av5), at: cosRankOf('av5'),
      atk: AVATARS.reduce((m, a) => S.avatars[a.id] ? m * (1 + a.atk) : m, 1),
      own1: COS_OWN.atk                                   /* 194 — 전 코스튬 동일 보유 효과 */
    }));
    ok(keepR.own && keepR.worn === 'av5', '옛 구매분 av5 가 보유·착용 그대로 (계급 ' + keepR.rank + ')');
    ok(keepR.n === 2, '소급이 «지난 승급» 몫만 건드린다 — 보유 ' + keepR.n + '종');
    ok(keepR.reqOk && keepR.at === 5, '보유한 코스튬은 계급이 모자라도 «조건 충족» 으로 본다(회수 금지)');
    /* 194 — 등급별 값 폐기. 보존돼야 하는 것은 «무엇을 갖고 있는가» 이고, 효과는 보유 수 × 동일값이다 */
    ok(Math.abs(keepR.atk - Math.pow(1 + keepR.own1, keepR.n)) < 1e-9,
      '구세이브 보유 ' + keepR.n + '종 × 동일 효과 = ×' + keepR.atk.toFixed(4));
    ok(keep.errs.length === 0, '구세이브 콘솔 에러 0건'
      + (keep.errs.length ? ' — ' + keep.errs.slice(0, 2).join(' | ') : ''));
    await keep.ctx.close();

    ok(errs.length === 0, '콘솔·페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY182 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('VERIFY182 CRASH', e); process.exit(2); });
