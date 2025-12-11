import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { Query } from 'appwrite';

interface Guard {
    id: string;
    name: string;
    guardId: string;
}

// Mock Data for now until Appwrite is connected
const MOCK_GUARDS: Guard[] = [
    { id: '1', name: 'John Doe', guardId: 'G1001' },
    { id: '2', name: 'Jane Smith', guardId: 'G1002' },
    { id: '3', name: 'Mike Johnson', guardId: 'G1003' },
];

interface GuardSearchProps {
    onSelect: (guard: Guard) => void;
    disabled?: boolean;
}

export function GuardSearch({ onSelect, disabled }: GuardSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Guard[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!query) return;

        try {
            // Search by name or Guard ID
            // Note: Full-text search requires indexes in Appwrite. 
            // We will query simple exact match or list all for this demo if query is short, 
            // but robustly we should use Query.search if indexes exist.
            // For prototype, we'll fetch all and filter client-side if dataset is small, 
            // or attempt a query. Let's try Query.equal for ID or Name first.

            // Simulating search on minimal dataset by filtering client side for reliability 
            // since we assume small mock data.
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.GUARDS,
                [
                    // Query.search('name', query) // Requires search index
                ]
            );

            const allGuards = response.documents.map((doc: any) => ({
                id: doc.$id,
                name: doc.name,
                guardId: doc.guardId
            }));

            const filtered = allGuards.filter(g =>
                g.name.toLowerCase().includes(query.toLowerCase()) ||
                g.guardId.toLowerCase().includes(query.toLowerCase())
            );

            setResults(filtered);
            setHasSearched(true);
        } catch (error) {
            console.error("Search failed:", error);
            // Fallback to mock if DB fails/empty
            const filtered = MOCK_GUARDS.filter(
                g => g.name.toLowerCase().includes(query.toLowerCase()) ||
                    g.guardId.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
            setHasSearched(true);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Search by Guard ID or Name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={disabled}
                    className="flex-1"
                />
                <Button onClick={handleSearch} disabled={disabled || !query}>
                    <Search className="w-5 h-5" />
                </Button>
            </div>

            {hasSearched && results.length > 0 && (
                <Card className="divide-y divide-dark-700">
                    {results.map(guard => (
                        <button
                            key={guard.id}
                            onClick={() => onSelect(guard)}
                            className="w-full p-4 flex justify-between items-center hover:bg-dark-700 transition-colors text-left"
                        >
                            <div>
                                <p className="font-bold text-white">{guard.name}</p>
                                <p className="text-sm text-gold-500">{guard.guardId}</p>
                            </div>
                            <div className="text-xs text-gray-500">Click to Evaluate</div>
                        </button>
                    ))}
                </Card>
            )}

            {hasSearched && results.length === 0 && (
                <p className="text-center text-gray-500 py-4">No guards found.</p>
            )}
        </div>
    );
}
