import { encode, decode } from '@toon-format/toon'
import { isDeepStrictEqual } from 'node:util'

const bytes = text => Buffer.byteLength(text, 'utf8')

// Only complete JSON tool results are eligible. Never touch tool calls or user text.
export function adaptMessages(messages) {
  let usedToon = false
  const adapted = messages.map(message => {
    if (message?.role !== 'tool' || typeof message.content !== 'string') return message
    let value
    try { value = JSON.parse(message.content) } catch { return message }
    if (value === null || typeof value !== 'object') return message
    const json = JSON.stringify(value)
    let content = json
    try {
      const toon = encode(value)
      const marked = `Dados em formato TOON:\n\`\`\`toon\n${toon}\n\`\`\``
      if (isDeepStrictEqual(decode(toon), value) && bytes(marked) < bytes(json)) {
        content = marked
        usedToon = true
      }
    } catch { /* JSON remains the safe fallback */ }
    return { ...message, content }
  })
  return { messages: adapted, usedToon }
}

export function adaptAgentInput(payload) {
  /** @register_hook agent:input:transform */
  if (!Array.isArray(payload?.messages)) return payload
  return { ...payload, ...adaptMessages(payload.messages) }
}
