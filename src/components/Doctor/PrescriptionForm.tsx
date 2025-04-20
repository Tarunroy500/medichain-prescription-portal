import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Plus, Minus, FileText, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PrescriptionService, medicines, DoseInterval } from '@/services/PrescriptionService';
import { toast } from 'sonner';
import { AlertCircle, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define selected medicine type
interface SelectedMedicine {
  medicineId: string;
  quantity: number;
  dosage: string;
}

// Define form schema
const prescriptionSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name is required' }),
  patientAge: z.coerce.number().int().min(0, { message: 'Age must be a positive number' }),
  disease: z.string().min(2, { message: 'Disease/condition is required' }),
  doseInterval: z.enum(['daily', 'weekly', 'monthly', 'one-time']),
  doseValidity: z.date({ required_error: 'Please select a validity date' }),
  lockDates: z.array(z.date()).optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

const PrescriptionForm = () => {
  const { user, isWalletConnected, connectWallet } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);
  const [medicineId, setMedicineId] = useState('');
  const [medicineQuantity, setMedicineQuantity] = useState(1);
  const [medicineDosage, setMedicineDosage] = useState('');
  const [lockDates, setLockDates] = useState<Date[]>([]);
  const [prescriptionCreated, setPrescriptionCreated] = useState(false);
  const [prescriptionToken, setPrescriptionToken] = useState('');
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientName: '',
      patientAge: undefined,
      disease: '',
      doseInterval: 'one-time',
      doseValidity: new Date(),
      lockDates: [],
    },
  });

  // Handle medicine add
  const handleAddMedicine = () => {
    if (!medicineId) {
      toast.error('Please select a medicine');
      return;
    }
    if (medicineQuantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (!medicineDosage.trim()) {
      toast.error('Please enter dosage instructions');
      return;
    }

    // Check if medicine is available
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine || !medicine.available) {
      toast.error('Selected medicine is unavailable');
      return;
    }

    const newMedicine: SelectedMedicine = {
      medicineId,
      quantity: medicineQuantity,
      dosage: medicineDosage,
    };

    setSelectedMedicines([...selectedMedicines, newMedicine]);
    
    // Reset form fields
    setMedicineId('');
    setMedicineQuantity(1);
    setMedicineDosage('');
  };

  // Handle remove medicine
  const handleRemoveMedicine = (index: number) => {
    const updatedMedicines = [...selectedMedicines];
    updatedMedicines.splice(index, 1);
    setSelectedMedicines(updatedMedicines);
  };

  // Handle add lock date
  const handleAddLockDate = (date: Date | undefined) => {
    if (date) {
      setLockDates([...lockDates, date]);
      form.setValue('lockDates', [...lockDates, date]);
    }
  };

  // Handle remove lock date
  const handleRemoveLockDate = (index: number) => {
    const updatedDates = [...lockDates];
    updatedDates.splice(index, 1);
    setLockDates(updatedDates);
    form.setValue('lockDates', updatedDates);
  };

  // Handle form submission
  const onSubmit = async (data: PrescriptionFormValues) => {
    if (selectedMedicines.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    setIsLoading(true);
    try {
      // Create prescription object
      const prescriptionData = {
        patientName: data.patientName,
        patientAge: data.patientAge,
        patientId: '2', // In a real app, this would come from patient selection
        doctorId: user?.id || '1',
        doctorName: user?.name || 'Doctor',
        disease: data.disease,
        medicines: selectedMedicines.map(sm => {
          const med = medicines.find(m => m.id === sm.medicineId);
          return {
            medicine: med || medicines[0],
            quantity: sm.quantity,
            dosage: sm.dosage
          };
        }),
        doseInterval: data.doseInterval as DoseInterval,
        doseValidity: data.doseValidity,
        created: new Date(),
        lockDates: lockDates,
      };

      // Call the service
      const prescription = await PrescriptionService.createPrescription(prescriptionData);
      
      // Set token and show success
      setPrescriptionToken(prescription.tokenId);
      setPrescriptionCreated(true);
      
      // Store the blockchain transaction hash if available
      if (prescription.blockchainTxHash) {
        setBlockchainTxHash(prescription.blockchainTxHash);
      }
      
      toast.success(`Prescription created with token: ${prescription.tokenId}`);

    } catch (error) {
      toast.error('Failed to create prescription');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset form
  const handleReset = () => {
    form.reset();
    setSelectedMedicines([]);
    setMedicineId('');
    setMedicineQuantity(1);
    setMedicineDosage('');
    setLockDates([]);
    setPrescriptionCreated(false);
    setPrescriptionToken('');
  };

  return (
    <Card className="medichain-card">
      <CardContent className="pt-6">
        {prescriptionCreated ? (
          <div className="text-center space-y-6">
            <div className="mb-4">
              <div className="inline-block p-3 rounded-full bg-medimint-100">
                <FileText className="h-8 w-8 text-medimint-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Prescription Created!</h2>
            <p className="text-medineutral-600 mb-4">
              The prescription has been successfully created and is now available on the blockchain.
            </p>
            <div className="p-4 bg-medineutral-100 rounded-lg border border-medineutral-200 text-center">
              <p className="text-sm text-medineutral-600 mb-2">Prescription Token</p>
              <p className="text-xl font-mono font-bold text-mediblue-700">{prescriptionToken}</p>
            </div>
            
            {blockchainTxHash ? (
              <div className="p-4 bg-medimint-50 rounded-lg border border-medimint-200">
                <p className="text-sm text-medimint-700 mb-2">Blockchain Transaction</p>
                <p className="text-sm font-mono break-all">{blockchainTxHash}</p>
              </div>
            ) : (
              // <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800">
              //   <AlertCircle className="h-4 w-4" />
              //   <AlertDescription>
              //     This prescription was not recorded on the blockchain.
              //     {!isWalletConnected && (
              //       <Button 
              //         variant="outline" 
              //         size="sm" 
              //         onClick={connectWallet}
              //         className="ml-2 bg-amber-100"
              //       >
              //         <Wallet className="h-3 w-3 mr-1" />
              //         Connect Wallet
              //       </Button>
              //     )}
              //   </AlertDescription>
              // </Alert>
              <></>
            )}
            
            <div className="mt-6 flex justify-center">
              <Button onClick={handleReset} className="mr-4">
                Create New Prescription
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!isWalletConnected && (
                <Alert className="bg-mediblue-50 border-mediblue-200">
                  <AlertCircle className="h-4 w-4 text-mediblue-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Connect your wallet to record prescriptions on the blockchain</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={connectWallet}
                      className="bg-mediblue-100 text-mediblue-700 border-mediblue-300"
                    >
                      <Wallet className="h-3 w-3 mr-1" />
                      Connect
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Existing form fields */}
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter patient name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Age" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="disease"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disease/Condition</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hypertension, Diabetes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Add medicine section */}
              <div className="bg-medineutral-50 p-4 rounded-md border border-medineutral-200">
                <h3 className="text-sm font-medium mb-3">Add Medicines</h3>
                
                <div className="grid gap-4 sm:grid-cols-3 mb-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Medicine</label>
                    <Select
                      value={medicineId}
                      onValueChange={setMedicineId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((medicine) => (
                          <SelectItem 
                            key={medicine.id} 
                            value={medicine.id}
                            disabled={!medicine.available}
                          >
                            {medicine.name} {!medicine.available && "(Unavailable)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={medicineQuantity}
                      onChange={(e) => setMedicineQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Dosage</label>
                    <Input
                      placeholder="e.g. 1 tablet twice daily"
                      value={medicineDosage}
                      onChange={(e) => setMedicineDosage(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMedicine}
                  className="flex items-center gap-1"
                >
                  <Plus size={16} /> Add Medicine
                </Button>
                
                {/* Selected medicines list */}
                {selectedMedicines.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Selected Medicines:</h4>
                    {selectedMedicines.map((item, index) => {
                      const medicine = medicines.find(m => m.id === item.medicineId);
                      return (
                        <div 
                          key={index}
                          className="flex justify-between items-center bg-white p-2 rounded border"
                        >
                          <div className="text-sm">
                            <span className="font-medium">{medicine?.name}</span>
                            <span className="text-medineutral-500 mx-1">•</span>
                            <span>Qty: {item.quantity}</span>
                            <span className="text-medineutral-500 mx-1">•</span>
                            <span className="text-medineutral-600">{item.dosage}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMedicine(index)}
                          >
                            <Minus size={16} className="text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="doseInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dose Validity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="one-time">One-time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doseValidity"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Validity End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date > new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Lock Dates Section */}
              <div className="bg-medineutral-50 p-4 rounded-md border border-medineutral-200">
                <div className="flex items-center mb-3">
                  <Lock size={16} className="mr-2 text-medineutral-600" />
                  <h3 className="text-sm font-medium">Prescription Lock Dates (Optional)</h3>
                </div>
                
                <div className="flex items-end gap-3 mb-3">
                  <div className="flex-grow">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span>Add Lock Date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          onSelect={handleAddLockDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Selected lock dates list */}
                {lockDates.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <h4 className="text-sm font-medium">Selected Lock Dates:</h4>
                    {lockDates.map((date, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center bg-white p-2 rounded border"
                      >
                        <div className="text-sm font-medium">
                          {format(date, "PPP")}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLockDate(index)}
                        >
                          <Minus size={16} className="text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="mt-3 text-xs text-medineutral-500">
                  Lock dates prevent the prescription from being dispensed on specified dates.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={handleReset}>
                  Reset
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Prescription'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionForm;
