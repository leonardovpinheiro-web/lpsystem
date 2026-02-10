import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, password and fullName are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create user using admin API (doesn't affect current session)
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

    if (userError) {
      let message = "Erro ao criar usuário";
      if (userError.message.includes("already been registered")) {
        message = "Este email já está cadastrado";
      }
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Create profile (upsert to handle trigger-created records)
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: fullName,
      email: email,
    }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Create student record (upsert to handle trigger-created records)
    const { error: studentError } = await supabaseAdmin.from("students").upsert({
      user_id: userId,
      status: "active",
    }, { onConflict: "user_id" });

    if (studentError) {
      console.error("Error creating student:", studentError);
    }

    // Create student role (upsert to handle trigger-created records)
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: "student",
    }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Error creating role:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: userId, email },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
