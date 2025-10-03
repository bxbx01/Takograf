import React, { useState } from 'react';
import { StatusSummary, ViolationLevel } from '../types';
import { HOUR, DAY, MAX_WORK_PERIOD_BEFORE_WEEKLY_REST, WEEKLY_DRIVING_LIMIT, BI_WEEKLY_DRIVING_LIMIT, DAILY_DRIVING_LIMIT_NORMAL, DAILY_DRIVING_LIMIT_EXTENDED, DAILY_WORK_PERIOD_NORMAL, DAILY_WORK_PERIOD_EXTENDED } from '../constants';
import InfoModal from './InfoModal';
import { formatDuration, formatFullDuration } from '../utils/formatters';

interface StatusSummaryProps {
  summary: StatusSummary;
}

const StatusBar: React.FC<{ value: number; max: number; extended?: boolean }> = ({ value, max, extended }) => {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let colorClass = '';

  if (extended) {
    colorClass = 'bg-orange-500'; // Extended bar is always orange
  } else {
    colorClass = 'bg-green-500';
    if (percentage <= 25) colorClass = 'bg-yellow-500';
    if (percentage <= 10) colorClass = 'bg-red-500';
  }

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
      <div
        className={`${colorClass} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};


interface CircularProgressBarProps {
  value: number;
  max: number;
  label: string;
  formattedValue: string;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({ value, max, label, formattedValue }) => {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-cyan-500 dark:text-cyan-400';
  if (percentage <= 40) colorClass = 'text-yellow-500 dark:text-yellow-400';
  if (percentage <= 20) colorClass = 'text-red-500 dark:text-red-400';

  const valueParts = formattedValue.split(' ');

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <svg
          height="100%"
          width="100%"
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          className="transform -rotate-90"
        >
          <circle
            className="text-gray-200 dark:text-gray-700"
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className={`transition-all duration-500 ${colorClass}`}
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {valueParts.length === 1 && valueParts[0] === '0d' ? (
             <span className="font-mono text-lg font-bold text-gray-900 dark:text-white leading-tight">Süre Bitti</span>
          ) : (
            valueParts.map((part, index) => (
                 <span key={index} className="font-mono text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {part}
                </span>
            ))
          )}
        </div>
      </div>
      <span className="mt-2 text-sm text-gray-600 dark:text-gray-300 font-semibold">{label}</span>
    </div>
  );
};


const StatusSummary: React.FC<StatusSummaryProps> = ({ summary }) => {
    const [modalInfo, setModalInfo] = useState<{ title: string; content: React.ReactNode } | null>(null);

    const ruleContents = {
        extendedDriving: (
            <>
                <p>Normalde günlük sürüş süresi en fazla <strong>9 saattir</strong>.</p>
                <p>Bu süre, bir takvim haftası içinde <strong>en fazla iki kez</strong> <strong>10 saate</strong> kadar uzatılabilir.</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Bu hakları kullandığınızda, haftalık 56 saat ve iki haftalık 90 saatlik sürüş limitlerinizi aşmamaya dikkat etmelisiniz.</p>
            </>
        ),
        extendedWork: (
            <>
                <p>Normalde iki günlük dinlenme arasındaki toplam çalışma süreniz (sürüş, diğer iş, bekleme vb. dahil) <strong>13 saati</strong> geçemez.</p>
                <p>Bu süre, bir takvim haftası içinde <strong>en fazla iki kez</strong> <strong>15 saate</strong> kadar uzatılabilir.</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Bu uzatma, günlük sürüş süresini uzatmaz. 15 saatlik bir mesaide bile en fazla 9 (veya uzatma hakkı varsa 10) saat sürüş yapabilirsiniz.</p>
            </>
        ),
        reducedRest: (
             <>
                <p>Her 24 saatlik periyotta, en az <strong>11 saat</strong> kesintisiz günlük dinlenme yapmanız gerekir.</p>
                <p>Bu 11 saatlik dinlenme, iki haftalık dinlenme periyodu arasında <strong>en fazla üç kez</strong> <strong>en az 9 saate</strong> düşürülebilir.</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Kısaltılmış günlük dinlenmelerin telafi edilmesi gerekmez.</p>
            </>
        )
    };

    const getUncompensatedRestInfo = () => {
        if (!summary.totalUncompensatedRest || summary.totalUncompensatedRest <= 0) {
            return {
                statusText: '',
                deadlineText: '',
                valueColor: 'text-gray-900 dark:text-white',
                statusColor: '',
                isOverdue: false,
            };
        }

        const now = new Date();
        const deadline = summary.uncompensatedRestDeadline;
        let statusText = '';
        let statusColor = 'text-yellow-600 dark:text-yellow-300';
        let isOverdue = false;
        
        if (deadline) {
            if (now > deadline) {
                statusText = 'TELAFİ EDİLMEDİ!';
                statusColor = 'text-red-600 dark:text-red-400 font-bold animate-pulse';
                isOverdue = true;
            } else if (deadline.getTime() - now.getTime() < 3 * DAY) {
                statusText = 'Telafi süresi yaklaşıyor';
                statusColor = 'text-orange-600 dark:text-orange-400 font-semibold';
            }
        }

        const deadlineText = deadline 
        ? `/ ${deadline.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        : '';

        return {
            statusText,
            deadlineText,
            valueColor: isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-yellow-600 dark:text-yellow-300 font-bold',
            statusColor,
            isOverdue
        };
    };

    const uncompensatedInfo = getUncompensatedRestInfo();
    
    const driveExtensionsAvailable = summary.extendedDrivesUsedThisWeek < 2;
    const workExtensionsAvailable = summary.extendedWorkPeriodsUsedThisWeek < 2;


  return (
    <>
    {modalInfo && (
        <InfoModal title={modalInfo.title} onClose={() => setModalInfo(null)}>
            {modalInfo.content}
        </InfoModal>
    )}
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-transparent">
      <h2 className="text-2xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Mevcut Durum Özeti</h2>
      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-gray-600 dark:text-gray-300">Kalan Kesintisiz Sürüş</span>
            <span className="font-mono text-lg text-gray-900 dark:text-white">{formatDuration(summary.remainingContinuousDriving)}</span>
          </div>
          <StatusBar value={summary.remainingContinuousDriving} max={4.5 * HOUR} />
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-gray-600 dark:text-gray-300">Kalan Günlük Sürüş</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg text-gray-900 dark:text-white" title="Normal Kalan Süre">
                {formatDuration(summary.remainingDailyDrivingNormal)}
              </span>
              {driveExtensionsAvailable && summary.remainingDailyDrivingExtended > 0 && (
                <span className="font-mono text-lg text-orange-500 dark:text-orange-400" title="Uzatma Kalan Süre">
                  (+{formatDuration(summary.remainingDailyDrivingExtended)})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-grow">
              <StatusBar value={summary.remainingDailyDrivingNormal} max={DAILY_DRIVING_LIMIT_NORMAL} />
            </div>
            {driveExtensionsAvailable && (
              <div style={{ flexBasis: `${((DAILY_DRIVING_LIMIT_EXTENDED - DAILY_DRIVING_LIMIT_NORMAL) / DAILY_DRIVING_LIMIT_NORMAL) * 100}%` }}>
                <StatusBar value={summary.remainingDailyDrivingExtended} max={DAILY_DRIVING_LIMIT_EXTENDED - DAILY_DRIVING_LIMIT_NORMAL} extended />
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-gray-600 dark:text-gray-300">Kalan Günlük Çalışma</span>
             <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg text-gray-900 dark:text-white" title="Normal Kalan Süre">
                    {formatDuration(summary.remainingDailyWorkNormal)}
                </span>
                {workExtensionsAvailable && summary.remainingDailyWorkExtended > 0 && (
                    <span className="font-mono text-lg text-orange-500 dark:text-orange-400" title="Uzatma Kalan Süre">
                        (+{formatDuration(summary.remainingDailyWorkExtended)})
                    </span>
                )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-grow">
              <StatusBar value={summary.remainingDailyWorkNormal} max={DAILY_WORK_PERIOD_NORMAL} />
            </div>
            {workExtensionsAvailable && (
               <div style={{ flexBasis: `${((DAILY_WORK_PERIOD_EXTENDED - DAILY_WORK_PERIOD_NORMAL) / DAILY_WORK_PERIOD_NORMAL) * 100}%` }}>
                <StatusBar value={summary.remainingDailyWorkExtended} max={DAILY_WORK_PERIOD_EXTENDED - DAILY_WORK_PERIOD_NORMAL} extended />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border-t border-gray-200 dark:border-gray-700">
             <CircularProgressBar
                value={summary.remainingWeeklyDriving}
                max={WEEKLY_DRIVING_LIMIT}
                label="Kalan Haftalık Sürüş"
                formattedValue={formatDuration(summary.remainingWeeklyDriving)}
            />
            <CircularProgressBar
                value={summary.remainingBiWeeklyDriving}
                max={BI_WEEKLY_DRIVING_LIMIT}
                label="Kalan İki Haftalık Sürüş"
                formattedValue={formatDuration(summary.remainingBiWeeklyDriving)}
            />
            <CircularProgressBar
                value={summary.timeUntilWeeklyRestDue}
                max={MAX_WORK_PERIOD_BEFORE_WEEKLY_REST}
                label="Haftalık Dinlenmeye Kalan"
                formattedValue={formatFullDuration(summary.timeUntilWeeklyRestDue)}
            />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-3">Kullanılabilir Haklar</h3>
            <div className="grid grid-cols-3 gap-2">
                <div 
                    className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    onClick={() => setModalInfo({ title: 'Uzatılmış Günlük Sürüş Hakkı', content: ruleContents.extendedDriving })}
                    role="button"
                    tabIndex={0}
                    aria-label="Uzatılmış sürüş kuralı hakkında bilgi al"
                >
                    <p className={`font-mono text-2xl font-bold ${(2 - summary.extendedDrivesUsedThisWeek) <= 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {Math.max(0, 2 - summary.extendedDrivesUsedThisWeek)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uzatılmış Sürüş</p>
                </div>
                 <div 
                    className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    onClick={() => setModalInfo({ title: 'Uzatılmış Günlük Çalışma Süresi', content: ruleContents.extendedWork })}
                    role="button"
                    tabIndex={0}
                    aria-label="Uzatılmış mesai kuralı hakkında bilgi al"
                >
                    <p className={`font-mono text-2xl font-bold ${(2 - summary.extendedWorkPeriodsUsedThisWeek) <= 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {Math.max(0, 2 - summary.extendedWorkPeriodsUsedThisWeek)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uzatılmış Mesai</p>
                </div>
                 <div 
                    className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    onClick={() => setModalInfo({ title: 'Kısaltılmış Günlük Dinlenme Hakkı', content: ruleContents.reducedRest })}
                    role="button"
                    tabIndex={0}
                    aria-label="Kısaltılmış dinlenme kuralı hakkında bilgi al"
                >
                    <p className={`font-mono text-2xl font-bold ${(3 - summary.reducedRestsUsed) <= 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {Math.max(0, 3 - summary.reducedRestsUsed)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kısaltılmış Dinlenme</p>
                </div>
            </div>
        </div>
      
        <div className={`pt-4 border-t border-gray-200 dark:border-gray-700 ${uncompensatedInfo.isOverdue ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 rounded p-2 -m-2' : ''}`}>
             <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-300">Telafi Edilecek Süre</span>
                 <div className="flex items-baseline">
                     <span className={`font-mono ${uncompensatedInfo.valueColor}`}>{formatDuration(summary.totalUncompensatedRest)}</span>
                     <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">{uncompensatedInfo.deadlineText}</span>
                 </div>
            </div>
             {uncompensatedInfo.statusText && (
                <p className={`text-xs text-right ${uncompensatedInfo.statusColor}`}>{uncompensatedInfo.statusText}</p>
             )}
        </div>

      </div>
    </div>
    </>
  );
};

export default StatusSummary;