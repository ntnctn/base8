const express = require('express');
const webpush = require('web-push');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Настройка VAPID ключей для push-уведомлений
const vapidKeys = {
  publicKey: 'BIyoBa2joq8_ojoMV35q4PC-2LRMzDMedxixzBjYjJV7hBbxcvPJn8_-aZwmFfRB4SRo-onSgwZx9MABtPiJV1s',
  privateKey: 'pHkhtqds8AqghJb_bEAw1Hns0rBWeOGOcLyuIUcTKJo'
};

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Хранилище подписок
let pushSubscriptions = [];

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API для подписки на уведомления
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  pushSubscriptions.push(subscription);
  console.log('New subscription added');
  res.status(201).json({});
});

// API для отправки тестового уведомления
app.post('/send-notification', (req, res) => {
  const notificationPayload = {
    title: req.body.title || 'Новое уведомление',
    body: req.body.body || 'У вас есть невыполненные задачи!',
    icon: '/icons/icon-192x192.png'
  };

  Promise.all(
    pushSubscriptions.map(subscription => 
      webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
    )
  )
  .then(() => res.status(200).json({message: 'Notification sent successfully'}))
  .catch(err => {
    console.error('Error sending notification:', err);
    res.status(500).json({error: 'Error sending notification'});
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});