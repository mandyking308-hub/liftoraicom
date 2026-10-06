import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { winnrCall } from "../_shared/winnrClient.ts";
import { handleGhatSmartleadOnboard } from "./handler.ts";

// GHAT <-> Smartlead mailbox onboarding. All logic and safety gates live in handler.ts.
Deno.serve((req) =>
  handleGhatSmartleadOnboard(req, {
    env: (k) => Deno.env.get(k),
    createClient,
    fetch: (input, init) => fetch(input, init),
    winnrCall,
  })
);
