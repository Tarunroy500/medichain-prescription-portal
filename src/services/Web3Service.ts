import React from 'react';
import { ethers } from 'ethers';
import contractAbi from '../abi/contract-abi.json';
import { toast } from 'sonner';
import axios from 'axios';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Update to the correct contract address
const CONTRACT_ADDRESS = '0x391cfacc26c685065ad81f806a74deee26e2da99';
// Backend API URL
const BACKEND_API_URL = 'http://localhost:8000/api';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
}

// Default/initial state
const initialWeb3State: Web3State = {
  provider: null,
  signer: null,
  contract: null,
  address: null,
  chainId: null,
  isConnected: false,
};

// Maintain a singleton state that can be accessed across imports
let web3State: Web3State = { ...initialWeb3State };

// Event callbacks for UI updates
const listeners: Array<(state: Web3State) => void> = [];

// Helper to notify listeners of state changes
const notifyListeners = () => {
  listeners.forEach(listener => listener(web3State));
};

// Map to store UI tokens to blockchain tokens
const tokenMap = new Map<string, string>();

export const Web3Service = {
  // Subscribe to state changes
  subscribe: (listener: (state: Web3State) => void) => {
    listeners.push(listener);
    listener(web3State);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },

  // Get current state snapshot
  getState: (): Web3State => {
    return { ...web3State };
  },
  
  // Check if MetaMask is installed
  isMetaMaskInstalled: (): boolean => {
    return typeof window !== 'undefined' && !!window.ethereum;
  },

  // Connect to MetaMask
  connectWallet: async (): Promise<string | null> => {
    try {
      if (!Web3Service.isMetaMaskInstalled()) {
        toast.error('MetaMask is not installed', {
          description: 'Please install MetaMask to continue',
          action: {
            label: 'Install',
            onClick: () => window.open('https://metamask.io/download/', '_blank'),
          },
        });
        return null;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Setup provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
      
      // Get network info
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();
      
      // Update state
      web3State = {
        provider,
        signer,
        contract,
        address: accounts[0],
        chainId,
        isConnected: true,
      };
      
      // Setup listeners for account and network changes
      window.ethereum.on('accountsChanged', Web3Service.handleAccountsChanged);
      window.ethereum.on('chainChanged', Web3Service.handleChainChanged);
      
      // Notify listeners
      notifyListeners();
      toast.success('Wallet connected!', {
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
      
      return accounts[0];
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      toast.error('Failed to connect wallet', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  },

  // Disconnect wallet
  disconnectWallet: () => {
    // Clean up listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', Web3Service.handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', Web3Service.handleChainChanged);
    }
    
    // Reset state
    web3State = { ...initialWeb3State };
    notifyListeners();
    toast.info('Wallet disconnected');
  },

  // Handle account changes
  handleAccountsChanged: async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      Web3Service.disconnectWallet();
    } else if (web3State.address !== accounts[0]) {
      // Account changed, update state
      web3State = {
        ...web3State,
        address: accounts[0],
      };
      notifyListeners();
      toast.info('Account changed', {
        description: `Switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    }
  },

  // Handle chain/network changes
  handleChainChanged: async (chainId: string) => {
    // Force a page refresh on chain change to prevent inconsistent state
    window.location.reload();
  },

  // Generate a random token for prescriptions (bytes32 format for the smart contract)
  generateTokenForContract: (): string => {
    return ethers.hexlify(ethers.randomBytes(32));
  },

  // Store mapping between UI token and blockchain token
  storeTokenMapping: (uiToken: string, blockchainToken: string): void => {
    tokenMap.set(uiToken, blockchainToken);
  },

  // Get blockchain token from UI token
  getBlockchainToken: (uiToken: string): string | undefined => {
    return tokenMap.get(uiToken);
  },

  // Call smart contract to create prescription
  createPrescription: async (
    token: string,
    patientAddress: string,
    disease: string,
    drug: string,
    quantity: number,
    intervalSec: number
  ): Promise<string | null> => {
    try {
      if (!web3State.contract || !web3State.isConnected) {
        // Try using backend API if direct blockchain connection fails
        return await Web3Service.createPrescriptionViaBackend(
          token, patientAddress, disease, drug, quantity, intervalSec
        );
      }

      // Call the smart contract function
      const tx = await web3State.contract.create_prescription(
        token,
        patientAddress,
        disease,
        drug,
        ethers.toBigInt(quantity),
        ethers.toBigInt(intervalSec)
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      toast.success('Prescription created on blockchain', {
        description: `Transaction: ${receipt.hash.slice(0, 6)}...${receipt.hash.slice(-4)}`,
      });
      
      return receipt.hash;
    } catch (error) {
      console.error('Error creating prescription on blockchain:', error);
      
      // Try using backend as fallback if direct method fails
      try {
        return await Web3Service.createPrescriptionViaBackend(
          token, patientAddress, disease, drug, quantity, intervalSec
        );
      } catch (backendError) {
        console.error('Backend fallback also failed:', backendError);
        toast.error('Failed to create prescription on blockchain', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    }
  },

  // Create prescription via backend API
  createPrescriptionViaBackend: async (
    token: string,
    patientAddress: string,
    disease: string,
    drug: string,
    quantity: number,
    intervalSec: number
  ): Promise<string | null> => {
    try {
      const response = await axios.post(`${BACKEND_API_URL}/prescriptions`, {
        token,
        patient: patientAddress,
        disease,
        drug,
        quantity,
        interval: intervalSec
      });
      
      if (response.data && response.data.status === 'ok') {
        toast.success('Prescription created via backend API', {
          description: `Transaction: ${response.data.tx.slice(0, 6)}...${response.data.tx.slice(-4)}`
        });
        return response.data.tx;
      }
      
      throw new Error('Backend API returned an error');
    } catch (error) {
      console.error('Error using backend API:', error);
      toast.error('Failed to create prescription via backend', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  },

  // Call smart contract to dispense prescription
  dispensePrescription: async (token: string): Promise<boolean> => {
    try {
      if (!web3State.contract || !web3State.isConnected) {
        // Try using backend API if direct blockchain connection fails
        return await Web3Service.dispensePrescriptionViaBackend(token);
      }

      // Call the smart contract function
      const tx = await web3State.contract.dispense(token);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      const success = receipt.status === 1;
      if (success) {
        toast.success('Prescription dispensed on blockchain', {
          description: `Transaction: ${receipt.hash.slice(0, 6)}...${receipt.hash.slice(-4)}`,
        });
      } else {
        toast.error('Failed to dispense prescription');
      }
      
      return success;
    } catch (error) {
      console.error('Error dispensing prescription on blockchain:', error);
      
      // Try using backend as fallback
      try {
        return await Web3Service.dispensePrescriptionViaBackend(token);
      } catch (backendError) {
        console.error('Backend fallback also failed:', backendError);
        toast.error('Failed to dispense prescription', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
      }
    }
  },

  // Dispense prescription via backend API
  dispensePrescriptionViaBackend: async (token: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${BACKEND_API_URL}/dispense`, { token });
      
      if (response.data && response.data.status) {
        toast.success('Prescription dispensed via backend API');
        return true;
      }
      
      toast.error('Failed to dispense prescription via backend');
      return false;
    } catch (error) {
      console.error('Error dispensing via backend API:', error);
      toast.error('Failed to dispense via backend', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  },

  // Get prescription details from the contract
  getPrescription: async (token: string): Promise<any> => {
    try {
      if (!web3State.contract || !web3State.isConnected) {
        // Try using backend API if direct blockchain connection fails
        return await Web3Service.getPrescriptionViaBackend(token);
      }

      const data = await web3State.contract.get_prescription(token);
      
      // Format the returned data into a more usable object
      return {
        doctor: data[0],
        patient: data[1],
        disease: data[2],
        drug: data[3],
        quantity: Number(data[4]),
        interval: Number(data[5]),
        lastDispensed: new Date(Number(data[6]) * 1000),
        remaining: Number(data[7]),
      };
    } catch (error) {
      console.error('Error getting prescription from blockchain:', error);
      
      // Try using backend as fallback
      try {
        return await Web3Service.getPrescriptionViaBackend(token);
      } catch (backendError) {
        console.error('Backend fallback also failed:', backendError);
        toast.error('Failed to retrieve prescription data', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    }
  },

  // Get prescription via backend API
  getPrescriptionViaBackend: async (token: string): Promise<any> => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/prescriptions/${token}`);
      
      if (response.data) {
        // Format the data to match the structure from the blockchain
        return {
          doctor: response.data[0],
          patient: response.data[1],
          disease: response.data[2],
          drug: response.data[3],
          quantity: Number(response.data[4]),
          interval: Number(response.data[5]),
          lastDispensed: new Date(Number(response.data[6]) * 1000),
          remaining: Number(response.data[7]),
        };
      }
      
      throw new Error('Backend API returned invalid data');
    } catch (error) {
      console.error('Error getting prescription via backend API:', error);
      throw error;
    }
  }
};

// Hook for React components to use Web3Service
export function useWeb3() {
  const [state, setState] = React.useState<Web3State>(web3State);

  React.useEffect(() => {
    return Web3Service.subscribe(setState);
  }, []);

  return {
    ...state,
    connectWallet: Web3Service.connectWallet,
    disconnectWallet: Web3Service.disconnectWallet,
    isMetaMaskInstalled: Web3Service.isMetaMaskInstalled,
  };
}
