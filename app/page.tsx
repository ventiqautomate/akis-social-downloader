"use client";

import { FormEvent, useMemo, useState } from "react";
import { detectPlatform, platformNames } from "@/lib/platforms";

type PickerItem = { type: "photo" | "video" | "gif"; url: string; thumb?: string };
type Result =
  | { status: "ready"; platform: string; url: string; filename: string }
  | { status: "picker"; platform: string; items: PickerItem[]; audio?: string; audioFilename?: string };

const platforms = [
  { key: "x", label: "X", mark: "X" },
  { key: "instagram", label: "Instagram", mark: "◎" },
  { key: "facebook", label: "Facebook", mark: "f" },
  { key: "tiktok", label: "TikTok", mark: "♪" },
  { key: "youtube", label: "YouTube", mark: "▶" },
  { key: "threads", label: "Threads*", mark: "@" },
] as const;

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2h14v-2" />
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"auto" | "audio">("auto");
  const [quality, setQuality] = useState("1080");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const detected = useMemo(() => detectPlatform(url.trim()), [url]);

  async function pasteLink() {
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      setError("Panoya erişilemedi. Bağlantıyı elle yapıştırabilirsiniz.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!detected) {
      setError("Desteklenen bir platformdan geçerli gönderi bağlantısı yapıştırın.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode, quality }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
      setResult(data as Result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav" aria-label="Ana menü">
        <a className="brand" href="#top" aria-label="Akış ana sayfa">
          <span className="brand-mark"><DownloadIcon /></span>
          <span>AKIŞ</span>
        </a>
        <a className="nav-link" href="#nasil-calisir">Nasıl çalışır?</a>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> Bağlantıdan medyaya, tek adımda</div>
        <h1>Gördüğünü<br /><em>yanında götür.</em></h1>
        <p className="intro">Sosyal medyadaki herkese açık video ve fotoğrafları bağlantısını yapıştırarak indirin.</p>

        <div className="platforms" aria-label="Desteklenen platformlar">
          {platforms.map((item) => (
            <div className={`platform platform-${item.key}`} key={item.key} title={item.label}>
              <span>{item.mark}</span>{item.label}
            </div>
          ))}
        </div>
        <p className="platform-note">* Threads desteği bağlı indirme motorunun güncel sürümüne göre değişebilir.</p>

        <form className="download-card" onSubmit={submit}>
          <label htmlFor="post-url">Gönderi bağlantısı</label>
          <div className={`url-box ${detected ? "detected" : ""}`}>
            <span className="link-icon" aria-hidden="true">⌁</span>
            <input
              id="post-url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              aria-describedby="url-hint"
            />
            {detected && <span className="detected-label">{platformNames[detected]}</span>}
            <button type="button" className="paste" onClick={pasteLink}>Yapıştır</button>
          </div>

          <div className="options">
            <div className="segmented" aria-label="İndirme türü">
              <button type="button" className={mode === "auto" ? "active" : ""} onClick={() => setMode("auto")}>Video / Fotoğraf</button>
              <button type="button" className={mode === "audio" ? "active" : ""} onClick={() => setMode("audio")}>Sadece ses</button>
            </div>
            <label className="quality">
              <span>Kalite</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={mode === "audio"}>
                <option value="max">En yüksek</option>
                <option value="2160">4K</option>
                <option value="1440">2K</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
              </select>
            </label>
          </div>

          <button className="primary" disabled={loading} type="submit">
            {loading ? <span className="spinner" /> : <DownloadIcon />}
            {loading ? "İçerik hazırlanıyor..." : "İndirmeye hazırla"}
          </button>
          <p className="hint" id="url-hint">Yalnızca indirme hakkınız bulunan, herkese açık içerikleri kullanın.</p>

          {error && <div className="message error" role="alert"><span>!</span>{error}</div>}

          {result?.status === "ready" && (
            <div className="result" aria-live="polite">
              <div><span className="success-dot" /><strong>Dosyanız hazır</strong><small>{result.platform} · {result.filename}</small></div>
              <a className="result-button" href={result.url} download={result.filename} target="_blank" rel="noopener noreferrer">İndir</a>
            </div>
          )}

          {result?.status === "picker" && (
            <div className="picker" aria-live="polite">
              <div className="picker-heading"><strong>{result.items.length} medya bulundu</strong><span>İndirmek istediklerinizi seçin</span></div>
              <div className="picker-grid">
                {result.items.map((item, index) => (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" download key={`${item.url}-${index}`}>
                    {item.thumb ? <img src={item.thumb} alt={`${index + 1}. medya önizlemesi`} /> : <div className="media-placeholder">{item.type === "photo" ? "FOTO" : "VİDEO"}</div>}
                    <span><DownloadIcon /> {index + 1}. medyayı indir</span>
                  </a>
                ))}
              </div>
              {result.audio && <a className="audio-result" href={result.audio} target="_blank" rel="noopener noreferrer" download={result.audioFilename}>♪ Arka plan sesini indir</a>}
            </div>
          )}
        </form>
      </section>

      <section className="steps" id="nasil-calisir">
        <p className="section-kicker">Üç küçük adım</p>
        <div className="step-grid">
          <article><span>01</span><h2>Bağlantıyı kopyala</h2><p>Gönderinin paylaş menüsünden bağlantıyı alın.</p></article>
          <article><span>02</span><h2>Buraya yapıştır</h2><p>Formatı ve istediğiniz görüntü kalitesini seçin.</p></article>
          <article><span>03</span><h2>Cihazına indir</h2><p>Hazırlanan dosyayı tek dokunuşla kaydedin.</p></article>
        </div>
      </section>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><DownloadIcon /></span><span>AKIŞ</span></a><p>İçerik sahiplerinin haklarına ve platform kurallarına saygı gösterin.</p><span>© 2026</span></footer>
    </main>
  );
}
