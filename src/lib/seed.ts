import { databases, DB_ID, COLLECTIONS } from './appwrite';
import { ID, Permission, Role } from 'appwrite';

const MOCK_CLIENTS = [
    {
        name: "Elimate",
        clientId: "SS-001-A",
        password: "Spade-001",
        createdAt: "2025-01-01T00:00:00Z"
    }
];

const MOCK_GUARDS = [
    {
        name: "John Spade",
        guardId: "SPG-0001",
        createdAt: "2025-01-01T00:00:00Z"
    },
    {
        name: "Carl Dim",
        guardId: "SPG-00012",
        createdAt: "2025-01-01T00:00:00Z"
    }
];

const MOCK_EVALUATION = {
    clientId: "SS-001-A",
    guardId: "SPG-0001",
    kpi_scores: JSON.stringify({
        "attendance": 9,
        "alertness": 8,
        "professionalism": 10,
        "reporting": 9
    }), // Storing as JSON string since using mocked structure
    totalScore: 36,
    createdAt: "2025-01-03T14:00:00Z",
    editableUntil: "2025-01-04T02:00:00Z"
};

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

    // Seed Mock Evaluation
    try {
        await databases.createDocument(
            DB_ID,
            COLLECTIONS.EVALUATIONS,
            ID.unique(),
            MOCK_EVALUATION,
            [Permission.read(Role.any()), Permission.write(Role.any())]
        );
        console.log("Created Mock Evaluation");
    } catch (error) {
        console.error("Error creating mock evaluation:", error);
    }

    alert("Seeding complete! Check console for details.");
}
