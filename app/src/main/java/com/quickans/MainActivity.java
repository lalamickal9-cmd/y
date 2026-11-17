package com.quickans;
import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.*;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

public class MainActivity extends Activity {
  WebView w; ValueCallback<Uri[]> cb; Uri cam;
  PdfRenderer pr; ParcelFileDescriptor pfd;                       // PDF pages of the question files
  PdfRenderer bpr; ParcelFileDescriptor bfd; String bpId;         // a saved book, shown as page pictures (offline diagrams)
  TextRecognizer rec;
  final Handler ui = new Handler(Looper.getMainLooper());
  volatile boolean fg = false, jsWork = false;                    // app on screen / the page is working
  volatile int bookJobs = 0;                                      // books being read right now
  String workText = "Working…";
  final ExecutorService qEx = Executors.newSingleThreadExecutor();   // reads text in the question photos
  final ExecutorService bEx = Executors.newSingleThreadExecutor();   // reads books (many pages) in the background
  final Set<String> cancelled = Collections.synchronizedSet(new HashSet<String>());
  int bookSeq = 0;

  void js(final String s) { runOnUiThread(new Runnable() { @Override public void run() { w.evaluateJavascript(s, null); } }); }
  static String q(String s) { return JSONObject.quote(s == null ? "" : s); }

  // Reads the text in a picture on the phone itself (Google ML Kit text recognition: works without internet).
  synchronized String ocrBitmap(Bitmap b) {
    try {
      if (rec == null) rec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
      // Photos of papers are often taken sideways: read upright first, and only if that looks like nonsense try the other turns
      String best = ""; int bs = -1;
      int[] turns = { 0, 90, 270, 180 };
      for (int k = 0; k < turns.length; k++) {
        String t = Tasks.await(rec.process(InputImage.fromBitmap(b, turns[k]))).getText();
        int sc = readable(t);
        if (sc > bs) { bs = sc; best = t; }
        if (sc >= 12) break;            // clearly real English text: stop here
      }
      return best;
    } catch (Throwable e) { return ""; }
  }
  static final java.util.HashSet<String> COMMON = new java.util.HashSet<String>(java.util.Arrays.asList(
    "the","of","is","and","in","to","what","which","with","for","are","that","from","by","at","on","an","as","be","or",
    "why","how","its","this","if","not","all","has","have","will","can","than","each","between","given","find","calculate","write"));
  // how much of the text is real English words (a sideways read gives random letters)
  static int readable(String t) {
    int n = 0;
    for (String w : t.toLowerCase().split("[^a-z]+")) if (COMMON.contains(w)) n++;
    return n;
  }
  static Bitmap decodeScaled(byte[] d, int max) {
    BitmapFactory.Options o = new BitmapFactory.Options();
    o.inJustDecodeBounds = true;
    BitmapFactory.decodeByteArray(d, 0, d.length, o);
    int s = 1;
    while (Math.max(o.outWidth, o.outHeight) / (s * 2) >= max) s *= 2;
    BitmapFactory.Options o2 = new BitmapFactory.Options();
    o2.inSampleSize = s;
    return BitmapFactory.decodeByteArray(d, 0, d.length, o2);
  }

  // ---- keeping the app alive while it works (screen off, another app in front) ----
  void workChanged() { // runs on the UI thread
    if (jsWork || bookJobs > 0) KeepAliveService.start(this, workText);
    else ui.postDelayed(new Runnable() { @Override public void run() {
      if (!(jsWork || bookJobs > 0)) KeepAliveService.stop(MainActivity.this);
    }}, 1500);   // a short delay: stopping at once after starting can crash on some phones
  }
  void bookJob(final boolean on, final String text) {
    runOnUiThread(new Runnable() { @Override public void run() {
      bookJobs = Math.max(0, bookJobs + (on ? 1 : -1));
      if (text != null) workText = text;
      if (on) askOnce();
      workChanged();
    }});
  }
  // Asked one thing at a time on first use: notifications (to show the "working" note), then "don't optimise battery" for this app.
  void askOnce() {
    try {
      SharedPreferences sp = getSharedPreferences("quickans", MODE_PRIVATE);
      int step = sp.getInt("ask", 0);
      if (step >= 2) return;
      if (step == 0 && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        sp.edit().putInt("ask", 1).apply();
        requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 7);
        return;
      }
      sp.edit().putInt("ask", 2).apply();
      if (Build.VERSION.SDK_INT >= 23) {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName()))
          startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
      }
    } catch (Throwable e) { }
  }

  // ---- reading books ----
  File bookFile(String id) { File d = new File(getFilesDir(), "books"); d.mkdirs(); return new File(d, id + ".pdf"); }
  synchronized Task<Text> recognize(Bitmap b) {
    try {
      if (rec == null) rec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
      return rec.process(InputImage.fromBitmap(b, 0));
    } catch (Throwable e) { return null; }
  }
  // Draws one page; a page that fails (or runs out of memory) is retried smaller, never stops the whole book.
  static Bitmap renderPage(PdfRenderer r, int i) {
    for (int attempt = 0; attempt < 2; attempt++) {
      PdfRenderer.Page p = null;
      try {
        p = r.openPage(i);
        float s = (attempt == 0 ? 1300f : 800f) / p.getWidth();
        if (p.getHeight() * s > 2200f) s = 2200f / p.getHeight();
        Bitmap b = Bitmap.createBitmap(Math.max(1, Math.round(p.getWidth() * s)), Math.max(1, Math.round(p.getHeight() * s)), Bitmap.Config.ARGB_8888);
        b.eraseColor(Color.WHITE);
        Matrix m = new Matrix();
        m.postScale(s, s);
        p.render(b, null, m, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        return b;
      } catch (Throwable e) {
        // try again smaller
      } finally {
        if (p != null) { try { p.close(); } catch (Throwable e) { } }
      }
    }
    return null;
  }
  // Waits for the text of one page and hands it to the page; returns false when that page could not be read.
  boolean deliver(String id, int i, Task<Text> t, Bitmap b) {
    String s = ""; boolean ok = true;
    try {
      if (t != null) s = Tasks.await(t, 90, TimeUnit.SECONDS).getText(); else ok = false;
    } catch (Throwable e) { ok = false; }
    if (b != null) b.recycle();
    js("window.bookPage(" + q(id) + "," + i + "," + q(s) + ")");
    return ok;
  }
  // A book PDF is saved inside the app (so it can be resumed and its pages shown later), then read page by page.
  void readPdfBook(String id, String name, Uri u) throws Exception {
    File f = bookFile(id);
    InputStream in = getContentResolver().openInputStream(u);
    FileOutputStream fo = new FileOutputStream(f);
    byte[] buf = new byte[65536]; int n;
    while ((n = in.read(buf)) > 0) fo.write(buf, 0, n);
    fo.close(); in.close();
    readPages(id, name, 0);
  }
  // Pages are drawn one at a time while the previous page's text is still being read, and a bad page is skipped, not fatal.
  void readPages(String id, String name, int start) throws Exception {
    File f = bookFile(id);
    if (!f.exists()) { js("window.bookFail(" + q(id) + "," + q("The saved copy of this book is gone - add it again.") + ")"); return; }
    bookJob(true, "Reading " + name + "…");
    PdfRenderer r = null; ParcelFileDescriptor fd = null;
    try {
      fd = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
      r = new PdfRenderer(fd);
      int total = r.getPageCount();
      js("window.bookInfo(" + q(id) + "," + q(name) + "," + total + ")");
      Task<Text> pt = null; Bitmap pb = null; int pi = -1, i = Math.max(0, start), bad = 0;
      while (true) {
        boolean more = i < total && !cancelled.contains(id);
        Bitmap b = null; Task<Text> t = null;
        if (more) {
          b = renderPage(r, i);
          if (b != null) { t = recognize(b); if (t == null) { b.recycle(); b = null; } }
        }
        if (pi >= 0 && !deliver(id, pi, pt, pb)) bad++;
        if (!more) break;
        pt = t; pb = b; pi = i; i++;
      }
      if (i >= total) js("window.bookDone(" + q(id) + "," + bad + ")");
      else js("window.bookPaused(" + q(id) + ")");
    } finally {
      try { if (r != null) r.close(); if (fd != null) fd.close(); } catch (Throwable e) { }
      cancelled.remove(id);
      bookJob(false, null);
    }
  }
  // A Word / text book: the file goes to the page, which splits it into pages.
  void sendBookFile(String id, String name, Uri u) throws Exception {
    InputStream in = getContentResolver().openInputStream(u);
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    byte[] buf = new byte[65536]; int n; long tot = 0;
    while ((n = in.read(buf)) > 0) {
      tot += n;
      if (tot > 12L * 1024 * 1024) { in.close(); js("window.bookFail(" + q(id) + "," + q(name + " is over 12 MB.") + ")"); return; }
      o.write(buf, 0, n);
    }
    in.close();
    js("window.bookFile(" + q(id) + "," + q(name) + "," + q(Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP)) + ")");
  }
  void addBook(final Uri u) {
    final String id = "b" + System.currentTimeMillis() + "_" + (bookSeq++);
    bEx.execute(new Runnable() { @Override public void run() {
      String name = "book";
      try {
        Cursor cu = getContentResolver().query(u, null, null, null, null);
        if (cu != null) {
          try {
            if (cu.moveToFirst()) { int k = cu.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (k >= 0) name = cu.getString(k); }
          } finally { cu.close(); }
        }
      } catch (Throwable e) { }
      boolean pdf = name.toLowerCase().endsWith(".pdf") || "application/pdf".equals(getContentResolver().getType(u));
      try {
        if (pdf) readPdfBook(id, name, u); else sendBookFile(id, name, u);
      } catch (Throwable e) { js("window.bookFail(" + q(id) + "," + q("Could not read " + name) + ")"); }
    }});
  }

  // Lets the page turn a PDF into page pictures using Android's own PDF renderer.
  public class Pdf {
    @JavascriptInterface public synchronized int open(String b64) {
      try {
        close();
        File f = new File(getCacheDir(), "in.pdf");
        FileOutputStream o = new FileOutputStream(f);
        o.write(Base64.decode(b64, Base64.DEFAULT));
        o.close();
        pfd = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
        pr = new PdfRenderer(pfd);
        return pr.getPageCount();
      } catch (Exception e) { return -1; }
    }
    @JavascriptInterface public synchronized String page(int i) {
      try {
        PdfRenderer.Page p = pr.openPage(i);
        float s = 1400f / p.getWidth();
        if (p.getHeight() * s > 3000f) s = 3000f / p.getHeight();   // keep very tall pages from using too much memory
        int W = Math.max(1, Math.round(p.getWidth() * s));
        int H = Math.max(1, Math.round(p.getHeight() * s));
        Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        b.eraseColor(Color.WHITE);
        Matrix m = new Matrix();
        m.postScale(s, s);
        p.render(b, null, m, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        p.close();
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG, 80, o);
        b.recycle();
        return Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
      } catch (Throwable e) { return ""; }
    }
    @JavascriptInterface public String paste() {
      final String[] r = { "" };
      final java.util.concurrent.CountDownLatch l = new java.util.concurrent.CountDownLatch(1);
      runOnUiThread(new Runnable() {
        @Override public void run() {
          try {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData d = cm.getPrimaryClip();
            if (d != null && d.getItemCount() > 0) {
              CharSequence t = d.getItemAt(0).coerceToText(MainActivity.this);
              if (t != null) r[0] = t.toString();
            }
          } catch (Throwable e) { }
          l.countDown();
        }
      });
      try { l.await(2, java.util.concurrent.TimeUnit.SECONDS); } catch (InterruptedException e) { }
      return r[0];
    }
    @JavascriptInterface public void copy(final String s) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          try {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("answers", s));
          } catch (Throwable e) { }
        }
      });
    }
    // Offline mode: read the text in a photo on the phone, answer comes back through window.ocrDone
    @JavascriptInterface public void ocr(final String id, final String b64) {
      qEx.execute(new Runnable() { @Override public void run() {
        String t = "";
        try {
          Bitmap b = decodeScaled(Base64.decode(b64, Base64.DEFAULT), 2000);
          if (b != null) { t = ocrBitmap(b); b.recycle(); }
        } catch (Throwable e) { }
        js("window.ocrDone(" + q(id) + "," + q(t) + ")");
      }});
    }
    // Offline mode: pick a book (PDF, Word, text) with the phone's own file picker
    @JavascriptInterface public void pickBook() {
      runOnUiThread(new Runnable() { @Override public void run() {
        try {
          Intent i = new Intent(Intent.ACTION_GET_CONTENT);
          i.addCategory(Intent.CATEGORY_OPENABLE);
          i.setType("*/*");
          i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{ "application/pdf", "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.oasis.opendocument.text" });
          i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
          startActivityForResult(Intent.createChooser(i, "Add a book"), 3);
        } catch (Exception e) { }
      }});
    }
    @JavascriptInterface public void cancelBook(String id) { cancelled.add(id); }   // pause: what was read is kept
    @JavascriptInterface public void resumeBook(final String id, final int start) {
      cancelled.remove(id);
      bEx.execute(new Runnable() { @Override public void run() {
        try { readPages(id, "book", Math.max(0, start)); }
        catch (Throwable e) { js("window.bookFail(" + q(id) + "," + q("Could not continue reading the book.") + ")"); }
      }});
    }
    @JavascriptInterface public void dropBook(String id) { // the book was removed: delete its saved copy
      try { bookFile(id).delete(); } catch (Throwable e) { }
    }
    // A page of a saved book as a picture (offline mode shows the figure's page); page numbers start at 1
    @JavascriptInterface public synchronized String bookPage(String id, int page) {
      try {
        if (bpr == null || !id.equals(bpId)) {
          closeBookPage();
          File f = bookFile(id);
          if (!f.exists()) return "";
          bfd = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
          bpr = new PdfRenderer(bfd); bpId = id;
        }
        int i = page - 1;
        if (i < 0 || i >= bpr.getPageCount()) return "";
        PdfRenderer.Page p = bpr.openPage(i);
        try {
          float s = 1000f / p.getWidth();
          if (p.getHeight() * s > 1800f) s = 1800f / p.getHeight();
          Bitmap b = Bitmap.createBitmap(Math.max(1, Math.round(p.getWidth() * s)), Math.max(1, Math.round(p.getHeight() * s)), Bitmap.Config.ARGB_8888);
          b.eraseColor(Color.WHITE);
          Matrix m = new Matrix();
          m.postScale(s, s);
          p.render(b, null, m, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
          ByteArrayOutputStream o = new ByteArrayOutputStream();
          b.compress(Bitmap.CompressFormat.JPEG, 78, o);
          b.recycle();
          return Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
        } finally { p.close(); }
      } catch (Throwable e) { return ""; }
    }
    // The page is working (answers / a Word book): keep the app running and show a small "working" note
    @JavascriptInterface public void keepAlive(final boolean on, final String text) {
      runOnUiThread(new Runnable() { @Override public void run() {
        jsWork = on;
        if (text != null && on) workText = text;
        if (on) askOnce();
        workChanged();
      }});
    }
    @JavascriptInterface public void notifyDone(final String text) {   // a "ready" note, only when the app is not on screen
      runOnUiThread(new Runnable() { @Override public void run() { if (!fg) KeepAliveService.done(MainActivity.this, text); } });
    }
    @JavascriptInterface public synchronized void close() {
      try { if (pr != null) pr.close(); if (pfd != null) pfd.close(); } catch (Exception e) { }
      pr = null; pfd = null;
    }
  }

  synchronized void closeBookPage() {
    try { if (bpr != null) bpr.close(); if (bfd != null) bfd.close(); } catch (Throwable e) { }
    bpr = null; bfd = null; bpId = null;
  }
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    w = new WebView(this); w.setBackgroundColor(Color.BLACK); setContentView(w);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
    s.setAllowUniversalAccessFromFileURLs(true); // lets the local page call the AI APIs
    w.addJavascriptInterface(new Pdf(), "Android");
    w.setWebViewClient(new WebViewClient());
    w.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> c, FileChooserParams p) {
        if (cb != null) cb.onReceiveValue(null);
        cb = c;
        try {
          if (p.isCaptureEnabled()) { // "Camera" button
            cam = Uri.parse("content://com.quickans.cam/p" + System.currentTimeMillis() + ".jpg");
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, cam);
            i.setClipData(ClipData.newRawUri("", cam));
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, 2);
          } else {                    // "Photos / files" button: photos, PDF, Word, text; many at once
            String[] mt = new String[]{
              "image/*", "application/pdf", "text/plain", "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.oasis.opendocument.text"};
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);   // the system file picker always allows ticking many files
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_MIME_TYPES, mt);
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            startActivityForResult(i, 1);
          }
        } catch (Exception e) { cb = null; return false; }
        return true;
      }
    });
    w.loadUrl("file:///android_asset/index.html");
  }
  @Override protected void onActivityResult(int r, int c, Intent d) {
    if (r == 3) { // a book was picked
      if (c == RESULT_OK && d != null) {
        ArrayList<Uri> us = new ArrayList<Uri>();
        if (d.getClipData() != null) {
          for (int k = 0; k < d.getClipData().getItemCount(); k++) us.add(d.getClipData().getItemAt(k).getUri());
        } else if (d.getData() != null) us.add(d.getData());
        for (Uri u : us) addBook(u);
      }
      return;
    }
    if (cb == null) return;
    if (r == 2) cb.onReceiveValue(c == RESULT_OK ? new Uri[]{cam} : null);
    else {
      Uri[] out = null;
      if (c == RESULT_OK && d != null) {
        ArrayList<Uri> us = new ArrayList<Uri>();
        if (d.getClipData() != null) {
          for (int k = 0; k < d.getClipData().getItemCount(); k++) us.add(d.getClipData().getItemAt(k).getUri());
        } else if (d.getData() != null) us.add(d.getData());
        for (Uri u : us) { try { getContentResolver().takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Throwable e) { } }
        if (!us.isEmpty()) out = us.toArray(new Uri[0]);
      }
      cb.onReceiveValue(out);
    }
    cb = null;
  }
  @Override protected void onResume() { super.onResume(); fg = true; KeepAliveService.clearDone(this); }
  @Override protected void onPause() { fg = false; super.onPause(); }
  // Back keeps the work going in the background instead of closing the page while something is being read or answered
  @Override public void onBackPressed() {
    if (jsWork || bookJobs > 0) moveTaskToBack(true); else super.onBackPressed();
  }
  @Override protected void onDestroy() {
    try { if (pr != null) pr.close(); if (pfd != null) pfd.close(); } catch (Exception e) { }
    closeBookPage();
    if (!(jsWork || bookJobs > 0)) KeepAliveService.stop(this);
    super.onDestroy();
  }
}
