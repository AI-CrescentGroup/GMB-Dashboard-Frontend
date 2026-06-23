interface TopPerformersTableProps {
  title: string
  data: Array<{ rank: number; dealer_name: string; zone: string; market: string; value: number }>
  valueLabel: string
  accentColor: string
}

export default function TopPerformersTable({ title, data, valueLabel, accentColor }: TopPerformersTableProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white rounded-2xl p-6 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-base font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
              <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store</th>
              <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone</th>
              <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.rank} style={{ borderBottom: '1px solid #F9FAFB' }}>
                <td style={{ padding: '14px 0', color: '#9CA3AF', fontWeight: '600', fontSize: '14px' }}>{row.rank}</td>
                <td style={{ padding: '14px 0', color: '#111827', fontWeight: '500', fontSize: '14px' }}>{row.dealer_name}</td>
                <td style={{ padding: '14px 0', color: '#6B7280', fontSize: '13px' }}>{row.zone}</td>
                <td style={{ padding: '14px 0', color: '#6B7280', fontSize: '13px' }}>{row.market}</td>
                <td style={{ padding: '14px 0', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                    <div style={{
                      width: '80px',
                      height: '20px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(row.value / maxValue) * 100}%`,
                        backgroundColor: accentColor,
                        transition: 'width 150ms ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', minWidth: '60px', textAlign: 'right' }}>
                      {row.value.toLocaleString('en-IN')}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
