import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { data, error } = await supabase.from("payments").insert({
    lead_id: "00000000-0000-0000-0000-000000000000", // Will fail FK, but we want to see if ENUM fails first
    type: "addon",
    amount: 1000,
    status: "pending"
  });
  console.log(error);
}

check();
