import { logout } from "@/app/admin/login/actions";
import { Wordmark } from "@/components/wordmark";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-graphite bg-background/95 px-4 py-3 backdrop-blur">
      <Wordmark className="text-lg" />
      <form action={logout}>
        <button className="h-10 rounded-lg border border-graphite px-4 text-sm text-muted transition hover:text-foreground">
          Salir
        </button>
      </form>
    </header>
  );
}
