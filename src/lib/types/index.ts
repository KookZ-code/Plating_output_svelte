// src/lib/types/index.ts — Shared TypeScript types
// ห้ามใช้ `any` — ใช้ `unknown` แล้ว narrow type

// ─────────────────────────────────────────────────────────────────
// API Response Types — ต้องตรงกับ backend response shape
// ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────
// Domain Types
// ─────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  name: string;
  description: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateItemInput {
  name: string;
  description?: string;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────
// UI State Types
// ─────────────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  state: LoadingState;
  error: string | null;
}

export function createAsyncState<T>(): AsyncState<T> {
  return { data: null, state: 'idle', error: null };
}
