import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Search, CheckCircle, AlertCircle, ExternalLink, Calendar, Award } from 'lucide-react';

export function VerifierPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  // Mock credential data
  const mockCredentials: { [key: string]: any } = {
    'did:btc:1A2B3C4D5E6F7G8H9I0J': {
      id: 'CRED-001',
      skill: 'React Development',
      level: 'Advanced',
      issuer: 'Stanford University',
      issuerDID: 'did:btc:stanford:12345',
      holder: 'John Doe',
      holderDID: 'did:btc:1A2B3C4D5E6F7G8H9I0J',
      issueDate: '2024-01-15',
      description: 'Advanced proficiency in React.js including hooks, context, and performance optimization',
      blockchainHash: '0xa1b2c3d4e5f67890abcdef1234567890abcdef12',
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      blockNumber: '18850123',
      isValid: true,
      explorerUrl: 'https://blockstream.info/tx/0x1234567890abcdef1234567890abcdef12345678'
    },
    '0xa1b2c3d4e5f67890abcdef1234567890abcdef12': {
      id: 'CRED-002',
      skill: 'Blockchain Development',
      level: 'Expert',
      issuer: 'Ethereum Foundation',
      holder: 'Alice Smith',
      issueDate: '2024-02-10',
      description: 'Expertise in Ethereum blockchain development and smart contracts',
      isValid: false,
    }
  };

  const handleSearch = () => {
    setSearchResult(mockCredentials[searchQuery]);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Verifier Portal</h1>

      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter DID or credential hash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" /> Search
        </Button>
      </div>

      {/* Display Credential */}
      {searchResult ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {searchResult.skill}
              {searchResult.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
            <CardDescription>
              Issuer: {searchResult.issuer} | Holder: {searchResult.holder}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            <div className="flex gap-4 flex-wrap">
              <Badge variant={searchResult.isValid ? 'default' : 'destructive'}>
                {searchResult.isValid ? 'Verified' : 'Invalid'}
              </Badge>
              <Badge variant="secondary">{searchResult.level}</Badge>
            </div>

            {searchResult.issueDate && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> Issued: {searchResult.issueDate}
              </div>
            )}

            {searchResult.description && (
              <p className="text-sm">{searchResult.description}</p>
            )}

            {searchResult.blockchainHash && searchResult.explorerUrl && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4" />
                <a
                  href={searchResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-600"
                >
                  View on Blockchain Explorer
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        searchQuery && <p className="text-muted-foreground">No credentials found.</p>
      )}
    </div>
  );
}
