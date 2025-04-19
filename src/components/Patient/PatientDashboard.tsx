
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import PrescriptionCards from './PrescriptionCards';

const PatientDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Patient Dashboard</h2>
        <p className="text-medineutral-600">Welcome back, {user?.name}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Prescriptions</CardTitle>
            <CardDescription>View and manage your active prescriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <PrescriptionCards />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
