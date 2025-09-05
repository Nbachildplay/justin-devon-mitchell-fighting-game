"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  speed: number
}

interface Player extends GameObject {
  health: number
}

interface Enemy extends GameObject {
  type: "basic" | "fast"
}

interface Bullet extends GameObject {
  isPlayerBullet: boolean
}

interface Coin extends GameObject {
  value: number
  rotation: number
}

interface Explosion {
  x: number
  y: number
  frame: number
}

interface Trophy {
  id: string
  name: string
  description: string
  scoreRequired: number
  earned: boolean
  icon: string
}

interface DrumStick {
  x: number
  y: number
  rotation: number
  length: number
  isDragging: boolean
}

class GameAudio {
  private audioContext: AudioContext | null = null
  private backgroundMusic: HTMLAudioElement | null = null
  private isMuted = false
  private musicGainNode: GainNode | null = null
  private ambientOscillator: OscillatorNode | null = null

  async init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      this.setupBackgroundMusic()
      this.createMusicalAmbience()
    } catch (error) {
      console.log("Audio initialization failed:", error)
    }
  }

  private setupBackgroundMusic() {
    if (!this.audioContext) return

    this.musicGainNode = this.audioContext.createGain()
    this.musicGainNode.connect(this.audioContext.destination)
    this.musicGainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime)

    this.backgroundMusic = new Audio()
    this.backgroundMusic.loop = true
    this.backgroundMusic.volume = 0.4
    this.backgroundMusic.crossOrigin = "anonymous"

    this.createProceduralMusic()
  }

  private createMusicalAmbience() {
    if (!this.audioContext || !this.musicGainNode) return

    const frequencies = [220, 330, 440, 550] // A3, E4, A4, C#5 - A major chord progression

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.musicGainNode!)

      oscillator.type = index % 2 === 0 ? "sine" : "triangle"
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      gainNode.gain.setValueAtTime(0.03, this.audioContext!.currentTime)

      oscillator.start()

      setInterval(
        () => {
          if (this.audioContext && !this.isMuted) {
            const variation = Math.sin(Date.now() / (2000 + index * 500)) * 5
            oscillator.frequency.setValueAtTime(freq + variation, this.audioContext.currentTime)
          }
        },
        100 + index * 50,
      )
    })
  }

  private createProceduralMusic() {
    if (!this.audioContext || !this.musicGainNode) return

    const notes = [440, 494, 523, 587, 659, 698, 784, 880] // A4 to A5 scale
    let currentNoteIndex = 0

    const playNote = () => {
      if (this.isMuted || !this.audioContext || !this.musicGainNode) return

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(this.musicGainNode)

      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(notes[currentNoteIndex], this.audioContext.currentTime)

      filter.type = "lowpass"
      filter.frequency.setValueAtTime(2000, this.audioContext.currentTime)

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.5)

      currentNoteIndex = (currentNoteIndex + 1) % notes.length
    }

    setInterval(playNote, 800)
  }

  loadCustomMusic(audioUrl: string) {
    if (this.backgroundMusic) {
      this.backgroundMusic.src = audioUrl
      this.backgroundMusic.load()

      this.backgroundMusic.addEventListener("canplaythrough", () => {
        if (!this.isMuted) {
          this.backgroundMusic?.play().catch(console.log)
        }
      })
    }
  }

  playShootSound() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playExplosionSound() {
    if (!this.audioContext || this.isMuted) return

    const bufferSize = this.audioContext.sampleRate * 0.3
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const output = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }

    const noise = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    noise.buffer = buffer
    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1000, this.audioContext.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3)

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

    noise.start(this.audioContext.currentTime)
    noise.stop(this.audioContext.currentTime + 0.3)
  }

  playHitSound() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.2)
  }

  playCoinSound() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1)
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.2)
  }

  playDrumHit() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3)

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.backgroundMusic) {
      this.backgroundMusic.muted = this.isMuted
      if (this.isMuted) {
        this.backgroundMusic.pause()
      } else {
        this.backgroundMusic.play().catch(console.log)
      }
    }

    if (this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.audioContext?.currentTime || 0)
    }

    return this.isMuted
  }

  resume() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume()
    }

    if (this.backgroundMusic && !this.isMuted) {
      this.backgroundMusic.play().catch(console.log)
    }
  }
}

export default function AirplaneGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<GameAudio>(new GameAudio())

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [coinsCollected, setCoinsCollected] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [trophies, setTrophies] = useState<Trophy[]>([
    {
      id: "bronze",
      name: "Sky Rookie",
      description: "Score 100 points",
      scoreRequired: 100,
      earned: false,
      icon: "🥉",
    },
    { id: "silver", name: "Ace Pilot", description: "Score 500 points", scoreRequired: 500, earned: false, icon: "🥈" },
    {
      id: "gold",
      name: "Sky Master",
      description: "Score 1000 points",
      scoreRequired: 1000,
      earned: false,
      icon: "🥇",
    },
    {
      id: "platinum",
      name: "Legend",
      description: "Score 2000 points",
      scoreRequired: 2000,
      earned: false,
      icon: "🏆",
    },
    {
      id: "diamond",
      name: "Sky God",
      description: "Score 5000 points",
      scoreRequired: 5000,
      earned: false,
      icon: "💎",
    },
  ])
  const [newTrophyEarned, setNewTrophyEarned] = useState<Trophy | null>(null)

  const [drumSticks, setDrumSticks] = useState<DrumStick[]>([
    { x: 100, y: 400, rotation: 0, length: 80, isDragging: false },
    { x: 700, y: 400, rotation: 0, length: 80, isDragging: false },
  ])

  const playerRef = useRef<Player>({
    x: 400,
    y: 500,
    width: 40,
    height: 30,
    speed: 5,
    health: 3,
  })

  const enemiesRef = useRef<Enemy[]>([])
  const bulletsRef = useRef<Bullet[]>([])
  const coinsRef = useRef<Coin[]>([])
  const explosionsRef = useRef<Explosion[]>([])
  const lastEnemySpawnRef = useRef(0)
  const lastCoinSpawnRef = useRef(0)
  const gameTimeRef = useRef(0)

  useEffect(() => {
    audioRef.current.init()
  }, [])

  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    playerRef.current = {
      x: canvas.width / 2 - 20,
      y: canvas.height - 80,
      width: 40,
      height: 30,
      speed: 5,
      health: 3,
    }

    enemiesRef.current = []
    bulletsRef.current = []
    coinsRef.current = []
    explosionsRef.current = []
    lastEnemySpawnRef.current = 0
    lastCoinSpawnRef.current = 0
    gameTimeRef.current = 0
    setScore(0)
    setCoinsCollected(0)
  }, [])

  const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    )
  }

  const spawnEnemy = (canvas: HTMLCanvasElement) => {
    const now = Date.now()
    const spawnRate = Math.max(600 - Math.floor(gameTimeRef.current / 8000) * 80, 200)

    if (now - lastEnemySpawnRef.current > spawnRate) {
      const enemyType = Math.random() < 0.6 ? "basic" : "fast"
      const enemy: Enemy = {
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 25,
        speed: enemyType === "fast" ? 4 : 2,
        type: enemyType,
      }
      enemiesRef.current.push(enemy)
      lastEnemySpawnRef.current = now
    }
  }

  const spawnCoin = (canvas: HTMLCanvasElement) => {
    const now = Date.now()
    const coinSpawnRate = 2000 // Spawn coins every 2 seconds

    if (now - lastCoinSpawnRef.current > coinSpawnRate) {
      const coin: Coin = {
        x: Math.random() * (canvas.width - 20),
        y: -20,
        width: 20,
        height: 20,
        speed: 2,
        value: 50,
        rotation: 0,
      }
      coinsRef.current.push(coin)
      lastCoinSpawnRef.current = now
    }
  }

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(1, "#E0F6FF")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const player = playerRef.current
    const enemies = enemiesRef.current
    const bullets = bulletsRef.current
    const coins = coinsRef.current
    const explosions = explosionsRef.current

    const moveSpeed = 7 // Increased speed for better responsiveness

    if (keysRef.current.has("ArrowLeft") && player.x > 0) {
      player.x = Math.max(0, player.x - moveSpeed)
    }
    if (keysRef.current.has("ArrowRight") && player.x < canvas.width - player.width) {
      player.x = Math.min(canvas.width - player.width, player.x + moveSpeed)
    }
    if (keysRef.current.has("ArrowUp") && player.y > 0) {
      player.y = Math.max(0, player.y - moveSpeed)
    }
    if (keysRef.current.has("ArrowDown") && player.y < canvas.height - player.height) {
      player.y = Math.min(canvas.height - player.height, player.y + moveSpeed)
    }

    if (keysRef.current.has("KeyA") && player.x > 0) {
      player.x = Math.max(0, player.x - moveSpeed)
    }
    if (keysRef.current.has("KeyD") && player.x < canvas.width - player.width) {
      player.x = Math.min(canvas.width - player.width, player.x + moveSpeed)
    }
    if (keysRef.current.has("KeyW") && player.y > 0) {
      player.y = Math.max(0, player.y - moveSpeed)
    }
    if (keysRef.current.has("KeyS") && player.y < canvas.height - player.height) {
      player.y = Math.min(canvas.height - player.height, player.y + moveSpeed)
    }

    spawnEnemy(canvas)
    spawnCoin(canvas)
    gameTimeRef.current += 16

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]
      if (bullet.isPlayerBullet) {
        bullet.y -= bullet.speed
        if (bullet.y < 0) {
          bullets.splice(i, 1)
        }
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i]
      enemy.y += enemy.speed

      if (enemy.y > canvas.height) {
        enemies.splice(i, 1)
        continue
      }

      if (checkCollision(player, enemy)) {
        enemies.splice(i, 1)
        explosions.push({ x: enemy.x, y: enemy.y, frame: 0 })
        audioRef.current.playHitSound()
        player.health--

        if (player.health <= 0) {
          setGameState("gameOver")
          if (score > highScore) {
            setHighScore(score)
          }
          return
        }
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]
      if (!bullet.isPlayerBullet) continue

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j]
        if (checkCollision(bullet, enemy)) {
          bullets.splice(i, 1)
          enemies.splice(j, 1)
          explosions.push({ x: enemy.x, y: enemy.y, frame: 0 })
          audioRef.current.playExplosionSound()
          const newScore = score + (enemy.type === "fast" ? 20 : 10)
          setScore(newScore)
          checkTrophies(newScore)
          break
        }
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i]
      coin.y += coin.speed
      coin.rotation += 0.1 // Rotate coins for visual appeal

      if (coin.y > canvas.height) {
        coins.splice(i, 1)
        continue
      }

      if (checkCollision(player, coin)) {
        coins.splice(i, 1)
        audioRef.current.playCoinSound()
        const newScore = score + coin.value
        setScore(newScore)
        checkTrophies(newScore)
        setCoinsCollected((prev) => prev + 1)
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].frame++
      if (explosions[i].frame > 10) {
        explosions.splice(i, 1)
      }
    }

    ctx.save()

    // Player airplane body (blue)
    ctx.fillStyle = "#2563eb"
    ctx.fillRect(player.x + 15, player.y + 5, 10, 20)

    // Player airplane wings (darker blue)
    ctx.fillStyle = "#1d4ed8"
    ctx.fillRect(player.x, player.y + 10, 40, 8)

    // Player airplane nose (light blue)
    ctx.fillStyle = "#60a5fa"
    ctx.fillRect(player.x + 17, player.y, 6, 8)

    // Player airplane tail (dark blue)
    ctx.fillStyle = "#1e40af"
    ctx.fillRect(player.x + 12, player.y + 22, 16, 6)

    // Player airplane propeller (yellow)
    ctx.fillStyle = "#fbbf24"
    ctx.fillRect(player.x + 18, player.y - 2, 4, 4)

    // Player airplane outline (black)
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.strokeRect(player.x, player.y, player.width, player.height)

    ctx.restore()

    enemies.forEach((enemy) => {
      ctx.save()

      // Enemy airplane body
      ctx.fillStyle = enemy.type === "fast" ? "#dc2626" : "#7c2d12"
      ctx.fillRect(enemy.x + 10, enemy.y + 5, 10, 15)

      // Enemy airplane wings
      ctx.fillStyle = enemy.type === "fast" ? "#b91c1c" : "#92400e"
      ctx.fillRect(enemy.x, enemy.y + 8, 30, 6)

      // Enemy airplane nose
      ctx.fillStyle = enemy.type === "fast" ? "#ef4444" : "#a16207"
      ctx.fillRect(enemy.x + 12, enemy.y + 18, 6, 5)

      // Enemy airplane tail
      ctx.fillStyle = enemy.type === "fast" ? "#991b1b" : "#713f12"
      ctx.fillRect(enemy.x + 8, enemy.y + 2, 14, 5)

      // Enemy airplane propeller
      ctx.fillStyle = "#374151"
      ctx.fillRect(enemy.x + 13, enemy.y + 20, 4, 3)

      // Enemy airplane outline
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 1
      ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height)

      ctx.restore()
    })

    bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.isPlayerBullet ? "#fbbf24" : "#ef4444"
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      if (bullet.isPlayerBullet) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.5)"
        ctx.fillRect(bullet.x - 1, bullet.y + 5, bullet.width + 2, bullet.height)
      }
    })

    coins.forEach((coin) => {
      ctx.save()
      ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2)
      ctx.rotate(coin.rotation)

      ctx.fillStyle = "#ffd700"
      ctx.fillRect(-coin.width / 2, -coin.height / 2, coin.width, coin.height)

      ctx.fillStyle = "#ffed4e"
      ctx.fillRect(-coin.width / 2 + 3, -coin.height / 2 + 3, coin.width - 6, coin.height - 6)

      ctx.fillStyle = "#d97706"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("$", 0, 4)

      ctx.restore()
    })

    explosions.forEach((explosion) => {
      const size = 30 - explosion.frame * 3
      const alpha = 1 - explosion.frame / 10

      ctx.fillStyle = `rgba(255, ${100 + explosion.frame * 10}, 0, ${alpha})`
      ctx.fillRect(explosion.x - size / 2, explosion.y - size / 2, size, size)

      ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.7})`
      ctx.fillRect(explosion.x - size / 3, explosion.y - size / 3, size / 1.5, size / 1.5)
    })

    drumSticks.forEach((stick, index) => {
      ctx.save()
      ctx.translate(stick.x, stick.y)
      ctx.rotate(stick.rotation)

      ctx.fillStyle = "#8B4513"
      ctx.fillRect(-5, -5, stick.length, 10)

      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.arc(stick.length, 0, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#654321"
      ctx.fillRect(-5, -3, 20, 6)

      ctx.restore()

      if (stick.isDragging) {
        const endX = stick.x + Math.cos(stick.rotation) * stick.length
        const endY = stick.y + Math.sin(stick.rotation) * stick.length

        ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(endX, endY, 30, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
  }, [gameState, score, coinsCollected, highScore, drumSticks])

  const handleDrumStickMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    setDrumSticks((prev) => prev.map((stick, i) => (i === index ? { ...stick, isDragging: true } : stick)))
  }, [])

  const handleDrumStickMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setDrumSticks((prev) =>
      prev.map((stick) => {
        if (stick.isDragging) {
          const centerX = mouseX
          const centerY = mouseY
          const rotation = Math.atan2(mouseY - stick.y, mouseX - stick.x)

          return { ...stick, x: centerX, y: centerY, rotation }
        }
        return stick
      }),
    )
  }, [])

  const handleDrumStickMouseUp = useCallback(() => {
    setDrumSticks((prev) => prev.map((stick) => ({ ...stick, isDragging: false })))
  }, [])

  const handleDrumHit = useCallback(
    (stickIndex: number) => {
      audioRef.current.playDrumHit()

      const stick = drumSticks[stickIndex]
      const stickEndX = stick.x + Math.cos(stick.rotation) * stick.length
      const stickEndY = stick.y + Math.sin(stick.rotation) * stick.length

      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        const distance = Math.sqrt(
          Math.pow(stickEndX - (enemy.x + enemy.width / 2), 2) + Math.pow(stickEndY - (enemy.y + enemy.height / 2), 2),
        )

        if (distance < 30) {
          explosionsRef.current.push({ x: enemy.x, y: enemy.y, frame: 0 })
          audioRef.current.playExplosionSound()
          const newScore = score + (enemy.type === "fast" ? 30 : 15)
          setScore(newScore)
          checkTrophies(newScore)
          return false
        }
        return true
      })
    },
    [drumSticks, score],
  )

  const toggleMute = () => {
    const muted = audioRef.current.toggleMute()
    setIsMuted(muted)
  }

  const checkTrophies = useCallback((currentScore: number) => {
    setTrophies((prev) => {
      const updated = prev.map((trophy) => {
        if (!trophy.earned && currentScore >= trophy.scoreRequired) {
          setNewTrophyEarned(trophy)
          // Clear trophy notification after 3 seconds
          setTimeout(() => setNewTrophyEarned(null), 3000)
          return { ...trophy, earned: true }
        }
        return trophy
      })
      return updated
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)

      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault()
        const player = playerRef.current
        bulletsRef.current.push({
          x: player.x + player.width / 2 - 2,
          y: player.y,
          width: 4,
          height: 10,
          speed: 8,
          isPlayerBullet: true,
        })
        audioRef.current.playShootSound()
      }

      if (e.code === "KeyM") {
        const muted = audioRef.current.toggleMute()
        setIsMuted(muted)
      }

      if (e.code === "KeyQ") {
        handleDrumHit(0) // Left drum stick
      }
      if (e.code === "KeyE") {
        handleDrumHit(1) // Right drum stick
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("mousemove", handleDrumStickMouseMove)
    window.addEventListener("mouseup", handleDrumStickMouseUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("mousemove", handleDrumStickMouseMove)
      window.removeEventListener("mouseup", handleDrumStickMouseUp)
    }
  }, [gameState, handleDrumStickMouseMove, handleDrumStickMouseUp, handleDrumHit])

  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    } else if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, gameLoop])

  const startGame = () => {
    audioRef.current.resume()
    initGame()
    setGameState("playing")
    setNewTrophyEarned(null)

    if (!isMuted) {
      // To add your song:
      // 1. Save your MP3 as "justin-devon-mitchell-story.mp3" in the public folder
      // 2. Uncomment the line below:
      // audioRef.current.loadCustomMusic("/justin-devon-mitchell-story.mp3")
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="p-6 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Sky Fighter</h1>
          <div className="flex gap-2">
            <Button onClick={toggleMute} variant="outline" size="sm" className="ml-4 bg-transparent">
              {isMuted ? "🔇" : "🔊"}
            </Button>
          </div>
        </div>

        {gameState === "menu" && (
          <div className="text-center space-y-4">
            <p className="text-gray-600 font-semibold">🚀 INTENSE AIRPLANE BATTLE! 🚀</p>
            <p className="text-gray-600">Use arrow keys OR WASD to move, spacebar to shoot!</p>
            <p className="text-sm text-gray-500">Collect golden coins for bonus points! Press M to toggle sound</p>
            <p className="text-sm text-blue-600">🥁 Drag drum sticks to position them, Q/E to hit enemies!</p>

            <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
              <p className="font-semibold">🏆 TROPHY ACHIEVEMENTS:</p>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {trophies.map((trophy) => (
                  <div
                    key={trophy.id}
                    className={`flex items-center gap-1 ${trophy.earned ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{trophy.icon}</span>
                    <span className="text-xs">
                      {trophy.name} ({trophy.scoreRequired}pts)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-700 bg-red-50 p-3 rounded border">
              <p className="font-semibold">⚔️ BATTLE MECHANICS:</p>
              <p>• Fast enemies (red) = 20 points • Basic enemies (brown) = 10 points</p>
              <p>• Drum stick hits = 30/15 bonus points • Golden coins = 50 points</p>
              <p>• Survive the increasingly intense enemy waves!</p>
            </div>
            <Button onClick={startGame} size="lg">
              Start Game
            </Button>
            {highScore > 0 && <p className="text-sm text-gray-500">High Score: {highScore}</p>}
            <div className="text-xs text-center mt-4 text-gray-500 bg-gray-100 p-2 rounded">
              Created by <span className="font-semibold text-blue-600">Justin Devon Mitchell</span>
            </div>
          </div>
        )}

        {gameState === "gameOver" && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">Game Over!</h2>
            <p className="text-gray-600">Final Score: {score}</p>
            <p className="text-gray-600">Coins Collected: {coinsCollected}</p>

            <div className="bg-yellow-50 p-3 rounded border">
              <p className="font-semibold text-yellow-700">🏆 Trophies Earned:</p>
              <div className="flex justify-center gap-2 mt-2">
                {trophies
                  .filter((t) => t.earned)
                  .map((trophy) => (
                    <span key={trophy.id} className="text-2xl" title={trophy.name}>
                      {trophy.icon}
                    </span>
                  ))}
                {trophies.filter((t) => t.earned).length === 0 && (
                  <span className="text-gray-500 text-sm">No trophies earned yet</span>
                )}
              </div>
            </div>

            {score === highScore && score > 0 && <p className="text-green-600 font-semibold">New High Score! 🎉</p>}
            <Button onClick={startGame} size="lg">
              Play Again
            </Button>
            <div className="text-xs text-center mt-4 text-gray-500">
              Created by <span className="font-semibold text-blue-600">Justin Devon Mitchell</span>
            </div>
          </div>
        )}
      </Card>

      {newTrophyEarned && (
        <div className="fixed top-4 right-4 bg-yellow-400 text-black p-4 rounded-lg shadow-lg border-2 border-yellow-600 animate-bounce z-50">
          <div className="text-center">
            <div className="text-3xl mb-2">{newTrophyEarned.icon}</div>
            <div className="font-bold">Trophy Earned!</div>
            <div className="text-sm">{newTrophyEarned.name}</div>
            <div className="text-xs text-gray-700">{newTrophyEarned.description}</div>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-4 border-white rounded-lg shadow-2xl bg-gradient-to-b from-sky-300 to-sky-500"
          style={{ display: gameState === "playing" ? "block" : "none" }}
        />

        {gameState === "playing" &&
          drumSticks.map((stick, index) => (
            <div
              key={index}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: stick.x - 10,
                top: stick.y - 10,
                width: 20,
                height: 20,
                transform: `rotate(${stick.rotation}rad)`,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => handleDrumStickMouseDown(index, e)}
            >
              <div className="w-full h-full bg-transparent hover:bg-yellow-300/30 rounded-full border-2 border-yellow-400/50" />
            </div>
          ))}
      </div>

      {gameState === "playing" && (
        <div className="text-white text-center">
          <p className="text-sm">Arrow Keys OR WASD: Move | Spacebar: Shoot | M: Toggle Sound | Q/E: Drum Hits</p>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <span>Score: {score}</span>
            <span>Coins: {coinsCollected}</span>
            <span>
              Trophies: {trophies.filter((t) => t.earned).length}/{trophies.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
