export function adminPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Medik AI — Admin</title>
<meta name="theme-color" content="#0e1513" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Medik Admin" />
<link rel="manifest" href="/admin/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/admin/icon-192.png" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%233ddc97'/%3E%3Ctext x='16' y='23' font-size='18' text-anchor='middle' fill='%230e1513' font-family='system-ui' font-weight='bold'%3EM%3C/text%3E%3C/svg%3E" />
<style>
  :root { color-scheme: dark; --bg:#0e1513; --card:#182220; --line:#2b3d37; --ink:#e8f0ee; --mut:#9eb5ae; --acc:#3ddc97; --warn:#f5b453; --bad:#f0726a; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:var(--bg); color:var(--ink); }
  header { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--bg); }
  header b { letter-spacing:.06em; }
  header .live { font-size:12px; color:var(--mut); }
  header .live i { display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--acc); margin-right:6px; }
  main { max-width:1100px; margin:0 auto; padding:18px 16px 40px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
  .card small { display:block; color:var(--mut); font-size:11px; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .card strong { font-size:22px; }
  h2 { font-size:14px; text-transform:uppercase; letter-spacing:.08em; color:var(--mut); margin:22px 0 8px; }
  .bar { height:10px; background:#0a100e; border:1px solid var(--line); border-radius:6px; overflow:hidden; margin-top:6px; }
  .bar > div { height:100%; background:var(--acc); }
  table { width:100%; border-collapse:collapse; font-size:13px; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--mut); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
  tr:last-child td { border-bottom:none; }
  .s2 { color:var(--acc); font-weight:700; } .s4 { color:var(--warn); font-weight:700; } .s5 { color:var(--bad); font-weight:700; }
  code { font-size:12px; word-break:break-all; }
  .mut { color:var(--mut); font-size:12px; }
  .wrap { overflow-x:auto; }
</style>
</head>
<body>
<header><b>MEDIK AI · ADMIN</b><span class="live"><i></i><span id="updated">connecting…</span></span></header>
<main>
  <div class="grid" id="cards"></div>
  <h2>System — CPU / Memory</h2>
  <div class="grid" id="sys"></div>
  <div class="card"><small>Container memory</small><strong id="cmemtxt">—</strong><div class="bar"><div id="cmembar" style="width:0%"></div></div><div class="mut" id="cmemsub"></div></div>
  <div style="height:10px"></div>
  <div class="card"><small>Host memory</small><strong id="hmemtxt">—</strong><div class="bar"><div id="hmembar" style="width:0%"></div></div><div class="mut" id="hmemsub"></div></div>
  <h2>Top client IPs</h2>
  <div class="wrap"><table><thead><tr><th>IP</th><th>Requests</th></tr></thead><tbody id="ips"></tbody></table></div>
  <h2>Recent requests <span class="mut">(health checks &amp; stats polling excluded)</span></h2>
  <div class="wrap"><table><thead><tr><th>Time</th><th>IP</th><th>Method</th><th>Path</th><th>Status</th><th>ms</th><th>Agent</th></tr></thead><tbody id="rows"></tbody></table></div>
</main>
<script>
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtB = (b) => b == null ? '—' : b >= 1e9 ? (b/1e9).toFixed(2)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : Math.round(b/1e3)+' KB';
const fmtT = (s) => { const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h? h+'h ':'') + m + 'm ' + (s%60) + 's'; };
const statusCls = (s) => s < 300 ? 's2' : s < 500 ? 's4' : 's5';
async function tick() {
  try {
    const r = await fetch('/admin/api/stats', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    document.getElementById('updated').textContent = 'live · ' + new Date().toLocaleTimeString();
    document.getElementById('cards').innerHTML =
      card('Uptime', fmtT(d.uptimeSec)) + card('Total requests', d.totalRequests) +
      card('Chat requests', d.chatRequests) + card('Rate-limited (429)', d.rateLimitedResponses) +
      card('Failed logins (401)', d.unauthorizedResponses) + card('Unique IPs', d.uniqueIps);
    const p = d.system.process, h = d.system.host;
    document.getElementById('sys').innerHTML =
      card('Backend CPU', p.cpuPercent + ' %') + card('Process RSS', fmtB(p.rss)) +
      card('Heap used', fmtB(p.heapUsed)) + card('Host load 1/5/15m', h.loadAvg.map((x) => x.toFixed(2)).join(' / ')) +
      card('Host CPUs', h.cpuCount);
    if (d.system.container && d.system.container.max) {
      const pct = Math.min(100, d.system.container.current / d.system.container.max * 100);
      document.getElementById('cmemtxt').textContent = fmtB(d.system.container.current) + ' / ' + fmtB(d.system.container.max);
      document.getElementById('cmembar').style.width = pct + '%';
      document.getElementById('cmemsub').textContent = pct.toFixed(1) + '% of container limit';
    } else if (d.system.container) {
      document.getElementById('cmemtxt').textContent = fmtB(d.system.container.current);
      document.getElementById('cmemsub').textContent = 'container usage (no limit set)';
    } else { document.getElementById('cmemtxt').textContent = 'n/a (not in container)'; }
    const used = h.totalMem - h.freeMem, pct = used / h.totalMem * 100;
    document.getElementById('hmemtxt').textContent = fmtB(used) + ' / ' + fmtB(h.totalMem);
    document.getElementById('hmembar').style.width = pct + '%';
    document.getElementById('hmemsub').textContent = pct.toFixed(1) + '% used';
    document.getElementById('ips').innerHTML = d.topIps.length
      ? d.topIps.map((x) => '<tr><td><code>' + esc(x.ip) + '</code></td><td>' + x.hits + '</td></tr>').join('')
      : '<tr><td colspan="2" class="mut">no traffic yet</td></tr>';
    document.getElementById('rows').innerHTML = d.recent.length
      ? d.recent.slice(0, 100).map((x) => '<tr><td class="mut">' + esc(x.t.replace('T', ' ').slice(0, 19)) + '</td><td><code>' + esc(x.ip) + '</code>' + (x.fwd && x.fwd !== x.ip ? '<br><span class="mut">via ' + esc(x.fwd) + '</span>' : '') + '</td><td>' + esc(x.method) + '</td><td><code>' + esc(x.path) + '</code></td><td class="' + statusCls(x.status) + '">' + x.status + '</td><td>' + x.ms + '</td><td class="mut">' + esc((x.ua || '').slice(0, 60)) + '</td></tr>').join('')
      : '<tr><td colspan="7" class="mut">no traffic yet</td></tr>';
  } catch (e) { document.getElementById('updated').textContent = 'error: ' + e.message; }
}
const card = (label, value) => '<div class="card"><small>' + label + '</small><strong>' + esc(value) + '</strong></div>';
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/admin/sw.js').catch(() => {}); }
tick(); setInterval(tick, 3000);
</script>
</body>
</html>`
}
