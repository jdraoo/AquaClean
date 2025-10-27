import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  requestNotificationPermission, 
  checkNotificationPermission,
  showLocalNotification,
  notificationTemplates
} from '../utils/notifications';

const NotificationSettings = () => {
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentPermission = checkNotificationPermission();
    setPermission(currentPermission);
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    
    if (granted) {
      setPermission('granted');
      // Show a test notification
      await showLocalNotification(
        'Notifications Enabled! 🔔',
        {
          body: 'You will now receive updates about your bookings and services.',
          tag: 'permission-granted'
        }
      );
    } else {
      setPermission(Notification.permission);
    }
    setLoading(false);
  };

  const handleTestNotification = async () => {
    await showLocalNotification(
      'Test Notification 🧪',
      {
        body: 'This is a test notification from AquaClean. Your notifications are working perfectly!',
        tag: 'test-notification'
      }
    );
  };

  if (permission === 'unsupported') {
    return (
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <BellOff className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-yellow-700">
              Your browser doesn't support push notifications. Please use a modern browser.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-start space-x-3">
          <X className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              Notifications Blocked
            </h3>
            <p className="text-sm text-red-700 mb-3">
              You have blocked notifications. To enable them, please allow notifications in your browser settings.
            </p>
            <p className="text-xs text-red-600">
              Chrome: Click the lock icon in the address bar → Site Settings → Notifications → Allow
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (permission === 'granted') {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Check className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Notifications Enabled ✓
              </h3>
              <p className="text-sm text-green-700 mb-3">
                You'll receive updates about bookings, team arrivals, and service completions.
              </p>
              <Button
                onClick={handleTestNotification}
                variant="outline"
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                Send Test Notification
              </Button>
            </div>
          </div>
          <Bell className="h-6 w-6 text-green-600" />
        </div>
      </Card>
    );
  }

  // permission === 'default'
  return (
    <Card className="p-6 bg-blue-50 border-blue-200">
      <div className="flex items-start space-x-3">
        <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">
            Enable Push Notifications
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Get real-time updates about your bookings, team arrivals, and service status.
          </p>
          <Button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NotificationSettings;
