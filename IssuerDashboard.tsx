import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { SkillsSearch } from './SkillsSearch';
import { FileText, Plus, Calendar, Building, Search, User, Code, Server, Award } from 'lucide-react';

export function IssuerDashboard() {
  const [activeView, setActiveView] = useState<'issue' | 'issued'>('issue');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    holderDID: '',
    level: '',
    issueDate: new Date().toISOString().split('T')[0],
  });

  // Simplified issued credentials data
  const issuedCredentials = [
    { id: 'CRED-001', skill: 'React Development', holder: 'did:btc:user123', date: '2024-01-15', level: 'Advanced' },
    { id: 'CRED-002', skill: 'Blockchain Development', holder: 'did:btc:user456', date: '2024-01-10', level: 'Intermediate' },
    { id: 'CRED-003', skill: 'Smart Contracts', holder: 'did:btc:user789', date: '2024-01-05', level: 'Expert' },
    { id: 'CRED-004', skill: 'Machine Learning', holder: 'did:btc:user321', date: '2024-01-03', level: 'Advanced' },
  ];

  const filteredCredentials = issuedCredentials.filter(cred =>
    cred.skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Properly update form data
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ Return JSX (very basic UI for now)
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Issuer Dashboard</h1>

      {activeView === 'issue' ? (
        <Card className="p-4 mb-6">
          <CardHeader>
            <CardTitle>Issue Credential</CardTitle>
            <CardDescription>Fill in the details to issue a new credential</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Holder DID</Label>
                <Input
                  value={formData.holderDID}
                  onChange={e => handleInputChange('holderDID', e.target.value)}
                  placeholder="did:btc:user123"
                />
              </div>

              <div>
                <Label>Level</Label>
                <Select
                  onValueChange={val => handleInputChange('level', val)}
                  value={formData.level}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="Expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={e => handleInputChange('issueDate', e.target.value)}
                />
              </div>

              <Button onClick={() => console.log("Issued:", formData)}>Issue Credential</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Issued Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search credentials..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            <ul className="space-y-2">
              {filteredCredentials.map(cred => (
                <li key={cred.id} className="p-2 border rounded">
                  <strong>{cred.skill}</strong> — {cred.holder} ({cred.level}) on {cred.date}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex space-x-2">
        <Button onClick={() => setActiveView('issue')}>Issue New</Button>
        <Button onClick={() => setActiveView('issued')}>View Issued</Button>
      </div>
    </div>
  );
}
