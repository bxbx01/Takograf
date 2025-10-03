import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, AppSettings, StatusSummary, ActivityType } from './types';
import ActivityForm from './components/ActivityForm';
import ActivityList from './components/ActivityList';
import StatusSummaryComponent from './components/StatusSummary';
import ViolationDisplay from './components/ViolationDisplay';
import SettingsPage from './components/SettingsPage';
import ReportsPage from './components/ReportsPage';
import { DEFAULT_SETTINGS } from './constants';
import useThemeManager from './hooks/useThemeManager';
import usePersistentState from './hooks/usePersistentState';
import useTachoAnalysis from './hooks/useTachoAnalysis';
import { toDateTimeLocal } from './utils/date';

// Helper to parse activities with Date objects from localStorage
const parseActivities = (savedActivities: string | null): Activity[] => {
  if (!savedActivities) return [];
  try {
    const parsed = JSON.parse(savedActivities);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((act: any) => ({
      ...act,
      start: new Date(act.start),
      end: act.end ? new Date(act.end) : null,
    }));
  } catch (e) {
    console.error("Failed to parse activities from localStorage", e);
    return [];
  }
};

const parseDate = (savedDate: string | null): Date | null => {
    if (savedDate && savedDate !== 'null') {
      try {
        const date = new Date(JSON.parse(savedDate));
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
    return null;
};

const parseSettings = (savedSettings: string | null): AppSettings => {
    try {
        return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
    } catch (error) {
        console.error("Failed to load settings from localStorage", error);
        return DEFAULT_SETTINGS;
    }
};

const sortActivities = (activities: Activity[]): Activity[] => {
    return [...activities].sort((a, b) => {
        const startDiff = a.start.getTime() - b.start.getTime();
        if (startDiff !== 0) return startDiff;
        if (a.end === null && b.end !== null) return 1;
        if (a.end !== null && b.end === null) return -1;
        if (a.end && b.end) {
             return a.end.getTime() - b.end.getTime();
        }
        return 0;
    });
};


const App: React.FC = () => {
  useThemeManager();

  const [activities, setActivities] = usePersistentState<Activity[]>('tacho-activities', [], (val) => parseActivities(val), JSON.stringify);
  const [lastWeeklyRestEnd, setLastWeeklyRestEnd] = usePersistentState<Date | null>('tacho-lastWeeklyRestEnd', null, (val) => parseDate(val), JSON.stringify);
  const [settings, setSettings] = usePersistentState<AppSettings>('tacho-settings', DEFAULT_SETTINGS, (val) => parseSettings(val), JSON.stringify);
  
  const chronoSortedActivities = useMemo(() => sortActivities(activities), [activities]);

  const { violations, summary } = useTachoAnalysis(chronoSortedActivities, lastWeeklyRestEnd);

  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'reports'>('main');
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  
  // Refresh the summary every 30 seconds to update ongoing activities
  useEffect(() => {
    const hasOngoingActivity = activities.some(act => act.end === null);
    if (hasOngoingActivity) {
      const interval = setInterval(() => {
        // This is a dummy state update to trigger a re-render and thus re-calculation
        // of the summary, which uses `new Date()` for ongoing tasks.
        setActivities(acts => [...acts]); 
      }, 30 * 1000); // every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activities, setActivities]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const handleSaveActivity = (primaryActivityData: Omit<Activity, 'id'>, nextActivityData?: Omit<Activity, 'id'>) => {
      setActivities(prevActivities => {
        let baseActivities: Activity[];

        if (activityToEdit) {
            // If editing, just remove the old version to be replaced.
            baseActivities = prevActivities.filter(act => act.id !== activityToEdit.id);
        } else {
            // If adding a NEW activity, find any currently ongoing activity and end it.
            baseActivities = prevActivities.map(act => {
                if (act.end === null) {
                    // End the previously ongoing activity at the start time of the new one.
                    return { ...act, end: primaryActivityData.start };
                }
                return act;
            });
        }
        
        // Add the new/updated primary activity
        const newPrimaryActivity = { 
            ...primaryActivityData, 
            id: activityToEdit ? activityToEdit.id : new Date().toISOString() + Math.random() 
        };
        baseActivities.push(newPrimaryActivity);

        // If there's a chained activity, add it as well.
        if (nextActivityData) {
            const newNextActivity = { ...nextActivityData, id: new Date().toISOString() + Math.random() };
            baseActivities.push(newNextActivity);
        }
        
        // Return the fully sorted list to prevent UI and logic errors.
        return sortActivities(baseActivities);
      });
      setActivityToEdit(null);
      setIsActivityFormOpen(false);
  };

  const handleEditActivity = (activity: Activity) => {
    setActivityToEdit(activity);
    setIsActivityFormOpen(true);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter(act => act.id !== id));
  };
  
  const getLastActivityEnd = (): Date | null => {
      const lastCompletedActivity = chronoSortedActivities.filter(a => a.end).pop();
      if (!lastCompletedActivity) return lastWeeklyRestEnd;
      return lastCompletedActivity.end;
  }
  
  const handleOpenNewActivityForm = () => {
    setActivityToEdit(null);
    setIsActivityFormOpen(true);
  };

  const handleCloseActivityForm = () => {
    setActivityToEdit(null);
    setIsActivityFormOpen(false);
  };
  
  const lastActivity = chronoSortedActivities.length > 0 ? chronoSortedActivities[chronoSortedActivities.length - 1] : null;
  const canStartWork = !lastActivity || lastActivity.type === ActivityType.END_WORK;

  if (!summary) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-cyan-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-100">Veriler Hesaplanıyor...</h2>
          <p className="text-gray-500 dark:text-gray-400">Lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (currentView === 'reports') {
    return <ReportsPage activities={chronoSortedActivities} violations={violations} onClose={() => setCurrentView('main')} />;
  }


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {isActivityFormOpen && (
        <ActivityForm
          onSave={handleSaveActivity}
          activityToEdit={activityToEdit}
          lastActivityEnd={getLastActivityEnd()}
          activities={activities}
          settings={settings}
          onClose={handleCloseActivityForm}
          canStartWork={canStartWork}
        />
      )}
      {isSettingsOpen && <SettingsPage settings={settings} onSave={handleSaveSettings} onClose={() => setIsSettingsOpen(false)} />}
      
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight">
          Tako<span className="text-cyan-500 dark:text-cyan-400">Takip</span>
        </h1>
        <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentView('reports')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition" aria-label="Raporları Görüntüle">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition" aria-label="Ayarları Aç">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
             <button
              onClick={handleOpenNewActivityForm}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 transform hover:scale-105 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Yeni Faaliyet</span>
            </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <StatusSummaryComponent summary={summary} />
          <ViolationDisplay violations={violations} />
        </div>
        <div className="lg:col-span-1">
          <ActivityList
            activities={chronoSortedActivities}
            onEdit={handleEditActivity}
            onDelete={handleDeleteActivity}
            suggestion={summary.nextActionSuggestion}
          />
        </div>
      </main>
    </div>
  );
};

export default App;