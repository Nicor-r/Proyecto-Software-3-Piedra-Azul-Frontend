import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // NUEVO: el panel del medico depende del token del navegador; se arma en el cliente
  { path: 'medico', renderMode: RenderMode.Client },
  { path: 'medico/**', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];