import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';
import {DrData} from '../../data/DrData'

// Define form schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['doctor', 'patient', 'pharmacist']),
  license: z.string().optional(),
});

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
  role: z.enum(['doctor', 'patient', 'pharmacist']),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formType, setFormType] = useState<'login' | 'signup'>('login');
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const { login, signup } = useAuth();

  // Initialize login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'doctor',
      license: '',
    },
  });

  // Initialize signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'doctor',
    },
  });

  // Handle login submit
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLicenseError(null); // Reset any previous errors
    
    try {
      console.log("drdata", DrData);
      
      // Check license for doctors against DrData
      if (data.role === 'doctor' && data.license) {
        const doctorExists = DrData.some(doctor => doctor.license === data.license);
        if (!doctorExists) {
          setLicenseError("Invalid doctor license. Please check and try again.");
          setIsLoading(false);
          return;
        }
      }
      
      await login(data.email, data.password, data.role as UserRole);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup submit
  const onSignupSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      await signup(data.name, data.email, data.password, data.role as UserRole);
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // For demo purposes, prefill form with mock data
  const fillWithMockData = (role: UserRole) => {
    if (formType === 'login') {
      loginForm.setValue('email', `${role}@example.com`);
      loginForm.setValue('password', 'password123');
      loginForm.setValue('role', role);
      
      // Set a mock license for doctors
      if (role === 'doctor') {
        // Assuming DrData has at least one doctor with a license
        if (DrData.length > 0) {
          loginForm.setValue('license', DrData[0].license);
        } else {
          loginForm.setValue('license', 'DL18793');
        }
      } else {
        loginForm.setValue('license', '');
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <div className="bg-mediblue-500 text-white p-2 rounded-full">
            <Lock size={24} />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Welcome to MediChain</CardTitle>
        <CardDescription className="text-center">
          Secure blockchain-based prescription management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={formType} onValueChange={(value) => setFormType(value as 'login' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Form {...loginForm}>
              {licenseError && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <span className="block sm:inline">{licenseError}</span>
                </div>
              )}
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={loginForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select your role</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="doctor" onClick={() => fillWithMockData('doctor')} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Doctor</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="patient" onClick={() => fillWithMockData('patient')} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Patient</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pharmacist" onClick={() => fillWithMockData('pharmacist')} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Pharmacist</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="license"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dr Licence Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ex DL18793" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full bg-mediblue-500 hover:bg-mediblue-600" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  Demo credentials available: doctor@example.com, patient@example.com, pharmacist@example.com (password: password123)
                </p>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={signupForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select your role</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="doctor" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Doctor</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="patient" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Patient</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pharmacist" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Pharmacist</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col">
        <p className="text-sm text-center text-medineutral-500">
          Powered by blockchain technology for secure medication tracking
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
