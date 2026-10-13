const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_SHIPPING_OVER = 1999;
const FLAT_FEE = 99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { postal_code, subtotal } = await req.json();
    const pin = String(postal_code ?? "").trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      return json({ serviceable: false, fee: null, message: "Enter a 6-digit Indian PIN code" }, 400);
    }

    const goods = Number(subtotal ?? 0);
    const fee = goods >= FREE_SHIPPING_OVER ? 0 : FLAT_FEE;
    return json({
      serviceable: true,
      provider: "flat-rate",
      fee,
      currency: "INR",
      eta_days: "3-7",
      message: fee === 0 ? "Free shipping" : `Standard shipping ₹${fee}. Live Shiprocket booking stays in admin once the account is approved.`,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Quote failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
