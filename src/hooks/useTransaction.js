import { useContext } from 'react';
import { TransactionContext } from '../context/transactionContextInstance';

export function useTransaction() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
}
