// Export utility functions for CSV, Excel, and PDF

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
) {
  if (!data.length) return;

  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = headers
    ? keys.map(k => headers[k] ?? String(k))
    : keys.map(k => String(k));

  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      const str = String(val);
      // Escape CSV special chars
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csv = [headerRow.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
) {
  if (!data.length) return;

  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = headers
    ? keys.map(k => headers[k] ?? String(k))
    : keys.map(k => String(k));

  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      return val;
    })
  );

  // Build HTML table for Excel
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Données</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">';
  html += '<thead><tr>';
  headerRow.forEach(h => { html += `<th style="background:#1E3A8A;color:white;font-weight:bold;padding:8px;">${h}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td style="padding:6px;">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></body></html>';

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string,
  headers?: Record<keyof T, string>
) {
  if (!data.length) return;

  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = headers
    ? keys.map(k => headers[k] ?? String(k))
    : keys.map(k => String(k));

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const ref = `RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`;

  const esc = (s: unknown) => s === null || s === undefined ? '—'
    : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)} — ALBA SERVICE GROUP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#F1F5F9;font-size:11px;color:#1E293B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:980px;margin:14px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}

    /* Header */
    .header{background:linear-gradient(135deg,#06103A 0%,#0F2460 35%,#1E3A8A 65%,#2563EB 100%);position:relative;overflow:hidden}
    .header::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:22px 22px}
    .header-row{display:flex;align-items:stretch;position:relative;z-index:1}
    .h-logo{padding:22px 20px;display:flex;align-items:center;gap:13px;border-right:1px solid rgba(255,255,255,0.13);flex-shrink:0;min-width:205px}
    .logo-box{width:70px;height:70px;border-radius:13px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
    .logo-box img{width:56px;height:56px;object-fit:contain}
    .co-name{font-size:14.5px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.2}
    .co-tag{font-size:8.5px;color:rgba(147,197,253,0.8);font-style:italic;margin:3px 0 6px}
    .co-info span{display:block;font-size:8.5px;color:rgba(255,255,255,0.62);line-height:1.75}
    .h-title{flex:1;padding:22px 26px;display:flex;flex-direction:column;justify-content:center}
    .rpt-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.15}
    .meta-grid{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px}
    .meta-item{display:flex;align-items:baseline;gap:5px}
    .meta-key{font-size:8px;color:rgba(147,197,253,0.62);font-weight:700;text-transform:uppercase;letter-spacing:0.09em;white-space:nowrap}
    .meta-val{font-size:10px;color:#fff;font-weight:700}
    .meta-val.mono{font-family:monospace;color:#93C5FD}
    .h-flag{padding:22px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid rgba(255,255,255,0.13);flex-shrink:0;gap:6px}
    .flag-frame{width:72px;height:48px;border-radius:6px;overflow:hidden;border:2.5px solid rgba(255,255,255,0.32);box-shadow:0 3px 12px rgba(0,0,0,0.35)}
    .flag-frame img{width:100%;height:100%;object-fit:cover}
    .flag-name{font-size:7.5px;color:rgba(255,255,255,0.52);font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-align:center}
    .accent-bar{height:4px;background:linear-gradient(90deg,#60A5FA 0%,#3B82F6 28%,#2563EB 60%,#F59E0B 80%,#EF4444 100%)}

    /* Subheader */
    .subheader{background:linear-gradient(90deg,#EFF6FF,#F0F4FF);padding:7px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #DBEAFE}
    .sys-left{display:flex;align-items:center;gap:14px}
    .sys-dot{width:7px;height:7px;border-radius:50%;background:#2563EB}
    .sys-name{font-size:9px;color:#1E40AF;font-weight:800}
    .sys-ver{font-size:8.5px;color:#3B82F6}
    .confidential{font-size:8px;color:#6B7280}

    /* Table */
    .table-wrap{padding:16px 22px}
    .table-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #1E3A8A}
    .table-marker{width:4px;height:16px;border-radius:2px;background:#1E3A8A;flex-shrink:0}
    .table-title-txt{font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.09em}
    .table-count{font-size:9px;color:#9CA3AF;margin-left:auto}
    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{background:linear-gradient(135deg,#06103A,#1E3A8A)}
    thead th{padding:9px 11px;font-size:8.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#fff;text-align:left}
    thead th.r{text-align:right} thead th.c{text-align:center}
    tbody tr:nth-child(even){background:#F8FAFC} tbody tr:nth-child(odd){background:#fff}
    tbody td{padding:7px 11px;color:#374151;border-bottom:1px solid #E9EFF5;vertical-align:middle}
    tbody td.r{text-align:right;font-weight:600} tbody td.c{text-align:center}
    .num{width:34px;color:#C4CADA!important;font-size:8.5px!important;text-align:center!important}

    /* Footer */
    .footer{background:linear-gradient(135deg,#06103A,#1E3A8A);padding:12px 24px;margin-top:16px;display:flex;align-items:center;justify-content:space-between;border-top:4px solid #2563EB}
    .footer-left{display:flex;align-items:flex-start;gap:10px}
    .footer-logo{width:20px;height:20px;object-fit:contain;opacity:0.72;flex-shrink:0;margin-top:1px}
    .footer-text{font-size:7.5px;color:rgba(147,197,253,0.65);line-height:1.7}
    .footer-right{display:flex;align-items:center;gap:12px}
    .page-info{font-size:8px;color:rgba(255,255,255,0.32);font-family:monospace}
    .footer-flag{width:28px;height:18px;object-fit:cover;border-radius:3px;border:1px solid rgba(255,255,255,0.22);opacity:0.72}

    @page{size:A4 landscape;margin:10mm 8mm}
    @media print{body{background:#fff!important}.page{box-shadow:none!important;margin:0!important;border-radius:0!important}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-row">
      <div class="h-logo">
        <div class="logo-box"><img src="/alba-logo.png" alt="ALBA"/></div>
        <div>
          <div class="co-name">ALBA SERVICE GROUP</div>
          <div class="co-tag">L'excellence au service de vos projets</div>
          <div class="co-info">
            <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
            <span>📞 +243 XXX XXX XXX</span>
            <span>✉ contact@alba-service.com</span>
            <span>🌐 www.alba-service.com</span>
          </div>
        </div>
      </div>
      <div class="h-title">
        <div class="rpt-title">${esc(title)}</div>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-key">Date :</span><span class="meta-val">${esc(dateStr)}</span></div>
          <div class="meta-item"><span class="meta-key">Heure :</span><span class="meta-val">${esc(timeStr)}</span></div>
          <div class="meta-item"><span class="meta-key">Réf :</span><span class="meta-val mono">${esc(ref)}</span></div>
          <div class="meta-item"><span class="meta-key">Enregistrements :</span><span class="meta-val">${data.length}</span></div>
        </div>
      </div>
      <div class="h-flag">
        <div class="flag-frame"><img src="/rdc-flag.jpg" alt="RDC"/></div>
        <span class="flag-name">R.D. Congo</span>
      </div>
    </div>
    <div class="accent-bar"></div>
  </div>
  <div class="subheader">
    <div class="sys-left">
      <div style="display:flex;align-items:center;gap:5px"><div class="sys-dot"></div><span class="sys-name">ALBA SERVICE GROUP PLATFORM</span></div>
      <span style="color:#93C5FD;font-size:9px">|</span>
      <span class="sys-ver">Système de Gestion Intégré — v1.0.0</span>
    </div>
    <span class="confidential">🔒 Confidentiel — Usage interne uniquement</span>
  </div>
  <div class="table-wrap">
    <div class="table-header">
      <div class="table-marker"></div>
      <span class="table-title-txt">${esc(title)}</span>
      <span class="table-count">${data.length} enregistrement${data.length > 1 ? 's' : ''}</span>
    </div>
    <table>
      <thead><tr>
        <th class="num">#</th>
        ${headerRow.map(h => `<th>${esc(h)}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${data.map((row, i) => `<tr>
          <td class="num">${i+1}</td>
          ${keys.map(k => {
            const v = row[k];
            return `<td>${v === null || v === undefined ? '<span style="color:#CBD5E1">—</span>' : esc(v)}</td>`;
          }).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <div class="footer-left">
      <img class="footer-logo" src="/alba-logo.png" alt="ALBA"/>
      <div class="footer-text">
        © ${now.getFullYear()} <strong style="color:rgba(255,255,255,0.55)">ALBA SERVICE GROUP</strong> · Kindu, Province du Maniema, République Démocratique du Congo<br/>
        📍 Avenue Lumumba, Kindu — 📞 +243 XXX XXX XXX — ✉ contact@alba-service.com<br/>
        Document généré le ${esc(dateStr)} à ${esc(timeStr)} · Tous droits réservés
      </div>
    </div>
    <div class="footer-right">
      <span class="page-info">Réf : ${esc(ref)} — Page 1</span>
      <img class="footer-flag" src="/rdc-flag.jpg" alt="RDC"/>
    </div>
  </div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},900)})</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=1160,height=820');
  if (win) { win.document.write(html); win.document.close(); win.focus(); }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
