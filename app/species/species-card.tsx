"use client";
/*
Note: "use client" is a Next.js App Router directive that tells React to render the component as
a client component rather than a server component. This establishes the server-client boundary,
providing access to client-side functionality such as hooks and event handlers to this component and
any of its imported children. Although the SpeciesCard component itself does not use any client-side
functionality, it is beneficial to move it to the client because it is rendered in a list with a unique
key prop in species/page.tsx. When multiple component instances are rendered from a list, React uses the unique key prop
on the client-side to correctly match component state and props should the order of the list ever change.
React server components don't track state between rerenders, so leaving the uniquely identified components (e.g. SpeciesCard)
can cause errors with matching props and state in child components if the list order changes.
*/
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define kingdom enum for use in Zod schema and displaying dropdown options in the form
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;
type Species = Database["public"]["Tables"]["species"]["Row"];
type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  profiles: { display_name: string } | null;
};

export default function SpeciesCard({ species, userId }: { species: Species; userId: string }) {
  const router = useRouter();

  // Whether the detail dialog is currently open
  const [open, setOpen] = useState<boolean>(false);
  // Whether the dialog is in editing mode; only the species' author can toggle this
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Comments on this species, loaded whenever the dialog is opened
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);

  const isAuthor = species.author === userId;

  // Default values for the form are the species' existing data, since this form is always
  // pre-filled for viewing and only becomes editable once the author toggles editing mode.
  const defaultValues: FormData = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (input: FormData) => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("species")
      .update({
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq("id", species.id);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsEditing(false);
    form.reset(input);
    router.refresh();

    return toast({
      title: "Species updated!",
      description: "Successfully updated " + input.scientific_name + ".",
    });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Revert all unsaved changes?")) {
      return;
    }
    form.reset(defaultValues);
    setIsEditing(false);
  };

  const handleDelete = async (e: MouseEvent) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete ${species.scientific_name}? This cannot be undone.`)) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").delete().eq("id", species.id);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setOpen(false);
    router.refresh();

    return toast({
      title: "Species deleted!",
      description: "Successfully deleted " + species.scientific_name + ".",
    });
  };

  const fetchComments = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(display_name)")
      .eq("species_id", species.id)
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

  const handlePostComment = async (e: MouseEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) {
      return;
    }

    setIsPostingComment(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("comments").insert({
      species_id: species.id,
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
    <div className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name}</h4>
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            void fetchComments();
          } else {
            // Always reopen to a clean, non-editing view of the current data
            form.reset(defaultValues);
            setIsEditing(false);
            setNewComment("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="mt-3 w-full">Learn More</Button>
        </DialogTrigger>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{species.scientific_name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
              <div className="grid w-full items-center gap-4">
                <FormField
                  control={form.control}
                  name="scientific_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scientific Name</FormLabel>
                      <FormControl>
                        <Input readOnly={!isEditing} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="common_name"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Common Name</FormLabel>
                        <FormControl>
                          <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="kingdom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kingdom</FormLabel>
                      <Select
                        disabled={!isEditing}
                        onValueChange={(value) => field.onChange(kingdoms.parse(value))}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            {kingdoms.options.map((kingdom, index) => (
                              <SelectItem key={index} value={kingdom}>
                                {kingdom}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_population"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Total population</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            readOnly={!isEditing}
                            value={value ?? ""}
                            {...rest}
                            onChange={(event) => field.onChange(+event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input readOnly={!isEditing} value={value ?? ""} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => {
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea readOnly={!isEditing} value={value ?? ""} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <div className="flex">
                  {!isAuthor && (
                    <DialogClose asChild>
                      <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                        Close
                      </Button>
                    </DialogClose>
                  )}
                  {isAuthor && !isEditing && (
                    <>
                      <Button className="ml-1 mr-1 flex-auto" onClick={startEditing}>
                        Edit Species
                      </Button>
                      <Button
                        type="button"
                        className="ml-1 mr-1 flex-auto"
                        variant="destructive"
                        onClick={(e: MouseEvent) => void handleDelete(e)}
                      >
                        Delete Species
                      </Button>
                    </>
                  )}
                  {isAuthor && isEditing && (
                    <>
                      <Button type="submit" className="ml-1 mr-1 flex-auto">
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        className="ml-1 mr-1 flex-auto"
                        variant="secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </Form>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
