import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptMessages } from '../index.js'
import { decode } from '@toon-format/toon'

test('uses round-trip TOON when the complete representation is smaller', () => {
  const value = Array.from({ length: 30 }, (_, id) => ({ id, name: `name${id}`, active: true }))
  const messages = [{ role: 'tool', content: JSON.stringify(value, null, 2), tool_call_id: 'x' }]
  const result = adaptMessages(messages)
  assert.equal(result.usedToon, true)
  assert.deepEqual(decode(result.messages[0].content.split('```toon\n')[1].split('\n```')[0]), value)
  assert.equal(messages[0].content, JSON.stringify(value, null, 2))
})
test('minifies small JSON and preserves non-tool and invalid content', () => {
  const messages = [{ role: 'tool', content: '{ "a": 1 }' }, { role: 'tool', content: 'texto {"a": 1}' }, { role: 'user', content: '{ "a": 1 }' }]
  const result = adaptMessages(messages)
  assert.equal(result.messages[0].content, '{"a":1}')
  assert.equal(result.messages[1], messages[1])
  assert.equal(result.messages[2], messages[2])
  assert.equal(result.usedToon, false)
})
