
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, BarChart2, Package, Users, ShoppingCart } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            Welcome to Insight Inventory
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            The complete inventory management system to track products, sales, and business insights all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Sign In <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/auth?tab=signup')}>
                  Create Account
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-blue-100 p-3 rounded-full inline-flex mb-4">
                <BarChart2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">Track sales performance and inventory levels with powerful dashboards</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-green-100 p-3 rounded-full inline-flex mb-4">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Inventory Management</h3>
              <p className="text-gray-600">Manage product stock levels, track movements, and prevent shortages</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-purple-100 p-3 rounded-full inline-flex mb-4">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Sales Processing</h3>
              <p className="text-gray-600">Record sales with a fast barcode scanner and manage transactions</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="bg-orange-100 p-3 rounded-full inline-flex mb-4">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">User Management</h3>
              <p className="text-gray-600">Assign roles and permissions to ensure data security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to streamline your inventory management?</h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of businesses that trust Insight Inventory to run their operations efficiently.
          </p>
          {!user && (
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Welcome;
