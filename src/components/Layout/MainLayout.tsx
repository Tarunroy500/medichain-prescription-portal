import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { User, FileText, Pill, Wallet } from 'lucide-react';
import LoginForm from '@/components/Auth/LoginForm';
import DoctorDashboard from '@/components/Doctor/DoctorDashboard';
import PatientDashboard from '@/components/Patient/PatientDashboard';
import PharmacistDashboard from '@/components/Pharmacist/PharmacistDashboard';
import { toast } from 'sonner';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { 
    isAuthenticated, 
    role, 
    logout, 
    switchRole, 
    isWalletConnected, 
    walletAddress,
    connectWallet,
    disconnectWallet
  } = useAuth();

  // Ensure proper viewport metadata for mobile responsiveness
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // If it doesn't exist, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set the proper viewport properties for responsive design
    viewportMeta.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }, []);

  const handleRoleSwitch = (newRole: UserRole) => {
    if (!newRole) return;
    
    if (role !== newRole) {
      switchRole(newRole);
      toast.info(`Switched to ${newRole} dashboard`);
    }
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-medineutral-100">
      {/* Top navigation bar */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-mediblue-500 text-white p-1.5 rounded">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="font-semibold text-xl text-mediblue-800">MediChain</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Wallet Connection Button */}
            {isWalletConnected ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={disconnectWallet}
                className="bg-mediblue-50 text-mediblue-700 border-mediblue-200 hover:bg-mediblue-100"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {formatAddress(walletAddress!)}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={connectWallet}
                className="mr-2"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}
            
            {isAuthenticated && (
              <Button variant="outline" onClick={logout}>Log out</Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto">
            <LoginForm />
          </div>
        ) : (
          <div>
            <Tabs defaultValue={role || "doctor"} onValueChange={(value) => handleRoleSwitch(value as UserRole)} className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="doctor" className="flex items-center gap-2">
                    <User size={18} />
                    <span className="hidden sm:inline">Doctor</span>
                  </TabsTrigger>
                  <TabsTrigger value="patient" className="flex items-center gap-2">
                    <FileText size={18} />
                    <span className="hidden sm:inline">Patient</span>
                  </TabsTrigger>
                  <TabsTrigger value="pharmacist" className="flex items-center gap-2">
                    <Pill size={18} />
                    <span className="hidden sm:inline">Pharmacist</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="doctor">
                <DoctorDashboard />
              </TabsContent>
              
              <TabsContent value="patient">
                <PatientDashboard />
              </TabsContent>
              
              <TabsContent value="pharmacist">
                <PharmacistDashboard />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white mt-auto py-4 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-medineutral-500">
          <p>© 2025 MediChain - Blockchain Prescription System</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
