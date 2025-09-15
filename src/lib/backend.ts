export function getBackendUrl() {
  // Prefer explicit env; default to local FastAPI backend
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
}

export async function backendJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

export async function backendJsonAuth<T = any>(path: string, token: string, init?: RequestInit): Promise<T> {
  return backendJson<T>(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
