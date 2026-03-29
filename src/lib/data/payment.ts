"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export type PaymentConfig = {
  orange_money_phone: string
  moov_phone: string
  wave_phone: string
  whatsapp_number: string
  fee_payer: "sender" | "receiver"
}

export async function fetchPaymentConfig(): Promise<PaymentConfig | null> {
  return sdk.client
    .fetch<{ payment_config: PaymentConfig | null }>(`/store/payment-config`, {
      method: "GET",
    })
    .then(({ payment_config }) => payment_config)
    .catch(() => null)
}

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}
