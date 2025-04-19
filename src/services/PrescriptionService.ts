
import { toast } from 'sonner';

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

// Generate prescription token
export function generatePrescriptionToken(): string {
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
    const prescription = mockPrescriptions.find(p => p.tokenId === token);
    return Promise.resolve(prescription || null);
  },

  // Create new prescription
  createPrescription: (prescriptionData: Omit<Prescription, 'id' | 'tokenId' | 'status' | 'nextValidDose' | 'dispensedDates'>): Promise<Prescription> => {
    const newPrescription: Prescription = {
      ...prescriptionData,
      id: String(mockPrescriptions.length + 1),
      tokenId: generatePrescriptionToken(),
      status: 'active',
      nextValidDose: new Date(),
      dispensedDates: [],
    };

    mockPrescriptions = [...mockPrescriptions, newPrescription];
    toast.success('Prescription created successfully');
    return Promise.resolve(newPrescription);
  },

  // Dispense prescription
  dispensePrescription: (tokenId: string): Promise<Prescription> => {
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
    const prescription = mockPrescriptions.find(p => p.tokenId === token);
    return Promise.resolve(!!prescription && prescription.status === 'active');
  }
};
