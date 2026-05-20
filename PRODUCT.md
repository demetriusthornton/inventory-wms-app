# Product

## Register

product

## Users

Two personas share the same interface. Warehouse staff execute real-time tasks: receiving stock, adjusting quantities, initiating transfers, scanning UPC barcodes. They work fast, often under task pressure, sometimes on tablets or shared terminals. Managers and owner-operators review dashboards, purchase order history, and activity logs from a desktop. Both need accurate data immediately; neither has patience for friction.

## Product Purpose

BenchStock is a multi-warehouse inventory management system. It tracks stock across locations in real time, manages purchase orders from creation through history, handles inter-warehouse transfers, and logs all activity for audit. Success means every user can trust the number they see on screen is correct, and can act on it without navigating more than one step.

## Brand Personality

Reliable, direct, fast. The software that warehouse workers actually want to use instead of the one they're stuck with. Confidence is earned through accuracy and speed, not decoration.

## Anti-references

- Consumer-warm / friendly: Notion, Duolingo, Linear's new-user onboarding. Rounded, soft, bright, over-explained. Wrong energy for ops work where every second costs.
- Enterprise ERP aesthetic: dense forms, gray system chrome, dated UI patterns that feel like SAP. BenchStock should feel modern without feeling like a startup toy.

## Design Principles

1. **Data is the UI.** Numbers, statuses, and counts carry the interface. Decorative chrome should earn its place or be cut.
2. **Keyboard and tap parity.** Floor staff may touch; managers keyboard-nav. Both paths must be fast and complete.
3. **Trust through precision.** If a number can be wrong, the whole tool loses value. Error states, empty states, and loading states must all be first-class.
4. **Speed over ceremony.** No confirmation dialogs for reads, no animations for basic navigation. Motion earns its cost.
5. **Dark sidebar, light content.** The existing split is correct: sidebar recedes, data surface commands attention.

## Accessibility & Inclusion

WCAG 2.1 AA. Keyboard navigation across all interactive elements. Minimum 4.5:1 contrast on text, 3:1 on UI components. Reduced motion respect via `prefers-reduced-motion`. No color as the sole indicator of state.
