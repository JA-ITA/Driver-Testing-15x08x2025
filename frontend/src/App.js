import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Calendar } from './components/ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { CalendarIcon, User, Users, FileCheck, Shield, Settings, Camera, CheckCircle, XCircle, Clock, LogOut, Home, BookOpen, Plus, Upload, Eye, Edit, Trash2, FileText, Play, Target, UserCheck, ClipboardCheck, BarChart3, Layers, Award, RefreshCw, AlertTriangle, Calendar as CalendarIcon2, History, X, FileX, Download, Database, Cog } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await axios.post(`${API}/auth/login`, formData);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 backdrop-blur-sm bg-white/90">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Welcome Back</CardTitle>
          <CardDescription className="text-slate-600">
            Island Traffic Authority Login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="your.email@domain.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              New candidate?{' '}
              <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Register here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    date_of_birth: '',
    home_address: '',
    trn: '',
    photograph: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photograph: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/candidates/register`, formData);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 backdrop-blur-sm bg-white/90">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Registration Successful!</CardTitle>
            <CardDescription className="text-slate-600">
              Your application has been submitted and is pending approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600">
              You will receive an email once your application is reviewed by our staff.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/90">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Candidate Registration</CardTitle>
            <CardDescription className="text-slate-600">
              Please fill in all required information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-slate-700">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-slate-700">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_address" className="text-slate-700">Home Address *</Label>
                <Textarea
                  id="home_address"
                  name="home_address"
                  value={formData.home_address}
                  onChange={handleInputChange}
                  required
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trn" className="text-slate-700">TRN (Taxpayer Registration Number) *</Label>
                <Input
                  id="trn"
                  name="trn"
                  value={formData.trn}
                  onChange={handleInputChange}
                  required
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="000-000-000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photograph" className="text-slate-700">Photograph</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="photograph"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <Camera className="h-5 w-5 text-slate-400" />
                </div>
                {formData.photograph && (
                  <img
                    src={formData.photograph}
                    alt="Preview"
                    className="mt-2 h-20 w-20 object-cover rounded-lg border-2 border-slate-200"
                  />
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200"
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Dashboard Layout Component
const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();

  const getNavigationItems = () => {
    const baseItems = [
      { label: 'Dashboard', path: '/dashboard', icon: Home }
    ];

    if (user.role === 'Candidate') {
      return [
        ...baseItems,
        { label: 'My Profile', path: '/profile', icon: User },
        { label: 'My Appointments', path: '/my-appointments', icon: Calendar },
        { label: 'Book Appointment', path: '/book-appointment', icon: Plus },
        { label: 'Take Test', path: '/tests', icon: Play },
        // Phase 7: Candidate resit management
        { label: 'My Resits', path: '/my-resits', icon: RefreshCw },
        { label: 'Reschedule Appointment', path: '/reschedule-appointment', icon: History }
      ];
    } else {
      const staffItems = [
        ...baseItems,
        { label: 'Candidates', path: '/candidates', icon: Users },
        { label: 'Pending Approvals', path: '/approvals', icon: FileCheck }
      ];
      
      // Phase 5: Identity Verification for Officers, Managers, and Administrators
      if (user.role in ['Driver Assessment Officer', 'Manager', 'Administrator']) {
        staffItems.push(
          { label: 'Identity Verification', path: '/verify-identity', icon: Shield }
        );
      }
      
      // Question Bank items for staff
      if (user.role === 'Administrator') {
        staffItems.push(
          { label: 'Test Categories', path: '/categories', icon: BookOpen },
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Question Approvals', path: '/question-approvals', icon: CheckCircle },
          { label: 'Test Configurations', path: '/test-configs', icon: Settings },
          { label: 'Test Management', path: '/test-management', icon: FileCheck },
          { label: 'Schedule Management', path: '/schedule-management', icon: Clock },
          { label: 'User Management', path: '/user-management', icon: Users },
          // Phase 6: Multi-Stage Testing System
          { label: 'Multi-Stage Tests', path: '/multi-stage-configs', icon: Layers },
          { label: 'Evaluation Criteria', path: '/evaluation-criteria', icon: Target },
          { label: 'Officer Assignments', path: '/officer-assignments', icon: UserCheck },
          { label: 'Multi-Stage Analytics', path: '/multi-stage-analytics', icon: BarChart3 },
          // Phase 7: Special Tests & Resit Management
          { label: 'Special Test Categories', path: '/special-test-categories', icon: Award },
          { label: 'Special Test Configs', path: '/special-test-configs', icon: Settings },
          { label: 'Resit Management', path: '/resit-management', icon: RefreshCw },
          { label: 'Failed Stages Analytics', path: '/failed-stages-analytics', icon: AlertTriangle }
        );
      } else if (user.role === 'Regional Director') {
        staffItems.push(
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Question Approvals', path: '/question-approvals', icon: CheckCircle },
          { label: 'Test Configurations', path: '/test-configs', icon: Settings },
          { label: 'Test Management', path: '/test-management', icon: FileCheck }
        );
      } else if (user.role in ['Driver Assessment Officer', 'Manager']) {
        staffItems.push(
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Create Question', path: '/create-question', icon: Plus }
        );
        
        if (user.role === 'Manager') {
          staffItems.push(
            { label: 'Test Configurations', path: '/test-configs', icon: Settings },
            { label: 'Test Management', path: '/test-management', icon: FileCheck },
            // Phase 6: Manager access to officer assignments and analytics
            { label: 'Officer Assignments', path: '/officer-assignments', icon: UserCheck },
            { label: 'Multi-Stage Analytics', path: '/multi-stage-analytics', icon: BarChart3 },
            // Phase 7: Manager access to resit management
            { label: 'Resit Management', path: '/resit-management', icon: RefreshCw }
          );
        } else {
          staffItems.push(
            { label: 'Test Management', path: '/test-management', icon: FileCheck },
            // Phase 6: Officer access to their assignments and evaluations
            { label: 'My Assignments', path: '/my-assignments', icon: ClipboardCheck }
          );
        }
      }
      
      return staffItems;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ITA License System</h1>
                <p className="text-sm text-slate-600">Island Traffic Authority</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                <p className="text-xs text-slate-600">{user.role}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {user.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {getNavigationItems().map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Welcome back, {user.full_name}</h2>
          <p className="text-slate-600 mt-1">Here's what's happening with your account today.</p>
        </div>

        {user.role === 'Candidate' ? (
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  <span>Application Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Badge className={`px-3 py-1 ${getStatusColor(stats.profile_status)}`}>
                    {stats.profile_status === 'pending' && <Clock className="h-4 w-4 mr-1" />}
                    {stats.profile_status === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
                    {stats.profile_status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                    {stats.profile_status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    {stats.profile_status === 'pending' && 'Your application is being reviewed'}
                    {stats.profile_status === 'approved' && 'Your application has been approved'}
                    {stats.profile_status === 'rejected' && 'Your application was rejected'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Candidates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{stats.total_candidates || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.pending_candidates || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.approved_candidates || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.rejected_candidates || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Candidates List Component
const CandidatesList = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API}/candidates`);
      setCandidates(response.data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">All Candidates</h2>
          <p className="text-slate-600 mt-1">Manage and review candidate applications.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      {candidate.photograph ? (
                        <AvatarImage src={candidate.photograph} alt={candidate.full_name} />
                      ) : (
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {candidate.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-slate-800">{candidate.full_name}</h3>
                      <p className="text-sm text-slate-600">{candidate.email}</p>
                      <p className="text-sm text-slate-600">TRN: {candidate.trn}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`px-3 py-1 ${getStatusColor(candidate.status)}`}>
                      {candidate.status.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
              {candidates.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No candidates found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Pending Approvals Component
const PendingApprovals = () => {
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCandidates();
  }, []);

  const fetchPendingCandidates = async () => {
    try {
      const response = await axios.get(`${API}/candidates/pending`);
      setPendingCandidates(response.data);
    } catch (error) {
      console.error('Error fetching pending candidates:', error);
    }
    setLoading(false);
  };

  const handleApproval = async (candidateId, action, notes = '') => {
    try {
      await axios.post(`${API}/candidates/approve`, {
        candidate_id: candidateId,
        action,
        notes
      });
      fetchPendingCandidates(); // Refresh the list
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Pending Approvals</h2>
          <p className="text-slate-600 mt-1">Review and approve candidate applications.</p>
        </div>

        <div className="space-y-4">
          {pendingCandidates.map((candidate) => (
            <Card key={candidate.id} className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      {candidate.photograph ? (
                        <AvatarImage src={candidate.photograph} alt={candidate.full_name} />
                      ) : (
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                          {candidate.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-slate-800">{candidate.full_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                        <p><strong>Email:</strong> {candidate.email}</p>
                        <p><strong>Date of Birth:</strong> {candidate.date_of_birth}</p>
                        <p><strong>TRN:</strong> {candidate.trn}</p>
                        <p><strong>Applied:</strong> {new Date(candidate.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-slate-600"><strong>Address:</strong></p>
                        <p className="text-sm text-slate-700">{candidate.home_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Candidate</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve {candidate.full_name}'s application?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogAction
                            onClick={() => handleApproval(candidate.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Candidate</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject {candidate.full_name}'s application?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogAction
                            onClick={() => handleApproval(candidate.id, 'reject')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingCandidates.length === 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Pending Applications</h3>
                <p className="text-slate-600">All applications have been reviewed.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Candidate Profile Component
const CandidateProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/candidates/my-profile`);
      setProfile(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/candidates/my-profile`, formData);
      setProfile(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photograph: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">My Profile</h2>
            <p className="text-slate-600 mt-1">Manage your candidate information.</p>
          </div>
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-emerald-600" />
                <span>Profile Information</span>
              </CardTitle>
              <Badge className={`px-3 py-1 ${getStatusColor(profile?.status)}`}>
                {profile?.status === 'pending' && <Clock className="h-4 w-4 mr-1" />}
                {profile?.status === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
                {profile?.status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                {profile?.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    {formData.photograph ? (
                      <AvatarImage src={formData.photograph} alt={formData.full_name} />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl">
                        {formData.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Label htmlFor="photograph" className="text-slate-700">Update Photograph</Label>
                    <Input
                      id="photograph"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="mt-1 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-slate-700">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="text-slate-700">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="home_address" className="text-slate-700">Home Address</Label>
                  <Textarea
                    id="home_address"
                    value={formData.home_address || ''}
                    onChange={(e) => setFormData({ ...formData, home_address: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trn" className="text-slate-700">TRN</Label>
                  <Input
                    id="trn"
                    value={formData.trn || ''}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setFormData(profile);
                    }}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    {profile?.photograph ? (
                      <AvatarImage src={profile.photograph} alt={profile.full_name} />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl">
                        {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{profile?.full_name}</h3>
                    <p className="text-slate-600">{profile?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Date of Birth</h4>
                    <p className="text-slate-800">{profile?.date_of_birth}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">TRN</h4>
                    <p className="text-slate-800">{profile?.trn}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Home Address</h4>
                  <p className="text-slate-800">{profile?.home_address}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Applied On</h4>
                    <p className="text-slate-800">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  {profile?.approved_by && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Reviewed By</h4>
                      <p className="text-slate-800">{profile.approved_by}</p>
                    </div>
                  )}
                </div>

                {profile?.approval_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Review Notes</h4>
                    <p className="text-slate-800">{profile.approval_notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Test Categories Component
const TestCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
    setLoading(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/categories`, formData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', is_active: true });
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Test Categories</h2>
            <p className="text-slate-600 mt-1">Manage question categories for the test bank.</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {showCreateForm && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Create New Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="e.g., Road Code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="Category description"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Create Category
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-medium text-slate-800">{category.name}</span>
                  <Badge className={category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4">{category.description || 'No description'}</p>
                <div className="text-xs text-slate-500">
                  Created: {new Date(category.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Question Bank Component
const QuestionBank = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category_id: '', status: '' });
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
    fetchStats();
  }, [filter]);

  const fetchQuestions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category_id) params.append('category_id', filter.category_id);
      if (filter.status) params.append('status', filter.status);
      
      const response = await axios.get(`${API}/questions?${params}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/questions/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'video_embedded': return <Play className="h-4 w-4" />;
      case 'multiple_choice': return <FileText className="h-4 w-4" />;
      case 'true_false': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Question Bank</h2>
            <p className="text-slate-600 mt-1">Manage test questions and review submissions.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats.total_questions || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_questions || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved_questions || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected_questions || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <Select value={filter.category_id} onValueChange={(value) => setFilter({ ...filter, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-48">
                <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id} className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      {getQuestionTypeIcon(question.question_type)}
                      <span className="text-sm font-medium text-slate-600 capitalize">
                        {question.question_type.replace('_', ' ')}
                      </span>
                      <Badge className="bg-slate-100 text-slate-700">
                        {question.category_name}
                      </Badge>
                      <Badge className={`px-2 py-1 text-xs ${getStatusColor(question.status)}`}>
                        {question.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-medium text-slate-800">{question.question_text}</h3>
                    
                    {question.video_url && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Play className="h-4 w-4" />
                        <span>Video attached</span>
                      </div>
                    )}
                    
                    {question.options && (
                      <div className="space-y-1">
                        {question.options.map((option, idx) => (
                          <div key={idx} className={`text-sm p-2 rounded ${option.is_correct ? 'bg-green-50 text-green-800 font-medium' : 'bg-slate-50 text-slate-700'}`}>
                            {String.fromCharCode(65 + idx)}. {option.text}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.question_type === 'true_false' && (
                      <div className="text-sm">
                        <span className="font-medium">Correct Answer: </span>
                        <span className={question.correct_answer ? 'text-green-600' : 'text-red-600'}>
                          {question.correct_answer ? 'True' : 'False'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>By: {question.created_by_name}</span>
                      <span>Created: {new Date(question.created_at).toLocaleDateString()}</span>
                      <span>Difficulty: {question.difficulty}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {questions.length === 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Questions Found</h3>
                <p className="text-slate-600">No questions match your current filters.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
// Create Question Component
const CreateQuestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    category_id: '',
    question_type: 'multiple_choice',
    question_text: '',
    options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
    correct_answer: null,
    video_url: '',
    explanation: '',
    difficulty: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index][field] = value;
    
    // If marking as correct, unmark others for multiple choice
    if (field === 'is_correct' && value && formData.question_type === 'multiple_choice') {
      newOptions.forEach((opt, idx) => {
        if (idx !== index) opt.is_correct = false;
      });
    }
    
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', is_correct: false }]
    });
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, idx) => idx !== index);
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = { ...formData };
      
      // Clean up data based on question type
      if (formData.question_type === 'true_false') {
        delete submitData.options;
        delete submitData.video_url;
      } else if (formData.question_type === 'multiple_choice') {
        delete submitData.correct_answer;
        delete submitData.video_url;
      } else if (formData.question_type === 'video_embedded') {
        delete submitData.options;
        delete submitData.correct_answer;
      }

      await axios.post(`${API}/questions`, submitData);
      navigate('/questions');
    } catch (error) {
      console.error('Error creating question:', error);
    }
    setLoading(false);
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/questions/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Bulk upload completed. ${response.data.created_count} questions created.`);
      if (response.data.errors.length > 0) {
        console.log('Upload errors:', response.data.errors);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Create Question</h2>
            <p className="text-slate-600 mt-1">Add new questions to the test bank.</p>
          </div>
          <Button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>

        {showBulkUpload && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Bulk Upload Questions</CardTitle>
              <CardDescription>
                Upload multiple questions using a JSON or CSV file. 
                <a href="#" className="text-emerald-600 hover:text-emerald-700 ml-1">Download template</a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleBulkUpload}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
                <p className="text-sm text-slate-600">
                  Supported formats: JSON, CSV. File should contain: category_id, question_type, question_text, and type-specific fields.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category *</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question_type">Question Type *</Label>
                  <Select value={formData.question_type} onValueChange={(value) => setFormData({ ...formData, question_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="video_embedded">Video Embedded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question_text">Question Text *</Label>
                <Textarea
                  id="question_text"
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  required
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Enter your question here..."
                />
              </div>

              {formData.question_type === 'multiple_choice' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Answer Options *</Label>
                    <Button
                      type="button"
                      onClick={addOption}
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <Input
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={option.is_correct}
                          onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                          className="text-emerald-600"
                        />
                        <span className="text-sm text-slate-600">Correct</span>
                      </div>
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          onClick={() => removeOption(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {formData.question_type === 'true_false' && (
                <div className="space-y-2">
                  <Label>Correct Answer *</Label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="true_false"
                        checked={formData.correct_answer === true}
                        onChange={() => setFormData({ ...formData, correct_answer: true })}
                        className="text-emerald-600"
                      />
                      <span>True</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="true_false"
                        checked={formData.correct_answer === false}
                        onChange={() => setFormData({ ...formData, correct_answer: false })}
                        className="text-emerald-600"
                      />
                      <span>False</span>
                    </label>
                  </div>
                </div>
              )}

              {formData.question_type === 'video_embedded' && (
                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  rows={2}
                  placeholder="Provide an explanation for the correct answer..."
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? 'Creating...' : 'Create Question'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/questions')}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Question Approvals Component
const QuestionApprovals = () => {
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingQuestions();
  }, []);

  const fetchPendingQuestions = async () => {
    try {
      const response = await axios.get(`${API}/questions/pending`);
      setPendingQuestions(response.data);
    } catch (error) {
      console.error('Error fetching pending questions:', error);
    }
    setLoading(false);
  };

  const handleApproval = async (questionId, action, notes = '') => {
    try {
      await axios.post(`${API}/questions/approve`, {
        question_id: questionId,
        action,
        notes
      });
      fetchPendingQuestions(); // Refresh the list
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'video_embedded': return <Play className="h-4 w-4" />;
      case 'multiple_choice': return <FileText className="h-4 w-4" />;
      case 'true_false': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Question Approvals</h2>
          <p className="text-slate-600 mt-1">Review and approve questions for the test bank.</p>
        </div>

        <div className="space-y-4">
          {pendingQuestions.map((question) => (
            <Card key={question.id} className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getQuestionTypeIcon(question.question_type)}
                      <span className="text-sm font-medium text-slate-600 capitalize">
                        {question.question_type.replace('_', ' ')}
                      </span>
                      <Badge className="bg-slate-100 text-slate-700">
                        {question.category_name}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        PENDING
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to approve this question for the test bank?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogAction
                              onClick={() => handleApproval(question.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject this question?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogAction
                              onClick={() => handleApproval(question.id, 'reject')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium text-slate-800">{question.question_text}</h3>
                  
                  {question.video_url && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Play className="h-4 w-4" />
                      <a href={question.video_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                        View Video
                      </a>
                    </div>
                  )}
                  
                  {question.options && (
                    <div className="space-y-1">
                      {question.options.map((option, idx) => (
                        <div key={idx} className={`text-sm p-2 rounded ${option.is_correct ? 'bg-green-50 text-green-800 font-medium' : 'bg-slate-50 text-slate-700'}`}>
                          {String.fromCharCode(65 + idx)}. {option.text}
                          {option.is_correct && <span className="ml-2 text-green-600">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.question_type === 'true_false' && (
                    <div className="text-sm bg-slate-50 p-2 rounded">
                      <span className="font-medium">Correct Answer: </span>
                      <span className={question.correct_answer ? 'text-green-600' : 'text-red-600'}>
                        {question.correct_answer ? 'True' : 'False'}
                      </span>
                    </div>
                  )}
                  
                  {question.explanation && (
                    <div className="text-sm bg-blue-50 p-3 rounded">
                      <span className="font-medium text-blue-800">Explanation: </span>
                      <span className="text-blue-700">{question.explanation}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <div className="flex items-center space-x-4">
                      <span>Submitted by: {question.created_by_name}</span>
                      <span>Created: {new Date(question.created_at).toLocaleDateString()}</span>
                      <span>Difficulty: {question.difficulty}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {pendingQuestions.length === 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Pending Questions</h3>
                <p className="text-slate-600">All questions have been reviewed.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Unauthorized Component
const Unauthorized = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-orange-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md shadow-xl border-0 backdrop-blur-sm bg-white/90">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
          <XCircle className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">Access Denied</CardTitle>
        <CardDescription className="text-slate-600">
          You don't have permission to access this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Link to="/dashboard">
          <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
            Go to Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  </div>
);

// =============================================================================
// PHASE 5: APPOINTMENT & VERIFICATION SYSTEM COMPONENTS
// =============================================================================

// Appointment Booking Component
const AppointmentBooking = () => {
  const { user } = useAuth();
  const [testConfigs, setTestConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchTestConfigs();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchTestConfigs = async () => {
    try {
      const response = await axios.get(`${API}/test-configs`);
      setTestConfigs(response.data);
    } catch (error) {
      console.error('Error fetching test configs:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/schedule-availability?date=${selectedDate}`);
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    }
    setLoading(false);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedConfig || !selectedDate || !selectedSlot) {
      alert('Please fill all required fields');
      return;
    }

    setBookingLoading(true);
    try {
      const response = await axios.post(`${API}/appointments`, {
        test_config_id: selectedConfig,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        notes: notes
      });
      
      alert('Appointment booked successfully!');
      // Reset form
      setSelectedConfig('');
      setSelectedDate('');
      setSelectedSlot('');
      setNotes('');
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment: ' + (error.response?.data?.detail || 'Unknown error'));
    }
    setBookingLoading(false);
  };

  // Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Book Test Appointment</h2>
          <p className="text-slate-600 mt-1">Schedule your driving test appointment.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <span>Appointment Booking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBookAppointment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="test_config">Test Type *</Label>
                  <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      {testConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.name} ({config.total_questions} questions, {config.time_limit_minutes} minutes)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Appointment Date *</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    min={getMinDate()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label>Available Time Slots</Label>
                  {loading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time_slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot.time_slot)}
                          className={`p-3 rounded-lg border-2 text-center transition-colors ${
                            selectedSlot === slot.time_slot
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-medium">{slot.time_slot}</div>
                          <div className="text-xs text-slate-600">
                            {slot.available_capacity} of {slot.max_capacity} available
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-600">
                      No available slots for this date
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Any additional notes for your appointment..."
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={bookingLoading || !selectedConfig || !selectedDate || !selectedSlot}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {bookingLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// My Appointments Component
const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments/my-appointments`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">My Appointments</h2>
            <p className="text-slate-600 mt-1">View and manage your test appointments.</p>
          </div>
          <Button
            onClick={() => window.location.href = '/book-appointment'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
          </Button>
        </div>

        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-slate-800">
                        {appointment.test_config_name}
                      </h3>
                      <Badge className={`px-2 py-1 text-xs ${getStatusColor(appointment.status)}`}>
                        {appointment.status.toUpperCase()}
                      </Badge>
                      <Badge className={`px-2 py-1 text-xs ${getVerificationStatusColor(appointment.verification_status)}`}>
                        {appointment.verification_status === 'verified' ? 'VERIFIED' : 
                         appointment.verification_status === 'failed' ? 'VERIFICATION FAILED' : 
                         'VERIFICATION PENDING'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">Date:</span>
                        <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">Time:</span>
                        <span>{appointment.time_slot}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">Booked:</span>
                        <span>{new Date(appointment.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="text-sm">
                        <span className="font-medium text-slate-600">Notes:</span>
                        <p className="text-slate-700 mt-1">{appointment.notes}</p>
                      </div>
                    )}

                    {appointment.verification_status === 'pending' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Action Required:</strong> You need to complete identity verification with an officer before your appointment date to access the test.
                        </p>
                      </div>
                    )}

                    {appointment.verification_status === 'failed' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Verification Failed:</strong> Please contact the testing center to resolve verification issues.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {appointments.length === 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Appointments</h3>
                <p className="text-slate-600 mb-4">You haven't booked any appointments yet.</p>
                <Button
                  onClick={() => window.location.href = '/book-appointment'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Book Your First Appointment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Identity Verification Component
const IdentityVerification = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [verificationData, setVerificationData] = useState({
    id_document_type: 'national_id',
    id_document_number: '',
    verification_photos: [],
    photo_match_confirmed: false,
    id_document_match_confirmed: false,
    verification_notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments?date=${new Date().toISOString().split('T')[0]}`);
      setAppointments(response.data.filter(apt => 
        apt.status === 'scheduled' && apt.verification_status === 'pending'
      ));
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
    setLoading(false);
  };

  const handlePhotoCapture = () => {
    // This would integrate with webcam API or file upload
    // For demo purposes, we'll simulate a photo capture
    const simulatedPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVR...'; // Base64 image data
    
    setVerificationData(prev => ({
      ...prev,
      verification_photos: [
        ...prev.verification_photos,
        {
          photo_data: simulatedPhoto,
          photo_type: 'live_capture',
          notes: 'Live photo captured during verification'
        }
      ]
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationData(prev => ({
          ...prev,
          verification_photos: [
            ...prev.verification_photos,
            {
              photo_data: reader.result,
              photo_type: 'uploaded',
              notes: 'ID document photo uploaded'
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) {
      alert('Please select an appointment');
      return;
    }

    if (verificationData.verification_photos.length === 0) {
      alert('Please capture or upload at least one verification photo');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/appointments/${selectedAppointment.id}/verify-identity`, {
        candidate_id: selectedAppointment.candidate_info.id,
        appointment_id: selectedAppointment.id,
        ...verificationData
      });
      
      alert('Identity verification completed successfully!');
      fetchAppointments(); // Refresh the list
      setSelectedAppointment(null);
      setVerificationData({
        id_document_type: 'national_id',
        id_document_number: '',
        verification_photos: [],
        photo_match_confirmed: false,
        id_document_match_confirmed: false,
        verification_notes: ''
      });
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Failed to submit verification: ' + (error.response?.data?.detail || 'Unknown error'));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Identity Verification</h2>
          <p className="text-slate-600 mt-1">Verify candidate identity before test access.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments List */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Today's Appointments Requiring Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => setSelectedAppointment(appointment)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAppointment?.id === appointment.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-2">
                      <h3 className="font-medium text-slate-800">
                        {appointment.candidate_info?.full_name}
                      </h3>
                      <div className="text-sm text-slate-600">
                        <p>Test: {appointment.test_config_name}</p>
                        <p>Time: {appointment.time_slot}</p>
                        <p>Email: {appointment.candidate_info?.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {appointments.length === 0 && (
                  <div className="text-center py-4 text-slate-600">
                    No appointments requiring verification today
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Form */}
          {selectedAppointment && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <span>Verify Identity: {selectedAppointment.candidate_info?.full_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_document_type">ID Document Type</Label>
                    <Select 
                      value={verificationData.id_document_type} 
                      onValueChange={(value) => setVerificationData(prev => ({ ...prev, id_document_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national_id">National ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_document_number">ID Document Number</Label>
                    <Input
                      id="id_document_number"
                      value={verificationData.id_document_number}
                      onChange={(e) => setVerificationData(prev => ({ ...prev, id_document_number: e.target.value }))}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Photo Capture/Upload */}
                  <div className="space-y-3">
                    <Label>Verification Photos</Label>
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        onClick={handlePhotoCapture}
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                      <Label htmlFor="photo_upload" className="cursor-pointer">
                        <div className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md inline-flex items-center">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </div>
                        <Input
                          id="photo_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </Label>
                    </div>
                    
                    {verificationData.verification_photos.length > 0 && (
                      <div className="text-sm text-green-600">
                        ✓ {verificationData.verification_photos.length} photo(s) captured
                      </div>
                    )}
                  </div>

                  {/* Verification Checkboxes */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="photo_match"
                        checked={verificationData.photo_match_confirmed}
                        onChange={(e) => setVerificationData(prev => ({ ...prev, photo_match_confirmed: e.target.checked }))}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <Label htmlFor="photo_match" className="text-sm">
                        Photo matches candidate appearance
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="id_match"
                        checked={verificationData.id_document_match_confirmed}
                        onChange={(e) => setVerificationData(prev => ({ ...prev, id_document_match_confirmed: e.target.checked }))}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <Label htmlFor="id_match" className="text-sm">
                        ID document details verified
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification_notes">Verification Notes</Label>
                    <Textarea
                      id="verification_notes"
                      value={verificationData.verification_notes}
                      onChange={(e) => setVerificationData(prev => ({ ...prev, verification_notes: e.target.value }))}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      rows={3}
                      placeholder="Any additional notes about the verification process..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Submitting Verification...
                      </>
                    ) : (
                      'Complete Verification'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Admin Schedule Management Component
const ScheduleManagement = () => {
  const [scheduleConfigs, setScheduleConfigs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    day_of_week: 0,
    time_slots: [{ start_time: '09:00', end_time: '10:00', max_capacity: 5, is_active: true }],
    is_active: true
  });
  const [holidayFormData, setHolidayFormData] = useState({
    date: '',
    name: '',
    description: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchScheduleConfigs();
    fetchHolidays();
  }, []);

  const fetchScheduleConfigs = async () => {
    try {
      const response = await axios.get(`${API}/admin/schedule-config`);
      setScheduleConfigs(response.data);
    } catch (error) {
      console.error('Error fetching schedule configs:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${API}/admin/holidays`);
      setHolidays(response.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
    setLoading(false);
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/schedule-config`, scheduleFormData);
      setShowScheduleForm(false);
      setScheduleFormData({
        day_of_week: 0,
        time_slots: [{ start_time: '09:00', end_time: '10:00', max_capacity: 5, is_active: true }],
        is_active: true
      });
      fetchScheduleConfigs();
      alert('Schedule configuration saved successfully!');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Failed to create schedule configuration');
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/holidays`, holidayFormData);
      setShowHolidayForm(false);
      setHolidayFormData({ date: '', name: '', description: '' });
      fetchHolidays();
      alert('Holiday created successfully!');
    } catch (error) {
      console.error('Error creating holiday:', error);
      alert('Failed to create holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      await axios.delete(`${API}/admin/holidays/${holidayId}`);
      fetchHolidays();
      alert('Holiday deleted successfully!');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const addTimeSlot = () => {
    setScheduleFormData(prev => ({
      ...prev,
      time_slots: [
        ...prev.time_slots,
        { start_time: '09:00', end_time: '10:00', max_capacity: 5, is_active: true }
      ]
    }));
  };

  const updateTimeSlot = (index, field, value) => {
    const newSlots = [...scheduleFormData.time_slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setScheduleFormData(prev => ({ ...prev, time_slots: newSlots }));
  };

  const removeTimeSlot = (index) => {
    if (scheduleFormData.time_slots.length > 1) {
      const newSlots = scheduleFormData.time_slots.filter((_, i) => i !== index);
      setScheduleFormData(prev => ({ ...prev, time_slots: newSlots }));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Schedule Management</h2>
          <p className="text-slate-600 mt-1">Configure appointment schedules and manage holidays.</p>
        </div>

        <Tabs defaultValue="schedules">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedules">Weekly Schedules</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-slate-800">Weekly Schedule Configuration</h3>
              <Button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Configure Day
              </Button>
            </div>

            {showScheduleForm && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle>Configure Schedule for Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select 
                        value={scheduleFormData.day_of_week.toString()} 
                        onValueChange={(value) => setScheduleFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Time Slots</Label>
                      {scheduleFormData.time_slots.map((slot, index) => (
                        <div key={index} className="flex space-x-3 items-end p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-xs">Start Time</Label>
                            <Input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) => updateTimeSlot(index, 'start_time', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">End Time</Label>
                            <Input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) => updateTimeSlot(index, 'end_time', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Max Capacity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={slot.max_capacity}
                              onChange={(e) => updateTimeSlot(index, 'max_capacity', parseInt(e.target.value))}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeTimeSlot(index)}
                            variant="outline"
                            size="sm"
                            disabled={scheduleFormData.time_slots.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" onClick={addTimeSlot} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>

                    <div className="flex space-x-3">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Save Schedule
                      </Button>
                      <Button type="button" onClick={() => setShowScheduleForm(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {daysOfWeek.map((day, index) => {
                const config = scheduleConfigs.find(config => config.day_of_week === index);
                return (
                  <Card key={index} className="shadow-sm border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{day}</span>
                        <Badge className={config ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                          {config ? 'Configured' : 'Not Set'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {config ? (
                        <div className="space-y-2">
                          {config.time_slots.map((slot, slotIndex) => (
                            <div key={slotIndex} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                              <span className="text-sm font-medium">{slot.start_time} - {slot.end_time}</span>
                              <span className="text-xs text-slate-600">Max: {slot.max_capacity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">No schedule configured for this day</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="holidays" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-slate-800">Holiday Management</h3>
              <Button
                onClick={() => setShowHolidayForm(!showHolidayForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>

            {showHolidayForm && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle>Add Holiday</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateHoliday} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="holiday_date">Date</Label>
                        <Input
                          id="holiday_date"
                          type="date"
                          value={holidayFormData.date}
                          onChange={(e) => setHolidayFormData(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="holiday_name">Holiday Name</Label>
                        <Input
                          id="holiday_name"
                          value={holidayFormData.name}
                          onChange={(e) => setHolidayFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          placeholder="e.g., Christmas Day"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holiday_description">Description (Optional)</Label>
                      <Textarea
                        id="holiday_description"
                        value={holidayFormData.description}
                        onChange={(e) => setHolidayFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Additional details about this holiday"
                        rows={2}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Add Holiday
                      </Button>
                      <Button type="button" onClick={() => setShowHolidayForm(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {holidays.map((holiday) => (
                <Card key={holiday.id} className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-medium text-slate-800">{holiday.name}</h3>
                        <p className="text-sm text-slate-600">{new Date(holiday.date).toLocaleDateString()}</p>
                        {holiday.description && (
                          <p className="text-xs text-slate-500">{holiday.description}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {holidays.length === 0 && (
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Holidays Configured</h3>
                  <p className="text-slate-600">Add holidays to block appointment bookings on specific dates.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// User Management Component (Admin Only)
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: '',
    is_active: true
  });

  const USER_ROLES = [
    'Candidate',
    'Driver Assessment Officer',
    'Manager',
    'Administrator',
    'Regional Director'
  ];

  useEffect(() => {
    fetchUsers();
  }, [includeDeleted]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users?include_deleted=${includeDeleted}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/admin/users/${editingUser.id}`, formData);
      } else {
        await axios.post(`${API}/admin/users`, formData);
      }
      
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please try again.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
      }
    }
  };

  const handleRestore = async (userId) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/restore`);
      fetchUsers();
    } catch (error) {
      console.error('Error restoring user:', error);
      alert('Error restoring user. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: '',
      is_active: true
    });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
            <p className="text-slate-600">Manage system users and assign roles</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Include deleted users</span>
          </label>
        </div>

        {showCreateForm && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>{editingUser ? 'Edit User' : 'Create New User'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={editingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" value={formData.role} />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password {editingUser && '(leave blank to keep current)'}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="is_active">Active User</Label>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                  <Button type="button" onClick={resetForm} variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            System Users ({users.length})
          </h2>
          
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className={`shadow-sm ${user.is_deleted ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-slate-800">{user.full_name}</h3>
                        <Badge className={
                          user.role === 'Administrator' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'Driver Assessment Officer' ? 'bg-orange-100 text-orange-800' :
                          user.role === 'Regional Director' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {user.role}
                        </Badge>
                        {!user.is_active && (
                          <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                        )}
                        {user.is_deleted && (
                          <Badge className="bg-red-200 text-red-900">Deleted</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <div className="text-xs text-slate-500">
                        Created: {new Date(user.created_at).toLocaleDateString()} 
                        {user.created_by && ` by ${user.created_by}`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {user.is_deleted ? (
                        <Button
                          onClick={() => handleRestore(user.id)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleEdit(user)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(user.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {users.length === 0 && (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Users Found</h3>
                <p className="text-slate-600">
                  {includeDeleted ? 'No users in the system.' : 'No active users found. Try including deleted users.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <CandidateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator', 'Regional Director']}>
                <CandidatesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator', 'Regional Director']}>
                <PendingApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <TestCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator', 'Regional Director']}>
                <QuestionBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-question"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager']}>
                <CreateQuestion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/question-approvals"
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Regional Director']}>
                <QuestionApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/question-approvals"
            element={
              <ProtectedRoute allowedRoles={['Regional Director', 'Administrator']}>
                <QuestionApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <TestCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator', 'Regional Director']}>
                <QuestionBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-question"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator']}>
                <CreateQuestion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-configs"
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Regional Director', 'Manager']}>
                <TestConfigurations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <TakeTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-results"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <TestResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-management"
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Regional Director', 'Manager', 'Driver Assessment Officer']}>
                <TestManagement />
              </ProtectedRoute>
            }
          />
          {/* Phase 5: Appointment & Verification System Routes */}
          <Route
            path="/book-appointment"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <AppointmentBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify-identity"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer', 'Manager', 'Administrator']}>
                <IdentityVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule-management"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <ScheduleManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          {/* Phase 6: Multi-Stage Testing System Routes */}
          <Route
            path="/multi-stage-configs"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <MultiStageTestConfigurations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation-criteria"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <EvaluationCriteriaManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer-assignments"
            element={
              <ProtectedRoute allowedRoles={['Manager', 'Administrator']}>
                <OfficerAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-assignments"
            element={
              <ProtectedRoute allowedRoles={['Driver Assessment Officer']}>
                <MyAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/multi-stage-analytics"
            element={
              <ProtectedRoute allowedRoles={['Manager', 'Administrator']}>
                <MultiStageAnalytics />
              </ProtectedRoute>
            }
          />
          {/* Phase 7: Special Tests & Resit Management Routes */}
          <Route
            path="/special-test-categories"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <SpecialTestCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/special-test-configs"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <SpecialTestConfigurations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resit-management"
            element={
              <ProtectedRoute allowedRoles={['Manager', 'Administrator']}>
                <ResitManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-resits"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <MyResits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reschedule-appointment"
            element={
              <ProtectedRoute allowedRoles={['Candidate']}>
                <RescheduleAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/failed-stages-analytics"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <FailedStagesAnalytics />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// =============================================================================
// TEST MANAGEMENT SYSTEM COMPONENTS
// =============================================================================

// Test Configurations Component
const TestConfigurations = () => {
  const [configs, setConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    total_questions: 20,
    pass_mark_percentage: 75,
    time_limit_minutes: 25,
    is_active: true,
    difficulty_distribution: { easy: 30, medium: 50, hard: 20 }
  });

  useEffect(() => {
    fetchConfigs();
    fetchCategories();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API}/test-configs`);
      setConfigs(response.data);
    } catch (error) {
      console.error('Error fetching test configurations:', error);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/test-configs`, formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        category_id: '',
        total_questions: 20,
        pass_mark_percentage: 75,
        time_limit_minutes: 25,
        is_active: true,
        difficulty_distribution: { easy: 30, medium: 50, hard: 20 }
      });
      fetchConfigs();
    } catch (error) {
      console.error('Error creating configuration:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Test Configurations</h2>
            <p className="text-slate-600 mt-1">Manage test settings and parameters.</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        {showCreateForm && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Create Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Test Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="e.g., Learner's Provisional License Test"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category *</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_questions">Total Questions</Label>
                    <Input
                      id="total_questions"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.total_questions}
                      onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass_mark_percentage">Pass Mark (%)</Label>
                    <Input
                      id="pass_mark_percentage"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.pass_mark_percentage}
                      onChange={(e) => setFormData({ ...formData, pass_mark_percentage: parseInt(e.target.value) })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                    <Input
                      id="time_limit_minutes"
                      type="number"
                      min="1"
                      max="180"
                      value={formData.time_limit_minutes}
                      onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) })}
                      className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Distribution (%)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="easy" className="text-sm">Easy</Label>
                      <Input
                        id="easy"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.difficulty_distribution.easy}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficulty_distribution: {
                            ...formData.difficulty_distribution,
                            easy: parseInt(e.target.value) || 0
                          }
                        })}
                        className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="medium" className="text-sm">Medium</Label>
                      <Input
                        id="medium"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.difficulty_distribution.medium}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficulty_distribution: {
                            ...formData.difficulty_distribution,
                            medium: parseInt(e.target.value) || 0
                          }
                        })}
                        className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="hard" className="text-sm">Hard</Label>
                      <Input
                        id="hard"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.difficulty_distribution.hard}
                        onChange={(e) => setFormData({
                          ...formData,
                          difficulty_distribution: {
                            ...formData.difficulty_distribution,
                            hard: parseInt(e.target.value) || 0
                          }
                        })}
                        className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Total: {formData.difficulty_distribution.easy + formData.difficulty_distribution.medium + formData.difficulty_distribution.hard}% (should be 100%)
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Create Configuration
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card key={config.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-medium text-slate-800">{config.name}</span>
                  <Badge className={config.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-slate-600 text-sm">{config.description || 'No description'}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-slate-500">Questions:</span>
                      <p className="text-slate-800">{config.total_questions}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Pass Mark:</span>
                      <p className="text-slate-800">{config.pass_mark_percentage}%</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Time Limit:</span>
                      <p className="text-slate-800">{config.time_limit_minutes} mins</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Category:</span>
                      <p className="text-slate-800">{config.category_name}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-medium text-slate-500 text-sm">Difficulty Mix:</span>
                    <div className="flex space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">E: {config.difficulty_distribution?.easy || 0}%</Badge>
                      <Badge variant="outline" className="text-xs">M: {config.difficulty_distribution?.medium || 0}%</Badge>
                      <Badge variant="outline" className="text-xs">H: {config.difficulty_distribution?.hard || 0}%</Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-500 pt-2">
                    Created: {new Date(config.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Take Test Component
const TakeTest = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API}/test-configs`);
      setConfigs(response.data);
    } catch (error) {
      console.error('Error fetching test configurations:', error);
    }
    setLoading(false);
  };

  const startTest = async (configId) => {
    try {
      const response = await axios.post(`${API}/tests/start`, {
        test_config_id: configId,
        candidate_id: '' // Will be set by backend for current user
      });
      setCurrentSession(response.data);
    } catch (error) {
      console.error('Error starting test:', error);
      alert(error.response?.data?.detail || 'Failed to start test');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentSession) {
    return <TestInterface session={currentSession} />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Available Tests</h2>
          <p className="text-slate-600 mt-1">Select a test to begin your examination.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card key={config.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-medium text-slate-800">{config.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-slate-600 text-sm">{config.description || 'No description available'}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-slate-500">Questions:</span>
                      <p className="text-slate-800">{config.total_questions}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Pass Mark:</span>
                      <p className="text-slate-800">{config.pass_mark_percentage}%</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-slate-500">Time Limit:</span>
                      <p className="text-slate-800">{config.time_limit_minutes} minutes</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => startTest(config.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Start Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {configs.length === 0 && (
            <div className="col-span-full text-center py-8">
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Tests Available</h3>
              <p className="text-slate-600">There are currently no active tests available.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Test Interface Component
const TestInterface = ({ session: initialSession }) => {
  const [session, setSession] = useState(initialSession);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      loadQuestion(0);
      calculateTimeRemaining();
    }
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const calculateTimeRemaining = () => {
    if (!session?.end_time) return;
    
    const endTime = new Date(session.end_time);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    
    setTimeRemaining(remaining);
    
    if (remaining === 0) {
      handleAutoSubmit();
    }
  };

  const loadQuestion = async (questionIndex) => {
    try {
      const response = await axios.get(`${API}/tests/session/${session.id}/question/${questionIndex}`);
      setCurrentQuestion(response.data);
      setCurrentQuestionIndex(questionIndex);
    } catch (error) {
      console.error('Error loading question:', error);
    }
    setLoading(false);
  };

  const saveAnswer = async (answer) => {
    if (!currentQuestion) return;
    
    const answerData = {
      question_id: currentQuestion.id,
      selected_option: answer.selected_option || null,
      boolean_answer: answer.boolean_answer !== undefined ? answer.boolean_answer : null,
      is_bookmarked: answer.is_bookmarked || false
    };

    try {
      await axios.post(`${API}/tests/session/${session.id}/answer`, answerData);
      
      // Update local answers state
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answerData
      }));
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleAnswer = (answer) => {
    saveAnswer(answer);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < session.questions.length - 1) {
      loadQuestion(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      loadQuestion(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    loadQuestion(index);
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;
    
    const isBookmarked = !currentQuestion.is_bookmarked;
    saveAnswer({ is_bookmarked: isBookmarked });
    
    setCurrentQuestion(prev => ({
      ...prev,
      is_bookmarked: isBookmarked
    }));
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    
    try {
      const submissionAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        selected_option: answer.selected_option,
        boolean_answer: answer.boolean_answer,
        is_bookmarked: answer.is_bookmarked || false
      }));

      const response = await axios.post(`${API}/tests/session/${session.id}/submit`, {
        session_id: session.id,
        answers: submissionAnswers,
        is_final_submission: true
      });

      navigate('/test-results', { state: { result: response.data } });
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test. Please try again.');
    }
    setSubmitting(false);
  };

  const handleAutoSubmit = () => {
    if (!submitting) {
      handleSubmitTest();
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining > 300) return 'text-green-600'; // > 5 minutes
    if (timeRemaining > 60) return 'text-yellow-600'; // > 1 minute
    return 'text-red-600'; // < 1 minute
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-slate-800 mb-2">Question not found</h3>
            <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{session.test_name}</h1>
              <p className="text-sm text-slate-600">Question {currentQuestion.question_number} of {currentQuestion.total_questions}</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className={`text-2xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
              <Button
                onClick={toggleBookmark}
                variant={currentQuestion.is_bookmarked ? 'default' : 'outline'}
                size="sm"
                className={currentQuestion.is_bookmarked ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-medium text-slate-800 mb-4">
                      {currentQuestion.question_text}
                    </h2>
                    
                    {currentQuestion.video_url && (
                      <div className="mb-6">
                        <video controls className="w-full max-w-md rounded-lg">
                          <source src={currentQuestion.video_url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>

                  {/* Multiple Choice Options */}
                  {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => {
                        const optionLetter = String.fromCharCode(65 + index);
                        const isSelected = currentQuestion.current_answer?.selected_option === optionLetter;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswer({ selected_option: optionLetter })}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                                isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                              }`}>
                                {optionLetter}
                              </div>
                              <span className="text-slate-800">{option.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False Options */}
                  {currentQuestion.question_type === 'true_false' && (
                    <div className="space-y-3">
                      {[
                        { value: true, label: 'True' },
                        { value: false, label: 'False' }
                      ].map((option) => {
                        const isSelected = currentQuestion.current_answer?.boolean_answer === option.value;
                        
                        return (
                          <button
                            key={option.value.toString()}
                            onClick={() => handleAnswer({ boolean_answer: option.value })}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                              <span className="text-slate-800 font-medium">{option.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <Button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Previous
              </Button>
              
              <div className="flex space-x-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Test'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit Test</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to submit your test? You cannot change your answers after submission.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogAction
                        onClick={handleSubmitTest}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Submit Test
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <Button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === session.questions.length - 1}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                Next
              </Button>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-slate-200 sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {session.questions.map((_, index) => {
                    const isAnswered = answers[session.questions[index]];
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => goToQuestion(index)}
                        className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white' 
                            : isAnswered 
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-sm"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-slate-100 rounded-sm"></div>
                    <span>Not Answered</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600">
                    <div>Answered: {Object.keys(answers).length}</div>
                    <div>Remaining: {session.questions.length - Object.keys(answers).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Test Results Component
const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [loading, setLoading] = useState(!result);
  const [resultData, setResultData] = useState(result);

  useEffect(() => {
    if (!result) {
      // If no result in state, redirect to dashboard
      navigate('/dashboard');
    }
  }, [result, navigate]);

  if (loading || !resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const getGradeColor = (passed) => {
    return passed ? 'text-green-600' : 'text-red-600';
  };

  const getGradeBg = (passed) => {
    return passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${getGradeBg(resultData.passed)}`}>
              {resultData.passed ? (
                <CheckCircle className={`h-10 w-10 ${getGradeColor(resultData.passed)}`} />
              ) : (
                <XCircle className={`h-10 w-10 ${getGradeColor(resultData.passed)}`} />
              )}
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-slate-800">
                {resultData.passed ? 'Congratulations!' : 'Test Complete'}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {resultData.passed ? 'You have passed the test!' : 'You did not meet the passing requirements.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Score Summary */}
            <div className={`p-6 rounded-lg border-2 ${getGradeBg(resultData.passed)}`}>
              <div className="text-center">
                <div className={`text-5xl font-bold ${getGradeColor(resultData.passed)} mb-2`}>
                  {Math.round(resultData.score_percentage)}%
                </div>
                <p className="text-slate-700 font-medium">
                  Your Score ({resultData.correct_answers} out of {resultData.total_questions} correct)
                </p>
                <p className="text-slate-600 text-sm mt-1">
                  Pass mark: {resultData.pass_mark}%
                </p>
              </div>
            </div>

            {/* Test Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{resultData.total_questions}</div>
                  <p className="text-slate-600 text-sm">Total Questions</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{resultData.correct_answers}</div>
                  <p className="text-slate-600 text-sm">Correct Answers</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{Math.round(resultData.time_taken_minutes)}m</div>
                  <p className="text-slate-600 text-sm">Time Taken</p>
                </CardContent>
              </Card>
            </div>

            {/* Test Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Test Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Test Name:</span>
                  <p className="text-slate-800">{resultData.test_name}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Completed:</span>
                  <p className="text-slate-800">{new Date(resultData.submitted_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Candidate:</span>
                  <p className="text-slate-800">{resultData.candidate_name}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Result:</span>
                  <p className={`font-medium ${getGradeColor(resultData.passed)}`}>
                    {resultData.passed ? 'PASSED' : 'FAILED'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4 pt-6 border-t">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              >
                Return to Dashboard
              </Button>
              <Button
                onClick={() => navigate('/tests')}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8"
              >
                Take Another Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Test Management Component (for staff)
const TestManagement = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState({});
  const [results, setResults] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchAnalytics();
    fetchResults();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/tests/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API}/tests/results`);
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
    setLoading(false);
  };

  const handleExtendTime = async (sessionId, minutes) => {
    try {
      const reason = prompt('Reason for time extension:');
      if (reason) {
        await axios.post(`${API}/tests/session/${sessionId}/extend-time`, {
          session_id: sessionId,
          additional_minutes: minutes,
          reason
        });
        alert('Time extended successfully');
      }
    } catch (error) {
      console.error('Error extending time:', error);
      alert('Failed to extend time');
    }
  };

  const handleResetTime = async (sessionId) => {
    try {
      if (confirm('Are you sure you want to reset the test time?')) {
        await axios.post(`${API}/tests/session/${sessionId}/reset-time`);
        alert('Time reset successfully');
      }
    } catch (error) {
      console.error('Error resetting time:', error);
      alert('Failed to reset time');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Test Management</h2>
          <p className="text-slate-600 mt-1">Monitor test sessions and view analytics.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{analytics.total_sessions || 0}</div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{analytics.active_sessions || 0}</div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Pass Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{Math.round(analytics.pass_rate || 0)}%</div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{analytics.average_score || 0}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Results by Test */}
            {analytics.results_by_test && analytics.results_by_test.length > 0 && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle>Results by Test Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.results_by_test.map((test, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-800">{test._id}</h4>
                          <p className="text-sm text-slate-600">{test.count} attempts</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-800">{Math.round(test.avg_score)}%</div>
                          <p className="text-sm text-slate-600">avg score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {results.map((result) => (
              <Card key={result.id} className="shadow-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-slate-800">{result.candidate_name}</h3>
                      <p className="text-sm text-slate-600">{result.test_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(result.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.round(result.score_percentage)}%
                      </div>
                      <Badge className={result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="text-center py-8">
              <p className="text-slate-600">Active sessions management would be implemented here.</p>
              <p className="text-sm text-slate-500 mt-2">
                Features: View active sessions, extend time, reset time, monitor progress
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// =============================================================================
// PHASE 6: MULTI-STAGE TESTING SYSTEM COMPONENTS
// =============================================================================

// Multi-Stage Test Configurations Component
const MultiStageTestConfigurations = () => {
  const [configs, setConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    category_id: '',
    written_total_questions: 20,
    written_pass_mark_percentage: 75,
    written_time_limit_minutes: 30,
    yard_pass_mark_percentage: 75,
    road_pass_mark_percentage: 75,
    is_active: true,
    requires_officer_assignment: true
  });

  useEffect(() => {
    fetchConfigs();
    fetchCategories();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API}/multi-stage-test-configs`);
      setConfigs(response.data);
    } catch (error) {
      console.error('Error fetching multi-stage test configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await axios.put(`${API}/multi-stage-test-configs/${editingConfig.id}`, newConfig);
      } else {
        await axios.post(`${API}/multi-stage-test-configs`, newConfig);
      }
      
      // Reset form
      setNewConfig({
        name: '',
        description: '',
        category_id: '',
        written_total_questions: 20,
        written_pass_mark_percentage: 75,
        written_time_limit_minutes: 30,
        yard_pass_mark_percentage: 75,
        road_pass_mark_percentage: 75,
        is_active: true,
        requires_officer_assignment: true
      });
      setShowCreateForm(false);
      setEditingConfig(null);
      fetchConfigs();
    } catch (error) {
      console.error('Error saving multi-stage test config:', error);
      alert(error.response?.data?.detail || 'Error saving configuration');
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setNewConfig(config);
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Multi-Stage Test Configurations</h1>
            <p className="text-slate-600 mt-1">Configure Written → Yard → Road test progressions</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Configuration</span>
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingConfig ? 'Edit Configuration' : 'Create Multi-Stage Test Configuration'}</CardTitle>
              <CardDescription>Set up the complete testing process from written test to road evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Configuration Name</Label>
                    <Input
                      id="name"
                      value={newConfig.name}
                      onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                      placeholder="e.g., Standard Driver's License Test"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Test Category</Label>
                    <Select value={newConfig.category_id} onValueChange={(value) => setNewConfig({...newConfig, category_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
                    placeholder="Describe this multi-stage test configuration"
                  />
                </div>

                {/* Written Test Configuration */}
                <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-blue-800">Stage 1: Written Test</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="written_questions">Total Questions</Label>
                      <Input
                        id="written_questions"
                        type="number"
                        value={newConfig.written_total_questions}
                        onChange={(e) => setNewConfig({...newConfig, written_total_questions: parseInt(e.target.value)})}
                        min="1"
                        max="50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="written_pass">Pass Mark (%)</Label>
                      <Input
                        id="written_pass"
                        type="number"
                        value={newConfig.written_pass_mark_percentage}
                        onChange={(e) => setNewConfig({...newConfig, written_pass_mark_percentage: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="written_time">Time Limit (minutes)</Label>
                      <Input
                        id="written_time"
                        type="number"
                        value={newConfig.written_time_limit_minutes}
                        onChange={(e) => setNewConfig({...newConfig, written_time_limit_minutes: parseInt(e.target.value)})}
                        min="5"
                        max="120"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Yard Test Configuration */}
                <div className="p-4 bg-green-50 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-green-800">Stage 2: Yard Test (Competency)</h3>
                  <p className="text-green-700 text-sm">Practical skills: Reversing, Parallel Parking, Hill Start</p>
                  <div className="space-y-2">
                    <Label htmlFor="yard_pass">Pass Mark (%)</Label>
                    <Input
                      id="yard_pass"
                      type="number"
                      value={newConfig.yard_pass_mark_percentage}
                      onChange={(e) => setNewConfig({...newConfig, yard_pass_mark_percentage: parseInt(e.target.value)})}
                      min="1"
                      max="100"
                      required
                      className="max-w-32"
                    />
                  </div>
                </div>

                {/* Road Test Configuration */}
                <div className="p-4 bg-purple-50 rounded-lg space-y-4">
                  <h3 className="text-lg font-semibold text-purple-800">Stage 3: Road Test</h3>
                  <p className="text-purple-700 text-sm">Real driving: Use of Road, Three-Point Turns, Intersections</p>
                  <div className="space-y-2">
                    <Label htmlFor="road_pass">Pass Mark (%)</Label>
                    <Input
                      id="road_pass"
                      type="number"
                      value={newConfig.road_pass_mark_percentage}
                      onChange={(e) => setNewConfig({...newConfig, road_pass_mark_percentage: parseInt(e.target.value)})}
                      min="1"
                      max="100"
                      required
                      className="max-w-32"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newConfig.is_active}
                      onChange={(e) => setNewConfig({...newConfig, is_active: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Active Configuration</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newConfig.requires_officer_assignment}
                      onChange={(e) => setNewConfig({...newConfig, requires_officer_assignment: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Requires Officer Assignment</span>
                  </label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit">{editingConfig ? 'Update Configuration' : 'Create Configuration'}</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingConfig(null);
                      setNewConfig({
                        name: '',
                        description: '',
                        category_id: '',
                        written_total_questions: 20,
                        written_pass_mark_percentage: 75,
                        written_time_limit_minutes: 30,
                        yard_pass_mark_percentage: 75,
                        road_pass_mark_percentage: 75,
                        is_active: true,
                        requires_officer_assignment: true
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Configurations List */}
        <div className="grid gap-6">
          {configs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Layers className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Multi-Stage Test Configurations</h3>
                <p className="text-slate-600 mb-4">Create your first multi-stage test configuration to enable sequential testing.</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{config.name}</span>
                        <Badge variant={config.is_active ? "default" : "secondary"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      {config.description && (
                        <CardDescription>{config.description}</CardDescription>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Written Stage */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Stage 1: Written Test</h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        <p>Questions: {config.written_total_questions}</p>
                        <p>Pass Mark: {config.written_pass_mark_percentage}%</p>
                        <p>Time Limit: {config.written_time_limit_minutes} minutes</p>
                      </div>
                    </div>
                    
                    {/* Yard Stage */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Stage 2: Yard Test</h4>
                      <div className="space-y-1 text-sm text-green-700">
                        <p>Pass Mark: {config.yard_pass_mark_percentage}%</p>
                        <p>Skills: Reversing, Parallel Parking, Hill Start</p>
                        <p>Officer Required: {config.requires_officer_assignment ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    
                    {/* Road Stage */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-2">Stage 3: Road Test</h4>
                      <div className="space-y-1 text-sm text-purple-700">
                        <p>Pass Mark: {config.road_pass_mark_percentage}%</p>
                        <p>Skills: Use of Road, Three-Point Turns, Intersections</p>
                        <p>Officer Required: {config.requires_officer_assignment ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Evaluation Criteria Management Component
const EvaluationCriteriaManagement = () => {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [selectedStage, setSelectedStage] = useState('all');

  const [newCriterion, setNewCriterion] = useState({
    stage: 'yard',
    name: '',
    description: '',
    max_points: 10,
    is_critical: false,
    is_active: true
  });

  useEffect(() => {
    fetchCriteria();
  }, [selectedStage]);

  const fetchCriteria = async () => {
    try {
      const url = selectedStage === 'all' 
        ? `${API}/evaluation-criteria`
        : `${API}/evaluation-criteria?stage=${selectedStage}`;
      const response = await axios.get(url);
      setCriteria(response.data);
    } catch (error) {
      console.error('Error fetching evaluation criteria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCriterion) {
        await axios.put(`${API}/evaluation-criteria/${editingCriterion.id}`, newCriterion);
      } else {
        await axios.post(`${API}/evaluation-criteria`, newCriterion);
      }
      
      // Reset form
      setNewCriterion({
        stage: 'yard',
        name: '',
        description: '',
        max_points: 10,
        is_critical: false,
        is_active: true
      });
      setShowCreateForm(false);
      setEditingCriterion(null);
      fetchCriteria();
    } catch (error) {
      console.error('Error saving evaluation criterion:', error);
      alert(error.response?.data?.detail || 'Error saving criterion');
    }
  };

  const handleEdit = (criterion) => {
    setEditingCriterion(criterion);
    setNewCriterion(criterion);
    setShowCreateForm(true);
  };

  // Predefined criteria templates for quick creation
  const getDefaultCriteria = (stage) => {
    const yardCriteria = [
      { name: 'Reversing', description: 'Ability to reverse vehicle safely and accurately', max_points: 25, is_critical: true },
      { name: 'Parallel Parking', description: 'Successfully park vehicle between two cars', max_points: 25, is_critical: true },
      { name: 'Hill Start', description: 'Start vehicle on an incline without rolling backwards', max_points: 25, is_critical: true },
      { name: 'Vehicle Control', description: 'Overall control and handling of the vehicle', max_points: 25, is_critical: false }
    ];

    const roadCriteria = [
      { name: 'Use of Road', description: 'Proper positioning, following distance, speed control', max_points: 30, is_critical: true },
      { name: 'Three-Point Turns', description: 'Execute three-point turn safely and efficiently', max_points: 25, is_critical: true },
      { name: 'Intersections', description: 'Navigate intersections safely with proper signaling', max_points: 30, is_critical: true },
      { name: 'Traffic Rules', description: 'Adherence to traffic rules and regulations', max_points: 15, is_critical: true }
    ];

    return stage === 'yard' ? yardCriteria : roadCriteria;
  };

  const createDefaultCriteria = async (stage) => {
    const defaultCriteria = getDefaultCriteria(stage);
    try {
      for (const criterion of defaultCriteria) {
        await axios.post(`${API}/evaluation-criteria`, {
          ...criterion,
          stage: stage,
          is_active: true
        });
      }
      fetchCriteria();
    } catch (error) {
      console.error('Error creating default criteria:', error);
    }
  };

  const groupedCriteria = criteria.reduce((groups, criterion) => {
    const stage = criterion.stage;
    if (!groups[stage]) {
      groups[stage] = [];
    }
    groups[stage].push(criterion);
    return groups;
  }, {});

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Evaluation Criteria Management</h1>
            <p className="text-slate-600 mt-1">Manage checklist criteria for yard and road tests</p>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="yard">Yard Test</SelectItem>
                <SelectItem value="road">Road Test</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Criterion</span>
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingCriterion ? 'Edit Criterion' : 'Create Evaluation Criterion'}</CardTitle>
              <CardDescription>Define checklist items for officer evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage">Test Stage</Label>
                    <Select value={newCriterion.stage} onValueChange={(value) => setNewCriterion({...newCriterion, stage: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yard">Yard Test (Competency)</SelectItem>
                        <SelectItem value="road">Road Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Criterion Name</Label>
                    <Input
                      id="name"
                      value={newCriterion.name}
                      onChange={(e) => setNewCriterion({...newCriterion, name: e.target.value})}
                      placeholder="e.g., Parallel Parking"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCriterion.description}
                    onChange={(e) => setNewCriterion({...newCriterion, description: e.target.value})}
                    placeholder="Detailed description of what to evaluate"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_points">Maximum Points</Label>
                    <Input
                      id="max_points"
                      type="number"
                      value={newCriterion.max_points}
                      onChange={(e) => setNewCriterion({...newCriterion, max_points: parseInt(e.target.value)})}
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newCriterion.is_critical}
                        onChange={(e) => setNewCriterion({...newCriterion, is_critical: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Critical Criterion</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newCriterion.is_active}
                        onChange={(e) => setNewCriterion({...newCriterion, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit">{editingCriterion ? 'Update Criterion' : 'Create Criterion'}</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingCriterion(null);
                      setNewCriterion({
                        stage: 'yard',
                        name: '',
                        description: '',
                        max_points: 10,
                        is_critical: false,
                        is_active: true
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick Setup */}
        {criteria.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Create default evaluation criteria for each test stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Yard Test Criteria</h3>
                  <p className="text-sm text-green-700 mb-4">Reversing, Parallel Parking, Hill Start, Vehicle Control</p>
                  <Button size="sm" onClick={() => createDefaultCriteria('yard')}>
                    Create Yard Criteria
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">Road Test Criteria</h3>
                  <p className="text-sm text-purple-700 mb-4">Use of Road, Three-Point Turns, Intersections, Traffic Rules</p>
                  <Button size="sm" onClick={() => createDefaultCriteria('road')}>
                    Create Road Criteria
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Criteria List by Stage */}
        {Object.keys(groupedCriteria).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Evaluation Criteria</h3>
              <p className="text-slate-600 mb-4">Create evaluation criteria for officers to conduct checklist-based assessments.</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Criterion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCriteria).map(([stage, stageCriteria]) => (
              <Card key={stage}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      stage === 'yard' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {stage === 'yard' ? 'Yard Test' : 'Road Test'}
                    </span>
                    <span>({stageCriteria.length} criteria)</span>
                  </CardTitle>
                  <CardDescription>
                    {stage === 'yard' 
                      ? 'Competency yard test evaluation criteria'
                      : 'Real driving assessment criteria'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {stageCriteria.map((criterion) => (
                      <div key={criterion.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-slate-800">{criterion.name}</h4>
                            <div className="flex space-x-2">
                              <Badge variant={criterion.is_active ? "default" : "secondary"} className="text-xs">
                                {criterion.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {criterion.is_critical && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm mt-1">{criterion.description}</p>
                          <p className="text-slate-500 text-xs mt-2">Max Points: {criterion.max_points}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(criterion)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Officer Assignments Component
const OfficerAssignments = () => {
  const [sessions, setSessions] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchSessions();
    fetchOfficers();
  }, []);

  const fetchSessions = async () => {
    try {
      // Get multi-stage test sessions that need officer assignments
      const response = await axios.get(`${API}/multi-stage-tests/results`);
      const activeSessions = response.data.filter(session => 
        session.status === 'written_passed' || session.status === 'yard_passed'
      );
      setSessions(activeSessions);
    } catch (error) {
      console.error('Error fetching test sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const response = await axios.get(`${API}/candidates`);
      const officerUsers = response.data.filter(user => 
        user.role === 'Driver Assessment Officer' && user.status === 'approved'
      );
      setOfficers(officerUsers);
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const assignOfficer = async (sessionId, stage, officerId) => {
    try {
      await axios.post(`${API}/multi-stage-tests/assign-officer`, {
        session_id: sessionId,
        stage: stage,
        officer_id: officerId
      });
      
      // Refresh sessions
      fetchSessions();
      
      alert('Officer assigned successfully!');
    } catch (error) {
      console.error('Error assigning officer:', error);
      alert(error.response?.data?.detail || 'Error assigning officer');
    }
  };

  const getNextStage = (session) => {
    if (session.status === 'written_passed') return 'yard';
    if (session.status === 'yard_passed') return 'road';
    return null;
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'yard': return 'bg-green-100 text-green-800';
      case 'road': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Officer Assignments</h1>
            <p className="text-slate-600 mt-1">Assign assessment officers to practical test stages</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-3 py-1">
              {sessions.length} Sessions Pending Assignment
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {officers.length} Available Officers
            </Badge>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <UserCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Sessions Pending Assignment</h3>
              <p className="text-slate-600">All multi-stage test sessions are either completed or don't require officer assignments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session) => {
              const nextStage = getNextStage(session);
              if (!nextStage) return null;

              return (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-3">
                          <span>Test Session</span>
                          <Badge className={getStageColor(nextStage)}>
                            {nextStage === 'yard' ? 'Yard Test Required' : 'Road Test Required'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Candidate: {session.candidate_name} | Created: {new Date(session.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">Session ID: {session.id.slice(-6)}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Session Progress */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Session Progress</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Written Test: Passed</span>
                          </div>
                          {session.status === 'yard_passed' && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Yard Test: Passed</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">
                              {nextStage === 'yard' ? 'Yard Test: Pending' : 'Road Test: Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stage Details */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">
                          {nextStage === 'yard' ? 'Yard Test Requirements' : 'Road Test Requirements'}
                        </h4>
                        <div className="text-sm text-slate-600">
                          {nextStage === 'yard' ? (
                            <ul className="space-y-1">
                              <li>• Reversing</li>
                              <li>• Parallel Parking</li>
                              <li>• Hill Start</li>
                              <li>• Vehicle Control</li>
                            </ul>
                          ) : (
                            <ul className="space-y-1">
                              <li>• Use of Road</li>
                              <li>• Three-Point Turns</li>
                              <li>• Intersections</li>
                              <li>• Traffic Rules</li>
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Officer Assignment */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Assign Assessment Officer</h4>
                        {officers.length === 0 ? (
                          <p className="text-sm text-slate-600">No officers available</p>
                        ) : (
                          <div className="space-y-2">
                            {officers.slice(0, 3).map((officer) => (
                              <Button
                                key={officer.id}
                                variant="outline"
                                size="sm"
                                onClick={() => assignOfficer(session.id, nextStage, officer.id)}
                                className="w-full justify-start"
                              >
                                <User className="h-4 w-4 mr-2" />
                                {officer.first_name} {officer.last_name}
                              </Button>
                            ))}
                            {officers.length > 3 && (
                              <Select onValueChange={(officerId) => assignOfficer(session.id, nextStage, officerId)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="More officers..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {officers.slice(3).map((officer) => (
                                    <SelectItem key={officer.id} value={officer.id}>
                                      {officer.first_name} {officer.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Officer Availability Summary */}
        {officers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Assessment Officers</CardTitle>
              <CardDescription>Officers available for practical test evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officers.map((officer) => (
                  <div key={officer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {officer.first_name?.[0]}{officer.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-800">
                        {officer.first_name} {officer.last_name}
                      </p>
                      <p className="text-xs text-slate-600">Assessment Officer</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

// My Assignments Component (for Officers)
const MyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  const [evaluationResults, setEvaluationResults] = useState({});

  useEffect(() => {
    fetchMyAssignments();
    fetchEvaluationCriteria();
  }, []);

  const fetchMyAssignments = async () => {
    try {
      const response = await axios.get(`${API}/multi-stage-tests/my-assignments`);
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationCriteria = async () => {
    try {
      const response = await axios.get(`${API}/evaluation-criteria`);
      setEvaluationCriteria(response.data);
    } catch (error) {
      console.error('Error fetching evaluation criteria:', error);
    }
  };

  const startEvaluation = (session, stage) => {
    const stageCriteria = evaluationCriteria.filter(c => c.stage === stage && c.is_active);
    setCurrentEvaluation({ session, stage, criteria: stageCriteria });
    
    // Initialize evaluation results
    const initialResults = {};
    stageCriteria.forEach(criterion => {
      initialResults[criterion.id] = {
        points_awarded: 0,
        notes: ''
      };
    });
    setEvaluationResults(initialResults);
    setShowEvaluationForm(true);
  };

  const submitEvaluation = async () => {
    try {
      const { session, stage } = currentEvaluation;
      
      // Prepare evaluation data
      const criteriaResults = Object.entries(evaluationResults).map(([criterionId, result]) => ({
        criterion_id: criterionId,
        points_awarded: result.points_awarded,
        notes: result.notes
      }));

      await axios.post(`${API}/multi-stage-tests/evaluate-stage`, {
        session_id: session.id,
        stage: stage,
        criteria_results: criteriaResults,
        overall_notes: `${stage.charAt(0).toUpperCase() + stage.slice(1)} test evaluation completed`
      });

      alert('Evaluation submitted successfully!');
      setShowEvaluationForm(false);
      setCurrentEvaluation(null);
      fetchMyAssignments();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert(error.response?.data?.detail || 'Error submitting evaluation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'written_passed': return 'bg-green-100 text-green-800';
      case 'yard_passed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'yard': return 'bg-green-100 text-green-800';
      case 'road': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Assignments</h1>
            <p className="text-slate-600 mt-1">Test sessions assigned for evaluation</p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {assignments.length} Active Assignments
          </Badge>
        </div>

        {/* Evaluation Form Modal */}
        {showEvaluationForm && currentEvaluation && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center justify-between">
                <span>Evaluate {currentEvaluation.stage.charAt(0).toUpperCase() + currentEvaluation.stage.slice(1)} Test</span>
                <Button variant="outline" size="sm" onClick={() => setShowEvaluationForm(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Candidate: {currentEvaluation.session.candidate_name} | Session: {currentEvaluation.session.id.slice(-6)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {currentEvaluation.criteria.map((criterion) => (
                  <div key={criterion.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-800 flex items-center space-x-2">
                          <span>{criterion.name}</span>
                          {criterion.is_critical && (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-slate-600">{criterion.description}</p>
                      </div>
                      <div className="text-sm text-slate-500">
                        Max: {criterion.max_points} points
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Points Awarded</Label>
                        <Input
                          type="number"
                          min="0"
                          max={criterion.max_points}
                          value={evaluationResults[criterion.id]?.points_awarded || 0}
                          onChange={(e) => setEvaluationResults({
                            ...evaluationResults,
                            [criterion.id]: {
                              ...evaluationResults[criterion.id],
                              points_awarded: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Evaluation Notes</Label>
                        <Textarea
                          placeholder="Optional notes..."
                          value={evaluationResults[criterion.id]?.notes || ''}
                          onChange={(e) => setEvaluationResults({
                            ...evaluationResults,
                            [criterion.id]: {
                              ...evaluationResults[criterion.id],
                              notes: e.target.value
                            }
                          })}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowEvaluationForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitEvaluation}>
                    Submit Evaluation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Active Assignments</h3>
              <p className="text-slate-600">You don't have any test sessions assigned for evaluation at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {assignments.map((session) => {
              // Determine next stage to evaluate
              const nextStage = session.status === 'written_passed' ? 'yard' : 'road';
              
              return (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-3">
                          <span>Evaluation Assignment</span>
                          <Badge className={getStageColor(nextStage)}>
                            {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)} Test
                          </Badge>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Candidate: {session.candidate_name} | Assigned: {new Date(session.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => startEvaluation(session, nextStage)}
                        className="flex items-center space-x-2"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Start Evaluation</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Session Progress */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Session Progress</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Written Test: Passed</span>
                          </div>
                          {session.status === 'yard_passed' && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Yard Test: Passed</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">
                              {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)} Test: Assigned to You
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Evaluation Criteria */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Evaluation Criteria</h4>
                        <div className="text-sm text-slate-600">
                          {nextStage === 'yard' ? (
                            <ul className="space-y-1">
                              <li>• Reversing</li>
                              <li>• Parallel Parking</li>
                              <li>• Hill Start</li>
                              <li>• Vehicle Control</li>
                            </ul>
                          ) : (
                            <ul className="space-y-1">
                              <li>• Use of Road</li>
                              <li>• Three-Point Turns</li>
                              <li>• Intersections</li>
                              <li>• Traffic Rules</li>
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Candidate Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-800">Candidate Information</h4>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p><span className="font-medium">Name:</span> {session.candidate_name}</p>
                          <p><span className="font-medium">Session ID:</span> {session.id.slice(-8)}</p>
                          <p><span className="font-medium">Test Date:</span> {new Date(session.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Multi-Stage Analytics Component
const MultiStageAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/multi-stage-tests/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching multi-stage analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Analytics Data</h3>
            <p className="text-slate-600">Multi-stage test analytics will appear here once sessions are available.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Multi-Stage Test Analytics</h1>
            <p className="text-slate-600 mt-1">Comprehensive analytics for multi-stage testing system</p>
          </div>
          <Button onClick={fetchAnalytics} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics.total_sessions}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Layers className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics.active_sessions}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed Sessions</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics.completed_sessions}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Overall Pass Rate</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics.overall_pass_rate}%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stage-Specific Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Stage-by-Stage Performance</CardTitle>
            <CardDescription>Pass rates and performance metrics for each test stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Written Stage */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Written Test Stage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Attempts:</span>
                    <span className="font-medium">{analytics.stage_stats?.written?.attempts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Passed:</span>
                    <span className="font-medium">{analytics.stage_stats?.written?.passed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Pass Rate:</span>
                    <span className="font-medium">{analytics.stage_stats?.written?.pass_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Avg Score:</span>
                    <span className="font-medium">{analytics.stage_stats?.written?.average_score || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Yard Stage */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Yard Test Stage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-700">Attempts:</span>
                    <span className="font-medium">{analytics.stage_stats?.yard?.attempts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Passed:</span>
                    <span className="font-medium">{analytics.stage_stats?.yard?.passed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Pass Rate:</span>
                    <span className="font-medium">{analytics.stage_stats?.yard?.pass_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Avg Score:</span>
                    <span className="font-medium">{analytics.stage_stats?.yard?.average_score || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Road Stage */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Road Test Stage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Attempts:</span>
                    <span className="font-medium">{analytics.stage_stats?.road?.attempts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Passed:</span>
                    <span className="font-medium">{analytics.stage_stats?.road?.passed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Pass Rate:</span>
                    <span className="font-medium">{analytics.stage_stats?.road?.pass_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Avg Score:</span>
                    <span className="font-medium">{analytics.stage_stats?.road?.average_score || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Configuration Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Multi-Stage Sessions</CardTitle>
              <CardDescription>Latest test session activity</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recent_sessions && analytics.recent_sessions.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recent_sessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{session.candidate_name}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {session.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-8">No recent sessions</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Configuration Usage</CardTitle>
              <CardDescription>Multi-stage test configuration statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.config_usage && analytics.config_usage.length > 0 ? (
                <div className="space-y-3">
                  {analytics.config_usage.map((config, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{config.config_name}</p>
                        <p className="text-sm text-slate-600">{config.sessions_count} sessions</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{config.success_rate}% success</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-8">No configuration data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Officer Performance (if available) */}
        {analytics.officer_stats && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment Officer Performance</CardTitle>
              <CardDescription>Performance metrics for practical test evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.officer_stats.map((officer, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {officer.officer_name?.split(' ').map(n => n[0]).join('') || 'O'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-800">{officer.officer_name}</p>
                        <p className="text-xs text-slate-600">Assessment Officer</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Evaluations:</span>
                        <span className="font-medium">{officer.total_evaluations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Avg Score Given:</span>
                        <span className="font-medium">{officer.average_score_given}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

// =============================================================================
// PHASE 7: SPECIAL TESTS & RESIT MANAGEMENT SYSTEM COMPONENTS
// =============================================================================

// Special Test Categories Component
const SpecialTestCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    category_code: '',
    requirements: [],
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/special-test-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching special test categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/special-test-categories/${editingCategory.id}`, newCategory);
      } else {
        await axios.post(`${API}/special-test-categories`, newCategory);
      }
      
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving special test category:', error);
      alert(error.response?.data?.detail || 'Error saving category');
    }
  };

  const resetForm = () => {
    setNewCategory({
      name: '',
      description: '',
      category_code: '',
      requirements: [],
      is_active: true
    });
    setShowCreateForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setNewCategory(category);
    setShowCreateForm(true);
  };

  const addRequirement = () => {
    const requirement = prompt('Enter a requirement:');
    if (requirement) {
      setNewCategory({
        ...newCategory,
        requirements: [...newCategory.requirements, requirement]
      });
    }
  };

  const removeRequirement = (index) => {
    setNewCategory({
      ...newCategory,
      requirements: newCategory.requirements.filter((_, i) => i !== index)
    });
  };

  const predefinedCategories = [
    {
      name: 'Public Passenger Vehicle (PPV)',
      category_code: 'PPV',
      description: 'License for driving buses, taxis, and other public passenger vehicles',
      requirements: ['Valid Class C License for 3+ years', 'Medical certificate', 'Driving record check']
    },
    {
      name: 'Commercial Driver License (CDL)',
      category_code: 'CDL',
      description: 'License for driving commercial vehicles over 26,000 lbs',
      requirements: ['Valid Class C License for 2+ years', 'DOT medical certificate', 'Background check']
    },
    {
      name: 'Hazardous Materials (HazMat)',
      category_code: 'HMT',
      description: 'Endorsement for transporting hazardous materials',
      requirements: ['Valid CDL', 'TSA security clearance', 'Specialized training certificate', 'Background check']
    }
  ];

  const createPredefinedCategory = async (predefined) => {
    try {
      await axios.post(`${API}/special-test-categories`, {
        ...predefined,
        is_active: true
      });
      fetchCategories();
    } catch (error) {
      console.error('Error creating predefined category:', error);
      alert('Error creating category');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Special Test Categories</h1>
            <p className="text-slate-600 mt-1">Manage special driver test categories (PPV, Commercial, HazMat)</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
            <Award className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingCategory ? 'Edit Special Test Category' : 'Create Special Test Category'}</CardTitle>
              <CardDescription>Configure special test categories with specific requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="e.g., Public Passenger Vehicle"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_code">Category Code</Label>
                    <Input
                      id="category_code"
                      value={newCategory.category_code}
                      onChange={(e) => setNewCategory({...newCategory, category_code: e.target.value.toUpperCase()})}
                      placeholder="e.g., PPV"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newCategory.is_active}
                        onChange={(e) => setNewCategory({...newCategory, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    placeholder="Describe this special test category"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Requirements/Prerequisites</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addRequirement}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                  {newCategory.requirements.length > 0 && (
                    <div className="space-y-2">
                      {newCategory.requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm">{req}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeRequirement(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit">{editingCategory ? 'Update Category' : 'Create Category'}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick Setup */}
        {categories.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Create common special test categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {predefinedCategories.map((category, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-medium text-slate-800 mb-2">{category.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{category.description}</p>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-700 mb-1">Requirements:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {category.requirements.map((req, reqIndex) => (
                          <li key={reqIndex}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                    <Button size="sm" onClick={() => createPredefinedCategory(category)}>
                      Create {category.category_code}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        <div className="grid gap-6">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Special Test Categories</h3>
                <p className="text-slate-600 mb-4">Create special test categories for PPV, Commercial, or HazMat licenses.</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Award className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>{category.name}</span>
                        <Badge className="bg-blue-100 text-blue-800">{category.category_code}</Badge>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      {category.description && (
                        <CardDescription>{category.description}</CardDescription>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.requirements && category.requirements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-800 mb-3">Requirements & Prerequisites:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {category.requirements.map((req, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-slate-700">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Special Test Configurations Component
const SpecialTestConfigurations = () => {
  const [configurations, setConfigurations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specialCategories, setSpecialCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const [newConfig, setNewConfig] = useState({
    category_id: '',
    special_category_id: '',
    name: '',
    description: '',
    written_total_questions: 25,
    written_pass_mark_percentage: 80,
    written_time_limit_minutes: 40,
    written_difficulty_distribution: { easy: 20, medium: 50, hard: 30 },
    yard_pass_mark_percentage: 80,
    road_pass_mark_percentage: 80,
    requires_medical_certificate: false,
    requires_background_check: false,
    minimum_experience_years: null,
    additional_documents: [],
    is_active: true,
    requires_officer_assignment: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configsRes, categoriesRes, specialCatsRes] = await Promise.all([
        axios.get(`${API}/special-test-configs`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/special-test-categories`)
      ]);
      
      setConfigurations(configsRes.data);
      setCategories(categoriesRes.data);
      setSpecialCategories(specialCatsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...newConfig,
        minimum_experience_years: newConfig.minimum_experience_years === '' ? null : parseInt(newConfig.minimum_experience_years)
      };

      if (editingConfig) {
        await axios.put(`${API}/special-test-configs/${editingConfig.id}`, submitData);
      } else {
        await axios.post(`${API}/special-test-configs`, submitData);
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(error.response?.data?.detail || 'Error saving configuration');
    }
  };

  const resetForm = () => {
    setNewConfig({
      category_id: '',
      special_category_id: '',
      name: '',
      description: '',
      written_total_questions: 25,
      written_pass_mark_percentage: 80,
      written_time_limit_minutes: 40,
      written_difficulty_distribution: { easy: 20, medium: 50, hard: 30 },
      yard_pass_mark_percentage: 80,
      road_pass_mark_percentage: 80,
      requires_medical_certificate: false,
      requires_background_check: false,
      minimum_experience_years: null,
      additional_documents: [],
      is_active: true,
      requires_officer_assignment: true
    });
    setShowCreateForm(false);
    setEditingConfig(null);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setNewConfig(config);
    setShowCreateForm(true);
  };

  const addDocument = () => {
    const document = prompt('Enter additional document requirement:');
    if (document) {
      setNewConfig({
        ...newConfig,
        additional_documents: [...newConfig.additional_documents, document]
      });
    }
  };

  const removeDocument = (index) => {
    setNewConfig({
      ...newConfig,
      additional_documents: newConfig.additional_documents.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Special Test Configurations</h1>
            <p className="text-slate-600 mt-1">Configure parameters for special driver tests</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Add Configuration</span>
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingConfig ? 'Edit Configuration' : 'Create Special Test Configuration'}</CardTitle>
              <CardDescription>Configure customizable parameters for special driver tests</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Configuration Name</Label>
                    <Input
                      id="name"
                      value={newConfig.name}
                      onChange={(e) => setNewConfig({...newConfig, name: e.target.value})}
                      placeholder="e.g., PPV Standard Test"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Base Test Category</Label>
                    <select
                      id="category_id"
                      value={newConfig.category_id}
                      onChange={(e) => setNewConfig({...newConfig, category_id: e.target.value})}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Select base category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="special_category_id">Special Test Type</Label>
                    <select
                      id="special_category_id"
                      value={newConfig.special_category_id}
                      onChange={(e) => setNewConfig({...newConfig, special_category_id: e.target.value})}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Select special type</option>
                      {specialCategories.map((special) => (
                        <option key={special.id} value={special.id}>{special.name} ({special.category_code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_experience_years">Minimum Experience (Years)</Label>
                    <Input
                      id="minimum_experience_years"
                      type="number"
                      value={newConfig.minimum_experience_years || ''}
                      onChange={(e) => setNewConfig({...newConfig, minimum_experience_years: e.target.value})}
                      placeholder="e.g., 2"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
                    placeholder="Describe this configuration"
                    rows={3}
                  />
                </div>

                {/* Written Test Parameters */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-4">Written Test Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="written_total_questions">Total Questions</Label>
                      <Input
                        id="written_total_questions"
                        type="number"
                        value={newConfig.written_total_questions}
                        onChange={(e) => setNewConfig({...newConfig, written_total_questions: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="written_pass_mark_percentage">Pass Mark (%)</Label>
                      <Input
                        id="written_pass_mark_percentage"
                        type="number"
                        value={newConfig.written_pass_mark_percentage}
                        onChange={(e) => setNewConfig({...newConfig, written_pass_mark_percentage: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="written_time_limit_minutes">Time Limit (Minutes)</Label>
                      <Input
                        id="written_time_limit_minutes"
                        type="number"
                        value={newConfig.written_time_limit_minutes}
                        onChange={(e) => setNewConfig({...newConfig, written_time_limit_minutes: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Practical Test Parameters */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-4">Practical Test Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yard_pass_mark_percentage">Yard Test Pass Mark (%)</Label>
                      <Input
                        id="yard_pass_mark_percentage"
                        type="number"
                        value={newConfig.yard_pass_mark_percentage}
                        onChange={(e) => setNewConfig({...newConfig, yard_pass_mark_percentage: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="road_pass_mark_percentage">Road Test Pass Mark (%)</Label>
                      <Input
                        id="road_pass_mark_percentage"
                        type="number"
                        value={newConfig.road_pass_mark_percentage}
                        onChange={(e) => setNewConfig({...newConfig, road_pass_mark_percentage: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-4">Special Requirements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newConfig.requires_medical_certificate}
                        onChange={(e) => setNewConfig({...newConfig, requires_medical_certificate: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Requires Medical Certificate</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newConfig.requires_background_check}
                        onChange={(e) => setNewConfig({...newConfig, requires_background_check: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Requires Background Check</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newConfig.requires_officer_assignment}
                        onChange={(e) => setNewConfig({...newConfig, requires_officer_assignment: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Requires Officer Assignment</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newConfig.is_active}
                        onChange={(e) => setNewConfig({...newConfig, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>

                {/* Additional Documents */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Additional Document Requirements</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                  {newConfig.additional_documents.length > 0 && (
                    <div className="space-y-2">
                      {newConfig.additional_documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm">{doc}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit">{editingConfig ? 'Update Configuration' : 'Create Configuration'}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Configurations List */}
        <div className="grid gap-6">
          {configurations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Special Test Configurations</h3>
                <p className="text-slate-600 mb-4">Create customized test configurations for special license categories.</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Create First Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            configurations.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>{config.name}</span>
                        <Badge variant={config.is_active ? "default" : "secondary"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      {config.description && (
                        <CardDescription>{config.description}</CardDescription>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Written Test</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Questions: {config.written_total_questions}</p>
                        <p>Pass Mark: {config.written_pass_mark_percentage}%</p>
                        <p>Time Limit: {config.written_time_limit_minutes} mins</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Practical Tests</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Yard Pass Mark: {config.yard_pass_mark_percentage}%</p>
                        <p>Road Pass Mark: {config.road_pass_mark_percentage}%</p>
                        {config.minimum_experience_years && (
                          <p>Min Experience: {config.minimum_experience_years} years</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Requirements</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        {config.requires_medical_certificate && <p>✓ Medical Certificate</p>}
                        {config.requires_background_check && <p>✓ Background Check</p>}
                        {config.requires_officer_assignment && <p>✓ Officer Assignment</p>}
                        {config.additional_documents && config.additional_documents.length > 0 && (
                          <p>+ {config.additional_documents.length} additional documents</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Resit Management Component (for Staff)
const ResitManagement = () => {
  const [resits, setResits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'scheduled', 'completed'

  useEffect(() => {
    fetchResits();
  }, []);

  const fetchResits = async () => {
    try {
      const response = await axios.get(`${API}/resits/all`);
      setResits(response.data);
    } catch (error) {
      console.error('Error fetching resits:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveResit = async (resitId) => {
    try {
      await axios.put(`${API}/resits/${resitId}/approve`);
      fetchResits(); // Refresh the list
      alert('Resit approved successfully');
    } catch (error) {
      console.error('Error approving resit:', error);
      alert(error.response?.data?.detail || 'Error approving resit');
    }
  };

  const filteredResits = resits.filter(resit => {
    if (filter === 'all') return true;
    return resit.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Resit Management</h1>
            <p className="text-slate-600 mt-1">Manage candidate resit requests and approvals</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 border-b">
          {['all', 'pending', 'scheduled', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                filter === status
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs">
                {status === 'all' ? resits.length : resits.filter(r => r.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {/* Resits List */}
        <div className="space-y-4">
          {filteredResits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Resit Requests</h3>
                <p className="text-slate-600">No resit requests found for the selected filter.</p>
              </CardContent>
            </Card>
          ) : (
            filteredResits.map((resit) => (
              <Card key={resit.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>Resit Request #{resit.id.slice(-8)}</span>
                        <Badge className={getStatusColor(resit.status)}>
                          {resit.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Candidate ID: {resit.candidate_id} • Attempt #{resit.resit_attempt_number}
                      </CardDescription>
                    </div>
                    {resit.status === 'pending' && (
                      <Button onClick={() => approveResit(resit.id)} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Failed Stages</h4>
                      <div className="space-y-1">
                        {resit.resit_stages?.map((stage) => (
                          <Badge key={stage} variant="outline" className="mr-2">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Requested Schedule</h4>
                      <div className="text-sm text-slate-600">
                        <p>Date: {resit.requested_date}</p>
                        <p>Time: {resit.requested_time_slot}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Request Details</h4>
                      <div className="text-sm text-slate-600">
                        <p>Original Session: {resit.original_session_id?.slice(-8)}</p>
                        <p>Created: {new Date(resit.created_at).toLocaleDateString()}</p>
                        {resit.reason && (
                          <p className="mt-2">
                            <span className="font-medium">Reason:</span> {resit.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {resit.notes && (
                    <div className="mt-4 p-3 bg-slate-50 rounded">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {resit.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center space-x-4 text-sm text-slate-600">
                    {resit.photo_recaptured && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Photo Recaptured</span>
                      </div>
                    )}
                    {resit.identity_reverified && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Identity Reverified</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// My Resits Component (for Candidates)
const MyResits = () => {
  const [resits, setResits] = useState([]);
  const [testSessions, setTestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState('');
  
  const [newResit, setNewResit] = useState({
    original_session_id: '',
    failed_stages: [],
    requested_appointment_date: '',
    requested_time_slot: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resitsRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/resits/my-resits`),
        axios.get(`${API}/multi-stage-test-sessions/my-sessions`)
      ]);
      
      setResits(resitsRes.data);
      // Filter sessions that have failed stages
      const failedSessions = sessionsRes.data.filter(session => 
        session.status === 'failed' || 
        (session.written_score !== undefined && session.written_score < 75) ||
        session.yard_passed === false ||
        session.road_passed === false
      );
      setTestSessions(failedSessions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionChange = (sessionId) => {
    setSelectedSession(sessionId);
    const session = testSessions.find(s => s.id === sessionId);
    if (session) {
      const failedStages = [];
      if (session.written_score !== undefined && session.written_score < 75) {
        failedStages.push('written');
      }
      if (session.yard_passed === false) {
        failedStages.push('yard');
      }
      if (session.road_passed === false) {
        failedStages.push('road');
      }
      
      setNewResit({
        ...newResit,
        original_session_id: sessionId,
        failed_stages: failedStages
      });
    }
  };

  const handleStageToggle = (stage) => {
    const stages = newResit.failed_stages.includes(stage)
      ? newResit.failed_stages.filter(s => s !== stage)
      : [...newResit.failed_stages, stage];
    
    setNewResit({...newResit, failed_stages: stages});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/resits/request`, newResit);
      setNewResit({
        original_session_id: '',
        failed_stages: [],
        requested_appointment_date: '',
        requested_time_slot: '',
        reason: '',
        notes: ''
      });
      setShowRequestForm(false);
      setSelectedSession('');
      fetchData();
      alert('Resit request submitted successfully');
    } catch (error) {
      console.error('Error submitting resit request:', error);
      alert(error.response?.data?.detail || 'Error submitting request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Resits</h1>
            <p className="text-slate-600 mt-1">Request and track resits for failed test stages</p>
          </div>
          {testSessions.length > 0 && (
            <Button onClick={() => setShowRequestForm(true)} className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Request Resit</span>
            </Button>
          )}
        </div>

        {/* Request Resit Form */}
        {showRequestForm && (
          <Card>
            <CardHeader>
              <CardTitle>Request Resit</CardTitle>
              <CardDescription>Request to retake failed stages of your test</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session">Select Test Session</Label>
                  <select
                    id="session"
                    value={selectedSession}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a failed test session</option>
                    {testSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        Session {session.id.slice(-8)} - {new Date(session.created_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                {newResit.failed_stages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Failed Stages to Resit</Label>
                    <div className="space-y-2">
                      {['written', 'yard', 'road'].map((stage) => (
                        <label key={stage} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newResit.failed_stages.includes(stage)}
                            onChange={() => handleStageToggle(stage)}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{stage} Test</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newResit.requested_appointment_date}
                      onChange={(e) => setNewResit({...newResit, requested_appointment_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_slot">Preferred Time Slot</Label>
                    <Input
                      id="time_slot"
                      value={newResit.requested_time_slot}
                      onChange={(e) => setNewResit({...newResit, requested_time_slot: e.target.value})}
                      placeholder="e.g., 09:00-10:00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Resit</Label>
                  <Textarea
                    id="reason"
                    value={newResit.reason}
                    onChange={(e) => setNewResit({...newResit, reason: e.target.value})}
                    placeholder="Explain why you need to resit these stages"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={newResit.notes}
                    onChange={(e) => setNewResit({...newResit, notes: e.target.value})}
                    placeholder="Any additional information"
                    rows={2}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit">Submit Request</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowRequestForm(false);
                    setSelectedSession('');
                    setNewResit({
                      original_session_id: '',
                      failed_stages: [],
                      requested_appointment_date: '',
                      requested_time_slot: '',
                      reason: '',
                      notes: ''
                    });
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Resit Requests */}
        <div className="space-y-4">
          {resits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Resit Requests</h3>
                <p className="text-slate-600 mb-4">
                  {testSessions.length === 0 
                    ? "You don't have any failed test sessions that can be resit."
                    : "You haven't requested any resits yet."
                  }
                </p>
                {testSessions.length > 0 && (
                  <Button onClick={() => setShowRequestForm(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Request Your First Resit
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            resits.map((resit) => (
              <Card key={resit.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>Resit Request #{resit.id.slice(-8)}</span>
                        <Badge className={getStatusColor(resit.status)}>
                          {resit.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Attempt #{resit.resit_attempt_number} • Submitted {new Date(resit.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Stages to Resit</h4>
                      <div className="space-y-1">
                        {resit.resit_stages?.map((stage) => (
                          <Badge key={stage} variant="outline" className="mr-2">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Requested Schedule</h4>
                      <div className="text-sm text-slate-600">
                        <p>Date: {resit.requested_date}</p>
                        <p>Time: {resit.requested_time_slot}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Status</h4>
                      <div className="text-sm text-slate-600">
                        <p>Current: {resit.status}</p>
                        {resit.approved_at && (
                          <p>Approved: {new Date(resit.approved_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {resit.reason && (
                    <div className="mt-4 p-3 bg-slate-50 rounded">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Reason:</span> {resit.reason}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center space-x-4 text-sm text-slate-600">
                    {resit.photo_recaptured && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Photo Recaptured</span>
                      </div>
                    )}
                    {resit.identity_reverified && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Identity Reverified</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Reschedule Appointment Component (for Candidates)
const RescheduleAppointment = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const [rescheduleData, setRescheduleData] = useState({
    new_date: '',
    new_time_slot: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments/my-appointments`);
      // Filter only appointments that can be rescheduled (scheduled, confirmed)
      const reschedulableAppointments = response.data.filter(apt => 
        ['scheduled', 'confirmed'].includes(apt.status)
      );
      setAppointments(reschedulableAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/appointments/${selectedAppointment.id}/reschedule`, {
        appointment_id: selectedAppointment.id,
        ...rescheduleData
      });
      
      setRescheduleData({
        new_date: '',
        new_time_slot: '',
        reason: '',
        notes: ''
      });
      setShowRescheduleForm(false);
      setSelectedAppointment(null);
      fetchAppointments();
      alert('Appointment rescheduled successfully');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert(error.response?.data?.detail || 'Error rescheduling appointment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reschedule Appointment</h1>
            <p className="text-slate-600 mt-1">Change the date and time of your test appointments</p>
          </div>
        </div>

        {/* Reschedule Form */}
        {showRescheduleForm && selectedAppointment && (
          <Card>
            <CardHeader>
              <CardTitle>Reschedule Appointment</CardTitle>
              <CardDescription>
                Current appointment: {selectedAppointment.appointment_date} at {selectedAppointment.time_slot}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_date">New Date</Label>
                    <Input
                      id="new_date"
                      type="date"
                      value={rescheduleData.new_date}
                      onChange={(e) => setRescheduleData({...rescheduleData, new_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_time_slot">New Time Slot</Label>
                    <Input
                      id="new_time_slot"
                      value={rescheduleData.new_time_slot}
                      onChange={(e) => setRescheduleData({...rescheduleData, new_time_slot: e.target.value})}
                      placeholder="e.g., 09:00-10:00"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Rescheduling</Label>
                  <Textarea
                    id="reason"
                    value={rescheduleData.reason}
                    onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                    placeholder="Please explain why you need to reschedule"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={rescheduleData.notes}
                    onChange={(e) => setRescheduleData({...rescheduleData, notes: e.target.value})}
                    placeholder="Any additional information"
                    rows={2}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit">Reschedule</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowRescheduleForm(false);
                    setSelectedAppointment(null);
                    setRescheduleData({
                      new_date: '',
                      new_time_slot: '',
                      reason: '',
                      notes: ''
                    });
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Appointments List */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">No Appointments to Reschedule</h3>
                <p className="text-slate-600">You don't have any scheduled appointments that can be rescheduled.</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>Appointment #{appointment.id.slice(-8)}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {appointment.appointment_date} at {appointment.time_slot}
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => handleReschedule(appointment)}
                      className="flex items-center space-x-2"
                    >
                      <History className="h-4 w-4" />
                      <span>Reschedule</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Test Details</h4>
                      <div className="text-sm text-slate-600">
                        <p>Configuration: {appointment.test_config_name || 'Standard Test'}</p>
                        <p>Location: Test Center</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Current Schedule</h4>
                      <div className="text-sm text-slate-600">
                        <p>Date: {appointment.appointment_date}</p>
                        <p>Time: {appointment.time_slot}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">Status</h4>
                      <div className="text-sm text-slate-600">
                        <p>Current: {appointment.status}</p>
                        <p>Booked: {new Date(appointment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 p-3 bg-slate-50 rounded">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Failed Stages Analytics Component (for Admin)
const FailedStagesAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/failed-stages/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stageStats = analytics?.stage_failure_stats || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Failed Stages Analytics</h1>
          <p className="text-slate-600 mt-1">Analysis of test stage failures and resit performance</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Resit Requests</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics?.total_resit_requests || 0}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Successful Resits</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics?.successful_resits || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Resit Success Rate</p>
                  <p className="text-2xl font-bold text-slate-800">{analytics?.resit_success_rate?.toFixed(1) || 0}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Failure Records</p>
                  <p className="text-2xl font-bold text-slate-800">{stageStats.reduce((sum, stat) => sum + stat.total_failures, 0)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stage Failure Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Failure Statistics</CardTitle>
            <CardDescription>Breakdown of failures by test stage</CardDescription>
          </CardHeader>
          <CardContent>
            {stageStats.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No failure statistics available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stageStats.map((stat) => (
                  <div key={stat._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-800 capitalize">{stat._id} Test</h3>
                      <Badge variant="outline" className="text-red-600">
                        {stat.total_failures} failures
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Total Failures</p>
                        <p className="text-lg font-semibold text-slate-800">{stat.total_failures}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Unique Candidates</p>
                        <p className="text-lg font-semibold text-slate-800">{stat.unique_candidates}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Average Score</p>
                        <p className="text-lg font-semibold text-slate-800">
                          {stat.avg_score ? `${stat.avg_score.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar showing failure rate */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                        <span>Failure Impact</span>
                        <span>{stat.unique_candidates} candidates affected</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((stat.total_failures / Math.max(...stageStats.map(s => s.total_failures))) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resit Performance Summary */}
        {analytics && analytics.total_resit_requests > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resit Performance Summary</CardTitle>
              <CardDescription>Overall resit management performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Resit Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Requests:</span>
                      <span className="font-medium">{analytics.total_resit_requests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Successful:</span>
                      <span className="font-medium text-green-600">{analytics.successful_resits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Success Rate:</span>
                      <span className="font-medium">{analytics.resit_success_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Performance Indicator</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                        <span>Resit Success Rate</span>
                        <span>{analytics.resit_success_rate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            analytics.resit_success_rate >= 80 ? 'bg-green-500' :
                            analytics.resit_success_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{width: `${Math.min(analytics.resit_success_rate, 100)}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {analytics.resit_success_rate >= 80 ? 'Excellent' :
                         analytics.resit_success_rate >= 60 ? 'Good' : 'Needs Improvement'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default App;