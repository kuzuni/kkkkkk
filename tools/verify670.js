#!/usr/bin/env node
/* 게이트 — 작업 670 «단련 버튼 비용 표기 간소화» (2026-09-02, 저장소 주인 지시)
 *
 *   node tools/verify670.js
 *
 * 주인 원문: «단련석에 단련 (단련아이콘) 3 이런거 말고 (단련아이콘) 3 이런식으로 해주면됨.
 *            버튼에 그거 표시된거»
 *
 * 절은 여섯 + 되돌림이다:
 *   [1] 전제   — 단련 탭이 실제로 열리고 잴 노드(세 행 · 버튼 · 제목)가 있다
 *   [2] ★ 라벨 — 버튼이 말하는 것은 **아이콘 1장 + 수** 둘뿐이다(글자 0건 · «단련» 0건)
 *   [3] 뜻 보존 — 버튼에서 뺀 말이 화면에 **남아 있다**(행 제목 · 서브탭). 등재문 ⚠ 조항이 이 절이다
 *   [4] 파생   — 그 수는 `temperCost()` 에서 나온다(레벨을 올리면 따라 바뀐다 · 손으로 적은 수가 아니다)
 *   [5] 레이아웃 Δ0 — 584 가 정한 상자(340×74 · right 26 · top 128)와 화폐 세로 중앙이 **불변**
 *   [6] 297·584 회귀 — 통짜 렌더 ↔ `liveTemper()` 가 같은 문자열 · 홀드 토스트의 «단련 n회» 는 살아 있다
 *   §R  되돌림 — 옛 라벨(«단련 » 접두)·아이콘 없는 라벨을 도로 주입하면 **[2] 만** 빨개진다
 *
 * ⚑ [6] 의 토스트 항이 이 자의 «무르지 않음» 이다 — 라벨만 손댔다는 것을 반대편에서 못박는다.
 *   («단련» 을 소스에서 통째로 지우는 수리였다면 그 항이 빨개진다.)
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 수리 전 값 — `probe670` 1회차 실측(이 자가 «이미 참인 것» 을 굳히지 않았다는 기준선) */
const PRE = { btn: '단련 1', room10: 1.13 };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });

  /* ══ [1] 전제 ═══════════════════════════════════════════════════════════ */
  console.log('\n=== [1] 전제 — 단련 탭이 열리고 잴 노드가 있다 ===');
  const pre = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#trTemper .tr-tp')];
    return { n: rows.length,
             btn: rows.every(r => !!r.querySelector('.tb i')),
             tn: rows.every(r => !!r.querySelector('.tn i')),
             /* 686 이관 — 비용 열(.tc)은 주인 지시로 사라졌다. [1-c] 는 «있는가» 에서
                «없는가» 로 뒤집고, [3][5] 가 볼 자리는 살아 있는 `.tn`·`.tb` 로 남는다. */
             tc: rows.every(r => !r.querySelector('.tc')) };
  });
  ok(pre.n >= 3, '[1-a] 단련 축 행이 셋 이상 그려졌다', pre.n + '행');
  ok(pre.btn, '[1-b] 행마다 강화 버튼 라벨 노드(.tb i)가 있다');
  ok(pre.tn, '[1-c] 행 제목(.tn)이 있다 — [3][5] 가 볼 자리');
  ok(pre.tc, '[1-c2] 686 — 비용 열(.tc)은 없다(670 이 «중복» 이라 부른 그 열 · 되살아나면 빨강)');

  /* ══ [2] ★ 라벨 = 아이콘 + 수 ═══════════════════════════════════════════ */
  console.log('\n=== [2] ★ 주인 지시 — 버튼은 «(아이콘) n» 만 말한다 ===');
  const lab = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#trTemper .tr-tp')];
    return rows.map(r => {
      const b = r.querySelector('.tb i');
      return { k: r.dataset.temper,
               txt: b.textContent.replace(/\s+/g, ' ').trim(),
               html: b.innerHTML,
               imgs: [...b.querySelectorAll('img.cic')].map(n => n.dataset.curIc),
               cost: temperCost(r.dataset.temper) };
    });
  });
  lab.forEach(r => console.log(`      ${r.k}: «${r.txt}» · 아이콘 [${r.imgs.join(',')}]`));
  ok(lab.every(r => !/단련/.test(r.txt) && !/단련/.test(r.html)),
    '[2-a] ★ 라벨에 «단련» 이 0건이다(수리 전 «' + PRE.btn + '»)',
    lab.map(r => '«' + r.txt + '»').join(' · '));
  ok(lab.every(r => /^[\d,]+$/.test(r.txt)),
    '[2-b] ★ 라벨의 **글자**는 수(와 자리쉼표)뿐이다 — 어떤 낱말도 안 남았다',
    lab.map(r => '«' + r.txt + '»').join(' · '));
  ok(lab.every(r => r.imgs.length === 1 && r.imgs[0] === 'tstone'),
    '[2-c] ★ «어떤 화폐인지» 는 아이콘 1장이 말한다(125 규약 `.cic` · tstone)',
    lab.map(r => r.imgs.join('/') + '×' + r.imgs.length).join(' · '));
  ok(!/'단련 ' *\+ *curIc\(/.test(CODE),
    '[2-d] 제품 소스에 옛 «단련 » 접두 라벨식이 0건이다');
  /* 686 이관 — 이 항의 뜻은 «라벨식이 «아이콘 + 비용» **두 항뿐**» 이지 «어느 상수를 읽는가» 가
     아니었다. 686 이 단련 버튼만 173px 로 키우면서 아이콘 크기를 전용 상수 `TP_CUR_PX`(96)로
     갈랐다 — `TR_CUR_PX`(53)는 아직 74px 인 **룬 [강화] 버튼과 공유**라 같이 못 올린다.
     ⇒ 상수 이름을 둘 다 받아들이되 «두 항뿐» 은 그대로 잠근다. */
  ok(/btn: *curIc\('tstone', *(TR|TP)_CUR_PX\) *\+ *('<b class="tbn">' *\+ *)?fmt\(c\)/.test(CODE),
    '[2-e] 라벨식이 «아이콘 + 비용» 두 항뿐이다(686 3회차 — 숫자에 정렬용 껍데기 `<b class="tbn">` 만 씌웠다)');

  /* ══ [3] 뜻 보존 ════════════════════════════════════════════════════════ */
  console.log('\n=== [3] 뺀 말이 화면에 남아 있는가(등재문 ⚠ — 버튼이 «무슨 버튼» 인지) ===');
  const meaning = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#trTemper .tr-tp')];
    const t = [...document.querySelectorAll('.stab[data-trsub]')].find(n => n.dataset.trsub === 'temper');
    return { titles: rows.map(r => r.querySelector('.tn i').textContent.replace(/\s+/g, ' ').trim()),
             tab: t ? t.textContent.trim() : null };
  });
  ok(meaning.titles.every(s => /단련/.test(s)),
    '[3-a] ★ 같은 행의 제목이 «<축> 단련» 이라고 말한다', meaning.titles.map(s => '«' + s + '»').join(' · '));
  ok(/단련/.test(meaning.tab || ''), '[3-b] 서브탭 이름도 «단련» 이다', '«' + meaning.tab + '»');

  /* ══ [4] 파생 ═══════════════════════════════════════════════════════════ */
  console.log('\n=== [4] 그 수는 데이터에서 나온다(손으로 적은 수가 아니다) ===');
  ok(lab.every(r => r.txt.replace(/,/g, '') === String(r.cost)),
    '[4-a] ★ 라벨의 수 = `temperCost()`', lab.map(r => r.txt + '↔' + r.cost).join(' · '));
  const follow = await page.evaluate(() => {
    const k = 'atk', row = () => document.querySelector('#trTemper .tr-tp[data-temper="atk"] .tb i');
    /* ⚠ 기대값은 **각 단계 직후** 에 읽는다 — 한 번 더 올린 뒤 읽으면 자가 자기 하네스에
       걸려 빨개진다(1회차에 실제로 그랬다 · LESSONS 199-⑤ «하네스 순서» 와 같은 함정). */
    const before = row().textContent.trim();
    S.temper.alloc[k] = temperLv(k) + TEMPER_SEG * 4;     /* 구간을 넉넉히 넘겨 비용 계단을 올린다 */
    $('trTemper').dataset.sig = ''; renderTrain();
    const afterFull = row().textContent.trim(), want = String(temperCost(k));
    S.temper.alloc[k] = temperLv(k) + TEMPER_SEG * 4;
    liveTemper();
    const afterLive = row().textContent.trim(), want2 = String(temperCost(k));
    return { before, afterFull, afterLive, want, want2 };
  });
  ok(follow.afterFull.replace(/,/g, '') === follow.want && follow.afterFull !== follow.before,
    '[4-b] ★ 레벨을 올리면 라벨의 수가 **따라 바뀐다**(통짜 렌더)',
    `«${follow.before}» → «${follow.afterFull}» (기대 ${follow.want})`);
  ok(follow.afterLive.replace(/,/g, '') === follow.want2 && follow.afterLive !== follow.afterFull,
    '[4-c] 홀드 중 갱신 경로(`liveTemper`)도 같은 수를 쓴다',
    `«${follow.afterFull}» → «${follow.afterLive}» (기대 ${follow.want2})`);
  await page.evaluate(() => { S.temper.alloc.atk = 0; $('trTemper').dataset.sig = ''; renderTrain(); });

  /* ══ [5] 레이아웃 Δ0 ════════════════════════════════════════════════════ */
  console.log('\n=== [5] 584 가 정한 상자·정렬이 한 픽셀도 안 움직였다 ===');
  const geo = await page.evaluate(() => {
    const row = document.querySelector('#trTemper .tr-tp.k0');
    const rb = row.getBoundingClientRect();
    const b = row.querySelector('.tb').getBoundingClientRect();
    const i = row.querySelector('.tb i').getBoundingClientRect();
    const c = row.querySelector('.tb .cic').getBoundingClientRect();
    const td = row.querySelector('.td').getBoundingClientRect();
    const box = row.querySelector('.tb');
    /* 자릿수 최악에서의 여유 — 584 가 340 을 고른 그 축 */
    const lab = row.querySelector('.tb i'), keep = lab.innerHTML;
    /* 686 — 단련 버튼은 전용 상수(TP_CUR_PX)와 검정 테 8px 을 쓴다. 내부 예산은 340 − 8×2 = 324. */
    const CUR = (typeof TP_CUR_PX !== 'undefined') ? TP_CUR_PX : TR_CUR_PX;
    lab.innerHTML = curIc('tstone', CUR) + '9,999,999,999';
    const room10 = b.width - 16 - lab.getBoundingClientRect().width;
    lab.innerHTML = curIc('tstone', CUR) + '999,999';
    const room6 = b.width - 16 - lab.getBoundingClientRect().width;
    lab.innerHTML = curIc('tstone', CUR) + '9,999,999';
    const room7 = b.width - 16 - lab.getBoundingClientRect().width;
    lab.innerHTML = keep;
    return {
      w: +b.width.toFixed(1), h: +b.height.toFixed(1),
      right: +(rb.right - b.right).toFixed(1), top: +(b.top - rb.top).toFixed(1),
      curTop: +(c.top - b.top).toFixed(1), curBot: +(b.bottom - c.bottom).toFixed(1),
      inkL: +(i.left - b.left).toFixed(1), inkR: +(b.right - i.right).toFixed(1),
      gapTd: +(b.left - td.right).toFixed(1),
      room10: +room10.toFixed(2), room6: +room6.toFixed(2), room7: +room7.toFixed(2),
    };
  });
  ok(Math.abs(geo.w - 340) < 0.5 && Math.abs(geo.h - 173) < 0.5,
    '[5-a] ★ 버튼 **가로** 340 불변(584) · 세로는 686 이 코어 173(+립 5)으로 키웠다',
    geo.w + '×' + geo.h);
  ok(Math.abs(geo.right - 26) < 0.5 && Math.abs(geo.top - 22) < 0.5,
    '[5-b] 자리 — right 26 불변(584) · top 은 686 값 22', 'right ' + geo.right + ' · top ' + geo.top);
  ok(geo.curTop >= 5 && geo.curBot >= 5 && Math.abs(geo.curTop - geo.curBot) <= 3,
    '[5-c] ★ 화폐 아이콘이 버튼 안에서 세로 중앙(584 [2-i] 와 같은 자)',
    '위 ' + geo.curTop + ' · 아래 ' + geo.curBot);
  ok(Math.abs(geo.inkL - geo.inkR) <= 3 && geo.inkL > 0,
    '[5-d] ★ 짧아진 라벨이 버튼 안에서 **가로 중앙**이다(좌우 여백 대칭)',
    '좌 ' + geo.inkL + ' · 우 ' + geo.inkR);
  ok(geo.gapTd > 0, '[5-e] 같은 행 효과 줄(.td)과 겹침 0(210 [B] 축)', '간격 ' + geo.gapTd);
  /* ⚑ 686 이관 — 이 항은 **방향이 바뀌었다.** 670 이 물은 것은 «라벨을 줄였는데 상자를 좁혀야
     하나» 였고 답은 «아니다(여유가 늘기만 한다)» 였다. 686 은 그 늘어난 여유를 **의도적으로 써서**
     라벨을 키웠다(비평 2인이 «면 대비 잉크 6%» 로 ② 를 4·5 점 줬다). 그래서 자릿수 예산은
     10자리 → **8자리**가 된다. 8자리 = 비용 ≥ 1e7 = **Lv 44.7만**이고, 이 저장소가 스스로 «먼 값»
     으로 쓰는 far 표본은 Lv 10만(비용 501,501 = 6자리 — `verify210` [C])이라 **4.5배 여유**다.
     ⇒ 항을 지우지 않고 **예산 자릿수를 8로 다시 적는다**(333 처방). 되돌리려면 `.tr-tp>.tb` 의
     font-size 42 와 `TP_CUR_PX` 96 을 내리면 10자리가 그대로 돌아온다. */
  ok(geo.room6 > 0,
    '[5-f] 686 3회차 — 자릿수 예산은 **6자리**다(라벨 확대의 대가 · 비용 999,999 까지 = 이 저장소의 far 표본 Lv 10만 비용 501,501 의 2배)',
    `6자리 여유 ${geo.room6} · 7자리 ${geo.room7} · (10자리는 ${geo.room10})`);

  /* ══ [6] 297·584 회귀 ═══════════════════════════════════════════════════ */
  console.log('\n=== [6] 297 두 경로 동일 · 584 의 나머지 축은 안 건드렸다 ===');
  const same = await page.evaluate(() => {
    const w = $('trTemper');
    w.dataset.sig = ''; renderTrain();
    const full = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    liveTemper();
    const live = [...w.querySelectorAll('.tr-tp .tb i')].map(n => n.innerHTML);
    return { full, live, esc: live.some(h => /&lt;img/.test(h)) };
  });
  ok(JSON.stringify(same.full) === JSON.stringify(same.live),
    '[6-a] ★ 통짜 렌더와 `liveTemper()` 가 같은 문자열', same.live[0] ? same.live[0].slice(0, 46) + '…' : '');
  ok(!same.esc, '[6-b] 라벨 태그가 **글자로** 안 찍힌다(`put(..., true)` 경로 유지)');
  ok(/단련 ' \+ fmt\(n\) \+ '회/.test(CODE) || /\(단련 ' \+ fmt\(n\)/.test(CODE),
    '[6-c] ★ 홀드 토스트의 «단련 n회» 는 **살아 있다**(라벨만 손댔다는 반대편 증거 · verify584 [5-f])');
  ok(!/투자/.test(CODE.split('\n').filter(l => /(['"])투자 /.test(l)).join('')),
    '[6-d] 584 가 없앤 «투자» 표기가 되살아나지 않았다');

  /* ══ §R 되돌림 ══════════════════════════════════════════════════════════ */
  console.log('\n=== §R 되돌림 — 옛 라벨을 도로 주입하면 [2] 가 빨개진다 ===');
  const rev = await page.evaluate(() => {
    const b = document.querySelector('#trTemper .tr-tp.k0 .tb i'), keep = b.innerHTML;
    const read = () => ({ txt: b.textContent.replace(/\s+/g, ' ').trim(),
                          imgs: b.querySelectorAll('img.cic').length });
    b.innerHTML = '단련 ' + keep;                    /* R1 — 584 시절의 그 라벨 */
    const r1 = read();
    b.innerHTML = '3';                               /* R2 — 아이콘까지 없앤 «수만» 라벨 */
    const r2 = read();
    b.innerHTML = keep;
    return { r1, r2, back: read() };
  });
  ok(/단련/.test(rev.r1.txt) && !/^[\d,]+$/.test(rev.r1.txt),
    '[R-a] ★ 옛 «단련 (아이콘) n» 을 주입하면 [2-a][2-b] 의 술어가 거짓이 된다(무른 술어가 아니다)',
    '«' + rev.r1.txt + '»');
  ok(rev.r2.imgs === 0 && /^[\d,]+$/.test(rev.r2.txt),
    '[R-b] 아이콘을 없애면 [2-c] 만 거짓이 된다 — 세 술어가 **서로 다른 것**을 잡는다', '아이콘 ' + rev.r2.imgs + '장');
  ok(!/단련/.test(rev.back.txt) && rev.back.imgs === 1,
    '[R-c] 원복하면 다시 초록이다', '«' + rev.back.txt + '»');

  console.log(`\nVERIFY670 ${pass}/${pass + fail}` + (fail ? `  ← FAIL ${fail}건` : ''));
  await ctx.close(); await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
