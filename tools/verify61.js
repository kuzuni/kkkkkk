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

   ⚠ 상태를 바꾼 뒤 rAF 루프의 drawTuto() 를 «기다리지» 마라 — 헤드리스에서 rAF 가 스로틀되면
      고정 대기(120ms)가 간헐 실패한다(29-② · 41-④ 부류의 플레이크). 상태 변경과 drawTuto() 를
      **같은 evaluate 안에서** 부른다.

   사용: node tools/verify61.js [불러올.html] [출력.json]
   브라우저: PW_CHROMIUM 또는 /opt/pw-browsers/chromium */
const fs = require('fs'), path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

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
    pg:    document.getElementById('tutoPg').textContent,
    pgVis: getComputedStyle(document.getElementById('tutoPg')).display,
    dot:   getComputedStyle(document.getElementById('tuto').querySelector('.trew'), '::after').display,
    bg:    getComputedStyle(b).backgroundImage === 'none' ? getComputedStyle(b).backgroundColor : 'gradient',
    bc:    getComputedStyle(b).borderTopColor,
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
  try { browser = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await launch(chromium, o); }

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
  /* 73 부터 dia 가 함수인 미션이 있다(evaluate 의 JSON 직렬화에서 undefined 로 떨어진다) → gmDia 로 값을 읽는다 */
  const G = await page.evaluate(() => GUIDE.map(m => ({ n: m.n, goal: m.goal, dia: gmDia(m), abs: !!m.abs })));
  ok('§0 체인 21개(76 목걸이 삽입)', G.length === 21, 'len=' + G.length);
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
  eq('§1 문구 = 미션 이름', s.name, G[0].n);
  eq('§1 3번째 줄 «(진행/목표)»', s.pg, '(0/' + G[0].goal + ')');
  ok('§1 미완료는 3번째 줄이 보인다', s.pgVis !== 'none', s.pgVis);
  ok('§1 미완료 바탕은 반투명 검정(그라디언트 아님)', s.bg === 'rgba(0, 0, 0, 0.55)', s.bg);
  ok('§1 미완료는 테두리가 안 보인다', /transparent|rgba\(0, 0, 0, 0\)/.test(s.bc), s.bc);
  ok('§1 미완료는 레드닷 없음', s.dot === 'none', s.dot);
  eq('§1 보상 아이콘 💎', s.rew, '💎');
  eq('§1 보상 수량', s.sub, String(G[0].dia));
  ok('§1 버튼 disabled', s.dis === true);
  ok('§1 NaN/undefined 표기 0건',
     ![s.label, s.name, s.sub].some(t => /NaN|undefined|null/.test(t)),
     [s.label, s.name, s.sub].join(' | '));

  /* ---------- §2 진행 반영 (델타형) ---------- */
  /* 미션 8 «적 100마리 처치»(76 삽입으로 idx 7) 로 옮겨 놓고 절반만 올린다 */
  await page.evaluate(() => { S.guide.idx = 7; gmStart(); drawTuto(); });
  await page.waitForTimeout(80);
  const kill0 = await page.evaluate(() => S.totalKills);
  await page.evaluate(() => { S.totalKills += 40; drawTuto(); });
  await page.waitForTimeout(80);
  s = await snap(page);
  eq('§2 진행이 카운터를 따라 오른다', s.pg, '(40/' + G[7].goal + ')');
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
  await page.evaluate(() => { S.totalKills += 60; drawTuto(); });
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§3 ready 상태로 전이', s.ready && !s.todo, JSON.stringify({ todo: s.todo, ready: s.ready }));
  eq('§3 라벨 [보상받기]', s.label, '[보상받기]');
  eq('§3 문구 (100/100)', s.pg, '(100/100)');
  ok('§3 버튼 enabled', s.dis === false);
  ok('§3 보상받기는 3번째 줄이 숨는다', s.pgVis === 'none', s.pgVis);
  ok('§3 보상받기 바탕은 금색 그라디언트', s.bg === 'gradient', s.bg);
  ok('§3 보상받기는 검정 테두리', s.bc === 'rgb(0, 0, 0)', s.bc);
  ok('§3 보상받기는 레드닷 있음', s.dot !== 'none', s.dot);

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
  eq('§4 idx +1', s.idx, 8);
  eq('§4 다이아 +보상', s.dia, diaBefore + G[7].dia);
  eq('§4 배너가 다음 미션으로', s.name, G[8].n);
  eq('§4 라벨이 [미션-9] 로', s.label, '[미션-9]');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('idle_hunter_save_v4')).guide);
  ok('§4 localStorage 에 저장됨', stored && stored.idx === 8, JSON.stringify(stored));

  /* ---------- §7 절대형(abs) ---------- */
  /* 미션 9 «스테이지 5 도달» = abs. 기준선을 쓰지 않고 누적값이 그대로 진행이다 */
  ok('§7 abs 미션의 기준선은 0', s.prog === 0, 'prog=' + s.prog);
  await page.evaluate(() => { S.best = 3; drawTuto(); });
  await page.waitForTimeout(120);
  s = await snap(page);
  eq('§7 abs 진행 = 누적값', s.pg, '(3/5)');
  await page.evaluate(() => { S.best = 5; drawTuto(); });
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
  await page.evaluate(() => { S.guide.idx = 0; gmStart(); drawTuto(); });
  let dl = await dunLock();
  const relic = dl.cards.find(c => c.id === 'relic');
  ok('§10 유물 던전이 잠겨 있다', relic && relic.locked, JSON.stringify(relic));
  ok('§10 잠금 라벨이 «가이드미션 N 클리어»', /가이드미션/.test(relic.label) && !/스테이지/.test(relic.label), relic.label);
  eq('§10 유물 던전 요구 미션', dl.gm.relic, 15);
  eq('§10 수련 던전 요구 미션', dl.gm.growth, 18);
  eq('§10 마왕 던전 요구 미션', dl.gm.boss, 21);
  await page.evaluate(() => { S.guide.idx = 15; gmStart(); renderDunPage(); });
  dl = await dunLock();
  ok('§10 idx=15 → 유물 던전 해금', !dl.cards.find(c => c.id === 'relic').locked);
  ok('§10 idx=15 에서도 마왕 던전은 잠김', dl.cards.find(c => c.id === 'boss').locked);
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

  /* ---------- §14 최장 문자열 bbox (46 교훈 1) ----------
     보상 수량은 «300» ~ «3,000», 미션 이름은 최대 «스테이지 15 도달하기» 급이다.
     체인 전 미션을 한 번씩 띄워 보고 잉크가 배너·보상칸 밖으로 새지 않는지 본다. */
  const bleed = await page.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
    const F = el => { const b = el.getBoundingClientRect();
      return { x:(b.left-ar.left)/sc, y:(b.top-ar.top)/sc, w:b.width/sc, h:b.height/sc }; };
    const bad = [];
    for (let i = 0; i < GUIDE.length; i++){
      S.guide.idx = i; gmStart(); drawTuto();
      const tb = F(document.getElementById('tuto'));
      ['#tutoBtn', '#tutoName', '#tutoPg', '#tutoSub'].forEach(sel => {
        const g = F(document.querySelector(sel));
        if (g.w <= 0) return;                                  /* 숨은 줄은 건너뛴다 */
        if (g.x < tb.x - 0.5 || g.x + g.w > tb.x + tb.w + 0.5 ||
            g.y < tb.y - 0.5 || g.y + g.h > tb.y + tb.h + 12)   /* tsub 은 설계상 9px 아래로 돌출 */
          bad.push(`#${i+1} ${sel} ${JSON.stringify(g)} vs banner ${JSON.stringify(tb)}`);
      });
    }
    return bad;
  });
  ok('§14 20개 미션 전부 — 잉크가 배너 밖으로 새지 않는다', bleed.length === 0, bleed.slice(0, 3).join(' || '));

  /* ---------- §11 체인 완주 ---------- */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; S.guide.prog = 0; drawTuto(); });
  await page.waitForTimeout(120);
  s = await snap(page);
  ok('§11 완주하면 배너가 사라진다', s.off && s.disp === 'none', JSON.stringify({ off: s.off, disp: s.disp }));

  /* ---------- §9 영속성 (50 교훈 2 — addInitScript 금지) ---------- */
  await page.evaluate(() => { S.guide.idx = 3; gmStart(); drawTuto(); save(); });
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
    { t: 'guide idx 초과',          save: { guide: { idx: 999, prog: 0 }, dia: 100 }, wantIdx: 21 }
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
      pg: document.getElementById('tutoPg').textContent,
      ready: document.getElementById('tuto').classList.contains('ready')
    }));
    ok('§8 ' + v.t + ' → idx=' + v.wantIdx, m.idx === v.wantIdx, JSON.stringify(m));
    ok('§8 ' + v.t + ' → idx·prog 유한', m.finite, JSON.stringify(m));
    ok('§8 ' + v.t + ' → 배너에 NaN/undefined 없음',
       ![m.name, m.label, m.sub, m.pg].some(t => /NaN|undefined|null/.test(t)),
       [m.name, m.label, m.sub, m.pg].join(' | '));
    /* 구 세이브가 누적 킬 99만이어도 «적 100마리» 미션이 즉시 완료되면 안 된다 */
    if (v.save.totalKills > 1000 && v.wantIdx < 20) {
      await p2.evaluate(() => { S.guide.idx = 6; S.guide.prog = -1; drawTuto(); });
      await p2.waitForTimeout(120);
      const g = await p2.evaluate(() => ({
        pg: document.getElementById('tutoPg').textContent,
        ready: document.getElementById('tuto').classList.contains('ready') }));
      ok('§8 ' + v.t + ' → 기준선 미확정이 자동 확정돼 진행 0 부터',
         /^\(0\//.test(g.pg) && !g.ready, JSON.stringify(g));
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
