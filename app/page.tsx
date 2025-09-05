import AirplaneGame from "@/components/airplane-game"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600 p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <h1 className="text-4xl font-bold text-slate-900">Sky Fighter</h1>
          <div className="flex gap-4">
            <Link
              href="/basketball"
              className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              🥊 Boxing Arena →
            </Link>
            <Link
              href="/tennis"
              className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              🎾 Tennis Championship →
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <AirplaneGame />
        </div>
      </div>
    </main>
  )
}
