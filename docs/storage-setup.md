# Storage Setup

Unishare uses any S3-compatible object storage for file uploads. This guide covers setup for **Cloudflare R2** (recommended) and **AWS S3**.

---

## Cloudflare R2 (Recommended)

R2 is the recommended option — it has a generous free tier and **zero egress fees**, meaning downloads are free regardless of traffic.

**Free tier:** 10 GB storage, 1 million Class A operations, 10 million Class B operations per month.

### 1. Create a bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket**
3. Name it `unishare` (or anything you prefer)
4. Choose a region closest to your users

### 2. Get API credentials

1. In R2, go to **Manage R2 API Tokens** → **Create API Token**
2. Set permissions to **Object Read & Write**
3. Scope it to your bucket
4. Copy:
   - **Access Key ID** → `S3_ACCESS_KEY_ID`
   - **Secret Access Key** → `S3_SECRET_ACCESS_KEY`
   - **Endpoint** → found on the bucket overview page, format: `https://<account_id>.r2.cloudflarestorage.com`

### 3. Configure public access (optional)

If you want files to be publicly accessible without presigned URLs:

1. Go to your bucket → **Settings** → **Public Access**
2. Enable **R2.dev subdomain** or connect a **Custom Domain**
3. Copy the public URL → `STORAGE_PUBLIC_URL`

> Skip this if you want all files to be private (accessed via presigned download URLs only).

### 4. Configure CORS

Go to your bucket → **Settings** → **CORS Policy** and add:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

> CORS is required for presigned upload URLs — the browser uploads directly to R2, so R2 must allow requests from your frontend origin.

### 5. Environment variables

```env
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=unishare
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
STORAGE_PUBLIC_URL=https://pub-xxxx.r2.dev  # only if public access is enabled
```

---

## AWS S3

### 1. Create a bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com) → **Create bucket**
2. Choose a region
3. Uncheck **Block all public access** if you want public files (optional)
4. Enable **versioning** if needed

### 2. Get API credentials

1. Go to **IAM** → **Users** → **Create user**
2. Attach the **AmazonS3FullAccess** policy (or a scoped inline policy)
3. Create an **Access Key** under Security Credentials
4. Copy:
   - **Access Key ID** → `S3_ACCESS_KEY_ID`
   - **Secret Access Key** → `S3_SECRET_ACCESS_KEY`

### 3. Configure CORS

In your bucket → **Permissions** → **CORS configuration**:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Environment variables

```env
S3_ENDPOINT=https://s3.<region>.amazonaws.com
S3_REGION=ap-southeast-1
S3_BUCKET=unishare
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
STORAGE_PUBLIC_URL=https://unishare.s3.<region>.amazonaws.com  # only if public
```

---

## How file uploads work

Unishare uses **presigned URLs** — the file never passes through the API server:

```
1. Frontend → POST /storage/presigned-upload  →  API returns { url, key }
2. Frontend → PUT {url}  →  File uploaded directly to S3/R2
3. Frontend → POST /posts/:id/files  →  API saves { key, name, size, mimeType } to DB
```

**Supported file types:**
| Type | Formats | Max size |
|------|---------|----------|
| Document | PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX | 50 MB |
| Image | JPEG, PNG, WebP | 10 MB |
