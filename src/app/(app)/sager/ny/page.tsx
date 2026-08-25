import Link from "next/link";
import { NewCaseForm } from "./NewCaseForm";

export const metadata = { title: "Ny sag · Nemscreening" };

export default function NewCasePage() {
  return (
    <>
      <main className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-5 flex items-center gap-2">
          <Link href="/sager" className="tap -ml-2 px-2 text-muted hover:text-fg">
            ←
          </Link>
          <h1 className="text-xl font-semibold">Ny sag</h1>
        </div>
        <NewCaseForm />
      </main>
    </>
  );
}
