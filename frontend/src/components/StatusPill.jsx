export default function StatusPill({ status }) {
  const normalizedStatus = status ? String(status).toLowerCase() : 'clear'
  const styles = {
    high: 'border-[var(--color-verivox-pink)]/30 bg-[var(--color-verivox-pink)]/10 text-[var(--color-verivox-pink)]',
    medium: 'border-[var(--color-verivox-yellow)]/30 bg-[var(--color-verivox-yellow)]/10 text-[var(--color-verivox-yellow)]',
    low: 'border-[var(--color-verivox-cyan)]/30 bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)]',
    clear: 'border-[var(--color-verivox-border)] bg-[var(--color-verivox-dark)] text-slate-300',
    verified: 'border-[var(--color-verivox-cyan)]/30 bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)]',
    mismatch: 'border-[var(--color-verivox-pink)]/30 bg-[var(--color-verivox-pink)]/10 text-[var(--color-verivox-pink)]',
    normal: 'border-[var(--color-verivox-cyan)]/30 bg-[var(--color-verivox-cyan)]/10 text-[var(--color-verivox-cyan)]',
    monitoring: 'border-[var(--color-verivox-yellow)]/30 bg-[var(--color-verivox-yellow)]/10 text-[var(--color-verivox-yellow)]',
    anomalous: 'border-[var(--color-verivox-pink)]/30 bg-[var(--color-verivox-pink)]/10 text-[var(--color-verivox-pink)]'
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${styles[normalizedStatus] || styles.clear}`}>
      {status || 'CLEAR'}
    </span>
  )
}