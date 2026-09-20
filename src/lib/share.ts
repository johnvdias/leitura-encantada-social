export const shareText = async (text: string, title?: string): Promise<'shared' | 'copied' | 'failed'> => {
  try {
    if (navigator.share) {
      await navigator.share({ text, title });
      return 'shared';
    }
  } catch {
    // Usuária cancelou o share nativo ou o navegador recusou; cai no fallback de copiar.
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
};
