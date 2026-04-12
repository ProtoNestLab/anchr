import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CommentButton from '../CommentButton.vue'

describe('CommentButton', () => {
  it('should render the comment button', () => {
    const wrapper = mount(CommentButton, {
      props: {},
    })

    expect(wrapper.find('.anchor-comment-btn').exists()).toBe(true)
  })

  it('should display count when provided', () => {
    const wrapper = mount(CommentButton, {
      props: { count: 5 },
    })

    expect(wrapper.find('.anchor-comment-count').text()).toBe('5')
  })

  it('should not display count when zero or undefined', () => {
    const wrapper = mount(CommentButton, {
      props: { count: 0 },
    })

    expect(wrapper.find('.anchor-comment-count').exists()).toBe(false)
  })

  it('should show unread dot when unread > 0', () => {
    const wrapper = mount(CommentButton, {
      props: { unread: 3 },
    })

    expect(wrapper.find('.anchor-unread-dot').exists()).toBe(true)
  })

  it('should not show unread dot when unread is 0', () => {
    const wrapper = mount(CommentButton, {
      props: { unread: 0 },
    })

    expect(wrapper.find('.anchor-unread-dot').exists()).toBe(false)
  })

  it('should emit click event', async () => {
    const wrapper = mount(CommentButton, {
      props: {},
    })

    await wrapper.find('.anchor-comment-btn').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('should have accessible title', () => {
    const wrapper = mount(CommentButton, {
      props: {},
    })

    expect(wrapper.find('.anchor-comment-btn').attributes('title')).toBe('Open discussion')
  })
})
