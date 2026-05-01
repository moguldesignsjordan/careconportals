// functions/src/twilio/sendSms.ts
// Conversational SMS: sends messages and manages smsConversations + smsMessages

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getTwilioConfig, getTwilioClient, formatPhoneNumber } from "./config";

// ── Lazy Firestore ───────────────────────────────────────────────────
const getDb = () => admin.firestore();

// ── Main Cloud Function ──────────────────────────────────────────────

interface SendSmsData {
  to: string;
  body: string;
  recipientUserId?: string;
  projectId?: string;
  conversationId?: string;
}

export const sendSms = functions.https.onCall(
  async (data: SendSmsData, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to send SMS"
      );
    }

    const senderId = context.auth.uid;

    // 2. Validate input
    const { to, body, recipientUserId, projectId, conversationId } = data;
    if (!to || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: to, body"
      );
    }

    if (body.length > 1600) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Message too long. Maximum 1600 characters."
      );
    }

    // 3. Get Twilio config
    const config = getTwilioConfig();
    if (!config.phoneNumber) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio phone number not configured"
      );
    }

    const db = getDb();
    const toFormatted = formatPhoneNumber(to);
    const fromNumber = config.phoneNumber;

    try {
      // 4. Send SMS via Twilio
      const client = getTwilioClient();
      const twilioMessage = await client.messages.create({
        to: toFormatted,
        from: fromNumber,
        body: body,
        statusCallback: `${config.portalUrl}/api/twilio/status`,
      });

      console.log(`SMS sent: ${twilioMessage.sid} to ${toFormatted}`);

      // 5. Find or create conversation
      let convId = conversationId;
      if (!convId) {
        const existingConv = await db
          .collection("smsConversations")
          .where("participantPhone", "==", toFormatted)
          .limit(1)
          .get();

        if (!existingConv.empty) {
          convId = existingConv.docs[0].id;
        } else {
          // Create new conversation
          const newConv = await db.collection("smsConversations").add({
            participantPhone: toFormatted,
            portalUserId: recipientUserId || null,
            portalUserName: null,
            twilioNumber: fromNumber,
            projectId: projectId || null,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessagePreview: body.slice(0, 100),
            lastMessageDirection: "outbound",
            unreadCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: senderId,
          });
          convId = newConv.id;

          // If recipientUserId provided, fetch their name
          if (recipientUserId) {
            const userDoc = await db
              .collection("users")
              .doc(recipientUserId)
              .get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              await newConv.update({
                portalUserName: userData?.name || null,
              });
            }
          }
        }
      }

      // 6. Create message record
      const messageRef = await db.collection("smsMessages").add({
        conversationId: convId,
        direction: "outbound",
        from: fromNumber,
        to: toFormatted,
        body: body,
        twilioSid: twilioMessage.sid,
        status: twilioMessage.status,
        sentBy: senderId,
        projectId: projectId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          twilioDateCreated: twilioMessage.dateCreated,
          twilioNumSegments: twilioMessage.numSegments,
        },
      });

      // 7. Update conversation with latest message
      await db
        .collection("smsConversations")
        .doc(convId!)
        .update({
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessagePreview: body.slice(0, 100),
          lastMessageDirection: "outbound",
        });

      return {
        success: true,
        messageId: messageRef.id,
        conversationId: convId,
        twilioSid: twilioMessage.sid,
      };
    } catch (error: any) {
      console.error("Error sending SMS:", error);

      // Handle specific Twilio errors
      if (error.code === 21211) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid phone number format"
        );
      }
      if (error.code === 21614) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Phone number is not SMS-capable"
        );
      }
      if (error.code === 21408) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Cannot send SMS to this region"
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to send SMS"
      );
    }
  }
);

// ── Bulk SMS (admin-only) ────────────────────────────────────────────

interface BulkSmsData {
  recipients: { phone: string; name?: string }[];
  body: string;
  projectId?: string;
}

export const sendBulkSms = functions.https.onCall(
  async (data: BulkSmsData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    // Verify admin role
    const db = getDb();
    const senderDoc = await db
      .collection("users")
      .doc(context.auth.uid)
      .get();
    const senderData = senderDoc.data();
    if (senderData?.role !== "ADMIN") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can send bulk SMS"
      );
    }

    const { recipients, body, projectId } = data;
    if (!recipients || recipients.length === 0 || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing recipients or message body"
      );
    }

    if (recipients.length > 100) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Maximum 100 recipients per bulk send"
      );
    }

    const results: { phone: string; success: boolean; error?: string }[] = [];
    const client = getTwilioClient();
    const config = getTwilioConfig();

    for (const recipient of recipients) {
      try {
        const toFormatted = formatPhoneNumber(recipient.phone);
        await client.messages.create({
          to: toFormatted,
          from: config.phoneNumber,
          body: body,
        });
        results.push({ phone: recipient.phone, success: true });
      } catch (error: any) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Bulk SMS: ${successCount}/${recipients.length} sent`);

    return {
      success: true,
      totalSent: successCount,
      totalFailed: recipients.length - successCount,
      results,
    };
  }
);