import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function CoinNotFound() {
  return (
    <section className="container-page py-16 md:py-24">
      <EmptyState
        icon={SearchX}
        title="Pair not found"
        description="Binance doesn't list this trading pair. Check the symbol, or find it in Markets."
        action={
          <Button asChild variant="outline">
            <Link href="/markets">Go to Markets</Link>
          </Button>
        }
      />
    </section>
  );
}
