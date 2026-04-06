import { provide, inject } from 'vue'
import type { Client } from '@anchor-sdk/core'

const CLIENT_KEY = Symbol('anchor-client')

export function provideClient(client: Client) {
  provide(CLIENT_KEY, client)
}

export function useClient(): Client {
  const client = inject<Client>(CLIENT_KEY)
  if (!client) {
    throw new Error('No Anchor client provided. Wrap your app with <CollabProvider>.')
  }
  return client
}
