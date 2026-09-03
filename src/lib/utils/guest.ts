export function guestCheckoutEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@guest.teckfirm.org`;
}

export function paymentCallbackUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/payment/callback`;
}
