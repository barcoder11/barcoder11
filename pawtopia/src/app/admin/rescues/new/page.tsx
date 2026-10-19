import { ActionForm } from "@/components/admin/ActionForm";
import { RescueFields } from "@/components/admin/RescueFields";
import { Card } from "@/components/ui";
import { createRescue } from "../../actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewRescue({ searchParams }: PageProps<"/admin/rescues/new">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: animals } = await supabase.from("animals").select("id, name, status").neq("status", "archived").order("sort_order");
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-bold">New rescue episode</h1>
      <Card>
        <ActionForm action={createRescue} submitLabel="Create draft episode">
          <RescueFields animals={animals ?? []} defaultAnimalId={typeof sp.animal === "string" ? sp.animal : undefined} />
        </ActionForm>
      </Card>
    </div>
  );
}
