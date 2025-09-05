import BoxingGame from "@/components/boxing-game"

export default function BoxingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">🥊 FIGHT NIGHT 🥊</h1>
          <p className="text-lg text-gray-300">Created by Justin Devon Mitchell</p>
        </div>
        <BoxingGame />
      </div>
    </div>
  )
}
