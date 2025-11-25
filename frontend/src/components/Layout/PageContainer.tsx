// src/components/Layout/PageContainer.tsx
import React from "react";
import type { ReactNode } from "react";

const PageContainer: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`p-6 space-y-6 max-w-full mx-auto ${className}`}>
      {children}
    </div>
  );
};

export default PageContainer;
