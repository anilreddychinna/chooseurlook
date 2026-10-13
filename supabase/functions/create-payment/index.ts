import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sign in required" }, 401);

    const body = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let orderId = body.order_id as string | undefined;
    let orderNumber = "";
    let amount = 0;

    if (orderId) {
      const { data: existing, error } = await admin
        .from("orders")
        .select("id, public_order_number, total, status, user_id, payment_method")
        .eq("id", orderId)
        .maybeSingle();
      if (error || !existing || existing.user_id !== userData.user.id) {
        return json({ error: "Order not found" }, 404);
      }
      if (existing.status !== "pending_payment" || existing.payment_method !== "razorpay") {
        return json({ error: "This order is not awaiting payment" }, 400);
      }
      orderNumber = existing.public_order_number;
      amount = Number(existing.total);

      const { data: payment } = await admin
        .from("payments")
        .select("provider_order_id, status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (payment?.provider_order_id && payment.status === "pending") {
        return json({
          key_id: Deno.env.get("RAZORPAY_KEY_ID"),
          provider_order_id: payment.provider_order_id,
          amount: Math.round(amount * 100),
          currency: "INR",
          order_id: orderId,
          order_number: orderNumber,
        });
      }
    } else {
      const addressId = body.address_id as string;
      const coupon = (body.coupon_code as string | undefined) ?? null;
      if (!addressId) return json({ error: "Address is required" }, 400);

      const { data: created, error: orderError } = await userClient.rpc("create_checkout_order", {
        p_address_id: addressId,
        p_payment_method: "razorpay",
        p_coupon_code: coupon,
      });
      if (orderError) return json({ error: orderError.message }, 400);
      orderId = created.order_id;
      orderNumber = created.order_number;
      amount = Number(created.amount);
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return json({ error: "Razorpay keys are not configured on the server", order_id: orderId, order_number: orderNumber }, 500);
    }

    const credentials = btoa(`${keyId}:${keySecret}`);
    const gateway = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: orderNumber,
        notes: { order_id: orderId },
      }),
    });
    const gatewayBody = await gateway.json();
    if (!gateway.ok) {
      return json({
        error: gatewayBody.error?.description ?? "Could not create payment order",
        order_id: orderId,
        order_number: orderNumber,
      }, 502);
    }

    await admin.from("payments").update({
      provider: "razorpay",
      provider_order_id: gatewayBody.id,
      status: "pending",
    }).eq("order_id", orderId);

    return json({
      key_id: keyId,
      provider_order_id: gatewayBody.id,
      amount: Math.round(amount * 100),
      currency: "INR",
      order_id: orderId,
      order_number: orderNumber,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Payment setup failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
