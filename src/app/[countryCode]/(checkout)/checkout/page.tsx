import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import ConversationalCheckout from "@modules/checkout/components/conversational-checkout"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Commander — La Cantine Africaine",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()
  const shippingMethods = await listCartShippingMethods(cart.id) || []
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "") || []

  return (
    <div className="min-h-screen bg-[#faf9f5]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800">← Retour</a>
          <span className="font-bold text-[#083d2a]">La Cantine Africaine</span>
          <div className="w-16" />
        </div>
      </div>

      {/* Conversational checkout */}
      <div className="px-4">
        <ConversationalCheckout
          cart={cart}
          shippingMethods={shippingMethods}
          paymentMethods={paymentMethods}
        />
      </div>
    </div>
  )
}
