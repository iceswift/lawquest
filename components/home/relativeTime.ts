export function formatRelativeTime(timestamp: string) {
  const viewedDate = new Date(timestamp);

  if (Number.isNaN(viewedDate.getTime())) {
    return "";
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - viewedDate.getTime()) / 60000),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
