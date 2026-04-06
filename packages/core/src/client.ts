import type { Adapter, User } from './types'
import type { Plugin } from './plugin'
import { applyPlugins } from './plugin'

export interface Client {
  adapter: Adapter
  user: User
}

export interface ClientOptions {
  adapter: Adapter
  user?: User
  plugins?: Plugin[]
}

export function createClient(options: ClientOptions): Client {
  const user = options.user ?? { id: 'anonymous', name: 'Anonymous' }
  let client: Client = { adapter: options.adapter, user }

  if (options.plugins?.length) {
    client = applyPlugins(client, options.plugins)
  }

  return client
}
