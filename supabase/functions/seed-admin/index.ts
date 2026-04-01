import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminEmail = "AZIZ@admin.com";
  const adminPassword = "MOH2503";

  // Check if admin already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === adminEmail);

  if (existing) {
    // Update password
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
    });

    // Ensure role exists
    const { data: roleExists } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", existing.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleExists) {
      await supabaseAdmin.from("user_roles").insert({ user_id: existing.id, role: "admin" });
    }

    return new Response(JSON.stringify({ message: "Admin updated with password", userId: existing.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create admin user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: "Administrateur" },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user!.id, role: "admin" });

  return new Response(JSON.stringify({ message: "Admin created", userId: newUser.user!.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
