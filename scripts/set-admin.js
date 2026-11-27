// Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-admin.js you@example.com
// Never commit serviceAccount.json or deploy it to Hosting.
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.applicationDefault() });
(async () => {
  const user = await admin.auth().getUserByEmail(process.argv[2]);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  await admin.firestore().doc(`admins/${user.uid}`).set({ email: user.email, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log("Admin claim set for", user.email, "- sign out and in again.");
})().catch(e => { console.error(e.message); process.exit(1); });
