# Plugins

The SDK supports a plugin system to hook into thread and message lifecycle events.

## Plugin Interface

```ts
import type { Plugin } from '@anchor-sdk/core'

const myPlugin: Plugin = {
  name: 'my-plugin',

  install(ctx) {
    // Called when the client is initialized
    console.log('Plugin installed', ctx.client)
  },

  beforeCreateThread(anchorId, content) {
    // Modify content before creating a thread
    return `[${new Date().toISOString()}] ${content}`
  },

  afterCreateThread(thread) {
    // React to thread creation
    console.log('Thread created:', thread.id)
  },

  beforeAddMessage(threadId, content) {
    // Modify content before adding a message
    return content
  },

  afterAddMessage(message) {
    // React to message creation
    console.log('Message added:', message.id)
  },
}
```

## Usage

```ts
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createMemoryAdapter(),
  plugins: [myPlugin],
})
```

## Example: Mention Plugin

```ts
const mentionPlugin: Plugin = {
  name: 'mentions',

  beforeAddMessage(_threadId, content) {
    // Convert @username to styled mentions
    return content.replace(/@(\w+)/g, '**@$1**')
  },
}
```

## Example: Analytics Plugin

```ts
const analyticsPlugin: Plugin = {
  name: 'analytics',

  afterCreateThread(thread) {
    analytics.track('thread_created', { anchorId: thread.anchorId })
  },

  afterAddMessage(message) {
    analytics.track('message_sent', { userId: message.user.id })
  },
}
```
