/* 작업 61 검증 — 가이드 미션 시스템 (기능).
   T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고, 결과가 저장(S)·HUD·
   다른 화면에 반영됨» 이 완료 조건이다. 아래 항목은 전부 «눌렀을 때 무엇이 바뀌는지» 를 본다.

     §1 초기 상태      배너가 미완료(todo) 상태로 «[미션-1] 스킬 1회 소환하기 (0/1) 💎300»
     §2 진행 반영      카운터가 오르면 배너 진행 수치가 따라 오른다
     §3 보상받기 전이  목표 도달 → ready 상태 + 라벨 «[보상받기]» + 버튼 enabled
     §4 수령           배너 클릭 → 다이아 +보상 · idx +1 · 배너가 다음 미션으로 · localStorage 반영
     §5 미완료 클릭    미완료 상태에서 클릭하면 Δ0 (재화·idx 불변)
     §6 델타형 기준선  누적 카운터가 이미 큰 상태로 미션이 시작돼도 진행은 0 부터
     §7 절대형(abs)    «스테이지 N 도달» 은 기준선 없이 누적값 그대로
     §8 마이그레이션   구 세이브 {tuto:n} → guide{idx:n} · null/문자열/필드없음 방어 · NaN 0건
     §9 영속성         수령 후 reload 해도 idx 유지 (50 교훈 2 — addInitScript 금지, 페이지 안에서 올린다)
     §10 03 던전 해금  잠금 라벨이 «가이드미션 N 클리어» · idx 가 N 이 되면 해금
     §11 체인 완주     마지막 미션 수령 후 배너가 사라진다(.off)
     §12 58 연출       수령 시 fx 레이어에 파티클/토스트가 실제로 생성된다
     §13 기하          배너가 탭바·좌하단 유틸과 겹치지 않고 프레임 밖으로 새지 않는다

   사용: node tools/verify61.js [불러올.html] [출력.json]
   브라우저: PW_CHROMIUM 또는 /opt/pw-browsers/chromium */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium',
                 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  for (const p of cands) { try { if (fs.statSync(p).isFile()) return { executablePath: p }; } catch (e) {} }
  return {};
}

const R = [];
const ok  = (n, c, d) => R.push({ n, ok: !!c, d: d === undefined ? '' : String(d) });
const eq  = (n, a, b) => ok(n, a === b, `got=${JSON.stringify(a)} want=${JSON.stringify(b)}`);

/* 위임 핸들러를 타야 하는 클릭은 query 와 click 을 같은 태스크 안에 (50 교훈 1) */
const click = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s); if (!el) throw new Error('no ' + s); el.click();
}, sel);

const snap = page => page.evaluate(() => {
  const b = document.getElementById('tuto');
  const cs = getComputedStyle(b);
  return {
    off:   b.classList.contains('off'),
    todo:  b.classList.contains('todo'),
    ready: b.classList.contains('ready'),
    disp:  cs.display,
    label: document.getElementById('tutoBtn').textContent,
    dis:   document.getElementById('tutoBtn').disabled,
    name:  document.getElementById('tutoName').textContent,
    rew:   document.getElementById('tutoRew').textContent,
    sub:   document.getElementById('tutoSub').textContent,
    idx:   S.guide.idx, prog: S.guide.prog, dia: S.dia
  };
});

(async () => {
  const target = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
  const outp   = process.argv[3] || null;
  const url    = 'file://' + path.resolve(target);
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }

  const errs = [];
  const newPage = async ctx => {
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    return p;
  };
  const ctx  = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await newPage(ctx);
  await page.goto(url);
  await page.waitForTimeout(1200);

  /* 체인 정의를 한 번 읽어 둔다 — 기대값을 코드가 아니라 데이터에서 만든다 */
  const G = await page.evaluate(() => GUIDE.map(m => ({ n: m.n, goal: m.goal, dia: m.dia, abs: !!m.abs })));
  ok('§0 체인 20개', G.length === 20, 'len=' + G.length);
  ok('§0 보상은 전부 다이아(>0)', G.every(m => m.dia > 0));
  ok('§0 체인에 소환·강화·장비장착·훈련·던전·보스·스킬장착·룰렛·출석이 모두 있다',
     ['소환','강화','장비 장착','훈련','던전','보스','스킬 장착','룰렛','출석']
       .every(k => G.some(m => m.n.includes(k))),
     G.map(m => m.n).join(' / '));

  /* ---------- §1 초기 상태 ---------- */
  let s = await snap(page);
  eq('§1 idx=0', s.idx, 0);
  ok('§1 미완료(todo) 상태', s.todo && !s.ready, JSON.stringify({ todo: s.todo, ready: s.ready }));
  eq('§1 라벨 [미션-1]', s.label, '[미션-1]');
  eq('§1 문구 «목표 (진행/목표)»', s.name, G[0].n + ' (0/' + G[0].goal + ')');
  eq('§1 보상 아이콘 💎', s.rew, '💎');
  eq('§1 보상 수량', s.sub, String(G[0].dia));
  ok('§1 버튼 disabled', s.dis === true);
  ok('§1 NaN/undefined 표기 0건',
     ![s.label, s.name, s.sub].some(t => /NaN|undefined|null/.test(t)),
     [s.label, s.name, s.sub].join(' | '));

  /* ---------- §2 진행 반영 (델타형) ---------- */
  /* 미션 7 «적 100마리 처치» 로 옮겨 놓고 절반만 올린다 */
  await page.evaluate(() => { S.guide.idx = 6; gmStart(); });
  await page.waitForTimeout(80);
  const kill0 = await page.evaluate(() => S.totalKills);
  await page.evaluate(() => { S.totalKills += 40; });
  await page.waitForTimeout(80);
  s = await snap(page);
  eq('§2 진행이 카운터를 따라 오른다', s.name, G[6].n + ' (40/' + G[6].goal + ')');
  ok('§2 아직 미완료', s.todo && s.dis === true);

  /* ---------- §6 델타형 기준선 ---------- */
  ok('§6 기준선이 미션 시작 시점 카운터로 찍혔다', s.prog === kill0, `prog=${s.prog} kill0=${kill0}`);

  /* ---------- §5 미완료 클릭 → Δ0 ---------- */
  const before = { idx: s.idx, dia: s.dia };
  await click(page, '#tuto');
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§5 미완료 클릭 Δ0 (idx·다이아 불변)', s.idx === before.idx && s.dia === before.dia,
     `idx ${before.idx}→${s.idx} dia ${before.dia}→${s.dia}`);

  /* ---------- §3 보상받기 전이 ---------- */
  await page.evaluate(() => { S.totalKills += 60; });
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§3 ready 상태로 전이', s.ready && !s.todo, JSON.stringify({ todo: s.todo, ready: s.ready }));
  eq('§3 라벨 [보상받기]', s.label, '[보상받기]');
  eq('§3 문구 (100/100)', s.name, G[6].n + ' (100/100)');
  ok('§3 버튼 enabled', s.dis === false);

  /* ---------- §12 58 연출 + §4 수령 ---------- */
  const diaBefore = s.dia;
  await click(page, '#tuto');
  await page.waitForTimeout(120);
  const fx = await page.evaluate(() => {
    const L = document.getElementById('fxl');
    return { n: L ? L.childElementCount : -1,
             toast: L ? L.querySelectorAll('.fx-toast').length : -1 };
  });
  ok('§12 fx 레이어에 연출 요소가 생성됐다', fx.n > 0, 'fxl children=' + fx.n);
  ok('§12 토스트 1개 이상', fx.toast > 0, 'toast=' + fx.toast);

  s = await snap(page);
  eq('§4 idx +1', s.idx, 7);
  eq('§4 다이아 +보상', s.dia, diaBefore + G[6].dia);
  eq('§4 배너가 다음 미션으로', s.name, G[7].n + ' (' + (await page.evaluate(() => Math.min(S.best, GUIDE[7].goal))) + '/' + G[7].goal + ')');
  eq('§4 라벨이 [미션-8] 로', s.label, '[미션-8]');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('idle_hunter_save_v4')).guide);
  ok('§4 localStorage 에 저장됨', stored && stored.idx === 7, JSON.stringify(stored));

  /* ---------- §7 절대형(abs) ---------- */
  /* 미션 8 «스테이지 5 도달» = abs. 기준선을 쓰지 않고 누적값이 그대로 진행이다 */
  ok('§7 abs 미션의 기준선은 0', s.prog === 0, 'prog=' + s.prog);
  await page.evaluate(() => { S.best = 3; });
  await page.waitForTimeout(120);
  s = await snap(page);
  eq('§7 abs 진행 = 누적값', s.name, G[7].n + ' (3/5)');
  await page.evaluate(() => { S.best = 5; });
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§7 abs 목표 도달 → ready', s.ready, s.label);

  /* ---------- §10 03 던전 해금 ---------- */
  const dunLock = async () => page.evaluate(() => {
    openDungeon();
    const cards = [...document.querySelectorAll('#dunList .dnc')].map(c => {
      const lk = c.querySelector('.lk');
      return { id: c.dataset.dcard, locked: !!lk, label: lk ? lk.textContent.replace(/\s+/g, ' ').trim() : '' };
    });
    return { cards, gm: Object.keys(DUN_UI).reduce((o, k) => (o[k] = DUN_UI[k].gm, o), {}) };
  });
  await page.evaluate(() => { S.guide.idx = 0; gmStart(); });
  let dl = await dunLock();
  const relic = dl.cards.find(c => c.id === 'relic');
  ok('§10 유물 던전이 잠겨 있다', relic && relic.locked, JSON.stringify(relic));
  ok('§10 잠금 라벨이 «가이드미션 N 클리어»', /가이드미션/.test(relic.label) && !/스테이지/.test(relic.label), relic.label);
  eq('§10 유물 던전 요구 미션', dl.gm.relic, 14);
  eq('§10 수련 던전 요구 미션', dl.gm.growth, 17);
  eq('§10 마왕 던전 요구 미션', dl.gm.boss, 20);
  await page.evaluate(() => { S.guide.idx = 14; gmStart(); renderDunPage(); });
  dl = await dunLock();
  ok('§10 idx=14 → 유물 던전 해금', !dl.cards.find(c => c.id === 'relic').locked);
  ok('§10 idx=14 에서도 마왕 던전은 잠김', dl.cards.find(c => c.id === 'boss').locked);
  await page.evaluate(() => { const b = document.querySelector('#dunw .dnw-x, #dunw [data-close]'); if (b) b.click(); });

  /* ---------- §13 기하 ---------- */
  const geo = await page.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
    const F = el => { const b = el.getBoundingClientRect();
      return { x:+((b.left-ar.left)/sc).toFixed(1), y:+((b.top-ar.top)/sc).toFixed(1),
               w:+(b.width/sc).toFixed(1), h:+(b.height/sc).toFixed(1) }; };
    const hit = (a, b) => !(a.x+a.w <= b.x+0.5 || b.x+b.w <= a.x+0.5 || a.y+a.h <= b.y+0.5 || b.y+b.h <= a.y+0.5);
    const t = F(document.getElementById('tuto'));
    const others = {};
    /* #battlefoot 는 전폭 «빈 컨테이너» 라 bbox 로 재면 배너와 늘 스치게 나온다.
       실제로 보이는 자식(#slots)만 본다 — #hpwrap 은 02 가 display:none 으로 껐다. */
    ['#tabbar', '#botleft', '#spdb', '#slots'].forEach(k => {
      const el = document.querySelector(k); if (el) others[k] = F(el);
    });
    return { t, others, over: Object.keys(others).filter(k => hit(t, others[k])) };
  });
  ok('§13 배너가 프레임 안에 (좌·상·하)', geo.t.x >= 0 && geo.t.y >= 0 && geo.t.y + geo.t.h <= 2280,
     JSON.stringify(geo.t));
  ok('§13 탭바·좌하단 유틸·배속·슬롯과 겹침 0', geo.over.length === 0,
     geo.over.join(',') + ' / ' + JSON.stringify(geo.others));

  /* ---------- §11 체인 완주 ---------- */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; S.guide.prog = 0; });
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§11 완주하면 배너가 사라진다', s.off && s.disp === 'none', JSON.stringify({ off: s.off, disp: s.disp }));

  /* ---------- §9 영속성 (50 교훈 2 — addInitScript 금지) ---------- */
  await page.evaluate(() => { S.guide.idx = 3; gmStart(); save(); });
  await page.reload();
  await page.waitForTimeout(1200);
  s = await snap(page);
  eq('§9 reload 후 idx 유지', s.idx, 3);
  eq('§9 reload 후 배너 라벨', s.label, '[미션-4]');

  /* ---------- §8 마이그레이션 (별도 컨텍스트, addInitScript 로 옛 세이브 주입 — 44 교훈 1) ---------- */
  const KEY = 'idle_hunter_save_v4';
  const variants = [
    { t: '구 세이브 {tuto:5}',      save: { tuto: 5, totalKills: 999999, dia: 100 }, wantIdx: 5 },
    { t: '구 세이브 {tuto:0}',      save: { tuto: 0, totalKills: 999999, dia: 100 }, wantIdx: 0 },
    { t: 'guide 없음(신규 필드)',   save: { dia: 100, totalKills: 12345 },           wantIdx: 0 },
    { t: 'guide:null',              save: { guide: null, dia: 100 },                 wantIdx: 0 },
    { t: 'guide:"x" (문자열)',      save: { guide: 'x', dia: 100 },                  wantIdx: 0 },
    { t: 'guide 필드 결손',         save: { guide: {}, dia: 100 },                   wantIdx: 0 },
    { t: 'guide idx 문자열',        save: { guide: { idx: 'a', prog: 'b' }, dia: 100 }, wantIdx: 0 },
    { t: 'guide idx 초과',          save: { guide: { idx: 999, prog: 0 }, dia: 100 }, wantIdx: 20 }
  ];
  for (const v of variants) {
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
    await c2.addInitScript(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY, v.save]);
    const p2 = await newPage(c2);
    await p2.goto(url);
    await p2.waitForTimeout(1000);
    const m = await p2.evaluate(() => ({
      idx: S.guide.idx, prog: S.guide.prog,
      finite: Number.isFinite(S.guide.idx) && Number.isFinite(S.guide.prog),
      name: document.getElementById('tutoName').textContent,
      label: document.getElementById('tutoBtn').textContent,
      sub: document.getElementById('tutoSub').textContent,
      ready: document.getElementById('tuto').classList.contains('ready')
    }));
    ok('§8 ' + v.t + ' → idx=' + v.wantIdx, m.idx === v.wantIdx, JSON.stringify(m));
    ok('§8 ' + v.t + ' → idx·prog 유한', m.finite, JSON.stringify(m));
    ok('§8 ' + v.t + ' → 배너에 NaN/undefined 없음',
       ![m.name, m.label, m.sub].some(t => /NaN|undefined|null/.test(t)), [m.name, m.label, m.sub].join(' | '));
    /* 구 세이브가 누적 킬 99만이어도 «적 100마리» 미션이 즉시 완료되면 안 된다 */
    if (v.save.totalKills > 1000 && v.wantIdx < 20) {
      await p2.evaluate(() => { S.guide.idx = 6; S.guide.prog = -1; });
      await p2.waitForTimeout(120);
      const g = await p2.evaluate(() => ({
        name: document.getElementById('tutoName').textContent,
        ready: document.getElementById('tuto').classList.contains('ready') }));
      ok('§8 ' + v.t + ' → 기준선 미확정이 자동 확정돼 진행 0 부터',
         /\(0\//.test(g.name) && !g.ready, JSON.stringify(g));
    }
    await c2.close();
  }

  ok('콘솔·페이지 에러 0건', errs.length === 0, errs.slice(0, 5).join(' | '));

  await browser.close();

  const bad = R.filter(r => !r.ok);
  R.forEach(r => console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.n + (r.ok ? '' : '   → ' + r.d)));
  console.log(`\nVERIFY61 ${bad.length ? 'FAIL' : 'PASS'} ${R.length - bad.length}/${R.length}`);
  if (outp) fs.writeFileSync(outp, JSON.stringify(R, null, 2));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
