'use client';

import { IconUser } from '@/components/ui/icons';
import { TodoItem, TodoPanel } from '@/components/ui/todo-panel';
import { useSession } from '@/lib/api';
import { accountTexts, identityPaths } from '@/features/identity/texts';

const t = accountTexts.todo;

/**
 * Compte dans la rubrique « À faire » : e-mail à ajouter ou à vérifier, lus dans la session (profil
 * renvoyé par la gateway). Rien n'est affiché quand le compte est complet. Le nom manquant est déjà
 * demandé par la garde de l'espace (« Compléter mon profil »).
 */
export function ProfileTodo() {
  const user = useSession()?.user;
  if (!user || (user.email && user.emailVerified)) return null;
  return (
    <TodoPanel
      id="todo-compte"
      title={t.title}
      icon={<IconUser className="size-5" />}
      link={{ href: identityPaths.profile, label: accountTexts.home.profileLink }}
    >
      <ul className="grid gap-3">
        <TodoItem
          title={user.email ? t.emailUnverified : t.emailMissing}
          text={user.email ? t.emailUnverifiedText(user.email) : t.emailMissingText}
          action={{ href: identityPaths.profile, label: t.action }}
        />
      </ul>
    </TodoPanel>
  );
}
