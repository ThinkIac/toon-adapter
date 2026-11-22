import { encode, decode } from '@toon-format/toon'
import { isDeepStrictEqual } from 'node:util'
import { performance } from 'node:perf_hooks'

const bytes = text => Buffer.byteLength(text, 'utf8')
const prefix = 'Dados em formato TOON:\n```toon\n'
const suffix = '\n```'
const cache = new Map()
const defaults = { maxBytes: 1048576, maxDepth: 64, maxNodes: 50000, minSavingsBytes: 1, cacheEntries: 128 }

function withinLimits(value, options) {
  const stack = [[value, 0]]
  let nodes = 0
  while (stack.length) {
    const [item, depth] = stack.pop()
    if (++nodes > options.maxNodes || depth > options.maxDepth) return false
    if (item && typeof item === 'object') {
      for (const child of Object.values(item)) stack.push([child, depth + 1])
    }
  }
  return true
}

// Validate independently at the agent boundary, including the complete marker.
export function equivalentContent(original, candidate, options = {}) {
  try {
    const opts = { ...defaults, ...options }
    if (typeof original !== 'string' || typeof candidate !== 'string' || bytes(original) > opts.maxBytes || bytes(candidate) > opts.maxBytes) return false
    const value = JSON.parse(original)
    if (!value || typeof value !== 'object' || !withinLimits(value, opts)) return false
    const decoded = candidate.startsWith(prefix) && candidate.endsWith(suffix)
      ? decode(candidate.slice(prefix.length, -suffix.length)) : JSON.parse(candidate)
    return isDeepStrictEqual(value, decoded)
  } catch { return false }
}

export function adaptMessages(messages, options = {}) {
  const opts = { ...defaults, ...options }
  const started = performance.now()
  const metrics = { converted: 0, bytesSaved: 0, tokenSavings: 0, tokenMeasurements: 0, durationMs: 0, cacheHits: 0 }
  let usedToon = false
  const adapted = messages.map(message => {
    if (message?.role !== 'tool' || typeof message.content !== 'string') return message
    const input = message.content
    try {
      if (bytes(input) > opts.maxBytes) return message
      const key = JSON.stringify([input, opts.maxBytes, opts.maxDepth, opts.maxNodes, opts.minSavingsBytes])
      let result = options.encode || options.decode ? undefined : cache.get(key)
      if (result) { metrics.cacheHits++; cache.delete(key); cache.set(key, result) }
      else {
        const value = JSON.parse(input)
        if (!value || typeof value !== 'object' || !withinLimits(value, opts)) return message
        const json = JSON.stringify(value)
        let content = json
        let toonUsed = false
        const toon = (options.encode || encode)(value)
        const marked = prefix + toon + suffix
        if (isDeepStrictEqual((options.decode || decode)(toon), value) && bytes(json) - bytes(marked) >= Math.max(1, opts.minSavingsBytes)) {
          content = marked
          toonUsed = true
        }
        result = { content, toonUsed, json }
        if (!options.encode && !options.decode && opts.cacheEntries > 0) {
          cache.set(key, result)
          while (cache.size > opts.cacheEntries) cache.delete(cache.keys().next().value)
        }
      }
      if (result.toonUsed) {
        usedToon = true
        metrics.converted++
        metrics.bytesSaved += bytes(result.json) - bytes(result.content)
        if (typeof opts.tokenizer === 'function') {
          try {
            const before = opts.tokenizer(result.json), after = opts.tokenizer(result.content)
            if (Number.isFinite(before) && Number.isFinite(after)) { metrics.tokenSavings += before - after; metrics.tokenMeasurements++ }
          } catch { /* optional estimate */ }
        }
      }
      return result.content === input ? message : { ...message, content: result.content }
    } catch { return message }
  })
  metrics.durationMs = performance.now() - started
  return { messages: adapted, usedToon, metrics }
}

export function adaptAgentInput(payload) {
  /** @register_hook agent:input:transform */
  if (!Array.isArray(payload?.messages)) return payload
  const result = adaptMessages(payload.messages, payload.toonOptions)
  if (result.metrics.converted) console.info('[toon-adapter]', JSON.stringify(result.metrics))
  return { ...payload, ...result }
}
