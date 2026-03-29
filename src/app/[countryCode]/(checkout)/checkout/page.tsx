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
          tag_id: undefined,
          limit: 10,
          order: "created_at",
          fields: "*variants.calculated_price,+variants.inventory_quantity",
        },
      }).catch(() => ({ response: { products: [], count: 0 }, nextPage: null })),
    ])

  // Filter cross-sell: products not already in cart, with a variant, priced under 2000
  const cartProductIds = new Set((cart.items || []).map((i: any) => i.product_id))
  const crossSellProducts = (crossSellData.response.products || []).filter((p) => {
    if (cartProductIds.has(p.id)) return false
    const price = p.variants?.[0]?.calculated_price?.calculated_amount
    return price != null && price <= 2000
  })

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
          crossSellProducts={crossSellProducts}
        />
      </div>
    </div>
  )
}
