"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { useEffect, useState, type MouseEvent } from "react";

type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  profiles: { display_name: string } | null;
};

/*
Comments for a single species. This component is self-contained: it loads its own
comments as soon as it mounts, and handles posting/deleting on its own. It only needs
to be told which species it belongs to (speciesId) and who's viewing it (userId).

It's rendered inside the species detail dialog, which Radix (the dialog library) unmounts
from the DOM whenever the dialog is closed. That means this component mounts fresh every
time the dialog opens, which is what re-triggers the fetch below without any extra wiring
from the parent.
*/
export default function SpeciesComments({ speciesId, userId }: { speciesId: number; userId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);

  const fetchComments = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(display_name)")
      .eq("species_id", speciesId)
      .order("created_at", { ascending: false });

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setComments(data);
  };

  useEffect(() => {
    void fetchComments();
    // Only ever needs to run once, when this component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostComment = async (e: MouseEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) {
      return;
    }

    setIsPostingComment(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("comments").insert({
      species_id: speciesId,
      author: userId,
      content: trimmed,
    });
    setIsPostingComment(false);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setNewComment("");
    void fetchComments();
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="mb-2 font-semibold">Comments</h4>
      <div className="mb-3 flex flex-col gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Leave a comment..."
        />
        <Button
          type="button"
          className="self-end"
          disabled={isPostingComment}
          onClick={(e: MouseEvent) => void handlePostComment(e)}
        >
          Post Comment
        </Button>
      </div>
      <div className="flex max-h-60 flex-col gap-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded border p-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{comment.profiles?.display_name ?? "Unknown user"}</span>
                {comment.author === userId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDeleteComment(comment.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-sm">{comment.content}</p>
              <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
