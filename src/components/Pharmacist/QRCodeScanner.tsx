import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { QrCode, FileText, AlertCircle, ArrowRight, Camera, RefreshCw } from 'lucide-react';

interface QRCodeScannerProps {
  onTokenDetected: (token: string) => void;
}

const QRCodeScanner = ({ onTokenDetected }: QRCodeScannerProps) => {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualToken, setManualToken] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for HTTPS
  const isSecureContext = window.isSecureContext;
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

  useEffect(() => {
    // Check for camera permissions
    const checkCameraPermission = async () => {
      try {
        setIsLoading(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (cameras.length === 0) {
          setCameraError('No camera detected on this device');
          setPermissionGranted(false);
          return;
        }
        
        // Try to access the camera to trigger permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode } 
        });
        
        // If we got here, permission was granted
        setPermissionGranted(true);
        
        // Clean up the stream
        stream.getTracks().forEach(track => track.stop());
        
      } catch (err: any) {
        console.error('Camera permission error:', err);
        setPermissionGranted(false);
        
        // Set appropriate error message
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please grant camera permissions.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setCameraError('Camera is already in use by another application.');
        } else if (!isSecureContext && !isLocalhost) {
          setCameraError('Camera access requires HTTPS. Using this feature over HTTP is only supported on localhost.');
        } else {
          setCameraError(`Camera error: ${err.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkCameraPermission();
  }, [facingMode]);

  const handleScan = (result: any, error: any) => {
    if (!!result) {
      const text = result?.text;
      setData(text);
      
      // Simple validation: check if the scanned text matches the expected format
      if (text && text.startsWith('RX-')) {
        onTokenDetected(text);
      } else if (text) {
        setError('Invalid QR code format. Please scan a valid prescription QR code.');
      }
    }

    if (!!error) {
      console.error('QR scan error:', error);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setError('Please enter a prescription token');
      return;
    }
    
    if (!manualToken.startsWith('RX-')) {
      setError('Invalid token format. Tokens should start with RX-');
      return;
    }
    
    onTokenDetected(manualToken.trim());
  };

  const toggleCamera = () => {
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
  };

  const requestCameraPermission = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      
      // If we got here, permission was granted
      setPermissionGranted(true);
      
      // Clean up the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error('Failed to get camera permission:', err);
      setCameraError('Camera permission denied. Please check your browser settings.');
    }
  };

  const renderCameraContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64 bg-medineutral-50 rounded-md border border-medineutral-200">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mediblue-500 mb-2"></div>
            <p className="text-sm text-medineutral-600">Initializing camera...</p>
          </div>
        </div>
      );
    }

    if (!isSecureContext && !isLocalhost) {
      return (
        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="font-medium mb-2">Secure Context Required</h3>
          <p className="text-sm mb-4">
            Camera access requires HTTPS. You're currently using an insecure connection which prevents camera access.
          </p>
          <div className="text-sm text-medineutral-600 mt-2">
            Please try one of these options:
            <ul className="list-disc list-inside mt-2 text-left">
              <li>Switch to the manual token entry tab</li>
              <li>Access this page using HTTPS</li>
              <li>Use localhost instead of IP address</li>
            </ul>
          </div>
        </div>
      );
    }

    if (cameraError) {
      return (
        <div className="p-6 text-center bg-medineutral-50 border border-medineutral-200 rounded-md">
          <Camera className="h-10 w-10 text-medineutral-400 mx-auto mb-2" />
          <h3 className="font-medium mb-2">Camera Access Issue</h3>
          <p className="text-sm mb-4">{cameraError}</p>
          <Button 
            variant="outline" 
            onClick={requestCameraPermission}
            className="mx-auto flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    if (permissionGranted) {
      return (
        <div className="qr-reader-container">
          <QrReader
            onResult={handleScan}
            constraints={{ 
              facingMode,
              aspectRatio: 1
            }}
            videoStyle={{ 
              width: '100%',
              height: 'auto',
              borderRadius: '8px'
            }}
            containerStyle={{
              width: '100%',
              maxWidth: '100%',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            scanDelay={500}
          />
          <div className="mt-4 flex justify-between flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={toggleCamera}
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Switch Camera
            </Button>
            <div className="text-sm text-medineutral-500 flex items-center">
              {data ? `Detected: ${data}` : 'Position QR code in frame'}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 text-center bg-medineutral-50 border border-medineutral-200 rounded-md">
        <Camera className="h-10 w-10 text-medineutral-400 mx-auto mb-2" />
        <h3 className="font-medium mb-2">Camera Permission Required</h3>
        <p className="text-sm mb-4">Please allow camera access to scan prescription QR codes.</p>
        <Button 
          onClick={requestCameraPermission}
          className="mx-auto"
        >
          Grant Permission
        </Button>
      </div>
    );
  };

  return (
    <Card className="medichain-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="mr-2 h-5 w-5" />
          Prescription Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scan" className="flex items-center gap-1">
              <QrCode className="h-4 w-4" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Enter Token
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="min-h-[300px]">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {renderCameraContent()}
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Prescription Token</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter token (e.g., RX-ABC12345)"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="font-mono"
                  />
                  <Button type="submit">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-medineutral-600">
                Enter the prescription token exactly as shown on the patient's prescription
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
