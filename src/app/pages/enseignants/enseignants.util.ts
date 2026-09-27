import { Teacher } from '../../models/teacher.model';

export function money(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
}

export function fullName(t: Pick<Teacher, 'firstName' | 'lastName'>): string {
  return `${t.firstName} ${t.lastName}`.trim();
}

/** "il y a 3 jours", "hier", or a full date — used for `access.lastLoginAt`. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return `aujourd’hui à ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
