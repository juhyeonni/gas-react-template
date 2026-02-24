/**
 * GAS API Base Client
 * - Production (GAS): google.script.run
 * - Development (Vite): in-memory mock API
 */

declare const google: {
  script: {
    run: {
      withSuccessHandler: <T>(callback: (result: T) => void) => {
        withFailureHandler: (callback: (error: Error) => void) => {
          apiGet: (action: string, params?: Record<string, string>) => void
          apiPost: (action: string, data?: Record<string, unknown>) => void
        }
      }
    }
  }
}

const isGas = typeof google !== 'undefined' && !!google?.script?.run

// --- Mock API (dev mode) ---
let mockCount = 0

function mockApiGet(action: string, _params?: Record<string, string>): unknown {
  switch (action) {
    case 'getCount':
      return { count: mockCount }
    case 'ping':
      return { message: 'pong', timestamp: new Date().toISOString() }
    default:
      throw new Error(`Unknown GET action: ${action}`)
  }
}

function mockApiPost(action: string, data?: Record<string, unknown>): unknown {
  switch (action) {
    case 'increment':
      return { count: ++mockCount }
    case 'decrement':
      return { count: --mockCount }
    case 'reset':
      mockCount = 0
      return { count: mockCount }
    case 'setCount':
      mockCount = Number(data?.value) || 0
      return { count: mockCount }
    default:
      throw new Error(`Unknown POST action: ${action}`)
  }
}

// --- Core ---

export function gasCall<T>(
  action: string,
  method: 'get' | 'post',
  data?: Record<string, unknown>
): Promise<T> {
  // Dev mode: use mock
  if (!isGas) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = method === 'get'
          ? mockApiGet(action, data as Record<string, string>)
          : mockApiPost(action, data)
        resolve(result as T)
      }, 100)
    })
  }

  // Production: use google.script.run
  return new Promise((resolve, reject) => {
    const handler = google.script.run
      .withSuccessHandler((result: T) => {
        if (result && typeof result === 'object' && 'error' in result) {
          reject(new Error((result as { error: string }).error))
        } else {
          resolve(result)
        }
      })
      .withFailureHandler((error: Error) => reject(error))

    if (method === 'get') {
      handler.apiGet(action, data as Record<string, string>)
    } else {
      handler.apiPost(action, data)
    }
  })
}

export function apiGet<T>(action: string, params?: Record<string, string>): Promise<T> {
  return gasCall<T>(action, 'get', params)
}

export function apiPost<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  return gasCall<T>(action, 'post', data)
}
