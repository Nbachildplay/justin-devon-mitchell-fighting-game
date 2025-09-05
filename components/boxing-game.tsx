"use client"
import { useEffect, useRef, useState, useCallback } from "react"

interface Fighter {
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  color: string
  name: string
  isAttacking: boolean
  attackCooldown: number
  direction: number // 1 for right, -1 for left
}

interface Punch {
  x: number
  y: number
  width: number
  height: number
  damage: number
  owner: string
  active: boolean
}

class BoxingAudio {
  private audioContext: AudioContext | null = null
  private isMuted = false

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.log("Audio initialization failed:", error)
    }
  }

  playPunch() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playHit() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.2)
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    return this.isMuted
  }
}

export default function BoxingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<BoxingAudio>(new BoxingAudio())
  const animationRef = useRef<number>()

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [winner, setWinner] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [round, setRound] = useState(1)

  const fighter1Ref = useRef<Fighter>({
    x: 100,
    y: 300,
    width: 60,
    height: 120,
    health: 100,
    maxHealth: 100,
    color: "#FF4444",
    name: "Red Fighter",
    isAttacking: false,
    attackCooldown: 0,
    direction: 1,
  })

  const fighter2Ref = useRef<Fighter>({
    x: 640,
    y: 300,
    width: 60,
    height: 120,
    health: 100,
    maxHealth: 100,
    color: "#4444FF",
    name: "Blue Fighter",
    isAttacking: false,
    attackCooldown: 0,
    direction: -1,
  })

  const punchesRef = useRef<Punch[]>([])
  const keysRef = useRef<Set<string>>(new Set())

  const startGame = useCallback(() => {
    setGameState("playing")
    setWinner("")
    setRound(1)

    // Reset fighters
    fighter1Ref.current = {
      x: 100,
      y: 300,
      width: 60,
      height: 120,
      health: 100,
      maxHealth: 100,
      color: "#FF4444",
      name: "Red Fighter",
      isAttacking: false,
      attackCooldown: 0,
      direction: 1,
    }

    fighter2Ref.current = {
      x: 640,
      y: 300,
      width: 60,
      height: 120,
      health: 100,
      maxHealth: 100,
      color: "#4444FF",
      name: "Blue Fighter",
      isAttacking: false,
      attackCooldown: 0,
      direction: -1,
    }

    punchesRef.current = []
  }, [])

  const punch = useCallback((fighter: Fighter, isPlayer1: boolean) => {
    if (fighter.attackCooldown > 0) return

    fighter.isAttacking = true
    fighter.attackCooldown = 30

    const punch: Punch = {
      x: isPlayer1 ? fighter.x + fighter.width : fighter.x - 40,
      y: fighter.y + 20,
      width: 40,
      height: 30,
      damage: 15,
      owner: isPlayer1 ? "player1" : "player2",
      active: true,
    }

    punchesRef.current.push(punch)
    audioRef.current.playPunch()

    setTimeout(() => {
      fighter.isAttacking = false
    }, 200)
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || gameState !== "playing") {
      animationRef.current = requestAnimationFrame(gameLoop)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      animationRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Clear canvas with boxing ring background
    ctx.fillStyle = "#2D1810"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw boxing ring
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 4
    ctx.strokeRect(50, 250, 700, 200)

    // Draw ring ropes
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(50, 250 + i * 50)
      ctx.lineTo(750, 250 + i * 50)
      ctx.stroke()
    }

    const fighter1 = fighter1Ref.current
    const fighter2 = fighter2Ref.current
    const keys = keysRef.current

    // Handle fighter 1 controls (WASD + Space)
    if (keys.has("a") && fighter1.x > 60) fighter1.x -= 3
    if (keys.has("d") && fighter1.x < 350) fighter1.x += 3
    if (keys.has("w") && fighter1.y > 260) fighter1.y -= 3
    if (keys.has("s") && fighter1.y < 430) fighter1.y += 3
    if (keys.has(" ")) punch(fighter1, true)

    // Handle fighter 2 controls (Arrow keys + Enter)
    if (keys.has("ArrowLeft") && fighter2.x > 400) fighter2.x -= 3
    if (keys.has("ArrowRight") && fighter2.x < 690) fighter2.x += 3
    if (keys.has("ArrowUp") && fighter2.y > 260) fighter2.y -= 3
    if (keys.has("ArrowDown") && fighter2.y < 430) fighter2.y += 3
    if (keys.has("Enter")) punch(fighter2, false)

    // Update attack cooldowns
    if (fighter1.attackCooldown > 0) fighter1.attackCooldown--
    if (fighter2.attackCooldown > 0) fighter2.attackCooldown--

    // Update punches and check collisions
    punchesRef.current = punchesRef.current.filter((punch) => {
      if (!punch.active) return false

      // Check collision with fighters
      const target = punch.owner === "player1" ? fighter2 : fighter1

      if (
        punch.x < target.x + target.width &&
        punch.x + punch.width > target.x &&
        punch.y < target.y + target.height &&
        punch.y + punch.height > target.y
      ) {
        target.health -= punch.damage
        audioRef.current.playHit()
        punch.active = false

        // Check for knockout
        if (target.health <= 0) {
          setWinner(punch.owner === "player1" ? fighter1.name : fighter2.name)
          setGameState("gameOver")
        }

        return false
      }

      // Remove punch after short duration
      setTimeout(() => {
        punch.active = false
      }, 100)

      return true
    })

    // Draw fighters
    const drawFighter = (fighter: Fighter) => {
      // Fighter body
      ctx.fillStyle = fighter.color
      ctx.fillRect(fighter.x, fighter.y, fighter.width, fighter.height)

      // Fighter head
      ctx.fillStyle = "#F4C2A1"
      ctx.beginPath()
      ctx.arc(fighter.x + fighter.width / 2, fighter.y - 15, 20, 0, Math.PI * 2)
      ctx.fill()

      // Boxing gloves
      ctx.fillStyle = "#8B4513"
      if (fighter.isAttacking) {
        // Extended punch position
        const gloveX = fighter.direction > 0 ? fighter.x + fighter.width : fighter.x - 25
        ctx.beginPath()
        ctx.arc(gloveX, fighter.y + 30, 15, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Normal position
        ctx.beginPath()
        ctx.arc(fighter.x + fighter.width / 2 - 15, fighter.y + 30, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(fighter.x + fighter.width / 2 + 15, fighter.y + 30, 12, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    drawFighter(fighter1)
    drawFighter(fighter2)

    // Draw active punches
    ctx.fillStyle = "#FFFF00"
    punchesRef.current.forEach((punch) => {
      if (punch.active) {
        ctx.fillRect(punch.x, punch.y, punch.width, punch.height)
      }
    })

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, punch])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    audioRef.current.initialize()
  }, [])

  useEffect(() => {
    if (gameState === "playing") {
      gameLoop()
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
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-red-800 to-red-900 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">🥊</h1>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Boxing Championship</h2>
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-xl md:text-2xl font-bold text-yellow-300">Created by</p>
            <p className="text-2xl md:text-3xl font-bold text-white">JUSTIN DEVON MITCHELL</p>
          </div>
          <div className="text-sm md:text-lg opacity-90 space-y-2">
            <p>
              <strong>Player 1 (Red):</strong> WASD to move, SPACE to punch
            </p>
            <p>
              <strong>Player 2 (Blue):</strong> Arrow keys to move, ENTER to punch
            </p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-white text-red-800 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors mb-4"
        >
          Start Fight!
        </button>

        <button
          onClick={toggleMute}
          className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          {isMuted ? "🔇" : "🔊"} Sound
        </button>
      </div>
    )
  }

  if (gameState === "gameOver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-lg p-4 md:p-8">
        <div className="text-center text-black mb-8">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">🏆 KNOCKOUT! 🏆</h2>
          <p className="text-2xl md:text-3xl font-bold mb-4">{winner} Wins!</p>
          <p className="text-lg md:text-xl opacity-90">What a fight!</p>
          <div className="mt-4 bg-black/20 rounded-lg p-3">
            <p className="text-sm md:text-lg font-bold">Game by Justin Devon Mitchell</p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-black text-yellow-400 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-800 transition-colors"
        >
          Fight Again!
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-2 md:p-4">
      <div className="flex justify-between items-center w-full max-w-4xl mb-4 bg-white rounded-lg p-2 md:p-4 shadow-lg">
        <div className="text-center">
          <div className="text-sm font-bold text-red-600">Red Fighter</div>
          <div className="w-32 bg-gray-200 rounded-full h-3">
            <div
              className="bg-red-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(fighter1Ref.current.health / fighter1Ref.current.maxHealth) * 100}%` }}
            />
          </div>
          <div className="text-xs">{fighter1Ref.current.health}/100</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold">Round {round}</div>
          <button onClick={toggleMute} className="bg-gray-500 text-white px-2 py-1 rounded text-sm">
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>

        <div className="text-center">
          <div className="text-sm font-bold text-blue-600">Blue Fighter</div>
          <div className="w-32 bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(fighter2Ref.current.health / fighter2Ref.current.maxHealth) * 100}%` }}
            />
          </div>
          <div className="text-xs">{fighter2Ref.current.health}/100</div>
        </div>
      </div>

      <canvas ref={canvasRef} width={800} height={500} className="border-4 border-white rounded-lg max-w-full h-auto" />

      <div className="mt-4 text-center text-white text-sm md:text-base">
        <p>
          <strong>Red Fighter:</strong> WASD + SPACE | <strong>Blue Fighter:</strong> Arrows + ENTER
        </p>
        <p className="text-xs opacity-75">First to knockout wins!</p>
      </div>
    </div>
  )
}
