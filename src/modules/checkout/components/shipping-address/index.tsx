import { HttpTypes } from "@medusajs/types"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const GeolocationMap = dynamic(
  () => import("../geolocation-map"),
  { ssr: false, loading: () => <div className="py-12 text-center text-gray-400 animate-pulse">Chargement…</div> }
)

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
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || customer?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || customer?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": "",
    "shipping_address.postal_code": "BP",
    "shipping_address.city": "Bamako",
    "shipping_address.country_code": "ml",
    "shipping_address.province": "",
    "shipping_address.phone": cart?.shipping_address?.phone || customer?.phone || "",
    email: cart?.email || customer?.email || "",
  })

  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery")
  const [locationConfirmed, setLocationConfirmed] = useState(false)

  useEffect(() => {
    if (cart?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: cart.email }))
    }
  }, [cart])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLocationConfirmed = (data: any) => {
    setLocationConfirmed(true)
    setFormData(prev => ({
      ...prev,
      "shipping_address.address_1": `GPS: ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`,
      "shipping_address.province": data.zoneName || "",
      "shipping_address.company": data.zone || "",
      "shipping_address.city": "Bamako",
      "shipping_address.country_code": "ml",
    }))
  }

  return (
    <>
      {/* Delivery / Pickup toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button type="button" onClick={() => setDeliveryMode("delivery")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${deliveryMode === "delivery" ? "bg-white text-[#083d2a] shadow-sm" : "text-gray-500"}`}>
          🛵 Livraison
        </button>
        <button type="button" onClick={() => { setDeliveryMode("pickup"); setLocationConfirmed(true); setFormData(prev => ({ ...prev, "shipping_address.address_1": "Retrait en magasin", "shipping_address.province": "", "shipping_address.company": "pickup" })) }}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${deliveryMode === "pickup" ? "bg-white text-[#083d2a] shadow-sm" : "text-gray-500"}`}>
          🏪 Retrait en magasin
        </button>
      </div>

      {deliveryMode === "pickup" ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <div className="text-2xl mb-2">🏪</div>
          <div className="font-semibold text-green-800">Retrait en magasin</div>
          <div className="text-sm text-green-600 mt-1">La Cantine Africaine, Bamako</div>
          <div className="text-xs text-green-500 mt-1">Gratuit · Prêt en ~15 min</div>
        </div>
      ) : (
        <div className="mb-6">
          <GeolocationMap onLocationConfirmed={handleLocationConfirmed} />
        </div>
      )}

      {/* Hidden address fields for Medusa */}
      <input type="hidden" name="shipping_address.address_1" value={formData["shipping_address.address_1"]} />
      <input type="hidden" name="shipping_address.city" value={formData["shipping_address.city"]} />
      <input type="hidden" name="shipping_address.country_code" value={formData["shipping_address.country_code"]} />
      <input type="hidden" name="shipping_address.postal_code" value={formData["shipping_address.postal_code"]} />
      <input type="hidden" name="shipping_address.province" value={formData["shipping_address.province"]} />
      <input type="hidden" name="shipping_address.company" value={formData["shipping_address.company"]} />

      {/* Essential customer info only */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Prénom" name="shipping_address.first_name" autoComplete="given-name" value={formData["shipping_address.first_name"]} onChange={handleChange} required data-testid="shipping-first-name-input" />
        <Input label="Nom" name="shipping_address.last_name" autoComplete="family-name" value={formData["shipping_address.last_name"]} onChange={handleChange} required data-testid="shipping-last-name-input" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Input label="Téléphone" name="shipping_address.phone" autoComplete="tel" value={formData["shipping_address.phone"]} onChange={handleChange} required data-testid="shipping-phone-input" />
        <Input label="Email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required data-testid="shipping-email-input" />
      </div>
      <div className="my-6">
        <Checkbox label="Adresse de facturation identique" name="same_as_billing" checked={checked} onChange={onChange} data-testid="billing-address-checkbox" />
      </div>
    </>
  )
}

export default ShippingAddress
