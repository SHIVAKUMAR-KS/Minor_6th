export function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function extractCommonPhrases(titles: string[]): { phrase: string; count: number }[] {
  const phrases: { [key: string]: number } = {};
  
  titles.forEach(title => {
    const words = title.toLowerCase().split(' ');
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
  });

  return Object.entries(phrases)
    .map(([phrase, count]) => ({ phrase, count }))
    .filter(item => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
} 