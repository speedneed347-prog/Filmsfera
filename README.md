# FILMSFERA
Movie discovery and authorized direct-download site. Plain HTML/CSS/ES modules, Firebase Auth + Firestore + Hosting, Cloudinary images. No build step.

## Setup
1. Create a Firebase project; enable **Authentication → Email/Password**, **Firestore**, **Hosting**. Add a web app and paste its config into `public/config.js`.
2. Cloudinary: Settings → Upload → add an **unsigned** upload preset named `filmsfera_unsigned` (folder `filmsfera`, allowed formats jpg/png/webp). Put your cloud name and preset in `public/config.js`. Unsigned presets allow uploads by anyone who knows the preset name, so restrict formats/size in the preset.
3. Create your admin user in Firebase Console → Authentication → Add user.
4. Grant admin (service account key from Project settings → Service accounts; keep it out of `public/` and git):
   `npm install && GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run set-admin -- you@example.com`
5. Deploy: `npm i -g firebase-tools && firebase login && firebase use <project-id> && firebase deploy`
6. Open `/admin.html`, sign in, add films.

## Firestore schema
- `films/{id}`: title, titleLower, slug, shortDescription, description, posterUrl, backdropUrl, screenshots[], genres[], language, releaseYear, releaseDate, durationMinutes, director, cast[], production, imdbRating, subtitles[{language,url}], downloadOptions[{quality,format,fileSize,language,provider,url,linkType('direct'|'page'),active}], status('draft'|'published'), featured, popular, confirmDownload, createdAt, updatedAt
- `categories/{id}`: name · `siteSettings/{id}`: reserved · `analytics/{id}`: filmId,title,quality,provider,day,createdAt (one doc per download-link click, no personal data) · `admins/{uid}`: email

Screenshots and download options are arrays inside the film doc (fine up to dozens of items, well under the 1 MB doc limit).

## Security
Writes require the `admin` custom claim (rules in `firestore.rules`). Visitors read only `published` films. Analytics are create-only and readable by admins only. All URLs are checked for http/https in the client; rules enforce https/http on the poster only (rules can't loop over arrays), so keep writes admin-only.
Analytics count **download-link clicks**, not completed downloads.
