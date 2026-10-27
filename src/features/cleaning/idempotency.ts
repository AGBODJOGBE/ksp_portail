/**
 * Clé d'idempotence d'un envoi (`Idempotency-Key`, 8 à 100 caractères `[A-Za-z0-9_-]`).
 *
 * Une clé par soumission : un nouvel envoi du même contenu (réseau coupé, double clic, « Réessayer »)
 * reprend la même clé, et la gateway ne crée rien de plus ; un contenu modifié reçoit une clé neuve.
 */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export interface IdempotentSubmission {
  /** Clé à envoyer pour ce contenu. */
  keyFor(payload: unknown): string;
  /** Envoi réussi : la soumission suivante aura une clé neuve. */
  done(): void;
}

export function idempotentSubmission(create: () => string = createIdempotencyKey): IdempotentSubmission {
  let last: { key: string; payload: string } | null = null;
  return {
    keyFor(payload) {
      const serialized = JSON.stringify(payload);
      if (!last || last.payload !== serialized) last = { key: create(), payload: serialized };
      return last.key;
    },
    done() {
      last = null;
    },
  };
}
