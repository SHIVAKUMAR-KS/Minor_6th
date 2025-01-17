// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.log("Hello from Functions!");

Deno.serve(async (req) => {
  const { url } = await req.json();

  console.log("url: ", url);

  // curl -H "Authorization: Bearer eef65601f3ad9fedadb320b67e698185a6b8a6238ba1c656c37698eda4c5f5b5"
  //-H "Content-Type: application/json"
  // -d '[{"url":"https://www.youtube.com/@MrBeast/about"}]'
  // "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk538t2k2p1k3oos71&include_errors=true"

  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk538t2k2p1k3oos71&include_errors=true`,
    {
      headers: {
        Authorization: `Bearer ${Deno.env.get("BRIGHT_DATA_API_KEY")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify([{ url }]),
    },
  );

  if (!response.ok) {
    console.log("response: ", response);
    return new Response(
      JSON.stringify({ error: "Failed to trigger collection" }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/trigger_collection_api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
