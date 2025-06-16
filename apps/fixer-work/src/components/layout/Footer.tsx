import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Fixer Work</h3>
            <p className="text-sm text-muted-foreground">
              Find local jobs and earn money with your skills.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">For Workers</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary">
                  Find Jobs
                </Link>
              </li>
              <li>
                <Link to="/applications" className="text-sm text-muted-foreground hover:text-primary">
                  My Applications
                </Link>
              </li>
              <li>
                <Link to="/earnings" className="text-sm text-muted-foreground hover:text-primary">
                  Earnings
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Account</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-sm text-muted-foreground hover:text-primary">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-sm text-muted-foreground hover:text-primary">
                  Settings
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-muted-foreground hover:text-primary">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Fixer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}