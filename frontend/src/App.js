import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
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
import { CalendarIcon, User, Users, FileCheck, Shield, Settings, Camera, CheckCircle, XCircle, Clock, LogOut, Home, BookOpen, Plus, Upload, Eye, Edit, Trash2, FileText, Play } from 'lucide-react';
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
        { label: 'My Profile', path: '/profile', icon: User }
      ];
    } else {
      const staffItems = [
        ...baseItems,
        { label: 'Candidates', path: '/candidates', icon: Users },
        { label: 'Pending Approvals', path: '/approvals', icon: FileCheck }
      ];
      
      // Question Bank items for staff
      if (user.role === 'Administrator') {
        staffItems.push(
          { label: 'Test Categories', path: '/categories', icon: BookOpen },
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Question Approvals', path: '/question-approvals', icon: CheckCircle }
        );
      } else if (user.role === 'Regional Director') {
        staffItems.push(
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Question Approvals', path: '/question-approvals', icon: CheckCircle }
        );
      } else if (user.role in ['Driver Assessment Officer', 'Manager']) {
        staffItems.push(
          { label: 'Question Bank', path: '/questions', icon: FileText },
          { label: 'Create Question', path: '/create-question', icon: Plus }
        );
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;