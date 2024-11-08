const firebase = require("firebase-admin");
const serviceAccount = require("../utils/jenos-way-firebase-adminsdk-m6jux-c3521d5bff.json");

firebase.initializeApp({
  credentials: firebase.credential.cert(serviceAccount),
});

const sendFirebaseNotification = async (details) => {
  try{
  return firebase.messaging().send({
    token: details.firebaseId,
    notification: {
      title: details.title,
      body: details.body,
    },
  });
}catch(error){
  console.log("Error sending Firebase notification:", error)
}
};

module.exports = { sendFirebaseNotification };
