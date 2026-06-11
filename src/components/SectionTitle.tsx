export default function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-7 text-2xl font-bold tracking-tight">
      <span aria-hidden="true" className="font-mono font-normal text-primary">
        {'// '}
      </span>
      {children}
    </h2>
  )
}
