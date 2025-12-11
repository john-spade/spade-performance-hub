import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client();

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY; // User must add this

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Error: Please ensure VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are set in your .env file.');
    process.exit(1);
}

client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);
const DB_ID = 'PerfDB';
const DB_NAME = 'PerfDB';

const COLLECTIONS = [
    {
        id: 'clients',
        name: 'Clients',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'clientId', type: 'string', size: 100, required: true },
            { key: 'password', type: 'string', size: 100, required: true },
            { key: 'createdAt', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'uniqueClientId', type: 'unique', attributes: ['clientId'] }
        ]
    },
    {
        id: 'guards',
        name: 'Security Guards',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'guardId', type: 'string', size: 100, required: true },
            { key: 'createdAt', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'uniqueGuardId', type: 'unique', attributes: ['guardId'] }
        ]
    },
    {
        id: 'evaluations',
        name: 'Evaluations',
        attributes: [
            { key: 'clientId', type: 'string', size: 100, required: true },
            { key: 'guardId', type: 'string', size: 100, required: true },
            { key: 'kpi_scores', type: 'string', size: 10000, required: true }, // Mapped 'object' to 'string' (JSON)
            { key: 'totalScore', type: 'double', required: true },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'editableUntil', type: 'datetime', required: true }
        ],
        indexes: [
            { key: 'indexByClient', type: 'key', attributes: ['clientId'] },
            { key: 'indexByGuard', type: 'key', attributes: ['guardId'] }
        ]
    }
];

async function setupDatabase() {
    try {
        // 1. Check or Create Database
        try {
            await databases.get(DB_ID);
            console.log(`Database '${DB_NAME}' (${DB_ID}) already exists.`);
        } catch (error) {
            console.log(`Creating database '${DB_NAME}'...`);
            await databases.create(DB_ID, DB_NAME);
            console.log(`Database created.`);
        }

        // 2. Iterate Collections
        for (const col of COLLECTIONS) {
            console.log(`\nProcessing Collection: ${col.name} (${col.id})`);

            // Create Collection if not exists
            try {
                await databases.getCollection(DB_ID, col.id);
                console.log(` - Collection exists.`);
            } catch (error) {
                console.log(` - Creating collection...`);
                await databases.createCollection(DB_ID, col.id, col.name, [
                    Permission.read(Role.any()),
                    Permission.write(Role.any()), // WARNING: Open permissions for demo
                    Permission.update(Role.any()),
                    Permission.delete(Role.any()),
                ]);
            }

            // Create Attributes
            for (const attr of col.attributes) {
                try {
                    await databases.getAttribute(DB_ID, col.id, attr.key);
                    console.log(`   - Attribute '${attr.key}' exists.`);
                } catch (error) {
                    console.log(`   - Creating attribute '${attr.key}'...`);
                    try {
                        if (attr.type === 'string') {
                            await databases.createStringAttribute(DB_ID, col.id, attr.key, attr.size || 255, attr.required);
                        } else if (attr.type === 'integer') {
                            await databases.createIntegerAttribute(DB_ID, col.id, attr.key, attr.required);
                        } else if (attr.type === 'double') {
                            await databases.createFloatAttribute(DB_ID, col.id, attr.key, attr.required);
                        } else if (attr.type === 'boolean') {
                            await databases.createBooleanAttribute(DB_ID, col.id, attr.key, attr.required);
                        } else if (attr.type === 'datetime') {
                            await databases.createDatetimeAttribute(DB_ID, col.id, attr.key, attr.required);
                        }
                        // Wait a bit because attribute creation is async
                        await new Promise(r => setTimeout(r, 500));
                    } catch (err) {
                        console.error(`   ! Failed to create attribute '${attr.key}':`, err.message);
                    }
                }
            }

            // Wait for attributes to be available before creating indexes
            console.log(`   - Waiting for attributes to index...`);
            await new Promise(r => setTimeout(r, 2000));

            // Create Indexes
            for (const idx of col.indexes) {
                try {
                    await databases.getIndex(DB_ID, col.id, idx.key);
                    console.log(`   - Index '${idx.key}' exists.`);
                } catch (error) {
                    console.log(`   - Creating index '${idx.key}'...`);
                    try {
                        await databases.createIndex(DB_ID, col.id, idx.key, idx.type, idx.attributes);
                    } catch (err) {
                        console.error(`   ! Failed to create index '${idx.key}':`, err.message);
                    }
                }
            }
        }

        console.log('\nDatabase Setup Complete!');
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupDatabase();
