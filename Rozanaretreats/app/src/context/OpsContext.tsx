import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AbsenceRecord,
  BiometricPunch,
  CleaningChecklist,
  LeaveRecord,
  PropertyId,
  Room,
  RoomStatus,
  RoomTask,
  ShiftConfig,
  Staff,
} from '../types'
import { withDerivedStatus } from '../lib/staffStatus'
import { defaultShifts } from '../lib/shift'
import { todayIso } from '../lib/dates'
import { MANUAL_PUNCH_DEVICE_ID, nowPunchTime, allowManualPunches } from '../lib/manualPunch'
import { uploadHkPhoto } from '../lib/hkPhotos'
import * as api from '../lib/opsApi'
import { createDefaultChecklist } from '../lib/cleaningChecklist'
import {
  deleteStaffLogin,
  fetchStaffLoginMeta,
  insertStaffLogin,
  isStaffLoginEmailTaken,
  resetStaffLoginPassword,
} from '../lib/staffAuth'

type NewStaffInput = {
  propertyId: PropertyId
  name: string
  role: string
  phone?: string
  loginEmail: string
  loginPassword: string
}

type NewLeaveInput = {
  staffId: string
  fromDate: string
  toDate: string
  type: string
}

type RequestLeaveInput = {
  staffId: string
  fromDate: string
  toDate: string
  type: string
  staffNote?: string
}

const LEGACY_KEYS = ['rozana_staff', 'rozana_leaves', 'rozana_tasks'] as const

function clearLegacyLocalCache() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

interface OpsContextValue {
  staff: Staff[]
  leaves: LeaveRecord[]
  tasks: RoomTask[]
  punches: BiometricPunch[]
  absences: AbsenceRecord[]
  shifts: Record<PropertyId, ShiftConfig>
  staffLoginEmails: Record<string, string>
  loading: boolean
  dataSource: 'supabase' | 'local'

  addStaff: (input: NewStaffInput) => Promise<Staff>
  removeStaff: (id: string) => Promise<void>
  resetStaffPassword: (staffId: string, newPassword: string) => Promise<void>

  addLeave: (input: NewLeaveInput) => Promise<LeaveRecord | null>
  requestLeave: (input: RequestLeaveInput) => Promise<LeaveRecord | null>
  approveLeave: (id: string, reviewedBy: string) => Promise<void>
  rejectLeave: (id: string, reviewedBy: string) => Promise<void>
  removeLeave: (id: string) => Promise<void>

  markAbsence: (staffId: string, reason: string, markedBy: string) => Promise<void>
  clearAbsence: (staffId: string) => Promise<void>

  /** Pre-biometric testing — only when VITE_ALLOW_MANUAL_PUNCHES=true */
  recordManualPunch: (staffId: string, type: 'in' | 'out') => Promise<void>
  clearManualPunchesForStaff: (staffId: string) => Promise<void>

  assignRoom: (room: Room, staffId: string) => Promise<RoomTask>
  startCleaningWithChecklist: (taskId: string) => Promise<void>
  updateCleaningChecklist: (taskId: string, checklist: CleaningChecklist) => Promise<void>
  finishCleaningWithVerification: (
    taskId: string,
    photos: { itemId: string; itemLabel: string; file: File }[],
    checklist: CleaningChecklist,
  ) => Promise<void>
  unassignTask: (taskId: string) => Promise<void>

  getStaffById: (id: string) => Staff | undefined
}

const OpsContext = createContext<OpsContextValue | null>(null)

export function OpsProvider({ children }: { children: ReactNode }) {
  const [staffBase, setStaffBase] = useState<Staff[]>([])
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [tasks, setTasks] = useState<RoomTask[]>([])
  const [punches, setPunches] = useState<BiometricPunch[]>([])
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [shifts, setShifts] = useState<Record<PropertyId, ShiftConfig>>(defaultShifts)
  const [staffLoginEmails, setStaffLoginEmails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local')

  const loadFromLocal = useCallback(() => {
    clearLegacyLocalCache()
    setStaffBase([])
    setLeaves([])
    setTasks([])
    setPunches([])
    setAbsences([])
    setShifts(defaultShifts)
    setStaffLoginEmails({})
    setDataSource('local')
    void fetchStaffLoginMeta().then((logins) =>
      setStaffLoginEmails(Object.fromEntries(logins.map((l) => [l.staffId, l.email]))),
    )
  }, [])

  const reload = useCallback(async () => {
    try {
      const data = await api.fetchOpsData()
      if (!data) {
        loadFromLocal()
        return
      }

      const activeIds = new Set(data.staff.map((s) => s.id))

      try {
        await api.reconcileOrphanTasks(data.staff, data.tasks)
        await api.reconcileOrphanLeaves(data.staff, data.leaves)
        await api.reconcileOrphanAbsences(data.staff, data.absences)
      } catch (err) {
        console.warn('Orphan data cleanup failed', err)
      }

      setStaffBase(data.staff)
      setLeaves(data.leaves.filter((l) => activeIds.has(l.staffId)))
      setTasks(
        data.tasks.filter((t) => !t.assignedStaffId || activeIds.has(t.assignedStaffId)),
      )
      setPunches(data.punches)
      setAbsences(data.absences.filter((a) => activeIds.has(a.staffId)))
      setShifts(data.shifts)
      setDataSource('supabase')

      const logins = await fetchStaffLoginMeta()
      setStaffLoginEmails(Object.fromEntries(logins.map((l) => [l.staffId, l.email])))
    } catch (err) {
      console.error('Supabase load failed, using local fallback', err)
      loadFromLocal()
    }
  }, [loadFromLocal])

  useEffect(() => {
    clearLegacyLocalCache()
    reload().finally(() => setLoading(false))
  }, [reload])

  const staffBaseRef = useRef(staffBase)
  staffBaseRef.current = staffBase

  /** Live sync: kiosk punches appear in Ops without refresh. */
  useEffect(() => {
    if (dataSource !== 'supabase') return

    return api.subscribeAttendanceInserts((row) => {
      setPunches((prev) => {
        if (prev.some((p) => p.id === row.id)) return prev
        const staffName = staffBaseRef.current.find((s) => s.id === row.staff_id)?.name
        return [api.mapPunchRow(row, staffName), ...prev]
      })
    })
  }, [dataSource])

  const staff = useMemo(
    () => withDerivedStatus(staffBase, leaves, punches, absences, shifts),
    [staffBase, leaves, punches, absences, shifts],
  )

  const persistStaffLocal = (next: Staff[]) => setStaffBase(next)
  const persistLeavesLocal = (next: LeaveRecord[]) => setLeaves(next)
  const persistTasksLocal = (next: RoomTask[]) => setTasks(next)
  const persistAbsencesLocal = (next: AbsenceRecord[]) => setAbsences(next)
  const persistPunchesLocal = (next: BiometricPunch[]) => setPunches(next)

  const getStaffById = (id: string) => staff.find((s) => s.id === id)

  const addStaff = async (input: NewStaffInput): Promise<Staff> => {
    const loginEmail = input.loginEmail.trim().toLowerCase()
    if (!loginEmail || !input.loginPassword.trim()) {
      throw new Error('App login email and password are required for HK staff.')
    }
    if (await isStaffLoginEmailTaken(loginEmail)) {
      throw new Error('That email is already used for another login.')
    }

    const entry: Staff = {
      id: `staff-${Date.now()}`,
      propertyId: input.propertyId,
      name: input.name.trim(),
      role: input.role,
      phone: input.phone,
      status: 'not-in',
    }

    if (dataSource === 'supabase') {
      await api.insertStaff({
        id: entry.id,
        propertyId: entry.propertyId,
        name: entry.name,
        role: entry.role,
        phone: entry.phone,
      })
      await insertStaffLogin({
        staffId: entry.id,
        email: loginEmail,
        password: input.loginPassword,
        name: entry.name,
        propertyId: entry.propertyId,
      })
      await reload()
      return entry
    }

    persistStaffLocal([...staffBase, entry])
    await insertStaffLogin({
      staffId: entry.id,
      email: loginEmail,
      password: input.loginPassword,
      name: entry.name,
      propertyId: entry.propertyId,
    })
    setStaffLoginEmails((prev) => ({ ...prev, [entry.id]: loginEmail }))
    return entry
  }

  const removeStaff = async (id: string) => {
    if (dataSource === 'supabase') {
      await api.deleteTasksForStaff(id)
      await api.deleteLeaveForStaff(id)
      await api.deleteAbsencesForStaff(id)
      await deleteStaffLogin(id)
      await api.deactivateStaff(id)
      await reload()
      return
    }

    persistStaffLocal(staffBase.filter((s) => s.id !== id))
    persistTasksLocal(tasks.filter((t) => t.assignedStaffId !== id))
    persistLeavesLocal(leaves.filter((l) => l.staffId !== id))
    persistAbsencesLocal(absences.filter((a) => a.staffId !== id))
    await deleteStaffLogin(id)
    setStaffLoginEmails((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const resetStaffPassword = async (staffId: string, newPassword: string) => {
    const email = staffLoginEmails[staffId]
    if (!email) {
      throw new Error('This staff member has no app login email.')
    }
    await resetStaffLoginPassword(staffId, email, newPassword)
  }

  const addLeave = async (input: NewLeaveInput): Promise<LeaveRecord | null> => {
    const member = staffBase.find((s) => s.id === input.staffId)
    if (!member) return null

    const entry: LeaveRecord = {
      id: `leave-${Date.now()}`,
      propertyId: member.propertyId,
      staffId: member.id,
      staffName: member.name,
      fromDate: input.fromDate,
      toDate: input.toDate,
      type: input.type,
      status: 'approved',
      requestedBy: 'manager',
    }

    if (dataSource === 'supabase') {
      await api.insertLeave({
        id: entry.id,
        propertyId: entry.propertyId,
        staffId: entry.staffId,
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        type: entry.type,
        status: 'approved',
        requestedBy: 'manager',
      })
      await reload()
      return entry
    }

    persistLeavesLocal([entry, ...leaves])
    return entry
  }

  const requestLeave = async (input: RequestLeaveInput): Promise<LeaveRecord | null> => {
    const member = staffBase.find((s) => s.id === input.staffId)
    if (!member) return null

    const hasPending = leaves.some((l) => l.staffId === input.staffId && l.status === 'pending')
    if (hasPending) {
      throw new Error('You already have a leave request waiting for approval.')
    }

    const entry: LeaveRecord = {
      id: `leave-req-${Date.now()}`,
      propertyId: member.propertyId,
      staffId: member.id,
      staffName: member.name,
      fromDate: input.fromDate,
      toDate: input.toDate,
      type: input.type,
      status: 'pending',
      requestedBy: 'staff',
      staffNote: input.staffNote?.trim() || undefined,
    }

    if (dataSource === 'supabase') {
      await api.insertLeave({
        id: entry.id,
        propertyId: entry.propertyId,
        staffId: entry.staffId,
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        type: entry.type,
        status: 'pending',
        requestedBy: 'staff',
        staffNote: entry.staffNote,
      })
      await reload()
      return entry
    }

    persistLeavesLocal([entry, ...leaves])
    return entry
  }

  const approveLeave = async (id: string, reviewedBy: string) => {
    if (dataSource === 'supabase') {
      await api.updateLeaveStatus({ id, status: 'approved', reviewedBy })
      await reload()
      return
    }
    const now = new Date().toISOString()
    persistLeavesLocal(
      leaves.map((l) =>
        l.id === id ? { ...l, status: 'approved' as const, reviewedBy, reviewedAt: now } : l,
      ),
    )
  }

  const rejectLeave = async (id: string, reviewedBy: string) => {
    if (dataSource === 'supabase') {
      await api.updateLeaveStatus({ id, status: 'rejected', reviewedBy })
      await reload()
      return
    }
    const now = new Date().toISOString()
    persistLeavesLocal(
      leaves.map((l) =>
        l.id === id ? { ...l, status: 'rejected' as const, reviewedBy, reviewedAt: now } : l,
      ),
    )
  }

  const removeLeave = async (id: string) => {
    if (dataSource === 'supabase') {
      await api.deleteLeave(id)
      await reload()
      return
    }
    persistLeavesLocal(leaves.filter((l) => l.id !== id))
  }

  const markAbsence = async (staffId: string, reason: string, markedBy: string) => {
    const member = staffBase.find((s) => s.id === staffId)
    if (!member || !reason.trim()) return

    const today = new Date().toISOString().slice(0, 10)
    const entry: AbsenceRecord = {
      id: `abs-${staffId}-${Date.now()}`,
      propertyId: member.propertyId,
      staffId: member.id,
      staffName: member.name,
      absenceDate: today,
      reason: reason.trim(),
      markedBy,
    }

    if (dataSource === 'supabase') {
      await api.markAbsence({
        id: entry.id,
        propertyId: entry.propertyId,
        staffId: entry.staffId,
        absenceDate: entry.absenceDate,
        reason: entry.reason,
        markedBy: entry.markedBy,
      })
      await reload()
      return
    }

    persistAbsencesLocal([
      ...absences.filter((a) => !(a.staffId === staffId && a.absenceDate === today)),
      entry,
    ])
  }

  const clearAbsence = async (staffId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const existing = absences.find((a) => a.staffId === staffId && a.absenceDate === today)
    if (!existing) return

    if (dataSource === 'supabase') {
      await api.removeAbsence(existing.id)
      await reload()
      return
    }
    persistAbsencesLocal(absences.filter((a) => a.id !== existing.id))
  }

  const recordManualPunch = async (staffId: string, type: 'in' | 'out') => {
    if (!allowManualPunches()) return

    const member = staffBase.find((s) => s.id === staffId)
    if (!member) return

    const day = todayIso()
    const time = nowPunchTime()
    const entry: BiometricPunch = {
      id: `punch-manual-${staffId}-${Date.now()}`,
      propertyId: member.propertyId,
      staffId: member.id,
      staffName: member.name,
      type,
      date: day,
      timestamp: time,
      deviceId: MANUAL_PUNCH_DEVICE_ID,
    }

    if (type === 'in') {
      const todayAbsence = absences.find((a) => a.staffId === staffId && a.absenceDate === day)
      if (todayAbsence) {
        if (dataSource === 'supabase') {
          await api.removeAbsence(todayAbsence.id)
        } else {
          persistAbsencesLocal(absences.filter((a) => a.id !== todayAbsence.id))
        }
      }
    }

    if (dataSource === 'supabase') {
      await api.insertManualPunch({
        id: entry.id,
        propertyId: entry.propertyId,
        staffId: entry.staffId,
        type: entry.type,
        date: entry.date,
        time: entry.timestamp,
      })
      await reload()
      return
    }

    persistPunchesLocal([entry, ...punches])
  }

  const clearManualPunchesForStaff = async (staffId: string) => {
    if (!allowManualPunches()) return
    const day = todayIso()

    if (dataSource === 'supabase') {
      await api.deleteManualPunchesForStaffOnDate(staffId, day)
      await reload()
      return
    }

    persistPunchesLocal(
      punches.filter(
        (p) =>
          !(
            p.staffId === staffId &&
            p.date === day &&
            p.deviceId === MANUAL_PUNCH_DEVICE_ID
          ),
      ),
    )
  }

  const assignRoom = async (room: Room, staffId: string): Promise<RoomTask> => {
    const member = staffBase.find((s) => s.id === staffId)
    const existing = tasks.find((t) => t.roomId === room.id)

    const task: RoomTask = {
      id: existing?.id ?? `task-${room.id}-${Date.now()}`,
      propertyId: room.propertyId,
      roomId: room.id,
      room: room.number,
      building: room.building,
      roomType: room.type,
      assignedStaffId: staffId,
      assignedTo: member?.name,
      status: existing?.status === 'done' ? 'todo' : (existing?.status ?? 'todo'),
    }

    if (dataSource === 'supabase') {
      await api.upsertTask({
        id: task.id,
        propertyId: task.propertyId,
        roomId: task.roomId,
        assignedStaffId: staffId,
        status: task.status,
      })
      await reload()
      return task
    }

    const without = tasks.filter((t) => t.roomId !== room.id)
    persistTasksLocal([task, ...without])
    return task
  }

  const startCleaningWithChecklist = async (taskId: string) => {
    const checklist = createDefaultChecklist()
    const now = new Date().toISOString()

    if (dataSource === 'supabase') {
      await api.startCleaningWithChecklist(taskId, checklist)
      await reload()
      return
    }

    persistTasksLocal(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'cleaning' as RoomStatus,
              cleaningChecklist: checklist,
              cleaningStartedAt: now,
              photoBeforeUrl: undefined,
              photoAfterUrl: undefined,
              cleaningFinishedAt: undefined,
            }
          : t,
      ),
    )
  }

  const updateCleaningChecklist = async (taskId: string, checklist: CleaningChecklist) => {
    if (dataSource === 'supabase') {
      await api.updateCleaningChecklist(taskId, checklist)
      await reload()
      return
    }

    persistTasksLocal(
      tasks.map((t) => (t.id === taskId ? { ...t, cleaningChecklist: checklist } : t)),
    )
  }

  const finishCleaningWithVerification = async (
    taskId: string,
    photos: { itemId: string; itemLabel: string; file: File }[],
    checklist: CleaningChecklist,
  ) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || photos.length === 0) return

    const verificationPhotos = await Promise.all(
      photos.map(async (photo) => ({
        itemId: photo.itemId,
        itemLabel: photo.itemLabel,
        photoUrl: await uploadHkPhoto(
          photo.file,
          task.propertyId,
          task.roomId,
          `verify-${photo.itemId}`,
        ),
      })),
    )

    const finalChecklist: CleaningChecklist = {
      ...checklist,
      verificationPhotos,
      verificationItemId: verificationPhotos[0]?.itemId,
      verificationItemLabel: verificationPhotos[0]?.itemLabel,
    }
    const photoAfterUrl = verificationPhotos[0]?.photoUrl
    const now = new Date().toISOString()

    if (dataSource === 'supabase') {
      await api.finishCleaningWithVerification(taskId, photoAfterUrl!, finalChecklist)
      await reload()
      return
    }

    persistTasksLocal(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'done' as RoomStatus,
              photoAfterUrl,
              cleaningChecklist: finalChecklist,
              cleaningFinishedAt: now,
            }
          : t,
      ),
    )
  }

  const unassignTask = async (taskId: string) => {
    if (dataSource === 'supabase') {
      await api.clearTaskAssignment(taskId)
      await reload()
      return
    }
    persistTasksLocal(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assignedStaffId: undefined,
              assignedTo: undefined,
              status: 'todo' as RoomStatus,
              photoBeforeUrl: undefined,
              photoAfterUrl: undefined,
              cleaningStartedAt: undefined,
              cleaningFinishedAt: undefined,
              cleaningChecklist: undefined,
            }
          : t,
      ),
    )
  }

  return (
    <OpsContext.Provider
      value={{
        staff,
        leaves,
        tasks,
        punches,
        absences,
        shifts,
        staffLoginEmails,
        loading,
        dataSource,
        addStaff,
        removeStaff,
        resetStaffPassword,
        addLeave,
        requestLeave,
        approveLeave,
        rejectLeave,
        removeLeave,
        markAbsence,
        clearAbsence,
        recordManualPunch,
        clearManualPunchesForStaff,
        assignRoom,
        startCleaningWithChecklist,
        updateCleaningChecklist,
        finishCleaningWithVerification,
        unassignTask,
        getStaffById,
      }}
    >
      {children}
    </OpsContext.Provider>
  )
}

export function useOps() {
  const ctx = useContext(OpsContext)
  if (!ctx) throw new Error('useOps must be used within OpsProvider')
  return ctx
}

export function useOpsOptional() {
  return useContext(OpsContext)
}
