#!/usr/bin/env node
/* 작업 63 — 2회차: «중앙 정렬 다이얼로그 일괄 +54px» 실측 도구
 *
 *   node tools/dlg63.js            # 2280 / 2340 / 1920 / 1600 프레임에서 다이얼로그 상자 top 실측
 *
 * 목표값 = **측정표에 적힌 레퍼런스 절대 y − 84** (지시서 [2] 의 단일 변환). 아래 `ref` 필드가 그 출처다.
 *
 *   ⚠ 2회차에 «top(2340) − 84» 로 목표를 유도하던 방식은 버렸다. 그 방식은 중앙 정렬 상자면
 *   무엇이든 자동으로 +54 가 나와서(중앙 정렬은 프레임 60px 당 30px 이동) **오차를 검증하지 못한다**.
 *   실제로 01 은 그 방식이 −54 를 지시했지만 측정표 대조 결과 정답은 **+34** 였다.
 *
 * 짧은 기기(1600)에서는 HUD(0..104) 침범 여부만 본다 — 상자가 max-height 로 눌리는 건 정상이다.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

/* 중앙 정렬 다이얼로그 계열 — aspect63.js 의 오프너를 그대로 쓴다.
   ref = 레퍼런스 절대 y(상자 border-box 상단). 출처를 `src` 에 남긴다 — 눈대중 값은 하나도 없다. */
const SCREENS = [
  { id: '01', name: '오프라인보상', host: '#offw',  box: '.ofrs',    ref: 772, src: '측정표 01 «바깥 테두리 y772~778» (+ .ofr-box{top:0} 이 .ofrs 원점)', open: `showOfflineReward(7200, 12000, 30)` },
  { id: '04', name: '던전세부',     host: '#dgdw',  box: '.dgd-box', ref: 614, src: '측정표 04 «모달 바깥 614~1810»', open: `openDungeon(); openDunDetail(DUNGEONS[0])` },
  { id: '05', name: '무기팝업',     host: '#wpnw',  box: '.wm',      ref: 478, src: '측정표 05 «바깥 박스 478..1946»', open: `openWeapon(null,'weapon')` },
  { id: '08', name: '스킬세부',     host: '#modal', box: '.mbox',    ref: 714, src: '측정표 08 «중심 1212.5 = (714+1711)/2»', open: `showSkillDetail(SKILLS[0].id)` },
  { id: '11', name: '소환부분정보', host: '#prbw',  box: '.prb',     ref: 590, src: '측정표 11 «바깥 박스 590..1760»', open: `openProbInfo('weapon',1)` },
  { id: '16', name: '유물세부',     host: '#modal', box: '.mbox',    ref: 740, src: '측정표 16 §2 «top/bottom 740/1687»', open: `showRelicDetail(RELICS[0].id)` },
  { id: '19', name: '프로필',       host: '#pfw',   box: '.pf',      ref: 515, src: '측정표 19 / 63 1회차에서 절대 top 431 로 고정됨', open: `openProfile()` },
  { id: '20', name: '스펙정보',     host: '#specw', box: '.spc',     ref: 515, src: '측정표 20 «바깥 박스 y 515–1910»', open: `openSpec()` },
  { id: '21', name: '도감보너스',   host: '#collw', box: '.cl',      ref: 356, src: '측정표 21 «세로 중심 1127.5» − h1543/2', open: `openColl21()` },
  { id: '22', name: '퀘스트',       host: '#modal', box: '.mbox',    ref: 464, src: '측정표 22 «검정 코어 464..1960 = h1497»', open: `openQuest()` },
  { id: '29', name: '룰렛',         host: '#modal', box: '.mbox',    ref: null, src: '레퍼런스 이미지 없음(연출 교체) — A5 껍데기 규칙만 따른다', open: `openRoulette()` },
  { id: '33', name: '재화정보',     host: '#ciw',   box: '.ci',      ref: 781, src: '측정표 33 «팝업 border-box y 781..1593»', open: `openCurInfo('gold')` },
];

const HEIGHTS = [2280, 2340, 1920, 1600];

/* 상자 실측 — box 셀렉터가 없으면 오버레이의 «가장 큰 보이는 자식» 을 상자로 본다 */
const PROBE = (hostSel, boxSel) => `(() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const r2 = (v) => Math.round(v * 2) / 2;
  const vis = (e) => { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const host = document.querySelector(${JSON.stringify(hostSel)});
  if (!host || !vis(host)) return { missing: true };
  let box = ${JSON.stringify(boxSel)} ? host.querySelector(${JSON.stringify(boxSel)}) : null;
  if (!box || !vis(box)) {
    const kids = [...host.children].filter(vis);
    box = kids.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
  }
  if (!box) return { missing: true };
  const R = box.getBoundingClientRect();
  const cs = getComputedStyle(host);
  return { frameH: Math.round(A.height),
    box: (box.id ? '#' + box.id : '.' + (box.className || '').toString().trim().split(/\\s+/)[0]),
    top: r2(R.top - A.top), h: r2(R.height), bottom: r2(R.bottom - A.top),
    pad: cs.paddingTop + '/' + cs.paddingBottom };
})()`;

(async () => {
  const exePath = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM]
    .filter(Boolean).find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: exePath }); }

  const out = {};
  for (const H of HEIGHTS) {
    const page = await browser.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    for (const sc of SCREENS) {
      await page.goto(URL); await page.waitForTimeout(320);
      await page.evaluate(`try{ ${sc.open} }catch(e){ window.__e = String(e && e.message || e); }`);
      await page.waitForTimeout(380);
      const err = await page.evaluate(() => window.__e || null);
      const m = await page.evaluate(PROBE(sc.host, sc.box));
      (out[sc.id] ||= { name: sc.name, host: sc.host })[H] = err ? { err } : m;
    }
    await page.close();
  }
  await browser.close();

  console.log('\n== 중앙 정렬 다이얼로그 — 상자 top 실측 (기준 프레임 1080x2280) ==');
  console.log('id  화면            상자          h     ref    목표(ref-84)  실측2280   편차    1600:top(HUD104)');
  const rows = [];
  for (const sc of SCREENS) {
    const v = out[sc.id] || {}, a = v[2280], s = v[1600];
    if (!a || a.missing || a.err) {
      console.log(`${sc.id}  ${sc.name.padEnd(14)}  ** 측정 실패 ** ${JSON.stringify(a || {}).slice(0, 90)}`); continue;
    }
    const target = sc.ref == null ? null : sc.ref - 84;
    const dev = target == null ? null : a.top - target;
    const hud = s && !s.missing && !s.err ? s.top : NaN;
    rows.push({ id: sc.id, name: sc.name, box: a.box, h: a.h, ref: sc.ref, src: sc.src,
      target, t2280: a.top, dev, t1600: hud, hudHit: hud < 104 });
    console.log(`${sc.id}  ${sc.name.padEnd(14)}  ${String(a.box).padEnd(10)} ${String(a.h).padEnd(6)}`
      + `${String(sc.ref ?? '—').padEnd(7)}${String(target ?? '—(ref 없음)').padEnd(14)}`
      + `${String(a.top).padEnd(11)}`
      + `${dev == null ? '—' : (dev > 0 ? '+' : '') + dev}`.padEnd(8)
      + `${hud}${hud < 104 ? '  ⚠HUD침범' : ''}`);
  }
  const bad = rows.filter(r => r.dev != null && Math.abs(r.dev) > 1);
  const hud = rows.filter(r => r.hudHit);
  console.log(`\n편차 |dev|>1 : ${bad.length}개  [${bad.map(r => r.id + '(' + (r.dev > 0 ? '+' : '') + r.dev + ')').join(' ')}]`);
  console.log(`1600 프레임 HUD(104) 침범 : ${hud.length}개  [${hud.map(r => r.id + '(top' + r.t1600 + ')').join(' ')}]`);
  console.log(bad.length === 0 && hud.length === 0 ? '\nDLG63 PASS' : '\nDLG63 FAIL');
  fs.writeFileSync(path.join(ROOT, 'docs', 'shots', '63-dlg.json'), JSON.stringify({ rows, raw: out }, null, 1));
  console.log('→ docs/shots/63-dlg.json');
})();
