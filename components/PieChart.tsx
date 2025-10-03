import React from 'react';

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="flex items-center justify-center h-32 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Veri Yok</p>
            </div>
        </div>
    );
  }

  let cumulativePercentage = 0;
  const gradients = data
    .filter(item => item.value > 0)
    .map(item => {
        const percentage = (item.value / total) * 100;
        const gradient = `${item.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
        cumulativePercentage += percentage;
        return gradient;
    });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4">
      <div 
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex-shrink-0" 
        style={{ background: `conic-gradient(${gradients.join(', ')})` }}
        role="img"
        aria-label="Aktivite dağılımı grafiği"
      ></div>
      <div className="space-y-2">
        {data.filter(item => item.value > 0).map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }}></span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;