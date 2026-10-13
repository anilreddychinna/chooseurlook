import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret missing", { status: 500 });

  const expected = await hmacHex(raw, secret);
  if (expected !== signature) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(raw);
  const eventId = event.id ?? `${event.event}:${event.payload?.payment?.entity?.id ?? crypto.randomUUID()}`;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: dup } = await admin.from("webhook_events").insert({
    provider: "razorpay",
    event_id: eventId,
    payload: event,
    processing_status: "processed",
  });
  if (dup) return new Response("duplicate", { status: 200 });

  const payment = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && payment?.order_id) {
    const { data: row } = await admin
      .from("payments")
      .select("order_id, status")
      .eq("provider_order_id", payment.order_id)
      .maybeSingle();

    if (row && row.status !== "captured") {
      await admin.rpc("mark_order_paid", {
        p_order_id: row.order_id,
        p_provider_order_id: payment.order_id,
        p_provider_payment_id: payment.id,
      });
    }
  }

  if (event.event === "payment.failed" && payment?.order_id) {
    await admin.from("payments").update({
      status: "failed",
      provider_payment_id: payment.id,
      raw_event: event,
    }).eq("provider_order_id", payment.order_id).eq("status", "pending");
  }

  return new Response("ok", { status: 200 });
});

async function hmacHex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
