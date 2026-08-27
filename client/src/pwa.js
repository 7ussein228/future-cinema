// PWA service worker registration for Future Cinema
// Uses vite-plugin-pwa virtual module with autoUpdate
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // autoUpdate handles refresh automatically; optionally prompt user
    console.log('[PWA] new content available, will update automatically')
  },
  onOfflineReady() {
    console.log('[PWA] app ready to work offline')
  },
  onRegistered(registration) {
    console.log('[PWA] SW registered', registration)
    // Optional: periodic update check every hour
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('[PWA] SW registration error', error)
  }
})

export default updateSW
