import { formatNgnFromKobo } from "@/lib/utils/money";
import { DeletePriceButton } from "@/components/admin/delete-price-button";

type AdminPriceRow = {
  id: string;
  name: string;
  priceKobo: number;
};

export function AdminPriceList({ plans }: { plans: AdminPriceRow[] }) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet. Add a plan and it applies everywhere.</p>;
  }

  return (
    <ul className="space-y-3">
      {plans.map((plan) => {
        const label = `${formatNgnFromKobo(plan.priceKobo)} · ${plan.name}`;
        return (
          <li key={plan.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium">{label}</p>
            <DeletePriceButton planId={plan.id} priceLabel={label} />
          </li>
        );
      })}
    </ul>
  );
}
