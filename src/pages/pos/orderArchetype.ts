// Mirrors the Flutter app's `OrderArchetype` so the web POS shows the SAME order
// types as the app — driven by the business archetype, not all global types.
// Service type ids: 1 = Dine In, 2 = Take Away, 3 = Delivery.

const PREPARED_ORDER = 'PREPARED_ORDER'
const DELIVERY_ORDER = 'DELIVERY_ORDER'

/** Service-type ids available for an archetype (same table as the app). */
export function availableServiceTypes(archetype?: string | null): number[] {
  switch (archetype) {
    case PREPARED_ORDER:
      return [1, 2] // Dine In + Take Away (F&B)
    case DELIVERY_ORDER:
      return [3] // Delivery only
    default:
      // INSTANT_SALE (retail), DELAYED_SERVICE, BOOKING, CUSTOM_PROJECT
      return [2] // Take Away only
  }
}

/** Only F&B (prepared order) uses tables / dine-in. */
export function archetypeHasTable(archetype?: string | null): boolean {
  return archetype === PREPARED_ORDER
}
