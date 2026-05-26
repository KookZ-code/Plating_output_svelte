// src/lib/utils/api.ts — Typed API client
//
// กฎ:
// 1. ทุก request ผ่าน function นี้ — ไม่ fetch โดยตรงใน component
// 2. Return typed result เสมอ
// 3. Handle error อย่างสม่ำเสมอ

import { base } from '$app/paths';
import type { ApiResponse, PaginatedResponse, Item, CreateItemInput, UpdateItemInput } from '$types';

// ใช้ relative path เสมอ — ทำงานได้ทั้ง 3 mode:
//   - Dev:           Vite proxy /api → http://127.0.0.1:8080
//   - Prod root:     base = ''       → /api/...
//   - Prod sub-path: base = '/myapp' → /myapp/api/...

// ─────────────────────────────────────────────────────────────────
// Base fetch wrapper
// ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Backend ส่ง JSON เสมอ แม้ error
    const json: ApiResponse<T> = await res.json();

    if (!res.ok && !json.error) {
      // ถ้า backend ไม่ได้ส่ง error object มา สร้างขึ้นเอง
      return {
        data: null,
        error: { code: 'HTTP_ERROR', message: `HTTP ${res.status}` },
      };
    }

    return json;
  } catch (err) {
    // Network error, parse error ฯลฯ
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Items API
// ─────────────────────────────────────────────────────────────────

export const itemsApi = {
  list: (page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Item>>> =>
    apiFetch(`/api/items?page=${page}&limit=${limit}`),

  get: (id: string): Promise<ApiResponse<Item>> =>
    apiFetch(`/api/items/${encodeURIComponent(id)}`),

  create: (input: CreateItemInput): Promise<ApiResponse<Item>> =>
    apiFetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateItemInput): Promise<ApiResponse<Item>> =>
    apiFetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string): Promise<ApiResponse<null>> =>
    apiFetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ─────────────────────────────────────────────────────────────────
// Health API
// ─────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => apiFetch<{ status: string; database: string; version: string }>('/api/health'),
};
