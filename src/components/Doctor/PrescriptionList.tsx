
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Prescription, PrescriptionService } from '@/services/PrescriptionService';
import { useAuth } from '@/contexts/AuthContext';

const PrescriptionList = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        let data: Prescription[] = [];
        if (user?.id) {
          data = await PrescriptionService.getDoctorPrescriptions(user.id);
        } else {
          data = await PrescriptionService.getAllPrescriptions();
        }
        setPrescriptions(data);
      } catch (error) {
        console.error('Failed to load prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-medimint-500">Active</Badge>;
      case 'dispensed':
        return <Badge variant="outline" className="text-medineutral-500 border-medineutral-300">Dispensed</Badge>;
      case 'locked':
        return <Badge variant="secondary" className="bg-medineutral-200 text-medineutral-700">Locked</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prescription History</CardTitle>
          <CardDescription>Loading prescription records...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(3).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescription History</CardTitle>
        <CardDescription>View all prescriptions you've created</CardDescription>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <div className="text-center py-6 text-medineutral-500">
            No prescriptions found.
          </div>
        ) : (
          <Table>
            <TableCaption>A list of your recent prescriptions.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Token ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Disease</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((prescription) => (
                <TableRow key={prescription.id}>
                  <TableCell className="font-medium">{prescription.tokenId}</TableCell>
                  <TableCell>{prescription.patientName}</TableCell>
                  <TableCell>{prescription.disease}</TableCell>
                  <TableCell>{format(new Date(prescription.created), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionList;
