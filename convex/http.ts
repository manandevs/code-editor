// convex/http.ts
import { api, internal } from "./_generated/api";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";
import { WebhookEvent } from "@clerk/nextjs/server";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (crx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("CLERK_WEBHOOK_SECRET is not set");
    }

    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("Missing required headers", { status: 400 });
    }

    // FIX: Retrieve the EXACT raw body for Svix signature verification
    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying Clerk webhook:", err);
      return new Response("Invalid webhook", { status: 400 });
    }

    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = evt.data;
      // FIX: Ensure safe navigation for email
      const email = email_addresses[0]?.email_address;
      const name = `${first_name || ""} ${last_name || ""}`.trim();

      try {
        await crx.runMutation(api.users.syncUser, {
          userId: id,
          email,
          name,
        });
      } catch (error) {
        return new Response("Error saving user", { status: 500 });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  }),
});

// LemonSqueezy route remains exactly as you had it
http.route({
  path: "/lemonsqueezy-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const signature = request.headers.get("X-signature");

    if (!signature) {
      return new Response("Missing X-signature header", { status: 400 });
    }

    try {
      const payload = await ctx.runAction(internal.lemonsqueezy.verifyWebhook, {
        payload: payloadString,
        signature,
      });

      if (payload.meta.event_name === "order_created") {
        const { data } = payload;

        await ctx.runMutation(api.users.upgradeToPro, {
          email: data.attributes.user_email,
          lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
          lemonSqueezyOrderId: data.id.toString(),
          amount: Number(data.attributes.total),
        });
      }

      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      console.error("Error processing LemonSqueezy webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }),
});

export default http;