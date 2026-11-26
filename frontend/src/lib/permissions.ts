export type Permission =
  | 'dashboard.view'
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'employees.view' | 'employees.create' | 'employees.edit' | 'employees.delete'
  | 'departments.view' | 'departments.manage'
  | 'secretariat.view' | 'secretariat.manage'
  | 'printing.view' | 'printing.manage'
  | 'production.view' | 'production.manage'
  | 'machines.view' | 'machines.manage'
  | 'consumables.view' | 'consumables.manage'
  | 'it.view' | 'it.manage'
  | 'graphics.view' | 'graphics.manage'
  | 'maintenance.view' | 'maintenance.manage'
  | 'training.view' | 'training.manage'
  | 'commercial.view' | 'commercial.manage'
  | 'stock.view' | 'stock.manage'
  | 'purchases.view' | 'purchases.manage'
  | 'finance.view' | 'finance.manage'
  | 'accounting.view' | 'accounting.manage'
  | 'budget.view' | 'budget.manage'
  | 'documents.view' | 'documents.manage'
  | 'agenda.view' | 'agenda.manage'
  | 'reports.view'
  | 'settings.view' | 'settings.manage'
  | 'admin.users' | 'admin.audit' | 'admin.agencies'

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'departments.view', 'departments.manage',
  'secretariat.view', 'secretariat.manage',
  'printing.view', 'printing.manage',
  'production.view', 'production.manage',
  'machines.view', 'machines.manage',
  'consumables.view', 'consumables.manage',
  'it.view', 'it.manage',
  'graphics.view', 'graphics.manage',
  'maintenance.view', 'maintenance.manage',
  'training.view', 'training.manage',
  'commercial.view', 'commercial.manage',
  'stock.view', 'stock.manage',
  'purchases.view', 'purchases.manage',
  'finance.view', 'finance.manage',
  'accounting.view', 'accounting.manage',
  'budget.view', 'budget.manage',
  'documents.view', 'documents.manage',
  'agenda.view', 'agenda.manage',
  'reports.view',
  'settings.view', 'settings.manage',
  'admin.users', 'admin.audit', 'admin.agencies',
]

/* ─────────────────────────────────────────────────────────
   ROLE → PERMISSIONS MAP
   Keys are matched case-insensitively with fallback logic.
   ───────────────────────────────────────────────────────── */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {

  /* ── Administrateurs (toutes permissions) ── */
  'Super Admin': ALL_PERMISSIONS,
  'super admin': ALL_PERMISSIONS,
  'Super Administrateur': ALL_PERMISSIONS,
  'super administrateur': ALL_PERMISSIONS,
  'Administrateur': ALL_PERMISSIONS,
  'administrateur': ALL_PERMISSIONS,
  'admin': ALL_PERMISSIONS,
  'Admin': ALL_PERMISSIONS,
  'Administrator': ALL_PERMISSIONS,
  'administrator': ALL_PERMISSIONS,
  'direction': ALL_PERMISSIONS,
  'Direction': ALL_PERMISSIONS,

  /* ── Comptable ── */
  'Comptable': [
    'finance.view', 'finance.manage',
    'accounting.view', 'accounting.manage',
    'budget.view', 'budget.manage',
    'commercial.view', 'commercial.manage',
    'stock.view',
    'purchases.view', 'purchases.manage',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'comptable': [
    'finance.view', 'finance.manage',
    'accounting.view', 'accounting.manage',
    'budget.view', 'budget.manage',
    'commercial.view', 'commercial.manage',
    'stock.view',
    'purchases.view', 'purchases.manage',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Imprimerie ── */
  'Imprimerie': [
    'printing.view', 'printing.manage',
    'production.view', 'production.manage',
    'machines.view', 'machines.manage',
    'consumables.view', 'consumables.manage',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'imprimerie': [
    'printing.view', 'printing.manage',
    'production.view', 'production.manage',
    'machines.view', 'machines.manage',
    'consumables.view', 'consumables.manage',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'Responsable Imprimerie': [
    'printing.view', 'printing.manage',
    'production.view', 'production.manage',
    'machines.view', 'machines.manage',
    'consumables.view', 'consumables.manage',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Graphiste ── */
  'Graphiste': [
    'graphics.view', 'graphics.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'graphiste': [
    'graphics.view', 'graphics.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'graphisme': [
    'graphics.view', 'graphics.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Secrétaire ── */
  'Secrétaire': [
    'secretariat.view', 'secretariat.manage',
    'documents.view', 'documents.manage',
    'agenda.view', 'agenda.manage',
    'clients.view',
    'dashboard.view',
    'settings.view',
  ],
  'secretaire': [
    'secretariat.view', 'secretariat.manage',
    'documents.view', 'documents.manage',
    'agenda.view', 'agenda.manage',
    'clients.view',
    'dashboard.view',
    'settings.view',
  ],
  'Secrétariat': [
    'secretariat.view', 'secretariat.manage',
    'documents.view', 'documents.manage',
    'agenda.view', 'agenda.manage',
    'clients.view',
    'dashboard.view',
    'settings.view',
  ],
  'secretariat': [
    'secretariat.view', 'secretariat.manage',
    'documents.view', 'documents.manage',
    'agenda.view', 'agenda.manage',
    'clients.view',
    'dashboard.view',
    'settings.view',
  ],

  /* ── Développeur ── */
  'Développeur': [
    'it.view', 'it.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'reports.view',
    'settings.view',
  ],
  'developpeur': [
    'it.view', 'it.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'reports.view',
    'settings.view',
  ],
  'développeur': [
    'it.view', 'it.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'reports.view',
    'settings.view',
  ],
  'Informatique': [
    'it.view', 'it.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'reports.view',
    'settings.view',
  ],
  'informatique': [
    'it.view', 'it.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'reports.view',
    'settings.view',
  ],

  /* ── Formateur ── */
  'Formateur': [
    'training.view', 'training.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'formateur': [
    'training.view', 'training.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'Formation': [
    'training.view', 'training.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'formation': [
    'training.view', 'training.manage',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Technicien ── */
  'Technicien': [
    'maintenance.view', 'maintenance.manage',
    'machines.view',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'technicien': [
    'maintenance.view', 'maintenance.manage',
    'machines.view',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'Maintenance': [
    'maintenance.view', 'maintenance.manage',
    'machines.view',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'maintenance': [
    'maintenance.view', 'maintenance.manage',
    'machines.view',
    'stock.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Caissier ── */
  'Caissier': [
    'finance.view', 'finance.manage',
    'commercial.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'caissier': [
    'finance.view', 'finance.manage',
    'commercial.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── RH ── */
  'RH': [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'departments.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'rh': [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'departments.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'Ressources Humaines': [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'departments.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],
  'ressources humaines': [
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'departments.view',
    'reports.view',
    'dashboard.view',
    'agenda.view',
    'documents.view',
    'settings.view',
  ],

  /* ── Employé générique ── */
  'employe': ['dashboard.view', 'agenda.view', 'documents.view', 'settings.view'],
  'employee': ['dashboard.view', 'agenda.view', 'documents.view', 'settings.view'],
  'utilisateur': ['dashboard.view', 'agenda.view', 'settings.view'],
  'Utilisateur': ['dashboard.view', 'agenda.view', 'settings.view'],
}

/**
 * Resolve permissions for a role name.
 * Priority:
 *  1. Exact match
 *  2. Case-insensitive exact match
 *  3. Partial contains match
 *  4. Fallback: ALL_PERMISSIONS (so an unknown admin-level role still works)
 */
export function getRolePermissions(roleName: string): Permission[] {
  if (!roleName) return ALL_PERMISSIONS

  const key = roleName.trim()

  // 1. exact match
  if (ROLE_PERMISSIONS[key]) return ROLE_PERMISSIONS[key]

  // 2. case-insensitive exact match
  const keyLower = key.toLowerCase()
  const exactCI = Object.keys(ROLE_PERMISSIONS).find(k => k.toLowerCase() === keyLower)
  if (exactCI) return ROLE_PERMISSIONS[exactCI]

  // 3. partial: stored key contains a known role keyword, or vice-versa
  const partial = Object.keys(ROLE_PERMISSIONS).find(
    k => keyLower.includes(k.toLowerCase()) || k.toLowerCase().includes(keyLower)
  )
  if (partial) return ROLE_PERMISSIONS[partial]

  // 4. fallback — unknown role gets full access (avoids blank menu)
  return ALL_PERMISSIONS
}

export function hasPermission(roleName: string, permission: Permission): boolean {
  return getRolePermissions(roleName).includes(permission)
}
