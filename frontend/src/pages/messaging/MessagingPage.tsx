import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMessaging, hashColor, getInitials, type Message, type Conversation } from '@/contexts/MessagingContext'
import {
  Search, Send, Plus, X, Check, CheckCheck, ArrowLeft, Phone, Video,
  MoreVertical, Trash2, Edit3, Reply, Copy, Users, UserPlus, UserMinus,
  Shield, Settings, Archive, Pin, PinOff, Volume2, VolumeX, LogOut,
  MessageSquare, ChevronDown, Image, Paperclip, Smile, Camera,
  Menu, Star, Bell, BellOff, Circle, CheckCircle2
} from 'lucide-react'

type ContactLike = {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  role: string
  photo: string | null
  isOnline: boolean
  lastSeen: string
}

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘',
  '😎', '🤩', '🤔', '🙂', '😉', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '✅', '❌',
  '❤️', '🔥', '🎉', '⭐', '📞', '📧', '💰', '⏰',
  '📌', '📎', '🚀', '💼', '📊', '📝', '🔔', '⚡'
]

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

const dayDifference = (isoDate: string): number => {
  const today = startOfDay(new Date())
  const target = startOfDay(new Date(isoDate))
  return Math.round((today - target) / DAY_MS)
}

const formatTime = (isoDate: string): string => {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const formatConversationTime = (isoDate: string): string => {
  const diff = dayDifference(isoDate)
  if (diff === 0) return formatTime(isoDate)
  if (diff === 1) return 'Hier'
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDaySeparator = (isoDate: string): string => {
  const diff = dayDifference(isoDate)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatLastSeen = (isoDate: string): string => {
  const diff = dayDifference(isoDate)
  if (diff === 0) return `vu(e) aujourd’hui à ${formatTime(isoDate)}`
  if (diff === 1) return `vu(e) hier à ${formatTime(isoDate)}`
  return `vu(e) le ${new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

interface AvatarProps {
  name: string
  photo?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  isGroup?: boolean
}

const AVATAR_SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-8 h-8 text-[10px]',
  sm: 'w-10 h-10 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl'
}

function Avatar({ name, photo, size = 'md', online = false, isGroup = false }: AvatarProps) {
  const dotSize = size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
  return (
    <div className="relative shrink-0">
      {photo ? (
        <img
          src={photo}
          alt={name}
          className={`${AVATAR_SIZES[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${AVATAR_SIZES[size]} rounded-full bg-gradient-to-br ${hashColor(name)} flex items-center justify-center text-white font-semibold select-none`}
        >
          {isGroup ? <Users className="w-1/2 h-1/2" /> : getInitials(name)}
        </div>
      )}
      {online && (
        <span
          className={`absolute bottom-0 right-0 ${dotSize} bg-emerald-500 rounded-full ring-2 ring-white`}
          title="En ligne"
        />
      )}
    </div>
  )
}

interface NewChatModalProps {
  open: boolean
  contacts: ContactLike[]
  excludeUserId: string
  searchContacts: (query: string) => ContactLike[]
  onClose: () => void
  onStartPrivate: (contact: ContactLike) => void
  onOpenCreateGroup: () => void
}

function NewChatModal({
  open,
  contacts,
  excludeUserId,
  searchContacts,
  onClose,
  onStartPrivate,
  onOpenCreateGroup
}: NewChatModalProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  if (!open) return null

  const results = searchContacts(query).filter((c) => c.userId !== excludeUserId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nouvelle discussion</h2>
            <p className="text-xs text-gray-500">Sélectionnez un contact pour discuter</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <button
            onClick={onOpenCreateGroup}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
          >
            <span className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <Users className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-emerald-800">Nouveau groupe</span>
              <span className="block text-xs text-emerald-600">Créer une discussion de groupe</span>
            </span>
            <Plus className="h-5 w-5 text-emerald-600 shrink-0" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom, un service, un rôle…"
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Contacts ({results.length})
          </p>
          {results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Aucun contact trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Essayez avec un autre terme de recherche</p>
            </div>
          )}
          {results.map((contact) => {
            const fullName = `${contact.firstName} ${contact.lastName}`
            return (
              <button
                key={contact.id}
                onClick={() => onStartPrivate(contact)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <Avatar name={fullName} photo={contact.photo} size="sm" online={contact.isOnline} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{fullName}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {contact.role} · {contact.department}
                  </span>
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{contact.isOnline ? 'en ligne' : ''}</span>
              </button>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
          <span>{contacts.length} contacts disponibles</span>
          <span>ALBA Service Group</span>
        </div>
      </div>
    </div>
  )
}

interface CreateGroupModalProps {
  open: boolean
  contacts: ContactLike[]
  creatorId: string
  creatorName: string
  onClose: () => void
  onCreate: (name: string, description: string, memberIds: string[]) => void
}

function CreateGroupModal({
  open,
  contacts,
  creatorId,
  creatorName,
  onClose,
  onCreate
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const candidates = useMemo(
    () => contacts.filter((c) => c.userId !== creatorId),
    [contacts, creatorId]
  )

  useEffect(() => {
    if (open) {
      setGroupName('')
      setGroupDescription('')
      setSelectedIds([])
      setError('')
    }
  }, [open])

  if (!open) return null

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = () => {
    if (!groupName.trim()) {
      setError('Le nom du groupe est obligatoire.')
      return
    }
    if (selectedIds.length === 0) {
      setError('Sélectionnez au moins un membre pour créer le groupe.')
      return
    }
    setError('')
    onCreate(groupName.trim(), groupDescription.trim(), selectedIds)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Créer un groupe</h2>
              <p className="text-xs text-emerald-100">Administrateur : {creatorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label htmlFor="group-name" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nom du groupe *
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex. Équipe Projet 2026"
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <div>
            <label htmlFor="group-desc" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Description
            </label>
            <textarea
              id="group-desc"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Objet du groupe (optionnel)"
              rows={2}
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition resize-none"
            />
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Ajouter des membres
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {selectedIds.length} sélectionné(s)
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
              {candidates.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName}`
                const isSelected = selectedIds.includes(contact.userId)
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleMember(contact.userId)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Avatar name={fullName} photo={contact.photo} size="xs" online={contact.isOnline} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{fullName}</span>
                      <span className="block text-xs text-gray-500 truncate">{contact.role}</span>
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                    )}
                  </button>
                )
              })}
              {candidates.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun contact disponible</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!groupName.trim() || selectedIds.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Users className="h-4 w-4" />
            Créer le groupe
          </button>
        </div>
      </div>
    </div>
  )
}

interface GroupInfoPanelProps {
  open: boolean
  conversation: Conversation | null
  contacts: ContactLike[]
  currentUserId: string
  onlineUsers: string[]
  isAdmin: boolean
  onClose: () => void
  onUpdateGroup: (updates: { name?: string; description?: string }) => void
  onAddMembers: (userIds: string[]) => void
  onRemoveMember: (userId: string) => void
  onToggleAdmin: (userId: string) => void
  onTogglePin: () => void
  onToggleMute: () => void
  onToggleArchive: () => void
  onLeave: () => void
  onStartPrivateWith: (userId: string) => void
}

function GroupInfoPanel({
  open,
  conversation,
  contacts,
  currentUserId,
  onlineUsers,
  isAdmin,
  onClose,
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onToggleAdmin,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onLeave,
  onStartPrivateWith
}: GroupInfoPanelProps) {
  const [membersCollapsed, setMembersCollapsed] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')

  useEffect(() => {
    if (open) {
      setMembersCollapsed(false)
      setEditingName(false)
      setEditingDescription(false)
    }
  }, [open, conversation?.id])

  if (!open || !conversation) return null

  const memberContacts = conversation.participants
    .map((pid) => contacts.find((c) => c.userId === pid))
    .filter((c): c is ContactLike => Boolean(c))
  const unknownMembers = conversation.participants.length - memberContacts.length
  const addableContacts = contacts.filter(
    (c) => c.userId !== currentUserId && !conversation.participants.includes(c.userId)
  )

  const submitName = () => {
    if (nameDraft.trim()) onUpdateGroup({ name: nameDraft.trim() })
    setEditingName(false)
  }

  const submitDescription = () => {
    onUpdateGroup({ description: descriptionDraft })
    setEditingDescription(false)
  }

  return (
    <>
      <button
        aria-label="Fermer les informations"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[380px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold">Infos du groupe</h2>
          </div>
          <Settings className="h-5 w-5 text-white/70" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center px-6 py-6 border-b border-gray-100">
            <Avatar name={conversation.name} size="xl" isGroup online={false} />
            {editingName ? (
              <div className="mt-3 w-full flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitName()}
                  autoFocus
                  maxLength={60}
                  className="flex-1 px-3 py-2 rounded-lg border border-emerald-300 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  onClick={submitName}
                  className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                  title="Enregistrer"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  title="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 text-center">{conversation.name}</h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setNameDraft(conversation.name)
                      setEditingName(true)
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-emerald-600 transition-colors"
                    title="Renommer le groupe"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              {conversation.participants.length} participants ·{' '}
              {conversation.participants.filter((pid) => onlineUsers.includes(pid)).length} en ligne
            </p>
          </div>

          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Description</p>
            {editingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={3}
                  maxLength={200}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitDescription}
                    className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {conversation.description || 'Aucune description pour ce groupe.'}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setDescriptionDraft(conversation.description)
                      setEditingDescription(true)
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-emerald-600 transition-colors shrink-0"
                    title="Modifier la description"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-100 border-b border-gray-100">
            <SettingRow
              icon={conversation.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              label={conversation.pinned ? 'Désépingler la discussion' : 'Épingler la discussion'}
              onClick={onTogglePin}
            />
            <SettingRow
              icon={conversation.muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              label={conversation.muted ? 'Réactiver les notifications' : 'Couper les notifications'}
              onClick={onToggleMute}
            />
            <SettingRow
              icon={<Archive className="h-4 w-4" />}
              label={conversation.archived ? 'Désarchiver la discussion' : 'Archiver la discussion'}
              onClick={onToggleArchive}
            />
            <SettingRow
              icon={<Star className="h-4 w-4" />}
              label="Discussion du groupe ALBA"
              trailing={<Shield className="h-4 w-4 text-emerald-500" />}
              onClick={() => undefined}
            />
          </div>

          {isAdmin && addableContacts.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter des membres
              </p>
              <div className="space-y-1">
                {addableContacts.map((contact) => {
                  const fullName = `${contact.firstName} ${contact.lastName}`
                  return (
                    <div key={contact.id} className="flex items-center gap-2.5 py-1.5">
                      <Avatar name={fullName} photo={contact.photo} size="xs" online={contact.isOnline} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{fullName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{contact.role}</p>
                      </div>
                      <button
                        onClick={() => onAddMembers([contact.userId])}
                        className="p-1.5 rounded-full text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title={`Ajouter ${fullName}`}
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <button
              onClick={() => setMembersCollapsed((v) => !v)}
              className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Membres ({conversation.participants.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${membersCollapsed ? '-rotate-90' : ''}`}
              />
            </button>

            {!membersCollapsed && (
              <div className="mt-3 space-y-1">
                {memberContacts.map((contact) => {
                  const fullName = `${contact.firstName} ${contact.lastName}`
                  const contactIsAdmin = conversation.admins.includes(contact.userId)
                  const isSelf = contact.userId === currentUserId
                  return (
                    <div
                      key={contact.id}
                      className="group flex items-center gap-2.5 py-2 rounded-lg hover:bg-gray-50 px-1.5 -mx-1.5 transition-colors"
                    >
                      <Avatar name={fullName} photo={contact.photo} size="xs" online={contact.isOnline} />
                      <button
                        onClick={() => !isSelf && onStartPrivateWith(contact.userId)}
                        className="flex-1 min-w-0 text-left"
                        title={!isSelf ? `Discuter avec ${fullName}` : undefined}
                      >
                        <p className="text-sm text-gray-800 truncate">
                          {fullName}
                          {isSelf && <span className="text-gray-400"> (vous)</span>}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{contact.role}</p>
                      </button>
                      {contactIsAdmin && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 shrink-0">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onToggleAdmin(contact.userId)}
                            className={`p-1.5 rounded-full transition-colors ${
                              contactIsAdmin
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={contactIsAdmin ? 'Retirer le rôle admin' : 'Nommer admin'}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onRemoveMember(contact.userId)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Retirer du groupe"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {unknownMembers > 0 && (
                  <p className="text-[11px] text-gray-400 pt-1">
                    + {unknownMembers} membre(s) sans fiche contact
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onLeave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Quitter le groupe
          </button>
        </div>
      </aside>
    </>
  )
}

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  trailing?: React.ReactNode
  onClick: () => void
}

function SettingRow({ icon, label, trailing, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="text-emerald-600 shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      {trailing}
    </button>
  )
}

export default function MessagingPage() {
  const { user } = useAuth()
  const {
    contacts,
    conversations,
    onlineUsers,
    typingUsers,
    searchContacts,
    getContactByUserId,
    getConversationsForUser,
    getArchivedConversations,
    getMessagesForConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    createConversation,
    createGroup,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    addGroupAdmin,
    removeGroupAdmin,
    deleteConversation,
    archiveConversation,
    pinConversation,
    muteConversation,
    setTyping,
    activeCall,
    startCall,
    acceptCall,
    endCall
  } = useMessaging()

  const currentUserId = user?.id ?? ''
  const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Utilisateur'

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null)
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [activeTab, setActiveTab] = useState<'discussions' | 'archives'>('discussions')
  const [draft, setDraft] = useState('')
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<{ name: string; url: string; type: string } | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const myConversations = useMemo(
    () => (currentUserId ? getConversationsForUser(currentUserId) : []),
    [getConversationsForUser, currentUserId]
  )

  const archivedConversations = useMemo(
    () => (currentUserId ? getArchivedConversations(currentUserId) : []),
    [getArchivedConversations, currentUserId]
  )

  const activeList = activeTab === 'discussions' ? myConversations : archivedConversations

  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeList
    return activeList.filter(
      (c) => c.name.toLowerCase().includes(query) || c.lastMessage.toLowerCase().includes(query)
    )
  }, [activeList, searchQuery])

  const totalUnread = useMemo(
    () => myConversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [myConversations]
  )

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConvId) ?? null,
    [conversations, selectedConvId]
  )

  const convMessages = useMemo(
    () => (selectedConvId ? getMessagesForConversation(selectedConvId) : []),
    [getMessagesForConversation, selectedConvId]
  )

  const messagesById = useMemo(() => new Map(convMessages.map((m) => [m.id, m])), [convMessages])

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'private') return null
    return activeConversation.participants.find((p) => p !== currentUserId) ?? null
  }, [activeConversation, currentUserId])

  const otherContact = otherParticipantId ? getContactByUserId(otherParticipantId) : undefined

  const isPartnerOnline = Boolean(otherParticipantId && onlineUsers.includes(otherParticipantId))

  const partnerIsTyping = useMemo(() => {
    if (!selectedConvId) return false
    return (typingUsers[selectedConvId] ?? []).some((id) => id !== currentUserId)
  }, [typingUsers, selectedConvId, currentUserId])

  const isGroupAdmin = Boolean(
    activeConversation && activeConversation.type === 'group' &&
    activeConversation.admins.includes(currentUserId)
  )

  const getConversationName = useCallback(
    (conversation: Conversation): string => {
      if (conversation.type === 'group') return conversation.name
      const otherId =
        conversation.participants.find((p) => p !== currentUserId) ?? conversation.participants[0]
      const contact = getContactByUserId(otherId)
      return contact ? `${contact.firstName} ${contact.lastName}` : conversation.name
    },
    [currentUserId, getContactByUserId]
  )

  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0 && currentUserId) {
      markAsRead(activeConversation.id)
    }
  }, [activeConversation, currentUserId, markAsRead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [selectedConvId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [convMessages.length])

  useEffect(() => {
    const convId = selectedConvId
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (convId && currentUserId) setTyping(convId, currentUserId, false)
    }
  }, [selectedConvId, currentUserId, setTyping])

  useEffect(() => {
    if (!contextMenu && !headerMenuOpen && !showEmojiPicker) return
    const closeAll = () => {
      setContextMenu(null)
      setHeaderMenuOpen(false)
      setShowEmojiPicker(false)
    }
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [contextMenu, headerMenuOpen, showEmojiPicker])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setContextMenu(null)
      setHeaderMenuOpen(false)
      setShowEmojiPicker(false)
      if (editingMsg) setEditingMsg(null)
      else if (replyingTo) setReplyingTo(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editingMsg, replyingTo])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const resetComposer = useCallback(() => {
    setDraft('')
    setReplyingTo(null)
    setEditingMsg(null)
    requestAnimationFrame(resizeTextarea)
  }, [resizeTextarea])

  const clearTypingSignal = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    if (selectedConvId && currentUserId) setTyping(selectedConvId, currentUserId, false)
  }, [selectedConvId, currentUserId, setTyping])

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setSelectedConvId(conversation.id)
      setMobileShowChat(true)
      setShowGroupInfo(false)
      setHeaderMenuOpen(false)
      setSearchQuery('')
      resetComposer()
      clearTypingSignal()
      if (conversation.unreadCount > 0) markAsRead(conversation.id)
    },
    [markAsRead, resetComposer, clearTypingSignal]
  )

  const handleStartPrivate = useCallback(
    (contact: ContactLike) => {
      if (!currentUserId) return
      const conversation = createConversation([currentUserId, contact.userId], currentUserId)
      setShowNewChat(false)
      setActiveTab('discussions')
      handleSelectConversation(conversation)
    },
    [currentUserId, createConversation, handleSelectConversation]
  )

  const handleStartPrivateWithUser = useCallback(
    (targetUserId: string) => {
      if (!currentUserId) return
      setShowGroupInfo(false)
      const conversation = createConversation([currentUserId, targetUserId], currentUserId)
      setActiveTab('discussions')
      handleSelectConversation(conversation)
    },
    [currentUserId, createConversation, handleSelectConversation]
  )

  const handleCreateGroup = useCallback(
    (name: string, description: string, memberIds: string[]) => {
      if (!currentUserId) return
      const conversation = createGroup(
        name,
        [currentUserId, ...memberIds],
        [currentUserId],
        description
      )
      setShowCreateGroup(false)
      setActiveTab('discussions')
      handleSelectConversation(conversation)
    },
    [currentUserId, createGroup, handleSelectConversation]
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview({
        name: file.name,
        url: reader.result as string,
        type: type === 'image' ? 'image' : file.type,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!activeConversation || !currentUserId) return
    if (!text && !filePreview) return

    if (editingMsg) {
      editMessage(editingMsg.id, text)
    } else {
      const content = filePreview ? (text || filePreview.name) : text
      const msgType = filePreview?.type.startsWith('image') ? 'image' as const : 'file' as const
      sendMessage(
        activeConversation.id,
        currentUserId,
        currentUserName,
        content,
        filePreview ? msgType : 'text',
        replyingTo?.id
      )
    }
    setFilePreview(null)
    clearTypingSignal()
    resetComposer()
  }, [
    draft, filePreview, activeConversation, currentUserId, currentUserName,
    editingMsg, replyingTo, sendMessage, editMessage, clearTypingSignal, resetComposer
  ])

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value)
      resizeTextarea()
      if (!selectedConvId || !currentUserId) return
      setTyping(selectedConvId, currentUserId, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConvId && currentUserId) setTyping(selectedConvId, currentUserId, false)
      }, 2500)
    },
    [selectedConvId, currentUserId, setTyping, resizeTextarea]
  )

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, message: Message) => {
      event.preventDefault()
      const menuWidth = 200
      const menuHeight = 220
      setContextMenu({
        msgId: message.id,
        x: Math.min(event.clientX, window.innerWidth - menuWidth),
        y: Math.min(event.clientY, window.innerHeight - menuHeight)
      })
    },
    []
  )

  const handleCopy = useCallback((message: Message) => {
    const text = message.deleted ? '' : message.content
    if (!text) return
    const finish = () => {
      setCopiedMsgId(message.id)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopiedMsgId(null), 1500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(finish)
    } else {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(area)
      finish()
    }
  }, [])

  const handleEdit = useCallback(
    (message: Message) => {
      setEditingMsg(message)
      setReplyingTo(null)
      setDraft(message.content)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        resizeTextarea()
      })
    },
    [resizeTextarea]
  )

  const handleDelete = useCallback(
    (message: Message) => {
      if (window.confirm('Voulez-vous vraiment supprimer ce message ?')) {
        deleteMessage(message.id)
        if (editingMsg?.id === message.id) resetComposer()
      }
    },
    [deleteMessage, editingMsg, resetComposer]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingMsg(null)
    setDraft('')
    requestAnimationFrame(resizeTextarea)
  }, [resizeTextarea])

  const handleAppendEmoji = useCallback(
    (emoji: string) => {
      setDraft((prev) => prev + emoji)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        resizeTextarea()
      })
    },
    [resizeTextarea]
  )

  const handleBackFromMobile = useCallback(() => {
    setMobileShowChat(false)
  }, [])

  const handleDeleteConversation = useCallback(() => {
    if (!activeConversation) return
    if (!window.confirm(`Supprimer définitivement « ${getConversationName(activeConversation)} » ?`)) {
      return
    }
    deleteConversation(activeConversation.id)
    setSelectedConvId(null)
    setMobileShowChat(false)
    setShowGroupInfo(false)
    setHeaderMenuOpen(false)
  }, [activeConversation, deleteConversation, getConversationName])

  const handleLeaveGroup = useCallback(() => {
    if (!activeConversation || !currentUserId) return
    if (!window.confirm('Voulez-vous vraiment quitter ce groupe ?')) return
    removeGroupMember(activeConversation.id, currentUserId)
    setSelectedConvId(null)
    setMobileShowChat(false)
    setShowGroupInfo(false)
  }, [activeConversation, currentUserId, removeGroupMember])

  const handleToggleGroupAdmin = useCallback(
    (targetUserId: string) => {
      if (!activeConversation) return
      if (activeConversation.admins.includes(targetUserId)) {
        removeGroupAdmin(activeConversation.id, targetUserId)
      } else {
        addGroupAdmin(activeConversation.id, targetUserId)
      }
    },
    [activeConversation, addGroupAdmin, removeGroupAdmin]
  )

  const contextTarget = contextMenu ? messagesById.get(contextMenu.msgId) : undefined
  const contextIsMine = contextTarget ? contextTarget.senderId === currentUserId : false

  const renderConversationItem = (conversation: Conversation) => {
    const name = getConversationName(conversation)
    const isSelected = conversation.id === selectedConvId
    const isGroupConv = conversation.type === 'group'
    const senderPrefix =
      isGroupConv && conversation.lastMessageSender
        ? conversation.lastMessageSender === currentUserName
          ? 'Vous : '
          : `${conversation.lastMessageSender.split(' ')[0]} : `
        : ''
    return (
      <button
        key={conversation.id}
        onClick={() => handleSelectConversation(conversation)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
          isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
        }`}
      >
        <Avatar
          name={name}
          photo={conversation.type === 'private' ? otherContactPhoto(conversation) : null}
          size="md"
          online={
            conversation.type === 'private' &&
            isConversationOnline(conversation)
          }
          isGroup={conversation.type === 'group'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {conversation.type === 'group' && <span className="mr-1">👥</span>}
              {name}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {conversation.lastMessageTime ? formatConversationTime(conversation.lastMessageTime) : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-gray-500 truncate">
              <span className="text-gray-600">{senderPrefix}</span>
              {conversation.lastMessage || 'Nouvelle discussion — dites bonjour !'}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {conversation.muted && <VolumeX className="h-3.5 w-3.5 text-gray-400" />}
              {conversation.pinned && <Pin className="h-3.5 w-3.5 text-gray-400" />}
              {conversation.unreadCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  const otherContactPhoto = (conversation: Conversation): string | null => {
    const otherId =
      conversation.participants.find((p) => p !== currentUserId) ?? conversation.participants[0]
    return getContactByUserId(otherId)?.photo ?? null
  }

  const isConversationOnline = (conversation: Conversation): boolean => {
    const otherId = conversation.participants.find((p) => p !== currentUserId)
    return Boolean(otherId && onlineUsers.includes(otherId))
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <section
        className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex w-full md:w-[380px] shrink-0 flex-col bg-white border-r border-gray-200`}
      >
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="relative">
            <Avatar name={currentUserName} size="sm" online />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Messages</h1>
            <p className="text-[11px] text-gray-400 truncate">
              {totalUnread > 0
                ? `${totalUnread} message(s) non lu(s)`
                : `${myConversations.length} discussion(s) active(s)`}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('archives')}
            className={`p-2 rounded-full transition-colors ${
              activeTab === 'archives'
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
            title="Voir les archives"
          >
            <Archive className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
            title="Nouvelle discussion"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        <div className="px-3 py-2.5 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une discussion…"
              className="w-full pl-10 pr-9 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                title="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-gray-100 px-3">
          <button
            onClick={() => setActiveTab('discussions')}
            className={`relative flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'discussions'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Discussions
            {totalUnread > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold align-middle">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`relative flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === 'archives'
                ? 'text-emerald-600 border-emerald-500'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Archives
            {archivedConversations.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold align-middle">
                {archivedConversations.length}
              </span>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {filteredList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                {searchQuery ? 'Aucun résultat' : activeTab === 'archives' ? 'Aucune discussion archivée' : 'Aucune discussion'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? 'Essayez un autre terme de recherche.'
                  : activeTab === 'discussions'
                    ? 'Démarrez une nouvelle discussion avec le bouton +'
                    : 'Les discussions archivées apparaîtront ici.'}
              </p>
            </div>
          )}
          {filteredList.map(renderConversationItem)}
        </nav>
      </section>

      <section
        className={`${mobileShowChat ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col bg-[#ECE5DD]`}
      >
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Bienvenue sur ALBA Messages</h2>
            <p className="mt-2 max-w-md text-sm text-gray-500 leading-relaxed">
              Envoyez et recevez des messages avec vos collègues, créez des groupes de travail et
              restez connecté avec toute l’équipe, où que vous soyez.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Vos messages sont stockés en toute sécurité
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Démarrer une discussion
            </button>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-3 md:px-4 py-2.5 bg-[#F0F2F5] border-b border-black/5 shrink-0">
              <button
                onClick={handleBackFromMobile}
                className="md:hidden p-2 -ml-1 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowGroupInfo(true)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg hover:bg-black/5 transition-colors p-1 -m-1"
                title={activeConversation.type === 'group' ? 'Informations du groupe' : 'Profil du contact'}
              >
                <Avatar
                  name={getConversationName(activeConversation)}
                  photo={activeConversation.type === 'private' ? otherContactPhoto(activeConversation) : null}
                  size="sm"
                  online={activeConversation.type === 'private' && isPartnerOnline}
                  isGroup={activeConversation.type === 'group'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-gray-900 truncate">
                      {getConversationName(activeConversation)}
                    </h2>
                    {activeConversation.type === 'group' && (
                      <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    )}
                    {activeConversation.muted && (
                      <BellOff className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] truncate">
                    {partnerIsTyping ? (
                      <span className="text-emerald-600 font-medium">en train d’écrire…</span>
                    ) : activeConversation.type === 'group' ? (
                      <span className="text-gray-500">
                        {activeConversation.participants.length} participants ·{' '}
                        {activeConversation.participants.filter((pid) => onlineUsers.includes(pid)).length} en ligne
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-emerald-600 font-medium">en ligne</span>
                    ) : (
                      <span className="text-gray-500">
                        {otherContact ? formatLastSeen(otherContact.lastSeen) : 'dernière visite indisponible'}
                      </span>
                    )}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-0.5 shrink-0">
                {activeConversation.type === 'private' && (
                  <>
                    <button
                      onClick={() => {
                        if (!activeConversation || !currentUserId) return
                        const otherId = activeConversation.participants.find(p => p !== currentUserId)
                        if (!otherId) return
                        const otherContact = getContactByUserId(otherId)
                        if (!otherContact) return
                        startCall(activeConversation.id, currentUserId, currentUserName, otherId, `${otherContact.firstName} ${otherContact.lastName}`, 'audio')
                      }}
                      className="hidden sm:flex p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                      title="Appel vocal"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (!activeConversation || !currentUserId) return
                        const otherId = activeConversation.participants.find(p => p !== currentUserId)
                        if (!otherId) return
                        const otherContact = getContactByUserId(otherId)
                        if (!otherContact) return
                        startCall(activeConversation.id, currentUserId, currentUserName, otherId, `${otherContact.firstName} ${otherContact.lastName}`, 'video')
                      }}
                      className="hidden sm:flex p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                      title="Appel vidéo"
                    >
                      <Video className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setHeaderMenuOpen((v) => !v)
                  }}
                  className="p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                  title="Options"
                >
                  <Menu className="h-5 w-5 md:hidden" />
                  <MoreVertical className="h-5 w-5 hidden md:block" />
                </button>
              </div>

              {headerMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-3 top-14 z-30 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 overflow-hidden"
                >
                  {activeConversation.type === 'group' && (
                    <button
                      onClick={() => {
                        setShowGroupInfo(true)
                        setHeaderMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Infos du groupe
                    </button>
                  )}
                  <button
                    onClick={() => {
                      pinConversation(activeConversation.id, !activeConversation.pinned)
                      setHeaderMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {activeConversation.pinned ? (
                      <PinOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Pin className="h-4 w-4 text-gray-400" />
                    )}
                    {activeConversation.pinned ? 'Désépingler' : 'Épingler la discussion'}
                  </button>
                  <button
                    onClick={() => {
                      muteConversation(activeConversation.id, !activeConversation.muted)
                      setHeaderMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {activeConversation.muted ? (
                      <Volume2 className="h-4 w-4 text-gray-400" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-gray-400" />
                    )}
                    {activeConversation.muted ? 'Réactiver le son' : 'Couper le son'}
                  </button>
                  <button
                    onClick={() => {
                      archiveConversation(activeConversation.id, !activeConversation.archived)
                      setHeaderMenuOpen(false)
                      if (!activeConversation.archived) {
                        setSelectedConvId(null)
                        setMobileShowChat(false)
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Archive className="h-4 w-4 text-gray-400" />
                    {activeConversation.archived ? 'Désarchiver' : 'Archiver la discussion'}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleDeleteConversation}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer la discussion
                  </button>
                </div>
              )}
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-8 py-4">
              {convMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="bg-[#FFEFCF] text-[#54656F] text-xs rounded-lg px-4 py-3 shadow-sm max-w-xs">
                    Aucun message dans cette discussion.
                    <br />
                    Envoyez le premier message pour commencer !
                  </div>
                </div>
              )}

              <div className="max-w-3xl mx-auto space-y-0.5">
                {convMessages.map((message, index) => {
                  const mine = message.senderId === currentUserId
                  const prev = index > 0 ? convMessages[index - 1] : undefined
                  const sameSenderAsPrev = prev?.senderId === message.senderId
                  const showDaySeparator =
                    !prev || formatDaySeparator(prev.timestamp) !== formatDaySeparator(message.timestamp)

                  if (showDaySeparator) {
                    return (
                      <div key={`day-${message.id}`} className="py-4">
                        <div className="flex justify-center">
                          <span className="bg-white text-gray-500 text-[11px] uppercase tracking-wide rounded-lg px-3 py-1 shadow-sm">
                            {formatDaySeparator(message.timestamp)}
                          </span>
                        </div>
                        <MessageRow
                          message={message}
                          mine={mine}
                          isGroup={activeConversation.type === 'group'}
                          isFirstOfGroup
                          onContextMenu={handleContextMenu}
                          currentUserId={currentUserId}
                          resolveReply={(id) => messagesById.get(id)}
                        />
                      </div>
                    )
                  }

                  return (
                    <MessageRow
                      key={message.id}
                      message={message}
                      mine={mine}
                      isGroup={activeConversation.type === 'group'}
                      isFirstOfGroup={!sameSenderAsPrev}
                      onContextMenu={handleContextMenu}
                      currentUserId={currentUserId}
                      resolveReply={(id) => messagesById.get(id)}
                    />
                  )
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {(replyingTo || editingMsg) && (
              <div className="px-3 md:px-8 pb-1">
                <div className="max-w-3xl mx-auto bg-[#F0F2F5] rounded-t-xl border-l-4 border-emerald-500 px-3 py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                      {editingMsg ? (
                        <>
                          <Edit3 className="h-3.5 w-3.5" />
                          Modification du message
                        </>
                      ) : (
                        <>
                          <Reply className="h-3.5 w-3.5" />
                          Réponse à {replyingTo?.senderName}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {(editingMsg ?? replyingTo)?.content || 'Message supprimé'}
                    </p>
                  </div>
                  <button
                    onClick={() => (editingMsg ? handleCancelEdit() : setReplyingTo(null))}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-black/5 hover:text-gray-600 transition-colors shrink-0"
                    title="Annuler"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <footer className="px-3 md:px-8 pb-3 md:pb-4 pt-1 bg-gradient-to-t from-[#ECE5DD] via-[#ECE5DD] to-transparent shrink-0 relative">
              {showEmojiPicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-16 left-3 md:left-8 z-30 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">
                    Emojis
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAppendEmoji(emoji)
                        }}
                        className="h-8 w-8 rounded-lg text-lg hover:bg-gray-100 transition-colors"
                        title={`Insérer ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filePreview && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  {filePreview.type.startsWith('image') ? (
                    <img src={filePreview.url} alt={filePreview.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Paperclip className="h-6 w-6 text-blue-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{filePreview.name}</p>
                    <p className="text-[10px] text-gray-400">Prêt à envoyer</p>
                  </div>
                  <button onClick={() => setFilePreview(null)} className="p-1 rounded-full hover:bg-gray-200">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}

              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <div className="flex items-center gap-0.5 pb-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEmojiPicker((v) => !v)
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      showEmojiPicker
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-gray-500 hover:bg-black/5'
                    }`}
                    title="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden md:flex p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="hidden md:flex p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                    title="Envoyer une photo"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.capture = 'environment'
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement
                        handleFileSelect({ target } as any, 'image')
                      }
                      input.click()
                    }}
                    className="hidden lg:flex p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
                    title="Prendre une photo"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={editingMsg ? 'Modifier votre message…' : 'Tapez votre message…'}
                  className="flex-1 resize-none rounded-2xl bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-emerald-300 transition"
                  style={{ maxHeight: '120px' }}
                />

                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="h-11 w-11 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  title={editingMsg ? 'Enregistrer les modifications' : 'Envoyer'}
                >
                  {editingMsg ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </footer>
          </>
        )}

        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'file')} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
        <input ref={imageInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} accept="image/*" />
      </section>

      {contextMenu && contextTarget && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 230)
          }}
        >
          <button
            onClick={() => {
              setReplyingTo(contextTarget)
              setContextMenu(null)
              requestAnimationFrame(() => textareaRef.current?.focus())
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Reply className="h-4 w-4 text-gray-400" />
            Répondre
          </button>
          {contextIsMine && !contextTarget.deleted && (
            <button
              onClick={() => {
                handleEdit(contextTarget)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-4 w-4 text-gray-400" />
              Modifier
            </button>
          )}
          {!contextTarget.deleted && (
            <button
              onClick={() => {
                handleCopy(contextTarget)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copiedMsgId === contextTarget.id ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
              {copiedMsgId === contextTarget.id ? 'Copié !' : 'Copier'}
            </button>
          )}
          {contextIsMine && (
            <button
              onClick={() => {
                handleDelete(contextTarget)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          )}
        </div>
      )}

      <NewChatModal
        open={showNewChat}
        contacts={contacts}
        excludeUserId={currentUserId}
        searchContacts={searchContacts}
        onClose={() => setShowNewChat(false)}
        onStartPrivate={handleStartPrivate}
        onOpenCreateGroup={() => {
          setShowNewChat(false)
          setShowCreateGroup(true)
        }}
      />

      <CreateGroupModal
        open={showCreateGroup}
        contacts={contacts}
        creatorId={currentUserId}
        creatorName={currentUserName}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
      />

      <GroupInfoPanel
        open={showGroupInfo && activeConversation?.type === 'group'}
        conversation={activeConversation?.type === 'group' ? activeConversation : null}
        contacts={contacts}
        currentUserId={currentUserId}
        onlineUsers={onlineUsers}
        isAdmin={isGroupAdmin}
        onClose={() => setShowGroupInfo(false)}
        onUpdateGroup={(updates) => {
          if (activeConversation) updateGroup(activeConversation.id, updates)
        }}
        onAddMembers={(userIds) => {
          if (activeConversation) addGroupMembers(activeConversation.id, userIds)
        }}
        onRemoveMember={(userId) => {
          if (activeConversation) removeGroupMember(activeConversation.id, userId)
        }}
        onToggleAdmin={handleToggleGroupAdmin}
        onTogglePin={() => {
          if (activeConversation) pinConversation(activeConversation.id, !activeConversation.pinned)
        }}
        onToggleMute={() => {
          if (activeConversation) muteConversation(activeConversation.id, !activeConversation.muted)
        }}
        onToggleArchive={() => {
          if (!activeConversation) return
          archiveConversation(activeConversation.id, !activeConversation.archived)
          setShowGroupInfo(false)
          setSelectedConvId(null)
          setMobileShowChat(false)
        }}
        onLeave={handleLeaveGroup}
        onStartPrivateWith={handleStartPrivateWithUser}
      />

      {activeCall && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 flex flex-col items-center justify-center text-white">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mx-auto">
              {getInitials(activeCall.callerId === currentUserId ? activeCall.receiverName : activeCall.callerName)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {activeCall.callerId === currentUserId ? activeCall.receiverName : activeCall.callerName}
              </h2>
              <p className="text-emerald-200 text-sm mt-1">
                {activeCall.status === 'ringing' && 'Appel en cours...'}
                {activeCall.status === 'connecting' && 'Connexion...'}
                {activeCall.status === 'active' && 'En ligne'}
              </p>
              {activeCall.status === 'active' && (
                <p className="text-emerald-300 text-xs mt-1">
                  {Math.floor((Date.now() - new Date(activeCall.startedAt).getTime()) / 60000)}:
                  {String(Math.floor(((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000) % 60)).padStart(2, '0')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-8 mt-8">
              {activeCall.status === 'ringing' && activeCall.callerId !== currentUserId && (
                <>
                  <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                    <X className="h-8 w-8" />
                  </button>
                  <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors animate-pulse">
                    {activeCall.type === 'audio' ? <Phone className="h-8 w-8" /> : <Video className="h-8 w-8" />}
                  </button>
                </>
              )}
              {(activeCall.status === 'connecting' || activeCall.status === 'active' || activeCall.callerId === currentUserId) && (
                <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                  <Phone className="h-8 w-8 rotate-[135deg]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MessageRowProps {
  message: Message
  mine: boolean
  isGroup: boolean
  isFirstOfGroup: boolean
  currentUserId: string
  resolveReply: (messageId: string) => Message | undefined
  onContextMenu: (event: React.MouseEvent, message: Message) => void
}

function MessageRow({
  message,
  mine,
  isGroup,
  isFirstOfGroup,
  currentUserId,
  resolveReply,
  onContextMenu
}: MessageRowProps) {
  const repliedMessage = message.replyTo ? resolveReply(message.replyTo) : undefined
  const bubbleRadius = mine
    ? isFirstOfGroup
      ? 'rounded-2xl rounded-br-md'
      : 'rounded-2xl'
    : isFirstOfGroup
      ? 'rounded-2xl rounded-bl-md'
      : 'rounded-2xl'

  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'} ${isFirstOfGroup ? 'mt-2.5' : 'mt-0.5'} px-1 group`}
      onContextMenu={(event) => onContextMenu(event, message)}
    >
      <div
        className={`max-w-[85%] sm:max-w-[70%] px-2.5 py-1.5 shadow-sm ${bubbleRadius} ${
          mine ? 'bg-[#D9FDD3]' : 'bg-white'
        }`}
        title="Clic droit pour les options"
      >
        {mine === false && isGroup && isFirstOfGroup && (
          <p className="text-xs font-semibold text-emerald-700 mb-0.5">
            {message.senderId === currentUserId ? 'Vous' : message.senderName}
          </p>
        )}

        {repliedMessage && !message.deleted && (
          <div className="border-l-4 border-emerald-500 bg-black/5 rounded-md px-2.5 py-1.5 mb-1.5">
            <p className="text-[11px] font-semibold text-emerald-700 truncate">
              {repliedMessage.senderId === currentUserId ? 'Vous' : repliedMessage.senderName}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {repliedMessage.deleted ? 'Message supprimé' : repliedMessage.content}
            </p>
          </div>
        )}

        {message.deleted ? (
          <p className="text-sm italic text-gray-400 pr-14">Message supprimé</p>
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed pr-14">
            {message.content}
            {message.edited && (
              <span className="ml-1.5 text-[10px] text-gray-400 align-baseline">(modifié)</span>
            )}
          </p>
        )}

        {message.type === 'image' && message.content && !message.deleted && (
          <div className="mt-1">
            <div className="w-full max-w-xs rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center text-gray-400 text-xs p-4">
              [Image: {message.content}]
            </div>
          </div>
        )}
        {message.type === 'file' && message.content && !message.deleted && (
          <div className="mt-1 flex items-center gap-2 p-2 bg-black/5 rounded-lg">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="text-xs truncate">{message.content}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-1 -mt-4 pointer-events-none">
          <span className="text-[10px] text-gray-500/90">{formatTime(message.timestamp)}</span>
          {mine && !message.deleted && (
            message.read ? (
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
            ) : (
              <Check className="h-3.5 w-3.5 text-gray-400" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
