const functions = require('firebase-functions);
const admin = require('firebase-admin);
admin.initializeApp();

exports.approveDriver = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  }
  const driverId = data.driverId;
  if (!driverId) {
    throw new functions.https.HttpsError('invalid-argument', 'driverId required.');
  }
  const ref = admin.firestore().collection('drivers').doc(driverId);
  const result = await admin.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists || doc.data().badgeStatus !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Profile not pending.');
    }
    transaction.update(ref, {
      badgeStatus: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: context.auth.uid
    });
    return true;
  });
  return result;
});

exports.rejectDriver = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  }
  const driverId = data.driverId;
  if (!driverId) {
    throw new functions.https.HttpsError('invalid-argument', 'driverId required.');
  }
  const ref = admin.firestore().collection('drivers').doc(driverId);
  const result = await admin.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists || doc.data().badgeStatus !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Profile not pending.');
    }
    transaction.delete(ref);
    return 'deleted';
  });
  return result;
});
