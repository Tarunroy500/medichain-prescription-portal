
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Calendar, 
  Clock, 
  QrCode, 
  Smartphone, 
  Bell, 
  BellOff,
  ChevronDown, 
  ChevronUp,
  Lock 
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Prescription, PrescriptionService } from '@/services/PrescriptionService';
import { toast } from 'sonner';

const PrescriptionCards = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'dispensed'>('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  
  useEffect(() => {
    const loadPrescriptions = async () => {
      if (!user?.id) return;
      
      try {
        const data = await PrescriptionService.getPatientPrescriptions(user.id);
        setPrescriptions(data);
      } catch (error) {
        console.error('Failed to load prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return p.status === 'active';
    if (activeTab === 'dispensed') return p.status === 'dispensed';
    return true;
  });

  const openQrDialog = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setQrDialogOpen(true);
  };

  const simulateNfcTap = (prescription: Prescription) => {
    if (prescription.status !== 'active') {
      toast.error('This prescription is not active');
      return;
    }

    toast.success('NFC tap simulated successfully', {
      description: 'Your pharmacist can now scan your device',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="h-12 w-12 mx-auto text-medineutral-400" />
        <h3 className="mt-4 text-lg font-medium">No Prescriptions Found</h3>
        <p className="text-medineutral-500 mt-2">You don't have any prescriptions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="dispensed">Dispensed</TabsTrigger>
        </TabsList>

        {['all', 'active', 'dispensed'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-6 text-medineutral-500">
                No {tabValue === 'all' ? '' : tabValue} prescriptions found.
              </div>
            ) : (
              filteredPrescriptions.map(prescription => (
                <Card 
                  key={prescription.id} 
                  className={`medichain-card overflow-hidden card-hover ${
                    prescription.status === 'active' ? 'blockchain-pulse' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-lg">{prescription.disease}</h3>
                          {prescription.status === 'active' && (
                            <Badge className="ml-2 bg-medimint-500">Active</Badge>
                          )}
                          {prescription.status === 'dispensed' && (
                            <Badge variant="outline" className="ml-2 text-medineutral-500">Dispensed</Badge>
                          )}
                        </div>
                        <p className="text-sm text-medineutral-600">Dr. {prescription.doctorName}</p>
                      </div>
                      
                      <div className="flex space-x-2">
                        {prescription.status === 'active' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center"
                              onClick={() => openQrDialog(prescription)}
                            >
                              <QrCode size={16} className="mr-1.5" />
                              <span className="hidden sm:inline">QR Code</span>
                            </Button>
                            <Button 
                              variant="secondary"
                              size="sm"
                              className="flex items-center bg-mediblue-100 text-mediblue-700 border-mediblue-200"
                              onClick={() => simulateNfcTap(prescription)}
                            >
                              <Smartphone size={16} className="mr-1.5" />
                              <span className="hidden sm:inline">NFC Tap</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center text-medineutral-600">
                        <Calendar size={14} className="mr-1" />
                        Created: {format(new Date(prescription.created), 'MMM d, yyyy')}
                      </div>
                      
                      {prescription.nextValidDose && (
                        <div className="flex items-center text-medimint-700">
                          <Clock size={14} className="mr-1" />
                          Next valid: {format(new Date(prescription.nextValidDose), 'MMM d, yyyy')}
                        </div>
                      )}
                      
                      {prescription.status === 'dispensed' && prescription.dispensedDates.length > 0 && (
                        <div className="flex items-center text-medineutral-600">
                          <Bell size={14} className="mr-1" />
                          Last dispensed: {format(new Date(prescription.dispensedDates[prescription.dispensedDates.length - 1]), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 p-2 bg-medineutral-50 rounded-md">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium">
                          Token: <span className="font-mono">{prescription.tokenId}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpand(prescription.id)}
                          className="text-medineutral-600"
                        >
                          {expandedId === prescription.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </Button>
                      </div>
                      
                      {expandedId === prescription.id && (
                        <div className="mt-3 space-y-3">
                          <Separator />
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Medicines</h4>
                            <div className="space-y-2">
                              {prescription.medicines.map((med, idx) => (
                                <div key={idx} className="text-sm rounded-md p-2 bg-white border border-medineutral-200">
                                  <div className="font-medium">{med.medicine.name}</div>
                                  <div className="text-medineutral-600 flex justify-between mt-1">
                                    <span>Quantity: {med.quantity}</span>
                                    <span>{med.dosage}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {prescription.status === 'dispensed' && (
                            <div className="p-2 bg-amber-50 rounded-md border border-amber-200 flex items-center">
                              <BellOff size={16} className="mr-2 text-amber-500" />
                              <span className="text-sm text-amber-700">
                                This prescription has already been dispensed
                              </span>
                            </div>
                          )}

                          {prescription.lockDates.length > 0 && (
                            <div className="p-2 bg-medineutral-100 rounded-md">
                              <h4 className="text-sm font-medium flex items-center">
                                <Lock size={14} className="mr-1.5" />
                                Lock Dates
                              </h4>
                              <div className="mt-1 text-sm text-medineutral-600">
                                {prescription.lockDates.map((date, idx) => (
                                  <span key={idx} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-white rounded border">
                                    {format(new Date(date), 'MMM d, yyyy')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prescription QR Code</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-md shadow-md">
                  {/* Simple QR Code mockup */}
                  <div className="w-48 h-48 bg-[repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0_10px,#e0e0e0_10px,#e0e0e0_20px)]">
                    <div className="w-full h-full flex items-center justify-center">
                      <QrCode size={120} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-2">
                <div className="text-center font-mono font-bold text-xl mb-2">
                  {selectedPrescription.tokenId}
                </div>
                <p className="text-sm text-center text-medineutral-600">
                  Show this QR code to your pharmacist to retrieve your medication
                </p>
              </div>
              
              <Alert>
                <AlertTitle className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Important Information
                </AlertTitle>
                <AlertDescription>
                  This prescription is valid until {format(new Date(selectedPrescription.doseValidity), 'MMMM d, yyyy')}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrescriptionCards;
