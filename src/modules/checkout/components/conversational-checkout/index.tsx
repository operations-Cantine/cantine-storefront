"use client"
import React, { useState, useEffect, useRef, useMemo } from "react"
import { updateCart, addToCart, setShippingMethod, initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { PaymentConfig } from "@lib/data/payment"

// ── Types ──
type Step = "mode" | "location" | "name" | "phone" | "crosssell" | "payment" | "summary" | "placing" | "done"

const STEP_ORDER: Step[] = ["mode", "location", "name", "phone", "crosssell", "payment", "summary"]

function prevStep(current: Step, mode: "delivery" | "pickup" | null): Step | null {
  const steps = mode === "pickup"
    ? ["mode", "name", "phone", "crosssell", "payment", "summary"]
    : STEP_ORDER
  const idx = steps.indexOf(current)
  return idx > 0 ? steps[idx - 1] as Step : null
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-gray-400 hover:text-[#083d2a] transition" style={{ animation: "fadeUp 0.2s ease-out" }}>
      ← Modifier
    </button>
  )
}

const ZONES = [
  { name: "Aci 2000", slug: "aci-2000", lat: 12.6127, lng: -8.0090, fee: 500, r: 1.5, time: 20 },
  { name: "Badalabougou", slug: "badalabougou", lat: 12.6200, lng: -7.9880, fee: 500, r: 1.5, time: 25 },
  { name: "Lafiabougou", slug: "lafiabougou", lat: 12.6350, lng: -8.0300, fee: 750, r: 1.5, time: 30 },
  { name: "Quinzanbougou", slug: "quinzanbougou", lat: 12.6450, lng: -8.0050, fee: 500, r: 1.0, time: 15 },
  { name: "Hamdallaye", slug: "hamdallaye", lat: 12.6080, lng: -8.0200, fee: 500, r: 1.5, time: 20 },
  { name: "Hippodrome", slug: "hippodrome", lat: 12.6500, lng: -8.0150, fee: 750, r: 1.5, time: 25 },
  { name: "Kalaban Coura", slug: "kalaban-coura", lat: 12.5850, lng: -8.0400, fee: 1000, r: 2.0, time: 35 },
  { name: "Magnambougou", slug: "magnambougou", lat: 12.5700, lng: -8.0100, fee: 1000, r: 2.0, time: 40 },
]

type PaymentOption = { id: string; label: string; icon: string; desc: string }

const ALL_PAYMENTS: PaymentOption[] = [
  { id: "cash", label: "Espèces", icon: "💵", desc: "Payez le livreur à la réception" },
  { id: "orange_money", label: "Orange Money", icon: "🟠", desc: "Paiement mobile Orange" },
  { id: "wave", label: "Wave", icon: "🌊", desc: "Paiement mobile Wave" },
  { id: "moov_money", label: "Moov Money", icon: "📱", desc: "Paiement mobile Moov" },
  { id: "carte_cantine", label: "Carte Cantine", icon: "💳", desc: "Votre portefeuille prépayé" },
]

const CC = ["#083d2a", "#FF6D01", "#76ad2a", "#faa72a", "#2c84db"]

function distKm(a: number, b: number, c: number, d: number) {
  const R = 6371, dL = (c-a)*Math.PI/180, dG = (d-b)*Math.PI/180
  const x = Math.sin(dL/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

function findZone(lat: number, lng: number) {
  let best = null, min = Infinity
  for (const z of ZONES) { const d = distKm(lat, lng, z.lat, z.lng); if (d < z.r && d < min) { best = z; min = d } }
  return best
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`

// ── USSD Instructions ──
function UssdInstructions({ paymentId, config, amount }: { paymentId: string; config: PaymentConfig | null; amount: number }) {
  if (!config) return null
  const amountStr = amount.toString()

  if (paymentId === "orange_money" && config.orange_money_phone) {
    const code = `#144#11*${config.orange_money_phone}*${amountStr}#`
    return (
      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm" style={{ animation: "fadeUp 0.25s ease-out" }}>
        <div className="font-semibold text-orange-800 mb-1">📲 Composez sur votre téléphone :</div>
        <a href={`tel:${encodeURIComponent(code)}`} className="block text-center font-mono text-lg font-bold text-white bg-orange-600 rounded-lg py-3 px-3 hover:bg-orange-700 active:scale-[0.98] transition shadow-sm">
          📞 {code}
          <span className="block text-xs font-sans font-medium mt-1 opacity-90">Appuyez pour composer</span>
        </a>
        <div className="text-xs text-orange-700 mt-2">
          Envoyez {fmt(amount)} au {config.orange_money_phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
        </div>
        {config.fee_payer === "receiver" ? (
          <div className="text-xs text-green-700 mt-1 font-medium">✓ Frais de transfert offerts par La Cantine</div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">Frais de transfert à votre charge</div>
        )}
      </div>
    )
  }

  if (paymentId === "moov_money" && config.moov_phone) {
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm" style={{ animation: "fadeUp 0.25s ease-out" }}>
        <div className="font-semibold text-blue-800 mb-1">📲 Composez sur votre téléphone :</div>
        <div className="text-center font-mono text-lg font-bold text-blue-900 bg-white rounded-lg py-2 px-3 border border-blue-300">
          *166*2*1*{config.moov_phone}*{amountStr}*PIN#
        </div>
        <div className="text-xs text-blue-700 mt-2">Remplacez PIN par votre code secret Moov Money</div>
        {config.fee_payer === "receiver" ? (
          <div className="text-xs text-green-700 mt-1 font-medium">✓ Frais de transfert offerts par La Cantine</div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">Frais de transfert à votre charge</div>
        )}
      </div>
    )
  }

  if (paymentId === "wave" && config.wave_phone) {
    return (
      <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-sm" style={{ animation: "fadeUp 0.25s ease-out" }}>
        <div className="font-semibold text-cyan-800 mb-1">📲 Via l'application Wave :</div>
        <div className="text-center text-sm text-cyan-900 bg-white rounded-lg py-2 px-3 border border-cyan-300">
          Envoyez <span className="font-bold">{fmt(amount)}</span> au <span className="font-bold">{config.wave_phone}</span>
        </div>
        {config.fee_payer === "receiver" ? (
          <div className="text-xs text-green-700 mt-2 font-medium">✓ Frais de transfert offerts par La Cantine</div>
        ) : (
          <div className="text-xs text-gray-500 mt-2">Frais de transfert à votre charge</div>
        )}
      </div>
    )
  }

  return null
}

// ── Confetti ──
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d"); if (!ctx) return
    c.width = window.innerWidth; c.height = window.innerHeight
    const P = Array.from({ length: 60 }, () => ({
      x: Math.random()*c.width, y: -10-Math.random()*200, w: 5+Math.random()*6, h: 3+Math.random()*5,
      c: CC[Math.floor(Math.random()*CC.length)], vx: (Math.random()-0.5)*3, vy: 2+Math.random()*3, r: Math.random()*6, o: 1,
    }))
    let f: number
    const go = () => {
      ctx.clearRect(0, 0, c.width, c.height); let alive = false
      for (const p of P) { p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.r+=0.1; if(p.y>c.height-40) p.o-=0.03; if(p.o<=0) continue; alive=true; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.globalAlpha=p.o; ctx.fillStyle=p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore() }
      if (alive) f = requestAnimationFrame(go)
    }
    f = requestAnimationFrame(go)
    return () => cancelAnimationFrame(f)
  }, [])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-50" />
}

// ── Chat UI ──
function Bot({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [show, setShow] = useState(delay === 0)
  useEffect(() => { if (delay > 0) { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) } }, [delay])
  if (!show) return <div className="h-8" />
  return <div className="flex justify-start" style={{ animation: "fadeUp 0.25s ease-out" }}><div className="max-w-[90%] px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm text-sm leading-relaxed text-gray-800">{children}</div></div>
}

function User({ children, onEdit }: { children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2" style={{ animation: "fadeUp 0.2s ease-out" }}>
      {onEdit && <button type="button" onClick={onEdit} className="text-xs text-gray-400 hover:text-[#083d2a] transition">Modifier</button>}
      <div className="max-w-[80%] px-4 py-2.5 bg-[#083d2a] text-white rounded-2xl rounded-br-md text-sm">{children}</div>
    </div>
  )
}

function Choices({ options, onSelect }: { options: { id: string; label: string; icon?: string; sub?: string }[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" style={{ animation: "fadeUp 0.25s ease-out" }}>
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onSelect(o.id)}
          className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-[#083d2a] hover:bg-[#083d2a]/5 hover:text-[#083d2a] transition active:scale-[0.97] text-left">
          {o.icon && <span className="mr-1.5">{o.icon}</span>}{o.label}
          {o.sub && <span className="block text-xs font-normal text-gray-400 mt-0.5">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function Input({ placeholder, type = "text", onSubmit, autoComplete }: { placeholder: string; type?: string; onSubmit: (v: string) => void; autoComplete?: string }) {
  const [v, setV] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 200) }, [])
  return (
    <form onSubmit={e => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()) }} className="flex gap-2" style={{ animation: "fadeUp 0.25s ease-out" }}>
      <input ref={ref} type={type} value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#083d2a] focus:ring-2 focus:ring-[#083d2a]/10" />
      <button type="submit" disabled={!v.trim()}
        className={`h-12 w-12 rounded-xl font-bold text-lg transition ${v.trim() ? "bg-[#083d2a] text-white" : "bg-gray-200 text-gray-400"}`}>→</button>
    </form>
  )
}

// ── Main Component ──
export default function ConversationalCheckout({
  cart,
  shippingMethods,
  paymentMethods,
  paymentConfig,
  allProducts,
}: {
  cart: HttpTypes.StoreCart
  shippingMethods: HttpTypes.StoreCartShippingOption[]
  paymentMethods: any[]
  paymentConfig: PaymentConfig | null
  allProducts: HttpTypes.StoreProduct[]
}) {
  const [step, setStep] = useState<Step>("mode")
  const [mode, setMode] = useState<"delivery" | "pickup" | null>(null)
  const [zone, setZone] = useState<typeof ZONES[0] | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [name, setName] = useState(cart.shipping_address?.first_name || "")
  const [phone, setPhone] = useState(cart.shipping_address?.phone || "")
  const [payment, setPayment] = useState<string | null>(null)
  const [crossSellAccepted, setCrossSellAccepted] = useState<HttpTypes.StoreProduct | null>(null)
  const [crossSellDeclined, setCrossSellDeclined] = useState(false)
  const [crossSellAdding, setCrossSellAdding] = useState(false)
  const crossSellLockedRef = useRef<HttpTypes.StoreProduct | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [orderId, setOrderId] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [step, zone, error])

  // ── Smart cross-sell: pick a complementary product (locked on first compute) ──
  const crossSellOffer = useMemo(() => {
    // Once locked, never recompute — prevents Math.random() instability on re-render
    if (crossSellLockedRef.current !== undefined) return crossSellLockedRef.current

    if (!allProducts.length) {
      crossSellLockedRef.current = null
      return null
    }

    const cartProductIds = new Set((cart.items || []).map((i: any) => i.product_id))
    const cartCategoryHandles = new Set(
      (cart.items || []).flatMap((i: any) => {
        const product = allProducts.find((p) => p.id === i.product_id)
        return (product?.categories || []).map((c: any) => c.handle)
      })
    )

    // Available = not already in cart, has a variant with price
    const available = allProducts.filter((p) => {
      if (cartProductIds.has(p.id)) return false
      return p.variants?.[0]?.calculated_price?.calculated_amount != null
    })

    if (!available.length) {
      crossSellLockedRef.current = null
      return null
    }

    // Categorize available products
    const byCategory = (handle: string) =>
      available.filter((p) => (p.categories || []).some((c: any) => c.handle === handle))

    const MAINS = ["sandwiches", "combos", "riz-et-plats"]
    const hasMains = MAINS.some((h) => cartCategoryHandles.has(h))
    const hasDrinks = cartCategoryHandles.has("boissons")
    const hasDesserts = cartCategoryHandles.has("desserts-et-snacks")

    // Priority order: complement what's missing
    let candidates: HttpTypes.StoreProduct[] = []
    if (hasMains && !hasDrinks) {
      candidates = byCategory("boissons")
    }
    if (!candidates.length && hasMains && !hasDesserts) {
      candidates = byCategory("desserts-et-snacks")
    }
    if (!candidates.length && hasDrinks && !hasMains) {
      candidates = byCategory("sandwiches")
    }
    if (!candidates.length && !hasDesserts) {
      candidates = byCategory("desserts-et-snacks")
    }
    if (!candidates.length && !hasDrinks) {
      candidates = byCategory("boissons")
    }
    // Last resort: sauces as add-on
    if (!candidates.length) {
      candidates = byCategory("sauces")
    }

    if (!candidates.length) {
      crossSellLockedRef.current = null
      return null
    }

    // Pick cheapest from the best category (deterministic, no Math.random)
    candidates.sort((a, b) => {
      const pa = a.variants?.[0]?.calculated_price?.calculated_amount || 0
      const pb = b.variants?.[0]?.calculated_price?.calculated_amount || 0
      return pa - pb
    })
    const picked = candidates[0]
    crossSellLockedRef.current = picked
    return picked
  }, [allProducts, cart.items])

  // Auto-skip crosssell step if no products available
  useEffect(() => {
    if (step === "crosssell" && !crossSellOffer) setStep("payment")
  }, [step, crossSellOffer])

  const crossSellPrice = crossSellOffer?.variants?.[0]?.calculated_price?.calculated_amount || 0
  const crossSellVariantId = crossSellOffer?.variants?.[0]?.id

  // Build available payment methods based on config
  const availablePayments = useMemo(() => {
    return ALL_PAYMENTS.filter((p) => {
      if (p.id === "cash" || p.id === "carte_cantine") return true
      if (p.id === "orange_money") return !!paymentConfig?.orange_money_phone
      if (p.id === "moov_money") return !!paymentConfig?.moov_phone
      if (p.id === "wave") return !!paymentConfig?.wave_phone
      return true
    })
  }, [paymentConfig])

  // Find shipping option IDs
  const deliveryOption = shippingMethods.find(m => m.name?.includes("Livraison"))
  const pickupOption = shippingMethods.find(m => m.name?.includes("Retrait"))

  // Cart items summary
  const items = cart.items || []
  const cartTotal = cart.item_total || 0

  // WhatsApp number from config or fallback
  const whatsappNumber = paymentConfig?.whatsapp_number || "22370196453"

  // ── Handlers ──
  const chooseMode = async (m: string) => {
    setMode(m as any)
    if (m === "pickup") {
      await updateCart({
        email: "pos@lacantineafricaine.com",
        shipping_address: { first_name: "Client", last_name: "Retrait", address_1: "Retrait en magasin", city: "Bamako", country_code: "ml", postal_code: "BP", phone: "" },
        billing_address: { first_name: "Client", last_name: "Retrait", address_1: "Retrait en magasin", city: "Bamako", country_code: "ml", postal_code: "BP", phone: "" },
      })
      if (pickupOption) await setShippingMethod({ cartId: cart.id, shippingMethodId: pickupOption.id })
      setStep("name")
    } else {
      setStep("location")
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { const z = findZone(pos.coords.latitude, pos.coords.longitude); setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setZone(z); },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }
    }
  }

  const confirmZone = async (z: typeof ZONES[0]) => {
    setZone(z)
    setCoords({ lat: z.lat, lng: z.lng })
    await updateCart({
      email: "client@lacantineafricaine.com",
      shipping_address: { first_name: "Client", last_name: "Livraison", address_1: `GPS: ${z.lat}, ${z.lng} — ${z.name}`, city: "Bamako", country_code: "ml", postal_code: "BP", phone: "" },
      billing_address: { first_name: "Client", last_name: "Livraison", address_1: `GPS: ${z.lat}, ${z.lng}`, city: "Bamako", country_code: "ml", postal_code: "BP", phone: "" },
    })
    if (deliveryOption) await setShippingMethod({ cartId: cart.id, shippingMethodId: deliveryOption.id })
    setStep("name")
  }

  const submitName = async (v: string) => {
    setName(v)
    await updateCart({ shipping_address: { first_name: v, last_name: v, address_1: cart.shipping_address?.address_1 || "Bamako", city: "Bamako", country_code: "ml", postal_code: "BP", phone: "" } })
    setStep("phone")
  }

  const submitPhone = async (v: string) => {
    setPhone(v)
    await updateCart({ email: `${v.replace(/\s/g, "")}@sms.lacantineafricaine.com`, shipping_address: { first_name: name, last_name: name, address_1: cart.shipping_address?.address_1 || "Bamako", city: "Bamako", country_code: "ml", postal_code: "BP", phone: v } })
    setStep("crosssell")
  }

  const handleCrossSell = async (accepted: boolean) => {
    if (accepted && crossSellVariantId && crossSellOffer) {
      setCrossSellAdding(true)
      try {
        await addToCart({ variantId: crossSellVariantId, quantity: 1, countryCode: "ml" })
        setCrossSellAccepted(crossSellOffer)
      } catch {
        // Silently fail — cross-sell is optional
      }
      setCrossSellAdding(false)
    } else {
      setCrossSellDeclined(true)
    }
    setStep("payment")
  }

  const choosePayment = async (p: string) => {
    setPayment(p)
    try {
      await Promise.all([
        initiatePaymentSession(cart, { provider_id: "pp_system_default" }),
        updateCart({ metadata: { ...cart.metadata, payment_method: p } }),
      ])
      setStep("summary")
    } catch (e: any) {
      setError(e.message || "Erreur lors du paiement. Réessayez.")
    }
  }

  const confirmOrder = async () => {
    setStep("placing")
    setError(null)
    try {
      const result = await placeOrder()
      if (result?.type === "order" && result.order) {
        setOrderId(result.order.display_id?.toString() || result.order.id)
        setStep("done")
        setConfetti(true)
        setTimeout(() => setConfetti(false), 4000)
      } else {
        setError("Erreur lors de la commande. Réessayez.")
        setStep("summary")
      }
    } catch (e: any) {
      setError(e.message || "Erreur")
      setStep("summary")
    }
  }

  const shippingFee = mode === "pickup" ? 0 : (zone?.fee || 500)
  const crossSellTotal = crossSellAccepted ? crossSellPrice : 0
  const total = cartTotal + shippingFee + crossSellTotal

  // ── Render ──
  const past = (s: Step) => {
    const order: Step[] = ["mode", "location", "name", "phone", "crosssell", "payment", "summary", "placing", "done"]
    return order.indexOf(step) > order.indexOf(s)
  }

  const paymentLabel = (id: string | null) => availablePayments.find(p => p.id === id)
  const hasCrossSell = !!crossSellOffer
  const crossSellDone = !!crossSellAccepted || crossSellDeclined

  return (
    <div className="max-w-lg mx-auto space-y-3 py-4">
      {confetti && <Confetti />}

      {/* Cart summary at top */}
      <div className="bg-[#083d2a]/5 rounded-2xl p-4 mb-4">
        <div className="text-xs font-semibold text-[#083d2a] uppercase tracking-wider mb-2">Votre commande</div>
        {items.map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>{item.quantity}× {item.product_title || item.title}</span>
            <span className="font-semibold tabular-nums">{fmt(item.unit_price * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-[#083d2a]/10 mt-2 pt-2 flex justify-between font-bold text-sm">
          <span>Sous-total</span><span>{fmt(cartTotal)}</span>
        </div>
      </div>

      {/* ── MODE ── */}
      <Bot>Bienvenue ! 👋 Comment souhaitez-vous recevoir votre commande ?</Bot>
      {step === "mode" && (
        <Choices options={[{ id: "delivery", label: "Livraison", icon: "🛵", sub: "À domicile" }, { id: "pickup", label: "Retrait en magasin", icon: "🏪", sub: "Gratuit" }]} onSelect={chooseMode} />
      )}
      {past("mode") && <User onEdit={() => { setMode(null); setStep("mode") }}>{mode === "pickup" ? "🏪 Retrait en magasin" : "🛵 Livraison"}</User>}

      {/* ── LOCATION ── */}
      {past("mode") && mode === "delivery" && (
        <>
          <Bot delay={200}>{zone ? `📍 Vous êtes à ${zone.name} (${fmt(zone.fee)} livraison, ~${zone.time} min). C'est correct ?` : "📍 Localisation en cours... Sinon, choisissez votre quartier :"}</Bot>
          {step === "location" && (
            <div className="space-y-2" style={{ animation: "fadeUp 0.25s ease-out" }}>
              {zone && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => confirmZone(zone)} className="flex-1 py-3 bg-[#FF6D01] text-white font-bold rounded-xl active:scale-[0.97]" style={{ boxShadow: "0 3px 12px rgba(255,109,1,0.3)" }}>
                    ✓ Oui, c'est ici
                  </button>
                  <button type="button" onClick={() => setZone(null)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Changer</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {ZONES.map(z => (
                  <button key={z.slug} type="button" onClick={() => confirmZone(z)}
                    className={`py-2.5 px-3 rounded-xl border text-left text-sm transition active:scale-[0.97] ${zone?.slug === z.slug ? "border-[#083d2a] bg-[#083d2a]/5" : "border-gray-200 hover:border-[#083d2a]/30"}`}>
                    <div className="font-semibold">{z.name}</div>
                    <div className="text-xs text-gray-500">{fmt(z.fee)} · ~{z.time} min</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {past("location") && zone && <User onEdit={() => setStep("location")}>📍 {zone.name}</User>}
        </>
      )}

      {/* ── NAME ── */}
      {past("location") && <Bot delay={200}>{mode === "pickup" ? "Parfait ! Comment vous appelez-vous ?" : zone ? `Super, livraison à ${zone.name} ! Comment vous appelez-vous ?` : "Comment vous appelez-vous ?"}</Bot>}
      {step === "name" && <Input placeholder="Votre prénom" autoComplete="given-name" onSubmit={submitName} />}
      {past("name") && <User onEdit={() => setStep("name")}>{name}</User>}

      {/* ── PHONE ── */}
      {past("name") && <Bot delay={200}>Enchanté {name} ! 📱 Votre numéro pour {mode === "pickup" ? "vous prévenir" : "le livreur"} ?</Bot>}
      {step === "phone" && <Input placeholder="70 XX XX XX" type="tel" autoComplete="tel" onSubmit={submitPhone} />}
      {past("phone") && <User onEdit={() => setStep("phone")}>{phone}</User>}

      {/* ── CROSS-SELL ── */}
      {past("phone") && hasCrossSell && (
        <Bot delay={300}>
          <div>Un petit extra ? 😋</div>
          <div className="mt-2 p-2 bg-gray-50 rounded-lg flex items-center gap-3">
            {crossSellOffer!.thumbnail ? (
              <img src={crossSellOffer!.thumbnail} alt={crossSellOffer!.title} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-2xl">🍽️</div>
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm">{crossSellOffer!.title}</div>
              <div className="text-xs text-gray-500">{crossSellOffer!.subtitle || crossSellOffer!.description || ""} · {fmt(crossSellPrice)}</div>
            </div>
          </div>
        </Bot>
      )}
      {past("phone") && !hasCrossSell && <>{/* No cross-sell products available, skip */}</>}
      {step === "crosssell" && hasCrossSell && (
        <Choices
          options={[
            { id: "yes", label: crossSellAdding ? "Ajout..." : "Oui, j'ajoute !", icon: "✓" },
            { id: "no", label: "Non merci" },
          ]}
          onSelect={(id) => handleCrossSell(id === "yes")}
        />
      )}
      {/* Show user response only if cross-sell was actually shown */}
      {past("crosssell") && hasCrossSell && <User onEdit={() => setStep("crosssell")}>{crossSellAccepted ? `✓ ${crossSellAccepted.title} ajouté !` : "Non merci"}</User>}

      {/* ── PAYMENT ── */}
      {past("crosssell") && <Bot delay={200}>Comment souhaitez-vous payer ?</Bot>}
      {step === "payment" && <Choices options={availablePayments.map(p => ({ id: p.id, label: p.label, icon: p.icon, sub: p.desc }))} onSelect={choosePayment} />}
      {past("payment") && payment && (
        <>
          <User onEdit={() => setStep("payment")}>{paymentLabel(payment)?.icon} {paymentLabel(payment)?.label}</User>
          <UssdInstructions paymentId={payment} config={paymentConfig} amount={total} />
        </>
      )}

      {/* ── SUMMARY ── */}
      {past("payment") && (
        <Bot delay={200}>
          <div className="font-semibold mb-2">Récapitulatif de votre commande :</div>
          {items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm py-0.5">
              <span>{item.quantity}× {item.product_title || item.title}</span>
              <span className="tabular-nums">{fmt(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          {crossSellAccepted && (
            <div className="flex justify-between text-sm py-0.5">
              <span>1× {crossSellAccepted.title}</span>
              <span className="tabular-nums">{fmt(crossSellPrice)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 mt-2 pt-2 space-y-0.5 text-sm">
            {mode === "delivery" && <div className="flex justify-between"><span>Livraison ({zone?.name})</span><span className="tabular-nums">{fmt(shippingFee)}</span></div>}
            {mode === "pickup" && <div className="flex justify-between"><span>Retrait en magasin</span><span className="text-green-600">Gratuit</span></div>}
            <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span className="text-[#083d2a]">{fmt(total)}</span></div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Paiement: {paymentLabel(payment)?.label}</div>
        </Bot>
      )}
      {step === "summary" && (
        <div style={{ animation: "fadeUp 0.25s ease-out" }}>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-2 mb-2">{error}</div>}
          <button type="button" onClick={confirmOrder}
            className="w-full py-4 bg-[#FF6D01] text-white font-bold text-base rounded-xl active:scale-[0.98] transition"
            style={{ boxShadow: "0 4px 16px rgba(255,109,1,0.35)" }}>
            ✓ Confirmer ma commande
          </button>
        </div>
      )}

      {/* ── PLACING ── */}
      {step === "placing" && (
        <div className="flex items-center justify-center py-6 gap-3">
          <div className="w-5 h-5 border-2 border-[#083d2a] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">Envoi de votre commande...</span>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && (
        <div className="text-center py-8" style={{ animation: "fadeUp 0.3s ease-out" }}>
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-2xl font-bold text-[#083d2a]">Commande confirmée !</div>
          <div className="text-gray-600 mt-2">Commande #{orderId}</div>
          <div className="text-sm text-gray-500 mt-1">
            {mode === "pickup" ? "Prête dans ~15 min au restaurant" : `Livraison à ${zone?.name} dans ~${zone?.time} min`}
          </div>
          <div className="mt-4 text-sm text-gray-500">📱 Vous recevrez un message WhatsApp de confirmation</div>
          <a href={`https://wa.me/${whatsappNumber}?text=Commande%20%23${orderId}`} target="_blank" rel="noreferrer"
            className="inline-block mt-4 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-xl text-sm hover:brightness-110">
            Contacter sur WhatsApp
          </a>
        </div>
      )}

      <div ref={bottomRef} />

      <style jsx>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
