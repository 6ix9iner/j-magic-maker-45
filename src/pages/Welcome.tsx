
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, BarChart2, Package, Users, ShoppingCart } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => {
      el.classList.add('opacity-0', 'translate-y-10', 'transition-all', 'duration-1000');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        heroRef.current.style.backgroundPositionY = `${scrollY * 0.5}px`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const testimonials = [
    {
      quote: "Insight Inventory transformed our business operations completely. Our inventory management has never been more efficient.",
      author: "Jane Cooper",
      role: "CEO, Retail Solutions"
    },
    {
      quote: "The analytics and reporting features have provided us with invaluable insights into our business performance.",
      author: "Robert Fox",
      role: "Operations Manager, Global Supplies"
    },
    {
      quote: "The barcode scanner integration saves us hours of manual work every day. Highly recommend!",
      author: "Alex Morgan",
      role: "Store Manager, Quick Mart"
    }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section with Gradient Background */}
      <section 
        ref={heroRef}
        className="py-24 px-4 sm:px-6 lg:px-8 text-center relative bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 text-white overflow-hidden"
        style={{ backgroundSize: '200% 200%', animation: 'gradient-animation 15s ease infinite' }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwMCIgaGVpZ2h0PSI5MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGZpbGw9IiNmZmYiIGN4PSI5MDAiIGN5PSIyNTAiIHI9IjEwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGZpbGw9IiNmZmYiIGN4PSIxMTAwIiBjeT0iMTUwIiByPSI2MCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48Y2lyY2xlIGZpbGw9IiNmZmYiIGN4PSI3MDAiIGN5PSI0MDAiIHI9IjgwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjMwMCIgY3k9IjMwMCIgcj0iNzAiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-40 bg-no-repeat bg-cover"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="animate-on-scroll">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-8 drop-shadow-lg">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Welcome to Insight Inventory
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
              The complete inventory management system to track products, sales, and business insights all in one beautiful place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-on-scroll">
            {user ? (
              <Button 
                size="lg" 
                onClick={() => navigate('/dashboard')}
                className="bg-white text-purple-600 hover:bg-blue-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Go to Dashboard <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="bg-white text-purple-600 hover:bg-blue-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Sign In <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate('/auth?tab=signup')}
                  className="bg-transparent border-2 border-white text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                >
                  Create Account
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Animated waves */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full">
            <path fill="#ffffff" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,202.7C672,203,768,181,864,186.7C960,192,1056,224,1152,218.7C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </section>

      {/* Features with Hover Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6 animate-on-scroll">Premium Features</h2>
          <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto animate-on-scroll">
            Everything you need to manage your business efficiently in one elegant solution.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-on-scroll">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-full inline-flex mb-6 shadow-md">
                <BarChart2 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Real-time Analytics</h3>
              <p className="text-gray-600">Track sales performance and inventory levels with powerful interactive dashboards</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-on-scroll">
              <div className="bg-gradient-to-br from-green-500 to-teal-500 p-3 rounded-full inline-flex mb-6 shadow-md">
                <Package className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Inventory Management</h3>
              <p className="text-gray-600">Manage product stock levels, track movements, and prevent shortages</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-on-scroll">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-full inline-flex mb-6 shadow-md">
                <ShoppingCart className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Sales Processing</h3>
              <p className="text-gray-600">Record sales with a fast barcode scanner and manage transactions seamlessly</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-on-scroll">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-full inline-flex mb-6 shadow-md">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">User Management</h3>
              <p className="text-gray-600">Assign roles and permissions to team members to ensure data security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 animate-on-scroll">What Our Clients Say</h2>
          
          <Carousel className="w-full max-w-4xl mx-auto animate-on-scroll">
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index}>
                  <Card className="border-none shadow-xl">
                    <CardContent className="flex flex-col items-center p-12 bg-white rounded-xl">
                      <svg width="45" height="36" className="mb-6 text-purple-600" viewBox="0 0 45 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 18H9C9 13 11 9.66667 15 8V12C13 12.6667 12 14.3333 12 17V18H13.5V36H0V18H4.5C4.5 12 6.5 6 13.5 0V4.5C8.5 9.5 8.5 13.5 9 18H13.5ZM40.5 18H36C36 13 38 9.66667 42 8V12C40 12.6667 39 14.3333 39 17V18H40.5V36H27V18H31.5C31.5 12 33.5 6 40.5 0V4.5C35.5 9.5 35.5 13.5 36 18H40.5Z" fill="currentColor"/>
                      </svg>
                      <p className="text-xl text-gray-700 mb-8 text-center italic font-light">{testimonial.quote}</p>
                      <h4 className="font-semibold mb-1">{testimonial.author}</h4>
                      <p className="text-gray-500 text-sm">{testimonial.role}</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-8 flex justify-center gap-2">
              <CarouselPrevious className="relative !static flex" />
              <CarouselNext className="relative !static flex" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 animate-on-scroll">Ready to streamline your inventory management?</h2>
          <p className="text-xl text-blue-100 mb-10 animate-on-scroll">
            Join thousands of businesses that trust Insight Inventory to run their operations efficiently.
          </p>
          {!user && (
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-white text-purple-600 hover:bg-blue-100 transition-all duration-300 transform hover:scale-105 shadow-lg animate-on-scroll"
            >
              Get Started Now <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>

      {/* Add custom CSS for animations */}
      <style>
        {`
          @keyframes gradient-animation {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </div>
  );
};

export default Welcome;
