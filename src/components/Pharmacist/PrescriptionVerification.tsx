import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  ClipboardCheck, 
  AlertCircle,
  CheckSquare,
  Clock,
  Calendar,
  DatabaseBackup,
  Lock,
  Unlock,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { Prescription, PrescriptionService } from '@/services/PrescriptionService';
import { toast } from 'sonner';
import QRCodeScanner from './QRCodeScanner';

interface PrescriptionVerificationProps {
  token?: string;
  onReset: () => void;
}

const PrescriptionVerification = ({ token, onReset }: PrescriptionVerificationProps) => {
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispensed, setDispensed] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | undefined>(token);
  const [scanMode, setScanMode] = useState<boolean>(!token);

  const verifyPrescription = async (tokenToVerify: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await PrescriptionService.getPrescriptionByToken(tokenToVerify);
      if (data) {
        setPrescription(data);
      } else {
        setError('Prescription not found');
      }
    } catch (err) {
      setError('Failed to verify prescription');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentToken) {
      verifyPrescription(currentToken);
    }
  }, [currentToken]);

  const handleDispense = async () => {
    if (!prescription) return;
    
    setDispensing(true);
    try {
      await PrescriptionService.dispensePrescription(currentToken!);
      // Update prescription data
      const updatedPrescription = await PrescriptionService.getPrescriptionByToken(currentToken!);
      setPrescription(updatedPrescription);
      setDispensed(true);
      toast.success('Prescription dispensed successfully', {
        description: 'Blockchain record has been updated'
      });
    } catch (err: any) {
      toast.error('Failed to dispense prescription', {
        description: err.message || 'An error occurred'
      });
    } finally {
      setDispensing(false);
    }
  };

  const handleTokenDetected = (newToken: string) => {
    setCurrentToken(newToken);
    setScanMode(false);
  };

  // Check if prescription is locked today
  const isLockedToday = () => {
    if (!prescription) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return prescription.lockDates.some(lockDate => {
      const lockDay = new Date(lockDate);
      lockDay.setHours(0, 0, 0, 0);
      return lockDay.getTime() === today.getTime();
    });
  };

  // Determine if prescription is dispensable
  const isDispensable = () => {
    if (!prescription) return false;
    if (prescription.status !== 'active') return false;
    if (isLockedToday()) return false;
    
    const now = new Date();
    if (now > new Date(prescription.doseValidity)) return false;
    
    return true;
  };

  if (scanMode) {
    return <QRCodeScanner onTokenDetected={handleTokenDetected} />;
  }

  if (loading) {
    return (
      <Card className="medichain-card">
        <CardHeader>
          <CardTitle>Verifying Prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="space-y-3 w-full max-w-md">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !prescription) {
    return (
      <Card className="medichain-card">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <XCircle className="mr-2 h-5 w-5" />
            Invalid Prescription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>
              {error || 'No prescription found with this token'}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={() => setScanMode(true)} variant="outline" className="mr-2">
              <QrCode className="mr-2 h-4 w-4" />
              Scan QR Code
            </Button>
            <Button onClick={onReset} variant="secondary">Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`medichain-card ${dispensed ? 'bg-medimint-50' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className={`flex items-center ${dispensed ? 'text-medimint-700' : ''}`}>
              {dispensed ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-medimint-600" />
              ) : (
                <ClipboardCheck className="mr-2 h-5 w-5" />
              )}
              {dispensed ? 'Prescription Dispensed' : 'Prescription Verified'}
            </CardTitle>
            <p className="text-sm text-medineutral-600 mt-1">Token: {prescription.tokenId}</p>
          </div>
          <Badge 
            className={prescription.status === 'active' ? 'bg-medimint-500' : 'bg-medineutral-400'}
          >
            {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Patient Info */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Patient Information</h3>
          <div className="bg-white rounded-md p-4 border border-medineutral-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-medineutral-500">Patient Name</p>
                <p className="font-medium">{prescription.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-medineutral-500">Age</p>
                <p className="font-medium">{prescription.patientAge} years</p>
              </div>
              <div>
                <p className="text-sm text-medineutral-500">Prescribed By</p>
                <p className="font-medium">{prescription.doctorName}</p>
              </div>
              <div>
                <p className="text-sm text-medineutral-500">Disease/Condition</p>
                <p className="font-medium">{prescription.disease}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Medicines */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Prescribed Medicines</h3>
          <div className="space-y-3">
            {prescription.medicines.map((med, index) => (
              <div key={index} className="bg-white rounded-md p-4 border border-medineutral-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{med.medicine.name}</h4>
                    <p className="text-sm text-medineutral-600">{med.dosage}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-medineutral-100 text-medineutral-800 text-sm px-3 py-1 rounded-full">
                      Qty: {med.quantity}
                    </span>
                    
                    {!med.medicine.available && (
                      <p className="text-xs text-destructive mt-1">Out of stock</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Status Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Prescription Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-md border border-medineutral-200">
              <div className="flex items-center text-medineutral-700 mb-1">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm">Created</span>
              </div>
              <p>{format(new Date(prescription.created), 'MMMM d, yyyy')}</p>
            </div>
            
            <div className="bg-white p-3 rounded-md border border-medineutral-200">
              <div className="flex items-center text-medineutral-700 mb-1">
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm">Valid Until</span>
              </div>
              <p>{format(new Date(prescription.doseValidity), 'MMMM d, yyyy')}</p>
            </div>
            
            <div className="bg-white p-3 rounded-md border border-medineutral-200">
              <div className="flex items-center text-medineutral-700 mb-1">
                <DatabaseBackup className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm">Blockchain Status</span>
              </div>
              <p className="flex items-center">
                {prescription.status === 'active' ? (
                  <>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded mr-2">
                      Valid
                    </span>
                    Active & Ready to Dispense
                  </>
                ) : (
                  <>
                    <span className="bg-medineutral-100 text-medineutral-800 text-xs px-2 py-0.5 rounded mr-2">
                      Used
                    </span>
                    Already Dispensed
                  </>
                )}
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-md border border-medineutral-200">
              <div className="flex items-center text-medineutral-700 mb-1">
                {isLockedToday() ? (
                  <Lock className="h-4 w-4 mr-2" />
                ) : (
                  <Unlock className="h-4 w-4 mr-2" />
                )}
                <span className="font-medium text-sm">Locks & Restrictions</span>
              </div>
              {prescription.lockDates.length > 0 ? (
                <p>
                  {isLockedToday() ? (
                    <span className="text-destructive">Locked today</span>
                  ) : (
                    `${prescription.lockDates.length} lock date(s)`
                  )}
                </p>
              ) : (
                <p>No locks</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Alert for dispensed, locked, or expired prescriptions */}
        {!isDispensable() && !dispensed && (
          <Alert variant={prescription.status !== 'active' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Dispense</AlertTitle>
            <AlertDescription>
              {prescription.status !== 'active'
                ? 'This prescription has already been dispensed.'
                : isLockedToday()
                ? 'This prescription is locked today.'
                : 'This prescription has expired.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Success message for dispensed prescriptions */}
        {dispensed && (
          <Alert className="bg-medimint-50 border-medimint-200 text-medimint-800">
            <CheckSquare className="h-4 w-4 text-medimint-600" />
            <AlertTitle>Successfully Dispensed</AlertTitle>
            <AlertDescription>
              Prescription has been dispensed and the blockchain record has been updated.
              {prescription.dispensedDates.length > 0 && (
                <span className="block mt-1">
                  Dispensed on: {format(new Date(prescription.dispensedDates[prescription.dispensedDates.length - 1]), 'MMMM d, yyyy')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div>
          <Button variant="outline" onClick={onReset} className="mr-2">
            Back
          </Button>
          <Button variant="secondary" onClick={() => setScanMode(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
        </div>
        
        {!dispensed && (
          <Button 
            disabled={!isDispensable() || dispensing}
            onClick={handleDispense}
            className="bg-medimint-600 hover:bg-medimint-700"
          >
            {dispensing ? (
              <span className="flex items-center">
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Dispensing...
              </span>
            ) : (
              <span className="flex items-center">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Dispense Medication
              </span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PrescriptionVerification;
