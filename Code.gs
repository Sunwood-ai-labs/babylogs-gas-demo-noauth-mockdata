/**
 * BabyLogs ダッシュボード（Chart.js 版・認証なし・架空データ）
 */

function doGet() {
  const tpl = HtmlService.createTemplateFromFile('index');
  return tpl.evaluate()
    .setTitle('BabyLogs Dashboard (Fictional / Chart.js)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ダッシュボード用データ取得（認証不要）
 * @param {string} range - '7d' | '14d' | '30d'
 */
function getDashboardData(range) {
  try {
    const days = range === '14d' ? 14 : range === '30d' ? 30 : 7;
    const logs = generateFakeLogs_(days);

    const byDay  = aggregateByDay_(logs); // [{label, milk, poop, pee, sleep, sum}]
    const totals = aggregateTotals_(logs); // {milk, poop, pee, sleep}
    const kpis   = buildKpis_(totals, byDay);

    // Date -> number に変換（シリアライズ安定化）
    const recent = logs.slice(-15).reverse().map(r => ({
      kind: r.kind,
      atMs: r.at.getTime(),
      note: r.note || ''
    }));

    return {
      range: days,
      daysSeries: byDay,
      totals,
      recent,
      kpis
    };
  } catch (e) {
    console.error('getDashboardData failed:', e);
    throw e;
  }
}

/** ====== 架空データ生成 & 集計 ====== */

function generateFakeLogs_(days) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0,0,0,0);

  const kinds = ['ミルク','うんち','しっこ','ねんね'];
  const result = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const count = 6 + Math.floor(Math.random() * 9); // 6〜14件
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const t = new Date(day);
      t.setHours(Math.floor(Math.random()*24), Math.floor(Math.random()*60), 0, 0);
      result.push({
        kind,
        at: t,
        note: kind === 'ミルク' ? `${120 + Math.floor(Math.random()*80)}ml`
             : kind === 'ねんね' ? `${30 + Math.floor(Math.random()*120)}分`
             : ''
      });
    }
  }
  result.sort((a,b) => a.at - b.at);
  return result;
}

function fmtDate_(d) {
  return Utilities.formatDate(d, 'Asia/Tokyo', 'M/d');
}

function aggregateByDay_(logs) {
  const map = {};
  logs.forEach(r => {
    const label = fmtDate_(r.at);
    if (!map[label]) map[label] = { label, milk:0, poop:0, pee:0, sleep:0, sum:0 };
    if (r.kind === 'ミルク') map[label].milk++;
    else if (r.kind === 'うんち') map[label].poop++;
    else if (r.kind === 'しっこ') map[label].pee++;
    else if (r.kind === 'ねんね') map[label].sleep++;
    map[label].sum++;
  });
  const days = Object.values(map);
  days.sort((a,b) => {
    const ay = new Date(new Date().getFullYear() + '/' + a.label);
    const by = new Date(new Date().getFullYear() + '/' + b.label);
    return ay - by;
  });
  return days;
}

function aggregateTotals_(logs) {
  let milk=0, poop=0, pee=0, sleep=0;
  logs.forEach(r => {
    if (r.kind === 'ミルク') milk++;
    else if (r.kind === 'うんち') poop++;
    else if (r.kind === 'しっこ') pee++;
    else if (r.kind === 'ねんね') sleep++;
  });
  return { milk, poop, pee, sleep };
}

function buildKpis_(totals, daysSeries) {
  const todayLabel = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M/d');
  const today = daysSeries.find(d => d.label === todayLabel) || { sum:0 };
  let max = { label: '', sum: -1 };
  daysSeries.forEach(d => { if (d.sum > max.sum) max = { label: d.label, sum: d.sum }; });
  const avg = daysSeries.length ? (daysSeries.reduce((s,d)=>s+d.sum,0) / daysSeries.length) : 0;

  return {
    todayCount: today.sum,
    avgPerDay: Math.round(avg * 10)/10,
    mostActiveDayLabel: max.label || '-',
    mostActiveCount: Math.max(0, max.sum)
  };
}
