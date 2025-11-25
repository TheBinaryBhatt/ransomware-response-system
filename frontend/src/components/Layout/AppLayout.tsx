// src/components/Layout/AppLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CyberBackground from '../3D/CyberBackground';

const AppLayout: React.FC = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-dark-primary text-cream">
      {/* 3D background layer (canvas) */}
      <CyberBackground />

      {/* Foreground layout (z-indexed above the canvas) */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Frosted header and content container */}
          <Header />
          <main className="flex-1 overflow-auto bg-dark-primary/50 backdrop-blur-sm">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
