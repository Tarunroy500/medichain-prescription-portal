
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QrCode, Search } from 'lucide-react';
import { toast } from 'sonner';
import PrescriptionVerification from './PrescriptionVerification';

const PharmacistDashboard = () => {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please enter a prescription token');
      return;
    }

    setVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      setVerifiedToken(token);
      setVerifying(false);
    }, 1000);
  };

  const simulateScan = () => {
    setIsScanning(true);
    // Simulate scanning delay
    setTimeout(() => {
      const mockToken = 'RX-ABC12345'; // For demo purposes
      setToken(mockToken);
      setIsScanning(false);
      toast.success('QR code scanned successfully', {
        description: `Prescription token: ${mockToken}`,
      });
    }, 2000);
  };

  const resetVerification = () => {
    setToken('');
    setVerifiedToken(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pharmacist Dashboard</h2>
        <p className="text-medineutral-600">Welcome back, {user?.name}</p>
      </div>

      {!verifiedToken ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="medichain-card">
            <CardHeader>
              <CardTitle>Verify Prescription</CardTitle>
              <CardDescription>Enter prescription token or scan QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Prescription Token</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="token" 
                      placeholder="Enter token (e.g., RX-ABC12345)" 
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                    <Button type="submit" disabled={!token || verifying}>
                      {verifying ? (
                        <span className="inline-flex items-center">
                          <span className="mr-2">Verifying</span>
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <Search className="mr-2 h-4 w-4" /> 
                          Verify
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
              
              <Separator className="my-4" />
              
              <div className="text-center">
                <p className="text-sm text-medineutral-600 mb-3">Or scan patient's QR code</p>
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-8 flex flex-col items-center justify-center border-dashed"
                  onClick={simulateScan}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mediblue-600 mb-2"></div>
                      <p className="text-sm font-medium">Scanning...</p>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-8 w-8 text-mediblue-600 mb-2" />
                      <p className="text-sm font-medium">Scan QR Code</p>
                    </>
                  )}
                </Button>
                <p className="text-xs text-medineutral-500 mt-2">
                  Position the QR code within the scanner area
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="medichain-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent prescription verifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-medineutral-500">
                <p>No recent activity</p>
                <p className="text-sm mt-2">Verified prescriptions will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <PrescriptionVerification token={verifiedToken} onReset={resetVerification} />
      )}
    </div>
  );
};

export default PharmacistDashboard;
