import React, { useState } from 'react';
import { AppSettings, ActivityType, DurationalActivityType } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

const durationalTypes: { type: DurationalActivityType; label: string }[] = [
  { type: ActivityType.DRIVING, label: 'Sürüş' },
  { type: ActivityType.BREAK, label: 'Mola' },
  { type: ActivityType.REST, label: 'Dinlenme' },
  { type: ActivityType.OTHER_WORK, label: 'Diğer İş' }
];

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleChange = (type: DurationalActivityType, field: 'hours' | 'minutes', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setLocalSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: numValue
      }
    }));
  };

  const handleSaveDurations = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg text-left">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">Ayarlar</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 transition rounded-full hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSaveDurations}>
            <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Varsayılan Süreler</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Yeni bir faaliyet eklerken bu süreler otomatik olarak uygulanacaktır.</p>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {durationalTypes.map(({ type, label }) => (
                <div key={type}>
                    <label className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</label>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`${type}-hours`} className="block text-sm font-medium text-gray-500 dark:text-gray-400">Saat</label>
                        <input
                        type="number"
                        id={`${type}-hours`}
                        min="0"
                        value={localSettings[type].hours}
                        onChange={(e) => handleChange(type, 'hours', e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${type}-minutes`} className="block text-sm font-medium text-gray-500 dark:text-gray-400">Dakika</label>
                        <input
                        type="number"
                        id={`${type}-minutes`}
                        min="0"
                        max="59"
                        value={localSettings[type].minutes}
                        onChange={(e) => handleChange(type, 'minutes', e.target.value)}
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    </div>
                </div>
            ))}
            </div>
            <div className="mt-8 flex justify-end space-x-4">
                <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white">
                    İptal
                </button>
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition">
                    Kaydet
                </button>
            </div>
        </form>

      </div>
    </div>
  );
};

export default SettingsPage;