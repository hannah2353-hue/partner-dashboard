import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.join(__dirname, "..", "firebase-service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function upload() {
  // --- 1. Upload channels ---
  const dataPath = path.join(__dirname, "..", "..", "output", "data", "integrated.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);

  const channels = data.channels as Array<Record<string, unknown>>;
  console.log(`Uploading ${channels.length} channels to Firestore...`);

  // Batch write channels (max 500 operations per batch, using 400 as safe limit)
  let batch = db.batch();
  let count = 0;

  for (const channel of channels) {
    const code = (channel.channel_code as string).replace(/\//g, "_");
    const ref = db.collection("channels").doc(code);
    batch.set(ref, channel);
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      console.log(`  Committed ${count}/${channels.length}`);
      batch = db.batch();
    }
  }

  // Write metadata
  const metaRef = db.collection("metadata").doc("last_sync");
  batch.set(metaRef, {
    synced_at: new Date().toISOString(),
    total_channels: channels.length,
    reference_date: data.reference_date,
  });

  await batch.commit();
  console.log(`  Committed ${channels.length}/${channels.length}`);
  console.log(`\nDone! ${channels.length} channels uploaded to Firestore.`);

  // --- 2. Upload audit log (if exists) ---
  const auditLogPath = path.join(__dirname, "..", "src", "data", "audit-log.json");

  try {
    if (fs.existsSync(auditLogPath)) {
      const auditRaw = fs.readFileSync(auditLogPath, "utf-8").trim();

      if (auditRaw.length > 0) {
        const auditEntries = JSON.parse(auditRaw) as Array<Record<string, unknown>>;

        if (Array.isArray(auditEntries) && auditEntries.length > 0) {
          console.log(`\nUploading ${auditEntries.length} audit log entries to Firestore...`);

          let auditBatch = db.batch();
          let auditCount = 0;

          for (const entry of auditEntries) {
            const ref = db.collection("audit_log").doc(); // auto-generated ID
            auditBatch.set(ref, entry);
            auditCount++;

            if (auditCount % 400 === 0) {
              await auditBatch.commit();
              console.log(`  Committed ${auditCount}/${auditEntries.length} audit entries`);
              auditBatch = db.batch();
            }
          }

          await auditBatch.commit();
          console.log(`  Committed ${auditCount}/${auditEntries.length} audit entries`);
          console.log(`Done! ${auditEntries.length} audit log entries uploaded.`);
        } else {
          console.log("\nAudit log is empty, skipping.");
        }
      } else {
        console.log("\nAudit log file is empty, skipping.");
      }
    } else {
      console.log("\nAudit log file not found, skipping.");
    }
  } catch (err) {
    console.warn("\nFailed to upload audit log, skipping:", err);
  }
}

upload().catch(console.error);
