import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="w-full border-b border-ui-border-base relative" style={{ background: "linear-gradient(135deg, #083d2a 0%, #0f5c3f 50%, #083d2a 100%)" }}>
      <div className="flex flex-col justify-center items-center text-center py-16 small:py-24 gap-6 px-6">
        <div className="text-5xl">🍽</div>
        <span>
          <Heading level="h1" className="text-3xl small:text-4xl leading-tight text-white font-bold">
            La Cantine Africaine
          </Heading>
          <p className="text-lg text-white/70 mt-2 max-w-md mx-auto">
            Saveurs authentiques du Mali — Commandez en ligne, livraison rapide à Bamako
          </p>
        </span>
        <div className="flex gap-3 mt-2">
          <LocalizedClientLink href="/store">
            <button className="px-8 py-3 bg-[#FF6D01] text-white font-semibold rounded-xl hover:brightness-110 transition text-sm" style={{ boxShadow: "0 3px 12px rgba(255,109,1,0.3)" }}>
              Commander maintenant
            </button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories/combos">
            <button className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition text-sm border border-white/20">
              Nos Combos
            </button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
