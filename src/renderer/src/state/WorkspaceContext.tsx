import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type {
  Anniversary,
  AnniversaryInput,
  AnniversaryPatch,
  Checkin,
  CheckinInput,
  CheckinPatch,
  CheckinRecord,
  CleanupKind,
  Course,
  CourseInput,
  CoursePatch,
  CoursePlan,
  CoursePlanInput,
  CoursePlanPatch,
  CreditCategory,
  CreditCategoryInput,
  Note,
  NoteInput,
  NotePatch,
  Project,
  ProjectInput,
  ProgressEntry,
  ProgressInput,
  RecordCard,
  RecordCardInput,
  RecordCardPatch,
  Reflection,
  ReflectionInput,
  Settings,
  SettingsPatch,
  Snapshot,
  Task,
  TaskInput,
  TaskPatch,
  UpdateStatus
} from '../../../shared/types'
import { applyAccent } from '../lib/theme'

function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort(
    (a, b) =>
      a.weekday - b.weekday ||
      a.startTime.localeCompare(b.startTime) ||
      a.createdAt - b.createdAt
  )
}

function sortCoursePlans(plans: CoursePlan[]): CoursePlan[] {
  return [...plans].sort((a, b) => b.createdAt - a.createdAt)
}

function sortCheckins(checkins: Checkin[]): Checkin[] {
  return [...checkins].sort((a, b) => a.createdAt - b.createdAt)
}

interface WorkspaceValue extends Snapshot {
  createProject: (input: ProjectInput) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project | null>
  reorderProjects: (ids: string[]) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addProgress: (input: ProgressInput) => Promise<ProgressEntry | null>
  deleteProgress: (id: string) => Promise<void>
  createTask: (input: TaskInput) => Promise<Task | null>
  updateTask: (id: string, patch: Partial<TaskPatch>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<void>
  createRecordCard: (input: RecordCardInput) => Promise<RecordCard | null>
  updateRecordCard: (
    id: string,
    patch: RecordCardPatch
  ) => Promise<RecordCard | null>
  deleteRecordCard: (id: string) => Promise<void>
  createAnniversary: (input: AnniversaryInput) => Promise<Anniversary | null>
  updateAnniversary: (
    id: string,
    patch: AnniversaryPatch
  ) => Promise<Anniversary | null>
  deleteAnniversary: (id: string) => Promise<void>
  saveReflection: (input: ReflectionInput) => Promise<Reflection | null>
  createNote: (input: NoteInput) => Promise<Note | null>
  updateNote: (id: string, patch: NotePatch) => Promise<Note | null>
  deleteNote: (id: string) => Promise<void>
  deleteCapture: (id: string) => Promise<void>
  createCourse: (input: CourseInput) => Promise<Course | null>
  updateCourse: (id: string, patch: CoursePatch) => Promise<Course | null>
  deleteCourse: (id: string) => Promise<void>
  createCoursePlan: (input: CoursePlanInput) => Promise<CoursePlan | null>
  updateCoursePlan: (
    id: string,
    patch: CoursePlanPatch
  ) => Promise<CoursePlan | null>
  deleteCoursePlan: (id: string) => Promise<void>
  promoteCoursePlan: (
    id: string
  ) => Promise<{ course: Course; plan: CoursePlan } | null>
  createCheckin: (input: CheckinInput) => Promise<Checkin | null>
  updateCheckin: (id: string, patch: CheckinPatch) => Promise<Checkin | null>
  deleteCheckin: (id: string) => Promise<void>
  toggleCheckin: (
    checkinId: string,
    date: string
  ) => Promise<{ checked: boolean; record: CheckinRecord | null } | null>
  createCreditCategory: (
    input: CreditCategoryInput
  ) => Promise<CreditCategory | null>
  updateCreditCategory: (
    id: string,
    patch: Partial<CreditCategoryInput>
  ) => Promise<CreditCategory | null>
  deleteCreditCategory: (id: string) => Promise<void>
  cleanupData: (kind: CleanupKind) => Promise<number>
  updateSettings: (patch: SettingsPatch) => Promise<Settings>
  chooseDataDir: () => Promise<boolean>
  useDefaultDataDir: () => Promise<boolean>
  updateStatus: UpdateStatus
  checkForUpdates: () => Promise<UpdateStatus>
  installUpdate: () => void
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    void window.api.getSnapshot().then(setSnapshot)

    const unsubscribe = window.api.onCapture((item) => {
      setSnapshot((prev) =>
        prev ? { ...prev, captures: [item, ...prev.captures] } : prev
      )
    })
    const unsubscribeUpdate = window.api.onUpdateStatus(setUpdateStatus)
    const unsubscribeData = window.api.onDataChanged(() => {
      void window.api.getSnapshot().then(setSnapshot)
    })
    return () => {
      unsubscribe()
      unsubscribeUpdate()
      unsubscribeData()
    }
  }, [])

  const accent = snapshot?.settings.accent
  const backgroundBlur = snapshot?.settings.backgroundBlur
  const backgroundOpacity = snapshot?.settings.backgroundOpacity

  useEffect(() => {
    if (accent) applyAccent(accent)
  }, [accent])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.blur = backgroundBlur ? 'on' : 'off'
    root.style.setProperty(
      '--app-bg-alpha',
      String(backgroundBlur ? (backgroundOpacity ?? 80) / 100 : 1)
    )
  }, [backgroundBlur, backgroundOpacity])

  const createProject = useCallback(async (input: ProjectInput) => {
    const project = await window.api.createProject(input)
    if (project) {
      setSnapshot((prev) =>
        prev ? { ...prev, projects: [project, ...prev.projects] } : prev
      )
    }
    return project
  }, [])

  const updateProject = useCallback(
    async (id: string, patch: Partial<ProjectInput>) => {
      const project = await window.api.updateProject(id, patch)
      if (project) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                projects: prev.projects.map((item) =>
                  item.id === project.id ? project : item
                )
              }
            : prev
        )
      }
      return project
    },
    []
  )

  const reorderProjects = useCallback(async (ids: string[]) => {
    await window.api.reorderProjects(ids)
    setSnapshot((prev) => {
      if (!prev) return prev
      const order = new Map(ids.map((id, index) => [id, index]))
      const projects = [...prev.projects]
        .map((project) => ({
          ...project,
          sortOrder: order.get(project.id) ?? project.sortOrder
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
      return { ...prev, projects }
    })
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    await window.api.deleteProject(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            projects: prev.projects.filter((project) => project.id !== id),
            progress: prev.progress.filter((entry) => entry.projectId !== id),
            tasks: prev.tasks.map((task) =>
              task.projectId === id ? { ...task, projectId: null } : task
            )
          }
        : prev
    )
  }, [])

  const addProgress = useCallback(async (input: ProgressInput) => {
    const entry = await window.api.addProgress(input)
    if (entry) {
      setSnapshot((prev) =>
        prev ? { ...prev, progress: [...prev.progress, entry] } : prev
      )
    }
    return entry
  }, [])

  const deleteProgress = useCallback(async (id: string) => {
    await window.api.deleteProgress(id)
    setSnapshot((prev) =>
      prev
        ? { ...prev, progress: prev.progress.filter((entry) => entry.id !== id) }
        : prev
    )
  }, [])

  const createTask = useCallback(async (input: TaskInput) => {
    const task = await window.api.createTask(input)
    if (task) {
      setSnapshot((prev) =>
        prev ? { ...prev, tasks: [task, ...prev.tasks] } : prev
      )
    }
    return task
  }, [])

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskPatch>) => {
      const task = await window.api.updateTask(id, patch)
      if (task) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((item) => (item.id === task.id ? task : item))
              }
            : prev
        )
      }
      return task
    },
    []
  )

  const deleteTask = useCallback(async (id: string) => {
    await window.api.deleteTask(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.filter((task) => task.id !== id),
            notes: prev.notes.map((note) =>
              note.taskId === id ? { ...note, taskId: null } : note
            )
          }
        : prev
    )
  }, [])

  const createRecordCard = useCallback(async (input: RecordCardInput) => {
    const card = await window.api.createRecordCard(input)
    if (card) {
      setSnapshot((prev) =>
        prev ? { ...prev, recordCards: [card, ...prev.recordCards] } : prev
      )
    }
    return card
  }, [])

  const updateRecordCard = useCallback(
    async (id: string, patch: RecordCardPatch) => {
      const card = await window.api.updateRecordCard(id, patch)
      if (card) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                recordCards: prev.recordCards.map((item) =>
                  item.id === card.id ? card : item
                )
              }
            : prev
        )
      }
      return card
    },
    []
  )

  const deleteRecordCard = useCallback(async (id: string) => {
    await window.api.deleteRecordCard(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            recordCards: prev.recordCards.filter((card) => card.id !== id)
          }
        : prev
    )
  }, [])

  const createAnniversary = useCallback(async (input: AnniversaryInput) => {
    const anniversary = await window.api.createAnniversary(input)
    if (anniversary) {
      setSnapshot((prev) =>
        prev
          ? { ...prev, anniversaries: [anniversary, ...prev.anniversaries] }
          : prev
      )
    }
    return anniversary
  }, [])

  const updateAnniversary = useCallback(
    async (id: string, patch: AnniversaryPatch) => {
      const anniversary = await window.api.updateAnniversary(id, patch)
      if (anniversary) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                anniversaries: prev.anniversaries.map((item) =>
                  item.id === anniversary.id ? anniversary : item
                )
              }
            : prev
        )
      }
      return anniversary
    },
    []
  )

  const deleteAnniversary = useCallback(async (id: string) => {
    await window.api.deleteAnniversary(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            anniversaries: prev.anniversaries.filter((item) => item.id !== id)
          }
        : prev
    )
  }, [])

  const saveReflection = useCallback(async (input: ReflectionInput) => {
    const reflection = await window.api.saveReflection(input)
    setSnapshot((prev) => {
      if (!prev) return prev
      const others = prev.reflections.filter((item) => item.date !== input.date)
      return {
        ...prev,
        reflections: reflection ? [...others, reflection] : others
      }
    })
    return reflection
  }, [])

  const createNote = useCallback(async (input: NoteInput) => {
    const note = await window.api.createNote(input)
    if (note) {
      setSnapshot((prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : prev
      )
    }
    return note
  }, [])

  const updateNote = useCallback(async (id: string, patch: NotePatch) => {
    const note = await window.api.updateNote(id, patch)
    if (note) {
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              notes: prev.notes.map((item) => (item.id === note.id ? note : item))
            }
          : prev
      )
    }
    return note
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    await window.api.deleteNote(id)
    setSnapshot((prev) =>
      prev ? { ...prev, notes: prev.notes.filter((note) => note.id !== id) } : prev
    )
  }, [])

  const deleteCapture = useCallback(async (id: string) => {
    await window.api.deleteCapture(id)
    setSnapshot((prev) =>
      prev
        ? { ...prev, captures: prev.captures.filter((item) => item.id !== id) }
        : prev
    )
  }, [])

  const createCourse = useCallback(async (input: CourseInput) => {
    const course = await window.api.createCourse(input)
    if (course) {
      setSnapshot((prev) =>
        prev ? { ...prev, courses: sortCourses([...prev.courses, course]) } : prev
      )
    }
    return course
  }, [])

  const updateCourse = useCallback(async (id: string, patch: CoursePatch) => {
    const course = await window.api.updateCourse(id, patch)
    if (course) {
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              courses: sortCourses(
                prev.courses.map((item) => (item.id === course.id ? course : item))
              )
            }
          : prev
      )
    }
    return course
  }, [])

  const deleteCourse = useCallback(async (id: string) => {
    await window.api.deleteCourse(id)
    setSnapshot((prev) =>
      prev
        ? { ...prev, courses: prev.courses.filter((item) => item.id !== id) }
        : prev
    )
  }, [])

  const createCoursePlan = useCallback(async (input: CoursePlanInput) => {
    const plan = await window.api.createCoursePlan(input)
    if (plan) {
      setSnapshot((prev) =>
        prev
          ? { ...prev, coursePlans: sortCoursePlans([plan, ...prev.coursePlans]) }
          : prev
      )
    }
    return plan
  }, [])

  const updateCoursePlan = useCallback(
    async (id: string, patch: CoursePlanPatch) => {
      const plan = await window.api.updateCoursePlan(id, patch)
      if (plan) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                coursePlans: sortCoursePlans(
                  prev.coursePlans.map((item) =>
                    item.id === plan.id ? plan : item
                  )
                )
              }
            : prev
        )
      }
      return plan
    },
    []
  )

  const deleteCoursePlan = useCallback(async (id: string) => {
    await window.api.deleteCoursePlan(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            coursePlans: prev.coursePlans.filter((item) => item.id !== id)
          }
        : prev
    )
  }, [])

  const promoteCoursePlan = useCallback(async (id: string) => {
    const result = await window.api.promoteCoursePlan(id)
    if (result) {
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              courses: sortCourses([
                ...prev.courses.filter(
                  (item) => item.id !== result.course.id
                ),
                result.course
              ]),
              coursePlans: sortCoursePlans(
                prev.coursePlans.map((item) =>
                  item.id === result.plan.id ? result.plan : item
                )
              )
            }
          : prev
      )
    }
    return result
  }, [])

  const createCheckin = useCallback(async (input: CheckinInput) => {
    const checkin = await window.api.createCheckin(input)
    if (checkin) {
      setSnapshot((prev) =>
        prev
          ? { ...prev, checkins: sortCheckins([...prev.checkins, checkin]) }
          : prev
      )
    }
    return checkin
  }, [])

  const updateCheckin = useCallback(async (id: string, patch: CheckinPatch) => {
    const checkin = await window.api.updateCheckin(id, patch)
    if (checkin) {
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              checkins: sortCheckins(
                prev.checkins.map((item) =>
                  item.id === checkin.id ? checkin : item
                )
              )
            }
          : prev
      )
    }
    return checkin
  }, [])

  const deleteCheckin = useCallback(async (id: string) => {
    await window.api.deleteCheckin(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            checkins: prev.checkins.filter((item) => item.id !== id),
            checkinRecords: prev.checkinRecords.filter(
              (record) => record.checkinId !== id
            )
          }
        : prev
    )
  }, [])

  const toggleCheckin = useCallback(async (checkinId: string, date: string) => {
    const result = await window.api.toggleCheckin(checkinId, date)
    if (result) {
      setSnapshot((prev) => {
        if (!prev) return prev
        const records = result.record
          ? [
              ...prev.checkinRecords.filter(
                (record) =>
                  !(
                    record.checkinId === checkinId &&
                    record.date === result.record!.date
                  )
              ),
              result.record
            ]
          : prev.checkinRecords.filter(
              (record) =>
                !(record.checkinId === checkinId && record.date === date)
            )
        return { ...prev, checkinRecords: records }
      })
    }
    return result
  }, [])

  const createCreditCategory = useCallback(
    async (input: CreditCategoryInput) => {
      const category = await window.api.createCreditCategory(input)
      if (category) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                creditCategories: [...prev.creditCategories, category]
              }
            : prev
        )
      }
      return category
    },
    []
  )

  const updateCreditCategory = useCallback(
    async (id: string, patch: Partial<CreditCategoryInput>) => {
      const category = await window.api.updateCreditCategory(id, patch)
      if (category) {
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                creditCategories: prev.creditCategories.map((item) =>
                  item.id === category.id ? category : item
                )
              }
            : prev
        )
      }
      return category
    },
    []
  )

  const deleteCreditCategory = useCallback(async (id: string) => {
    await window.api.deleteCreditCategory(id)
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            creditCategories: prev.creditCategories.filter(
              (item) => item.id !== id
            ),
            coursePlans: prev.coursePlans.map((plan) =>
              plan.categoryId === id ? { ...plan, categoryId: null } : plan
            )
          }
        : prev
    )
  }, [])

  const cleanupData = useCallback(async (kind: CleanupKind) => {
    const result = await window.api.cleanupData(kind)
    setSnapshot(result.snapshot)
    return result.removed
  }, [])

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    const settings = await window.api.updateSettings(patch)
    setSnapshot((prev) => (prev ? { ...prev, settings } : prev))
    return settings
  }, [])

  const checkForUpdates = useCallback(async () => {
    const next = await window.api.checkForUpdates()
    setUpdateStatus(next)
    return next
  }, [])

  const installUpdate = useCallback(() => {
    window.api.installUpdate()
  }, [])

  const chooseDataDir = useCallback(async () => {
    const next = await window.api.chooseDataDir()
    if (next) setSnapshot(next)
    return next !== null
  }, [])

  const useDefaultDataDir = useCallback(async () => {
    const next = await window.api.useDefaultDataDir()
    if (next) setSnapshot(next)
    return next !== null
  }, [])

  const value = useMemo<WorkspaceValue | null>(() => {
    if (!snapshot) return null
    return {
      ...snapshot,
      createProject,
      updateProject,
      reorderProjects,
      deleteProject,
      addProgress,
      deleteProgress,
      createTask,
      updateTask,
      deleteTask,
      createRecordCard,
      updateRecordCard,
      deleteRecordCard,
      createAnniversary,
      updateAnniversary,
      deleteAnniversary,
      saveReflection,
      createNote,
      updateNote,
      deleteNote,
      deleteCapture,
      createCourse,
      updateCourse,
      deleteCourse,
      createCoursePlan,
      updateCoursePlan,
      deleteCoursePlan,
      promoteCoursePlan,
      createCheckin,
      updateCheckin,
      deleteCheckin,
      toggleCheckin,
      createCreditCategory,
      updateCreditCategory,
      deleteCreditCategory,
      cleanupData,
      updateSettings,
      chooseDataDir,
      useDefaultDataDir,
      updateStatus,
      checkForUpdates,
      installUpdate
    }
  }, [
    snapshot,
    createProject,
    updateProject,
    reorderProjects,
    deleteProject,
    addProgress,
    deleteProgress,
    createTask,
    updateTask,
    deleteTask,
    createRecordCard,
    updateRecordCard,
    deleteRecordCard,
    createAnniversary,
    updateAnniversary,
    deleteAnniversary,
    saveReflection,
    createNote,
    updateNote,
    deleteNote,
    deleteCapture,
    createCourse,
    updateCourse,
    deleteCourse,
    createCoursePlan,
    updateCoursePlan,
    deleteCoursePlan,
    promoteCoursePlan,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    toggleCheckin,
    createCreditCategory,
    updateCreditCategory,
    deleteCreditCategory,
    cleanupData,
    updateSettings,
    chooseDataDir,
    useDefaultDataDir,
    updateStatus,
    checkForUpdates,
    installUpdate
  ])

  if (!value) {
    return (
      <div className="loading-screen">
        <span className="spinner" />
        <span>正在载入工作台…</span>
      </div>
    )
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace 必须在 WorkspaceProvider 内使用')
  return context
}
