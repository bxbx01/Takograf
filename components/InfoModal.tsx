import React from 'react';

interface InfoModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg text-left relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 transition rounded-full hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 text-gray-700 dark:text-gray-300 max-h-[60vh] overflow-y-auto pr-2">
            {children}
        </div>
        <div className="mt-8 flex justify-end">
            <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition">
                Anladım
            </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;