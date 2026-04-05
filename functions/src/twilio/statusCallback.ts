import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
 
// ── Lazy Firestore ───────────────────────────────────────────────────
const getDb = () => admin.firestore();
 
// ── Status mapping for display ───────────────────────────────────────
const STATUS_DISPLAY: Record<string, string> = {
  accepted: "Accepted",
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  undelivered: "Undelivered",
  failed: "Failed",
  receiving: "Receiving",
  received: "Received",
  read: "Read",
};
 
// ── Webhook Handler ──────────────────────────────────────────────────
export const smsStatusCallback = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
 
  const {
    MessageSid,
    MessageStatus,
    ErrorCode,
    ErrorMessage,
    To,
    From,
  } = req.body;
 
  if (!MessageSid || !MessageStatus) {
    console.error("Invalid status callback:", req.body);
    res.status(400).send("Bad Request");
    return;
  }
 
  console.log(`SMS status update: ${MessageSid} → ${MessageStatus}`);
 
  const db = getDb();
 
  try {
    // Find the message by Twilio SID
    const messageQuery = await db
      .collection("smsMessages")
      .where("twilioSid", "==", MessageSid)
      .limit(1)
      .get();
 
    if (messageQuery.empty) {
      console.warn(`Message not found for SID: ${MessageSid}`);
      // Still return 200 to acknowledge receipt
      res.status(200).send("OK");
      return;
    }
 
    const messageDoc = messageQuery.docs[0];
    const messageData = messageDoc.data();
 
    // Update message status
    const updateData: Record<string, any> = {
      status: MessageStatus,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
 
    // Add error info if failed
    if (MessageStatus === "failed" || MessageStatus === "undelivered") {
      updateData.error = {
        code: ErrorCode || null,
        message: ErrorMessage || null,
      };
 
      // Create notification for failed messages
      if (messageData.sentBy) {
        await db.collection("notifications").add({
          recipientId: messageData.sentBy,
          title: "SMS Delivery Failed",
          message: `Message to ${To} could not be delivered. ${ErrorMessage || ""}`,
          category: "system",
          action: "sms_failed",
          priority: "high",
          isRead: false,
          isEmailSent: false,
          link: {
            view: "communications",
            entityId: messageData.conversationId,
            tab: "sms",
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
 
    await messageDoc.ref.update(updateData);
 
    // If delivered, optionally update conversation
    if (MessageStatus === "delivered") {
      const convRef = db
        .collection("smsConversations")
        .doc(messageData.conversationId);
 
      await convRef.update({
        lastDeliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
 
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing status callback:", error);
    res.status(500).send("Internal Server Error");
  }
});
 
// ── Get conversation statistics ──────────────────────────────────────
// Callable function to get delivery stats for a conversation
export const getConversationStats = functions.https.onCall(
  async (data: {conversationId: string}, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }
 
    const {conversationId} = data;
    if (!conversationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "conversationId required"
      );
    }
 
    const db = getDb();
 
    const messages = await db
      .collection("smsMessages")
      .where("conversationId", "==", conversationId)
      .get();
 
    const stats = {
      total: messages.size,
      inbound: 0,
      outbound: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    };
 
    messages.forEach((doc) => {
      const msg = doc.data();
      if (msg.direction === "inbound") {
        stats.inbound++;
      } else {
        stats.outbound++;
        if (msg.status === "delivered") stats.delivered++;
        else if (msg.status === "failed" || msg.status === "undelivered") {
          stats.failed++;
        } else stats.pending++;
      }
    });
 
    return stats;
  }
);