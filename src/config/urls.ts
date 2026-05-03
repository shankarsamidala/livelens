/**
 * Centralised checkout & external URL constants.
 *
 * Change URLs here once — all files that import from this module
 * will pick up the update automatically.
 */

export const CHECKOUT_URLS = {
    /** LiveLens Pro (lifetime/yearly) */
    pro: 'https://checkout.dodopayments.com/buy/pdt_0NcM6Aw0IWdspbsgUeCLA',
    /** LiveLens API — Standard tier */
    apiStandard: 'https://checkout.dodopayments.com/buy/pdt_0NbFixGmD8CSeawb5qvVl',
    /** LiveLens API — Pro tier */
    apiPro: 'https://checkout.dodopayments.com/buy/pdt_0NcM6Aw0IWdspbsgUeCLA',
    /** LiveLens API — Max tier */
    apiMax: 'https://checkout.dodopayments.com/buy/pdt_0NcM7JElX4Af6LNVFS1Yf',
    /** LiveLens API — Ultra tier */
    apiUltra: 'https://checkout.dodopayments.com/buy/pdt_0NcM7rC2kAb69TFKsZnUU',
} as const;
