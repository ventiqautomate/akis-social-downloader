# Akış

Vercel'e hazır sosyal medya medya indirme arayüzü. X/Twitter, Instagram, Facebook, TikTok ve YouTube, kendi Cobalt v11 sunucunuz üzerinden desteklenir. Threads bağlantıları arayüzde tanınır; gerçek indirme desteği bağladığınız motorun güncel desteğine bağlıdır.

## Yerelde çalıştırma

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local` içindeki `COBALT_API_URL` değerini kendi Cobalt v11 sunucunuza yönlendirin. Sunucu API anahtarı kullanıyorsa `COBALT_API_KEY` değerini de ekleyin.

## Vercel'e deploy

1. Bu klasörü GitHub deposuna yükleyin.
2. Vercel'de **Add New > Project** ile depoyu seçin.
3. Project Settings > Environment Variables bölümüne `COBALT_API_URL` ve gerekiyorsa `COBALT_API_KEY` ekleyin.
4. Deploy edin.

Vercel yalnızca web uygulamasını çalıştırır. Cobalt; ffmpeg ve uzun süren medya işlemleri kullandığı için ayrı bir Docker sunucusunda çalışmalıdır. Resmî kurulum: https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md

## Önemli sınırlar

- Yalnızca herkese açık içerikler işlenir; özel/giriş gerektiren içerikler desteklenmez.
- Platformlar yapılarını sık değiştirdiği için destek zamanla değişebilir.
- Telif hakkı ve platform kullanım koşullarına uyma sorumluluğu kullanıcıya aittir.
- Cobalt'ın genel `api.cobalt.tools` adresini izinsiz kullanmayın; kendi instance'ınızı kurun veya izinli bir sağlayıcı kullanın.
