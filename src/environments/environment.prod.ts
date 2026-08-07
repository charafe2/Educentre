import siteConfig from './site.config.json';

// Production environment. Swapped in for environment.ts at build time via the
// `fileReplacements` entry in angular.json (production configuration). `siteUrl`
// resolves to the real domain from the shared site.config.json.
export const environment = {
  production: true,
  apiUrl: '/api',
  siteUrl: siteConfig.siteUrl.production,
  reverb: {
    key: 'base64:Dj5oOLdAjFm1iU2S7J5LejvA3jFi7c45GCDU7QxYRmU=',
    host: 'moujtahide.ma',
    port: 443,
    scheme: 'https'
  }
};
