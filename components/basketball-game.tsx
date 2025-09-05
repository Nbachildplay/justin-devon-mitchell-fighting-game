"use client"
import { useEffect, useRef, useState, useCallback } from "react"

interface Fighter {
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  isAttacking: boolean
  isBlocking: boolean
  attackCooldown: number
  direction: "left" | "right"
  color: string
  name: string
}

interface Punch {
  x: number
  y: number
  width: number
  height: number
  damage: number
  owner: "player1" | "player2"
  active: boolean
}

class BoxingAudio {
  private audioContext: AudioContext | null = null
  private backgroundMusic: HTMLAudioElement | null = null
  private isMuted = false

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.loadCustomMusic()
    } catch (error) {
      console.log("Audio initialization failed:", error)
    }
  }

  private loadCustomMusic() {
    try {
      // INSTRUCTIONS: Save your "Justin Devon Mitchell story.mp3" file in the public folder as "justin-devon-mitchell-story.mp3"
      this.backgroundMusic = new Audio("/justin-devon-mitchell-story.mp3")
      this.backgroundMusic.loop = true
      this.backgroundMusic.volume = 0.3

      this.backgroundMusic.onerror = () => {
        console.log("Custom music file not found, using generated audio")
        this.createBackgroundMusic()
      }
    } catch (error) {
      console.log("Custom music not found, using generated audio")
      this.createBackgroundMusic()
    }
  }

  private createBackgroundMusic() {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)

    oscillator.start()
  }

  playPunch() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playBlock() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.05)
  }

  playKO() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 1)

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 1)
  }

  startBackgroundMusic() {
    if (this.backgroundMusic && !this.isMuted) {
      this.backgroundMusic.play().catch(console.log)
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      this.backgroundMusic.currentTime = 0
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopBackgroundMusic()
    } else {
      this.startBackgroundMusic()
    }
    return this.isMuted
  }
}

export default function BasketballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<BoxingAudio>(new BoxingAudio())
  const animationRef = useRef<number>()
  const gameStateRef = useRef<"menu" | "playing" | "gameOver">("menu")
  const punchesRef = useRef<Punch[]>([])

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [fighter1, setFighter1] = useState<Fighter>({
    x: 150,
    y: 400,
    width: 60,
    height: 100,
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    isBlocking: false,
    attackCooldown: 0,
    direction: "right",
    color: "#FF4444",
    name: "Red Fighter",
  })
  const [fighter2, setFighter2] = useState<Fighter>({
    x: 590,
    y: 400,
    width: 60,
    height: 100,
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    isBlocking: false,
    attackCooldown: 0,
    direction: "left",
    color: "#4444FF",
    name: "Blue Fighter",
  })
  const [winner, setWinner] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [keys, setKeys] = useState<Set<string>>(new Set())

  const startGame = useCallback(() => {
    setGameState("playing")
    gameStateRef.current = "playing"
    setFighter1((prev) => ({ ...prev, health: 100, x: 150, y: 400 }))
    setFighter2((prev) => ({ ...prev, health: 100, x: 590, y: 400 }))
    setWinner("")
    punchesRef.current = []
    audioRef.current.startBackgroundMusic()
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setKeys((prev) => new Set(prev).add(e.key.toLowerCase()))
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setKeys((prev) => {
      const newKeys = new Set(prev)
      newKeys.delete(e.key.toLowerCase())
      return newKeys
    })
  }, [])

  const createPunch = useCallback((fighter: Fighter, isPlayer1: boolean) => {
    const punch: Punch = {
      x: fighter.direction === "right" ? fighter.x + fighter.width : fighter.x - 30,
      y: fighter.y + 30,
      width: 30,
      height: 20,
      damage: 15,
      owner: isPlayer1 ? "player1" : "player2",
      active: true,
    }
    punchesRef.current.push(punch)
    audioRef.current.playPunch()
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || gameStateRef.current !== "playing") {
      animationRef.current = requestAnimationFrame(gameLoop)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      animationRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Clear canvas with boxing ring background
    ctx.fillStyle = "#2D5016"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw boxing ring
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 4
    ctx.strokeRect(50, 350, canvas.width - 100, 200)

    // Ring ropes
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(50, 350 + i * 50)
      ctx.lineTo(canvas.width - 50, 350 + i * 50)
      ctx.stroke()
    }

    // Handle fighter movement and actions
    const currentFighter1 = fighter1
    const currentFighter2 = fighter2

    // Fighter 1 controls (WASD + F to punch, G to block)
    if (keys.has("a") && currentFighter1.x > 60) {
      setFighter1((prev) => ({ ...prev, x: prev.x - 3, direction: "left" }))
    }
    if (keys.has("d") && currentFighter1.x < canvas.width - 120) {
      setFighter1((prev) => ({ ...prev, x: prev.x + 3, direction: "right" }))
    }
    if (keys.has("w") && currentFighter1.y > 360) {
      setFighter1((prev) => ({ ...prev, y: prev.y - 3 }))
    }
    if (keys.has("s") && currentFighter1.y < 480) {
      setFighter1((prev) => ({ ...prev, y: prev.y + 3 }))
    }
    if (keys.has("f") && currentFighter1.attackCooldown <= 0) {
      setFighter1((prev) => ({ ...prev, isAttacking: true, attackCooldown: 30 }))
      createPunch(currentFighter1, true)
    }
    if (keys.has("g")) {
      setFighter1((prev) => ({ ...prev, isBlocking: true }))
    } else {
      setFighter1((prev) => ({ ...prev, isBlocking: false }))
    }

    // Fighter 2 controls (Arrow keys + L to punch, K to block)
    if (keys.has("arrowleft") && currentFighter2.x > 60) {
      setFighter2((prev) => ({ ...prev, x: prev.x - 3, direction: "left" }))
    }
    if (keys.has("arrowright") && currentFighter2.x < canvas.width - 120) {
      setFighter2((prev) => ({ ...prev, x: prev.x + 3, direction: "right" }))
    }
    if (keys.has("arrowup") && currentFighter2.y > 360) {
      setFighter2((prev) => ({ ...prev, y: prev.y - 3 }))
    }
    if (keys.has("arrowdown") && currentFighter2.y < 480) {
      setFighter2((prev) => ({ ...prev, y: prev.y + 3 }))
    }
    if (keys.has("l") && currentFighter2.attackCooldown <= 0) {
      setFighter2((prev) => ({ ...prev, isAttacking: true, attackCooldown: 30 }))
      createPunch(currentFighter2, false)
    }
    if (keys.has("k")) {
      setFighter2((prev) => ({ ...prev, isBlocking: true }))
    } else {
      setFighter2((prev) => ({ ...prev, isBlocking: false }))
    }

    // Update cooldowns
    if (currentFighter1.attackCooldown > 0) {
      setFighter1((prev) => ({
        ...prev,
        attackCooldown: prev.attackCooldown - 1,
        isAttacking: prev.attackCooldown > 25,
      }))
    }
    if (currentFighter2.attackCooldown > 0) {
      setFighter2((prev) => ({
        ...prev,
        attackCooldown: prev.attackCooldown - 1,
        isAttacking: prev.attackCooldown > 25,
      }))
    }

    // Handle punch collisions
    punchesRef.current = punchesRef.current.filter((punch) => {
      if (!punch.active) return false

      const target = punch.owner === "player1" ? currentFighter2 : currentFighter1

      if (
        punch.x < target.x + target.width &&
        punch.x + punch.width > target.x &&
        punch.y < target.y + target.height &&
        punch.y + punch.height > target.y
      ) {
        if (target.isBlocking) {
          audioRef.current.playBlock()
        } else {
          const damage = punch.damage
          if (punch.owner === "player1") {
            setFighter2((prev) => ({ ...prev, health: Math.max(0, prev.health - damage) }))
          } else {
            setFighter1((prev) => ({ ...prev, health: Math.max(0, prev.health - damage) }))
          }
        }
        return false
      }

      return punch.x > 0 && punch.x < canvas.width
    })

    // Draw fighters
    const drawFighter = (fighter: Fighter) => {
      // Body
      ctx.fillStyle = fighter.color
      ctx.fillRect(fighter.x, fighter.y, fighter.width, fighter.height)

      // Head
      ctx.fillStyle = "#F4C2A1"
      ctx.beginPath()
      ctx.arc(fighter.x + fighter.width / 2, fighter.y - 15, 20, 0, Math.PI * 2)
      ctx.fill()

      // Gloves
      ctx.fillStyle = "#8B4513"
      if (fighter.isAttacking) {
        const gloveX = fighter.direction === "right" ? fighter.x + fighter.width + 5 : fighter.x - 25
        ctx.fillRect(gloveX, fighter.y + 20, 20, 15)
      } else {
        ctx.fillRect(fighter.x + (fighter.direction === "right" ? fighter.width - 10 : -10), fighter.y + 30, 15, 15)
      }

      // Block indicator
      if (fighter.isBlocking) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)"
        ctx.fillRect(fighter.x - 5, fighter.y - 5, fighter.width + 10, fighter.height + 10)
      }
    }

    drawFighter(currentFighter1)
    drawFighter(currentFighter2)

    // Draw punches
    ctx.fillStyle = "#FFD700"
    punchesRef.current.forEach((punch) => {
      if (punch.active) {
        ctx.fillRect(punch.x, punch.y, punch.width, punch.height)
      }
    })

    // Check for winner
    if (currentFighter1.health <= 0 && !winner) {
      setWinner(currentFighter2.name)
      setGameState("gameOver")
      audioRef.current.playKO()
      audioRef.current.stopBackgroundMusic()
    } else if (currentFighter2.health <= 0 && !winner) {
      setWinner(currentFighter1.name)
      setGameState("gameOver")
      audioRef.current.playKO()
      audioRef.current.stopBackgroundMusic()
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [fighter1, fighter2, keys, winner, createPunch])

  useEffect(() => {
    audioRef.current.initialize()

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    gameStateRef.current = gameState
    if (gameState === "playing") {
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, gameLoop])

  const toggleMute = () => {
    const muted = audioRef.current.toggleMute()
    setIsMuted(muted)
  }

  if (gameState === "menu") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">🥊</h1>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Boxing Battle Arena</h2>
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-xl md:text-2xl font-bold text-yellow-300">Created by</p>
            <p className="text-2xl md:text-3xl font-bold text-white">JUSTIN DEVON MITCHELL</p>
          </div>
          <div className="text-sm md:text-lg opacity-90 space-y-2">
            <p>
              <strong>Player 1:</strong> WASD to move, F to punch, G to block
            </p>
            <p>
              <strong>Player 2:</strong> Arrow keys to move, L to punch, K to block
            </p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-white text-red-600 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors mb-4"
        >
          Start Fight!
        </button>

        <button
          onClick={toggleMute}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-400 transition-colors"
        >
          {isMuted ? "🔇" : "🔊"} Sound
        </button>
      </div>
    )
  }

  if (gameState === "gameOver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">KNOCKOUT!</h2>
          <div className="text-lg md:text-2xl mb-6">
            <p className="text-3xl font-bold">{winner} WINS!</p>
          </div>
          <div className="mt-4 bg-white/20 rounded-lg p-3">
            <p className="text-sm md:text-lg font-bold text-yellow-900">Game by Justin Devon Mitchell</p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-white text-yellow-600 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors"
        >
          Fight Again!
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-2 md:p-4">
      <div className="flex flex-wrap justify-between items-center w-full max-w-4xl mb-4 bg-white rounded-lg p-2 md:p-4 shadow-lg text-sm md:text-base">
        <div className="flex items-center space-x-4">
          <div className="text-red-600 font-bold">
            Red: {fighter1.health}/100
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(fighter1.health / fighter1.maxHealth) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-blue-600 font-bold">
            Blue: {fighter2.health}/100
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(fighter2.health / fighter2.maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="text-xs md:text-sm text-gray-600">by J.D. Mitchell</div>
        <button
          onClick={toggleMute}
          className="bg-red-500 text-white px-2 md:px-3 py-1 rounded hover:bg-red-400 transition-colors text-sm"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      <canvas ref={canvasRef} width={800} height={600} className="border-4 border-white rounded-lg max-w-full h-auto" />

      <div className="mt-4 text-center text-white text-sm md:text-base bg-black/50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-red-400">Red Fighter (Player 1)</p>
            <p>WASD: Move | F: Punch | G: Block</p>
          </div>
          <div>
            <p className="font-bold text-blue-400">Blue Fighter (Player 2)</p>
            <p>Arrows: Move | L: Punch | K: Block</p>
          </div>
        </div>
      </div>
    </div>
  )
}
