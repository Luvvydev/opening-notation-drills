// Read-only account audit. No migration or membership writes are needed for policy v2.
const admin = require("../functions/node_modules/firebase-admin");
const projectIndex = process.argv.indexOf("--project");
const projectId = projectIndex >= 0 ? process.argv[projectIndex + 1] : "";
if (!projectId || !process.argv.includes("--dry-run") || process.argv.includes("--apply")) {
  throw new Error("Usage: node scripts/audit-conversion-access.js --project PROJECT_ID --dry-run");
}
if (process.env.FIRESTORE_EMULATOR_HOST && !projectId.startsWith("demo-")) {
  throw new Error("Use a demo project for emulator audits");
}
admin.initializeApp({ projectId });
(async () => {
  const totals = { users: 0, paid: 0, lifetime: 0, activeTrial: 0, freeOrExpired: 0, inconsistent: 0 };
  const { hasTrainingAccess } = require("../functions/trainingWorkspace");
  let cursor;
  for (;;) {
    let query = admin.firestore().collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(250);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const data = doc.data();
      totals.users += 1;
      const paid = data.membershipActive === true && ["member", "lifetime"].includes(data.membershipTier);
      if (paid) { totals.paid += 1; if (data.membershipTier === "lifetime") totals.lifetime += 1; }
      else if (hasTrainingAccess(data)) totals.activeTrial += 1;
      else totals.freeOrExpired += 1;
      if (data.membershipActive === true && !["member", "lifetime"].includes(data.membershipTier)) totals.inconsistent += 1;
    }
    if (page.size < 250) break;
    cursor = page.docs[page.docs.length - 1];
  }
  console.log(JSON.stringify({ projectId, dryRun: true, writes: 0, totals }, null, 2));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
