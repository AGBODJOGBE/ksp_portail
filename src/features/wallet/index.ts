/** Portefeuille prépayé du client (service wallet, ADR-046) : solde, recharge, relevé, paiement. */
// Écrans client chargés à la demande (voir components/lazy.tsx).
export { TopUpResult, WalletBalanceLink, WalletPay, WalletSpace } from './components/lazy';
export { walletPaths } from './paths';
export { walletTexts } from './texts';
