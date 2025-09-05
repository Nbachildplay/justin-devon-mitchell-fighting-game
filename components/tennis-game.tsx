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

class XRTennisAudio extends TennisAudio {
  private xrSession: any = null
  private isXRSupported = false

  async initializeXR() {
    await this.initialize()
    try {
      if ("xr" in navigator) {
        this.isXRSupported = await (navigator as any).xr.isSessionSupported("immersive-vr")
      }
    } catch (error) {
      console.log("XR not supported:", error)
    }
  }

  async startXRSession() {
    if (!this.isXRSupported) return false

    try {
      this.xrSession = await (navigator as any).xr.requestSession("immersive-vr")
      return true
    } catch (error) {
      console.log("XR Session failed:", error)
      return false
    }
  }
}

export default function TennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<XRTennisAudio>(new XRTennisAudio())
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
  const [isXRMode, setIsXRMode] = useState(false)
  const [xrSupported, setXRSupported] = useState(false)

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

    ctx.fillStyle = isXRMode ? "#1a5f1a" : "#2D8B2D"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 4

    const courtX = 50
    const courtY = 100
    const courtWidth = canvas.width - 100
    const courtHeight = canvas.height - 200

    ctx.strokeRect(courtX, courtY, courtWidth, courtHeight)

    const netX = canvas.width / 2 - 3
    const netY = courtY
    const netHeight = courtHeight

    ctx.fillStyle = "#8B4513"
    ctx.fillRect(netX - 5, netY - 10, 16, netHeight + 20)

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2
    for (let i = 0; i < netHeight; i += 20) {
      ctx.beginPath()
      ctx.moveTo(netX, netY + i)
      ctx.lineTo(netX + 6, netY + i)
      ctx.stroke()
    }
    for (let i = 0; i < 6; i += 2) {
      ctx.beginPath()
      ctx.moveTo(netX + i, netY)
      ctx.lineTo(netX + i, netY + netHeight)
      ctx.stroke()
    }

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2

    const serviceLineY1 = courtY + courtHeight * 0.25
    const serviceLineY2 = courtY + courtHeight * 0.75

    ctx.beginPath()
    ctx.moveTo(courtX, serviceLineY1)
    ctx.lineTo(canvas.width / 2, serviceLineY1)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, serviceLineY2)
    ctx.lineTo(canvas.width - courtX, serviceLineY2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(courtX, canvas.height / 2)
    ctx.lineTo(canvas.width - courtX, canvas.height / 2)
    ctx.stroke()

    const allKeys = new Set([...keys, ...Object.keys(touchControls).filter((key) => touchControls[key])])

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

    if (racket.owner === "player1") {
      setRacket((prev) => ({ ...prev, x: player1.x + 10, y: player1.y + 20 }))
    } else if (racket.owner === "player2") {
      setRacket((prev) => ({ ...prev, x: player2.x - 10, y: player2.y + 20 }))
    }

    setBall((prev) => {
      const newX = prev.x + prev.vx
      let newY = prev.y + prev.vy
      let newVx = prev.vx
      let newVy = prev.vy

      newVy += 0.15
      newVx *= 0.999
      newVy *= 0.998

      if (newY >= canvas.height - 100 - prev.radius) {
        newY = canvas.height - 100 - prev.radius
        newVy = -newVy * 0.7
        newVx *= 0.9
        audioRef.current.playHit()
      }

      if (newY <= 100 + prev.radius) {
        newY = 100 + prev.radius
        newVy = -newVy * 0.6
      }

      const netTop = courtY + 50
      if (newX >= netX - prev.radius && newX <= netX + 6 + prev.radius) {
        if (newY >= netTop) {
          newVx = -newVx * 0.3
          newVy = -Math.abs(newVy) * 0.5
          audioRef.current.playHit()
        }
      }

      if (racket.owner) {
        const racketCenterX = racket.x + racket.width / 2
        const racketCenterY = racket.y + racket.height / 2
        const distance = Math.sqrt(Math.pow(newX - racketCenterX, 2) + Math.pow(newY - racketCenterY, 2))

        if (distance <= prev.radius + 15) {
          const hitDirection = racket.owner === "player1" ? 1 : -1
          const angle = Math.atan2(newY - racketCenterY, newX - racketCenterX)

          newVx = Math.cos(angle) * 6 * hitDirection
          newVy = Math.sin(angle) * 4 - 2

          audioRef.current.playHit()
        }
      }

      if (newX <= courtX) {
        if (newY >= courtY && newY <= courtY + courtHeight) {
          setPlayer2((prev) => ({ ...prev, score: prev.score + 1 }))
          audioRef.current.playScore()
        }
        return { x: 400, y: 300, vx: 0, vy: 0, radius: 8 }
      } else if (newX >= canvas.width - courtX) {
        if (newY >= courtY && newY <= courtY + courtHeight) {
          setPlayer1((prev) => ({ ...prev, score: prev.score + 1 }))
          audioRef.current.playScore()
        }
        return { x: 400, y: 300, vx: 0, vy: 0, radius: 8 }
      }

      return { ...prev, x: newX, y: newY, vx: newVx, vy: newVy }
    })

    if (ball.vx === 0 && ball.vy === 0) {
      if (player1.isServing && player1.hasRacket) {
        serveBall(player1)
      } else if (player2.isServing && player2.hasRacket) {
        serveBall(player2)
      }
    }

    const drawPlayer = (player: Player) => {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x, player.y, player.width, player.height)

      ctx.fillStyle = "#F4C2A1"
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y - 10, 15, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#FFFFFF"
      ctx.font = "12px Arial"
      ctx.fillText(player.name, player.x - 10, player.y - 25)
    }

    drawPlayer(player1)
    drawPlayer(player2)

    ctx.fillStyle = racket.owner ? "#8B4513" : "#FFD700"
    ctx.fillRect(racket.x, racket.y, racket.width, racket.height)

    ctx.fillStyle = "#FFFF00"
    ctx.strokeStyle = "#FFA500"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius * 0.7, 0, Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius * 0.7, Math.PI, Math.PI * 2)
    ctx.stroke()

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

    if (isXRMode) {
      ctx.fillStyle = "#9400D3"
      ctx.font = "16px Arial"
      ctx.fillText("VR TENNIS MODE", canvas.width - 180, 30)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [player1, player2, ball, racket, keys, touchControls, winner, serveBall, isXRMode])

  useEffect(() => {
    audioRef.current.initializeXR().then(() => {
      setXRSupported(audioRef.current.isXRSupported)
    })

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

  const toggleXRMode = async () => {
    if (!xrSupported) {
      alert("XR/VR not supported on this device")
      return
    }

    if (!isXRMode) {
      const success = await audioRef.current.startXRSession()
      setIsXRMode(success)
    } else {
      setIsXRMode(false)
    }
  }

  if (gameState === "menu") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-b from-green-500 to-green-700 rounded-lg p-4 md:p-8">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">🎾</h1>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Tennis Championship {isXRMode ? "VR" : ""}</h2>
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
              <strong>Goal:</strong> Hit ball over the net! First to 5 points wins! 🏆
            </p>
            {xrSupported && (
              <p className="text-purple-200">
                <strong>🥽 VR Mode Available!</strong> Immersive tennis experience
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={startGame}
            className="bg-white text-green-600 px-6 md:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-gray-100 transition-colors"
          >
            Start Match!
          </button>

          {xrSupported && (
            <button
              onClick={toggleXRMode}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-500 transition-colors"
            >
              {isXRMode ? "Exit VR" : "Enter VR"}
            </button>
          )}
        </div>

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
        <div className="text-xs md:text-sm text-gray-600">by J.D. Mitchell {isXRMode ? "🥽" : ""}</div>
        <div className="flex gap-2">
          {xrSupported && (
            <button
              onClick={toggleXRMode}
              className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-400 transition-colors"
            >
              {isXRMode ? "Exit VR" : "VR"}
            </button>
          )}
          <button
            onClick={toggleMute}
            className="bg-green-500 text-white px-2 md:px-3 py-1 rounded hover:bg-green-400 transition-colors text-sm"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={`border-4 border-white rounded-lg max-w-full h-auto ${isXRMode ? "shadow-purple-500/50 shadow-2xl" : ""}`}
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
        <p className="text-xs mt-2 text-yellow-300">
          Hit the ball OVER the net to your opponent's court! First to 5 wins! 🏆
        </p>
        {isXRMode && <p className="text-purple-300 text-xs mt-1">🥽 VR Mode: Enhanced immersive tennis experience!</p>}
      </div>
    </div>
  )
}
