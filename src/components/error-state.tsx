export function ErrorState({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-6"
    >
      <h2 className="font-heading text-base font-semibold text-destructive">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
