export default function TagBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-white">
      {text}
    </span>
  )
}
