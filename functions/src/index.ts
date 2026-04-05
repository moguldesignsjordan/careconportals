// functions/src/index.ts
// Firebase Cloud Functions for Care General Construction Portal
// - Square Payment Integration
// - Twilio SMS (callable + inline on payment events)
// - Email + SMS Notifications (via notificationEmail.ts trigger)
// Gen 1 API · Node 20+ (native fetch)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ============ SQUARE CONFIG ============

const getSquareConfig = () => {
  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || "",
    locationId: process.env.SQUARE_LOCATION_ID || "",
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "",
  };
};

const getSquareBaseUrl = (environment: string) => {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
};

// ============ TWILIO CONFIG ============
// Add to functions/.env:
//   TWILIO_ACCOUNT_SID=your_account_sid
//   TWILIO_AUTH_TOKEN=your_auth_token
//   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
//   TWILIO_ENABLED=true

const getTwilioConfig = () => {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
    enabled: process.env.TWILIO_ENABLED === "true",
  };
};

// ============ TWILIO SMS HELPER ============

/**
 * Send an SMS via Twilio REST API (no SDK — native fetch).
 * Returns the Twilio message SID on success, null on failure.
 */
const sendTwilioSMS = async (
  to: string,
  body: string
): Promise<string | null> => {
  const config = getTwilioConfig();

  if (!config.enabled) {
    console.log("Twilio disabled — skipping SMS");
    return null;
  }

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    console.error("Twilio config incomplete:", {
      hasSid: !!config.accountSid,
      hasToken: !!config.authToken,
      hasPhone: !!config.phoneNumber,
    });
    return null;
  }

  if (!to.match(/^\+[1-9]\d{6,14}$/)) {
    console.error("Invalid phone number format:", to);
    return null;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " +
          Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
            "base64"
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: config.phoneNumber,
        Body: body,
      }).toString(),
    });

    const result = (await response.json()) as any;

    if (!response.ok) {
      console.error("Twilio API error:", JSON.stringify(result));
      return null;
    }

    console.log(`✅ SMS sent to ${to} — SID: ${result.sid}`);
    return result.sid;
  } catch (error: any) {
    console.error("Error sending SMS:", error.message);
    return null;
  }
};

// ============ USER PHONE LOOKUP ============

const getUserPhone = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data();
    return data?.phone || data?.phoneNumber || null;
  } catch {
    return null;
  }
};

// ============ SEND SMS (Callable — for on-demand use from frontend) ============

interface SendSMSRequest {
  recipientId?: string;
  phoneNumber?: string;
  message: string;
}

export const sendSMSNotification = functions.https.onCall(
  async (data: SendSMSRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to send SMS"
      );
    }

    const {recipientId, phoneNumber, message} = data;

    if (!message || (!recipientId && !phoneNumber)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: message and either recipientId or phoneNumber"
      );
    }

    let phone = phoneNumber || null;
    if (!phone && recipientId) {
      phone = await getUserPhone(recipientId);
    }

    if (!phone) {
      throw new functions.https.HttpsError(
        "not-found",
        "No phone number found for recipient"
      );
    }

    const sid = await sendTwilioSMS(phone, message);

    if (!sid) {
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS — check Twilio configuration"
      );
    }

    return {success: true, messageSid: sid};
  }
);

// ============ CREATE PAYMENT LINK ============

interface CreatePaymentLinkRequest {
  invoiceId: string;
  title: string;
  amountCents: number;
  customerEmail?: string;
  customerPhone?: string;
  invoiceNumber: string;
}

export const createSquarePaymentLink = functions.https.onCall(
  async (data: CreatePaymentLinkRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment links"
      );
    }

    const {invoiceId, title, amountCents, customerEmail, customerPhone, invoiceNumber} =
      data;

    if (!invoiceId || !title || !amountCents) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: invoiceId, title, amountCents"
      );
    }

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
      const prePopulatedData: Record<string, string> = {};
      if (customerEmail) prePopulatedData.buyer_email = customerEmail;
      if (customerPhone) prePopulatedData.buyer_phone_number = customerPhone;

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
            pre_populated_data:
              Object.keys(prePopulatedData).length > 0
                ? prePopulatedData
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

      // SMS: Send pay link to client
      if (customerPhone) {
        const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
        await sendTwilioSMS(
          customerPhone,
          `Care Construction: Invoice ${invoiceNumber} (${amountFormatted}) is ready for payment.\n\nPay here: ${paymentLink.url}`
        );
      }

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

const verifySquareSignature = (
  signatureKey: string,
  notificationUrl: string,
  body: string,
  signature: string
): boolean => {
  if (!signatureKey) return false;

  const combined = notificationUrl + body;
  const expectedSignature = crypto
    .createHmac("sha256", signatureKey)
    .update(combined)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

export const squareWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Verify webhook signature if key is configured
  const config = getSquareConfig();
  if (config.webhookSignatureKey) {
    const signature = req.headers["x-square-hmacsha256-signature"] as string;
    const notificationUrl =
      (req.headers["x-square-notification-url"] as string) || "";
    const rawBody =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (
      !signature ||
      !verifySquareSignature(
        config.webhookSignatureKey,
        notificationUrl,
        rawBody,
        signature
      )
    ) {
      console.error("Invalid Square webhook signature");
      res.status(403).json({error: "Invalid signature"});
      return;
    }
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

          // SMS: Notify invoice creator
          if (invoice.createdBy) {
            const creatorPhone = await getUserPhone(invoice.createdBy);
            if (creatorPhone) {
              const amountFormatted = `$${(paymentAmount / 100).toFixed(2)}`;
              await sendTwilioSMS(
                creatorPhone,
                `Care Construction: Payment of ${amountFormatted} received for Invoice ${invoice.invoiceNumber || invoiceDoc.id}. Status: ${newStatus}`
              );
            }
          }

          // SMS: Confirm to payer (client)
          if (invoice.clientId) {
            const clientPhone = await getUserPhone(invoice.clientId);
            if (clientPhone) {
              const amountFormatted = `$${(paymentAmount / 100).toFixed(2)}`;
              await sendTwilioSMS(
                clientPhone,
                `Care Construction: Your payment of ${amountFormatted} for Invoice ${invoice.invoiceNumber || invoiceDoc.id} has been received. Thank you!`
              );
            }
          }
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
  async (data: {invoiceId: string}, context) => {
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

// ============ NOTIFICATION FUNCTIONS (Email + SMS) ============
export {sendNotificationEmail, sendDailyDigest} from "./notificationEmail";
export { getTwilioMessages, getTwilioCalls, adminSendSMS } from "./twilioAdmin";
