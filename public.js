(() => {
  const D = window.PUBLIC;
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['#2f6fed', '#e4572e', '#17a673', '#9b5de5', '#f2a900', '#00a7b5', '#d6336c', '#6b8e23', '#7a5cff', '#c1121f', '#0b7285'];
  const SPY = '#8a8f98';
  const QQQ = '#c27a1a';
  const GREEN = '#13795b';
  const RED = '#b23b3b';

  const fmtPct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : `${v < 0 ? '−' : '+'}${Math.abs(v * 100).toFixed(d)}%`);
  const fmtPctPlain = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`);
  const fmtPP = (v) => (v == null || !Number.isFinite(v) ? '—' : `${v < 0 ? '−' : '+'}${Math.abs(v * 100).toFixed(1)}pp`);
  const fmtShares = (v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const n = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const fmtDate = (s) => {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };
  const el = (tag, attrs = {}, text = null) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  };
  const svg = (w, h, label) => {
    const s = el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label || '' });
    s.style.width = '100%';
    s.style.height = 'auto';
    return s;
  };
  const linePath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const ticks = (lo, hi, n = 5) => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return [lo];
    const step = (hi - lo) / (n - 1);
    return Array.from({ length: n }, (_, i) => lo + step * i);
  };

  function spark(p) {
    const W = 360, H = 112, pl = 4, pr = 4, pt = 8, pb = 16;
    const pts = p.pct.map((v, i) => [i, v]).filter(([, v]) => v != null && Number.isFinite(v));
    if (!pts.length) return null;
    const vals = pts.map(([, v]) => v);
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    if (hi === lo) { hi = lo + 0.01; }
    const pad = (hi - lo) * 0.08;
    lo -= pad; hi += pad;
    const n = p.pct.length;
    const x = (i) => pl + (i / Math.max(1, n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const s = svg(W, H, `${p.ticker} position return`);
    for (const t of [0]) {
      if (t >= lo && t <= hi) s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(t), y2: y(t), stroke: '#d7d3c8', 'stroke-width': 0.8, 'stroke-dasharray': '2 3' }));
    }
    const pts2 = pts.map(([i, v]) => [x(i), y(v)]);
    const area = `M${pts2[0][0]},${y(0)} ` + pts2.map(([xx, yy]) => `L${xx.toFixed(2)},${yy.toFixed(2)}`).join(' ') + ` L${pts2.at(-1)[0]},${y(0)} Z`;
    s.appendChild(el('path', { d: area, fill: (p.currentPct ?? 0) >= 0 ? 'rgba(19,121,91,.10)' : 'rgba(178,59,59,.09)', stroke: 'none' }));
    s.appendChild(el('path', { d: linePath(pts2), fill: 'none', stroke: (p.currentPct ?? 0) >= 0 ? GREEN : RED, 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    s.appendChild(el('circle', { cx: pts2.at(-1)[0], cy: pts2.at(-1)[1], r: 2.6, fill: (p.currentPct ?? 0) >= 0 ? GREEN : RED }));
    s.appendChild(el('text', { x: pl, y: H - 3, fill: '#8a8f98', 'font-size': 8.5, 'font-family': 'ui-monospace, monospace' }, fmtDate(p.start)));
    s.appendChild(el('text', { x: W - pr, y: H - 3, fill: '#8a8f98', 'font-size': 8.5, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, fmtDate(p.dates.at(-1))));
    return s;
  }

  function lineChart(data, label, cut) {
    const W = 760, H = 300, pl = 48, pr = 20, pt = 14, pb = 28;
    const n = data.dates.length;
    const series = [
      { key: 'spy', name: 'SPY', color: SPY, dash: '4 4' },
      { key: 'qqq', name: 'QQQ', color: QQQ, dash: '4 4' },
      { key: 'portfolio', name: 'Portfolio', color: GREEN, dash: null },
    ];
    const vals = series.flatMap((s) => data[s.key]);
    let lo = Math.min(0, ...vals), hi = Math.max(0.01, ...vals);
    const pad = (hi - lo) * 0.08;
    lo -= pad; hi += pad;
    const x = (i) => pl + (i / Math.max(1, n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const s = svg(W, H, label || 'portfolio versus SPY and QQQ');
    for (const t of ticks(lo, hi, 5)) {
      s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(t), y2: y(t), stroke: '#e4e1d8', 'stroke-width': 0.8 }));
      s.appendChild(el('text', { x: pl - 6, y: y(t) + 3, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, fmtPctPlain(t, 0)));
    }
    const years = [];
    data.dates.forEach((d, i) => { const yr = d.slice(0, 4); if (!years.length || years.at(-1).yr !== yr) years.push({ yr, i }); });
    const shownYears = years.filter((yy, idx) => idx > 0 || Number(data.dates[0].slice(5, 7)) < 10);
    for (const yy of shownYears) {
      const xx = x(yy.i);
      s.appendChild(el('line', { x1: xx, x2: xx, y1: pt, y2: H - pb, stroke: '#f0ede5', 'stroke-width': 0.8 }));
      s.appendChild(el('text', { x: xx, y: H - 10, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'middle' }, yy.yr));
    }
    s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(0), y2: y(0), stroke: '#bdb8ab', 'stroke-width': 0.9 }));
    if (cut) {
      const ci = data.dates.findIndex((d) => d >= cut);
      if (ci > 0) {
        const xx = x(ci);
        s.appendChild(el('line', { x1: xx, x2: xx, y1: pt, y2: H - pb, stroke: '#8a8f98', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
        s.appendChild(el('text', { x: xx + 5, y: pt + 10, fill: '#5c626b', 'font-size': 8.5, 'font-family': 'ui-monospace, monospace' }, 'Schwab | Robinhood'));
      }
    }
    for (const ser of series) {
      const pts = data[ser.key].map((v, i) => [x(i), y(v)]);
      s.appendChild(el('path', { d: linePath(pts), fill: 'none', stroke: ser.color, 'stroke-width': ser.key === 'portfolio' ? 1.8 : 1.2, 'stroke-dasharray': ser.dash || null, 'stroke-linejoin': 'round' }));
      const last = pts.at(-1);
      s.appendChild(el('circle', { cx: last[0], cy: last[1], r: 2.4, fill: ser.color }));
      const dy = ser.key === 'spy' ? -12 : ser.key === 'qqq' ? 11 : -4;
      s.appendChild(el('text', { x: W - pr, y: last[1] + dy, fill: ser.color, 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, `${ser.name} ${fmtPct(data[ser.key].at(-1), 1)}`));
    }
    return s;
  }

  function stackChart(data, key, fmtY, label) {
    const W = 760, H = 300, pl = 52, pr = 18, pt = 14, pb = 28;
    const n = data.dates.length;
    const series = data.series;
    const totals = data.dates.map((_, i) => series.reduce((a, s) => a + (s[key][i] || 0), 0));
    const hi = Math.max(...totals, key === 'weight' ? 1 : 1);
    const x = (i) => pl + (i / Math.max(1, n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - v / hi) * (H - pt - pb);
    const s = svg(W, H, label || key);
    for (const t of ticks(0, hi, 5)) {
      s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(t), y2: y(t), stroke: '#e4e1d8', 'stroke-width': 0.8 }));
      s.appendChild(el('text', { x: pl - 6, y: y(t) + 3, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, fmtY(t)));
    }
    const years = [];
    data.dates.forEach((d, i) => { const yr = d.slice(0, 4); if (!years.length || years.at(-1).yr !== yr) years.push({ yr, i }); });
    const shownYears = years.filter((yy, idx) => idx > 0 || Number(data.dates[0].slice(5, 7)) < 10);
    for (const yy of shownYears) {
      s.appendChild(el('text', { x: x(yy.i), y: H - 10, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'middle' }, yy.yr));
    }
    const base = data.dates.map(() => 0);
    for (const ser of series) {
      const top = base.map((b, i) => b + (ser[key][i] || 0));
      const pts = top.map((v, i) => [x(i), y(v)]).concat(base.map((v, i) => [x(i), y(v)]).reverse());
      s.appendChild(el('path', { d: linePath(pts) + ' Z', fill: ser.color, opacity: 0.62, stroke: ser.color, 'stroke-width': 0.35 }));
      for (let i = 0; i < base.length; i++) base[i] = top[i];
    }
    s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(0), y2: y(0), stroke: '#bdb8ab', 'stroke-width': 0.9 }));
    return s;
  }

  function scatter(data) {
    const W = 760, H = 380, pl = 54, pr = 22, pt = 16, pb = 38;
    const pts = data.all || data.top;
    const xs = pts.map((p) => p.missedPct), ys = pts.map((p) => p.replacedPct);
    let x0 = Math.min(0, ...xs), x1 = Math.max(0, ...xs), y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys);
    const px = (x1 - x0) * 0.08 || 0.01, py = (y1 - y0) * 0.08 || 0.01;
    x0 -= px; x1 += px; y0 -= py; y1 += py;
    const x = (v) => pl + ((v - x0) / (x1 - x0)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb);
    const s = svg(W, H, 'missed versus replaced');
    for (const t of ticks(x0, x1, 5)) {
      s.appendChild(el('line', { x1: x(t), x2: x(t), y1: pt, y2: H - pb, stroke: '#f0ede5', 'stroke-width': 0.8 }));
      s.appendChild(el('text', { x: x(t), y: H - 18, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'middle' }, fmtPctPlain(t, 0)));
    }
    for (const t of ticks(y0, y1, 5)) {
      s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(t), y2: y(t), stroke: '#f0ede5', 'stroke-width': 0.8 }));
      s.appendChild(el('text', { x: pl - 6, y: y(t) + 3, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, fmtPctPlain(t, 0)));
    }
    const a = Math.max(x0, y0), b = Math.min(x1, y1);
    if (b > a) s.appendChild(el('line', { x1: x(a), y1: y(a), x2: x(b), y2: y(b), stroke: '#bdb8ab', 'stroke-width': 0.9, 'stroke-dasharray': '4 4' }));
    for (const p of pts) {
      const c = p.tradeoffPct >= 0 ? GREEN : RED;
      s.appendChild(el('circle', { cx: x(p.missedPct), cy: y(p.replacedPct), r: 3, fill: c, opacity: 0.8 }));
    }
    for (const p of (data.top || []).slice(0, 8)) {
      s.appendChild(el('text', { x: x(p.missedPct) + 4, y: y(p.replacedPct) - 4, fill: '#5c626b', 'font-size': 8, 'font-family': 'ui-monospace, monospace' }, p.ticker));
    }
    s.appendChild(el('text', { x: W - pr, y: H - 2, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'end' }, 'missed after sale'));
    s.appendChild(el('text', { x: 2, y: pt + 8, fill: '#8a8f98', 'font-size': 9, 'font-family': 'ui-monospace, monospace' }, 'replaced in book'));
    return s;
  }

  function cards(host, items) {
    host.innerHTML = '';
    for (const it of items) {
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = `<span>${it.label}</span><strong class="${it.cls || ''}">${it.value}</strong>${it.note ? `<em>${it.note}</em>` : ''}`;
      host.appendChild(d);
    }
  }

  function yearTable(host, rows) {
    if (!rows?.length) { host.innerHTML = ''; return; }
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Year</th><th>Portfolio</th><th>SPY</th><th>QQQ</th><th>vs SPY</th><th>vs QQQ</th></tr></thead><tbody>${rows.map((y) => `<tr><td>${y.year}</td><td class="${y.portfolio < 0 ? 'neg' : 'pos'}">${fmtPct(y.portfolio)}</td><td class="${y.spy < 0 ? 'neg' : 'pos'}">${fmtPct(y.spy)}</td><td class="${y.qqq < 0 ? 'neg' : 'pos'}">${fmtPct(y.qqq)}</td><td class="${y.excess < 0 ? 'neg' : 'pos'}">${fmtPP(y.excess)}</td><td class="${y.excessQqq < 0 ? 'neg' : 'pos'}">${fmtPP(y.excessQqq)}</td></tr>`).join('')}</tbody>`;
    host.innerHTML = '';
    host.appendChild(table);
  }

  function renderPositions() {
    const host = document.querySelector('#pos-grid');
    for (const p of D.positions) {
      const card = document.createElement('div');
      card.className = 'pos-card';
      const head = document.createElement('div');
      head.className = 'pos-head';
      head.innerHTML = `<div><div class="pos-ticker">${p.ticker}</div><div class="pos-name">${p.name}</div></div><div class="pos-pct ${p.currentPct < 0 ? 'neg' : 'pos'}">${fmtPct(p.currentPct)}</div>`;
      card.appendChild(head);
      const since = document.createElement('div');
      since.className = 'pos-since';
      since.textContent = `since ${fmtDate(p.start)}`;
      card.appendChild(since);
      const chart = document.createElement('div');
      chart.className = 'pos-chart';
      const s = spark(p);
      if (s) chart.appendChild(s);
      card.appendChild(chart);
      const ext = document.createElement('div');
      ext.className = 'pos-ext';
      ext.innerHTML = `<span class="pos">high ${fmtPct(p.highPct)} · ${fmtDate(p.highDate)}</span><span class="neg">low ${fmtPct(p.lowPct)} · ${fmtDate(p.lowDate)}</span>`;
      card.appendChild(ext);
      host.appendChild(card);
    }
  }

  function renderSize() {
    const legend = document.querySelector('#size-legend');
    legend.innerHTML = D.size.series.filter((s) => !s.sold).map((s) => `<span class="legend-item"><i class="swatch" style="background:${s.color}"></i>${s.ticker}</span>`).join('')
      + `<span class="legend-item"><i class="swatch" style="background:#c9c5ba"></i>sold</span>`;
    document.querySelector('#size-nominal').appendChild(stackChart(D.size, 'rel', () => '', 'relative nominal position size, values hidden'));
    document.querySelector('#size-weight').appendChild(stackChart(D.size, 'weight', (v) => fmtPctPlain(v, 0), 'share of book by position'));
  }

  function renderPerformance() {
    const all = D.combined;
    document.querySelector('#all-window').textContent = `${fmtDate(all.start)} → ${fmtDate(all.end)}`;
    cards(document.querySelector('#all-summary'), [
      { label: 'Portfolio', value: fmtPct(all.summary.portfolio), cls: all.summary.portfolio < 0 ? 'neg' : 'pos' },
      { label: 'SPY', value: fmtPct(all.summary.spy), cls: all.summary.spy < 0 ? 'neg' : 'pos' },
      { label: 'QQQ', value: fmtPct(all.summary.qqq), cls: all.summary.qqq < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs SPY', value: fmtPP(all.summary.excess), cls: all.summary.excess < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs QQQ', value: fmtPP(all.summary.excessQqq), cls: all.summary.excessQqq < 0 ? 'neg' : 'pos' },
    ]);
    document.querySelector('#all-legend').innerHTML = `<span class="legend-item"><i class="swatch" style="background:${GREEN}"></i>Portfolio</span><span class="legend-item"><i class="swatch" style="background:${SPY}"></i>SPY (dashed)</span><span class="legend-item"><i class="swatch" style="background:${QQQ}"></i>QQQ (dashed)</span>`;
    document.querySelector('#all-chart').appendChild(lineChart(all, 'all history portfolio versus SPY and QQQ', all.cut));

    const rh = D.perf;
    document.querySelector('#rh-window').textContent = `${fmtDate(rh.start)} → ${fmtDate(rh.end)}`;
    cards(document.querySelector('#rh-summary'), [
      { label: 'Portfolio', value: fmtPct(rh.summary.portfolio), cls: rh.summary.portfolio < 0 ? 'neg' : 'pos' },
      { label: 'SPY', value: fmtPct(rh.summary.spy), cls: rh.summary.spy < 0 ? 'neg' : 'pos' },
      { label: 'QQQ', value: fmtPct(rh.summary.qqq), cls: rh.summary.qqq < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs SPY', value: fmtPP(rh.summary.excess), cls: rh.summary.excess < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs QQQ', value: fmtPP(rh.summary.excessQqq), cls: rh.summary.excessQqq < 0 ? 'neg' : 'pos' },
    ]);
    document.querySelector('#rh-legend').innerHTML = `<span class="legend-item"><i class="swatch" style="background:${GREEN}"></i>Portfolio</span><span class="legend-item"><i class="swatch" style="background:${SPY}"></i>SPY (dashed)</span><span class="legend-item"><i class="swatch" style="background:${QQQ}"></i>QQQ (dashed)</span>`;
    document.querySelector('#rh-chart').appendChild(lineChart(rh, 'Robinhood era portfolio versus SPY and QQQ'));
    yearTable(document.querySelector('#rh-years'), rh.byYear);

    const sh = D.schwab;
    document.querySelector('#schwab-window').textContent = `${fmtDate(sh.start)} → ${fmtDate(sh.end)}`;
    cards(document.querySelector('#schwab-summary'), [
      { label: 'Portfolio', value: fmtPct(sh.summary.portfolio), cls: sh.summary.portfolio < 0 ? 'neg' : 'pos' },
      { label: 'SPY', value: fmtPct(sh.summary.spy), cls: sh.summary.spy < 0 ? 'neg' : 'pos' },
      { label: 'QQQ', value: fmtPct(sh.summary.qqq), cls: sh.summary.qqq < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs SPY', value: fmtPP(sh.summary.excess), cls: sh.summary.excess < 0 ? 'neg' : 'pos' },
      { label: 'Excess vs QQQ', value: fmtPP(sh.summary.excessQqq), cls: sh.summary.excessQqq < 0 ? 'neg' : 'pos' },
    ]);
    document.querySelector('#schwab-chart').appendChild(lineChart(sh, 'Schwab era portfolio versus SPY and QQQ'));
    yearTable(document.querySelector('#schwab-years'), sh.byYear);
  }

  function renderReplacement() {
    const r = D.replacement;
    cards(document.querySelector('#rep-summary'), [
      { label: 'Missed on sold shares', value: fmtPct(r.summary.missedPct), cls: 'neg', note: 'weighted by sale size' },
      { label: 'Replaced in book', value: fmtPct(r.summary.replacedPct), cls: 'pos', note: 'weighted by sale size' },
      { label: 'Net trade-off', value: fmtPP(r.summary.tradeoffPct), cls: r.summary.tradeoffPct < 0 ? 'neg' : 'pos', note: `${r.summary.count} sales` },
    ]);
    document.querySelector('#rep-chart').appendChild(scatter(r));
    const tbody = document.querySelector('#rep-table tbody');
    tbody.innerHTML = r.top.map((p) => `<tr><td>${p.ticker}</td><td>${fmtDate(p.date)}</td><td class="${p.missedPct < 0 ? 'neg' : 'pos'}">${fmtPct(p.missedPct)}</td><td class="${p.replacedPct < 0 ? 'neg' : 'pos'}">${fmtPct(p.replacedPct)}</td><td class="${p.tradeoffPct < 0 ? 'neg' : 'pos'}">${fmtPP(p.tradeoffPct)}</td></tr>`).join('');
  }

  function realizedTable(id, rows, nominal) {
    const tbody = document.querySelector(`${id} tbody`);
    tbody.innerHTML = rows.map((r, i) => {
      const bar = nominal
        ? `<td class="bar-cell"><div class="bar-track"><div class="bar-fill ${r.pct < 0 ? 'loss' : ''}" style="width:${Math.max(2, (r.size || 0) * 100)}%"></div></div></td>`
        : '';
      return `<tr><td>${i + 1}</td><td>${r.ticker}</td><td>${fmtDate(r.lastDate)}</td><td class="${r.pct < 0 ? 'neg' : 'pos'}">${fmtPct(r.pct)}</td>${bar}</tr>`;
    }).join('');
  }

  function tradeTable(id, rows, nominal) {
    const tbody = document.querySelector(`${id} tbody`);
    tbody.innerHTML = rows.map((r, i) => {
      const bar = nominal
        ? `<td class="bar-cell"><div class="bar-track"><div class="bar-fill ${r.pct < 0 ? 'loss' : ''}" style="width:${Math.max(2, (r.size || 0) * 100)}%"></div></div></td>`
        : '';
      return `<tr><td>${i + 1}</td><td>${r.ticker}</td><td>${fmtDate(r.date)}</td><td>${fmtShares(r.shares)}</td><td class="${r.pct < 0 ? 'neg' : 'pos'}">${fmtPct(r.pct)}</td>${bar}</tr>`;
    }).join('');
  }

  function renderTrades() {
    realizedTable('#best-nominal', D.best.bestNominal, true);
    realizedTable('#best-pct', D.best.bestPct, false);
    realizedTable('#worst-nominal', D.best.worstNominal, true);
    realizedTable('#worst-pct', D.best.worstPct, false);
    tradeTable('#best-nominal-trades', D.best.bestNominalTrades, true);
    tradeTable('#best-pct-trades', D.best.bestPctTrades, false);
    tradeTable('#worst-nominal-trades', D.best.worstNominalTrades, true);
    tradeTable('#worst-pct-trades', D.best.worstPctTrades, false);
  }

  renderPositions();
  renderSize();
  renderPerformance();
  renderReplacement();
  renderTrades();
  document.querySelector('#asof').textContent = `Updated ${fmtDate(D.asOf)} · positions, shares and percentages only`;
  document.querySelector('#foot-source').textContent = `Sources: ${D.meta.sources}. No dollar amounts.`;
})();
