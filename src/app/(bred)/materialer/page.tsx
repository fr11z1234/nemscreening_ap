import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/auth";
import type { BuildingPart, Material } from "@/lib/types";
import { MaterialePanel } from "./MaterialePanel";

export const metadata = { title: "Materialer · Nemscreening" };

/**
 * Materialepanelet.
 *
 * Her staar det, rapporten skriver: materialernes navne, og de saetninger der
 * printes efter maengden. Teksten la for i koden og kunne kun rettes med en
 * udrulning — men det er kontoret der ved, hvad kommunen skal laese.
 *
 * Kun kontor og admin, samme graense som RLS handhaever. `notFound` og ikke en
 * besked: en screener har ikke brug for at vide, at siden findes.
 */
export default async function MaterialerPage() {
  const member = await getMember();
  const rolle = member?.profile?.role;
  if (!member?.profile?.active || (rolle !== "office" && rolle !== "admin")) {
    notFound();
  }

  const supabase = await createClient();

  // Ogsa de lukkede. Panelet er stedet, hvor de kan aabnes igen.
  const [materialerRes, deleRes] = await Promise.all([
    supabase
      .from("materials")
      .select("*")
      .order("sort_order")
      .returns<Material[]>(),
    supabase
      .from("building_parts")
      .select("*")
      .order("sort_order")
      .returns<BuildingPart[]>(),
  ]);

  return (
    <main className="flex flex-1 flex-col px-6 pb-20 pt-5">
      <Link
        href="/sager"
        className="tap -ml-2 inline-flex items-center px-2 text-sm text-muted hover:text-fg"
      >
        ← Sager
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Materialer</h1>

      <MaterialePanel
        materialer={materialerRes.data ?? []}
        bygningsdele={deleRes.data ?? []}
      />
    </main>
  );
}
