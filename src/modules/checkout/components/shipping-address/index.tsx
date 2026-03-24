import { HttpTypes } from "@medusajs/types"
import React, { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

const GeolocationMap = dynamic(
  () => import("../geolocation-map"),
  { ssr: false, loading: () => <div className="py-8 text-center text-gray-400 animate-pulse">Chargement…</div> }
)

type Step = "location" | "name" | "phone" | "email" | "done"

const CONFETTI_COLORS = ["#083d2a", "#FF6D01", "#76ad2a", "#faa72a", "#2c84db", "#e04343"]

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; vr: number; opacity: number }[] = []

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 300,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        opacity: 1,
      })
    }

    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.rot += p.vr
        if (p.y > canvas.height - 50) p.opacity -= 0.02
        if (p.opacity <= 0) continue
        alive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
}

function ChatBubble({ children, delay = 0, from = "assistant" }: { children: React.ReactNode; delay?: number; from?: "assistant" | "user" }) {
  const [visible, setVisible] = useState(delay === 0)
  useEffect(() => {
    if (delay > 0) { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }
  }, [delay])

  if (!visible) return <div className="h-10" />

  return (
    <div className={`flex ${from === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        from === "user"
          ? "bg-[#083d2a] text-white rounded-br-md"
          : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
      }`}>
        {children}
      </div>
    </div>
  )
}

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const [step, setStep] = useState<Step>("location")
  const [firstName, setFirstName] = useState(cart?.shipping_address?.first_name || customer?.first_name || "")
  const [lastName, setLastName] = useState(cart?.shipping_address?.last_name || customer?.last_name || "")
  const [phone, setPhone] = useState(cart?.shipping_address?.phone || customer?.phone || "")
  const [email, setEmail] = useState(cart?.email || customer?.email || "")
  const [locationData, setLocationData] = useState<any>(null)
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery")
  const [showConfetti, setShowConfetti] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step !== "location" && step !== "done") {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [step])

  const handleLocationConfirmed = (data: any) => {
    setLocationData(data)
    setTimeout(() => setStep("name"), 500)
  }

  const handlePickup = () => {
    setDeliveryMode("pickup")
    setLocationData({ zone: "pickup", zoneName: "Retrait en magasin", fee: 0, lat: 0, lng: 0, estimatedMinutes: 15 })
    setTimeout(() => setStep("name"), 500)
  }

  const submitName = (e: React.FormEvent) => {
    e.preventDefault()
    if (firstName.trim()) setStep("phone")
  }

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.trim()) setStep("email")
  }

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setStep("done")
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)
  }

  const skipEmail = () => {
    setEmail("client@lacantineafricaine.com")
    setStep("done")
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)
  }

  return (
    <div className="space-y-4 pb-4">
      {showConfetti && <Confetti />}

      {/* Hidden form fields for Medusa */}
      <input type="hidden" name="shipping_address.first_name" value={firstName} />
      <input type="hidden" name="shipping_address.last_name" value={lastName || firstName} />
      <input type="hidden" name="shipping_address.phone" value={phone} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="shipping_address.address_1" value={locationData ? (deliveryMode === "pickup" ? "Retrait en magasin" : `GPS: ${locationData.lat?.toFixed(5)}, ${locationData.lng?.toFixed(5)}`) : ""} />
      <input type="hidden" name="shipping_address.city" value="Bamako" />
      <input type="hidden" name="shipping_address.country_code" value="ml" />
      <input type="hidden" name="shipping_address.postal_code" value="BP" />
      <input type="hidden" name="shipping_address.province" value={locationData?.zoneName || ""} />
      <input type="hidden" name="shipping_address.company" value={locationData?.zone || ""} />
      <input type="hidden" name="same_as_billing" value={checked ? "on" : ""} />

      {/* STEP 1: Location */}
      <ChatBubble>
        Bienvenue ! 👋 Comment souhaitez-vous recevoir votre commande ?
      </ChatBubble>

      {step === "location" && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeliveryMode("delivery")}
              className={`flex-1 py-4 rounded-xl text-sm font-semibold transition border-2 ${
                deliveryMode === "delivery" ? "border-[#083d2a] bg-[#083d2a]/5 text-[#083d2a]" : "border-gray-200 text-gray-500"
              }`}>
              🛵 Livraison
            </button>
            <button type="button" onClick={handlePickup}
              className={`flex-1 py-4 rounded-xl text-sm font-semibold transition border-2 ${
                deliveryMode === "pickup" ? "border-[#083d2a] bg-[#083d2a]/5 text-[#083d2a]" : "border-gray-200 text-gray-500"
              }`}>
              🏪 Retrait
            </button>
          </div>
          {deliveryMode === "delivery" && <GeolocationMap onLocationConfirmed={handleLocationConfirmed} />}
        </div>
      )}

      {/* Location confirmed */}
      {step !== "location" && locationData && (
        <ChatBubble from="user">
          {deliveryMode === "pickup"
            ? "🏪 Retrait en magasin"
            : `📍 ${locationData.zoneName || "Position confirmée"}`
          }
        </ChatBubble>
      )}

      {/* STEP 2: Name */}
      {(step === "name" || step === "phone" || step === "email" || step === "done") && (
        <ChatBubble delay={200}>
          {locationData?.zoneName && deliveryMode !== "pickup"
            ? `Parfait, livraison à ${locationData.zoneName} ! Comment vous appelez-vous ?`
            : "Parfait ! Comment vous appelez-vous ?"
          }
        </ChatBubble>
      )}

      {step === "name" && (
        <form onSubmit={submitName} className="animate-fadeIn">
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Votre prénom" autoComplete="given-name"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit" disabled={!firstName.trim()}
              className={`h-12 px-5 rounded-xl font-semibold text-sm transition ${firstName.trim() ? "bg-[#083d2a] text-white" : "bg-gray-200 text-gray-400"}`}>
              →
            </button>
          </div>
        </form>
      )}

      {/* Name answered */}
      {(step === "phone" || step === "email" || step === "done") && firstName && (
        <ChatBubble from="user" delay={0}>{firstName}</ChatBubble>
      )}

      {/* STEP 3: Phone */}
      {(step === "phone" || step === "email" || step === "done") && (
        <ChatBubble delay={300}>
          Enchanté {firstName} ! 📱 Votre numéro de téléphone ?
        </ChatBubble>
      )}

      {step === "phone" && (
        <form onSubmit={submitPhone} className="animate-fadeIn">
          <div className="flex gap-2">
            <input ref={inputRef} type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="70 XX XX XX" autoComplete="tel"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit" disabled={!phone.trim()}
              className={`h-12 px-5 rounded-xl font-semibold text-sm transition ${phone.trim() ? "bg-[#083d2a] text-white" : "bg-gray-200 text-gray-400"}`}>
              →
            </button>
          </div>
        </form>
      )}

      {/* Phone answered */}
      {(step === "email" || step === "done") && phone && (
        <ChatBubble from="user" delay={0}>{phone}</ChatBubble>
      )}

      {/* STEP 4: Email */}
      {(step === "email" || step === "done") && (
        <ChatBubble delay={300}>
          Votre email ? (pour le reçu)
        </ChatBubble>
      )}

      {step === "email" && (
        <form onSubmit={submitEmail} className="animate-fadeIn">
          <div className="flex gap-2">
            <input ref={inputRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" autoComplete="email"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit"
              className="h-12 px-5 rounded-xl font-semibold text-sm bg-[#083d2a] text-white">
              →
            </button>
          </div>
          <button type="button" onClick={skipEmail} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
            Passer cette étape →
          </button>
        </form>
      )}

      {/* Email answered */}
      {step === "done" && email && (
        <ChatBubble from="user" delay={0}>{email === "client@lacantineafricaine.com" ? "Passé" : email}</ChatBubble>
      )}

      {/* STEP 5: Done! */}
      {step === "done" && (
        <div className="animate-fadeIn text-center py-6">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold text-[#083d2a]">C'est tout !</div>
          <div className="text-sm text-gray-500 mt-1">
            {deliveryMode === "pickup"
              ? "Retrait en magasin · Gratuit"
              : `Livraison à ${locationData?.zoneName} · ${locationData?.fee?.toLocaleString("fr-FR")} F · ~${locationData?.estimatedMinutes} min`
            }
          </div>
          <div className="mt-3 text-xs text-gray-400">Passez au paiement ci-dessous ↓</div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}

export default ShippingAddress
