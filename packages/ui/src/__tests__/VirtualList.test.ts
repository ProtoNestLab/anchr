import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VirtualList from '../VirtualList.vue'

describe('VirtualList', () => {
  it('renders a subset of items based on viewport', async () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ id: i, label: `Item ${i}` }))
    const wrapper = mount(VirtualList, {
      props: {
        items,
        estimatedHeight: 40,
        overscan: 2,
        getKey: (item: unknown) => (item as { id: number }).id,
      },
      slots: {
        default: `<template #default="{ item }"><div class="row">{{ item.label }}</div></template>`,
      },
    })
    // happy-dom doesn't lay out nodes, so scroll region is 0 — only overscan items render
    const rows = wrapper.findAll('.row')
    // With viewport 0 we should render at most overscan items
    expect(rows.length).toBeLessThanOrEqual(10)
    // Total spacer height reflects all items
    const spacer = wrapper.find('.anchor-vlist-spacer')
    expect(spacer.attributes('style')).toContain('height: 20000px')
  })

  it('uses index as key when getKey not provided', async () => {
    const items = [{ a: 1 }, { a: 2 }]
    const wrapper = mount(VirtualList, {
      props: { items, estimatedHeight: 50 },
      slots: {
        default: `<template #default="{ item, index }"><div class="row">{{ index }}:{{ item.a }}</div></template>`,
      },
    })
    const spacer = wrapper.find('.anchor-vlist-spacer')
    expect(spacer.attributes('style')).toContain('height: 100px')
  })

  it('renders empty when items is empty', () => {
    const wrapper = mount(VirtualList, {
      props: { items: [], estimatedHeight: 30 },
      slots: { default: `<template #default><div class="row" /></template>` },
    })
    const spacer = wrapper.find('.anchor-vlist-spacer')
    expect(spacer.attributes('style')).toContain('height: 0px')
    expect(wrapper.findAll('.row')).toHaveLength(0)
  })
})
