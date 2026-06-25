type IconProps = {
  size?: number;
  /** When true, uses currentColor so icon works on colored backgrounds */
  mono?: boolean;
};

export function UtulnaIcon({ size = 44, mono = false }: IconProps) {
  const roof = mono ? "currentColor" : "#5d8b56";
  const roofStroke = mono ? "currentColor" : "#3a6b48";
  const walls = mono ? "currentColor" : "#b08b6a";
  const wallStroke = mono ? "currentColor" : "#7b5a3a";
  const window_ = mono ? "currentColor" : "#cfd6b5";
  const door = mono ? "currentColor" : "#7b5a3a";
  const chimney = mono ? "currentColor" : "#7b5a3a";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      {/* Chimney */}
      <rect x="30" y="9" width="4" height="12" fill={chimney} rx="0.5" />
      {/* Roof */}
      <path
        d="M4 26 24 6 44 26Z"
        fill={roof}
        stroke={roofStroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Cabin body */}
      <rect
        x="8"
        y="24"
        width="32"
        height="18"
        rx="1.5"
        fill={walls}
        stroke={wallStroke}
        strokeWidth="1.2"
      />
      {/* Left window */}
      <rect x="10" y="27" width="8" height="7" rx="1" fill={window_} stroke={wallStroke} strokeWidth="0.8" />
      <line x1="14" y1="27" x2="14" y2="34" stroke={wallStroke} strokeWidth="0.6" />
      <line x1="10" y1="30.5" x2="18" y2="30.5" stroke={wallStroke} strokeWidth="0.6" />
      {/* Right window */}
      <rect x="30" y="27" width="8" height="7" rx="1" fill={window_} stroke={wallStroke} strokeWidth="0.8" />
      <line x1="34" y1="27" x2="34" y2="34" stroke={wallStroke} strokeWidth="0.6" />
      <line x1="30" y1="30.5" x2="38" y2="30.5" stroke={wallStroke} strokeWidth="0.6" />
      {/* Door */}
      <path
        d="M19 42 L19 33 Q19 32 20 32 L28 32 Q29 32 29 33 L29 42Z"
        fill={door}
      />
      {/* Door handle */}
      <circle cx="27" cy="37.5" r="0.8" fill={window_} />
    </svg>
  );
}

export function NouzoveIcon({ size = 44, mono = false }: IconProps) {
  const roofFill = mono ? "currentColor" : "#cfd6b5";
  const pole = mono ? "currentColor" : "#7b5a3a";
  const ground = mono ? "currentColor" : "#3a6b48";
  const flame1 = mono ? "currentColor" : "#d97706";
  const flame2 = mono ? "currentColor" : "#fbbf24";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      {/* Lean-to roof panel */}
      <path
        d="M4 40 L4 10 L44 24 L44 40Z"
        fill={roofFill}
        stroke={pole}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Roof ridge line */}
      <path d="M4 10 L44 24" stroke={ground} strokeWidth="2.5" strokeLinecap="round" />
      {/* Left vertical pole */}
      <line x1="4" y1="10" x2="4" y2="43" stroke={pole} strokeWidth="2.5" strokeLinecap="round" />
      {/* Right vertical pole */}
      <line x1="44" y1="24" x2="44" y2="43" stroke={pole} strokeWidth="2.5" strokeLinecap="round" />
      {/* Ground */}
      <line x1="2" y1="43" x2="46" y2="43" stroke={ground} strokeWidth="1.5" strokeLinecap="round" />
      {/* Log base */}
      <ellipse cx="24" cy="43" rx="5" ry="1.2" fill={pole} opacity="0.5" />
      {/* Flame outer */}
      <path
        d="M24 43 C21 39 20 36 22 33 C23 31 22 29 24 29 C26 29 25 31 26 33 C28 36 27 39 24 43Z"
        fill={flame1}
      />
      {/* Flame inner */}
      <path
        d="M24 43 C22.5 40 22.5 38 24 36 C25.5 38 25.5 40 24 43Z"
        fill={flame2}
        opacity="0.85"
      />
    </svg>
  );
}

export function ZdrojVodyIcon({ size = 44, mono = false }: IconProps) {
  const water = mono ? "currentColor" : "#3b82f6";
  const waterLight = mono ? "currentColor" : "#93c5fd";
  const rock = mono ? "currentColor" : "#9ca3af";
  const rockStroke = mono ? "currentColor" : "#6b7280";
  const moss = mono ? "currentColor" : "#5d8b56";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      {/* Back rocks */}
      <ellipse cx="24" cy="39" rx="18" ry="6" fill={rock} stroke={rockStroke} strokeWidth="0.8" />
      {/* Moss on rocks */}
      <path d="M10 36 Q14 33 18 36" stroke={moss} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M28 36 Q32 33 36 36" stroke={moss} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Water drop main shape */}
      <path
        d="M24 6 C24 6 11 22 11 31 C11 38.2 16.9 44 24 44 C31.1 44 37 38.2 37 31 C37 22 24 6 24 6Z"
        fill={water}
        opacity="0.88"
      />
      {/* Water highlight/shimmer */}
      <path
        d="M18 28 C18 23 21 20 25 21"
        stroke={waterLight}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <circle cx="20" cy="24" r="1.8" fill={waterLight} opacity="0.55" />
      {/* Spring ripples at surface */}
      <ellipse cx="24" cy="37" rx="9" ry="2.5" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
      <ellipse cx="24" cy="33" rx="5" ry="1.5" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
    </svg>
  );
}

/** Maps category slug to the corresponding icon component */
export function CategoryIcon({
  category,
  size = 44,
  mono = false,
}: {
  category: string | null | undefined;
  size?: number;
  mono?: boolean;
}) {
  if (category === "utulna") return <UtulnaIcon size={size} mono={mono} />;
  if (category === "nouzove-nocoviste") return <NouzoveIcon size={size} mono={mono} />;
  if (category === "zdroj-vody") return <ZdrojVodyIcon size={size} mono={mono} />;
  return <UtulnaIcon size={size} mono={mono} />;
}
