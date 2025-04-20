import React from 'react';
import { ethers } from 'ethers';
import contractAbi from '../abi/contract-abi.json';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = '0x391cfacc26c685065ad81f806a74deee26e2da99';

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
        toast.error('Wallet not connected');
        return null;
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
      toast.error('Failed to create prescription on blockchain', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  },

  // Call smart contract to dispense prescription
  dispensePrescription: async (token: string): Promise<boolean> => {
    try {
      if (!web3State.contract || !web3State.isConnected) {
        toast.error('Wallet not connected');
        return false;
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
      toast.error('Failed to dispense prescription', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  // Get prescription details from the contract
  getPrescription: async (token: string): Promise<any> => {
    try {
      if (!web3State.contract || !web3State.isConnected) {
        toast.error('Wallet not connected');
        return null;
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
      toast.error('Failed to retrieve prescription data', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
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
