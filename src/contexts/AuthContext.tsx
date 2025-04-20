import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { Web3Service } from '@/services/Web3Service';

// Define user roles
export type UserRole = 'doctor' | 'patient' | 'pharmacist' | null;

// Define user interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ethereumAddress?: string; // New field for wallet address
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  // Wallet related functions
  isWalletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

// Mock users for demo
const mockUsers: User[] = [
  { id: '1', name: 'Dr. John Smith', email: 'doctor@example.com', role: 'doctor' },
  { id: '2', name: 'Jane Doe', email: 'patient@example.com', role: 'patient' },
  { id: '3', name: 'Mark Wilson', email: 'pharmacist@example.com', role: 'pharmacist' },
];

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  switchRole: () => {},
  isWalletConnected: false,
  walletAddress: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Listen for wallet connection changes
  useEffect(() => {
    const unsubscribe = Web3Service.subscribe((state) => {
      setIsWalletConnected(state.isConnected);
      setWalletAddress(state.address);
      
      // If user is already logged in, update their Ethereum address
      if (user && state.address) {
        setUser(prev => prev ? {...prev, ethereumAddress: state.address} : null);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  // Mock login function
  const login = async (email: string, password: string, selectedRole: UserRole): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email && u.role === selectedRole);
    
    if (foundUser) {
      // Update with wallet address if already connected
      const web3State = Web3Service.getState();
      const userWithWallet = {
        ...foundUser,
        ethereumAddress: web3State.address || undefined
      };
      
      setUser(userWithWallet);
      setRole(foundUser.role);
      toast.success(`Welcome back, ${foundUser.name}!`);
    } else {
      toast.error('Invalid login credentials');
      throw new Error('Invalid login credentials');
    }
  };

  // Mock signup function
  const signup = async (name: string, email: string, password: string, selectedRole: UserRole): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const exists = mockUsers.some(u => u.email === email);
    if (exists) {
      toast.error('User already exists');
      throw new Error('User already exists');
    }

    // Get wallet address if connected
    const web3State = Web3Service.getState();
    
    const newUser: User = {
      id: `${mockUsers.length + 1}`,
      name,
      email,
      role: selectedRole,
      ethereumAddress: web3State.address || undefined
    };

    // In a real app, we'd make an API call here
    // Since this is a mock, we'll just update local state
    setUser(newUser);
    setRole(selectedRole);
    toast.success('Account created successfully!');
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setRole(null);
    toast.info('You have been logged out');
    
    // Optionally disconnect wallet on logout
    // Web3Service.disconnectWallet();
  };

  // Switch role function (for demo purposes)
  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    
    const foundUser = mockUsers.find(u => u.role === newRole);
    if (foundUser) {
      // Preserve wallet address when switching roles
      const userWithWallet = {
        ...foundUser,
        ethereumAddress: walletAddress || undefined
      };
      
      setUser(userWithWallet);
      setRole(newRole);
      toast.success(`Switched to ${newRole} role`);
    } else {
      toast.error(`No user found with ${newRole} role`);
    }
  };

  // Connect wallet function
  const connectWallet = async (): Promise<void> => {
    const address = await Web3Service.connectWallet();
    if (address && user) {
      // Update user with wallet address
      setUser(prev => prev ? {...prev, ethereumAddress: address} : null);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    Web3Service.disconnectWallet();
    
    // Update user to remove wallet address
    if (user) {
      setUser(prev => {
        if (!prev) return null;
        const { ethereumAddress, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        switchRole,
        isWalletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
