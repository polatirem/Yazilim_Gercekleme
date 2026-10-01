import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "var(--space-8) var(--gutter)" }}>
      <p className="t-label muted">404</p>
      <EmptyState
        title="Bu sokak haritada yok."
        action={
          <ButtonLink href="/" variant="primary" icon="arrow-right">
            Şehre dön
          </ButtonLink>
        }
      >
        Aradığın sayfa bulunamadı. Belki henüz haritalanmadı.
      </EmptyState>
    </div>
  );
}
