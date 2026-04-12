import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import CollabProvider from '../CollabProvider.vue'
import Anchor from '../Anchor.vue'
import { useClient } from '../provider'

describe('CollabProvider', () => {
  it('should provide client to children', () => {
    const adapter = createMemoryAdapter()
    const client = createClient({ adapter, user: { id: 'u1', name: 'Alice' } })

    let injectedClient: ReturnType<typeof createClient> | undefined

    const Child = defineComponent({
      setup() {
        injectedClient = useClient()
        return () => h('div')
      },
    })

    mount(CollabProvider, {
      props: { client },
      slots: { default: () => h(Child) },
    })

    expect(injectedClient).toBeDefined()
    expect(injectedClient!.user.name).toBe('Alice')
  })

  it('should render slot content', () => {
    const client = createClient({ adapter: createMemoryAdapter() })

    const wrapper = mount(CollabProvider, {
      props: { client },
      slots: { default: '<p>Hello</p>' },
    })

    expect(wrapper.find('p').text()).toBe('Hello')
  })
})

describe('Anchor', () => {
  it('should render default slot', () => {
    const wrapper = mount(Anchor, {
      props: { id: 'test-anchor' },
      slots: { default: '<span>Content</span>' },
    })

    expect(wrapper.find('span').text()).toBe('Content')
  })

  it('should have anchor-wrapper class', () => {
    const wrapper = mount(Anchor, {
      props: { id: 'test' },
      slots: { default: '<div />' },
    })

    expect(wrapper.find('.anchor-wrapper').exists()).toBe(true)
  })

  it('should pass hovered state to overlay slot', async () => {
    const wrapper = mount(Anchor, {
      props: { id: 'test' },
      slots: {
        default: '<div>Content</div>',
        overlay: `<template #overlay="{ hovered }"><span class="overlay">{{ hovered }}</span></template>`,
      },
    })

    const overlay = wrapper.find('.overlay')
    expect(overlay.text()).toBe('false')

    await wrapper.find('.anchor-wrapper').trigger('mouseenter')
    expect(wrapper.find('.overlay').text()).toBe('true')

    await wrapper.find('.anchor-wrapper').trigger('mouseleave')
    expect(wrapper.find('.overlay').text()).toBe('false')
  })
})
