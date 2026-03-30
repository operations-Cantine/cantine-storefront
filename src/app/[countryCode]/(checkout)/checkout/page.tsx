import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods, fetchPaymentConfig } from "@lib/data/payment"
import { listProducts } from "@lib/data/products"
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

  const [customer, shippingMethods, paymentMethods, paymentConfig, crossSellData] =
    await Promise.all([
      retrieveCustomer(),
      listCartShippingMethods(cart.id).then((r) => r || []),
      listCartPaymentMethods(cart.region?.id ?? "").then((r) => r || []),
      fetchPaymentConfig(),
      listProducts({
        regionId: cart.region?.id,
        queryParams: {
          limit: 100,
          fields: "*variants.calculated_price,+variants.inventory_quantity,*categories",
        },
      }).catch(() => ({ response: { products: [], count: 0 }, nextPage: null })),
    ])

  // Pass all products — the component picks the smart cross-sell
  const allProducts = crossSellData.response.products || []

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
          paymentConfig={paymentConfig}
          allProducts={allProducts}
        />
      </div>
    </div>
  )
}
