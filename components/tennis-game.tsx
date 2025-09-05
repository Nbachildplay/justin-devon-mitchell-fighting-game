"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import type React from "react"

interface Player {
  x: number
  y: number
  width: number
  height: number
  score: number
  hasRacket: boolean
  isServing: boolean
  name: string
  color: string
  trophies: number
  isWinner: boolean
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface Racket {
  x: number
  y: number
  width: number
  height: number
  owner: "player1" | "player2" | null
}

interface GameController {
  x: number
  y: number
  isDragging: boolean
  type: "player1" | "player2"
}

class TennisAudio {
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

    oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)

    oscillator.start()
  }

  playHit() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playScore() {
    if (!this.audioContext || this.isMuted) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime)
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }

  playWin() {
    if (!this.audioContext || this.isMuted) return

    // Victory fanfare
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator()
        const gainNode = this.audioContext!.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext!.destination)

        oscillator.frequency.setValueAtTime(523 + i * 100, this.audioContext!.currentTime)
        gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5)

        oscillator.start()
        oscillator.stop(this.audioContext!.currentTime + 0.5)
      }, i * 200)
    }
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

export default function TennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<TennisAudio>(new TennisAudio())
  const animationRef = useRef<number>()
  const gameStateRef = useRef<"menu" | "playing" | "gameOver" | "celebration">("menu")

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver" | "celebration">("menu")
  const [player1, setPlayer1] = useState<Player>({
    x: 100,
    y: 300,
    width: 40,
    height: 60,
    score: 0,
    hasRacket: false,
    isServing: true,
    name: "Player 1",
    color: "#FF4444",
    trophies: 0,
    isWinner: false,
  })
  const [player2, setPlayer2] = useState<Player>({
    x: 660,
    y: 300,
    width: 40,
    height: 60,
    score: 0,
    hasRacket: false,
    isServing: false,
    name: "Player 2",
    color: "#4444FF",
    trophies: 0,
    isWinner: false,
  })
  const [ball, setBall] = useState<Ball>({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 8,
  })
  const [racket, setRacket] = useState<Racket>({
    x: 380,
    y: 280,
    width: 40,
    height: 10,
    owner: null,
  })
  const [isMuted, setIsMuted] = useState(false)
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [controllers, setControllers] = useState<GameController[]>([
    { x: 50, y: 450, isDragging: false, type: "player1" },
    { x: 650, y: 450, isDragging: false, type: "player2" },
  ])
  const [touchControls, setTouchControls] = useState<{ [key: string]: boolean }>({})
  const [winner, setWinner] = useState<string>("")
  const [showCelebration, setShowCelebration] = useState(false)

  const startGame = useCallback(() => {
    setGameState("playing")
    gameStateRef.current = "playing"
    setPlayer1((prev) => ({ ...prev, score: 0, x: 100, y: 300, hasRacket: false, isWinner: false }))
    setPlayer2((prev) => ({ ...prev, score: 0, x: 660, y: 300, hasRacket: false, isWinner: false }))
    setBall({ x: 400, y: 300, vx: 0, vy: 0, radius: 8 })
    setRacket({ x: 380, y: 280, width: 40, height: 10, owner: null })
    setWinner("")
    setShowCelebration(false)
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

  const handleControllerMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    setControllers((prev) =>
      prev.map((controller, i) => (i === index ? { ...controller, isDragging: true } : controller)),
    )
  }, [])

  const handleControllerMouseMove = useCallback((e: MouseEvent) => {
    setControllers((prev) =>
      prev.map((controller) => {
        if (controller.isDragging) {
          const canvas = canvasRef.current
          if (!canvas) return controller

          const rect = canvas.getBoundingClientRect()
          const x = Math.max(0, Math.min(canvas.width - 120, e.clientX - rect.left - 60))
          const y = Math.max(0, Math.min(canvas.height - 120, e.clientY - rect.top - 60))

          return { ...controller, x, y }
        }
        return controller
      }),
    )
  }, [])

  const handleControllerMouseUp = useCallback(() => {
    setControllers((prev) => prev.map((controller) => ({ ...controller, isDragging: false })))
  }, [])

  const handleControllerTouch = useCallback((action: string, isPressed: boolean) => {
    setTouchControls((prev) => ({ ...prev, [action]: isPressed }))
  }, [])

  const serveBall = useCallback((player: Player) => {
    const direction = player.name === "Player 1" ? 1 : -1
    setBall((prev) => ({
      ...prev,
      x: player.x + player.width / 2,
      y: player.y,
      vx: direction * 4,
      vy: -2,
    }))
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

    ctx.fillStyle = "#2D8B2D"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw tennis court
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 3

    // Court boundaries
    ctx.strokeRect(50, 100, canvas.width - 100, canvas.height - 200)

    // Net
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(canvas.width / 2 - 2, 100, 4, canvas.height - 200)

    // Service boxes
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 100)
    ctx.lineTo(canvas.width / 2, canvas.height - 100)
    ctx.stroke()

    // Center service line
    ctx.beginPath()
    ctx.moveTo(50, canvas.height / 2)
    ctx.lineTo(canvas.width - 50, canvas.height / 2)
    ctx.stroke()

    const allKeys = new Set([...keys, ...Object.keys(touchControls).filter((key) => touchControls[key])])

    // Player 1 controls (WASD + Space to grab/hit)
    if ((allKeys.has("a") || allKeys.has("p1left")) && player1.x > 60) {
      setPlayer1((prev) => ({ ...prev, x: prev.x - 4 }))
    }
    if ((allKeys.has("d") || allKeys.has("p1right")) && player1.x < canvas.width / 2 - 50) {
      setPlayer1((prev) => ({ ...prev, x: prev.x + 4 }))
    }
    if ((allKeys.has("w") || allKeys.has("p1up")) && player1.y > 110) {
      setPlayer1((prev) => ({ ...prev, y: prev.y - 4 }))
    }
    if ((allKeys.has("s") || allKeys.has("p1down")) && player1.y < canvas.height - 170) {
      setPlayer1((prev) => ({ ...prev, y: prev.y + 4 }))
    }

    // Player 2 controls (Arrow keys + Enter to grab/hit)
    if ((allKeys.has("arrowleft") || allKeys.has("p2left")) && player2.x > canvas.width / 2 + 10) {
      setPlayer2((prev) => ({ ...prev, x: prev.x - 4 }))
    }
    if ((allKeys.has("arrowright") || allKeys.has("p2right")) && player2.x < canvas.width - 100) {
      setPlayer2((prev) => ({ ...prev, x: prev.x + 4 }))
    }
    if ((allKeys.has("arrowup") || allKeys.has("p2up")) && player2.y > 110) {
      setPlayer2((prev) => ({ ...prev, y: prev.y - 4 }))
    }
    if ((allKeys.has("arrowdown") || allKeys.has("p2down")) && player2.y < canvas.height - 170) {
      setPlayer2((prev) => ({ ...prev, y: prev.y + 4 }))
    }

    // Racket grabbing
    if (allKeys.has(" ") || allKeys.has("p1grab")) {
      const distance = Math.sqrt(
        Math.pow(player1.x + player1.width / 2 - (racket.x + racket.width / 2), 2) +
          Math.pow(player1.y + player1.height / 2 - (racket.y + racket.height / 2), 2),
      )
      if (distance < 30 && !racket.owner) {
        setRacket((prev) => ({ ...prev, owner: "player1" }))
        setPlayer1((prev) => ({ ...prev, hasRacket: true }))
      }
    }

    if (allKeys.has("enter") || allKeys.has("p2grab")) {
      const distance = Math.sqrt(
        Math.pow(player2.x + player2.width / 2 - (racket.x + racket.width / 2), 2) +
          Math.pow(player2.y + player2.height / 2 - (racket.y + racket.height / 2), 2),
      )
      if (distance < 30 && !racket.owner) {
        setRacket((prev) => ({ ...prev, owner: "player2" }))
        setPlayer2((prev) => ({ ...prev, hasRacket: true }))
      }
    }

    // Update racket position if owned
    if (racket.owner === "player1") {
      setRacket((prev) => ({ ...prev, x: player1.x + 10, y: player1.y + 20 }))
    } else if (racket.owner === "player2") {
      setRacket((prev) => ({ ...prev, x: player2.x - 10, y: player2.y + 20 }))
    }

    // Ball physics
    setBall((prev) => {
      const newX = prev.x + prev.vx
      let newY = prev.y + prev.vy
      let newVx = prev.vx
      let newVy = prev.vy

      // Gravity
      newVy += 0.1

      // Bounce off top and bottom
      if (newY <= 100 + prev.radius || newY >= canvas.height - 100 - prev.radius) {
        newVy = -newVy * 0.8
        newY = newY <= 100 + prev.radius ? 100 + prev.radius : canvas.height - 100 - prev.radius
      }

      // Net collision
      if (
        newX >= canvas.width / 2 - 10 &&
        newX <= canvas.width / 2 + 10 &&
        newY >= 100 &&
        newY <= canvas.height - 100
      ) {
        newVx = -newVx
      }

      // Racket collision
      if (
        racket.owner &&
        newX >= racket.x &&
        newX <= racket.x + racket.width &&
        newY >= racket.y &&
        newY <= racket.y + racket.height
      ) {
        const hitDirection = racket.owner === "player1" ? 1 : -1
        newVx = hitDirection * 5
        newVy = -3
        audioRef.current.playHit()
      }

      // Score detection
      if (newX <= 50) {
        setPlayer2((prev) => ({ ...prev, score: prev.score + 1 }))
        audioRef.current.playScore()
        return { x: 400, y: 300, vx: 0, vy: 0, radius: 8 }
      } else if (newX >= canvas.width - 50) {
        setPlayer1((prev) => ({ ...prev, score: prev.score + 1 }))
        audioRef.current.playScore()
        return { x: 400, y: 300, vx: 0, vy: 0, radius: 8 }
      }

      return { ...prev, x: newX, y: newY, vx: newVx, vy: newVy }
    })

    // Serve ball if stationary
    if (ball.vx === 0 && ball.vy === 0) {
      if (player1.isServing && player1.hasRacket) {
        serveBall(player1)
      } else if (player2.isServing && player2.hasRacket) {
        serveBall(player2)
      }
    }

    // Draw players
    const drawPlayer = (player: Player) => {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x, player.y, player.width, player.height)

      // Head
      ctx.fillStyle = "#F4C2A1"
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y - 10, 15, 0, Math.PI * 2)
      ctx.fill()

      // Name
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "12px Arial"
      ctx.fillText(player.name, player.x - 10, player.y - 25)
    }

    drawPlayer(player1)
    drawPlayer(player2)

    // Draw racket
    ctx.fillStyle = racket.owner ? "#8B4513" : "#FFD700"
    ctx.fillRect(racket.x, racket.y, racket.width, racket.height)

    // Draw ball
    ctx.fillStyle = "#FFFF00"
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    // Check for winner
    if (player1.score >= 5 && !winner) {
      setWinner(player1.name)
      setPlayer1((prev) => ({ ...prev, trophies: prev.trophies + 1, isWinner: true }))
      setGameState("celebration")
      audioRef.current.playWin()
      setShowCelebration(true)
    } else if (player2.score >= 5 && !winner) {
      setWinner(player2.name)
      setPlayer2((prev) => ({ ...prev, trophies: prev.trophies + 1, isWinner: true }))
      setGameState("celebration")
      audioRef.current.playWin()
      setShowCelebration(true)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [player1, player2, ball, racket, keys, touchControls, winner, serveBall])

  useEffect(() => {
    audioRef.current.initialize()

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("mousemove", handleControllerMouseMove)
    window.addEventListener("mouseup", handleControllerMouseUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("mousemove", handleControllerMouseMove)
      window.removeEventListener("mouseup", handleControllerMouseUp)
    }
  }, [handleKeyDown, handleKeyUp, handleControllerMouseMove, handleControllerMouseUp])

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
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-green-500 to-green-700 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">🎾</h1>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Tennis Championship</h2>
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-xl md:text-2xl font-bold text-yellow-300">Created by</p>
            <p className="text-2xl md:text-3xl font-bold text-white">JUSTIN DEVON MITCHELL</p>
          </div>
          <div className="text-sm md:text-lg opacity-90 space-y-2">
            <p>
              <strong>Player 1:</strong> WASD to move, Space to grab racket/serve
            </p>
            <p>
              <strong>Player 2:</strong> Arrow keys to move, Enter to grab racket/serve
            </p>
            <p>
              <strong>Goal:</strong> First to 5 points wins! 🏆
            </p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-white text-green-600 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors mb-4"
        >
          Start Match!
        </button>

        <button
          onClick={toggleMute}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors"
        >
          {isMuted ? "🔇" : "🔊"} Sound
        </button>
      </div>
    )
  }

  if (gameState === "celebration") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">🏆 CHAMPION! 🏆</h2>
          <div className="text-lg md:text-2xl mb-6">
            <p className="text-3xl font-bold">{winner} WINS!</p>
            <div className="mt-4 text-6xl">🥤</div>
            <p className="text-xl mt-2">*Drinks victory water*</p>
            <div className="mt-4 flex justify-center space-x-2">
              {Array.from({ length: winner === "Player 1" ? player1.trophies : player2.trophies }, (_, i) => (
                <span key={i} className="text-4xl">
                  🏆
                </span>
              ))}
            </div>
            <p className="text-lg mt-2">Trophies: {winner === "Player 1" ? player1.trophies : player2.trophies}</p>
          </div>
          <div className="mt-4 bg-white/20 rounded-lg p-3">
            <p className="text-sm md:text-lg font-bold text-yellow-900">Game by J.D. Mitchell</p>
          </div>
        </div>

        <button
          onClick={startGame}
          className="bg-white text-yellow-600 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors"
        >
          Play Again!
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-2 md:p-4">
      <div className="flex flex-wrap justify-between items-center w-full max-w-4xl mb-4 bg-white rounded-lg p-2 md:p-4 shadow-lg text-sm md:text-base">
        <div className="flex items-center space-x-4">
          <div className="text-red-600 font-bold">
            {player1.name}: {player1.score} {player1.hasRacket ? "🎾" : ""}
          </div>
          <div className="text-blue-600 font-bold">
            {player2.name}: {player2.score} {player2.hasRacket ? "🎾" : ""}
          </div>
        </div>
        <div className="text-xs md:text-sm text-gray-600">by J.D. Mitchell</div>
        <button
          onClick={toggleMute}
          className="bg-green-500 text-white px-2 md:px-3 py-1 rounded hover:bg-green-400 transition-colors text-sm"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-4 border-white rounded-lg max-w-full h-auto"
        />

        {gameState === "playing" &&
          controllers.map((controller, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                left: controller.x,
                top: controller.y,
                transform: "translate(-50%, -50%)",
                cursor: controller.isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleControllerMouseDown(index, e)}
            >
              <div
                className={`bg-black/70 rounded-lg p-2 ${controller.type === "player1" ? "border-2 border-red-500" : "border-2 border-blue-500"}`}
              >
                <div className="text-white text-xs font-bold mb-1 text-center">
                  {controller.type === "player1" ? "P1" : "P2"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div></div>
                  <button
                    className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded text-xs font-bold"
                    onTouchStart={() => handleControllerTouch(controller.type === "player1" ? "p1up" : "p2up", true)}
                    onTouchEnd={() => handleControllerTouch(controller.type === "player1" ? "p1up" : "p2up", false)}
                    onMouseDown={() => handleControllerTouch(controller.type === "player1" ? "p1up" : "p2up", true)}
                    onMouseUp={() => handleControllerTouch(controller.type === "player1" ? "p1up" : "p2up", false)}
                  >
                    ↑
                  </button>
                  <div></div>

                  <button
                    className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded text-xs font-bold"
                    onTouchStart={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1left" : "p2left", true)
                    }
                    onTouchEnd={() => handleControllerTouch(controller.type === "player1" ? "p1left" : "p2left", false)}
                    onMouseDown={() => handleControllerTouch(controller.type === "player1" ? "p1left" : "p2left", true)}
                    onMouseUp={() => handleControllerTouch(controller.type === "player1" ? "p1left" : "p2left", false)}
                  >
                    ←
                  </button>
                  <div className="w-8 h-8"></div>
                  <button
                    className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded text-xs font-bold"
                    onTouchStart={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1right" : "p2right", true)
                    }
                    onTouchEnd={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1right" : "p2right", false)
                    }
                    onMouseDown={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1right" : "p2right", true)
                    }
                    onMouseUp={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1right" : "p2right", false)
                    }
                  >
                    →
                  </button>

                  <div></div>
                  <button
                    className="bg-gray-600 hover:bg-gray-500 text-white w-8 h-8 rounded text-xs font-bold"
                    onTouchStart={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1down" : "p2down", true)
                    }
                    onTouchEnd={() => handleControllerTouch(controller.type === "player1" ? "p1down" : "p2down", false)}
                    onMouseDown={() => handleControllerTouch(controller.type === "player1" ? "p1down" : "p2down", true)}
                    onMouseUp={() => handleControllerTouch(controller.type === "player1" ? "p1down" : "p2down", false)}
                  >
                    ↓
                  </button>
                  <div></div>
                </div>

                <div className="mt-2">
                  <button
                    className={`${controller.type === "player1" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} text-white w-full h-6 rounded text-xs font-bold`}
                    onTouchStart={() =>
                      handleControllerTouch(controller.type === "player1" ? "p1grab" : "p2grab", true)
                    }
                    onTouchEnd={() => handleControllerTouch(controller.type === "player1" ? "p1grab" : "p2grab", false)}
                    onMouseDown={() => handleControllerTouch(controller.type === "player1" ? "p1grab" : "p2grab", true)}
                    onMouseUp={() => handleControllerTouch(controller.type === "player1" ? "p1grab" : "p2grab", false)}
                  >
                    🎾 GRAB
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="mt-4 text-center text-white text-sm md:text-base bg-black/50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-red-400">Player 1</p>
            <p>WASD: Move | Space: Grab Racket</p>
            <p className="text-xs">Or use movable controller</p>
          </div>
          <div>
            <p className="font-bold text-blue-400">Player 2</p>
            <p>Arrows: Move | Enter: Grab Racket</p>
            <p className="text-xs">Or use movable controller</p>
          </div>
        </div>
        <p className="text-xs mt-2 text-yellow-300">Grab the racket to serve and hit the ball! First to 5 wins! 🏆</p>
      </div>
    </div>
  )
}
