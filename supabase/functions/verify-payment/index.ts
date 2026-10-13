import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return json({ error: "Incomplete payment response" }, 400);
    }

    const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!secret) return json({ error: "Payment secret is not configured" }, 500);

    const expected = await hmacHex(`${razorpay_order_id}|${razorpay_payment_id}`, secret);
    if (expected !== razorpay_signature) {
      return json({ error: "Payment signature did not match" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await admin
      .from("payments")
      .select("order_id, provider_order_id, status")
      .eq("order_id", order_id)
      .maybeSingle();

    if (!payment || payment.provider_order_id !== razorpay_order_id) {
      return json({ error: "Payment does not match this order" }, 400);
    }

    if (payment.status !== "captured") {
      const { error } = await admin.rpc("mark_order_paid", {
        p_order_id: order_id,
        p_provider_order_id: razorpay_order_id,
        p_provider_payment_id: razorpay_payment_id,
      });
      if (error) return json({ error: error.message }, 400);
      await notify(admin, order_id, "order_confirmation");
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Verification failed" }, 500);
  }
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

async function notify(admin: ReturnType<typeof createClient>, orderId: string, template: string) {
  const { data: order } = await admin.from("orders").select("id, user_id, public_order_number, total").eq("id", orderId).maybeSingle();
  if (!order) return;
  const { data: user } = await admin.auth.admin.getUserById(order.user_id);
  const email = user.user?.email;
  if (!email) return;
  await admin.functions.invoke("send-order-email", {
    body: { order_id: orderId, template, recipient: email },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
