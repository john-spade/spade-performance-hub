import { Models } from 'appwrite';

export interface ClientDocument extends Models.Document {
    name: string;
    clientId: string;
    password: string; // In real app, this should be hashed/handled securely
    representativeName?: string; // Point of Contact / Operations Manager
    email?: string; // For automated receipts
}

export interface GuardDocument extends Models.Document {
    name: string;
    guardId: string;
}

export interface EvaluationDocument extends Models.Document {
    clientId: string;
    guardId: string;
    kpi_scores: string; // Appwrite stores objects as JSON strings or we can strict type if using Attributes
    // "kpi_scores": "object" in user schema, implies JSON string or Map in SDK
    totalScore: number;
    editableUntil: string;
}

export type MockClient = Omit<ClientDocument, keyof Models.Document>;
export type MockGuard = Omit<GuardDocument, keyof Models.Document>;
