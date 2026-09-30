# Samrat quotation mobile

A separate, mobile-friendly quotation screen hosted on Netlify. It reuses the production `InquiryQuotationBuilder.jsx`, `quotationPdf.js` and quotation branding so changes to the website quotation layout are picked up at the next build. Quotations and catalogue items come from the existing website database through the allowlisted Netlify Function; the static HTML contains no customer records.

## Deploy

1. Sign in to your **business Netlify account**, then connect the **Website-Emergent** GitHub repository to a **new** Netlify site. Select branch `codex/quotation-mobile` until the change is merged. Set **Base directory** to `quotation-mobile`. Netlify reads `quotation-mobile/netlify.toml` for the build command (`npm ci && npm run build`), publish directory (`dist`) and functions directory (`netlify/functions`). Do not deploy over the personal-account Samrat ERP site.
2. Set the site to HTTPS and deploy. The mobile page is marked `noindex` but it is publicly accessible to the login screen; only allowlisted admin accounts can retrieve customer data.
3. Open the new Netlify URL on your phone, select **Sign in with Google**, then open **New quotation / saved quotations**. Check saved quotes, create one test quotation, download and share its PDF. It should also appear on the website's Admin → Quotations screen. Once verified, use Chrome's **Install app** or **Add to Home screen** for a separate phone icon.
4. If Emergent OAuth refuses the new redirect URL, register the exact Netlify origin with the existing Emergent auth configuration, then retest. Do not bypass the OAuth check or add browser-stored API tokens.

The Netlify gateway caps binary uploads at about 4 MB. The phone UI checks image size before uploading; larger product images can still be attached on the website. Function execution, Android installation, and large PDF image retrieval must be checked on a real Netlify deployment. This app does not contain a separate quotation database. Existing website admin sessions do not automatically sign the user in to the Netlify domain. Signing in to Netlify with a business account determines who owns the hosting project; signing in to the quotation app still requires a Google email on the website's `ADMIN_EMAILS` allowlist.

Run `npm ci && npm test && npm run build` locally from this folder. Do not use a drag-and-drop deploy of `dist`: the quotation API requires the Netlify Function and its `/api/*` rewrite.
