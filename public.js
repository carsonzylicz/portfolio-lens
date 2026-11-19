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

  function spark(p, commonStart, commonEnd) {
    const W = 280, H = 104, pl = 2, pr = 2, pt = 6, pb = 14;
    const pts = p.pct.map((v, i) => [p.dates[i], v]).filter(([, v]) => v != null && Number.isFinite(v));
    if (!pts.length) return null;
    const t0 = Date.parse(commonStart), t1 = Date.parse(commonEnd);
    const span = t1 - t0 || 1;
    const vals = pts.map(([, v]) => v);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const ys = hi - lo || 0.01;
    const x = (d) => pl + ((Date.parse(d) - t0) / span) * (W - pl - pr);
    const y = (v) => H - pb - ((v - lo) / ys) * (H - pt - pb);
    const s = svg(W, H, `${p.ticker} actual position history`);
    const id = `spark-${p.ticker}`;
    const defs = el('defs');
    defs.appendChild(el('clipPath', { id: `${id}-pos` }, null));
    defs.lastChild.appendChild(el('rect', { x: 0, y: 0, width: W, height: y(0) }));
    defs.appendChild(el('clipPath', { id: `${id}-neg` }, null));
    defs.lastChild.appendChild(el('rect', { x: 0, y: y(0), width: W, height: H - y(0) }));
    s.appendChild(defs);
    const line = pts.map(([d, v], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area = `M${x(pts[0][0]).toFixed(1)},${y(0).toFixed(1)}L${pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join('L')}L${x(pts.at(-1)[0]).toFixed(1)},${y(0).toFixed(1)}Z`;
    s.appendChild(el('path', { d: area, fill: 'rgba(19,121,91,.14)', 'clip-path': `url(#${id}-pos)` }));
    s.appendChild(el('path', { d: area, fill: 'rgba(178,59,59,.11)', 'clip-path': `url(#${id}-neg)` }));
    s.appendChild(el('path', { d: line, fill: 'none', stroke: (p.currentPct ?? 0) >= 0 ? GREEN : RED, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }));
    s.appendChild(el('line', { x1: pl, x2: W - pr, y1: y(0), y2: y(0), stroke: '#bdb8ab', 'stroke-dasharray': '3 4' }));
    s.appendChild(el('circle', { cx: x(p.highDate), cy: y(p.highPct), r: 2.4, fill: GREEN }));
    s.appendChild(el('circle', { cx: x(p.lowDate), cy: y(p.lowPct), r: 2.4, fill: RED }));
    s.appendChild(el('circle', { cx: x(p.dates.at(-1)), cy: y(p.currentPct), r: 2.6, fill: '#1b1d22' }));
    const y0 = Number(commonStart.slice(0, 4)), y1 = Number(commonEnd.slice(0, 4));
    for (let yr = y0; yr <= y1; yr++) {
      const d = `${yr}-01-01`;
      if (Date.parse(d) < t0 || Date.parse(d) > t1) continue;
      s.appendChild(el('text', { x: x(d), y: H - 3, fill: '#8a8f98', 'font-size': 8.5, 'font-family': 'ui-monospace, monospace', 'text-anchor': 'middle' }, yr));
    }
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

  const tip = () => document.querySelector('#public-tip');
  let tipTimer = null;
  const hideTip = () => { if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; } const t = tip(); if (t) t.hidden = true; };
  const showTip = (html, evt) => {
    const t = tip();
    if (!t) return;
    t.innerHTML = html;
    t.hidden = false;
    const pad = 12;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + 240 > innerWidth) x = evt.clientX - 250;
    if (y + 70 > innerHeight) y = evt.clientY - 70;
    const mobile = innerWidth <= 760;
    if (mobile) {
      t.classList.add('is-mobile');
      t.style.left = '50%';
      t.style.transform = 'translateX(-50%)';
      t.style.top = 'auto';
      t.style.bottom = '14px';
      t.style.maxWidth = 'calc(100vw - 24px)';
    } else {
      t.classList.remove('is-mobile');
      t.style.transform = '';
      t.style.top = `${y}px`;
      t.style.bottom = 'auto';
      t.style.left = `${x}px`;
      t.style.maxWidth = '';
    }
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(hideTip, mobile ? 6000 : 4000);
  };
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#size-nominal, #size-weight, #size-pie, #public-tip')) hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  function scrollToEnd(host) {
    if (!host) return;
    if (innerWidth > 760) return;
    requestAnimationFrame(() => { host.scrollLeft = host.scrollWidth; });
  }

  function bindSizeHover(host) {
    host.onpointermove = (evt) => {
      const svgEl = host.querySelector('svg');
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const W = 760, H = 300, pl = 52, pr = 18, pt = 14, pb = 28;
      const sx = (evt.clientX - rect.left) * (W / rect.width);
      const sy = (evt.clientY - rect.top) * (H / rect.height);
      if (sx < pl || sx > W - pr || sy < pt || sy > H - pb) { hideTip(); return; }
      const d = D.size;
      const key = host.id === 'size-nominal' ? 'rel' : 'weight';
      const i = Math.round(((sx - pl) / (W - pl - pr)) * (d.dates.length - 1));
      const total = d.series.reduce((a, s) => a + (s[key][i] || 0), 0);
      const v = (1 - (sy - pt) / (H - pt - pb)) * Math.max(total, 1);
      let acc = 0, hit = null;
      for (const s of d.series) {
        const val = s[key][i] || 0;
        if (v >= acc && v <= acc + val) { hit = s; break; }
        acc += val;
      }
      const items = d.series.map((s) => ({ ticker: s.ticker, color: s.color, sold: s.sold, weight: s.weight[i] || 0 })).filter((x) => x.weight > 0);
      const cur = items.filter((x) => !x.sold).sort((a, b) => b.weight - a.weight);
      const sold = items.filter((x) => x.sold).sort((a, b) => b.weight - a.weight);
      const shown = sold.slice(0, 12);
      const row = (x) => `<div class="tip-row ${x.ticker === hit?.ticker ? 'hot' : ''}"><i style="background:${x.color}"></i><span>${x.ticker}</span><b>${fmtPctPlain(x.weight, 1)}</b></div>`;
      const more = sold.length > shown.length ? `<div class="tip-more">+${sold.length - shown.length} more sold · ${fmtPctPlain(sold.slice(shown.length).reduce((a, x) => a + x.weight, 0), 1)} of book</div>` : '';
      showTip(`<div class="tip-head">${fmtDate(d.dates[i])} · ${items.length} names</div><div class="tip-sec">Current</div>${cur.map(row).join('')}<div class="tip-sec">Sold</div>${shown.map(row).join('')}${more}`, evt);
    };
    host.onpointerleave = (evt) => { if (evt.pointerType !== 'touch') hideTip(); };
    host.onpointerdown = (evt) => host.onpointermove(evt);
  }

  function renderSizePie() {
    const host = document.querySelector('#size-pie');
    if (!host) return;
    const rows = D.positions.map((p) => ({ t: p.ticker, w: p.weight, color: (D.size.series.find((s) => s.ticker === p.ticker) || {}).color || '#2f6fed' }));
    const total = rows.reduce((a, r) => a + r.w, 0) || 1;
    const cx = 130, cy = 130, R = 102, r = 62;
    let a = -Math.PI / 2;
    const parts = [`<svg viewBox="0 0 260 260" role="img" aria-label="current book weights">`];
    rows.forEach((p, i) => {
      const frac = p.w / total;
      const a2 = a + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a);
      const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
      const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2);
      const x4 = cx + r * Math.cos(a), y4 = cy + r * Math.sin(a);
      parts.push(`<path data-slice="${i}" d="M${x1.toFixed(1)},${y1.toFixed(1)}A${R},${R} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)}L${x3.toFixed(1)},${y3.toFixed(1)}A${r},${r} 0 ${large} 0 ${x4.toFixed(1)},${y4.toFixed(1)}Z" fill="${p.color}" stroke="#fff" stroke-width="1.2"/>`);
      a = a2;
    });
    parts.push(`<text x="130" y="124" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#8a8f98">CURRENT BOOK</text>`);
    parts.push(`<text x="130" y="140" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#5c626b">${rows.length} names</text>`);
    parts.push('</svg>');
    host.innerHTML = parts.join('');
    const svgEl = host.querySelector('svg');
    const hit = (evt) => {
      const slice = evt.target.closest('[data-slice]');
      if (!slice) { hideTip(); return; }
      const p = rows[Number(slice.dataset.slice)];
      if (!p) return;
      showTip(`<strong>${p.t}</strong><br>${fmtPctPlain(p.w, 1)} of book`, evt);
    };
    svgEl.onpointermove = hit;
    svgEl.onpointerdown = hit;
    svgEl.onpointerleave = (evt) => { if (evt.pointerType !== 'touch') hideTip(); };
  }

  let posCharts = [];
  let posCommon = null;

  function bindPosScrub() {
    const slider = document.querySelector('#pos-scrub');
    const dateEl = document.querySelector('#pos-date');
    if (!slider || !posCommon) return;
    const dates = [...new Set(posCharts.flatMap((c) => c.p.dates))].sort();
    slider.max = String(dates.length - 1);
    slider.value = String(dates.length - 1);
    const apply = (idx) => {
      const d = dates[Math.max(0, Math.min(dates.length - 1, Number(idx)))];
      dateEl.textContent = fmtDate(d);
      for (const { p, svg: svgEl, card } of posCharts) {
        const ro = card.querySelector('.pos-scrub-readout');
        let line = svgEl.querySelector('.pos-scrub-line');
        let dot = svgEl.querySelector('.pos-scrub-dot');
        if (d < p.start) {
          line?.remove(); dot?.remove();
          if (ro) ro.textContent = 'not held';
          continue;
        }
        const W = 280, H = 104, pl = 2, pr = 2, pt = 6, pb = 14;
        const t0 = Date.parse(posCommon.start), t1 = Date.parse(posCommon.end);
        const span = t1 - t0 || 1;
        const vals = p.pct.filter((v) => v != null && Number.isFinite(v));
        const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
        const ys = hi - lo || 0.01;
        const x = pl + ((Date.parse(d) - t0) / span) * (W - pl - pr);
        let q = null;
        for (let i = 0; i < p.dates.length; i++) if (p.dates[i] <= d) q = p.pct[i];
        if (q == null) { line?.remove(); dot?.remove(); if (ro) ro.textContent = 'not held'; continue; }
        const y = H - pb - ((q - lo) / ys) * (H - pt - pb);
        if (!line) { line = el('line', { class: 'pos-scrub-line', stroke: '#1b1d22', 'stroke-dasharray': '2 3', 'stroke-width': 1 }); svgEl.appendChild(line); }
        if (!dot) { dot = el('circle', { class: 'pos-scrub-dot', r: 2.4, fill: '#1b1d22' }); svgEl.appendChild(dot); }
        line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', pt); line.setAttribute('y2', H - pb);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        if (ro) ro.textContent = `${fmtPct(q)} · ${fmtDate(d)}`;
      }
    };
    slider.oninput = () => apply(slider.value);
    const t0s = Date.parse(posCommon.start), t1s = Date.parse(posCommon.end), spans = t1s - t0s || 1;
    for (const { p, svg: svgEl } of posCharts) {
      const setFrom = (evt) => {
        const rect = svgEl.getBoundingClientRect();
        const sx = (evt.clientX - rect.left) * (280 / rect.width);
        const frac = Math.max(0, Math.min(1, (sx - 2) / 276));
        const d = new Date(t0s + frac * spans).toISOString().slice(0, 10);
        let best = 0, bestDiff = Infinity;
        dates.forEach((x, i) => { const diff = Math.abs(Date.parse(x) - Date.parse(d)); if (diff < bestDiff) { bestDiff = diff; best = i; } });
        slider.value = String(best);
        apply(best);
      };
      svgEl.onpointerdown = (evt) => { svgEl.setPointerCapture(evt.pointerId); setFrom(evt); evt.preventDefault(); };
      svgEl.onpointermove = (evt) => { if (svgEl.hasPointerCapture(evt.pointerId)) setFrom(evt); };
      svgEl.onpointerup = (evt) => { try { svgEl.releasePointerCapture(evt.pointerId); } catch {} };
    }
    apply(slider.value);
  }

  function renderPositions() {
    const host = document.querySelector('#pos-grid');
    posCharts = [];
    const commonStart = D.positions.map((p) => p.start).sort()[0];
    const commonEnd = D.positions.map((p) => p.dates.at(-1)).sort().at(-1);
    posCommon = { start: commonStart, end: commonEnd };
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
      const s = spark(p, commonStart, commonEnd);
      if (s) chart.appendChild(s);
      card.appendChild(chart);
      const ext = document.createElement('div');
      ext.className = 'pos-ext';
      ext.innerHTML = `<span class="pos">high ${fmtPct(p.highPct)} · ${fmtDate(p.highDate)}</span><span class="neg">low ${fmtPct(p.lowPct)} · ${fmtDate(p.lowDate)}</span>`;
      card.appendChild(ext);
      const ro = document.createElement('div'); ro.className = 'pos-scrub-readout'; card.appendChild(ro);
      posCharts.push({ p, svg: s, card });
      host.appendChild(card);
    }
    bindPosScrub();
  }

  function renderCurrentBook() {
    const host = document.querySelector('#current-book-table');
    if (!host) return;
    host.innerHTML = `<table><thead><tr><th>Ticker</th><th>Weight</th></tr></thead><tbody>${D.positions.map((p) => `<tr><td>${p.ticker}</td><td>${fmtPctPlain(p.weight, 1)}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderSize() {
    const legend = document.querySelector('#size-legend');
    legend.innerHTML = D.size.series.filter((s) => !s.sold).map((s) => `<span class="legend-item"><i class="swatch" style="background:${s.color}"></i>${s.ticker}</span>`).join('')
      + `<span class="legend-item"><i class="swatch" style="background:#c9c5ba"></i>sold</span>`;
    const nominalHost = document.querySelector('#size-nominal');
    const weightHost = document.querySelector('#size-weight');
    const nominal = stackChart(D.size, 'rel', () => '', 'relative nominal position size, values hidden');
    const weight = stackChart(D.size, 'weight', (v) => fmtPctPlain(v, 0), 'share of book by position');
    nominalHost.appendChild(nominal);
    weightHost.appendChild(weight);
    bindSizeHover(nominalHost);
    bindSizeHover(weightHost);
    renderSizePie();
    renderCurrentBook();
    scrollToEnd(nominalHost);
    scrollToEnd(weightHost);
  }

  function renderAllWeighted() {
    const host = document.querySelector('#all-weighted');
    if (!host) return;
    const c = D.combined;
    const w = c.weighted;
    const max = Math.max(w.portfolio, w.spy, w.qqq, 0.01);
    const bar = (label, val, delta, cls) => `<div class="bench-row"><span class="bench-name">${label}</span><div class="bench-track"><i style="width:${Math.max(2, (val / max) * 100)}%"></i></div><span class="bench-val">${fmtPct(val, 1)}</span><span class="bench-delta ${cls}">${delta}</span></div>`;
    const row = (y) => `<tr><td>${y.year}${y.partial ? '*' : ''}</td><td>${fmtPctPlain(y.weight, 1)}</td><td class="${y.portfolio < 0 ? 'neg' : 'pos'}">${fmtPct(y.portfolio)}</td><td class="${y.spy < 0 ? 'neg' : 'pos'}">${fmtPct(y.spy)}</td><td class="${y.qqq < 0 ? 'neg' : 'pos'}">${fmtPct(y.qqq)}</td><td class="${y.excess < 0 ? 'neg' : 'pos'}">${fmtPP(y.excess)}</td><td class="${y.excessQqq < 0 ? 'neg' : 'pos'}">${fmtPP(y.excessQqq)}</td></tr>`;
    host.innerHTML = `<div class="weighted-hero">
        <div class="weighted-main">
          <span class="eyebrow">CAPITAL-WEIGHTED ANNUAL RETURN</span>
          <strong class="weighted-big ${w.portfolio < 0 ? 'neg' : 'pos'}">${fmtPct(w.portfolio, 1)}</strong>
          <span class="weighted-sub">per year</span>
        </div>
        <div class="weighted-bench">
          ${bar('SPY', w.spy, `Portfolio ${fmtPP(w.excess)}`, w.excess < 0 ? 'neg' : 'pos')}
          ${bar('QQQ', w.qqq, `Portfolio ${fmtPP(w.excessQqq)}`, w.excessQqq < 0 ? 'neg' : 'pos')}
          <div class="weighted-note">Compounded all-history ${fmtPct(c.summary.portfolio, 1)}</div>
        </div>
      </div>
      <div class="era-weights">
        <div class="era-head"><span>Capital weight by era</span><span>${fmtPctPlain(c.eraWeights.schwab, 1)} / ${fmtPctPlain(c.eraWeights.robinhood, 1)}</span></div>
        <div class="era-track"><i class="era-schwab" style="width:${c.eraWeights.schwab * 100}%"></i><i class="era-robinhood" style="width:${c.eraWeights.robinhood * 100}%"></i></div>
        <div class="era-legend"><span><i class="dot schwab"></i>Schwab ${fmtPctPlain(c.eraWeights.schwab, 1)}</span><span><i class="dot robinhood"></i>Robinhood ${fmtPctPlain(c.eraWeights.robinhood, 1)}</span></div>
      </div>
      <div class="table-wrap weighted-table"><table><thead><tr><th>Year</th><th>Weight</th><th>Portfolio</th><th>SPY</th><th>QQQ</th><th>vs SPY</th><th>vs QQQ</th></tr></thead><tbody>${c.byYear.map(row).join('')}<tr class="weighted-row"><td>Weighted avg</td><td>100%</td><td class="${w.portfolio < 0 ? 'neg' : 'pos'}">${fmtPct(w.portfolio)}</td><td class="${w.spy < 0 ? 'neg' : 'pos'}">${fmtPct(w.spy)}</td><td class="${w.qqq < 0 ? 'neg' : 'pos'}">${fmtPct(w.qqq)}</td><td class="${w.excess < 0 ? 'neg' : 'pos'}">${fmtPP(w.excess)}</td><td class="${w.excessQqq < 0 ? 'neg' : 'pos'}">${fmtPP(w.excessQqq)}</td></tr></tbody></table></div>
      <div class="weighted-foot">* partial year</div>`;
  }

  function renderPerformance() {
    const all = D.combined;
    document.querySelector('#all-window').textContent = `${fmtDate(all.start)} → ${fmtDate(all.end)}`;
    const allHost = document.querySelector('#all-summary');
    allHost.className = 'all-metrics';
    allHost.innerHTML = `<div class="all-main"><span>All history</span><strong class="${all.summary.portfolio < 0 ? 'neg' : 'pos'}">${fmtPct(all.summary.portfolio, 1)}</strong><em>Aug 2017 → Nov 2026</em></div>
      <div class="all-bench"><span>SPY</span><b class="${all.summary.spy < 0 ? 'neg' : 'pos'}">${fmtPct(all.summary.spy, 1)}</b><em class="${all.summary.excess < 0 ? 'neg' : 'pos'}">Portfolio ${fmtPP(all.summary.excess)}</em></div>
      <div class="all-bench"><span>QQQ</span><b class="${all.summary.qqq < 0 ? 'neg' : 'pos'}">${fmtPct(all.summary.qqq, 1)}</b><em class="${all.summary.excessQqq < 0 ? 'neg' : 'pos'}">Portfolio ${fmtPP(all.summary.excessQqq)}</em></div>`;
    document.querySelector('#all-legend').innerHTML = `<span class="legend-item"><i class="swatch" style="background:${GREEN}"></i>Portfolio</span><span class="legend-item"><i class="swatch" style="background:${SPY}"></i>SPY (dashed)</span><span class="legend-item"><i class="swatch" style="background:${QQQ}"></i>QQQ (dashed)</span>`;
    document.querySelector('#all-chart').appendChild(lineChart(all, 'all history portfolio versus SPY and QQQ', all.cut));
    scrollToEnd(document.querySelector('#all-chart'));
    renderAllWeighted();

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
    scrollToEnd(document.querySelector('#rh-chart'));
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
    scrollToEnd(document.querySelector('#schwab-chart'));
    renderSchwabPeriods(sh);
    yearTable(document.querySelector('#schwab-years'), sh.byYear);
  }

  function renderSchwabPeriods(sh) {
    const host = document.querySelector('#schwab-periods');
    if (!host) return;
    const idx = (d) => sh.dates.findIndex((x) => x >= d);
    const sub = (a, b) => {
      const i = idx(a), j = idx(b);
      const f = (arr) => (1 + arr[j]) / (1 + arr[i]) - 1;
      return { p: f(sh.portfolio), s: f(sh.spy), q: f(sh.qqq) };
    };
    const one = sub('2017-08-11', '2021-12-31');
    const two = sub('2021-12-31', sh.end);
    host.innerHTML = `<table><thead><tr><th>Schwab period</th><th>Portfolio</th><th>SPY</th><th>QQQ</th></tr></thead><tbody><tr><td>2017–2021</td><td class="${one.p < 0 ? 'neg' : 'pos'}">${fmtPct(one.p)}</td><td class="${one.s < 0 ? 'neg' : 'pos'}">${fmtPct(one.s)}</td><td class="${one.q < 0 ? 'neg' : 'pos'}">${fmtPct(one.q)}</td></tr><tr><td>2022–2024</td><td class="${two.p < 0 ? 'neg' : 'pos'}">${fmtPct(two.p)}</td><td class="${two.s < 0 ? 'neg' : 'pos'}">${fmtPct(two.s)}</td><td class="${two.q < 0 ? 'neg' : 'pos'}">${fmtPct(two.q)}</td></tr></tbody></table>`;
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
      return `<tr><td>${i + 1}</td><td>${r.ticker}</td><td>${fmtDate(r.date)}</td><td class="${r.pct < 0 ? 'neg' : 'pos'}">${fmtPct(r.pct)}</td>${bar}</tr>`;
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
  document.querySelector('#foot-source').textContent = `Sources: ${D.meta.sources}.`;
})();
