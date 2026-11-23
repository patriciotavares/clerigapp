package br.casa.sonsmagicos;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Sons Mágicos para Android TV.
 *
 * O app inteiro é a página web que vai dentro do APK (assets). Esta Activity:
 *  - mostra a página em tela cheia;
 *  - repassa o botão Voltar do controle para a página;
 *  - procura sozinha o servidor da casa (porta 8080) na rede Wi-Fi/cabo.
 */
public class MainActivity extends Activity {

    private static final int PORTA = 8080;
    private WebView web;
    private SharedPreferences prefs;
    private final AtomicReference<String> servidor = new AtomicReference<>("");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        prefs = getSharedPreferences("sons-magicos", MODE_PRIVATE);
        servidor.set(prefs.getString("servidor", ""));

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(143, 211, 255));
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Ponte(), "AndroidTV");
        setContentView(web);
        esconderBarras();

        web.loadUrl("file:///android_asset/index.html");
        web.requestFocus();

        procurarServidor();
    }

    /** Funções que a página pode chamar (window.AndroidTV). */
    private class Ponte {
        @JavascriptInterface
        public String servidor() { return servidor.get(); }

        @JavascriptInterface
        public void sair() { runOnUiThread(new Runnable() { public void run() { finish(); } }); }
    }

    // ---------------- Botão Voltar ----------------
    @Override
    public boolean dispatchKeyEvent(KeyEvent ev) {
        int k = ev.getKeyCode();
        if (k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_ESCAPE) {
            if (ev.getAction() == KeyEvent.ACTION_UP) {
                web.evaluateJavascript("(window.voltar && window.voltar()) ? 'sim' : 'nao'", new ValueCallback<String>() {
                    @Override public void onReceiveValue(String v) {
                        if (v == null || !v.contains("sim")) finish();
                    }
                });
            }
            return true;
        }
        return super.dispatchKeyEvent(ev);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) esconderBarras();
    }

    @SuppressWarnings("deprecation")
    private void esconderBarras() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.SonsMagicos && window.SonsMagicos.pausar && window.SonsMagicos.pausar()", null);
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    // ---------------- Descoberta do servidor ----------------
    private void procurarServidor() {
        new Thread(new Runnable() {
            @Override public void run() {
                String salvo = servidor.get();
                if (salvo.length() > 0 && responde(salvo, 1500)) { avisarPagina(); return; }

                String meuIp = ipLocal();
                if (meuIp == null) return;
                final String prefixo = meuIp.substring(0, meuIp.lastIndexOf('.') + 1);
                ExecutorService pool = Executors.newFixedThreadPool(32);
                final AtomicReference<String> achado = new AtomicReference<>(null);
                for (int i = 1; i <= 254; i++) {
                    final String url = "http://" + prefixo + i + ":" + PORTA;
                    pool.execute(new Runnable() {
                        @Override public void run() {
                            if (achado.get() != null) return;
                            if (responde(url, 700)) achado.compareAndSet(null, url);
                        }
                    });
                }
                pool.shutdown();
                try { pool.awaitTermination(30, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
                String url = achado.get();
                if (url != null) {
                    servidor.set(url);
                    prefs.edit().putString("servidor", url).apply();
                    avisarPagina();
                }
            }
        }).start();
    }

    private void avisarPagina() {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                web.evaluateJavascript("window.SonsMagicos && window.SonsMagicos.reconectar && window.SonsMagicos.reconectar()", null);
            }
        });
    }

    private static boolean responde(String base, int timeoutMs) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(base + "/api/ping").openConnection();
            c.setConnectTimeout(timeoutMs);
            c.setReadTimeout(timeoutMs);
            if (c.getResponseCode() != 200) return false;
            InputStream in = c.getInputStream();
            byte[] buf = new byte[512];
            int n = in.read(buf);
            in.close();
            return n > 0 && new String(buf, 0, n, "UTF-8").contains("sons-magicos");
        } catch (Exception e) {
            return false;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static String ipLocal() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && !a.isLoopbackAddress() && a.isSiteLocalAddress()) {
                        return a.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) { }
        return null;
    }
}
