# Google sign-in setup (PharmaLab)

Gawin ito gamit ang **w3lixir@gmail.com**. Mga 15 minuto. Walang mababago sa live site hangga't hindi pa naka-push ang bagong website.

## A. Google Cloud Console — gumawa ng OAuth client

1. Buksan ang https://console.cloud.google.com/ at mag-login (w3lixir@gmail.com).
2. Sa itaas, **Select a project → New Project** → pangalan: `PharmaLab` → **Create**. Siguraduhing naka-select ito.
3. Menu → **APIs & Services → OAuth consent screen** (o **Google Auth Platform → Branding**):
   - App name: `PharmaLab`
   - User support email: w3lixir@gmail.com
   - Audience / User type: **External**
   - Developer contact: w3lixir@gmail.com → **Save**
   - Sa **Audience**, pindutin ang **Publish app** (para makapag-login ang lahat ng OLFU account, hindi lang test users).
4. Menu → **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `PharmaLab Supabase`
   - **Authorized JavaScript origins:**
     - `https://olfupharmalab.vercel.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `https://ygznqaqyrhhpeuibdsqe.supabase.co/auth/v1/callback`
   - **Create** → kopyahin ang **Client ID** at **Client secret** (huwag i-send sa chat).

## B. Supabase — i-enable ang Google

1. https://supabase.com/dashboard/project/ygznqaqyrhhpeuibdsqe (w3lixir@gmail.com)
2. **Authentication → Sign In / Providers → Google** → **Enable**
   - Paste ang **Client ID** at **Client secret** → **Save**
3. **Authentication → URL Configuration**
   - **Site URL:** `https://olfupharmalab.vercel.app`
   - **Redirect URLs → Add URL:**
     - `https://olfupharmalab.vercel.app/**`
     - `http://localhost:3000/**`
   - **Save**

## C. Sabihan si Claude

Sabihin lang: "tapos na ang Google setup". Susubukan ko:
1. kung bumubukas ang Google sign-in screen at bumabalik sa site,
2. kung tinatanggihan ang hindi-OLFU na email,
3. tapos ang go-live (tingnan ang `REQUESTER-LOGIN.md` → Go-live).

## Kung may problema

| Lumabas | Ayos |
|---|---|
| `redirect_uri_mismatch` | Tama ba ang redirect URI sa A.4 (eksakto, walang `/` sa dulo)? |
| "Access blocked: app not verified" / test users only | Pindutin ang **Publish app** sa A.3 |
| Pagbalik sa site, hindi naka-login | Idagdag ang `https://olfupharmalab.vercel.app/**` sa B.3 |
| Student account na-block ng school | Ipa-allow sa school IT ang OAuth client ID |
