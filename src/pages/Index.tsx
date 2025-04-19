
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import MainLayout from '@/components/Layout/MainLayout';

const Index = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default Index;
