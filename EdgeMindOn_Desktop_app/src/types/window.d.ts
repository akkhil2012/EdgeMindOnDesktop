import type { EdgeMindAPI } from './index'

declare global {
  interface Window {
    edgemind: EdgeMindAPI
  }
}
