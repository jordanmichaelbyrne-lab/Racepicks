"use server";

import { createClient } from "@/app/lib/supabase/server";

export type ProInterestSubmission = {
  interest: string;
  price: string | null;
  features: string[];
  email: string | null;
};

export async function submitProInterest(
  submission: ProInterestSubmission
): Promise<{ success: boolean; error?: string }> {
  if (!submission.interest) {
    return { success: false, error: "Please choose an interest option." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("pro_interest_responses").insert({
    user_id: user?.id ?? null,
    interest: submission.interest,
    price: submission.price,
    features: submission.features.length > 0 ? submission.features : null,
    email: submission.email || null,
  });

  if (error) {
    console.error("Pro interest submission error:", error);
    return {
      success: false,
      error: "Something went wrong saving your response. Please try again.",
    };
  }

  return { success: true };
}