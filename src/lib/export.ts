import { Question } from '@/types/selfhaul';

export function formatAsText(questions: Question[]): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let content = `SELF-HAUL — PERSONAL REFLECTION RITUAL\nDate: ${dateStr}\n${'='.repeat(45)}\n\n`;

  questions.forEach((q, idx) => {
    content += `QUESTION ${idx + 1}:\n${q.text}\n\n`;
    content += `ANSWER:\n${q.answer ? q.answer : '[Skipped / Unanswered]'}\n\n`;
    content += `${'-'.repeat(45)}\n\n`;
  });

  return content;
}

export function formatAsMarkdown(questions: Question[]): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let content = `# Self-Haul — Personal Reflection\n*Date: ${dateStr}*\n\n---\n\n`;

  questions.forEach((q, idx) => {
    content += `### ${idx + 1}. ${q.text}\n\n`;
    content += `> ${q.answer ? q.answer.replace(/\n/g, '\n> ') : '*No answer provided*'}\n\n`;
  });

  return content;
}

export function downloadFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
