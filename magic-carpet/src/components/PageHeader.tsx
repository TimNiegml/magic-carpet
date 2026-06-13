interface Props {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export default function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
