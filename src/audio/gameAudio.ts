export type AudioScene = 'none' | 'overworld' | 'battle' | 'menu'
export type AudioSfx =
  | 'encounter'
  | 'menu-open'
  | 'menu-close'
  | 'confirm'
  | 'attack'
  | 'hit'
  | 'faint'
  | 'heal'

type ToneStep = {
  freq: number
  duration: number
  gain?: number
  type?: OscillatorType
}

const BGM_PATTERNS: Record<Exclude<AudioScene, 'none'>, ToneStep[]> = {
  overworld: [
    { freq: 392.0, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 493.88, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 587.33, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 493.88, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 0, duration: 140 },
    { freq: 349.23, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 440.0, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 523.25, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 440.0, duration: 240, gain: 0.04, type: 'triangle' },
    { freq: 0, duration: 140 },
  ],
  battle: [
    { freq: 293.66, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 440.0, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 587.33, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 440.0, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 329.63, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 493.88, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 659.25, duration: 110, gain: 0.07, type: 'sawtooth' },
    { freq: 493.88, duration: 110, gain: 0.07, type: 'sawtooth' },
  ],
  menu: [
    { freq: 440.0, duration: 220, gain: 0.04, type: 'triangle' },
    { freq: 523.25, duration: 220, gain: 0.04, type: 'triangle' },
    { freq: 659.25, duration: 220, gain: 0.04, type: 'triangle' },
    { freq: 523.25, duration: 220, gain: 0.04, type: 'triangle' },
    { freq: 0, duration: 120 },
  ],
}

class GameAudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bgmTimer: number | null = null
  private bgmStepIndex = 0
  private bgmLoopToken = 0
  private scene: AudioScene = 'none'
  private enabled = true
  private unlocked = false
  private readonly baseVolume = 0.12

  private ensureContext() {
    if (this.context) return this.context
    if (typeof window === 'undefined') return null

    const AudioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null

    this.context = new AudioCtor()
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = this.enabled ? this.baseVolume : 0
    this.masterGain.connect(this.context.destination)
    return this.context
  }

  private playTone(step: ToneStep, offsetMs = 0) {
    const context = this.ensureContext()
    if (!context || !this.masterGain || !this.enabled || !this.unlocked) return
    if (step.freq <= 0 || step.duration <= 0) return

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const startTime = context.currentTime + offsetMs / 1000
    const endTime = startTime + step.duration / 1000
    const gain = step.gain ?? 0.05

    oscillator.type = step.type ?? 'square'
    oscillator.frequency.setValueAtTime(step.freq, startTime)

    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime)

    oscillator.connect(gainNode)
    gainNode.connect(this.masterGain)
    oscillator.start(startTime)
    oscillator.stop(endTime + 0.02)
  }

  private playSequence(steps: ToneStep[]) {
    if (!this.enabled || !this.unlocked) return
    let offset = 0
    for (const step of steps) {
      this.playTone(step, offset)
      offset += Math.max(20, step.duration)
    }
  }

  private stopBgm() {
    if (typeof window === 'undefined') return
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  private tickBgm = (loopToken: number) => {
    if (loopToken !== this.bgmLoopToken) return
    if (!this.enabled || !this.unlocked || this.scene === 'none') return
    const pattern = BGM_PATTERNS[this.scene]
    if (!pattern?.length) return

    const step = pattern[this.bgmStepIndex % pattern.length]
    if (!step) return
    this.playTone(step)
    this.bgmStepIndex += 1
    this.bgmTimer = window.setTimeout(() => this.tickBgm(loopToken), Math.max(40, step.duration))
  }

  private startBgmLoop(resetPattern = true) {
    this.stopBgm()
    if (!this.enabled || !this.unlocked || this.scene === 'none') return
    if (resetPattern) this.bgmStepIndex = 0
    this.bgmLoopToken += 1
    this.tickBgm(this.bgmLoopToken)
  }

  private restartBgm() {
    this.startBgmLoop(true)
  }

  unlock() {
    const context = this.ensureContext()
    if (!context) return

    if (this.unlocked && context.state === 'running') return

    void context
      .resume()
      .then(() => {
        if (!this.unlocked) {
          this.unlocked = true
          this.restartBgm()
          return
        }
        // If context resumes from suspended state, continue current BGM without resetting pattern.
        if (this.bgmTimer === null && this.scene !== 'none') {
          this.startBgmLoop(false)
        }
      })
      .catch(() => {
        // Ignore browser resume errors.
      })
  }

  setScene(scene: AudioScene) {
    if (scene === this.scene) return
    this.scene = scene
    this.restartBgm()
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    const context = this.ensureContext()
    if (context && this.masterGain) {
      this.masterGain.gain.setValueAtTime(enabled ? this.baseVolume : 0, context.currentTime)
    }
    if (!enabled) this.stopBgm()
    else this.startBgmLoop(false)
  }

  playSfx(sfx: AudioSfx) {
    if (!this.enabled || !this.unlocked) return

    switch (sfx) {
      case 'encounter':
        this.playSequence([
          { freq: 440, duration: 70, gain: 0.07, type: 'sawtooth' },
          { freq: 659.25, duration: 70, gain: 0.07, type: 'sawtooth' },
          { freq: 880, duration: 90, gain: 0.07, type: 'sawtooth' },
        ])
        break
      case 'menu-open':
        this.playSequence([
          { freq: 523.25, duration: 60, gain: 0.06, type: 'triangle' },
          { freq: 783.99, duration: 60, gain: 0.06, type: 'triangle' },
        ])
        break
      case 'menu-close':
        this.playSequence([
          { freq: 783.99, duration: 50, gain: 0.05, type: 'triangle' },
          { freq: 523.25, duration: 60, gain: 0.05, type: 'triangle' },
        ])
        break
      case 'confirm':
        this.playSequence([{ freq: 987.77, duration: 70, gain: 0.06, type: 'triangle' }])
        break
      case 'attack':
        this.playSequence([{ freq: 392, duration: 60, gain: 0.06, type: 'square' }])
        break
      case 'hit':
        this.playSequence([{ freq: 146.83, duration: 80, gain: 0.07, type: 'square' }])
        break
      case 'faint':
        this.playSequence([
          { freq: 329.63, duration: 90, gain: 0.06, type: 'triangle' },
          { freq: 246.94, duration: 90, gain: 0.06, type: 'triangle' },
          { freq: 196.0, duration: 110, gain: 0.06, type: 'triangle' },
        ])
        break
      case 'heal':
        this.playSequence([
          { freq: 659.25, duration: 80, gain: 0.06, type: 'triangle' },
          { freq: 783.99, duration: 80, gain: 0.06, type: 'triangle' },
          { freq: 987.77, duration: 120, gain: 0.06, type: 'triangle' },
        ])
        break
    }
  }
}

export const gameAudio = new GameAudioEngine()
