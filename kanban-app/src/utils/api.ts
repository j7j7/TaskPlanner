const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      request<{ user: import('../types').User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    login: (username: string, password: string) =>
      request<{ user: import('../types').User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
    me: () =>
      request<{ user: import('../types').User }>('/auth/me'),
  },
  boards: {
    getAll: () =>
      request<{ boards: import('../types').Board[] }>('/boards'),
    get: (id: string) =>
      request<{ board: import('../types').Board; labels: import('../types').Label[] }>(
        `/boards/${id}`
      ),
    create: (title: string) =>
      request<{ board: import('../types').Board }>('/boards', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    update: (id: string, data: Partial<import('../types').Board>) =>
      request<{ board: import('../types').Board }>(`/boards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/boards/${id}`, {
        method: 'DELETE',
      }),
  },
  labels: {
    getAll: () =>
      request<{ labels: import('../types').Label[] }>('/labels'),
    create: (name: string, color: string) =>
      request<{ label: import('../types').Label }>('/labels', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
      }),
    update: (id: string, data: Partial<import('../types').Label>) =>
      request<{ label: import('../types').Label }>(`/labels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/labels/${id}`, {
        method: 'DELETE',
      }),
  },
};
