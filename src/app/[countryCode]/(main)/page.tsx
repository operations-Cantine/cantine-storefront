import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "La Cantine Africaine — Commandez en ligne",
  description: "Saveurs authentiques du Mali. Sandwiches, combos, plats traditionnels. Livraison rapide à Bamako.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const region = await getRegion(countryCode)

  if (!region) return null

  const { response } = await listProducts({
    countryCode,
    queryParams: { limit: 12 },
  })

  const categories = await listCategories()

  return (
    <>
      <Hero />

      {/* Category quick links */}
      {categories && categories.length > 0 && (
        <div className="content-container py-8">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <LocalizedClientLink
                key={cat.id}
                href={`/categories/${cat.handle}`}
                className="flex-shrink-0 px-6 py-3 bg-white border border-ui-border-base rounded-xl text-sm font-medium text-ui-fg-base hover:border-ui-fg-base hover:shadow-sm transition"
              >
                {cat.name}
              </LocalizedClientLink>
            ))}
          </div>
        </div>
      )}

      {/* Featured products */}
      <div className="content-container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-ui-fg-base">Notre Menu</h2>
          <LocalizedClientLink href="/store" className="text-sm text-ui-fg-subtle hover:text-ui-fg-base">
            Voir tout →
          </LocalizedClientLink>
        </div>
        <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8" data-testid="products-list">
          {response.products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
