import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  FolderOpen, Plus, Search, Download, Eye, Trash2, Upload, X,
  FileText, Image, File, Archive, Lock, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react'

type Doc = {
  id:string; name:string; type:string; size:string
  category:string; author:string; date:string
  version:string; access:string; tags:string[]
}

function mapDoc(raw: any): Doc {
  return {
    id:       raw.id,
    name:     raw.name || raw.fileName || '',
    type:     raw.type || raw.mimeType?.split('/')[1] || 'file',
    size:     raw.fileSize ? `${(raw.fileSize/1024/1024).toFixed(1)} MB` : '—',
    category: raw.category || raw.type || 'Général',
    author:   raw.uploadedBy?.firstName
      ? `${raw.uploadedBy.firstName} ${raw.uploadedBy.lastName || ''}`.trim()
      : (raw.createdBy || '—'),
    date:     raw.createdAt || raw.uploadedAt || '',
    version:  raw.version ? String(raw.version) : '1.0',
    access:   raw.isConfidential ? 'restricted' : 'public',
    tags:     raw.tags || [],
  }
}
const CATEGORIES = ['Tous','Contrats','Factures','Rapports','RH','Projets IT','Graphisme','Documentation']

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf:    <FileText size={20} className="text-red-500"/>,
  word:   <FileText size={20} className="text-blue-500"/>,
  excel:  <FileText size={20} className="text-green-500"/>,
  image:  <Image    size={20} className="text-purple-500"/>,
  design: <FileText size={20} className="text-orange-500"/>,
  default:<File     size={20} className="text-gray-400"/>,
}

const ACCESS_CONFIG: Record<string,{label:string;cls:string}> = {
  public:     {label:'Public',    cls:'bg-green-50 text-green-700'},
  team:       {label:'Équipe',    cls:'bg-blue-50 text-blue-700'},
  private:    {label:'Privé',     cls:'bg-gray-100 text-gray-600'},
  restricted: {label:'Restreint', cls:'bg-red-50 text-red-700'},
}

/* ── Simulate download ── */
function simulateDownload(doc: Doc) {
  const link = document.createElement('a')
  link.href = '#'
  link.download = doc.name
  const blob = new Blob([`Contenu simulé du document: ${doc.name}\nAuteur: ${doc.author}\nDate: ${doc.date}`], {type:'text/plain'})
  link.href = URL.createObjectURL(blob)
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

/* ── Simulate print ── */
function simulatePrint(doc: Doc) {
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) { alert('Autorisez les popups pour imprimer.'); return }
  win.document.write(`
    <html><head><title>${doc.name}</title>
    <style>body{font-family:sans-serif;padding:40px;color:#1f2937}h1{color:#1E3A8A}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:8px;border-bottom:1px solid #e5e7eb}td:first-child{font-weight:600;color:#6b7280;width:140px}</style>
    </head><body>
    <h1>ALBA SERVICE GROUP</h1>
    <p style="color:#6b7280;font-size:13px">Kindu – Province du Maniema – R.D. Congo</p>
    <hr style="margin:16px 0;border-color:#e5e7eb"/>
    <h2 style="font-size:18px">${doc.name}</h2>
    <table>
      <tr><td>Catégorie</td><td>${doc.category}</td></tr>
      <tr><td>Auteur</td><td>${doc.author}</td></tr>
      <tr><td>Date</td><td>${doc.date}</td></tr>
      <tr><td>Version</td><td>v${doc.version}</td></tr>
      <tr><td>Taille</td><td>${doc.size}</td></tr>
      <tr><td>Accès</td><td>${ACCESS_CONFIG[doc.access]?.label || doc.access}</td></tr>
    </table>
    <p style="margin-top:32px;color:#9ca3af;font-size:11px">© 2026 ALBA SERVICE GROUP — Document confidentiel</p>
    </body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export default function DocumentsPage() {
  const { items: docs, add, remove, loading, error, refresh } = useApiDB<Doc>('/documents', [], mapDoc)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('Tous')
  const [view, setView]       = useState<'list'|'grid'>('list')
  const [showModal, setShowModal] = useState(false)
  const [viewDoc, setViewDoc]   = useState<Doc|null>(null)
  const [toast, setToast]       = useState<string|null>(null)

  /* Upload form */
  const [uploadForm, setUploadForm] = useState({
    name:'', category:'Contrats', access:'public', author:'', type:'pdf', size:'—'
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = docs.filter(d => {
    const ms = `${d.name} ${d.author} ${d.category}`.toLowerCase().includes(search.toLowerCase())
    const mc = category === 'Tous' || d.category === category
    return ms && mc
  })

  const handleDelete = async (id: string) => {
    const doc = docs.find(d => d.id === id)
    if (!confirm(`Supprimer "${doc?.name}" ?`)) return
    await remove(id)
    setViewDoc(null)
    showToast(`"${doc?.name}" supprimé`)
  }

  const handleUpload = async () => {
    if (!uploadForm.name.trim()) return alert('Nom du document requis.')
    const newDoc = {
      name: uploadForm.name.endsWith('.pdf') || uploadForm.name.includes('.') ? uploadForm.name : `${uploadForm.name}.pdf`,
      type: uploadForm.type,
      size: uploadForm.size,
      category: uploadForm.category,
      author: uploadForm.author || 'Utilisateur',
      date: new Date().toISOString().slice(0,10),
      version: '1.0',
      access: uploadForm.access,
      tags: [uploadForm.category],
    }
    await add(newDoc as any)
    setShowModal(false)
    setUploadForm({name:'',category:'Contrats',access:'public',author:'',type:'pdf',size:'—'})
    showToast(`"${newDoc.name}" ajouté`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Gestion Documentaire"
        subtitle="Archivage numérique, documents et fichiers de l'entreprise"
        breadcrumbs={[{label:'Accueil'},{label:'Documents'}]}
        icon={<FolderOpen size={22}/>}
        iconBg="gradient-primary"
        actions={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
            style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
            <Upload size={15}/> Ajouter document
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total documents"   value={docs.length.toString()}                           icon={<FolderOpen size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Ce mois"           value={docs.filter(d=>d.date.startsWith('2026-07')).length.toString()} icon={<Plus size={20}/>}      gradient="gradient-success"/>
        <KpiCard title="Restreints"        value={docs.filter(d=>d.access==='restricted').length.toString()}     icon={<Lock size={20}/>}      gradient="gradient-warning"/>
        <KpiCard title="Taille totale"     value="22.1 MB"                                          icon={<Archive size={20}/>}   gradient="gradient-teal"/>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${category===c?'bg-blue-600 text-white shadow':'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, auteur, catégorie..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
        </div>
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
          {([['list','≡'],['grid','⊞']] as const).map(([v,i]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${view===v?'bg-blue-50 text-blue-700 shadow-sm':'text-gray-400'}`}>{i}</button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Document','Catégorie','Auteur','Taille','Version','Accès','Date','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Aucun document trouvé</td></tr>
                ) : filtered.map(d => {
                  const acc = ACCESS_CONFIG[d.access]
                  return (
                    <tr key={d.id} className="hover:bg-blue-50/20 group transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {TYPE_ICONS[d.type]||TYPE_ICONS.default}
                          <div>
                            <p className="text-xs font-semibold text-gray-800 max-w-[200px] truncate">{d.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {d.tags.map((t,i) => <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{d.category}</span></td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{d.author}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{d.size}</td>
                      <td className="px-4 py-3.5"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">v{d.version}</span></td>
                      <td className="px-4 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${acc.cls}`}>{acc.label}</span></td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(d.date)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewDoc(d)}
                            title="Voir les détails"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye size={13}/>
                          </button>
                          <button onClick={() => simulateDownload(d)}
                            title="Télécharger"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Download size={13}/>
                          </button>
                          <button onClick={() => simulatePrint(d)}
                            title="Imprimer"
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-xs font-bold">
                            🖨
                          </button>
                          <button onClick={() => handleDelete(d.id)}
                            title="Supprimer"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-xs text-gray-500">{filtered.length} document(s) affiché(s)</p>
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(d => {
            const acc = ACCESS_CONFIG[d.access]
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setViewDoc(d)}>
                <div className="flex justify-center mb-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 flex items-center justify-center">
                    {TYPE_ICONS[d.type]||TYPE_ICONS.default}
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate mb-1">{d.name}</p>
                <p className="text-[10px] text-gray-400 mb-2">{d.size} · v{d.version}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${acc.cls}`}>{acc.label}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(d.date)}</span>
                </div>
                <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); simulateDownload(d) }}
                    className="flex-1 py-1.5 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg">
                    ↓ Télécharger
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(d.id) }}
                    className="px-2 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DOCUMENT DETAIL PANEL ── */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setViewDoc(null)}>
          <div className="w-[420px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{background:'linear-gradient(135deg,#0F2460,#1E3A8A)'}}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    {TYPE_ICONS[viewDoc.type]||TYPE_ICONS.default}
                  </div>
                  <div>
                    <p className="text-blue-300 text-xs mb-0.5">{viewDoc.category}</p>
                    <h3 className="font-bold text-sm leading-tight">{viewDoc.name}</h3>
                    <p className="text-blue-200 text-xs mt-0.5">v{viewDoc.version} · {viewDoc.size}</p>
                  </div>
                </div>
                <button onClick={() => setViewDoc(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:'Auteur',   value:viewDoc.author},
                  {label:'Date',     value:formatDate(viewDoc.date)},
                  {label:'Version',  value:`v${viewDoc.version}`},
                  {label:'Taille',   value:viewDoc.size},
                  {label:'Accès',    value:ACCESS_CONFIG[viewDoc.access]?.label || viewDoc.access},
                  {label:'Catégorie',value:viewDoc.category},
                ].map((s,i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {viewDoc.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewDoc.tags.map((t,i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{t}</span>)}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => simulateDownload(viewDoc)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-xl hover:opacity-90"
                  style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                  <Download size={15}/> Télécharger
                </button>
                <button onClick={() => simulatePrint(viewDoc)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
                  🖨 Imprimer
                </button>
                <button onClick={() => handleDelete(viewDoc.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">
                  <Trash2 size={15}/> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                  <Upload size={18} className="text-white"/>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Ajouter un document</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50/30">
                <Upload size={28} className="mx-auto text-blue-400 mb-2"/>
                <p className="text-sm text-gray-600 font-medium">Glissez un fichier ou remplissez ci-dessous</p>
                <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images · Max 50 MB</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du document *</label>
                <input value={uploadForm.name} onChange={e=>setUploadForm({...uploadForm,name:e.target.value})}
                  placeholder="Ex: Rapport_Juillet_2026.pdf"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Auteur</label>
                <input value={uploadForm.author} onChange={e=>setUploadForm({...uploadForm,author:e.target.value})}
                  placeholder="Votre nom"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
                  <select value={uploadForm.category} onChange={e=>setUploadForm({...uploadForm,category:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {CATEGORIES.filter(c=>c!=='Tous').map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accès</label>
                  <select value={uploadForm.access} onChange={e=>setUploadForm({...uploadForm,access:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {Object.entries(ACCESS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de fichier</label>
                  <select value={uploadForm.type} onChange={e=>setUploadForm({...uploadForm,type:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="pdf">PDF</option>
                    <option value="word">Word</option>
                    <option value="excel">Excel</option>
                    <option value="image">Image</option>
                    <option value="design">Design</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Taille</label>
                  <input value={uploadForm.size} onChange={e=>setUploadForm({...uploadForm,size:e.target.value})}
                    placeholder="Ex: 2.4 MB"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={handleUpload}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                <Upload size={13}/> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
