import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
        Not found.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page doesn’t exist. It may have moved, or never did.
      </p>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
