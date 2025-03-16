import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const YT_CHANNELS_DATASET_ID = "gd_lk538t2k2p1k3oos71";
const YT_VIDEOS_DATASET_ID = "gd_lk56epmy2i5g7lzu0k";

async function saveChannel(
  supabase: SupabaseClient,
  data: any,
  snapshot_id: string,
) {
  // save channel to database
  const { error } = await supabase.from("yt_channels").upsert(
    data.map((item: any) => ({
      id: item.id,
      updated_at: new Date().toISOString(),
      url: item.url.replace("/about", ""),
      handle: item.handle,
      banner_img: item.banner_img,
      profile_image: item.profile_image,
      name: item.name,
      subscribers: item.subscribers,
      videos_count: item.videos_count,
      created_date: item.created_date,
      views: item.views,
      Description: item.Description,
      location: item.Details?.location,
    })),
  );
  // update scrape_jobs table status to "ready"
  await supabase.from("scrape_jobs").update({
    status: "ready",
    channel_id: data[0].id, // TODO: update this to be the channel id
  }).eq(
    "id",
    snapshot_id,
  );
}

async function saveVideos(
  supabase: SupabaseClient,
  data: any,
  snapshot_id: string,
) {
  // save videos to database
  const { error } = await supabase.from("yt_videos").upsert(
    data.map((item: any) => ({
      id: item.video_id,
      updated_at: new Date().toISOString(),
      url: item.url,
      title: item.title,
      likes: item.likes,
      views: item.views,
      date_posted: item.date_posted,
      description: item.description,
      num_comments: item.num_comments,
      preview_image: item.preview_image,
      youtuber_id: item.youtuber_id,
      transcript: item.transcript,
    })),
  );

  // update scrape_jobs table status to "ready"
  await supabase.from("scrape_jobs").update({
    status: "ready",
    // channel_id: data[0].youtuber_id,
  }).eq(
    "id",
    snapshot_id,
  );
}

Deno.serve(async (req) => {
  const data = await req.json();
  const snapshot_id = req.headers.get("snapshot-id");

  console.log("Data: ", data);https://www.youtube.com/@harkirat1
  console.log("Snapshot ID: ", snapshot_id);

  // supa client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  // fetch scrape job
  const { data: scrapeJob } = await supabase.from("scrape_jobs").select("*").eq(
    "id",
    snapshot_id,
  ).single();

  if (!scrapeJob) {
    console.error("Scrape job not found");
    return new Response(
      JSON.stringify({ status: "error", message: "Scrape job not found" }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (scrapeJob.dataset_id === YT_CHANNELS_DATASET_ID) {
    console.log("Saving channel data");
    await saveChannel(supabase, data, snapshot_id);
  } else if (scrapeJob.dataset_id === YT_VIDEOS_DATASET_ID) {
    console.log("Saving video data");
    await saveVideos(supabase, data, snapshot_id);
  }

  return new Response(
    JSON.stringify({ status: "ok" }),
    { headers: { "Content-Type": "application/json" } },
  );
});
