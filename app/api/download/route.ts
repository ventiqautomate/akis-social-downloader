import { NextResponse } from "next/server";
import { detectPlatform, platformNames } from "@/lib/platforms";

export const runtime = "nodejs";
export const maxDuration = 30;

type RequestBody = {
  url?: unknown;
  mode?: unknown;
  quality?: unknown;
};

type SafeMedia = {
  type: "photo" | "video" | "gif";
  url: string;
  thumb?: string;
};

const qualities = new Set(["max", "2160", "1440", "1080", "720", "480", "360"]);

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function upstreamMessage(code: unknown) {
  if (typeof code !== "string") return "İçerik işlenemedi. Bağlantıyı kontrol edip tekrar deneyin.";
  if (code.includes("auth")) return "İndirme servisi kimlik doğrulaması başarısız.";
  if (code.includes("rate")) return "Çok fazla istek gönderildi. Biraz bekleyip tekrar deneyin.";
  if (code.includes("unsupported")) return "Bu bağlantı veya içerik türü henüz desteklenmiyor.";
  if (code.includes("private") || code.includes("login")) return "Gizli veya giriş gerektiren içerikler indirilemez.";
  return "Bu içerik şu anda işlenemedi. Bağlantının herkese açık olduğundan emin olun.";
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!sourceUrl || sourceUrl.length > 2048) {
    return NextResponse.json({ error: "Geçerli bir gönderi bağlantısı girin." }, { status: 400 });
  }

  const platform = detectPlatform(sourceUrl);
  if (!platform) {
    return NextResponse.json(
      { error: "Bu bağlantı desteklenen platformlardan birine ait değil." },
      { status: 400 },
    );
  }

  const apiUrl = process.env.COBALT_API_URL?.trim();
  if (!apiUrl) {
    return NextResponse.json(
      {
        error: "İndirme motoru henüz bağlanmamış. Vercel'de COBALT_API_URL değişkenini ekleyin.",
        code: "SETUP_REQUIRED",
      },
      { status: 503 },
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
    if (!['https:', 'http:'].includes(endpoint.protocol)) throw new Error("invalid protocol");
  } catch {
    return NextResponse.json({ error: "İndirme motoru adresi hatalı yapılandırılmış." }, { status: 500 });
  }

  const mode = body.mode === "audio" ? "audio" : "auto";
  const quality = typeof body.quality === "string" && qualities.has(body.quality) ? body.quality : "1080";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Akis/1.0",
    };
    const apiKey = process.env.COBALT_API_KEY?.trim();
    if (apiKey) headers.Authorization = `Api-Key ${apiKey}`;

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: sourceUrl,
        downloadMode: mode,
        videoQuality: quality,
        audioFormat: "mp3",
        audioBitrate: "128",
        filenameStyle: "pretty",
        youtubeVideoContainer: "mp4",
        youtubeVideoCodec: "h264",
        convertGif: true,
        alwaysProxy: true,
        localProcessing: "disabled",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
    if (!upstream.ok || !data) {
      return NextResponse.json(
        { error: upstream.status === 429 ? "İstek sınırına ulaşıldı. Biraz sonra tekrar deneyin." : "İndirme servisine ulaşılamadı." },
        { status: upstream.status === 429 ? 429 : 502 },
      );
    }

    if (data.status === "error") {
      const error = data.error as Record<string, unknown> | undefined;
      return NextResponse.json({ error: upstreamMessage(error?.code), code: error?.code }, { status: 422 });
    }

    if (data.status === "redirect" || data.status === "tunnel") {
      const url = safeHttpUrl(data.url);
      if (!url) throw new Error("unsafe upstream url");
      return NextResponse.json({
        status: "ready",
        platform: platformNames[platform],
        url,
        filename: typeof data.filename === "string" ? data.filename : "media",
      });
    }

    if (data.status === "picker" && Array.isArray(data.picker)) {
      const items = data.picker.flatMap((item): SafeMedia[] => {
        if (!item || typeof item !== "object") return [];
        const candidate = item as Record<string, unknown>;
        const url = safeHttpUrl(candidate.url);
        const type = candidate.type;
        if (!url || (type !== "photo" && type !== "video" && type !== "gif")) return [];
        const thumb = safeHttpUrl(candidate.thumb);
        return [{ type, url, ...(thumb ? { thumb } : {}) }];
      });
      const audio = safeHttpUrl(data.audio);
      if (!items.length && !audio) throw new Error("empty picker");
      return NextResponse.json({
        status: "picker",
        platform: platformNames[platform],
        items,
        ...(audio ? { audio, audioFilename: data.audioFilename || "audio.mp3" } : {}),
      });
    }

    if (data.status === "local-processing") {
      return NextResponse.json(
        { error: "Bu içerik ek işlem gerektiriyor. İndirme motorunda sunucu işlemeyi etkinleştirin." },
        { status: 422 },
      );
    }

    throw new Error("unknown upstream response");
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "İşlem zaman aşımına uğradı. Tekrar deneyin." : "İndirme servisi beklenmeyen bir yanıt verdi." },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
