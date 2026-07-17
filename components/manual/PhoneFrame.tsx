/** A black device bezel around a screenshot (the bezel stays black in both themes). */
export function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`mn-phone ${className ?? ""}`}>
      <div className="mn-phone-screen">
        {/* eslint-disable-next-line @next/next/no-img-element -- static /manual asset, no layout benefit from next/image */}
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}
