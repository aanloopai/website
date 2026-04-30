# LinkedIn Cookie Refresh Runbook

> LinkedIn'in resmi Marketing Developer Platform onayı haftalar sürer ve garantisi yok. Bu yüzden Phase 1'de **cookie auth** kullanıyoruz. Cookie 60-90 günde expire olur ve workflow patlar.
>
> Bu runbook'u **aylık** uygula veya Telegram'dan "LinkedIn 403" hatası geldiğinde.

---

## Ne zaman yenile?

- Aylık scheduled reminder Telegram'dan gelir
- VEYA workflow LinkedIn POST'unda 401/403 dönerse — anında

---

## Adımlar (3 dakika)

### 1. Tarayıcıdan cookie'leri al

1. **Chrome veya Firefox** ile `https://www.linkedin.com/` aç
2. **Logged in** olduğundan emin ol — kişisel hesabın
3. F12 → **Application** sekmesi (Firefox: **Storage**)
4. Sol panel: **Cookies** → `https://www.linkedin.com`
5. Listede **2 cookie** ara ve **Value** sütununu kopyala:
   - `li_at` — değer formatı: `AQEDA...` (200+ karakter, synthetic örnek)
   - `JSESSIONID` — değer formatı: `"ajax:1234567890"` (tırnak işaretleri DAHIL, synthetic örnek)

### 2. n8n credentials güncelle

#### A. n8n env var olarak (önerilen)

n8n sunucusuna SSH:

```bash
nano /home/node/.n8n/.env

# Şu satırları güncelle:
LINKEDIN_LI_AT=<yeni-li_at-değeri>
LINKEDIN_JSESSIONID="ajax:..."

# Kaydet, çık. n8n'i restart:
docker compose restart n8n
# veya systemd: sudo systemctl restart n8n
```

#### B. n8n UI üzerinden (alternatif)

1. n8n UI → **Credentials** → `LinkedIn Cookie Aanloop`
2. **Cookie value** alanını yeni değerlerle güncelle:
   ```
   li_at=<yeni-değer>; JSESSIONID="ajax:..."
   ```
3. **Save**

### 3. Test et

1. n8n'de `Aanloop Social Master` workflow'u aç
2. Manual execute yap
3. **Post LinkedIn** node'unda success/error gör
4. ✅ 201 Created → cookie taze
5. ❌ 401/403 → cookie hatalı veya hesap challenge istiyor (LinkedIn'i tarayıcıdan aç, captcha varsa çöz, sonra yeniden cookie kopyala)

### 4. Telegram'dan onay yolla

```
/cookie_refreshed linkedin
```

Bu, workflow'da kayıt tutar (sonraki yenileme zamanı için).

---

## Sorun çıkarsa

| Hata | Olası sebep | Çözüm |
|---|---|---|
| 401 unauthorized | Cookie expire | Adım 1-2 tekrar |
| 403 challenge_required | LinkedIn şüpheli aktivite tespit etti | Tarayıcıdan login → captcha → cookie tekrar |
| 422 unprocessable | Company URN yanlış | `LINKEDIN_COMPANY_PAGE_ID` kontrol et |
| 429 rate limit | Çok hızlı post | 1 saat bekle, retry |
| Network timeout | LinkedIn API yavaş | Cron bir sonraki tetiklemede deneyecek |

---

## Phase 2 — Marketing API'ye geçiş

Marketing Developer Platform onayı geldiğinde (haftalar sonra):

1. Resmi OAuth2 credentials oluştur: `LINKEDIN_OAUTH_CLIENT_ID`, `LINKEDIN_OAUTH_CLIENT_SECRET`, `LINKEDIN_OAUTH_REFRESH_TOKEN`
2. n8n `Post LinkedIn` node'unu OAuth2'ye çevir (HTTP Cookie credential yerine)
3. Cookie credential'ları sil — artık gerek yok
4. Bu runbook arşivle

---

## Otomasyon (Phase 3+)

Cookie expire detect → Telegram alert → kullanıcıya runbook link'i otomatik gönder:

```
🍪 LinkedIn cookie expired (last refresh: 2026-04-01, today: 2026-06-15).

Refresh now: aanloopai.nl/runbooks/cookie-refresh

After refresh, reply: /cookie_refreshed linkedin
```
