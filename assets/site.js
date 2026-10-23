(function () {
  var root = document.body.getAttribute('data-root') || './';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function tok(s) { return (s.toLowerCase().match(/[a-z0-9]+/g) || []); }

  // diagrams
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false, theme: 'base', securityLevel: 'loose',
      flowchart: { curve: 'basis', htmlLabels: true, useMaxWidth: true },
      themeVariables: { fontFamily: '"Bricolage Grotesque","Segoe UI",sans-serif', fontSize: '15px',
        primaryColor: '#eaf1fb', primaryBorderColor: '#1f4fa8', primaryTextColor: '#1c2530',
        secondaryColor: '#fff3b0', tertiaryColor: '#f3f6fa', lineColor: '#566475', noteBkgColor: '#fff8e1', noteTextColor: '#1c2530' }
    });
    var nodes = document.querySelectorAll('pre.mermaid');
    if (nodes.length) { mermaid.run({ nodes: nodes }).catch(function (e) { console.error('mermaid', e); }); }
  }

  // suggestions
  var q = document.getElementById('q'), box = document.getElementById('sugg');
  var T = window.TITLES || [];
  var sel = -1;
  function suggest() {
    var v = q.value.trim().toLowerCase();
    if (v.length < 2) { box.hidden = true; return; }
    var ws = tok(v), out = [];
    for (var i = 0; i < T.length && out.length < 60; i++) {
      var t = T[i][0].toLowerCase(), ok = true, sc = 0;
      for (var j = 0; j < ws.length; j++) { var p = t.indexOf(ws[j]); if (p < 0) { ok = false; break; } sc += (p === 0 ? 3 : 1); }
      if (ok) out.push([sc + (T[i][3] === 'term' ? 2 : T[i][3] === 'topic' ? 1 : 0), T[i]]);
    }
    out.sort(function (a, b) { return b[0] - a[0]; });
    out = out.slice(0, 8);
    if (!out.length) { box.hidden = true; return; }
    box.innerHTML = out.map(function (o) { return '<a href="' + root + o[1][1] + '">' + esc(o[1][0].slice(0, 80)) + '<small>' + esc(o[1][2]) + '</small></a>'; }).join('');
    box.hidden = false; sel = -1;
  }
  if (q && box) {
    q.addEventListener('input', suggest);
    q.addEventListener('keydown', function (e) {
      var items = box.querySelectorAll('a');
      if (e.key === 'ArrowDown' && items.length) { sel = (sel + 1) % items.length; e.preventDefault(); }
      else if (e.key === 'ArrowUp' && items.length) { sel = (sel - 1 + items.length) % items.length; e.preventDefault(); }
      else if (e.key === 'Enter' && sel >= 0 && items[sel]) { window.location.href = items[sel].href; e.preventDefault(); return; }
      else if (e.key === 'Escape') { box.hidden = true; return; }
      items.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== q) box.hidden = true; });
  }

  // search page
  var res = document.getElementById('results');
  if (res && window.INDEX) {
    var m = /[?&]q=([^&]*)/.exec(location.search);
    var query = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    if (q) q.value = query;
    var ws = tok(query);
    if (!ws.length) { res.innerHTML = '<p>Type in the search box above.</p>'; }
    else {
      var scored = [];
      window.INDEX.forEach(function (d) {
        var ttl = d[0].toLowerCase(), txt = d[4].toLowerCase(), words = ttl.split(/[^a-z0-9]+/), sc = 0, miss = 0;
        ws.forEach(function (w) {
          var inT = ttl.indexOf(w) >= 0, c = 0, pos = -1;
          while ((pos = txt.indexOf(w, pos + 1)) >= 0 && c < 10) c++;
          if (!inT && c === 0) { miss++; return; }
          sc += (inT ? 10 : 0) + (words.indexOf(w) >= 0 ? 5 : 0) + c;
        });
        if (miss === ws.length) return;
        if (miss > 0) sc = sc / (1 + 3 * miss);
        if (ttl.indexOf(query.toLowerCase()) >= 0) sc += 20;
        if (d[3] === 'term' && ttl === query.toLowerCase()) sc += 30;
        if (d[3] === 'topic') sc += 2;
        scored.push([sc, d, miss]);
      });
      scored.sort(function (a, b) { return b[0] - a[0]; });
      var top = scored.slice(0, 60);
      if (!top.length) res.innerHTML = '<p>No results for <b>' + esc(query) + '</b>.</p>';
      else res.innerHTML = '<p>' + scored.length + ' result' + (scored.length === 1 ? '' : 's') + ' for <b>' + esc(query) + '</b></p>' + top.map(function (r) {
        var d = r[1], txt = d[4], low = txt.toLowerCase(), p = -1;
        for (var i = 0; i < ws.length && p < 0; i++) p = low.indexOf(ws[i]);
        var s = txt.slice(Math.max(0, p - 60), Math.max(0, p - 60) + 200);
        var h = esc(s);
        ws.forEach(function (w) { h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
        return '<div class="r"><a href="' + root + d[1] + '">' + esc(d[0]) + '</a><small>' + esc(d[2]) + '</small><p>' + (p > 60 ? '… ' : '') + h + ' …</p></div>';
      }).join('');
    }
  }
})();
