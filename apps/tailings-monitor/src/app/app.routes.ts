import { Routes } from '@angular/router'

export const appRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard-page.component').then((module) => module.DashboardPageComponent) },
  { path: 'monitoring', loadComponent: () => import('./pages/monitoring-page.component').then((module) => module.MonitoringPageComponent) },
  { path: 'dispatch', loadComponent: () => import('./pages/dispatch-page.component').then((module) => module.DispatchPageComponent) },
  { path: 'anomalies', loadComponent: () => import('./pages/anomaly-page.component').then((module) => module.AnomalyPageComponent) },
  { path: 'audit', loadComponent: () => import('./pages/audit-page.component').then((module) => module.AuditPageComponent) },
  { path: '**', redirectTo: '' }
]
