import { describe, expect, it } from 'vitest'
import { TEXTS } from '../../worker/src/i18n.ts'
import { LOCALES, MESSAGES, type MessageKey } from './messages'

// The worker ships on its own, so it keeps a copy of some texts. These checks
// make the copies fail loudly instead of drifting apart.
describe('worker texts', () => {
  it('covers the same languages as the app', () => {
    expect(Object.keys(TEXTS).sort()).toEqual([...LOCALES].sort())
  })

  it('names each notified zone like the app does', () => {
    for (const locale of LOCALES) {
      for (const [zone, { title }] of Object.entries(TEXTS[locale].zones)) {
        // Worker titles add an emoji before the app name.
        expect(title).toContain(MESSAGES[locale][`zone.${zone}` as MessageKey])
      }
    }
  })
})
