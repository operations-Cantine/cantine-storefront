"use client"
import React, { useState, useEffect, useRef, useCallback } from "react"

// Bamako delivery zones with polygon-like center points and radius
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

// Restaurant location
const RESTAURANT = { lat: 12.6230, lng: -8.0150, name: "La Cantine Africaine" }

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function findZone(lat: number, lng: number) {
  let closest = null
  let minDist = Infinity
  for (const z of DELIVERY_ZONES) {
    const d = distanceKm(lat, lng, z.lat, z.lng)
    if (d < z.radius && d < minDist) { closest = z; minDist = d }
  }
  return closest
}

type Props = {
  onLocationSelect: (data: {
    lat: number
    lng: number
    zone: string | null
    zoneName: string | null
    fee: number
    estimatedMinutes: number | null
  }) => void
}

export default function GeolocationMap({ onLocationSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [zone, setZone] = useState<typeof DELIVERY_ZONES[0] | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    const initMap = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, {
        center: [RESTAURANT.lat, RESTAURANT.lng],
        zoom: 13,
        zoomControl: false,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Add zoom control top-right
      L.control.zoom({ position: "topright" }).addTo(map)

      // Restaurant marker (green)
      const restaurantIcon = L.divIcon({
        html: '<div style="width:32px;height:32px;background:#083d2a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🍽</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: "",
      })
      L.marker([RESTAURANT.lat, RESTAURANT.lng], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup("<b>La Cantine Africaine</b><br>Votre restaurant")

      // Draw zone circles (subtle)
      DELIVERY_ZONES.forEach(z => {
        L.circle([z.lat, z.lng], {
          radius: z.radius * 1000,
          color: "#083d2a",
          fillColor: "#083d2a",
          fillOpacity: 0.05,
          weight: 1,
          opacity: 0.2,
        }).addTo(map)
      })

      leafletMap.current = map

      // Click to place marker
      map.on("click", (e: any) => {
        updatePosition(e.latlng.lat, e.latlng.lng, L)
      })

      setMapLoaded(true)
    }

    initMap()

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])

  const updatePosition = useCallback(async (lat: number, lng: number, L?: any) => {
    if (!L) L = (await import("leaflet")).default

    setPosition({ lat, lng })
    const foundZone = findZone(lat, lng)
    setZone(foundZone)

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else if (leafletMap.current) {
      const customerIcon = L.divIcon({
        html: '<div style="width:36px;height:36px;background:#FF6D01;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;box-shadow:0 2px 10px rgba(255,109,1,0.4);cursor:grab">📍</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: "",
      })
      markerRef.current = L.marker([lat, lng], { icon: customerIcon, draggable: true }).addTo(leafletMap.current)
      markerRef.current.on("dragend", (e: any) => {
        const pos = e.target.getLatLng()
        updatePosition(pos.lat, pos.lng, L)
      })
    }

    onLocationSelect({
      lat, lng,
      zone: foundZone?.slug || null,
      zoneName: foundZone?.name || null,
      fee: foundZone?.fee || 0,
      estimatedMinutes: foundZone?.time || null,
    })
  }, [onLocationSelect])

  const geolocate = () => {
    setLocating(true)
    setError(null)

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par votre navigateur")
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        await updatePosition(latitude, longitude)
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 15, { animate: true })
        }
        setLocating(false)
      },
      (err) => {
        if (err.code === 1) setError("Permission refusée. Activez la localisation dans vos paramètres.")
        else if (err.code === 2) setError("Position non disponible. Vérifiez votre GPS.")
        else setError("Délai expiré. Réessayez.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <div className="space-y-3">
      {/* Geolocate button */}
      <button
        type="button"
        onClick={geolocate}
        disabled={locating}
        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg text-sm font-semibold transition ${
          locating
            ? "bg-gray-100 text-gray-400 cursor-wait"
            : "bg-[#083d2a] text-white hover:bg-[#0f5c3f] active:scale-[0.99]"
        }`}
        style={!locating ? { boxShadow: "0 2px 10px rgba(8, 61, 42, 0.25)" } : {}}
      >
        {locating ? (
          <><span className="animate-spin">◌</span> Localisation en cours…</>
        ) : (
          <><span className="text-lg">📍</span> Me localiser</>
        )}
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
        <div ref={mapRef} className="w-full h-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            Chargement de la carte…
          </div>
        )}
        {!position && mapLoaded && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 text-center">
            Appuyez sur &quot;Me localiser&quot; ou touchez la carte pour placer votre position
          </div>
        )}
      </div>

      {/* Zone result */}
      {position && (
        <div className={`rounded-xl px-4 py-3 text-sm ${zone ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
          {zone ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-green-800">📍 {zone.name}</div>
                <div className="text-green-600 text-xs mt-0.5">Livraison disponible · ~{zone.time} min</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-800">{zone.fee.toLocaleString("fr-FR")} FCFA</div>
                <div className="text-green-600 text-xs">frais de livraison</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-amber-800">⚠ Zone non couverte</div>
              <div className="text-amber-600 text-xs mt-0.5">
                Désolé, la livraison n'est pas disponible à cet endroit.
                Vous pouvez choisir &quot;Retrait en magasin&quot; à la place.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
