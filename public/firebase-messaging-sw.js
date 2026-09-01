importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDHy_P4U6IC50FAIYpR6lBNLyo5OskloJg",
  authDomain: "acolitos-27f14.firebaseapp.com",
  projectId: "acolitos-27f14",
  storageBucket: "acolitos-27f14.firebasestorage.app",
  messagingSenderId: "638857959286",
  appId: "1:638857959286:web:519afb1104e4b83f720c57"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const db = firebase.firestore();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload?.notification?.title || "Escala de Acólitos";
  const campaignId = payload?.data?.campaignId || null;

  const notificationOptions = {
    body: payload?.notification?.body || "Você tem uma novidade na sua escala.",
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      campaignId: campaignId,
      url: payload?.data?.url || '/'
    }
  };

  if (campaignId) {
    db.collection('notificacoes_stats').doc(campaignId).update({
      entregues: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.error(err));
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const campaignId = event.notification.data?.campaignId;
  const targetUrl = event.notification.data?.url || '/';

  if (campaignId) {
    db.collection('notificacoes_stats').doc(campaignId).update({
      lidas: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.error(err));
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});