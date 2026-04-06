<script setup lang="ts">
import type { Client } from '@anchor-sdk/core'
import { provideClient } from './provider'

const props = defineProps<{ client: Client }>()
provideClient(props.client)
</script>

<template>
  <slot />
</template>
