import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { errorInterceptor } from './auth/error.interceptor';

import { provideAngularQuery, QueryClient } from '@tanstack/angular-query-experimental';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Async variant is SSR/prerender-safe (noop on server, lazy in browser).
    provideAnimationsAsync(),
    // Hydrates the prerendered public pages instead of re-rendering from scratch.
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    // withFetch is required for HttpClient to work under SSR/prerender.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    provideAngularQuery(new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
        },
      },
    })),
  ]
};
