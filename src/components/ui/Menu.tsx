"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { Popover, type PopoverPlacement } from "./Popover";

export type MenuItem =
  | { label: string; icon?: IconName; shortcut?: string; danger?: boolean; onSelect: () => void }
  | { separator: true };

export type MenuTriggerProps = {
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu";
  ref: Ref<HTMLButtonElement>;
};

export type MenuProps = {
  trigger: (props: MenuTriggerProps) => ReactNode;
  items: MenuItem[];
  placement?: PopoverPlacement;
  width?: number;
  label?: string;
};

export function Menu({ trigger, items, placement = "bottom-end", width = 220, label }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const withIcons = items.some((item) => !("separator" in item) && Boolean(item.icon));

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"));
    if (buttons.length === 0) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (next < 0) return;
    event.preventDefault();
    buttons[next].focus();
  }

  return (
    <>
      {trigger({
        onClick: () => setOpen((value) => !value),
        "aria-expanded": open,
        "aria-haspopup": "menu",
        ref: setAnchor,
      })}
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} placement={placement} width={width} title={label}>
        <div ref={listRef} role="menu" aria-label={label} onKeyDown={onKeyDown} className="p-1">
          {items.map((item, index) =>
            "separator" in item ? (
              <div key={`sep-${index}`} role="separator" className="mx-1 my-1 h-px bg-border-subtle" />
            ) : (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cx(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) focus-visible:shadow-none pointer-coarse:h-11",
                  item.danger
                    ? "text-danger hover:bg-danger-muted focus:bg-danger-muted"
                    : "text-foreground hover:bg-selected focus:bg-selected"
                )}
              >
                {item.icon ? (
                  <Icon name={item.icon} size={16} className={item.danger ? undefined : "text-foreground-muted"} />
                ) : (
                  withIcons && <span aria-hidden="true" className="w-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.shortcut && <span className="font-mono text-[11px] text-foreground-subtle">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      </Popover>
    </>
  );
}
