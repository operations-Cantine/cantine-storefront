import { HttpTypes } from "@medusajs/types"
import React, { useState, useEffect, useRef } from "react"
import GeolocationMap from "../geolocation-map"

type Step = "mode" | "location" | "name" | "phone" | "email" | "done"

const CC = ["#083d2a", "#FF6D01", "#76ad2a", "#faa72a", "#2c84db"]
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d"); if (!ctx) return
    c.width = window.innerWidth; c.height = window.innerHeight
    const P = Array.from({ length: 60 }, () => ({
      x: Math.random() * c.width, y: -10 - Math.random() * 200,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
      c: CC[Math.floor(Math.random() * CC.length)],
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
      r: Math.random() * 6, o: 1,
    }))
    let f: number
    const go = () => {
      ctx.clearRect(0, 0, c.width, c.height); let alive = false
      for (const p of P) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.r += 0.1
        if (p.y > c.height - 40) p.o -= 0.03; if (p.o <= 0) continue
        alive = true; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r)
        ctx.globalAlpha = p.o; ctx.fillStyle = p.c
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore()
      }
      if (alive) f = requestAnimationFrame(go)
    }
    f = requestAnimationFrame(go)
    return () => cancelAnimationFrame(f)
  }, [])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-50" />
}

function Bubble({ children, delay = 0, from = "assistant" }: { children: React.ReactNode; delay?: number; from?: "assistant" | "user" }) {
  const [show, setShow] = useState(delay === 0)
  useEffect(() => { if (delay > 0) { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) } }, [delay])
  if (!show) return null
  return (
    <div className={`flex ${from === "user" ? "justify-end" : "justify-start"}`} style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        from === "user" ? "bg-[#083d2a] text-white rounded-br-md" : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
      }`}>{children}</div>
    </div>
  )
}

const ShippingAddress = ({
  customer, cart, checked, onChange,
}: {
  customer: HttpTypes.StoreCustomer | null; cart: HttpTypes.StoreCart | null; checked: boolean; onChange: () => void
}) => {
  const [step, setStep] = useState<Step>("mode")
  const [firstName, setFirstName] = useState(cart?.shipping_address?.first_name || customer?.first_name || "")
  const [phone, setPhone] = useState(cart?.shipping_address?.phone || customer?.phone || "")
  const [email, setEmail] = useState(cart?.email || customer?.email || "")
  const [locationData, setLocationData] = useState<any>(null)
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup" | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (["name", "phone", "email"].includes(step)) setTimeout(() => inputRef.current?.focus(), 300)
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [step])

  const restart = () => {
    setStep("mode"); setDeliveryMode(null); setLocationData(null)
  }

  const chooseDelivery = () => { setDeliveryMode("delivery"); setStep("location") }

  const choosePickup = () => {
    setDeliveryMode("pickup")
    setLocationData({ zone: "pickup", zoneName: "Retrait en magasin", fee: 0, lat: 0, lng: 0, estimatedMinutes: 15 })
    setStep("name")
  }

  const handleLocationConfirmed = (data: any) => {
    setLocationData(data)
    setTimeout(() => setStep("name"), 400)
  }

  const submitName = (e: React.FormEvent) => { e.preventDefault(); if (firstName.trim()) setStep("phone") }
  const submitPhone = (e: React.FormEvent) => { e.preventDefault(); if (phone.trim()) setStep("email") }
  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault(); setStep("done"); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000)
  }
  const skipEmail = () => {
    setEmail("client@lacantineafricaine.com"); setStep("done"); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000)
  }

  const pastLocation = step !== "mode" && step !== "location"
  const pastName = ["phone", "email", "done"].includes(step)
  const pastPhone = ["email", "done"].includes(step)
  const pastEmail = step === "done"

  return (
    <div className="space-y-3 pb-4">
      {showConfetti && <Confetti />}

      {/* Hidden fields */}
      <input type="hidden" name="shipping_address.first_name" value={firstName} />
      <input type="hidden" name="shipping_address.last_name" value={firstName} />
      <input type="hidden" name="shipping_address.phone" value={phone} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="shipping_address.address_1" value={locationData ? (deliveryMode === "pickup" ? "Retrait en magasin" : `GPS: ${locationData.lat?.toFixed(5)}, ${locationData.lng?.toFixed(5)}`) : ""} />
      <input type="hidden" name="shipping_address.city" value="Bamako" />
      <input type="hidden" name="shipping_address.country_code" value="ml" />
      <input type="hidden" name="shipping_address.postal_code" value="BP" />
      <input type="hidden" name="shipping_address.province" value={locationData?.zoneName || ""} />
      <input type="hidden" name="shipping_address.company" value={locationData?.zone || ""} />

      {/* ── STEP: MODE ── */}
      <Bubble>Bienvenue ! 👋 Comment souhaitez-vous recevoir votre commande ?</Bubble>

      {step === "mode" && (
        <div className="flex gap-2" style={{ animation: "fadeIn 0.25s ease-out" }}>
          <button type="button" onClick={chooseDelivery}
            className="flex-1 py-4 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-[#083d2a] hover:bg-[#083d2a]/5 hover:text-[#083d2a] transition active:scale-[0.98]">
            🛵 Livraison
          </button>
          <button type="button" onClick={choosePickup}
            className="flex-1 py-4 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-[#083d2a] hover:bg-[#083d2a]/5 hover:text-[#083d2a] transition active:scale-[0.98]">
            🏪 Retrait
          </button>
        </div>
      )}

      {/* ── STEP: LOCATION (delivery only) ── */}
      {step === "location" && deliveryMode === "delivery" && (
        <div style={{ animation: "fadeIn 0.25s ease-out" }}>
          <GeolocationMap onLocationConfirmed={handleLocationConfirmed} />
        </div>
      )}

      {/* ── Past: location confirmed ── */}
      {pastLocation && locationData && (
        <>
          <Bubble from="user">
            {deliveryMode === "pickup" ? "🏪 Retrait en magasin" : `📍 ${locationData.zoneName || "Position confirmée"}`}
          </Bubble>
          {step !== "done" && (
            <button type="button" onClick={restart} className="text-xs text-gray-400 hover:text-[#083d2a] ml-2">
              ← Changer le mode de livraison
            </button>
          )}
        </>
      )}

      {/* ── STEP: NAME ── */}
      {pastLocation && (
        <Bubble delay={200}>
          {deliveryMode === "pickup"
            ? "Parfait, retrait en magasin ! Comment vous appelez-vous ?"
            : locationData?.zoneName
              ? `Parfait, livraison à ${locationData.zoneName} (${locationData.fee?.toLocaleString("fr-FR")} F) ! Comment vous appelez-vous ?`
              : "Parfait ! Comment vous appelez-vous ?"
          }
        </Bubble>
      )}

      {step === "name" && (
        <form onSubmit={submitName} style={{ animation: "fadeIn 0.25s ease-out" }}>
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Votre prénom" autoComplete="given-name"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit" disabled={!firstName.trim()}
              className={`h-12 px-5 rounded-xl font-semibold text-sm transition ${firstName.trim() ? "bg-[#083d2a] text-white" : "bg-gray-200 text-gray-400"}`}>→</button>
          </div>
        </form>
      )}

      {pastName && <Bubble from="user">{firstName}</Bubble>}

      {/* ── STEP: PHONE ── */}
      {pastName && <Bubble delay={200}>Enchanté {firstName} ! 📱 Votre numéro ?</Bubble>}

      {step === "phone" && (
        <form onSubmit={submitPhone} style={{ animation: "fadeIn 0.25s ease-out" }}>
          <div className="flex gap-2">
            <input ref={inputRef} type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="70 XX XX XX" autoComplete="tel"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit" disabled={!phone.trim()}
              className={`h-12 px-5 rounded-xl font-semibold text-sm transition ${phone.trim() ? "bg-[#083d2a] text-white" : "bg-gray-200 text-gray-400"}`}>→</button>
          </div>
        </form>
      )}

      {pastPhone && <Bubble from="user">{phone}</Bubble>}

      {/* ── STEP: EMAIL ── */}
      {pastPhone && <Bubble delay={200}>Votre email ? (pour le reçu)</Bubble>}

      {step === "email" && (
        <form onSubmit={submitEmail} style={{ animation: "fadeIn 0.25s ease-out" }}>
          <div className="flex gap-2">
            <input ref={inputRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" autoComplete="email"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
            <button type="submit" className="h-12 px-5 rounded-xl font-semibold text-sm bg-[#083d2a] text-white">→</button>
          </div>
          <button type="button" onClick={skipEmail} className="text-xs text-gray-400 mt-2 hover:text-gray-600">Passer →</button>
        </form>
      )}

      {pastEmail && email && <Bubble from="user">{email === "client@lacantineafricaine.com" ? "Passé" : email}</Bubble>}

      {/* ── DONE ── */}
      {step === "done" && (
        <div className="text-center py-6" style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold text-[#083d2a]">C'est tout !</div>
          <div className="text-sm text-gray-500 mt-1">
            {deliveryMode === "pickup"
              ? "Retrait en magasin · Gratuit · ~15 min"
              : `${locationData?.zoneName} · ${locationData?.fee?.toLocaleString("fr-FR")} F · ~${locationData?.estimatedMinutes} min`
            }
          </div>
          <div className="mt-3 text-xs text-gray-400">Continuez avec le paiement ci-dessous ↓</div>
          <button type="button" onClick={restart} className="mt-2 text-xs text-[#083d2a] font-medium hover:underline">
            Modifier mes informations
          </button>
        </div>
      )}

      <div ref={bottomRef} />

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default ShippingAddress
