export function DatabaseOfflineBanner() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Database is offline. Start Postgres, then refresh to load hotspots and plans.
      </p>
    </div>
  );
}
