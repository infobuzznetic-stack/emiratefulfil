import { createClient } from "@supabase/supabase-js";

/*
  Paste your own project's values here.
  Where to find them: Supabase dashboard -> your project -> Settings (gear icon,
  bottom left) -> Data API. You'll see:
    - "Project URL"        -> paste into SUPABASE_URL
    - "anon public" key    -> paste into SUPABASE_ANON_KEY
  (Some UI versions call this tab "API" instead of "Data API" — same values.)
  The anon key is safe to put in frontend code; it's meant to be public.
  Never put the "service_role" key here.
*/
const SUPABASE_URL = "https://pmkithjmvontogoqbbvp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pBZA31aCYNpLNm-i27lr7w_IphKvhIa";

// flowType: "implicit" — without this, Supabase defaults to the PKCE flow,
// which requires the browser that clicks the email link to be the *same*
// browser (same localStorage) that requested it. Email links are often
// opened in a different browser/app (Gmail's in-app browser, a phone's
// default browser, etc.), which makes PKCE links fail with
// "Email link is invalid or has expired" even when fresh. Implicit flow
// puts the session token directly in the URL, so it works no matter which
// browser opens the link.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: "implicit" },
});

// The email(s) that should see the Admin tab in the dashboard.
// Add your own email(s) here, lowercase.
export const ADMIN_EMAILS = ["info.buzznetic@gmail.com"];
