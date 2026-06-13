import type { Exercise } from '../types'

// ──────────────────────────────────────────────
// 私人助教：文字讲解 + 语音播报
//
// 设计为"零配置即可用、有 API key 则增强"：
//  - 文字：默认用内置 steps 拼成讲解；若 /api/coach 可用则用 Claude 生成更自然的口语化指导
//  - 语音：默认用浏览器 Web Speech API（免费、离线）；若 /api/tts 可用则用火山引擎高质量女声
// ──────────────────────────────────────────────

// 用内置数据拼出一段口语化讲解（始终可用的兜底）
export function buildLocalCoaching(ex: Exercise): string {
  const parts: string[] = []
  parts.push(`接下来是${ex.name}，${ex.sets}组，每组${ex.reps}。`)
  if (ex.focus) parts.push(`主要练${ex.focus}。`)
  if (ex.steps?.length) {
    parts.push('动作要领：')
    ex.steps.forEach((s, i) => parts.push(`第${i + 1}，${s}。`))
  } else if (ex.cue) {
    parts.push(ex.cue + '。')
  }
  if (ex.breathing) parts.push(`呼吸：${ex.breathing}。`)
  if (ex.mistakes?.length) parts.push(`注意避免：${ex.mistakes.join('；')}。`)
  if (ex.cervicalNote) parts.push(`颈椎提示：${ex.cervicalNote}。`)
  parts.push('准备好就开始吧，慢一点，把每一次都做标准。')
  return parts.join('')
}

// 尝试用 Claude 生成更自然的指导，失败则回退到本地版本
export async function fetchCoaching(ex: Exercise): Promise<{ text: string; source: 'ai' | 'local' }> {
  try {
    const resp = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise: ex }),
    })
    if (resp.ok) {
      const data = await resp.json()
      if (data.text) return { text: data.text, source: 'ai' }
    }
  } catch {
    /* 网络或未配置 key，忽略 */
  }
  return { text: buildLocalCoaching(ex), source: 'local' }
}

// ——— 语音播报 ———
let currentAudio: HTMLAudioElement | null = null

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

function browserSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') return resolve()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.92
    u.pitch = 1
    const voices = speechSynthesis.getVoices()
    const zh = voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
    if (zh) u.voice = zh
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// 优先火山引擎高质量语音，失败回退浏览器语音
export async function speak(text: string): Promise<'volc' | 'browser'> {
  stopSpeaking()
  try {
    const resp = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (resp.ok && resp.headers.get('content-type')?.includes('audio')) {
      const blob = await resp.blob()
      if (blob.size > 200) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        currentAudio = audio
        await audio.play()
        audio.onended = () => URL.revokeObjectURL(url)
        return 'volc'
      }
    }
  } catch {
    /* 回退浏览器语音 */
  }
  await browserSpeak(text)
  return 'browser'
}
