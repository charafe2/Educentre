<?php

namespace App\Domains\Settings\Support;

/**
 * Sidebar-tab permission keys a tenant owner can grant to a user they create
 * in "Paramètres > Utilisateurs". Mirrors the child route segments under the
 * authenticated layout in the Angular app's app.routes.ts, minus:
 *  - `dashboard`, which every authenticated tenant user always sees, and
 *  - `parametres`, which stays owner-only (billing, other users, centre info).
 */
class TenantPermissions
{
    public const KEYS = [
        'revue-mensuelle',
        'etudiants',
        'groupes',
        'professeurs',
        'finances',
        'calendrier',
        'analytiques',
        'documents',
        // Caisse sub-sections: granted only to narrow a 'finances' user down
        // to specific tabs (e.g. let them encaisser but hide Statistiques).
        // Absent entirely = unrestricted, every tab open, for anyone who
        // already had 'finances' before this existed.
        'finances.encaisser',
        'finances.impayes',
        'finances.depenses',
        'finances.statistiques',
    ];
}
