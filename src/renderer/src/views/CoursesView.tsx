import { useEffect, useMemo, useState } from 'react'
import type {
  Course,
  CourseInput,
  CoursePlan,
  CoursePlanInput,
  CoursePlanStatus,
  CourseSemester,
  CourseSlot,
  CreditCategory,
  CreditCategoryInput,
  Weekday
} from '../../../shared/types'
import { Icon } from '../components/Icon'
import { COLOR_PALETTE } from '../lib/colors'
import { useWorkspace } from '../state/WorkspaceContext'

const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: '周一', short: '一' },
  { value: 2, label: '周二', short: '二' },
  { value: 3, label: '周三', short: '三' },
  { value: 4, label: '周四', short: '四' },
  { value: 5, label: '周五', short: '五' },
  { value: 6, label: '周六', short: '六' },
  { value: 7, label: '周日', short: '日' }
]

const COURSE_COLORS = COLOR_PALETTE

const PLAN_STATUS_LABEL: Record<CoursePlanStatus, string> = {
  considering: '考虑中',
  selected: '已选',
  dropped: '已放弃'
}

const SEMESTER_LABEL: Record<CourseSemester, string> = {
  fall: '秋季学期',
  spring: '春季学期'
}

const SEMESTER_HINT: Record<CourseSemester, string> = {
  fall: '9 月 - 次年 1 月',
  spring: '2 月 - 7 月'
}

const MINUTE_HEIGHT = 1.1
const EMPTY_GAP_HEIGHT = 10
const MIN_COURSE_SLOT_HEIGHT = 36

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return (hour || 0) * 60 + (minute || 0)
}

function minuteLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
    minute % 60
  ).padStart(2, '0')}`
}

function addMinutes(time: string, minutes: number): string {
  return minuteLabel(Math.min(24 * 60 - 1, toMinutes(time) + minutes))
}

function weekdayNumber(): Weekday {
  const day = new Date().getDay()
  return (day === 0 ? 7 : day) as Weekday
}

function currentSemester(): CourseSemester {
  const month = new Date().getMonth()
  return month >= 7 || month === 0 ? 'fall' : 'spring'
}

function weekdayLabel(day: Weekday): string {
  return WEEKDAYS.find((item) => item.value === day)?.label ?? `周${day}`
}

function durationText(start: string, end: string): string {
  const minutes = Math.max(0, toMinutes(end) - toMinutes(start))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${hours}小时${rest}分`
  if (hours) return `${hours}小时`
  return `${rest}分钟`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function slotKey(slot: CourseSlot, index: number): string {
  return `${slot.weekday}-${slot.startTime}-${slot.endTime}-${index}`
}

interface GridCell {
  boundaries: number[]
  slotStarts: number[]
  slotHeights: number[]
  bodyHeight: number
  timeLabels: { minute: number; top: number }[]
  minuteToTop: Map<number, number>
}

function buildGrid(slots: CourseSlot[]): GridCell {
  if (slots.length === 0) {
    return {
      boundaries: [],
      slotStarts: [],
      slotHeights: [],
      bodyHeight: 0,
      timeLabels: [],
      minuteToTop: new Map()
    }
  }

  const starts = slots.map((slot) => toMinutes(slot.startTime))
  const ends = slots.map((slot) => toMinutes(slot.endTime))
  const min = Math.floor(Math.min(...starts) / 60) * 60
  const max = Math.ceil(Math.max(...ends) / 60) * 60

  const boundarySet = new Set<number>([min, max])
  for (const slot of slots) {
    boundarySet.add(toMinutes(slot.startTime))
    boundarySet.add(toMinutes(slot.endTime))
  }

  const boundaries = [...boundarySet].sort((a, b) => a - b)
  const slotHeights: number[] = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]
    const end = boundaries[index + 1]
    const hasCourse = slots.some((slot) => {
      const slotStart = toMinutes(slot.startTime)
      const slotEnd = toMinutes(slot.endTime)
      return slotStart < end && slotEnd > start
    })
    slotHeights.push(
      hasCourse
        ? Math.max(MIN_COURSE_SLOT_HEIGHT, (end - start) * MINUTE_HEIGHT)
        : EMPTY_GAP_HEIGHT
    )
  }

  const slotStarts: number[] = []
  let total = 0
  for (const height of slotHeights) {
    slotStarts.push(total)
    total += height
  }
  slotStarts.push(total)

  const timeLabels: { minute: number; top: number }[] = []
  let lastTop = -Infinity
  boundaries.forEach((minute, index) => {
    if (index === boundaries.length - 1) return
    const top = slotStarts[index]
    if (
      slotHeights[index] > EMPTY_GAP_HEIGHT &&
      (timeLabels.length === 0 || top - lastTop >= 18)
    ) {
      timeLabels.push({ minute, top })
      lastTop = top
    }
  })
  if (timeLabels.length === 0 || total - lastTop >= 18) {
    timeLabels.push({
      minute: boundaries[boundaries.length - 1],
      top: total
    })
  }

  const minuteToTop = new Map<number, number>()
  boundaries.forEach((minute, index) => {
    minuteToTop.set(minute, slotStarts[index])
  })

  return {
    boundaries,
    slotStarts,
    slotHeights,
    bodyHeight: total,
    timeLabels,
    minuteToTop
  }
}

function conflictSlotKeys(
  entries: { key: string; slot: CourseSlot }[]
): Set<string> {
  const ids = new Set<string>()
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i]
      const b = entries[j]
      if (
        a.slot.weekday === b.slot.weekday &&
        toMinutes(a.slot.startTime) < toMinutes(b.slot.endTime) &&
        toMinutes(a.slot.endTime) > toMinutes(b.slot.startTime)
      ) {
        ids.add(a.key)
        ids.add(b.key)
      }
    }
  }
  return ids
}

function nextCourse(
  courses: Course[]
): { course: Course; slot: CourseSlot; day: Weekday } | null {
  const today = weekdayNumber()
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const entries = courses.flatMap((course) =>
    course.slots.map((slot) => ({ course, slot }))
  )

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (((today - 1 + offset) % 7) + 1) as Weekday
    const candidates = entries
      .filter(
        (entry) =>
          entry.slot.weekday === day &&
          (offset > 0 || toMinutes(entry.slot.endTime) > nowMinutes)
      )
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))
    if (candidates[0]) return { ...candidates[0], day }
  }
  return null
}

function CreditRow({
  category,
  onUpdate,
  onDelete
}: {
  category: CreditCategory
  onUpdate: (
    id: string,
    patch: Partial<CreditCategoryInput>
  ) => Promise<CreditCategory | null>
  onDelete: (id: string) => Promise<void>
}): React.JSX.Element {
  const [name, setName] = useState(category.name)
  const [earned, setEarned] = useState(String(category.earned))
  const [required, setRequired] = useState(String(category.required))
  const [planned, setPlanned] = useState(String(category.planned))
  const [note, setNote] = useState(category.note)

  useEffect(() => {
    setName(category.name)
    setEarned(String(category.earned))
    setRequired(String(category.required))
    setPlanned(String(category.planned))
    setNote(category.note)
  }, [category.id, category.updatedAt])

  function save(): void {
    void onUpdate(category.id, {
      name: name.trim() || category.name,
      earned: Number(earned) || 0,
      required: Number(required) || 0,
      planned: Number(planned) || 0,
      note
    })
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') {
      ;(event.currentTarget as HTMLElement).blur()
    }
  }

  return (
    <tr>
      <td>
        <input
          className="credit-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td>
        <input
          className="credit-input credit-number"
          type="number"
          step="0.5"
          min={0}
          value={earned}
          onChange={(event) => setEarned(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td>
        <input
          className="credit-input credit-number"
          type="number"
          step="0.5"
          min={0}
          value={required}
          onChange={(event) => setRequired(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td>
        <input
          className="credit-input credit-number"
          type="number"
          step="0.5"
          min={0}
          value={planned}
          onChange={(event) => setPlanned(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
        />
      </td>
      <td>
        <input
          className="credit-input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          placeholder="备注"
        />
      </td>
      <td>
        <button
          type="button"
          className="icon-button tiny"
          title="删除类别"
          onClick={() => {
            if (window.confirm(`确定删除「${category.name}」吗？`)) {
              void onDelete(category.id)
            }
          }}
        >
          <Icon name="trash" size={13} />
        </button>
      </td>
    </tr>
  )
}

export function CourseEditorModal({
  mode,
  course,
  plan,
  defaultWeekday,
  defaultSemester,
  onClose
}: {
  mode: 'course' | 'plan'
  course?: Course
  plan?: CoursePlan
  defaultWeekday?: Weekday
  defaultSemester?: CourseSemester
  onClose: () => void
}): React.JSX.Element {
  const {
    createCourse,
    updateCourse,
    deleteCourse,
    createCoursePlan,
    updateCoursePlan,
    deleteCoursePlan,
    promoteCoursePlan,
    creditCategories
  } = useWorkspace()
  const source = course ?? plan
  const initialSlots =
    source?.slots && source.slots.length > 0
      ? source.slots
      : [
          {
            weekday: source?.weekday ?? defaultWeekday ?? 1,
            startTime: source?.startTime ?? '08:00',
            endTime: source?.endTime ?? '09:30'
          }
        ]

  const [name, setName] = useState(source?.name ?? '')
  const [teacher, setTeacher] = useState(source?.teacher ?? '')
  const [location, setLocation] = useState(source?.location ?? '')
  const [slots, setSlots] = useState<CourseSlot[]>(initialSlots)
  const [weeks, setWeeks] = useState(source?.weeks ?? '1-16周')
  const [color, setColor] = useState(source?.color ?? COURSE_COLORS[0])
  const [note, setNote] = useState(source?.note ?? '')
  const [semester, setSemester] = useState<CourseSemester>(
    plan?.semester ?? defaultSemester ?? currentSemester()
  )
  const [status, setStatus] = useState<CoursePlanStatus>(
    plan?.status ?? 'considering'
  )
  const [credits, setCredits] = useState(String(plan?.credits ?? 0))
  const [categoryId, setCategoryId] = useState(plan?.categoryId ?? '')
  const [saving, setSaving] = useState(false)

  const invalidSlots =
    slots.length === 0 ||
    slots.some(
      (slot) =>
        !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime
    )

  function updateSlot(index: number, patch: Partial<CourseSlot>): void {
    setSlots((prev) =>
      prev.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    )
  }

  function addSlot(): void {
    const last = slots[slots.length - 1]
    const start = last ? last.endTime : '08:00'
    setSlots((prev) => [
      ...prev,
      {
        weekday: last?.weekday ?? defaultWeekday ?? weekdayNumber(),
        startTime: start,
        endTime: addMinutes(start, 90)
      }
    ])
  }

  function removeSlot(index: number): void {
    setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index))
  }

  async function handleDelete(): Promise<void> {
    if (!course) return
    if (!window.confirm(`确定删除课程「${course.name}」吗？`)) return
    await deleteCourse(course.id)
    onClose()
  }

  async function handlePromote(): Promise<void> {
    if (!plan) return
    await promoteCoursePlan(plan.id)
    onClose()
  }

  async function handleDeletePlan(): Promise<void> {
    if (!plan) return
    if (!window.confirm(`确定删除选课计划「${plan.name}」吗？`)) return
    await deleteCoursePlan(plan.id)
    onClose()
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || invalidSlots || saving) return

    setSaving(true)
    const input: CourseInput = {
      name: name.trim(),
      teacher,
      location,
      slots,
      weeks,
      color,
      note
    }

    if (mode === 'course') {
      if (course) await updateCourse(course.id, input)
      else await createCourse(input)
    } else {
      const planInput: CoursePlanInput = {
        ...input,
        semester,
        status,
        credits: Number(credits) || 0,
        categoryId: categoryId || null
      }
      if (plan) await updateCoursePlan(plan.id, planInput)
      else await createCoursePlan(planInput)
    }

    setSaving(false)
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form className="modal course-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'course'
              ? course
                ? '编辑课程'
                : '添加课程'
              : plan
                ? '编辑选课计划'
                : '添加选课计划'}
          </h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="course-name">课程名称</label>
            <input
              id="course-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：高等数学"
              autoFocus
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="course-teacher">教师</label>
              <input
                id="course-teacher"
                className="input"
                value={teacher}
                onChange={(event) => setTeacher(event.target.value)}
                placeholder="可选"
              />
            </div>
            <div className="field">
              <label htmlFor="course-location">地点</label>
              <input
                id="course-location"
                className="input"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="例如：教学楼 A301"
              />
            </div>
          </div>

          <div className="field">
            <label>上课时间（可添加多个不连续时间段）</label>
            <div className="slot-editor">
              {slots.map((slot, index) => (
                <div className="slot-row" key={index}>
                  <select
                    className="select"
                    value={slot.weekday}
                    onChange={(event) =>
                      updateSlot(index, {
                        weekday: Number(event.target.value) as Weekday
                      })
                    }
                  >
                    {WEEKDAYS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="time"
                    value={slot.startTime}
                    onChange={(event) =>
                      updateSlot(index, { startTime: event.target.value })
                    }
                  />
                  <span className="slot-sep">-</span>
                  <input
                    className="input"
                    type="time"
                    value={slot.endTime}
                    onChange={(event) =>
                      updateSlot(index, { endTime: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="icon-button tiny"
                    title="删除这个时间段"
                    onClick={() => removeSlot(index)}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="ghost-button slot-add"
                onClick={addSlot}
              >
                <Icon name="plus" size={14} />
                添加时间段
              </button>
            </div>
            {invalidSlots && (
              <p className="hint danger-text">
                至少保留一个时间段，并确保结束时间晚于开始时间。
              </p>
            )}
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="course-weeks">周次</label>
              <input
                id="course-weeks"
                className="input"
                value={weeks}
                onChange={(event) => setWeeks(event.target.value)}
                placeholder="例如：1-16周"
              />
            </div>
            {mode === 'plan' && (
              <div className="field">
                <label htmlFor="plan-semester">学期</label>
                <select
                  id="plan-semester"
                  className="select"
                  value={semester}
                  onChange={(event) =>
                    setSemester(event.target.value as CourseSemester)
                  }
                >
                  <option value="fall">秋季学期</option>
                  <option value="spring">春季学期</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'plan' && (
            <div className="row">
              <div className="field">
                <label htmlFor="plan-status">状态</label>
                <select
                  id="plan-status"
                  className="select"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as CoursePlanStatus)
                  }
                >
                  <option value="considering">考虑中</option>
                  <option value="selected">已选</option>
                  <option value="dropped">已放弃</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="plan-credits">课程学分</label>
                <input
                  id="plan-credits"
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={credits}
                  onChange={(event) => setCredits(event.target.value)}
                />
              </div>
            </div>
          )}

          {mode === 'plan' && (
            <div className="field">
              <label htmlFor="plan-category">学分类别</label>
              <select
                id="plan-category"
                className="select"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">未分类</option>
                {creditCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="hint">
                课程学分只作参考；底部学分登记表由你手动填写，不自动汇总。
              </p>
            </div>
          )}

          <div className="field">
            <label>颜色</label>
            <div className="swatches">
              {COURSE_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === color ? 'swatch active' : 'swatch'}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                  aria-label={`课程颜色 ${item}`}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="course-note">备注</label>
            <textarea
              id="course-note"
              className="textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="选课要求、教室变更、考试信息等（可选）"
            />
          </div>

          {mode === 'plan' && (
            <p className="hint">
              选课计划允许时间冲突，冲突课程会在下方表格的同一时段上下排列。
            </p>
          )}
        </div>

        <div className="modal-actions">
          {mode === 'course' && course && (
            <button
              type="button"
              className="ghost-button danger-text delete-action"
              onClick={() => void handleDelete()}
            >
              <Icon name="trash" size={15} />
              删除课程
            </button>
          )}
          {mode === 'plan' && plan && (
            <div className="action-left">
              {plan.status !== 'selected' && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handlePromote()}
                >
                  加入当前课表
                </button>
              )}
              <button
                type="button"
                className="ghost-button danger-text"
                onClick={() => void handleDeletePlan()}
              >
                <Icon name="trash" size={15} />
                删除计划
              </button>
            </div>
          )}
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={!name.trim() || invalidSlots || saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

type EditorState =
  | { mode: 'course'; course?: Course }
  | { mode: 'plan'; plan?: CoursePlan }

export function CoursesView(): React.JSX.Element {
  const {
    courses,
    coursePlans,
    creditCategories,
    deleteCreditCategory,
    updateCreditCategory,
    createCreditCategory
  } = useWorkspace()
  const [tab, setTab] = useState<'week' | 'plan'>('week')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [planSemester, setPlanSemester] =
    useState<CourseSemester>(currentSemester)

  const today = weekdayNumber()
  const flattened = useMemo(
    () =>
      courses.flatMap((course) =>
        course.slots.map((slot, index) => ({
          course,
          slot,
          key: `${course.id}-${slotKey(slot, index)}`
        }))
      ),
    [courses]
  )
  const conflicts = useMemo(
    () => conflictSlotKeys(flattened.map(({ key, slot }) => ({ key, slot }))),
    [flattened]
  )
  const next = useMemo(() => nextCourse(courses), [courses])
  const todaysCourses = courses.filter((course) =>
    course.slots.some((slot) => slot.weekday === today)
  )
  const totalMinutes = courses.reduce(
    (sum, course) =>
      sum +
      course.slots.reduce(
        (slotSum, slot) =>
          slotSum + Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)),
        0
      ),
    0
  )

  const grid = useMemo(
    () => buildGrid(flattened.map(({ slot }) => slot)),
    [flattened]
  )

  const visiblePlans = coursePlans.filter(
    (plan) => plan.semester === planSemester
  )
  const fallPlanCount = coursePlans.filter(
    (plan) => plan.semester === 'fall'
  ).length
  const springPlanCount = coursePlans.filter(
    (plan) => plan.semester === 'spring'
  ).length

  const planSlots = useMemo(
    () =>
      visiblePlans.flatMap((plan) =>
        plan.slots.map((slot, index) => ({
          plan,
          slot,
          key: `${plan.id}-${slotKey(slot, index)}`
        }))
      ),
    [visiblePlans]
  )

  const planGrid = useMemo(
    () => buildGrid(planSlots.map(({ slot }) => slot)),
    [planSlots]
  )

  const planRows = useMemo(() => {
    return planGrid.boundaries.slice(0, -1).map((start, index) => {
      const end = planGrid.boundaries[index + 1]
      const cells = WEEKDAYS.map((day) => ({
        day: day.value,
        items: planSlots.filter(
          (entry) =>
            entry.slot.weekday === day.value &&
            toMinutes(entry.slot.startTime) < end &&
            toMinutes(entry.slot.endTime) > start
        )
      }))
      return {
        start,
        end,
        height: planGrid.slotHeights[index],
        cells
      }
    }).filter((row) => row.cells.some((cell) => cell.items.length > 0))
  }, [planGrid, planSlots])

  const categoryName = (id: string | null): string =>
    id
      ? creditCategories.find((category) => category.id === id)?.name ??
        '未分类'
      : '未分类'

  return (
    <div className="courses-page">
      <div className="view-toolbar">
        <div className="segmented">
          <button
            className={tab === 'week' ? 'segment active' : 'segment'}
            onClick={() => setTab('week')}
          >
            本周课表 {courses.length}
          </button>
          <button
            className={tab === 'plan' ? 'segment active' : 'segment'}
            onClick={() => setTab('plan')}
          >
            选课计划 {coursePlans.length}
          </button>
        </div>
        <div className="toolbar-actions">
          <button
            className="ghost-button"
            onClick={() => setEditor({ mode: 'plan' })}
          >
            <Icon name="plus" size={15} />
            添加计划
          </button>
          <button
            className="primary-button"
            onClick={() => setEditor({ mode: 'course' })}
          >
            <Icon name="plus" size={16} />
            添加课程
          </button>
        </div>
      </div>

      {tab === 'week' ? (
        <>
          <section className="stats-grid course-stats">
            <div className="stat-card card">
              <span className="stat-icon">
                <Icon name="book" size={18} />
              </span>
              <div>
                <div className="stat-label">本周课程</div>
                <div className="stat-value">{courses.length}</div>
              </div>
            </div>
            <div className="stat-card card">
              <span className="stat-icon">
                <Icon name="calendar" size={18} />
              </span>
              <div>
                <div className="stat-label">今日课程</div>
                <div className="stat-value">{todaysCourses.length}</div>
              </div>
            </div>
            <div className="stat-card card">
              <span className="stat-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <div className="stat-label">每周课时</div>
                <div className="stat-value">
                  {durationText(
                    '00:00',
                    `${pad2(Math.floor(totalMinutes / 60))}:${pad2(
                      totalMinutes % 60
                    )}`
                  )}
                </div>
              </div>
            </div>
            <div className="stat-card card">
              <span className="stat-icon">
                <Icon name="target" size={18} />
              </span>
              <div>
                <div className="stat-label">选课计划</div>
                <div className="stat-value">{coursePlans.length}</div>
              </div>
            </div>
          </section>

          {next && (
            <section className="card next-course">
              <div className="next-course-badge">
                <Icon name="spark" size={16} />
                下一节课
              </div>
              <div className="next-course-main">
                <span
                  className="next-course-dot"
                  style={{ background: next.course.color }}
                />
                <div>
                  <strong>{next.course.name}</strong>
                  <span>
                    {next.day === today ? '今天' : weekdayLabel(next.day)} ·{' '}
                    {next.slot.startTime} - {next.slot.endTime}
                    {next.course.location ? ` · ${next.course.location}` : ''}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="card panel timetable-panel">
            <div className="panel-head">
              <h3>本周课表</h3>
              <span className="muted">
                {courses.length === 0
                  ? '还没有课程'
                  : `${courses.length} 门课程 · 点击课程可编辑`}
              </span>
            </div>

            {courses.length === 0 ? (
              <div className="empty-state large">
                <span className="empty-icon">
                  <Icon name="book" size={24} />
                </span>
                <div>
                  <strong>课程表还是空的</strong>
                  <p>添加课程后会按星期和时间自动排进课表。</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setEditor({ mode: 'course' })}
                >
                  <Icon name="plus" size={16} />
                  添加第一门课程
                </button>
              </div>
            ) : (
              <div className="timetable">
                <div className="timetable-head">
                  <div className="timetable-time-head">时间</div>
                  {WEEKDAYS.map((item) => (
                    <div
                      key={item.value}
                      className={
                        item.value === today
                          ? 'timetable-day-head today'
                          : 'timetable-day-head'
                      }
                    >
                      <span>{item.label}</span>
                      <i>{item.short}</i>
                    </div>
                  ))}
                </div>

                <div className="timetable-scroll">
                  <div
                    className="timetable-body"
                    style={{ height: grid.bodyHeight }}
                  >
                    <div className="timetable-times">
                      {grid.timeLabels.map((label, index) => (
                        <span
                          key={`${label.minute}-${index}`}
                          style={{
                            top: label.top,
                            transform:
                              index === 0
                                ? 'translateY(0)'
                                : label.top >= grid.bodyHeight - 1
                                  ? 'translateY(-100%)'
                                  : 'translateY(-50%)'
                          }}
                        >
                          {minuteLabel(label.minute)}
                        </span>
                      ))}
                    </div>

                    <div className="timetable-grid">
                      {grid.boundaries.map((minute, index) => (
                        <div
                          key={`line-${minute}-${index}`}
                          className={
                            minute % 60 === 0
                              ? 'timetable-line hour'
                              : 'timetable-line'
                          }
                          style={{ top: grid.slotStarts[index] }}
                        />
                      ))}

                      {WEEKDAYS.map((item, index) => (
                        <div
                          key={item.value}
                          className={
                            item.value === today
                              ? 'timetable-col today'
                              : 'timetable-col'
                          }
                          style={{
                            left: `${(index * 100) / 7}%`,
                            width: `${100 / 7}%`
                          }}
                        />
                      ))}

                      {flattened.map(({ course, slot, key }) => {
                        const top =
                          grid.minuteToTop.get(toMinutes(slot.startTime)) ?? 0
                        const bottom =
                          grid.minuteToTop.get(toMinutes(slot.endTime)) ?? top
                        const height = Math.max(
                          MIN_COURSE_SLOT_HEIGHT - 4,
                          bottom - top - 4
                        )
                        const compact = height < 70
                        const nameClass =
                          course.name.length > 20
                            ? 'timetable-course-name xlong'
                            : course.name.length > 12
                              ? 'timetable-course-name long'
                              : 'timetable-course-name'
                        return (
                          <button
                            key={key}
                            className={
                              compact
                                ? 'timetable-course compact'
                                : 'timetable-course'
                            }
                            style={{
                              top,
                              height,
                              left: `${((slot.weekday - 1) * 100) / 7}%`,
                              width: `${100 / 7}%`,
                              ['--course-color' as string]: course.color
                            }}
                            onClick={() =>
                              setEditor({ mode: 'course', course })
                            }
                            title={`${course.name} ${slot.startTime}-${slot.endTime}${course.location ? ` · ${course.location}` : ''}`}
                          >
                            <span className="timetable-course-inner">
                              <span className={nameClass}>
                                {course.name}
                                {conflicts.has(key) && (
                                  <i className="course-conflict">冲突</i>
                                )}
                              </span>
                              {!compact && (
                                <>
                                  <span className="timetable-course-time">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                  {course.location && (
                                    <span className="timetable-course-place">
                                      {course.location}
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="stack">
          <section className="card panel">
            <div className="panel-head plan-head">
              <div className="plan-head-copy">
                <h3>选课计划表</h3>
                <span className="muted">
                  {SEMESTER_LABEL[planSemester]} · {SEMESTER_HINT[planSemester]} ·
                  冲突课程上下排列
                </span>
              </div>
              <div className="segmented">
                <button
                  className={
                    planSemester === 'fall' ? 'segment active' : 'segment'
                  }
                  onClick={() => setPlanSemester('fall')}
                >
                  秋季学期 {fallPlanCount}
                </button>
                <button
                  className={
                    planSemester === 'spring' ? 'segment active' : 'segment'
                  }
                  onClick={() => setPlanSemester('spring')}
                >
                  春季学期 {springPlanCount}
                </button>
              </div>
            </div>

            {visiblePlans.length === 0 ? (
              <div className="empty-state large">
                <span className="empty-icon">
                  <Icon name="target" size={24} />
                </span>
                <div>
                  <strong>{SEMESTER_LABEL[planSemester]}还没有选课计划</strong>
                  <p>添加未来想选的课程，允许设置多个时间段和冲突时间。</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setEditor({ mode: 'plan' })}
                >
                  <Icon name="plus" size={16} />
                  添加计划
                </button>
              </div>
            ) : (
              <div className="plan-table">
                <div className="plan-table-head">
                  <div>时间</div>
                  {WEEKDAYS.map((day) => (
                    <div key={day.value}>{day.label}</div>
                  ))}
                </div>
                {planRows.map((row, rowIndex) => (
                  <div
                    className="plan-table-row"
                    key={`${row.start}-${rowIndex}`}
                    style={{ minHeight: Math.max(30, row.height) }}
                  >
                    <div className="plan-time-cell">
                      {minuteLabel(row.start)}
                      <span>{minuteLabel(row.end)}</span>
                    </div>
                    {row.cells.map((cell) => (
                      <div className="plan-cell" key={cell.day}>
                        {cell.items.map(({ plan, slot, key }) => (
                          <button
                            key={key}
                            type="button"
                            className="plan-chip"
                            style={{
                              ['--plan-color' as string]: plan.color
                            }}
                            onClick={() =>
                              setEditor({ mode: 'plan', plan })
                            }
                            title={`${plan.name} ${slot.startTime}-${slot.endTime}`}
                          >
                            <span className="plan-chip-name">
                              {plan.name}
                              {plan.status === 'selected' && (
                                <i>已选</i>
                              )}
                            </span>
                            <span className="plan-chip-meta">
                              {slot.startTime} - {slot.endTime}
                              {plan.credits ? ` · ${plan.credits} 学分` : ''}
                              {` · ${categoryName(plan.categoryId)}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card panel">
            <div className="panel-head">
              <h3>学分登记</h3>
              <div className="panel-head-actions">
                <span className="muted">手动填写，不做自动计算</span>
                <button
                  className="ghost-button"
                  onClick={() =>
                    void createCreditCategory({
                      name: '新类别',
                      earned: 0,
                      required: 0,
                      planned: 0,
                      note: ''
                    })
                  }
                >
                  <Icon name="plus" size={14} />
                  添加类别
                </button>
              </div>
            </div>

            <div className="credit-table-wrap">
              <table className="credit-table">
                <thead>
                  <tr>
                    <th>类别</th>
                    <th>已修</th>
                    <th>需要</th>
                    <th>计划中</th>
                    <th>备注</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {creditCategories.map((category) => (
                    <CreditRow
                      key={category.id}
                      category={category}
                      onUpdate={updateCreditCategory}
                      onDelete={deleteCreditCategory}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {creditCategories.length === 0 && (
              <p className="hint">
                还没有学分类别，点击「添加类别」开始登记。
              </p>
            )}
          </section>
        </div>
      )}

      {editor && (
        <CourseEditorModal
          mode={editor.mode}
          course={editor.mode === 'course' ? editor.course : undefined}
          plan={editor.mode === 'plan' ? editor.plan : undefined}
          defaultWeekday={today}
          defaultSemester={planSemester}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
