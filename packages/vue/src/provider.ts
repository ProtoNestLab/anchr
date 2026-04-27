import { provide, inject } from 'vue'
import type { Client, Plugin } from '@anchor-sdk/core'

const CLIENT_KEY = Symbol('anchor-client')

export function provideClient(client: Client & { plugins?: Plugin[] }) {
  provide(CLIENT_KEY, client)
}

export function useClient(): Client & { plugins?: Plugin[] } {
  const client = inject<Client & { plugins?: Plugin[] }>(CLIENT_KEY)
  if (!client) {
    throw new Error('No Anchor client provided. Wrap your app with <CollabProvider>.')
  }
  return client
}
