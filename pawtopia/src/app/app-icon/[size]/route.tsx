import { pawIcon } from "@/lib/paw-icon";

export const revalidate = false;

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  return pawIcon(size === "512" ? 512 : 192);
}
