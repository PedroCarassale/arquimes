import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

const FIELD =
  "w-full min-w-0 rounded-md border bg-surface text-foreground placeholder:text-foreground-subtle transition-colors duration-(--dur-fast) ease-(--ease-out) outline-none disabled:opacity-50";

function borderClasses(invalid?: boolean) {
  return invalid ? "border-danger/60 hover:border-danger" : "border-border-subtle hover:border-border";
}

const INPUT_SIZES = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-3 text-sm",
} as const;

export type InputProps = { size?: "sm" | "md" | "lg"; invalid?: boolean } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(FIELD, borderClasses(invalid), INPUT_SIZES[size], className)}
      {...rest}
    />
  );
});

export type TextareaProps = { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(FIELD, borderClasses(invalid), "resize-y px-3 py-2 text-sm leading-6", className)}
      {...rest}
    />
  );
});
