"use client";

/* The StudentOS logo in 3D for the assistant’s welcome screen: the mark is stacked
   in thin layers so it looks solid as it gently turns, with two tilted orbit rings,
   a glow and a soft shadow underneath. Pure CSS; stays still with reduced motion. */

const LAYERS = 10;

export function Logo3D({ size = 112 }: { size?: number }) {
  return (
    <div className="logo3d relative" style={{ width: size * 1.9, height: size * 1.7 }} aria-hidden>
      {/* glow */}
      <div className="logo3d-glow absolute top-1/2 left-1/2 rounded-full" style={{ width: size * 1.35, height: size * 1.35 }} />

      <div className="absolute inset-0 flex items-center justify-center [perspective:700px]">
        {/* orbit rings, tilted in 3D */}
        <div className="absolute [transform-style:preserve-3d]" style={{ width: size * 1.75, height: size * 1.75, transform: "rotateX(72deg) rotateY(-12deg)" }}>
          <div className="logo3d-ring absolute inset-0 rounded-full border border-[#8b5cf6]/50">
            <span className="absolute -top-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]" />
          </div>
        </div>
        <div className="absolute [transform-style:preserve-3d]" style={{ width: size * 1.45, height: size * 1.45, transform: "rotateX(70deg) rotateY(28deg)" }}>
          <div className="logo3d-ring-rev absolute inset-0 rounded-full border border-dashed border-[#22d3ee]/45">
            <span className="absolute top-1/2 -right-[4px] h-2 w-2 -translate-y-1/2 rounded-full bg-[#a78bfa] shadow-[0_0_12px_#a78bfa]" />
          </div>
        </div>

        {/* the mark: stacked layers give it thickness while it turns */}
        <div className="logo3d-float [transform-style:preserve-3d]">
          <div className="logo3d-spin relative [transform-style:preserve-3d]" style={{ width: size, height: size }}>
            {Array.from({ length: LAYERS }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src="/studentos-mark.png"
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full select-none"
                style={{
                  transform: `translateZ(${-i * 1.6}px)`,
                  filter: i === 0 ? "drop-shadow(0 0 18px rgba(124,58,237,0.45))" : `brightness(${0.55 - i * 0.03}) saturate(1.2)`,
                }}
              />
            ))}
            <div className="logo3d-shine pointer-events-none absolute inset-0 [mask-image:url(/studentos-mark.png)] [mask-size:contain] [mask-repeat:no-repeat]" />
          </div>
        </div>
      </div>

      {/* shadow on the “floor” */}
      <div className="logo3d-shadow absolute bottom-[6%] left-1/2 h-3 rounded-[50%] bg-[#7c3aed]/35 blur-md" style={{ width: size * 0.8 }} />
    </div>
  );
}
