import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'

export interface Contact {
  id: string; userId: string; firstName: string; lastName: string
  email: string; phone: string; department: string; role: string
  photo: string | null; isOnline: boolean; lastSeen: string
}

export interface Message {
  id: string; conversationId: string; senderId: string; senderName: string
  content: string; timestamp: string; read: boolean; edited: boolean
  editedAt?: string; deleted: boolean; deletedAt?: string
  type: 'text' | 'image' | 'file' | 'audio'; replyTo?: string
}

export interface CallLog {
  id: string
  conversationId: string
  callerId: string
  callerName: string
  receiverId: string
  receiverName: string
  type: 'audio' | 'video'
  status: 'outgoing' | 'incoming' | 'missed' | 'accepted' | 'ended'
  duration: number        // seconds
  startedAt: string
  endedAt?: string
}

export interface ActiveCall {
  id: string
  conversationId: string
  callerId: string
  callerName: string
  receiverId: string
  receiverName: string
  type: 'audio' | 'video'
  status: 'ringing' | 'connecting' | 'active' | 'ended'
  startedAt: string
}

export interface SoundSettings {
  messageSound: string
  callRingtone: string
  messageVolume: number
  callVolume: number
  enableMessageSound: boolean
  enableCallSound: boolean
}

export interface Conversation {
  id: string; type: 'private' | 'group'; name: string
  participants: string[]; admins: string[]; createdBy: string
  lastMessage: string; lastMessageTime: string; lastMessageSender: string
  unreadCount: number; archived: boolean; pinned: boolean; muted: boolean
  photo: string | null; description: string
}

export type GroupUpdates = Partial<Pick<Conversation, 'name' | 'description' | 'photo'>>

export type NewContactData = Omit<Contact, 'id' | 'isOnline' | 'lastSeen'> &
  Partial<Pick<Contact, 'isOnline' | 'lastSeen'>>

interface MessagingContextType {
  contacts: Contact[]
  conversations: Conversation[]
  messages: Message[]
  onlineUsers: string[]
  typingUsers: Record<string, string[]>
  addContact: (data: NewContactData) => Contact
  removeContact: (contactId: string) => void
  searchContacts: (query: string) => Contact[]
  getContactByUserId: (userId: string) => Contact | undefined
  createConversation: (participantIds: string[], createdBy?: string) => Conversation
  createGroup: (
    name: string,
    participantIds: string[],
    adminIds?: string[],
    description?: string
  ) => Conversation
  updateGroup: (conversationId: string, updates: GroupUpdates) => void
  addGroupMembers: (conversationId: string, userIds: string[]) => void
  removeGroupMember: (conversationId: string, userId: string) => void
  addGroupAdmin: (conversationId: string, userId: string) => void
  removeGroupAdmin: (conversationId: string, userId: string) => void
  deleteConversation: (conversationId: string) => void
  archiveConversation: (conversationId: string, archived?: boolean) => void
  pinConversation: (conversationId: string, pinned?: boolean) => void
  muteConversation: (conversationId: string, muted?: boolean) => void
  getConversation: (conversationId: string) => Conversation | undefined
  getConversationsForUser: (userId: string) => Conversation[]
  getArchivedConversations: (userId: string) => Conversation[]
  sendMessage: (
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type?: Message['type'],
    replyTo?: string
  ) => Message
  editMessage: (messageId: string, newContent: string) => void
  deleteMessage: (messageId: string) => void
  markAsRead: (conversationId: string) => void
  getMessagesForConversation: (conversationId: string) => Message[]
  setOnlineStatus: (userId: string, online: boolean) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void

  // Calls
  activeCall: ActiveCall | null
  callLogs: CallLog[]
  startCall: (conversationId: string, callerId: string, callerName: string, receiverId: string, receiverName: string, type: 'audio' | 'video') => void
  acceptCall: () => void
  endCall: () => void
  getCallLogsForConversation: (conversationId: string) => CallLog[]

  // Sound settings
  soundSettings: SoundSettings
  updateSoundSettings: (settings: Partial<SoundSettings>) => void
}

const STORAGE_KEY = 'alba-messaging-v2'
const TYPING_TIMEOUT_MS = 4000

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`
}

const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const saveState = <T,>(key: string, value: T): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to persist "${key}":`, error)
  }
}

const AVATAR_GRADIENTS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-indigo-500',
  'from-amber-500 to-orange-500'
]

export const hashColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

export const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
}

const sortConversations = (list: Conversation[]): Conversation[] => {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.lastMessageTime === b.lastMessageTime) return 0
    return a.lastMessageTime > b.lastMessageTime ? -1 : 1
  })
}

const fullName = (c: Pick<Contact, 'firstName' | 'lastName'>): string =>
  `${c.firstName} ${c.lastName}`

const DEFAULT_CONTACTS: Contact[] = [
  {
    id: 'contact-1', userId: '1', firstName: 'Admin', lastName: 'SUPER',
    email: 'admin@albaservicegroup.cd', phone: '+243 990 000 001',
    department: 'Direction', role: 'Super Admin', photo: null,
    isOnline: true, lastSeen: '2026-08-21T09:30:00.000Z'
  },
  {
    id: 'contact-2', userId: '2', firstName: 'Marie', lastName: 'KALALA',
    email: 'marie.kalala@albaservicegroup.cd', phone: '+243 990 000 002',
    department: 'Finance', role: 'Comptable', photo: null,
    isOnline: true, lastSeen: '2026-08-21T09:28:00.000Z'
  },
  {
    id: 'contact-3', userId: '3', firstName: 'Jean', lastName: 'MUTOMBO',
    email: 'jean.mutombo@albaservicegroup.cd', phone: '+243 990 000 003',
    department: 'Imprimerie', role: 'Imprimerie', photo: null,
    isOnline: false, lastSeen: '2026-08-21T08:10:00.000Z'
  },
  {
    id: 'contact-4', userId: '4', firstName: 'Sophie', lastName: 'BAYA',
    email: 'sophie.baya@albaservicegroup.cd', phone: '+243 990 000 004',
    department: 'Graphisme', role: 'Graphiste', photo: null,
    isOnline: false, lastSeen: '2026-08-20T17:45:00.000Z'
  },
  {
    id: 'contact-5', userId: '5', firstName: 'Grâce', lastName: 'MBUYI',
    email: 'grace.mbuyi@albaservicegroup.cd', phone: '+243 990 000 005',
    department: 'Secrétariat', role: 'Secrétaire', photo: null,
    isOnline: true, lastSeen: '2026-08-21T09:25:00.000Z'
  },
  {
    id: 'contact-6', userId: '6', firstName: 'Patrick', lastName: 'LUKUSA',
    email: 'patrick.lukusa@albaservicegroup.cd', phone: '+243 990 000 006',
    department: 'Informatique', role: 'Développeur', photo: null,
    isOnline: true, lastSeen: '2026-08-21T09:29:00.000Z'
  },
  {
    id: 'contact-7', userId: '7', firstName: 'Claire', lastName: 'KASONGO',
    email: 'claire.kasongo@albaservicegroup.cd', phone: '+243 990 000 007',
    department: 'Formation', role: 'Formateur', photo: null,
    isOnline: false, lastSeen: '2026-08-21T07:55:00.000Z'
  },
  {
    id: 'contact-8', userId: '8', firstName: 'David', lastName: 'KALONJI',
    email: 'david.kalonji@albaservicegroup.cd', phone: '+243 990 000 008',
    department: 'Maintenance', role: 'Technicien', photo: null,
    isOnline: false, lastSeen: '2026-08-20T18:20:00.000Z'
  },
  {
    id: 'contact-9', userId: '9', firstName: 'Fatima', lastName: 'KASINDA',
    email: 'fatima.kasinda@albaservicegroup.cd', phone: '+243 990 000 009',
    department: 'Finance', role: 'Caissier', photo: null,
    isOnline: false, lastSeen: '2026-08-21T06:40:00.000Z'
  }
]

const DEFAULT_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-private-1-2',
    type: 'private',
    name: 'Marie KALALA',
    participants: ['1', '2'],
    admins: [],
    createdBy: '1',
    lastMessage: 'Parfait, je vous envoie le récapitulatif par email aussi.',
    lastMessageTime: '2026-08-21T09:15:00.000Z',
    lastMessageSender: '2',
    unreadCount: 2,
    archived: false,
    pinned: false,
    muted: false,
    photo: null,
    description: ''
  },
  {
    id: 'conv-private-1-6',
    type: 'private',
    name: 'Patrick LUKUSA',
    participants: ['1', '6'],
    admins: [],
    createdBy: '1',
    lastMessage: 'Ça marche, je préviens Sophie pour la maquette finale.',
    lastMessageTime: '2026-08-21T08:47:00.000Z',
    lastMessageSender: '1',
    unreadCount: 0,
    archived: false,
    pinned: true,
    muted: false,
    photo: null,
    description: ''
  },
  {
    id: 'conv-private-1-3',
    type: 'private',
    name: 'Jean MUTOMBO',
    participants: ['1', '3'],
    admins: [],
    createdBy: '1',
    lastMessage: '50 dollars pour 500 exemplaires, tout sera prêt demain matin.',
    lastMessageTime: '2026-08-20T16:36:00.000Z',
    lastMessageSender: '3',
    unreadCount: 0,
    archived: false,
    pinned: false,
    muted: false,
    photo: null,
    description: ''
  },
  {
    id: 'conv-group-equipe-alba',
    type: 'group',
    name: 'Équipe ALBA',
    participants: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    admins: ['1'],
    createdBy: '1',
    lastMessage: 'Réunion générale demain à 9h au bureau principal.',
    lastMessageTime: '2026-08-21T09:20:00.000Z',
    lastMessageSender: '1',
    unreadCount: 3,
    archived: false,
    pinned: false,
    muted: false,
    photo: null,
    description: 'Groupe officiel de communication de toute l\'équipe ALBA SERVICE GROUP.'
  }
]

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'msg-seed-001', conversationId: 'conv-private-1-2', senderId: '2',
    senderName: 'Marie KALALA',
    content: 'Bonjour Admin, avez-vous validé les factures de cette semaine ?',
    timestamp: '2026-08-21T09:02:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-002', conversationId: 'conv-private-1-2', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Pas encore Marie, je m\'en occupe ce matin même.',
    timestamp: '2026-08-21T09:05:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-003', conversationId: 'conv-private-1-2', senderId: '2',
    senderName: 'Marie KALALA',
    content: 'Merci ! Il y en a trois en attente au total pour le mois d\'août.',
    timestamp: '2026-08-21T09:12:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-004', conversationId: 'conv-private-1-2', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Très bien, je les valide toutes avant midi.',
    timestamp: '2026-08-21T09:14:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-005', conversationId: 'conv-private-1-2', senderId: '2',
    senderName: 'Marie KALALA',
    content: 'Parfait, je vous envoie le récapitulatif par email aussi.',
    timestamp: '2026-08-21T09:15:00.000Z', read: false, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-006', conversationId: 'conv-private-1-6', senderId: '6',
    senderName: 'Patrick LUKUSA',
    content: 'Bonjour Admin, le nouveau site est presque prêt, il reste juste la page contact.',
    timestamp: '2026-08-21T08:40:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-007', conversationId: 'conv-private-1-6', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Excellente nouvelle ! On peut faire une démo aujourd\'hui ?',
    timestamp: '2026-08-21T08:45:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-008', conversationId: 'conv-private-1-6', senderId: '6',
    senderName: 'Patrick LUKUSA',
    content: 'Oui, à 15h dans la salle de réunion, ça vous va ?',
    timestamp: '2026-08-21T08:46:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-009', conversationId: 'conv-private-1-6', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Ça marche, je préviens Sophie pour la maquette finale.',
    timestamp: '2026-08-21T08:47:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-010', conversationId: 'conv-private-1-3', senderId: '3',
    senderName: 'Jean MUTOMBO',
    content: 'Bonsoir Admin, les cartes de visite sont prêtes pour l\'impression.',
    timestamp: '2026-08-20T16:30:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-011', conversationId: 'conv-private-1-3', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Très bien Jean. Combien pour 500 exemplaires ?',
    timestamp: '2026-08-20T16:35:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-012', conversationId: 'conv-private-1-3', senderId: '3',
    senderName: 'Jean MUTOMBO',
    content: '50 dollars pour 500 exemplaires, tout sera prêt demain matin.',
    timestamp: '2026-08-20T16:36:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-013', conversationId: 'conv-group-equipe-alba', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Bonjour à tous, bienvenue dans le groupe officiel de l\'équipe ALBA !',
    timestamp: '2026-08-21T08:00:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-014', conversationId: 'conv-group-equipe-alba', senderId: '5',
    senderName: 'Grâce MBUYI',
    content: 'Bonjour Admin, bonjour à toute l\'équipe !',
    timestamp: '2026-08-21T08:03:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-015', conversationId: 'conv-group-equipe-alba', senderId: '6',
    senderName: 'Patrick LUKUSA',
    content: 'Présent et opérationnel pour la semaine !',
    timestamp: '2026-08-21T08:04:00.000Z', read: true, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-016', conversationId: 'conv-group-equipe-alba', senderId: '7',
    senderName: 'Claire KASONGO',
    content: 'Bonjour l\'équipe, les inscriptions pour la formation Excel sont maintenant ouvertes.',
    timestamp: '2026-08-21T08:30:00.000Z', read: false, edited: false,
    deleted: false, type: 'text'
  },
  {
    id: 'msg-seed-017', conversationId: 'conv-group-equipe-alba', senderId: '1',
    senderName: 'Admin SUPER',
    content: 'Réunion générale demain à 9h au bureau principal.',
    timestamp: '2026-08-21T09:20:00.000Z', read: false, edited: false,
    deleted: false, type: 'text'
  }
]

interface StoredMessagingData {
  contacts?: Contact[]
  conversations?: Conversation[]
  messages?: Message[]
}

const loadStoredData = (): Required<StoredMessagingData> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        contacts: DEFAULT_CONTACTS,
        conversations: DEFAULT_CONVERSATIONS,
        messages: DEFAULT_MESSAGES
      }
    }
    const parsed = JSON.parse(raw) as StoredMessagingData
    return {
      contacts: Array.isArray(parsed.contacts) && parsed.contacts.length > 0
        ? parsed.contacts
        : DEFAULT_CONTACTS,
      conversations: Array.isArray(parsed.conversations) && parsed.conversations.length > 0
        ? parsed.conversations
        : DEFAULT_CONVERSATIONS,
      messages: Array.isArray(parsed.messages) ? parsed.messages : DEFAULT_MESSAGES
    }
  } catch {
    return {
      contacts: DEFAULT_CONTACTS,
      conversations: DEFAULT_CONVERSATIONS,
      messages: DEFAULT_MESSAGES
    }
  }
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = useRef<Required<StoredMessagingData>>(loadStoredData())

  const [contacts, setContacts] = useState<Contact[]>(initialData.current.contacts)
  const [conversations, setConversations] = useState<Conversation[]>(initialData.current.conversations)
  const [messages, setMessages] = useState<Message[]>(initialData.current.messages)
  const [onlineUsers, setOnlineUsers] = useState<string[]>(() =>
    initialData.current.contacts.filter((c) => c.isOnline).map((c) => c.userId)
  )
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({})

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(() => loadState<ActiveCall | null>('alba-active-call', null))
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => loadState<CallLog[]>('alba-call-logs', []))
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => loadState<SoundSettings>('alba-sound-settings', {
    messageSound: 'default',
    callRingtone: 'default',
    messageVolume: 80,
    callVolume: 100,
    enableMessageSound: true,
    enableCallSound: true,
  }))

  const typingTimestamps = useRef<Record<string, Record<string, number>>>({})

  useEffect(() => {
    try {
      const payload: StoredMessagingData = { contacts, conversations, messages }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('Failed to persist messaging data:', error)
    }
  }, [contacts, conversations, messages])

  useEffect(() => { saveState('alba-active-call', activeCall) }, [activeCall])
  useEffect(() => { saveState('alba-call-logs', callLogs) }, [callLogs])
  useEffect(() => { saveState('alba-sound-settings', soundSettings) }, [soundSettings])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue) as StoredMessagingData
        if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts)
        if (Array.isArray(parsed.conversations)) setConversations(parsed.conversations)
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
      } catch {
        /* ignore malformed payloads */
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    setOnlineUsers(contacts.filter((c) => c.isOnline).map((c) => c.userId))
  }, [contacts])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now()
      let changed = false
      const next: Record<string, string[]> = {}
      Object.entries(typingTimestamps.current).forEach(([convId, users]) => {
        const active = Object.entries(users)
          .filter(([, expiry]) => expiry > now)
          .map(([userId]) => userId)
        if (active.length !== Object.keys(users).length) changed = true
        if (active.length > 0) next[convId] = active.sort()
      })
      typingTimestamps.current = Object.fromEntries(
        Object.entries(typingTimestamps.current)
          .map(([convId, users]) => [
            convId,
            Object.fromEntries(
              Object.entries(users).filter(([, expiry]) => expiry > now)
            )
          ])
          .filter(([, users]) => Object.keys(users as Record<string, number>).length > 0)
      )
      if (changed) setTypingUsers(next)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const addContact = useCallback((data: NewContactData): Contact => {
    const contact: Contact = {
      ...data,
      id: generateId(),
      isOnline: data.isOnline ?? false,
      lastSeen: data.lastSeen ?? new Date().toISOString()
    }
    setContacts((prev) => [...prev, contact])
    if (contact.isOnline) {
      setOnlineUsers((prev) =>
        prev.includes(contact.userId) ? prev : [...prev, contact.userId]
      )
    }
    return contact
  }, [])

  const removeContact = useCallback((contactId: string): void => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId))
  }, [])

  const searchContacts = useCallback(
    (query: string): Contact[] => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return contacts
      return contacts.filter((c) => {
        const haystack = [
          `${c.firstName} ${c.lastName}`,
          c.email,
          c.phone,
          c.department,
          c.role
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalized)
      })
    },
    [contacts]
  )

  const getContactByUserId = useCallback(
    (userId: string): Contact | undefined => {
      return contacts.find((c) => c.userId === userId)
    },
    [contacts]
  )

  const createConversation = useCallback(
    (participantIds: string[], createdBy: string = '1'): Conversation => {
      const uniqueParticipants = Array.from(new Set(participantIds))
      const existing =
        uniqueParticipants.length <= 2
          ? conversations.find(
              (c) =>
                c.type === 'private' &&
                c.participants.length === uniqueParticipants.length &&
                uniqueParticipants.every((p) => c.participants.includes(p))
            )
          : undefined
      if (existing) return existing

      const otherParticipant =
        uniqueParticipants.find((p) => p !== createdBy) ?? uniqueParticipants[0]
      const otherContact = contacts.find((c) => c.userId === otherParticipant)
      const now = new Date().toISOString()

      const conversation: Conversation = {
        id: `conv-${generateId()}`,
        type: 'private',
        name: otherContact ? fullName(otherContact) : `Utilisateur ${otherParticipant}`,
        participants: uniqueParticipants,
        admins: [],
        createdBy,
        lastMessage: '',
        lastMessageTime: now,
        lastMessageSender: '',
        unreadCount: 0,
        archived: false,
        pinned: false,
        muted: false,
        photo: null,
        description: ''
      }
      setConversations((prev) => [conversation, ...prev])
      return conversation
    },
    [conversations, contacts]
  )

  const createGroup = useCallback(
    (
      name: string,
      participantIds: string[],
      adminIds?: string[],
      description: string = ''
    ): Conversation => {
      const uniqueParticipants = Array.from(new Set(participantIds))
      const creator = adminIds?.[0] ?? uniqueParticipants[0] ?? '1'
      const admins = Array.from(new Set(adminIds && adminIds.length > 0 ? adminIds : [creator]))

      const conversation: Conversation = {
        id: `group-${generateId()}`,
        type: 'group',
        name: name.trim() || 'Nouveau groupe',
        participants: uniqueParticipants,
        admins,
        createdBy: creator,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        lastMessageSender: '',
        unreadCount: 0,
        archived: false,
        pinned: false,
        muted: false,
        photo: null,
        description
      }
      setConversations((prev) => [conversation, ...prev])
      return conversation
    },
    []
  )

  const updateGroup = useCallback((conversationId: string, updates: GroupUpdates): void => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, ...updates } : c))
    )
  }, [])

  const addGroupMembers = useCallback((conversationId: string, userIds: string[]): void => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, participants: Array.from(new Set([...c.participants, ...userIds])) }
          : c
      )
    )
  }, [])

  const removeGroupMember = useCallback((conversationId: string, userId: string): void => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              participants: c.participants.filter((p) => p !== userId),
              admins: c.admins.filter((a) => a !== userId)
            }
          : c
      )
    )
  }, [])

  const addGroupAdmin = useCallback((conversationId: string, userId: string): void => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.participants.includes(userId)
          ? { ...c, admins: Array.from(new Set([...c.admins, userId])) }
          : c
      )
    )
  }, [])

  const removeGroupAdmin = useCallback((conversationId: string, userId: string): void => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, admins: c.admins.filter((a) => a !== userId) }
          : c
      )
    )
  }, [])

  const deleteConversation = useCallback((conversationId: string): void => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    setMessages((prev) => prev.filter((m) => m.conversationId !== conversationId))
  }, [])

  const archiveConversation = useCallback(
    (conversationId: string, archived: boolean = true): void => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, archived } : c))
      )
    },
    []
  )

  const pinConversation = useCallback(
    (conversationId: string, pinned: boolean = true): void => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, pinned } : c))
      )
    },
    []
  )

  const muteConversation = useCallback(
    (conversationId: string, muted: boolean = true): void => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, muted } : c))
      )
    },
    []
  )

  const getConversation = useCallback(
    (conversationId: string): Conversation | undefined => {
      return conversations.find((c) => c.id === conversationId)
    },
    [conversations]
  )

  const getConversationsForUser = useCallback(
    (userId: string): Conversation[] => {
      return sortConversations(
        conversations.filter((c) => c.participants.includes(userId) && !c.archived)
      )
    },
    [conversations]
  )

  const getArchivedConversations = useCallback(
    (userId: string): Conversation[] => {
      return sortConversations(
        conversations.filter((c) => c.participants.includes(userId) && c.archived)
      )
    },
    [conversations]
  )

  const sendMessage = useCallback(
    (
      conversationId: string,
      senderId: string,
      senderName: string,
      content: string,
      type: Message['type'] = 'text',
      replyTo?: string
    ): Message => {
      const now = new Date().toISOString()
      const message: Message = {
        id: generateId(),
        conversationId,
        senderId,
        senderName,
        content,
        timestamp: now,
        read: false,
        edited: false,
        deleted: false,
        type,
        replyTo
      }

      setMessages((prev) => [...prev, message])

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c
          const isSelfRead = c.participants.length <= 1
          return {
            ...c,
            lastMessage: content,
            lastMessageTime: now,
            lastMessageSender: senderName,
            unreadCount: isSelfRead ? 0 : c.unreadCount + 1
          }
        })
      )

      typingTimestamps.current[conversationId] =
        typingTimestamps.current[conversationId] ?? {}
      delete typingTimestamps.current[conversationId][senderId]

      return message
    },
    []
  )

  const editMessage = useCallback((messageId: string, newContent: string): void => {
    const now = new Date().toISOString()
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, edited: true, editedAt: now }
          : m
      )
    )
    const target = messages.find((m) => m.id === messageId)
    if (target) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === target.conversationId &&
          c.lastMessageTime === target.timestamp
            ? { ...c, lastMessage: newContent }
            : c
        )
      )
    }
  }, [messages])

  const deleteMessage = useCallback((messageId: string): void => {
    const now = new Date().toISOString()
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: '', deleted: true, deletedAt: now }
          : m
      )
    )
  }, [])

  const markAsRead = useCallback((conversationId: string): void => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    )
    setMessages((prev) =>
      prev.map((m) =>
        m.conversationId === conversationId && !m.read ? { ...m, read: true } : m
      )
    )
  }, [])

  const getMessagesForConversation = useCallback(
    (conversationId: string): Message[] => {
      return messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => (a.timestamp === b.timestamp ? 0 : a.timestamp < b.timestamp ? -1 : 1))
    },
    [messages]
  )

  const setOnlineStatus = useCallback((userId: string, online: boolean): void => {
    const now = new Date().toISOString()
    setContacts((prev) =>
      prev.map((c) =>
        c.userId === userId ? { ...c, isOnline: online, lastSeen: now } : c
      )
    )
    setOnlineUsers((prev) => {
      if (online) {
        return prev.includes(userId) ? prev : [...prev, userId]
      }
      return prev.filter((id) => id !== userId)
    })
  }, [])

  const setTyping = useCallback(
    (conversationId: string, userId: string, isTyping: boolean): void => {
      const convMap =
        typingTimestamps.current[conversationId] ??
        (typingTimestamps.current[conversationId] = {})

      if (isTyping) {
        convMap[userId] = Date.now() + TYPING_TIMEOUT_MS
      } else {
        delete convMap[userId]
      }

      setTypingUsers(() => {
        const next: Record<string, string[]> = {}
        const now = Date.now()
        Object.entries(typingTimestamps.current).forEach(([convId, users]) => {
          const active = Object.entries(users)
            .filter(([, expiry]) => expiry > now)
            .map(([uid]) => uid)
          if (active.length > 0) next[convId] = active.sort()
        })
        return next
      })
    },
    []
  )

  const startCall = useCallback((conversationId: string, callerId: string, callerName: string, receiverId: string, receiverName: string, type: 'audio' | 'video') => {
    const call: ActiveCall = {
      id: generateId(),
      conversationId,
      callerId,
      callerName,
      receiverId,
      receiverName,
      type,
      status: 'ringing',
      startedAt: new Date().toISOString(),
    }
    setActiveCall(call)
    // Auto-accept after 2 seconds (simulating the other person answering)
    setTimeout(() => {
      setActiveCall(prev => prev?.id === call.id ? { ...prev, status: 'connecting' } : prev)
      setTimeout(() => {
        setActiveCall(prev => prev?.id === call.id ? { ...prev, status: 'active' } : prev)
      }, 1500)
    }, 2000)
  }, [])

  const acceptCall = useCallback(() => {
    setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : null)
    setTimeout(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'active' } : null)
    }, 1500)
  }, [])

  const endCall = useCallback(() => {
    setActiveCall(prev => {
      if (!prev) return null
      const log: CallLog = {
        id: generateId(),
        conversationId: prev.conversationId,
        callerId: prev.callerId,
        callerName: prev.callerName,
        receiverId: prev.receiverId,
        receiverName: prev.receiverName,
        type: prev.type,
        status: prev.status === 'ringing' ? 'missed' : 'ended',
        duration: Math.floor((Date.now() - new Date(prev.startedAt).getTime()) / 1000),
        startedAt: prev.startedAt,
        endedAt: new Date().toISOString(),
      }
      setCallLogs(prevLogs => [log, ...prevLogs])
      return null
    })
  }, [])

  const getCallLogsForConversation = useCallback((conversationId: string): CallLog[] => {
    return callLogs.filter(cl => cl.conversationId === conversationId)
  }, [callLogs])

  const updateSoundSettings = useCallback((settings: Partial<SoundSettings>) => {
    setSoundSettings(prev => ({ ...prev, ...settings }))
  }, [])

  const value = useMemo<MessagingContextType>(
    () => ({
      contacts,
      conversations,
      messages,
      onlineUsers,
      typingUsers,
      addContact,
      removeContact,
      searchContacts,
      getContactByUserId,
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
      getConversation,
      getConversationsForUser,
      getArchivedConversations,
      sendMessage,
      editMessage,
      deleteMessage,
      markAsRead,
      getMessagesForConversation,
      setOnlineStatus,
      setTyping,
      activeCall,
      callLogs,
      startCall,
      acceptCall,
      endCall,
      getCallLogsForConversation,
      soundSettings,
      updateSoundSettings
    }),
    [
      contacts,
      conversations,
      messages,
      onlineUsers,
      typingUsers,
      addContact,
      removeContact,
      searchContacts,
      getContactByUserId,
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
      getConversation,
      getConversationsForUser,
      getArchivedConversations,
      sendMessage,
      editMessage,
      deleteMessage,
      markAsRead,
      getMessagesForConversation,
      setOnlineStatus,
      setTyping,
      activeCall,
      callLogs,
      startCall,
      acceptCall,
      endCall,
      getCallLogsForConversation,
      soundSettings,
      updateSoundSettings
    ]
  )

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}
