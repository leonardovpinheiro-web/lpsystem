import { supabase } from "@/integrations/supabase/client";

export async function signUp(email: string, password: string, fullName: string) {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) return { error };

  // Create profile after signup
  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: data.user.id,
        email: email,
        full_name: fullName,
      });

    if (profileError && profileError.code !== '23505') {
      console.error("Error creating profile:", profileError);
    }
  }

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const redirectUrl = `${window.location.origin}/reset-password`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  return { error };
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

export async function getUserRole(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no role found, default to student
    return "student";
  }

  return data.role;
}
