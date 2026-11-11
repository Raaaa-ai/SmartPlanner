import type { SmartPlannerApi } from '../shared/types'

declare global {
  interface Window {
    api: SmartPlannerApi
  }
}

export {}
