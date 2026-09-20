export interface EpubMetadata {
  title: string;
  author: string;
}

// Lê o container.xml (aponta pro .opf) e depois o .opf (metadados Dublin
// Core: dc:title / dc:creator) de dentro do próprio arquivo .epub, que é
// um zip. Evita a autora ter que digitar título/autora de cada livro na
// hora de subir vários de uma vez.
// jszip só é usado aqui (fluxo de upload em massa, só pra admin), então
// carrega sob demanda em vez de engordar o bundle de todo mundo.
export const extractEpubMetadata = async (file: File): Promise<EpubMetadata | null> => {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);

    const containerXml = await zip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) return null;

    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
    if (!opfPath) return null;

    const opfXml = await zip.file(opfPath)?.async('text');
    if (!opfXml) return null;

    const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');
    const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim();
    const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim();

    if (!title && !author) return null;

    return {
      title: title || file.name.replace(/\.epub$/i, ''),
      author: author || 'Autora desconhecida',
    };
  } catch (error) {
    console.error(`Error extracting EPUB metadata from ${file.name}:`, error);
    return null;
  }
};
