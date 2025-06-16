import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, User, Menu } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold text-primary">Fixer Work</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/jobs" className="text-sm font-medium hover:text-primary">
              Find Jobs
            </Link>
            <Link to="/applications" className="text-sm font-medium hover:text-primary">
              My Applications
            </Link>
            <Link to="/profile" className="text-sm font-medium hover:text-primary">
              My Profile
            </Link>
          </nav>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </Button>
            
            <Button variant="outline" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>Account</span>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t mt-3">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/jobs" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Find Jobs
              </Link>
              <Link 
                to="/applications" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                My Applications
              </Link>
              <Link 
                to="/profile" 
                className="text-sm font-medium hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                My Profile
              </Link>
              <div className="pt-2 border-t flex items-center justify-between">
                <Button variant="outline" size="sm" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Account</span>
                </Button>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}