import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Los paneles autenticados dependen del token y/o canvas del navegador; se renderizan en cliente (SSR-safe).
  { path: 'medico', renderMode: RenderMode.Client },
  { path: 'medico/**', renderMode: RenderMode.Client },
  { path: 'terapista', renderMode: RenderMode.Client },
  { path: 'terapista/**', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'agendador', renderMode: RenderMode.Client },
  { path: 'agendador/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];