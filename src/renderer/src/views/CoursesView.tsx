import { useMemo, useState } from 'react'
import type {
  Course,
  CourseInput,
  CoursePlan,
  CoursePlanInput,
  CoursePlanStatus,
  CourseSemester,
  Weekday
} from '../../../shared/types'
import { Icon } from '../components/Icon'
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

const COURSE_COLORS = [
  '#3f5d4e',
  '#2f3e5c',
  '#8a6a3f',
  '#9a4a35',
  '#6b5b7a',
  '#3c6e71',
  '#a37b5c',
  '#4a5568'
]

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

const ROW_MINUTES = 30
const ROW_HEIGHT = 28

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return (hour || 0) * 60 + (minute || 0)
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

function conflictIds(courses: Course[]): Set<string> {
  const ids = new Set<string>()
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const a = courses[i]
      const b = courses[j]
      if (
        a.weekday === b.weekday &&
        toMinutes(a.startTime) < toMinutes(b.endTime) &&
        toMinutes(a.endTime) > toMinutes(b.startTime)
      ) {
        ids.add(a.id)
        ids.add(b.id)
      }
    }
  }
  return ids
}

function nextCourse(courses: Course[]): { course: Course; day: Weekday } | null {
  const today = weekdayNumber()
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (((today - 1 + offset) % 7) + 1) as Weekday
    const candidates = courses
      .filter(
        (course) =>
          course.weekday === day &&
          (offset > 0 || toMinutes(course.endTime) > nowMinutes)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (candidates[0]) return { course: candidates[0], day }
  }
  return null
}

function CourseEditorModal({
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
    createCoursePlan,
    updateCoursePlan
  } = useWorkspace()
  const source = course ?? plan
  const [name, setName] = useState(source?.name ?? '')
  const [teacher, setTeacher] = useState(source?.teacher ?? '')
  const [location, setLocation] = useState(source?.location ?? '')
  const [weekday, setWeekday] = useState<Weekday>(
    source?.weekday ?? defaultWeekday ?? 1
  )
  const [startTime, setStartTime] = useState(source?.startTime ?? '08:00')
  const [endTime, setEndTime] = useState(source?.endTime ?? '09:30')
  const [weeks, setWeeks] = useState(source?.weeks ?? '1-16周')
  const [color, setColor] = useState(source?.color ?? COURSE_COLORS[0])
  const [note, setNote] = useState(source?.note ?? '')
  const [semester, setSemester] = useState<CourseSemester>(
    plan?.semester ?? defaultSemester ?? currentSemester()
  )
  const [status, setStatus] = useState<CoursePlanStatus>(
    plan?.status ?? 'considering'
  )
  const [saving, setSaving] = useState(false)

  const invalidTime = !startTime || !endTime || startTime >= endTime

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || invalidTime || saving) return

    setSaving(true)
    const input: CourseInput = {
      name: name.trim(),
      teacher,
      location,
      weekday,
      startTime,
      endTime,
      weeks,
      color,
      note
    }

    if (mode === 'course') {
      if (course) await updateCourse(course.id, input)
      else await createCourse(input)
    } else {
      const planInput: CoursePlanInput = { ...input, semester, status }
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

          <div className="row">
            <div className="field">
              <label htmlFor="course-weekday">星期</label>
              <select
                id="course-weekday"
                className="select"
                value={weekday}
                onChange={(event) =>
                  setWeekday(Number(event.target.value) as Weekday)
                }
              >
                {WEEKDAYS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="course-start">开始时间</label>
              <input
                id="course-start"
                className="input"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="course-end">结束时间</label>
              <input
                id="course-end"
                className="input"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

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

          {mode === 'plan' && (
            <>
              <div className="row">
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
              </div>
              <p className="hint">
                选课计划允许时间冲突，方便同时比较多个方案；只有加入课表后才会在课表中显示冲突提示。
              </p>
            </>
          )}

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

          {invalidTime && (
            <p className="hint danger-text">
              请填写开始和结束时间，并确保结束时间晚于开始时间。
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={!name.trim() || invalidTime || saving}
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
    deleteCourse,
    deleteCoursePlan,
    promoteCoursePlan
  } = useWorkspace()
  const [tab, setTab] = useState<'week' | 'plan'>('week')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [planSemester, setPlanSemester] = useState<CourseSemester>(currentSemester)

  const today = weekdayNumber()
  const visiblePlans = coursePlans.filter(
    (plan) => plan.semester === planSemester
  )
  const fallPlanCount = coursePlans.filter(
    (plan) => plan.semester === 'fall'
  ).length
  const springPlanCount = coursePlans.filter(
    (plan) => plan.semester === 'spring'
  ).length
  const conflicts = useMemo(() => conflictIds(courses), [courses])
  const next = useMemo(() => nextCourse(courses), [courses])
  const todaysCourses = courses.filter((course) => course.weekday === today)
  const totalMinutes = courses.reduce(
    (sum, course) =>
      sum + Math.max(0, toMinutes(course.endTime) - toMinutes(course.startTime)),
    0
  )

  const grid = useMemo(() => {
    const starts = courses.map((course) => toMinutes(course.startTime))
    const ends = courses.map((course) => toMinutes(course.endTime))
    const min = Math.max(0, Math.floor((starts.length ? Math.min(...starts) : 480) / 60) * 60)
    const max = Math.min(24 * 60, Math.ceil((ends.length ? Math.max(...ends) : 1260) / 60) * 60)
    const startMinute = min
    const endMinute = Math.max(startMinute + 120, max)
    const rows = Math.max(4, Math.round((endMinute - startMinute) / ROW_MINUTES))
    const hours: number[] = []
    for (let minute = startMinute; minute <= endMinute; minute += 60) {
      hours.push(minute)
    }
    return { startMinute, endMinute, rows, hours }
  }, [courses])

  const bodyHeight = grid.rows * ROW_HEIGHT

  function removeCourse(course: Course): void {
    if (!window.confirm(`确定删除课程「${course.name}」吗？`)) return
    void deleteCourse(course.id)
  }

  function removePlan(plan: CoursePlan): void {
    if (!window.confirm(`确定删除选课计划「${plan.name}」吗？`)) return
    void deleteCoursePlan(plan.id)
  }

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
            onClick={() =>
              setEditor({ mode: 'course', course: undefined })
            }
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
                <div className="stat-value">{durationText('00:00', `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`)}</div>
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
                    {next.course.startTime} - {next.course.endTime}
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
                    style={{ height: bodyHeight }}
                  >
                    <div className="timetable-times">
                      {grid.hours.map((minute) => (
                        <span
                          key={minute}
                          style={{
                            top: ((minute - grid.startMinute) / ROW_MINUTES) * ROW_HEIGHT
                          }}
                        >
                          {String(Math.floor(minute / 60)).padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>

                    <div
                      className="timetable-grid"
                      style={{
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_HEIGHT * 2 - 1}px, #eef0f4 ${ROW_HEIGHT * 2 - 1}px, #eef0f4 ${ROW_HEIGHT * 2}px)`
                      }}
                    >
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

                      {courses.map((course) => {
                        const top =
                          ((toMinutes(course.startTime) - grid.startMinute) /
                            ROW_MINUTES) *
                          ROW_HEIGHT
                        const height = Math.max(
                          ROW_HEIGHT,
                          ((toMinutes(course.endTime) -
                            toMinutes(course.startTime)) /
                            ROW_MINUTES) *
                            ROW_HEIGHT -
                            4
                        )
                        const compact = height < 52
                        return (
                          <button
                            key={course.id}
                            className={
                              compact
                                ? 'timetable-course compact'
                                : 'timetable-course'
                            }
                            style={{
                              top,
                              height,
                              left: `${((course.weekday - 1) * 100) / 7}%`,
                              width: `${100 / 7}%`,
                              ['--course-color' as string]: course.color
                            }}
                            onClick={() =>
                              setEditor({ mode: 'course', course })
                            }
                            title={`${course.name} ${course.startTime}-${course.endTime}${course.location ? ` · ${course.location}` : ''}`}
                          >
                            <span className="timetable-course-inner">
                              <span className="timetable-course-name">
                                {course.name}
                                {conflicts.has(course.id) && (
                                  <i className="course-conflict">冲突</i>
                                )}
                              </span>
                              {!compact && (
                                <>
                                  <span className="timetable-course-time">
                                    {course.startTime} - {course.endTime}
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
        <section className="card panel">
          <div className="panel-head plan-head">
            <div className="plan-head-copy">
              <h3>选课计划</h3>
              <span className="muted">
                {SEMESTER_LABEL[planSemester]} · {SEMESTER_HINT[planSemester]} ·
                允许时间冲突
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
                <p>
                  把想选的课先记下来，允许设置冲突时间，方便比较不同方案。
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => setEditor({ mode: 'plan' })}
              >
                <Icon name="plus" size={16} />
                添加{SEMESTER_LABEL[planSemester]}计划
              </button>
            </div>
          ) : (
            <div className="course-plan-grid">
              {visiblePlans.map((plan) => (
                <article className="course-plan-card" key={plan.id}>
                  <div
                    className="course-plan-color"
                    style={{ background: plan.color }}
                  />
                  <div className="course-plan-body">
                    <div className="course-plan-head">
                      <strong>{plan.name}</strong>
                      <div className="course-plan-tags">
                        <span className={`semester-chip ${plan.semester}`}>
                          {SEMESTER_LABEL[plan.semester]}
                        </span>
                        <span className={`plan-status ${plan.status}`}>
                          {PLAN_STATUS_LABEL[plan.status]}
                        </span>
                      </div>
                    </div>
                    <div className="course-plan-meta">
                      <span>
                        <Icon name="calendar" size={13} />
                        {weekdayLabel(plan.weekday)} {plan.startTime} -{' '}
                        {plan.endTime}
                      </span>
                      {plan.location && (
                        <span>
                          <Icon name="location" size={13} />
                          {plan.location}
                        </span>
                      )}
                      {plan.teacher && <span>{plan.teacher}</span>}
                      {plan.weeks && <span>{plan.weeks}</span>}
                    </div>
                    {plan.note && <p className="course-plan-note">{plan.note}</p>}
                    <div className="course-plan-actions">
                      <button
                        className="ghost-button"
                        onClick={() => setEditor({ mode: 'plan', plan })}
                      >
                        编辑
                      </button>
                      <button
                        className="ghost-button"
                        disabled={plan.status === 'selected'}
                        onClick={() => void promoteCoursePlan(plan.id)}
                      >
                        {plan.status === 'selected' ? '已加入课表' : '加入课表'}
                      </button>
                      <button
                        className="ghost-button danger-text"
                        onClick={() => removePlan(plan)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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
