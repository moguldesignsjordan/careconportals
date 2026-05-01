// functions/src/twilio/callRecordings.ts
// Fetch call recordings and transcriptions from Twilio API
// Recordings can be played directly via their media URL

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const getDb = () => admin.firestore();

// ── Twilio config ────────────────────────────────────────────────────

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
});

const twilioAuthHeader = () => {
  const { accountSid, authToken } = getTwilioConfig();
  return (
    "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  );
};

// ── Verify admin ─────────────────────────────────────────────────────

const verifyAdmin = async (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  const db = getDb();
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();

  if (!userDoc.exists || userData?.role !== "ADMIN") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can access call recordings"
    );
  }
  return userData;
};

// ── Recording types ──────────────────────────────────────────────────

interface TwilioRecording {
  sid: string;
  callSid: string;
  duration: string;
  dateCreated: string;
  status: string;
  channels: number;
  source: string;
  mediaUrl: string;        // Direct playable URL (.mp3)
  transcriptionText: string | null;
  transcriptionStatus: string | null;
}

// ── Get Recordings for a Call ────────────────────────────────────────

interface GetRecordingsRequest {
  callSid: string;
}

export const getCallRecordings = functions.https.onCall(
  async (data: GetRecordingsRequest, context) => {
    await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const { callSid } = data;
    if (!callSid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "callSid is required"
      );
    }

    try {
      // 1. Fetch recordings for this call
      const recordingsUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls/${callSid}/Recordings.json`;
      const recordingsResponse = await fetch(recordingsUrl, {
        method: "GET",
        headers: { Authorization: twilioAuthHeader() },
      });

      const recordingsResult = (await recordingsResponse.json()) as any;
      if (!recordingsResponse.ok) {
        console.error("Twilio Recordings API error:", JSON.stringify(recordingsResult));
        throw new functions.https.HttpsError(
          "internal",
          "Failed to fetch recordings from Twilio"
        );
      }

      const recordings = recordingsResult.recordings || [];

      if (recordings.length === 0) {
        return { recordings: [], hasRecordings: false };
      }

      // 2. For each recording, try to fetch transcription
      const enrichedRecordings: TwilioRecording[] = [];

      for (const rec of recordings) {
        let transcriptionText: string | null = null;
        let transcriptionStatus: string | null = null;

        // Fetch transcriptions for this recording
        try {
          const transcriptionsUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${rec.sid}/Transcriptions.json`;
          const transcriptionsResponse = await fetch(transcriptionsUrl, {
            method: "GET",
            headers: { Authorization: twilioAuthHeader() },
          });

          if (transcriptionsResponse.ok) {
            const transcriptionsResult = (await transcriptionsResponse.json()) as any;
            const transcriptions = transcriptionsResult.transcriptions || [];

            if (transcriptions.length > 0) {
              const transcription = transcriptions[0]; // Most recent
              transcriptionStatus = transcription.status;

              if (transcription.status === "completed") {
                // Fetch the full transcription text
                const textUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Transcriptions/${transcription.sid}.json`;
                const textResponse = await fetch(textUrl, {
                  method: "GET",
                  headers: { Authorization: twilioAuthHeader() },
                });

                if (textResponse.ok) {
                  const textResult = (await textResponse.json()) as any;
                  transcriptionText = textResult.transcription_text || null;
                }
              }
            }
          }
        } catch (err: any) {
          console.warn(`Failed to fetch transcription for recording ${rec.sid}:`, err.message);
        }

        // Build the playable media URL
        // Twilio serves recordings at this URL — append .mp3 for browser playback
        const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${rec.sid}.mp3`;

        enrichedRecordings.push({
          sid: rec.sid,
          callSid: rec.call_sid,
          duration: rec.duration,
          dateCreated: rec.date_created,
          status: rec.status,
          channels: rec.channels,
          source: rec.source,
          mediaUrl,
          transcriptionText,
          transcriptionStatus,
        });
      }

      return {
        recordings: enrichedRecordings,
        hasRecordings: true,
      };
    } catch (error: any) {
      console.error("Error fetching recordings:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch recordings"
      );
    }
  }
);

// ── Get a signed/authed URL for playback ─────────────────────────────
// Twilio recording URLs require authentication.
// This function fetches the audio and returns a base64 data URI
// so the browser can play it without needing Twilio credentials.

interface GetRecordingAudioRequest {
  recordingSid: string;
}

export const getRecordingAudio = functions.https.onCall(
  async (data: GetRecordingAudioRequest, context) => {
    await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const { recordingSid } = data;
    if (!recordingSid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "recordingSid is required"
      );
    }

    try {
      const audioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${recordingSid}.mp3`;
      const response = await fetch(audioUrl, {
        headers: { Authorization: twilioAuthHeader() },
      });

      if (!response.ok) {
        throw new functions.https.HttpsError(
          "internal",
          `Failed to fetch recording audio: ${response.status}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      return {
        audio: `data:audio/mpeg;base64,${base64}`,
        duration: response.headers.get("content-length"),
      };
    } catch (error: any) {
      console.error("Error fetching recording audio:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch audio"
      );
    }
  }
);

// ── Request transcription for an existing recording ──────────────────
// If a recording exists but wasn't transcribed, this kicks off transcription.

interface RequestTranscriptionData {
  recordingSid: string;
}

export const requestTranscription = functions.https.onCall(
  async (data: RequestTranscriptionData, context) => {
    await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const { recordingSid } = data;
    if (!recordingSid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "recordingSid is required"
      );
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${recordingSid}/Transcriptions.json`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: twilioAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const result = (await response.json()) as any;
      if (!response.ok) {
        console.error("Twilio Transcription error:", JSON.stringify(result));
        throw new functions.https.HttpsError(
          "internal",
          result.message || "Failed to request transcription"
        );
      }

      return {
        success: true,
        transcriptionSid: result.sid,
        status: result.status, // "in-progress"
      };
    } catch (error: any) {
      console.error("Error requesting transcription:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to request transcription"
      );
    }
  }
);