"use client";

import { kingdoms, type SpeciesFormData } from "@/app/species/species-schema";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BaseSyntheticEvent, MouseEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

/*
The species detail form. Every field is always rendered (this doubles as the "viewing"
layout), but only becomes editable when isEditing is true. The action buttons at the
bottom switch between "Edit/Delete" (viewing) and "Confirm/Cancel" (editing) for the
species' author, or a plain "Close" button for everyone else.

All the actual behavior (what happens on submit, edit, cancel, delete) lives in the
parent (species-card.tsx) and is passed in as props — this component only knows how
to render the form and call the handler it was given.
*/
export default function SpeciesForm({
  form,
  isEditing,
  isAuthor,
  onSubmit,
  onStartEditing,
  onCancel,
  onDelete,
}: {
  form: UseFormReturn<SpeciesFormData>;
  isEditing: boolean;
  isAuthor: boolean;
  onSubmit: (input: SpeciesFormData) => Promise<unknown>;
  onStartEditing: (e: MouseEvent) => void;
  onCancel: (e: MouseEvent) => void;
  onDelete: (e: MouseEvent) => void;
}) {
  return (
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
                <Select disabled={!isEditing} onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
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
                <Button className="ml-1 mr-1 flex-auto" onClick={onStartEditing}>
                  Edit Species
                </Button>
                <Button
                  type="button"
                  className="ml-1 mr-1 flex-auto"
                  variant="destructive"
                  onClick={(e: MouseEvent) => void onDelete(e)}
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
                <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
