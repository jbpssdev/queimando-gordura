import type {
  DocumentData,
  DocumentReference,
  Transaction,
  UpdateData,
} from 'firebase-admin/firestore';
// Apenas suporte aos testes isolados; concorrência é exercitada nos emuladores reais.
export async function runReferenceTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  const tx = {
    get: (ref: DocumentReference) => ref.get(),
    set: (ref: DocumentReference, value: DocumentData) => {
      void ref.set(value);
      return tx;
    },
    update: (ref: DocumentReference, value: UpdateData<DocumentData>) => {
      void ref.update(value);
      return tx;
    },
    delete: (ref: DocumentReference) => {
      void ref.delete();
      return tx;
    },
  };
  return callback(tx as unknown as Transaction);
}
