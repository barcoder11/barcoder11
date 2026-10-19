import "server-only";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The signed-in player's adoption id for an animal, if any. */
export async function getMyAdoptionId(animalId: string): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_animals")
    .select("id")
    .eq("user_id", user.id)
    .eq("animal_id", animalId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
