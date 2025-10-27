// Push Notification Utilities

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const showLocalNotification = async (title, options = {}) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.log('Cannot show notification: permission not granted');
      return;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: options.data || {},
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
      ...options
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Notification templates for common scenarios
export const notificationTemplates = {
  bookingConfirmed: (bookingId) => ({
    title: 'Booking Confirmed! 🎉',
    body: `Your booking #${bookingId} has been confirmed. We'll notify you when the team is on the way.`,
    tag: `booking-${bookingId}`,
    requireInteraction: false
  }),
  
  teamEnRoute: (eta) => ({
    title: 'Team On The Way! 🚗',
    body: `Our cleaning team is on the way to your location. ETA: ${eta} minutes.`,
    tag: 'team-enroute',
    requireInteraction: true
  }),
  
  serviceStarted: () => ({
    title: 'Service Started ⚡',
    body: 'Our team has started the cleaning service at your location.',
    tag: 'service-started',
    requireInteraction: false
  }),
  
  serviceCompleted: () => ({
    title: 'Service Completed ✅',
    body: 'Your tank/sump cleaning is complete! Check the before & after photos in your dashboard.',
    tag: 'service-completed',
    requireInteraction: true
  }),
  
  paymentSuccess: (amount) => ({
    title: 'Payment Successful 💰',
    body: `Payment of ₹${amount} received successfully. Thank you!`,
    tag: 'payment-success',
    requireInteraction: false
  }),
  
  reminderUpcoming: (date) => ({
    title: 'Upcoming Service Reminder 📅',
    body: `You have a cleaning service scheduled for ${date}. See you soon!`,
    tag: 'reminder',
    requireInteraction: false
  })
};
