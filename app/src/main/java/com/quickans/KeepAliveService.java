package com.quickans;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

// Keeps the process alive (and the CPU awake) while the app reads a book or gets answers, even with the screen off.
public class KeepAliveService extends Service {
  static final String CH = "quickans_work";
  PowerManager.WakeLock wl;

  static void channel(Context c) {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      nm.createNotificationChannel(new NotificationChannel(CH, "Background work", NotificationManager.IMPORTANCE_LOW));
    }
  }
  static PendingIntent open(Context c) {
    Intent i = new Intent(c, MainActivity.class);
    i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(c, 0, i, (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0) | PendingIntent.FLAG_UPDATE_CURRENT);
  }
  static Notification.Builder builder(Context c) {
    return Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
  }
  static void start(Context c, String text) {
    Intent i = new Intent(c, KeepAliveService.class);
    i.putExtra("text", text);
    try { if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i); } catch (Throwable e) { }
  }
  static void stop(Context c) { try { c.stopService(new Intent(c, KeepAliveService.class)); } catch (Throwable e) { } }
  // "Ready" note shown when the work finished while the app was not on screen
  static void done(Context c, String text) {
    try {
      channel(c);
      Notification n = builder(c).setContentTitle("A.I - Ans by Mystery").setContentText(text).setSmallIcon(android.R.drawable.stat_notify_sync)
        .setAutoCancel(true).setContentIntent(open(c)).build();
      ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(2, n);
    } catch (Throwable e) { }
  }
  static void clearDone(Context c) {
    try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(2); } catch (Throwable e) { }
  }

  @Override public IBinder onBind(Intent i) { return null; }
  @Override public int onStartCommand(Intent i, int flags, int id) {
    String text = i != null && i.getStringExtra("text") != null ? i.getStringExtra("text") : "Working…";
    channel(this);
    Notification n = builder(this).setContentTitle("A.I - Ans by Mystery").setContentText(text).setSmallIcon(android.R.drawable.stat_notify_sync)
      .setOngoing(true).setContentIntent(open(this)).build();
    if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC); else startForeground(1, n);
    if (wl == null) {
      PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
      wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "quickans:work");
      wl.setReferenceCounted(false);
    }
    if (!wl.isHeld()) wl.acquire(3L * 60 * 60 * 1000);   // released automatically after 3 hours at most
    return START_NOT_STICKY;
  }
  @Override public void onDestroy() {
    try { if (wl != null && wl.isHeld()) wl.release(); } catch (Throwable e) { }
    super.onDestroy();
  }
}
