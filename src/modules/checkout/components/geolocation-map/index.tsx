"use client"
import React, { useState, useEffect, useRef, useCallback } from "react"

const DELIVERY_ZONES = [
  { name: "Aci 2000", slug: "aci-2000", lat: 12.6127, lng: -8.0090, fee: 500, radius: 1.5, time: 20 },
  { name: "Badalabougou", slug: "badalabougou", lat: 12.6200, lng: -7.9880, fee: 500, radius: 1.5, time: 25 },
  { name: "Lafiabougou", slug: "lafiabougou", lat: 12.6350, lng: -8.0300, fee: 750, radius: 1.5, time: 30 },
  { name: "Quinzanbougou", slug: "quinzanbougou", lat: 12.6450, lng: -8.0050, fee: 500, radius: 1.0, time: 15 },
  { name: "Hamdallaye", slug: "hamdallaye", lat: 12.6080, lng: -8.0200, fee: 500, radius: 1.5, time: 20 },
  { name: "Hippodrome", slug: "hippodrome", lat: 12.6500, lng: -8.0150, fee: 750, radius: 1.5, time: 25 },
  { name: "Kalaban Coura", slug: "kalaban-coura", lat: 12.5850, lng: -8.0400, fee: 1000, radius: 2.0, time: 35 },
  { name: "Magnambougou", slug: "magnambougou", lat: 12.5700, lng: -8.0100, fee: 1000, radius: 2.0, time: 40 },
]

const RESTAURANT = { lat: 12.6230, lng: -8.0150 }

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function findZone(lat: number, lng: number) {
  let closest = null, minDist = Infinity
  for (const z of DELIVERY_ZONES) {
    const d = distanceKm(lat, lng, z.lat, z.lng)
    if (d < z.radius && d < minDist) { closest = z; minDist = d }
  }
  return closest
}

type LocationData = { lat: number; lng: number; zone: string | null; zoneName: string | null; fee: number; estimatedMinutes: number | null }
type Props = { onLocationConfirmed: (data: LocationData) => void }

export default function GeolocationMap({ onLocationConfirmed }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const LRef = useRef<any>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [zone, setZone] = useState<typeof DELIVERY_ZONES[0] | null>(null)
  const [phase, setPhase] = useState<"locating" | "confirm" | "done" | "error" | "manual">("locating")
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  // Auto-geolocate on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setPhase("manual")
      setErrorMsg("GPS non disponible")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setZone(findZone(pos.coords.latitude, pos.coords.longitude))
        setPhase("confirm")
      },
      (err) => {
        setPhase("manual")
        if (err.code === 1) setErrorMsg("Activez la localisation pour la livraison")
        else setErrorMsg("Position non disponible")
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  // Init map when position is available
  useEffect(() => {
    if (!mapRef.current || leafletMap.current || !position) return

    const initMap = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")
      LRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, { center: [position.lat, position.lng], zoom: 15, zoomControl: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OSM", maxZoom: 19 }).addTo(map)
      L.control.zoom({ position: "topright" }).addTo(map)

      // Restaurant
      L.marker([RESTAURANT.lat, RESTAURANT.lng], {
        icon: L.divIcon({ html: '<div style="width:28px;height:28px;background:#083d2a;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🍽</div>', iconSize: [28, 28], iconAnchor: [14, 14], className: "" }),
      }).addTo(map)

      // Customer pin — draggable
      const pin = L.marker([position.lat, position.lng], {
        icon: L.divIcon({ html: '<div style="width:40px;height:40px;background:#FF6D01;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(255,109,1,0.4);cursor:grab">📍</div>', iconSize: [40, 40], iconAnchor: [20, 20], className: "" }),
        draggable: true,
      }).addTo(map)

      pin.on("dragend", (e: any) => {
        const p = e.target.getLatLng()
        setPosition({ lat: p.lat, lng: p.lng })
        setZone(findZone(p.lat, p.lng))
        setConfirmed(false)
        setPhase("confirm")
      })

      markerRef.current = pin
      leafletMap.current = map

      // Tap map to move pin
      map.on("click", (e: any) => {
        pin.setLatLng(e.latlng)
        setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
        setZone(findZone(e.latlng.lat, e.latlng.lng))
        setConfirmed(false)
        setPhase("confirm")
      })
    }

    initMap()
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null } }
  }, [position?.lat, position?.lng])

  const handleConfirm = () => {
    if (!position) return
    setConfirmed(true)
    setPhase("done")
    onLocationConfirmed({
      lat: position.lat, lng: position.lng,
      zone: zone?.slug || null, zoneName: zone?.name || null,
      fee: zone?.fee || 0, estimatedMinutes: zone?.time || null,
    })
  }

  const retryLocate = () => {
    setPhase("locating")
    setErrorMsg("")
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setZone(findZone(pos.coords.latitude, pos.coords.longitude)); setPhase("confirm") },
      () => { setPhase("manual"); setErrorMsg("Position non disponible. Touchez la carte.") },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // ── LOCATING STATE ──
  if (phase === "locating") return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[#083d2a] flex items-center justify-center text-2xl mb-4 animate-pulse">📍</div>
      <div className="font-semibold text-base">Localisation en cours…</div>
      <div className="text-sm text-gray-500 mt-1">Veuillez autoriser l'accès à votre position</div>
    </div>
  )

  // ── ERROR / MANUAL STATE ──
  if (phase === "manual" && !position) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-3xl mb-3">📍</div>
      <div className="text-sm text-gray-600 mb-4">{errorMsg}</div>
      <button type="button" onClick={retryLocate}
        className="px-6 py-3 bg-[#083d2a] text-white rounded-lg text-sm font-semibold hover:bg-[#0f5c3f]">
        Réessayer la localisation
      </button>
    </div>
  )

  // ── MAP + CONFIRM STATE ──
  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 250 }}>
        <div ref={mapRef} className="w-full h-full" />
        {!confirmed && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-gray-600 shadow-md z-[1000]">
            Déplacez le pin pour ajuster
          </div>
        )}
      </div>

      {/* Zone info */}
      {zone ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <div className="font-semibold text-green-800 text-sm">📍 {zone.name}</div>
            <div className="text-green-600 text-xs">~{zone.time} min de livraison</div>
          </div>
          <div className="font-bold text-green-800">{zone.fee.toLocaleString("fr-FR")} F</div>
        </div>
      ) : position ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="font-semibold text-amber-800 text-sm">Zone non couverte</div>
          <div className="text-amber-600 text-xs">Déplacez le pin ou choisissez le retrait en magasin</div>
        </div>
      ) : null}

      {/* Confirm button */}
      {!confirmed ? (
        <button type="button" onClick={handleConfirm} disabled={!zone}
          className={`w-full py-4 rounded-xl text-base font-bold transition ${
            zone
              ? "bg-[#FF6D01] text-white hover:brightness-110 active:scale-[0.99]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          style={zone ? { boxShadow: "0 3px 12px rgba(255, 109, 1, 0.3)" } : {}}>
          Confirmer ma position
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3 text-green-700 font-semibold text-sm">
          <span>✓</span> Position confirmée — {zone?.name}
          <button type="button" onClick={() => { setConfirmed(false); setPhase("confirm") }} className="text-xs text-gray-400 ml-2 underline">Modifier</button>
        </div>
      )}
    </div>
  )
}
