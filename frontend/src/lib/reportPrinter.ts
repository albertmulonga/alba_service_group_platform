/**
 * reportPrinter — Impression professionnelle ALBA SERVICE GROUP
 * En-tête : Logo ALBA | Titre du rapport + métadonnées | Drapeau RDC
 * Pied de page : Adresse complète + copyright + numéro de page
 */

export interface ReportPrintOptions {
  title: string           // Titre du rapport  ex: "RAPPORT COMMERCIAL"
  subtitle?: string       // Sous-titre        ex: "Analyse des ventes"
  category?: string       // Module            ex: "Commercial" | "Finance" | "RH" ...
  period?: string         // Période           ex: "Juillet 2026"
  generatedBy?: string    // Nom utilisateur
  docNumber?: string      // Référence auto-générée si absent
  rows: Record<string, unknown>[]
  columns?: { key: string; label: string; align?: 'left' | 'right' | 'center' }[]
  summaryCards?: { label: string; value: string; color: string }[]
  notes?: string
}

/* ─── Couleurs accent par module ─────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  'Commercial':  '#2563EB',
  'Finance':     '#059669',
  'Stock':       '#D97706',
  'Production':  '#7C3AED',
  'RH':          '#0D9488',
  'Clients':     '#4F46E5',
  'Rapports':    '#1E3A8A',
  'default':     '#1E3A8A',
}

/* ─── Utilitaire HTML escape ─────────────────────────────────────────── */
function esc(s: unknown): string {
  if (s === null || s === undefined) return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ═══════════════════════════════════════════════════════════════════════ */
export function printReport(opts: ReportPrintOptions): void {
  const {
    title, subtitle, category = '', period, generatedBy,
    docNumber, rows, columns, summaryCards, notes,
  } = opts

  if (!rows.length) { alert('Aucune donnée à imprimer.'); return }

  /* Auto-colonnes */
  const cols = columns ?? Object.keys(rows[0]).map(k => ({
    key: k,
    label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '),
    align: 'left' as const,
  }))

  const accent  = CAT_COLORS[category] ?? CAT_COLORS['default']
  const now     = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const ref     = docNumber ?? `RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`

  /* ─── SUMMARY CARDS HTML ─────────────────────────────────────────── */
  const summaryHtml = summaryCards?.length ? `
    <div class="summary-grid">
      ${summaryCards.map(c => `
        <div class="scard" style="background:${c.color}14;border-color:${c.color}35">
          <div class="scard-label">${esc(c.label)}</div>
          <div class="scard-value" style="color:${c.color}">${esc(c.value)}</div>
        </div>`).join('')}
    </div>` : ''

  /* ─── TABLE HTML ─────────────────────────────────────────────────── */
  const tableHtml = `
    <table>
      <thead>
        <tr>
          <th class="c num">#</th>
          ${cols.map(c => `<th class="${c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : ''}">${esc(c.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr>
            <td class="c num">${i + 1}</td>
            ${cols.map(c => {
              const v = (row as Record<string, unknown>)[c.key]
              const display = v === null || v === undefined ? '<span style="color:#CBD5E1">—</span>'
                : typeof v === 'object' ? `<span style="font-family:monospace;font-size:9px">${esc(JSON.stringify(v))}</span>`
                : esc(v)
              return `<td class="${c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : ''}">${display}</td>`
            }).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`

  /* ─── NOTES HTML ─────────────────────────────────────────────────── */
  const notesHtml = notes ? `
    <div class="notes">
      <div class="notes-title">📋 Notes et observations</div>
      <div class="notes-body">${esc(notes)}</div>
    </div>` : ''

  /* ─── FULL HTML ──────────────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)} — ALBA SERVICE GROUP</title>
  <style>
    /* ── Reset & base ── */
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;
      background:#F1F5F9;color:#1E293B;font-size:11px;
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    }
    .page{
      max-width:980px;margin:14px auto;background:#fff;
      border-radius:14px;overflow:hidden;
      box-shadow:0 4px 24px rgba(0,0,0,0.10);
    }

    /* ══════════════════════════
       EN-TÊTE PRINCIPAL
    ══════════════════════════ */
    .header{
      background:linear-gradient(135deg, #06103A 0%, #0F2460 35%, #1E3A8A 65%, ${accent} 100%);
      position:relative;overflow:hidden;
    }
    .header::before{
      content:'';position:absolute;inset:0;
      background-image:radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
      background-size:22px 22px;pointer-events:none;
    }
    .header::after{
      content:'';position:absolute;top:-60px;right:80px;
      width:220px;height:220px;border-radius:50%;
      background:rgba(255,255,255,0.04);pointer-events:none;
    }
    .header-row{display:flex;align-items:stretch;position:relative;z-index:1}

    /* Bloc logo gauche */
    .h-logo{
      padding:22px 20px;
      display:flex;align-items:center;gap:13px;
      border-right:1px solid rgba(255,255,255,0.13);
      flex-shrink:0;min-width:205px;
    }
    .logo-box{
      width:70px;height:70px;border-radius:13px;flex-shrink:0;
      background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.22);
      display:flex;align-items:center;justify-content:center;overflow:hidden;
    }
    .logo-box img{width:56px;height:56px;object-fit:contain}
    .co-name{font-size:14.5px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.2}
    .co-tag{font-size:8.5px;color:rgba(147,197,253,0.8);font-style:italic;margin:3px 0 6px}
    .co-info span{display:block;font-size:8.5px;color:rgba(255,255,255,0.62);line-height:1.75}

    /* Bloc titre centre */
    .h-title{flex:1;padding:22px 26px;display:flex;flex-direction:column;justify-content:center}
    .cat-pill{
      display:inline-flex;align-items:center;gap:5px;
      background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.22);
      border-radius:20px;padding:3px 11px;margin-bottom:8px;width:fit-content;
    }
    .cat-dot{width:5px;height:5px;border-radius:50%;background:#93C5FD}
    .cat-text{font-size:8px;font-weight:800;color:rgba(255,255,255,0.88);letter-spacing:0.12em;text-transform:uppercase}
    .rpt-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.15}
    .rpt-sub{font-size:11px;color:rgba(147,197,253,0.88);margin-top:4px;font-weight:500}
    .meta-grid{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px}
    .meta-item{display:flex;align-items:baseline;gap:5px}
    .meta-key{font-size:8px;color:rgba(147,197,253,0.62);font-weight:700;text-transform:uppercase;letter-spacing:0.09em;white-space:nowrap}
    .meta-val{font-size:10px;color:#fff;font-weight:700}
    .meta-val.mono{font-family:monospace;color:#93C5FD;font-size:10px}

    /* Bloc drapeau droite */
    .h-flag{
      padding:22px 20px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border-left:1px solid rgba(255,255,255,0.13);flex-shrink:0;gap:6px;
    }
    .flag-frame{
      width:72px;height:48px;border-radius:6px;overflow:hidden;
      border:2.5px solid rgba(255,255,255,0.32);
      box-shadow:0 3px 12px rgba(0,0,0,0.35);
    }
    .flag-frame img{width:100%;height:100%;object-fit:cover}
    .flag-name{font-size:7.5px;color:rgba(255,255,255,0.52);font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-align:center}

    /* Barre arc-en-ciel */
    .accent-bar{height:4px;background:linear-gradient(90deg, #60A5FA 0%, #3B82F6 28%, ${accent} 60%, #F59E0B 80%, #EF4444 100%)}

    /* ══════════════════════════
       SOUS-EN-TÊTE (bande info)
    ══════════════════════════ */
    .subheader{
      background:linear-gradient(90deg,#EFF6FF 0%,#F0F4FF 100%);
      padding:7px 24px;
      display:flex;align-items:center;justify-content:space-between;
      border-bottom:2px solid #DBEAFE;
    }
    .sys-left{display:flex;align-items:center;gap:14px}
    .sys-badge{display:flex;align-items:center;gap:5px}
    .sys-dot{width:7px;height:7px;border-radius:50%;background:#2563EB}
    .sys-name{font-size:9px;color:#1E40AF;font-weight:800}
    .sys-ver{font-size:8.5px;color:#3B82F6;font-weight:500}
    .sys-sep{font-size:10px;color:#93C5FD}
    .confidential{font-size:8px;color:#6B7280}

    /* ══════════════════════════
       CARDS RÉSUMÉ
    ══════════════════════════ */
    .summary-grid{
      display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
      gap:10px;padding:16px 22px;border-bottom:1px solid #E2E8F0;
    }
    .scard{border-radius:10px;padding:12px 14px;text-align:center;border:1px solid transparent}
    .scard-label{font-size:8.5px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px}
    .scard-value{font-size:20px;font-weight:900;line-height:1.1}

    /* ══════════════════════════
       TABLEAU
    ══════════════════════════ */
    .table-wrap{padding:16px 22px}
    .table-header{
      display:flex;align-items:center;gap:8px;
      margin-bottom:10px;padding-bottom:8px;
      border-bottom:2px solid ${accent};
    }
    .table-marker{width:4px;height:16px;border-radius:2px;background:${accent};flex-shrink:0}
    .table-title-txt{font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.09em}
    .table-count{font-size:9px;color:#9CA3AF;font-weight:500;margin-left:auto}

    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{background:linear-gradient(135deg, #06103A 0%, #1E3A8A 100%)}
    thead th{
      padding:9px 11px;font-size:8.5px;font-weight:700;
      letter-spacing:0.09em;text-transform:uppercase;color:#fff;text-align:left;
    }
    thead th.r{text-align:right}
    thead th.c{text-align:center}
    .num{width:34px;color:rgba(255,255,255,0.65)!important;font-size:8px!important}
    tbody tr:nth-child(even){background:#F8FAFC}
    tbody tr:nth-child(odd){background:#FFFFFF}
    tbody td{padding:7px 11px;color:#374151;border-bottom:1px solid #E9EFF5;vertical-align:middle}
    tbody td.r{text-align:right;font-weight:600;color:#1E293B}
    tbody td.c{text-align:center}
    tbody td.num{color:#C4CADA;font-size:8.5px;text-align:center}

    /* ══════════════════════════
       NOTES
    ══════════════════════════ */
    .notes{margin:0 22px 16px;padding:11px 14px;background:#FFFBEB;border-radius:8px;border-left:4px solid #F59E0B}
    .notes-title{font-size:9px;font-weight:800;color:#92400E;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px}
    .notes-body{font-size:10px;color:#78350F;line-height:1.65}

    /* ══════════════════════════
       PIED DE PAGE
    ══════════════════════════ */
    .footer{
      background:linear-gradient(135deg, #06103A 0%, #1E3A8A 100%);
      padding:12px 24px;margin-top:16px;
      display:flex;align-items:center;justify-content:space-between;
      border-top:4px solid ${accent};
    }
    .footer-left{display:flex;align-items:flex-start;gap:10px}
    .footer-logo{width:20px;height:20px;object-fit:contain;opacity:0.72;flex-shrink:0;margin-top:1px}
    .footer-text{font-size:7.5px;color:rgba(147,197,253,0.65);line-height:1.7}
    .footer-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
    .page-info{font-size:8px;color:rgba(255,255,255,0.32);font-family:monospace}
    .footer-flag{width:28px;height:18px;object-fit:cover;border-radius:3px;border:1px solid rgba(255,255,255,0.22);opacity:0.72}

    /* ══════════════════════════
       IMPRESSION
    ══════════════════════════ */
    @page{size:A4 landscape;margin:10mm 8mm}
    @media print{
      body{background:#fff!important}
      .page{box-shadow:none!important;margin:0!important;border-radius:0!important}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ══════════ EN-TÊTE ══════════ -->
  <div class="header">
    <div class="header-row">

      <!-- Logo + Entreprise -->
      <div class="h-logo">
        <div class="logo-box"><img src="/alba-logo.png" alt="ALBA SERVICE GROUP"/></div>
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

      <!-- Titre + Métadonnées -->
      <div class="h-title">
        ${category ? `
        <div class="cat-pill">
          <div class="cat-dot"></div>
          <span class="cat-text">Module — ${esc(category)}</span>
        </div>` : ''}

        <div class="rpt-title">${esc(title)}</div>
        ${subtitle ? `<div class="rpt-sub">${esc(subtitle)}</div>` : ''}

        <div class="meta-grid">
          ${period ? `
          <div class="meta-item">
            <span class="meta-key">Période :</span>
            <span class="meta-val">${esc(period)}</span>
          </div>` : ''}

          <div class="meta-item">
            <span class="meta-key">Date de génération :</span>
            <span class="meta-val">${esc(dateStr)}</span>
          </div>

          <div class="meta-item">
            <span class="meta-key">Heure :</span>
            <span class="meta-val">${esc(timeStr)}</span>
          </div>

          ${generatedBy ? `
          <div class="meta-item">
            <span class="meta-key">Généré par :</span>
            <span class="meta-val">${esc(generatedBy)}</span>
          </div>` : ''}

          <div class="meta-item">
            <span class="meta-key">Référence :</span>
            <span class="meta-val mono">${esc(ref)}</span>
          </div>

          <div class="meta-item">
            <span class="meta-key">Enregistrements :</span>
            <span class="meta-val">${rows.length}</span>
          </div>
        </div>
      </div>

      <!-- Drapeau RDC -->
      <div class="h-flag">
        <div class="flag-frame"><img src="/rdc-flag.jpg" alt="Drapeau RDC"/></div>
        <span class="flag-name">R.D. Congo</span>
      </div>

    </div>
    <div class="accent-bar"></div>
  </div>

  <!-- ══════════ SOUS-EN-TÊTE ══════════ -->
  <div class="subheader">
    <div class="sys-left">
      <div class="sys-badge">
        <div class="sys-dot"></div>
        <span class="sys-name">ALBA SERVICE GROUP PLATFORM</span>
      </div>
      <span class="sys-sep">|</span>
      <span class="sys-ver">Système de Gestion Intégré — v1.0.0</span>
    </div>
    <span class="confidential">🔒 Confidentiel — Usage interne uniquement</span>
  </div>

  <!-- ══════════ CARDS RÉSUMÉ ══════════ -->
  ${summaryHtml}

  <!-- ══════════ TABLEAU ══════════ -->
  <div class="table-wrap">
    <div class="table-header">
      <div class="table-marker"></div>
      <span class="table-title-txt">Données détaillées — ${esc(title)}</span>
      <span class="table-count">${rows.length} enregistrement${rows.length > 1 ? 's' : ''}</span>
    </div>
    ${tableHtml}
  </div>

  <!-- ══════════ NOTES ══════════ -->
  ${notesHtml}

  <!-- ══════════ PIED DE PAGE ══════════ -->
  <div class="footer">
    <div class="footer-left">
      <img class="footer-logo" src="/alba-logo.png" alt="ALBA"/>
      <div class="footer-text">
        © ${now.getFullYear()} <strong style="color:rgba(255,255,255,0.55)">ALBA SERVICE GROUP</strong> · Kindu, Province du Maniema, République Démocratique du Congo<br/>
        📍 Adresse : Avenue Lumumba, Kindu — 📞 +243 XXX XXX XXX — ✉ contact@alba-service.com<br/>
        Document généré automatiquement le ${esc(dateStr)} à ${esc(timeStr)} · Tous droits réservés
      </div>
    </div>
    <div class="footer-right">
      <span class="page-info">Réf : ${esc(ref)} — Page 1</span>
      <img class="footer-flag" src="/rdc-flag.jpg" alt="Drapeau RDC"/>
    </div>
  </div>

</div>
<script>
  // Attendre que les images soient chargées avant d'imprimer
  window.addEventListener('load', function() {
    setTimeout(function(){ window.print(); }, 900);
  });
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1160,height=820')
  if (!win) { alert('Veuillez autoriser les popups pour générer le rapport.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
}
