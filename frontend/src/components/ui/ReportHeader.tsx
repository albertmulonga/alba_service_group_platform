/**
 * ReportHeader — En-tête professionnelle pour tous les rapports imprimés ALBA
 * Logo ALBA (gauche) + infos entreprise (centre) + Drapeau RDC (droite)
 */
import React from 'react'

interface ReportHeaderProps {
  title: string          // ex: "RAPPORT COMMERCIAL"
  subtitle?: string      // ex: "Analyse des ventes - Juillet 2026"
  period?: string        // ex: "01/07/2026 – 31/07/2026"
  generatedBy?: string   // nom de l'utilisateur
  docNumber?: string     // numéro de référence du rapport
  category?: string      // ex: "Finance" | "Stock" | "RH" ...
  categoryColor?: string // couleur hex du badge
}

export default function ReportHeader({
  title, subtitle, period, generatedBy, docNumber, category, categoryColor = '#1E3A8A'
}: ReportHeaderProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })

  return (
    <div style={{ fontFamily:"'Inter','Poppins',sans-serif", background:'#fff' }}>

      {/* ── TOP BAND ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1A4D 0%, #1E3A8A 55%, #2563EB 100%)',
        padding: '0',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
      }}>
        {/* Grid pattern overlay */}
        <div style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          position:'absolute', inset:0, borderRadius:'inherit', pointerEvents:'none',
        }}/>

        <div style={{ display:'flex', alignItems:'stretch', position:'relative' }}>

          {/* LEFT — Logo block */}
          <div style={{
            padding:'22px 24px',
            display:'flex', alignItems:'center', gap:'14px',
            borderRight:'1px solid rgba(255,255,255,0.12)',
            flexShrink:0, minWidth:'220px',
          }}>
            <div style={{
              width:'72px', height:'72px', borderRadius:'14px',
              background:'rgba(255,255,255,0.15)',
              border:'2px solid rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              overflow:'hidden', flexShrink:0, backdropFilter:'blur(4px)',
            }}>
              <img src="/alba-logo.png" alt="ALBA" style={{ width:'58px', height:'58px', objectFit:'contain' }}/>
            </div>
            <div>
              <div style={{ fontSize:'16px', fontWeight:900, color:'#fff', letterSpacing:'0.04em', lineHeight:1.2 }}>
                ALBA SERVICE GROUP
              </div>
              <div style={{ fontSize:'9.5px', color:'rgba(147,197,253,0.8)', fontStyle:'italic', marginTop:'3px', lineHeight:1.4 }}>
                L'excellence au service de vos projets
              </div>
              <div style={{ marginTop:'6px', display:'flex', flexDirection:'column', gap:'1px' }}>
                {['📍 Kindu – Maniema – R.D. Congo','📞 +243 XXX XXX XXX','✉ contact@alba-service.com'].map((t,i) => (
                  <span key={i} style={{ fontSize:'9px', color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER — Report title */}
          <div style={{ flex:1, padding:'22px 28px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            {category && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                background:'rgba(255,255,255,0.15)', borderRadius:'20px',
                padding:'3px 10px', marginBottom:'8px', width:'fit-content',
                border:'1px solid rgba(255,255,255,0.2)',
              }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#60A5FA' }}/>
                <span style={{ fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,0.85)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{category}</span>
              </div>
            )}
            <h1 style={{ fontSize:'26px', fontWeight:900, color:'#fff', letterSpacing:'0.06em', lineHeight:1.1, margin:0 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize:'12px', color:'rgba(147,197,253,0.85)', marginTop:'5px', fontWeight:500 }}>{subtitle}</p>
            )}
            <div style={{ display:'flex', gap:'16px', marginTop:'10px', flexWrap:'wrap' }}>
              {period && (
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'9px', color:'rgba(147,197,253,0.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Période :</span>
                  <span style={{ fontSize:'10px', color:'#fff', fontWeight:700 }}>{period}</span>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ fontSize:'9px', color:'rgba(147,197,253,0.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Généré le :</span>
                <span style={{ fontSize:'10px', color:'#fff', fontWeight:700 }}>{dateStr} à {timeStr}</span>
              </div>
              {generatedBy && (
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'9px', color:'rgba(147,197,253,0.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Par :</span>
                  <span style={{ fontSize:'10px', color:'#fff', fontWeight:700 }}>{generatedBy}</span>
                </div>
              )}
              {docNumber && (
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'9px', color:'rgba(147,197,253,0.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Réf :</span>
                  <span style={{ fontFamily:'monospace', fontSize:'10px', color:'#93C5FD', fontWeight:700 }}>{docNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Drapeau RDC */}
          <div style={{
            padding:'22px 24px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            borderLeft:'1px solid rgba(255,255,255,0.12)',
            flexShrink:0, gap:'6px',
          }}>
            <div style={{
              width:'72px', height:'48px', borderRadius:'6px',
              overflow:'hidden', border:'2px solid rgba(255,255,255,0.3)',
              boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <img src="/rdc-flag.jpg" alt="Drapeau RDC" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.55)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', textAlign:'center' }}>
              R.D. Congo
            </span>
          </div>
        </div>

        {/* Accent bar */}
        <div style={{ height:'4px', background:'linear-gradient(90deg, #60A5FA 0%, #3B82F6 30%, #F59E0B 60%, #EF4444 100%)' }}/>
      </div>

      {/* ── SECONDARY INFO BAND ───────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(90deg, #F0F4FF 0%, #EFF6FF 100%)',
        padding:'8px 28px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'2px solid #DBEAFE',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#2563EB' }}/>
            <span style={{ fontSize:'10px', color:'#1E40AF', fontWeight:700 }}>ALBA SERVICE GROUP PLATFORM</span>
          </div>
          <span style={{ fontSize:'9px', color:'#60A5FA' }}>|</span>
          <span style={{ fontSize:'9px', color:'#3B82F6', fontWeight:500 }}>Système de Gestion Intégré — v1.0.0</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ fontSize:'9px', color:'#6B7280' }}>Confidentiel</span>
          <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#9CA3AF' }}/>
          <span style={{ fontSize:'9px', color:'#6B7280' }}>Usage interne uniquement</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Footer professionnel pour les rapports imprimés
 */
export function ReportFooter({ pageNum, totalPages }: { pageNum?: number; totalPages?: number }) {
  const year = new Date().getFullYear()
  return (
    <div style={{
      marginTop:'32px',
      background:'linear-gradient(135deg, #0B1A4D 0%, #1E3A8A 100%)',
      borderRadius:'0 0 12px 12px',
      padding:'12px 28px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <img src="/alba-logo.png" alt="ALBA" style={{ width:'20px', height:'20px', objectFit:'contain', opacity:0.8 }}/>
        <span style={{ fontSize:'9px', color:'rgba(147,197,253,0.7)', lineHeight:1.5 }}>
          © {year} ALBA SERVICE GROUP · Kindu, Province du Maniema, R.D. Congo<br/>
          Tous droits réservés — Document généré automatiquement par la plateforme
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        {pageNum !== undefined && (
          <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>
            Page {pageNum}{totalPages ? ` / ${totalPages}` : ''}
          </span>
        )}
        <img src="/rdc-flag.jpg" alt="RDC" style={{ width:'28px', height:'18px', objectFit:'cover', borderRadius:'3px', border:'1px solid rgba(255,255,255,0.2)', opacity:0.8 }}/>
      </div>
    </div>
  )
}
