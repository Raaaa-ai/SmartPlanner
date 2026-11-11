import type { ReactNode } from 'react'

export type IconName =
  | 'sun'
  | 'tasks'
  | 'folder'
  | 'calendar'
  | 'award'
  | 'pen'
  | 'note'
  | 'settings'
  | 'plus'
  | 'arrow-left'
  | 'trash'
  | 'pin'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'spark'
  | 'target'
  | 'clock'
  | 'check'
  | 'image'
  | 'minimize'
  | 'maximize'
  | 'location'

const PATHS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </>
  ),
  tasks: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 12l2.5 2.5L16 9" />
    </>
  ),
  folder: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 22l5-2.5 5 2.5-1.5-8.5" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  note: (
    <>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="15" cy="16" r="2.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  trash: (
    <>
      <path d="M4 7h16M6 7l1 13h10l1-13M9 4h6l1 3H8l1-3Z" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pin: (
    <>
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
      <path d="M12 14v7" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  check: <path d="M5 12l4 4L19 6" />,
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 4 4 3-3 4 4" />
    </>
  ),
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="2" />,
  location: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  )
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 18, className, strokeWidth = 1.8 }: IconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
