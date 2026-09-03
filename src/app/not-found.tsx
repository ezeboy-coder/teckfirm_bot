import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page does not exist.</p>
      <div className="mt-6 flex justify-center">
        <Link href="/" className={cn(buttonVariants(), "h-11")}>
          Buy WiFi
        </Link>
      </div>
    </div>
  );
}
