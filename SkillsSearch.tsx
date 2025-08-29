import { useState } from 'react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, X, Code, Server, Database, Shield, Smartphone, Palette, Brain, Globe } from 'lucide-react';

interface SkillsSearchProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  maxSkills?: number;
}

interface SkillCategory {
  name: string;
  icon: React.ReactNode;
  skills: string[];
  color: string;
}

export function SkillsSearch({
  selectedSkills = [],
  onSkillsChange,
  placeholder = "Search for IT and industrial skills...",
  maxSkills = 10
}: SkillsSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Comprehensive categorized skills database
  const skillCategories: SkillCategory[] = [
    {
      name: 'Frontend Development',
      icon: <Code className="h-4 w-4" />,
      skills: ['React', 'Angular', 'Vue.js', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
      color: 'text-blue-600'
    },
    {
      name: 'Backend Development',
      icon: <Server className="h-4 w-4" />,
      skills: ['Node.js', 'Express', 'Django', 'Spring Boot', 'GraphQL', 'REST APIs'],
      color: 'text-green-600'
    },
    {
      name: 'Databases',
      icon: <Database className="h-4 w-4" />,
      skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle'],
      color: 'text-purple-600'
    },
    {
      name: 'Security',
      icon: <Shield className="h-4 w-4" />,
      skills: ['Ethical Hacking', 'Penetration Testing', 'Network Security', 'Blockchain Security'],
      color: 'text-red-600'
    },
    {
      name: 'Mobile Development',
      icon: <Smartphone className="h-4 w-4" />,
      skills: ['React Native', 'Flutter', 'Kotlin', 'Swift', 'Android'],
      color: 'text-pink-600'
    },
    {
      name: 'Design & UI/UX',
      icon: <Palette className="h-4 w-4" />,
      skills: ['Figma', 'Adobe XD', 'UI/UX Design', 'Prototyping'],
      color: 'text-yellow-600'
    },
    {
      name: 'AI & Data Science',
      icon: <Brain className="h-4 w-4" />,
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Data Analysis'],
      color: 'text-orange-600'
    },
    {
      name: 'Cloud & DevOps',
      icon: <Globe className="h-4 w-4" />,
      skills: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD'],
      color: 'text-cyan-600'
    }
  ];

  // Flatten skills for search
  const allSkills = skillCategories.flatMap(c => c.skills);

  // Filter skills based on search & category
  const filteredSkills =
    activeCategory === 'all'
      ? allSkills
      : skillCategories.find(c => c.name === activeCategory)?.skills || [];

  const displayedSkills = filteredSkills.filter(skill =>
    skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter(s => s !== skill));
    } else if (selectedSkills.length < maxSkills) {
      onSkillsChange([...selectedSkills, skill]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs for categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {skillCategories.map((cat) => (
            <TabsTrigger key={cat.name} value={cat.name}>
              <span className="flex items-center gap-1">
                {cat.icon} {cat.name}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="flex flex-wrap gap-2">
            {displayedSkills.map((skill) => (
              <Button
                key={skill}
                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected Skills */}
      <div className="flex flex-wrap gap-2">
        {selectedSkills.map((skill) => (
          <Badge key={skill} variant="secondary" className="flex items-center">
            {skill}
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-4 w-4 p-0"
              onClick={() => toggleSkill(skill)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
