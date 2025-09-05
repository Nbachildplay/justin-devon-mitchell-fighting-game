import Link from "next/link"
import TennisGame from "@/components/tennis-game"

export default function TennisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            ← Back to Games
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white text-center">Tennis Championship</h1>
          <div className="w-24"></div>
        </div>

        <TennisGame />

        <div className="mt-6 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              ✈️ Sky Fighter
            </Link>
            <Link
              href="/basketball"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🥊 Boxing Arena
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
