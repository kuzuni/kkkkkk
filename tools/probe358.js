/* 작업 358 재현기 — «플레이어 이동 속도를 올리는 축이 실제로 있는가»
 *
 *   node tools/probe358.js   → 마지막 줄이 `PROBE358 n/n` 이면 전 항이 측정됐다.
 *
 * 저장소 주인 지시(2026-08-29):
 *   «플레이어 이동속도 빨라지는거 넣지 말기. 유물 효과나 뭐나 쨌든 다 빼기»
 *
 * 338·341·350 규칙 — **처방을 따르기 전에 재현부터 한다.** 등재문은 «UPG spd · 프로필 스펙 행 ·
 * 유물/룬/축복/도감 보너스 표에 이속 축이 있는지 전수» 를 의심했다. 이 파일이 재는 것은 그 중
 * 어느 것이 **실제로 플레이어를 빠르게 만드는가** 다 — 이름이 «속도» 인 것과 이속을 올리는 것은 다르다
 * (`aspd`·`rate` 는 «공격 속도» 이고, RELIC_EFF.rate·COLL_EFFN.rate 도 공격 속도다).
 *
 *   §1 축 전수   보너스표(bonus())·유물·룬·축복·도감·계급이 «이동» 축을 갖는지 — 소스와 런타임 둘 다.
 *   §2 게터      `stat.speed` 를 성장 상태 4종에서 읽는다(Lv0 · spd Lv20 · 만렙 세이브 · 다른 축만 만렙).
 *   §3 실동작    게터가 아니라 **화면 위 플레이어**가 실제로 그만큼 빨라지는가(속도 피크 실측).
 *   §4 구매 경로 «강화» 탭에 이동 속도 행이 서 있고 골드로 실제로 살 수 있는가(T2 실동작 규칙).
 *
 * ── 수리 «전» 실측(2026-08-29, sess-2033-23950 · 이 파일이 찍은 원본 기록) ────────────────
 *   §1 UPG 10종(… def · **spd** · gold) · `get speed(){ return U.spd.val(lv('spd')); }`
 *      bonus() 축 = atk,cdmg,crit,gold,hp,pet,rate,regen — **이동 축 없음**
 *      RELIC_EFF.rate·COLL_EFFN.rate·BLESS[2] 는 전부 «공격 속도» (이름만 속도)
 *   §2 fresh 115 · spd Lv20 **205**(+78.3%) · «spd 뺀 다른 축 전부 만렙» 115(Δ0) ⇒ 축은 하나뿐
 *   §3 화면 실측 피크 spd Lv20 **204.7 px/s** = 게터를 그대로 따라간다
 *   §4 «강화» 탭 10행 — 이동 속도 행을 골드로 **실제로 살 수 있었다**(클릭 1회 115 → 119.5)
 *   ⇒ 등재문의 «유물이든 뭐든» 의심 중 실제로 걸린 것은 UPG `spd` **하나**였다.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let n = 0;
const say = (m, d) => { n++; console.log('  · ' + m + (d === undefined ? '' : ' — ' + d)); };
const blk = async (nm, fn) => { try { await fn(); } catch (e) { n++; console.log('  · [' + nm + '] 측정 실패 — ' + (e && e.message || e)); } };

/* 성장 상태 하나를 만들고 재는 공용 하네스.
   ⚠ 게임 루프가 돌면 다음 프레임이 상태를 되돌리므로(161 교훈) 상태를 박은 뒤 값만 읽는다. */
const STATE = kind => `((kind) => {
  localStorage.clear();
  Object.assign(S, DEF());
  S.stage = 50; S.best = 50; S.gold = 1e30; S.dia = 1e12;
  if (kind === 'spd20') S.lv.spd = 20;
  if (kind === 'max') {
    S.lv = { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 };
    S.trainStage = 6; S.rank = 4;
    RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 9 }; });
    BLESS.forEach(b => { S.bless.exp[b.k] = Date.now() + 36e5; });
    S.bless.lv = 20;
  }
  if (kind === 'others') {   /* spd 만 Lv0 — 나머지 성장은 전부 만렙 */
    S.lv = { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 0, pierce: 6 };
    S.trainStage = 6; S.rank = 4;
    RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 9 }; });
    BLESS.forEach(b => { S.bless.exp[b.k] = Date.now() + 36e5; });
    S.bless.lv = 20;
  }
  markDirty();
  const b = bonus();
  return {
    speed: +stat.speed.toFixed(3),
    spdLv: (S.lv.spd | 0),
    cp: cp(),
    bonusKeys: Object.keys(b).sort().join(','),
    hasSpdKey: Object.prototype.hasOwnProperty.call(b, 'speed') || Object.prototype.hasOwnProperty.call(b, 'spd')
  };
})(${JSON.stringify(kind)})`;

(async () => {
  console.log('== 358 재현 — 플레이어 이동 속도 축 ==');

  /* ── §1 축 전수 (소스) ───────────────────────────────────────────── */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const upgIds = (code.match(/\{ id:'([a-z]+)',\s*name:/g) || []).map(s => s.match(/id:'([a-z]+)'/)[1]);
  say('§1 UPG 축 목록', upgIds.join(' · ') + ` (${upgIds.length}종)`);
  say('§1 UPG 에 spd 행', /\{ id:'spd',/.test(code) ? '있다 — 이동 속도를 올리는 성장 축' : '없다');
  say('§1 stat.speed 정의', (code.match(/get speed\(\)\{[^}]*\}/) || ['(못 찾음)'])[0].trim());
  say('§1 RELIC_EFF 축', (code.match(/const RELIC_EFF = \{[^}]*\}/) || ['(못 찾음)'])[0].replace(/\s+/g, ' '));
  say('§1 COLL_EFFN 축', (code.match(/const COLL_EFFN = \{[^}]*\}/) || ['(못 찾음)'])[0].replace(/\s+/g, ' '));
  say('§1 BLESS 축', (code.match(/const BLESS = \[[\s\S]{0,240}?\];/) || ['(못 찾음)'])[0].replace(/\s+/g, ' ').slice(0, 220));
  say('§1 stat.speed 소비처', (SRC.match(/stat\.speed/g) || []).length + '곳 (플레이어 이동 + 보스 추격 바닥)');

  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e && e.message || e)));
  await p.goto(URL);
  await p.waitForTimeout(1200);

  /* ── §2 게터 ─────────────────────────────────────────────────────── */
  const seen = {};
  for (const k of ['fresh', 'spd20', 'others', 'max']) {
    await blk('§2 ' + k, async () => {
      const r = await p.evaluate(STATE(k));
      seen[k] = r;
      say(`§2 ${k}`, `stat.speed=${r.speed} · S.lv.spd=${r.spdLv} · cp=${r.cp}`);
    });
  }
  await blk('§2 bonus 축', async () => {
    say('§2 bonus() 축 목록', (seen.max || {}).bonusKeys + ' — 이동 축 ' + ((seen.max || {}).hasSpdKey ? '있음' : '없음'));
  });
  if (seen.fresh && seen.spd20) {
    const d = seen.spd20.speed - seen.fresh.speed;
    say('§2 spd Lv20 증가분', `${seen.fresh.speed} → ${seen.spd20.speed} (Δ${d > 0 ? '+' : ''}${d.toFixed(1)} = ${(d / seen.fresh.speed * 100).toFixed(1)}%)`);
  }
  if (seen.fresh && seen.others) {
    say('§2 spd 를 뺀 «다른 축 전부 만렙»', `stat.speed=${seen.others.speed} (Lv0 대비 Δ${(seen.others.speed - seen.fresh.speed).toFixed(1)})`);
  }

  /* ── §3 실동작 — 화면 위 플레이어의 실제 속도 피크 ───────────────── */
  const peak = async kind => {
    await p.evaluate(STATE(kind));
    await p.evaluate(() => { spawnStage(); });
    await p.waitForTimeout(2600);
    /* ⚠ 피격 넉백(`player.vx += cos(a)*140`, ~19384)이 걸린 프레임은 «이동» 이 아니다 —
       그 순간 `player.inv = 0.4` 가 같이 서므로 무적 프레임을 통째로 뺀다. */
    return p.evaluate(() => new Promise(res => {
      let mx = 0, t = 0, skip = 0;
      const tick = () => {
        if (player.inv > 0) skip++; else mx = Math.max(mx, Math.hypot(player.vx, player.vy));
        if (++t < 150) requestAnimationFrame(tick); else res({ v: +mx.toFixed(1), skip });
      };
      requestAnimationFrame(tick);
    }));
  };
  for (const k of ['fresh', 'spd20']) {
    await blk('§3 ' + k, async () => {
      const r = await peak(k);
      say(`§3 ${k} 실측 속도 피크`, `${r.v} px/s (게터 ${(seen[k] || {}).speed} · 넉백 프레임 ${r.skip}개 제외)`);
    });
  }

  /* ── §4 구매 경로 ────────────────────────────────────────────────── */
  await blk('§4 강화 탭', async () => {
    const r = await p.evaluate(`(() => {
      localStorage.clear(); Object.assign(S, DEF()); S.gold = 1e12; markDirty();
      const tab = document.querySelector('.tab[data-t="grow"]');
      if (tab) tab.click();
      renderUp();
      const rows = [...document.querySelectorAll('#bUp .up')].map(el => ({
        id: el.dataset.u, nm: el.querySelector('.un') ? el.querySelector('.un').childNodes[0].textContent : '',
        val: el.querySelector('.uv') ? el.querySelector('.uv').textContent : ''
      }));
      const row = document.querySelector('#bUp .up[data-u="spd"]');
      const before = stat.speed;
      if (row) row.click();
      return { rows, bought: !!row, before: +before.toFixed(1), after: +stat.speed.toFixed(1), lv: S.lv.spd | 0 };
    })()`);
    say('§4 «강화» 탭 행', r.rows.map(x => x.id).join(' · ') + ` (${r.rows.length}행)`);
    const sp = r.rows.find(x => x.id === 'spd');
    say('§4 이동 속도 행', sp ? `있다 — "${sp.nm.trim()}" ${sp.val.trim()}` : '없다');
    say('§4 클릭 1회 결과', r.bought ? `speed ${r.before} → ${r.after} · S.lv.spd=${r.lv}` : '살 수 있는 행이 없다');
  });

  say('§5 콘솔·페이지 에러', errs.length ? errs.join(' | ') : '0건');
  await br.close();
  console.log(`PROBE358 ${n}/${n}`);
})();
