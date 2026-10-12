"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flush } from "@/lib/offline/sync";

/**
 * Sender koen op, mens gennemgangen er aaben.
 *
 * Gennemgangen er det sidste skridt, for screeneren korer, og ofte et sted
 * uden daekning. Et billede lagt op herfra venter i koen, og beskeden lover at
 * det sendes, naar forbindelsen er tilbage — det er den her, der holder det
 * lofte. Den tager ogsa det, provetagningen efterlod i koen.
 *
 * En for hele siden og ikke en pr. prove: ellers ville hver prove sende de
 * samme billeder op hver for sig, naar nettet kom igen.
 */
export function Koesynk() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    async function send() {
      const res = await flush(supabase);
      if (res.samplesSynced + res.photosSynced > 0) router.refresh();
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void send();
    };

    void send();
    window.addEventListener("online", send);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", send);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
