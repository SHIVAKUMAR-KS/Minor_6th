import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// const YT_CHANNELS = "gd_lk538t2k2p1k3oos71"
Deno.serve(async (req) => {
  const { input, dataset_id, extra_params } = await req.json();

  /*
  curl -H "Authorization: Bearer eb96bdf70ff8148d6a5fb9f5167d2e74b203d33b93eafd9794360257e968f1d2" -H "Content-Type: application/json" -d '{"deliver":{"type":"s3","filename":{"template":"{[snapshot_id]}","extension":"json"},"bucket":"","directory":""},"input":[{"url":"https://www.youtube.com/@MrBeast/about"}]}' "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk538t2k2p1k3oos71&include_errors=true"

  */
  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${dataset_id}&endpoint=${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/collection_webhook&format=json&uncompressed_webhook=true&include_errors=true&${extra_params}`,
    {
      headers: {
        Authorization: `Bearer ${Deno.env.get("BRIGHT_DATA_API_KEY")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to trigger collection");
  }

  const data = await response.json();

  // store job data in database
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  const { data: scrapeJob } = await supabase.from("scrape_jobs").insert({
    id: data.snapshot_id,
    status: "running",
    dataset_id,
  }).select().single();

  return new Response(JSON.stringify(scrapeJob), {
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
