export function JSONViewer({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/40 p-4 font-mono text-[13px] leading-6">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
