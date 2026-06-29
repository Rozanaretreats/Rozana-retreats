import type { CleaningChecklist, ChecklistItem, VerificationPhotoRecord } from '../types'

export const MIN_VERIFICATION_PHOTOS = 2

export const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'completedAt'>[] = [
  { id: 'mop-floor', label: 'Mop floor' },
  { id: 'bedsheet', label: 'Set bedsheet' },
  { id: 'blanket', label: 'Fold blanket' },
  { id: 'amenities', label: 'Set amenities (soap, toothbrush, shampoo)' },
  { id: 'bathroom', label: 'Clean bathroom & wipe surfaces' },
  { id: 'trash', label: 'Empty trash & replace liner' },
]

/** Still on the checklist, but never chosen for random verification photos */
export const VERIFICATION_PHOTO_EXCLUDED_ITEM_IDS = new Set(['bathroom'])

export function createDefaultChecklist(): CleaningChecklist {
  return {
    items: DEFAULT_CHECKLIST_ITEMS.map((item) => ({ ...item })),
  }
}

const DEFAULT_ITEM_IDS = new Set(DEFAULT_CHECKLIST_ITEMS.map((item) => item.id))

export function isDefaultChecklistItemId(id: string): boolean {
  return DEFAULT_ITEM_IDS.has(id)
}

export function createCustomChecklistItem(label: string): ChecklistItem {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('Task label is required')
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: trimmed,
  }
}

export function addChecklistItem(checklist: CleaningChecklist, label: string): CleaningChecklist {
  return {
    ...checklist,
    items: [...checklist.items, createCustomChecklistItem(label)],
  }
}

export function removeChecklistItem(checklist: CleaningChecklist, itemId: string): CleaningChecklist {
  if (checklist.items.length <= 1) return checklist
  return {
    ...checklist,
    items: checklist.items.filter((item) => item.id !== itemId),
  }
}

/** Fresh checklist for assignment — no completion timestamps */
export function checklistForAssignment(checklist: CleaningChecklist): CleaningChecklist {
  return {
    items: checklist.items.map(({ id, label }) => ({ id, label })),
  }
}

export function allChecklistItemsComplete(checklist: CleaningChecklist | undefined): boolean {
  if (!checklist?.items.length) return false
  return checklist.items.every((item) => !!item.completedAt)
}

export function completedChecklistCount(checklist: CleaningChecklist | undefined): number {
  return checklist?.items.filter((item) => item.completedAt).length ?? 0
}

export function pickRandomVerificationItems(
  checklist: CleaningChecklist,
  count: number = MIN_VERIFICATION_PHOTOS,
): ChecklistItem[] {
  const completed = checklist.items.filter(
    (item) => item.completedAt && !VERIFICATION_PHOTO_EXCLUDED_ITEM_IDS.has(item.id),
  )
  if (completed.length === 0) {
    throw new Error('No completed checklist items eligible for verification photos')
  }
  const n = Math.min(count, completed.length)
  const pool = [...completed]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, n)
}

/** @deprecated use pickRandomVerificationItems */
export function pickRandomVerificationItem(checklist: CleaningChecklist): ChecklistItem {
  return pickRandomVerificationItems(checklist, 1)[0]!
}

export function displayVerificationPhotos(
  checklist: CleaningChecklist | undefined,
  fallbackAfterUrl?: string,
): VerificationPhotoRecord[] {
  if (checklist?.verificationPhotos?.length) {
    return checklist.verificationPhotos
  }
  if (checklist?.verificationItemLabel && fallbackAfterUrl) {
    return [
      {
        itemId: checklist.verificationItemId ?? 'legacy',
        itemLabel: checklist.verificationItemLabel,
        photoUrl: fallbackAfterUrl,
      },
    ]
  }
  return []
}
export function toggleChecklistItem(
  checklist: CleaningChecklist,
  itemId: string,
  completed: boolean,
): CleaningChecklist {
  const now = new Date().toISOString()
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId
        ? { ...item, completedAt: completed ? now : undefined }
        : item,
    ),
  }
}
