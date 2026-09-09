import { ModIdea } from '@/types/mod-idea';

export function exportAsText(ideas: ModIdea[]): string {
  return ideas.map((idea) => {
    const features = idea.features.map((f, i) => `  ${i + 1}. ${f}`).join('\n');
    const hints = idea.implementationHints.map((h) => {
      let hint = `  • ${h.title}: ${h.description}`;
      if (h.pseudocode) {
        hint += `\n    Pseudocode:\n${h.pseudocode.split('\n').map((l) => `      ${l}`).join('\n')}`;
      }
      if (h.docLink) {
        hint += `\n    Docs: ${h.docLink}`;
      }
      return hint;
    }).join('\n');

    return `═══════════════════════════════════════════════════════════════
📜 ${idea.title}
═══════════════════════════════════════════════════════════════

${idea.description}

🎯 Key Features:
${features}

⚙️ OpenMW Implementation Hints:
${hints}

🏷️ Tags: ${idea.tags.join(', ')}
📊 Complexity: ${idea.complexity}
🎮 Game Type: ${idea.gameType}
📅 Created: ${new Date(idea.createdAt).toLocaleDateString()}
`;
  }).join('\n\n');
}

export function exportAsJSON(ideas: ModIdea[]): string {
  return JSON.stringify(ideas, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}