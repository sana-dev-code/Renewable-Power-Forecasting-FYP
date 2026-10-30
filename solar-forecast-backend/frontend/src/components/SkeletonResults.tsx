import React from 'react';

export const SkeletonResults: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
    <div className="skeleton h-14 rounded-xl" />
    <div className="skeleton h-72 rounded-xl" />
    <div className="skeleton h-48 rounded-xl" />
  </div>
);
