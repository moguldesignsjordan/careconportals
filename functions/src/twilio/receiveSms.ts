// functions/src/twilio/receiveSms.ts
// Inbound SMS/MMS webhook handlers from Twilio

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { formatPhoneNumber, validateTwilioSignature } from "./config";

// ── Lazy Firestore ───────────────────────────────────────────────────
const getDb = () => admin.firestore();

// ── Inbound SMS Webhook ──────────────────────────────────────────────

export const receiveSms = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {
    MessageSid,
    AccountSid,
    From,
    To,
    Body,
    NumMedia,
    NumSegments,
  } = req.body;

  if (!MessageSid || !From || !To || Body === undefined) {
    console.error("Invalid webhook payload:", req.body);
    res.status(400).send("Bad Request: Missing required fields");
    return;
  }

  // Optional: Validate Twilio signature
  const twilioSignature = req.headers["x-twilio-signature"] as string;
  if (twilioSignature && process.env.TWILIO_AUTH_TOKEN) {
    const url = `https://${req.headers.host}${req.path}`;
    const isValid = validateTwilioSignature(twilioSignature, url, req.body);
    if (!isValid) {
      console.warn("Invalid Twilio signature - possible spoofing attempt");
      // In production, uncomment to reject:
      // res.status(403).send("Forbidden: Invalid signature");
      // return;
    }
  }

  const db = getDb();
  const fromFormatted = formatPhoneNumber(From);
  const toFormatted = formatPhoneNumber(To);

  console.log(`Inbound SMS from ${fromFormatted}: ${Body?.slice(0, 50)}...`);

  try {
    // 1. Find or create conversation
    let conversationId: string;
    let portalUserId: string | null = null;
    let portalUserName: string | null = null;

    const existingConv = await db
      .collection("smsConversations")
      .where("participantPhone", "==", fromFormatted)
      .limit(1)
      .get();

    if (!existingConv.empty) {
      conversationId = existingConv.docs[0].id;
      const convData = existingConv.docs[0].data();
      portalUserId = convData.portalUserId;
      portalUserName = convData.portalUserName;
    } else {
      // Try to match phone number to a portal user
      const userMatch = await db
        .collection("users")
        .where("phone", "==", fromFormatted)
        .limit(1)
        .get();

      if (!userMatch.empty) {
        const userData = userMatch.docs[0].data();
        portalUserId = userMatch.docs[0].id;
        portalUserName = userData.name || null;
      }

      // Create new conversation
      const newConv = await db.collection("smsConversations").add({
        participantPhone: fromFormatted,
        portalUserId: portalUserId,
        portalUserName: portalUserName,
        twilioNumber: toFormatted,
        projectId: null,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: Body?.slice(0, 100) || "(empty)",
        lastMessageDirection: "inbound",
        unreadCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "twilio-webhook",
      });
      conversationId = newConv.id;
    }

    // 2. Create message record
    const messageRef = await db.collection("smsMessages").add({
      conversationId: conversationId,
      direction: "inbound",
      from: fromFormatted,
      to: toFormatted,
      body: Body || "",
      twilioSid: MessageSid,
      status: "received",
      sentBy: null,
      projectId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        twilioAccountSid: AccountSid,
        numMedia: parseInt(NumMedia || "0", 10),
        numSegments: parseInt(NumSegments || "1", 10),
      },
    });

    // 3. Update conversation
    await db
      .collection("smsConversations")
      .doc(conversationId)
      .update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: Body?.slice(0, 100) || "(empty)",
        lastMessageDirection: "inbound",
        unreadCount: admin.firestore.FieldValue.increment(1),
      });

    // 4. Notify all admins
    const admins = await db
      .collection("users")
      .where("role", "==", "ADMIN")
      .get();

    const notificationBatch = db.batch();
    const senderDisplay = portalUserName || fromFormatted;

    for (const adminDoc of admins.docs) {
      const notificationRef = db.collection("notifications").doc();
      notificationBatch.set(notificationRef, {
        recipientId: adminDoc.id,
        senderId: portalUserId || null,
        senderName: senderDisplay,
        title: `SMS from ${senderDisplay}`,
        message: Body?.slice(0, 100) || "(empty message)",
        category: "message",
        action: "sms_received",
        priority: "normal",
        isRead: false,
        isEmailSent: false,
        link: {
          view: "communications",
          entityId: conversationId,
          tab: "sms",
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await notificationBatch.commit();

    console.log(
      `SMS stored: ${messageRef.id} in conversation ${conversationId}`
    );

    // 5. Return TwiML (empty = no auto-reply)
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- No auto-reply. Add <Message> here if you want one. -->
</Response>`);
  } catch (error: any) {
    console.error("Error processing inbound SMS:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ── Handle MMS (media attachments) ───────────────────────────────────

export const receiveMms = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {
    MessageSid,
    From,
    To,
    Body,
    NumMedia,
  } = req.body;

  const numMedia = parseInt(NumMedia || "0", 10);
  if (numMedia === 0) {
    res.redirect(307, "/receiveSms");
    return;
  }

  const db = getDb();
  const fromFormatted = formatPhoneNumber(From);

  console.log(
    `MMS received from ${fromFormatted} with ${numMedia} attachments`
  );

  try {
    // Find conversation
    const existingConv = await db
      .collection("smsConversations")
      .where("participantPhone", "==", fromFormatted)
      .limit(1)
      .get();

    let conversationId: string;

    if (!existingConv.empty) {
      conversationId = existingConv.docs[0].id;
    } else {
      const newConv = await db.collection("smsConversations").add({
        participantPhone: fromFormatted,
        portalUserId: null,
        twilioNumber: formatPhoneNumber(To),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: Body?.slice(0, 100) || "(media message)",
        lastMessageDirection: "inbound",
        unreadCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      conversationId = newConv.id;
    }

    // Collect all media URLs
    const mediaUrls: { url: string; contentType: string }[] = [];
    for (let i = 0; i < numMedia; i++) {
      const urlKey = `MediaUrl${i}`;
      const typeKey = `MediaContentType${i}`;
      if (req.body[urlKey]) {
        mediaUrls.push({
          url: req.body[urlKey],
          contentType: req.body[typeKey] || "application/octet-stream",
        });
      }
    }

    // Store message with media
    await db.collection("smsMessages").add({
      conversationId: conversationId,
      direction: "inbound",
      from: fromFormatted,
      to: formatPhoneNumber(To),
      body: Body || "",
      twilioSid: MessageSid,
      status: "received",
      hasMedia: true,
      media: mediaUrls,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update conversation
    await db
      .collection("smsConversations")
      .doc(conversationId)
      .update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: Body?.slice(0, 100) || "📎 Media message",
        lastMessageDirection: "inbound",
        unreadCount: admin.firestore.FieldValue.increment(1),
      });

    res.set("Content-Type", "text/xml");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
    );
  } catch (error: any) {
    console.error("Error processing MMS:", error);
    res.status(500).send("Internal Server Error");
  }
});