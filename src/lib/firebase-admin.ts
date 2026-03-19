import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // Vercel: read service account key from env var (supports Base64 or raw JSON)
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    let json = envKey;
    // If it doesn't start with '{', assume Base64 encoded
    if (!envKey.trimStart().startsWith("{")) {
      json = Buffer.from(envKey, "base64").toString("utf-8");
    }
    const serviceAccount = JSON.parse(json);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Local: read from file
  const keyPath = path.join(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    return initializeApp({ credential: cert(serviceAccount) });
  }

  throw new Error("Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT_KEY env var or place firebase-service-account.json in project root.");
}

const adminApp = getAdminApp();
export const adminDb = getFirestore(adminApp);
