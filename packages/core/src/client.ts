import type { Adapter } from './types'

export interface Client {
  adapter: Adapter
}

export function createClient(options: { adapter: Adapter }): Client {
  return { adapter: options.adapter }
}
