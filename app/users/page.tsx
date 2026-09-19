import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";

export default async function UsersList() {
  // Create supabase server component client and obtain user session from stored cookie
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  const { data: profiles } = await supabase.from("profiles").select("*").order("display_name", { ascending: true });

  return (
    <>
      <TypographyH2>Users</TypographyH2>
      <Separator className="my-4" />
      <div className="flex flex-wrap justify-center">
        {profiles?.map((profile) => (
          <div key={profile.id} className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
            <h3 className="text-xl font-semibold">{profile.display_name}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="mt-2 text-sm">{profile.biography ?? "No biography provided."}</p>
          </div>
        ))}
      </div>
    </>
  );
}
