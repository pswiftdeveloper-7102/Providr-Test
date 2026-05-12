import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Inline error message for forms — wraps shadcn `Alert variant="destructive"`
 * so every form renders errors consistently and keeps shadcn coverage tight.
 *
 * Renders nothing when `message` is falsy, so it's safe to drop in
 * unconditionally after a `state.error` check is removed.
 */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * Sibling component for the positive case — server actions that surface
 * an "ok" toast inline (e.g. CoI sign confirmation).
 */
export function FormSuccess({
  message,
}: {
  message: string | null | undefined;
}) {
  if (!message) return null;
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}