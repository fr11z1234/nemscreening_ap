import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase-CLI'ens arbejdsmappe. `npx supabase start` lægger blandt andet
    // en bundtet edge-runtime her, og den er hverken vores kode eller noget vi
    // kan rette. Uden den her fejler `npm run lint` med snesevis af fejl i
    // minificeret JavaScript, alt efter om den lokale stak er startet — og så
    // holder kontrolkæden op med at sige noget om vores eget arbejde.
    "supabase/.temp/**",
    // Udrulningens egne scripts. De køres med `node` fra en terminal, ligger
    // ikke i noget bundt, og de er dokumentationen af hvordan fase 2 blev lagt
    // på produktionen — se supabase/FASE-2-TIL-MAIN.md. Reglerne her er skrevet
    // til Next.js-appen: `no-require-imports` er rigtig i `src/`, hvor alt er
    // ESM, og forkert for et CommonJS-script, `node` skal kunne køre direkte.
    // Undtagelsen gælder kun formen, ikke indholdet: `npx tsc --noEmit` og
    // `npm run build` rører dem heller ikke.
    "supabase/ops/**",
  ]),
]);

export default eslintConfig;
