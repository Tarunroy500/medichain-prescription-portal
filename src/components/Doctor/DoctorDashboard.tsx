
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Database } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from "@/components/ui/separator";
import PrescriptionForm from './PrescriptionForm';
import PrescriptionList from './PrescriptionList';
import MedicineInventory from './MedicineInventory';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');

  // Count stats would be fetched from API in a real app
  const stats = {
    prescriptionsToday: 5,
    activePrescriptions: 12,
    availableMedicines: 45,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h2>
        <p className="text-medineutral-600">Welcome back, {user?.name}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="medichain-card card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions Today</CardTitle>
            <FileText className="h-4 w-4 text-mediblue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prescriptionsToday}</div>
          </CardContent>
        </Card>
        
        <Card className="medichain-card card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-mediblue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrescriptions}</div>
          </CardContent>
        </Card>
        
        <Card className="medichain-card card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Medicines</CardTitle>
            <Database className="h-4 w-4 text-mediblue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableMedicines}</div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-4" />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus size={16} />
            Create Prescription
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <FileText size={16} />
            View Prescriptions
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Database size={16} />
            Inventory
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <PrescriptionForm />
        </TabsContent>
        
        <TabsContent value="view">
          <PrescriptionList />
        </TabsContent>
        
        <TabsContent value="inventory">
          <MedicineInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorDashboard;
