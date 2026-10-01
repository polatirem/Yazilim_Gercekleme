import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "inverse";
type Size = "md" | "lg";

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "start" | "end";
  children: ReactNode;
  className?: string;
  block?: boolean;
}

function classes({ variant = "secondary", size = "md", block, className }: Common) {
  return [styles.button, styles[variant], styles[size], block ? styles.block : "", className ?? ""].join(" ");
}

function Content({ icon, iconPosition = "end", children, variant }: Common) {
  return (
    <>
      {variant === "primary" && <span className={styles.signal} aria-hidden />}
      {icon && iconPosition === "start" && <Icon name={icon} size={18} />}
      <span className={styles.text}>{children}</span>
      {icon && iconPosition === "end" && <Icon name={icon} size={18} />}
    </>
  );
}

export function Button(props: Common & Omit<ComponentProps<"button">, keyof Common>) {
  const { variant, size, icon, iconPosition, children, className, block, type = "button", ...rest } = props;
  const common = { variant, size, icon, iconPosition, children, className, block };
  return (
    <button type={type} className={classes(common)} {...rest}>
      <Content {...common} />
    </button>
  );
}

export function ButtonLink(props: Common & Omit<ComponentProps<typeof Link>, keyof Common>) {
  const { variant, size, icon, iconPosition, children, className, block, ...rest } = props;
  const common = { variant, size, icon, iconPosition, children, className, block };
  return (
    <Link className={classes(common)} {...rest}>
      <Content {...common} />
    </Link>
  );
}
