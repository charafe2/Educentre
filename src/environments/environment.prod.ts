import siteConfig from './site.config.json';

// Production environment. Swapped in for environment.ts at build time via the
// `fileReplacements` entry in angular.json (production configuration). `siteUrl`
// resolves to the real domain from the shared site.config.json.
export const environment = {
  production: true,
  apiUrl: '/api',
  siteUrl: siteConfig.siteUrl.production,
  // `key` must match REVERB_APP_KEY on the server exactly — Reverb closes the
  // handshake with a 500 ("Application does not exist") when it matches no
  // configured app. It is public (it ships in this bundle and in the WebSocket
  // URL), so it must never be the same value as APP_KEY or REVERB_APP_SECRET.
  reverb: {
    key: 'base64:Dj5oOLdAjFm1iU2S7J5LejvA3jFi7c45GCDU7QxYRmU=',
    host: 'moujtahide.ma',
    port: 443,
    scheme: 'https'
  }
};
