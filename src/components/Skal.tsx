import { getMember } from "@/lib/auth";
import { MemberGate } from "@/components/MemberGate";
import { SkalRamme, type NavPunkt } from "@/components/SkalRamme";

/**
 * Adgangskontrol og navigation, samlet et sted.
 *
 * Begge layouts brugte MemberGate hver for sig og lod hver side taegne sit eget
 * sidehoved. Det holdt sa laenge appen var sagslisten og en prove; nu er der
 * ogsa et materialepanel, og der kommer flere paneler.
 *
 * Provetagningen bruger den bevidst IKKE. Der skal hele skaermen ga til kamera
 * og formular, og den har sin egen raekke af knapper i top og bund.
 */
export async function Skal({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  const rolle = member?.profile?.role;

  // Samme graense som RLS: `materials_write` kraever is_office(). Et punkt der
  // forer til en side, man far 404 pa, er vaerre end intet punkt.
  const nav: NavPunkt[] = [{ href: "/sager", label: "Sager" }];
  if (rolle === "office" || rolle === "admin") {
    nav.push({ href: "/materialer", label: "Materialer" });
    nav.push({ href: "/indstillinger", label: "Indstillinger" });
  }
  // Brugere er smallere end de to ovenfor: `app_users_write` kraever
  // is_admin(), og `brugere/page.tsx` svarer 404 til alle andre. Punktet star
  // derfor sidst og kun for admin.
  if (rolle === "admin") {
    nav.push({ href: "/brugere", label: "Brugere" });
  }

  return (
    <MemberGate>
      <SkalRamme
        nav={nav}
        navn={member?.profile?.full_name?.trim() || member?.email || ""}
      >
        {children}
      </SkalRamme>
    </MemberGate>
  );
}
