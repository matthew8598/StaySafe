import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function MiniTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="mini-tooltip">
      {parseFloat(payload[0].value).toFixed(1)}{unit}
    </div>
  );
}

export default function MiniChart({ data, color, unit, gradId, thresholds }) {
  if (!data || data.length === 0) {
    return <div className="mini-chart-empty">No data</div>;
  }

  const chartData = data.map(r => ({
    time: formatTime(r.recordedAt),
    value: r.value,
  }));

  const safeId = gradId || `grad-${color.replace('#', '')}`;

  const allVals = chartData.map(d => d.value);
  if (thresholds) {
    allVals.push(thresholds.min, thresholds.max);
  }
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const pad  = (yMax - yMin) * 0.12 || 1;
  const domain = [yMin - pad, yMax + pad];

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={domain} />
        <Tooltip content={<MiniTooltip unit={unit} />} />
        {thresholds && (
          <>
            <ReferenceLine y={thresholds.min} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={thresholds.max} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
          </>
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${safeId})`}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
