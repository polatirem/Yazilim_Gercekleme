import Link from "next/link";

// Axiom mark: two stacked layers (the model's answer and the evidence under it) with the
// coral point Axiom catches between them.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="mk-back" d="M16 3 29 26H3Z" />
      <path className="mk-front" d="M16 10.5 24.4 25.5H7.6Z" />
      <circle className="mk-dot" cx="16" cy="20.5" r="2.6" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Axiom ana sayfa">
      <Mark /> <span>Axiom</span>
    </Link>
  );
}
