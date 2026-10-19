import Link from "next/link";
import { AnimalArt } from "@/components/art/AnimalArt";
import { StatusBadge } from "@/components/admin/fields";
import { ButtonLink, Card } from "@/components/ui";
import { assetMap } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import type { Animal } from "@/lib/types";

export default async function AdminAnimals() {
  const supabase = await createClient();
  const { data } = await supabase.from("animals").select("*, animal_assets(*), user_animals(count)").order("sort_order");
  const animals = (data ?? []) as (Animal & { user_animals: { count: number }[] })[];
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Animals</h1>
        <ButtonLink href="/admin/animals/new" size="sm">+ New animal</ButtonLink>
      </div>
      <div className="grid gap-3">
        {animals.map((a) => (
          <Link key={a.id} href={`/admin/animals/${a.id}`}>
            <Card className="flex items-center gap-4 p-3 hover:bg-cream-200">
              <div className="h-16 w-16 shrink-0 rounded-xl bg-sage">
                <AnimalArt animal={a} assets={assetMap(a)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold">{a.name} <span className="text-sm font-normal text-ink-soft">· {a.species}</span></p>
                <p className="text-sm text-ink-soft">/{a.slug} · {(a.animal_assets ?? []).filter((x) => x.is_active).length} active assets · {a.user_animals?.[0]?.count ?? 0} adoptions</p>
              </div>
              <StatusBadge status={a.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
