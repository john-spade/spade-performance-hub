import { databases, DB_ID, COLLECTIONS } from './appwrite';
import { ID, Permission, Role } from 'appwrite';

const MOCK_CLIENTS = [
    // {
    //     name: "Elimate",
    //     clientId: "SS-001-A",
    //     password: "Spade-001",
    //     representativeName: "Sarah Connor",
    //     email: "sarah@elimate.com",
    //     createdAt: "2025-01-01T00:00:00Z"
    // }
];

const MOCK_GUARDS = [
    // {
    //     name: "John Spade",
    //     guardId: "SPG-0001",
    //     createdAt: "2025-01-01T00:00:00Z"
    // }
];

export async function seedDatabase() {
    console.log("Starting Data Seeding...");

    // Seed Clients
    for (const client of MOCK_CLIENTS) {
        try {
            await databases.createDocument(
                DB_ID,
                COLLECTIONS.CLIENTS,
                ID.unique(),
                client,
                [Permission.read(Role.any())] // Simplify permissions for demo
            );
            console.log(`Created Client: ${client.name}`);
        } catch (error) {
            console.error(`Error creating client ${client.name} (might already exist):`, error);
        }
    }

    // Seed Guards
    for (const guard of MOCK_GUARDS) {
        try {
            await databases.createDocument(
                DB_ID,
                COLLECTIONS.GUARDS,
                ID.unique(),
                guard,
                [Permission.read(Role.any())]
            );
            console.log(`Created Guard: ${guard.name}`);
        } catch (error) {
            console.error(`Error creating guard ${guard.name}:`, error);
        }
    }



    alert("Seeding complete! Check console for details.");
}
