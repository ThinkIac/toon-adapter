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

test('preserves input on codec failures, invalid JSON and limits', () => {
  const original = [{ role: 'tool', content: '{"a":[{"b":1}]}' }, { role: 'tool', content: '' }, { role: 'tool', content: '{bad' }]
  for (const options of [{ encode: () => { throw Error('encode') } }, { decode: () => { throw Error('decode') } }, { maxBytes: 4 }, { maxDepth: 1 }, { maxNodes: 1 }]) {
    assert.deepEqual(adaptMessages(original, options).messages, original)
  }
})

test('handles multiple tool results, caching, thresholds and token estimates', () => {
  const value = Array.from({ length: 30 }, (_, id) => ({ id, name: `cached${id}`, active: true }))
  const content = JSON.stringify(value)
  const original = [{ role: 'tool', content, tool_call_id: 'a', meta: { x: 1 } }, { role: 'tool', content, tool_call_id: 'b' }, { role: 'assistant', content }]
  const before = structuredClone(original)
  const result = adaptMessages(original, { tokenizer: s => s.length })
  assert.equal(result.metrics.converted, 2)
  assert.ok(result.metrics.cacheHits >= 1)
  assert.equal(result.metrics.tokenMeasurements, 2)
  assert.deepEqual(original, before)
  assert.deepEqual(result.messages[0].meta, { x: 1 })
  assert.equal(result.messages[1].tool_call_id, 'b')
  assert.equal(result.messages[2], original[2])
  assert.equal(adaptMessages(original, { minSavingsBytes: 99999 }).usedToon, false)
})

test('accepts only structurally equivalent content', async () => {
  const { equivalentContent } = await import('../index.js')
  const value = { nested: [null, true, -2, 'é', { text: 'a\n"b' }] }
  const json = JSON.stringify(value)
  assert.equal(equivalentContent(json, JSON.stringify(value, null, 2)), true)
  assert.equal(equivalentContent(json, '{"nested":[]}'), false)
  assert.equal(equivalentContent(json, 'Dados em formato TOON:\n```toon\ninvalid\n```'), false)
})
