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

export const shareImageBlob = async (
  blob: Blob,
  filename: string,
  title?: string,
  text?: string
): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const file = new File([blob], filename, { type: blob.type || 'image/png' });

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    }
  } catch (error) {
    // AbortError = a usuária mesma cancelou o share sheet nativo; nesse caso
    // não faz sentido forçar um download como se algo tivesse dado errado.
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    // Qualquer outro erro (ex: navegador recusou) cai no fallback de baixar.
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
};
