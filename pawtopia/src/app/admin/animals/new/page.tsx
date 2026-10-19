import { ActionForm } from "@/components/admin/ActionForm";
import { AnimalFields } from "@/components/admin/AnimalFields";
import { Card } from "@/components/ui";
import { createAnimal } from "../../actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewAnimal() {
  const supabase = await createClient();
  const { data: habitats } = await supabase.from("habitats").select("slug, name").order("name");
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-bold">New animal</h1>
      <ol className="flex flex-wrap gap-2 text-xs font-bold text-ink-soft">
        <li className="rounded-full bg-forest px-3 py-1 text-cream">1. Character details</li>
        <li className="rounded-full bg-white px-3 py-1">2. Upload art & animations</li>
        <li className="rounded-full bg-white px-3 py-1">3. Recovery chapters</li>
        <li className="rounded-full bg-white px-3 py-1">4. Rescue episode + links</li>
        <li className="rounded-full bg-white px-3 py-1">5. Preview & publish</li>
      </ol>
      <Card>
        <ActionForm action={createAnimal} submitLabel="Create draft">
          <AnimalFields habitats={habitats ?? []} />
        </ActionForm>
      </Card>
    </div>
  );
}
