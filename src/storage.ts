// Acceso a localStorage tolerante a fallos (modo privado, cuotas, entornos sin navegador).

export function saved(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function storeJson(key: string, value: unknown) {
  store(key, JSON.stringify(value))
}
