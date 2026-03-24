import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import dynamic from "next/dynamic"

// Dynamic import for Leaflet (no SSR)
const GeolocationMap = dynamic(
  () => import("../geolocation-map"),
  { ssr: false, loading: () => <div className="h-[280px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Chargement de la carte…</div> }
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
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery")
  const [locationData, setLocationData] = useState<{
    lat: number; lng: number; zone: string | null; zoneName: string | null; fee: number; estimatedMinutes: number | null
  } | null>(null)

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }
    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // When location is selected on map, update the hidden address fields
  const handleLocationSelect = (data: typeof locationData) => {
    setLocationData(data)
    if (data) {
      setFormData((prev: Record<string, any>) => ({
        ...prev,
        "shipping_address.address_1": data.zoneName ? `GPS: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)} — ${data.zoneName}` : `GPS: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
        "shipping_address.city": "Bamako",
        "shipping_address.province": data.zoneName || "Bamako",
        "shipping_address.country_code": "ml",
        "shipping_address.postal_code": "BP",
        "shipping_address.company": data.zone || "",
      }))
    }
  }

  return (
    <>
      {/* Delivery mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setDeliveryMode("delivery")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
            deliveryMode === "delivery"
              ? "bg-[#083d2a] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🛵 Livraison
        </button>
        <button
          type="button"
          onClick={() => setDeliveryMode("pickup")}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
            deliveryMode === "pickup"
              ? "bg-[#083d2a] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🏪 Retrait en magasin
        </button>
      </div>

      {deliveryMode === "pickup" ? (
        /* Pickup mode — just show restaurant info */
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="font-semibold text-green-800 mb-1">🏪 Retrait en magasin</div>
          <div className="text-sm text-green-700">La Cantine Africaine</div>
          <div className="text-xs text-green-600 mt-1">Gratuit · Prêt en ~15 min après confirmation</div>
          {/* Hidden fields for Medusa */}
          <input type="hidden" name="shipping_address.address_1" value="Retrait en magasin — La Cantine Africaine" />
          <input type="hidden" name="shipping_address.city" value="Bamako" />
          <input type="hidden" name="shipping_address.country_code" value="ml" />
          <input type="hidden" name="shipping_address.postal_code" value="BP" />
        </div>
      ) : (
        /* Delivery mode — GPS map */
        <div className="mb-6">
          <GeolocationMap onLocationSelect={handleLocationSelect} />
          {/* Hidden fields populated by map */}
          <input type="hidden" name="shipping_address.address_1" value={formData["shipping_address.address_1"]} />
          <input type="hidden" name="shipping_address.city" value={formData["shipping_address.city"]} />
          <input type="hidden" name="shipping_address.country_code" value={formData["shipping_address.country_code"]} />
          <input type="hidden" name="shipping_address.postal_code" value={formData["shipping_address.postal_code"]} />
          <input type="hidden" name="shipping_address.province" value={formData["shipping_address.province"]} />
          <input type="hidden" name="shipping_address.company" value={formData["shipping_address.company"]} />
        </div>
      )}

      {/* Customer info — always needed */}
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {`Bonjour ${customer.first_name}, voulez-vous utiliser une adresse enregistrée ?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Prénom"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Nom"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
      </div>

      <div className="my-8">
        <Checkbox
          label="Adresse de facturation identique à l'adresse de livraison"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          label="Email"
          name="email"
          type="email"
          title="Entrez une adresse email valide."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label="Téléphone"
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          required
          data-testid="shipping-phone-input"
        />
      </div>
    </>
  )
}

export default ShippingAddress
