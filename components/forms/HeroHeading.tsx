/** Renders a project name with the shared .hero-heading style (single-line, blue accent border).
 *  Pass `wrap` to let long titles wrap to multiple lines instead of truncating with an ellipsis. */
export function HeroHeading({ children, wrap }: { children: string; wrap?: boolean }) {
  return <h1 className={wrap ? "hero-heading hero-heading--wrap" : "hero-heading"}>{children}</h1>;
}
