import siteConfig from './site.config.json';

// Production environment. Swapped in for environment.ts at build time via the
// `fileReplacements` entry in angular.json (production configuration). `siteUrl`
// resolves to the real domain from the shared site.config.json.
export const environment = {
  production: true,
  apiUrl: '/api',
  siteUrl: siteConfig.siteUrl.production,
  // `key` must match REVERB_APP_KEY on the server exactly, and must NEVER
  // contain a colon. Channel auth is sent as "{key}:{signature}" and Reverb
  // parses it with Str::after($auth, ':') — everything after the FIRST colon.
  // A colon inside the key shifts that split into the key itself, so the HMAC
  // never matches and every private subscription fails with 4009
  // ("Connection is unauthorized"), regardless of the secret being correct.
  // The key is public — it ships in this bundle and in the WebSocket URL.
  reverb: {
    key: 'c2935f6b4bc797d0ea8ab15d2c9dbbcf',
    host: 'moujtahide.ma',
    port: 443,
    scheme: 'https'
  }
};
