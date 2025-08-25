import React from 'react';

export const Card = ({ children, className = '' }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex justify-between items-center border rounded-lg p-4 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '' }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`w-full ${className}`}>
    {children}
  </div>
);
