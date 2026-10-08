import { describe, expect, it } from 'vitest'

import { clearSession, getToken, isAuthenticated, setToken } from './session'

describe('session', () => {
  it('has no token and is not authenticated by default', () => {
    expect(getToken()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('stores the token under lms.accessToken', () => {
    setToken('abc.def.ghi')

    expect(getToken()).toBe('abc.def.ghi')
    expect(localStorage.getItem('lms.accessToken')).toBe('abc.def.ghi')
    expect(isAuthenticated()).toBe(true)
  })

  it('overwrites a previous token', () => {
    setToken('first')
    setToken('second')

    expect(getToken()).toBe('second')
  })

  it('clearSession removes the token', () => {
    setToken('abc')
    clearSession()

    expect(getToken()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('clearSession leaves unrelated localStorage keys alone', () => {
    localStorage.setItem('other.key', 'keep-me')
    setToken('abc')
    clearSession()

    expect(localStorage.getItem('other.key')).toBe('keep-me')
  })
})
