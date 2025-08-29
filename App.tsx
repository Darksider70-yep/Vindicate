import { useState } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { Navigation } from './components/Navigation';
import { LandingPage } from './components/LandingPage';
import { IssuerDashboard } from './components/IssuerDashboard';
import { HolderDashboard } from './components/HolderDashboard';
import { VerifierPortal } from './components/VerifierPortal';
import { WalletConnectModal } from './components/WalletConnectModel';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const handlePageChange = (page: string) => {
    if (page === 'wallet') {
      setIsWalletModalOpen(true);
    } else {
      setCurrentPage(page);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onPageChange={handlePageChange} />;
      case 'issuer':
        return <IssuerDashboard />;
      case 'holder':
        return <HolderDashboard />;
      case 'verifier':
        return <VerifierPortal />;
      default:
        return <LandingPage onPageChange={handlePageChange} />;
    }
  };

  return (
    <ThemeProvider>
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="pt-16">
        {renderCurrentPage()}
      </main>

      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </ThemeProvider>
  );
}
