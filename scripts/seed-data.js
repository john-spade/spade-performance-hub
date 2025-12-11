import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client();

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Missing env vars.');
    process.exit(1);
}

client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);
const DB_ID = 'PerfDB';
const COLLECTIONS = {
    CLIENTS: 'clients',
    GUARDS: 'guards'
};

const DATA = {
    clients: [
        {
            name: "Elimate",
            clientId: "SS-001-A",
            password: "Spade-001",
            createdAt: new Date().toISOString()
        }
    ],
    guards: [
        {
            name: "John Spade",
            guardId: "SPG-0001",
            createdAt: new Date().toISOString()
        },
        {
            name: "Carl Dim",
            guardId: "SPG-00012",
            createdAt: new Date().toISOString()
        }
    ]
};

async function seed() {
    console.log('Seeding Data...');

    // Clients
    for (const c of DATA.clients) {
        try {
            await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), c);
            console.log(`Created Client: ${c.name}`);
        } catch (e) {
            console.log(`Skipped Client ${c.name}: ${e.message}`);
        }
    }

    // Guards
    for (const g of DATA.guards) {
        try {
            await databases.createDocument(DB_ID, COLLECTIONS.GUARDS, ID.unique(), g);
            console.log(`Created Guard: ${g.name}`);
        } catch (e) {
            console.log(`Skipped Guard ${g.name}: ${e.message}`);
        }
    }
    console.log('Done.');
}

seed();
