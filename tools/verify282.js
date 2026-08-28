/* 작업 282 게이트 — «승급전은 한 번 깰 때마다 코스튬 1개» (2026-08-27 저장소 주인 지시)
 *
 *   node tools/verify282.js
 *
 * ⚠ 번호 이동 — 이 작업은 «275ⓑ» 로 등재됐다가 작업 281(ID 이중 등재 정리, 2026-08-28)이
 *   **282** 로 옮겼다. `index.html` 주석과 다른 게이트의 주석에 남은 «275» 는 같은 작업이다.
 *
 * 182/194 는 승급 1회에 **묶음째**(21·10·8·6·2·1·1 = 49종) 줬다. 주인 지시는 «1개씩» 이다.
 * 275 는 묶음을 «대표를 뽑는 구간» 으로만 남기고, 각 구간의 **마지막 칸**(= 179 미리보기가 이미
 * 쓰던 대표)을 지급표로 승격시켰다. 그래서 «팝업이 보여 준 그 코스튬을 그대로 받는다» 가 되고,
 * 구 계급 조건 두 앵커(av41→r3 · av48→r6)도 그대로 남는다.
 * 남는 42종은 어느 승급전도 주지 않는 **미출시**(`COS_OFF`) — 등재문 ⓐ(다른 경로/계급 증설/미출시)가
 * 주인 결정 대기라 지금은 «미출시» 로 두고 화면이 «추후 공개» 라고 정직하게 말한다.
 *
 * T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 저장(S)·시트·
 * 다른 화면에 반영됨» 이어야 완료다. 그래서 지급표만 보지 않고 승급전을 7번 실제로 통과시킨다.
 *
 *   [1] 지급표   — 승급 1회 = 1종 · 대표는 묶음에서 파생(179 규약) · 앵커 2점 · 밴드 단조 증가
 *   [2] 미출시   — COS_OFF 42종이 «PROMO_COS 밖» 에서 파생되고, 잠긴 채 «추후 공개» 라고 말한다
 *   [3] 실동작   — 계급 1~7 승급이 각각 딱 1종을 주고 S·localStorage·시트·보유 효과에 반영
 *   [4] 일치     — 승급전 팝업 미리보기 = 실제 받은 코스튬 (179 «표 한 벌»)
 *   [5] 회수금지 — 구세이브가 가진 «지금은 미출시» 코스튬은 그대로 보유·조건 충족(182 ④)
 *   [6] 소급     — 최고 계급 구세이브가 av0 + 7종을 받고, 미출시 42종은 안 들어온다 · 멱등
 *   [7] 되돌림   — 묶음째 지급으로 되돌리면 [1][3] 이 실제로 빨개진다(게이트가 살아 있다는 증거)
 *
 * ⚠ file:// 에서 아틀라스를 그린 캔버스는 «오염» 되어 getImageData 가 막힌다 —
 *   `--allow-file-access-from-files` 로 띄운다(verify87·verify182·func50 과 같은 이유).
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

/* LESSONS 44-① — 세이브는 반드시 addInitScript 로 «페이지 스크립트보다 먼저» 심는다. */
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
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });  /* 루프가 상태를 되돌리지 못하게 */

    /* ---------------- [1] 지급표 ---------------- */
    console.log('\n[1] 지급표 — 승급 1회 = 코스튬 1종');
    const t = await p.evaluate(() => {
      const keys = Object.keys(PROMO_COS).map(Number).sort((a, b) => a - b);
      const flat = [].concat.apply([], keys.map(k => PROMO_COS[k]));
      const pool = COS_LIST.map(r => r[0]).filter(id => id !== 'av0');
      /* 대표가 «구간의 마지막 칸» 에서 파생되는지 — 컷에서 직접 다시 계산해 본다(표 두 벌 금지) */
      const wantByCut = (() => { const out = []; let at = 0;
        PROMO_CUT.forEach((c, i) => {
          const seg = (i === PROMO_CUT.length - 1) ? pool.slice(at) : pool.slice(at, at + c);
          out.push(seg[seg.length - 1]); at += c;
        });
        return out; })();
      return {
        keys, sizes: keys.map(k => PROMO_COS[k].length),
        ids: keys.map(k => PROMO_COS[k][0]),
        wantByCut, cut: PROMO_CUT.slice(),
        reps: keys.map(k => (promoCos(k) || {}).id),
        pals: keys.map(k => (AV[PROMO_COS[k][0]] || {}).pal),
        real: flat.every(id => !!AV[id]),
        uniq: new Set(flat).size, ranks: RANKS.length, total: AVATARS.length
      };
    });
    ok(t.keys.join(',') === '1,2,3,4,5,6,7', '승급 ' + (t.ranks - 1) + '회 전부에 지급표가 있다');
    ok(t.sizes.every(s => s === 1),
      '주인 지시 — 승급 1회 = 1종 (배분 ' + t.sizes.join('·') + ')');
    ok(t.uniq === t.keys.length && t.real,
      '7종이 서로 다른 실재 코스튬 (' + t.ids.join(' · ') + ')');
    ok(t.ids.join(',') === t.wantByCut.join(','),
      '지급표가 컷 ' + t.cut.join('·') + ' 의 «구간 마지막 칸» 에서 파생됨(표 한 벌 — 179 규약)');
    ok(t.reps.join(',') === t.ids.join(','),
      '179 미리보기 대표 = 지급표 (' + t.reps.join(',') + ')');
    ok(t.pals.every((v, i) => i === 0 || v >= t.pals[i - 1]),
      '색 밴드가 계급을 따라 단조 증가 (' + t.pals.join('·') + ') — «점점 화려해지는» 곡선 유지');
    const pins = await p.evaluate(() => ({ a41: cosRankOf('av41'), a48: cosRankOf('av48') }));
    ok(pins.a41 === 3 && pins.a48 === 6,
      '구 계급 조건 앵커 보존 (av41→' + pins.a41 + ' · av48→' + pins.a48 + ')');

    /* ---------------- [2] 미출시 ---------------- */
    console.log('\n[2] 미출시 — 어느 승급전도 주지 않는 칸이 «잠긴 채 정직하게» 말한다');
    const off = await p.evaluate(() => {
      const flat = [].concat.apply([], Object.keys(PROMO_COS).map(k => PROMO_COS[k]));
      const ids = Object.keys(COS_OFF);
      S.rank = 7; S.avatars = { av0: 1 }; markDirty();      /* 최고 계급이어도 안 열려야 한다 */
      const openAtTop = ids.filter(id => cosReqOk(AV[id])).length;
      renderCos();
      const cards = [].slice.call(document.querySelectorAll('#bCos .sk-card'));
      const byId = {};
      cards.forEach(c => { const b = c.querySelector('.sk-bar>b');
        byId[c.dataset.cosit] = { lk: c.classList.contains('lk'), t: b ? b.textContent : null }; });
      return {
        n: ids.length, total: AVATARS.length, bundle: flat.length,
        xBundle: ids.filter(id => flat.indexOf(id) >= 0).length,
        hasBase: ids.indexOf('av0') >= 0,
        openAtTop,
        txt: ids.map(id => cosReqText(AV[id])).filter((v, i, a) => a.indexOf(v) === i),
        cardLocked: ids.every(id => byId[id] && byId[id].lk),
        cardTxt: ids.map(id => byId[id] && byId[id].t).filter((v, i, a) => a.indexOf(v) === i),
        baseTxt: cosReqText(AV.av0), baseOff: cosOff('av0')
      };
    });
    ok(off.n === off.total - 1 - off.bundle,
      '미출시 ' + off.n + '종 = 50 − av0 − 승급 ' + off.bundle + '종');
    ok(off.xBundle === 0 && !off.hasBase,
      '미출시는 «PROMO_COS 밖» 에서 파생된다 — 묶음과 겹침 ' + off.xBundle + '칸 · av0 포함 '
      + (off.hasBase ? '예' : '아니오'));
    ok(off.openAtTop === 0,
      '최고 계급(7)에서도 미출시 칸은 안 열린다 (열린 칸 ' + off.openAtTop + ')');
    ok(off.txt.length === 1 && off.txt[0] === '추후 공개',
      '미출시 칸의 획득 조건 문구 = «' + off.txt.join(' / ') + '»');
    ok(off.cardLocked && off.cardTxt.length === 1 && off.cardTxt[0] === '🔒추후 공개',
      '50 시트 카드가 잠긴 채 «' + off.cardTxt.join(' / ') + '» 로 그려진다');
    ok(!off.baseOff && off.baseTxt === '기본 지급',
      'av0 은 미출시가 아니다 — «' + off.baseTxt + '» (처음부터 보유)');

    /* 상세 팝업(08 껍데기) 안내 문구 — «…시 지급됩니다» 가 아니라 «지급되는 곳이 없다» */
    const det = await p.evaluate(async () => {
      S.rank = 0; S.avatars = { av0: 1 }; markDirty(); renderCos();
      const id = Object.keys(COS_OFF)[0];
      /* 시트 카드는 «선택 → 재클릭» 2단이라(위임 핸들러) 상세 진입만 곧장 부른다 */
      showCosDetail(id);
      await new Promise(r => setTimeout(r, 350));
      const el = document.querySelector('#mbox .sk-db') || document.querySelector('#mbox');
      const txt = el ? el.textContent.replace(/\s+/g, ' ') : '';
      const cond = document.querySelector('#mbox .sk-ct .vl b');
      const out = { id, txt, cond: cond ? cond.textContent : null };
      closeModal();
      return out;
    });
    ok(/추후 공개/.test(det.txt) && !/시 지급됩니다/.test(det.txt),
      '미출시 칸 상세가 «추후 공개» 안내를 쓴다 (' + det.id + ')');
    ok(det.cond === '추후 공개', '미출시 칸 상세의 «획득 조건» 값 = «' + det.cond + '»');

    /* ---------------- [3] 실동작 ---------------- */
    console.log('\n[3] 실동작 — 승급전 7회가 각각 딱 1종을 주고 저장·시트에 반영된다');
    for (let ri = 1; ri <= t.ranks - 1; ri++) {
      const r = await p.evaluate((ri) => {
        closeModal();
        S.avatars = { av0: 1 }; S.rank = ri - 1; markDirty();
        const want = PROMO_COS[ri][0];
        const n0 = Object.keys(S.avatars).length, atk0 = bonus().atk;
        promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true);
        markDirty();
        const raw = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
        renderCos();
        const card = document.querySelector('#bCos [data-cosit="' + want + '"]');
        const bar = card && card.querySelector('.sk-bar>b');
        const txt = (document.querySelector('#modal .mbody') || {}).textContent || '';
        const out = {
          want, got: !!S.avatars[want], d: Object.keys(S.avatars).length - n0,
          rank: S.rank, saved: !!(raw.avatars && raw.avatars[want]),
          atkUp: bonus().atk > atk0,
          cardOwn: !!card && !card.classList.contains('lk') && /^\d+\/\d+$/.test(bar ? bar.textContent : ''),
          cnt: (/코스튬 (\d+)종 획득/.exec(txt.replace(/\s+/g, ' ')) || [])[1] || null
        };
        closeModal();
        return out;
      }, ri);
      ok(r.got && r.d === 1, '계급 ' + ri + ' — 딱 1종(' + r.want + ') 지급 (보유 증가 ' + r.d + ')');
      ok(r.rank === ri && r.saved, '계급 ' + ri + ' — S.rank·localStorage 반영');
      ok(r.atkUp, '계급 ' + ri + ' — 보유 효과가 공격 보너스에 반영');
      ok(r.cardOwn, '계급 ' + ri + ' — 50 시트가 그 칸을 «보유»(자물쇠 없음 · 강화 진행도)로 그린다');
      ok(r.cnt === '1', '계급 ' + ri + ' — 승급 팝업 문구가 «코스튬 1종 획득!» (' + r.cnt + ')');
    }

    /* ---------------- [4] 미리보기 = 실지급 ---------------- */
    console.log('\n[4] 일치 — 승급전 팝업이 보여 준 코스튬 = 실제 받은 코스튬');
    for (let ri = 1; ri <= t.ranks - 1; ri++) {
      const r = await p.evaluate((ri) => {
        closeModal();
        S.avatars = { av0: 1 }; S.rank = ri - 1; S.best = 1e9; markDirty();
        openPromo();
        const cv = document.querySelector('#mbox .pr-rw-c canvas');
        const shown = cv ? cv.dataset.cosav : null;
        closeModal();
        promo = { t: 60, max: 60, rank: nextRank() };
        endPromo(true);
        const got = Object.keys(S.avatars).filter(k => k !== 'av0');
        closeModal();
        return { shown, got };
      }, ri);
      ok(r.shown && r.got.length === 1 && r.got[0] === r.shown,
        '계급 ' + ri + ' — 미리보기 ' + r.shown + ' = 받은 ' + r.got.join(','));
    }
    await ctx.close();

    /* ---------------- [5] 회수 금지 ---------------- */
    console.log('\n[5] 회수 금지(182 ④) — 구세이브가 가진 «지금은 미출시» 코스튬');
    const keep = await openWith(browser, { rank: 0, avatar: 'av5', avatars: { av0: 1, av5: 1 }, best: 1, stage: 1 });
    const keepR = await keep.p.evaluate(() => ({
      own: !!S.avatars.av5, worn: S.avatar, off: cosOff('av5'),
      reqOk: cosReqOk(AV.av5), n: Object.keys(S.avatars).length,
      card: (() => { renderCos();
        const c = document.querySelector('#bCos [data-cosit="av5"]');
        return !!c && !c.classList.contains('lk'); })()
    }));
    ok(keepR.off, 'av5 는 275 이후 미출시 칸이다(옛 rank 5)');
    ok(keepR.own && keepR.worn === 'av5' && keepR.n === 2,
      '구세이브 보유·착용 그대로 (보유 ' + keepR.n + '종)');
    ok(keepR.reqOk, '보유한 미출시 코스튬은 «조건 충족» 으로 본다(회수 금지)');
    ok(keepR.card, '50 시트가 그 칸을 잠그지 않는다');
    ok(keep.errs.length === 0, '구세이브 콘솔 에러 0건'
      + (keep.errs.length ? ' — ' + keep.errs.slice(0, 2).join(' | ') : ''));
    await keep.ctx.close();

    /* ---------------- [6] 소급 ---------------- */
    console.log('\n[6] 소급 — 최고 계급 구세이브는 승급 몫만 받는다');
    const top = await openWith(browser, { rank: 7, avatar: 'av0', avatars: { av0: 1 }, best: 300, stage: 300 });
    const topR = await top.p.evaluate(() => ({
      n: Object.keys(S.avatars).filter(k => S.avatars[k]).length,
      all: [].concat.apply([], Object.keys(PROMO_COS).map(k => PROMO_COS[k])).every(id => !!S.avatars[id]),
      offNone: Object.keys(COS_OFF).every(id => !S.avatars[id])
    }));
    ok(topR.all && topR.n === 8, '계급 7 세이브 → av0 + 승급 7종 = ' + topR.n + '종');
    ok(topR.offNone, '미출시 42종은 소급으로도 안 들어온다');
    await top.p.reload(); await top.p.waitForTimeout(900);
    const topR2 = await top.p.evaluate(() => Object.keys(S.avatars).filter(k => S.avatars[k]).length);
    ok(topR2 === topR.n, '재로드해도 그대로 (멱등 — ' + topR2 + ')');
    ok(top.errs.length === 0, '소급 경로 콘솔 에러 0건'
      + (top.errs.length ? ' — ' + top.errs.slice(0, 2).join(' | ') : ''));
    await top.ctx.close();

    /* ---------------- [7] 되돌림 시험 ---------------- */
    console.log('\n[7] 되돌림 — 묶음째 지급으로 되돌리면 [1][3] 이 실제로 빨개진다');
    const rev = await openWith(browser, null);
    const revR = await rev.p.evaluate(() => {
      /* 182/194 의 «묶음째» 로 런타임 복원 — PROMO_COS 는 const 이지만 내용은 갈아끼울 수 있다 */
      const pool = COS_LIST.map(r => r[0]).filter(id => id !== 'av0');
      let at = 0;
      PROMO_CUT.forEach((c, i) => {
        PROMO_COS[i + 1] = (i === PROMO_CUT.length - 1) ? pool.slice(at) : pool.slice(at, at + c);
        at += c;
      });
      const sizes = Object.keys(PROMO_COS).map(k => PROMO_COS[k].length);
      S.avatars = { av0: 1 }; S.rank = 0; markDirty();
      promo = { t: 60, max: 60, rank: nextRank() };
      endPromo(true);
      const d = Object.keys(S.avatars).length - 1;
      closeModal();
      return { sizes, d };
    });
    ok(!revR.sizes.every(s => s === 1),
      '되돌림 — [1] «1회 = 1종» 이 깨진다 (배분 ' + revR.sizes.join('·') + ')');
    ok(revR.d !== 1,
      '되돌림 — [3] 계급 1 승급이 ' + revR.d + '종을 준다 (1 이 아니다)');
    await rev.ctx.close();

    ok(errs.length === 0, '콘솔·페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY282 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('VERIFY282 CRASH', e); process.exit(2); });
