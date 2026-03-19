"use client"

import { useState } from "react"
import { SubmitBidModal } from "@/components/submit-bid-modal"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(true)

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-lg bg-emerald-500 px-6 py-3 text-white font-semibold hover:bg-emerald-600 transition-colors"
      >
        Submit Bid
      </button>

      <SubmitBidModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
