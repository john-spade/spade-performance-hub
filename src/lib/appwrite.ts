import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT ?? '')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? '');

export const account = new Account(client);
export const databases = new Databases(client);

// Database Constants
export const DB_ID = 'PerfDB';

export const COLLECTIONS = {
    CLIENTS: 'clients',
    GUARDS: 'guards',
    EVALUATIONS: 'evaluations'
};

export default client;
