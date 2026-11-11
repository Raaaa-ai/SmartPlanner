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
  TaskPatch
} from '../../../shared/types'

interface WorkspaceValue extends Snapshot {
  createProject: (input: ProjectInput) => Promise<Project | null>
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project | null>
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
  saveReflection: (input: ReflectionInput) => Promise<Reflection | null>
  createNote: (input: NoteInput) => Promise<Note | null>
  updateNote: (id: string, patch: NotePatch) => Promise<Note | null>
  deleteNote: (id: string) => Promise<void>
  updateSettings: (patch: SettingsPatch) => Promise<Settings>
  chooseDataDir: () => Promise<boolean>
  useDefaultDataDir: () => Promise<boolean>
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

  useEffect(() => {
    void window.api.getSnapshot().then(setSnapshot)

    const unsubscribe = window.api.onCapture((item) => {
      setSnapshot((prev) =>
        prev ? { ...prev, captures: [item, ...prev.captures] } : prev
      )
    })
    return unsubscribe
  }, [])

  const accent = snapshot?.settings.accent
  const backgroundBlur = snapshot?.settings.backgroundBlur
  const backgroundOpacity = snapshot?.settings.backgroundOpacity

  useEffect(() => {
    if (accent) document.documentElement.style.setProperty('--accent', accent)
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

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    const settings = await window.api.updateSettings(patch)
    setSnapshot((prev) => (prev ? { ...prev, settings } : prev))
    return settings
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
      deleteProject,
      addProgress,
      deleteProgress,
      createTask,
      updateTask,
      deleteTask,
      createRecordCard,
      updateRecordCard,
      deleteRecordCard,
      saveReflection,
      createNote,
      updateNote,
      deleteNote,
      updateSettings,
      chooseDataDir,
      useDefaultDataDir
    }
  }, [
    snapshot,
    createProject,
    updateProject,
    deleteProject,
    addProgress,
    deleteProgress,
    createTask,
    updateTask,
    deleteTask,
    createRecordCard,
    updateRecordCard,
    deleteRecordCard,
    saveReflection,
    createNote,
    updateNote,
    deleteNote,
    updateSettings,
    chooseDataDir,
    useDefaultDataDir
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
