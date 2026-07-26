import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// Server/prerender bootstrap entry (referenced by angular.json `server`).
// Angular 21 passes a BootstrapContext that must be forwarded to bootstrapApplication.
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
