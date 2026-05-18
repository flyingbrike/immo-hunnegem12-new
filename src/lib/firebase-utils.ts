import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  const stringified = JSON.stringify(errInfo);
  
  // If it's a quota or resource exhausted error, we log it as a warning but don't strictly throw 
  // if it's not a security rule issue. Security rule issues usually have 'permission-denied'.
  if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('resource-exhausted')) {
    console.warn("Firestore Quota Exceeded. The app will fallback to local/default data. Details: ", stringified);
    return; // Don't throw for quota, it just makes the app feel crashed.
  }

  console.error('Firestore Error: ', stringified);
  throw new Error(stringified);
}
