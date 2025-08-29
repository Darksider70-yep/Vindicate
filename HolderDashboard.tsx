import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { SkillsSearch } from "./SkillsSearch";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Eye, Share2, Download, Search, Plus, User, Code } from "lucide-react";

export function HolderDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillsSearch, setShowSkillsSearch] = useState(false);

  const credentials = [
    {
      id: "CRED-001",
      skill: "React Development",
      level: "Advanced",
      issuer: "Stanford University",
      date: "2024-01-15",
      status: "verified",
    },
    {
      id: "CRED-002",
      skill: "Blockchain Development",
      level: "Intermediate",
      issuer: "MIT OpenCourseWare",
      date: "2024-01-10",
      status: "verified",
    },
    {
      id: "CRED-003",
      skill: "Smart Contracts",
      level: "Expert",
      issuer: "Ethereum Foundation",
      status: "pending",
    },
  ];

  const filteredCredentials = credentials.filter((cred) => {
    const matchesSearch =
      cred.skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.issuer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkills =
      selectedSkills.length === 0 || selectedSkills.includes(cred.skill);
    return matchesSearch && matchesSkills;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <User className="h-5 w-5" /> My Credentials
        </h1>
        <Button onClick={() => setShowSkillsSearch(!showSkillsSearch)}>
          <Plus className="mr-2 h-4 w-4" /> Add Skills
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search credentials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Skills Search (toggleable) */}
      {showSkillsSearch && (
        <SkillsSearch
          selectedSkills={selectedSkills}
          onSkillsChange={setSelectedSkills}   // ✅ FIXED
        />
      )}

      {/* Credentials List */}
      {filteredCredentials.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No credentials found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCredentials.map((cred) => (
            <Card key={cred.id} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" /> {cred.skill}
                </CardTitle>
                <CardDescription>
                  Issued by {cred.issuer} on {cred.date || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <Badge
                    variant={
                      cred.status === "verified" ? "default" : "secondary"
                    }
                  >
                    {cred.status || "pending"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Level: {cred.level}
                  </span>
                </div>

                {/* Action buttons with tooltips */}
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Credential</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="Share">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share Credential</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" aria-label="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download Credential</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
