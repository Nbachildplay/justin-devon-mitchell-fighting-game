import BasketballGame from "@/components/basketball-game"
import Link from "next/link"

export default function BasketballPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link
            href="/"
            className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            ← ✈️ Sky Fighter
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 text-center">Boxing Battle Arena</h1>
          <Link
            href="/tennis"
            className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            🎾 Tennis →
          </Link>
        </div>
        <p className="text-slate-900 text-center mb-4 font-medium">Created by Justin Devon Mitchell</p>
        <BasketballGame />
      </div>
    </div>
  )
}
