# Valid schema.org structured data across QueerCade

Right now the site has no structured data at all — no page emits schema.org markup, so search engines only see the plain text and social tags. This plan adds correct, validating structured data to every public page and checks it against the official rules.

## What gets added

One shared helper builds the markup so every page uses the same shapes and the same site URL (https://queercade.mikedemo.dev).

- **Every page** — Organization and WebSite entities (site name, logo, URL, search action pointing at Discover), plus a BreadcrumbList showing where the page sits.
- **Home** — the site entity as the main item on the page, plus a list of the featured games.
- **Game detail** — a VideoGame entity: name, description (editor description if present, otherwise the IGDB summary), cover image, release date, genres, platforms, game modes, developer and publisher as Organizations, franchise, official links, and screenshots. Where IGDB supplies a rating and a vote count, an aggregateRating credited to IGDB is included; games without votes simply omit it. Characters, editor notes and internal workflow fields stay out of the markup.
- **Collection pages** — a CollectionPage with an ItemList of the games in order, each entry a VideoGame with name, cover and link.
- **All collections** — a CollectionPage with an ItemList of the collections.
- **Discover** — a SearchResultsPage with the search action.
- **About** — an AboutPage.
- **Public profiles** — a ProfilePage with a Person (display name, about text, avatar). Private profiles emit nothing.

Rules applied throughout: no invented values, empty or unknown fields are omitted entirely rather than left blank or filled with placeholders, every image and link is an absolute https URL, and the markup only describes content actually visible on the page.

## Verification

- Type check and build.
- Pull the generated static HTML for one page of each kind, extract the JSON-LD, and confirm it parses and that required and recommended properties are present for each type.
- Validate the extracted markup against Schema.org's own validator service and Google's Rich Results test, and fix anything either flags.
- Browser pass on a game page, a collection page and a profile page to confirm zero page errors.

## Technical notes

- Markup is emitted through the TanStack `head()` `scripts` option (`type: "application/ld+json"`) on each route, so it lands in the prerendered HTML and needs no client-side JavaScript.
- A new `src/lib/seo/structuredData.ts` module holds the builders (`organization`, `website`, `breadcrumbs`, `videoGame`, `itemList`, etc.) and a small `jsonLdScript()` wrapper; each builder strips undefined/empty values before returning.
- Game and collection routes build their markup from the existing loader data, so no new queries and no schema or import-pipeline changes.
- Profile markup respects the existing visibility setting.
