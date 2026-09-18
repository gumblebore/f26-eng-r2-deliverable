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
import SpeciesComments from "@/app/species/species-comments";
import SpeciesForm from "@/app/species/species-form";
import { speciesSchema, type SpeciesFormData } from "@/app/species/species-schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useForm } from "react-hook-form";

type Species = Database["public"]["Tables"]["species"]["Row"];

/*
This component is the orchestrator for one species card:
 - It renders the small preview card (image/name/description) shown in the species grid.
 - It owns the detail dialog's open/edit state and the species-level actions (edit, delete),
   since those all mutate the `species` row this card represents.
 - It delegates the actual form fields to <SpeciesForm> and the comments section to
   <SpeciesComments>, which are self-contained and don't need to know about each other.
*/
export default function SpeciesCard({ species, userId }: { species: Species; userId: string }) {
  const router = useRouter();

  // Whether the detail dialog is currently open
  const [open, setOpen] = useState<boolean>(false);
  // Whether the dialog is in editing mode; only the species' author can toggle this
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const isAuthor = species.author === userId;

  // Default values for the form are the species' existing data, since this form is always
  // pre-filled for viewing and only becomes editable once the author toggles editing mode.
  const defaultValues: SpeciesFormData = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  const form = useForm<SpeciesFormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSubmit = async (input: SpeciesFormData) => {
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
          if (!nextOpen) {
            // Always reopen to a clean, non-editing view of the current data
            form.reset(defaultValues);
            setIsEditing(false);
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
          <SpeciesForm
            form={form}
            isEditing={isEditing}
            isAuthor={isAuthor}
            onSubmit={onSubmit}
            onStartEditing={startEditing}
            onCancel={handleCancel}
            onDelete={(e: MouseEvent) => void handleDelete(e)}
          />
          {open && <SpeciesComments speciesId={species.id} userId={userId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
