import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useWorkspace } from '../state/WorkspaceContext'

function formatUpdated(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}

export function NotesView(): React.JSX.Element {
  const { notes, tasks, createNote, updateNote, deleteNote } = useWorkspace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [taskId, setTaskId] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = notes.find((note) => note.id === selectedId) ?? null
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  useEffect(() => {
    const note = notes.find((item) => item.id === selectedId)
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setTaskId(note?.taskId ?? '')
    setStatus('idle')
  }, [selectedId])

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      const latest = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      setSelectedId(latest.id)
    }
  }, [notes, selectedId])

  const filtered = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((note) => {
      if (!search.trim()) return true
      const keyword = search.trim().toLowerCase()
      return (
        note.title.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword)
      )
    })

  function scheduleSave(
    id: string,
    nextTitle: string,
    nextContent: string,
    nextTaskId: string
  ): void {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setStatus('saving')
    saveTimer.current = setTimeout(async () => {
      await updateNote(id, {
        title: nextTitle,
        content: nextContent,
        taskId: nextTaskId || null
      })
      setStatus('saved')
    }, 600)
  }

  function handleTitle(value: string): void {
    setTitle(value)
    if (selected) scheduleSave(selected.id, value, content, taskId)
  }

  function handleContent(value: string): void {
    setContent(value)
    if (selected) scheduleSave(selected.id, title, value, taskId)
  }

  function handleTask(value: string): void {
    setTaskId(value)
    if (selected) scheduleSave(selected.id, title, content, value)
  }

  async function addNote(): Promise<void> {
    const note = await createNote({ title: '无标题', content: '' })
    if (note) {
      setSelectedId(note.id)
      setSearch('')
    }
  }

  async function removeNote(): Promise<void> {
    if (!selected) return
    if (!window.confirm(`确定删除「${selected.title}」吗？`)) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await deleteNote(selected.id)
    const next = notes.find((note) => note.id !== selected.id)
    setSelectedId(next?.id ?? null)
  }

  return (
    <div className="notes-layout">
      <aside className="card panel notes-sidebar">
        <form
          className="notes-search"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索笔记…"
          />
          <button
            type="button"
            className="icon-button add"
            title="新建笔记"
            onClick={() => void addNote()}
          >
            <Icon name="plus" size={16} />
          </button>
        </form>

        <div className="notes-count muted">{filtered.length} 篇笔记</div>

        {filtered.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon">
              <Icon name="note" size={22} />
            </span>
            <div>
              <strong>{notes.length === 0 ? '还没有笔记' : '没有匹配的笔记'}</strong>
              <p>点右上角 + 新建一篇。</p>
            </div>
          </div>
        ) : (
          <ul className="note-list">
            {filtered.map((note) => {
              const task = note.taskId ? taskById.get(note.taskId) : undefined
              return (
                <li key={note.id}>
                  <button
                    className={note.id === selectedId ? 'note-item active' : 'note-item'}
                    onClick={() => setSelectedId(note.id)}
                  >
                    <span className="note-item-title">{note.title}</span>
                    <span className="note-item-preview">
                      {note.content.trim().slice(0, 60) || '空白笔记'}
                    </span>
                    <span className="note-item-meta">
                      {formatUpdated(note.updatedAt)}
                      {task ? ` · ${task.title}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      {selected ? (
        <section className="card panel note-editor">
          <input
            className="note-title-input"
            value={title}
            onChange={(event) => handleTitle(event.target.value)}
            placeholder="笔记标题"
          />

          <div className="note-editor-bar">
            <label className="note-task-select">
              <span>关联待办</span>
              <select
                className="select compact"
                value={taskId}
                onChange={(event) => handleTask(event.target.value)}
              >
                <option value="">不关联</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <span className="save-status">
              {status === 'saving'
                ? '正在保存…'
                : status === 'saved'
                  ? '已自动保存'
                  : '修改后自动保存'}
            </span>
          </div>

          <textarea
            className="note-content-input"
            value={content}
            onChange={(event) => handleContent(event.target.value)}
            placeholder="写点什么… 支持 Markdown 语法"
            spellCheck={false}
          />

          <div className="note-editor-footer">
            <span className="muted">更新于 {formatUpdated(selected.updatedAt)}</span>
            <button
              className="ghost-button danger-text"
              onClick={() => void removeNote()}
            >
              <Icon name="trash" size={14} />
              删除笔记
            </button>
          </div>
        </section>
      ) : (
        <section className="card panel empty-state large notes-empty">
          <span className="empty-icon">
            <Icon name="note" size={24} />
          </span>
          <div>
            <strong>选择或新建一篇笔记</strong>
            <p>笔记可以关联待办，方便把资料和任务放在一起。</p>
          </div>
          <button className="primary-button" onClick={() => void addNote()}>
            <Icon name="plus" size={16} />
            新建笔记
          </button>
        </section>
      )}
    </div>
  )
}
