import React, { useState, useMemo } from 'react';
import { Activity, Violation, ActivityType } from '../types';
import PieChart from './PieChart';
import { formatDuration } from '../utils/formatters';
import { toDateInputFormat } from '../utils/date';


interface ReportsPageProps {
  activities: Activity[];
  violations: Violation[];
  onClose: () => void;
}

interface ReportData {
  startDate: Date;
  endDate: Date;
  totalDriving: number;
  totalOtherWork: number;
  totalBreak: number;
  totalRest: number;
  violationsInPeriod: Violation[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ activities, violations, onClose }) => {
  const [startDate, setStartDate] = useState<string>(toDateInputFormat(new Date()));
  const [endDate, setEndDate] = useState<string>(toDateInputFormat(new Date()));
  const [report, setReport] = useState<ReportData | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<string, Activity>();
    activities.forEach(act => map.set(act.id, act));
    return map;
  }, [activities]);

  const handleSetDateRange = (range: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'thisWeek':
        const firstDayOfWeek = now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1);
        start = new Date(now.setDate(firstDayOfWeek));
        end = new Date();
        break;
      case 'lastWeek':
        const lastWeekEnd = new Date(now.setDate(now.getDate() - (now.getDay() === 0 ? 7 : now.getDay())));
        const lastWeekStart = new Date(new Date(lastWeekEnd).setDate(lastWeekEnd.getDate() - 6));
        start = lastWeekStart;
        end = lastWeekEnd;
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    setStartDate(toDateInputFormat(start));
    setEndDate(toDateInputFormat(end));
  };
  
  const handleGenerateReport = () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const data: ReportData = {
      startDate: start,
      endDate: end,
      totalDriving: 0,
      totalOtherWork: 0,
      totalBreak: 0,
      totalRest: 0,
      violationsInPeriod: [],
    };
    
    activities.forEach(act => {
      if (act.start > end || act.end < start) return;

      const effectiveStart = Math.max(act.start.getTime(), start.getTime());
      const effectiveEnd = Math.min(act.end.getTime(), end.getTime());
      const durationInRange = effectiveEnd - effectiveStart;

      if (durationInRange > 0) {
        switch (act.type) {
          case ActivityType.DRIVING: data.totalDriving += durationInRange; break;
          case ActivityType.OTHER_WORK: data.totalOtherWork += durationInRange; break;
          case ActivityType.BREAK: data.totalBreak += durationInRange; break;
          case ActivityType.REST: data.totalRest += durationInRange; break;
        }
      }
    });

    data.violationsInPeriod = violations.filter(v => {
      if (!v.activityId) return false;
      const linkedActivity = activityMap.get(v.activityId);
      if (!linkedActivity) return false;
      return linkedActivity.start >= start && linkedActivity.start <= end;
    }).sort((a,b) => (activityMap.get(a.activityId!)?.start.getTime() ?? 0) - (activityMap.get(b.activityId!)?.start.getTime() ?? 0));
    
    setReport(data);
  };

  const pieChartData = report ? [
    { label: 'Sürüş', value: report.totalDriving, color: '#3b82f6' }, // blue-500
    { label: 'Diğer İş', value: report.totalOtherWork, color: '#eab308' }, // yellow-500
    { label: 'Mola', value: report.totalBreak, color: '#22c55e' }, // green-500
    { label: 'Dinlenme', value: report.totalRest, color: '#a855f7' } // purple-500
  ] : [];
  
  const totalWork = (report?.totalDriving ?? 0) + (report?.totalOtherWork ?? 0);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex justify-between items-center">
            <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight">Raporlar</h1>
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Geri Dön</span>
            </button>
        </header>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-transparent">
            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="lg:col-span-1 space-y-4">
                     <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => handleSetDateRange('thisWeek')} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 rounded-md transition text-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border border-gray-300 dark:border-gray-500">Bu Hafta</button>
                         <button onClick={() => handleSetDateRange('lastWeek')} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 rounded-md transition text-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border border-gray-300 dark:border-gray-500">Geçen Hafta</button>
                         <button onClick={() => handleSetDateRange('thisMonth')} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 rounded-md transition text-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border border-gray-300 dark:border-gray-500">Bu Ay</button>
                         <button onClick={() => handleSetDateRange('lastMonth')} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-3 rounded-md transition text-sm dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border border-gray-300 dark:border-gray-500">Geçen Ay</button>
                    </div>
                </div>
                 <div className="lg:col-span-1 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                    <span className="text-gray-500 text-center hidden sm:block">-</span>
                     <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div className="lg:col-span-1 flex items-center justify-end gap-4">
                    <button onClick={handleGenerateReport} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition h-full w-full sm:w-auto">Rapor Oluştur</button>
                </div>
            </div>

            {/* Report Display */}
            <div>
              {!report ? (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">Rapor oluşturmak için bir tarih aralığı seçin.</div>
              ) : (
                <div className="space-y-8">
                  <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Dönem Raporu</h3>
                      <p className="text-gray-600 dark:text-gray-300">{report.startDate.toLocaleDateString('tr-TR')} - {report.endDate.toLocaleDateString('tr-TR')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
                      <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-lg"><p className="text-xs text-blue-800 dark:text-blue-300">Toplam Sürüş</p><p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatDuration(report.totalDriving)}</p></div>
                      <div className="bg-yellow-100 dark:bg-yellow-900/40 p-4 rounded-lg"><p className="text-xs text-yellow-800 dark:text-yellow-300">Diğer İş</p><p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{formatDuration(report.totalOtherWork)}</p></div>
                      <div className="bg-rose-100 dark:bg-rose-900/40 p-4 rounded-lg"><p className="text-xs text-rose-800 dark:text-rose-300">Toplam Çalışma</p><p className="text-2xl font-bold text-rose-900 dark:text-rose-200">{formatDuration(totalWork)}</p></div>
                      <div className="bg-green-100 dark:bg-green-900/40 p-4 rounded-lg"><p className="text-xs text-green-800 dark:text-green-300">Toplam Mola</p><p className="text-2xl font-bold text-green-900 dark:text-green-200">{formatDuration(report.totalBreak)}</p></div>
                      <div className="bg-purple-100 dark:bg-purple-900/40 p-4 rounded-lg"><p className="text-xs text-purple-800 dark:text-purple-300">Toplam Dinlenme</p><p className="text-2xl font-bold text-purple-900 dark:text-purple-200">{formatDuration(report.totalRest)}</p></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <h4 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Faaliyet Dağılımı</h4>
                        <PieChart data={pieChartData} />
                      </div>
                       <div>
                        <h4 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Dönem İhlalleri ({report.violationsInPeriod.length})</h4>
                         <div className="space-y-2 max-h-64 overflow-y-auto">
                            {report.violationsInPeriod.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Bu dönemde ihlal kaydedilmedi.</p>
                            ) : (
                                report.violationsInPeriod.map((v, i) => (
                                    <div key={i} className="p-2 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-sm">
                                       <p className="font-semibold">{v.message}</p>
                                       <p className="text-xs opacity-80">
                                          {activityMap.get(v.activityId!)?.start.toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'})}
                                       </p>
                                    </div>
                                ))
                            )}
                         </div>
                      </div>
                  </div>

                </div>
              )}
            </div>
        </div>
    </div>
  );
};

export default ReportsPage;