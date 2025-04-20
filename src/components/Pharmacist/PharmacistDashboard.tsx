import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, FileText, ArrowRight, History } from 'lucide-react';
import { PrescriptionService } from '@/services/PrescriptionService';
import { useAuth } from '@/contexts/AuthContext';
import PrescriptionVerification from './PrescriptionVerification';

const PharmacistDashboard = () => {
  const { user } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('verify');
  const [verificationMode, setVerificationMode] = useState<'input' | 'verify'>('input');
  const [currentToken, setCurrentToken] = useState<string | undefined>(undefined);
  
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setCurrentToken(tokenInput.trim());
      setVerificationMode('verify');
    }
  };
  
  const handleReset = () => {
    setVerificationMode('input');
    setTokenInput('');
    setCurrentToken(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Pharmacist Dashboard</h1>
        <div className="text-sm text-medineutral-600">
          Welcome, {user?.name || 'Pharmacist'}
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <QrCode size={18} />
            Verify Prescriptions
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <History size={18} />
            Dispensing History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="verify" className="space-y-4">
          {verificationMode === 'input' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="mr-2 h-5 w-5" />
                  Prescription Verification
                </CardTitle>
                <CardDescription>
                  Verify and dispense patient prescriptions by scanning a QR code or entering the prescription token
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <form onSubmit={handleTokenSubmit} className="flex w-full items-center space-x-2">
                      <Input
                        placeholder="Enter prescription token (e.g., RX-ABC12345)"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="font-mono"
                      />
                      <Button type="submit">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-medineutral-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-medineutral-50 px-2 text-medineutral-600">
                        or scan a QR code
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setCurrentToken(undefined);
                      setVerificationMode('verify');
                    }}
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <PrescriptionVerification 
              token={currentToken} 
              onReset={handleReset} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispensing History</CardTitle>
              <CardDescription>
                View recent prescription dispensing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-medineutral-500">
                <FileText className="mx-auto h-12 w-12 opacity-30" />
                <p className="mt-2">Dispensing history will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PharmacistDashboard;
