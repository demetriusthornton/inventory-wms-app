import React from "react";

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#005691] rounded-full animate-spin" />
  </div>
);
