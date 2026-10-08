const SUPABASE_URL =
    "https://mxkmeoxhorkvfbflietl.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_FGo26U54MwndexUuhgsMFw_iDZI4qVi";


const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );