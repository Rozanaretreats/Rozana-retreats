import { MANUAL_PUNCH_DEVICE_ID } from './manualPunch'
import { supabase } from './supabase'
import type {
  AbsenceRecord,
  BiometricPunch,
  CleaningChecklist,
  LeaveRecord,
  LeaveStatus,
  PropertyId,
  RoomStatus,
  RoomTask,
  RoomType,
  ShiftConfig,
  Staff,
} from '../types'

type DbStaff = {
  id: string
  property_id: PropertyId
  name: string
  role: string
  phone: string | null
  active: boolean
}

type DbLeave = {
  id: string
  property_id: PropertyId
  staff_id: string
  from_date: string
  to_date: string
  leave_type: string
  status: LeaveStatus
  requested_by: 'staff' | 'manager'
  staff_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  staff: { name: string } | null
}

type DbPunch = {
  id: string
  property_id: PropertyId
  staff_id: string
  punch_type: 'in' | 'out'
  punch_date: string
  punch_time: string
  device_id: string
  source?: string | null
  match_score?: number | null
  staff?: { name: string } | null
}

export function mapPunchRow(row: DbPunch, staffName?: string): BiometricPunch {
  return {
    id: row.id,
    propertyId: row.property_id,
    staffId: row.staff_id,
    staffName: staffName ?? row.staff?.name ?? 'Unknown',
    type: row.punch_type,
    date: row.punch_date,
    timestamp: row.punch_time,
    deviceId: row.device_id,
    source: row.source ?? undefined,
    matchScore: row.match_score ?? undefined,
  }
}

type DbTask = {
  id: string
  property_id: PropertyId
  room_id: string
  assigned_staff_id: string | null
  status: RoomStatus
  photo_before_url: string | null
  photo_after_url: string | null
  cleaning_started_at: string | null
  cleaning_finished_at: string | null
  cleaning_checklist: CleaningChecklist | null
  room: { number: string; building: string; room_type: RoomType } | null
  staff: { name: string } | null
}

function mapStaff(row: DbStaff): Staff {
  return {
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    role: row.role,
    phone: row.phone ?? undefined,
    status: 'not-in',
  }
}

function mapLeave(row: DbLeave): LeaveRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    staffId: row.staff_id,
    staffName: row.staff?.name ?? 'Unknown',
    fromDate: row.from_date,
    toDate: row.to_date,
    type: row.leave_type,
    status: row.status ?? 'approved',
    requestedBy: row.requested_by ?? 'manager',
    staffNote: row.staff_note ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  }
}

function mapPunch(row: DbPunch): BiometricPunch {
  return mapPunchRow(row)
}

function mapTask(row: DbTask, activeStaffIds?: Set<string>): RoomTask {
  const assignedStaffId = row.assigned_staff_id ?? undefined
  const staffActive =
    !assignedStaffId || !activeStaffIds || activeStaffIds.has(assignedStaffId)

  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id,
    room: row.room?.number ?? '?',
    building: row.room?.building ?? '',
    roomType: row.room?.room_type ?? 'standard',
    assignedStaffId: staffActive ? assignedStaffId : undefined,
    assignedTo: staffActive ? row.staff?.name : undefined,
    status: row.status,
    photoBeforeUrl: row.photo_before_url ?? undefined,
    photoAfterUrl: row.photo_after_url ?? undefined,
    cleaningStartedAt: row.cleaning_started_at ?? undefined,
    cleaningFinishedAt: row.cleaning_finished_at ?? undefined,
    cleaningChecklist: row.cleaning_checklist ?? undefined,
  }
}

type DbProperty = {
  id: PropertyId
  shift_start: string
  shift_end: string
}

type DbAbsence = {
  id: string
  property_id: PropertyId
  staff_id: string
  absence_date: string
  reason: string
  marked_by: string
  staff: { name: string } | null
}

function normalizeTime(t: string): string {
  return t.slice(0, 5)
}

function mapAbsence(row: DbAbsence): AbsenceRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    staffId: row.staff_id,
    staffName: row.staff?.name,
    absenceDate: row.absence_date,
    reason: row.reason,
    markedBy: row.marked_by,
  }
}

export async function fetchOpsData(): Promise<{
  staff: Staff[]
  leaves: LeaveRecord[]
  tasks: RoomTask[]
  punches: BiometricPunch[]
  absences: AbsenceRecord[]
  shifts: Record<PropertyId, ShiftConfig>
} | null> {
  if (!supabase) return null

  const [staffRes, leaveRes, taskRes, punchRes, absenceRes, propRes] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('name'),
    supabase
      .from('leave_records')
      .select('*, staff:staff_id(name)')
      .order('from_date', { ascending: false }),
    supabase
      .from('housekeeping_tasks')
      .select('*, room:room_id(number, building, room_type), staff:assigned_staff_id(name)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('attendance_punches')
      .select('*, staff:staff_id(name)')
      .order('punch_time', { ascending: false }),
    supabase
      .from('attendance_absences')
      .select('*, staff:staff_id(name)')
      .order('created_at', { ascending: false }),
    supabase.from('properties').select('id, shift_start, shift_end'),
  ])

  if (staffRes.error) throw staffRes.error
  if (leaveRes.error) throw leaveRes.error
  if (taskRes.error) throw taskRes.error
  if (punchRes.error) throw punchRes.error
  if (absenceRes.error) {
    console.warn('attendance_absences not available — run migration 002', absenceRes.error.message)
  }
  if (propRes.error) {
    console.warn('property shift columns not available — using defaults', propRes.error.message)
  }

  const shifts: Record<PropertyId, ShiftConfig> = {
    'ooty-skyview': { start: '10:00', end: '17:00' },
    'kannur-beachview': { start: '10:00', end: '17:00' },
  }
  if (!propRes.error) {
    for (const row of (propRes.data ?? []) as DbProperty[]) {
      shifts[row.id] = {
        start: normalizeTime(row.shift_start ?? '10:00'),
        end: normalizeTime(row.shift_end ?? '17:00'),
      }
    }
  }

  return {
    staff: (staffRes.data as DbStaff[]).map(mapStaff),
    leaves: (leaveRes.data as DbLeave[]).map(mapLeave),
    tasks: (() => {
      const activeIds = new Set((staffRes.data as DbStaff[]).map((s) => s.id))
      return (taskRes.data as DbTask[]).map((row) => mapTask(row, activeIds))
    })(),
    punches: (punchRes.data as DbPunch[]).map(mapPunch),
    absences: absenceRes.error ? [] : (absenceRes.data as DbAbsence[]).map(mapAbsence),
    shifts,
  }
}

export async function insertStaff(input: {
  id: string
  propertyId: PropertyId
  name: string
  role: string
  phone?: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('staff').insert({
    id: input.id,
    property_id: input.propertyId,
    name: input.name,
    role: input.role,
    phone: input.phone ?? null,
  })
  if (error) throw error
}

export async function deactivateStaff(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('staff').update({ active: false }).eq('id', id)
  if (error) throw error
}

export async function insertLeave(input: {
  id: string
  propertyId: PropertyId
  staffId: string
  fromDate: string
  toDate: string
  type: string
  status?: LeaveStatus
  requestedBy?: 'staff' | 'manager'
  staffNote?: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('leave_records').insert({
    id: input.id,
    property_id: input.propertyId,
    staff_id: input.staffId,
    from_date: input.fromDate,
    to_date: input.toDate,
    leave_type: input.type,
    status: input.status ?? 'approved',
    requested_by: input.requestedBy ?? 'manager',
    staff_note: input.staffNote ?? null,
  })
  if (error) throw error
}

export async function updateLeaveStatus(input: {
  id: string
  status: LeaveStatus
  reviewedBy: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('leave_records')
    .update({
      status: input.status,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function deleteLeave(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('leave_records').delete().eq('id', id)
  if (error) throw error
}

export async function upsertTask(input: {
  id: string
  propertyId: PropertyId
  roomId: string
  assignedStaffId: string
  status: RoomStatus
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('housekeeping_tasks').upsert(
    {
      id: input.id,
      property_id: input.propertyId,
      room_id: input.roomId,
      assigned_staff_id: input.assignedStaffId,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' },
  )
  if (error) throw error
}

export async function updateTaskStatus(id: string, status: RoomStatus): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function startCleaningWithBeforePhoto(
  id: string,
  photoBeforeUrl: string,
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'cleaning',
      photo_before_url: photoBeforeUrl,
      cleaning_started_at: now,
      cleaning_finished_at: null,
      photo_after_url: null,
      updated_at: now,
    })
    .eq('id', id)
  if (error) throw error
}

export async function startCleaningWithChecklist(
  id: string,
  checklist: CleaningChecklist,
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'cleaning',
      cleaning_checklist: checklist,
      cleaning_started_at: now,
      cleaning_finished_at: null,
      photo_before_url: null,
      photo_after_url: null,
      updated_at: now,
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateCleaningChecklist(
  id: string,
  checklist: CleaningChecklist,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      cleaning_checklist: checklist,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function finishCleaningWithVerification(
  id: string,
  photoAfterUrl: string,
  checklist: CleaningChecklist,
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'done',
      photo_after_url: photoAfterUrl,
      cleaning_checklist: checklist,
      cleaning_finished_at: now,
      updated_at: now,
    })
    .eq('id', id)
  if (error) throw error
}

export async function finishCleaningWithAfterPhoto(
  id: string,
  photoAfterUrl: string,
): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'done',
      photo_after_url: photoAfterUrl,
      cleaning_finished_at: now,
      updated_at: now,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('housekeeping_tasks').delete().eq('id', id)
  if (error) throw error
}

/** Remove room assignments when HK staff is removed — room goes back to Assign tab */
export async function deleteTasksForStaff(staffId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('housekeeping_tasks')
    .delete()
    .eq('assigned_staff_id', staffId)
  if (error) throw error
}

export async function deleteLeaveForStaff(staffId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('leave_records').delete().eq('staff_id', staffId)
  if (error) throw error
}

export async function deleteAbsencesForStaff(staffId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('attendance_absences').delete().eq('staff_id', staffId)
  if (error) throw error
}

/** Clean tasks still pointing at deactivated / missing roster rows */
export async function reconcileOrphanTasks(
  activeStaff: Staff[],
  tasks: RoomTask[],
): Promise<void> {
  if (!supabase) return
  const activeIds = new Set(activeStaff.map((s) => s.id))
  const orphanIds = tasks
    .filter((t) => t.assignedStaffId && !activeIds.has(t.assignedStaffId))
    .map((t) => t.id)
  if (!orphanIds.length) return
  const { error } = await supabase.from('housekeeping_tasks').delete().in('id', orphanIds)
  if (error) throw error
}

export async function reconcileOrphanLeaves(
  activeStaff: Staff[],
  leaves: LeaveRecord[],
): Promise<void> {
  if (!supabase) return
  const activeIds = new Set(activeStaff.map((s) => s.id))
  const orphanIds = leaves.filter((l) => !activeIds.has(l.staffId)).map((l) => l.id)
  if (!orphanIds.length) return
  const { error } = await supabase.from('leave_records').delete().in('id', orphanIds)
  if (error) throw error
}

export async function reconcileOrphanAbsences(
  activeStaff: Staff[],
  absences: AbsenceRecord[],
): Promise<void> {
  if (!supabase) return
  const activeIds = new Set(activeStaff.map((s) => s.id))
  const orphanIds = absences.filter((a) => !activeIds.has(a.staffId)).map((a) => a.id)
  if (!orphanIds.length) return
  const { error } = await supabase.from('attendance_absences').delete().in('id', orphanIds)
  if (error) throw error
}

const TASK_RESET_FIELDS = {
  assigned_staff_id: null,
  status: 'todo' as RoomStatus,
  photo_before_url: null,
  photo_after_url: null,
  cleaning_started_at: null,
  cleaning_finished_at: null,
}

export async function clearTaskAssignment(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      ...TASK_RESET_FIELDS,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function unassignTasksForStaff(staffId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      ...TASK_RESET_FIELDS,
      updated_at: new Date().toISOString(),
    })
    .eq('assigned_staff_id', staffId)
  if (error) throw error
}

export async function markAbsence(input: {
  id: string
  propertyId: PropertyId
  staffId: string
  absenceDate: string
  reason: string
  markedBy: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('attendance_absences').upsert(
    {
      id: input.id,
      property_id: input.propertyId,
      staff_id: input.staffId,
      absence_date: input.absenceDate,
      reason: input.reason,
      marked_by: input.markedBy,
    },
    { onConflict: 'staff_id,absence_date' },
  )
  if (error) throw error
}

export async function removeAbsence(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('attendance_absences').delete().eq('id', id)
  if (error) throw error
}

/** Pre-biometric testing only — device_id must be manual-test */
export async function insertManualPunch(input: {
  id: string
  propertyId: PropertyId
  staffId: string
  type: 'in' | 'out'
  date: string
  time: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('attendance_punches').insert({
    id: input.id,
    property_id: input.propertyId,
    staff_id: input.staffId,
    punch_type: input.type,
    punch_date: input.date,
    punch_time: input.time,
    device_id: MANUAL_PUNCH_DEVICE_ID,
  })
  if (error) throw error
}

export async function deleteManualPunchesForStaffOnDate(
  staffId: string,
  date: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('attendance_punches')
    .delete()
    .eq('staff_id', staffId)
    .eq('punch_date', date)
    .eq('device_id', MANUAL_PUNCH_DEVICE_ID)
  if (error) throw error
}

/** Live kiosk → Ops sync when a new punch is inserted. */
export function subscribeAttendanceInserts(
  onInsert: (row: DbPunch) => void,
): () => void {
  if (!supabase) return () => {}

  const client = supabase
  const channel = client
    .channel('rozana-attendance-punches')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance_punches' },
      (payload) => {
        onInsert(payload.new as DbPunch)
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
