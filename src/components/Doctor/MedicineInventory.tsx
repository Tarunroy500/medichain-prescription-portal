
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
import { Medicine, PrescriptionService } from '@/services/PrescriptionService';

const MedicineInventory = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await PrescriptionService.getAvailableMedicines();
        setMedicines(data);
      } catch (error) {
        console.error('Failed to load medicines:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

  const getStockBadge = (available: boolean, quantity: number) => {
    if (!available) return <Badge variant="destructive">Out of Stock</Badge>;
    if (quantity < 10) return <Badge className="bg-amber-500">Low Stock</Badge>;
    return <Badge className="bg-medimint-500">In Stock</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medicine Inventory</CardTitle>
          <CardDescription>Loading inventory data...</CardDescription>
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
        <CardTitle>Medicine Inventory</CardTitle>
        <CardDescription>Check medicine availability before prescribing</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>Current inventory status of all medicines.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicines.map((medicine) => (
              <TableRow key={medicine.id}>
                <TableCell className="font-medium">{medicine.name}</TableCell>
                <TableCell className="text-right">{medicine.quantity}</TableCell>
                <TableCell className="text-right">{getStockBadge(medicine.available, medicine.quantity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MedicineInventory;
