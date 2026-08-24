import { AppHeader } from "@/components/AppHeader";
import { getMember } from "@/lib/auth";
import { KodeordForm } from "./KodeordForm";

export const metadata = { title: "Kodeord · Nemscreening" };

export default async function KodeordPage() {
  const member = await getMember();

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pb-16 pt-4">
        <h1 className="text-xl font-semibold">Skift kodeord</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {member?.email}
        </p>
        <KodeordForm />
      </main>
    </>
  );
}
