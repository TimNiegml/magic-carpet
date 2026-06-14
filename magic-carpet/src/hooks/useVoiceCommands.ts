import { useEffect, useRef } from 'react'

export type VoiceCommand = 'next' | 'prev' | 'pause' | 'resume'

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

function matchCommand(t: string): VoiceCommand | null {
  // 先匹配"下一个"，避免"继续"歧义
  if (/(下一个|下一组|下个|下一|完成|做完|好了|过了|换下)/.test(t)) return 'next'
  if (/(上一个|上一组|上个|返回|后退|退回)/.test(t)) return 'prev'
  if (/(暂停|停一下|停下|等一下|等等)/.test(t)) return 'pause'
  if (/(开始|继续|计时|走起|走)/.test(t)) return 'resume'
  return null
}

/**
 * 监听中文语音指令（"下一个 / 上一个 / 暂停 / 继续"）。
 * 仅在 Chrome / Edge 等支持 Web Speech API 的浏览器可用，需 HTTPS + 麦克风授权。
 */
export function useVoiceCommands(
  enabled: boolean,
  onCommand: (cmd: VoiceCommand, raw: string) => void,
) {
  const recRef = useRef<any>(null)
  const cbRef = useRef(onCommand)
  cbRef.current = onCommand

  useEffect(() => {
    if (!enabled) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.continuous = true
    rec.interimResults = false

    rec.onresult = (e: any) => {
      const r = e.results[e.results.length - 1]
      if (!r || !r.isFinal) return
      const t = (r[0]?.transcript || '').trim()
      if (!t) return
      const cmd = matchCommand(t)
      if (cmd) cbRef.current(cmd, t)
    }
    rec.onerror = () => {}
    rec.onend = () => {
      // 持续监听：除非被显式关闭，否则自动重启
      if (recRef.current === rec) {
        try {
          rec.start()
        } catch {
          /* already started */
        }
      }
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      /* ignore */
    }

    return () => {
      recRef.current = null
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }, [enabled])
}

// 用 Web Audio 合成"叮叮"提示音，无需音频文件
export function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ac = new Ctx()
    const beep = (freq: number, at: number, dur: number) => {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.connect(g)
      g.connect(ac.destination)
      o.type = 'sine'
      o.frequency.value = freq
      const t0 = ac.currentTime + at
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.start(t0)
      o.stop(t0 + dur + 0.02)
    }
    beep(880, 0, 0.45)
    beep(1175, 0.22, 0.5)
    setTimeout(() => ac.close().catch(() => {}), 1200)
  } catch {
    /* ignore */
  }
}
