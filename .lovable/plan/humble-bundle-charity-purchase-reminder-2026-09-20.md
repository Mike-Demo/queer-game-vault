# Humble Bundle charity purchase reminder

## Goal

Before any game-page store link opens, show a short reminder that visitors can check Humble Bundle first and direct part of eligible purchases to charity. Suggest Gay Gaming Professionals (GGP) as the featured charity.

## Changes

1. **Reusable purchase-link speed bump**
   - Add a small game-page component using the existing NES dialog and button components.
   - Keep each store destination as a real link for accessibility and no-JavaScript fallback; with JavaScript active, clicking it opens the dialog first.
   - Apply it to every verified “Buy on…” store link and every Humble Bundle link, including an imported direct Humble link when present.

2. **Dialog choices**
   - Explain briefly that Humble Bundle lets shoppers choose a charity for eligible bundle promotions.
   - Provide four clear actions:
     - **Check Humble Bundle** — opens the title-filled Humble search.
     - **Continue to [selected store]** — opens the visitor’s original destination.
     - **How to choose your charity** — opens Humble’s official instructions: `https://support.humblebundle.com/hc/en-us/articles/210213728-Choose-Your-Own-Charity-Bundle-Promotions`.
     - **Support GGP** — opens the supplied PayPal fundraiser page: `https://www.paypal.com/fundraiser/charity/3885498`.
   - Include a clear close/cancel action, keyboard focus handling, Escape support, and descriptive external-link text.
   - Do not claim every product is sold by Humble or that every Humble purchase is charity-eligible.

3. **Presentation**
   - Match QueerCade’s existing NES styling and design tokens.
   - Keep the dialog concise and usable on phone and desktop screens.
   - Add no database fields and make no changes to imported game data.

## Verification

- Type check and build pass.
- Browser-check a game with multiple store links: each opens the reminder, “Continue” preserves the selected destination, and the Humble, charity-guide, and GGP links point to the supplied URLs.
- Verify keyboard dismissal, focus behavior, no page errors, and phone-width layout.
- Confirm prerendered game pages retain crawlable store URLs and their normal no-JavaScript fallback.

## Rollback

Remove the purchase-link wrapper and restore the current direct anchors; no stored data or backend rollback is required.
