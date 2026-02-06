// functions/src/index.ts
// Firebase Cloud Functions for Square Payment Integration
// Gen 1 API (compatible with existing deployed functions)
// Uses native fetch (Node 20+)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ============ SQUARE CONFIG ============
// Reads from functions/.env file (or runtime environment)
// Create functions/.env with:
//   SQUARE_ACCESS_TOKEN=your_token
//   SQUARE_LOCATION_ID=your_location_id
//   SQUARE_ENVIRONMENT=sandbox

const getSquareConfig = () => {
  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || "",
    locationId: process.env.SQUARE_LOCATION_ID || "",
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
  };
};

const getSquareBaseUrl = (environment: string) => {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
};

// ============ CREATE PAYMENT LINK ============

interface CreatePaymentLinkRequest {
  invoiceId: string;
  title: string;
  amountCents: number;
  customerEmail?: string;
  invoiceNumber: string;
}

export const createSquarePaymentLink = functions.https.onCall(
  async (data: CreatePaymentLinkRequest, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment links"
      );
    }

    const {invoiceId, title, amountCents, customerEmail, invoiceNumber} = data;

    // Validate required fields
    if (!invoiceId || !title || !amountCents) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: invoiceId, title, amountCents"
      );
    }

    // Get Square config
    const config = getSquareConfig();

    if (!config.accessToken || !config.locationId) {
      console.error("Square config missing:", {
        hasToken: !!config.accessToken,
        hasLocation: !!config.locationId,
      });
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in functions/.env"
      );
    }

    const baseUrl = getSquareBaseUrl(config.environment);

    try {
      // Native fetch (Node 20+)
      const response = await fetch(
        `${baseUrl}/v2/online-checkout/payment-links`,
        {
          method: "POST",
          headers: {
            "Square-Version": "2024-01-18",
            "Authorization": `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idempotency_key: `${invoiceId}-${Date.now()}`,
            quick_pay: {
              name: title,
              price_money: {
                amount: amountCents,
                currency: "USD",
              },
              location_id: config.locationId,
            },
            checkout_options: {
              ask_for_shipping_address: false,
            },
            pre_populated_data: customerEmail
              ? {buyer_email: customerEmail}
              : undefined,
            payment_note: `Invoice ${invoiceNumber} - ${title}`,
          }),
        }
      );

      const result = (await response.json()) as any;

      if (!response.ok) {
        console.error("Square API error:", JSON.stringify(result));
        throw new functions.https.HttpsError(
          "internal",
          result.errors?.[0]?.detail || "Failed to create payment link"
        );
      }

      const paymentLink = result.payment_link;

      if (!paymentLink?.url) {
        throw new functions.https.HttpsError(
          "internal",
          "No payment link URL returned from Square"
        );
      }

      // Save payment link to invoice in Firestore
      await db.collection("invoices").doc(invoiceId).update({
        squarePaymentUrl: paymentLink.url,
        squarePaymentLinkId: paymentLink.id,
        squareOrderId: paymentLink.order_id,
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        paymentUrl: paymentLink.url,
        paymentLinkId: paymentLink.id,
      };
    } catch (error: any) {
      console.error("Error creating payment link:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create payment link"
      );
    }
  }
);

// ============ SQUARE WEBHOOK HANDLER ============

export const squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const event = req.body;
    console.log("Square webhook received:", event.type, event.event_id);

    // Handle payment.completed
    if (event.type === "payment.completed") {
      const payment = event.data?.object?.payment;

      if (payment && payment.status === "COMPLETED") {
        const invoiceSnapshot = await db
          .collection("invoices")
          .where("squareOrderId", "==", payment.order_id)
          .limit(1)
          .get();

        if (!invoiceSnapshot.empty) {
          const invoiceDoc = invoiceSnapshot.docs[0];
          const invoice = invoiceDoc.data();
          const paymentAmount = payment.amount_money?.amount || 0;

          const paymentRecord = {
            id: `square-${payment.id}`,
            amount: paymentAmount,
            method: "SQUARE_ONLINE",
            paidAt: new Date().toISOString(),
            transactionId: payment.id,
            note: "Paid via Square online checkout",
            recordedBy: "SQUARE_WEBHOOK",
          };

          const newAmountPaid = (invoice.amountPaid || 0) + paymentAmount;
          const newAmountDue = invoice.totalAmount - newAmountPaid;

          let newStatus = invoice.status;
          if (newAmountDue <= 0) {
            newStatus = "PAID";
          } else if (newAmountPaid > 0) {
            newStatus = "PARTIALLY_PAID";
          }

          const updateData: Record<string, any> = {
            payments: admin.firestore.FieldValue.arrayUnion(paymentRecord),
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };

          if (newStatus === "PAID") {
            updateData.paidAt = new Date().toISOString();
          }

          await invoiceDoc.ref.update(updateData);
          console.log(
            `Invoice ${invoiceDoc.id} updated: ${invoice.status} -> ${newStatus}`
          );
        } else {
          console.log("No invoice found for order:", payment.order_id);
        }
      }
    }

    // Handle order updates
    if (
      event.type === "order.fulfillment.updated" ||
      event.type === "order.updated"
    ) {
      const order = event.data?.object?.order;

      if (order && order.state === "COMPLETED") {
        const invoiceSnapshot = await db
          .collection("invoices")
          .where("squareOrderId", "==", order.id)
          .limit(1)
          .get();

        if (!invoiceSnapshot.empty) {
          const invoiceDoc = invoiceSnapshot.docs[0];
          const invoice = invoiceDoc.data();

          if (invoice.status !== "PAID") {
            const totalPaid = order.total_money?.amount || invoice.totalAmount;

            await invoiceDoc.ref.update({
              status: "PAID",
              amountPaid: totalPaid,
              amountDue: 0,
              paidAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            console.log(
              `Invoice ${invoiceDoc.id} marked as PAID via order update`
            );
          }
        }
      }
    }

    res.status(200).json({received: true});
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(500).json({error: error.message});
  }
});

// ============ CHECK PAYMENT STATUS ============

export const checkPaymentStatus = functions.https.onCall(
  async (data: { invoiceId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {invoiceId} = data;

    if (!invoiceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing invoiceId"
      );
    }

    try {
      const invoiceDoc = await db.collection("invoices").doc(invoiceId).get();

      if (!invoiceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invoice not found");
      }

      const invoice = invoiceDoc.data()!;

      if (!invoice.squareOrderId) {
        return {status: "no_order", paid: false};
      }

      const config = getSquareConfig();
      const baseUrl = getSquareBaseUrl(config.environment);

      const response = await fetch(
        `${baseUrl}/v2/orders/${invoice.squareOrderId}`,
        {
          method: "GET",
          headers: {
            "Square-Version": "2024-01-18",
            "Authorization": `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = (await response.json()) as any;

      if (!response.ok) {
        console.error("Square API error:", JSON.stringify(result));
        return {status: "error", paid: false};
      }

      const order = result.order;

      if (order && order.state === "COMPLETED") {
        if (invoice.status !== "PAID") {
          await invoiceDoc.ref.update({
            status: "PAID",
            amountPaid: invoice.totalAmount,
            amountDue: 0,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        return {status: "paid", paid: true};
      }

      return {status: order?.state || "unknown", paid: false};
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to check payment status"
      );
    }
  }
);