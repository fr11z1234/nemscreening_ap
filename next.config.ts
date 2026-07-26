import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Uden denne gaetter Next.js pa workspace-roden og rammer en package-lock.json
  // laengere oppe i brugerens hjemmemappe.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },

  // Dev-serveren afviser som udgangspunkt alt der ikke kommer fra localhost.
  // Uden disse kan hverken telefonen pa det lokale net eller en HTTPS-tunnel
  // na den under test.
  allowedDevOrigins: [
    "192.168.1.240",
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
