/**
 * The subset of the CDN App Bridge global this app uses.
 *
 * `index.html` loads https://cdn.shopify.com/shopifycloud/app-bridge.js as the
 * first script in <head>; it auto-initialises from the `shopify-api-key` meta
 * tag and installs `window.shopify`. `idToken()` mints the session token that
 * every `/api/*` request carries.
 *
 * This lives in `types/` rather than beside `ShopifyProvider` because
 * `utils/api-client.ts` needs it too, and the Vercel backend build compiles
 * that file with `--jsx` unset — importing a type out of a `.tsx` module fails
 * there with TS6142 even when the import is type-only. A deploy caught that;
 * `npm run type-check` did not, because it uses a different tsconfig.
 *
 * The legacy npm `@shopify/app-bridge` package is deliberately not a
 * dependency — see LAUNCH_PLAN §6 R29 and `app-bridge-cdn-only.test.ts`.
 */
export interface CdnAppBridge {
  idToken: () => Promise<string>;
}
