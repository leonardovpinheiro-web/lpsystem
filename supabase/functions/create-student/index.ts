import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

    // Send welcome email with credentials via Resend
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      await resend.emails.send({
        from: "Lovable <lovable@lvpinheiro.com.br>",
        to: [email],
        subject: "Bem-vindo! Suas credenciais de acesso",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Bem-vindo(a), ${fullName}!</h1>
            <p>Sua conta foi criada com sucesso. Aqui estão suas credenciais de acesso:</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 4px 0;"><strong>Senha:</strong> ${password}</p>
            </div>
            <p>Recomendamos que você altere sua senha após o primeiro acesso.</p>
            <p style="color: #666; font-size: 14px;">Este é um email automático, por favor não responda.</p>
          </div>
        `,
      });
      console.log("Welcome email sent to:", email);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the student creation if email fails
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
