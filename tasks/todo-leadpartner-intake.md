# Leadpartner-intake (Cy FlexService, uitzendbranche) — todo

> Görev dosyası: `Desktop/aanloopai-portal-leadpartner-intake.md` (16 Eyl 2026).
> Bu dosya `tasks/todo.md` yerine ayrı tutuldu — `tasks/todo.md` başka bir iş (social automation) içeriyor.
> Durum: **P1 uygulandı, PR açık, merge EDİLMEDİ.** Prod'da hiçbir şey çalıştırılmadı (bkz. `tasks/go-live.md`).

## 0. Keşif (koddan doğrulandı, 16 Eyl 2026)

| Madde | Dosya | Bulgu |
|---|---|---|
| Şemalar nerede, tek kaynak mı? | `src/data/intake-schemas.ts` (`INTAKE_SCHEMAS`, `getIntakeSchema`) | Tek kaynak. `intake.astro` tüm katalog ürünleri için `window.__SCHEMAS` olarak gömüyor; `admin/aanvragen.astro`, `dienst-config.astro`, `onboarding.js`, `provisioners/voice.js` aynı fonksiyonu kullanıyor. Bilinmeyen key → `GENERIC`. |
| Server şemayla validasyon yapıyor mu? | `src/lib/portal-routes.js` `saveOrder` / `submitOrder` | **Hayır.** `intake_json` ham JSON olarak saklanıyor; zorunlu alan / tip kontrolü yalnız client'ta (`missingRequiredFields`). Post-pay onboarding (`onboarding.js`) şemayı okuyor ama bu wizard'la ilgisi yok. → Server-side validasyon eklenmedi (mevcut 8 şemaya dokunmama kuralı; sonraki fikirler'e yazıldı). |
| DB ve tablolar | `wrangler.toml` `[[d1_databases]] PORTAL_DB` (`aanloop-portal`); `migrations/0001…0019` | Cloudflare **D1**. `customers` (bedrijf, kvk, adres, factuur_email…), `users` (customer_id, email, naam, role: eigenaar/bewerker/kijker/staff), `service_orders` (id, customer_id, user_id, product_key, tier, intake_json, status concept→ingediend→in_uitvoering→actief/geannuleerd, submitted_at), `magic_links`, `team_invites`, `services`, `inbound_leads`. Supabase yok. |
| Leads-aanmelden formu DB'ye yazıyor mu? | `src/worker.js` ~L712 (`INSERT INTO inbound_leads`), L792 (`formType === 'leads'`) | **Evet**: D1 `inbound_leads` (form_type=leads, fields_json) + Brevo bildirim + autoresponse + Telegram (`notifyTelegram`). Admin'de `/admin/aanvragen` listeliyor. Portal customer/order OLUŞTURMUYOR. |
| Admin: müşteri + kullanıcı + concept order + davet | `src/lib/admin-routes.js` `createCustomer` (POST /api/admin/customer), `createUser`; UI `src/pages/admin/klanten.astro`, `klant.astro` | Müşteri + eigenaar user UI'dan oluşturuluyor (otomatik "Welkom" maili gider, BREVO yoksa sessiz atlanır). **Concept order oluşturma / intake daveti YOKTU** — order sadece müşteri tarafından `/portal/ontdekken` → `POST /api/portal/orders` ile açılıyordu. `team_invites` = takım daveti (portal içi), intake daveti değil. → Eklendi: `POST /api/admin/intake-invite` + `klant.astro` "Intake-uitnodiging" bloğu. |
| `/portal/ontdekken` kataloğu, gizleme | `src/data/portal-catalog.ts` `PORTAL_CATALOG` (statik, koddan yönetiliyor) | Katalog statik dizi. Gizleme yoktu → `verborgen?: boolean` eklendi; `ontdekken.astro` filtreliyor, `createOrder` reddediyor (aynı "Onbekend product" mesajı). Şema/isim/tier-meta gömme `PORTAL_CATALOG` üzerinden olduğu için ürün katalogda kalmalı (gizli). |
| Submit sonrası bildirim | `portal-routes.js` `submitOrder` → `notifyAanloop` (Brevo → hello@aanloopai.nl, "[Portaal] Nieuwe aanvraag — intake compleet") | Sadece **mail** vardı; Telegram yoktu (owner kararı 2026-09-10 "her inbound → Telegram" bu yola uygulanmamıştı). → `notifyTelegram` eklendi (tüm ürünler; leadpartner için branche/werkgebied/volume özeti, iletişim verisi YOK). |
| Login `?next=` desteği | `login.astro`, `verify.astro`, `handleAuthRequest`, `handleAuthVerify`, `PortalLayout.astro` | **Yoktu.** Verify sonrası her zaman `/portal/` (staff → `/admin/`). → Eklendi (aşağıda). Bilinmeyen e-posta davranışı DEĞİŞMEDİ: `handleAuthRequest` her durumda aynı 200 döner, mail sadece kayıtlı kullanıcıya gider (enumeration koruması). |
| Rol `kijker` | `PortalLayout.astro` L78 (`[data-write]` gizle), `canWrite()` server | Wizard'da `iw-next` `data-write` DEĞİL — kijker adımları gezebilir, ama PATCH/submit server'da 403. Değiştirilmedi (adım gezintisini kilitlemek okumayı da kilitler). |

## 1. Uygulanan (P1) — dosya listesi

- `src/data/intake-schemas.ts` — tipler: `consent`, `info`, `text`, `labelHtml`, `showIf`; `LEADPARTNER` (10 adım, §4 JSON birebir); `INTAKE_SCHEMAS.leadpartner`.
- `src/data/portal-catalog.ts` — `verborgen?`; ürün `leadpartner` / tier `Exclusief` / `betaling: 'aanvraag'` / `prijsCent: null`.
- `src/lib/portal-intake-fields.js` — `safeLabelHtml` (yalnız relatif `<a>`), `isFieldVisible`, `wireShowIf`; `fieldHtml` info/consent; `collectStepValues` (info atla, consent boolean); `missingRequiredFields` (consent `true` şart, info hiç, showIf-gizli hariç). Mevcut tiplerin çıktısı bit-bit aynı (regresyon testi).
- `src/pages/portal/intake.astro` — her alan `<div id="fw_<name>">`, `wireShowIf`, özet: info yok / consent "Ja"/"—"; 401 → `/portal/login?next=<bu sayfa>`.
- `src/pages/portal/ontdekken.astro` — `verborgen` filtre.
- `src/lib/auth.js` — `safeNextPath()` (yalnız `/portal/…`; `//`, `\`, `:`, kontrol karakteri, `..` red).
- `src/lib/portal-routes.js` — `createOrder` verborgen red; `handleAuthRequest` `body.next` → mail linkine `&next=`; `handleAuthVerify` form `next` → `redirect` (staff daima `/admin/`); `submitOrder` Telegram; `formatOrderSubmitTelegram`.
- `src/pages/portal/login.astro`, `verify.astro`, `src/layouts/PortalLayout.astro` — `next` taşıma (layout: yalnız `/portal/intake` yolunda).
- `src/lib/admin-routes.js` — `POST /api/admin/intake-invite` {customer_id, product_key, tier, send_mail?} → eigenaar'a concept order (mevcut concept varsa yeniden kullanır) + mail (konu/gövde görev dosyasındaki metin) + `link`.
- `src/pages/admin/klant.astro` — "Intake-uitnodiging" bloğu (yalnız `verborgen` ürünler).
- `src/pages/admin/aanvragen.astro` — `?order=<id>` deeplink intake'i açar; info atla, consent Ja/Nee.
- `test/leadpartner-intake.test.js` — 40 test (şema, renderer, safeNextPath, magic-link next, verborgen, intake-invite, Telegram).
- `tasks/go-live.md` — prod adımları (ÇALIŞTIRILMADI).

## 2. Kabul kriterleri — durum

- [x] Keşif tablosu (yukarıda). **M onayı bekleniyor** — uygulama PR'da, merge edilmedi.
- [x] `leadpartner` + şema 10 adım, zorunlu alan uyarıları (vitest + Playwright, aşağıda).
- [x] `consent` / `info` çalışıyor; 354 mevcut test + 40 yeni = 394 yeşil.
- [x] Concept kaydet / geri yükle / submit — lokal wrangler dev + Playwright kanıtı (PR açıklamasında).
- [x] Submit bildirimi: mail (mevcut) + Telegram (yeni) — test ortamında fetch-stub ile; canlı Telegram secret'ları deploy.yml'de zaten var.
- [x] `tasks/go-live.md` hazır, çalıştırılmadı.
- [x] `?next=` login → magic link → intake; dış URL reddediliyor (16 vaka).
- [ ] P2 Google/Microsoft — **uygulanmadı** (M onayı); owner adımları go-live.md'de.
- [x] PR açık, merge edilmedi.

## 3. P2 / P2b / P3 — uygulanmadı, M kararı

- **P2 SSO (Google/Microsoft)**: ayrı PR. Kod tarafı: `/api/auth/oauth/{google,microsoft}/{start,callback}`, PKCE+state+nonce, `email_verified` şartı, sadece mevcut `users.email` eşleşmesi, `?error=geen-account`. Owner adımları → `tasks/go-live.md` §P2.
- **P2b site tutarlılığı**: `src/data/lead-sectors.ts`'ye `uitzendbureaus` (in-opbouw) + `/leads-kopen/uitzendbureaus/`; `test/leads-kopen.test.js` sitemap/llms guard'ları otomatik kapsar. Aanmelden formu → otomatik concept order + davet: **sadece öneri** (form `inbound_leads`'e yazıyor; `intake-invite` endpoint'i çağrılabilir ama müşteri/eigenaar kaydı önce gerekir — onaysız hesap açma yok).
- **P3**: "Mijn leads" portal sayfası; intake → partnerprofiel (KIB `/api/partners` modeli); branş bazlı şema modülleri.

## Sonraki fikirler (uygulanmadı)

- Server-side intake validasyonu: `submitOrder`'da `missingRequiredFields` (görünürlük dahil) — API üzerinden consent atlanamasın. Mevcut concept order'lar için kırılma riski → önce M kararı.
- `kijker` için wizard'ı gerçekten salt-okunur yapmak (inputlar `disabled`, `iw-next` gizli) — server zaten 403.
- `createCustomer` "Welkom" mailini opsiyonel yapmak (`send_mail:false`) — intake daveti ile iki mail gitmesin.
- Admin klant sayfasında concept order listesi + "link kopyala".
