'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Compte à rebours en secondes avant un nouveau code (`resendAfterSeconds`, `retryAfterSeconds`). Calculé
 * sur l'heure de fin et non décrémenté : il reste juste si l'onglet est mis en veille.
 */
export function useCountdown() {
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setDeadline(0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) {
      setDeadline(0);
      setRemaining(0);
      return;
    }
    setRemaining(Math.ceil(seconds));
    setDeadline(Date.now() + seconds * 1000);
  }, []);

  return { remaining, start };
}
