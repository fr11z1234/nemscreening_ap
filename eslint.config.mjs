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
  ]),
]);

export default eslintConfig;
