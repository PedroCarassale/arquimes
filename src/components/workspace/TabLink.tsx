"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { tabKindFromPath } from "@/lib/tabs";
import { useOptionalWorkspace } from "./WorkspaceContext";
import { tabsStore } from "./tabs-store";

type LinkProps = ComponentProps<typeof Link>;

function hrefToString(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "";
  if (href.search) return `${pathname}${href.search.startsWith("?") ? href.search : `?${href.search}`}`;
  if (href.query && typeof href.query === "object") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(href.query)) {
      if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
      else if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }
  return pathname;
}

export function TabLink({
  onClick,
  onAuxClick,
  onMouseDown,
  tabTitle,
  ...props
}: LinkProps & { tabTitle?: string }) {
  const workspace = useOptionalWorkspace();

  if (!workspace) return <Link onClick={onClick} onAuxClick={onAuxClick} onMouseDown={onMouseDown} {...props} />;

  const materiaId = workspace.materiaId;
  const href = hrefToString(props.href);
  const kind = tabKindFromPath(materiaId, href);
  const openable = kind !== null && kind !== "inicio";
  const ariaLabel = props["aria-label"];
  const title = (tabTitle ?? (typeof props.title === "string" ? props.title : undefined) ?? ariaLabel)?.trim();

  function openInBackground(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    tabsStore.open(materiaId, href, { background: true, title: title || undefined });
  }

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !openable) return;
        if (event.ctrlKey || event.metaKey) openInBackground(event);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (openable && event.button === 1) event.preventDefault();
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.defaultPrevented || !openable) return;
        if (event.button === 1) openInBackground(event);
      }}
    />
  );
}
