importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');


const firebaseConfig = {
  apiKey: "AIzaSyDHy_P4U6IC50FAIYpR6lBNLyo5OskloJg",
  authDomain: "acolitos-27f14.firebaseapp.com",
  projectId: "acolitos-27f14",
  storageBucket: "acolitos-27f14.firebasestorage.app",
  messagingSenderId: "638857959286",
  appId: "1:638857959286:web:519afb1104e4b83f720c57",
  measurementId: "G-PJ3Z0VQBK9"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});