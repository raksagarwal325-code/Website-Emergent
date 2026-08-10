/**
 * Public product-image deterrents.
 *
 * Applies casual-copy protections without touching storage, image URLs,
 * or rendered quality/resolution:
 *   • right-click "Save image as…" is cancelled (contextmenu preventDefault)
 *   • drag-to-desktop / drag-to-tab is cancelled (draggable=false + preventDefault)
 *   • image selection + iOS long-press "Save Image" callout suppressed
 *   • `pointer-events: none` on the <img> itself so long-press / right-click
 *     targets the wrapping container (which cancels contextmenu) rather than
 *     the raw <img>, so browsers do not offer a "Save image" affordance on
 *     the image element. Clicks still bubble to the wrapping <Link>/<button>.
 *
 * This is DETERRENCE ONLY, not DRM. Screenshots, view-source, and network-tab
 * inspection cannot be prevented from the browser layer and are out of scope.
 */

const prevent = (e) => {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  return false;
};

/**
 * Spread onto any public product <img>. Prevents drag + contextmenu at the
 * element level.
 */
export const imgGuardProps = {
  draggable: false,
  onDragStart: prevent,
  onContextMenu: prevent,
};

/**
 * Merge into the <img> `style` prop. Disables pointer capture on the image
 * itself so context-menu/long-press lands on the wrapping element instead of
 * the raw image.
 */
export const imgGuardStyle = {
  pointerEvents: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
  WebkitTouchCallout: "none",
  WebkitUserDrag: "none",
};

/**
 * Spread onto the direct wrapper of a product <img> (or onto the transparent
 * interaction overlay). Cancels contextmenu/drag at the wrapper level so it
 * still fires there even after pointer-events on the <img> are disabled.
 */
export const containerGuardProps = {
  onContextMenu: prevent,
  onDragStart: prevent,
};

export const containerGuardStyle = {
  WebkitUserSelect: "none",
  userSelect: "none",
  WebkitTouchCallout: "none",
};
