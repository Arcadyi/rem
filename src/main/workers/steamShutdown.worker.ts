import { parentPort } from 'worker_threads'
import { shutdownSteam } from '../cookies'

parentPort?.once('message', (msg) => {
  if (msg === 'start') {
    try {
      shutdownSteam()
      parentPort?.postMessage({ success: true })
    } catch (e) {
      parentPort?.postMessage({ success: false, error: String(e) })
    }
  }
})
