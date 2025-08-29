import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, CheckCircle, User, Sparkles, Zap, Lock } from 'lucide-react';

interface LandingPageProps {
  onPageChange: (page: string) => void;
}

export function LandingPage({ onPageChange }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-cyan-500/10 dark:from-background dark:via-primary/10 dark:to-cyan-500/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-sm font-medium text-primary">
                Blockchain-Powered Verification
              </span>
            </div>
          </div>

          <h1 className="text-4xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-foreground via-primary to-cyan-500 bg-clip-text text-transparent animate-gradient">
              Prove Your Skills.
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
              Permanently.
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
}
