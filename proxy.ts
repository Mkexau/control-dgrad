import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy Next.js 16.3.2 (remplaçant officiel de middleware.ts).
 * Maintient et rafraîchit la session Supabase Auth.
 * Ne donne AUCUN privilège et ne dispense pas les Server Actions/Components
 * de vérifier les autorisations via les guards.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Exclut les assets statiques, images et favicons
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
