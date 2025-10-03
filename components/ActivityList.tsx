import React from 'react';
import { Activity, ActivityType, Suggestion, ViolationLevel } from '../types';
import { formatDateTime, formatDuration } from '../utils/formatters';

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  suggestion: Suggestion;
}

const ActivityIcon: React.FC<{ type: ActivityType }> = ({ type }) => {
    switch (type) {
        case ActivityType.START_WORK:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-500 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
        case ActivityType.DRIVING:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case ActivityType.BREAK:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case ActivityType.REST:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
        case ActivityType.OTHER_WORK:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
        case ActivityType.END_WORK:
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
        default:
            return null;
    }
};


const ActivityList: React.FC<ActivityListProps> = ({ activities, onEdit, onDelete, suggestion }) => {
  const getSuggestionStyle = () => {
    if (!suggestion) return null;

    const { level } = suggestion;

    switch (level) {
      case ViolationLevel.Violation:
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
          className: 'bg-red-100 dark:bg-red-900 dark:bg-opacity-40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
        };
      case ViolationLevel.Warning:
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          className: 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-40 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700'
        };
      default: // Info
        return {
          icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          className: 'bg-cyan-100 dark:bg-cyan-900 dark:bg-opacity-40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700'
        };
    }
  };
  const suggestionStyle = getSuggestionStyle();

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl h-full flex flex-col border border-gray-200 dark:border-transparent">
      {suggestionStyle && (
          <div className={`flex items-start space-x-3 p-3 mb-4 rounded-lg ${suggestionStyle.className}`}>
              <div className="flex-shrink-0 mt-0.5">{suggestionStyle.icon}</div>
              <p className="flex-1 font-semibold">{suggestion.message}</p>
          </div>
      )}
      <h2 className="text-2xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Faaliyet Listesi</h2>
      <div className="space-y-3 flex-grow overflow-y-auto pr-2">
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Henüz faaliyet girilmedi.</p>
        ) : (
          activities.map(activity => (
            <div 
                key={activity.id} 
                className={`p-4 rounded-lg flex items-center justify-between shadow-md ${!activity.end ? 'bg-cyan-50 dark:bg-cyan-900/40 border-l-4 border-cyan-500' : 'bg-gray-50 dark:bg-gray-700'}`}
              >
              <div className="flex items-center space-x-4">
                <ActivityIcon type={activity.type} />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {activity.type}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                     {activity.type === ActivityType.START_WORK
                        ? formatDateTime(activity.start)
                        : activity.type === ActivityType.END_WORK && activity.end
                        ? formatDateTime(activity.end)
                        : activity.end
                        ? `${formatDateTime(activity.start)} - ${formatDateTime(activity.end)}`
                        : `${formatDateTime(activity.start)} - ...`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                 {activity.end && activity.type !== ActivityType.START_WORK && activity.type !== ActivityType.END_WORK && (
                    <p className="font-mono text-cyan-600 dark:text-cyan-300">{formatDuration(activity.end.getTime() - activity.start.getTime())}</p>
                 )}
                 {!activity.end && (
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-300 animate-pulse">Devam Ediyor...</span>
                 )}
                <button onClick={() => onEdit(activity)} className="p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                </button>
                <button onClick={() => onDelete(activity.id)} className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityList;