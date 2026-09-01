/* 작업 350 재현 프로브 — «보스전 HUD 파란 동그라미가 보스 체력바 밑으로 삐쭉 튀어나옴»
 *
 *   node tools/probe350.js
 *
 * 주인 보고: «보스전때 보면 저렇게 뭐 동그란거 파란거 약간 삐쭉 튀어나와있더라 이거 없애기 ui에»
 *            (스크린샷 — STAGE 246 보스전, 체력바 우측 아래 파란 원 일부 노출)
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify350.js`) **무엇이 어떻게
 * 어긋났는가를 눈으로 보는** 자리다. 338·341 규칙대로 등재문의 처방을 따르기 **전에** 재현했다.
 *
 * ⚑ **338·341 과 달리 등재문의 가설이 그대로 확인됐다.** 재현 결과:
 *   · 28 규격 HUD 를 쓰는 **세 모드 전부**(BOSS_HUD28 = stage·raid·promo)에서 `.kboss` 가
 *     프레임 (699..781, 245..327) 에 살아 있고, 보스 체력바는 (190..890, 231..298) 이라
 *     **하변 아래로 정확히 29px** · 가로로는 바 안쪽(겹침 82px) = «바 밑으로 삐쭉» 그대로.
 *   · 그 자리의 **찍힌 픽셀**이 `.kboss` 3중 원판 색이다 — 위에서부터 원판 #2A3E81 · 링 #4CBAED ·
 *     테 #141414. 등재문 처방 ③(«다른 요소일 가능성»)이 이걸로 기각된다.
 *   · 뿌리는 «규칙이 안 따라온 것»이지 새 결정이 아니다 — 측정표 `docs/measure/28-보스전.md` 의
 *     «해골 노드» 행은 39(보스전 중)를 이미 **«없음**(체력바 끝 소형 두개골 46×42 로 대체)» 이라 적어 뒀다.
 *
 * 수리 뒤에도 이 파일이 살아 있으려면 «수리 전» 을 재현할 수 있어야 하므로,
 * **소스 사본**(`.kboss` 를 숨김 목록에서 뺀 index.html 임시 복사본)과 **현재 파일** 을 둘 다 띄워
 * 나란히 잰다 — 파일은 한 글자도 안 건드린다(343 §R 과 같은 처방).
 *
 * ⚠ 두 함정을 지나야 이 측정이 맞는다:
 *   ① `#stinfo`·`#bossHp` 는 둘 다 `pointer-events:none` 이라 `elementFromPoint` 가 캔버스로
 *      빠진다(1회차에 0/10 이 나왔다) → **찍힌 픽셀**을 캔버스로 되읽는다(data URL 은 오염 없음).
 *   ② 60 «보스 등장» 쥬시(비네트·슬램)가 화면을 덮은 채 찍히면 색이 통째로 어두워진다
 *      → 연출이 걷힐 때까지 기다렸다가 rect 와 캡처를 같은 순간에 잡는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const SHOTS = path.resolve(__dirname, '../docs/shots');

/* 숨김 목록에서 `.kboss` 만 뺀 «수리 전» 사본. 원본 파일은 안 건드린다.
   같은 폴더에 둬야 상대 경로 리소스가 그대로 풀린다(이 저장소는 index.html 단일 파일이다). */
const HIDE_NEW = '#stinfo.bfight .kbar,#stinfo.bfight .knode,#stinfo.bfight .kboss,';
const HIDE_OLD = '#stinfo.bfight .kbar,#stinfo.bfight .knode,';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* .kboss 3중 원판 색 — 바깥 테 #141414 · 링 #4CBAED(시안) · 원판 #2A3E81(네이비) */
const KC = { '#141414': '테(검정)', '#4CBAED': '링(시안)', '#2A3E81': '원판(네이비)' };

const MODES = [
  ['stage', '스테이지 보스전(주인 스크린샷의 자리)'],
  ['raid', '46 레이드'],
  ['promo', '284 승급전'],
  ['farm', '162 재도전 대기(.bfarm — 여기는 kboss 가 살아 있어야 정상)'],
];

async function measure(page, url, tag) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  /* 상태는 **실제 진입점** 으로 만든다(플래그 직접 대입 금지) */
  const enter = (md) => ev(([m]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 246; S.best = 246; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    promo = null; raidOn = null; bossOn = false; S.bossFarm = false;
    enemies.length = 0; spawnQ.length = 0;

    if (m === 'stage') startBoss();
    else if (m === 'raid') { S.raidTk = 9; startRaid(RAIDS[0]); }
    else if (m === 'promo') { S.rank = 0; startPromo(); }
    else if (m === 'farm') S.bossFarm = true;
    drawBossHud();

    const R = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        bottom: +r.bottom.toFixed(1), right: +r.right.toFixed(1), disp: cs.display, z: cs.zIndex };
    };
    return { md: bossMode(), cls: document.getElementById('stinfo').className,
      kboss: R('#stinfo .kboss'), hp: R('#bossHp') };
  }, [md]);

  console.log('\n--- [' + tag + '] ---');
  const got = {};
  for (const [md, name] of MODES) {
    const r = await enter(md);
    got[md] = r;
    if (r.__err) { console.log('  [' + md + '] 진입 실패: ' + r.__err); fail++; continue; }
    let line = '  ' + md.padEnd(6) + ' cls="' + r.cls + '" · .kboss ';
    line += r.kboss.disp === 'none' ? 'display:none'
      : (r.kboss.x + '..' + r.kboss.right + ' / ' + r.kboss.y + '..' + r.kboss.bottom + ' (' + r.kboss.w + '×' + r.kboss.h + ')');
    if (r.hp && r.hp.disp !== 'none' && r.kboss.disp !== 'none') {
      line += ' ⇒ 바(' + r.hp.y + '..' + r.hp.bottom + ') 하변 아래로 **' +
        (r.kboss.bottom - r.hp.bottom).toFixed(1) + 'px** · 가로 겹침 ' +
        (Math.min(r.kboss.right, r.hp.right) - Math.max(r.kboss.x, r.hp.x)).toFixed(1) + 'px';
    }
    console.log(line + '   « ' + name);
  }

  /* 픽셀 — 스테이지 보스전으로 되돌리고 쥬시가 걷힌 뒤 rect·캡처를 같은 순간에 */
  await enter('stage');
  await page.waitForTimeout(1600);
  const now = await ev(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1),
        bottom: +r.bottom.toFixed(1), right: +r.right.toFixed(1), disp: getComputedStyle(e).display }; };
    return { kboss: R('#stinfo .kboss'), hp: R('#bossHp') };
  });
  const shot = path.join(SHOTS, 'probe350-' + tag + '.png');
  await page.screenshot({ path: shot });

  let px = [];
  const k = now.kboss, h = now.hp;
  /* .kboss 가 꺼져 있으면 «있었을 자리» 를 훑는다 — 수리 후에도 같은 좌표를 봐야 대조가 된다 */
  const box = (k && k.disp !== 'none') ? k : { x: 699, right: 781, y: 245, bottom: 327 };
  if (h && h.disp !== 'none') {
    const cx = Math.round((box.x + box.right) / 2), ys = [];
    for (let y = Math.round(box.y) + 2; y < Math.round(box.bottom) - 1; y += 3) ys.push(y);
    const b64 = fs.readFileSync(shot).toString('base64');
    const r = await ev(([data, sx, yy]) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        res(yy.map((y) => {
          const d = g.getImageData(sx, y, 1, 1).data;
          return { y, hex: '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase() };
        }));
      };
      im.onerror = () => rej(new Error('이미지 로드 실패'));
      im.src = 'data:image/png;base64,' + data;
    }), [b64, cx, ys]);
    if (r.__err) { console.log('  픽셀 읽기 실패: ' + r.__err); fail++; }
    else {
      px = r.filter((p) => p.y > h.bottom);
      console.log('  픽셀 x=' + cx + ' · 바 하변 y=' + h.bottom + ' 아래 ' + px.length + '표본: ' +
        px.map((p) => p.hex + (KC[p.hex] ? '←' + KC[p.hex] : '')).join(' '));
    }
  }
  console.log('  캡처 docs/shots/probe350-' + tag + '.png · 콘솔 에러 ' + errs.length + '건');
  return { got, px, errs };
}

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const cur = fs.readFileSync(SRC, 'utf8');
  if (cur.indexOf(HIDE_NEW) < 0) {
    console.log('probe350 — 숨김 목록에서 350 의 자리를 못 찾았다(index.html 이 바뀌었다). 사본 재현 불가.');
    process.exit(1);
  }
  const tmp = path.resolve(__dirname, `../index.probe350-before-${process.pid}.html`);
  fs.writeFileSync(tmp, cur.replace(HIDE_NEW, HIDE_OLD));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  console.log('=== §1 28 규격 HUD 4 모드 — .kboss vs #bossHp 실측 ===');
  const p1 = await ctx.newPage();
  const before = await measure(p1, 'file://' + tmp, 'before');
  const p2 = await ctx.newPage();
  const after = await measure(p2, 'file://' + SRC, 'after');

  console.log('\n=== §2 판정 — 수리 전(사본) 이 주인 보고를 재현하는가 ===');
  const bs = before.got.stage;
  if (bs && bs.kboss && bs.hp) {
    const under = bs.kboss.bottom - bs.hp.bottom;
    ok(bs.kboss.disp !== 'none', '[재현] .bfight 에서 .kboss 가 표시 중 (display=' + bs.kboss.disp + ')');
    ok(Math.abs(under - 29) < 1.5, '[재현] 체력바 하변 아래로 29px 삐져나온다 (실측 ' + under.toFixed(1) + 'px)');
    ok(bs.kboss.x > bs.hp.x && bs.kboss.right < bs.hp.right,
      '[재현] 가로로는 바 안쪽 = «바 밑으로 삐쭉» 한 그림 (' + bs.kboss.x + '..' + bs.kboss.right + ' ⊂ ' + bs.hp.x + '..' + bs.hp.right + ')');
  } else ok(false, '[재현] 수리 전 rect 측정 실패');
  const bk = before.px.filter((p) => KC[p.hex]);
  ok(bk.length > 0, '[재현·처방③] 그 자리의 **찍힌 픽셀**이 .kboss 색이다 ' + bk.length + '/' + before.px.length +
    ' — 파란 원은 다른 요소가 아니다');
  ok(before.px.some((p) => p.hex === '#4CBAED'), '[재현·처방③] 그 중 «파란(시안 #4CBAED)» 이 있다 — 주인 원문 «파란거» 와 일치');
  ok(MODES.slice(0, 3).every((m) => { const g = before.got[m[0]]; return g && g.kboss && g.kboss.disp !== 'none'; }),
    '[재현·처방②] BOSS_HUD28 세 모드(stage·raid·promo) 전부에서 재현된다');

  console.log('\n=== §3 판정 — 수리 후(현재 파일) 가 그것을 닫았는가 ===');
  ok(MODES.slice(0, 3).every((m) => { const g = after.got[m[0]]; return g && g.kboss && g.kboss.disp === 'none'; }),
    '[수리] 세 모드 전부에서 .kboss 가 display:none');
  ok(after.px.length > 0 && after.px.every((p) => !KC[p.hex]),
    '[수리] 같은 좌표의 픽셀에 .kboss 색이 한 표본도 없다 (' + after.px.map((p) => p.hex).join(' ') + ')');
  const af = after.got.farm, bf = before.got.farm;
  ok(af && af.kboss && af.kboss.disp !== 'none' && af.kboss.w === 120,
    '[전제] .bfarm(40) 의 kboss 는 중앙 Ø120 으로 그대로 살아 있다 (w=' + (af && af.kboss ? af.kboss.w : '?') + ') — 여기까지 끄면 40 화면이 깨진다');
  ok(af && bf && af.kboss && bf.kboss && af.kboss.x === bf.kboss.x && af.kboss.y === bf.kboss.y,
    '[전제] .bfarm kboss 좌표가 수리 전후 Δ0 (' + (af && af.kboss ? af.kboss.x + ',' + af.kboss.y : '?') + ')');
  ok(after.got.stage && after.got.stage.hp && after.got.stage.hp.y === 231 && after.got.stage.hp.w === 700,
    '[전제] 보스 체력바 자체는 Δ0px (190,231,700×67 — 레이아웃 변경 없음)');
  ok(after.errs.length === 0, '[전제] 콘솔 에러 0건 (' + after.errs.length + ')');

  try { fs.unlinkSync(tmp); } catch (e) {}
  console.log('\nprobe350 — ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
