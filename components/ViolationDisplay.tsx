
import React from 'react';
import { Violation, ViolationLevel } from '../types';

interface ViolationDisplayProps {
  violations: Violation[];
}

const ViolationDisplay: React.FC<ViolationDisplayProps> = ({ violations }) => {
  const getIconAndColor = (level: ViolationLevel) => {
    switch (level) {
      case ViolationLevel.Violation:
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
          color: 'border-red-400 bg-red-100 text-red-800 dark:border-red-500 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300'
        };
      case ViolationLevel.Warning:
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          color: 'border-yellow-400 bg-yellow-100 text-yellow-800 dark:border-yellow-500 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300'
        };
      default:
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          color: 'border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-500 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-300'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-transparent">
      <h2 className="text-2xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Bildirimler</h2>
       <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
      {violations.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Herhangi bir ihlal veya uyarı bulunmuyor.</p>
      ) : (
        [...violations].reverse().map((violation, index) => {
          const { icon, color } = getIconAndColor(violation.level);
          return (
            <div key={index} className={`flex items-start space-x-3 p-3 border-l-4 rounded-r-lg ${color}`}>
              <div className="flex-shrink-0">{icon}</div>
              <p className="flex-1">{violation.message}</p>
            </div>
          );
        })
      )}
      </div>
    </div>
  );
};

export default ViolationDisplay;