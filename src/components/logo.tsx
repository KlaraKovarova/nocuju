export function NocujuIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polygon points="1,22 12,2 23,22" fill="#3a6b48" />
      <polygon points="7.5,22 12,17 16.5,22" fill="#cfd6b5" />
      <rect x="9" y="19.5" width="6" height="2.5" fill="#e6d4ba" />
    </svg>
  );
}

export function NocujuWordmark({ iconSize = 20 }: { iconSize?: number }) {
  return (
    <span className="flex items-center gap-2">
      <NocujuIcon size={iconSize} />
      <span className="flex items-baseline gap-[2px]">
        <span>nocuju</span>
        <span className="text-[color:var(--accent)]">.cz</span>
      </span>
    </span>
  );
}
