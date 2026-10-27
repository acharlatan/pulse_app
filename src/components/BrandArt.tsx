/** Static, code-native PULSE artwork. Decorative; never a data visualization. */
export function BrandArt({
  motif = "orbit",
}: {
  motif?: "orbit" | "wave" | "steps";
}) {
  return (
    <div className={`brand-art brand-art-${motif}`} aria-hidden="true">
      <svg viewBox="0 0 360 220" fill="none">
        {motif === "orbit" ? (
          <>
            <ellipse
              cx="210"
              cy="110"
              rx="140"
              ry="72"
              transform="rotate(-28 210 110)"
            />
            <ellipse
              cx="210"
              cy="110"
              rx="92"
              ry="140"
              transform="rotate(-28 210 110)"
            />
            <circle cx="210" cy="110" r="46" />
            <circle className="art-node" cx="88" cy="155" r="10" />
            <circle className="art-node" cx="310" cy="55" r="15" />
          </>
        ) : motif === "wave" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M10 ${80 + i * 16} C90 ${-60 + i * 16},140 ${260 + i * 16},220 ${100 + i * 16} S330 ${30 + i * 16},390 ${100 + i * 16}`}
              />
            ))}
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={65 + i * 54}
                y={130 - i * 28}
                width="38"
                height="130"
                rx="16"
                transform="rotate(20 180 110)"
              />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
