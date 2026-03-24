"use client"
import React, { useState, useEffect } from "react"

const ZONES = [
  { name: "Aci 2000", slug: "aci-2000", lat: 12.6127, lng: -8.0090, fee: 500, radius: 1.5, time: 20 },
  { name: "Badalabougou", slug: "badalabougou", lat: 12.6200, lng: -7.9880, fee: 500, radius: 1.5, time: 25 },
  { name: "Lafiabougou", slug: "lafiabougou", lat: 12.6350, lng: -8.0300, fee: 750, radius: 1.5, time: 30 },
  { name: "Quinzanbougou", slug: "quinzanbougou", lat: 12.6450, lng: -8.0050, fee: 500, radius: 1.0, time: 15 },
  { name: "Hamdallaye", slug: "hamdallaye", lat: 12.6080, lng: -8.0200, fee: 500, radius: 1.5, time: 20 },
  { name: "Hippodrome", slug: "hippodrome", lat: 12.6500, lng: -8.0150, fee: 750, radius: 1.5, time: 25 },
  { name: "Kalaban Coura", slug: "kalaban-coura", lat: 12.5850, lng: -8.0400, fee: 1000, radius: 2.0, time: 35 },
  { name: "Magnambougou", slug: "magnambougou", lat: 12.5700, lng: -8.0100, fee: 1000, radius: 2.0, time: 40 },
]

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function findZone(lat: number, lng: number) {
  let best = null, min = Infinity
  for (const z of ZONES) { const d = distKm(lat, lng, z.lat, z.lng); if (d < z.radius && d < min) { best = z; min = d } }
  return best
}

type Props = {
  onLocationConfirmed: (data: { lat: number; lng: number; zone: string | null; zoneName: string | null; fee: number; estimatedMinutes: number | null }) => void
}

export default function GeolocationMap({ onLocationConfirmed }: Props) {
  const [phase, setPhase] = useState<"idle" | "locating" | "found" | "notfound" | "error" | "manual">("idle")
  const [zone, setZone] = useState<typeof ZONES[0] | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const locate = () => {
    if (!navigator.geolocation) { setPhase("error"); return }
    setPhase("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        const z = findZone(latitude, longitude)
        setZone(z)
        setPhase(z ? "found" : "notfound")
      },
      () => { setPhase("error") },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  // Auto-locate on mount
  useEffect(() => { locate() }, [])

  const confirm = () => {
    if (!coords) return
    onLocationConfirmed({
      lat: coords.lat, lng: coords.lng,
      zone: zone?.slug || null, zoneName: zone?.name || null,
      fee: zone?.fee || 0, estimatedMinutes: zone?.time || null,
    })
  }

  const selectManual = (z: typeof ZONES[0]) => {
    setZone(z)
    setCoords({ lat: z.lat, lng: z.lng })
    setPhase("found")
  }

  // ── LOCATING ──
  if (phase === "locating") return (
    <div className="flex flex-col items-center py-8">
      <div className="w-14 h-14 rounded-full bg-[#083d2a] flex items-center justify-center text-2xl animate-pulse mb-3">📍</div>
      <div className="font-semibold text-sm">Localisation en cours…</div>
      <div className="text-xs text-gray-400 mt-1">Autorisez l'accès à votre position</div>
    </div>
  )

  // ── FOUND ──
  if (phase === "found" && zone) return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-green-800">📍 {zone.name}</div>
          <div className="text-green-600 text-xs mt-0.5">~{zone.time} min · Livraison disponible</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-green-800 text-lg">{zone.fee.toLocaleString("fr-FR")} F</div>
        </div>
      </div>
      <button type="button" onClick={confirm}
        className="w-full py-3.5 rounded-xl bg-[#FF6D01] text-white font-bold text-sm hover:brightness-110 active:scale-[0.99] transition"
        style={{ boxShadow: "0 3px 12px rgba(255,109,1,0.3)" }}>
        Confirmer ma position
      </button>
      <button type="button" onClick={() => setPhase("manual")} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
        Ce n'est pas le bon quartier ? Choisir manuellement
      </button>
    </div>
  )

  // ── NOT FOUND / ERROR ──
  if (phase === "notfound" || phase === "error") return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <div className="text-2xl mb-2">{phase === "error" ? "📍" : "⚠️"}</div>
        <div className="font-semibold text-amber-800 text-sm">
          {phase === "error" ? "Localisation non disponible" : "Zone non couverte"}
        </div>
        <div className="text-amber-600 text-xs mt-1">Sélectionnez votre quartier ci-dessous</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map(z => (
          <button key={z.slug} type="button" onClick={() => selectManual(z)}
            className="py-3 px-3 rounded-xl border border-gray-200 text-left hover:border-[#083d2a] hover:bg-[#083d2a]/5 transition">
            <div className="font-semibold text-sm">{z.name}</div>
            <div className="text-xs text-gray-500">{z.fee.toLocaleString("fr-FR")} F · ~{z.time} min</div>
          </button>
        ))}
      </div>
      {phase === "error" && (
        <button type="button" onClick={locate} className="w-full text-xs text-[#083d2a] font-medium hover:underline py-1">
          Réessayer la localisation
        </button>
      )}
    </div>
  )

  // ── MANUAL ZONE SELECT ──
  if (phase === "manual") return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-600 mb-1">Sélectionnez votre quartier :</div>
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map(z => (
          <button key={z.slug} type="button" onClick={() => selectManual(z)}
            className="py-3 px-3 rounded-xl border border-gray-200 text-left hover:border-[#083d2a] hover:bg-[#083d2a]/5 transition">
            <div className="font-semibold text-sm">{z.name}</div>
            <div className="text-xs text-gray-500">{z.fee.toLocaleString("fr-FR")} F · ~{z.time} min</div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── IDLE (shouldn't reach) ──
  return (
    <button type="button" onClick={locate}
      className="w-full py-4 rounded-xl bg-[#083d2a] text-white font-bold text-sm">
      📍 Me localiser
    </button>
  )
}
