import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { formatPhone } from "@/lib/phone";
import { ProfileForm } from "./profile-form";

export const instant = false;

export default async function CustomerProfilePage() {
  const { customer } = await requireCustomer();
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-8 sm:py-12">
      <Link href="/mi-cuenta" className="inline-flex items-center gap-2 text-sm text-muted"><ArrowLeft className="size-4" /> Mis citas</Link>
      <h1 className="mt-6 text-3xl font-extrabold">MI PERFIL</h1>
      <p className="mt-2 text-sm text-muted">Mantén tus datos actualizados para futuras reservas.</p>
      <ProfileForm customer={{ fullName: customer.full_name, email: customer.email ?? "", phone: formatPhone(customer.phone) }} />
    </main>
  );
}

