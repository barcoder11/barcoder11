"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ url, text }: { url: string; text: string }) {
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tiny Wins", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied! Share it with a friend.");
    } catch {
      // user dismissed the share sheet
    }
  }
  return (
    <Button variant="secondary" onClick={share}>
      <Share2 /> Invite a friend
    </Button>
  );
}
