import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormRowProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  /** Use "start" (default) for inputs/selects, "center" for switches */
  align?: "start" | "center";
  children: React.ReactNode;
}

/**
 * Horizontal label-left / input-right layout for forms.
 *
 * Usage:
 *   <FormRow label="Performer Type" required error={errors.type?.message}>
 *     <Select .../>
 *   </FormRow>
 */
export function FormRow({
  label,
  required,
  error,
  hint,
  htmlFor,
  align = "start",
  children,
}: FormRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-6 gap-y-1">
      <Label
        htmlFor={htmlFor}
        className={cn(
          "text-sm text-muted-foreground sm:text-right",
          align === "center" ? "sm:pt-0 flex sm:justify-end items-center" : "sm:pt-2"
        )}
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="space-y-1">
        {children}
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}

interface FormSectionProps {
  title: string;
  className?: string;
}

/**
 * Lightweight section divider within a horizontal form.
 * Spans both columns so the label column stays aligned.
 */
export function FormSection({ title, className }: FormSectionProps) {
  return (
    <div className={cn("sm:col-span-2 pt-3 pb-1 border-b", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
    </div>
  );
}
