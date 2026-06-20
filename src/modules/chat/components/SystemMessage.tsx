interface SystemMessageProps {
  content: string | null;
}

export function SystemMessage({ content }: SystemMessageProps) {
  if (!content) return null;
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        {content}
      </span>
    </div>
  );
}
