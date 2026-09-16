# Go-live — Leadpartner-intake (Cy FlexService)

> **Durum: HİÇBİRİ ÇALIŞTIRILMADI.** Her adım M'in açık onayıyla, sırayla. Prod D1'e yazma / e-posta gönderme = ayrı "evet".
> Ön koşul: PR merge + `deploy.yml` yeşil + canlıda `/portal/ontdekken`'da leadpartner kartı YOK (gizlilik doğrulaması).

## A. Prod'da müşteri + eigenaar (mevcut admin UI)

1. `https://aanloopai.nl/admin/klanten` → "Nieuwe klant": Bedrijf `Cy FlexService`, Eigenaar e-mail = **M verir (dosyaya yazılmadı)**, naam = contactpersoon.
   - **"Welkomstmail sturen" kutusunu UITVINK** (→ `send_mail:false`): bu akışta tek mail = intake-uitnodiging. Kutu işaretli kalırsa müşteri iki sistem maili alır.
   - E-posta zaten bir hesaba bağlıysa 409 → o müşteri kaydını kullan.
2. Kontrol: klant-sayfasında eigenaar görünüyor; rol `eigenaar` (kijker DEĞİL — kijker intake yazamaz).

## B. Concept order + davet (yeni admin bloğu)

3. `https://aanloopai.nl/admin/klant?id=<cust_id>` → "Intake-uitnodiging" → ürün `Leads kopen — partnerintake — Exclusief` → **Uitnodiging sturen**.
   - Endpoint: `POST /api/admin/intake-invite` `{customer_id, product_key:"leadpartner", tier:"Exclusief"}` (staff session şart).
   - Sonuç: concept `service_orders` satırı (user_id = eigenaar) + mail **"Uw intake voor leadpartnerschap staat klaar — Aanloop AI"** + ekranda link.
   - Aynı müşteri için mevcut concept varsa yeniden kullanılır (ikinci tık = aynı order, mail tekrar gider).
   - Mail başarısızsa mesaj "mail MISLUKT" + link → linki elle WhatsApp/mail ile gönder.
4. Link formatı: `https://aanloopai.nl/portal/login/?next=%2Fportal%2Fintake%2F%3Forder%3D<ord_id>`.
   Müşteri: e-postasını girer → magic link → tıklar → doğrudan intake (10 adım, otomatik concept kaydı).

## C. Submit sonrası

5. Bildirim: mail `hello@aanloopai.nl` "[Portaal] Nieuwe aanvraag — intake compleet" + **Telegram** (bedrijf, product, order, branche/werkgebied/volume, link `/admin/aanvragen?order=<id>`).
6. `https://aanloopai.nl/admin/aanvragen?order=<id>` → intake açık gelir. Status `ingediend` → gerekirse `in_uitvoering`. **`actief` yapma** — status→actief otomatik `services` satırı açar (`activateOrder`), leadpartner için provisioner yok; sadece yanlış bir dienst kaydı doğar.
7. Prijs per lead görüşmede; siteye/portala bedrag yazılmaz (guard `test/leads-kopen.test.js`, `leadpartner-intake.test.js`).

## D. Doğrulama (canlıda, prod-yazma YOK)

- `curl -s https://aanloopai.nl/portal/ontdekken/ | grep -c leadpartner` → `0`.
- `curl -s https://aanloopai.nl/portal/intake/ | grep -c '"leadpartner"'` → `≥1` (şema gömülü).
- Login `?next=https://evil.example/` ile → magic link mailinde `next=` YOK (server `safeNextPath`).

## P2 — Google / Microsoft login (AYRI PR, M onayından sonra) — owner adımları

Kod henüz yok. Yapılacak endpoint'ler: `/api/auth/oauth/google/start|callback`, `/api/auth/oauth/microsoft/start|callback` (Authorization Code + PKCE, `state`+`nonce`, scope `openid email profile`; giriş yalnız `users.email` eşleşmesiyle, aksi `?error=geen-account`; `next` = `safeNextPath`).

Owner (M) — kod PR'ından ÖNCE yapılabilir:
1. **Google Cloud Console** → proje (mevcut aanloopai projesi olur) → *APIs & Services → OAuth consent screen*: User type **External**, App name `Aanloop AI Klantportaal`, support e-mail hello@aanloopai.nl, Authorized domain `aanloopai.nl`, Privacy `https://aanloopai.nl/privacy/`. Publish (test modunda kalırsa sadece test kullanıcıları girebilir).
2. *Credentials → Create OAuth client ID → Web application*: Authorized redirect URIs
   `https://aanloopai.nl/api/auth/oauth/google/callback` (+ preview domain'i varsa ekle). → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. **Microsoft Entra** (entra.microsoft.com) → *App registrations → New*: name `Aanloop AI Klantportaal`, Supported account types **"Accounts in any organizational directory and personal Microsoft accounts"**, Redirect URI (Web) `https://aanloopai.nl/api/auth/oauth/microsoft/callback`. *Certificates & secrets → New client secret* (24 ay). → `MS_CLIENT_ID`, `MS_CLIENT_SECRET`. Token configuration: `email` optional claim ekle.
4. Secrets → GitHub repo secrets (deploy.yml `wrangler versions secret bulk` ile prod'a gider): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`. Değerler chat'e/repoya yazılmaz.
5. Kod PR'ı: login sayfasına iki buton; test = eşleşen e-posta girer / eşleşmeyen `geen-account` / bozuk `state` red / dış `next` yok sayılır.

## P2b — Site tutarlılığı (M onayı)

- `src/data/lead-sectors.ts`: `uitzendbureaus` ("🧑‍💼 uitzendbureaus & personeelsbemiddeling", Zakelijke dienstverlening, `in-opbouw`, "Zakelijk · per lead") → `/leads-kopen/uitzendbureaus/` + sitemap + llms.txt otomatik (guard test kapsar).
- Aanmelden-form (sector ≠ keukens) → otomatik concept order + davet: **öneri**; müşteri/eigenaar kaydı önce gerektiğinden onaysız hesap açmayla çakışır — M kararı.
