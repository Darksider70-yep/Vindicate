import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { CheckCircle, Wallet, Shield, Key, AlertCircle } from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletDID, setWalletDID] = useState('');

  const handleConnectWallet = async () => {
    setIsConnecting(true);

    // Simulate wallet connection
    setTimeout(() => {
      setIsConnected(true);
      setWalletDID('did:btc:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
      setIsConnecting(false);
    }, 2000);
  };

  const handleClose = () => {
    setIsConnected(false);
    setWalletDID('');
    setIsConnecting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            {isConnected
              ? 'Wallet connected successfully!'
              : 'Connect your cryptocurrency wallet to proceed.'}
          </DialogDescription>
        </DialogHeader>

        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-4">
            {!isConnected ? (
              <>
                <Wallet className="w-12 h-12 text-primary" />
                <Button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-center break-all">
                  Wallet DID: <span className="font-mono">{walletDID}</span>
                </p>
                <Button onClick={handleClose} className="w-full">
                  Close
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
