import { toast } from 'sonner';
import { Web3Service } from './Web3Service';

// Define medicine interface
export interface Medicine {
  id: string;
  name: string;
  available: boolean;
  quantity: number;
}

// Define prescription interval
export type DoseInterval = 'daily' | 'weekly' | 'monthly' | 'one-time';

// Define prescription status
export type PrescriptionStatus = 'active' | 'dispensed' | 'expired' | 'locked';

// Define prescription interface
export interface Prescription {
  id: string;
  tokenId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  doctorId: string;
  doctorName: string;
  disease: string;
  medicines: {
    medicine: Medicine;
    quantity: number;
    dosage: string;
  }[];
  doseInterval: DoseInterval;
  doseValidity: Date;
  created: Date;
  lockDates: Date[];
  status: PrescriptionStatus;
  nextValidDose: Date | null;
  dispensedDates: Date[];
  // New blockchain-related fields
  blockchainTxHash?: string;
  ethereumAddress?: string;
}

// Mock medicines data
export const medicines: Medicine[] = [
  { id: '1', name: 'Amoxicillin 500mg', available: true, quantity: 150 },
  { id: '2', name: 'Lisinopril 10mg', available: true, quantity: 200 },
  { id: '3', name: 'Metformin 850mg', available: false, quantity: 0 },
  { id: '4', name: 'Atorvastatin 20mg', available: true, quantity: 80 },
  { id: '5', name: 'Albuterol Inhaler', available: true, quantity: 45 },
  { id: '6', name: 'Levothyroxine 50mcg', available: true, quantity: 120 },
  { id: '7', name: 'Prednisone 5mg', available: true, quantity: 60 },
  { id: '8', name: 'Gabapentin 300mg', available: false, quantity: 0 },
];

// Generate prescription token - enhanced with blockchain compatibility
export function generatePrescriptionToken(): string {
  // For UI display, we'll continue to use human-readable tokens
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'RX-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create mock prescriptions
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);
const lastWeek = new Date(today);
lastWeek.setDate(today.getDate() - 7);
const twoWeeksAgo = new Date(today);
twoWeeksAgo.setDate(today.getDate() - 14);

// Mock prescriptions data
let mockPrescriptions: Prescription[] = [
  {
    id: '1',
    tokenId: 'RX-ABC12345',
    patientId: '2',
    patientName: 'Jane Doe',
    patientAge: 35,
    doctorId: '1',
    doctorName: 'Dr. John Smith',
    disease: 'Hypertension',
    medicines: [
      { 
        medicine: medicines[1], // Lisinopril
        quantity: 30, 
        dosage: '1 tablet daily'
      },
      { 
        medicine: medicines[3], // Atorvastatin
        quantity: 30, 
        dosage: '1 tablet at bedtime'
      }
    ],
    doseInterval: 'monthly',
    doseValidity: nextWeek,
    created: twoWeeksAgo,
    lockDates: [],
    status: 'active',
    nextValidDose: today,
    dispensedDates: [twoWeeksAgo],
  },
  {
    id: '2',
    tokenId: 'RX-DEF67890',
    patientId: '2',
    patientName: 'Jane Doe',
    patientAge: 35,
    doctorId: '1',
    doctorName: 'Dr. John Smith',
    disease: 'Bacterial Infection',
    medicines: [
      { 
        medicine: medicines[0], // Amoxicillin
        quantity: 21, 
        dosage: '1 capsule three times daily'
      }
    ],
    doseInterval: 'one-time',
    doseValidity: lastWeek,
    created: twoWeeksAgo,
    lockDates: [],
    status: 'dispensed',
    nextValidDose: null,
    dispensedDates: [lastWeek],
  }
];

// Helper to convert dose interval to seconds for smart contract
const doseIntervalToSeconds = (interval: DoseInterval): number => {
  switch (interval) {
    case 'daily':
      return 24 * 60 * 60;
    case 'weekly':
      return 7 * 24 * 60 * 60;
    case 'monthly':
      return 30 * 24 * 60 * 60;
    case 'one-time':
    default:
      return 0; // One-time prescriptions don't have an interval
  }
};

// PrescriptionService for handling prescriptions
export const PrescriptionService = {
  // Get all prescriptions
  getAllPrescriptions: (): Promise<Prescription[]> => {
    return Promise.resolve(mockPrescriptions);
  },

  // Get prescriptions by doctor
  getDoctorPrescriptions: (doctorId: string): Promise<Prescription[]> => {
    return Promise.resolve(
      mockPrescriptions.filter(p => p.doctorId === doctorId)
    );
  },

  // Get prescriptions by patient
  getPatientPrescriptions: (patientId: string): Promise<Prescription[]> => {
    return Promise.resolve(
      mockPrescriptions.filter(p => p.patientId === patientId)
    );
  },

  // Get prescription by token
  getPrescriptionByToken: (token: string): Promise<Prescription | null> => {
    // Clean the token in case it comes from a QR code with whitespace
    const cleanToken = token.trim();
    const prescription = mockPrescriptions.find(p => p.tokenId === cleanToken);
    return Promise.resolve(prescription || null);
  },

  // Create new prescription with blockchain integration
  createPrescription: async (prescriptionData: Omit<Prescription, 'id' | 'tokenId' | 'status' | 'nextValidDose' | 'dispensedDates'>): Promise<Prescription> => {
    // Generate a random token for UI
    const uiToken = generatePrescriptionToken();
    
    // Generate a random blockchain-compatible token (bytes32)
    const blockchainToken = Web3Service.generateTokenForContract();
    
    // Store the mapping between UI token and blockchain token
    Web3Service.storeTokenMapping(uiToken, blockchainToken);
    
    // Get connected wallet state
    const web3State = Web3Service.getState();
    let blockchainTxHash: string | null = null;
    
    // Create the prescription object
    const newPrescription: Prescription = {
      ...prescriptionData,
      id: String(mockPrescriptions.length + 1),
      tokenId: uiToken,
      status: 'active',
      nextValidDose: new Date(),
      dispensedDates: [],
    };

    // If wallet is connected, try to send to blockchain
    if (web3State.isConnected || true) { // Always try to use either direct connection or backend API
      try {
        // We'll use the first medicine as the primary one for the blockchain
        // (The contract's data model is simpler than our UI model)
        const primaryMedicine = prescriptionData.medicines[0];
        
        // Patient address - in a real app, we would have a mapping of patient IDs to wallet addresses
        // For now, let's use a dummy patient address for demo purposes
        // In production, this would come from the patient's actual Ethereum address
        const patientAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Replace with actual patient address
        
        // Convert our dose interval to seconds for the smart contract
        const intervalSeconds = doseIntervalToSeconds(prescriptionData.doseInterval);
        
        // Send to blockchain (will try direct connection or backend API)
        blockchainTxHash = await Web3Service.createPrescription(
          blockchainToken,
          patientAddress,
          prescriptionData.disease,
          primaryMedicine.medicine.name,
          primaryMedicine.quantity,
          intervalSeconds
        );
        
        if (blockchainTxHash) {
          newPrescription.blockchainTxHash = blockchainTxHash;
          newPrescription.ethereumAddress = web3State.address || undefined;
        }
      } catch (error) {
        console.error("Blockchain error:", error);
        toast.error("Failed to record prescription on blockchain", {
          description: "The prescription was created locally only."
        });
      }
    } else {
      toast.warning("Wallet not connected", {
        description: "Prescription created locally only. Connect wallet to record on blockchain."
      });
    }

    mockPrescriptions = [...mockPrescriptions, newPrescription];
    toast.success('Prescription created successfully');
    return Promise.resolve(newPrescription);
  },

  // Dispense prescription with blockchain integration
  dispensePrescription: async (tokenId: string): Promise<Prescription> => {
    const index = mockPrescriptions.findIndex(p => p.tokenId === tokenId);
    
    if (index === -1) {
      toast.error('Prescription not found');
      return Promise.reject(new Error('Prescription not found'));
    }

    const prescription = { ...mockPrescriptions[index] };
    
    // Check if already dispensed
    if (prescription.status === 'dispensed') {
      toast.error('This prescription has already been dispensed');
      return Promise.reject(new Error('Already dispensed'));
    }
    
    // Check if locked
    const now = new Date();
    if (prescription.lockDates.some(date => date.getTime() > now.getTime())) {
      toast.error('This prescription is currently locked');
      return Promise.reject(new Error('Prescription locked'));
    }

    // Try to update on blockchain if connected
    const web3State = Web3Service.getState();
    if ((web3State.isConnected || true) && prescription.blockchainTxHash) {
      try {
        // Get the blockchain token from the UI token
        const blockchainToken = Web3Service.getBlockchainToken(tokenId) || 
                              Web3Service.generateTokenForContract(); // Fallback if mapping not found
        
        const success = await Web3Service.dispensePrescription(blockchainToken);
        if (!success) {
          toast.error('Blockchain verification failed');
          return Promise.reject(new Error('Blockchain verification failed'));
        }
      } catch (error) {
        console.error("Blockchain error during dispensing:", error);
        toast.error("Failed to update blockchain record", {
          description: "Please try again or contact support."
        });
        return Promise.reject(new Error('Blockchain update failed'));
      }
    }

    // Update prescription
    prescription.status = 'dispensed';
    prescription.dispensedDates = [...prescription.dispensedDates, new Date()];
    prescription.nextValidDose = null;
    
    // Update the array
    mockPrescriptions = [
      ...mockPrescriptions.slice(0, index),
      prescription,
      ...mockPrescriptions.slice(index + 1)
    ];
    
    // Update medicine inventory
    prescription.medicines.forEach(med => {
      const medicineIndex = medicines.findIndex(m => m.id === med.medicine.id);
      if (medicineIndex >= 0) {
        medicines[medicineIndex].quantity -= med.quantity;
        if (medicines[medicineIndex].quantity <= 0) {
          medicines[medicineIndex].available = false;
        }
      }
    });

    toast.success('Prescription dispensed successfully');
    return Promise.resolve(prescription);
  },

  // Get available medicines
  getAvailableMedicines: (): Promise<Medicine[]> => {
    return Promise.resolve(medicines);
  },

  // Check if prescription token is valid
  verifyPrescriptionToken: (token: string): Promise<boolean> => {
    const cleanToken = token.trim();
    const prescription = mockPrescriptions.find(p => p.tokenId === cleanToken);
    return Promise.resolve(!!prescription && prescription.status === 'active');
  }
};
