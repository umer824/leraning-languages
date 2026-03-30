import React from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { useAppStore } from './store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  const { user } = useAppStore();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen font-sans antialiased">
        {user ? <Dashboard /> : <LandingPage />}
      </div>
    </QueryClientProvider>
  );
}
