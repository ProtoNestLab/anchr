import type { User } from '@anchor-sdk/core'

/** Demo workspace members (single source of truth for mock data + UI). */
export const DEMO_USERS: User[] = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' },
  { id: 'user-3', name: 'Carol' },
  { id: 'user-4', name: 'Dave' },
  { id: 'user-5', name: 'Eve' },
  { id: 'user-6', name: 'Frank' },
]

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock HTTP-style API: list users (simulated network latency).
 * Replace with `fetch('/api/users')` in a real app.
 */
export async function listUsers(): Promise<User[]> {
  await delay(150)
  return DEMO_USERS.map((u) => ({ ...u }))
}
