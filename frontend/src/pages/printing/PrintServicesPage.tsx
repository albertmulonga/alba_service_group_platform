import React, { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Search, Pencil, Trash2, Printer } from 'lucide-react'

type PrintService = {
  id: string
  name: string
  category: string
  basePrice: number
  isActive: boolean
}

export default function PrintServicesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<PrintService[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', basePrice: '', isActive: true })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/print/services', { params: { search } })
      setItems(data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/print/services/${editingId}`, { ...form, basePrice: Number(form.basePrice) })
        setEditingId(null)
      } else {
        await api.post('/print/services', { ...form, basePrice: Number(form.basePrice) })
      }
      setForm({ name: '', category: '', basePrice: '', isActive: true })
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Enregistrement échoué')
    }
  }

  const handleEdit = (item: PrintService) => {
    setForm({ name: item.name, category: item.category, basePrice: String(item.basePrice), isActive: item.isActive })
    setEditingId(item.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce service ?')) return
    try {
      await api.delete(`/print/services/${id}`)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Suppression échouée')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Services d'impression</h1>
          <p className="text-sm text-gray-500">Catalogue des services disponibles</p>
        </div>
        <button onClick={() => { setForm({ name: '', category: '', basePrice: '', isActive: true }); setEditingId(null) }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={16} /> Nouveau service
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Rechercher</button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3 text-right">Prix</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Chargement...</td></tr>}
                {!loading && items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-700">{item.category}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{Number(item.basePrice).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Aucun service</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">{editingId ? 'Modifier' : 'Nouveau'} service</h2>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Catégorie</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Prix de base</label>
              <input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="submit" className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', category: '', basePrice: '', isActive: true }) }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Annuler</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
