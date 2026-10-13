import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { order_id, template, recipient } = await req.json();
    if (!order_id || !template || !recipient) {
      return json({ error: "order_id, template and recipient are required" }, 400);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const isService = auth === `Bearer ${serviceKey}`;

    if (!isService) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: owned } = await userClient.from("orders").select("id").eq("id", order_id).maybeSingle();
      if (!owned) return json({ error: "Order not found" }, 403);
    }

    const { data: existing } = await admin
      .from("email_logs")
      .select("id")
      .eq("order_id", order_id)
      .eq("template", template)
      .eq("status", "sent")
      .maybeSingle();
    if (existing) return json({ ok: true, duplicate: true });

    const { data: order } = await admin
      .from("orders")
      .select("public_order_number, total, currency")
      .eq("id", order_id)
      .maybeSingle();

    const subject = subjectFor(template, order?.public_order_number);
    const html = `<p>ChooseUrLook</p><p>${subject}</p><p>Total: ₹${order?.total ?? ""} ${order?.currency ?? "INR"}</p>`;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM") ?? "ChooseUrLook <orders@chooseurlook.com>";
    let providerId: string | null = null;
    let status = "skipped";
    let lastError: string | null = null;

    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [recipient], subject, html }),
      });
      const body = await response.json();
      if (response.ok) {
        status = "sent";
        providerId = body.id ?? null;
      } else {
        status = "failed";
        lastError = body.message ?? "Email provider rejected the message";
      }
    }

    await admin.from("email_logs").insert({
      order_id,
      recipient,
      template,
      provider_message_id: providerId,
      status,
      attempts: 1,
      last_error: lastError,
    });

    return json({ ok: status !== "failed", status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Email failed" }, 500);
  }
});

function subjectFor(template: string, orderNumber?: string) {
  const ref = orderNumber ? ` ${orderNumber}` : "";
  switch (template) {
    case "order_confirmation":
      return `Your ChooseUrLook order${ref} is confirmed`;
    case "shipping_update":
      return `Your order${ref} is on the way`;
    case "cancellation":
      return `Your order${ref} was cancelled`;
    case "refund":
      return `Refund update for order${ref}`;
    default:
      return `Update on your ChooseUrLook order${ref}`;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
