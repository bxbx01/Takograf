import React, { useState, useEffect } from 'react';
import { Activity, ActivityType, AppSettings, DurationalActivityType } from '../types';
import { MINUTE, HOUR } from '../constants';

interface ActivityFormProps {
  onSave: (primaryActivity: Omit<Activity, 'id'>, nextActivity?: Omit<Activity, 'id'>) => void;
  activityToEdit: Activity | null;
  lastActivityEnd: Date | null;
  activities: Activity[];
  settings: AppSettings;
  onClose: () => void;
  canStartWork: boolean;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ onSave, activityToEdit, lastActivityEnd, activities, settings, onClose, canStartWork }) => {
  const [type, setType] = useState<ActivityType>(ActivityType.DRIVING);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // State for chaining activities
  const [chainNextActivity, setChainNextActivity] = useState(false);
  const [nextActivityType, setNextActivityType] = useState<ActivityType>(ActivityType.DRIVING);
  const [nextActivityEnd, setNextActivityEnd] = useState('');


  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    activityData: Omit<Activity, 'id'> | null;
    duration: number;
  } | null>(null);


  const toDateTimeLocal = (date: Date | null) => {
    if (!date) return '';
    const ten = (i: number) => (i < 10 ? '0' : '') + i;
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    const HH = ten(date.getHours());
    const II = ten(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${II}`;
  };

  // Effect to initialize or reset the form
  useEffect(() => {
    if (activityToEdit) {
      setType(activityToEdit.type);
      setStart(toDateTimeLocal(activityToEdit.start));
      setEnd(toDateTimeLocal(activityToEdit.end));
    } else {
      const defaultStartDate = lastActivityEnd || new Date();
      setStart(toDateTimeLocal(defaultStartDate));
      // Set default type based on workflow
      if (canStartWork) {
        setType(ActivityType.START_WORK);
      } else {
        setType(ActivityType.DRIVING);
      }
      setEnd(''); // Clear end time for new activities
    }
    // Reset chaining state when form opens
    setChainNextActivity(false);
    setNextActivityType(ActivityType.DRIVING);
    setNextActivityEnd('');

  }, [activityToEdit, lastActivityEnd, canStartWork]);
  
  // Effect to apply default durations when type or start date changes for a NEW activity
  useEffect(() => {
    if (!activityToEdit && start && type) {
      const activityTypesWithDuration: ActivityType[] = [ActivityType.DRIVING, ActivityType.BREAK, ActivityType.REST, ActivityType.OTHER_WORK];
      
      if (activityTypesWithDuration.includes(type)) {
        // We now allow empty end time
      } else {
         // For START/END WORK, end time isn't relevant in the form, but let's sync it.
         setEnd(start);
      }
    }
  }, [type, start, activityToEdit, settings]);
  
  // When end date is cleared, hide the chaining option
  useEffect(() => {
    if (!end) {
        setChainNextActivity(false);
    }
  }, [end]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let primaryActivityData: Omit<Activity, 'id'>;
    let nextActivityData: Omit<Activity, 'id'> | undefined = undefined;
    let duration: number | null = null;

    if (type === ActivityType.START_WORK) {
      if (!start) {
        setError("Başlangıç zamanı zorunludur.");
        return;
      }
      const startDate = new Date(start);
      primaryActivityData = { type, start: startDate, end: startDate };
    } else if (type === ActivityType.END_WORK) {
       // Using `start` field for End Work time for simplicity in UI state
      if (!start) { 
        setError("Bitiş zamanı zorunludur.");
        return;
      }
      const endDate = new Date(start);
      primaryActivityData = { type, start: endDate, end: endDate };
    } else {
      if (!start) {
        setError("Başlangıç zamanı zorunludur.");
        return;
      }
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : null;
      
      if (endDate && startDate >= endDate) {
        setError('Başlangıç saati bitiş saatinden önce olmalıdır.');
        return;
      }
      primaryActivityData = { type, start: startDate, end: endDate };
    }
    
    if (primaryActivityData.end) {
        duration = primaryActivityData.end.getTime() - primaryActivityData.start.getTime();
    }
    
    // --- Chaining Logic ---
    if (chainNextActivity && primaryActivityData.end) {
        const nextStartDate = primaryActivityData.end;
        const nextEndDate = nextActivityEnd ? new Date(nextActivityEnd) : null;

        if (nextEndDate && nextStartDate >= nextEndDate) {
            setError('Zincirlenen faaliyetin başlangıç saati, bitiş saatinden önce olmalıdır.');
            return;
        }

        nextActivityData = {
            type: nextActivityType,
            start: nextStartDate,
            end: nextEndDate,
        };
    }


    // Smart warning logic for split breaks, only if the break has an end time
    if (duration && type === ActivityType.BREAK && !activityToEdit) {
      const previousActivities = activities
        .filter(act => act.end && act.end <= primaryActivityData.start)
        .sort((a, b) => b.start.getTime() - a.start.getTime()); // Most recent first

      let isCompletingSplitBreak = false;
      // It can only be a completing break if it's at least 30 mins
      if (duration >= (30 * MINUTE)) { 
        for (const prevAct of previousActivities) {
           if (!prevAct.end) continue;
          const prevDuration = prevAct.end.getTime() - prevAct.start.getTime();

          if (prevAct.type === ActivityType.BREAK || prevAct.type === ActivityType.REST) {
            if (prevDuration >= (45 * MINUTE)) {
              // A full reset was found. This new break cannot be a completing part.
              break;
            }
            if (prevDuration >= (15 * MINUTE)) {
              // Found a valid first part. The current break completes the split.
              isCompletingSplitBreak = true;
              break;
            }
          }
        }
      }

      // Show warning ONLY if it's a potential first part, AND NOT a completing part.
      if (!isCompletingSplitBreak && duration >= (15 * MINUTE) && duration < (45 * MINUTE)) {
        setConfirmation({
          isOpen: true,
          activityData: primaryActivityData, // This should be updated to handle chained activity too
          duration: duration,
        });
        return; // Wait for user confirmation
      }
    }

    onSave(primaryActivityData, nextActivityData);
  };

  const handleConfirmSave = () => {
    // This logic needs to be aware of the chained activity now.
    // For simplicity, we'll just re-submit the form which re-runs the logic.
    if (confirmation?.activityData) {
        const primaryData = confirmation.activityData;
        let nextData: Omit<Activity, 'id'> | undefined = undefined;
        if (chainNextActivity && primaryData.end) {
            const nextStartDate = primaryData.end;
            const nextEndDate = nextActivityEnd ? new Date(nextActivityEnd) : null;
            if (!nextEndDate || nextStartDate < nextEndDate) {
                nextData = { type: nextActivityType, start: nextStartDate, end: nextEndDate };
            }
        }
        onSave(primaryData, nextData);
    }
    setConfirmation(null);
  };

  const handleCancelSave = () => {
    setConfirmation(null);
  };
  
  const getAvailableActivityTypes = (isNextActivity: boolean = false) => {
    if (activityToEdit && !isNextActivity) {
      // When editing, show all types to allow correction of mistakes.
      return Object.values(ActivityType);
    }
    if (canStartWork && !isNextActivity) {
      return [ActivityType.START_WORK];
    }
    // Don't allow another "START_WORK"
    return Object.values(ActivityType).filter(t => t !== ActivityType.START_WORK);
  };
  const availableTypes = getAvailableActivityTypes(false);
  const nextAvailableTypes = getAvailableActivityTypes(true);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-40 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg text-left relative">
        {confirmation?.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md text-center">
                <h3 className="text-2xl font-bold text-yellow-500 dark:text-yellow-400 mb-4">Bölünmüş Mola Uyarısı</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Girdiğiniz <strong>{Math.round(confirmation.duration / MINUTE)} dakikalık</strong> mola, 45 dakikadan az olduğu için kesintisiz sürüş sürenizi sıfırlamayacaktır.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Bu mola, yasal olarak bölünmüş molanın ilk parçası (en az 15dk) olarak kabul edilir. Süreyi sıfırlamak için daha sonra <strong>en az 30 dakikalık</strong> bir mola daha vermeniz gerekir.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-8">
                    Bu faaliyeti kaydetmek istediğinize emin misiniz?
                </p>
                <div className="flex justify-center space-x-4">
                    <button onClick={handleCancelSave} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition dark:bg-gray-600 dark:hover:bg-gray-700">
                    İptal
                    </button>
                    <button onClick={handleConfirmSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition">
                    Evet, Kaydet
                    </button>
                </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{activityToEdit ? 'Faaliyeti Düzenle' : 'Yeni Faaliyet Ekle'}</h2>
           <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 transition rounded-full hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Faaliyet Türü</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {type === ActivityType.END_WORK ? 'Bitiş Zamanı' : 'Başlangıç Zamanı'}
              </label>
              <input
                type="datetime-local"
                id="start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
          </div>

          {type !== ActivityType.START_WORK && type !== ActivityType.END_WORK && (
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bitiş Zamanı (Boş bırakırsanız devam eder)</label>
              <input
                type="datetime-local"
                id="end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          )}

          {/* --- Chaining UI --- */}
          {type !== ActivityType.START_WORK && type !== ActivityType.END_WORK && end && (
            <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="chain"
                            aria-describedby="chain-description"
                            name="chain"
                            type="checkbox"
                            checked={chainNextActivity}
                            onChange={e => setChainNextActivity(e.target.checked)}
                            className="focus:ring-cyan-500 h-4 w-4 text-cyan-600 border-gray-300 rounded"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="chain" className="font-medium text-gray-700 dark:text-gray-200">
                            Sonraki Faaliyeti Zincirle
                        </label>
                        <p id="chain-description" className="text-gray-500 dark:text-gray-400">
                            Bu faaliyet biter bitmez yeni bir faaliyet başlat.
                        </p>
                    </div>
                </div>

                {chainNextActivity && (
                    <div className="space-y-4 pl-6 border-l-2 border-cyan-500 ml-2">
                         <div>
                            <label htmlFor="next-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sonraki Faaliyetin Türü</label>
                            <select
                            id="next-type"
                            value={nextActivityType}
                            onChange={(e) => setNextActivityType(e.target.value as ActivityType)}
                            className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            >
                            {nextAvailableTypes.map((t) => (
                                <option key={`next-${t}`} value={t}>{t}</option>
                            ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="next-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sonraki Faaliyetin Bitiş Zamanı (İsteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                id="next-end"
                                value={nextActivityEnd}
                                onChange={(e) => setNextActivityEnd(e.target.value)}
                                className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                    </div>
                )}
            </div>
          )}


          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
          <div className="pt-2">
            <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 shadow-lg text-lg"
            >
            {activityToEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityForm;