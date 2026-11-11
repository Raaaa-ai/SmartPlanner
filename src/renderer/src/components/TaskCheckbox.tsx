import { Icon } from './Icon'

export function TaskCheckbox({
  done,
  onChange
}: {
  done: boolean
  onChange: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={done ? 'task-check done' : 'task-check'}
      onClick={onChange}
      aria-label={done ? '标记为未完成' : '标记为完成'}
    >
      <Icon name="check" size={12} strokeWidth={2.6} />
    </button>
  )
}
