"use client";

import NextLink, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";

export function ClassLink({ href, ...props }: LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname();
  const match = pathname.match(/^\/class\/([^/]+)/);
  const raw = typeof href === "string" ? href : "";
  const scoped = match && /^\/(teacher|pupil|display)(\/|$)/.test(raw)
    ? `/class/${match[1]}${raw}`
    : href;
  return <NextLink href={scoped} {...props} />;
}
